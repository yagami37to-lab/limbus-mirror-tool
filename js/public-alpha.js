(() => {
  'use strict';
  const body = document.body;
  if (!body || body.dataset.alphaUiReady === 'true') return;
  body.dataset.alphaUiReady = 'true';

  const banner = document.createElement('aside');
  banner.className = 'alpha-test-banner';
  banner.setAttribute('aria-label', '限定ベータテストのお知らせ');
  banner.innerHTML = '<strong>限定βテスト中</strong><span>表示・投稿データは正式公開前に変更または削除される場合があります。</span>';
  body.prepend(banner);

  const syncBannerHeight = () => {
    const height = Math.ceil(banner.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--alpha-banner-height', `${height}px`);
    body.classList.add('alpha-banner-ready');
  };
  syncBannerHeight();
  window.addEventListener('resize', syncBannerHeight, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(syncBannerHeight).observe(banner);

  const backToTop = document.createElement('button');
  backToTop.className = 'back-to-top-button';
  backToTop.type = 'button';
  backToTop.textContent = '↑';
  backToTop.setAttribute('aria-label', 'ページ上部へ戻る');
  body.append(backToTop);

  const mobileNews = document.createElement('a');
  mobileNews.className = 'mobile-news-button';
  mobileNews.href = 'news.html';
  mobileNews.innerHTML = '<span aria-hidden="true">●</span><span>お知らせ</span>';
  mobileNews.setAttribute('aria-label', 'お知らせを見る');
  body.append(mobileNews);

  const syncBackToTop = () => {
    backToTop.classList.toggle('is-visible', window.scrollY > 420);
  };
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', syncBackToTop, { passive: true });
  syncBackToTop();
})();
