(async()=>{
const [sinnerIdentityData,sinnerEgoData,keywordDefinitions,themePackData,siteConfig]=await Promise.all([
  fetch('data/identities.json').then(r=>{if(!r.ok)throw new Error('identities.json');return r.json()}),
  fetch('data/egos.json').then(r=>{if(!r.ok)throw new Error('egos.json');return r.json()}),
  fetch('data/keywords.json').then(r=>{if(!r.ok)throw new Error('keywords.json');return r.json()}),
  fetch('data/packs.json?v=1.1.30').then(r=>{if(!r.ok)throw new Error('packs.json');return r.json()}),
  fetch('data/site-config.json?v=1.1.39').then(r=>{if(!r.ok)throw new Error('site-config.json');return r.json()})
]);
const identityOptions=sinnerIdentityData.flatMap(sinner=>sinner.identities.map(identity=>`${sinner.name}｜${identity.name}`));
const categoryDefinitions=window.STRATEGY_CATEGORIES||[];
const returnPostId=new URLSearchParams(location.search).get('returnPost');
document.addEventListener('click',event=>{const link=event.target.closest('a.post-detail-link[href*="post-detail.html"]');if(!link)return;const card=link.closest('[data-post-id]');try{sessionStorage.setItem('limbusPostReturn',JSON.stringify({id:card?.dataset.postId||'',y:window.scrollY}));}catch{}});
if(returnPostId){let positionRestored=false;const restorePostPosition=()=>setTimeout(()=>{if(positionRestored)return;positionRestored=true;let saved=null;try{saved=JSON.parse(sessionStorage.getItem('limbusPostReturn')||'null');sessionStorage.removeItem('limbusPostReturn');}catch{}const card=document.querySelector(`[data-post-id="${CSS.escape(returnPostId)}"]`);if(saved?.id===returnPostId&&Number.isFinite(saved.y))window.scrollTo({top:saved.y,behavior:'auto'});else card?.scrollIntoView({block:'center',behavior:'auto'});history.replaceState(null,'',`${location.pathname}#community`);},80);window.addEventListener('limbus-posts-loaded',restorePostPosition,{once:true});setTimeout(restorePostPosition,1200);}
const categoryById=id=>categoryDefinitions.find(item=>item.id===id)||categoryDefinitions[0]||{id:'mirror_dungeon',label:'鏡ダンジョン',available:true};
const categoryIconMarkup=(category,className='category-image-icon')=>category?.iconImage?`<img class="${className}" src="${category.iconImage}" alt="" loading="lazy">`:`<span aria-hidden="true">${category?.icon||''}</span>`;
const searchOptions={
  keyword:keywordDefinitions.filter(item=>item.name!=='ソロ').map(item=>item.name),
  type:['安定周回','速攻周回','高難易度向け','縛り・テーマ攻略','ネタ・ロマン','ソロ','安定攻略','速攻攻略','低レア攻略'],
  strategy:['斬撃','貫通','打撃','憤怒','色欲','怠惰','暴食','憂鬱','傲慢','嫉妬','オート対応','半オート','手動推奨','初心者向け','中級者向け','上級者向け','安定重視','高速周回','自由枠あり','人格固定','運要素あり','E.G.O依存','ギフト依存'],
  difficulty:['ノーマル','ハード'],
  affiliation:['リンバス・カンパニー','ロボトミー本社','H社','N社','R社','T社','W社','ツヴァイ','シ','センク','リウ','セブン','チェーヴィチ','ディエーチ','ウーフィ','剣契','黒雲会','技術解放連合','ワザリング・ハイツ','ピークォド号','血鬼','黒獣','指','親指','人差し指','中指','薬指','小指','蜘蛛の巣','LCE','E.G.O装備','捨てる']
};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

async function syncLatestUpdateDate(){const target=$('[data-site-last-updated]');if(!target)return;try{const response=await fetch('data/update-history.json',{cache:'no-cache'});if(!response.ok)return;const [latest]=await response.json();const raw=String(latest?.date||'').trim();if(!raw)return;const display=raw.replaceAll('-','.');target.dateTime=raw.replaceAll('.','-');target.textContent=`Last Updated: ${display}`;}catch{}}
syncLatestUpdateDate();

// 訪問数の集計はトップページで継続し、表示は管理者アカウント側で確認する。
async function trackSiteVisit(){
  try{await window.LimbusCommunity?.registerVisit();}
  catch(error){console.warn('訪問数を記録できませんでした。',error);}
}
trackSiteVisit();

const categoryPicker=$('[data-category-picker]'),postModal=$('[data-post-modal]'),toast=$('[data-toast]');
const siteUiController=window.LimbusSiteUiController.create({toast,managedDialogs:[$('[data-selector-modal]'),categoryPicker,postModal],themeToggles:$$('[data-theme-toggle]'),mobileMenuButton:$('.mobile-menu-button'),headerNav:$('.header-nav')});
siteUiController.bind();
const openDialog=dialog=>siteUiController.openDialog(dialog);
const closeDialog=dialog=>siteUiController.closeDialog(dialog);
const unlockPageScroll=()=>siteUiController.unlockPageScroll();
const showToast=message=>siteUiController.showToast(message);

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
const postState={step:1,category:'mirror_dungeon',type:null,difficulty:null,stage:null,identities:new Map(),identityAlternatives:new Map(),identityOrder:[],egos:new Map(),freeSlotEgoEnabled:new Set(),themePacks:new Map(),activeThemePackFloor:null,strategyTags:new Set(),affiliationTags:new Set(),manualKeywords:new Set(),ammoKeywordSelected:false,activeSinner:null,activeEgoSinner:null,alternativeSelectionMode:false,secondaryPartyEnabled:false,rearParty:null,activePartyPhase:'front'};
const stepInfo={1:['STEP 1','攻略タイプを選択','この攻略がどんなプレイヤー向けか選んでください。'],2:['STEP 2','使用人格を選択','囚人を選び、それぞれ使用する人格を1つずつ選択してください。'],3:['STEP 3','編成順を選択','使用人格を、実際に出撃させる順番で選択してください。'],4:['STEP 4','使用E.G.Oを選択','※任意のステップです。使用するE.G.Oがある場合のみ設定してください。'],5:['STEP 5','進行テーマパックを選択','※任意のステップです。階層ごとに通過したテーマパックを選択してください。'],6:['STEP 6','詳細情報を入力','攻略タグや説明、所属・特殊タグを入力してください。'],7:['STEP 7','確認して投稿','入力内容を確認して投稿へ進みます。']};
const postTitle=$('[data-post-title]');
const postSummary=$('[data-post-summary]');
const postSummaryCount=$('[data-post-summary-count]');
const identitySinnerRoster=$('[data-identity-sinner-roster]');
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
  '蜘蛛の巣人差し指の親方':'assets/identities/yi-sang/002.png',
  '黒獣-午 筆頭':'assets/identities/yi-sang/003.png',
  '南部リウ協会3課':'assets/identities/yi-sang/004.png',
  '薬指点描派スチューデント':'assets/identities/yi-sang/005.png',
  'W社3級整理要員':'assets/identities/yi-sang/006.png',
  '開花 E.G.O::壇香梅':'assets/identities/yi-sang/007.png',
  '剣契殺手':'assets/identities/yi-sang/008.png',
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
const themePackNameNormalizer=window.LimbusThemePackNames.create(themePackData);
const normalizeThemePackEntries=entries=>themePackNameNormalizer.normalizeEntries(entries);
const strategyTagOptions=['オート対応','半オート','手動推奨','初心者向け','中級者向け','上級者向け','安定重視','高速周回','自由枠あり','人格固定','運要素あり','E.G.O依存','ギフト依存'];
const affiliationTagOptions=['リンバス・カンパニー','ロボトミー本社','H社','N社','R社','T社','W社','ツヴァイ','シ','センク','リウ','セブン','チェーヴィチ','ディエーチ','ウーフィ','剣契','黒雲会','技術解放連合','ワザリング・ハイツ','ピークォド号','血鬼','黒獣','指','親指','人差し指','中指','薬指','小指','蜘蛛の巣','LCE','E.G.O装備','捨てる'];
const automaticKeywordOptions=['火傷','出血','振動','破裂','沈潜','呼吸','充電'];
const manualKeywordOptions=keywordDefinitions.filter(item=>item.name!=='ソロ').map(item=>item.name);
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
const egoController=window.LimbusEgoController.create({state:postState,identityData:sinnerIdentityData,egoData:sinnerEgoData,orderedSinners:orderedSelectedSinners,formationPosition,summaryMarkup:egoSummaryTagsMarkup,cardTones,toneForKeywords:cardToneForKeywords,getIdentityImage:identityImageFor,getEgoImage:(id,name)=>window.LimbusEgoImages?.forEgo(id,name,sinnerEgoData)||'',workspaceFooter,showToast,scrollToElement:smoothScrollToElement,queueScroll:queueIdentityScroll});
const renderEgoSinners=()=>egoController.renderSinners();
const closeEgoSelect=options=>egoController.close(options);
const updateEgoConfirmState=()=>egoController.updateControls();
const postValidationController=window.LimbusPostValidationController.create({state:postState,requiredIdentityCount:sinnerIdentityData.length});
const clearStepValidation=step=>postValidationController.clear(step);
const stepValidation=step=>postValidationController.check(step);
const validationFlowController=window.LimbusPostValidationFlowController.create({state:postState,validationController:postValidationController,identityData:sinnerIdentityData,titleInput:postTitle,summaryInput:postSummary,formationGrid:formationChoiceGrid,renderIdentityRoster:renderIdentitySinnerRoster,openIdentity:openIdentitySelect,setStep:step=>setStep(step),showToast});
function validateRequiredStep(step,options){return validationFlowController.validateStep(step,options);}
function validateAllRequiredSteps(){return validationFlowController.validateAll();}
function clearDetailValidation(){document.querySelector('[data-detail-step-link]')?.classList.remove('validation-error');document.querySelector('[data-post-step="6"]')?.classList.remove('validation-error');}
function validateProjectionDetails(){const valid=Boolean(postSummary?.value.trim());document.querySelector('[data-detail-step-link]')?.classList.toggle('validation-error',!valid);document.querySelector('[data-post-step="6"]')?.classList.toggle('validation-error',!valid);if(!valid){window.alert('一言紹介が入力されていません。');requestAnimationFrame(()=>postSummary?.focus());}return valid;}
function navigateToStep(target){
  if(postState.category!=='projection_combat')return validationFlowController.navigate(target);
  const max=postState.secondaryPartyEnabled?9:6;target=Math.max(1,Math.min(max,target));if(target<=postState.step){setStep(target);return true;}
  const required=[];if(postState.step<2&&target>=2)required.push([1,1]);if(postState.step<3&&target>=3)required.push([2,2]);if(postState.step<4&&target>=4)required.push([3,3]);
  for(const [logical,physical] of required){if(!validateRequiredStep(physical)){setStep(logical);return false;}}
  if(target===(postState.secondaryPartyEnabled?9:6)&&!validateProjectionDetails()){setStep(postState.secondaryPartyEnabled?8:5);return false;}
  setStep(target);return true;
}
let postStepController;
let formationCodeController;
function setStep(step){postStepController.set(step);}
const blankPartyState=()=>({identities:new Map(),identityAlternatives:new Map(),identityOrder:[],egos:new Map(),freeSlotEgoEnabled:new Set(),activeSinner:sinnerIdentityData[0]?.id||null,activeEgoSinner:null,alternativeSelectionMode:false});
let frontParty=null;
function captureActiveParty(){return {identities:postState.identities,identityAlternatives:postState.identityAlternatives,identityOrder:postState.identityOrder,egos:postState.egos,freeSlotEgoEnabled:postState.freeSlotEgoEnabled,activeSinner:postState.activeSinner,activeEgoSinner:postState.activeEgoSinner,alternativeSelectionMode:postState.alternativeSelectionMode};}
function loadParty(party,phase){postState.identities=party.identities;postState.identityAlternatives=party.identityAlternatives;postState.identityOrder=party.identityOrder;postState.egos=party.egos;postState.freeSlotEgoEnabled=party.freeSlotEgoEnabled;postState.activeSinner=party.activeSinner;postState.activeEgoSinner=party.activeEgoSinner;postState.alternativeSelectionMode=party.alternativeSelectionMode;postState.activePartyPhase=phase;}
function switchPartyForStep(next){if(postState.category!=='projection_combat')return;const target=postState.secondaryPartyEnabled&&next>=5&&next<=7?'rear':'front';if(postState.activePartyPhase===target)return;if(postState.activePartyPhase==='rear')postState.rearParty=captureActiveParty();else postState.frontParty=frontParty=captureActiveParty();loadParty(target==='rear'?(postState.rearParty||(postState.rearParty=blankPartyState())):(postState.frontParty||frontParty||captureActiveParty()),target);requestAnimationFrame(updatePartyKeywordSummary);}
function syncTitle(){const raw=postTitle?.value??'';const t=raw.trim()||'攻略タイトルを入力してください';$$('[data-title-preview],[data-workspace-title-live]').forEach(x=>{x.textContent=t;x.classList.toggle('is-placeholder',!raw.trim());});}
function renderFormationOrder(){formationController.render();}
const themePackController=window.LimbusThemePackController.create({data:themePackData,state:postState,escapeHtml:reviewEscape,showToast,scrollToElement:smoothScrollToElement,queueScroll:queueIdentityScroll});
const closeThemePackSelect=options=>themePackController.close(options);
const renderThemeFloorCards=()=>themePackController.renderFloors();
postStepController=window.LimbusPostStepController.create({state:postState,stepInfo,identityData:sinnerIdentityData,onCloseEgo:closeEgoSelect,onCloseTheme:closeThemePackSelect,onRenderIdentities:renderIdentitySinnerRoster,onOpenIdentity:openIdentitySelect,onRenderFormation:renderFormationOrder,onRenderEgos:renderEgoSinners,onRenderThemes:renderThemeFloorCards,onRenderDetails:renderDetailTags,onRenderReview:updateReview,onEnterIdentity:()=>formationCodeController?.offer(),onIdentityFooterUpdate:updateIdentityFooterState,onEgoFooterUpdate:updateEgoConfirmState,onResetScroll:resetStageScroll,onBeforeStep:switchPartyForStep});
const postTagsController=window.LimbusPostTagsController.create({state:postState,strategyOptions:strategyTagOptions,getStrategyOptions:()=>{const extras=postState.category==='luxcavation'?(postState.stage==='経験値'?['斬撃','貫通','打撃']:postState.stage==='紐'?['全属性','憤怒','色欲','怠惰','暴食','憂鬱','傲慢','嫉妬']:[]):[];return [...extras,...strategyTagOptions.filter(tag=>!extras.includes(tag))];},affiliationOptions:affiliationTagOptions,automaticOptions:automaticKeywordOptions,manualOptions:manualKeywordOptions,strategyGrid:strategyTagGrid,affiliationGrid:affiliationTagGrid,automaticTags:automaticKeywordTags,ammoNote:ammoKeywordNote,strategyCount:strategyTagCount,affiliationCount:affiliationTagCount,getOrderedSinners:orderedSelectedSinners,getFormationPosition:formationPosition,isSolo:isSoloPost,showToast});
function automaticPostKeywords(){return postTagsController.automaticKeywords();}
function renderDetailTags(){postTagsController.render();}
function reviewEscape(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));}
function reviewTagMarkup(label,className=''){return `<span class="review-tag ${className}" data-strategy-tag="${reviewEscape(label)}">${reviewEscape(label)}</span>`;}
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
formationCodeController=window.LimbusFormationCode.create({state:postState,identityData:sinnerIdentityData,egoData:sinnerEgoData,showToast,onApplied:()=>{clearStepValidation(2);renderIdentitySinnerRoster();renderIdentityOptions();renderFormationOrder();renderEgoSinners();updatePostIdentityCount();setStep(2);}});
function updateReview(){postReviewController.render();formationCodeController.refresh();}
const identityWorkspaceController=window.LimbusIdentityWorkspaceController.create({state:postState,filterController:identityFilterController,selectionController:identitySelectionController,filterPanel:identityFilterPanel,filterToggle:toggleIdentitySearch,filterScrollHint:identityFilterScrollHint,applyFiltersButton:applyIdentityFilters,clearCurrentButton:clearCurrentIdentity,clearAllButton:clearAllIdentities,fillEmptyButton:fillEmptyIdentities,footerActions:identityFooterActions,workspaceFooter,currentIdentityName,identityRoster:identitySinnerRoster,renderRoster:renderIdentitySinnerRoster,renderOptions:renderIdentityOptions,updateCount:updatePostIdentityCount,updateKeywordSummary:updatePartyKeywordSummary,clearValidation:clearStepValidation,queueRosterScroll:queueIdentityScroll,showToast,confirmClearAll:()=>window.confirm('選択中の人格と、それに設定したE.G.Oをすべて解除しますか？')});
identityWorkspaceController.bind();
function updateIdentitySearchButtonState(){identityWorkspaceController.updateSearchButton();}

