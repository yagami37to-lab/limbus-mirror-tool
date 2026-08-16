Limbus Company 攻略投稿サイト（非公式）

現在のサイトバージョン: v1.1.10

このフォルダは Cloudflare Pages で公開する静的サイトの正本です。
投稿・認証・プロフィールなどのオンラインデータには Supabase を使用します。

【主要ファイル】
- index.html / app.js / styles.css : トップページ、投稿エディター、共通UI
- post-detail.html / post-detail.js : 攻略詳細画面
- account.html / bookmarks.html / drafts.html / my-posts.html / settings.html : アカウント関連画面
- profile.html / news.html / privacy.html / terms.html : その他の公開画面
- js/ : 機能別JavaScript
- css/ : 共通・画面別・レスポンシブスタイル
- data/ : 人格、E.G.O、キーワード、テーマパック、更新履歴
- assets/ : 人格画像、カテゴリ・攻略タイプ用画像

【運用・開発資料】
- docs/ : 現行のセットアップ手順、デプロイ手順、最終監査結果
- database/setup/ : Supabaseの初期セットアップSQL
- database/migrations/ : 適用順を保持するバージョン別DB移行SQL
- CHANGELOG.md : サイトの全更新履歴

docs/ と database/ はブラウザから読み込まれる実行ファイルではありません。
DB再構築・移行履歴として保持します。Service Role Keyはブラウザ側へ配置しないでください。

【更新時の注意】
- サイトの表示バージョン、CHANGELOG.md、data/update-history.jsonを同じバージョンへ更新する。
- 変更したCSS・JavaScript・画像のURLクエリ（?v=）を更新し、ブラウザキャッシュを確実に破棄する。
- 変更していないファイルのURLクエリは一律更新する必要はない。
- 不要か判断できないDB移行SQLは削除せず、database/migrations/ に保持する。
- 新しい人格画像は data/identities.json と js/identity-images.js の対応を確認して追加する。
- 大規模なファイル移動・削除後は、差分ZIPではなく正本全体での置き換えを優先する。
- .git/ はローカルでは保持し、配布・共有ZIPには含めない。

【整理状態】
- 役割別コントローラーへの機能分離は完了済み。
- 過去の段階別整理レポートはCHANGELOG.mdへ統合済み。
- 現在の構成と監査結果は docs/CODE_AUDIT_FINAL.md を参照。
