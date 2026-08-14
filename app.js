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
const identityFilterPanel=$('[data-identity-filter-panel]');
const identityFooterActions=$('[data-identity-footer-actions]');
const workspaceFooter=$('.workspace-footer');
const toggleIdentitySearch=$('[data-toggle-identity-search]');
const clearCurrentIdentity=$('[data-clear-current-identity]');
const clearAllIdentities=$('[data-clear-all-identities]');
const fillEmptyIdentities=$('[data-fill-empty-identities]');
const applyIdentityFilters=$('[data-apply-identity-filters]');
const identityFilterScrollHint=$('[data-identity-filter-scroll-hint]');
const partyKeywordSummaryChips=$('[data-party-keyword-summary-chips]');
const formationChoiceGrid=$('[data-formation-choice-grid]');
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
const workspaceStepName=$('[data-workspace-step-name]');
const workspaceStepCounter=$('[data-workspace-step-counter]');
const mobilePrevStep=$('[data-mobile-prev-step]');
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
const identitySelectionController=window.LimbusIdentitySelectionController.create({state:postState,identityData:sinnerIdentityData});
const alternativesFor=id=>identitySelectionController.alternativesFor(id);
const alternativeNamesFor=id=>identitySelectionController.alternativeNamesFor(id);
function isSoloPost(){return postState.type==='ソロ';}
const formationController=window.LimbusFormationController.create({state:postState,identityData:sinnerIdentityData,getImage:identityImageFor,showToast,clearValidation:()=>clearStepValidation(3)});
const formationPosition=id=>formationController.position(id);
const ensureFormationPosition=id=>formationController.ensure(id);
const removeFormationPosition=id=>formationController.remove(id);
const orderedSelectedSinners=()=>formationController.ordered();
const identityViewController=window.LimbusIdentityViewController.create({state:postState,identityData:sinnerIdentityData,cardTones,getIdentityImage:identityImageFor,applyCardImage:applyIdentityCardImage,escapeHtml:reviewEscape,getAlternatives:alternativesFor,onOpen:id=>openIdentitySelect(id),onRenderOptions:()=>renderIdentityOptions(),onFooterUpdate:()=>updateIdentityFooterState(),queueScroll:queueIdentityScroll});
const renderIdentitySinnerRoster=()=>identityViewController.renderRoster();
const renderIdentityAlternativeControls=()=>identityViewController.renderAlternatives();
function openIdentitySelect(sinnerId,options){identityViewController.open(sinnerId,options);}
const identityFilterController=window.LimbusIdentityFilterController.create({keywordDefinitions,onChange:()=>{renderIdentityOptions();updateIdentitySearchButtonState();}});
const identityCardController=window.LimbusIdentityCardController.create({state:postState,identityData:sinnerIdentityData,filterController:identityFilterController,selectionController:identitySelectionController,getTone:cardToneForKeywords,getImage:identityImageFor,applyImage:applyIdentityCardImage,onRenderRoster:()=>renderIdentitySinnerRoster(),onRenderAlternatives:()=>renderIdentityAlternativeControls(),onCountUpdate:()=>updatePostIdentityCount(),onValidationClear:()=>clearStepValidation(2),showToast,queueRosterScroll:()=>queueIdentityScroll(identitySinnerRoster,18)});
function renderIdentityOptions(){identityCardController.render();}
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
function updateIdentityFooterState(){identityWorkspaceController.updateFooter();}
const egoSummaryRankOrder=['ZAYIN','TETH','HE','WAW','ALEPH'];
function egoSummaryTagsMarkup(picks,{emptyLabel='E.G.Oを選択'}={}){
  const tags=egoSummaryRankOrder
    .filter(rank=>picks.has(rank))
    .map(rank=>`<span class="ego-summary-tag rank-${rank.toLowerCase()}"><b>${rank}</b><span>${picks.get(rank)}</span></span>`);
  return tags.length?tags.join(''):`<span class="ego-summary-empty">${emptyLabel}</span>`;
}
const egoController=window.LimbusEgoController.create({state:postState,identityData:sinnerIdentityData,egoData:sinnerEgoData,orderedSinners:orderedSelectedSinners,formationPosition,summaryMarkup:egoSummaryTagsMarkup,cardTones,toneForKeywords:cardToneForKeywords,getIdentityImage:identityImageFor,workspaceFooter,showToast,scrollToElement:smoothScrollToElement,queueScroll:queueIdentityScroll});
const renderEgoSinners=()=>egoController.renderSinners();
const closeEgoSelect=options=>egoController.close(options);
const updateEgoConfirmState=()=>egoController.updateControls();
const postValidationController=window.LimbusPostValidationController.create({state:postState,requiredIdentityCount:sinnerIdentityData.length});
const clearStepValidation=step=>postValidationController.clear(step);
const markStepValidation=(step,invalid=true)=>postValidationController.mark(step,invalid);
const stepValidation=step=>postValidationController.check(step);
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
  const required=postValidationController.requiredSteps;
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
  const requiredBefore=postValidationController.requiredSteps.filter(step=>step<target);
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
let postStepController;
function setStep(step){postStepController.set(step);}
function syncTitle(){const raw=postTitle?.value??'';const t=raw.trim()||'攻略タイトルを入力してください';$$('[data-title-preview],[data-workspace-title-live]').forEach(x=>{x.textContent=t;x.classList.toggle('is-placeholder',!raw.trim());});}
function renderFormationOrder(){formationController.render();}
const themePackController=window.LimbusThemePackController.create({data:themePackData,state:postState,escapeHtml:reviewEscape,showToast,scrollToElement:smoothScrollToElement,queueScroll:queueIdentityScroll});
const closeThemePackSelect=options=>themePackController.close(options);
const renderThemeFloorCards=()=>themePackController.renderFloors();
postStepController=window.LimbusPostStepController.create({state:postState,stepInfo,identityData:sinnerIdentityData,onCloseEgo:closeEgoSelect,onCloseTheme:closeThemePackSelect,onRenderIdentities:renderIdentitySinnerRoster,onOpenIdentity:openIdentitySelect,onRenderFormation:renderFormationOrder,onRenderEgos:renderEgoSinners,onRenderThemes:renderThemeFloorCards,onRenderDetails:renderDetailTags,onRenderReview:updateReview,onIdentityFooterUpdate:updateIdentityFooterState,onEgoFooterUpdate:updateEgoConfirmState,onResetScroll:resetStageScroll});
const postTagsController=window.LimbusPostTagsController.create({state:postState,strategyOptions:strategyTagOptions,affiliationOptions:affiliationTagOptions,automaticOptions:automaticKeywordOptions,strategyGrid:strategyTagGrid,affiliationGrid:affiliationTagGrid,automaticTags:automaticKeywordTags,ammoNote:ammoKeywordNote,strategyCount:strategyTagCount,affiliationCount:affiliationTagCount,getOrderedSinners:orderedSelectedSinners,getFormationPosition:formationPosition,isSolo:isSoloPost,showToast});
function keywordCounts(){return postTagsController.counts();}
function automaticPostKeywords(){return postTagsController.automaticKeywords();}
function renderDetailTags(){postTagsController.render();}
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
const postReviewController=window.LimbusPostReviewController.create({state:postState,getOrderedSinners:orderedSelectedSinners,getPosition:formationPosition,getTone:cardToneForKeywords,getImage:identityImageFor,escapeHtml:reviewEscape,egoRanks:egoSummaryRankOrder,egoTagMarkup:reviewEgoTagMarkup,tagMarkup:reviewTagMarkup,getAutomaticKeywords:automaticPostKeywords,activateMarquees:activateReviewEgoMarquees});
function updateReview(){postReviewController.render();}
const identityWorkspaceController=window.LimbusIdentityWorkspaceController.create({state:postState,filterController:identityFilterController,selectionController:identitySelectionController,filterPanel:identityFilterPanel,filterToggle:toggleIdentitySearch,filterScrollHint:identityFilterScrollHint,applyFiltersButton:applyIdentityFilters,clearCurrentButton:clearCurrentIdentity,clearAllButton:clearAllIdentities,fillEmptyButton:fillEmptyIdentities,footerActions:identityFooterActions,workspaceFooter,currentIdentityName,identityRoster:identitySinnerRoster,renderRoster:renderIdentitySinnerRoster,renderOptions:renderIdentityOptions,updateCount:updatePostIdentityCount,updateKeywordSummary:updatePartyKeywordSummary,clearValidation:clearStepValidation,queueRosterScroll:queueIdentityScroll,showToast,confirmClearAll:()=>window.confirm('選択中の人格と、それに設定したE.G.Oをすべて解除しますか？')});
identityWorkspaceController.bind();
function updateIdentitySearchButtonState(){identityWorkspaceController.updateSearchButton();}
function updateIdentityFilterScrollCue(){identityWorkspaceController.updateScrollCue();}
function closeIdentityFilterPanel(){identityWorkspaceController.closeFilter();}

