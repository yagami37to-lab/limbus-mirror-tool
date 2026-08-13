Limbus Company 攻略投稿サイト（非公式）
- v1.0.69: トップページ検索の折りたたみ化、スマホ管理者おすすめの操作配置を改善
- v1.0.63: 代用人格画像を編成順と同じズーム表示へ統一
- v1.0.61: 代用人格画像の表示修正、攻略タイプロゴの再反映

現在のサイトバージョン: v1.0.69
- v1.0.58: 投稿画面の攻略タイプ用ロゴを新デザインへ更新
- v1.0.46: レスポンシブ表示と代用人格UIの不具合を修正
- v1.0.39: 人格のキーワード消失条件を追加し、人格名・管理者表示を統一
- v1.0.38: トップページの管理者おすすめを小型化し、ソロ／通常攻略の表示高さを統一
- v1.0.37: トップページ情報配置・お知らせページ・管理者統計画面を改善

このフォルダは Cloudflare Pages で公開する静的サイト本体です。
投稿・認証・プロフィール等のオンラインデータは Supabase を利用します。

【実行ファイル】
- index.html / app.js / styles.css : トップページ・投稿エディター・共通UI
- post-detail.html / post-detail.js : 攻略詳細画面
- account.html / bookmarks.html / drafts.html / my-posts.html / settings.html : アカウント関連画面
- profile.html / privacy.html / terms.html : プロフィール・ポリシー画面
- js/ : 認証・コミュニティ・アカウント等の機能
- css/ : 画面別の追加スタイル
- data/ : 人格・E.G.O・キーワード・テーマパック・更新履歴
- assets/ : カテゴリアイコン等の静的素材

【運用・開発資料】
- docs/ : Supabaseセットアップ、限定αデプロイ、過去の整理レポート
- database/setup/ : 初期セットアップ用SQL
- database/migrations/ : バージョン別DB移行SQL

上記 docs / database はブラウザから読み込まれるサイト実行ファイルではありません。
DB再構築・移行履歴として残しています。Service Role Keyはブラウザ側のファイルへ置かないでください。

【更新時の注意】
- サイト内Version、CHANGELOG.md、data/update-history.json、各HTMLのキャッシュ番号を同じバージョンへ同期する。
- 不要か判断できないDB移行SQLは削除せず database/migrations/ に保存する。
- 差分ZIP適用だけではファイル移動・削除が反映されない場合があるため、大規模整理時は全体ZIPへの置き換えを優先する。
- ローカルでGit管理している場合 `.git/` は保持する。配布・共有ZIPには含めなくてよい。

【整理履歴】
- v1.0.32: 不要ファイル・旧作業物の整理（docs/CLEANUP_REPORT_v1.0.32.md）
- v1.0.35: コード内部と運用資料の構成整理（docs/CODE_CLEANUP_REPORT_v1.0.35.md）
