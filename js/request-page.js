(()=>{
'use strict';
const api=window.LimbusCommunity,grid=document.querySelector('[data-request-grid]'),empty=document.querySelector('[data-request-empty]'),count=document.querySelector('[data-request-count]'),featured=document.querySelector('[data-request-featured]'),searchInput=document.querySelector('[data-request-search]'),categorySelect=document.querySelector('[data-request-category]');
const esc=value=>api?.esc?.(value)||String(value??'');
const categoryLabel=id=>window.LimbusCategories?.label?.(id)||'カテゴリ未設定';
const difficultyLabel=value=>value==='HARD'?'ハード':value==='NORMAL'?'ノーマル':value||'';
const savedTheme=localStorage.getItem('limbus-theme')||'light';document.documentElement.dataset.theme=savedTheme;
document.querySelector('[data-request-theme]')?.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;localStorage.setItem('limbus-theme',next);});
const editorOverlay=document.querySelector('[data-request-editor-overlay]'),editorFrame=document.querySelector('[data-request-editor-frame]');
function openRequestEditor(event){event?.preventDefault();if(!editorOverlay||!editorFrame)return;if(!editorFrame.src)editorFrame.src='index.html?mode=request&open=1&embed=1';editorOverlay.hidden=false;document.body.classList.add('request-editor-open');}
function closeRequestEditor(){if(!editorOverlay)return;editorOverlay.hidden=true;document.body.classList.remove('request-editor-open');}
document.querySelectorAll('[data-open-request-editor]').forEach(button=>button.addEventListener('click',openRequestEditor));document.querySelector('[data-close-request-editor]')?.addEventListener('click',closeRequestEditor);
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.data?.type!=='limbus-request-published')return;closeRequestEditor();render();});
let allPosts=[];
const matches=post=>{const query=String(searchInput?.value||'').normalize('NFKC').toLowerCase().trim(),category=categorySelect?.value||'',haystack=[post.title,post.summary,post.content?.description,post.content?.stage,post.strategy_type].join(' ').normalize('NFKC').toLowerCase();return (!category||post.category===category)&&(!query||haystack.includes(query));};
async function cardFor(post){
 const content=post.content||{},profile=await api.getProfile(post.author_id),party=Array.isArray(content.party)?content.party:[],meta=[difficultyLabel(post.difficulty),content.stage,post.strategy_type].filter(Boolean);
 const article=document.createElement('article');article.className='request-card';article.dataset.requestId=post.id;
 article.innerHTML=`<div class="request-card-head"><span class="request-category" data-category-id="${esc(post.category||'mirror_dungeon')}">${esc(categoryLabel(post.category))}</span><time>${new Date(post.published_at||post.created_at).toLocaleDateString('ja-JP')}</time></div><h3>${esc(post.title||post.summary||'攻略依頼')}</h3><p class="request-summary">${esc(post.summary||'')}</p>${meta.length?`<div class="request-meta">${meta.map(item=>`<span>${esc(item)}</span>`).join('')}</div>`:''}${party.length?`<div class="request-party">${party.slice(0,12).map(item=>{const image=window.LimbusIdentityImages?.forIdentity?.(item.sinner,item.identity,{free:!!item.is_free});return `<span${image?` style="background-image:linear-gradient(180deg,transparent,rgba(0,0,0,.85)),url('${esc(image)}')"`:''}><b>${esc(item.sinner)}</b></span>`;}).join('')}</div>`:''}<div class="request-card-footer">${api.authorMarkup(profile,true,!!content.anonymousPosting)}<a class="request-support-button" href="index.html?open=1&amp;request=${encodeURIComponent(post.id)}">この依頼に応える</a></div>`;
 return article;
}
async function renderFiltered(){
 const posts=allPosts.filter(matches);grid.innerHTML='';for(const post of posts)grid.appendChild(await cardFor(post));if(count)count.textContent=String(posts.length);if(empty)empty.hidden=posts.length>0;
}
async function render(){
 if(!api||!grid)return;
 try{
  allPosts=await api.getPublishedPosts({limit:100,entryKind:'request'});
  (window.STRATEGY_CATEGORIES||[]).filter(item=>item.available).forEach(item=>categorySelect?.insertAdjacentHTML('beforeend',`<option value="${esc(item.id)}">${esc(item.label)}</option>`));
  await renderFiltered();
  if(featured){featured.innerHTML='';if(allPosts[0]){const item=await cardFor(allPosts[0]);item.classList.add('request-card-featured');featured.appendChild(item);}else featured.innerHTML='<p>新しい攻略依頼はまだありません。</p>';}
 }catch(error){console.error(error);grid.innerHTML='';if(empty){empty.hidden=false;empty.querySelector('strong').textContent='攻略依頼を読み込めませんでした。';empty.querySelector('p').textContent='通信状態を確認して再読み込みしてください。';}}
}
searchInput?.addEventListener('input',renderFiltered);categorySelect?.addEventListener('change',renderFiltered);document.querySelector('[data-request-clear]')?.addEventListener('click',()=>{if(searchInput)searchInput.value='';if(categorySelect)categorySelect.value='';renderFiltered();});
render();
})();
