(() => {
  'use strict';
  const buttons=[...document.querySelectorAll('[data-page-theme-toggle]')];
  const apply=theme=>{
    document.documentElement.dataset.theme=theme;
    buttons.forEach(btn=>{const dark=theme==='dark';btn.setAttribute('aria-pressed',String(dark));btn.setAttribute('aria-label',dark?'ライトモードに切り替える':'ダークモードに切り替える');});
  };
  apply(localStorage.getItem('limbus-theme')||'light');
  buttons.forEach(btn=>btn.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';localStorage.setItem('limbus-theme',next);apply(next);}));
})();
