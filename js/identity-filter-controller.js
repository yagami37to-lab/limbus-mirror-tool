(()=>{
'use strict';

function createIdentityFilterController({keywordDefinitions,onChange}){
  const $=selector=>document.querySelector(selector);
  const keywordRoot=$('[data-identity-keyword-filters]');
  const nameInput=$('[data-identity-name-filter]');
  const raritySelect=$('[data-identity-rarity-filter]');
  const multiOnly=$('[data-identity-multi-only]');
  const includeConditional=$('[data-identity-include-conditional]');
  const modeSelect=$('[data-identity-filter-mode]');
  const summaryRoot=$('[data-identity-filter-summary-chips]');
  const resetButton=$('[data-reset-identity-filters]');
  const activeKeywords=new Set();

  if(includeConditional)includeConditional.checked=true;

  function renderKeywords(){
    if(!keywordRoot)return;
    keywordRoot.innerHTML='';
    keywordDefinitions.filter(keyword=>keyword.name!=='ソロ').forEach(keyword=>{
      const button=document.createElement('button');button.type='button';
      button.className='keyword-filter-chip'+(keyword.id==='ammo'?' keyword-ammo':'')+(activeKeywords.has(keyword.name)?' active':'');
      button.textContent=keyword.name;button.dataset.keyword=keyword.name;
      button.addEventListener('click',()=>{activeKeywords.has(keyword.name)?activeKeywords.delete(keyword.name):activeKeywords.add(keyword.name);renderKeywords();refresh();});
      keywordRoot.appendChild(button);
    });
  }
  function renderSummary(){
    if(!summaryRoot)return;
    const items=[];const name=nameInput?.value.trim()||'';
    if(name)items.push(`名前：${name}`);
    if(raritySelect?.value&&raritySelect.value!=='all')items.push(`レアリティ：${raritySelect.value}`);
    [...activeKeywords].forEach(keyword=>items.push(keyword));
    if(activeKeywords.size>1)items.push(modeSelect?.value==='and'?'AND検索':'OR検索');
    if(multiOnly?.checked)items.push('複数キーワードのみ');
    if(includeConditional?.checked)items.push('条件付き含む');
    summaryRoot.innerHTML=items.length?items.map(item=>`<span class="filter-summary-chip">${item}</span>`).join(''):'<span class="filter-summary-empty">指定なし</span>';
  }
  function refresh(){renderSummary();onChange?.();}
  function reset(){activeKeywords.clear();if(nameInput)nameInput.value='';if(raritySelect)raritySelect.value='all';if(multiOnly)multiOnly.checked=false;if(includeConditional)includeConditional.checked=true;if(modeSelect)modeSelect.value='or';renderKeywords();refresh();}
  function getResult(identities){
    const query=(nameInput?.value||'').trim().toLowerCase();const rarity=raritySelect?.value||'all';const selectedKeywords=[...activeKeywords];const mode=modeSelect?.value||'or';const include=includeConditional?.checked!==false;
    const effectiveKeywords=identity=>{const base=[...(identity.keywords||[])];if(include)(identity.conditionalKeywords||[]).forEach(condition=>(condition.keywords||[]).forEach(keyword=>{if(!base.includes(keyword))base.push(keyword);}));return base;};
    const rarityOrder={'000':3,'00':2,'0':1};
    const visible=(identities||[]).filter(identity=>{const keywords=effectiveKeywords(identity);const nameOk=!query||identity.name.toLowerCase().includes(query);const rarityOk=rarity==='all'||identity.rarity===rarity;const multiOk=!multiOnly?.checked||keywords.length>=2;const keywordOk=!selectedKeywords.length||(mode==='and'?selectedKeywords.every(keyword=>keywords.includes(keyword)):selectedKeywords.some(keyword=>keywords.includes(keyword)));return nameOk&&rarityOk&&multiOk&&keywordOk;}).sort((a,b)=>(rarityOrder[b.rarity]||0)-(rarityOrder[a.rarity]||0)||a.name.localeCompare(b.name,'ja',{numeric:true,sensitivity:'base'}));
    const showFreeSlot=!query&&rarity==='all'&&!selectedKeywords.length&&!multiOnly?.checked;
    return {visible,showFreeSlot};
  }
  function hasActiveFilters(){return Boolean(nameInput?.value.trim())||raritySelect?.value!=='all'||activeKeywords.size>0||Boolean(multiOnly?.checked)||Boolean(includeConditional?.checked)||modeSelect?.value==='and';}

  [nameInput,raritySelect,multiOnly,includeConditional,modeSelect].forEach(control=>control?.addEventListener(control===nameInput?'input':'change',refresh));
  resetButton?.addEventListener('click',reset);
  renderKeywords();renderSummary();
  return {getResult,hasActiveFilters,reset,renderSummary,focusName:()=>nameInput?.focus({preventScroll:true})};
}

window.LimbusIdentityFilterController={create:createIdentityFilterController};
})();
