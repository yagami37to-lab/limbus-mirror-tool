(()=>{
  'use strict';
  const add=()=>{
    const grid=document.querySelector('.account-menu-grid');
    if(!grid||grid.querySelector('a[href="owned-identities.html"]'))return;
    const card=document.createElement('a');card.className='account-menu-card';card.href='owned-identities.html';
    card.innerHTML='<b>所持人格設定</b><span>所持人格を登録し、攻略編成の所持率へ反映します。</span>';
    const settings=grid.querySelector('a[href="settings.html"]');grid.insertBefore(card,settings||null);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();
})();
