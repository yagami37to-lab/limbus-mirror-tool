import {buildOgCardHtml} from '../_lib/og-card.js';
import {fetchPost,fetchProfile} from '../_lib/og-data.js';

export async function onRequestGet(context){
  const id=String(context.params.id||'');
  if(!/^[0-9a-f-]{30,40}$/i.test(id))return new Response('Not found',{status:404});
  const cache=caches.default,cached=await cache.match(context.request);if(cached)return cached;
  try{
    const post=await fetchPost(id);if(!post)return new Response('Not found',{status:404});
    if(!context.env.CF_ACCOUNT_ID||!context.env.CF_BROWSER_RENDERING_TOKEN)return Response.redirect(`${new URL(context.request.url).origin}/assets/site/dante-lbc.jpg`,302);
    const profile=await fetchProfile(post.author_id),origin=new URL(context.request.url).origin,html=await buildOgCardHtml(post,profile,origin);
    const apiResponse=await fetch(`https://api.cloudflare.com/client/v4/accounts/${context.env.CF_ACCOUNT_ID}/browser-rendering/screenshot`,{method:'POST',headers:{Authorization:`Bearer ${context.env.CF_BROWSER_RENDERING_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({html,viewport:{width:1200,height:630},gotoOptions:{waitUntil:'networkidle0',timeout:15000},screenshotOptions:{type:'png',clip:{x:0,y:0,width:1200,height:630}}})});
    if(!apiResponse.ok)throw new Error(`screenshot:${apiResponse.status}`);
    const response=new Response(apiResponse.body,{headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800','X-Content-Type-Options':'nosniff'}});
    context.waitUntil(cache.put(context.request,response.clone()));return response;
  }catch(error){console.error('OG image generation failed',error);return Response.redirect(`${new URL(context.request.url).origin}/assets/site/dante-lbc.jpg`,302);}
}
