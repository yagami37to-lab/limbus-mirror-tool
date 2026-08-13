# v1.0.8 Supabase設定

プロフィール画像のアップロードを有効にするため、SupabaseのSQL Editorで `database/migrations/supabase-v1.0.8-migration.sql` を一度実行してください。

実行すると、公開バケット `profile-avatars` と、ログインユーザーが自分のフォルダだけを更新できるStorageポリシーが作成されます。
