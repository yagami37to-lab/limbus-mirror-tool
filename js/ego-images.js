(() => {
  'use strict';
  const sinnerFolders={
    '01':'yi-sang','02':'faust','03':'don-quixote','04':'ryoshu','05':'meursault','06':'hong-lu',
    '07':'heathcliff','08':'ishmael','09':'rodion','11':'sinclair','12':'outis','13':'gregor'
  };
  const available=new Set(['01:過ぎし日']);
  function forEgo(sinnerId,name,egoData){
    const id=String(sinnerId).padStart(2,'0');
    const folder=sinnerFolders[id];
    const index=(egoData?.[id]||[]).findIndex(item=>item?.[0]===name);
    if(!folder||index<0||!available.has(`${id}:${name}`))return '';
    return `assets/egos/${folder}/${String(index+1).padStart(3,'0')}.png`;
  }
  window.LimbusEgoImages={forEgo,sinnerFolders};
})();