const railwayTypes=new Set(['安定攻略','速攻攻略','低レア攻略']);
function updateRailwayStageDisplay(){
  const eventMode=['mirror_railway','projection_combat','luxcavation'].includes(postState.category),difficultyLabel=postState.difficulty==='HARD'?'ハード':postState.difficulty==='NORMAL'?'ノーマル':'難易度未選択',label=postState.category==='projection_combat'?`${postState.stage||'ステージ未選択'} / ${difficultyLabel}`:(postState.stage||(postState.category==='luxcavation'?'採光種類未選択':'ステージ未選択'));
  $$('[data-railway-stage]').forEach(button=>{button.hidden=eventMode?button.dataset.stageCategory!==postState.category:false;button.classList.toggle('active',button.dataset.railwayStage===postState.stage);});
  const error=$('[data-railway-stage-error]');if(error)error.hidden=Boolean(postState.stage);
  if(eventMode){$$('[data-difficulty-badge]').forEach(node=>{node.textContent=label;node.classList.toggle('is-unset',!postState.stage||(postState.category==='projection_combat'&&!postState.difficulty));node.dataset.difficulty=postState.category==='projection_combat'?(postState.difficulty||''):'';});const preview=$('[data-type-preview-difficulty]');if(preview){preview.textContent=postState.stage?(postState.category==='projection_combat'?`${postState.stage} / ${difficultyLabel}`:`${postState.stage}攻略`):(postState.category==='luxcavation'?'採光種類を選択してください':'ステージを選択してください');preview.dataset.difficulty=postState.difficulty||'';}}
}
function applyCategoryEditorMode(){
  const eventMode=['mirror_railway','projection_combat','luxcavation'].includes(postState.category);
  const difficulty=$('[data-difficulty-mode]'),stage=$('[data-railway-stage-selector]'),themeLink=$('[data-theme-pack-step-link]'),themeReview=$('[data-review-theme-pack-section]');
  if(difficulty){difficulty.hidden=eventMode&&postState.category!=='projection_combat';const legend=difficulty.querySelector('legend');if(legend)legend.firstChild.textContent=postState.category==='projection_combat'?'射影戦闘の難易度 ': '鏡ダンジョンの難易度 ';}if(stage){stage.hidden=!eventMode;stage.classList.toggle('is-compact',eventMode&&postState.category!=='mirror_railway');}if(themeLink)themeLink.hidden=eventMode;if(themeReview)themeReview.hidden=eventMode;
  $$('[data-post-type]').forEach(button=>{button.hidden=eventMode?!railwayTypes.has(button.dataset.postType):railwayTypes.has(button.dataset.postType);});
  if(eventMode){if(postState.category!=='projection_combat')postState.difficulty=null;postState.themePacks.clear();if(postState.type&&!railwayTypes.has(postState.type))postState.type=null;}else{postState.stage=null;if(railwayTypes.has(postState.type))postState.type=null;}
  const lux=postState.category==='luxcavation';stepInfo[1][1]=lux?'採光種類と攻略タイプを選択':eventMode?'ステージと攻略タイプを選択':'攻略タイプを選択';stepInfo[1][2]=lux?'採光の種類と攻略方針を選んでください。':eventMode?'攻略するステージと攻略方針を選んでください。':'この攻略がどんなプレイヤー向けか選んでください。';
  const projection=postState.category==='projection_combat',projectionTotal=postState.secondaryPartyEnabled?9:6;const step1=$('[data-step-link="1"]'),step6=$('[data-detail-step-link]'),step7=$('[data-review-step-link]');if(step1){step1.querySelector('strong').textContent=lux?'採光種類・攻略タイプ':eventMode?'ステージ・攻略タイプ':'攻略タイプ';step1.querySelector('small').textContent=projection?'ステージ・難易度・攻略方針':lux?'種類と攻略方針を選択':eventMode?'ステージと攻略方針を選択':'投稿の目的を選択';}$$('.projection-secondary-step').forEach(node=>node.hidden=!projection||!postState.secondaryPartyEnabled);$$('[data-step-link="2"] strong').forEach(node=>node.textContent=projection?'前半使用人格':'使用人格');$$('[data-step-link="3"] strong').forEach(node=>node.textContent=projection?'前半編成順':'編成順');$$('[data-step-link="4"] strong').forEach(node=>node.textContent=projection?'前半使用E.G.O':'使用E.G.O');if(step6){step6.dataset.stepLink=projection?(postState.secondaryPartyEnabled?'8':'5'):'6';step6.querySelector('span').textContent=projection?(postState.secondaryPartyEnabled?'08':'05'):eventMode?'05':'06';}if(step7){step7.dataset.stepLink=projection?(postState.secondaryPartyEnabled?'9':'6'):'7';step7.querySelector('span').textContent=projection?(postState.secondaryPartyEnabled?'09':'06'):eventMode?'06':'07';}
  const guide=$('[data-editor-step-guide]');if(guide)guide.textContent=`必須項目を満たしながら、${projection?projectionTotal:eventMode?6:7}つの手順で攻略情報をまとめます。`;
  const stageTitle=$('[data-stage-selector-title]'),stageCopy=$('[data-stage-selector-copy]');if(stageTitle)stageTitle.textContent=lux?'採光種類を選択':postState.category==='projection_combat'?'射影戦闘のステージ':'鏡屈折鉄道のステージ';if(stageCopy)stageCopy.textContent=lux?'攻略する採光の種類を選択してください。':'攻略対象のステージを選択してください。';
  const difficultyOptions=$$('[data-post-difficulty]');if(difficultyOptions.length){const normalCopy=difficultyOptions[0].querySelector('small'),hardCopy=difficultyOptions[1]?.querySelector('small');if(normalCopy)normalCopy.textContent=projection?'射影戦闘の通常難易度':'初心者・育成途中の編成向け';if(hardCopy)hardCopy.textContent=projection?'射影戦闘の高難度モード':'高難度の鏡ダンジョン向け';}
  const manualLabel=$('[data-keyword-mode-label]'),manualStatus=$('[data-keyword-mode-status]'),manualCopy=$('[data-keyword-mode-copy]'),gift=$('[data-required-gift-field]');if(manualLabel)manualLabel.textContent=eventMode?'（手動選択・最大5個まで）':'（自動付与）';if(manualStatus)manualStatus.textContent=eventMode?'攻略内容に合わせて選択':'編成人格から判定';if(manualCopy)manualCopy.textContent=eventMode?'攻略で扱うキーワードを選択してください。':'同じ主要キーワードを持つ人格が5人以上いる場合に自動で付きます。';if(gift)gift.hidden=eventMode;
  if(!postState.type){$$('[data-type-badge]').forEach(node=>{node.textContent='攻略タイプ未選択';node.classList.add('is-unset');});$('[data-type-preview]').textContent='攻略タイプ未選択';$('[data-type-copy]').textContent='攻略タイプを選択してください。';const icon=$('[data-type-preview-icon]');if(icon){icon.classList.remove('has-type-logo');icon.replaceChildren();icon.textContent='◇';}}
  updateRailwayStageDisplay();
}

