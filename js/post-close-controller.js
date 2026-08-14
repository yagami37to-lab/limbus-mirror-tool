(()=>{
'use strict';
function createPostCloseController({confirmDialog,editorDialog,closeButtons,cancelButton,discardButton,saveButton,openDialog,closeDialog,unlockPageScroll,saveDraft,resetEditor,showToast}){
  function requestClose(){if(confirmDialog&&!confirmDialog.open)openDialog(confirmDialog);}
  function cancelClose(){closeDialog(confirmDialog);}
  function discardAndClose(){closeDialog(confirmDialog);closeDialog(editorDialog);resetEditor();showToast('入力内容を破棄しました。');}
  function saveAndClose(){if(!saveDraft())return;closeDialog(confirmDialog);closeDialog(editorDialog);resetEditor();showToast('下書きを保存して投稿画面を閉じました。');}
  closeButtons.forEach(button=>button.addEventListener('click',requestClose));
  cancelButton?.addEventListener('click',cancelClose);
  discardButton?.addEventListener('click',discardAndClose);
  saveButton?.addEventListener('click',saveAndClose);
  confirmDialog?.addEventListener('close',unlockPageScroll);
  confirmDialog?.addEventListener('cancel',event=>{event.preventDefault();cancelClose();});
  return {requestClose,cancelClose,discardAndClose,saveAndClose};
}
window.LimbusPostCloseController={create:createPostCloseController};
})();
