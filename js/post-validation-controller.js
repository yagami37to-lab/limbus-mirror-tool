(()=>{
'use strict';
function createPostValidationController({state,requiredIdentityCount}){
  const value=selector=>document.querySelector(selector)?.value.trim()||'';
  function clear(step){document.querySelector(`[data-step-link="${step}"]`)?.classList.remove('validation-error');document.querySelector(`[data-post-step="${step}"]`)?.classList.remove('validation-error');}
  function mark(step,invalid=true){document.querySelector(`[data-step-link="${step}"]`)?.classList.toggle('validation-error',invalid);document.querySelector(`[data-post-step="${step}"]`)?.classList.toggle('validation-error',invalid);}
  function check(step){
    if(step===1){if(!value('[data-post-title]'))return {valid:false,message:'攻略タイトルを設定していません',field:'title',popup:true};if(['mirror_railway','projection_combat','luxcavation'].includes(state.category)){const lux=state.category==='luxcavation';if(!state.stage&&!state.type)return {valid:false,message:lux?'採光種類と攻略タイプを選択してください。':'ステージと攻略タイプを選択してください。',field:'stage'};if(!state.stage)return {valid:false,message:lux?'採光種類を選択してください。':'攻略対象のステージを選択してください。',field:'stage'};}else{if(!state.difficulty&&!state.type)return {valid:false,message:'難易度と攻略タイプを選択してください。',field:'difficulty'};if(!state.difficulty)return {valid:false,message:'ノーマルまたはハードを選択してください。',field:'difficulty'};}if(!state.type)return {valid:false,message:'攻略タイプを選択してください。',field:'type'};}
    if(step===2&&state.identities.size!==requiredIdentityCount)return {valid:false,message:'必要のない人格は自由枠として設定してください',popup:true};
    if(step===3&&state.identityOrder.length<1)return {valid:false,message:'編成順に少なくとも1人を設定してください。'};
    if(step===6&&!value('[data-post-summary]'))return {valid:false,message:'一言紹介が入力されていません。',popup:true};
    return {valid:true,message:''};
  }
  return {clear,mark,check,requiredSteps:[1,2,3,6]};
}
window.LimbusPostValidationController={create:createPostValidationController};
})();
