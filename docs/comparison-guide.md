# デザイン比較ガイド

[README に戻る](../README.md)

各デザインの画面構成や操作表現を比較するときの資料です。[操作の詳細](usage.md)と合わせて使ってください。

## 比較の見方

同じ画面・データ・条件を左右に並べ、情報の探しやすさ、操作の見つけやすさ、入力補助やエラーの伝わり方を見比べます。「設計上の特徴」を開くと、各画面で意図した違いを確認できます。

- 一覧：情報密度、検索条件の配置、行の追いやすさ、詳細への移動と復帰を確認します。
- フォーム：ラベル・必須表示・補足の位置、エラーから修正への移動、確認と完了までの流れを確認します。
- ダッシュボード：主要指標と内訳の階層、集計条件の位置、グラフと文字情報の対応を確認します。

どのデザインから見比べるかは[デザイン選定ガイド](design-selection.md)、見比べるときの観点と記録の形式は [UI 品質レビュー観点](ui-quality-review.md)を参照してください。

公開ドキュメントを参考にした独自実装であり、公式準拠やデザインシステムの優劣を示すものではありません。**視認性の好みと業務効率の評価は別**です。このサイトでの見比べを業務効率の測定結果や性能ランキングとして扱わず、採用を検討する業務の利用者・操作・端末に即した評価の材料として使ってください。

## デザインごとの特徴

| デザイン | 公式サイト | 一覧画面の特徴 | 入力フォームの特徴 | ダッシュボードの特徴 |
| --- | --- | --- | --- | --- |
| デジタル庁デザインシステム | <https://design.digital.go.jp/dads/> | 16px・行間1.7の本文、検索条件パネル、罫線つきの表、黄色＋黒のフォーカス。詳細は別ページ | 「※必須」「任意」をラベル横に明示、補足はラベル直下、エラーは欄の直下に「＊」付き＋通知バナー、ステップ表示 | 見出し付きセクションを 1 列で積み、数値は 48px の太字。縦棒は値を棒の上に直接表示し、積み上げ棒は模様＋ラベル＋数値＋割合で区別、すべてのグラフに表 |
| IBM Carbon Design System | <https://carbondesignsystem.com/> | 黒い UI シェル＋サイドナビ、ツールバー一体型のデータテーブル、行の展開で詳細 | 2 カラム、入力例は欄の中・補足は欄の下、任意のみ明示、欄内の警告アイコン、インライン通知、隙間なく並ぶボタンセット | 薄いタイルを 1px の隙間で敷き詰めた高密度。ツールバーにフィルター、ドーナツ＋凡例テーブル、小さな縦棒・横棒 |
| Microsoft Fluent 2 | <https://fluent2.microsoft.design/> | ブランド色ヘッダー＋ナビドロワー、カード面、コマンドバーとタブで絞り込み、右のドロワーで詳細 | カード内の 2 カラム、赤い「＊」、欄の下にアイコン付き検証メッセージ、MessageBar の「最初の項目へ」 | コマンドバー（フィルター・主要操作）＋指標カード。月別は折れ線、状態はアイコン付きの積み上げバー、定義は折りたたみ |
| GOV.UK Design System | <https://design-system.service.gov.uk/> | 19px の大きな文字、左側の絞り込み列、行の操作は「表示」リンク | 1 列、ラベル→ヒント→エラー→入力欄、任意のみ明示、エラーサマリーへフォーカス、「変更」リンク付きの回答確認 | 先頭の文章で要点を伝え、数値と説明を優先。グラフは月別の表内の棒だけ、ほかは見出し付きの表。左に絞り込み、末尾に「この数字の見方」 |
| U.S. Web Design System | <https://designsystem.digital.gov/> | 正当性バナー、セリフ体の見出し、ボタン一体型の検索欄、狭い幅では縦積みの表、モーダルで詳細 | 「＊は必須項目です」の注記、エラー項目の左の赤い帯、赤いアラート、分割式のステップインジケーター | 見出し＋説明の明確な階層、4 つのサマリーボックス、番号つきの横棒、「データを表で表示」のアコーディオン、出典と基準日 |
| Google Material Design 3 | <https://m3.material.io/> | 淡いトップバーとナビゲーションレール、検索バー・チェック付きフィルターチップ、密度を保った横スクロール表。詳細は中央ダイアログ | 手順・補足を分けた入力面、常時ラベル付きの Filled 型フィールド、赤い下線と理由、Filled / Outlined / Text の操作階層 | 条件を独立したパネルにまとめ、受付件数を大きいサーフェスで強調。月別の縦棒、状態のドーナツ＋文字の凡例、種別の横棒 |
| Meta Astryx | <https://astryx.atmeta.com/> | 上部バーのない左サイドナビ、表示件数・処理状態・並び順の事実の帯、罫線のない表、絞り込み中の警告バナーと表の下の内訳。詳細は右側のシート | 上部の横向きの進行表示、必須を標準にして「任意」だけを表示、項目名の下に補足、欄の下の赤い枠でエラーと理由 | 固定の条件帯の下に4つの同じ大きさの指標タイル。月別は無彩色の縦棒、種別は横棒、状態は積み上げ棒と内訳の表 |
| Plain | （HTML 標準） | ブラウザ標準の部品と最小限の CSS だけの基準線 | fieldset と label だけ。「（必須）」と「エラー：…」を文字で示す | グラフ・カードなし。見出しと表と文章だけで数値を示す |

各デザインの「設計上の特徴」は、画面上部の見出し部分から確認できます。一覧では情報密度やナビゲーション、フォームではラベルやエラー、ダッシュボードでは指標や集計条件の配置などを説明しています。

各デザインの書体が端末にない場合は、OS の日本語フォントで表示されます。書体の違いも含め、利用する端末で確認してください。

