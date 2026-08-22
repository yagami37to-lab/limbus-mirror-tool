(()=>{
'use strict';
const api=window.LimbusCommunity,grid=document.querySelector('[data-request-grid]'),empty=document.querySelector('[data-request-empty]'),count=document.querySelector('[data-request-count]');
const esc=value=>api?.esc?.(value)||String(value??'');
const categoryLabel=id=>window.LimbusCategories?.label?.(id)||'カテゴリ未設定';
const difficultyLabel=value=>value==='HARD'?'ハード':value==='NORMAL'?'ノーマル':value||'';
const savedTheme=localStorage.getItem('limbus-theme')||'light';document.documentElement.dataset.theme=savedTheme;
document.querySelector('[data-request-theme]')?.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;localStorage.setItem('limbus-theme',next);});
async function render(){
 if(!api||!grid)return;
 try{
  const posts=await api.getPublishedPosts({limit:100,entryKind:'request'});grid.innerHTML='';
  for(const post of posts){
   const content=post.content||{},profile=await api.getProfile(post.author_id),party=Array.isArray(content.party)?content.party:[],meta=[difficultyLabel(post.difficulty),content.stage,post.strategy_type].filter(Boolean);
   const article=document.createElement('article');article.className='request-card';article.dataset.requestId=post.id;
   article.innerHTML=`<div class="request-card-head"><span class="request-category" data-category-id="${esc(post.category||'mirror_dungeon')}">${esc(categoryLabel(post.category))}</span><time>${new Date(post.published_at||post.created_at).toLocaleDateString('ja-JP')}</time></div><h3>${esc(post.title||post.summary||'攻略依頼')}</h3><p class="request-summary">${esc(post.summary||'')}</p>${meta.length?`<div class="request-meta">${meta.map(item=>`<span>${esc(item)}</span>`).join('')}</div>`:''}${party.length?`<div class="request-party">${party.slice(0,12).map(item=>{const image=window.LimbusIdentityImages?.forIdentity?.(item.sinner,item.identity,{free:!!item.is_free});return `<span${image?` style="background-image:linear-gradient(180deg,transparent,rgba(0,0,0,.85)),url('${esc(image)}')"`:''}><b>${esc(item.sinner)}</b></span>`;}).join('')}</div>`:''}<div class="request-card-footer">${api.authorMarkup(profile,true,!!content.anonymousPosting)}<button class="request-support-button" type="button" data-request-support>この依頼に応える</button></div>`;
   article.querySelector('[data-request-support]').onclick=()=>{location.href=`index.html?mode=strategy&open=1&request=${encodeURIComponent(post.id)}`;};grid.appendChild(article);
  }
  if(count)count.textContent=String(posts.length);if(empty)empty.hidden=posts.length>0;
 }catch(error){console.error(error);grid.innerHTML='';if(empty){empty.hidden=false;empty.querySelector('strong').textContent='攻略依頼を読み込めませんでした。';empty.querySelector('p').textContent='通信状態を確認して再読み込みしてください。';}}
}
render();
})();
