# Design Lab — デザインシステム比較

同じ画面・同じデータを複数のデザインシステムの考え方で表示し、情報密度・ナビゲーション・テーブル・入力・操作・エラー表示・情報の階層の違いを見比べるための静的サイトです。ほかのリポジトリで画面デザインを検討するときの参考資料として使います。現在のバージョンは v0.4.0 です（変更履歴は [CHANGELOG.md](CHANGELOG.md)）。

公開先：<https://yantkys.github.io/design-lab/>

> 各デザインシステムの公開ドキュメントの考え方を参考にした**比較用の独自実装**です。公式コンポーネントの完全な再現や、準拠・適合を示すものではありません。サンプルの自治体（さくら野市）と申請データはすべて架空です。

## 比較できる画面

架空の自治体向け「申請管理システム」の 3 画面を、7 つのデザインで比較できます。上部の「画面」で切り替えます。

- **申請一覧**：キーワード（受付番号・申請者名とふりがな・申請種別・担当課、空白区切りで AND 検索）と処理状態で絞り込み、列見出しで並べ替え、詳細を表示します。
- **ダッシュボード**：申請処理ダッシュボード。KPI（受付件数・処理待ち・処理完了・処理完了率）、月別の受付件数、処理状況（件数・割合）、申請種別別の件数を、対象期間と担当課の条件で集計します。数値は一覧と同じ架空データから計算し、一覧と矛盾しません（[集計の定義](#ダッシュボードの集計)）。
- **入力フォーム**：新規申請フォーム（申請者氏名・ふりがな・メールアドレス・電話番号［任意］・申請種別・希望日・申請内容・確認事項への同意）。入力 → 確認 → 完了の流れと、必須・形式・同意の入力チェックを備えます。入力内容は送信・保存されません。

## 比較できるデザイン

| デザイン | 公式サイト | 一覧画面の特徴 | 入力フォームの特徴 | ダッシュボードの特徴 |
| --- | --- | --- | --- | --- |
| デジタル庁デザインシステム | <https://design.digital.go.jp/dads/> | 16px・行間1.7の本文、検索条件パネル、罫線つきの表、黄色＋黒のフォーカス。詳細は別ページ | 「※必須」「任意」をラベル横に明示、補足はラベル直下、エラーは欄の直下に「＊」付き＋通知バナー、ステップ表示 | 見出し付きセクションを 1 列で積み、数値は 48px の太字。縦棒は値を棒の上に直接表示し、積み上げ棒は模様＋ラベル＋数値＋割合で区別、すべてのグラフに表 |
| IBM Carbon Design System | <https://carbondesignsystem.com/> | 黒い UI シェル＋サイドナビ、ツールバー一体型のデータテーブル、行の展開で詳細 | 2 カラム、入力例は欄の中・補足は欄の下、任意のみ明示、欄内の警告アイコン、インライン通知、隙間なく並ぶボタンセット | 薄いタイルを 1px の隙間で敷き詰めた高密度。ツールバーにフィルター、ドーナツ＋凡例テーブル、小さな縦棒・横棒 |
| Microsoft Fluent 2 | <https://fluent2.microsoft.design/> | ブランド色ヘッダー＋ナビドロワー、カード面、コマンドバーとタブで絞り込み、右のドロワーで詳細 | カード内の 2 カラム、赤い「＊」、欄の下にアイコン付き検証メッセージ、MessageBar の「最初の項目へ」 | コマンドバー（フィルター・主要操作）＋指標カード。月別は折れ線、状態はアイコン付きの積み上げバー、定義は折りたたみ |
| GOV.UK Design System | <https://design-system.service.gov.uk/> | 19px の大きな文字、左側の絞り込み列、行の操作は「表示」リンク | 1 列、ラベル→ヒント→エラー→入力欄、任意のみ明示、エラーサマリーへフォーカス、「変更」リンク付きの回答確認 | 先頭の文章で要点を伝え、数値と説明を優先。グラフは月別の表内の棒だけ、ほかは見出し付きの表。左に絞り込み、末尾に「この数字の見方」 |
| U.S. Web Design System | <https://designsystem.digital.gov/> | 正当性バナー、セリフ体の見出し、ボタン一体型の検索欄、狭い幅では縦積みの表、モーダルで詳細 | 「＊は必須項目です」の注記、エラー項目の左の赤い帯、赤いアラート、分割式のステップインジケーター | 見出し＋説明の明確な階層、4 つのサマリーボックス、番号つきの横棒、「データを表で表示」のアコーディオン、出典と基準日 |
| Google Material Design 3 | <https://m3.material.io/> | 淡いトップバーとナビゲーションレール、検索バー・チェック付きフィルターチップ、密度を保った横スクロール表。詳細は中央ダイアログ | 手順・補足を分けた入力面、常時ラベル付きの Filled 型フィールド、赤い下線と理由、Filled / Outlined / Text の操作階層 | 条件を独立したパネルにまとめ、受付件数を大きいサーフェスで強調。月別の縦棒、状態のドーナツ＋文字の凡例、種別の横棒 |
| Plain | （HTML 標準） | ブラウザ標準の部品と最小限の CSS だけの基準線 | fieldset と label だけ。「（必須）」と「エラー：…」を文字で示す | グラフ・カードなし。見出しと表と文章だけで数値を示す |

各デザインの「設計上の特徴」は、画面上部の見出し部分から確認できます（一覧は 6 観点、フォームはレイアウト・ラベル/補足/必須表記・入力エラー・確認/操作の 4 観点、ダッシュボードは KPI の表現・情報密度・グラフ/可視化・フィルターの配置・情報の階層の 5 観点）。

## 使い方

- **画面の切り替え**：「画面」で申請一覧・入力フォーム・ダッシュボードを切り替えます。デザイン、単独/左右の表示、表示幅、各画面の状態（一覧の検索条件・フォームの入力・ダッシュボードの集計条件）は維持されます。
- **単独表示**：「デザイン」で切り替えます。再読み込みはなく、検索条件・入力値・入力エラー・確認画面などの状態は維持されます。
- **左右比較**：2 つのデザインを並べます。左右は個別に選択でき、「入れ替え」で左右を交換します。一覧では検索条件、フォームでは入力値・入力エラー・ステップが左右で共通で、どちらで編集しても他方に反映されます。
- **集計条件**（ダッシュボード）：対象期間（令和8年度・上半期・第2四半期・直近3か月）と担当課を、各デザインのフィルター部品で切り替えます。KPI・グラフ・件数がすべて連動して更新され、左右比較では両方に同じ結果を表示します。KPI・処理状態・申請種別の数値から「申請一覧」へ移動でき、一覧には同じ条件（期間・担当課・種別・処理待ち/完了・状態）が「引き継いだ絞り込み」として表示され、解除できます。集計条件を変えても、一覧の絞り込み・フォームの入力は初期化されません。
- **入力データ**（入力フォームのみ）：「入力例」で正常な入力例を、「エラーを再現」で必須の未入力・ふりがな/メールの形式不正・未同意を含む入力を呼び出します。「クリア」で空に戻します。
- **表示幅**：「自動」のほか 1280 / 1024 / 768 / 375px に固定できます。左右比較では各画面を最低 600px で表示し、足りない分は比較エリアを横スクロールします。各デザインは画面全体ではなく**枠の幅**に応じてレイアウトを切り替えます。
- **URL で共有**：画面・デザイン・表示モード・表示幅・一覧の条件・ダッシュボードの集計条件が URL に反映され、開き直すと同じ状態を復元します（「URLをコピー」で共有）。**フォームの入力内容は URL にも履歴にも保存にも載せず**、ページを開いている間だけメモリに保持します。

| パラメータ | 内容 | 例 |
| --- | --- | --- |
| `screen` | 画面（省略時は申請一覧。`form`：入力フォーム、`dashboard`：ダッシュボード） | `screen=dashboard` |
| `design` | 単独表示のデザイン | `design=govuk` |
| `mode`, `left`, `right` | 左右比較と左右のデザイン | `mode=compare&left=dads&right=carbon` |
| `width` | 表示幅（`1280` / `1024` / `768` / `375`） | `width=1024` |
| `q` | キーワード | `q=保育` |
| `status` | 処理状態（`received` / `reviewing` / `returned` / `approved` / `rejected`） | `status=reviewing` |
| `sort`, `order` | 並べ替えの列と向き | `sort=id&order=asc` |
| `detail` | 表示中の申請の受付番号 | `detail=2026-01041` |
| `period`, `dept` | ダッシュボードの集計条件（対象期間 `fy` / `h1` / `q2` / `m3`、担当課） | `period=q2&dept=市民課` |
| `lperiod`, `ldept`, `ltype`, `lgroup` | 一覧へ引き継いだ絞り込み（期間・担当課・申請種別・`pending` / `done`） | `lperiod=q2&lgroup=pending` |

## ダッシュボードの集計

集計ロジックは `site/assets/js/dashboard.js` に 1 つだけあり、7 デザインはその結果を表示します（同じ条件なら同じ数値）。一覧も同じ判定（`filterByScope`）で絞り込むため、ダッシュボードの数値から開いた一覧の件数は集計と一致します。基準日は固定（2026年10月12日）で、実際の日付には依存しません。

| 指標 | 計算方法 |
| --- | --- |
| 受付件数 | 受付日が対象期間内で、担当課が条件に一致する申請の数 |
| 処理待ち | 受付済・審査中・補正依頼の合計 |
| 処理完了 | 承認済・却下の合計 |
| 処理完了率 | 処理完了 ÷ 受付件数 |
| 各割合 | 件数 ÷ 受付件数（小数第 2 位を四捨五入して小数第 1 位まで。受付件数 0 のときは「—」。端数処理のため合計が 100% にならない場合がある） |

グラフは外部ライブラリを使わず、棒グラフは読み上げに強い `ol` / `ul` の HTML/CSS、円・折れ線は SVG（`role="img"`、値入りのラベル）で描きます。すべての値は文字でも表示し、色だけに頼りません。

## GitHub Pages の公開

`main` ブランチへのマージ（push）で `.github/workflows/pages.yml` がテストを実行し、成功すれば `site/` をそのまま公開します（ビルド不要）。

初回のみ、リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定してください。Actions タブの「Deploy to GitHub Pages」から手動実行もできます。

ファイル参照はすべて相対パスなので、`https://<owner>.github.io/design-lab/` のサブパスで動作します。

## 構成

```
site/                          公開するファイル一式
  index.html
  assets/css/site.css          比較サイトの枠（中立的なスタイル）
  assets/css/charts.css        ダッシュボードのグラフの構造（色・太さは各デザインが変数で指定）
  assets/css/designs/*.css     デザインごとのスタイル（.ds-<id> 配下に限定）
  assets/js/data.js            架空のサンプルデータ（申請 71 件・フォームの入力例）・担当課・ナビ項目・状態の定義
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
tests/
  server.mjs                   /design-lab/ サブパスで site/ を配信する確認用サーバー
  unit/                        node:test によるユニットテスト
  e2e/                         Playwright によるブラウザテスト
```

状態は 2 つに分けています。`state`（画面・比較条件・一覧条件）は URL と同期し、`form`（入力値・エラー・ステップ）はメモリだけに持ち、URL・履歴・ストレージには書きません。デザインはビューモデルを受け取って HTML を返すだけで、配置・ラベル・エラー表示などの構造はデザインごとに自由に組み立てます（構造の違いを無理に共通化しません）。

### Material 3 の比較実装

`material3` はデスクトップの業務画面を想定した独自実装です。公開ドキュメントの色の役割（Primary / Container / Surface）、選択インジケーター、Filled 型フィールド、ボタンの優先度を参考にしています。公式の適合・再現を示すものではなく、`@material/web`、Google Fonts、実行時 CDN は使いません。書体はローカルの Roboto・日本語フォントへフォールバックします。

一覧の表は狭い枠でもカード化せず、表の領域だけを横スクロールします。600px 未満ではナビゲーションをメニューで展開し、フォームは1列、ダッシュボードの条件は先頭へ移動します。詳細は Esc / Tab に対応したダイアログで、背後の操作を無効にし、閉じると元の行へ戻ります。

例：`?design=material3`、`?screen=form&design=material3`、`?screen=dashboard&mode=compare&left=material3&right=dads`。

参考にした公式公開ドキュメントと関連ガイド：

- [Material 3](https://m3.material.io/)（[Navigation rail](https://m3.material.io/components/navigation-rail/overview)、[Search](https://m3.material.io/components/search/overview)、[Dialogs](https://m3.material.io/components/dialogs/overview)）
- [Material Web の色の役割](https://github.com/material-components/material-web/blob/main/docs/theming/color.md)、[テキストフィールド](https://github.com/material-components/material-web/blob/main/docs/components/text-field.md)（実装の依存にはしていません）

### デザインを追加する

1. `site/assets/js/designs/<id>.js`（枠と一覧）・`<id>.form.js`（フォーム）・`<id>.dashboard.js`（ダッシュボード）を作ります。デフォルトエクスポートには `id`・`name`・`shortName`・`url`・`summary`・`traits`（一覧 6 観点）・`formTraits`（フォーム 4 観点）・`dashboardTraits`（ダッシュボード 5 観点）・`errorFocus`（`'summary'`：エラーサマリーへ、`'field'`：最初のエラー項目へフォーカス）・`render(model, ctx)` を持たせます。`render` は `model.screen`（`'list'` / `'form'`）で画面を切り替えます。
2. `site/assets/css/designs/<id>.css` を作り、すべてのセレクターを `.ds-<id>` 配下に限定します。幅による切り替えは `@media` ではなく `@container frame (...)` を使います。
3. `designs/index.js` の `DESIGNS` と `index.html` の `<link>` に追加します。

`render` が返す HTML では、次の属性で共通の機能につなぎます。

| 属性 | 役割 |
| --- | --- |
| `data-bind="keyword"` / `"status"` | 一覧のキーワード入力欄（IME 変換中は待機）／処理状態の `select` またはラジオ |
| `data-action="sort" data-key="…"` | 列の並べ替え |
| `data-action="open-detail" / "close-detail" data-id="…"` | 一覧の詳細の表示・終了 |
| `data-action="new"`, `"nav" data-target="…"`, `"dismiss-notice"` | 新規申請（入力フォームへ）、ナビゲーション、通知を閉じる |
| `data-action="clear"`, `"clear-keyword"` | 条件のクリア |
| `data-action="toggle-ui" data-key="…"` | メニュー開閉などデザイン内だけの一時状態（`ctx.ui[key]`） |
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

入力欄には必ず `control()`（`designs/form-control.js`）を使い、ラベルと `id` / `for`、`aria-describedby`（補足・エラー）、`aria-invalid` を対応させます。ID は左右の画面で重複しないよう `ctx.uid` を接頭辞にします。オーバーレイは `position: fixed` で書けば、各画面の枠の中に表示されます。HTML に属性を直接書くときは、引用符を含む文字列を `${}` に渡さず `attr()` を使います（`html` ヘルパーは文字列をエスケープします）。

### 画面を追加する

`state.js` の `SCREENS` と `main.js` の `NAV_SCREENS` に画面を追加し、`data.js` / `query.js`（または画面用のモジュール）にデータとビューモデルを、各デザインに画面ごとの描画を追加します。画面の入力状態を持つ場合は、フォームと同様に URL 対象の `state` とは分けて管理します。

## 開発

```sh
npm install
npm start                          # http://localhost:4173/design-lab/
npm test                           # ユニットテスト
npx playwright install chromium    # 初回のみ
npm run test:e2e                   # ブラウザテスト
```

ブラウザテストでは、7 種類すべての表示、一覧の検索・絞り込み・並べ替え・詳細、ダッシュボードの集計値（7 デザインで同一）・条件の連動・URL 復元・左右同期・一覧への遷移、フォームの全項目・入力チェック・確認・完了、画面切替と URL からの復元、デザイン切替時の状態維持、左右比較での入力値・エラーの同期、IME 変換中の入力、入力内容が URL・履歴・ストレージに残らないこと、キーボード操作、375〜1920px でのはみ出し、コンソールエラーと 404 がないことを確認します。

外部 API や CDN には依存しません。フォントは同梱せず、各デザインの指定書体が端末にない場合は OS の日本語フォントで表示されます。
