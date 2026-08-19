(()=>{
  'use strict';
  const add=()=>{
    const grid=document.querySelector('.account-menu-grid');
    if(!grid||grid.querySelector('a[href="owned-identities.html"]'))return;
    const card=document.createElement('a');card.className='account-menu-card';card.href='owned-identities.html';
    card.innerHTML='<b>所持人格＆E.G.O設定</b><span>所持している人格とE.G.Oを囚人ごとに登録します。</span>';
    const settings=grid.querySelector('a[href="settings.html"]');grid.insertBefore(card,settings||null);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();
})();
