# 投稿別OGPのCloudflare設定

この実装はPages Functionsで投稿別metaタグを挿入し、Cloudflare Browser Renderingで1200×630pxの編成画像をPNG生成します。

## 初回のみ必要な設定

Cloudflare Dashboardの対象Pagesプロジェクトで、ProductionとPreviewの両方へ次のSecretsを追加します。

- `CF_ACCOUNT_ID`: CloudflareのAccount ID
- `CF_BROWSER_RENDERING_TOKEN`: `Browser Rendering - Edit` 権限を持つAPI Token

設定場所: Workers & Pages → 対象プロジェクト → Settings → Variables and Secrets

保存後、Git連携による再デプロイを行ってください。Pages FunctionsはDashboardのDirect Uploadでは利用できません。

Secrets未設定または画像生成に失敗した場合、OG画像は `assets/site/dante-lbc.jpg` へ安全にフォールバックします。

## 確認URL

- 詳細ページ: `https://<domain>/post-detail?id=<post-id>`
- OG画像: `https://<domain>/og/<post-id>`

DiscordはURLを再投稿して確認します。XはCard Validatorまたは実際の投稿下書きで確認してください。SNS側に古いキャッシュが残る場合は投稿を更新するか、OG画像URLの `v` パラメータが変わった後に再取得します。

`robots.txt` は通常の検索エンジンを引き続き拒否しつつ、`Twitterbot` と `Discordbot` にだけプレビュー取得を許可しています。
