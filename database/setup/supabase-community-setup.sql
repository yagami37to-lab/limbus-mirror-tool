-- Limbus Company 攻略投稿サイト v1.0.0
-- Supabase Dashboard > SQL Editor で一度だけ実行してください。

create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  summary text not null default '' check (char_length(summary) <= 60),
  category text not null default 'mirror_dungeon',
  difficulty text,
  strategy_type text,
  status text not null default 'draft' check (status in ('draft','published','private')),
  content jsonb not null default '{}'::jsonb,
  views integer not null default 0 check (views >= 0),
  likes integer not null default 0 check (likes >= 0),
  bookmark_count integer not null default 0 check (bookmark_count >= 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_author_id_idx on public.posts(author_id);
create index if not exists posts_status_published_at_idx on public.posts(status, published_at desc);

create table if not exists public.bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_key text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, post_key)
);

alter table public.posts add column if not exists bookmark_count integer not null default 0 check (bookmark_count >= 0);

create or replace function public.sync_post_bookmark_count()
returns trigger language plpgsql security definer set search_path=public as $$
declare target_key text := coalesce(new.post_key,old.post_key);
begin
  update public.posts set bookmark_count=(select count(*) from public.bookmarks where post_key=target_key) where id::text=target_key;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
drop trigger if exists post_bookmarks_sync_count on public.bookmarks;
create trigger post_bookmarks_sync_count after insert or delete on public.bookmarks for each row execute function public.sync_post_bookmark_count();

alter table public.posts enable row level security;
alter table public.bookmarks enable row level security;

drop policy if exists "published posts are public" on public.posts;
create policy "published posts are public" on public.posts
for select using (status = 'published' or auth.uid() = author_id);

drop policy if exists "users create own posts" on public.posts;
create policy "users create own posts" on public.posts
for insert with check (auth.uid() = author_id);

drop policy if exists "users update own posts" on public.posts;
create policy "users update own posts" on public.posts
for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists "users delete own posts" on public.posts;
create policy "users delete own posts" on public.posts
for delete using (auth.uid() = author_id);

drop policy if exists "users read own bookmarks" on public.bookmarks;
create policy "users read own bookmarks" on public.bookmarks
for select using (auth.uid() = user_id);

drop policy if exists "users create own bookmarks" on public.bookmarks;
create policy "users create own bookmarks" on public.bookmarks
for insert with check (auth.uid() = user_id);

drop policy if exists "users delete own bookmarks" on public.bookmarks;
create policy "users delete own bookmarks" on public.bookmarks
for delete using (auth.uid() = user_id);

-- 投稿一覧・詳細画面で公開プロフィールを参照できるようにします。
-- profiles の SELECT ポリシーが既にある場合は何も変更しません。
