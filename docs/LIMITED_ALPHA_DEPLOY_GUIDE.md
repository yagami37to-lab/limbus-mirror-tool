# 限定αテスト公開手順（v1.0.6）

## 1. 公開前確認
- `js/supabase-config.js` には Project URL と Publishable key だけを置きます。
- Secret key / service_role key は絶対に配置しません。
- `database/setup/supabase-community-setup.sql` をSupabase SQL Editorで実行済みか確認します。
- 他人の非公開投稿を閲覧・編集・削除できないことを確認します。

## 2. GitHubへ保存
1. GitHubで新しいPrivateリポジトリを作成します。
2. このフォルダの中身をリポジトリ直下へアップロードします。
3. `.zip`のままではなく、`index.html`がリポジトリ直下に見える状態にします。

## 3. Cloudflare Pages
1. Cloudflare Dashboardから Workers & Pages を開きます。
2. Create application → Pages → Connect to Git を選びます。
3. 作成したPrivateリポジトリを選択します。
4. Framework presetは None、Build commandは空欄、Build output directoryは `/` または未指定にします。
5. Deployを実行し、`https://プロジェクト名.pages.dev` を取得します。

## 4. Supabase Auth URL
Authentication → URL Configurationで設定します。
- Site URL: 公開されたPages URL
- Redirect URLs: `https://プロジェクト名.pages.dev/**`
- ローカル開発を続ける場合はlocalhostやLAN内URLも残します。

## 5. Google OAuth
Google Cloud ConsoleのOAuthクライアントで、公開Pages URLを承認済みJavaScript生成元へ追加します。SupabaseのCallback URLは既存設定を維持します。

## 6. 初回テスト
- 未ログイン閲覧
- Googleログイン／ログアウト
- プロフィール保存
- 公開投稿／下書き／公開切替／削除
- 別アカウントからの閲覧制御
- PCとスマホ間のブックマーク同期
- iPhone Safari、Chrome、Edgeでの表示
- 不具合報告ページから報告文をコピーできること

`robots.txt`、各ページのnoindex、Cloudflare用`_headers`により検索除外を促していますが、URLを知る人のアクセスを完全には防げません。URLはテスターだけへ共有してください。
