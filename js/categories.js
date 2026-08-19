window.STRATEGY_CATEGORIES = Object.freeze([
  Object.freeze({
    id: 'mirror_dungeon',
    label: '鏡ダンジョン',
    shortLabel: '鏡ダンジョン',
    icon: '◎',
    iconImage: 'assets/category-icons/mirror-dungeon.png',
    available: true,
    description: '各階層の攻略や編成例を投稿します。',
    searchCopy: '鏡ダンジョン攻略を検索'
  }),
  Object.freeze({
    id: 'mirror_railway',
    label: '鏡屈折鉄道',
    shortLabel: '鏡屈折鉄道',
    icon: '▣',
    iconImage: 'assets/category-icons/mirror-railway.png',
    available: false,
    description: '鉄道イベントの攻略を投稿します。',
    searchCopy: '※実装予定'
  }),
  Object.freeze({
    id: 'projection_combat',
    label: '射影戦闘',
    shortLabel: '射影戦闘',
    icon: '⌖',
    iconImage: 'assets/category-icons/projection-combat.png',
    available: false,
    description: '射影戦闘の攻略や編成例を投稿します。',
    searchCopy: '※実装予定'
  }),
  Object.freeze({
    id: 'luxcavation', label: '採光', shortLabel: '採光', icon: '☀', available: false,
    description: '経験値・紐採光の攻略や編成例を投稿します。', searchCopy: '※実装予定'
  }),
  Object.freeze({
    id: 'story', label: 'ストーリー', shortLabel: 'ストーリー', icon: '▤',
    iconImage: 'assets/category-icons/story.png', available: false,
    description: 'メインストーリーや各章の攻略を投稿します。', searchCopy: '※実装予定'
  }),
  Object.freeze({
    id: 'recommended_formation', label: 'おすすめ編成', shortLabel: 'おすすめ編成', icon: '★', available: false,
    description: '目的別のおすすめ編成や組み合わせを投稿します。', searchCopy: '※実装予定'
  })
]);

window.LimbusCategories = Object.freeze({
  all: window.STRATEGY_CATEGORIES,
  byId(id) { return window.STRATEGY_CATEGORIES.find(category => category.id === id) || null; },
  label(id) { return this.byId(id)?.label || id || '未設定'; }
});