const postCategoryController=window.LimbusPostCategoryController.create({state:postState,categories:categoryDefinitions,getCategory:categoryById,iconMarkup:categoryIconMarkup,dialog:categoryPicker,editorDialog:postModal,list:$('[data-category-picker-list]'),status:$('[data-category-picker-status]'),startButton:$('[data-start-category-post]'),openDraftButton:$('[data-open-draft-from-category]'),openButtons:$$('[data-open-post]'),closeButton:$('[data-close-category-picker]'),categoryBadges:$$('[data-post-category-badge]'),reviewCategory:$('[data-review-category]'),isAuthenticated:()=>localStorage.getItem('limbus-auth')==='logged-in',openAuth:()=>window.LimbusAuth?.open(),openDialog,closeDialog,openDrafts:()=>draftController.openManager(),resetEditor:()=>resetPostEditorState(),getInitialSinnerId:()=>sinnerIdentityData[0]?.id||null,setStep,onCategoryChanged:applyCategoryEditorMode});
postCategoryController.bind();
const updatePostCategoryDisplays=()=>postCategoryController.updateDisplays();
$$('[data-step-link]').forEach(b=>b.onclick=()=>navigateToStep(+b.dataset.stepLink));
const postBasicsController=window.LimbusPostBasicsController.create({state:postState,titleInput:postTitle,typeButtons:$$('[data-post-type]'),difficultyButtons:$$('[data-post-difficulty]'),typePreview:$('[data-type-preview]'),typeCopy:$('[data-type-copy]'),typePreviewIcon:$('[data-type-preview-icon]'),typePreviewDifficulty:$('[data-type-preview-difficulty]'),difficultyError:$('[data-difficulty-error]'),difficultyBadges:$$('[data-difficulty-badge]'),typeBadges:$$('[data-type-badge]'),workspaceTitlebar:$('[data-workspace-titlebar]'),syncTitle,validateBasics:()=>stepValidation(1),clearValidation:clearStepValidation,isSolo:isSoloPost,onDifficultyChanged:()=>{closeThemePackSelect({scroll:false});if(postState.category==='projection_combat')requestAnimationFrame(updateRailwayStageDisplay);},onTypeChanged:()=>{renderFormationOrder();renderEgoSinners();renderDetailTags();}});
postBasicsController.bind();
$$('[data-railway-stage]').forEach(button=>button.addEventListener('click',()=>{if(postState.category==='luxcavation'&&postState.stage!==button.dataset.railwayStage){['斬撃','貫通','打撃','全属性','憤怒','色欲','怠惰','暴食','憂鬱','傲慢','嫉妬'].forEach(tag=>postState.strategyTags.delete(tag));}postState.stage=button.dataset.railwayStage;clearStepValidation(1);updateRailwayStageDisplay();renderDetailTags();}));
const updateDifficultyDisplay=()=>postBasicsController.updateDifficulty();
function updatePostSummaryCount(){if(postSummaryCount)postSummaryCount.textContent=String(postSummary?.value.length||0);}
if(postSummary){postSummary.addEventListener('input',()=>{updatePostSummaryCount();if(postSummary.value.trim()){clearStepValidation(6);clearDetailValidation();}});updatePostSummaryCount();}
const goBackInWorkspace=()=>{const physical=postState.category==='projection_combat'&&postState.secondaryPartyEnabled&&postState.step>=5&&postState.step<=7?postState.step-3:postState.step;if(physical===4&&postState.activeEgoSinner)return closeEgoSelect();if(physical===5&&postState.activeThemePackFloor)return closeThemePackSelect();setStep(postState.step-1);};$('[data-prev-step]').onclick=goBackInWorkspace;if(mobilePrevStep)mobilePrevStep.onclick=goBackInWorkspace;
const postPayloadController=window.LimbusPostPayloadController.create({state:postState,identityData:sinnerIdentityData,getAlternativeNames:alternativeNamesFor,getOrderedSinners:orderedSelectedSinners,getFormationPosition:formationPosition,getAutomaticKeywords:automaticPostKeywords,getSeason:()=>Number(siteConfig.currentSeason)||7});
const buildPostPayload=()=>postPayloadController.build();
let draftController;
const postPersistenceController=window.LimbusPostPersistenceController.create({buildPayload:buildPostPayload,getEditingId:()=>postModal.dataset.editingPostId||'',setEditingId:id=>{postModal.dataset.editingPostId=id;},validatePublished:validateAllRequiredSteps,onTitleMissing:()=>{window.alert('攻略タイトルを設定していません');setStep(1);},onAuthRequired:()=>window.LimbusAuth?.open(),onPublished:id=>{draftController.removeAfterPublish();setTimeout(()=>{location.href=`post-detail.html?id=${encodeURIComponent(id)}`;},700);},showToast});
const savePostToSupabase=status=>postPersistenceController.save(status);

