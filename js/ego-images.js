(() => {
  'use strict';
  const sinnerFolders={
    '01':'yi-sang','02':'faust','03':'don-quixote','04':'ryoshu','05':'meursault','06':'hong-lu',
    '07':'heathcliff','08':'ishmael','09':'rodion','11':'sinclair','12':'outis','13':'gregor'
  };
  const available=new Set([
    '01:烏瞰刀','01:厳粛な哀悼','01:三千大世界','01:凶弾','01:過ぎし日',
    '01:次元裂き','01:願いの石','01:狐雨','01:4本目のマッチの火',
    '02:表象放出機','02:指令:メルトダウン','02:永続','02:水袋','02:紅炎殺',
    '02:胸痛','02:投げ縄','02:電信柱','02:呪いの釘','02:9章2節'
  ]);
  function forEgo(sinnerId,name,egoData){
    const id=String(sinnerId).padStart(2,'0');
    const folder=sinnerFolders[id];
    const index=(egoData?.[id]||[]).findIndex(item=>item?.[0]===name);
    if(!folder||index<0||!available.has(`${id}:${name}`))return '';
    return `assets/egos/${folder}/${String(index+1).padStart(3,'0')}.png`;
  }
  window.LimbusEgoImages={forEgo,sinnerFolders};
})();
