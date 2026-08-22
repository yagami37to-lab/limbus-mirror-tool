const SUPABASE_URL='https://lsmrljocxajtulkfvyra.supabase.co';
const SUPABASE_KEY='sb_publishable_BOHmCk4rY4AQtIirTWDbNQ_VG59p_6D';

export const CATEGORY_LABELS={mirror_dungeon:'鏡ダンジョン',mirror_railway:'鏡屈折鉄道',projection_combat:'射影戦闘',luxcavation:'採光',story:'ストーリー'};
export const SINNER_ORDER=['イサン','ファウスト','ドンキホーテ','良秀','ムルソー','ホンル','ヒースクリフ','イシュメール','ロージャ','シンクレア','ウーティス','グレゴール'];
export const SINNER_DIRS={'イサン':'yi-sang','ファウスト':'faust','ドンキホーテ':'don-quixote','良秀':'ryoshu','ムルソー':'meursault','ホンル':'hong-lu','ヒースクリフ':'heathcliff','イシュメール':'ishmael','ロージャ':'rodion','シンクレア':'sinclair','ウーティス':'outis','グレゴール':'gregor'};

const apiHeaders={apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`};
export const htmlEscape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const plain=value=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();

export async function fetchPost(id){
  const url=new URL(`${SUPABASE_URL}/rest/v1/posts`);
  url.searchParams.set('id',`eq.${id}`);url.searchParams.set('select','id,title,summary,category,difficulty,strategy_type,author_id,content,updated_at,published_at,status');url.searchParams.set('limit','1');
  const response=await fetch(url,{headers:apiHeaders});
  if(!response.ok)throw new Error(`post:${response.status}`);
  const [post]=await response.json();
  return post?.status==='published'?post:null;
}

export async function fetchProfile(id){
  if(!id)return null;
  const url=new URL(`${SUPABASE_URL}/rest/v1/profiles`);
  url.searchParams.set('id',`eq.${id}`);url.searchParams.set('select','display_name,role');url.searchParams.set('limit','1');
  const response=await fetch(url,{headers:apiHeaders});
  if(!response.ok)return null;
  return (await response.json())[0]||null;
}

export async function identityImageMap(origin){
  const response=await fetch(`${origin}/data/identities.json`,{cf:{cacheTtl:86400,cacheEverything:true}});
  if(!response.ok)return new Map();
  const groups=await response.json(),map=new Map();
  for(const group of groups){
    const dir=SINNER_DIRS[group.name];if(!dir)continue;
    (group.identities||[]).forEach((identity,index)=>{
      const asset=`${origin}/assets/identities/${dir}/${String(index+1).padStart(3,'0')}.png`;
      map.set(`${group.name}\u0000${identity.name}`,asset);
      if(identity.name==='LCB囚人')map.set(`${group.name}\u0000自由枠`,asset);
    });
  }
  return map;
}

export function selectedIdentities(post){
  const content=post?.content||{},source=(content.selectedIdentities||[]).length?content.selectedIdentities:(content.party||[]);
  const rank=new Map(SINNER_ORDER.map((name,index)=>[name,index]));
  return [...source].sort((a,b)=>(rank.get(a.sinner)??99)-(rank.get(b.sinner)??99)).slice(0,12);
}

export function postMeta(post,profile){
  const content=post.content||{},category=CATEGORY_LABELS[post.category]||post.category||'攻略投稿';
  const difficulty=post.difficulty==='HARD'?'HARD':post.difficulty==='NORMAL'?'NORMAL':plain(post.difficulty);
  const author=content.anonymousPosting?'匿名投稿者':plain(profile?.display_name)||'投稿者';
  const season=Number(content.season)||7;
  return {title:plain(post.title)||'Limbus Company 攻略',summary:plain(post.summary)||'編成・E.G.O・攻略詳細を確認できます。',category,difficulty,author,season,updated:post.updated_at||post.published_at||''};
}
