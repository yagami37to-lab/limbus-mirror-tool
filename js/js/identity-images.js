(()=>{
'use strict';
const yi={
'ロボトミーE.G.O::厳粛な哀悼':'assets/identities/yi-sang/001.png','蜘蛛の巣 人差し指の親方':'assets/identities/yi-sang/002.png','黒獣・午 筆頭':'assets/identities/yi-sang/003.png','南部リウ協会3課':'assets/identities/yi-sang/004.png','薬指点描派 スチューデント':'assets/identities/yi-sang/005.png','W社3級整理要員':'assets/identities/yi-sang/006.png','開花E.G.O::壇香梅':'assets/identities/yi-sang/007.png','剣契 殺手':'assets/identities/yi-sang/008.png','ピークォド号1等航海士':'assets/identities/yi-sang/009.png','南部セブン協会6課':'assets/identities/yi-sang/010.png','LCB囚人':'assets/identities/yi-sang/011.png','LCE E.G.O::提灯':'assets/identities/yi-sang/012.png','N社E.G.O::凶弾':'assets/identities/yi-sang/013.png','南部ディエーチ協会4課':'assets/identities/yi-sang/014.png','奥歯事務所フィクサー':'assets/identities/yi-sang/015.png','LCE E.G.O::次元裂き':'assets/identities/yi-sang/016.png'};
const aliases={'ロボトミーE.G.O：：厳粛な哀悼':'ロボトミーE.G.O::厳粛な哀悼','剣契殺手':'剣契 殺手','薬指点描派スチューデント':'薬指点描派 スチューデント'};
const normalize=n=>aliases[String(n||'').trim()]||String(n||'').trim();
const forIdentity=(sinner,identity,{free=false}={})=>{
 const sid=String(sinner||''); if(!(sid==='01'||sid==='イサン'))return '';
 if(free||String(identity||'').includes('自由枠'))return yi['LCB囚人'];
 return yi[normalize(identity)]||yi['LCB囚人'];
};
window.LimbusIdentityImages={yiSang:yi,forIdentity};
})();
