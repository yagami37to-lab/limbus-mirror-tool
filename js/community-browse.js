(async()=>{
  'use strict';
  const api=window.LimbusCommunity;
  const grid=document.querySelector('[data-post-grid]');
  const empty=document.querySelector('[data-empty-state]');
  const count=document.querySelector('[data-result-count]');
  const loadMore=document.querySelector('[data-load-more]');
  if(!api||!grid)return;
  const esc=api.esc;
  const dateText=value=>value?new Date(value).toLocaleDateString('ja-JP'):'未設定';
  const normalizeLegacyIdentityName=value=>window.LimbusIdentityImages?.normalize?.(String(value??'').replace(/蜘蛛の巣 (薬指|親指|中指|小指)の子分/g,'蜘蛛の巣 $1の子方'))||String(value??'');

  grid.innerHTML='<p class="community-loading" data-community-loading>公開投稿を読み込んでいます…</p>';
  if(loadMore) loadMore.hidden=true;

  try{
    const [posts,siteConfig]=await Promise.all([api.getPublishedPosts({limit:50}),fetch('data/site-config.json?v=1.1.39').then(response=>response.ok?response.json():({legacyPostSeason:7})).catch(()=>({legacyPostSeason:7}))]);
    grid.innerHTML='';
    for(const p of posts){
      const c=p.content||{};
      const profile=await api.getProfile(p.author_id);
      const keywords=Array.isArray(c.keywords)?c.keywords:[];
      const tags=Array.isArray(c.tags)?c.tags:[];
      const affiliations=Array.isArray(c.affiliations)?c.affiliations:[];
      const party=Array.isArray(c.party)?c.party:[];
      const egos=Array.isArray(c.egos)?c.egos:[];
      const season=Number(c.season)||Number(siteConfig.legacyPostSeason)||7;
      if(p.category==='projection_combat'&&!p.difficulty)p.difficulty='NORMAL';
      const projectionDifficulty=p.difficulty==='HARD'?'ハード':'ノーマル';
      const modeLabel=p.category==='projection_combat'?`${c.stage||'ステージ未設定'} / ${projectionDifficulty}`:['mirror_railway','luxcavation'].includes(p.category)?(c.stage||(p.category==='luxcavation'?'採光種類未設定':'ステージ未設定')):(p.difficulty==='HARD'?'ハード':p.difficulty==='NORMAL'?'ノーマル':p.difficulty||'未設定');
      const achievementTurns=Number(c.achievementTurns)||(p.category==='projection_combat'&&p.title==='中指＋薬指ファウスト'?12:0);
      const card=document.createElement('article');
      card.className='post-card post-card-rich cloud-post-card';
      card.dataset.postId=p.id;
      card.dataset.authorId=p.author_id||'';
      card.dataset.category=p.category||'mirror_dungeon';
      card.dataset.title=p.title||'';
      card.dataset.published=p.published_at||p.created_at||'';
      card.dataset.updated=p.updated_at||'';
      card.dataset.views=String(p.views||0);
      card.dataset.popular=String(p.likes||0);
      card.dataset.bookmarks=String(p.bookmark_count||0);
      card.dataset.season=String(season);
      card.dataset.identities=party.map(x=>x.sinner).join(' ');
      card.dataset.identityDetails=party.map(x=>`${x.sinner}｜${normalizeLegacyIdentityName(x.identity)}`).join(' ');
      card.dataset.ownedRate=String(window.LimbusOwnedIdentities?.rateForParty?.(party,egos)??0);
      card.dataset.tags=[...keywords,...tags,...affiliations,p.strategy_type,p.difficulty,c.stage].filter(Boolean).join(' ');
      card.innerHTML=`<div class="post-card-head"><div class="browse-primary-badges"><span class="post-season-badge">SEASON ${season}</span><span class="difficulty-badge browse-difficulty" data-difficulty="${esc(p.difficulty||'')}">${esc(modeLabel)}</span><span class="strategy-type-badge browse-type">${esc(p.strategy_type||'攻略')}</span></div><div class="browse-card-head-actions"><span class="browse-category-badge">${esc(window.LimbusCategories?.label?.(p.category||'mirror_dungeon')||'鏡ダンジョン')}</span></div></div><h3>${esc(p.title)}</h3>${api.authorMarkup(profile,true)}<p class="post-card-summary">${esc(p.summary||'')}</p><div class="post-card-label">キーワード</div><div class="browse-keyword-row">${keywords.length?keywords.map(k=>`<span class="party-keyword-chip browse-keyword-chip" data-keyword="${esc(k)}"><b>${esc(k)}</b></span>`).join(''):'<span class="filter-empty">未設定</span>'}</div><div class="post-card-label">使用人格 <small>編成順</small></div><div class="browse-identity-scroll">${party.length?party.slice(0,7).map(x=>{const image=window.LimbusIdentityImages?.forIdentity?.(x.sinner,x.identity,{free:!!x.is_free});return `<div class="browse-identity-card${image?' has-identity-image':''}"${image?` data-identity-image="${esc(image)}" style="background-image:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.88)),url('${esc(image)}')"`:''}><span class="browse-order">${String(x.order||'--').padStart(2,'0')}</span><strong>${esc(x.sinner)}</strong><small>${esc(normalizeLegacyIdentityName(x.identity))}</small></div>`;}).join(''):'<span class="filter-empty">未設定</span>'}</div><div class="post-card-label">攻略タグ</div><div class="browse-strategy-row">${tags.length?tags.map(t=>`<span class="browse-strategy-tag">${esc(t)}</span>`).join(''):'<span class="filter-empty">未設定</span>'}</div><div class="post-bottom"><span class="post-stat view-stat">${Number(p.views||0).toLocaleString('ja-JP')}</span><span class="post-stat like-stat"><button type="button" class="bookmark-button" aria-label="この攻略にいいねする"></button><span class="like-count">${Number(p.likes||0).toLocaleString('ja-JP')}</span></span><span class="post-stat bookmark-stat"><span aria-hidden="true">🔖</span><span class="bookmark-count">${Number(p.bookmark_count||0).toLocaleString('ja-JP')}</span></span><span>更新 ${dateText(p.updated_at)}</span></div><div class="post-card-detail-actions"><button type="button" class="post-save-button"><span>🔖</span><span class="post-save-label">ブックマーク</span></button><a class="post-report-link" href="post-detail.html?id=${encodeURIComponent(p.id)}&from=posts&report=1" aria-label="${esc(p.title)}を通報する">⚑ 通報</a><a class="post-detail-link" href="post-detail.html?id=${encodeURIComponent(p.id)}&from=posts">詳細へ →</a></div>`;
      if(p.category==='projection_combat'&&achievementTurns)card.querySelector('.browse-primary-badges')?.insertAdjacentHTML('beforeend',`<span class="projection-turn-badge">${achievementTurns}ターン</span>`);
      grid.appendChild(card);
      window.LimbusOwnedIdentities?.applyCard?.(card,party,egos);
      const save=card.querySelector('.post-save-button');
      const report=card.querySelector('.post-report-link');
      const currentUser=await api.sessionUser();
      if(currentUser?.id===p.author_id){save.disabled=true;save.classList.add('is-own-post');save.title='自分の投稿はブックマークできません';save.querySelector('.post-save-label').textContent='自分の投稿';if(report)report.hidden=true;}
      const sync=async()=>{if(currentUser?.id===p.author_id)return;const on=await api.isBookmarked(p.id);save.classList.toggle('is-saved',on);save.querySelector('.post-save-label').textContent=on?'保存済み':'ブックマーク';save.setAttribute('aria-pressed',String(on));};
      await sync();
      save.onclick=async e=>{e.preventDefault();if(currentUser?.id===p.author_id)return;const user=await api.sessionUser();if(!user){window.LimbusAuth?.open();return}try{const on=await api.isBookmarked(p.id);const nextCount=await api.setBookmark(p.id,!on);document.querySelectorAll(`.post-card-rich[data-post-id="${CSS.escape(String(p.id))}"]`).forEach(item=>{item.dataset.bookmarks=String(nextCount);const node=item.querySelector('.bookmark-count');if(node)node.textContent=Number(nextCount).toLocaleString('ja-JP');});await sync();}catch(error){console.error(error);window.alert(error.message==='own-post-bookmark'?'自分の投稿はブックマークできません。':'ブックマークを更新できませんでした。');}};
    }
    if(count)count.textContent=String(posts.length);
    if(empty){empty.hidden=posts.length>0;empty.querySelector('strong').textContent='まだ公開された攻略はありません。';empty.querySelector('p').textContent='最初の攻略投稿をお待ちしています。';}
    window.dispatchEvent(new CustomEvent('limbus-posts-loaded',{detail:{count:posts.length}}));
  }catch(error){
    console.error(error);
    grid.innerHTML='';
    if(count)count.textContent='0';
    if(empty){empty.hidden=false;empty.querySelector('strong').textContent='攻略投稿を読み込めませんでした。';empty.querySelector('p').textContent='通信状態を確認して、ページを再読み込みしてください。';}
  }
})();
