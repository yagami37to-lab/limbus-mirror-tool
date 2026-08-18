(()=>{
  'use strict';
  const STORAGE_KEY='limbus-owned-identities-v1';
  const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const normalize=value=>window.LimbusIdentityImages?.normalize?.(String(value??''))||String(value??'').trim();
  const key=(sinner,identity)=>`${String(sinner??'').trim()}｜${normalize(identity)}`;
  function read(){try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return new Set(Array.isArray(value)?value:[])}catch{return new Set()}}
  function write(values){localStorage.setItem(STORAGE_KEY,JSON.stringify([...values].sort()));window.dispatchEvent(new CustomEvent('limbus-owned-identities-changed'));}
  function rateForParty(party){
    const required=(Array.isArray(party)?party:[]).filter(item=>!item?.is_free&&!item?.isFreeSlot&&normalize(item?.identity)&&normalize(item?.identity)!=='自由枠（誰でも可）');
    if(!required.length)return 100;
    const owned=read();return Math.round(required.filter(item=>owned.has(key(item.sinner,item.identity))).length/required.length*100);
  }
  function applyCard(card,party){
    const rate=rateForParty(party);card.dataset.ownedRate=String(rate);
    const label=[...card.querySelectorAll('.post-card-label')].find(node=>node.textContent.includes('使用人格'));if(!label)return;
    let badge=label.querySelector('.post-owned-rate');if(!badge){badge=document.createElement('span');badge.className='post-owned-rate';label.appendChild(badge)}
    badge.textContent=`所持率 ${rate}%`;badge.dataset.rate=String(rate);badge.dataset.level=rate>=80?'high':rate>=50?'mid':'low';
  }
  function createSettingsRoot(){
    if(document.body.dataset.accountPage!=='settings')return null;
    const root=document.createElement('section');root.className='account-card owned-identity-settings';root.dataset.accountContent='';root.dataset.ownedIdentitySettings='';root.hidden=true;
    root.innerHTML='<div class="owned-identity-heading"><div><p class="account-kicker">OWNED IDENTITIES</p><h2 class="account-section-title">所持人格設定</h2><p>所持している人格を登録すると、攻略投稿に編成の所持率を表示できます。</p></div><strong data-owned-identity-summary>0人格を所持</strong></div><div class="owned-identity-tools"><input type="search" data-owned-identity-search placeholder="囚人名・人格名で絞り込み"><button class="account-secondary" type="button" data-owned-all>すべて所持</button><button class="account-secondary account-danger" type="button" data-owned-clear>すべて解除</button></div><div class="owned-identity-grid" data-owned-identity-grid></div>';
    document.querySelector('.account-main')?.appendChild(root);return root;
  }
  async function setupSettings(){
    const root=document.querySelector('[data-owned-identity-settings]')||createSettingsRoot();if(!root)return;
    const grid=root.querySelector('[data-owned-identity-grid]'),search=root.querySelector('[data-owned-identity-search]'),summary=root.querySelector('[data-owned-identity-summary]');let data=[];
    try{const response=await fetch('data/identities.json?v=1.1.44');if(!response.ok)throw new Error('identities');data=await response.json()}catch{root.innerHTML='<p class="account-notice" data-state="error">人格データを読み込めませんでした。</p>';return}
    const all=data.flatMap(sinner=>sinner.identities.map(identity=>({sinner:sinner.name,name:identity.name,image:window.LimbusIdentityImages?.forIdentity?.(sinner.name,identity.name)||'',key:key(sinner.name,identity.name)})));
    let owned=read();const updateSummary=()=>{summary.textContent=`${owned.size} / ${all.length} 人格を所持`};
    const render=()=>{const term=search.value.trim().toLowerCase();grid.innerHTML=all.filter(item=>`${item.sinner} ${item.name}`.toLowerCase().includes(term)).map(item=>`<label class="owned-identity-item${owned.has(item.key)?' is-owned':''}"${item.image?` style="--owned-image:url('${esc(item.image)}')"`:''}><input type="checkbox" value="${esc(item.key)}" ${owned.has(item.key)?'checked':''}><span><small>${esc(item.sinner)}</small><b>${esc(item.name)}</b></span></label>`).join('');grid.querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{if(input.checked)owned.add(input.value);else owned.delete(input.value);write(owned);input.closest('.owned-identity-item').classList.toggle('is-owned',input.checked);updateSummary()}));updateSummary()};
    search.addEventListener('input',render);root.querySelector('[data-owned-all]').addEventListener('click',()=>{owned=new Set(all.map(item=>item.key));write(owned);render()});root.querySelector('[data-owned-clear]').addEventListener('click',()=>{if(!confirm('所持人格の設定をすべて解除しますか？'))return;owned=new Set();write(owned);render()});render();
  }
  window.LimbusOwnedIdentities={read,write,key,rateForParty,applyCard};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setupSettings);else setupSettings();
})();
