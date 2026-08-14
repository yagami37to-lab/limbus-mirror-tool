(()=>{
'use strict';
function createPostCategoryController({state,categories,getCategory,iconMarkup,dialog,editorDialog,list,status,startButton,openDraftButton,openButtons,closeButton,categoryBadges,reviewCategory,isAuthenticated,openAuth,openDialog,closeDialog,openDrafts,resetEditor,getInitialSinnerId,setStep}){
  let pendingCategory='';
  function updateDisplays(){const category=getCategory(state.category);categoryBadges.forEach(node=>{node.textContent=category.label;});if(reviewCategory)reviewCategory.textContent=category.label;}
  function select(category,button){if(!category.available)return;pendingCategory=category.id;list?.querySelectorAll('.category-picker-option').forEach(node=>node.classList.toggle('active',node===button));if(status)status.textContent=`${category.label}を選択中`;if(startButton)startButton.disabled=false;}
  function render(){if(!list)return;list.innerHTML='';pendingCategory='';if(startButton)startButton.disabled=true;if(status)status.textContent='カテゴリを選択してください';categories.forEach(category=>{const button=document.createElement('button');button.type='button';button.className='category-picker-option';button.disabled=!category.available;button.dataset.categoryId=category.id;button.innerHTML=`<span class="category-picker-icon">${iconMarkup(category)}</span><span><strong>${category.label}</strong><small>${category.description}</small>${category.available?'':'<em>※実装予定</em>'}</span>`;button.addEventListener('click',()=>select(category,button));list.appendChild(button);});}
  function openPicker(){if(!isAuthenticated()){openAuth();return;}render();openDialog(dialog);}
  function openDraftManager(){closeDialog(dialog);requestAnimationFrame(openDrafts);}
  function startPost(){if(!pendingCategory)return;const selected=pendingCategory;resetEditor();state.category=selected;state.activeSinner=getInitialSinnerId();updateDisplays();setStep(1);closeDialog(dialog);requestAnimationFrame(()=>openDialog(editorDialog));}
  function bind(){openButtons.forEach(button=>button.addEventListener('click',openPicker));closeButton?.addEventListener('click',()=>closeDialog(dialog));openDraftButton?.addEventListener('click',openDraftManager);startButton?.addEventListener('click',startPost);}
  return {bind,render,select,openPicker,openDraftManager,startPost,updateDisplays,getPendingCategory:()=>pendingCategory};
}
window.LimbusPostCategoryController={create:createPostCategoryController};
})();
