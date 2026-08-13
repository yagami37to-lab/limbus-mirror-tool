# v1.0.0 投稿・ブックマーク機能のSupabase設定

1. Supabase管理画面で **SQL Editor** を開きます。
2. **New query** を押します。
3. `database/setup/supabase-community-setup.sql` の中身をすべて貼り付けます。
4. 右上の **Run** を押します。
5. **Table Editor** に `posts` と `bookmarks` が追加されれば完了です。

このSQLは投稿とブックマークの保存場所、本人だけが編集・削除できるRLSを作ります。Secret keyは不要です。
