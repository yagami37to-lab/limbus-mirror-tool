(()=>{
'use strict';
function createPostPersistenceController({buildPayload,getEditingId,setEditingId,validatePublished,onTitleMissing,onAuthRequired,onPublished,showToast}){
  async function save(status){
    const client=window.limbusSupabase;if(!client){showToast('Supabase接続設定を読み込めませんでした。');return false;}
    const {data:{session}}=await client.auth.getSession();const user=session?.user;
    if(!user){onAuthRequired();return false;}
    if(status==='published'&&!validatePublished())return false;
    const payload=buildPayload();if(!payload.title){onTitleMissing();return false;}
    const now=new Date().toISOString();const row={author_id:user.id,...payload,status,published_at:status==='published'?now:null,updated_at:now};
    const editingId=getEditingId();
    if(!editingId){
      const {count,error}=await client.from('posts').select('*',{count:'exact',head:true}).eq('author_id',user.id);
      if(error){showToast(`投稿数を確認できませんでした：${error.message}`);return false;}
      if((count||0)>=20){showToast('投稿上限の20件に達しています。既存の投稿を編集または削除してください。');return false;}
    }
    const query=editingId?client.from('posts').update(row).eq('id',editingId).eq('author_id',user.id).select('id').single():client.from('posts').insert(row).select('id').single();
    const {data,error}=await query;
    if(error){console.error(error);showToast(`保存できませんでした：${error.message}`);return false;}
    setEditingId(data.id);showToast(status==='published'?'攻略を公開しました。':'下書きを保存しました。');
    if(status==='published')onPublished(data.id);
    return true;
  }
  return {save};
}
window.LimbusPostPersistenceController={create:createPostPersistenceController};
})();
