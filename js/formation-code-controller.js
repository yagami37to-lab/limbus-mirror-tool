(()=>{
'use strict';
const RANKS=['ZAYIN','TETH','HE','WAW','ALEPH'];
const WIDTHS=[7,4,7,7,7,7,7];
const toBits=(value,width)=>Math.max(0,Number(value)||0).toString(2).padStart(width,'0').slice(-width);
const bytesToBase64=bytes=>{let value='';for(let i=0;i<bytes.length;i+=0x8000)value+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(value);};
const base64ToBytes=value=>{const clean=String(value||'').trim().replace(/\s+/g,'');if(!clean||!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)||clean.length%4)throw new Error('invalid_base64');const raw=atob(clean);return Uint8Array.from(raw,char=>char.charCodeAt(0));};
async function gzip(bytes){if(typeof CompressionStream==='undefined')throw new Error('gzip_unsupported');const stream=new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));return new Uint8Array(await new Response(stream).arrayBuffer());}
async function gunzip(bytes){if(typeof DecompressionStream==='undefined')throw new Error('gzip_unsupported');const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));return new Uint8Array(await new Response(stream).arrayBuffer());}
function slotsToBytes(slots){
  if(!Array.isArray(slots)||slots.length!==12)throw new Error('invalid_slot_count');
  const body=slots.map(slot=>[slot.identityModifier,slot.slotType,...RANKS.map(rank=>slot.egos?.[rank]||0)].map((value,index)=>toBits(value,WIDTHS[index])).join('')).join('');
  const bits=`0${body}0000000`;if(bits.length!==560)throw new Error('invalid_bit_length');
  const bytes=new Uint8Array(70);for(let i=0;i<bytes.length;i++)bytes[i]=parseInt(bits.slice(i*8,i*8+8),2);return bytes;
}
function bytesToSlots(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length!==70)throw new Error('invalid_payload_length');
  const bits=[...bytes].map(value=>value.toString(2).padStart(8,'0')).join('');const body=bits.slice(1,553);const slots=[];
  for(let slot=0;slot<12;slot++){const chunk=body.slice(slot*46,(slot+1)*46);let offset=0;const values=WIDTHS.map(width=>{const value=parseInt(chunk.slice(offset,offset+width),2);offset+=width;return value;});slots.push({gameSinnerId:slot+1,identityModifier:values[0],slotType:values[1],egos:Object.fromEntries(RANKS.map((rank,index)=>[rank,values[index+2]]))});}
  return slots;
}
async function encode(slots){const inner=new TextEncoder().encode(bytesToBase64(slotsToBytes(slots)));return bytesToBase64(await gzip(inner));}
async function decode(code){const inner=await gunzip(base64ToBytes(code));const encoded=new TextDecoder('ascii',{fatal:true}).decode(inner).trim();return bytesToSlots(base64ToBytes(encoded));}
const contentNameKey=value=>String(value??'').normalize('NFKC').replace(/[\s:：\[\]【】・･]/g,'').toLowerCase();
function slotsFromContent(content,map){
  const sinnerNames=['イサン','ファウスト','ドンキホーテ','良秀','ムルソー','ホンル','ヒースクリフ','イシュメール','ロージャ','シンクレア','ウーティス','グレゴール'];
  const siteIds=['01','02','03','04','05','06','07','08','09','11','12','13'];
  const selected=Array.isArray(content?.selectedIdentities)&&content.selectedIdentities.length?content.selectedIdentities:(content?.party||[]);
  const identityBySinner=new Map(selected.map(item=>[item.sinner,item]));const orderBySinner=new Map((content?.party||[]).map(item=>[item.sinner,Math.max(0,Number(item.order)||0)]));const egoBySinner=new Map((content?.egos||[]).map(group=>[group.sinner,group.items||[]]));const warnings=[];
  return sinnerNames.map((sinner,index)=>{
    const siteId=siteIds[index],identity=identityBySinner.get(sinner);const isFree=!!identity?.is_free||String(identity?.identity||'').includes('自由枠');let mappedIdentity=!isFree?map.identities.find(item=>item.sinnerId===siteId&&contentNameKey(item.name)===contentNameKey(identity?.identity)):null;
    if(identity&&!mappedIdentity)warnings.push(`${sinner}の自由枠または未対応人格はLCB囚人として出力されます。`);
    const egos=Object.fromEntries(RANKS.map(rank=>[rank,rank==='ZAYIN'?1:0]));
    for(const raw of egoBySinner.get(sinner)||[]){const match=String(raw).trim().match(/^(ZAYIN|TETH|HE|WAW|ALEPH)\s*[：:]\s*(.+)$/i);if(!match)continue;const rank=match[1].toUpperCase(),name=match[2].trim();const mapped=map.egos.find(item=>item.sinnerId===siteId&&item.risk===rank&&contentNameKey(item.name)===contentNameKey(name));if(mapped)egos[rank]=Number(mapped.gameId)%100;else warnings.push(`${sinner}の${rank} E.G.Oはコードへ変換できません。`);}
    return {gameSinnerId:index+1,identityModifier:mappedIdentity?Number(mappedIdentity.gameId)%100:1,slotType:Math.min(15,orderBySinner.get(sinner)||0),egos,warnings};
  });
}

