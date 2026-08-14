(()=>{
'use strict';
const FREE_IDENTITY=()=>({name:'自由枠（誰でも可）',rarity:'FREE',keywords:[],isFreeSlot:true});
function createIdentitySelectionController({state,identityData}){
  function alternativesFor(id){if(!state.identityAlternatives.has(id))state.identityAlternatives.set(id,[]);return state.identityAlternatives.get(id);}
  function alternativeNamesFor(id){return alternativesFor(id).map(item=>item.name).filter(Boolean);}
  function selectFree(id){state.identities.set(id,FREE_IDENTITY());state.identityAlternatives.delete(id);state.identityOrder=state.identityOrder.filter(item=>item!==id);state.egos.delete(id);state.freeSlotEgoEnabled.delete(id);return state.identities.get(id);}
  function selectPrimary(id,identity){state.identities.set(id,identity);state.identityAlternatives.set(id,alternativesFor(id).filter(item=>item.name!==identity.name));state.identityOrder=state.identityOrder.filter(item=>item!==id);state.freeSlotEgoEnabled.delete(id);return identity;}
  function toggleAlternative(id,identity){const primary=state.identities.get(id);if(primary?.name===identity.name)return {changed:false,reason:'primary'};const current=alternativesFor(id);const exists=current.some(item=>item.name===identity.name);state.identityAlternatives.set(id,exists?current.filter(item=>item.name!==identity.name):[...current,identity]);return {changed:true,removed:exists};}
  function clearOne(id){if(!id||!state.identities.has(id))return false;state.identities.delete(id);state.identityAlternatives.delete(id);state.identityOrder=state.identityOrder.filter(item=>item!==id);state.egos.delete(id);state.freeSlotEgoEnabled.delete(id);return true;}
  function clearAll(){if(!state.identities.size)return false;state.identities.clear();state.identityAlternatives.clear();state.identityOrder=[];state.egos.clear();state.freeSlotEgoEnabled.clear();return true;}
  function fillEmpty(){const empty=identityData.filter(sinner=>!state.identities.has(sinner.id));empty.forEach(sinner=>state.identities.set(sinner.id,FREE_IDENTITY()));return empty.length;}
  return {alternativesFor,alternativeNamesFor,selectFree,selectPrimary,toggleAlternative,clearOne,clearAll,fillEmpty};
}
window.LimbusIdentitySelectionController={create:createIdentitySelectionController};
})();
