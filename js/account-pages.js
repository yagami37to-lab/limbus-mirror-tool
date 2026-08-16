(() => {
  'use strict';
  const client=window.limbusSupabase, api=window.LimbusCommunity;
  const qs=(s,r=document)=>r.querySelector(s), qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const page=document.body.dataset.accountPage||'dashboard'; let user=null,profile=null,cloudPosts=[];
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fallbackName=u=>u?.user_metadata?.full_name||u?.user_metadata?.name||u?.email?.split('@')[0]||'ユーザー';
  const fallbackAvatar=u=>u?.user_metadata?.avatar_url||u?.user_metadata?.picture||'logo-mark.svg';
  const show=(s,v=true)=>qsa(s).forEach(el=>el.hidden=!v);
  function notice(text,state='info'){const el=qs('[data-account-notice]');if(!el)return;el.textContent=text;el.dataset.state=state;el.hidden=!text;}
  function applyTheme(v){document.documentElement.dataset.theme=v;localStorage.setItem('limbus-theme',v);const sel=qs('[data-theme-select]');if(sel)sel.value=v;qsa('[data-account-theme-toggle]').forEach(btn=>{const dark=v==='dark';btn.setAttribute('aria-pressed',String(dark));btn.setAttribute('aria-label',dark?'ライトモードに切り替える':'ダークモードに切り替える');});}
  async function bookmarkKeys(){if(!client||!user)return[];const {data}=await client.from('bookmarks').select('post_key').eq('user_id',user.id);return(data||[]).map(x=>x.post_key);}
  function calculateRank({postCount=0,likeCount=0,followerCount=0}={}){
    // v1.0.6では初心者固定。将来は3指標の条件をここへ追加する。
    void postCount; void likeCount; void followerCount;
    return '初心者';
  }
  async function followCounts(){
    if(!client||!user)return{following:0,followers:0};
    const [{count:following},{count:followers}]=await Promise.all([
      client.from('follows').select('*',{count:'exact',head:true}).eq('follower_id',user.id),
      client.from('follows').select('*',{count:'exact',head:true}).eq('followed_id',user.id)
    ]);
    return{following:following||0,followers:followers||0};
  }
  async function renderAdminSiteStats(){
    const panel=qs('[data-admin-site-panel]');
    if(!panel||profile?.role!=='admin')return;
    panel.hidden=false;
    const set=(selector,value)=>{const node=qs(selector,panel);if(node)node.textContent=Number.isFinite(value)?Number(value).toLocaleString('ja-JP'):'—';};
    set('[data-admin-strategy-count]',NaN);set('[data-admin-visit-count]',NaN);set('[data-admin-like-count]',NaN);set('[data-admin-user-count]',NaN);
    try{
      const [postsResult,likesResult,usersResult,visits]=await Promise.all([
        client.from('posts').select('id',{count:'exact',head:true}).eq('status','published'),
        client.from('post_likes').select('*',{count:'exact',head:true}),
        client.from('profiles').select('id',{count:'exact',head:true}),
        window.LimbusCommunity?.registerVisit()
      ]);
      if(postsResult.error)throw postsResult.error;
      set('[data-admin-strategy-count]',postsResult.count||0);
      set('[data-admin-like-count]',likesResult.error?NaN:(likesResult.count||0));
      set('[data-admin-user-count]',usersResult.error?NaN:(usersResult.count||0));
      set('[data-admin-visit-count]',Number(visits));
    }catch(error){console.warn('管理者統計を読み込めませんでした。',error);notice('サイト統計の一部を読み込めませんでした。','error');}
  }
  function fillIdentity({bookmarkCount=0,postCount=0,likeCount=0,followingCount=0,followerCount=0}={}){
    qsa('[data-account-name]').forEach(el=>el.textContent=profile?.display_name||fallbackName(user));
    qsa('[data-account-email]').forEach(el=>el.textContent=user?.email||'');
    qsa('[data-account-avatar]').forEach(el=>el.src=profile?.avatar_url||fallbackAvatar(user));
    qsa('[data-account-bio]').forEach(el=>el.textContent=profile?.bio||'自己紹介はまだ設定されていません。');
    qsa('[data-account-bookmark-count]').forEach(el=>el.textContent=bookmarkCount);
    qsa('[data-account-post-count]').forEach(el=>el.textContent=postCount);
    qsa('[data-account-like-count]').forEach(el=>el.textContent=likeCount);
    qsa('[data-account-following-count]').forEach(el=>el.textContent=followingCount);
    qsa('[data-account-follower-count]').forEach(el=>el.textContent=followerCount);
    const rank=calculateRank({postCount,likeCount,followerCount});
    qsa('[data-account-rank]').forEach(el=>el.textContent=`🏅 ${rank}`);qsa('[data-account-admin]').forEach(el=>{el.hidden=profile?.role!=='admin';});qsa('[data-admin-moderation-link]').forEach(el=>{el.hidden=profile?.role!=='admin';});
  }
  async function loadProfile(){const {data}=await client.from('profiles').select('display_name,avatar_url,bio,role').eq('id',user.id).maybeSingle();profile=data||null;}
  async function loadPosts(){const {data,error}=await client.from('posts').select('*').eq('author_id',user.id).order('updated_at',{ascending:false});if(error)throw error;cloudPosts=data||[];}
  function normalizeCloud(p){const c=p.content||{};return{id:p.id,author_id:p.author_id,title:p.title,summary:p.summary,category:p.category,difficulty:p.difficulty,type:p.strategy_type,status:p.status,published:p.published_at||p.created_at,updated:p.updated_at,views:p.views||0,likes:p.likes||0,bookmark_count:p.bookmark_count||0,...c};}
  async function renderBookmarks(){
    const list=qs('[data-bookmark-list]');if(!list)return;const keys=await bookmarkKeys();const cloudAll=await api.getPublishedPosts();
    const merged=cloudAll.map(normalizeCloud).filter(p=>keys.includes(String(p.id)));
    const validKeys=new Set(merged.map(p=>String(p.id)));const staleKeys=keys.filter(key=>!validKeys.has(String(key)));if(staleKeys.length)await client.from('bookmarks').delete().eq('user_id',user.id).in('post_key',staleKeys);
    qs('[data-bookmark-total]').textContent=merged.length;qs('[data-bookmark-empty]').hidden=merged.length>0;
    const dateText=value=>value?new Date(value).toLocaleDateString('ja-JP'):'未設定';
    const normalizeLegacyIdentityName=value=>window.LimbusIdentityImages?.normalize?.(String(value??'').replace(/蜘蛛の巣 (薬指|親指|中指|小指)の子分/g,'蜘蛛の巣 $1の子方'))||String(value??'');
    const cards=await Promise.all(merged.map(async p=>{
      const profile=await api.getProfile(p.author_id);const keywords=Array.isArray(p.keywords)?p.keywords:[];const tags=Array.isArray(p.tags)?p.tags:[];const affiliations=Array.isArray(p.affiliations)?p.affiliations:[];const party=Array.isArray(p.party)?p.party:[];
      return `<article class="post-card post-card-rich bookmark-normal-card" data-post-id="${esc(p.id)}" data-title="${esc(p.title||'')}" data-views="${Number(p.views||0)}" data-popular="${Number(p.likes||0)}" data-identities="${esc(party.map(x=>x.sinner).join(' '))}" data-tags="${esc([...keywords,...tags,...affiliations,p.type,p.difficulty].filter(Boolean).join(' '))}"><div class="post-card-head"><div class="browse-primary-badges"><span class="difficulty-badge browse-difficulty" data-difficulty="${esc(p.difficulty||'')}">${esc(p.difficulty==='HARD'?'ハード':p.difficulty==='NORMAL'?'ノーマル':p.difficulty||'未設定')}</span><span class="strategy-type-badge browse-type">${esc(p.type||'攻略')}</span></div><div class="browse-card-head-actions"><span class="browse-category-badge">鏡ダンジョン</span></div></div><h3>${esc(p.title)}</h3>${api.authorMarkup(profile,true)}<p class="post-card-summary">${esc(p.summary||'')}</p><div class="post-card-label">キーワード</div><div class="browse-keyword-row">${keywords.length?keywords.map(k=>`<span class="party-keyword-chip browse-keyword-chip" data-keyword="${esc(k)}"><b>${esc(k)}</b></span>`).join(''):'<span class="filter-empty">未設定</span>'}</div><div class="post-card-label">使用人格 <small>編成順</small></div><div class="browse-identity-scroll">${party.length?party.slice(0,7).map(x=>{const image=window.LimbusIdentityImages?.forIdentity?.(x.sinner,x.identity,{free:!!x.is_free});return `<div class="browse-identity-card${image?' has-identity-image':''}"${image?` data-identity-image="${esc(image)}" style="background-image:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.88)),url('${esc(image)}')"`:''}><span class="browse-order">${String(x.order||'--').padStart(2,'0')}</span><strong>${esc(x.sinner)}</strong><small>${esc(normalizeLegacyIdentityName(x.identity))}</small></div>`;}).join(''):'<span class="filter-empty">未設定</span>'}</div><div class="post-card-label">攻略タグ</div><div class="browse-strategy-row">${tags.length?tags.map(t=>`<span class="browse-strategy-tag">${esc(t)}</span>`).join(''):'<span class="filter-empty">未設定</span>'}</div><div class="post-bottom"><span class="post-stat view-stat">${Number(p.views||0).toLocaleString('ja-JP')}</span><span class="post-stat like-stat"><button type="button" class="bookmark-button" aria-label="この攻略にいいねする"></button><span class="like-count">${Number(p.likes||0).toLocaleString('ja-JP')}</span></span><span>更新 ${dateText(p.updated)}</span></div><div class="post-card-detail-actions"><button type="button" class="post-save-button is-saved" data-remove-bookmark="${esc(p.id)}"><span>🔖</span><span class="post-save-label">保存済み</span></button><a class="post-detail-link" href="post-detail.html?id=${encodeURIComponent(p.id)}&from=bookmarks">詳細へ →</a></div></article>`;
    }));
    list.innerHTML=cards.join('');
    qsa('.post-card-rich',list).forEach((card,index)=>{const total=Number(merged[index]?.bookmark_count||0);card.dataset.bookmarks=String(total);const bottom=card.querySelector('.post-bottom');const date=bottom?.lastElementChild;if(bottom&&date){const stat=document.createElement('span');stat.className='post-stat bookmark-stat';stat.innerHTML=`<span aria-hidden="true">🔖</span><span class="bookmark-count">${total.toLocaleString('ja-JP')}</span>`;bottom.insertBefore(stat,date);}});
    qsa('[data-remove-bookmark]',list).forEach(btn=>btn.onclick=async()=>{await api.setBookmark(btn.dataset.removeBookmark,false);notice('ブックマークを解除しました。','success');await renderBookmarks();fillIdentity({bookmarkCount:(await bookmarkKeys()).length,postCount:cloudPosts.length,likeCount:cloudPosts.reduce((sum,p)=>sum+Number(p.likes||0),0)});});
    window.dispatchEvent(new CustomEvent('limbus-posts-loaded',{detail:{count:merged.length,source:'bookmarks'}}));
  }
  function renderMyPosts(){
    const list=qs('[data-my-posts-list]');const empty=qs('[data-my-posts-empty]');const count=qs('[data-my-posts-total]');if(count)count.textContent=cloudPosts.length;if(empty)empty.hidden=cloudPosts.length>0;if(!list)return;
    list.innerHTML=cloudPosts.map(p=>`<article class="account-post-card ${p.status==='draft'?'is-draft':''}"><div><div class="account-post-meta"><span class="account-status-badge" data-status="${esc(p.status)}">${p.status==='published'?'公開中':p.status==='private'?'非公開':'下書き'}</span><span>更新 ${new Date(p.updated_at).toLocaleDateString('ja-JP')}</span></div><h3>${esc(p.title)}</h3><p>${esc(p.summary||'')}</p></div><div class="account-post-actions">${p.status==='published'?`<a class="account-secondary" href="post-detail.html?id=${p.id}&from=my-posts">詳細</a>`:''}<a class="account-secondary" href="index.html?edit=${p.id}">編集</a><button class="account-secondary" data-toggle-status="${p.id}" data-current="${p.status}">${p.status==='published'?'非公開にする':'公開する'}</button><button class="account-secondary account-danger" data-delete-post="${p.id}">削除</button></div></article>`).join('');
    qsa('[data-toggle-status]',list).forEach(btn=>btn.onclick=async()=>{const next=btn.dataset.current==='published'?'private':'published';const {error}=await client.from('posts').update({status:next,published_at:next==='published'?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq('id',btn.dataset.toggleStatus).eq('author_id',user.id);if(error)return notice(error.message,'error');await loadPosts();renderMyPosts();notice(next==='published'?'投稿を公開しました。':'投稿を非公開にしました。','success');});
    qsa('[data-delete-post]',list).forEach(btn=>btn.onclick=async()=>{if(!confirm('この投稿を削除しますか？この操作は元に戻せません。'))return;const {error}=await client.from('posts').delete().eq('id',btn.dataset.deletePost).eq('author_id',user.id);if(error)return notice(error.message,'error');await loadPosts();renderMyPosts();notice('投稿を削除しました。','success');});
  }
  const LOCAL_DRAFT_KEY='limbus-post-save-slots-v1', LOCAL_DRAFT_LIMIT=5;
  function readLocalDrafts(){try{const value=JSON.parse(localStorage.getItem(LOCAL_DRAFT_KEY)||'[]');return Array.isArray(value)?value.slice(0,LOCAL_DRAFT_LIMIT):[]}catch{return[]}}
  function writeLocalDrafts(items){localStorage.setItem(LOCAL_DRAFT_KEY,JSON.stringify(items.slice(0,LOCAL_DRAFT_LIMIT)));}
  function draftDate(value){try{return new Intl.DateTimeFormat('ja-JP',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}catch{return value||''}}
  function draftProgress(draft){const state=draft?.state||{},payload=state.payload||{},content=payload.content||{};const party=Array.isArray(content.party)?content.party.length:(state.identityOrder||[]).length;const step=Math.min(7,Math.max(1,Number(state.step)||1));return `ステップ ${step}/7・使用人格 ${party}名`;}
  function renderDrafts(){
    const list=qs('[data-draft-list]'),empty=qs('[data-draft-empty]'),total=qs('[data-draft-total]');if(!list)return;
    const drafts=readLocalDrafts();if(total)total.textContent=drafts.length;if(empty)empty.hidden=drafts.length>0;
    list.innerHTML=drafts.map((draft,index)=>`<article class="account-post-card account-draft-card"><div class="account-post-copy"><div class="account-post-meta"><span>SLOT ${index+1}</span><span>${esc(draftProgress(draft))}</span></div><h3>${esc(draft.name||'無題のセーブデータ')}</h3><p>最終保存：${esc(draftDate(draft.updatedAt))}</p></div><div class="account-post-actions"><a class="account-primary" href="index.html?draft=${encodeURIComponent(draft.id)}">編集を再開</a><button class="account-secondary account-danger" data-delete-local-draft="${esc(draft.id)}">削除</button></div></article>`).join('');
    qsa('[data-delete-local-draft]',list).forEach(btn=>btn.onclick=()=>{if(!confirm('このセーブデータを削除しますか？この操作は元に戻せません。'))return;writeLocalDrafts(readLocalDrafts().filter(x=>String(x.id)!==String(btn.dataset.deleteLocalDraft)));renderDrafts();notice('セーブデータを削除しました。','success');});
  }
  function wireSettings(){const select=qs('[data-theme-select]');if(select){select.value=document.documentElement.dataset.theme||'light';select.onchange=()=>applyTheme(select.value)}qs('[data-clear-bookmarks]')?.addEventListener('click',async()=>{if(!confirm('クラウド上のブックマークをすべて解除しますか？'))return;await client.from('bookmarks').delete().eq('user_id',user.id);Object.keys(localStorage).filter(k=>k.startsWith('limbus-bookmark:')).forEach(k=>localStorage.removeItem(k));notice('ブックマークをすべて解除しました。','success');fillIdentity({bookmarkCount:0,postCount:cloudPosts.length,likeCount:cloudPosts.reduce((sum,p)=>sum+Number(p.likes||0),0)})});qs('[data-account-logout-page]')?.addEventListener('click',async()=>{await client.auth.signOut();location.href='index.html'});}
  async function init(){applyTheme(localStorage.getItem('limbus-theme')||'light');qsa('[data-account-theme-toggle]').forEach(btn=>btn.addEventListener('click',()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark')));if(!client){show('[data-account-login-required]',true);notice('Supabase接続設定を読み込めませんでした。','error');return}const {data:{session}}=await client.auth.getSession();user=session?.user||null;if(!user){show('[data-account-login-required]',true);show('[data-account-content]',false);return}show('[data-account-login-required]',false);show('[data-account-content]',true);await api.migrateLocalBookmarks();await Promise.all([loadProfile(),loadPosts()]);const [keys,follows]=await Promise.all([bookmarkKeys(),followCounts()]);fillIdentity({bookmarkCount:keys.length,postCount:cloudPosts.length,likeCount:cloudPosts.reduce((sum,p)=>sum+Number(p.likes||0),0),followingCount:follows.following,followerCount:follows.followers});if(page==='dashboard'&&profile?.role==='admin'){await renderAdminSiteStats();qs('[data-admin-stats-refresh]')?.addEventListener('click',renderAdminSiteStats);}if(page==='bookmarks')await renderBookmarks();if(page==='posts')renderMyPosts();if(page==='drafts')renderDrafts();if(page==='settings')wireSettings();}
  init();
})();
