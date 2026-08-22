(()=>{
'use strict';
function createPostPersistenceController({buildPayload,getEditingId,setEditingId,validatePublished,onTitleMissing,onAuthRequired,onPublished,showToast}){
  async function save(status){
    const client=window.limbusSupabase;if(!client){showToast('Supabase接続設定を読み込めませんでした。');return false;}
    const {data:{session}}=await client.auth.getSession();const user=session?.user;
    if(!user){onAuthRequired();return false;}
    if(status==='published'&&!validatePublished())return false;
    const payload=buildPayload();if(!payload.title){onTitleMissing();return false;}
    const editingId=getEditingId();
    const now=new Date().toISOString();
    const row={author_id:user.id,...payload,status,updated_at:now};
    if(!editingId)row.published_at=status==='published'?now:null;
    else if(status!=='published')row.published_at=null;
    else{
      const {data:existing,error:existingError}=await client.from('posts').select('published_at').eq('id',editingId).eq('author_id',user.id).single();
      if(existingError){showToast(`公開日時を確認できませんでした：${existingError.message}`);return false;}
      row.published_at=existing.published_at||now;
    }
    if(!editingId){
      const {count,error}=await client.from('posts').select('*',{count:'exact',head:true}).eq('author_id',user.id);
      if(error){showToast(`投稿数を確認できませんでした：${error.message}`);return false;}
      if((count||0)>=20){showToast('投稿上限の20件に達しています。既存の投稿を編集または削除してください。');return false;}
    }
    const query=editingId?client.from('posts').update(row).eq('id',editingId).eq('author_id',user.id).select('id').single():client.from('posts').insert(row).select('id').single();
    const {data,error}=await query;
    if(error){console.error(error);showToast(`保存できませんでした：${error.message}`);return false;}
    setEditingId(data.id);
    if(status==='published'){
      showToast('攻略を公開しました。共有画像を準備しています…');
      try{
        const ogUrl=new URL(`/og/${encodeURIComponent(data.id)}`,location.origin);ogUrl.searchParams.set('v',now);
        await Promise.race([fetch(ogUrl,{cache:'reload',credentials:'omit'}),new Promise(resolve=>setTimeout(resolve,18000))]);
      }catch(error){console.warn('共有画像の事前生成を完了できませんでした。',error);}
    }
    showToast(status==='published'?'攻略を公開しました。':'下書きを保存しました。');
    if(status==='published')onPublished(data.id);
    return true;
  }
  return {save};
}
window.LimbusPostPersistenceController={create:createPostPersistenceController};
})();
