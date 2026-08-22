(()=>{
'use strict';
function createPostEditorLaunchController({openDraftFromQuery,restorePost,restoreRequest,openEditor,showToast}){
  async function openFromQuery(){
    if(openDraftFromQuery())return {source:'draft'};
    const params=new URLSearchParams(location.search),requestId=params.get('request'),editId=params.get('edit');
    const client=window.limbusSupabase;
    if(requestId&&client){
      const {data:request,error}=await client.from('posts').select('*').eq('id',requestId).eq('status','published').maybeSingle();
      if(error||!request||request.content?.entryKind!=='request'){showToast('攻略依頼を読み込めませんでした。');return null;}
      restoreRequest(request);openEditor();showToast('依頼条件を反映しました。タイトルと一言紹介を入力してください。');
      return {source:'request',id:request.id};
    }
    if(!editId||!client)return null;
    const {data:{session}}=await client.auth.getSession();
    if(!session?.user)return null;
    const {data:post,error}=await client.from('posts').select('*').eq('id',editId).eq('author_id',session.user.id).maybeSingle();
    if(error||!post){showToast('編集する投稿を読み込めませんでした。');return null;}
    restorePost(post);openEditor();showToast('投稿を編集できます。');
    return {source:'post',id:post.id};
  }
  return {openFromQuery};
}
window.LimbusPostEditorLaunchController={create:createPostEditorLaunchController};
})();