function serializeDraftState(){
  const draftParty=postState.activePartyPhase==='rear'&&postState.frontParty?postState.frontParty:postState;
  return {version:1,step:postState.step,editingPostId:postModal.dataset.editingPostId||'',payload:buildPostPayload(),
    identityAlternatives:[...draftParty.identityAlternatives.entries()].map(([id,items])=>[id,(items||[]).map(item=>({name:item?.name||'',rarity:item?.rarity||'',keywords:item?.keywords||[]}))]),
    identities:[...draftParty.identities.entries()].map(([id,item])=>[id,{name:item?.name||'',rarity:item?.rarity||'',keywords:item?.keywords||[],isFreeSlot:!!item?.isFreeSlot}]),
    identityOrder:[...draftParty.identityOrder],egos:[...draftParty.egos.entries()].map(([id,map])=>[id,[...map.entries()]]),
    freeSlotEgoEnabled:[...draftParty.freeSlotEgoEnabled],ammoKeywordSelected:!!postState.ammoKeywordSelected};
}
const refreshRestoredEditor=step=>{applyCategoryEditorMode();updatePostCategoryDisplays();updateDifficultyDisplay();updateRailwayStageDisplay();syncTitle();updatePostSummaryCount();renderIdentitySinnerRoster();renderFormationOrder();renderEgoSinners();renderThemeFloorCards();renderDetailTags();setStep(step);};
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
const postEditorResetController=window.LimbusPostEditorResetController.create({state:postState,identityData:sinnerIdentityData,postModal,onClearDraft:()=>draftController.clearActive(),onRefresh:()=>{frontParty=null;formationCodeController.reset();closeEgoSelect({scroll:false});closeThemePackSelect({scroll:false});applyCategoryEditorMode();updatePostCategoryDisplays();updateDifficultyDisplay();updateRailwayStageDisplay();syncTitle();updatePostSummaryCount();renderIdentitySinnerRoster();renderFormationOrder();renderEgoSinners();renderThemeFloorCards();renderDetailTags();setStep(1);}});
const resetPostEditorState=()=>postEditorResetController.reset();
window.LimbusPostCloseController.create({confirmDialog:postCloseConfirm,editorDialog:postModal,closeButtons:$$('[data-close-post]'),cancelButton:$('[data-cancel-close-post]'),discardButton:$('[data-discard-and-close-post]'),saveButton:$('[data-save-and-close-post]'),openDialog,closeDialog,unlockPageScroll,saveDraft:()=>draftController.createDraft(),resetEditor:resetPostEditorState,showToast});

