(()=>{
'use strict';
const loadScript=src=>new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=reject;document.head.appendChild(script);});
document.documentElement.dataset.theme=localStorage.getItem('limbus-theme')||'light';

async function hydrateSharedHeader(){
  try{
    const html=await fetch('index.html',{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error(`header ${response.status}`);return response.text();});
    const source=new DOMParser().parseFromString(html,'text/html'),header=source.querySelector('.site-header');
    if(!header)return;
    const imported=document.importNode(header,true),current=document.querySelector('.request-header');
    imported.classList.add('request-header');
    imported.querySelector('.brand')?.setAttribute('href','index.html');
    imported.querySelectorAll('.header-nav a').forEach(link=>{const href=link.getAttribute('href')||'';if(href==='#featured'){link.remove();return;}if(href==='#search'){link.setAttribute('href','#search');link.textContent='投稿検索';return;}if(href.startsWith('#'))link.setAttribute('href',`index.html${href}`);if(href==='requests.html'){link.setAttribute('href','index.html');link.textContent='攻略投稿';link.classList.add('is-current');}});
    imported.querySelectorAll('[data-open-post],.mobile-header-post').forEach(button=>{button.removeAttribute('data-open-post');button.setAttribute('data-open-request-editor','');button.textContent=button.classList.contains('mobile-header-post')?'＋ 攻略依頼':'＋ 攻略を依頼';});
    current?.replaceWith(imported);
    ['[data-auth-dialog]','[data-legal-preview-dialog]'].forEach(selector=>{const node=source.querySelector(selector);if(node)document.body.appendChild(document.importNode(node,true));});
  }catch(error){console.warn('共通ヘッダーを読み込めませんでした。',error);}
}

function bindSharedHeader(){
  document.querySelectorAll('[data-theme-toggle],[data-request-theme]').forEach(toggle=>toggle.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;localStorage.setItem('limbus-theme',next);document.querySelectorAll('[data-theme-toggle]').forEach(item=>item.setAttribute('aria-pressed',String(next==='dark')));}));
  const menu=document.querySelector('.mobile-menu-button'),nav=document.querySelector('.header-nav');
  menu?.addEventListener('click',()=>{const open=!nav?.classList.contains('is-open');nav?.classList.toggle('is-open',open);menu.setAttribute('aria-expanded',String(open));});
}