const postCategoryController=window.LimbusPostCategoryController.create({state:postState,categories:categoryDefinitions,getCategory:categoryById,iconMarkup:categoryIconMarkup,dialog:categoryPicker,editorDialog:postModal,list:$('[data-category-picker-list]'),status:$('[data-category-picker-status]'),startButton:$('[data-start-category-post]'),openDraftButton:$('[data-open-draft-from-category]'),openButtons:$$('[data-open-post]'),closeButton:$('[data-close-category-picker]'),categoryBadges:$$('[data-post-category-badge]'),reviewCategory:$('[data-review-category]'),isAuthenticated:()=>localStorage.getItem('limbus-auth')==='logged-in',openAuth:()=>window.LimbusAuth?.open(),openDialog,closeDialog,openDrafts:()=>draftController.openManager(),resetEditor:()=>resetPostEditorState(),getInitialSinnerId:()=>sinnerIdentityData[0]?.id||null,setStep});
postCategoryController.bind();
const updatePostCategoryDisplays=()=>postCategoryController.updateDisplays();
$$('[data-step-link]').forEach(b=>b.onclick=()=>navigateToStep(+b.dataset.stepLink));
const postBasicsController=window.LimbusPostBasicsController.create({state:postState,titleInput:postTitle,typeButtons:$$('[data-post-type]'),difficultyButtons:$$('[data-post-difficulty]'),typePreview:$('[data-type-preview]'),typeCopy:$('[data-type-copy]'),typePreviewIcon:$('[data-type-preview-icon]'),typePreviewDifficulty:$('[data-type-preview-difficulty]'),difficultyError:$('[data-difficulty-error]'),difficultyBadges:$$('[data-difficulty-badge]'),typeBadges:$$('[data-type-badge]'),workspaceTitlebar:$('[data-workspace-titlebar]'),syncTitle,validateBasics:()=>stepValidation(1),clearValidation:clearStepValidation,isSolo:isSoloPost,onDifficultyChanged:()=>closeThemePackSelect({scroll:false}),onTypeChanged:()=>{renderFormationOrder();renderEgoSinners();renderDetailTags();}});
postBasicsController.bind();
const updateDifficultyDisplay=()=>postBasicsController.updateDifficulty();
function updatePostSummaryCount(){if(postSummaryCount)postSummaryCount.textContent=String(postSummary?.value.length||0);}
if(postSummary){postSummary.addEventListener('input',()=>{updatePostSummaryCount();if(postSummary.value.trim())clearStepValidation(6);});updatePostSummaryCount();}
const clearIdentities=$('[data-clear-identities]');if(clearIdentities)clearIdentities.onclick=()=>{postState.identities.clear();postState.identityAlternatives.clear();postState.identityOrder=[];postState.egos.clear();postState.freeSlotEgoEnabled.clear();renderIdentitySinnerRoster();if(postState.activeSinner)openIdentitySelect(postState.activeSinner);updatePostIdentityCount();};const legacyClearEgos=$('[data-clear-egos]');if(legacyClearEgos)legacyClearEgos.onclick=()=>{postState.egos.clear();postState.freeSlotEgoEnabled.clear();closeEgoSelect();renderEgoSinners();};const goBackInWorkspace=()=>{if(postState.step===4&&postState.activeEgoSinner)return closeEgoSelect();if(postState.step===5&&postState.activeThemePackFloor)return closeThemePackSelect();setStep(postState.step-1);};$('[data-prev-step]').onclick=goBackInWorkspace;if(mobilePrevStep)mobilePrevStep.onclick=goBackInWorkspace;
const postPayloadController=window.LimbusPostPayloadController.create({state:postState,identityData:sinnerIdentityData,getAlternativeNames:alternativeNamesFor,getOrderedSinners:orderedSelectedSinners,getFormationPosition:formationPosition,getAutomaticKeywords:automaticPostKeywords});
const buildPostPayload=()=>postPayloadController.build();
let draftController;
const postPersistenceController=window.LimbusPostPersistenceController.create({buildPayload:buildPostPayload,getEditingId:()=>postModal.dataset.editingPostId||'',setEditingId:id=>{postModal.dataset.editingPostId=id;},validatePublished:validateAllRequiredSteps,onTitleMissing:()=>{window.alert('攻略タイトルを設定していません');setStep(1);},onAuthRequired:()=>window.LimbusAuth?.open(),onPublished:id=>{draftController.removeAfterPublish();setTimeout(()=>{location.href=`post-detail.html?id=${encodeURIComponent(id)}`;},700);},showToast});
const savePostToSupabase=status=>postPersistenceController.save(status);

