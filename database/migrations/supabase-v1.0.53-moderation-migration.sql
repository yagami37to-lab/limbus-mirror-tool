-- Limbus Company 攻略投稿サイト v1.0.53
-- Supabase Dashboard > SQL Editor で一度だけ実行してください。
-- 表示名重複防止 / 投稿通報 / 投稿非表示・削除 / サイト内BAN / 管理者用RPC を追加します。

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. 管理者・BAN判定ヘルパー
-- -----------------------------------------------------------------------------
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_current_user_admin() to anon, authenticated;

create table if not exists public.user_moderation (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_banned boolean not null default false,
  banned_at timestamptz,
  ban_reason text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.user_moderation enable row level security;
drop policy if exists "admins read user moderation" on public.user_moderation;
create policy "admins read user moderation" on public.user_moderation for select to authenticated using (public.is_current_user_admin());

create or replace function public.is_current_user_banned()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_banned from public.user_moderation where user_id = auth.uid()), false);
$$;

grant execute on function public.is_current_user_banned() to authenticated;

-- -----------------------------------------------------------------------------
-- 2. 表示名の重複防止
-- 大文字小文字と前後空白を無視して同名を禁止します。
-- advisory lock を使い、同時更新でも重複しにくいようにしています。
-- -----------------------------------------------------------------------------
create or replace function public.prevent_duplicate_display_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text;
begin
  new.display_name := btrim(new.display_name);
  normalized_name := lower(new.display_name);

  if new.display_name = '' then
    raise exception using message = 'display_name_required', errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext(normalized_name));

  if exists (
    select 1
    from public.profiles p
    where p.id <> new.id
      and lower(btrim(p.display_name)) = normalized_name
  ) then
    raise exception using message = 'display_name_taken', errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_duplicate_display_name on public.profiles;
create trigger profiles_prevent_duplicate_display_name
before insert or update of display_name on public.profiles
for each row execute function public.prevent_duplicate_display_name();

-- 新規Authユーザーの初期名が既存名と重なる場合は、UUID先頭4文字を付けて登録します。
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_name text;
  candidate text;
begin
  base_name := btrim(coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1),
    'ユーザー'
  ));
  if base_name = '' then base_name := 'ユーザー'; end if;
  base_name := left(base_name, 30);
  candidate := base_name;

  if exists(select 1 from public.profiles where lower(btrim(display_name)) = lower(candidate)) then
    candidate := left(base_name, 24) || '-' || left(new.id::text, 4);
  end if;

  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    candidate,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. 投稿のモデレーション状態
-- visible = 通常表示 / hidden = 管理者による非表示
-- -----------------------------------------------------------------------------
alter table public.posts
  add column if not exists moderation_status text not null default 'visible',
  add column if not exists moderation_note text,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references auth.users(id) on delete set null;

alter table public.posts drop constraint if exists posts_moderation_status_check;
alter table public.posts add constraint posts_moderation_status_check
  check (moderation_status in ('visible','hidden'));

create index if not exists posts_moderation_status_idx on public.posts(moderation_status);

-- -----------------------------------------------------------------------------
-- 4. 通報テーブル
-- -----------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete set null,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('spam','harassment','inappropriate','misinformation','other')),
  details text check (details is null or char_length(details) <= 1000),
  status text not null default 'pending' check (status in ('pending','reviewing','dismissed','actioned')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  unique(reporter_id, post_id)
);

alter table public.reports drop constraint if exists reports_post_id_fkey;
alter table public.reports add constraint reports_post_id_fkey foreign key(post_id) references public.posts(id) on delete set null;

create index if not exists reports_status_created_idx on public.reports(status, created_at desc);
create index if not exists reports_post_id_idx on public.reports(post_id);
create index if not exists reports_reported_user_idx on public.reports(reported_user_id);

alter table public.reports enable row level security;

drop policy if exists "users create own reports" on public.reports;
create policy "users create own reports" on public.reports
for insert to authenticated
with check (
  auth.uid() = reporter_id
  and not public.is_current_user_banned()
  and reporter_id <> reported_user_id
  and exists (
    select 1 from public.posts p
    where p.id = post_id
      and p.author_id = reported_user_id
      and p.status = 'published'
  )
);

drop policy if exists "users read own reports" on public.reports;
create policy "users read own reports" on public.reports
for select to authenticated
using (auth.uid() = reporter_id or public.is_current_user_admin());

-- -----------------------------------------------------------------------------
-- 5. 投稿・各種アクションのRLSをBAN / 非表示対応へ更新
-- -----------------------------------------------------------------------------
drop policy if exists "published posts are public" on public.posts;
create policy "published posts are public" on public.posts
for select
using (
  (status = 'published' and moderation_status = 'visible')
  or auth.uid() = author_id
  or public.is_current_user_admin()
);

