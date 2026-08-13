-- Limbus Company 攻略投稿サイト v1.0.5
-- SQL Editorで一度実行してください。

create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint follows_no_self check (follower_id <> followed_id)
);
alter table public.follows enable row level security;
drop policy if exists "follows publicly countable" on public.follows;
create policy "follows publicly countable" on public.follows for select using (true);
drop policy if exists "users follow from own account" on public.follows;
create policy "users follow from own account" on public.follows for insert with check (auth.uid()=follower_id and follower_id<>followed_id);
drop policy if exists "users unfollow from own account" on public.follows;
create policy "users unfollow from own account" on public.follows for delete using (auth.uid()=follower_id);
create index if not exists follows_followed_id_idx on public.follows(followed_id);

create or replace function public.enforce_post_limit()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if (select count(*) from public.posts where author_id=new.author_id) >= 20 then
    raise exception '1アカウントにつき投稿できる攻略は20件までです。';
  end if;
  return new;
end;$$;
drop trigger if exists posts_limit_per_account on public.posts;
create trigger posts_limit_per_account before insert on public.posts for each row execute function public.enforce_post_limit();

-- 自分の投稿を既にブックマークしていた場合は削除します。
delete from public.bookmarks b using public.posts p where b.post_key=p.id::text and b.user_id=p.author_id;

create or replace function public.prevent_own_post_bookmark()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if exists(select 1 from public.posts where id::text=new.post_key and author_id=new.user_id) then
    raise exception '自分の投稿はブックマークできません。';
  end if;
  return new;
end;$$;
drop trigger if exists bookmarks_prevent_own_post on public.bookmarks;
create trigger bookmarks_prevent_own_post before insert or update on public.bookmarks for each row execute function public.prevent_own_post_bookmark();
