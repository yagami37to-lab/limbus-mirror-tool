alter table public.posts
  add column if not exists bookmark_count integer not null default 0 check (bookmark_count >= 0);

create or replace function public.sync_post_bookmark_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_key text := coalesce(new.post_key, old.post_key);
begin
  update public.posts
     set bookmark_count = (select count(*) from public.bookmarks where post_key = target_key)
   where id::text = target_key;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists post_bookmarks_sync_count on public.bookmarks;
create trigger post_bookmarks_sync_count
after insert or delete on public.bookmarks
for each row execute function public.sync_post_bookmark_count();

update public.posts p
   set bookmark_count = (select count(*) from public.bookmarks b where b.post_key = p.id::text);
