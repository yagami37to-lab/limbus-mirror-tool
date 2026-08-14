(()=>{
'use strict';
function createPostEditorLaunchController({openDraftFromQuery,restorePost,openEditor,showToast}){
  async function openFromQuery(){
    if(openDraftFromQuery())return {source:'draft'};
    const editId=new URLSearchParams(location.search).get('edit');
    const client=window.limbusSupabase;
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
