(()=>{
'use strict';
function createPostEditorResetController({state,identityData,postModal,onClearDraft,onRefresh}){
 function reset(){
  if(postModal)postModal.dataset.editingPostId='';onClearDraft();Object.assign(state,{step:1,category:'mirror_dungeon',type:null,difficulty:null,stage:null,achievementTurns:null,identities:new Map(),identityAlternatives:new Map(),identityOrder:[],egos:new Map(),freeSlotEgoEnabled:new Set(),themePacks:new Map(),activeThemePackFloor:null,strategyTags:new Set(),affiliationTags:new Set(),manualKeywords:new Set(),ammoKeywordSelected:false,activeSinner:identityData[0]?.id||null,activeEgoSinner:null,alternativeSelectionMode:false,secondaryPartyEnabled:false,rearParty:null,frontParty:null,activePartyPhase:'front',railwayPartyCount:1,railwayParties:[],activeRailwayPartyIndex:0,railwayPartyPrompted:false});
  ['[data-post-title]','[data-post-summary]','[data-post-points]','[data-achievement-turns]'].forEach(selector=>{const input=document.querySelector(selector);if(input)input.value='';});document.querySelectorAll('[data-post-type],[data-post-difficulty],[data-railway-stage]').forEach(node=>node.classList.remove('active'));document.querySelectorAll('.validation-error').forEach(node=>node.classList.remove('validation-error'));onRefresh();
 }
 return {reset};
}
window.LimbusPostEditorResetController={create:createPostEditorResetController};
})();
