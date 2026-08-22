(()=>{
'use strict';
let initialized=false,canvas=null,blob=null,previewUrl='';
const $=selector=>document.querySelector(selector),showToast=message=>{const toast=$('[data-toast]');if(!toast)return;toast.textContent=message;toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('show'),2800);};
const categoryLabel=post=>post.category||window.LimbusCategories?.label?.(post.categoryId)||'攻略';
const cleanDifficulty=post=>String(post.difficulty||'').replace(/ノーマル/i,'NORMAL').replace(/ハード/i,'HARD').toUpperCase();
const shareUrl=()=>{const url=new URL(location.href);url.searchParams.delete('report');url.hash='';return url.href;};
const buildText=post=>{const category=categoryLabel(post),difficulty=cleanDifficulty(post),heading=`【${[category,difficulty].filter(Boolean).join('｜')}】`,keywords=(post.keywords||[]).slice(0,3),keywordLine=keywords.length?`\n${keywords.map(value=>value==='火傷'?`🔥 ${value}`:value).join(' / ')}\n`:'';return `${heading}\n${post.title}${keywordLine}\n編成・E.G.O・攻略詳細はこちら\n#LimbusCompany #リンバスカンパニー`;};
async function generate(data){if(canvas&&blob)return {canvas,blob};const button=$('[data-share-image]'),nativeButton=$('[data-share-native]');button&&(button.disabled=true);nativeButton&&(nativeButton.disabled=true);try{canvas=await window.LimbusShareCard.create(data);blob=await window.LimbusShareCard.toBlob(canvas);if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(blob);const preview=$('[data-share-card-preview]');if(preview){preview.src=previewUrl;preview.hidden=false;}return {canvas,blob};}finally{button&&(button.disabled=false);nativeButton&&(nativeButton.disabled=false);}}
const safeName=value=>String(value||'strategy').replace(/[\\/:*?"<>|]/g,'_').slice(0,48);
async function download(data){const result=await generate(data),link=document.createElement('a');link.href=URL.createObjectURL(result.blob);link.download=`limbus-${safeName(data.post.title)}.png`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(link.href),1000);showToast('共有用の編成画像を保存しました。');}
function bind(data){if(initialized)return;initialized=true;const post=data.post,text=buildText(post),url=shareUrl();
 const intercept=(selector,handler)=>$(selector)?.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();handler(event);},true);
 intercept('[data-share-image]',()=>download(data).catch(error=>{console.error(error);showToast('共有画像を生成できませんでした。');}));
 intercept('[data-share-native]',async()=>{try{const result=await generate(data),file=new File([result.blob],`limbus-${safeName(post.title)}.png`,{type:'image/png'}),payload={title:post.title,text,url,files:[file]};if(navigator.canShare?.({files:[file]}))await navigator.share(payload);else if(navigator.share)await navigator.share({title:post.title,text,url});else{await navigator.clipboard.writeText(`${text}\n${url}`);showToast('共有文とURLをコピーしました。');}}catch(error){if(error?.name!=='AbortError'){console.error(error);showToast('端末の共有機能を使用できませんでした。');}}});
 intercept('[data-share-copy]',async()=>{await navigator.clipboard.writeText(url);showToast('URLをコピーしました。');});
 intercept('[data-share-x]',()=>window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,'_blank','noopener,noreferrer'));
 intercept('[data-share-bluesky]',()=>window.open(`https://bsky.app/intent/compose?text=${encodeURIComponent(`${text}\n${url}`)}`,'_blank','noopener,noreferrer'));
}
window.addEventListener('limbus-detail-ready',event=>bind(event.detail),{once:true});if(window.LimbusDetailShareData)bind(window.LimbusDetailShareData);
})();
