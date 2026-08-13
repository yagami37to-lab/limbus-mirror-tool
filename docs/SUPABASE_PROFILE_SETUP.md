# Supabaseプロフィール機能の初回設定

v0.9.27ではプロフィール画面を追加しました。保存機能を有効にするため、Supabaseで次の作業を一度だけ行います。

1. Supabaseの対象プロジェクトを開く。
2. 左側の「SQL Editor」を開く。
3. 「New query」を押す。
4. このZIP内の `database/setup/supabase-profile-setup.sql` をメモ帳またはVS Codeで開く。
5. 内容をすべてコピーし、SQL Editorへ貼り付ける。
6. 右下または上部の「Run」を押す。
7. エラーが出なければ、サイトのプロフィール画面を再読み込みする。

このSQLは以下を行います。

- `profiles` テーブルの作成
- RLS（行レベルセキュリティ）の有効化
- プロフィールは誰でも閲覧可能
- 編集・追加は本人だけ可能
- 新規ユーザー登録時のプロフィール自動作成
- すでに登録済みのユーザーのプロフィール作成

注意：`supabase-config.js` のSecret keyやService Role keyは使用しません。既存のPublishable keyのままで動作します。
