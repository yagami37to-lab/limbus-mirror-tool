(()=>{
  'use strict';
  const root=document.querySelector('[data-update-history]');
  if(!root)return;
  const categoryOrder=['新機能','画像追加','改善','修正','確認','将来対応'];
  const categoryClass={'新機能':'is-feature','画像追加':'is-image','改善':'is-improvement','修正':'is-fix','確認':'is-check','将来対応':'is-future'};
  function classify(category,text){
    if(categoryOrder.includes(category))return category;
    const value=`${category||''} ${text||''}`;
    if(/将来対応|実装予定|今後対応|継続仕様|準備/.test(value))return '将来対応';
    if(/画像|アセット|サムネイル/.test(value))return '画像追加';
    if(category==='修正'||/修正|問題|バグ|誤字|脱字|名称|重複|復元|補正|互換|正しく|表示されない|反映されない|解消|防止/.test(value))return '修正';
    if(/新機能|追加|実装|新規登録|読み込み|作成|出力|入力|検索|ブックマーク|通報|共有/.test(value))return '新機能';
    if(/確認|検証/.test(value))return '確認';
    return '改善';
  }
  async function render(){
    try{
      const response=await fetch('data/update-history.json',{cache:'no-cache'});
      if(!response.ok)throw new Error('history-load-failed');
      const history=await response.json();
      if(!Array.isArray(history)||!history.length)throw new Error('history-empty');
      root.replaceChildren(...history.map(entry=>{
        const article=document.createElement('article');article.className='news-entry';
        const header=document.createElement('header');header.className='news-entry-header';
        const version=document.createElement('strong');version.textContent=`v${entry.version}`;
        const date=document.createElement('time');date.dateTime=(entry.date||'').replaceAll('.','-');date.textContent=(entry.date||'').replaceAll('-','.');
        header.append(version,date);
        const summary=document.createElement('p');summary.className='news-entry-summary';summary.textContent=entry.summary||entry.title||'';
        const groups=document.createElement('div');groups.className='news-change-groups';
        const groupedChanges=Array.isArray(entry.groups)?entry.groups.reduce((acc,group)=>{const key=group?.tag;const items=Array.isArray(group?.items)?group.items:[];if(key&&items.length)(acc[key]??=[]).push(...items);return acc;},{}):{};
        const normalizedChanges=Array.isArray(entry.changes)
          ? entry.changes.reduce((acc,item)=>{const key=item?.type;const texts=Array.isArray(item?.items)?item.items:(item?.text?[item.text]:[]);if(key&&texts.length)(acc[key]??=[]).push(...texts);return acc;},{})
          : (entry.changes&&Object.keys(entry.changes).length?entry.changes:groupedChanges);
        const categorized=Object.fromEntries(categoryOrder.map(category=>[category,[]]));
        Object.entries(normalizedChanges).forEach(([category,values])=>(Array.isArray(values)?values:[]).forEach(text=>{if(!String(text).trim())return;categorized[classify(category,text)].push(String(text))}));
        categoryOrder.forEach(category=>{
          const items=[...new Set(categorized[category])];
          if(!items.length)return;
          const group=document.createElement('section');group.className='news-change-group';
          const label=document.createElement('span');label.className=`news-change-label ${categoryClass[category]||'is-improvement'}`;label.textContent=category;label.title=category;label.setAttribute('aria-label',category);
          const list=document.createElement('ul');items.forEach(text=>{const item=document.createElement('li');item.textContent=text;list.appendChild(item)});
          group.append(label,list);groups.appendChild(group);
        });
        article.append(header,summary,groups);return article;
      }));
    }catch(error){console.warn('更新履歴を読み込めませんでした。',error);root.innerHTML='<p class="news-load-error">更新履歴を読み込めませんでした。</p>';}
  }
  render();
})();
