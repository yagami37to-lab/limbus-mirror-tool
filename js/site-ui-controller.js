(()=>{
'use strict';
function createSiteUiController({toast,managedDialogs,themeToggles,mobileMenuButton,headerNav}){
  const themeRoot=document.documentElement;let lockedScrollY=0,openDialogCount=0,toastTimer=null;
  function applyTheme(theme){themeRoot.dataset.theme=theme;const dark=theme==='dark';themeToggles.forEach(toggle=>{toggle.setAttribute('aria-pressed',String(dark));toggle.setAttribute('aria-label',dark?'ライトモードに切り替える':'ダークモードに切り替える');});}
  function toggleTheme(){const next=themeRoot.dataset.theme==='dark'?'light':'dark';applyTheme(next);localStorage.setItem('limbus-theme',next);}
  function lockPageScroll(){openDialogCount+=1;if(openDialogCount>1)return;lockedScrollY=window.scrollY;document.body.classList.add('dialog-open');document.body.style.top=`-${lockedScrollY}px`;}
  function restorePageScroll(){openDialogCount=0;document.body.classList.remove('dialog-open');document.body.style.removeProperty('top');document.documentElement.style.removeProperty('overflow');document.body.style.removeProperty('overflow');window.scrollTo(0,lockedScrollY);}
  function clearStaleScrollLock(){document.body.classList.remove('dialog-open');document.body.style.removeProperty('top');document.documentElement.style.removeProperty('overflow');document.body.style.removeProperty('overflow');}
  function reconcilePageScrollLock(){const anyOpen=[...document.querySelectorAll('dialog')].some(dialog=>dialog.open);if(anyOpen)return;if(openDialogCount>0||document.body.classList.contains('dialog-open'))restorePageScroll();else clearStaleScrollLock();}
  function unlockPageScroll(){openDialogCount=Math.max(0,openDialogCount-1);if(openDialogCount===0)restorePageScroll();}
  function openDialog(dialog){if(!dialog||dialog.open)return;lockPageScroll();dialog.showModal();}
  function closeDialog(dialog){if(!dialog?.open){queueMicrotask(reconcilePageScrollLock);return;}dialog.close();queueMicrotask(reconcilePageScrollLock);}
  function showToast(message){if(!toast)return;toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2200);}
  function closeMobileMenu(){if(!mobileMenuButton||!headerNav)return;headerNav.classList.remove('mobile-open');mobileMenuButton.setAttribute('aria-expanded','false');mobileMenuButton.textContent='☰';}
  function bind(){
    applyTheme(localStorage.getItem('limbus-theme')||'light');themeToggles.forEach(toggle=>toggle.addEventListener('click',toggleTheme));
    managedDialogs.filter(Boolean).forEach(dialog=>{dialog.addEventListener('close',unlockPageScroll);dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog(dialog);});});
    if(mobileMenuButton&&headerNav){mobileMenuButton.addEventListener('click',()=>{const open=headerNav.classList.toggle('mobile-open');mobileMenuButton.setAttribute('aria-expanded',String(open));mobileMenuButton.textContent=open?'×':'☰';});headerNav.addEventListener('click',event=>{if(window.innerWidth<=720&&(event.target.closest('a')||event.target.closest('button')))closeMobileMenu();});window.addEventListener('resize',()=>{if(window.innerWidth>720)closeMobileMenu();});}
    window.addEventListener('pageshow',reconcilePageScrollLock);window.addEventListener('focus',()=>queueMicrotask(reconcilePageScrollLock));
  }
  return {bind,applyTheme,toggleTheme,lockPageScroll,restorePageScroll,reconcilePageScrollLock,unlockPageScroll,openDialog,closeDialog,showToast,closeMobileMenu};
}
window.LimbusSiteUiController={create:createSiteUiController};
})();
