(()=>{
'use strict';
function createPostAdvanceController({state,identityCount,closeEgoSelect,closeThemePackSelect,publish,confirmFillEmpty,fillEmpty,afterFillEmpty,validateStep,setStep,confirmSecondary,onSecondaryChanged}){
  async function advance(){
    if((state.step===4||(state.category==='projection_combat'&&state.secondaryPartyEnabled&&state.step===7))&&state.activeEgoSinner){closeEgoSelect();return false;}
    if(state.step===5&&state.activeThemePackFloor){closeThemePackSelect();return false;}
    const projection=state.category==='projection_combat';
    if((projection&&state.step===(state.secondaryPartyEnabled?9:6))||(!projection&&state.step===7))return publish();
    if(state.step===2&&state.identities.size<identityCount){
      const missingCount=identityCount-state.identities.size;
      if(!confirmFillEmpty(missingCount))return false;
      fillEmpty();afterFillEmpty(missingCount);
    }
    const validationStep=projection&&((state.secondaryPartyEnabled&&state.step===8)||(!state.secondaryPartyEnabled&&state.step===5))?6:state.step;
    if(!(projection&&state.step>=5&&state.step<=7)&&!validateStep(validationStep))return false;
    if(projection&&state.step===4){state.secondaryPartyEnabled=Boolean(confirmSecondary?.());onSecondaryChanged?.(state.secondaryPartyEnabled);setStep(5);return true;}
    setStep(state.step+1);return true;
  }
  return {advance};
}
window.LimbusPostAdvanceController={create:createPostAdvanceController};
})();
