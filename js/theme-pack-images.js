(()=>{
'use strict';
const images=new Map([['忘れ去られた者たち','001.png']]);
function forName(name){const filename=images.get(String(name??'').trim());return filename?`assets/theme-packs/${filename}`:'';}
window.LimbusThemePackImages={forName};
})();
