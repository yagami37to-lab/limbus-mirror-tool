(()=>{
'use strict';

// 管理者おすすめは閲覧画面の投稿カードを唯一の情報源として自動生成する。
// 投稿側の情報を更新すると、人格・タグ・閲覧数・いいね数・評価もおすすめ欄へ同期される。
const featuredDefinitions=[
  {id:'recent',label:'最近の投稿',kicker:'NEW ARRIVAL',note:'新しく投稿された攻略です。最近追加された編成や考え方を早めに確認できます。'},
  {id:'today-rating',label:'今日の高評価投稿',kicker:"TODAY'S PICK",note:'本日投稿された攻略のうち、評価点が最も高い記事です。'},
  {id:'most-liked',label:'最高いいね',kicker:'MOST LIKED',note:'現在もっとも多くのいいねを集めている攻略です。'},
  {id:'most-viewed',label:'最高閲覧',kicker:'MOST VIEWED',note:'現在もっとも多く閲覧されている攻略です。'}
];
const numericData=(card,key)=>Number(card.dataset[key]||0)||0;
const publishedTime=card=>Date.parse(card.dataset.published||'')||0;
function selectFeaturedSource(definition,cards){
  const sorted=[...cards];
  if(definition.id==='recent')return sorted.sort((a,b)=>publishedTime(b)-publishedTime(a))[0];
  if(definition.id==='today-rating'){
    const now=new Date();
    const today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
    const todays=sorted.filter(card=>(card.dataset.published||'').startsWith(today));
    return (todays.length?todays:sorted).sort((a,b)=>numericData(b,'rating')-numericData(a,'rating'))[0];
  }
  if(definition.id==='most-liked')return sorted.sort((a,b)=>numericData(b,'popular')-numericData(a,'popular'))[0];
  return sorted.sort((a,b)=>numericData(b,'views')-numericData(a,'views'))[0];
}
function createFeaturedRecommendation(definition,source){
  const article=document.createElement('article');
  article.className='featured-card featured-editor-card';
  article.dataset.featuredKind=definition.id;
  if(!source){
    article.innerHTML='<p class="featured-post-fallback">条件に一致する投稿がありません。</p>';
    return article;
  }
  const copy=source.cloneNode(true);
  copy.removeAttribute('hidden');
  copy.classList.add('featured-post-copy');
  copy.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
  // 元カード上で再生中だった一時的なハート演出を複製しない。
  copy.querySelectorAll('.like-feedback-layer,.heart-spark,.like-plus-one,.like-particle').forEach(node=>node.remove());
  copy.querySelectorAll('.bookmark-button').forEach(button=>button.classList.remove('is-animating','is-unliking','is-popping'));
  // トップのおすすめは詳細カードではなく概要として見せるため、人格は最大4件に絞る。
  const identityRoot=copy.querySelector('.browse-identity-scroll');
  if(identityRoot){
    const identityCards=[...identityRoot.querySelectorAll('.browse-identity-card')];
    if(identityCards.length>4){
      identityCards.slice(4).forEach(card=>card.remove());
      const more=document.createElement('span');
      more.className='featured-more-identities';
      more.textContent=`ほか ${identityCards.length-4} 人`;
      identityRoot.appendChild(more);
    }
  }
  // おすすめ欄でも通常投稿カードと同じいいね表示・処理を使う。
  // cloneNodeではイベントが複製されないため、いいねはbrowse-cards.jsで再初期化し、
  // ブックマークは元カードの処理へ接続して状態を同期する。
  copy.querySelectorAll('.bookmark-button').forEach(button=>button.removeAttribute('data-like-ready'));
  const sourceSave=source.querySelector('.post-save-button');
  const copySave=copy.querySelector('.post-save-button');
  if(sourceSave&&copySave){
    const syncSaveState=()=>{
      copySave.className=sourceSave.className;
      copySave.disabled=sourceSave.disabled;
      copySave.title=sourceSave.title;
      copySave.setAttribute('aria-pressed',sourceSave.getAttribute('aria-pressed')||'false');
      const sourceLabel=sourceSave.querySelector('.post-save-label');
      const copyLabel=copySave.querySelector('.post-save-label');
      if(sourceLabel&&copyLabel)copyLabel.textContent=sourceLabel.textContent;
    };
    syncSaveState();
    copySave.addEventListener('click',event=>{
      event.preventDefault();event.stopPropagation();
      sourceSave.click();
      window.setTimeout(syncSaveState,0);
      window.setTimeout(syncSaveState,350);
    });
    new MutationObserver(syncSaveState).observe(sourceSave,{attributes:true,subtree:true,childList:true,characterData:true});
  }
  const panel=document.createElement('aside');
  panel.className='featured-editor-panel';
  panel.setAttribute('aria-label',`${definition.label}の選定理由`);
  panel.innerHTML=`
    <div class="featured-editor-heading">
      <span class="featured-editor-kicker">${definition.kicker}</span>
      <strong class="featured-editor-condition">${definition.label}</strong>
    </div>
    <div class="featured-editor-note"><strong>おすすめ理由</strong><p>${definition.note}</p></div>`;
  const slot=document.createElement('div');
  slot.className='featured-post-slot';
  slot.appendChild(copy);
  article.append(panel,slot);
  return article;
}
let featuredCarouselIndex=0;
let featuredCarouselTimer=null;
function stopFeaturedCarousel(){if(featuredCarouselTimer){clearInterval(featuredCarouselTimer);featuredCarouselTimer=null;}}
function updateFeaturedCarousel(index,{restart=true}={}){
  const track=document.querySelector('[data-featured-list]');
  const dots=document.querySelector('[data-featured-dots]');
  if(!track)return;
  const slides=[...track.children];
  if(!slides.length)return;
  const previousIndex=featuredCarouselIndex;
  featuredCarouselIndex=((index%slides.length)+slides.length)%slides.length;
  const previousTransform=`translateX(-${previousIndex*100}%)`;
  const nextTransform=`translateX(-${featuredCarouselIndex*100}%)`;
  track.getAnimations().forEach(animation=>animation.cancel());
  track.style.transform=nextTransform;
  if(previousIndex!==featuredCarouselIndex){
    track.animate(
      [{transform:previousTransform},{transform:nextTransform}],
      {duration:720,easing:'cubic-bezier(.22,.61,.36,1)'}
    );
  }
  const viewport=document.querySelector('[data-featured-carousel-viewport]');
  slides.forEach((slide,i)=>{
    const active=i===featuredCarouselIndex;
    slide.setAttribute('aria-hidden',String(!active));
    slide.classList.toggle('is-active',active);
    if(active && viewport){
      if(previousIndex!==featuredCarouselIndex){
        slide.getAnimations().forEach(animation=>animation.cancel());
        slide.animate(
          [{opacity:.25,transform:'translateX(28px)'},{opacity:1,transform:'translateX(0)'}],
          {duration:620,easing:'ease-out'}
        );
      }
      requestAnimationFrame(()=>{
        const height=Math.ceil(slide.getBoundingClientRect().height);
        if(height>0) viewport.style.height=`${height}px`;
      });
    }
    if(!active){
      slide.querySelectorAll('.like-feedback-layer').forEach(layer=>{layer.classList.remove('is-playing');layer.replaceChildren();});
      slide.querySelectorAll('.bookmark-button').forEach(button=>button.classList.remove('is-animating','is-unliking','is-popping'));
    }
  });
  if(dots){[...dots.children].forEach((dot,i)=>{dot.classList.toggle('is-active',i===featuredCarouselIndex);dot.setAttribute('aria-current',i===featuredCarouselIndex?'true':'false')});}
  if(restart)startFeaturedCarousel();
}
function startFeaturedCarousel(){
  stopFeaturedCarousel();
  const track=document.querySelector('[data-featured-list]');
  if(!track||track.children.length<2)return;
  featuredCarouselTimer=setInterval(()=>updateFeaturedCarousel(featuredCarouselIndex+1,{restart:false}),6500);
}
function wireFeaturedCarousel(){
  const viewport=document.querySelector('[data-featured-carousel-viewport]');
  const track=document.querySelector('[data-featured-list]');
  const dots=document.querySelector('[data-featured-dots]');
  const prev=document.querySelector('[data-featured-prev]');
  const next=document.querySelector('[data-featured-next]');
  if(!viewport||!track||!dots||!prev||!next)return;
  const slides=[...track.children];
  dots.replaceChildren(...slides.map((_,i)=>{
    const button=document.createElement('button');button.type='button';button.className='featured-carousel-dot';button.setAttribute('aria-label',`${i+1}件目のおすすめを見る`);button.addEventListener('click',()=>updateFeaturedCarousel(i));return button;
  }));
  if(!viewport.dataset.carouselWired){
    viewport.dataset.carouselWired='1';
    prev.addEventListener('click',()=>updateFeaturedCarousel(featuredCarouselIndex-1));
    next.addEventListener('click',()=>updateFeaturedCarousel(featuredCarouselIndex+1));
    document.addEventListener('visibilitychange',()=>document.hidden?stopFeaturedCarousel():startFeaturedCarousel());
  }
  updateFeaturedCarousel(Math.min(featuredCarouselIndex,slides.length-1),{restart:false});
  startFeaturedCarousel();
}
function renderFeaturedRecommendations(){
  const list=document.querySelector('[data-featured-list]');
  if(!list)return;
  const grid=document.querySelector('[data-post-grid]');
  const cards=grid?[...grid.querySelectorAll(':scope > .post-card-rich')]:[];
  const slides=featuredDefinitions.map(definition=>createFeaturedRecommendation(definition,selectFeaturedSource(definition,cards)));
  slides.forEach(slide=>slide.classList.add('featured-carousel-slide'));
  list.replaceChildren(...slides);
  wireFeaturedCarousel();
}
renderFeaturedRecommendations();
window.addEventListener('limbus-posts-loaded',renderFeaturedRecommendations);
})();
