(()=>{
'use strict';
function createPostAdvanceController({state,identityCount,closeEgoSelect,closeThemePackSelect,publish,confirmFillEmpty,fillEmpty,afterFillEmpty,validateStep,setStep}){
  async function advance(){
    if(state.step===4&&state.activeEgoSinner){closeEgoSelect();return false;}
    if(state.step===5&&state.activeThemePackFloor){closeThemePackSelect();return false;}
    if(state.step===7)return publish();
    if(state.step===2&&state.identities.size<identityCount){
      const missingCount=identityCount-state.identities.size;
      if(!confirmFillEmpty(missingCount))return false;
      fillEmpty();afterFillEmpty(missingCount);
    }
    if(!validateStep(state.step))return false;
    setStep(state.step+1);return true;
  }
  return {advance};
}
window.LimbusPostAdvanceController={create:createPostAdvanceController};
})();
