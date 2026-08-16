# E.G.O画像の提出・配置ガイド

画像名と配置先は [`ego-image-list.csv`](ego-image-list.csv) を正本とします。全111件について、囚人・ランク・E.G.O名・ファイル名・配置先を一覧化しています。

## 提出方法

1. CSVで対象のE.G.Oを検索します。
2. `filename` 列の名前へ変更します（例: イサン「過ぎし日」は `005.png`）。
3. `path` 列と同じ囚人フォルダー単位でまとめて提出します。

推奨形式はPNGです。画像の追加後は `js/ego-images.js` の `available` に `囚人ID:E.G.O名` を追加すると投稿エディターへ表示されます。

現在の適用画像:

- イサンのE.G.O全9種（`001.png`～`009.png`）
- `assets/egos/yi-sang/`
- ファウストのE.G.O全10種（`001.png`～`010.png`）
- `assets/egos/faust/`
