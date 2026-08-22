import {fetchPost,fetchProfile,htmlEscape,postMeta} from './_lib/og-data.js';

class HeadAppender{constructor(markup){this.markup=markup}element(element){element.append(this.markup,{html:true})}}

export async function onRequest(context){
  const url=new URL(context.request.url);
  if(!['/post-detail','/post-detail.html'].includes(url.pathname)||context.request.method!=='GET')return context.next();
  const id=url.searchParams.get('id');if(!id)return context.next();
  try{
    const post=await fetchPost(id);if(!post)return context.next();
    const profile=await fetchProfile(post.author_id),meta=postMeta(post,profile),origin=url.origin;
    const canonical=`${origin}/post-detail?id=${encodeURIComponent(post.id)}`;
    const ogImage=`${origin}/og/${encodeURIComponent(post.id)}?v=${encodeURIComponent(meta.updated)}`;
    const title=`${meta.title}｜Limbus Company 攻略`;
    const description=`【${meta.category}${meta.difficulty?`｜${meta.difficulty}`:''}】${meta.summary}`.slice(0,180);
    const markup=`<link rel="canonical" href="${htmlEscape(canonical)}"><meta property="og:type" content="article"><meta property="og:site_name" content="Limbus Company 攻略投稿サイト"><meta property="og:locale" content="ja_JP"><meta property="og:title" content="${htmlEscape(title)}"><meta property="og:description" content="${htmlEscape(description)}"><meta property="og:url" content="${htmlEscape(canonical)}"><meta property="og:image" content="${htmlEscape(ogImage)}"><meta property="og:image:secure_url" content="${htmlEscape(ogImage)}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${htmlEscape(meta.title)}の12人格編成"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${htmlEscape(title)}"><meta name="twitter:description" content="${htmlEscape(description)}"><meta name="twitter:image" content="${htmlEscape(ogImage)}">`;
    const response=await context.next();
    return new HTMLRewriter().on('head',new HeadAppender(markup)).transform(response);
  }catch(error){console.error('OG metadata injection failed',error);return context.next();}
}
