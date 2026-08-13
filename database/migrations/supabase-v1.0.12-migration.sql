-- Limbus Company strategy site v1.0.12
-- Run once in Supabase SQL Editor after taking a backup.

-- Correct legacy identity names already stored in published/private/draft posts.
update public.posts
set
  title = replace(replace(replace(replace(title,
    '蜘蛛の巣 薬指の子分','蜘蛛の巣 薬指の子方'),
    '蜘蛛の巣 親指の子分','蜘蛛の巣 親指の子方'),
    '蜘蛛の巣 中指の子分','蜘蛛の巣 中指の子方'),
    '蜘蛛の巣 小指の子分','蜘蛛の巣 小指の子方'),
  summary = replace(replace(replace(replace(coalesce(summary,''),
    '蜘蛛の巣 薬指の子分','蜘蛛の巣 薬指の子方'),
    '蜘蛛の巣 親指の子分','蜘蛛の巣 親指の子方'),
    '蜘蛛の巣 中指の子分','蜘蛛の巣 中指の子方'),
    '蜘蛛の巣 小指の子分','蜘蛛の巣 小指の子方'),
  content = replace(replace(replace(replace(content::text,
    '蜘蛛の巣 薬指の子分','蜘蛛の巣 薬指の子方'),
    '蜘蛛の巣 親指の子分','蜘蛛の巣 親指の子方'),
    '蜘蛛の巣 中指の子分','蜘蛛の巣 中指の子方'),
    '蜘蛛の巣 小指の子分','蜘蛛の巣 小指の子方')::jsonb,
  updated_at = now()
where title like '%蜘蛛の巣%子分%'
   or summary like '%蜘蛛の巣%子分%'
   or content::text like '%蜘蛛の巣%子分%';
