import {buildOgCardHtml} from '../_lib/og-card.js';
import {fetchPost,fetchProfile} from '../_lib/og-data.js';

export async function onRequestGet(context){
  const id=String(context.params.id||'');
  if(!/^[0-9a-f-]{30,40}$/i.test(id))return new Response('Not found',{status:404});
  const requestUrl=new URL(context.request.url),version=requestUrl.searchParams.get('v')||'current';
  const objectKey=`posts/${id}/${encodeURIComponent(version)}.png`,bucket=context.env.OG_IMAGES;
  if(bucket){
    const stored=await bucket.get(objectKey);
    if(stored)return new Response(stored.body,{headers:{'Content-Type':stored.httpMetadata?.contentType||'image/png','Cache-Control':'public, max-age=31536000, immutable','ETag':stored.httpEtag,'X-Content-Type-Options':'nosniff','X-OG-Storage':'r2'}});
  }
  const cache=caches.default,cached=await cache.match(context.request);if(cached)return cached;
  try{
    const post=await fetchPost(id);if(!post)return new Response('Not found',{status:404});
    if(!context.env.CF_ACCOUNT_ID||!context.env.CF_BROWSER_RENDERING_TOKEN)return Response.redirect(`${new URL(context.request.url).origin}/assets/site/dante-lbc.jpg`,302);
    const profile=await fetchProfile(post.author_id),origin=new URL(context.request.url).origin,html=await buildOgCardHtml(post,profile,origin);
    const apiResponse=await fetch(`https://api.cloudflare.com/client/v4/accounts/${context.env.CF_ACCOUNT_ID}/browser-rendering/screenshot`,{method:'POST',headers:{Authorization:`Bearer ${context.env.CF_BROWSER_RENDERING_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({html,viewport:{width:1200,height:630},gotoOptions:{waitUntil:'networkidle0',timeout:15000},screenshotOptions:{type:'png',clip:{x:0,y:0,width:1200,height:630}}})});
    if(!apiResponse.ok)throw new Error(`screenshot:${apiResponse.status}`);
    const image=await apiResponse.arrayBuffer();
    if(bucket)await bucket.put(objectKey,image,{httpMetadata:{contentType:'image/png',cacheControl:'public, max-age=31536000, immutable'},customMetadata:{postId:id,version,generatedAt:new Date().toISOString()}});
    const response=new Response(image,{headers:{'Content-Type':'image/png','Cache-Control':bucket?'public, max-age=31536000, immutable':'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800','X-Content-Type-Options':'nosniff','X-OG-Storage':bucket?'r2':'cache'}});
    context.waitUntil(cache.put(context.request,response.clone()));return response;
  }catch(error){console.error('OG image generation failed',error);return Response.redirect(`${new URL(context.request.url).origin}/assets/site/dante-lbc.jpg`,302);}
}
