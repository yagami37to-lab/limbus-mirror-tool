-- 攻略依頼は posts.content.entryKind = 'request' として通常攻略と分離します。
-- 同じ正規化済み内容を持つ公開依頼を、アカウントに関係なく二重登録できないようにします。
create unique index if not exists posts_unique_published_request_content
on public.posts (md5(content ->> 'requestDuplicateKey'))
where status = 'published'
  and content ->> 'entryKind' = 'request'
  and coalesce(content ->> 'requestDuplicateKey', '') <> '';

comment on index public.posts_unique_published_request_content is
'公開中の攻略依頼について、同一内容の重複投稿を防止する。';
