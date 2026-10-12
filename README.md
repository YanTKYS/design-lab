# Design Lab — デザインシステム比較

同じ画面・同じデータを複数のデザインシステムの考え方で表示し、情報密度・ナビゲーション・テーブル・入力・操作・情報の階層の違いを見比べるための静的サイトです。ほかのリポジトリで画面デザインを検討するときの参考資料として使います。

公開先：<https://yantkys.github.io/design-lab/>

> 各デザインシステムの公開ドキュメントの考え方を参考にした**比較用の独自実装**です。公式コンポーネントの完全な再現や、準拠・適合を示すものではありません。サンプルの自治体（さくら野市）と申請データはすべて架空です。

## 比較できるデザイン

| デザイン | 公式サイト | 主な特徴（このサイトでの表現） |
| --- | --- | --- |
| デジタル庁デザインシステム | <https://design.digital.go.jp/dads/> | 16px・行間1.7のゆったりした本文、ラベル＋補足を欄の上に置く検索条件パネル、罫線つきの表、黄色＋黒のフォーカス表示。詳細は別ページ |
| IBM Carbon Design System | <https://carbondesignsystem.com/> | 黒い UI シェル＋サイドナビ、ツールバー一体型のデータテーブル、角のない 48px ボタン、行の展開で詳細、トースト通知 |
| Microsoft Fluent 2 | <https://fluent2.microsoft.design/> | ブランド色のヘッダー＋ナビゲーションドロワー、影のあるカード面、コマンドバーと件数付きタブで絞り込み、右から開くドロワーで詳細 |
| GOV.UK Design System | <https://design-system.service.gov.uk/> | 19px の大きな文字と余白、左側の絞り込み列（ラジオボタン）、行の操作は「表示」リンク、戻るリンク付きの別ページで詳細 |
| U.S. Web Design System | <https://designsystem.digital.gov/> | 最上部の正当性バナー、セリフ体の見出し、ボタン一体型の検索欄、並べ替え列を強調する罫線つきの表、狭い幅では縦積み表、モーダルで詳細 |
| Plain | （HTML 標準） | ブラウザ標準の部品と最小限の CSS だけの基準線 |

各デザインの「設計上の特徴」は、サイト上の各画面の見出し部分から 6 つの観点で確認できます。

## 使い方

- **単独表示**：上部の「デザイン」で切り替えます。再読み込みはなく、検索条件・絞り込み・並び順・開いている詳細は維持されます。
- **左右比較**：「左右比較」を選ぶと 2 つのデザインを並べます。左右は個別に選択でき、「入れ替え」で左右を交換します。検索・絞り込み・並び順・詳細は左右で共通です。
- **表示幅**：「自動」のほか 1280 / 1024 / 768 / 375px に固定できます。左右比較では各画面を最低 600px で表示し、足りない分は比較エリアを横スクロールします。各デザインは画面全体ではなく**枠の幅**に応じてレイアウトを切り替えます。
- **URL で共有**：表示状態は URL に反映されます。「URLをコピー」で共有でき、開き直すと同じ状態を復元します。

| パラメータ | 内容 | 例 |
| --- | --- | --- |
| `design` | 単独表示のデザイン | `design=govuk` |
| `mode`, `left`, `right` | 左右比較と左右のデザイン | `mode=compare&left=dads&right=carbon` |
| `width` | 表示幅（`1280` / `1024` / `768` / `375`） | `width=1024` |
| `q` | キーワード | `q=保育` |
| `status` | 処理状態（`received` / `reviewing` / `returned` / `approved` / `rejected`） | `status=reviewing` |
| `sort`, `order` | 並べ替えの列と向き | `sort=id&order=asc` |
| `detail` | 表示中の申請の受付番号 | `detail=2026-01041` |

サンプル画面は「申請管理システム」の申請一覧・検索画面です。キーワード（受付番号・申請者名とふりがな・申請種別・担当課、空白区切りで AND 検索）と処理状態で絞り込み、列見出しで並べ替え、詳細を表示できます。新規申請と未実装の画面へのリンクは、各デザインの通知コンポーネントでお知らせを表示します。

## GitHub Pages の公開

`main` ブランチへのマージ（push）で `.github/workflows/pages.yml` がテストを実行し、成功すれば `site/` をそのまま公開します（ビルド不要）。