async function boot(){
await hydrateSharedHeader();bindSharedHeader();
await loadScript('js/auth.js?v=1.2.16').catch(console.error);
await loadScript('js/community-data.js?v=1.2.16');
const api=window.LimbusCommunity,grid=document.querySelector('[data-request-grid]'),empty=document.querySelector('[data-request-empty]'),count=document.querySelector('[data-request-count]'),featured=document.querySelector('[data-request-featured]'),searchInput=document.querySelector('[data-request-search]');
const esc=value=>api?.esc?.(value)||String(value??'');
const categoryLabel=id=>window.LimbusCategories?.label?.(id)||'カテゴリ未設定';
const difficultyLabel=value=>value==='HARD'?'ハード':value==='NORMAL'?'ノーマル':value||'';
const editorOverlay=document.querySelector('[data-request-editor-overlay]'),editorFrame=document.querySelector('[data-request-editor-frame]');
function openRequestEditor(event){event?.preventDefault();if(!editorOverlay||!editorFrame)return;if(!editorFrame.src)editorFrame.src='index.html?mode=request&open=1&embed=1';editorOverlay.hidden=false;document.body.classList.add('request-editor-open');editorFrame.contentWindow?.postMessage({type:'limbus-request-editor-open'},location.origin);}
function closeRequestEditor(){if(!editorOverlay)return;editorOverlay.hidden=true;document.body.classList.remove('request-editor-open');}
document.querySelectorAll('[data-open-request-editor]').forEach(button=>button.addEventListener('click',openRequestEditor));document.querySelector('[data-close-request-editor]')?.addEventListener('click',closeRequestEditor);
window.addEventListener('message',event=>{if(event.origin!==location.origin)return;if(event.data?.type==='limbus-request-editor-closed'){closeRequestEditor();return;}if(event.data?.type==='limbus-request-published'){closeRequestEditor();render();}});
let allPosts=[];
const searchState={category:'',identities:new Set(),keywords:new Set(),types:new Set(),tags:new Set(),difficulties:new Set(),stages:new Set(),affiliations:new Set()};
const arrays=post=>{const content=post.content||{},party=Array.isArray(content.party)?content.party:[],selected=Array.isArray(content.selectedIdentities)?content.selectedIdentities:[];return{identities:[...party,...selected].flatMap(item=>[item.sinner,item.identity]).filter(Boolean),keywords:Array.isArray(content.keywords)?content.keywords:[],tags:Array.isArray(content.tags)?content.tags:[],affiliations:Array.isArray(content.affiliations)?content.affiliations:[],stages:[content.stage].filter(Boolean),difficulties:[post.difficulty].filter(Boolean),types:[post.strategy_type].filter(Boolean)}};
const includesAll=(values,selected)=>[...selected].every(value=>values.includes(value));
const matches=post=>{const values=arrays(post),query=String(searchInput?.value||'').normalize('NFKC').toLowerCase().trim(),haystack=[post.title,post.summary,post.content?.description,post.content?.stage,post.strategy_type,...Object.values(values).flat()].join(' ').normalize('NFKC').toLowerCase();return (!searchState.category||post.category===searchState.category)&&(!query||haystack.includes(query))&&includesAll(values.identities,searchState.identities)&&includesAll(values.keywords,searchState.keywords)&&includesAll(values.types,searchState.types)&&includesAll(values.tags,searchState.tags)&&includesAll(values.difficulties,searchState.difficulties)&&includesAll(values.stages,searchState.stages)&&includesAll(values.affiliations,searchState.affiliations)};
const unique=(key,posts=allPosts)=>[...new Set(posts.flatMap(post=>arrays(post)[key]||[]).map(String).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ja'));
const chipGroup=(selector,key,values)=>{const root=document.querySelector(selector);if(!root)return;root.innerHTML=values.length?values.map(value=>`<button class="search-chip${searchState[key].has(value)?' active':''}" type="button" data-request-filter="${key}" data-value="${esc(value)}">${esc(value==='HARD'?'ハード':value==='NORMAL'?'ノーマル':value)}</button>`).join(''):'<span class="request-search-empty">選択できる項目はありません</span>';};
function renderSearchOptions(){const categories=document.querySelector('[data-request-search-categories]');if(categories){const items=[{id:'',label:'すべて',icon:'ALL'},...(window.STRATEGY_CATEGORIES||[]).filter(item=>item.available)];categories.innerHTML=items.map(item=>`<button class="search-category-option${searchState.category===item.id?' active':''}" data-request-category="${esc(item.id)}" data-category-id="${esc(item.id||'all')}" type="button"><span class="search-category-icon">${item.iconImage?`<img class="category-image-icon" src="${esc(item.iconImage)}" alt="">`:esc(item.icon||'ALL')}</span><span><strong>${esc(item.label)}</strong></span></button>`).join('');}
 const scoped=searchState.category?allPosts.filter(post=>post.category===searchState.category):allPosts;
 chipGroup('[data-request-search-identities]','identities',unique('identities',scoped));chipGroup('[data-request-search-keywords]','keywords',unique('keywords',scoped));chipGroup('[data-request-search-types]','types',unique('types',scoped));chipGroup('[data-request-search-tags]','tags',unique('tags',scoped));chipGroup('[data-request-search-difficulties]','difficulties',unique('difficulties',scoped));chipGroup('[data-request-search-stages]','stages',unique('stages',scoped));chipGroup('[data-request-search-affiliations]','affiliations',unique('affiliations',scoped));
}
async function cardFor(post){
 const content=post.content||{},profile=await api.getProfile(post.author_id),party=Array.isArray(content.party)?content.party:[],meta=[difficultyLabel(post.difficulty),content.stage,post.strategy_type].filter(Boolean),article=document.createElement('article');article.className='request-card';article.dataset.requestId=post.id;
 article.innerHTML=`<div class="request-card-head"><span class="request-category" data-category-id="${esc(post.category||'mirror_dungeon')}">${esc(categoryLabel(post.category))}</span><time>${new Date(post.published_at||post.created_at).toLocaleDateString('ja-JP')}</time></div><h3>${esc(post.title||post.summary||'攻略依頼')}</h3><p class="request-summary">${esc(post.summary||'')}</p>${meta.length?`<div class="request-meta">${meta.map(item=>`<span>${esc(item)}</span>`).join('')}</div>`:''}${party.length?`<div class="request-party">${party.slice(0,12).map(item=>{const image=window.LimbusIdentityImages?.forIdentity?.(item.sinner,item.identity,{free:!!item.is_free});return `<span${image?` style="background-image:linear-gradient(180deg,transparent,rgba(0,0,0,.85)),url('${esc(image)}')"`:''}><b>${esc(item.sinner)}</b></span>`;}).join('')}</div>`:''}<div class="request-card-footer">${api.authorMarkup(profile,true,!!content.anonymousPosting)}<a class="request-support-button" href="index.html?request=${encodeURIComponent(post.id)}">この依頼に応える</a></div>`;
 return article;
}
async function renderFiltered(){const posts=allPosts.filter(matches);grid.innerHTML='';for(const post of posts)grid.appendChild(await cardFor(post));if(count)count.textContent=String(posts.length);if(empty)empty.hidden=posts.length>0;const total=[searchState.category,...Object.values(searchState).filter(value=>value instanceof Set).flatMap(value=>[...value]),String(searchInput?.value||'').trim()].filter(Boolean).length;const summary=document.querySelector('[data-request-search-summary]');if(summary)summary.textContent=total?`${total}件の条件で絞り込み中`:'条件を選んで攻略依頼を絞り込めます。';}
async function render(){
 if(!api||!grid)return;
 try{allPosts=await api.getPublishedPosts({limit:100,entryKind:'request'});renderSearchOptions();await renderFiltered();if(featured){featured.innerHTML='';if(allPosts[0]){const item=await cardFor(allPosts[0]);item.classList.add('request-card-featured');featured.appendChild(item);}else featured.innerHTML='<p>新しい攻略依頼はまだありません。</p>';}}
 catch(error){console.error(error);grid.innerHTML='';if(empty){empty.hidden=false;empty.querySelector('strong').textContent='攻略依頼を読み込めませんでした。';empty.querySelector('p').textContent='通信状態を確認して再読み込みしてください。';}}
}
searchInput?.addEventListener('input',renderFiltered);
document.querySelector('[data-request-search-toggle]')?.addEventListener('click',event=>{const button=event.currentTarget,panel=document.querySelector('[data-request-search-toggle]')?.nextElementSibling,open=panel?.hidden!==false;if(panel)panel.hidden=!open;button.setAttribute('aria-expanded',String(open));button.querySelector('.home-search-toggle-mark').textContent=open?'−':'＋';});
document.querySelector('[data-request-advanced-toggle]')?.addEventListener('click',event=>{const panel=document.querySelector('[data-request-advanced]'),open=panel?.hidden!==false;if(panel)panel.hidden=!open;event.currentTarget.setAttribute('aria-expanded',String(open));event.currentTarget.querySelector('span').textContent=open?'詳細条件を閉じる':'詳細条件を表示';event.currentTarget.querySelector('b').textContent=open?'−':'＋';});
document.querySelector('[data-request-search-categories]')?.addEventListener('click',event=>{const button=event.target.closest('[data-request-category]');if(!button)return;searchState.category=button.dataset.requestCategory||'';Object.entries(searchState).filter(([,value])=>value instanceof Set).forEach(([,value])=>value.clear());renderSearchOptions();renderFiltered();});
document.querySelector('.request-post-search')?.addEventListener('click',event=>{const button=event.target.closest('[data-request-filter]');if(!button)return;const set=searchState[button.dataset.requestFilter],value=button.dataset.value;if(set.has(value))set.delete(value);else set.add(value);button.classList.toggle('active',set.has(value));renderFiltered();});
document.querySelector('[data-request-clear]')?.addEventListener('click',()=>{if(searchInput)searchInput.value='';searchState.category='';Object.values(searchState).filter(value=>value instanceof Set).forEach(value=>value.clear());renderSearchOptions();renderFiltered();});render();
}
boot().catch(error=>{console.error(error);document.querySelector('[data-request-grid]')?.replaceChildren(Object.assign(document.createElement('p'),{textContent:'攻略依頼を読み込めませんでした。'}));});
})();
