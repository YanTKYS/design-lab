# 開発資料

[README に戻る](../README.md)

ローカル実行、テスト、GitHub Pages 公開、デザインや画面の追加に必要な資料です。利用者向けの動作は[使い方](usage.md)、各デザインの意図は[デザイン比較ガイド](comparison-guide.md)を参照してください。

## ローカル開発とテスト

Node.js 20 以上と npm を使います。CI は Node.js 22 です。リポジトリのルートで実行してください。

```sh
npm ci
npm start                          # 開発用サーバーを起動
```

サーバーは `/design-lab/` 配下に `site/` を配信します（標準ポート 4173）。ビルド工程はありません。ブラウザで `http://localhost:4173/design-lab/` を開き、ファイルを編集して再読み込みします。

別のターミナルでテストを実行します。

```sh
npm test                           # node:test によるユニットテスト
npx playwright install chromium    # 初回のブラウザインストール
npm run test:e2e                   # Playwright によるブラウザテスト
```

Linux でブラウザのシステム依存も必要な場合は、CI と同じ `npx playwright install --with-deps chromium` を使います。E2E は必要に応じて確認用サーバーを起動するため、事前の `npm start` は必須ではありません。既存サーバーの再利用などは [`playwright.config.mjs`](../playwright.config.mjs) に従います。

ユニットテストは検索・状態・入力検証・集計などの共通処理と、各デザインの描画結果を確認します。E2E は登録済みの全デザインで、一覧の検索・絞り込み・並べ替え・詳細、ダッシュボードの数値一致・条件連動・一覧への遷移、フォームの検証・確認・完了を確認します。画面切替、URL の復元と履歴、左右同期、IME、フォーム入力の非保存、キーボード操作、375〜1920px の表示、コンソールエラーや参照切れも対象です。

CI のテスト手順は [`.github/workflows/test.yml`](../.github/workflows/test.yml) が正本です。ブラウザテストは GitHub Pages と同じサブパスで動かし、相対参照の破損を検出します。

## GitHub Pages の公開

`main` ブランチへのマージ（push）で `.github/workflows/pages.yml` がテストを実行し、成功すれば `site/` をそのまま公開します（ビルド不要）。

初回のみ、リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定してください。Actions タブの「Deploy to GitHub Pages」から手動実行もできます。

ファイル参照はすべて相対パスなので、`https://<owner>.github.io/design-lab/` のサブパスで動作します。

公開ワークフローは [`.github/workflows/pages.yml`](../.github/workflows/pages.yml) を参照してください。

## 構成と状態管理

```
site/                          公開するファイル一式
  index.html                   13デザイン・3画面の比較サイトの入口
  experiments/                 独立試作と4案の比較ハブ
  assets/css/site.css          比較サイトの枠（中立的なスタイル）
  assets/css/charts.css        ダッシュボードのグラフの構造（色・太さは各デザインが変数で指定）
  assets/css/designs/*.css     デザインごとのスタイル（.ds-<id> 配下に限定）
  assets/js/data.js            架空のサンプルデータ（申請・フォームの入力例）・担当課・ナビ項目・状態の定義
  assets/js/query.js           検索・絞り込み・並べ替え・一覧のビューモデル（DOM 非依存）
  assets/js/dashboard.js       ダッシュボードの集計・一覧との条件の共有・ビューモデル（DOM 非依存）
  assets/js/form.js            フォームの項目定義・検証・状態遷移・ビューモデル（DOM 非依存）
  assets/js/state.js           画面・比較条件・一覧条件の既定値と URL の相互変換（DOM 非依存）
  assets/js/model.js           state（URL 対象）・form（メモリのみ）・ダッシュボードを合成した画面のビューモデル
  assets/js/main.js            状態管理・URL 同期・比較操作・イベント処理
  assets/js/morph.js           入力中の欄やフォーカスを保ったまま DOM を差分更新
  assets/js/designs/index.js   デザインの登録
  assets/js/designs/<id>.js        デザインごとの共通の枠と一覧画面の描画
  assets/js/designs/<id>.form.js   デザインごとの入力フォームの描画
  assets/js/designs/<id>.dashboard.js  デザインごとのダッシュボードの描画
  assets/js/designs/charts.js      棒・円・折れ線の部品（ラベルと値をテキストで持つ。外部ライブラリなし）
  assets/js/designs/dash-common.js 一覧へのリンクと集計値の印（data-kpi など）
  assets/js/designs/form-control.js  input / select / textarea / checkbox の属性（ラベル対応・aria）だけを揃える補助
docs/                          現行ガイドと設計・探索資料
examples/                      Skill作成時の固定適用見本と検証記録
skills/README.md               配布元 design-skills への案内
tests/
  server.mjs                   /design-lab/ サブパスで site/ を配信する確認用サーバー
  unit/                        node:test によるユニットテスト
  e2e/                         Playwright によるブラウザテスト
```

