(()=>{
'use strict';
const key=value=>String(value??'').normalize('NFKC').replace(/[\s・･,，、.。:：／/\\\-_―—–]/g,'').toLowerCase();
function distance(a,b){const left=[...a],right=[...b],row=Array.from({length:right.length+1},(_,index)=>index);for(let i=1;i<=left.length;i++){let previous=row[0];row[0]=i;for(let j=1;j<=right.length;j++){const current=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,previous+(left[i-1]===right[j-1]?0:1));previous=current;}}return row[right.length];}
function namesFrom(data){const names=[];Object.values(data?.modes||{}).forEach(mode=>Object.values(mode?.floors||{}).forEach(list=>(list||[]).forEach(name=>{if(name&&!names.includes(name))names.push(name);})));return names;}
function create(data){
  const names=namesFrom(data);const exactByKey=new Map(names.map(name=>[key(name),name]));
  function normalize(value){const original=String(value??'').trim();if(!original||original==='自由枠'||names.includes(original))return original;const normalized=key(original);if(exactByKey.has(normalized))return exactByKey.get(normalized);let best=null,bestDistance=Infinity,ties=0;for(const candidate of names){const score=distance(normalized,key(candidate));if(score<bestDistance){best=candidate;bestDistance=score;ties=1;}else if(score===bestDistance)ties++;}const maximum=normalized.length>=12?2:1;return best&&ties===1&&bestDistance<=maximum?best:original;}
  const normalizeEntries=entries=>(entries||[]).map(item=>({...item,name:normalize(item?.name)}));
  return {names:[...names],normalize,normalizeEntries};
}
window.LimbusThemePackNames={create,key,distance,namesFrom};
})();