function serializeDraftState(){
  return {version:1,step:postState.step,editingPostId:postModal.dataset.editingPostId||'',payload:buildPostPayload(),
    identityAlternatives:[...postState.identityAlternatives.entries()].map(([id,items])=>[id,(items||[]).map(item=>({name:item?.name||'',rarity:item?.rarity||'',keywords:item?.keywords||[]}))]),
    identities:[...postState.identities.entries()].map(([id,item])=>[id,{name:item?.name||'',rarity:item?.rarity||'',keywords:item?.keywords||[],isFreeSlot:!!item?.isFreeSlot}]),
    identityOrder:[...postState.identityOrder],egos:[...postState.egos.entries()].map(([id,map])=>[id,[...map.entries()]]),
    freeSlotEgoEnabled:[...postState.freeSlotEgoEnabled],ammoKeywordSelected:!!postState.ammoKeywordSelected};
}
const refreshRestoredEditor=step=>{updatePostCategoryDisplays();updateDifficultyDisplay();syncTitle();updatePostSummaryCount();renderIdentitySinnerRoster();renderFormationOrder();renderEgoSinners();renderThemeFloorCards();renderDetailTags();setStep(step);};
const postRestoreController=window.LimbusPostRestoreController.create({state:postState,identityData:sinnerIdentityData,postModal,normalizeThemePacks:normalizeThemePackEntries,onRefresh:refreshRestoredEditor});
const applyDraftState=saved=>postRestoreController.restoreDraft(saved);