const postAdvanceController=window.LimbusPostAdvanceController.create({state:postState,identityCount:sinnerIdentityData.length,closeEgoSelect,closeThemePackSelect,publish:()=>savePostToSupabase('published'),confirmFillEmpty:missingCount=>window.confirm(`未設定の人格枠が${missingCount}件あります。空いている枠を自由枠に設定して次へ進みますか？`),fillEmpty:()=>identitySelectionController.fillEmpty(),afterFillEmpty:missingCount=>{clearStepValidation(2);renderIdentitySinnerRoster();renderIdentityOptions();updatePostIdentityCount();showToast(`空いている${missingCount}枠を自由枠に設定しました。`);},validateStep:validateRequiredStep,validateDetails:validateProjectionDetails,setStep,confirmSecondary:()=>window.confirm('後半パーティの設定をしますか？'),onSecondaryChanged:()=>applyCategoryEditorMode()});
$('[data-next-step]').onclick=()=>postAdvanceController.advance();

postState.activeSinner=sinnerIdentityData[0]?.id||null;updatePostCategoryDisplays();searchController.renderActiveFilters();renderIdentitySinnerRoster();updatePartyKeywordSummary();setStep(1);

const postEditorLaunchController=window.LimbusPostEditorLaunchController.create({openDraftFromQuery:()=>draftController.openFromQuery(),restorePost:post=>postRestoreController.restorePost(post),openEditor:()=>openDialog(postModal),showToast});
postEditorLaunchController.openFromQuery();
})().catch(error=>{console.error(error);document.body.insertAdjacentHTML('afterbegin','<div class="data-load-error">データの読み込みに失敗しました。Live Serverで開いてください。</div>')});
