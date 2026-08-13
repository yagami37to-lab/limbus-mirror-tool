(() => {
  'use strict';

  const HEART_OUTLINE = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 20.35 10.55 19.03C5.4 14.36 2 11.28 2 7.5 2 4.42 4.42 2 7.5 2c1.74 0 3.41.81 4.5 2.09A6.02 6.02 0 0 1 16.5 2C19.58 2 22 4.42 22 7.5c0 3.78-3.4 6.86-8.55 11.54L12 20.35Z" />
    </svg>`;

  const compactNumber = (value) => {
    const number = Number(String(value).replace(/,/g, ''));
    if (!Number.isFinite(number)) return String(value);
    if (number >= 1_000_000) {
      return `${(number / 1_000_000).toFixed(number >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
    }
    if (number >= 1_000) {
      return `${(number / 1_000).toFixed(number >= 100_000 ? 0 : 1).replace(/\.0$/, '')}K`;
    }
    return number.toLocaleString('ja-JP');
  };

  const storageKeyFor = (card, index) => {
    const title = card.dataset.title || card.querySelector('h3')?.textContent || `post-${index}`;
    return `limbus-like:${title.trim()}`;
  };

  const restartClassAnimation = (element, className) => {
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
  };

  const ensureFeedbackLayer = (card) => {
    let layer = card.querySelector(':scope > .like-feedback-layer');
    if (layer) return layer;
    layer = document.createElement('span');
    layer.className = 'like-feedback-layer';
    layer.setAttribute('aria-hidden', 'true');
    card.appendChild(layer);
    return layer;
  };

  const createParticle = (x, y, delay, scale) => {
    const particle = document.createElement('span');
    particle.className = 'like-particle';
    particle.textContent = '♥';
    particle.style.setProperty('--particle-x', `${x}px`);
    particle.style.setProperty('--particle-y', `${y}px`);
    particle.style.setProperty('--particle-delay', `${delay}ms`);
    particle.style.setProperty('--particle-scale', String(scale));
    return particle;
  };

  const animateHeart = (button, liked) => {
    restartClassAnimation(button, liked ? 'is-animating' : 'is-unliking');
    window.setTimeout(() => {
      button.classList.remove('is-animating', 'is-unliking');
    }, liked ? 560 : 280);
  };

  const playLikeFeedback = (card, button) => {
    animateHeart(button, true);
    const layer = ensureFeedbackLayer(card);
    layer.replaceChildren();

    const particles = [
      [-34, 14, 0, 0.82],
      [-22, 31, 35, 1.02],
      [-6, 40, 70, 0.72],
      [-44, 37, 20, 0.92],
      [-16, 18, 90, 0.64],
      [-48, 22, 55, 0.76],
    ];
    particles.forEach((values) => layer.appendChild(createParticle(...values)));

    const plusOne = document.createElement('span');
    plusOne.className = 'like-plus-one';
    plusOne.textContent = '+1';
    layer.appendChild(plusOne);

    restartClassAnimation(layer, 'is-playing');
    window.setTimeout(() => {
      layer.classList.remove('is-playing');
      layer.replaceChildren();
    }, 900);
  };

  const initializeViewCounts = () => {
    document.querySelectorAll('.view-stat').forEach((stat) => {
      const raw = stat.dataset.rawView || stat.textContent;
      stat.dataset.rawView = String(raw).replace(/,/g, '').trim();
      stat.textContent = compactNumber(raw);
      stat.title = `${Number(stat.dataset.rawView).toLocaleString('ja-JP')} 閲覧`;
    });
  };

  const syncLikeGroup = async (postId) => {
    const api=window.LimbusCommunity;
    const liked=await api?.isLiked(postId);
    document.querySelectorAll(`.post-card-rich[data-post-id="${CSS.escape(String(postId))}"]`).forEach(card=>{
      const button=card.querySelector('.bookmark-button');
      if(!button)return;
      button.innerHTML=HEART_OUTLINE;
      button.type='button';
      button.dataset.likeReady='true';
      button.classList.toggle('is-liked',!!liked);
      button.setAttribute('aria-pressed',String(!!liked));
      button.setAttribute('aria-label',liked?'いいねを取り消す':'この攻略にいいねする');
    });
  };

  const initializeLikeButtons = async () => {
    const postIds=[...new Set([...document.querySelectorAll('.post-card-rich[data-post-id]')].map(card=>card.dataset.postId).filter(Boolean))];
    await Promise.all(postIds.map(syncLikeGroup));
  };

  // 複製されるおすすめカードにも確実に反応するよう、いいね操作はイベント委譲で一元管理する。
  document.addEventListener('click',async(event)=>{
    const button=event.target.closest?.('.bookmark-button');
    if(!button)return;
    const card=button.closest('.post-card-rich');
    const postId=card?.dataset.postId;
    if(!card||!postId)return;
    event.preventDefault();event.stopPropagation();
    const api=window.LimbusCommunity;
    const user=await api?.sessionUser();
    if(!user){window.LimbusAuth?.open();return;}
    const group=[...document.querySelectorAll(`.post-card-rich[data-post-id="${CSS.escape(String(postId))}"] .bookmark-button`)];
    group.forEach(item=>item.disabled=true);
    try{
      const liked=button.classList.contains('is-liked');
      const nextCount=await api.setLike(postId,!liked);
      document.querySelectorAll(`.post-card-rich[data-post-id="${CSS.escape(String(postId))}"]`).forEach(item=>{
        const count=item.querySelector('.like-count');
        if(count)count.textContent=Number(nextCount||0).toLocaleString('ja-JP');
        item.dataset.popular=String(nextCount||0);
      });
      await syncLikeGroup(postId);
      if(!liked)playLikeFeedback(card,button);else animateHeart(button,false);
      window.dispatchEvent(new CustomEvent('limbus-like-updated'));
    }catch(error){
      console.error(error);window.alert('いいねを更新できませんでした。');
    }finally{group.forEach(item=>item.disabled=false);}
  });

  const createIdentityModal = () => {
    const existing=document.querySelector('.browse-identity-modal');
    if(existing)return existing;
    const modal = document.createElement('div');
    modal.className = 'browse-identity-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="browse-identity-modal-backdrop" data-close-identity-modal></div>
      <section class="browse-identity-modal-panel" role="dialog" tabindex="-1" aria-modal="true" aria-labelledby="browse-identity-modal-title">
        <button type="button" class="browse-identity-modal-close" data-close-identity-modal aria-label="人格詳細を閉じる">×</button>
        <p class="browse-identity-modal-kicker">編成人格</p>
        <figure class="browse-identity-modal-image" data-identity-modal-image-wrap hidden><img data-identity-modal-image alt=""></figure>
        <div class="browse-identity-modal-order" data-identity-modal-order></div>
        <h2 id="browse-identity-modal-title" data-identity-modal-name></h2>
        <p class="browse-identity-modal-sinner" data-identity-modal-sinner></p>
        <div class="browse-identity-modal-source"><span>掲載攻略</span><strong data-identity-modal-source></strong></div>
        <button type="button" class="browse-identity-modal-dismiss" data-close-identity-modal>閉じる</button>
      </section>`;
    document.body.appendChild(modal);
    return modal;
  };

  const initializeIdentityCards = () => {
    if(!document.querySelector('.browse-identity-card'))return;
    const modal=createIdentityModal();
    const panel=modal.querySelector('.browse-identity-modal-panel');
    const tooltip=document.createElement('div');
    tooltip.className='browse-identity-tooltip';
    tooltip.setAttribute('role','tooltip');
    tooltip.hidden=true;
    document.body.appendChild(tooltip);
    let previouslyFocused=null;
    let activeCard=null;

    const closeModal=()=>{
      if(modal.hidden)return;
      modal.hidden=true;
      document.documentElement.classList.remove('identity-modal-open');
      previouslyFocused?.focus();
    };
    const readCard=card=>({
      sinner:card.querySelector('strong')?.textContent.trim()||'囚人',
      identity:card.querySelector('small')?.textContent.trim()||'人格名未設定',
      order:card.querySelector('.browse-order')?.textContent.trim()||'--',
      title:card.closest('.post-card-rich')?.querySelector('h3')?.textContent.trim()||'攻略記事',
      imageUrl:card.dataset.identityImage||''
    });
    const openModal=card=>{
      const data=readCard(card);
      previouslyFocused=card;
      modal.querySelector('[data-identity-modal-order]').textContent=`編成順 ${data.order}`;
      modal.querySelector('[data-identity-modal-name]').textContent=data.identity;
      modal.querySelector('[data-identity-modal-sinner]').textContent=data.sinner;
      modal.querySelector('[data-identity-modal-source]').textContent=data.title;
      const wrap=modal.querySelector('[data-identity-modal-image-wrap]');
      const image=modal.querySelector('[data-identity-modal-image]');
      if(data.imageUrl){image.src=data.imageUrl;image.alt=`${data.identity}の画像`;wrap.hidden=false;}
      else{image.removeAttribute('src');image.alt='';wrap.hidden=true;}
      tooltip.hidden=true;
      modal.hidden=false;
      document.documentElement.classList.add('identity-modal-open');
      requestAnimationFrame(()=>panel.focus());
    };
    const prepareCard=card=>{
      if(card.dataset.identityInteractive==='true')return;
      const data=readCard(card);
      card.dataset.identityInteractive='true';
      card.tabIndex=0;
      card.setAttribute('role','button');
      card.setAttribute('aria-label',`${data.sinner}｜${data.identity}の詳細を表示`);
    };
    document.querySelectorAll('.browse-identity-card').forEach(prepareCard);

    document.addEventListener('pointerover',event=>{
      const card=event.target.closest('.browse-identity-card');
      if(!card||!window.matchMedia('(hover: hover) and (pointer: fine)').matches)return;
      prepareCard(card);
      const data=readCard(card);
      tooltip.textContent=data.identity;
      tooltip.hidden=false;
      activeCard=card;
      const rect=card.getBoundingClientRect();
      const tipRect=tooltip.getBoundingClientRect();
      let left=rect.left+rect.width/2-tipRect.width/2;
      left=Math.max(8,Math.min(left,window.innerWidth-tipRect.width-8));
      let top=rect.top-tipRect.height-9;
      if(top<8)top=rect.bottom+9;
      tooltip.style.left=`${left}px`;tooltip.style.top=`${top}px`;
    });
    document.addEventListener('pointerout',event=>{
      const card=event.target.closest('.browse-identity-card');
      if(card&&card===activeCard&&!card.contains(event.relatedTarget)){tooltip.hidden=true;activeCard=null;}
    });
    document.addEventListener('focusin',event=>{const card=event.target.closest?.('.browse-identity-card');if(card)prepareCard(card);});
    document.addEventListener('click',event=>{
      const card=event.target.closest('.browse-identity-card');
      if(!card)return;
      event.preventDefault();event.stopPropagation();prepareCard(card);openModal(card);
    });
    document.addEventListener('keydown',event=>{
      const card=event.target.closest?.('.browse-identity-card');
      if(!card||(event.key!=='Enter'&&event.key!==' '))return;
      event.preventDefault();prepareCard(card);openModal(card);
    });
    modal.querySelectorAll('[data-close-identity-modal]').forEach(button=>button.addEventListener('click',closeModal));
    modal.addEventListener('keydown',event=>{if(event.key==='Escape')closeModal();});
    window.addEventListener('scroll',()=>{tooltip.hidden=true;},true);
    window.addEventListener('resize',()=>{tooltip.hidden=true;});
  };

  initializeViewCounts();
  initializeLikeButtons();
  window.addEventListener('limbus-posts-loaded',()=>{initializeViewCounts();initializeLikeButtons();initializeIdentityCards();});
  initializeIdentityCards();
})();

// v0.9.20: 投稿詳細導線・ブックマーク・カード下部情報整列
(() => {
  'use strict';
  const loggedIn = () => localStorage.getItem('limbus-auth') === 'logged-in';
  const toast = document.querySelector('[data-toast]');
  const showToast = (message) => {
    if (!toast) { window.alert(message); return; }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
  };
  document.querySelectorAll('[data-post-grid] > .post-card-rich').forEach((card, index) => {
    const strategyLabel = [...card.querySelectorAll(':scope > .post-card-label')].find(label => label.textContent.trim().startsWith('攻略タグ'));
    const strategyRow = card.querySelector(':scope > .browse-strategy-row');
    const postBottom = card.querySelector(':scope > .post-bottom');
    if (strategyLabel && strategyRow && postBottom && !card.querySelector(':scope > .post-card-info-row')) {
      const infoRow = document.createElement('div');
      infoRow.className = 'post-card-info-row';
      const tagGroup = document.createElement('div');
      tagGroup.className = 'post-card-tag-group';
      const statGroup = document.createElement('div');
      statGroup.className = 'post-card-stat-group';
      strategyLabel.before(infoRow);
      tagGroup.append(strategyLabel, strategyRow);
      statGroup.append(postBottom);
      infoRow.append(tagGroup, statGroup);
    }
    const postId = card.dataset.postId || `post-${index + 1}`;
    card.dataset.postId = postId;
    let actions = card.querySelector(':scope > .post-card-detail-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'post-card-detail-actions';
      actions.innerHTML = `<button type="button" class="post-save-button" aria-label="この攻略をブックマーク"><span aria-hidden="true">🔖</span><span class="post-save-label">ブックマーク</span></button><a class="post-detail-link" href="post-detail.html?id=${encodeURIComponent(postId)}">詳細へ →</a>`;
      card.appendChild(actions);
    }
    const saveButton = actions.querySelector('.post-save-button');
    const key = `limbus-bookmark:${postId}`;
    const sync = () => {
      const saved = localStorage.getItem(key) === '1';
      saveButton.classList.toggle('is-saved', saved);
      saveButton.setAttribute('aria-pressed', String(saved));
      saveButton.querySelector('.post-save-label').textContent = saved ? '保存済み' : 'ブックマーク';
      saveButton.title = loggedIn() ? (saved ? 'ブックマークを解除' : 'ブックマークに保存') : 'ログインすると利用できます';
      saveButton.classList.toggle('is-login-required', !loggedIn());
    };
    sync();
    saveButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!loggedIn()) {
        showToast('ブックマーク機能を利用するにはログインしてください。');
        return;
      }
      const saved = localStorage.getItem(key) === '1';
      localStorage.setItem(key, saved ? '0' : '1');
      sync();
      showToast(saved ? 'ブックマークを解除しました。' : 'ブックマークに保存しました。');
    });
  });
})();