function create({state,identityData,egoData,showToast,onApplied,onBeforePrompt}){
  const dialog=document.querySelector('[data-formation-import-dialog]');const input=document.querySelector('[data-formation-code-input]');const error=document.querySelector('[data-formation-code-error]');const loadButton=document.querySelector('[data-import-formation-code]');const cancelButton=document.querySelector('[data-cancel-formation-import]');const openButtons=document.querySelectorAll('[data-open-formation-import]');const output=document.querySelector('[data-formation-code-output]');const copyButton=document.querySelector('[data-copy-formation-code]');const status=document.querySelector('[data-formation-code-status]');
  let mapPromise=null,lastCode='';
  async function loadMap(){if(!mapPromise)mapPromise=fetch('data/game-id-map.json').then(response=>{if(!response.ok)throw new Error('map_load_failed');return response.json();});return mapPromise;}
  function open(){if(!dialog)return;if(error){error.hidden=true;error.textContent='';}if(input)input.value='';dialog.showModal();}
  function close(){dialog?.close();}
  function offer(){onBeforePrompt?.();open();}
  function reset(){lastCode='';if(output)output.value='';if(status)status.textContent='';}
  async function importCode(){
    const code=input?.value.trim()||'';if(!code){showError('編成コードを入力してください。');return;}
    loadButton.disabled=true;
    try{
      const [slots,map]=await Promise.all([decode(code),loadMap()]);
      const identityByGame=new Map(map.identities.map(item=>[Number(item.gameId),item]));const egoByGame=new Map(map.egos.map(item=>[Number(item.gameId),item]));
      const nextIdentities=new Map(),nextEgos=new Map(),orders=[],unknownIdentityIds=[],unknownEgoIds=[];
      slots.forEach(slot=>{
        const sinnerId=String(slot.gameSinnerId<=9?slot.gameSinnerId:slot.gameSinnerId+1).padStart(2,'0');const gameIdentityId=10000+slot.gameSinnerId*100+slot.identityModifier;const mappedIdentity=identityByGame.get(gameIdentityId);const sinner=identityData.find(item=>item.id===sinnerId);
        if(mappedIdentity&&sinner){const identity=sinner.identities.find(item=>item.name===mappedIdentity.name||item.id===mappedIdentity.siteId);if(identity)nextIdentities.set(sinnerId,identity);else unknownIdentityIds.push(gameIdentityId);}else if(slot.identityModifier)unknownIdentityIds.push(gameIdentityId);
        const picks=new Map();RANKS.forEach(rank=>{const modifier=slot.egos[rank];if(!modifier)return;const gameEgoId=20000+slot.gameSinnerId*100+modifier;const mappedEgo=egoByGame.get(gameEgoId);if(mappedEgo)picks.set(rank,mappedEgo.name);else unknownEgoIds.push(gameEgoId);});if(picks.size)nextEgos.set(sinnerId,picks);
        if(slot.slotType>0)orders.push([slot.slotType,sinnerId]);
      });
      if(!nextIdentities.size)throw new Error('no_known_identity');
      if(state.identities.size&&!window.confirm('現在の編成を編成コードの内容で置き換えますか？'))return;
      state.identities=nextIdentities;state.identityAlternatives=new Map();state.egos=nextEgos;state.freeSlotEgoEnabled=new Set();state.identityOrder=orders.sort((a,b)=>a[0]-b[0]).map(item=>item[1]).filter(id=>nextIdentities.has(id));state.activeSinner=identityData[0]?.id||null;
      window.LimbusFormationCodeLastImport={unknownIdentityIds,unknownEgoIds,slots};close();onApplied?.();
      if(unknownIdentityIds.length||unknownEgoIds.length)showToast('読み込める編成を反映しました。サイト未対応の人格またはE.G.Oがあります。');else showToast('編成コードを読み込みました。');
    }catch(cause){console.warn('Formation code import failed',cause);showError('編成コードを読み込めませんでした。コードを確認してください。');}
    finally{loadButton.disabled=false;}
  }
  function showError(message){if(error){error.textContent=message;error.hidden=false;}input?.focus();}
  async function buildSlots(){
    const map=await loadMap();const identityBySite=new Map(map.identities.map(item=>[item.siteId,item]));const egoByKey=new Map(map.egos.map(item=>[`${item.sinnerId}|${item.risk}|${item.name}`,item]));const warnings=[];
    return identityData.map((sinner,index)=>{
      const selected=state.identities.get(sinner.id);let mapped=selected&&!selected.isFreeSlot?identityBySite.get(selected.id):null;if(!mapped&&selected&&!selected.isFreeSlot)mapped=map.identities.find(item=>item.sinnerId===sinner.id&&item.name===selected.name);if(!mapped&&selected)warnings.push(`${sinner.name}の自由枠または未対応人格はLCB囚人として出力されます。`);
      const picks=state.egos.get(sinner.id)||new Map();const egos={};RANKS.forEach(rank=>{const name=picks.get(rank);let ego=name?egoByKey.get(`${sinner.id}|${rank}|${name}`):null;if(!ego&&name)ego=map.egos.find(item=>item.sinnerId===sinner.id&&item.risk===rank&&item.name===name);if(name&&!ego)warnings.push(`${sinner.name}の${rank} E.G.Oはコードへ変換できません。`);egos[rank]=ego?Number(ego.gameId)%100:(rank==='ZAYIN'?1:0);});
      return {identityModifier:mapped?Number(mapped.gameId)%100:1,slotType:Math.max(0,state.identityOrder.indexOf(sinner.id)+1),egos};
    }).map((slot,index)=>({...slot,gameSinnerId:index+1,warnings}));
  }
  async function refresh(){if(!output)return;output.value='生成中…';copyButton.disabled=true;try{const slots=await buildSlots();lastCode=await encode(slots);output.value=lastCode;const warnings=slots[0]?.warnings||[];if(status)status.textContent=warnings[0]||'現在の人格・E.G.O・編成順をゲーム用コードへ変換しました。';copyButton.disabled=false;}catch(cause){console.error(cause);output.value='';if(status)status.textContent='編成コードを生成できませんでした。';}}
  async function copy(){if(!lastCode)await refresh();if(!lastCode)return;try{await navigator.clipboard.writeText(lastCode);}catch{output.focus();output.select();document.execCommand('copy');}showToast('編成コードをコピーしました。');}
  loadButton?.addEventListener('click',importCode);cancelButton?.addEventListener('click',close);openButtons.forEach(button=>button.addEventListener('click',()=>open()));copyButton?.addEventListener('click',copy);
  return {offer,open,reset,refresh,decode,encode};
}
window.LimbusFormationCode={RANKS,slotsToBytes,bytesToSlots,slotsFromContent,encode,decode,create};
})();
