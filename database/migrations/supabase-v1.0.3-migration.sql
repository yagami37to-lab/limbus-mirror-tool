-- Limbus Company 攻略投稿サイト v1.0.3
-- Supabase Dashboard > SQL Editor で実行してください。
-- 既存データを消さず、本番投稿の保存・公開閲覧・本人管理を再確認します。

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
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_key text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, post_key)
);

create index if not exists posts_author_id_idx on public.posts(author_id);
create index if not exists posts_status_published_at_idx on public.posts(status, published_at desc);
create index if not exists bookmarks_user_id_idx on public.bookmarks(user_id);

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

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();
