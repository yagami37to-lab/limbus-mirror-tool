(()=>{
'use strict';
function createIdentityViewController({state,identityData,cardTones,getIdentityImage,applyCardImage,escapeHtml,getAlternatives,onOpen,onAlternativeModeChange,onRenderOptions,onFooterUpdate,queueScroll}){
  const roster=document.querySelector('[data-identity-sinner-roster]');
  const header=document.querySelector('.identity-select-header');
  function renderRoster(){
    if(!roster)return;
    roster.innerHTML='';
    identityData.forEach((sinner,index)=>{
      const chosen=state.identities.get(sinner.id);const button=document.createElement('button');button.type='button';
      button.className='identity-sinner-button'+(state.activeSinner===sinner.id?' active':'')+(chosen?' selected':'');
      button.style.setProperty('--card-a',cardTones[index%cardTones.length][0]);button.style.setProperty('--card-b',cardTones[index%cardTones.length][1]);
      button.title=chosen?`${sinner.name}：${chosen.name}`:`${sinner.name}の人格を選択`;
      applyCardImage(button,getIdentityImage(sinner.id,chosen));
      button.innerHTML=`<span class="identity-sinner-number">${sinner.id}</span><span class="identity-sinner-mark">${sinner.name.slice(0,1)}</span><strong>${sinner.name}</strong><small class="identity-sinner-selection">${chosen?chosen.name:'未選択'}</small>`;
      button.addEventListener('click',()=>onOpen(sinner.id));roster.appendChild(button);
    });
  }
  function renderAlternatives(){
    let root=document.querySelector('[data-identity-alternative-controls]');
    if(!root){root=document.createElement('div');root.dataset.identityAlternativeControls='';root.className='identity-alternative-controls';header?.insertAdjacentElement('afterend',root);}
    const sinner=identityData.find(item=>item.id===state.activeSinner);const primary=state.identities.get(state.activeSinner);const alternatives=getAlternatives(state.activeSinner);
    if(!sinner||!primary){root.hidden=true;return;}
    const cards=alternatives.length?`<div class="identity-alternative-summary">${alternatives.map(item=>{const image=getIdentityImage(sinner.id,item);return `<span class="identity-alternative-chip${image?' has-identity-image':''}"${image?` style="background-image:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.78)),url('${escapeHtml(image)}')"`:''}>${escapeHtml(item.name)}</span>`;}).join('')}</div>`:'<small>未設定</small>';
    root.hidden=false;root.innerHTML=`<div><strong>代用人格（任意）</strong>${cards}</div><button type="button" data-toggle-alternatives>${state.alternativeSelectionMode?'代用人格の選択を完了':'＋代用人格を追加（任意）'}</button>`;
    root.querySelector('[data-toggle-alternatives]').addEventListener('click',()=>{state.alternativeSelectionMode=!state.alternativeSelectionMode;onAlternativeModeChange?.(state.alternativeSelectionMode);renderAlternatives();onRenderOptions();});
  }
  function open(sinnerId,{scroll=true}={}){
    state.activeSinner=sinnerId;state.alternativeSelectionMode=false;const sinner=identityData.find(item=>item.id===sinnerId);if(!sinner)return;
    const name=document.querySelector('[data-current-sinner-name]');const identityName=document.querySelector('[data-current-identity-name]');
    if(name)name.textContent=sinner.name;if(identityName)identityName.textContent=state.identities.get(sinnerId)?.name||'未選択';
    renderRoster();renderAlternatives();onRenderOptions();onFooterUpdate();if(scroll)queueScroll(header,18);
  }
  return {renderRoster,renderAlternatives,open};
}
window.LimbusIdentityViewController={create:createIdentityViewController};
})();
