(() => {
  'use strict';
  const client = window.limbusSupabase;
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  const themePackDataPromise=fetch('data/packs.json').then(r=>r.ok?r.json():null).catch(()=>null);
  const normalizeThemePackKey=value=>String(value??'').normalize('NFKC').replace(/[\s・･,，、.。:：／/\\\-_―—–]/g,'').toLowerCase();
  function levenshteinDistance(a,b){const x=[...a],y=[...b],row=Array.from({length:y.length+1},(_,i)=>i);for(let i=1;i<=x.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=y.length;j++){const tmp=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(x[i-1]===y[j-1]?0:1));prev=tmp;}}return row[y.length];}
  async function canonicalThemePackNames(){const data=await themePackDataPromise;const names=[];Object.values(data?.modes||{}).forEach(mode=>Object.values(mode?.floors||{}).forEach(list=>(list||[]).forEach(name=>{if(name&&!names.includes(name))names.push(name);})));return names;}
  async function normalizeThemePackName(value){
    const original=String(value??'').trim();if(!original||original==='自由枠')return original;
    const names=await canonicalThemePackNames();if(!names.length||names.includes(original))return original;
    const key=normalizeThemePackKey(original);const exact=names.find(name=>normalizeThemePackKey(name)===key);if(exact)return exact;
    let best=null,bestDistance=Infinity,ties=0;for(const candidate of names){const d=levenshteinDistance(key,normalizeThemePackKey(candidate));if(d<bestDistance){best=candidate;bestDistance=d;ties=1;}else if(d===bestDistance)ties++;}
    const maxDistance=key.length>=12?2:1;return best&&ties===1&&bestDistance<=maxDistance?best:original;
  }
  async function normalizePostThemePacks(post){
    if(!post?.content||!Array.isArray(post.content.themePacks))return post;
    const themePacks=await Promise.all(post.content.themePacks.map(async item=>({...item,name:await normalizeThemePackName(item?.name)})));
    return {...post,content:{...post.content,themePacks}};
  }

  async function sessionUser(){
    if(!client) return null;
    const {data,error}=await client.auth.getSession();
    if(error){ console.error('Session read failed:', error); return null; }
    return data.session?.user || null;
  }

  async function getProfile(id){
    if(!client || !id) return {id,display_name:'投稿者',avatar_url:'logo-mark.svg'};
    const {data,error}=await client.from('profiles').select('id,display_name,avatar_url,bio,role').eq('id',id).maybeSingle();
    if(error) console.error('Profile read failed:', error);
    return data || {id,display_name:'投稿者',avatar_url:'logo-mark.svg',role:'user'};
  }

  async function getCloudPost(id){
    if(!client || !id) return null;
    const {data,error}=await client.from('posts').select('*').eq('id',id).maybeSingle();
    if(error){ console.error('Post read failed:', error); return null; }
    return data ? await normalizePostThemePacks(data) : null;
  }

  async function getPublishedPosts({limit=50}={}){
    if(!client) throw new Error('Supabase接続設定を読み込めませんでした。');
    const safeLimit=Math.min(Math.max(Number(limit)||50,1),100);
    const {data,error}=await client.from('posts')
      .select('id,author_id,title,summary,category,difficulty,strategy_type,status,content,views,likes,published_at,created_at,updated_at')
      .eq('status','published')
      .order('published_at',{ascending:false})
      .limit(safeLimit);
    if(error) throw error;
    return await Promise.all((data || []).map(normalizePostThemePacks));
  }

  function authorMarkup(profile, compact=false){
    const name=profile?.display_name||'投稿者';
    const avatar=profile?.avatar_url||'logo-mark.svg';
    const href=profile?.id ? `profile.html?id=${encodeURIComponent(profile.id)}` : '#';
    const adminBadge=profile?.role==='admin'?'<span class="admin-badge" title="サイト管理者">🛡️ 管理者</span>':'';
    return `<a class="post-author${compact?' is-compact':''}" href="${href}" ${href==='#'?'aria-disabled="true"':''}><img src="${esc(avatar)}" alt="" referrerpolicy="no-referrer"><span><small>投稿者</small><span class="post-author-name-row"><strong>${esc(name)}</strong>${adminBadge}</span></span></a>`;
  }

  async function isBookmarked(postKey){
    const user=await sessionUser();
    if(!user || !client) return false;
    const {data,error}=await client.from('bookmarks').select('post_key').eq('user_id',user.id).eq('post_key',String(postKey)).maybeSingle();
    if(error){ console.error('Bookmark read failed:', error); return false; }
    return !!data;
  }

  async function setBookmark(postKey, saved){
    const user=await sessionUser();
    if(!user || !client) throw new Error('login-required');
    if(saved){
      const {data:post,error:postError}=await client.from('posts').select('author_id').eq('id',String(postKey)).maybeSingle();
      if(postError) throw postError;
      if(post?.author_id===user.id) throw new Error('own-post-bookmark');
    }
    const query=saved
      ? client.from('bookmarks').upsert({user_id:user.id,post_key:String(postKey)},{onConflict:'user_id,post_key'})
      : client.from('bookmarks').delete().eq('user_id',user.id).eq('post_key',String(postKey));
    const {error}=await query;
    if(error) throw error;
  }


  async function isLiked(postId){
    const user=await sessionUser();
    if(!user || !client) return false;
    const {data,error}=await client.from('post_likes').select('post_id').eq('user_id',user.id).eq('post_id',String(postId)).maybeSingle();
    if(error){ console.error('Like read failed:',error); return false; }
    return !!data;
  }

  async function setLike(postId,liked){
    const user=await sessionUser();
    if(!user || !client) throw new Error('login-required');
    const query=liked
      ? client.from('post_likes').upsert({user_id:user.id,post_id:String(postId)},{onConflict:'user_id,post_id'})
      : client.from('post_likes').delete().eq('user_id',user.id).eq('post_id',String(postId));
    const {error}=await query;
    if(error) throw error;
    const {data,error:countError}=await client.from('posts').select('likes').eq('id',String(postId)).single();
    if(countError) throw countError;
    return Number(data?.likes||0);
  }

  async function getFollowState(profileId){
    const user=await sessionUser();
    if(!client||!profileId)return {following:false,followingCount:0,followerCount:0};
    const [{count:followingCount},{count:followerCount},{data:row}]=await Promise.all([
      client.from('follows').select('*',{count:'exact',head:true}).eq('follower_id',profileId),
      client.from('follows').select('*',{count:'exact',head:true}).eq('followed_id',profileId),
      user?client.from('follows').select('followed_id').eq('follower_id',user.id).eq('followed_id',profileId).maybeSingle():Promise.resolve({data:null})
    ]);
    return {following:!!row,followingCount:followingCount||0,followerCount:followerCount||0};
  }

  async function setFollow(profileId,follow){
    const user=await sessionUser();
    if(!user||!client)throw new Error('login-required');
    if(user.id===profileId)throw new Error('self-follow');
    const query=follow?client.from('follows').upsert({follower_id:user.id,followed_id:profileId},{onConflict:'follower_id,followed_id'}):client.from('follows').delete().eq('follower_id',user.id).eq('followed_id',profileId);
    const {error}=await query;if(error)throw error;
  }


  async function submitReport(postId, reason, details=''){
    const user=await sessionUser();
    if(!user||!client) throw new Error('login-required');
    const post=await getCloudPost(postId);
    if(!post) throw new Error('post-not-found');
    if(post.author_id===user.id) throw new Error('own-post-report');
    const payload={reporter_id:user.id,post_id:String(post.id),reported_user_id:post.author_id,reason:String(reason||'other'),details:String(details||'').trim()||null};
    const {error}=await client.from('reports').insert(payload);
    if(error){
      if(error.code==='23505') throw new Error('already-reported');
      throw error;
    }
    return true;
  }

  async function getCurrentProfile(){
    const user=await sessionUser();
    if(!user)return null;
    return getProfile(user.id);
  }

  async function registerPostView(postId){
    if(!client || !postId) return null;
    const key=`limbus-post-viewed:${String(postId)}`;
    if(sessionStorage.getItem(key)==='1'){
      const current=await getCloudPost(postId);
      return Number(current?.views||0);
    }
    const {data,error}=await client.rpc('register_post_view',{target_post_id:String(postId)});
    if(error){console.error('Post view count failed:',error);return null;}
    sessionStorage.setItem(key,'1');
    return Number(data||0);
  }

  async function registerVisit(){
    if(!client) return null;
    const storageKey='limbus-visitor-id';
    let visitorId=localStorage.getItem(storageKey);
    if(!visitorId){visitorId=crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`;localStorage.setItem(storageKey,visitorId);}
    const {data,error}=await client.rpc('register_site_visit',{visitor_key:visitorId});
    if(error){console.error('Visit count failed:',error);return null;}
    return Number(data);
  }

  async function migrateLocalBookmarks(){
    const user=await sessionUser();
    if(!user||!client)return;
    const keys=Object.keys(localStorage)
      .filter(k=>k.startsWith('limbus-bookmark:')&&localStorage.getItem(k)==='1')
      .map(k=>k.slice('limbus-bookmark:'.length))
      .filter(k=>!k.startsWith('post-'));
    if(!keys.length)return;
    const {error}=await client.from('bookmarks').upsert(keys.map(post_key=>({user_id:user.id,post_key})),{onConflict:'user_id,post_key'});
    if(!error) keys.forEach(key=>localStorage.removeItem(`limbus-bookmark:${key}`));
  }

  window.LimbusCommunity={client,esc,getProfile,getCloudPost,getPublishedPosts,normalizeThemePackName,authorMarkup,isBookmarked,setBookmark,isLiked,setLike,getFollowState,setFollow,submitReport,getCurrentProfile,registerPostView,registerVisit,migrateLocalBookmarks,sessionUser};
  window.addEventListener('limbus-auth-changed',e=>{if(e.detail.user)migrateLocalBookmarks();});
})();
