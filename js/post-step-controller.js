(()=>{
'use strict';
function createPostStepController({state,stepInfo,identityData,onCloseEgo,onCloseTheme,onRenderIdentities,onOpenIdentity,onRenderFormation,onRenderEgos,onRenderThemes,onRenderDetails,onRenderReview,onEnterIdentity,onIdentityFooterUpdate,onEgoFooterUpdate,onResetScroll}){
  const $=selector=>document.querySelector(selector);const all=selector=>document.querySelectorAll(selector);
  function set(step){
    const previous=state.step;let requested=Math.max(1,Math.min(7,Number(step)||1));const railway=state.category==='mirror_railway';if(railway&&requested===5)requested=previous>=6?4:6;state.step=requested;
    if(state.step===2&&!state.activeSinner)state.activeSinner=identityData[0]?.id||null;
    if(state.step!==4&&state.activeEgoSinner)onCloseEgo({scroll:false});if(state.step!==5)onCloseTheme({scroll:false});
    all('[data-post-step]').forEach(section=>section.classList.toggle('active',+section.dataset.postStep===state.step));all('[data-step-link]').forEach(link=>link.classList.toggle('active',+link.dataset.stepLink===state.step));
    const info=stepInfo[state.step],displayStep=railway&&state.step>5?state.step-1:state.step,total=railway?6:7;$('[data-step-kicker]').textContent=`STEP ${displayStep}`;$('[data-step-title]').textContent=info[1];$('[data-step-description]').textContent=info[2];$('[data-step-counter]').textContent=`${displayStep} / ${total}`;
    const name=$('[data-workspace-step-name]');const counter=$('[data-workspace-step-counter]');if(name)name.textContent=info[1].replace(/を選択$|を入力$|して投稿$/,'');if(counter)counter.textContent=`${displayStep} / ${total}`;
    const previousButton=$('[data-prev-step]');const mobilePrevious=$('[data-mobile-prev-step]');const next=$('[data-next-step]');if(previousButton)previousButton.hidden=state.step===1;if(mobilePrevious)mobilePrevious.hidden=state.step===1;if(next)next.textContent=state.step===7?'この内容で公開する':'次のステップへ →';
    const filterPanel=$('[data-identity-filter-panel]');const filterToggle=$('[data-toggle-identity-search]');if(state.step!==2&&filterPanel){filterPanel.hidden=true;filterToggle?.setAttribute('aria-expanded','false');if(filterToggle)filterToggle.textContent='人格検索';}
    if(state.step===2){onRenderIdentities();if(state.activeSinner)onOpenIdentity(state.activeSinner,{scroll:false});if(previous===1)onEnterIdentity?.();}if(state.step===3)onRenderFormation();if(state.step===4)onRenderEgos();if(state.step===5)onRenderThemes();if(state.step===6)onRenderDetails();if(state.step===7)onRenderReview();
    onIdentityFooterUpdate();onEgoFooterUpdate();if(previous!==state.step)requestAnimationFrame(onResetScroll);
  }
  return {set};
}
window.LimbusPostStepController={create:createPostStepController};
})();
