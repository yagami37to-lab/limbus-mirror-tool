(()=>{
'use strict';
function createFormationController({state,identityData,getImage,showToast,clearValidation}){
  const grid=document.querySelector('[data-formation-choice-grid]');const strip=document.querySelector('[data-formation-selected-strip]');const count=document.querySelector('[data-formation-count]');const total=document.querySelector('[data-formation-total]');const empty=document.querySelector('[data-formation-empty-note]');const reset=document.querySelector('[data-reset-formation]');
  const isSolo=()=>state.type==='ソロ';
  function position(id){const index=state.identityOrder.indexOf(id);return index===-1?null:index+1;}
  function ordered(){return state.identityOrder.map(id=>identityData.find(sinner=>sinner.id===id)).filter(Boolean).filter(sinner=>state.identities.has(sinner.id));}
  function ensure(id){if(isSolo()){state.identityOrder=[id];for(const egoId of [...state.egos.keys()])if(egoId!==id)state.egos.delete(egoId);state.freeSlotEgoEnabled=new Set([...state.freeSlotEgoEnabled].filter(item=>item===id));return;}if(!state.identityOrder.includes(id))state.identityOrder.push(id);}
  function remove(id){state.identityOrder=state.identityOrder.filter(item=>item!==id);}
  function render(){
    const selected=identityData.filter(sinner=>state.identities.has(sinner.id));state.identityOrder=state.identityOrder.filter(id=>state.identities.has(id));if(isSolo()&&state.identityOrder.length>1)state.identityOrder=state.identityOrder.slice(0,1);const solo=isSolo();
    const heading=document.querySelector('[data-post-step="3"] .step-card-heading p');if(heading)heading.textContent=solo?'ソロ攻略で使用する人格を1人選択してください。選択した人格だけが出撃し、次の使用E.G.O選択にも引き継がれます。':'使用人格を、実際に出撃させる順番で選択してください。';
    if(state.step===3){const description=document.querySelector('[data-step-description]');if(description)description.textContent=solo?'ソロ攻略で出撃する人格を1人だけ選択してください。':'使用人格を、実際に出撃させる順番で選択してください。';}
    if(grid)grid.innerHTML='';if(strip){const items=ordered();strip.innerHTML=items.length?items.map(sinner=>`<span class="formation-selected-chip order-${position(sinner.id)>7?'blue':'yellow'}"><b>${position(sinner.id)}</b><span>${sinner.name}</span></span>`).join(''):`<span class="formation-empty">${solo?'ソロ攻略で使用する人格を選択してください。':'まだ順番を選択していません。'}</span>`;}
    selected.forEach(sinner=>{const identity=state.identities.get(sinner.id);const order=position(sinner.id);const button=document.createElement('button');button.type='button';button.className='formation-choice-card'+(order?' selected':'')+(order?` order-${order>7?'blue':'yellow'}`:'');const image=getImage(sinner.id,identity);if(image){button.classList.add('has-identity-image');button.style.backgroundImage=`linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.86)),url("${image}")`;}button.innerHTML=`${order?`<span class="formation-order-badge">${order}</span><span class="formation-card-label">編成 ${order}</span>`:'<span class="formation-choice-plus">＋</span><span class="formation-card-label">未選択</span>'}<strong>${sinner.name}</strong><small>${identity.name}</small>`;button.addEventListener('click',()=>{if(order){remove(sinner.id);showToast(`${sinner.name}を編成順から解除しました。`);}else{ensure(sinner.id);clearValidation();showToast(`${sinner.name}を${state.identityOrder.length}番に設定しました。`);}render();});grid?.appendChild(button);});
    if(count)count.textContent=state.identityOrder.length;if(total)total.textContent=solo?1:selected.length;if(empty)empty.hidden=selected.length!==0;if(reset){reset.hidden=selected.length===0;reset.disabled=state.identityOrder.length===0;reset.textContent=solo?'選択を解除':'編成順をすべて解除';}
  }
  reset?.addEventListener('click',()=>{const solo=isSolo();state.identityOrder=[];render();showToast(solo?'ソロ攻略の人格選択を解除しました。':'編成順をすべて解除しました。');});
  return {position,ordered,ensure,remove,render};
}
window.LimbusFormationController={create:createFormationController};
})();
