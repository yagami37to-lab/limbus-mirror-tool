(()=>{
'use strict';

function createSearchController({
  identityOptions,
  categoryDefinitions,
  categoryById,
  categoryIconMarkup,
  searchOptions,
  openDialog,
  closeDialog,
  showToast
}){
  const $=selector=>document.querySelector(selector);
  const $$=selector=>[...document.querySelectorAll(selector)];
  const selected={category:new Set(),identity:new Set(),keyword:new Set(),type:new Set(),strategy:new Set(),difficulty:new Set(),affiliation:new Set()};
  let activeSelector='identity',activeTag='';
  let resultPage=1;
  const RESULT_PAGE_SIZE=6;
  const selectorModal=$('[data-selector-modal]'),selectionGrid=$('[data-selection-grid]');
  const modalTitle=$('[data-modal-title]'),modalKicker=$('[data-modal-kicker]'),modalSearch=$('[data-modal-search]');
  const modalSelectionStatus=$('[data-modal-selection-status]'),modalApplySelection=$('[data-apply-selection]'),modalClearSelection=$('[data-clear-selection]');
  const identityLabel=$('[data-identity-label]'),activeFilters=$('[data-active-filters]');
  const keywordInput=$('input[data-keyword]'),sortSelect=$('[data-sort]'),postGrid=$('[data-post-grid]');
  const resultCount=$('[data-result-count]'),emptyState=$('[data-empty-state]');
  const resultActiveFilters=$('[data-result-active-filters]'),resultSort=$('[data-result-sort]');
  const resultPagination=$('[data-result-pagination]'),resultPageStatus=$('[data-page-status]'),resultPagePrev=$('[data-page-prev]'),resultPageNext=$('[data-page-next]');
  const advancedToggle=$('[data-toggle-advanced]'),advancedPanel=$('[data-advanced-search]');
  const searchPanel=$('[data-search-panel]'),searchPanelToggle=$('[data-search-panel-toggle]'),searchToggleLabel=$('[data-search-toggle-label]'),searchToggleSummary=$('[data-search-toggle-summary]');
function openSelector(type){activeSelector=type;modalTitle.textContent='使用人格を選択';modalKicker.textContent='SELECT IDENTITIES';modalSearch.value='';renderSelectionOptions();openDialog(selectorModal)}
function updateModalSelectionStatus(){const count=selected.identity.size;if(modalSelectionStatus)modalSelectionStatus.textContent=`${count}件選択中`;if(modalApplySelection)modalApplySelection.textContent=count?`${count}件選択して決定`:'0件選択して決定';if(modalClearSelection)modalClearSelection.disabled=count===0}
function renderSelectionOptions(filter=''){
  selectionGrid.innerHTML='';
  identityOptions.filter(x=>x.toLowerCase().includes(filter.trim().toLowerCase())).forEach((item,i)=>{
    const b=document.createElement('button');
    b.type='button';
    b.className='selection-item'+(selected.identity.has(item)?' active':'');
    const parts=item.split('｜');
    const sinnerName=parts[0]||'';
    const identityName=parts[1]||'';
    const imagePath=window.LimbusIdentityImages?.forIdentity?.(sinnerName,identityName)||'';
    if(imagePath){
      b.classList.add('has-identity-image');
      const img=document.createElement('img');
      img.className='selection-item-image';
      img.src=imagePath;
      img.alt='';
      img.loading='lazy';
      img.decoding='async';
      b.appendChild(img);
    }
    const shade=document.createElement('span');
    shade.className='selection-item-shade';
    shade.setAttribute('aria-hidden','true');
    const copy=document.createElement('span');
    copy.className='selection-item-copy';
    const sinner=document.createElement('small');
    sinner.textContent=sinnerName;
    const identity=document.createElement('strong');
    identity.textContent=identityName;
    copy.append(sinner,identity);
    b.append(shade,copy);
    b.onclick=()=>{
      selected.identity.has(item)?selected.identity.delete(item):selected.identity.add(item);
      b.classList.toggle('active');
      updateModalSelectionStatus();
    };
    selectionGrid.appendChild(b);
  });
  updateModalSelectionStatus();
}
function updateSelectionLabels(){identityLabel.textContent=selected.identity.size?`${selected.identity.size}件選択中`:'人格を選択';renderActiveFilters()}
function addChipGroup(rootSelector,key,items,single=false){const root=$(rootSelector);if(!root)return;root.innerHTML='';items.forEach(item=>{const button=document.createElement('button');button.type='button';button.className='search-filter-chip';button.textContent=item;button.addEventListener('click',()=>{if(single){const was=selected[key].has(item);selected[key].clear();root.querySelectorAll('.search-filter-chip').forEach(x=>x.classList.remove('active'));if(!was){selected[key].add(item);button.classList.add('active')}}else{selected[key].has(item)?selected[key].delete(item):selected[key].add(item);button.classList.toggle('active')}renderActiveFilters()});root.appendChild(button)})}
function renderSearchCategories(){const root=$('[data-search-categories]');if(!root)return;root.innerHTML='';categoryDefinitions.forEach(category=>{const button=document.createElement('button');button.type='button';button.className='search-category-option';button.dataset.categoryId=category.id;button.disabled=!category.available;button.innerHTML=`<span class="search-category-icon">${categoryIconMarkup(category)}</span><span><strong>${category.label}</strong><small>${category.available?category.searchCopy:'※実装予定'}</small></span>`;button.addEventListener('click',()=>{if(!category.available)return;const was=selected.category.has(category.id);selected.category.clear();root.querySelectorAll('.search-category-option').forEach(x=>x.classList.remove('active'));if(!was){selected.category.add(category.id);button.classList.add('active')}renderActiveFilters()});root.appendChild(button)})}
renderSearchCategories();
addChipGroup('[data-search-keywords]','keyword',searchOptions.keyword);
addChipGroup('[data-search-types]','type',searchOptions.type,true);
addChipGroup('[data-search-strategy-tags]','strategy',searchOptions.strategy);
addChipGroup('[data-search-difficulties]','difficulty',searchOptions.difficulty,true);
addChipGroup('[data-search-affiliations]','affiliation',searchOptions.affiliation);
function getFilterItems(){const labels={category:'攻略カテゴリ',identity:'人格',keyword:'キーワード',type:'攻略タイプ',strategy:'攻略タグ',difficulty:'難易度',affiliation:'所属'};const items=[];Object.entries(selected).forEach(([key,set])=>set.forEach(value=>{const displayValue=key==='category'?categoryById(value).label:value;items.push({key,value,label:`${labels[key]}：${displayValue}`})}));if(keywordInput.value.trim())items.push({key:'freeword',value:keywordInput.value.trim(),label:`フリー：${keywordInput.value.trim()}`});const dateRange=$('[data-date-range]');if(dateRange&&dateRange.value!=='all')items.push({key:'date',value:dateRange.value,label:`${$('[data-date-kind]').value==='posted'?'投稿日':'更新日'}：${dateRange.options[dateRange.selectedIndex].text}`});return items}
function renderFilterTarget(target,items,emptyText){if(!target)return;target.innerHTML='';if(!items.length){target.innerHTML=`<span class="filter-empty">${emptyText}</span>`;return}items.forEach(item=>{const chip=document.createElement('span');chip.className='filter-chip';chip.append(document.createTextNode(item.label));const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label',`${item.label}を解除`);remove.onclick=()=>{if(item.key==='freeword')keywordInput.value='';else if(item.key==='date')$('[data-date-range]').value='all';else if(item.key==='popular')activeTag='';else selected[item.key].delete(item.value);syncSearchControls();renderActiveFilters();runSearch(false)};chip.appendChild(remove);target.appendChild(chip)})}
function updateSearchToggleSummary(items=getFilterItems()){
  if(!searchToggleSummary)return;
  const count=items.length+(activeTag?1:0)+(keywordInput?.value?.trim()?1:0);
  searchToggleSummary.textContent=count?`検索条件を ${count} 件指定中`:'条件を選んで攻略を絞り込めます。';
}
function setSearchPanelOpen(open,{scroll=false}={}){
  if(!searchPanel||!searchPanelToggle)return;
  searchPanel.hidden=!open;
  searchPanelToggle.setAttribute('aria-expanded',String(open));
  searchPanelToggle.classList.toggle('is-open',open);
  if(searchToggleLabel)searchToggleLabel.textContent=open?'検索条件を閉じる':'投稿を検索する';
  const arrow=searchPanelToggle.querySelector('.home-search-toggle-arrow');
  if(arrow)arrow.textContent=open?'−':'＋';
  if(scroll){requestAnimationFrame(()=>document.querySelector('#search')?.scrollIntoView({behavior:'smooth',block:'start'}));}
}
function renderActiveFilters(){const items=getFilterItems();if(activeTag)items.push({key:'popular',value:activeTag,label:`人気検索：${activeTag}`});renderFilterTarget(activeFilters,items,'現在、検索条件は指定されていません。');renderFilterTarget(resultActiveFilters,items,'すべての攻略を表示しています。');updateSearchToggleSummary(items)}
function syncSearchControls(){$$('.search-filter-chip').forEach(button=>{const key=button.closest('[data-search-keywords]')?'keyword':button.closest('[data-search-types]')?'type':button.closest('[data-search-strategy-tags]')?'strategy':button.closest('[data-search-difficulties]')?'difficulty':'affiliation';button.classList.toggle('active',selected[key].has(button.textContent))});$$('.search-category-option').forEach(button=>button.classList.toggle('active',selected.category.has(button.dataset.categoryId)));updateSelectionLabels()}
function clearSearch(){Object.values(selected).forEach(set=>set.clear());keywordInput.value='';$('[data-date-kind]').value='posted';$('[data-date-range]').value='all';sortSelect.value='recommended';syncSearchControls();renderActiveFilters()}
function recommendedScore(card){return (Number(card.dataset.popular)||0)*5+(Number(card.dataset.views)||0)*0.2+(Number(card.dataset.bookmarks)||0)*15}
function cardDate(card,key){const value=card.dataset[key]||'';const time=Date.parse(value);return Number.isFinite(time)?time:0}
function renderResultPagination(totalItems){
  if(!resultPagination)return;
  const totalPages=Math.max(1,Math.ceil(totalItems/RESULT_PAGE_SIZE));
  resultPage=Math.min(Math.max(1,resultPage),totalPages);
  resultPagination.hidden=totalItems<=RESULT_PAGE_SIZE;
  if(resultPageStatus)resultPageStatus.textContent=`${resultPage} / ${totalPages}`;
  if(resultPagePrev)resultPagePrev.disabled=resultPage<=1;
  if(resultPageNext)resultPageNext.disabled=resultPage>=totalPages;
}
function runSearch(scrollToResults=true,{resetPage=true}={}){
  if(resetPage)resultPage=1;
  const identityTerms=[...selected.identity].map(x=>x.split('｜')[0].toLowerCase());
  const terms=[keywordInput.value.trim().toLowerCase(),activeTag.toLowerCase(),...['keyword','type','strategy','difficulty','affiliation'].flatMap(key=>[...selected[key]].map(x=>x.toLowerCase())),...identityTerms].filter(Boolean);
  const selectedCategory=[...selected.category][0]||'';
  const cards=postGrid?[...postGrid.querySelectorAll(':scope > .post-card')]:[];
  const matched=[];
  cards.forEach(c=>{
    const h=(c.dataset.title+' '+c.dataset.tags+' '+(c.dataset.identities||'')+' '+c.textContent).toLowerCase();
    const categoryMatches=!selectedCategory||c.dataset.category===selectedCategory;
    const matches=categoryMatches&&terms.every(t=>h.includes(t));
    c.dataset.filterMatch=matches?'true':'false';
    c.hidden=true;
    if(matches)matched.push(c);
  });
  const sortValue=resultSort?.value||sortSelect.value;
  matched.sort((a,b)=>{
    if(sortValue==='recommended'){
      const scoreDiff=recommendedScore(b)-recommendedScore(a);
      if(scoreDiff)return scoreDiff;
      return cardDate(b,'updated')-cardDate(a,'updated');
    }
    if(sortValue==='views')return (Number(b.dataset.views)||0)-(Number(a.dataset.views)||0);
    if(sortValue==='popular')return (Number(b.dataset.popular)||0)-(Number(a.dataset.popular)||0);
    if(sortValue==='updated')return cardDate(b,'updated')-cardDate(a,'updated');
    if(sortValue==='newest')return cardDate(b,'published')-cardDate(a,'published');
    return 0;
  });
  matched.forEach(c=>postGrid.appendChild(c));
  const totalPages=Math.max(1,Math.ceil(matched.length/RESULT_PAGE_SIZE));
  resultPage=Math.min(Math.max(1,resultPage),totalPages);
  const start=(resultPage-1)*RESULT_PAGE_SIZE;
  matched.slice(start,start+RESULT_PAGE_SIZE).forEach(c=>{c.hidden=false});
  resultCount.textContent=matched.length;
  emptyState.hidden=matched.length!==0;
  renderResultPagination(matched.length);
  renderActiveFilters();
  if(scrollToResults){showToast(`${matched.length}件の攻略を表示しました。`);$('#community').scrollIntoView({behavior:'smooth'})}
}
$$('[data-open-selector]').forEach(b=>b.onclick=()=>openSelector(b.dataset.openSelector));$('[data-close-modal]').onclick=()=>closeDialog(selectorModal);modalClearSelection.onclick=()=>{selected.identity.clear();renderSelectionOptions(modalSearch.value)};modalApplySelection.onclick=()=>{updateSelectionLabels();closeDialog(selectorModal)};modalSearch.oninput=e=>renderSelectionOptions(e.target.value);$('[data-search]').onclick=runSearch;$('[data-clear-search]').onclick=clearSearch;keywordInput.oninput=renderActiveFilters;if(searchPanelToggle)searchPanelToggle.onclick=()=>setSearchPanelOpen(searchPanel?.hidden??true);keywordInput.onkeydown=e=>{if(e.key==='Enter')runSearch()};$('[data-date-kind]').onchange=renderActiveFilters;$('[data-date-range]').onchange=renderActiveFilters;if(resultSort)resultSort.onchange=()=>runSearch(false);advancedToggle.onclick=()=>{const open=advancedPanel.hidden;advancedPanel.hidden=!open;advancedToggle.setAttribute('aria-expanded',String(open));advancedToggle.innerHTML=open?'<span>−</span> 詳細条件を閉じる':'<span>＋</span> 詳細条件を表示'};
document.addEventListener('click',event=>{const b=event.target.closest('[data-tag]');if(!b)return;const on=b.classList.contains('active');$$('[data-tag]').forEach(x=>x.classList.remove('active'));activeTag=on?'':b.dataset.tag;if(!on)b.classList.add('active');renderActiveFilters();runSearch()});$$('[data-demo-detail]').forEach(b=>b.onclick=()=>showToast('詳細ページは次の段階で実装予定です。'));if(resultPagePrev)resultPagePrev.onclick=()=>{if(resultPage<=1)return;resultPage-=1;runSearch(false,{resetPage:false});$('#community')?.scrollIntoView({behavior:'smooth',block:'start'})};if(resultPageNext)resultPageNext.onclick=()=>{resultPage+=1;runSearch(false,{resetPage:false});$('#community')?.scrollIntoView({behavior:'smooth',block:'start'})};window.addEventListener('limbus-posts-loaded',()=>runSearch(false));window.addEventListener('limbus-like-updated',()=>runSearch(false,{resetPage:false}));$('[data-scroll-search]').onclick=()=>setSearchPanelOpen(true,{scroll:true});document.querySelectorAll('a[href="#search"]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();setSearchPanelOpen(true,{scroll:true});}));

// 攻略カテゴリ（検索・閲覧）
function selectBrowseCategory(categoryId,{scroll=true}={}){const category=categoryById(categoryId);if(!category.available){showToast(`${category.label}は実装予定です。`);return}selected.category.clear();selected.category.add(category.id);syncSearchControls();$$('.browse-category-tab').forEach(button=>button.classList.toggle('active',button.dataset.categoryId===category.id));const current=$('[data-current-browse-category]');if(current)current.textContent=category.label;renderActiveFilters();runSearch(false);if(scroll)$('#community')?.scrollIntoView({behavior:'smooth'});}
function renderBrowseCategoryTabs(){const root=$('[data-browse-category-tabs]');if(!root)return;root.innerHTML='';categoryDefinitions.forEach(category=>{const button=document.createElement('button');button.type='button';button.className='browse-category-tab';button.disabled=!category.available;button.dataset.categoryId=category.id;button.innerHTML=`<span class="browse-category-icon">${categoryIconMarkup(category)}</span><strong>${category.label}</strong>${category.available?'':'<small>※実装予定</small>'}`;button.addEventListener('click',()=>selectBrowseCategory(category.id));root.appendChild(button)})}
renderBrowseCategoryTabs();
const initialBrowseCategory=categoryDefinitions.find(category=>category.available);if(initialBrowseCategory){$$('.browse-category-tab').forEach(button=>button.classList.toggle('active',button.dataset.categoryId===initialBrowseCategory.id));}
$$('[data-browse-category]').forEach(button=>button.addEventListener('click',()=>selectBrowseCategory(button.dataset.browseCategory,{scroll:true})));

  selectorModal.addEventListener('click',event=>{if(event.target===selectorModal)closeDialog(selectorModal)});
  return {renderActiveFilters,runSearch};
}

window.LimbusSearchController={create:createSearchController};
})();