## Material 3 の比較実装

`material3` はデスクトップの業務画面を想定した独自実装です。公開ドキュメントの色の役割（Primary / Container / Surface）、選択インジケーター、Filled 型フィールド、ボタンの優先度を参考にしています。`@material/web`、Google Fonts、実行時 CDN は使いません。書体はローカルの Roboto・日本語フォントへフォールバックします。

一覧の表は狭い枠でもカード化せず、表の領域だけを横スクロールします。600px 未満ではナビゲーションをメニューで展開し、フォームは1列、ダッシュボードの条件は先頭へ移動します。詳細は Esc / Tab に対応したダイアログで、背後の操作を無効にし、閉じると元の行へ戻ります。

Material 3 を開く共有 URL の例は[使い方の URL 仕様](usage.md#url-で共有と復元)を参照してください。

参考にした公式公開ドキュメントと関連ガイド：

- [Material 3](https://m3.material.io/)（[Navigation rail](https://m3.material.io/components/navigation-rail/overview)、[Search](https://m3.material.io/components/search/overview)、[Dialogs](https://m3.material.io/components/dialogs/overview)）
- [Material Web の色の役割](https://github.com/material-components/material-web/blob/main/docs/theming/color.md)、[テキストフィールド](https://github.com/material-components/material-web/blob/main/docs/components/text-field.md)（実装の依存にはしていません）

## Astryx の比較実装

`astryx` も他のデザインと同じ**公開資料を参考にした HTML/CSS/JavaScript の独自実装**です。Astryx 公式の React コンポーネント（`@astryxdesign/core`）を導入・埋め込みするものではありません。

**この画面で、Astryx 公式コンポーネントの操作性・性能・アクセシビリティは評価できません。** Astryx は React 19 以上を前提とし、実際のコンポーネントは StyleX と専用の挙動（テーブルの列フィルターなど）を持ちます。ここで比較できるのは、公開資料から読み取れる画面構成と操作の階層（サイドナビだけのシェル、表を中心にしたページ、必須を標準とするフォーム、条件帯と指標タイルのダッシュボード）の違いだけです。公式の部品が必要になった場合は、同じリポジトリ内の独立した検証領域で扱い、この比較サイトの実装とは切り分けます。

参考にした要素と、実装で選んだ表現：

| 参照元 | この比較実装での表現 |
| --- | --- |
| Neutral テーマ（無彩色の面、黒の accent、淡い罫線、角丸 6 / 10 / 12px、基準 14px、`--color-*` の状態色） | 白の面と薄いグレーの背景、黒の主操作、選択項目の淡いグレー。状態は文字・アイコン付きの淡いバッジ |
| Table ページ（`table-page`）：事実は表の上、罫線なしの行＋ホバー、等幅数字、絞り込み中は警告バナー、空の結果とクリア | 表示件数などの事実の帯、罫線のない表、「条件をクリア」付きの警告バナーと空の結果、表の下の内訳 |
| シェル（`shell-side-nav`）：上部バーのない左サイドナビ | グループ見出し付きの左サイドナビのみ。狭い枠ではメニューで展開 |
| フォームウィザード（`form-wizard`）：上部の横向きの進行表示、1段階ずつ全幅 | 3段階の進行表示と、全幅の面に1段階ずつ表示 |
| フォームの必須表示（`FormLayout` の `defaultOptionality`）：標準でない項目にだけ表示 | 必須を標準にして「任意」だけを表示し、先頭で規則を明示。チェックボックスだけは個別に「必須」と表示 |
| ダッシュボード（`dashboard`）：全体で1つのフィルター帯、指標タイル→グラフ→表 | 固定の条件帯、4つの指標タイル、グラフ、処理状況の表 |

独自の判断として、入力欄の境界は非テキストのコントラスト 3:1 を確保するため、Neutral テーマの淡い境界ではなく濃いグレー（`#848484`）にしています。書体は Figtree を指定していますが読み込まず、端末にない場合はローカルの日本語フォントで表示します。`@astryxdesign/*`、Google Fonts、実行時 CDN は使いません。

参考にした公式の公開資料（GitHub の `main` ブランチ）：

- [Astryx 公式サイト](https://astryx.atmeta.com/)、[Storybook](https://astryx.atmeta.com/storybook/)、[リポジトリ](https://github.com/meta/astryx)（[README](https://github.com/meta/astryx/blob/main/README.md)、[`@astryxdesign/core`](https://github.com/meta/astryx/tree/main/packages/core)）
- Neutral テーマ：[`packages/themes/neutral`](https://github.com/meta/astryx/tree/main/packages/themes/neutral)（`neutralTheme.ts`、`neutral.spec.md`、`neutralPalettes.generated.ts`）
- テンプレート：[`table-page`](https://github.com/meta/astryx/tree/main/packages/cli/assets/templates/pages/table-page)、[`form-wizard`](https://github.com/meta/astryx/tree/main/packages/cli/assets/templates/pages/form-wizard)、[`dashboard`](https://github.com/meta/astryx/tree/main/packages/cli/assets/templates/pages/dashboard)、[`shell-side-nav`](https://github.com/meta/astryx/tree/main/packages/cli/assets/templates/pages/shell-side-nav)
- 部品の説明：[`Field`](https://github.com/meta/astryx/tree/main/packages/core/src/Field)、[`FormLayout`](https://github.com/meta/astryx/tree/main/packages/core/src/FormLayout)、[`Stepper`](https://github.com/meta/astryx/tree/main/packages/core/src/Stepper)、[`Banner`](https://github.com/meta/astryx/tree/main/packages/core/src/Banner)

描画モジュールや CSS を追加・変更する手順は[開発資料](development.md#デザインを追加する)を参照してください。
