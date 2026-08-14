(async()=>{
const [sinnerIdentityData,sinnerEgoData,keywordDefinitions,themePackData]=await Promise.all([
  fetch('data/identities.json').then(r=>{if(!r.ok)throw new Error('identities.json');return r.json()}),
  fetch('data/egos.json').then(r=>{if(!r.ok)throw new Error('egos.json');return r.json()}),
  fetch('data/keywords.json').then(r=>{if(!r.ok)throw new Error('keywords.json');return r.json()}),
  fetch('data/packs.json').then(r=>{if(!r.ok)throw new Error('packs.json');return r.json()})
]);
const identityOptions=sinnerIdentityData.flatMap(sinner=>sinner.identities.map(identity=>`${sinner.name}｜${identity.name}`));
const categoryDefinitions=window.STRATEGY_CATEGORIES||[];
const categoryById=id=>categoryDefinitions.find(item=>item.id===id)||categoryDefinitions[0]||{id:'mirror_dungeon',label:'鏡ダンジョン',available:true};
const categoryIconMarkup=(category,className='category-image-icon')=>category?.iconImage?`<img class="${className}" src="${category.iconImage}" alt="" loading="lazy">`:`<span aria-hidden="true">${category?.icon||''}</span>`;
const searchOptions={
  keyword:keywordDefinitions.filter(item=>item.name!=='ソロ').map(item=>item.name),
  type:['安定周回','速攻周回','高難易度向け','縛り・テーマ攻略','ネタ・ロマン','ソロ'],
  strategy:['オート対応','半オート','手動推奨','初心者向け','中級者向け','上級者向け','安定重視','高速周回','自由枠あり','人格固定','運要素あり','E.G.O依存','ギフト依存'],
  difficulty:['ノーマル','ハード'],
  affiliation:['リンバス・カンパニー','ロボトミー本社','H社','N社','R社','T社','W社','ツヴァイ','シ','センク','リウ','セブン','チェーヴィチ','ディエーチ','ウーフィ','剣契','黒雲会','技術解放連合','ワザリング・ハイツ','ピークォド号','血鬼','黒獣','指','親指','人差し指','中指','薬指','小指','蜘蛛の巣','LCE','E.G.O装備','捨てる']
};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

// 訪問数の集計はトップページで継続し、表示は管理者アカウント側で確認する。
async function trackSiteVisit(){
  try{await window.LimbusCommunity?.registerVisit();}
  catch(error){console.warn('訪問数を記録できませんでした。',error);}
}
trackSiteVisit();

const categoryPicker=$('[data-category-picker]'),postModal=$('[data-post-modal]'),toast=$('[data-toast]');
// ライト / ダークモード切り替え（ユーザー選択を保存）
const themeToggles=[...document.querySelectorAll('[data-theme-toggle]')];
const themeRoot=document.documentElement;
const savedTheme=localStorage.getItem('limbus-theme');
const initialTheme=savedTheme || 'light';
function applyTheme(theme){
  themeRoot.dataset.theme=theme;
  const dark=theme==='dark';
  themeToggles.forEach(themeToggle=>{
    themeToggle.setAttribute('aria-pressed',String(dark));
    themeToggle.setAttribute('aria-label',dark?'ライトモードに切り替える':'ダークモードに切り替える');
  });
}
applyTheme(initialTheme);
themeToggles.forEach(themeToggle=>themeToggle.addEventListener('click',()=>{
  const next=themeRoot.dataset.theme==='dark'?'light':'dark';
  applyTheme(next);
  localStorage.setItem('limbus-theme',next);
}));

// モーダル表示中は背面ページを固定する（PC / iOS Safari 両対応）
let lockedScrollY=0;
let openDialogCount=0;
function lockPageScroll(){
  openDialogCount+=1;
  if(openDialogCount>1)return;
  lockedScrollY=window.scrollY;
  document.body.classList.add("dialog-open");
  document.body.style.top=`-${lockedScrollY}px`;
}
function restorePageScroll(){
  openDialogCount=0;
  document.body.classList.remove("dialog-open");
  document.body.style.removeProperty("top");
  document.documentElement.style.removeProperty("overflow");
  document.body.style.removeProperty("overflow");
  window.scrollTo(0,lockedScrollY);
}
function reconcilePageScrollLock(){
  const anyOpen=[...document.querySelectorAll("dialog")].some(dialog=>dialog.open);
  if(!anyOpen)restorePageScroll();
}
function unlockPageScroll(){
  openDialogCount=Math.max(0,openDialogCount-1);
  if(openDialogCount>0)return;
  restorePageScroll();
}
function openDialog(dialog){
  if(dialog.open)return;
  lockPageScroll();
  dialog.showModal();
}
function closeDialog(dialog){
  if(!dialog?.open){queueMicrotask(reconcilePageScrollLock);return;}
  dialog.close();
  queueMicrotask(reconcilePageScrollLock);
}
[$('[data-selector-modal]'),categoryPicker,postModal].filter(Boolean).forEach(dialog=>{
  dialog.addEventListener("close",unlockPageScroll);
  dialog.addEventListener("cancel",event=>{
    event.preventDefault();
    closeDialog(dialog);
  });
});

function showToast(m){toast.textContent=m;toast.classList.add("show");clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.remove("show"),2200)}

const searchController=window.LimbusSearchController.create({
  identityOptions,
  categoryDefinitions,
  categoryById,
  categoryIconMarkup,
  searchOptions,
  openDialog,
  closeDialog,
  showToast
});

// 投稿ワークスペース
const postState={step:1,category:'mirror_dungeon',type:null,difficulty:null,identities:new Map(),identityAlternatives:new Map(),identityOrder:[],egos:new Map(),freeSlotEgoEnabled:new Set(),themePacks:new Map(),activeThemePackFloor:null,strategyTags:new Set(),affiliationTags:new Set(),ammoKeywordSelected:false,activeSinner:null,activeEgoSinner:null,alternativeSelectionMode:false};
const stepInfo={1:['STEP 1','攻略タイプを選択','この攻略がどんなプレイヤー向けか選んでください。'],2:['STEP 2','使用人格を選択','囚人を選び、それぞれ使用する人格を1つずつ選択してください。'],3:['STEP 3','編成順を選択','使用人格を、実際に出撃させる順番で選択してください。'],4:['STEP 4','使用E.G.Oを選択','※任意のステップです。使用するE.G.Oがある場合のみ設定してください。'],5:['STEP 5','進行テーマパックを選択','※任意のステップです。階層ごとに通過したテーマパックを選択してください。'],6:['STEP 6','詳細情報を入力','攻略タグや説明、所属・特殊タグを入力してください。'],7:['STEP 7','確認して投稿','入力内容を確認して投稿へ進みます。']};
const postTitle=$('[data-post-title]');
const postSummary=$('[data-post-summary]');
const postSummaryCount=$('[data-post-summary-count]');
const identitySinnerRoster=$('[data-identity-sinner-roster]');
const identityGrid=$('[data-post-identity-grid]');
const identitySelectHeader=$('.identity-select-header');
const identitySelectView=$('[data-identity-select-view]');
const currentSinnerName=$('[data-current-sinner-name]');
const currentIdentityName=$('[data-current-identity-name]');
const identityKeywordFilters=$('[data-identity-keyword-filters]');
const identityNameFilter=$('[data-identity-name-filter]');
const identityRarityFilter=$('[data-identity-rarity-filter]');
const identityMultiOnly=$('[data-identity-multi-only]');
const identityIncludeConditional=$('[data-identity-include-conditional]');
const identityFilterMode=$('[data-identity-filter-mode]');
const identityFilterPanel=$('[data-identity-filter-panel]');
const identityFooterActions=$('[data-identity-footer-actions]');
const workspaceFooter=$('.workspace-footer');
const toggleIdentitySearch=$('[data-toggle-identity-search]');
const clearCurrentIdentity=$('[data-clear-current-identity]');
const clearAllIdentities=$('[data-clear-all-identities]');
const fillEmptyIdentities=$('[data-fill-empty-identities]');
const applyIdentityFilters=$('[data-apply-identity-filters]');
if(identityIncludeConditional)identityIncludeConditional.checked=true;
const identityFilterScrollHint=$('[data-identity-filter-scroll-hint]');
let identityFilterScrollTop=0;
const identityFilterSummaryChips=$('[data-identity-filter-summary-chips]');
const partyKeywordSummaryChips=$('[data-party-keyword-summary-chips]');
let activeIdentityKeywords=new Set();
const formationChoiceGrid=$('[data-formation-choice-grid]');
const formationSelectedStrip=$('[data-formation-selected-strip]');
const formationCount=$('[data-formation-count]');
const formationTotal=$('[data-formation-total]');
const formationEmptyNote=$('[data-formation-empty-note]');
const resetFormationButton=$('[data-reset-formation]');
const strategyTagGrid=$('[data-strategy-tag-grid]');
const affiliationTagGrid=$('[data-affiliation-tag-grid]');
const automaticKeywordTags=$('[data-automatic-keyword-tags]');
const ammoKeywordNote=$('[data-ammo-keyword-note]');
const strategyTagCount=$('[data-strategy-tag-count]');
const affiliationTagCount=$('[data-affiliation-tag-count]');
const yiSangIdentityImages={
  'ロボトミーE.G.O::厳粛な哀悼':'assets/identities/yi-sang/001.png',
  '蜘蛛の巣 人差し指の親方':'assets/identities/yi-sang/002.png',
  '黒獣・午 筆頭':'assets/identities/yi-sang/003.png',
  '南部リウ協会3課':'assets/identities/yi-sang/004.png',
  '薬指点描派 スチューデント':'assets/identities/yi-sang/005.png',
  'W社3級整理要員':'assets/identities/yi-sang/006.png',
  '開花E.G.O::壇香梅':'assets/identities/yi-sang/007.png',
  '剣契 殺手':'assets/identities/yi-sang/008.png',
  'ピークォド号1等航海士':'assets/identities/yi-sang/009.png',
  '南部セブン協会6課':'assets/identities/yi-sang/010.png',
  'LCB囚人':'assets/identities/yi-sang/011.png',
  'LCE E.G.O::提灯':'assets/identities/yi-sang/012.png',
  'N社E.G.O::凶弾':'assets/identities/yi-sang/013.png',
  '南部ディエーチ協会4課':'assets/identities/yi-sang/014.png',
  '奥歯事務所フィクサー':'assets/identities/yi-sang/015.png',
  'LCE E.G.O::次元裂き':'assets/identities/yi-sang/016.png'
};
const yiSangDefaultImage=yiSangIdentityImages['LCB囚人'];
function identityImageFor(sinnerId,identity){return window.LimbusIdentityImages?.forIdentity?.(sinnerId,identity?.name,{free:!!identity?.isFreeSlot})||(sinnerId==='01'?(identity?.isFreeSlot?yiSangDefaultImage:(yiSangIdentityImages[identity?.name]||yiSangDefaultImage)):'');}
function applyIdentityCardImage(element,imageUrl){
  if(!element)return;
  if(!imageUrl){element.classList.remove('has-identity-image');element.style.removeProperty('background-image');return;}
  element.classList.add('has-identity-image');
  const safeUrl=String(imageUrl);
  element.style.backgroundImage=`url("${safeUrl}")`;
} 
function themePackCanonicalNames(){
  const names=[];Object.values(themePackData?.modes||{}).forEach(mode=>Object.values(mode?.floors||{}).forEach(list=>(list||[]).forEach(name=>{if(name&&!names.includes(name))names.push(name);})));return names;
}
function normalizeThemePackKey(value){return String(value??'').normalize('NFKC').replace(/[\s・･,，、.。:：／/\\-_―—–]/g,'').toLowerCase();}
function levenshteinDistance(a,b){const x=[...a],y=[...b],row=Array.from({length:y.length+1},(_,i)=>i);for(let i=1;i<=x.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=y.length;j++){const tmp=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(x[i-1]===y[j-1]?0:1));prev=tmp;}}return row[y.length];}
const themePackCanonicalList=themePackCanonicalNames();
const themePackCanonicalByKey=new Map(themePackCanonicalList.map(name=>[normalizeThemePackKey(name),name]));
function normalizeThemePackName(value){
  const original=String(value??'').trim();if(!original||original==='自由枠')return original;
  if(themePackCanonicalList.includes(original))return original;
  const key=normalizeThemePackKey(original);if(themePackCanonicalByKey.has(key))return themePackCanonicalByKey.get(key);
  let best=null,bestDistance=Infinity,ties=0;for(const candidate of themePackCanonicalList){const d=levenshteinDistance(key,normalizeThemePackKey(candidate));if(d<bestDistance){best=candidate;bestDistance=d;ties=1;}else if(d===bestDistance)ties++;}
  const maxDistance=key.length>=12?2:1;return best&&ties===1&&bestDistance<=maxDistance?best:original;
}
function normalizeThemePackEntries(entries){return (entries||[]).map(x=>({...x,name:normalizeThemePackName(x?.name)}));}
const strategyTagOptions=['オート対応','半オート','手動推奨','初心者向け','中級者向け','上級者向け','安定重視','高速周回','自由枠あり','人格固定','運要素あり','E.G.O依存','ギフト依存'];
const affiliationTagOptions=['リンバス・カンパニー','ロボトミー本社','H社','N社','R社','T社','W社','ツヴァイ','シ','センク','リウ','セブン','チェーヴィチ','ディエーチ','ウーフィ','剣契','黒雲会','技術解放連合','ワザリング・ハイツ','ピークォド号','血鬼','黒獣','指','親指','人差し指','中指','薬指','小指','蜘蛛の巣','LCE','E.G.O装備','捨てる'];
const automaticKeywordOptions=['火傷','出血','振動','破裂','沈潜','呼吸','充電'];
const egoSinnerGrid=$('[data-post-ego-sinner-grid]');
const egoGrid=$('[data-post-ego-grid]');
const egoSinnerView=$('[data-ego-sinner-view]');
const egoSelectView=$('[data-ego-select-view]');
const currentEgoSinnerName=$('[data-current-ego-sinner-name]');
const currentEgoSummary=$('[data-current-ego-summary]');
const egoConfirmButton=$('[data-confirm-ego-selection]');
const egoFooterActions=$('[data-ego-footer-actions]');
const clearCurrentEgos=$('[data-clear-current-egos]');
const clearAllEgos=$('[data-clear-all-egos]');
const workspaceStepName=$('[data-workspace-step-name]');
const workspaceStepCounter=$('[data-workspace-step-counter]');
const mobilePrevStep=$('[data-mobile-prev-step]');
const themeFloorGrid=$('[data-theme-floor-grid]');
const themePackSelectView=$('[data-theme-pack-select-view]');
const themePackOptionGrid=$('[data-theme-pack-option-grid]');
const themePackFloorLabel=$('[data-theme-pack-floor-label]');
const themePackSearch=$('[data-theme-pack-search]');
const themePackCount=$('[data-theme-pack-count]');
const closeThemePackSelectButton=$('[data-close-theme-pack-select]');
const postStage=$('.post-stage');
function getScrollableAncestor(element){
  let node=element?.parentElement;
  while(node&&node!==document.body){
    const style=getComputedStyle(node);
    const canScroll=/(auto|scroll|overlay)/.test(style.overflowY)&&node.scrollHeight>node.clientHeight+1;
    if(canScroll)return node;
    node=node.parentElement;
  }
  return postStage||document.scrollingElement;
}
function smoothScrollToElement(element,offset=24,behavior='smooth'){
  if(!element)return;
  const scrollContainer=getScrollableAncestor(element);
  if(scrollContainer&&scrollContainer!==document.scrollingElement){
    const containerRect=scrollContainer.getBoundingClientRect();
    const elementRect=element.getBoundingClientRect();
    const top=scrollContainer.scrollTop+(elementRect.top-containerRect.top)-offset;
    scrollContainer.scrollTo({top:Math.max(0,top),behavior});
    return;
  }
  const top=window.scrollY+element.getBoundingClientRect().top-offset;
  window.scrollTo({top:Math.max(0,top),behavior});
}
function queueIdentityScroll(element,offset=24){
  requestAnimationFrame(()=>requestAnimationFrame(()=>smoothScrollToElement(element,offset,'smooth')));
  window.setTimeout(()=>smoothScrollToElement(element,offset,'smooth'),180);
}
function resetStageScroll(){
  if(!postStage)return;
  postStage.scrollTo({top:0,behavior:'auto'});
}
const cardTones=[['#5f4b36','#1d1711'],['#3c4658','#131820'],['#594658','#1e1720'],['#40595c','#151e20'],['#6b4c3f','#251713'],['#4e4537','#181510']];
const keywordCardTones={'火傷':['#9b2f24','#2a0d09'],'出血':['#6e1423','#21070d'],'振動':['#b28a1c','#2b2107'],'破裂':['#397a3c','#0d2510'],'呼吸':['#286ca8','#0a1d32'],'沈潜':['#253d78','#091126'],'充電':['#653c9b','#1c0d2d'],'弾丸':['#8a6a2d','#241b09']};
function cardToneForKeywords(keywords,index=0){return keywordCardTones[(keywords||[])[0]]||cardTones[index%cardTones.length];}
function alternativesFor(sinnerId){if(!postState.identityAlternatives.has(sinnerId))postState.identityAlternatives.set(sinnerId,[]);return postState.identityAlternatives.get(sinnerId);}
function alternativeNamesFor(sinnerId){return alternativesFor(sinnerId).map(item=>item.name).filter(Boolean);}
function isSoloPost(){return postState.type==='ソロ';}
function formationPosition(sinnerId){const index=postState.identityOrder.indexOf(sinnerId);return index===-1?null:index+1;}
function ensureFormationPosition(sinnerId){
  if(isSoloPost()){
    postState.identityOrder=[sinnerId];
    for(const id of [...postState.egos.keys()])if(id!==sinnerId)postState.egos.delete(id);
    postState.freeSlotEgoEnabled=new Set([...postState.freeSlotEgoEnabled].filter(id=>id===sinnerId));
    return;
  }
  if(!postState.identityOrder.includes(sinnerId))postState.identityOrder.push(sinnerId);
}
function removeFormationPosition(sinnerId){postState.identityOrder=postState.identityOrder.filter(id=>id!==sinnerId);}
function orderedSelectedSinners(){return postState.identityOrder.map(id=>sinnerIdentityData.find(s=>s.id===id)).filter(Boolean).filter(s=>postState.identities.has(s.id));}
function renderIdentitySinnerRoster(){
  identitySinnerRoster.innerHTML='';
  sinnerIdentityData.forEach((sinner,index)=>{
    const chosen=postState.identities.get(sinner.id);
    const order=formationPosition(sinner.id);
    const b=document.createElement('button');
    b.type='button';
    b.className='identity-sinner-button'+(postState.activeSinner===sinner.id?' active':'')+(chosen?' selected':'');
    b.style.setProperty('--card-a',cardTones[index%cardTones.length][0]);
    b.style.setProperty('--card-b',cardTones[index%cardTones.length][1]);
    b.title=chosen?`${sinner.name}：${chosen.name}`:`${sinner.name}の人格を選択`;
    const rosterImage=identityImageFor(sinner.id,chosen);applyIdentityCardImage(b,rosterImage);
    b.innerHTML=`<span class="identity-sinner-number">${sinner.id}</span><span class="identity-sinner-mark">${sinner.name.slice(0,1)}</span><strong>${sinner.name}</strong><small class="identity-sinner-selection">${chosen?chosen.name:'未選択'}</small>`;
    b.addEventListener('click',()=>openIdentitySelect(sinner.id));
    identitySinnerRoster.appendChild(b);
  });
}
function openIdentitySelect(sinnerId,{scroll=true}={}){
  postState.activeSinner=sinnerId;
  postState.alternativeSelectionMode=false;
  const sinner=sinnerIdentityData.find(x=>x.id===sinnerId);
  currentSinnerName.textContent=sinner.name;
  currentIdentityName.textContent=postState.identities.get(sinnerId)?.name||'未選択';
  renderIdentitySinnerRoster();
  renderIdentityAlternativeControls();
  renderIdentityOptions();
  updateIdentityFooterState();
  if(scroll)queueIdentityScroll(identitySelectHeader,18);
}
function renderIdentityAlternativeControls(){
  let root=document.querySelector('[data-identity-alternative-controls]');
  if(!root){
    root=document.createElement('div');root.dataset.identityAlternativeControls='';root.className='identity-alternative-controls';
    identitySelectHeader?.insertAdjacentElement('afterend',root);
  }
  const sinner=sinnerIdentityData.find(x=>x.id===postState.activeSinner);const primary=postState.identities.get(postState.activeSinner);const alternatives=alternativesFor(postState.activeSinner);
  if(!sinner||!primary){root.hidden=true;return;}
  const cards=alternatives.length?`<div class="identity-alternative-summary">${alternatives.map(item=>{const image=identityImageFor(sinner.id,item);return `<span class="identity-alternative-chip${image?' has-identity-image':''}"${image?` style="background-image:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.78)),url('${reviewEscape(image)}')"`:''}>${reviewEscape(item.name)}</span>`;}).join('')}</div>`:'<small>未設定</small>';
  root.hidden=false;root.innerHTML=`<div><strong>代用人格（任意）</strong>${cards}</div><button type="button" data-toggle-alternatives>${postState.alternativeSelectionMode?'代用人格の選択を完了':'＋代用人格を追加（任意）'}</button>`;
  root.querySelector('[data-toggle-alternatives]').onclick=()=>{postState.alternativeSelectionMode=!postState.alternativeSelectionMode;renderIdentityAlternativeControls();renderIdentityOptions();};
}
function renderIdentityKeywordFilters(){
  identityKeywordFilters.innerHTML='';
  keywordDefinitions.filter(keyword=>keyword.name!=='ソロ').forEach(keyword=>{
    const b=document.createElement('button');b.type='button';b.className='keyword-filter-chip'+(keyword.id==='ammo'?' keyword-ammo':'')+(activeIdentityKeywords.has(keyword.name)?' active':'');
    b.textContent=keyword.name;b.dataset.keyword=keyword.name;b.addEventListener('click',()=>{activeIdentityKeywords.has(keyword.name)?activeIdentityKeywords.delete(keyword.name):activeIdentityKeywords.add(keyword.name);renderIdentityKeywordFilters();renderIdentityOptions();updateIdentityFilterSummary();updateIdentitySearchButtonState();});
    identityKeywordFilters.appendChild(b);
  });
}
function updateIdentityFilterSummary(){
  if(!identityFilterSummaryChips)return;
  const items=[];
  const name=identityNameFilter.value.trim();
  if(name)items.push(`名前：${name}`);
  if(identityRarityFilter.value!=='all')items.push(`レアリティ：${identityRarityFilter.value}`);
  [...activeIdentityKeywords].forEach(keyword=>items.push(keyword));
  if(activeIdentityKeywords.size>1)items.push(identityFilterMode.value==='and'?'AND検索':'OR検索');
  if(identityMultiOnly.checked)items.push('複数キーワードのみ');
  if(identityIncludeConditional.checked)items.push('条件付き含む');
  identityFilterSummaryChips.innerHTML=items.length?items.map(item=>`<span class="filter-summary-chip">${item}</span>`).join(''):'<span class="filter-summary-empty">指定なし</span>';
}
function resetIdentityFilters(){activeIdentityKeywords.clear();identityNameFilter.value='';identityRarityFilter.value='all';identityMultiOnly.checked=false;identityIncludeConditional.checked=true;identityFilterMode.value='or';renderIdentityKeywordFilters();renderIdentityOptions();updateIdentityFilterSummary();updateIdentitySearchButtonState();}
function renderIdentityOptions(){
  const sinner=sinnerIdentityData.find(x=>x.id===postState.activeSinner);if(!sinner)return;
  const selectedIdentity=postState.identities.get(sinner.id);const selectedName=selectedIdentity?.name;identityGrid.innerHTML='';
  const query=identityNameFilter.value.trim().toLowerCase();const rarity=identityRarityFilter.value;const selectedKeywords=[...activeIdentityKeywords];const mode=identityFilterMode.value;const includeConditional=identityIncludeConditional.checked;
  const effectiveKeywords=identity=>{const base=[...(identity.keywords||[])];if(includeConditional)(identity.conditionalKeywords||[]).forEach(c=>(c.keywords||[]).forEach(k=>{if(!base.includes(k))base.push(k);}));return base;};
  const rarityOrder={'000':3,'00':2,'0':1};
  const visible=sinner.identities.filter(identity=>{
    const searchableKeywords=effectiveKeywords(identity);const nameOk=!query||identity.name.toLowerCase().includes(query);const rarityOk=rarity==='all'||identity.rarity===rarity;const multiOk=!identityMultiOnly.checked||searchableKeywords.length>=2;
    const keywordOk=!selectedKeywords.length||(mode==='and'?selectedKeywords.every(k=>searchableKeywords.includes(k)):selectedKeywords.some(k=>searchableKeywords.includes(k)));
    return nameOk&&rarityOk&&multiOk&&keywordOk;
  }).sort((a,b)=>(rarityOrder[b.rarity]||0)-(rarityOrder[a.rarity]||0)||a.name.localeCompare(b.name,'ja',{numeric:true,sensitivity:'base'}));

  const showFreeSlot=!query&&rarity==='all'&&!selectedKeywords.length&&!identityMultiOnly.checked;
  if(showFreeSlot){
    const free=document.createElement('button');
    free.type='button';
    const freeOrder=selectedIdentity?.isFreeSlot?formationPosition(sinner.id):null;
    free.className='identity-option-card identity-option-free'+(selectedIdentity?.isFreeSlot?' selected':'');
    free.style.setProperty('--card-a','#6a604f');free.style.setProperty('--card-b','#191713');const freeImage=identityImageFor(sinner.id,{isFreeSlot:true});applyIdentityCardImage(free,freeImage);
    free.innerHTML=`<span class="identity-rarity">FREE</span><span class="identity-placeholder">＋</span><strong>自由枠</strong><div class="identity-keywords"><span>誰でも可</span></div><p class="identity-note">${sinner.name}の人格は指定しません。</p><small class="identity-confidence">人格指定なし</small>`;
    free.addEventListener('click',()=>{
      const freeIdentity={name:'自由枠（誰でも可）',rarity:'FREE',keywords:[],isFreeSlot:true};
      postState.identities.set(sinner.id,freeIdentity);
      postState.identityOrder=postState.identityOrder.filter(id=>id!==sinner.id);
      postState.egos.delete(sinner.id);
      postState.freeSlotEgoEnabled.delete(sinner.id);
      currentIdentityName.textContent=freeIdentity.name;
      renderIdentitySinnerRoster();renderIdentityAlternativeControls();renderIdentityOptions();updatePostIdentityCount();
      showToast(`${sinner.name}を自由枠に設定しました。`);
      queueIdentityScroll(identitySinnerRoster,18);
    });
    identityGrid.appendChild(free);
  }

  visible.forEach((identity,index)=>{
    const tone=cardToneForKeywords(identity.keywords,index);
    const b=document.createElement('button');
    b.type='button';
    const isSelected=selectedName===identity.name;const isAlternative=alternativeNamesFor(sinner.id).includes(identity.name);
    b.className='identity-option-card'+(isSelected?' selected':'')+(isAlternative?' alternative-selected':'')+(postState.alternativeSelectionMode?' alternative-mode':'');
    b.style.setProperty('--card-a',tone[0]);b.style.setProperty('--card-b',tone[1]);
    const identityImage=identityImageFor(sinner.id,identity);applyIdentityCardImage(b,identityImage);
    const chips=(identity.keywords||[]).length
      ?identity.keywords.map(k=>`<span class="${k==='弾丸'?'keyword-ammo':''}" data-keyword="${k}">${k}</span>`).join('')
      :'<span class="keyword-none">未分類</span>';
    const conditional=(identity.conditionalKeywords||[]).map(c=>`<div class="conditional-keyword${(c.keywords||[]).includes('弾丸')?' keyword-ammo':''}"><b>条件付き</b><span>${(c.keywords||[]).map(k=>`<i data-keyword="${k}">${k}</i>`).join('・')}</span><small>${c.conditionLabel}</small></div>`).join('');
    const lossConditions=identity.keywordLossConditions||[];
    const lossKeywords=[...new Set(lossConditions.flatMap(c=>c.keywords||[]))];
    const losses=lossConditions.length?`<div class="keyword-loss-condition"><div class="keyword-loss-title"><b>条件付き</b><span>${lossKeywords.map(k=>`<i data-keyword="${k}">${k}</i>`).join('・')}</span></div><div class="keyword-loss-list">${lossConditions.map(c=>`<small class="keyword-loss-row">● ${c.conditionLabel} → ${(c.keywords||[]).join('・')}消失</small>`).join('')}</div></div>`:'';
    const notes=(identity.notes||[]).map(n=>`<p class="identity-note">${n}</p>`).join('');
    const confidence=identity.keywordConfidence==='user-reviewed'?'確認済み':identity.keywordConfidence==='community-explicit'?'複数キーワード確認済み':'初期分類・要確認';
    b.innerHTML=`<span class="identity-rarity">${identity.rarity}</span><span class="identity-placeholder">${String(index+1).padStart(2,'0')}</span><strong>${identity.name}</strong><div class="identity-keywords">${chips}</div>${conditional}${losses}${notes}<small class="identity-confidence">${confidence}</small>`;
    b.addEventListener('click',()=>{
      if(postState.alternativeSelectionMode){
        if(selectedName===identity.name){showToast('使用人格と同じ人格は代用人格に設定できません。');return;}
        const current=alternativesFor(sinner.id);const exists=current.some(item=>item.name===identity.name);
        postState.identityAlternatives.set(sinner.id,exists?current.filter(item=>item.name!==identity.name):[...current,identity]);
        renderIdentityAlternativeControls();renderIdentityOptions();showToast(exists?'代用人格から解除しました。':'代用人格へ追加しました。');return;
      }
      postState.identities.set(sinner.id,identity);postState.identityAlternatives.set(sinner.id,alternativesFor(sinner.id).filter(item=>item.name!==identity.name));clearStepValidation(2);postState.identityOrder=postState.identityOrder.filter(id=>id!==sinner.id);postState.freeSlotEgoEnabled.delete(sinner.id);currentIdentityName.textContent=identity.name;renderIdentitySinnerRoster();renderIdentityAlternativeControls();renderIdentityOptions();updatePostIdentityCount();showToast(`${sinner.name}：${identity.name}を選択しました。`);queueIdentityScroll(identitySinnerRoster,18);
    });
    identityGrid.appendChild(b);
  });
  $('[data-identity-filter-count]').textContent=`${visible.length+(showFreeSlot?1:0)} / ${sinner.identities.length+(showFreeSlot?1:0)}`;$('[data-identity-filter-empty]').hidden=visible.length!==0||showFreeSlot;
}
function updatePartyKeywordSummary(){
  if(!partyKeywordSummaryChips)return;
  const baseCounts=new Map(keywordDefinitions.map(keyword=>[keyword.name,0]));
  const conditionalCounts=new Map(keywordDefinitions.map(keyword=>[keyword.name,0]));
  let freeSlotCount=0;
  postState.identities.forEach(identity=>{
    if(identity?.isFreeSlot){freeSlotCount+=1;return;}
    const baseKeywords=new Set(identity?.keywords||[]);
    baseKeywords.forEach(keyword=>baseCounts.set(keyword,(baseCounts.get(keyword)||0)+1));
    const conditionalKeywords=new Set();
    (identity?.conditionalKeywords||[]).forEach(entry=>(entry.keywords||[]).forEach(keyword=>{
      if(!baseKeywords.has(keyword))conditionalKeywords.add(keyword);
    }));
    conditionalKeywords.forEach(keyword=>conditionalCounts.set(keyword,(conditionalCounts.get(keyword)||0)+1));
  });
  const chips=[];
  keywordDefinitions
    .map((keyword,index)=>({
      keyword,
      index,
      base:baseCounts.get(keyword.name)||0,
      conditional:conditionalCounts.get(keyword.name)||0
    }))
    .filter(item=>item.base||item.conditional)
    .sort((a,b)=>(b.base+b.conditional)-(a.base+a.conditional)||b.base-a.base||a.index-b.index)
    .forEach(({keyword,base,conditional})=>{
      const conditionalText=conditional?`<small>条件付き +${conditional}</small>`:'';
      chips.push(`<span class="party-keyword-chip${keyword.id==='ammo'?' keyword-ammo':''}" data-keyword="${keyword.name}"><b>${keyword.name}</b><strong>${base}</strong>${conditionalText}</span>`);
    });
  if(freeSlotCount)chips.push(`<span class="party-keyword-chip free-slot-count"><b>自由枠</b><strong>${freeSlotCount}</strong></span>`);
  partyKeywordSummaryChips.innerHTML=chips.length?chips.join(''):'<span class="filter-summary-empty">人格未選択</span>';
}
function updatePostIdentityCount(){$('[data-post-identity-count]').textContent=postState.identities.size;updatePartyKeywordSummary();updateIdentityFooterState();}
function updateIdentityFooterState(){
  if(!identityFooterActions)return;
  const onIdentityStep=postState.step===2;
  identityFooterActions.hidden=!onIdentityStep;
  workspaceFooter?.classList.toggle('identity-mode',onIdentityStep);
  if(onIdentityStep)workspaceFooter?.classList.remove('ego-mode');
  const chosen=postState.activeSinner&&postState.identities.has(postState.activeSinner);
  clearCurrentIdentity.disabled=!chosen;
  clearCurrentIdentity.textContent=chosen?'選択解除':'未選択';
  clearAllIdentities.disabled=postState.identities.size===0;
}
const egoSummaryRankOrder=['ZAYIN','TETH','HE','WAW','ALEPH'];
function egoSummaryTagsMarkup(picks,{emptyLabel='E.G.Oを選択'}={}){
  const tags=egoSummaryRankOrder
    .filter(rank=>picks.has(rank))
    .map(rank=>`<span class="ego-summary-tag rank-${rank.toLowerCase()}"><b>${rank}</b><span>${picks.get(rank)}</span></span>`);
  return tags.length?tags.join(''):`<span class="ego-summary-empty">${emptyLabel}</span>`;
}
function egoMapFor(id){if(!postState.egos.has(id))postState.egos.set(id,new Map());return postState.egos.get(id);}
function renderEgoSinners(){
  egoSinnerGrid.innerHTML='';
  const selectedSinners=orderedSelectedSinners();
  $('[data-ego-empty-note]').hidden=selectedSinners.length!==0;
  selectedSinners.forEach((sinner,index)=>{
    const order=formationPosition(sinner.id);
    const identity=postState.identities.get(sinner.id);
    const isFree=identity?.isFreeSlot;
    const freeEgoEnabled=postState.freeSlotEgoEnabled.has(sinner.id);
    const picks=egoMapFor(sinner.id);
    const summaryTags=egoSummaryTagsMarkup(picks);

    if(isFree){
      const card=document.createElement('article');
      card.className='ego-sinner-card ego-free-sinner-card'+(freeEgoEnabled?' enabled':' locked')+(picks.size?' selected':'');
      card.style.setProperty('--card-a',cardTones[index%cardTones.length][0]);
      card.style.setProperty('--card-b',cardTones[index%cardTones.length][1]);
      card.innerHTML=`<span class="sinner-number">No.${sinner.id}</span><span class="formation-order-badge ego-order-badge">${order}</span><strong>${sinner.name}</strong><small>自由枠（人格指定なし）</small><div class="ego-card-summary ego-summary-tags">${freeEgoEnabled?egoSummaryTagsMarkup(picks,{emptyLabel:'E.G.Oを選択可能'}):'<span class="ego-summary-empty">初期設定ではE.G.O指定なし</span>'}</div><div class="ego-free-actions"></div>`;
      const actions=card.querySelector('.ego-free-actions');
      const toggle=document.createElement('button');
      toggle.type='button';
      toggle.className='ego-free-toggle';
      toggle.textContent=freeEgoEnabled?'E.G.O指定を解除':'自由枠のE.G.Oを選択';
      toggle.addEventListener('click',event=>{
        event.stopPropagation();
        if(freeEgoEnabled){
          postState.freeSlotEgoEnabled.delete(sinner.id);
          postState.egos.delete(sinner.id);
          showToast(`${sinner.name}自由枠のE.G.O指定を解除しました。`);
        }else{
          postState.freeSlotEgoEnabled.add(sinner.id);
          showToast(`${sinner.name}自由枠のE.G.Oを選択できます。`);
        }
        renderEgoSinners();
      });
      actions.appendChild(toggle);
      if(freeEgoEnabled){
        const select=document.createElement('button');
        select.type='button';
        select.className='ego-free-select';
        select.textContent='E.G.O一覧を開く →';
        select.addEventListener('click',()=>openEgoSelect(sinner.id));
        actions.appendChild(select);
      }
      egoSinnerGrid.appendChild(card);
      return;
    }

    const b=document.createElement('button');
    b.type='button';
    b.className='ego-sinner-card'+(picks.size?' selected':'');
    b.style.setProperty('--card-a',cardTones[index%cardTones.length][0]);
    b.style.setProperty('--card-b',cardTones[index%cardTones.length][1]);
    b.innerHTML=`<span class="sinner-number">No.${sinner.id}</span><span class="formation-order-badge ego-order-badge">${order}</span><strong>${sinner.name}</strong><small>${identity.name}</small><div class="ego-card-summary ego-summary-tags">${summaryTags}</div>`;
    b.addEventListener('click',()=>openEgoSelect(sinner.id));
    egoSinnerGrid.appendChild(b);
  });
  updateEgoCount();
}
function openEgoSelect(id){postState.activeEgoSinner=id;const sinner=sinnerIdentityData.find(x=>x.id===id);currentEgoSinnerName.textContent=sinner.name;egoSinnerView.hidden=true;egoSelectView.hidden=false;renderEgoOptions();updateEgoConfirmState();requestAnimationFrame(()=>smoothScrollToElement(egoSelectView,18,'auto'));}
function closeEgoSelect({scroll=true}={}){postState.activeEgoSinner=null;egoSelectView.hidden=true;egoSinnerView.hidden=false;renderEgoSinners();updateEgoConfirmState();if(scroll)queueIdentityScroll(egoSinnerView,18);}
function renderEgoOptions(){
  const id=postState.activeEgoSinner;const sinner=sinnerIdentityData.find(x=>x.id===id);const picks=egoMapFor(id);egoGrid.innerHTML='';
  const egoRankOrder={ALEPH:5,WAW:4,HE:3,TETH:2,ZAYIN:1};
  [...(sinnerEgoData[id]||[])].sort((a,b)=>(egoRankOrder[b[1]]||0)-(egoRankOrder[a[1]]||0)||a[0].localeCompare(b[0],'ja',{numeric:true,sensitivity:'base'})).forEach(([name,rank],index)=>{const b=document.createElement('button');b.type='button';const identity=postState.identities.get(id);const tone=cardToneForKeywords(identity?.keywords,index);b.style.setProperty('--ego-card-a',tone[0]);b.style.setProperty('--ego-card-b',tone[1]);b.className=`ego-option-card rank-${rank.toLowerCase()}`+(picks.get(rank)===name?' selected':'');b.innerHTML=`<span class="ego-orb">E.G.O</span><span class="ego-rank">${rank}</span><strong>${name}</strong><small>${sinner.name}</small>`;b.addEventListener('click',()=>{if(picks.get(rank)===name)picks.delete(rank);else picks.set(rank,name);renderEgoOptions();updateEgoCount();updateEgoConfirmState();});egoGrid.appendChild(b);});
  currentEgoSummary.innerHTML=egoSummaryTagsMarkup(picks,{emptyLabel:'未選択'});
}
function updateEgoConfirmState(){
  const onEgoStep=postState.step===4;
  const inEgoDetail=onEgoStep&&Boolean(postState.activeEgoSinner);
  if(egoConfirmButton)egoConfirmButton.hidden=!inEgoDetail;
  // E.G.Oの全解除は囚人一覧・個別選択のどちらでも使えるようにする。
  if(egoFooterActions)egoFooterActions.hidden=!onEgoStep;
  workspaceFooter?.classList.toggle('ego-mode',onEgoStep);
  workspaceFooter?.classList.toggle('ego-detail-mode',inEgoDetail);
  if(clearCurrentEgos){
    const picks=inEgoDetail?egoMapFor(postState.activeEgoSinner):null;
    clearCurrentEgos.hidden=!inEgoDetail;
    clearCurrentEgos.disabled=!picks?.size;
    clearCurrentEgos.textContent=picks?.size?'選択解除':'未選択';
  }
  if(clearAllEgos){
    let total=0;postState.egos.forEach(map=>total+=map.size);
    clearAllEgos.disabled=total===0;
    clearAllEgos.textContent='現在選択中のE.G.Oを全選択解除';
  }
}
function updateEgoCount(){let total=0;postState.egos.forEach(m=>total+=m.size);$('[data-post-ego-count]').textContent=total;}
function clearStepValidation(step){
  document.querySelector(`[data-step-link="${step}"]`)?.classList.remove('validation-error');
  document.querySelector(`[data-post-step="${step}"]`)?.classList.remove('validation-error');
}
function markStepValidation(step,invalid=true){
  document.querySelector(`[data-step-link="${step}"]`)?.classList.toggle('validation-error',invalid);
  document.querySelector(`[data-post-step="${step}"]`)?.classList.toggle('validation-error',invalid);
}
function stepValidation(step){
  if(step===1){
    if(!postTitle?.value.trim())return {valid:false,message:'攻略タイトルを設定していません',field:'title',popup:true};
    if(!postState.difficulty&&!postState.type)return {valid:false,message:'難易度と攻略タイプを選択してください。',field:'difficulty'};
    if(!postState.difficulty)return {valid:false,message:'ノーマルまたはハードを選択してください。',field:'difficulty'};
    if(!postState.type)return {valid:false,message:'攻略タイプを選択してください。',field:'type'};
  }
  if(step===2&&postState.identities.size!==sinnerIdentityData.length){
    return {valid:false,message:'必要のない人格は自由枠として設定してください',popup:true};
  }
  if(step===3&&postState.identityOrder.length<1){
    return {valid:false,message:'編成順に少なくとも1人を設定してください。'};
  }
  if(step===6&&!postSummary?.value.trim()){
    return {valid:false,message:'一言紹介を入力してください。'};
  }
  return {valid:true,message:''};
}
function focusInvalidStep(step){
  markStepValidation(step,true);
  const result=stepValidation(step);
  if(step===1){
    if(result.field==='title'){
      document.querySelector('[data-workspace-titlebar]')?.classList.add('validation-error');
      postTitle?.focus();
      postTitle?.scrollIntoView({behavior:'smooth',block:'center'});
    }else if(result.field==='difficulty'){
      $('[data-difficulty-selector]')?.scrollIntoView({behavior:'smooth',block:'center'});
    }else{
      document.querySelector('[data-post-type]')?.scrollIntoView({behavior:'smooth',block:'center'});
    }
  }else if(step===2){
    const missing=sinnerIdentityData.find(sinner=>!postState.identities.has(sinner.id));
    if(missing){
      postState.activeSinner=missing.id;
      renderIdentitySinnerRoster();
      openIdentitySelect(missing.id,{scroll:false});
      requestAnimationFrame(()=>document.querySelector('.identity-sinner-button.active')?.scrollIntoView({behavior:'smooth',block:'center'}));
    }
  }else if(step===3){
    formationChoiceGrid?.scrollIntoView({behavior:'smooth',block:'center'});
  }else if(step===6){
    postSummary?.focus();
    postSummary?.scrollIntoView({behavior:'smooth',block:'center'});
  }
}
function validateRequiredStep(step,{showMessage=true}={}){
  const result=stepValidation(step);
  markStepValidation(step,!result.valid);
  if(!result.valid&&showMessage){
    if(result.popup)window.alert(result.message);
    else showToast(result.message);
    focusInvalidStep(step);
  }
  return result.valid;
}
function validateAllRequiredSteps(){
  const required=[1,2,3,6];
  const invalid=required.filter(step=>!validateRequiredStep(step,{showMessage:false}));
  if(invalid.length){
    const first=invalid[0];
    setStep(first);
    requestAnimationFrame(()=>focusInvalidStep(first));
    showToast('未入力の必須ステップを赤く表示しました。');
    return false;
  }
  return true;
}
function navigateToStep(target){
  target=Math.max(1,Math.min(7,target));
  if(target<=postState.step){setStep(target);return;}
  const requiredBefore=[1,2,3,6].filter(step=>step<target);
  const invalid=requiredBefore.find(step=>!validateRequiredStep(step,{showMessage:false}));
  if(invalid){
    setStep(invalid);
    requestAnimationFrame(()=>focusInvalidStep(invalid));
    const result=stepValidation(invalid);
    if(result.popup)window.alert(result.message);else showToast(result.message);
    return;
  }
  setStep(target);
}
function setStep(n){const previousStep=postState.step;postState.step=Math.max(1,Math.min(7,n));if(postState.step===2&&!postState.activeSinner)postState.activeSinner=sinnerIdentityData[0]?.id||null;if(postState.step!==4&&postState.activeEgoSinner)closeEgoSelect({scroll:false});if(postState.step!==5)closeThemePackSelect({scroll:false});$$('[data-post-step]').forEach(s=>s.classList.toggle('active',+s.dataset.postStep===postState.step));$$('[data-step-link]').forEach(s=>s.classList.toggle('active',+s.dataset.stepLink===postState.step));const info=stepInfo[postState.step];$('[data-step-kicker]').textContent=info[0];$('[data-step-title]').textContent=info[1];$('[data-step-description]').textContent=info[2];$('[data-step-counter]').textContent=`${postState.step} / 7`;if(workspaceStepName)workspaceStepName.textContent=info[1].replace(/を選択$|を入力$|して投稿$/,'');if(workspaceStepCounter)workspaceStepCounter.textContent=`${postState.step} / 7`;const prev=$('[data-prev-step]'),next=$('[data-next-step]');prev.hidden=postState.step===1;if(mobilePrevStep)mobilePrevStep.hidden=postState.step===1;next.textContent=postState.step===7?'この内容で公開する':'次のステップへ →';if(postState.step!==2&&identityFilterPanel){identityFilterPanel.hidden=true;toggleIdentitySearch?.setAttribute('aria-expanded','false');if(toggleIdentitySearch)toggleIdentitySearch.textContent='人格検索';}if(postState.step===2){renderIdentitySinnerRoster();if(postState.activeSinner)openIdentitySelect(postState.activeSinner,{scroll:false});}if(postState.step===3)renderFormationOrder();if(postState.step===4)renderEgoSinners();if(postState.step===5)renderThemeFloorCards();if(postState.step===6)renderDetailTags();if(postState.step===7)updateReview();updateIdentityFooterState();updateEgoConfirmState();if(previousStep!==postState.step)requestAnimationFrame(resetStageScroll);}
function syncTitle(){const raw=postTitle?.value??'';const t=raw.trim()||'攻略タイトルを入力してください';$$('[data-title-preview],[data-workspace-title-live]').forEach(x=>{x.textContent=t;x.classList.toggle('is-placeholder',!raw.trim());});}
function selectedSinnersWithoutOrder(){return sinnerIdentityData.filter(s=>postState.identities.has(s.id));}
function renderFormationOrder(){
  const selectedSinners=selectedSinnersWithoutOrder();
  postState.identityOrder=postState.identityOrder.filter(id=>postState.identities.has(id));
  if(isSoloPost()&&postState.identityOrder.length>1)postState.identityOrder=postState.identityOrder.slice(0,1);
  const solo=isSoloPost();
  const formationHeading=document.querySelector('[data-post-step="3"] .step-card-heading p');
  if(formationHeading)formationHeading.textContent=solo?'ソロ攻略で使用する人格を1人選択してください。選択した人格だけが出撃し、次の使用E.G.O選択にも引き継がれます。':'使用人格を、実際に出撃させる順番で選択してください。';
  if(postState.step===3){
    const stageDescription=$('[data-step-description]');
    if(stageDescription)stageDescription.textContent=solo?'ソロ攻略で出撃する人格を1人だけ選択してください。':'使用人格を、実際に出撃させる順番で選択してください。';
  }
  if(formationChoiceGrid)formationChoiceGrid.innerHTML='';
  if(formationSelectedStrip){
    const ordered=orderedSelectedSinners();
    formationSelectedStrip.innerHTML=ordered.length?ordered.map(s=>{const identity=postState.identities.get(s.id);return `<span class="formation-selected-chip order-${formationPosition(s.id)>7?'blue':'yellow'}"><b>${formationPosition(s.id)}</b><span>${s.name}</span></span>`;}).join(''):`<span class="formation-empty">${solo?'ソロ攻略で使用する人格を選択してください。':'まだ順番を選択していません。'}</span>`;
  }
  selectedSinners.forEach((sinner,index)=>{
    const identity=postState.identities.get(sinner.id);const order=formationPosition(sinner.id);
    const b=document.createElement('button');b.type='button';b.className='formation-choice-card'+(order?' selected':'')+(order?` order-${order>7?'blue':'yellow'}`:'');
    const formationImage=identityImageFor(sinner.id,identity);if(formationImage){b.classList.add('has-identity-image');b.style.backgroundImage=`linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.86)),url(\"${formationImage}\")`;} b.innerHTML=`${order?`<span class="formation-order-badge">${order}</span><span class="formation-card-label">編成 ${order}</span>`:'<span class="formation-choice-plus">＋</span><span class="formation-card-label">未選択</span>'}<strong>${sinner.name}</strong><small>${identity.name}</small>`;
    b.addEventListener('click',()=>{if(order){removeFormationPosition(sinner.id);showToast(`${sinner.name}を編成順から解除しました。`);}else{ensureFormationPosition(sinner.id);clearStepValidation(3);showToast(`${sinner.name}を${postState.identityOrder.length}番に設定しました。`);}renderFormationOrder();});
    formationChoiceGrid?.appendChild(b);
  });
  if(formationCount)formationCount.textContent=postState.identityOrder.length;
  if(formationTotal)formationTotal.textContent=solo?1:selectedSinners.length;
  if(formationEmptyNote)formationEmptyNote.hidden=selectedSinners.length!==0;
  if(resetFormationButton){resetFormationButton.hidden=selectedSinners.length===0;resetFormationButton.disabled=postState.identityOrder.length===0;resetFormationButton.textContent=solo?'選択を解除':'編成順をすべて解除';}
}
function currentThemePackMode(){return themePackData?.modes?.[postState.difficulty]||null;}
function themePackOptionsForFloor(floor){return currentThemePackMode()?.floors?.[String(floor)]||[];}
function themePackUsedByAnotherFloor(name,currentFloor){if(name==='自由枠')return false;return [...postState.themePacks.entries()].some(([floor,selectedName])=>floor!==currentFloor&&selectedName===name);}
function closeThemePackSelect({scroll=true}={}){
  postState.activeThemePackFloor=null;
  if(themePackSelectView)themePackSelectView.hidden=true;
  if(themeFloorGrid)themeFloorGrid.hidden=false;
  if(themePackSearch)themePackSearch.value='';
  if(scroll&&themeFloorGrid)queueIdentityScroll(themeFloorGrid,18);
}
function renderThemeFloorCards(){
  if(!themeFloorGrid)return;
  const mode=currentThemePackMode();
  themeFloorGrid.hidden=false;
  if(themePackSelectView)themePackSelectView.hidden=true;
  themeFloorGrid.innerHTML='';
  if(!mode){themeFloorGrid.innerHTML='<p class="theme-pack-empty">先に「攻略タイプ」で難易度を選択してください。</p>';if(themePackCount)themePackCount.textContent='0';return;}
  for(let floor=1;floor<=mode.maxFloor;floor++){
    const selectedName=postState.themePacks.get(floor);
    const card=document.createElement('button');
    card.type='button';
    card.className='theme-floor-card'+(selectedName?' selected':'');
    card.innerHTML=`<span class="theme-floor-number">${floor}F</span><span class="theme-floor-status">${selectedName?'選択済み':'未選択'}</span><strong>${reviewEscape(selectedName||'テーマパックを選択')}</strong><small>${selectedName?'クリックして変更':'この階層の候補を表示'}</small>`;
    card.addEventListener('click',()=>openThemePackSelect(floor));
    themeFloorGrid.appendChild(card);
  }
  if(themePackCount)themePackCount.textContent=postState.themePacks.size;
}
function openThemePackSelect(floor){
  postState.activeThemePackFloor=floor;
  if(themePackFloorLabel)themePackFloorLabel.textContent=`${floor}F`;
  if(themeFloorGrid)themeFloorGrid.hidden=true;
  if(themePackSelectView)themePackSelectView.hidden=false;
  if(themePackSearch)themePackSearch.value='';
  renderThemePackOptions();
  requestAnimationFrame(()=>smoothScrollToElement(themePackSelectView,18,'auto'));
}
function renderThemePackOptions(){
  if(!themePackOptionGrid)return;
  const floor=postState.activeThemePackFloor;
  const query=(themePackSearch?.value||'').trim().toLowerCase();
  const baseOptions=themePackOptionsForFloor(floor);const allowFree=postState.difficulty==='HARD'&&floor>=6&&floor<=15;const options=(allowFree?['自由枠',...baseOptions]:baseOptions).filter(name=>name.toLowerCase().includes(query));
  themePackOptionGrid.innerHTML='';
  const current=postState.themePacks.get(floor);
  const clear=document.createElement('button');
  clear.type='button';clear.className='theme-pack-option-card clear-option';clear.disabled=!current;
  clear.innerHTML='<strong>この階層を未選択に戻す</strong><small>選択中のパックを解除します</small>';
  clear.addEventListener('click',()=>{postState.themePacks.delete(floor);showToast(`${floor}Fのテーマパックを解除しました。`);closeThemePackSelect({scroll:false});renderThemeFloorCards();});
  themePackOptionGrid.appendChild(clear);
  options.forEach(name=>{
    const usedElsewhere=themePackUsedByAnotherFloor(name,floor);
    const selected=current===name;
    const button=document.createElement('button');button.type='button';
    button.className='theme-pack-option-card'+(selected?' selected':'')+(usedElsewhere?' disabled':'');
    button.disabled=usedElsewhere;
    const usedFloor=[...postState.themePacks.entries()].find(([otherFloor,selectedName])=>otherFloor!==floor&&selectedName===name)?.[0];
    button.innerHTML=`<strong>${reviewEscape(name)}</strong><small>${usedElsewhere?`${usedFloor}Fで選択済み`:selected?'現在選択中':'このパックを選択'}</small>`;
    button.addEventListener('click',()=>{postState.themePacks.set(floor,name);showToast(`${floor}Fに「${name}」を設定しました。`);closeThemePackSelect({scroll:false});renderThemeFloorCards();});
    themePackOptionGrid.appendChild(button);
  });
  if(!options.length){const empty=document.createElement('p');empty.className='theme-pack-empty';empty.textContent='検索条件に一致するテーマパックがありません。';themePackOptionGrid.appendChild(empty);}
}
function keywordCounts(){
  const counts=new Map([...automaticKeywordOptions,'弾丸','ソロ'].map(k=>[k,0]));
  // 通常キーワードは出撃枠1〜7のみ。弾丸だけは控えを含む全12枠を数える。
  orderedSelectedSinners().forEach(sinner=>{
    const identity=postState.identities.get(sinner.id);
    if(identity?.isFreeSlot)return;
    const keys=new Set(identity?.keywords||[]);
    const order=formationPosition(sinner.id);
    automaticKeywordOptions.forEach(keyword=>{
      if(order&&order<=7&&keys.has(keyword))counts.set(keyword,counts.get(keyword)+1);
    });
    if(keys.has('弾丸'))counts.set('弾丸',counts.get('弾丸')+1);
  });
  if(isSoloPost()&&postState.identityOrder.length===1)counts.set('ソロ',1);
  return counts;
}
function automaticPostKeywords(){
  const counts=keywordCounts();
  const tags=automaticKeywordOptions.filter(k=>counts.get(k)>=5);
  if(postState.ammoKeywordSelected&&counts.get('弾丸')>=1)tags.push('弾丸');
  if(counts.get('ソロ')===1)tags.push('ソロ');
  return tags;
}
function renderTagButtons(grid,options,selection,max){
  if(!grid)return;grid.innerHTML='';
  options.forEach(tag=>{const b=document.createElement('button');b.type='button';b.className='selectable-tag'+(selection.has(tag)?' selected':'');b.textContent=tag;b.addEventListener('click',()=>{if(selection.has(tag))selection.delete(tag);else if(selection.size>=max){showToast(`最大${max}個まで選択できます。`);return;}else selection.add(tag);renderDetailTags();});grid.appendChild(b);});
}
function renderDetailTags(){
  renderTagButtons(strategyTagGrid,strategyTagOptions,postState.strategyTags,5);
  renderTagButtons(affiliationTagGrid,affiliationTagOptions,postState.affiliationTags,3);
  if(strategyTagCount)strategyTagCount.textContent=postState.strategyTags.size;
  if(affiliationTagCount)affiliationTagCount.textContent=postState.affiliationTags.size;
  const counts=keywordCounts();
  const auto=automaticKeywordOptions.filter(k=>counts.get(k)>=5);
  const ammoAvailable=counts.get('弾丸')>=1;
  if(!ammoAvailable)postState.ammoKeywordSelected=false;
  if(automaticKeywordTags){
    const autoTags=auto.map(k=>`<span class="automatic-keyword-tag" data-keyword="${k}"><b>${k}</b><small>${counts.get(k)}人</small></span>`).join('');
    const ammoButton=ammoAvailable?`<button type="button" class="automatic-keyword-tag ammo-selectable${postState.ammoKeywordSelected?' selected':''}" data-toggle-ammo><b>弾丸</b><small>1人以上</small></button>`:'';
    const soloTag=isSoloPost()&&postState.identityOrder.length===1?'<span class="automatic-keyword-tag" data-keyword="ソロ"><b>ソロ</b><small>自動付与</small></span>':'';
    automaticKeywordTags.innerHTML=(autoTags+ammoButton+soloTag)||'<span class="tag-empty">該当するキーワードはありません。</span>';
    automaticKeywordTags.querySelector('[data-toggle-ammo]')?.addEventListener('click',()=>{postState.ammoKeywordSelected=!postState.ammoKeywordSelected;renderDetailTags();});
  }
  if(ammoKeywordNote)ammoKeywordNote.hidden=!ammoAvailable;
}
function reviewEscape(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));}
function reviewTagMarkup(label,className=''){return `<span class="review-tag ${className}">${reviewEscape(label)}</span>`;}
function reviewEgoTagMarkup(rank,name){return `<span class="review-ego-tag rank-${rank.toLowerCase()}"><b>${reviewEscape(rank)}</b><span class="review-ego-name" title="${reviewEscape(name)}"><span class="review-ego-marquee"><span class="review-ego-marquee-text">${reviewEscape(name)}</span></span></span></span>`;}
function activateReviewEgoMarquees(){
  requestAnimationFrame(()=>{
    document.querySelectorAll('.review-ego-name').forEach(box=>{
      const track=box.querySelector('.review-ego-marquee');
      const text=box.querySelector('.review-ego-marquee-text');
      if(!track||!text)return;
      track.classList.remove('is-overflowing');
      track.querySelectorAll('.review-ego-marquee-copy').forEach(copy=>copy.remove());
      if(text.scrollWidth<=box.clientWidth+1)return;
      const copy=text.cloneNode(true);copy.classList.add('review-ego-marquee-copy');copy.setAttribute('aria-hidden','true');track.appendChild(copy);
      const duration=Math.max(6,Math.min(14,text.scrollWidth/22));
      track.style.setProperty('--marquee-duration',`${duration}s`);
      track.classList.add('is-overflowing');
    });
  });
}
function updateReview(){
  const val=s=>$(s)?.value.trim()||'未入力';
  $('[data-review-title]').textContent=postTitle.value.trim()||'無題の攻略';
  $('[data-review-difficulty]').textContent=postState.difficulty==='HARD'?'ハード':postState.difficulty==='NORMAL'?'ノーマル':'難易度未選択';
  $('[data-review-type]').textContent=postState.type||'攻略タイプ未選択';
  $('[data-review-count]').textContent=isSoloPost()?'使用枠 1枠（ソロ）':`使用枠 ${postState.identities.size}枠`;

  const party=$('[data-review-party]');
  const selected=orderedSelectedSinners();
  party.innerHTML=selected.length?selected.map((sinner,index)=>{
    const identity=postState.identities.get(sinner.id);
    const order=formationPosition(sinner.id);
    const tone=cardToneForKeywords(identity.keywords,index);
    const picks=postState.egos.get(sinner.id)||new Map();
    const egoTags=egoSummaryRankOrder.filter(rank=>picks.has(rank)).map(rank=>reviewEgoTagMarkup(rank,picks.get(rank))).join('');
    const identityName=identity?.isFreeSlot?'自由枠（誰でも可）':identity?.name||'未選択';
    const rarity=identity?.isFreeSlot?'FREE':identity?.rarity||'';
    const reviewImage=identityImageFor(sinner.id,identity);return `<article class="review-party-card${identity?.isFreeSlot?' review-free-card':''}${reviewImage?' has-identity-image':''}" style="--card-a:${tone[0]};--card-b:${tone[1]};${reviewImage?`background-image:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.9)),url('${reviewImage}');background-size:cover;background-position:center;`:''}">
      <div class="review-party-card-visual"><span class="review-formation-number">${String(order).padStart(2,'0')}</span><span class="review-sinner-number">No.${reviewEscape(sinner.id)}</span><span class="review-sinner-monogram">${reviewEscape(sinner.name.slice(0,1))}</span><div><strong>${reviewEscape(sinner.name)}</strong><p>${reviewEscape(identityName)}</p><small>${reviewEscape(rarity)}</small></div></div>
      <div class="review-card-egos"><span class="review-card-egos-label">E.G.O</span><div class="review-card-ego-list">${egoTags||'<span class="review-ego-empty">未選択</span>'}</div></div>
    </article>`;
  }).join(''):'<p class="review-empty">人格が選択されていません。</p>';

  const reviewThemePacks=$('[data-review-theme-packs]');
  if(reviewThemePacks){
    const selectedPacks=[...postState.themePacks.entries()].sort((a,b)=>a[0]-b[0]);
    reviewThemePacks.innerHTML=selectedPacks.length?selectedPacks.map(([floor,name])=>`<div class="review-theme-pack-item"><b>${floor}F</b><span>${reviewEscape(name)}</span></div>`).join(''):'<span class="tag-empty">未選択</span>';
  }

  const strategy=[...postState.strategyTags];
  $('[data-review-tags]').innerHTML=strategy.length?strategy.map(tag=>reviewTagMarkup(tag,'strategy-tag')).join(''):'<span class="tag-empty">未選択</span>';
  const keywords=automaticPostKeywords();
  $('[data-review-keywords]').innerHTML=keywords.length?keywords.map(tag=>reviewTagMarkup(tag,tag==='弾丸'?'keyword-ammo active':tag==='ソロ'?'keyword-solo active':'active')).join(''):'<span class="tag-empty">該当なし</span>';
  const affiliations=[...postState.affiliationTags];
  $('[data-review-affiliations]').innerHTML=affiliations.length?affiliations.map(tag=>reviewTagMarkup(tag,'affiliation-tag')).join(''):'<span class="tag-empty">未選択</span>';
  $('[data-review-affiliation-section]').hidden=!affiliations.length;
  $('[data-review-summary]').textContent=val('[data-post-summary]');
  $('[data-review-points]').textContent=val('[data-post-points]');
  activateReviewEgoMarquees();
}
function updateIdentitySearchButtonState(){
  const hasFilters=Boolean(identityNameFilter.value.trim())||identityRarityFilter.value!=='all'||activeIdentityKeywords.size>0||identityMultiOnly.checked||identityIncludeConditional.checked||identityFilterMode.value==='and';
  toggleIdentitySearch?.classList.toggle('has-active-filters',hasFilters);
}
function updateIdentityFilterScrollCue(){
  if(!identityFilterPanel||identityFilterPanel.hidden)return;
  const hasMore=identityFilterPanel.scrollHeight-identityFilterPanel.clientHeight-identityFilterPanel.scrollTop>10;
  identityFilterPanel.classList.toggle('has-more-below',hasMore);
  if(identityFilterScrollHint)identityFilterScrollHint.hidden=!hasMore;
}
function closeIdentityFilterPanel(){
  identityFilterScrollTop=identityFilterPanel.scrollTop;
  identityFilterPanel.classList.add('is-closing');
  toggleIdentitySearch.setAttribute('aria-expanded','false');
  toggleIdentitySearch.textContent='人格検索';
  setTimeout(()=>{
    identityFilterPanel.hidden=true;
    identityFilterPanel.classList.remove('is-closing');
  },180);
}
toggleIdentitySearch.addEventListener('click',()=>{
  const opening=identityFilterPanel.hidden;
  if(opening){
    identityFilterPanel.hidden=false;
    identityFilterPanel.classList.remove('is-closing');
    identityFilterPanel.scrollTop=identityFilterScrollTop;
    toggleIdentitySearch.setAttribute('aria-expanded','true');
    toggleIdentitySearch.textContent='検索中';
    requestAnimationFrame(updateIdentityFilterScrollCue);
    setTimeout(()=>identityNameFilter.focus({preventScroll:true}),100);
  }else closeIdentityFilterPanel();
});
identityFilterPanel?.addEventListener('scroll',()=>{
  identityFilterScrollTop=identityFilterPanel.scrollTop;
  updateIdentityFilterScrollCue();
},{passive:true});
applyIdentityFilters.addEventListener('click',()=>{
  updateIdentityFilterSummary();
  closeIdentityFilterPanel();
  showToast('人格の絞り込み条件を適用しました。');
});
clearCurrentIdentity.addEventListener('click',()=>{
  const id=postState.activeSinner;if(!id||!postState.identities.has(id))return;
  postState.identities.delete(id);removeFormationPosition(id);postState.egos.delete(id);postState.freeSlotEgoEnabled.delete(id);
  renderIdentitySinnerRoster();renderIdentityOptions();updatePostIdentityCount();
  showToast('この囚人の人格選択を解除しました。');
  queueIdentityScroll(identitySinnerRoster,18);
});
clearAllIdentities.addEventListener('click',()=>{
  if(!postState.identities.size)return;
  if(!window.confirm('選択中の人格と、それに設定したE.G.Oをすべて解除しますか？'))return;
  postState.identities.clear();postState.identityAlternatives.clear();postState.identityOrder=[];postState.egos.clear();postState.freeSlotEgoEnabled.clear();
  currentIdentityName.textContent='未選択';
  renderIdentitySinnerRoster();renderIdentityOptions();updatePostIdentityCount();
  showToast('すべての人格選択を解除しました。');
});
if(fillEmptyIdentities)fillEmptyIdentities.addEventListener('click',()=>{
  const emptySinners=sinnerIdentityData.filter(sinner=>!postState.identities.has(sinner.id));
  if(!emptySinners.length){showToast('すべての人格枠が設定済みです。');return;}
  emptySinners.forEach(sinner=>{
    postState.identities.set(sinner.id,{name:'自由枠（誰でも可）',rarity:'FREE',keywords:[],isFreeSlot:true});
  });
  clearStepValidation(2);
  renderIdentitySinnerRoster();
  renderIdentityOptions();
  updatePostIdentityCount();
  updatePartyKeywordSummary();
  showToast(`空いている${emptySinners.length}枠を自由枠に設定しました。`);
});
const handleIdentityFilterChange=()=>{renderIdentityOptions();updateIdentityFilterSummary();updateIdentitySearchButtonState();};
identityNameFilter.addEventListener('input',handleIdentityFilterChange);identityRarityFilter.addEventListener('change',handleIdentityFilterChange);identityMultiOnly.addEventListener('change',handleIdentityFilterChange);identityIncludeConditional.addEventListener('change',handleIdentityFilterChange);identityFilterMode.addEventListener('change',handleIdentityFilterChange);$('[data-reset-identity-filters]').addEventListener('click',resetIdentityFilters);renderIdentityKeywordFilters();updateIdentityFilterSummary();updateIdentitySearchButtonState();
if(resetFormationButton)resetFormationButton.addEventListener('click',()=>{const solo=isSoloPost();postState.identityOrder=[];renderFormationOrder();showToast(solo?'ソロ攻略の人格選択を解除しました。':'編成順をすべて解除しました。');});

