(()=>{
'use strict';
function createPostStepController({state,stepInfo,identityData,onCloseEgo,onCloseTheme,onRenderIdentities,onOpenIdentity,onRenderFormation,onRenderEgos,onRenderThemes,onRenderDetails,onRenderReview,onEnterIdentity,onIdentityFooterUpdate,onEgoFooterUpdate,onResetScroll,onBeforeStep}){
  const $=selector=>document.querySelector(selector);const all=selector=>document.querySelectorAll(selector);
  function set(step){
    const previous=state.step;const projection=state.category==='projection_combat';const secondary=projection&&state.secondaryPartyEnabled;const railway=['mirror_railway','luxcavation'].includes(state.category);let max=projection?(secondary?9:6):7;let requested=Math.max(1,Math.min(max,Number(step)||1));if(railway&&requested===5)requested=previous>=6?4:6;onBeforeStep?.(requested,previous);state.step=requested;
    const physical=projection?(secondary?(requested<=4?requested:requested<=7?requested-3:requested-2):(requested<=4?requested:requested+1)):requested;
    if(physical===2&&!state.activeSinner)state.activeSinner=identityData[0]?.id||null;
    if(physical!==4&&state.activeEgoSinner)onCloseEgo({scroll:false});if(physical!==5)onCloseTheme({scroll:false});
    all('[data-post-step]').forEach(section=>section.classList.toggle('active',+section.dataset.postStep===physical));all('[data-step-link]').forEach(link=>link.classList.toggle('active',+link.dataset.stepLink===state.step));
    const projectionInfo={2:['','前半使用人格を選択','前半パーティで使用する人格を選択してください。'],3:['','前半編成順を選択','前半パーティの出撃順を選択してください。'],4:['','前半使用E.G.Oを選択','前半パーティで使用するE.G.Oを選択してください。'],5:['','後半使用人格を選択','任意の後半パーティで使用する人格を選択してください。'],6:['','後半編成順を選択','後半パーティの出撃順を選択してください。'],7:['','後半使用E.G.Oを選択','後半パーティで使用するE.G.Oを選択してください。'],8:['','詳細情報を入力','攻略タグや説明、所属・特殊タグを入力してください。'],9:['','確認して投稿','入力内容を確認して投稿へ進みます。']};const info=projection?(projectionInfo[secondary?requested:(requested===5?8:requested===6?9:requested)]||stepInfo[requested]):stepInfo[physical],displayStep=railway&&requested>5?requested-1:requested,total=projection?(secondary?9:6):(railway?6:7);$('[data-step-kicker]').textContent=`STEP ${displayStep}`;$('[data-step-title]').textContent=info[1];$('[data-step-description]').textContent=info[2];$('[data-step-counter]').textContent=`${displayStep} / ${total}`;
    const name=$('[data-workspace-step-name]');const counter=$('[data-workspace-step-counter]');if(name)name.textContent=info[1].replace(/を選択$|を入力$|して投稿$/,'');if(counter)counter.textContent=`${displayStep} / ${total}`;
    const previousButton=$('[data-prev-step]');const mobilePrevious=$('[data-mobile-prev-step]');const next=$('[data-next-step]');if(previousButton)previousButton.hidden=state.step===1;if(mobilePrevious)mobilePrevious.hidden=state.step===1;if(next)next.textContent=(projection?state.step===(secondary?9:6):state.step===7)?'この内容で公開する':'次のステップへ →';
    const filterPanel=$('[data-identity-filter-panel]');const filterToggle=$('[data-toggle-identity-search]');if(physical!==2&&filterPanel){filterPanel.hidden=true;filterToggle?.setAttribute('aria-expanded','false');if(filterToggle)filterToggle.textContent='人格検索';}
    if(physical===2){onRenderIdentities();if(state.activeSinner)onOpenIdentity(state.activeSinner,{scroll:false});if(previous===1)onEnterIdentity?.();}if(physical===3)onRenderFormation();if(physical===4)onRenderEgos();if(physical===5)onRenderThemes();if(physical===6)onRenderDetails();if(physical===7)onRenderReview();
    onIdentityFooterUpdate();onEgoFooterUpdate();if(previous!==state.step)requestAnimationFrame(onResetScroll);
  }
  return {set};
}
window.LimbusPostStepController={create:createPostStepController};
})();
