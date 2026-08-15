(()=>{
'use strict';

function createEgoController({state,identityData,egoData,orderedSinners,formationPosition,summaryMarkup,cardTones,toneForKeywords,getIdentityImage,getEgoImage,workspaceFooter,showToast,scrollToElement,queueScroll}){
  const $=selector=>document.querySelector(selector);
  const sinnerGrid=$('[data-post-ego-sinner-grid]');
  const egoGrid=$('[data-post-ego-grid]');
  const sinnerView=$('[data-ego-sinner-view]');
  const selectView=$('[data-ego-select-view]');
  const currentSinnerName=$('[data-current-ego-sinner-name]');
  const currentSummary=$('[data-current-ego-summary]');
  const confirmButton=$('[data-confirm-ego-selection]');
  const footerActions=$('[data-ego-footer-actions]');
  const clearCurrent=$('[data-clear-current-egos]');
  const clearAll=$('[data-clear-all-egos]');
  const count=$('[data-post-ego-count]');
  const identityImageUrl=image=>{if(!image)return '';try{return new URL(image,document.baseURI).href;}catch{return image;}};

  function picksFor(id){if(!state.egos.has(id))state.egos.set(id,new Map());return state.egos.get(id);}
  function updateCount(){let total=0;state.egos.forEach(map=>total+=map.size);if(count)count.textContent=total;}
  function renderSinners(){
    if(!sinnerGrid)return;
    sinnerGrid.innerHTML='';
    const selectedSinners=orderedSinners();
    const emptyNote=$('[data-ego-empty-note]');if(emptyNote)emptyNote.hidden=selectedSinners.length!==0;
    selectedSinners.forEach((sinner,index)=>{
      const order=formationPosition(sinner.id);
      const identity=state.identities.get(sinner.id);
      const isFree=identity?.isFreeSlot;
      const freeEgoEnabled=state.freeSlotEgoEnabled.has(sinner.id);
      const picks=picksFor(sinner.id);
      if(isFree){
        const card=document.createElement('article');
        card.className='ego-sinner-card ego-free-sinner-card'+(freeEgoEnabled?' enabled':' locked')+(picks.size?' selected':'');
        const cardImage=identityImageUrl(getIdentityImage?.(sinner.id,identity));if(cardImage){card.classList.add('has-identity-image');card.style.setProperty('--identity-image',`url("${cardImage}")`);}
        card.style.setProperty('--card-a',cardTones[index%cardTones.length][0]);card.style.setProperty('--card-b',cardTones[index%cardTones.length][1]);
        card.innerHTML=`<span class="sinner-number">No.${sinner.id}</span><span class="formation-order-badge ego-order-badge">${order}</span><strong>${sinner.name}</strong><small>自由枠（人格指定なし）</small><div class="ego-card-summary ego-summary-tags">${freeEgoEnabled?summaryMarkup(picks,{emptyLabel:'E.G.Oを選択可能'}):'<span class="ego-summary-empty">初期設定ではE.G.O指定なし</span>'}</div><div class="ego-free-actions"></div>`;
        const actions=card.querySelector('.ego-free-actions');
        const toggle=document.createElement('button');toggle.type='button';toggle.className='ego-free-toggle';toggle.textContent=freeEgoEnabled?'E.G.O指定を解除':'自由枠のE.G.Oを選択';
        toggle.addEventListener('click',event=>{event.stopPropagation();if(freeEgoEnabled){state.freeSlotEgoEnabled.delete(sinner.id);state.egos.delete(sinner.id);showToast(`${sinner.name}自由枠のE.G.O指定を解除しました。`);}else{state.freeSlotEgoEnabled.add(sinner.id);showToast(`${sinner.name}自由枠のE.G.Oを選択できます。`);}renderSinners();});
        actions.appendChild(toggle);
        if(freeEgoEnabled){const select=document.createElement('button');select.type='button';select.className='ego-free-select';select.textContent='E.G.O一覧を開く →';select.addEventListener('click',()=>open(sinner.id));actions.appendChild(select);}
        sinnerGrid.appendChild(card);return;
      }
      const button=document.createElement('button');button.type='button';button.className='ego-sinner-card'+(picks.size?' selected':'');
      const buttonImage=identityImageUrl(getIdentityImage?.(sinner.id,identity));if(buttonImage){button.classList.add('has-identity-image');button.style.setProperty('--identity-image',`url("${buttonImage}")`);}
      button.style.setProperty('--card-a',cardTones[index%cardTones.length][0]);button.style.setProperty('--card-b',cardTones[index%cardTones.length][1]);
      button.innerHTML=`<span class="sinner-number">No.${sinner.id}</span><span class="formation-order-badge ego-order-badge">${order}</span><strong>${sinner.name}</strong><small>${identity.name}</small><div class="ego-card-summary ego-summary-tags">${summaryMarkup(picks)}</div>`;
      button.addEventListener('click',()=>open(sinner.id));sinnerGrid.appendChild(button);
    });
    updateCount();
  }
  function open(id){
    state.activeEgoSinner=id;const sinner=identityData.find(item=>item.id===id);if(!sinner)return;
    if(currentSinnerName)currentSinnerName.textContent=sinner.name;if(sinnerView)sinnerView.hidden=true;if(selectView)selectView.hidden=false;
    renderOptions();updateControls();requestAnimationFrame(()=>scrollToElement(selectView,18,'auto'));
  }
  function close({scroll=true}={}){
    state.activeEgoSinner=null;if(selectView)selectView.hidden=true;if(sinnerView)sinnerView.hidden=false;
    renderSinners();updateControls();if(scroll&&sinnerView)queueScroll(sinnerView,18);
  }
  function renderOptions(){
    const id=state.activeEgoSinner;const sinner=identityData.find(item=>item.id===id);if(!sinner||!egoGrid)return;
    const picks=picksFor(id);egoGrid.innerHTML='';const rankOrder={ALEPH:5,WAW:4,HE:3,TETH:2,ZAYIN:1};
    [...(egoData[id]||[])].sort((a,b)=>(rankOrder[b[1]]||0)-(rankOrder[a[1]]||0)||a[0].localeCompare(b[0],'ja',{numeric:true,sensitivity:'base'})).forEach(([name,rank],index)=>{
      const button=document.createElement('button');button.type='button';const identity=state.identities.get(id);const tone=toneForKeywords(identity?.keywords,index);
      button.style.setProperty('--ego-card-a',tone[0]);button.style.setProperty('--ego-card-b',tone[1]);const image=getEgoImage?.(id,name)||'';button.className=`ego-option-card rank-${rank.toLowerCase()}`+(image?' has-ego-image':'')+(picks.get(rank)===name?' selected':'');
      if(image)button.style.backgroundImage=`linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.88)),url("${image}")`;
      button.innerHTML=`<span class="ego-orb">E.G.O</span><span class="ego-rank">${rank}</span><strong>${name}</strong><small>${sinner.name}</small>`;
      button.addEventListener('click',()=>{if(picks.get(rank)===name)picks.delete(rank);else picks.set(rank,name);renderOptions();updateCount();updateControls();});egoGrid.appendChild(button);
    });
    if(currentSummary)currentSummary.innerHTML=summaryMarkup(picks,{emptyLabel:'未選択'});
  }
  function updateControls(){
    const onStep=state.step===4;const inDetail=onStep&&Boolean(state.activeEgoSinner);
    if(confirmButton)confirmButton.hidden=!inDetail;if(footerActions)footerActions.hidden=!onStep;
    workspaceFooter?.classList.toggle('ego-mode',onStep);workspaceFooter?.classList.toggle('ego-detail-mode',inDetail);
    if(clearCurrent){const picks=inDetail?picksFor(state.activeEgoSinner):null;clearCurrent.hidden=!inDetail;clearCurrent.disabled=!picks?.size;clearCurrent.textContent=picks?.size?'選択解除':'未選択';}
    if(clearAll){let total=0;state.egos.forEach(map=>total+=map.size);clearAll.disabled=total===0;clearAll.textContent='現在選択中のE.G.Oを全選択解除';}
  }
  function clearCurrentSelection(){const id=state.activeEgoSinner;if(!id)return;const picks=picksFor(id);if(!picks.size)return;picks.clear();renderOptions();updateCount();updateControls();showToast('この囚人のE.G.O選択を解除しました。');}
  function clearAllSelections(){let total=0;state.egos.forEach(map=>total+=map.size);if(!total||!window.confirm('選択中のE.G.Oをすべて解除しますか？'))return;state.egos.clear();if(state.activeEgoSinner)renderOptions();updateCount();updateControls();showToast('すべてのE.G.O選択を解除しました。');}

  $('[data-back-to-ego-sinners]')?.addEventListener('click',()=>close());
  confirmButton?.addEventListener('click',()=>{close({scroll:true});showToast('E.G.O選択を決定しました。');});
  clearCurrent?.addEventListener('click',clearCurrentSelection);
  clearAll?.addEventListener('click',clearAllSelections);
  return {renderSinners,close,updateControls};
}

window.LimbusEgoController={create:createEgoController};
})();
