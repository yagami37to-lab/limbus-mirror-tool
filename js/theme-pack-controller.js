(()=>{
'use strict';

function createThemePackController({data,state,escapeHtml,showToast,scrollToElement,queueScroll}){
  const $=selector=>document.querySelector(selector);
  const floorGrid=$('[data-theme-floor-grid]');
  const selectView=$('[data-theme-pack-select-view]');
  const optionGrid=$('[data-theme-pack-option-grid]');
  const floorLabel=$('[data-theme-pack-floor-label]');
  const search=$('[data-theme-pack-search]');
  const count=$('[data-theme-pack-count]');

  function currentMode(){return data?.modes?.[state.difficulty]||null;}
  function optionsForFloor(floor){return currentMode()?.floors?.[String(floor)]||[];}
  function usedByAnotherFloor(name,currentFloor){
    if(name==='自由枠')return false;
    return [...state.themePacks.entries()].some(([floor,selectedName])=>floor!==currentFloor&&selectedName===name);
  }
  function close({scroll=true}={}){
    state.activeThemePackFloor=null;
    if(selectView)selectView.hidden=true;
    if(floorGrid)floorGrid.hidden=false;
    if(search)search.value='';
    if(scroll&&floorGrid)queueScroll(floorGrid,18);
  }
  function renderFloors(){
    if(!floorGrid)return;
    const mode=currentMode();
    floorGrid.hidden=false;
    if(selectView)selectView.hidden=true;
    floorGrid.innerHTML='';
    if(!mode){
      floorGrid.innerHTML='<p class="theme-pack-empty">先に「攻略タイプ」で難易度を選択してください。</p>';
      if(count)count.textContent='0';
      return;
    }
    for(let floor=1;floor<=mode.maxFloor;floor++){
      const selectedName=state.themePacks.get(floor);
      const imageSrc=selectedName?(window.LimbusThemePackImages?.forName(selectedName,state.difficulty)||''):'';
      const card=document.createElement('button');
      card.type='button';
      card.className='theme-floor-card'+(selectedName?' selected':'')+(imageSrc?' has-pack-image':'');
      card.innerHTML=`${imageSrc?`<span class="theme-floor-pack-image"><img src="${escapeHtml(imageSrc)}" alt="" loading="lazy"></span>`:''}<span class="theme-floor-number">${floor}F</span><span class="theme-floor-status">${selectedName?'選択済み':'未選択'}</span><strong>${escapeHtml(selectedName||'テーマパックを選択')}</strong><small>${selectedName?'クリックして変更':'この階層の候補を表示'}</small>`;
      card.addEventListener('click',()=>open(floor));
      floorGrid.appendChild(card);
    }
    if(count)count.textContent=state.themePacks.size;
  }
  function open(floor){
    state.activeThemePackFloor=floor;
    if(floorLabel)floorLabel.textContent=`${floor}F`;
    if(floorGrid)floorGrid.hidden=true;
    if(selectView)selectView.hidden=false;
    if(search)search.value='';
    renderOptions();
    requestAnimationFrame(()=>scrollToElement(selectView,18,'auto'));
  }
  function renderOptions(){
    if(!optionGrid)return;
    const floor=state.activeThemePackFloor;
    const query=(search?.value||'').trim().toLowerCase();
    const baseOptions=optionsForFloor(floor);
    const options=['自由枠',...baseOptions].filter(name=>name.toLowerCase().includes(query));
    optionGrid.innerHTML='';
    const current=state.themePacks.get(floor);
    const clear=document.createElement('button');
    clear.type='button';clear.className='theme-pack-option-card clear-option has-pack-image';clear.disabled=!current;
    clear.innerHTML='<span class="theme-pack-image-frame theme-pack-image-placeholder" aria-hidden="true"><b>未選択</b></span><strong>この階層を未選択に戻す</strong><small>選択中のパックを解除します</small>';
    clear.addEventListener('click',()=>{state.themePacks.delete(floor);showToast(`${floor}Fのテーマパックを解除しました。`);close({scroll:false});renderFloors();});
    optionGrid.appendChild(clear);
    options.forEach(name=>{
      const usedElsewhere=usedByAnotherFloor(name,floor);
      const selected=current===name;
      const button=document.createElement('button');button.type='button';
      const imageSrc=window.LimbusThemePackImages?.forName(name,state.difficulty)||'';
      button.className='theme-pack-option-card has-pack-image'+(selected?' selected':'')+(usedElsewhere?' disabled':'');
      button.disabled=usedElsewhere;
      const usedFloor=[...state.themePacks.entries()].find(([otherFloor,selectedName])=>otherFloor!==floor&&selectedName===name)?.[0];
      button.innerHTML=`${imageSrc?`<span class="theme-pack-image-frame"><img src="${escapeHtml(imageSrc)}" alt="" loading="lazy"></span>`:`<span class="theme-pack-image-frame theme-pack-image-placeholder" aria-hidden="true"><b>${name==='自由枠'?'FREE':'NO IMAGE'}</b></span>`}<strong>${escapeHtml(name)}</strong><small>${usedElsewhere?`${usedFloor}Fで選択済み`:selected?'現在選択中':'このパックを選択'}</small>`;
      button.addEventListener('click',()=>{state.themePacks.set(floor,name);showToast(`${floor}Fに「${name}」を設定しました。`);close({scroll:false});renderFloors();});
      optionGrid.appendChild(button);
    });
    if(!options.length){const empty=document.createElement('p');empty.className='theme-pack-empty';empty.textContent='検索条件に一致するテーマパックがありません。';optionGrid.appendChild(empty);}
  }

  $('[data-close-theme-pack-select]')?.addEventListener('click',()=>close());
  search?.addEventListener('input',renderOptions);
  return {close,renderFloors};
}

window.LimbusThemePackController={create:createThemePackController};
})();
