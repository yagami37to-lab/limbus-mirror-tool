(()=>{
'use strict';
function createPostEditorResetController({state,identityData,postModal,onClearDraft,onRefresh}){
  function reset(){
    if(postModal)postModal.dataset.editingPostId='';onClearDraft();
    state.step=1;state.category='mirror_dungeon';state.type=null;state.difficulty=null;state.stage=null;state.identities=new Map();state.identityAlternatives=new Map();state.identityOrder=[];state.egos=new Map();state.freeSlotEgoEnabled=new Set();state.themePacks=new Map();state.activeThemePackFloor=null;state.strategyTags=new Set();state.affiliationTags=new Set();state.manualKeywords=new Set();state.ammoKeywordSelected=false;state.activeSinner=identityData[0]?.id||null;state.activeEgoSinner=null;state.alternativeSelectionMode=false;
    const title=document.querySelector('[data-post-title]');const summary=document.querySelector('[data-post-summary]');const points=document.querySelector('[data-post-points]');if(title)title.value='';if(summary)summary.value='';if(points)points.value='';
    document.querySelectorAll('[data-post-type],[data-post-difficulty],[data-railway-stage]').forEach(node=>node.classList.remove('active'));document.querySelectorAll('.validation-error').forEach(node=>node.classList.remove('validation-error'));
    onRefresh();
  }
  return {reset};
}
window.LimbusPostEditorResetController={create:createPostEditorResetController};
})();
