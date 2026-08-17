(()=>{
'use strict';
document.querySelectorAll('[data-page-back]').forEach(button=>button.addEventListener('click',()=>{
  const fallback=button.dataset.fallback||'index.html';
  let canReturn=false;
  try{canReturn=history.length>1&&!!document.referrer&&new URL(document.referrer).origin===location.origin;}catch{}
  if(canReturn)history.back();else location.href=fallback;
}));
})();
