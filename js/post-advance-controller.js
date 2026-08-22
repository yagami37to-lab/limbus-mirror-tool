(()=>{
'use strict';
function createPostAdvanceController({state,identityCount,closeEgoSelect,closeThemePackSelect,publish,confirmFillEmpty,fillEmpty,afterFillEmpty,validateStep,validateDetails,setStep,confirmSecondary,onSecondaryChanged,requestRailwayParties}){
  async function advance(){
    if(state.category==='mirror_railway'&&state.step===1&&!state.railwayPartyPrompted){if(!validateStep(1))return false;requestRailwayParties?.();return false;}
    if(state.category==='mirror_railway'){const count=Math.max(1,Number(state.railwayPartyCount)||1),max=3*count+3,partyStep=state.step>=2&&state.step<=1+3*count,physical=partyStep?2+((state.step-2)%3):state.step===2+3*count?6:state.step===max?7:state.step;if(physical===4&&state.activeEgoSinner){closeEgoSelect();return false;}if(state.step===max)return publish();if(physical===2&&state.identities.size<identityCount){const missingCount=identityCount-state.identities.size;if(!confirmFillEmpty(missingCount))return false;fillEmpty();afterFillEmpty(missingCount);}if((physical===2||physical===3||physical===6)&&!validateStep(physical))return false;setStep(state.step+1);return true;}
    if((state.step===4||(state.category==='projection_combat'&&state.secondaryPartyEnabled&&state.step===7))&&state.activeEgoSinner){closeEgoSelect();return false;}
    if(state.step===5&&state.activeThemePackFloor){closeThemePackSelect();return false;}
    const projection=state.category==='projection_combat';
    if((projection&&state.step===(state.secondaryPartyEnabled?9:6))||(!projection&&state.step===7))return publish();
    if(state.step===2&&state.identities.size<identityCount){
      const missingCount=identityCount-state.identities.size;
      if(!confirmFillEmpty(missingCount))return false;
      fillEmpty();afterFillEmpty(missingCount);
    }
    const onProjectionDetails=projection&&((state.secondaryPartyEnabled&&state.step===8)||(!state.secondaryPartyEnabled&&state.step===5));
    const validationStep=onProjectionDetails?6:state.step;
    if(onProjectionDetails){if(!validateDetails())return false;}else if(!(projection&&state.step>=5&&state.step<=7)&&!validateStep(validationStep))return false;
    if(projection&&state.step===4){state.secondaryPartyEnabled=Boolean(confirmSecondary?.());onSecondaryChanged?.(state.secondaryPartyEnabled);setStep(5);return true;}
    setStep(state.step+1);return true;
  }
  return {advance};
}
window.LimbusPostAdvanceController={create:createPostAdvanceController};
})();
