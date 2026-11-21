# Design Lab — デザインシステム比較

同じデータ・同じ機能の画面を、複数のデザインシステムの考え方で見比べる静的サイトです。ほかのプロジェクトで画面デザインを検討するときの参考資料として使えます。

**[公開サイトを開く](https://yantkys.github.io/design-lab/)**

> 8つは各デザインシステムの公開ドキュメントを参考にした比較用の独自実装で、公式コンポーネントの再現や、公式準拠・適合を示すものではありません。9つ目の「糸の交点」は、このサイト独自の沖縄テーマのデザイン（名称は仮称）で、公式のデザインシステムではありません。自治体・申請データはすべて架空で、フォームの入力内容は送信・保存されません。

## 比較できるもの

架空の自治体向け「申請管理システム」の **3画面・9デザイン** を比較できます。

| 画面 | 試せること |
| --- | --- |
| 申請一覧 | 検索・絞り込み・並べ替え・詳細表示 |
| 入力フォーム | 入力補助・エラー表示・入力→確認→完了 |
| ダッシュボード | 条件別の指標・グラフ・内訳と、対応する申請一覧への移動 |

対応デザイン：デジタル庁デザインシステム、IBM Carbon、Microsoft Fluent 2、GOV.UK、U.S. Web Design System、Plain（HTML 標準）、Google Material Design 3、Meta Astryx、糸の交点（独自の沖縄テーマ）。

画面別の特徴と公式サイトは[デザイン比較ガイド](docs/comparison-guide.md)にまとめています。ほかのリポジトリで使うときは、[デザイン選定ガイド](docs/design-selection.md)で比較候補を絞り、[UI 品質レビュー観点](docs/ui-quality-review.md)で画面を確認できます。

## 使い始める

1. 「画面」で申請一覧・入力フォーム・ダッシュボードを選びます。
2. 単独表示でデザインを切り替えるか、「左右比較」で2つを並べます。「入れ替え」で左右を交換できます。
3. 「表示幅」で狭い枠やデスクトップ幅の見え方を確認します。
4. 「URLをコピー」で比較条件を共有します。フォーム入力は共有されません（一覧の検索語は URL に含まれます）。

操作の詳細、URL の仕様、集計値の読み方は[使い方](docs/usage.md)を参照してください。

## ローカルで動かす

Node.js 20 以上と npm を使い、リポジトリのルートで実行します。

```sh
npm ci
npm start    # 開発用サーバーを起動
npm test     # 別のターミナルでユニットテストを実行
```

ブラウザテストや公開・拡張の手順は[開発資料](docs/development.md)にあります。

## 詳細ドキュメント

- [デザイン比較ガイド](docs/comparison-guide.md)：画面別の違い、比較の見方、Material 3・Astryx の実装方針と参照資料
- [デザイン選定ガイド](docs/design-selection.md)：開発対象の用途から比較候補を絞る手順、各デザインの向き・注意点
- [UI 品質レビュー観点](docs/ui-quality-review.md)：操作シナリオに基づくレビュー手順、AI が生成した画面の装飾の見分け方、依頼例と記録の形式
- [使い方](docs/usage.md)：操作方法、共有 URL、入力情報の扱い、ダッシュボードの集計仕様
- [開発資料](docs/development.md)：構成、状態管理、デザイン・画面の追加、テスト、GitHub Pages 公開
- [独自デザインの再探索（案C・案D）](docs/design-exploration/README.md)：「糸の交点」の次の独自デザインの2案（素地と釉／経路と停留所）の静的モックと設計資料。比較サイトには未登録
- [独自デザインの追加探索（案E・F・G）](docs/design-exploration-2/README.md)：沖縄に着想した3案（仕次ぎ／透かし／座と裏座）の代表画面と、案C・D を含む5案の比較。比較サイトには未登録
- [視覚デザインの探索（第3回：案H・I・J）](docs/design-exploration-3/README.md)：見た目の魅力を優先した申請一覧の3案（縦組みの台帳／色面／二色刷り）。比較サイトには未登録
- [Agent Skills](skills/README.md)：「糸の交点」をほかのアプリへ適用するための Skill（Claude Code・Codex への導入方法、[適用見本の検証記録](examples/okinawa-thread-memo/VERIFICATION.md)）
- [変更履歴](CHANGELOG.md)

実験中の独立した試作（3画面を切り替えて操作できる。上記の比較デザイン・比較機能には含めていない）：

- [琉球モダン・彩](https://yantkys.github.io/design-lab/experiments/ryukyu-modern/)（[設計案](docs/ryukyu-modern-concept.md)、[ソース](site/experiments/ryukyu-modern/)）
- [糸の交点（仮称・沖縄テーマB案）](https://yantkys.github.io/design-lab/experiments/okinawa-thread/)（[設計と着想](docs/okinawa-ui-study/README.md)、[ソース](site/experiments/okinawa-thread/)）
