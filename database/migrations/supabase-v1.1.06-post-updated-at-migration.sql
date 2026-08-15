create or replace function public.set_post_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.author_id is distinct from old.author_id
     or new.title is distinct from old.title
     or new.summary is distinct from old.summary
     or new.category is distinct from old.category
     or new.difficulty is distinct from old.difficulty
     or new.strategy_type is distinct from old.strategy_type
     or new.status is distinct from old.status
     or new.content is distinct from old.content
     or new.published_at is distinct from old.published_at then
    new.updated_at = now();
  else
    new.updated_at = old.updated_at;
  end if;
  return new;
end;
$$;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_post_updated_at();

-- 統計更新だけで公開日時より後へ進んだ既存値を、判別可能な範囲で補正する。
update public.posts
set updated_at = published_at
where status = 'published'
  and published_at is not null
  and updated_at > published_at;
