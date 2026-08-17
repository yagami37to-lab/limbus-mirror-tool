(()=>{
'use strict';
function createPostPayloadController({state,identityData,getAlternativeNames,getOrderedSinners,getFormationPosition,getAutomaticKeywords,getSeason=()=>7}){
  const value=selector=>document.querySelector(selector)?.value.trim()||'';
  function build(){
    const selectedIdentities=identityData.filter(sinner=>state.identities.has(sinner.id)).map(sinner=>{const identity=state.identities.get(sinner.id);return {sinner:sinner.name,identity:identity?.name||'',sinner_id:sinner.id,is_free:!!identity?.isFreeSlot,alternatives:getAlternativeNames(sinner.id)};});
    const ordered=getOrderedSinners();
    const party=ordered.map(sinner=>{const identity=state.identities.get(sinner.id);return {order:getFormationPosition(sinner.id),sinner:sinner.name,identity:identity?.name||'',sinner_id:sinner.id,is_free:!!identity?.isFreeSlot};});
    const egos=ordered.map(sinner=>{const picks=state.egos.get(sinner.id)||new Map();return {sinner:sinner.name,items:[...picks.entries()].map(([rank,name])=>`${rank}: ${name}`)};}).filter(group=>group.items.length);
    return {title:value('[data-post-title]'),summary:value('[data-post-summary]'),category:state.category||'mirror_dungeon',difficulty:state.difficulty||null,strategy_type:state.type||null,content:{season:Number(getSeason())||7,selectedIdentities,party,egos,themePacks:[...state.themePacks.entries()].map(([floor,name])=>({floor,name})),keywords:getAutomaticKeywords(),tags:[...state.strategyTags],affiliations:[...state.affiliationTags],description:value('[data-post-points]')}};
  }
  return {build};
}
window.LimbusPostPayloadController={create:createPostPayloadController};
})();
