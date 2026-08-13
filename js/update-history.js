(()=>{
  'use strict';
  const root=document.querySelector('[data-update-history]');
  if(!root)return;
  const categoryOrder=['新機能','改善','修正','将来対応'];
  const categoryClass={'新機能':'is-feature','改善':'is-improvement','修正':'is-fix','将来対応':'is-future'};
  const blockedPublicTerms=/(?:CHANGELOG|update-history|README|ZIP|キャッシュ(?:バージョン)?|\.(?:html|css|js|json|sql)\b|ファイル名|フォルダ名|Supabase|テーブル名|関数名)/i;
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
        const date=document.createElement('time');date.dateTime=entry.date||'';date.textContent=(entry.date||'').replaceAll('-','.');
        header.append(version,date);
        const summary=document.createElement('p');summary.className='news-entry-summary';summary.textContent=entry.summary||entry.title||'';
        const groups=document.createElement('div');groups.className='news-change-groups';
        const normalizedChanges=Array.isArray(entry.changes)
          ? entry.changes.reduce((acc,item)=>{const key=item?.type,text=item?.text;if(key&&text)(acc[key]??=[]).push(text);return acc;},{})
          : (entry.changes||{});
        categoryOrder.forEach(category=>{
          const values=normalizedChanges[category];
          const items=Array.isArray(values)?values.filter(text=>!blockedPublicTerms.test(String(text))):[];
          if(!items.length)return;
          const group=document.createElement('section');group.className='news-change-group';
          const label=document.createElement('span');label.className=`news-change-label ${categoryClass[category]||''}`;label.textContent=category;
          const list=document.createElement('ul');items.forEach(text=>{const item=document.createElement('li');item.textContent=text;list.appendChild(item)});
          group.append(label,list);groups.appendChild(group);
        });
        article.append(header,summary,groups);return article;
      }));
    }catch(error){console.warn('更新履歴を読み込めませんでした。',error);root.innerHTML='<p class="news-load-error">更新履歴を読み込めませんでした。</p>';}
  }
  render();
})();
