-- Limbus Company strategy site v1.0.11
-- Run once in Supabase SQL Editor.

create or replace function public.register_post_view(target_post_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_views integer;
begin
  update public.posts
     set views = coalesce(views, 0) + 1
   where id = target_post_id
     and status = 'published'
  returning views into new_views;

  if new_views is null then
    raise exception 'Published post not found';
  end if;

  return new_views;
end;
$$;

grant execute on function public.register_post_view(uuid) to anon, authenticated;