const categoryPickerList=$('[data-category-picker-list]');
const categoryPickerStatus=$('[data-category-picker-status]');
const startCategoryPost=$('[data-start-category-post]');
const openDraftFromCategory=$('[data-open-draft-from-category]');
let pendingPostCategory='';
function updatePostCategoryDisplays(){const category=categoryById(postState.category);$$('[data-post-category-badge]').forEach(node=>node.textContent=category.label);const reviewCategory=$('[data-review-category]');if(reviewCategory)reviewCategory.textContent=category.label;}
function renderCategoryPicker(){if(!categoryPickerList)return;categoryPickerList.innerHTML='';pendingPostCategory='';startCategoryPost.disabled=true;categoryPickerStatus.textContent='カテゴリを選択してください';categoryDefinitions.forEach(category=>{const button=document.createElement('button');button.type='button';button.className='category-picker-option';button.disabled=!category.available;button.dataset.categoryId=category.id;button.innerHTML=`<span class="category-picker-icon">${categoryIconMarkup(category)}</span><span><strong>${category.label}</strong><small>${category.description}</small>${category.available?'':'<em>※実装予定</em>'}</span>`;button.addEventListener('click',()=>{if(!category.available)return;pendingPostCategory=category.id;categoryPickerList.querySelectorAll('.category-picker-option').forEach(x=>x.classList.toggle('active',x===button));categoryPickerStatus.textContent=`${category.label}を選択中`;startCategoryPost.disabled=false;});categoryPickerList.appendChild(button)})}
$$('[data-open-post]').forEach(b=>b.onclick=()=>{if(localStorage.getItem('limbus-auth')!=='logged-in'){window.LimbusAuth?.open();return;}renderCategoryPicker();openDialog(categoryPicker);});
$('[data-close-category-picker]')?.addEventListener('click',()=>closeDialog(categoryPicker));
openDraftFromCategory?.addEventListener('click',()=>{closeDialog(categoryPicker);renderDraftManager();requestAnimationFrame(()=>openDialog(draftManager));});
startCategoryPost?.addEventListener('click',()=>{if(!pendingPostCategory)return;const selectedCategory=pendingPostCategory;resetPostEditorState();postState.category=selectedCategory;postState.activeSinner=sinnerIdentityData[0]?.id||null;updatePostCategoryDisplays();setStep(1);closeDialog(categoryPicker);requestAnimationFrame(()=>openDialog(postModal));});
$$('[data-step-link]').forEach(b=>b.onclick=()=>navigateToStep(+b.dataset.stepLink));
const typePreviewIcon=$('[data-type-preview-icon]');
const typePreviewDifficulty=$('[data-type-preview-difficulty]');
function renderTypePreviewIcon(button){
  if(!typePreviewIcon)return;
  const logo=button?.querySelector(':scope > .type-option-logo > img');
  typePreviewIcon.classList.toggle('has-type-logo',Boolean(logo));
  typePreviewIcon.replaceChildren();
  if(logo){
    const image=logo.cloneNode(true);
    image.removeAttribute('width');
    image.removeAttribute('height');
    image.setAttribute('aria-hidden','true');
    image.alt='';
    typePreviewIcon.appendChild(image);
    return;
  }
  const fallback=button?.querySelector(':scope > span')?.textContent?.trim()||'◇';
  typePreviewIcon.textContent=fallback;
}
const difficultyError=$('[data-difficulty-error]');
function updateDifficultyDisplay(){
  const label=postState.difficulty==='HARD'?'ハード':postState.difficulty==='NORMAL'?'ノーマル':'難易度未選択';
  $$('[data-difficulty-badge]').forEach(x=>{x.textContent=label;x.classList.toggle('is-unset',!postState.difficulty);x.dataset.difficulty=postState.difficulty||'';});
  if(typePreviewDifficulty){typePreviewDifficulty.textContent=postState.difficulty?`${label}向け攻略`:'難易度を選択してください';typePreviewDifficulty.dataset.difficulty=postState.difficulty||'';}
  if(difficultyError)difficultyError.hidden=Boolean(postState.difficulty);
}
$$('[data-post-difficulty]').forEach(b=>b.onclick=()=>{const nextDifficulty=b.dataset.postDifficulty;if(postState.difficulty&&postState.difficulty!==nextDifficulty&&postState.themePacks.size&&!window.confirm('難易度を変更すると、選択済みのテーマパックが解除されます。変更しますか？'))return;if(postState.difficulty!==nextDifficulty){postState.themePacks.clear();closeThemePackSelect({scroll:false});}postState.difficulty=nextDifficulty;$$('[data-post-difficulty]').forEach(x=>x.classList.toggle('active',x===b));clearStepValidation(1);updateDifficultyDisplay();});
function updatePostSummaryCount(){if(postSummaryCount)postSummaryCount.textContent=String(postSummary?.value.length||0);}
if(postSummary){postSummary.addEventListener('input',()=>{updatePostSummaryCount();if(postSummary.value.trim())clearStepValidation(6);});updatePostSummaryCount();}
$$('[data-post-type]').forEach(b=>b.onclick=()=>{$$('[data-post-type]').forEach(x=>x.classList.remove('active'));b.classList.add('active');postState.type=b.dataset.postType;clearStepValidation(1);if(isSoloPost()&&postState.identityOrder.length>1)postState.identityOrder=postState.identityOrder.slice(0,1);if(isSoloPost()){const soloId=postState.identityOrder[0];for(const id of [...postState.egos.keys()])if(id!==soloId)postState.egos.delete(id);}renderFormationOrder();renderEgoSinners();renderDetailTags();$('[data-type-preview]').textContent=postState.type;$('[data-type-copy]').textContent=b.querySelector('small').textContent+'攻略として投稿します。';renderTypePreviewIcon(b);$$('[data-type-badge]').forEach(x=>{x.textContent=postState.type;x.classList.remove('is-unset');});});updateDifficultyDisplay();const handlePostTitleSync=()=>{
  syncTitle();
  document.querySelector('[data-workspace-titlebar]')?.classList.remove('validation-error');
  if(stepValidation(1).valid)clearStepValidation(1);
};
let postTitleComposing=false;
postTitle.addEventListener('compositionstart',()=>{postTitleComposing=true;});
postTitle.addEventListener('compositionupdate',handlePostTitleSync);
postTitle.addEventListener('compositionend',()=>{postTitleComposing=false;handlePostTitleSync();requestAnimationFrame(handlePostTitleSync);setTimeout(handlePostTitleSync,0);});
['input','change','blur','keyup'].forEach(eventName=>postTitle.addEventListener(eventName,handlePostTitleSync));
postTitle.addEventListener('beforeinput',()=>requestAnimationFrame(handlePostTitleSync));
postTitle.addEventListener('keydown',event=>{if(event.key==='Enter')requestAnimationFrame(handlePostTitleSync);});
postTitle.addEventListener('focus',handlePostTitleSync);
window.visualViewport?.addEventListener('resize',()=>{if(document.activeElement===postTitle&&!postTitleComposing)handlePostTitleSync();});
setInterval(()=>{if(document.activeElement===postTitle)handlePostTitleSync();},120);const backToEgoSinners=$('[data-back-to-ego-sinners]');if(backToEgoSinners)backToEgoSinners.onclick=()=>closeEgoSelect();if(egoConfirmButton)egoConfirmButton.onclick=()=>{closeEgoSelect({scroll:true});showToast('E.G.O選択を決定しました。');};
if(clearCurrentEgos)clearCurrentEgos.onclick=()=>{
  const id=postState.activeEgoSinner;if(!id)return;
  const picks=egoMapFor(id);if(!picks.size)return;
  picks.clear();renderEgoOptions();updateEgoCount();updateEgoConfirmState();showToast('この囚人のE.G.O選択を解除しました。');
};
if(clearAllEgos)clearAllEgos.onclick=()=>{
  let total=0;postState.egos.forEach(map=>total+=map.size);if(!total)return;
  if(!window.confirm('選択中のE.G.Oをすべて解除しますか？'))return;
  postState.egos.clear();
  if(postState.activeEgoSinner)renderEgoOptions();
  updateEgoCount();updateEgoConfirmState();showToast('すべてのE.G.O選択を解除しました。');
};
if(closeThemePackSelectButton)closeThemePackSelectButton.onclick=()=>closeThemePackSelect();if(themePackSearch)themePackSearch.addEventListener('input',renderThemePackOptions);
const clearIdentities=$('[data-clear-identities]');if(clearIdentities)clearIdentities.onclick=()=>{postState.identities.clear();postState.identityAlternatives.clear();postState.identityOrder=[];postState.egos.clear();postState.freeSlotEgoEnabled.clear();renderIdentitySinnerRoster();if(postState.activeSinner)openIdentitySelect(postState.activeSinner);updatePostIdentityCount();};const legacyClearEgos=$('[data-clear-egos]');if(legacyClearEgos)legacyClearEgos.onclick=()=>{postState.egos.clear();postState.freeSlotEgoEnabled.clear();closeEgoSelect();renderEgoSinners();};const goBackInWorkspace=()=>{if(postState.step===4&&postState.activeEgoSinner)return closeEgoSelect();if(postState.step===5&&postState.activeThemePackFloor)return closeThemePackSelect();setStep(postState.step-1);};$('[data-prev-step]').onclick=goBackInWorkspace;if(mobilePrevStep)mobilePrevStep.onclick=goBackInWorkspace;
function buildPostPayload(){
  // 使用人格と編成順は別データとして保存する。
  // selectedIdentities には投稿画面で選択した12囚人分（自由枠を含む）を保持し、
  // party には実際に編成順へ入れた囚人だけを保持する。
  const selectedIdentities=sinnerIdentityData.filter(sinner=>postState.identities.has(sinner.id)).map(sinner=>{const identity=postState.identities.get(sinner.id);return {sinner:sinner.name,identity:identity?.name||'',sinner_id:sinner.id,is_free:!!identity?.isFreeSlot,alternatives:alternativeNamesFor(sinner.id)};});
  const party=orderedSelectedSinners().map(sinner=>{const identity=postState.identities.get(sinner.id);return {order:formationPosition(sinner.id),sinner:sinner.name,identity:identity?.name||'',sinner_id:sinner.id,is_free:!!identity?.isFreeSlot};});
  const egos=orderedSelectedSinners().map(sinner=>{const picks=postState.egos.get(sinner.id)||new Map();return {sinner:sinner.name,items:[...picks.entries()].map(([rank,name])=>`${rank}: ${name}`)};}).filter(group=>group.items.length);
  return {
    title:postTitle.value.trim(), summary:$('[data-post-summary]')?.value.trim()||'', category:postState.category||'mirror_dungeon',
    difficulty:postState.difficulty||null, strategy_type:postState.type||null,
    content:{selectedIdentities,party,egos,themePacks:[...postState.themePacks.entries()].map(([floor,name])=>({floor,name})),keywords:automaticPostKeywords(),tags:[...postState.strategyTags],affiliations:[...postState.affiliationTags],description:$('[data-post-points]')?.value.trim()||''}
  };
}
async function savePostToSupabase(status){
  const client=window.limbusSupabase; if(!client){showToast('Supabase接続設定を読み込めませんでした。');return false;}
  const {data:{session}}=await client.auth.getSession(); const user=session?.user;
  if(!user){window.LimbusAuth?.open();return false;}
  if(status==='published'&&!validateAllRequiredSteps())return false;
  const payload=buildPostPayload();
  if(!payload.title){window.alert('攻略タイトルを設定していません');setStep(1);return false;}
  const row={author_id:user.id,...payload,status,published_at:status==='published'?new Date().toISOString():null,updated_at:new Date().toISOString()};
  const editingId=postModal.dataset.editingPostId;
  if(!editingId){const {count,error:countError}=await client.from('posts').select('*',{count:'exact',head:true}).eq('author_id',user.id);if(countError){showToast(`投稿数を確認できませんでした：${countError.message}`);return false;}if((count||0)>=20){showToast('投稿上限の20件に達しています。既存の投稿を編集または削除してください。');return false;}}
  const query=editingId?client.from('posts').update(row).eq('id',editingId).eq('author_id',user.id).select('id').single():client.from('posts').insert(row).select('id').single();
  const {data,error}=await query;
  if(error){console.error(error);showToast(`保存できませんでした：${error.message}`);return false;}
  postModal.dataset.editingPostId=data.id;
  showToast(status==='published'?'攻略を公開しました。':'下書きを保存しました。');
  if(status==='published'){if(activeLocalDraftId&&window.confirm('公開した投稿のセーブデータを削除しますか？')){writeLocalDrafts(readLocalDrafts().filter(x=>x.id!==activeLocalDraftId));activeLocalDraftId=null;}setTimeout(()=>{location.href=`post-detail.html?id=${encodeURIComponent(data.id)}`;},700);}
  return true;
}

