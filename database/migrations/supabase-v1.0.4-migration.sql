-- Limbus Company 攻略投稿サイト v1.0.5
-- Supabase Dashboard > SQL Editor で一度実行してください。
-- 訪問数、実いいね、管理者権限を追加します。

alter table public.profiles add column if not exists role text not null default 'user' check (role in ('user','admin'));

-- 管理者アカウントを指定。メールアドレスは公開プロフィールには保存・表示しません。
insert into public.profiles(id,display_name,role)
select u.id,coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name','管理人M'),'admin'
from auth.users u
where lower(u.email)=lower('hatatumasa@gmail.com')
on conflict(id) do update set role='admin';

create table if not exists public.post_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,post_id)
);
alter table public.post_likes enable row level security;
drop policy if exists "likes are publicly countable" on public.post_likes;
create policy "likes are publicly countable" on public.post_likes for select using (true);
drop policy if exists "users create own likes" on public.post_likes;
create policy "users create own likes" on public.post_likes for insert with check (auth.uid()=user_id);
drop policy if exists "users delete own likes" on public.post_likes;
create policy "users delete own likes" on public.post_likes for delete using (auth.uid()=user_id);

create or replace function public.sync_post_like_count()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  update public.posts set likes=(select count(*) from public.post_likes where post_id=coalesce(new.post_id,old.post_id)) where id=coalesce(new.post_id,old.post_id);
  return coalesce(new,old);
end;$$;
drop trigger if exists post_likes_sync_count on public.post_likes;
create trigger post_likes_sync_count after insert or delete on public.post_likes for each row execute function public.sync_post_like_count();
update public.posts p set likes=(select count(*) from public.post_likes l where l.post_id=p.id);

create table if not exists public.site_visits (
  visit_day date not null default current_date,
  visitor_hash text not null,
  created_at timestamptz not null default now(),
  primary key(visit_day,visitor_hash)
);
alter table public.site_visits enable row level security;

create or replace function public.register_site_visit(visitor_key text)
returns bigint language plpgsql security definer set search_path=public as $$
declare total bigint;
begin
  if visitor_key is null or char_length(visitor_key)<8 then raise exception 'invalid visitor key'; end if;
  insert into public.site_visits(visit_day,visitor_hash)
  values(current_date,encode(digest(visitor_key,'sha256'),'hex')) on conflict do nothing;
  select count(*) into total from public.site_visits;
  return total;
end;$$;
grant execute on function public.register_site_visit(text) to anon,authenticated;

-- roleは利用者自身が書き換えられないよう、プロフィール更新時に旧値へ戻します。
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if auth.uid()=old.id and new.role is distinct from old.role then new.role=old.role; end if;
  return new;
end;$$;
drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles for each row execute function public.protect_profile_role();