draftController=window.LimbusDraftController.create({
  captureState:serializeDraftState,
  restoreState:applyDraftState,
  getDefaultName:index=>postTitle.value.trim()||`セーブデータ ${index+1}`,
  postModal,
  openDialog,
  closeDialog,
  unlockPageScroll,
  showToast
});

const postCloseConfirm=$('[data-post-close-confirm]');
const postEditorResetController=window.LimbusPostEditorResetController.create({state:postState,identityData:sinnerIdentityData,postModal,onClearDraft:()=>draftController.clearActive(),onRefresh:()=>{updatePostCategoryDisplays();updateDifficultyDisplay();syncTitle();updatePostSummaryCount();renderIdentitySinnerRoster();renderFormationOrder();renderEgoSinners();renderThemeFloorCards();renderDetailTags();setStep(1);}});
const resetPostEditorState=()=>postEditorResetController.reset();
window.LimbusPostCloseController.create({confirmDialog:postCloseConfirm,editorDialog:postModal,closeButtons:$$('[data-close-post]'),cancelButton:$('[data-cancel-close-post]'),discardButton:$('[data-discard-and-close-post]'),saveButton:$('[data-save-and-close-post]'),openDialog,closeDialog,unlockPageScroll,saveDraft:()=>draftController.createDraft(),resetEditor:resetPostEditorState,showToast});

const postAdvanceController=window.LimbusPostAdvanceController.create({state:postState,identityCount:sinnerIdentityData.length,closeEgoSelect,closeThemePackSelect,publish:()=>savePostToSupabase('published'),confirmFillEmpty:missingCount=>window.confirm(`未設定の人格枠が${missingCount}件あります。空いている枠を自由枠に設定して次へ進みますか？`),fillEmpty:()=>identitySelectionController.fillEmpty(),afterFillEmpty:missingCount=>{clearStepValidation(2);renderIdentitySinnerRoster();renderIdentityOptions();updatePostIdentityCount();showToast(`空いている${missingCount}枠を自由枠に設定しました。`);},validateStep:validateRequiredStep,setStep});
$('[data-next-step]').onclick=()=>postAdvanceController.advance();

postState.activeSinner=sinnerIdentityData[0]?.id||null;updatePostCategoryDisplays();searchController.renderActiveFilters();renderIdentitySinnerRoster();updatePartyKeywordSummary();setStep(1);

const postEditorLaunchController=window.LimbusPostEditorLaunchController.create({openDraftFromQuery:()=>draftController.openFromQuery(),restorePost:post=>postRestoreController.restorePost(post),openEditor:()=>openDialog(postModal),showToast});
postEditorLaunchController.openFromQuery();
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