状態は 2 つに分けています。`state`（画面・比較条件・一覧条件）は URL と同期し、`form`（入力値・エラー・ステップ）はメモリだけに持ち、URL・履歴・ストレージには書きません。デザインはビューモデルを受け取って HTML を返すだけで、配置・ラベル・エラー表示などの構造はデザインごとに自由に組み立てます（構造の違いを無理に共通化しません）。

## デザインを追加する

1. `site/assets/js/designs/<id>.js`（枠と一覧）・`<id>.form.js`（フォーム）・`<id>.dashboard.js`（ダッシュボード）を作ります。デフォルトエクスポートには `id`・`name`・`shortName`・`url`・`summary`・`traits`（一覧の特徴）・`formTraits`（フォームの特徴）・`dashboardTraits`（ダッシュボードの特徴）・`errorFocus`（`'summary'`：エラーサマリーへ、`'field'`：最初のエラー項目へフォーカス）・`render(model, ctx)` を持たせます。公式のデザインシステムではない独自のデザインでは、任意の `urlLabel`（例：「設計と着想」）で、比較ペインの見出しのリンク名「公式サイト」を置き換えます。`render` は `model.screen`（`'list'` / `'form'` / `'dashboard'`）で画面を切り替えます。
2. `site/assets/css/designs/<id>.css` を作り、すべてのセレクターを `.ds-<id>` 配下に限定します。幅による切り替えは `@media` ではなく `@container frame (...)` を使います。
3. `site/assets/js/designs/index.js` の `DESIGNS` と `site/index.html` の `<link>` に追加します。既存のデザイン ID は共有 URL で使うため変更しません。

`render` にはビューモデルと次の `ctx` が渡されます。描画側では共通のデータや検証・集計ロジックを複製せず、配置や操作表現を組み立てます。

| `ctx` | 用途 |
| --- | --- |
| `uid` | ペイン固有の ID 接頭辞。左右比較での ID 衝突を防ぐ |
| `ui` | メニューなど、そのペイン・デザインの一時的な表示状態 |
| `href(changes)` | 現在の共有状態へ変更を加えた URL を作る |
| `navHref(item)` | ナビ項目の移動先 URL を作る |
| `listHref(target)` | ダッシュボードの集計条件と状態・グループ・種別を引き継ぐ一覧 URL を作る |

`traits` のキーは `density` / `navigation` / `table` / `input` / `actions` / `hierarchy`、`formTraits` は `layout` / `label` / `errors` / `confirm`、`dashboardTraits` は `kpi` / `density` / `chart` / `filter` / `hierarchy` です。見出しと対応は [`main.js`](../site/assets/js/main.js) にあります。

### 共通イベントにつなぐ属性

`render` が返す HTML では、次の属性で共通の機能につなぎます。

| 属性 | 役割 |
| --- | --- |
| `data-bind="keyword"` / `"status"` | 一覧のキーワード入力欄（IME 変換中は待機）／処理状態の `select` またはラジオ |
| `data-action="set-status" data-value="…"` | ボタンなどから処理状態を指定 |
| `data-action="sort" data-key="…"` | 列の並べ替え |
| `data-action="open-detail" data-id="…"` / `data-action="close-detail"` | 指定した申請の詳細の表示／詳細の終了 |
| `data-action="new"`, `"nav" data-target="…"`, `"dismiss-notice"` | 新規申請（入力フォームへ）、ナビゲーション、通知を閉じる |
| `data-action="clear"`, `"clear-keyword"` | キーワードと処理状態のクリア／キーワードのみクリア |
| `data-action="toggle-ui" data-key="…"` | メニュー開閉などデザイン内だけの一時状態（`ctx.ui[key]`） |
| `data-action="set-ui" data-key="…" data-value="…"` | デザイン内だけの一時状態に値を入れる（例：折本の見開きの番号。値は文字列）。任意の `data-then-focus="…"` で `[data-focus="…"]` へフォーカスを移し、`data-announce` の文言を読み上げる |
| `<form data-form="entry" novalidate>` | 入力フォーム。送信で検証し、エラーがなければ確認へ進む |
| `data-field="name"` など | フォームの入力部品（`control()` が付与）。入力値を共通の `form` に反映し、左右へ同期 |
| `data-action="form-back"`, `"form-confirm"`, `"form-restart"` | 確認から編集へ戻る／申請する／続けて入力する（`form-back` は `data-goto-field` で戻り先の項目を指定可） |
| `data-action="focus-field" data-goto-field="…"` | エラーサマリーなどから該当の入力欄へ移動 |
| `data-focus="heading"` / `"detail"` | 操作後のフォーカス移動先 |
| `data-focus="first-error"` / `"error-summary"` | エラー時のフォーカス先（`control()` が最初のエラー項目に付与／サマリー要素に付ける） |
| `data-bind="period"` / `"dept"` | ダッシュボードの集計条件（`select` またはラジオ） |
| `data-action="reset-conditions"`, `"clear-scope"` | 集計条件のリセット／一覧に引き継いだ絞り込みの解除 |
| `data-action="open-list"` と `data-link-status` / `-group` / `-type` | 数値から、同じ条件の一覧へ（`ctx.listHref(link)` で href も付ける。`listLink()` が出力） |
| `data-kpi`, `data-month`, `data-status`, `data-status-share`, `data-type-count`, `data-type-share` | 集計値を出す文字に付ける印（テストが画面の数値を読み取る。`dash-common.js`） |
| `data-modal` | Esc で閉じ、Tab をダイアログ内で循環させる要素 |

