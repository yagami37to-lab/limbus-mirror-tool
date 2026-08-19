(()=>{
'use strict';
function createPostValidationFlowController({state,validationController,identityData,titleInput,summaryInput,formationGrid,renderIdentityRoster,openIdentity,setStep,showToast}){
  function focusInvalid(step){
    validationController.mark(step,true);const result=validationController.check(step);
    if(step===1){if(result.field==='title'){document.querySelector('[data-workspace-titlebar]')?.classList.add('validation-error');titleInput?.focus();titleInput?.scrollIntoView({behavior:'smooth',block:'center'});}else if(result.field==='stage')document.querySelector('[data-railway-stage-selector]')?.scrollIntoView({behavior:'smooth',block:'center'});else if(result.field==='difficulty')document.querySelector('[data-difficulty-selector]')?.scrollIntoView({behavior:'smooth',block:'center'});else document.querySelector('[data-post-type]:not([hidden])')?.scrollIntoView({behavior:'smooth',block:'center'});}
    else if(step===2){const missing=identityData.find(sinner=>!state.identities.has(sinner.id));if(missing){state.activeSinner=missing.id;renderIdentityRoster();openIdentity(missing.id,{scroll:false});requestAnimationFrame(()=>document.querySelector('.identity-sinner-button.active')?.scrollIntoView({behavior:'smooth',block:'center'}));}}
    else if(step===3)formationGrid?.scrollIntoView({behavior:'smooth',block:'center'});
    else if(step===6){summaryInput?.focus();summaryInput?.scrollIntoView({behavior:'smooth',block:'center'});}
  }
  function validateStep(step,{showMessage=true}={}){const result=validationController.check(step);validationController.mark(step,!result.valid);if(!result.valid&&showMessage){if(result.popup)window.alert(result.message);else showToast(result.message);focusInvalid(step);}return result.valid;}
  function validateAll(){const invalid=validationController.requiredSteps.filter(step=>!validateStep(step,{showMessage:false}));if(!invalid.length)return true;const first=invalid[0];setStep(first);requestAnimationFrame(()=>focusInvalid(first));showToast('未入力の必須ステップを赤く表示しました。');return false;}
  function navigate(target){target=Math.max(1,Math.min(7,target));if(target<=state.step){setStep(target);return true;}const invalid=validationController.requiredSteps.filter(step=>step<target).find(step=>!validateStep(step,{showMessage:false}));if(invalid){setStep(invalid);requestAnimationFrame(()=>focusInvalid(invalid));const result=validationController.check(invalid);if(result.popup)window.alert(result.message);else showToast(result.message);return false;}setStep(target);return true;}
  return {focusInvalid,validateStep,validateAll,navigate};
}
window.LimbusPostValidationFlowController={create:createPostValidationFlowController};
})();
