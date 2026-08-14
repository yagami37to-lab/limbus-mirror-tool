(()=>{
'use strict';
function createPostBasicsController({state,titleInput,typeButtons,difficultyButtons,typePreview,typeCopy,typePreviewIcon,typePreviewDifficulty,difficultyError,difficultyBadges,typeBadges,workspaceTitlebar,syncTitle,validateBasics,clearValidation,isSolo,onDifficultyChanged,onTypeChanged}){
  function renderTypeIcon(button){
    if(!typePreviewIcon)return;const logo=button?.querySelector(':scope > .type-option-logo > img');typePreviewIcon.classList.toggle('has-type-logo',Boolean(logo));typePreviewIcon.replaceChildren();
    if(logo){const image=logo.cloneNode(true);image.removeAttribute('width');image.removeAttribute('height');image.setAttribute('aria-hidden','true');image.alt='';typePreviewIcon.appendChild(image);return;}
    typePreviewIcon.textContent=button?.querySelector(':scope > span')?.textContent?.trim()||'◇';
  }
  function updateDifficulty(){
    const label=state.difficulty==='HARD'?'ハード':state.difficulty==='NORMAL'?'ノーマル':'難易度未選択';difficultyBadges.forEach(node=>{node.textContent=label;node.classList.toggle('is-unset',!state.difficulty);node.dataset.difficulty=state.difficulty||'';});
    if(typePreviewDifficulty){typePreviewDifficulty.textContent=state.difficulty?`${label}向け攻略`:'難易度を選択してください';typePreviewDifficulty.dataset.difficulty=state.difficulty||'';}if(difficultyError)difficultyError.hidden=Boolean(state.difficulty);
  }
  function selectDifficulty(button){
    const next=button.dataset.postDifficulty;if(state.difficulty&&state.difficulty!==next&&state.themePacks.size&&!window.confirm('難易度を変更すると、選択済みのテーマパックが解除されます。変更しますか？'))return;
    if(state.difficulty!==next){state.themePacks.clear();onDifficultyChanged();}state.difficulty=next;difficultyButtons.forEach(node=>node.classList.toggle('active',node===button));clearValidation(1);updateDifficulty();
  }
  function selectType(button){
    typeButtons.forEach(node=>node.classList.remove('active'));button.classList.add('active');state.type=button.dataset.postType;clearValidation(1);
    if(isSolo()&&state.identityOrder.length>1)state.identityOrder=state.identityOrder.slice(0,1);if(isSolo()){const soloId=state.identityOrder[0];for(const id of [...state.egos.keys()])if(id!==soloId)state.egos.delete(id);}
    onTypeChanged();if(typePreview)typePreview.textContent=state.type;if(typeCopy)typeCopy.textContent=`${button.querySelector('small').textContent}攻略として投稿します。`;renderTypeIcon(button);typeBadges.forEach(node=>{node.textContent=state.type;node.classList.remove('is-unset');});
  }
  const syncTitleAndValidation=()=>{syncTitle();workspaceTitlebar?.classList.remove('validation-error');if(validateBasics().valid)clearValidation(1);};
  let composing=false;
  function bind(){
    difficultyButtons.forEach(button=>button.addEventListener('click',()=>selectDifficulty(button)));typeButtons.forEach(button=>button.addEventListener('click',()=>selectType(button)));updateDifficulty();if(!titleInput)return;
    titleInput.addEventListener('compositionstart',()=>{composing=true;});titleInput.addEventListener('compositionupdate',syncTitleAndValidation);titleInput.addEventListener('compositionend',()=>{composing=false;syncTitleAndValidation();requestAnimationFrame(syncTitleAndValidation);setTimeout(syncTitleAndValidation,0);});
    ['input','change','blur','keyup'].forEach(name=>titleInput.addEventListener(name,syncTitleAndValidation));titleInput.addEventListener('beforeinput',()=>requestAnimationFrame(syncTitleAndValidation));titleInput.addEventListener('keydown',event=>{if(event.key==='Enter')requestAnimationFrame(syncTitleAndValidation);});titleInput.addEventListener('focus',syncTitleAndValidation);
    window.visualViewport?.addEventListener('resize',()=>{if(document.activeElement===titleInput&&!composing)syncTitleAndValidation();});setInterval(()=>{if(document.activeElement===titleInput)syncTitleAndValidation();},120);
  }
  return {bind,updateDifficulty,selectDifficulty,selectType,syncTitle:syncTitleAndValidation};
}
window.LimbusPostBasicsController={create:createPostBasicsController};
})();
