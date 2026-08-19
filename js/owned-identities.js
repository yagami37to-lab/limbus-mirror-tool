(()=>{
  'use strict';
  const IDENTITY_STORAGE_KEY='limbus-owned-identities-v1',EGO_STORAGE_KEY='limbus-owned-egos-v1';
  const SINNER_IDS={'イサン':'01','ファウスト':'02','ドンキホーテ':'03','良秀':'04','ムルソー':'05','ホンル':'06','ヒースクリフ':'07','イシュメール':'08','ロージャ':'09','シンクレア':'11','ウーティス':'12','グレゴール':'13'};
  const INITIAL_EGOS=new Map([['イサン','烏瞰刀'],['ファウスト','表象放出機'],['ドンキホーテ','ラ・サングレ・デ・サンチョ'],['良秀','森羅炎象'],['ムルソー','他人の鎖'],['ホンル','虚幻境'],['ヒースクリフ','死体袋'],['イシュメール','銛穿ち'],['ロージャ','投げられたもの'],['シンクレア','知識の木の枝'],['ウーティス','ト・パソス・マソス'],['グレゴール','ある日突然']]);
  const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const normalize=value=>window.LimbusIdentityImages?.normalize?.(String(value??''))||String(value??'').trim();
  const key=(sinner,identity)=>`${String(sinner??'').trim()}｜${normalize(identity)}`;
  const egoKey=(sinnerId,rank,name)=>`${String(sinnerId).padStart(2,'0')}｜${String(rank).toUpperCase()}｜${String(name).trim()}`;
  function readStore(storageKey){try{const value=JSON.parse(localStorage.getItem(storageKey)||'[]');return new Set(Array.isArray(value)?value:[])}catch{return new Set()}}
  function writeStore(storageKey,values){localStorage.setItem(storageKey,JSON.stringify([...values].sort()));window.dispatchEvent(new CustomEvent('limbus-owned-identities-changed'));}
  const read=()=>readStore(IDENTITY_STORAGE_KEY),write=values=>writeStore(IDENTITY_STORAGE_KEY,values),readEgos=()=>readStore(EGO_STORAGE_KEY),writeEgos=values=>writeStore(EGO_STORAGE_KEY,values);
  const isInitialEgo=(sinner,name)=>INITIAL_EGOS.get(String(sinner||'').trim())===String(name||'').trim();
  function rateForParty(party,egos=[]){
    const requiredIdentities=(Array.isArray(party)?party:[]).filter(item=>!item?.is_free&&!item?.isFreeSlot&&normalize(item?.identity)&&normalize(item?.identity)!=='自由枠（誰でも可）');
    const requiredEgos=(Array.isArray(egos)?egos:[]).flatMap(group=>(group?.items||[]).map(value=>{const raw=String(value||'').trim(),separator=raw.indexOf(':');return{sinner:group.sinner,rank:separator>0?raw.slice(0,separator).trim():'',name:separator>0?raw.slice(separator+1).trim():raw}}).filter(item=>item.name));
    const total=requiredIdentities.length+requiredEgos.length;if(!total)return 100;
    const owned=read(),ownedEgos=readEgos();
    const identityCount=requiredIdentities.filter(item=>normalize(item.identity)==='LCB囚人'||owned.has(key(item.sinner,item.identity))).length;
    const egoCount=requiredEgos.filter(item=>isInitialEgo(item.sinner,item.name)||ownedEgos.has(egoKey(SINNER_IDS[item.sinner]||'',item.rank,item.name))).length;
    return Math.round((identityCount+egoCount)/total*100);
  }
  function applyCard(card,party,egos=[]){
    const rate=rateForParty(party,egos);card.dataset.ownedRate=String(rate);
    const label=[...card.querySelectorAll('.post-card-label')].find(node=>node.textContent.includes('使用人格'));if(!label)return;
    let badge=label.querySelector('.post-owned-rate');if(!badge){badge=document.createElement('span');badge.className='post-owned-rate';label.appendChild(badge)}
    badge.textContent=`所持率 ${rate}%`;badge.dataset.rate=String(rate);badge.dataset.level=rate>=80?'high':rate>=50?'mid':'low';
  }
  async function setupSettings(){
    const root=document.querySelector('[data-owned-identity-settings]');if(!root)return;
    const grid=root.querySelector('[data-owned-identity-grid]'),search=root.querySelector('[data-owned-identity-search]'),summary=root.querySelector('[data-owned-identity-summary]');
    let identityData=[],egoData={};
    try{const responses=await Promise.all([fetch('data/identities.json?v=1.1.47'),fetch('data/egos.json?v=1.1.47')]);if(responses.some(response=>!response.ok))throw new Error('owned-data');[identityData,egoData]=await Promise.all(responses.map(response=>response.json()));}catch{root.innerHTML='<p class="account-notice" data-state="error">人格・E.G.Oデータを読み込めませんでした。</p>';return}
    const identities=identityData.flatMap(sinner=>sinner.identities.filter(identity=>normalize(identity.name)!=='LCB囚人').map(identity=>({type:'identity',sinnerId:sinner.id,sinner:sinner.name,name:identity.name,meta:identity.rarity||'人格',image:window.LimbusIdentityImages?.forIdentity?.(sinner.name,identity.name)||'',key:key(sinner.name,identity.name)})));
    const egos=identityData.flatMap(sinner=>(egoData[String(Number(sinner.id))]||egoData[sinner.id]||[]).filter(([name])=>!isInitialEgo(sinner.name,name)).map(([name,rank])=>({type:'ego',sinnerId:sinner.id,sinner:sinner.name,name,meta:String(rank).toUpperCase(),image:window.LimbusEgoImages?.forEgo?.(sinner.id,name,egoData)||'',key:egoKey(sinner.id,rank,name)})));
    let mode='identity',activeSinner=identityData[0]?.id||'',owned=read(),ownedEgos=readEgos();
    const legacyLcbKeys=[...owned].filter(value=>String(value).endsWith('｜LCB囚人'));if(legacyLcbKeys.length){legacyLcbKeys.forEach(value=>owned.delete(value));write(owned)}
    const initialEgoKeys=[...ownedEgos].filter(value=>{const [id,,name]=String(value).split('｜');const sinner=Object.keys(SINNER_IDS).find(candidate=>SINNER_IDS[candidate]===id);return isInitialEgo(sinner,name)});if(initialEgoKeys.length){initialEgoKeys.forEach(value=>ownedEgos.delete(value));writeEgos(ownedEgos)}
    const modeTabs=root.querySelector('[data-owned-mode-tabs]'),sinnerTabs=root.querySelector('[data-owned-sinner-tabs]');
    const currentItems=()=>mode==='identity'?identities:egos,currentOwned=()=>mode==='identity'?owned:ownedEgos,save=()=>mode==='identity'?write(owned):writeEgos(ownedEgos);
    const updateSummary=()=>{summary.textContent=`人格 ${owned.size} / ${identities.length}・E.G.O ${ownedEgos.size} / ${egos.length}`};
    const renderSinners=()=>{sinnerTabs.innerHTML=identityData.map(sinner=>`<button type="button" class="owned-sinner-tab${sinner.id===activeSinner?' active':''}" data-sinner-id="${esc(sinner.id)}"><small>${esc(sinner.id)}</small><strong>${esc(sinner.name)}</strong></button>`).join('');sinnerTabs.querySelectorAll('button').forEach(button=>button.onclick=()=>{activeSinner=button.dataset.sinnerId;renderSinners();render()})};
    const render=()=>{const term=search.value.trim().toLowerCase(),set=currentOwned(),items=currentItems().filter(item=>item.sinnerId===activeSinner&&`${item.sinner} ${item.name}`.toLowerCase().includes(term));grid.innerHTML=items.map(item=>`<label class="owned-identity-item owned-${item.type}-item${set.has(item.key)?' is-owned':''}" data-rank="${esc(item.meta)}">${item.image?`<img class="owned-identity-image" src="${esc(item.image)}" alt="" loading="lazy">`:''}<span class="owned-identity-overlay" aria-hidden="true"></span><input type="checkbox" value="${esc(item.key)}" ${set.has(item.key)?'checked':''}><span class="owned-identity-copy"><small>${esc(item.meta)}</small><b>${esc(item.name)}</b></span></label>`).join('')||'<p class="owned-empty">該当する項目はありません。</p>';grid.querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{if(input.checked)set.add(input.value);else set.delete(input.value);save();input.closest('.owned-identity-item').classList.toggle('is-owned',input.checked);updateSummary()}));updateSummary()};
    modeTabs.querySelectorAll('button').forEach(button=>button.onclick=()=>{mode=button.dataset.ownedMode;modeTabs.querySelectorAll('button').forEach(tab=>tab.classList.toggle('active',tab===button));search.placeholder=mode==='identity'?'人格名で絞り込み':'E.G.O名で絞り込み';render()});
    search.addEventListener('input',render);root.querySelector('[data-owned-all]').addEventListener('click',()=>{const set=currentOwned();currentItems().filter(item=>item.sinnerId===activeSinner).forEach(item=>set.add(item.key));save();render()});root.querySelector('[data-owned-clear]').addEventListener('click',()=>{const label=mode==='identity'?'人格':'E.G.O';if(!confirm(`表示中の囚人の所持${label}をすべて解除しますか？`))return;const set=currentOwned();currentItems().filter(item=>item.sinnerId===activeSinner).forEach(item=>set.delete(item.key));save();render()});
    renderSinners();render();
  }
  window.LimbusOwnedIdentities={read,write,readEgos,writeEgos,key,egoKey,isInitialEgo,rateForParty,applyCard};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setupSettings);else setupSettings();
})();
