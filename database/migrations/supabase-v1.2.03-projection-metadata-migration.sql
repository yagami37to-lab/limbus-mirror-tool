-- 射影戦闘の旧投稿へ、現在必須の難易度と達成ターンを補完する。
update public.posts
set difficulty = 'NORMAL'
where category = 'projection_combat'
  and (difficulty is null or btrim(difficulty) = '');

update public.posts
set content = jsonb_set(coalesce(content, '{}'::jsonb), '{achievementTurns}', '12'::jsonb, true)
where category = 'projection_combat'
  and title = '中指＋薬指ファウスト'
  and not (coalesce(content, '{}'::jsonb) ? 'achievementTurns');
