---
name: l-signage-ui
description: Applies the "標示盤" (L案, signage board) visual design to a web UI — a dark green-black board divided into panels, where only the current state is lit in amber (the selected status, the selected row and the detail opened under it, the current step of a form, the primary action), counts shown as decorative 5×7 dot digits alongside readable text, a cream focus ring that never looks like the amber selection, and — only where the app already counts things — "1 tick = 1 item" bars. Use only when the user asks for 標示盤, L案 or l-signage by name for a new or existing screen. Do not use for generic dark themes, railway or airport themes, dashboards in general, other design styles (糸の交点, 折本, 二色刷り, 汀線), or unrelated coding.
compatibility: Plain HTML/CSS (optionally JS). Works offline and in closed networks; no CDN, web font or external API is required.
metadata:
  source: "YanTKYS/design-lab l-signage (13th comparison design, L案)"
  version: "0.1"
---

# 標示盤（L案）UI を適用する

駅や窓口の案内表示（標示盤）の「暗い盤面に、今の状態だけを点灯させる」考え方に**着想した独自のデザイン**（名称は仮称）を、Web 画面に適用する。特定の鉄道・空港・メーカーの表示器の再現や、公式のデザインシステムではない。依頼者や画面にもそう説明しない。

核は**「暗い盤面を区画に分け、今の状態だけを琥珀で点灯させる」**こと。琥珀は現在地（選んだ状態・選んだ行と詳細・現在の手順・主操作）だけに使い、見栄えのために広げない。ドット文字は装飾で、数値は必ず読める文字でも1回だけ置く。

## 使う場面

- 「標示盤」「L案」「l-signage」の見た目を、名前を挙げて指定された依頼。
- 状態ごとの件数を一目で見せたい画面（窓口の呼び出し、作業の進行、設備の状態など）、手順のある入力画面。

使わない場面：このデザインの指定がない作業、一般的なダークテーマ・鉄道や空港風の画面、ダッシュボード一般、ほかのデザインの適用、見た目と無関係な修正。

## 手順

1. **対象を確認する。** 技術スタック、既存の CSS、画面の目的と主要操作、状態の種類と件数の規模、入力の検証と保存、IME で入力する欄、画面遷移、権限、キーボード操作（矢印キー・Tab）と、絞り込み・開閉・エラー後のフォーカス。利用する環境（明るい事務室で長時間使うか、印刷するか）。動作・データ・保存・URL・ルーティングは変えない。
2. **規則と部品を選ぶ。** [references/design-principles.md](references/design-principles.md) の判断表で、対象の業務にある部品だけを選ぶ（状態の盤面・選んだ行と詳細・手順のフォーム・ドット文字・目盛り）。**業務にない KPI・目盛り・盤面の区画は足さない。**
3. **トークンと描画関数を入れる。** [assets/tokens.css](assets/tokens.css) を取り込む（コピーしてよい）。ドット文字を使うなら [assets/dot-digits.js](assets/dot-digits.js) を使うか、同じ字形で書き直す。既存の変数・クラスと衝突するなら、接頭辞を変えるか画面のルート要素に範囲を限る。
4. **型に当てはめる。** [references/patterns.md](references/patterns.md) の最小例を、対象のマークアップ・命名・フレームワークで書き直す。動作は対象アプリの仕組みを使う。
5. **点検する**（下記）。直したら 1280px 前後・中間の幅・375px と、強制カラーでもう一度確かめる。

## 自己点検

- [ ] 琥珀は現在地（選んだ状態・選んだ行と直後の詳細・現在の手順・主操作）だけ。ほかの区画は暗い面の明るさの違いと継ぎ目で分けている。
- [ ] 状態の盤面は本物のラジオ（または既存の部品）で、選択は琥珀の面に加えて ✓・文字・`checked` で分かる。描き直しでラジオを作り直さず、矢印キーで続けて選べる。
- [ ] ドット文字は `aria-hidden` の装飾で、同じ数値が読める文字として1回だけある。1桁は 0 ではなく消灯の桁でそろえる。3桁以上や狭い幅で入らないときは、縮める・普通の数字にする・省く。
- [ ] 選んだ行の琥珀が、直後の詳細の左の琥珀の帯につながる。開閉は文言と `aria-expanded` でも分かり、開くと詳細へ、閉じると元のボタンへフォーカスが戻る。
- [ ] フォームは、左の列の現在の手順（琥珀の区画・ドット文字・文字）から琥珀の縦の罫が章名へ枝分かれし、下段の「次の手順」と主操作が線でつながる。狭い幅では手順 → 入力の順に縦に並び、DOM と Tab の順も同じ。
- [ ] フォーカスは生成りの外枠で、琥珀の区画の上では濃い色（`--ls-ink`）の外枠になる。エラーの欄でも外枠が見える（エラーの印は外枠ではなく影や枠線にする）。
- [ ] エラーは「エラー」の文字・理由・欄の枠と、件数と項目名の一覧（項目名から欄へ移れる）。琥珀の上にエラーの色を置いていない。
- [ ] 「1目盛り＝1件」を使う場合、点灯の数が件数と同じで、件数を文字で右に置いている。0件は点灯なし。件数が多すぎて目盛りが細かくなる業務では使っていない。
- [ ] 狭い幅（目安 760px 未満）で、表は行ごとに縦へ積み、並べ替えは1組だけ（並べ替えできない列の見出しは札にしない）。ページ全体が横にはみ出さない。
- [ ] 強制カラーで背景・琥珀・影が置き換わっても、ラジオの選択・ドット文字・現在地・選んだ行・エラーが分かる（ドット文字と目盛りだけ置き換えを止め、選択は `Highlight` の枠で補う。画面全体に `forced-color-adjust: none` を掛けない）。
- [ ] IME の変換中に検索・入力が勝手に確定・再描画されない。
- [ ] 外部のフォント・画像・CDN・API を追加していない。

## 報告するときの注意

- 参照したファイル（この SKILL.md、references、assets）と、対象に合わせて変えた点・使わなかった部品を書く。
- 確かめていないこと（スクリーンリーダー、実機の IME、別ブラウザ、実際の OS の強制カラー、明るい部屋での長時間の利用、印刷）は「未確認」と書く。
- 見やすさ・業務効率・アクセシビリティ基準への適合を、確かめずに断定しない。