drop policy if exists "users create own posts" on public.posts;
create policy "users create own posts" on public.posts
for insert to authenticated
with check (auth.uid() = author_id and not public.is_current_user_banned());

drop policy if exists "users update own posts" on public.posts;
create policy "users update own posts" on public.posts
for update to authenticated
using (auth.uid() = author_id and not public.is_current_user_banned())
with check (auth.uid() = author_id and not public.is_current_user_banned());

drop policy if exists "users delete own posts" on public.posts;
create policy "users delete own posts" on public.posts
for delete to authenticated
using (auth.uid() = author_id and not public.is_current_user_banned());

-- BAN中はプロフィールを書き換え不可。管理者のモデレーション操作はRPC経由です。
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update to authenticated
using (auth.uid() = id and not public.is_current_user_banned())
with check (auth.uid() = id and not public.is_current_user_banned());

-- 既存のいいね・ブックマーク・フォロー操作もBAN中は追加/削除不可にします。
drop policy if exists "users create own likes" on public.post_likes;
create policy "users create own likes" on public.post_likes
for insert to authenticated
with check (auth.uid() = user_id and not public.is_current_user_banned());

drop policy if exists "users delete own likes" on public.post_likes;
create policy "users delete own likes" on public.post_likes
for delete to authenticated
using (auth.uid() = user_id and not public.is_current_user_banned());

drop policy if exists "users create own bookmarks" on public.bookmarks;
create policy "users create own bookmarks" on public.bookmarks
for insert to authenticated
with check (auth.uid() = user_id and not public.is_current_user_banned());

drop policy if exists "users delete own bookmarks" on public.bookmarks;
create policy "users delete own bookmarks" on public.bookmarks
for delete to authenticated
using (auth.uid() = user_id and not public.is_current_user_banned());

-- follows テーブルがある環境のみポリシーを更新します。
do $$
begin
  if to_regclass('public.follows') is not null then
    execute 'drop policy if exists "users follow from own account" on public.follows';
    execute 'create policy "users follow from own account" on public.follows for insert to authenticated with check (auth.uid()=follower_id and follower_id<>followed_id and not public.is_current_user_banned())';
    execute 'drop policy if exists "users unfollow from own account" on public.follows';
    execute 'create policy "users unfollow from own account" on public.follows for delete to authenticated using (auth.uid()=follower_id and not public.is_current_user_banned())';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 6. 管理者専用RPC
-- service_roleをブラウザへ置かず、現在ログイン中のadminだけ実行できます。
-- -----------------------------------------------------------------------------
create or replace function public.admin_set_post_visibility(target_post_id uuid, make_visible boolean, admin_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then raise exception 'admin_required'; end if;
  update public.posts
  set moderation_status = case when make_visible then 'visible' else 'hidden' end,
      moderation_note = nullif(btrim(admin_note),''),
      moderated_at = now(),
      moderated_by = auth.uid()
  where id = target_post_id;
end;
$$;

create or replace function public.admin_delete_post(target_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then raise exception 'admin_required'; end if;
  delete from public.posts where id = target_post_id;
end;
$$;

create or replace function public.admin_set_user_ban(target_user_id uuid, banned boolean, reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then raise exception 'admin_required'; end if;
  if target_user_id = auth.uid() then raise exception 'cannot_ban_self'; end if;
  if exists(select 1 from public.profiles where id=target_user_id and role='admin') then raise exception 'cannot_ban_admin'; end if;
  insert into public.user_moderation(user_id,is_banned,banned_at,ban_reason,updated_at,updated_by)
  values(target_user_id,banned,case when banned then now() else null end,case when banned then nullif(btrim(reason),'') else null end,now(),auth.uid())
  on conflict(user_id) do update set is_banned=excluded.is_banned,banned_at=excluded.banned_at,ban_reason=excluded.ban_reason,updated_at=now(),updated_by=auth.uid();
end;
$$;

create or replace function public.admin_set_report_status(target_report_id uuid, next_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then raise exception 'admin_required'; end if;
  if next_status not in ('pending','reviewing','dismissed','actioned') then raise exception 'invalid_report_status'; end if;
  update public.reports
  set status = next_status,
      reviewed_at = case when next_status in ('dismissed','actioned') then now() else reviewed_at end,
      reviewed_by = auth.uid()
  where id = target_report_id;
end;
$$;

grant execute on function public.admin_set_post_visibility(uuid,boolean,text) to authenticated;
grant execute on function public.admin_delete_post(uuid) to authenticated;
grant execute on function public.admin_set_user_ban(uuid,boolean,text) to authenticated;
grant execute on function public.admin_set_report_status(uuid,text) to authenticated;

-- 権限昇格防止トリガーは従来どおりroleのみを保護します。
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and new.role is distinct from old.role then new.role = old.role; end if;
  return new;
end;
$$;