初回のみ、リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定してください。Actions タブの「Deploy to GitHub Pages」から手動実行もできます。

ファイル参照はすべて相対パスなので、`https://<owner>.github.io/design-lab/` のサブパスで動作します。

## 構成

```
site/                          公開するファイル一式
  index.html
  assets/css/site.css          比較サイトの枠（中立的なスタイル）
  assets/css/designs/*.css     デザインごとのスタイル（.ds-<id> 配下に限定）
  assets/js/data.js            架空のサンプルデータ・ナビ項目・状態の定義
  assets/js/query.js           検索・絞り込み・並べ替え・ビューモデル生成（DOM 非依存）
  assets/js/state.js           状態の既定値と URL の相互変換（DOM 非依存）
  assets/js/main.js            状態管理・URL 同期・比較操作・イベント処理
  assets/js/morph.js           入力中の欄やフォーカスを保ったまま DOM を差分更新
  assets/js/designs/index.js   デザインの登録
  assets/js/designs/<id>.js    デザインごとの描画（メタ情報＋render）
tests/
  server.mjs                   /design-lab/ サブパスで site/ を配信する確認用サーバー
  unit/                        node:test によるユニットテスト
  e2e/                         Playwright によるブラウザテスト
```

共通部分（データ、検索ロジック、状態、URL、イベント処理）と、デザインごとの描画を分けています。各デザインはビューモデルを受け取って HTML を返すだけで、ヘッダーやテーブルの構造はデザインごとに自由に組み立てます（構造の違いを無理に共通化しません）。

### デザインを追加する

1. `site/assets/js/designs/<id>.js` を作り、`id`・`name`・`shortName`・`url`・`summary`・`traits`（6 観点）と `render(model, ctx)` を持つオブジェクトを `export default` します。
2. `site/assets/css/designs/<id>.css` を作り、すべてのセレクターを `.ds-<id>` 配下に限定します。幅による切り替えは `@media` ではなく `@container frame (...)` を使います。
3. `designs/index.js` の `DESIGNS` と `index.html` の `<link>` に追加します。

`render` が返す HTML では、次の属性で共通の機能につなぎます。

| 属性 | 役割 |
| --- | --- |
| `data-bind="keyword"` | キーワード入力欄（入力中に絞り込み。IME 変換中は待機） |
| `data-bind="status"` | 処理状態の `select` またはラジオボタン |
| `<form>` の送信 | キーワードを即時確定 |
| `data-action="sort" data-key="…"` | 列の並べ替え |
| `data-action="open-detail" / "close-detail" data-id="…"` | 詳細の表示・終了 |
| `data-action="new"`, `"nav" data-target="…"`, `"dismiss-notice"` | 新規申請、ナビゲーション、通知を閉じる |
| `data-action="clear"`, `"clear-keyword"` | 条件のクリア |
| `data-action="toggle-ui" data-key="…"` | メニュー開閉などデザイン内だけの一時状態（`ctx.ui[key]`） |
| `data-focus="heading"`, `data-focus="detail"` | 操作後のフォーカス移動先 |
| `data-modal` | Esc で閉じ、Tab をダイアログ内で循環させる要素 |

フォームの ID は左右の画面で重複しないよう `ctx.uid` を接頭辞にします。オーバーレイは `position: fixed` で書けば、各画面の枠の中に表示されます。

### 画面を追加する

現在は申請一覧画面のみです。画面を増やす場合は、`data.js` / `query.js` に画面用のデータとビューモデルを追加し、各デザインに画面ごとの描画関数を追加して、状態（`state.js`）に表示中の画面を持たせます。

## 開発

```sh
npm install
npm start                          # http://localhost:4173/design-lab/
npm test                           # ユニットテスト
npx playwright install chromium    # 初回のみ
npm run test:e2e                   # ブラウザテスト
```

ブラウザテストでは、6 種類すべての表示、検索・絞り込み・並べ替え・詳細・通知、デザイン切替時の状態維持、左右比較と入れ替え、URL からの復元、戻る操作、キーボード操作、375〜1920px でのはみ出し、コンソールエラーと 404 がないことを確認します。

外部 API や CDN には依存しません。フォントは同梱せず、各デザインの指定書体が端末にない場合は OS の日本語フォントで表示されます。