const LOCAL_DRAFT_KEY='limbus-post-save-slots-v1';
const LOCAL_DRAFT_LIMIT=5;
const draftManager=$('[data-draft-manager]');
const draftSlotList=$('[data-draft-slot-list]');
const draftSlotCount=$('[data-draft-slot-count]');
let activeLocalDraftId=null;
function readLocalDrafts(){try{const value=JSON.parse(localStorage.getItem(LOCAL_DRAFT_KEY)||'[]');return Array.isArray(value)?value.slice(0,LOCAL_DRAFT_LIMIT):[]}catch{return []}}
function writeLocalDrafts(items){localStorage.setItem(LOCAL_DRAFT_KEY,JSON.stringify(items.slice(0,LOCAL_DRAFT_LIMIT)))}
function serializeDraftState(){
  return {version:1,step:postState.step,editingPostId:postModal.dataset.editingPostId||'',payload:buildPostPayload(),
    identityAlternatives:[...postState.identityAlternatives.entries()].map(([id,items])=>[id,(items||[]).map(item=>({name:item?.name||'',rarity:item?.rarity||'',keywords:item?.keywords||[]}))]),
    identities:[...postState.identities.entries()].map(([id,item])=>[id,{name:item?.name||'',rarity:item?.rarity||'',keywords:item?.keywords||[],isFreeSlot:!!item?.isFreeSlot}]),
    identityOrder:[...postState.identityOrder],egos:[...postState.egos.entries()].map(([id,map])=>[id,[...map.entries()]]),
    freeSlotEgoEnabled:[...postState.freeSlotEgoEnabled],ammoKeywordSelected:!!postState.ammoKeywordSelected};
}
function applyDraftState(saved){
  const payload=saved?.payload||{},content=payload.content||{};
  postModal.dataset.editingPostId=saved.editingPostId||'';postState.category=payload.category||'mirror_dungeon';postState.type=payload.strategy_type||null;postState.difficulty=payload.difficulty||null;
  postState.identities=new Map((saved.identities||[]).map(([id,item])=>{const sinner=sinnerIdentityData.find(x=>x.id===id);const found=sinner?.identities.find(x=>x.name===item.name);return [id,found||item]}));
  postState.identityAlternatives=new Map((saved.identityAlternatives||[]).map(([id,items])=>{const sinner=sinnerIdentityData.find(x=>x.id===id);return [id,(items||[]).map(item=>sinner?.identities.find(x=>x.name===item.name)||item)]}));
  postState.identityOrder=[...(saved.identityOrder||[])];postState.egos=new Map((saved.egos||[]).map(([id,entries])=>[id,new Map(entries||[])]));postState.freeSlotEgoEnabled=new Set(saved.freeSlotEgoEnabled||[]);
  postState.themePacks=new Map(normalizeThemePackEntries(content.themePacks||[]).map(x=>[Number(x.floor),x.name]));postState.strategyTags=new Set(content.tags||[]);postState.affiliationTags=new Set(content.affiliations||[]);postState.ammoKeywordSelected=!!saved.ammoKeywordSelected;
  postTitle.value=payload.title||'';if(postSummary)postSummary.value=payload.summary||'';const points=$('[data-post-points]');if(points)points.value=content.description||'';
  $$('[data-post-type]').forEach(x=>x.classList.toggle('active',x.dataset.postType===postState.type));$$('[data-post-difficulty]').forEach(x=>x.classList.toggle('active',x.dataset.postDifficulty===postState.difficulty));
  updatePostCategoryDisplays();updateDifficultyDisplay();syncTitle();updatePostSummaryCount();renderIdentitySinnerRoster();renderFormationOrder();renderEgoSinners();renderThemeFloorCards();renderDetailTags();setStep(Math.min(7,Math.max(1,Number(saved.step)||1)));
}
function formatDraftDate(value){try{return new Intl.DateTimeFormat('ja-JP',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}catch{return value||''}}
function renderDraftManager(){
  if(!draftSlotList)return;const drafts=readLocalDrafts();draftSlotList.replaceChildren();if(draftSlotCount)draftSlotCount.textContent=`${drafts.length} / ${LOCAL_DRAFT_LIMIT}件`;
  if(!drafts.length){draftSlotList.innerHTML='<p class="draft-slot-empty">保存されているセーブデータはありません。</p>';return;}
  drafts.forEach((draft,index)=>{const row=document.createElement('article');row.className='draft-slot-card';row.innerHTML=`<div><small>SLOT ${index+1}</small><strong></strong><time></time></div><div class="draft-slot-actions"><button type="button" data-load>続きから編集</button><button type="button" data-overwrite>上書き保存</button><button type="button" data-delete>削除</button></div>`;row.querySelector('strong').textContent=draft.name||'無題のセーブデータ';row.querySelector('time').textContent=`最終保存：${formatDraftDate(draft.updatedAt)}`;
    row.querySelector('[data-load]').onclick=()=>{activeLocalDraftId=draft.id;applyDraftState(draft.state);closeDialog(draftManager);if(!postModal.open)openDialog(postModal);showToast('セーブデータを読み込みました。')};
    row.querySelector('[data-overwrite]').onclick=()=>{const items=readLocalDrafts(),target=items.find(x=>x.id===draft.id);if(!target)return;target.state=serializeDraftState();target.updatedAt=new Date().toISOString();writeLocalDrafts(items);activeLocalDraftId=draft.id;renderDraftManager();showToast('セーブデータを上書きしました。')};
    row.querySelector('[data-delete]').onclick=()=>{if(!confirm('このセーブデータを削除しますか？'))return;writeLocalDrafts(readLocalDrafts().filter(x=>x.id!==draft.id));if(activeLocalDraftId===draft.id)activeLocalDraftId=null;renderDraftManager();showToast('セーブデータを削除しました。')};draftSlotList.appendChild(row)});
}
function createLocalDraft(){const items=readLocalDrafts();if(items.length>=LOCAL_DRAFT_LIMIT){showToast('セーブデータは最大5件です。不要なデータを削除してください。');return}const defaultName=postTitle.value.trim()||`セーブデータ ${items.length+1}`;const name=prompt('セーブデータ名を入力してください。',defaultName);if(name===null)return;const now=new Date().toISOString(),id=(crypto.randomUUID?.()||`draft-${Date.now()}`);items.push({id,name:name.trim().slice(0,40)||defaultName,updatedAt:now,state:serializeDraftState()});writeLocalDrafts(items);activeLocalDraftId=id;renderDraftManager();showToast('セーブデータを保存しました。')}
$('[data-save-draft]').onclick=()=>{renderDraftManager();openDialog(draftManager)};
$('[data-close-draft-manager]')?.addEventListener('click',()=>closeDialog(draftManager));
$('[data-create-draft-slot]')?.addEventListener('click',createLocalDraft);
if(draftManager){
  draftManager.addEventListener('close',unlockPageScroll);
  draftManager.addEventListener('cancel',event=>{event.preventDefault();closeDialog(draftManager);});
  draftManager.addEventListener('click',event=>{if(event.target===draftManager)closeDialog(draftManager);});
}

const postCloseConfirm=$('[data-post-close-confirm]');
function resetPostEditorState(){
  postModal.dataset.editingPostId='';activeLocalDraftId=null;
  postState.step=1;postState.category='mirror_dungeon';postState.type=null;postState.difficulty=null;
  postState.identities=new Map();postState.identityAlternatives=new Map();postState.identityOrder=[];postState.egos=new Map();postState.freeSlotEgoEnabled=new Set();postState.themePacks=new Map();postState.activeThemePackFloor=null;postState.strategyTags=new Set();postState.affiliationTags=new Set();postState.ammoKeywordSelected=false;postState.activeSinner=sinnerIdentityData[0]?.id||null;postState.activeEgoSinner=null;postState.alternativeSelectionMode=false;
  postTitle.value='';if(postSummary)postSummary.value='';const points=$('[data-post-points]');if(points)points.value='';
  $$('[data-post-type],[data-post-difficulty]').forEach(node=>node.classList.remove('active'));
  updatePostCategoryDisplays();updateDifficultyDisplay();syncTitle();updatePostSummaryCount();renderIdentitySinnerRoster();renderFormationOrder();renderEgoSinners();renderThemeFloorCards();renderDetailTags();setStep(1);
}
function requestPostClose(){if(postCloseConfirm&&!postCloseConfirm.open)openDialog(postCloseConfirm)}
$$('[data-close-post]').forEach(button=>button.onclick=requestPostClose);
$('[data-cancel-close-post]')?.addEventListener('click',()=>closeDialog(postCloseConfirm));
$('[data-discard-and-close-post]')?.addEventListener('click',()=>{closeDialog(postCloseConfirm);closeDialog(postModal);resetPostEditorState();showToast('入力内容を破棄しました。');});
$('[data-save-and-close-post]')?.addEventListener('click',()=>{if(!createLocalDraft())return;closeDialog(postCloseConfirm);closeDialog(postModal);resetPostEditorState();showToast('下書きを保存して投稿画面を閉じました。');});
postCloseConfirm?.addEventListener('cancel',event=>{event.preventDefault();closeDialog(postCloseConfirm)});

$('[data-next-step]').onclick=async()=>{if(postState.step===4&&postState.activeEgoSinner)return closeEgoSelect();if(postState.step===5&&postState.activeThemePackFloor)return closeThemePackSelect();if(postState.step===7)return savePostToSupabase('published');if(!validateRequiredStep(postState.step))return;setStep(postState.step+1);};

postState.activeSinner=sinnerIdentityData[0]?.id||null;updatePostCategoryDisplays();searchController.renderActiveFilters();renderIdentitySinnerRoster();updatePartyKeywordSummary();setStep(1);

function openDraftEditorFromQuery(){
  const draftId=new URLSearchParams(location.search).get('draft');if(!draftId)return false;
  const draft=readLocalDrafts().find(x=>String(x.id)===String(draftId));
  if(!draft){showToast('指定されたセーブデータを読み込めませんでした。');return false;}
  activeLocalDraftId=draft.id;applyDraftState(draft.state);openDialog(postModal);showToast('セーブデータを読み込みました。');return true;
}
async function openPostEditorFromQuery(){
  if(openDraftEditorFromQuery())return;
  const editId=new URLSearchParams(location.search).get('edit');if(!editId||!window.limbusSupabase)return;
  const {data:{session}}=await window.limbusSupabase.auth.getSession();if(!session?.user)return;
  const {data:p,error}=await window.limbusSupabase.from('posts').select('*').eq('id',editId).eq('author_id',session.user.id).maybeSingle();if(error||!p){showToast('編集する投稿を読み込めませんでした。');return;}
  const c=p.content||{};postModal.dataset.editingPostId=p.id;postState.category=p.category||'mirror_dungeon';postState.type=p.strategy_type||null;postState.difficulty=p.difficulty||null;postState.identities.clear();postState.identityAlternatives.clear();postState.identityOrder=[];postState.egos.clear();postState.themePacks=new Map(normalizeThemePackEntries(c.themePacks||[]).map(x=>[Number(x.floor),x.name]));postState.strategyTags=new Set(c.tags||[]);postState.affiliationTags=new Set(c.affiliations||[]);
  // 新形式では使用人格全体を selectedIdentities、編成順を party として個別に復元する。
  // 旧投稿は selectedIdentities がないため party を使用人格のフォールバックとして扱う。
  const savedIdentities=Array.isArray(c.selectedIdentities)&&c.selectedIdentities.length?c.selectedIdentities:(c.party||[]);
  savedIdentities.forEach(item=>{const sinner=sinnerIdentityData.find(x=>x.name===item.sinner||x.id===item.sinner_id);if(!sinner)return;const isFree=!!item.is_free||String(item.identity||'').includes('自由枠');const identity=sinner.identities.find(x=>x.name===item.identity)||{name:item.identity||'自由枠（誰でも可）',rarity:isFree?'FREE':undefined,keywords:[],isFreeSlot:isFree};postState.identities.set(sinner.id,identity);postState.identityAlternatives.set(sinner.id,(item.alternatives||[]).map(name=>sinner.identities.find(x=>x.name===name)||{name}));});
  (c.party||[]).sort((a,b)=>(Number(a.order)||999)-(Number(b.order)||999)).forEach(item=>{const sinner=sinnerIdentityData.find(x=>x.name===item.sinner||x.id===item.sinner_id);if(!sinner||!postState.identities.has(sinner.id))return;postState.identityOrder.push(sinner.id);});
  (c.egos||[]).forEach(group=>{const sinner=sinnerIdentityData.find(x=>x.name===group.sinner);if(!sinner)return;const map=new Map();(group.items||[]).forEach(v=>{const i=String(v).indexOf(':');if(i>0)map.set(String(v).slice(0,i).trim(),String(v).slice(i+1).trim())});postState.egos.set(sinner.id,map)});
  postTitle.value=p.title||'';if(postSummary)postSummary.value=p.summary||'';const points=$('[data-post-points]');if(points)points.value=c.description||'';
  $$('[data-post-type]').forEach(x=>x.classList.toggle('active',x.dataset.postType===postState.type));$$('[data-post-difficulty]').forEach(x=>x.classList.toggle('active',x.dataset.postDifficulty===postState.difficulty));updatePostCategoryDisplays();updateDifficultyDisplay();syncTitle();updatePostSummaryCount();renderIdentitySinnerRoster();renderFormationOrder();renderEgoSinners();renderThemeFloorCards();renderDetailTags();setStep(1);openDialog(postModal);showToast('投稿を編集できます。');
}
openPostEditorFromQuery();
window.addEventListener('pageshow',reconcilePageScrollLock);
window.addEventListener('focus',()=>queueMicrotask(reconcilePageScrollLock));



// Mobile navigation
const mobileMenuButton=document.querySelector('.mobile-menu-button');
const headerNav=document.querySelector('.header-nav');
if(mobileMenuButton&&headerNav){
  mobileMenuButton.addEventListener('click',()=>{
    const open=headerNav.classList.toggle('mobile-open');
    mobileMenuButton.setAttribute('aria-expanded',String(open));
    mobileMenuButton.textContent=open?'×':'☰';
  });
  headerNav.addEventListener('click',e=>{
    if(window.innerWidth<=720&&(e.target.closest('a')||e.target.closest('button'))){
      headerNav.classList.remove('mobile-open');
      mobileMenuButton.setAttribute('aria-expanded','false');
      mobileMenuButton.textContent='☰';
    }
  });
  window.addEventListener('resize',()=>{
    if(window.innerWidth>720){
      headerNav.classList.remove('mobile-open');
      mobileMenuButton.setAttribute('aria-expanded','false');
      mobileMenuButton.textContent='☰';
    }
  });
}

})().catch(error=>{console.error(error);document.body.insertAdjacentHTML('afterbegin','<div class="data-load-error">データの読み込みに失敗しました。Live Serverで開いてください。</div>')});
