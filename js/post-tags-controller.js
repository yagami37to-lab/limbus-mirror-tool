(()=>{
'use strict';
function createPostTagsController({state,strategyOptions,affiliationOptions,automaticOptions,manualOptions,strategyGrid,affiliationGrid,automaticTags,ammoNote,strategyCount,affiliationCount,getOrderedSinners,getFormationPosition,isSolo,showToast}){
  function counts(){
    const result=new Map([...automaticOptions,'弾丸','ソロ'].map(keyword=>[keyword,0]));
    getOrderedSinners().forEach(sinner=>{const identity=state.identities.get(sinner.id);if(identity?.isFreeSlot)return;const keywords=new Set(identity?.keywords||[]);const order=getFormationPosition(sinner.id);automaticOptions.forEach(keyword=>{if(order&&order<=7&&keywords.has(keyword))result.set(keyword,result.get(keyword)+1);});if(keywords.has('弾丸'))result.set('弾丸',result.get('弾丸')+1);});
    if(isSolo()&&state.identityOrder.length===1)result.set('ソロ',1);return result;
  }
  function automaticKeywords(){if(['mirror_railway','projection_combat'].includes(state.category))return [...state.manualKeywords];const result=counts();const tags=automaticOptions.filter(keyword=>result.get(keyword)>=5);if(state.ammoKeywordSelected&&result.get('弾丸')>=1)tags.push('弾丸');if(result.get('ソロ')===1)tags.push('ソロ');return tags;}
  function toggleTag(tag,selection,max){if(selection.has(tag))selection.delete(tag);else if(selection.size>=max){showToast(`最大${max}個まで選択できます。`);return false;}else selection.add(tag);render();return true;}
  function renderButtons(grid,options,selection,max){if(!grid)return;grid.innerHTML='';options.forEach(tag=>{const button=document.createElement('button');button.type='button';button.className='selectable-tag'+(selection.has(tag)?' selected':'');button.textContent=tag;button.addEventListener('click',()=>toggleTag(tag,selection,max));grid.appendChild(button);});}
  function render(){
    renderButtons(strategyGrid,strategyOptions,state.strategyTags,5);renderButtons(affiliationGrid,affiliationOptions,state.affiliationTags,3);if(strategyCount)strategyCount.textContent=state.strategyTags.size;if(affiliationCount)affiliationCount.textContent=state.affiliationTags.size;
    if(['mirror_railway','projection_combat'].includes(state.category)){renderButtons(automaticTags,manualOptions,state.manualKeywords,5);if(ammoNote)ammoNote.hidden=true;return;}
    const result=counts();const automatic=automaticOptions.filter(keyword=>result.get(keyword)>=5);const ammoAvailable=result.get('弾丸')>=1;if(!ammoAvailable)state.ammoKeywordSelected=false;
    if(automaticTags){const autoMarkup=automatic.map(keyword=>`<span class="automatic-keyword-tag" data-keyword="${keyword}"><b>${keyword}</b><small>${result.get(keyword)}人</small></span>`).join('');const ammoMarkup=ammoAvailable?`<button type="button" class="automatic-keyword-tag ammo-selectable${state.ammoKeywordSelected?' selected':''}" data-toggle-ammo><b>弾丸</b><small>1人以上</small></button>`:'';const soloMarkup=isSolo()&&state.identityOrder.length===1?'<span class="automatic-keyword-tag" data-keyword="ソロ"><b>ソロ</b><small>自動付与</small></span>':'';automaticTags.innerHTML=(autoMarkup+ammoMarkup+soloMarkup)||'<span class="tag-empty">該当するキーワードはありません。</span>';automaticTags.querySelector('[data-toggle-ammo]')?.addEventListener('click',()=>{state.ammoKeywordSelected=!state.ammoKeywordSelected;render();});}
    if(ammoNote)ammoNote.hidden=!ammoAvailable;
  }
  return {counts,automaticKeywords,toggleTag,render};
}
window.LimbusPostTagsController={create:createPostTagsController};
})();
