(()=>{
'use strict';
function createIdentityCardController({state,identityData,filterController,selectionController,getTone,getImage,applyImage,onRenderRoster,onRenderAlternatives,onCountUpdate,onValidationClear,showToast,queueRosterScroll}){
  const grid=document.querySelector('[data-post-identity-grid]');
  const currentName=document.querySelector('[data-current-identity-name]');
  const count=document.querySelector('[data-identity-filter-count]');
  const empty=document.querySelector('[data-identity-filter-empty]');
  function render(){
    const sinner=identityData.find(item=>item.id===state.activeSinner);if(!sinner||!grid)return;
    const selected=state.identities.get(sinner.id);const selectedName=selected?.name;grid.innerHTML='';
    const {visible,showFreeSlot}=filterController.getResult(sinner.identities);
    if(showFreeSlot){
      const free=document.createElement('button');free.type='button';free.className='identity-option-card identity-option-free'+(selected?.isFreeSlot?' selected':'');
      free.style.setProperty('--card-a','#6a604f');free.style.setProperty('--card-b','#191713');applyImage(free,getImage(sinner.id,{isFreeSlot:true}));
      free.innerHTML=`<span class="identity-rarity">FREE</span><span class="identity-placeholder">＋</span><strong>自由枠</strong><div class="identity-keywords"><span>誰でも可</span></div><p class="identity-note">${sinner.name}の人格は指定しません。</p><small class="identity-confidence">人格指定なし</small>`;
      free.addEventListener('click',()=>{const chosen=selectionController.selectFree(sinner.id);if(currentName)currentName.textContent=chosen.name;onRenderRoster();onRenderAlternatives();render();onCountUpdate();showToast(`${sinner.name}を自由枠に設定しました。`);queueRosterScroll();});grid.appendChild(free);
    }
    visible.forEach((identity,index)=>{
      const button=document.createElement('button');button.type='button';const tone=getTone(identity.keywords,index);const isSelected=selectedName===identity.name;const isAlternative=selectionController.alternativeNamesFor(sinner.id).includes(identity.name);
      button.className='identity-option-card'+(isSelected?' selected':'')+(isAlternative?' alternative-selected':'')+(state.alternativeSelectionMode?' alternative-mode':'');button.style.setProperty('--card-a',tone[0]);button.style.setProperty('--card-b',tone[1]);applyImage(button,getImage(sinner.id,identity));
      const chips=(identity.keywords||[]).length?identity.keywords.map(keyword=>`<span class="${keyword==='弾丸'?'keyword-ammo':''}" data-keyword="${keyword}">${keyword}</span>`).join(''):'<span class="keyword-none">未分類</span>';
      const conditional=(identity.conditionalKeywords||[]).map(item=>`<div class="conditional-keyword${(item.keywords||[]).includes('弾丸')?' keyword-ammo':''}"><b>条件付き</b><span>${(item.keywords||[]).map(keyword=>`<i data-keyword="${keyword}">${keyword}</i>`).join('・')}</span><small>${item.conditionLabel}</small></div>`).join('');
      const lossConditions=identity.keywordLossConditions||[];const lossKeywords=[...new Set(lossConditions.flatMap(item=>item.keywords||[]))];
      const losses=lossConditions.length?`<div class="keyword-loss-condition"><div class="keyword-loss-title"><b>条件付き</b><span>${lossKeywords.map(keyword=>`<i data-keyword="${keyword}">${keyword}</i>`).join('・')}</span></div><div class="keyword-loss-list">${lossConditions.map(item=>`<small class="keyword-loss-row">● ${item.conditionLabel} → ${(item.keywords||[]).join('・')}消失</small>`).join('')}</div></div>`:'';
      const notes=(identity.notes||[]).map(note=>`<p class="identity-note">${note}</p>`).join('');const confidence=identity.keywordConfidence==='user-reviewed'?'確認済み':identity.keywordConfidence==='community-explicit'?'複数キーワード確認済み':'初期分類・要確認';
      button.innerHTML=`<span class="identity-rarity">${identity.rarity}</span><span class="identity-placeholder">${String(index+1).padStart(2,'0')}</span><strong>${identity.name}</strong><div class="identity-keywords">${chips}</div>${conditional}${losses}${notes}<small class="identity-confidence">${confidence}</small>`;
      button.addEventListener('click',()=>{if(state.alternativeSelectionMode){const result=selectionController.toggleAlternative(sinner.id,identity);if(!result.changed){showToast('使用人格と同じ人格は代用人格に設定できません。');return;}onRenderAlternatives();render();showToast(result.removed?'代用人格から解除しました。':'代用人格へ追加しました。');return;}selectionController.selectPrimary(sinner.id,identity);onValidationClear();if(currentName)currentName.textContent=identity.name;onRenderRoster();onRenderAlternatives();render();onCountUpdate();showToast(`${sinner.name}：${identity.name}を選択しました。`);queueRosterScroll();});grid.appendChild(button);
    });
    if(count)count.textContent=`${visible.length+(showFreeSlot?1:0)} / ${sinner.identities.length+(showFreeSlot?1:0)}`;if(empty)empty.hidden=visible.length!==0||showFreeSlot;
  }
  return {render};
}
window.LimbusIdentityCardController={create:createIdentityCardController};
})();
