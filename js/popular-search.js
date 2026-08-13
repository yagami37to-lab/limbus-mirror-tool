(() => {
  'use strict';

  /**
   * 現在は公開前の仮データ。
   * 将来は Supabase 等の集計結果を同じ形式で返す関数へ差し替える。
   * kind: keyword | strategy | type
   */
  const fallbackPopularSearches = [
    { label: '出血', value: '出血', kind: 'keyword' },
    { label: '沈潜', value: '沈潜', kind: 'keyword' },
    { label: '充電', value: '充電', kind: 'keyword' },
    { label: '初心者向け', value: '初心者向け', kind: 'strategy' },
    { label: '速攻周回', value: '速攻周回', kind: 'type' },
    { label: 'ソロ', value: 'ソロ', kind: 'keyword' }
  ];

  async function getPopularSearches() {
    // 将来例:
    // return await window.popularSearchProvider.fetch({ period: '30d', limit: 6 });
    if (window.popularSearchProvider?.fetch) {
      try {
        const items = await window.popularSearchProvider.fetch({ period: '30d', limit: 6 });
        if (Array.isArray(items) && items.length) return items;
      } catch (error) {
        console.warn('人気検索の集計データを取得できなかったため、仮データを表示します。', error);
      }
    }
    return fallbackPopularSearches;
  }

  function createPopularSearchButton(item) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.tag = item.value;
    button.classList.add('popular-search-tag');

    button.dataset.popularKind = item.kind;
    button.textContent = item.label;
    if (item.kind === 'keyword') button.dataset.keyword = item.value;
    if (item.kind === 'type') button.dataset.type = item.value;
    return button;
  }

  async function renderPopularSearches() {
    const target = document.querySelector('[data-popular-search-list]');
    if (!target) return;
    const items = await getPopularSearches();
    target.replaceChildren(...items.map(createPopularSearchButton));
  }

  // app.js より先に読み込まれるため、描画完了後に app.js が通常どおりイベントを登録できる。
  window.popularSearches = {
    get: getPopularSearches,
    render: renderPopularSearches,
    fallback: fallbackPopularSearches
  };

  renderPopularSearches();
})();
