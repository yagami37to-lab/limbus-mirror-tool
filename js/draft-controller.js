(()=>{
'use strict';

const STORAGE_KEY='limbus-post-save-slots-v1';
const DRAFT_LIMIT=5;

function createDraftController({
  captureState,
  restoreState,
  getDefaultName,
  postModal,
  openDialog,
  closeDialog,
  unlockPageScroll,
  showToast
}){
  const $=selector=>document.querySelector(selector);
  const manager=$('[data-draft-manager]');
  const slotList=$('[data-draft-slot-list]');
  const slotCount=$('[data-draft-slot-count]');
  let activeDraftId=null;

  function readDrafts(){
    try{
      const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
      return Array.isArray(value)?value.slice(0,DRAFT_LIMIT):[];
    }catch{
      return [];
    }
  }

  function writeDrafts(items){
    localStorage.setItem(STORAGE_KEY,JSON.stringify(items.slice(0,DRAFT_LIMIT)));
  }

  function formatDraftDate(value){
    try{return new Intl.DateTimeFormat('ja-JP',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}
    catch{return value||'';}
  }

  function loadDraft(draft){
    activeDraftId=draft.id;
    restoreState(draft.state);
    closeDialog(manager);
    if(!postModal.open)openDialog(postModal);
    showToast('セーブデータを読み込みました。');
  }

  function renderManager(){
    if(!slotList)return;
    const drafts=readDrafts();
    slotList.replaceChildren();
    if(slotCount)slotCount.textContent=`${drafts.length} / ${DRAFT_LIMIT}件`;
    if(!drafts.length){
      slotList.innerHTML='<p class="draft-slot-empty">保存されているセーブデータはありません。</p>';
      return;
    }
    drafts.forEach((draft,index)=>{
      const row=document.createElement('article');
      row.className='draft-slot-card';
      row.innerHTML=`<div><small>SLOT ${index+1}</small><strong></strong><time></time></div><div class="draft-slot-actions"><button type="button" data-load>続きから編集</button><button type="button" data-overwrite>上書き保存</button><button type="button" data-delete>削除</button></div>`;
      row.querySelector('strong').textContent=draft.name||'無題のセーブデータ';
      row.querySelector('time').textContent=`最終保存：${formatDraftDate(draft.updatedAt)}`;
      row.querySelector('[data-load]').onclick=()=>loadDraft(draft);
      row.querySelector('[data-overwrite]').onclick=()=>{
        const items=readDrafts();
        const target=items.find(item=>item.id===draft.id);
        if(!target)return;
        target.state=captureState();
        target.updatedAt=new Date().toISOString();
        writeDrafts(items);
        activeDraftId=draft.id;
        renderManager();
        showToast('セーブデータを上書きしました。');
      };
      row.querySelector('[data-delete]').onclick=()=>{
        if(!window.confirm('このセーブデータを削除しますか？'))return;
        writeDrafts(readDrafts().filter(item=>item.id!==draft.id));
        if(activeDraftId===draft.id)activeDraftId=null;
        renderManager();
        showToast('セーブデータを削除しました。');
      };
      slotList.appendChild(row);
    });
  }

  function createDraft(){
    const items=readDrafts();
    if(items.length>=DRAFT_LIMIT){
      showToast('セーブデータは最大5件です。不要なデータを削除してください。');
      return false;
    }
    const defaultName=getDefaultName(items.length);
    const name=window.prompt('セーブデータ名を入力してください。',defaultName);
    if(name===null)return false;
    const now=new Date().toISOString();
    const id=crypto.randomUUID?.()||`draft-${Date.now()}`;
    items.push({id,name:name.trim().slice(0,40)||defaultName,updatedAt:now,state:captureState()});
    writeDrafts(items);
    activeDraftId=id;
    renderManager();
    showToast('セーブデータを保存しました。');
    return true;
  }

  function openManager(){
    renderManager();
    openDialog(manager);
  }

  function openFromQuery(){
    const draftId=new URLSearchParams(location.search).get('draft');
    if(!draftId)return false;
    const draft=readDrafts().find(item=>String(item.id)===String(draftId));
    if(!draft){showToast('指定されたセーブデータを読み込めませんでした。');return false;}
    activeDraftId=draft.id;
    restoreState(draft.state);
    openDialog(postModal);
    showToast('セーブデータを読み込みました。');
    return true;
  }

  function removeAfterPublish(){
    if(!activeDraftId)return;
    if(window.confirm('公開した投稿のセーブデータを削除しますか？')){
      writeDrafts(readDrafts().filter(item=>item.id!==activeDraftId));
    }
    activeDraftId=null;
  }

  function clearActive(){activeDraftId=null;}

  $('[data-save-draft]')?.addEventListener('click',openManager);
  $('[data-close-draft-manager]')?.addEventListener('click',()=>closeDialog(manager));
  $('[data-create-draft-slot]')?.addEventListener('click',createDraft);
  if(manager){
    manager.addEventListener('close',unlockPageScroll);
    manager.addEventListener('cancel',event=>{event.preventDefault();closeDialog(manager);});
    manager.addEventListener('click',event=>{if(event.target===manager)closeDialog(manager);});
  }

  return {openManager,createDraft,openFromQuery,removeAfterPublish,clearActive};
}

window.LimbusDraftController={create:createDraftController};
})();
