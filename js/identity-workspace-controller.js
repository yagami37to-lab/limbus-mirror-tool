(()=>{
'use strict';
function createIdentityWorkspaceController({state,filterController,selectionController,filterPanel,filterToggle,filterScrollHint,applyFiltersButton,clearCurrentButton,clearAllButton,fillEmptyButton,footerActions,workspaceFooter,currentIdentityName,identityRoster,renderRoster,renderOptions,updateCount,updateKeywordSummary,clearValidation,queueRosterScroll,showToast,confirmClearAll}){
  let savedScrollTop=0;
  function updateSearchButton(){filterToggle?.classList.toggle('has-active-filters',filterController.hasActiveFilters());}
  function updateScrollCue(){if(!filterPanel||filterPanel.hidden)return;const hasMore=filterPanel.scrollHeight-filterPanel.clientHeight-filterPanel.scrollTop>10;filterPanel.classList.toggle('has-more-below',hasMore);if(filterScrollHint)filterScrollHint.hidden=!hasMore;}
  function closeFilter(){if(!filterPanel)return;savedScrollTop=filterPanel.scrollTop;filterPanel.classList.add('is-closing');filterToggle?.setAttribute('aria-expanded','false');if(filterToggle)filterToggle.textContent='人格検索';setTimeout(()=>{filterPanel.hidden=true;filterPanel.classList.remove('is-closing');},180);}
  function toggleFilter(){if(!filterPanel)return;const opening=filterPanel.hidden;if(!opening){closeFilter();return;}filterPanel.hidden=false;filterPanel.classList.remove('is-closing');filterPanel.scrollTop=savedScrollTop;filterToggle?.setAttribute('aria-expanded','true');if(filterToggle)filterToggle.textContent='検索中';requestAnimationFrame(updateScrollCue);setTimeout(()=>filterController.focusName(),100);}
  function applyFilters(){filterController.renderSummary();closeFilter();showToast('人格の絞り込み条件を適用しました。');}
  function clearCurrent(){const id=state.activeSinner;if(!selectionController.clearOne(id))return false;renderRoster();renderOptions();updateCount();showToast('この囚人の人格選択を解除しました。');queueRosterScroll(identityRoster,18);return true;}
  function clearAll(){if(!state.identities.size||!confirmClearAll())return false;selectionController.clearAll();if(currentIdentityName)currentIdentityName.textContent='未選択';renderRoster();renderOptions();updateCount();showToast('すべての人格選択を解除しました。');return true;}
  function fillEmpty(){const count=selectionController.fillEmpty();if(!count){showToast('すべての人格枠が設定済みです。');return 0;}clearValidation(2);renderRoster();renderOptions();updateCount();updateKeywordSummary();showToast(`空いている${count}枠を自由枠に設定しました。`);return count;}
  function updateFooter(){if(!footerActions)return;const onStep=state.step===2;footerActions.hidden=!onStep;workspaceFooter?.classList.toggle('identity-mode',onStep);if(onStep)workspaceFooter?.classList.remove('ego-mode');const chosen=state.activeSinner&&state.identities.has(state.activeSinner);if(clearCurrentButton){clearCurrentButton.disabled=!chosen;clearCurrentButton.textContent=chosen?'選択解除':'未選択';}if(clearAllButton)clearAllButton.disabled=state.identities.size===0;}
  function bind(){filterToggle?.addEventListener('click',toggleFilter);filterPanel?.addEventListener('scroll',()=>{savedScrollTop=filterPanel.scrollTop;updateScrollCue();},{passive:true});applyFiltersButton?.addEventListener('click',applyFilters);clearCurrentButton?.addEventListener('click',clearCurrent);clearAllButton?.addEventListener('click',clearAll);fillEmptyButton?.addEventListener('click',fillEmpty);updateSearchButton();}
  return {bind,updateSearchButton,updateScrollCue,closeFilter,toggleFilter,applyFilters,clearCurrent,clearAll,fillEmpty,updateFooter};
}
window.LimbusIdentityWorkspaceController={create:createIdentityWorkspaceController};
})();
