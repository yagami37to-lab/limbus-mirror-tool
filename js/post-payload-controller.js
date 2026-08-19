(()=>{
'use strict';
function createPostPayloadController({state,identityData,getAlternativeNames,getOrderedSinners,getFormationPosition,getAutomaticKeywords,getSeason=()=>7}){
  const value=selector=>document.querySelector(selector)?.value.trim()||'';
  function build(){
    const primary=state.activePartyPhase==='rear'&&state.frontParty?state.frontParty:state;
    const selectedIdentities=identityData.filter(sinner=>primary.identities.has(sinner.id)).map(sinner=>{const identity=primary.identities.get(sinner.id);return {sinner:sinner.name,identity:identity?.name||'',sinner_id:sinner.id,is_free:!!identity?.isFreeSlot,alternatives:primary===state?getAlternativeNames(sinner.id):[]};});
    const ordered=primary===state?getOrderedSinners():(primary.identityOrder||[]).map(id=>identityData.find(sinner=>sinner.id===id)).filter(Boolean);
    const party=ordered.map((sinner,index)=>{const identity=primary.identities.get(sinner.id);return {order:primary===state?getFormationPosition(sinner.id):index+1,sinner:sinner.name,identity:identity?.name||'',sinner_id:sinner.id,is_free:!!identity?.isFreeSlot};});
    const egos=ordered.map(sinner=>{const picks=primary.egos.get(sinner.id)||new Map();return {sinner:sinner.name,items:[...picks.entries()].map(([rank,name])=>`${rank}: ${name}`)};}).filter(group=>group.items.length);
    const secondary=state.secondaryPartyEnabled&&state.rearParty?state.rearParty:null;
    const secondarySelectedIdentities=secondary?identityData.filter(sinner=>secondary.identities.has(sinner.id)).map(sinner=>{const identity=secondary.identities.get(sinner.id);return {sinner:sinner.name,identity:identity?.name||'',sinner_id:sinner.id,is_free:!!identity?.isFreeSlot,alternatives:[]};}):[];
    const secondaryParty=secondary?(secondary.identityOrder||[]).map((id,index)=>{const sinner=identityData.find(item=>item.id===id),identity=secondary.identities.get(id);return sinner?{order:index+1,sinner:sinner.name,identity:identity?.name||'',sinner_id:id,is_free:!!identity?.isFreeSlot}:null;}).filter(Boolean):[];
    const secondaryEgos=secondary?secondaryParty.map(item=>{const picks=secondary.egos.get(item.sinner_id)||new Map();return {sinner:item.sinner,items:[...picks.entries()].map(([rank,name])=>`${rank}: ${name}`)};}).filter(group=>group.items.length):[];
    return {title:value('[data-post-title]'),summary:value('[data-post-summary]'),category:state.category||'mirror_dungeon',difficulty:state.category==='projection_combat'?(state.difficulty||null):(['mirror_railway','luxcavation'].includes(state.category)?null:(state.difficulty||null)),strategy_type:state.type||null,content:{season:Number(getSeason())||7,stage:['mirror_railway','projection_combat','luxcavation'].includes(state.category)?(state.stage||null):null,selectedIdentities,party,egos,secondaryPartyEnabled:!!secondary,secondarySelectedIdentities,secondaryParty,secondaryEgos,themePacks:['mirror_railway','projection_combat','luxcavation','story'].includes(state.category)?[]:[...state.themePacks.entries()].map(([floor,name])=>({floor,name})),keywords:getAutomaticKeywords(),tags:[...state.strategyTags],affiliations:[...state.affiliationTags],description:value('[data-post-points]')}};
  }
  return {build};
}
window.LimbusPostPayloadController={create:createPostPayloadController};
})();
