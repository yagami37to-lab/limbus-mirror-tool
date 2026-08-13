(() => {
  'use strict';
  const cfg = window.LIMBUS_SUPABASE_CONFIG || {};
  const configured = cfg.url && cfg.publishableKey && !cfg.url.includes('PASTE_') && !cfg.publishableKey.includes('PASTE_');
  const client = configured && window.supabase ? window.supabase.createClient(cfg.url, cfg.publishableKey) : null;
  window.limbusSupabase = client;

  const qs=(s,r=document)=>r.querySelector(s), qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const modal=qs('[data-auth-dialog]');
  const status=qs('[data-auth-status]');
  const loginButtons=qsa('[data-open-auth]');
  const accountButtons=qsa('[data-account-button]');
  const logoutButtons=qsa('[data-auth-logout]');
  const accountMenus=qsa('[data-account-menu]');
  let currentUser=null;
  let currentProfile=null;

  function message(text, type='info'){
    if(!status) return;
    status.textContent=text;
    status.dataset.state=type;
    status.hidden=!text;
  }
  function displayName(user){
    return currentProfile?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'ユーザー';
  }
  function avatarUrl(user){
    return currentProfile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || 'logo-mark.svg';
  }
  async function refreshProfile(user=currentUser){
    if(!client||!user){currentProfile=null;syncUI(user);return null;}
    const {data,error}=await client.from('profiles').select('display_name,avatar_url,updated_at').eq('id',user.id).maybeSingle();
    if(error){console.warn('最新プロフィールを取得できませんでした。',error);return currentProfile;}
    currentProfile=data||null;syncUI(user);return currentProfile;
  }
  function closeAccountMenus(){
    accountMenus.forEach(menu=>menu.hidden=true);
    accountButtons.forEach(button=>button.setAttribute('aria-expanded','false'));
  }
  function syncUI(user){
    currentUser=user||null;
    if(!user)currentProfile=null;
    localStorage.setItem('limbus-auth', user ? 'logged-in' : 'logged-out');
    qsa('[data-auth-guest]').forEach(n=>n.hidden=!!user);
    qsa('[data-auth-user]').forEach(n=>n.hidden=!user);
    qsa('[data-auth-user-name]').forEach(n=>n.textContent=user?displayName(user):'');
    qsa('[data-auth-user-email]').forEach(n=>n.textContent=user?.email||'');
    qsa('[data-auth-user-avatar]').forEach(n=>{ n.src=user?avatarUrl(user):'logo-mark.svg'; n.alt=user?`${displayName(user)}のアイコン`:''; });
    if(!user) closeAccountMenus();
    window.dispatchEvent(new CustomEvent('limbus-auth-changed',{detail:{user}}));
  }
  function open(){
    if(!modal) return;
    message(configured ? '' : 'Supabase接続設定が未入力です。js/supabase-config.js を設定してください。','warning');
    if(typeof modal.showModal==='function') modal.showModal(); else modal.setAttribute('open','');
  }
  function close(){ if(modal?.open) modal.close(); }

  loginButtons.forEach(b=>b.addEventListener('click',open));
  qsa('[data-close-auth]').forEach(b=>b.addEventListener('click',close));
  modal?.addEventListener('click',e=>{ if(e.target===modal) close(); });

  qsa('[data-auth-google]').forEach(b=>b.addEventListener('click',async()=>{
    if(!client){ message('Supabase接続設定が未入力です。','error'); return; }
    message('Googleのログイン画面を開いています…');
    const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.href.split('#')[0]}});
    if(error) message(`Googleログインを開始できませんでした：${error.message}`,'error');
  }));

  qsa('[data-auth-email-form]').forEach(form=>form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!client){ message('Supabase接続設定が未入力です。','error'); return; }
    const email=qs('[name=email]',form)?.value.trim();
    const password=qs('[name=password]',form)?.value || '';
    const mode=form.dataset.mode||'login';
    if(!email || password.length<6){ message('メールアドレスと6文字以上のパスワードを入力してください。','error'); return; }
    message(mode==='signup'?'登録処理中です…':'ログイン中です…');
    const result=mode==='signup'
      ? await client.auth.signUp({email,password,options:{emailRedirectTo:window.location.href.split('#')[0]}})
      : await client.auth.signInWithPassword({email,password});
    if(result.error){ message(result.error.message,'error'); return; }
    if(mode==='signup' && !result.data.session){ message('確認メールを送信しました。メール内のリンクを開いて登録を完了してください。','success'); }
    else { message('ログインしました。','success'); syncUI(result.data.user); setTimeout(close,500); }
  }));

  qsa('[data-auth-mode]').forEach(b=>b.addEventListener('click',()=>{
    const form=qs('[data-auth-email-form]'); if(!form) return;
    const signup=form.dataset.mode!=='signup';
    form.dataset.mode=signup?'signup':'login';
    qs('[data-auth-submit]',form).textContent=signup?'メールで新規登録':'メールでログイン';
    b.textContent=signup?'ログインへ戻る':'メールで新規登録する';
    message('');
  }));

  qsa('[data-auth-reset]').forEach(b=>b.addEventListener('click',async()=>{
    const form=qs('[data-auth-email-form]'); const email=qs('[name=email]',form)?.value.trim();
    if(!client){ message('Supabase接続設定が未入力です。','error'); return; }
    if(!email){ message('先にメールアドレスを入力してください。','error'); return; }
    const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:window.location.href.split('#')[0]});
    message(error?error.message:'パスワード再設定メールを送信しました。',error?'error':'success');
  }));

  logoutButtons.forEach(b=>b.addEventListener('click',async()=>{
    if(client) await client.auth.signOut();
    syncUI(null);
  }));

  accountButtons.forEach(b=>b.addEventListener('click',e=>{
    e.stopPropagation();
    const wrap=b.closest('[data-account-wrap]');
    const menu=qs('[data-account-menu]',wrap||document);
    const willOpen=!!menu?.hidden;
    closeAccountMenus();
    if(menu && willOpen){ menu.hidden=false; b.setAttribute('aria-expanded','true'); }
  }));
  document.addEventListener('click',e=>{ if(!e.target.closest('[data-account-wrap]')) closeAccountMenus(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ closeAccountMenus(); close(); } });
  qsa('[data-account-action]').forEach(button=>button.addEventListener('click',()=>{
    const action=button.dataset.accountAction;
    closeAccountMenus();
    const routes={account:'account.html',profile:'profile.html',posts:'my-posts.html',bookmarks:'bookmarks.html',settings:'settings.html'};
    if(routes[action]) window.location.href=routes[action];
  }));

  async function init(){
    if(!client){ syncUI(null); return; }
    const {data}=await client.auth.getSession();
    const user=data.session?.user||null;
    syncUI(user);
    if(user)await refreshProfile(user);
    client.auth.onAuthStateChange(async(_event,session)=>{const next=session?.user||null;syncUI(next);if(next)await refreshProfile(next);});
  }
  window.addEventListener('pageshow',()=>{if(currentUser)refreshProfile(currentUser);});
  window.addEventListener('limbus-profile-updated',event=>{currentProfile=event.detail?.profile||currentProfile;syncUI(currentUser);if(currentUser)refreshProfile(currentUser);});
  window.addEventListener('storage',event=>{if(event.key==='limbus-profile-updated-at'&&currentUser)refreshProfile(currentUser);});
  window.LimbusAuth={open,close,getUser:()=>currentUser,refreshProfile:()=>refreshProfile(currentUser),isConfigured:()=>configured};
  init();
})();