入力欄には必ず [`control()`](../site/assets/js/designs/form-control.js)を使い、ラベルと `id` / `for`、`aria-describedby`（補足・エラー）、`aria-invalid` を対応させます。ID は左右の画面で重複しないよう `ctx.uid` を接頭辞にします。オーバーレイは `position: fixed` で書けば、各画面の枠の中に表示されます。HTML に属性を直接書くときは、引用符を含む文字列を `${}` に渡さず [`attr()`](../site/assets/js/html.js) を使います（`html` ヘルパーは文字列をエスケープします）。

<a name="独立した試作から移植するときの注意折本で分かったこと"></a>

### 独立した試作から移植するときの注意

比較サイトと試作は共通のデータを使います。比較ペインに移植するときは、検索条件・入力値・表示幅をシェルと共有できるよう、次の点を確認します。

- 試作の `startListPoc` などの制御は持ち込まない。状態は共通の `state`（URL）と `form`、見た目だけの一時状態は `ctx.ui`（`toggle-ui` / `set-ui`）に置く。
- 共通のテストは、一覧に**該当する申請がすべて DOM にある**こと（`[data-id]` と `open-detail` が1件に1つ）を前提にしている。ページ送りをするなら、ほかの見開きを `hidden` にして全件を置く（折本の方式）。
- 処理状態の絞り込みは `data-bind="status"`（セレクトかラジオ）、並べ替えは `data-action="sort" data-key="…"`。表を使わない並べ替えでは、昇順の項目に `data-sorted="ascending"` を付ける（`th[aria-sort]` の代わりにテストが読む）。
- 試作の独自の属性は共通の名前へ置き換える（例：`data-field-name` → `data-goto-field`、リセットは `aria-disabled` ではなく `data-action="reset-conditions"` と `disabled`）。
- ダッシュボードの見出しは「申請処理ダッシュボード」。指標・状態・種別から一覧へは `listLink()`、一覧側の引き継ぎ条件の枠には `data-scope` を付ける。集計の定義（`d.definitions`）と基準日を画面に置く。
- 試作の `:root` の変数は `.ds-<id>` へ、`@media` は `@container frame` へ移す。左右比較では1ペインが約600px になるため、狭い幅の組み方がそのまま使われる。
- 狭い枠でもメニューを開閉しないデザインは、`tests/e2e/site.spec.mjs` の「狭い幅：メニューから移動するとメニューが閉じる」の対象から外す。
- 狭い枠で並べ替えの見た目を変えるときは、並べ替えの操作を2組置かない（共通テストは `[data-action="sort"][data-key="…"]` を1つだけ押す）。二色刷りは列見出しそのものを `@container` で札の列に組み替えている。
- 飾り（網点など）を指標の上に置くときは、表全体ではなく最初の指標の中に置き、幅が変わっても数値・説明に掛からないようにする（二色刷りは E2E で重なりを確かめている）。
- 幅で置き場所が変わる要素（汀線の詳細など）は、2つ描かずに1つを DOM の自然な位置（選んだ行の直後）に置き、広い幅だけ CSS（`@container` と `position`）で移す。SVG の `clipPath` などの ID は `ctx.uid` を付けてペインごとに分ける。

## 画面を追加する

`state.js` の `SCREENS`、`data.js` の `NAV_ITEMS`、`main.js` の `NAV_SCREENS` に画面を追加します。`data.js` / `query.js`（または画面用のモジュール）にデータとビューモデルを用意し、`model.js` の `buildAppModel()` と各デザインの `render()` に画面の分岐を追加します。画面の入力状態を持つ場合は、フォームと同様に URL 対象の `state` とは分けて管理します。

追加したデザイン・画面が比較選択、URL の復元、左右同期に対応することを、既存のユニット・E2E テストで確認します。必要な操作や表示の検証は `tests/` に追加し、[比較ガイド](comparison-guide.md)と[使い方](usage.md)の該当箇所を更新してください。
