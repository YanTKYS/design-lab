---
name: j-risograph-ui
description: Applies the "二色刷り" (J案, two-color risograph) visual design to a web UI — cream paper printed in two plates, a blue plate for all text, rules and controls and a fluorescent-pink plate used only for slight misregistration on big headings, halftone dots, offset shadows and the ground of selected items; dotted rules, pill-shaped controls, a selected row marked with a blue bar and a 「表示中」 tag, and errors shown with an inverted blue 「エラー」 tag and double rules (never pink). Use only when the user asks for 二色刷り, J案, or this risograph style by name for a new or existing screen. Do not use for general print-style layouts, simple color changes, other design styles (including 糸の交点 and 折本), or unrelated coding.
compatibility: Plain HTML/CSS (optionally JS). Works offline; no CDN, web font or external API is required.
metadata:
  source: "YanTKYS/design-lab j-risograph (11th comparison design, J案)"
  version: "0.1"
---

# 二色刷り（J案）UI を適用する

リソグラフの二色刷りに**着想した独自のデザイン**（名称は仮称）を、Web 画面に適用する。特定の印刷所・製品・作品の再現や、公式のデザインシステムではない。依頼者や画面にもそう説明しない。

核は**2つの版の役割分担**：情報（文字・数値・罫・操作・状態・エラー）はすべて**青の版**で読めるようにし、**ピンクの版**は版ずれ・網点・ずれた影の飾りと、選択の地だけに使う。ピンクを取り除いても、画面の意味が1つも失われないようにする。

## 使う場面

- 「二色刷り」「J案」「リソグラフ（risograph）風」の見た目を、名前を挙げて指定された依頼。
- 住民向けの案内・受付、庁内の小さな台帳など、印刷物のような親しみを持たせたい画面。

使わない場面：このデザインの指定がない作業、一般的な印刷物風・ポスター風のレイアウト、配色だけの変更、ほかのデザインの適用、見た目と無関係な修正。

## 手順

1. **対象を確認する。** 技術スタック、既存の CSS の読み込み順、画面の目的と主要操作、表・フォーム・集計の有無、入力の検証と保存、IME で入力する欄、キーボード操作（矢印キー・Tab）と、絞り込み・開閉・エラー後のフォーカス。動作・データ・保存・URL・ルーティングは変えない。
2. **規則と部品を選ぶ。** [references/design-principles.md](references/design-principles.md) の判断表で、対象の業務にある部品だけを選ぶ（表・行の直下の詳細・章の入力欄・指標・棒）。**業務にない KPI・グラフ・表は足さない。**
3. **トークンを入れる。** [assets/tokens.css](assets/tokens.css) を取り込む（コピーしてよい）。既存の変数・クラスと衝突するなら、接頭辞を変えるか画面のルート要素に範囲を限る。
4. **型に当てはめる。** [references/patterns.md](references/patterns.md) の最小例を、対象のマークアップ・命名・フレームワークで書き直す。動作は対象アプリの仕組みを使う。
5. **点検する**（下記）。直したら 1280px 前後と 375px で、必要なら中間の幅でもう一度確かめる。

## 自己点検

- [ ] ピンクを消しても（強制カラー・印刷・色覚の違いを想定して）、状態・選択・エラー・リンク・数値がすべて読める。
- [ ] ピンクは版ずれ・網点・ずれた影・波線の下線・選択の地・「必須」の地だけ。エラーにピンクを使っていない。
- [ ] 大見出しの版ずれは文字の重複読み上げにならない（`text-shadow` か `aria-hidden` の飾り）。網点は余白の帯・選んだ行の地・章名の下線だけで、文字・数値・入力欄・フォーカスの枠に重ならない。
- [ ] 状態は記号（○ ◐ △ ● × など）と文字。選んだ行は網点の地に加えて、左の青い帯と「表示中」の文字の札。詳細はその行の直後。
- [ ] フォーカスは濃い青の外枠と淡い黄色の外光で、選択の塗りやピンクの影と別に見える。プログラムで移したフォーカスにも出る。
- [ ] エラーは青の反転札「エラー」・理由と直し方・二重罫の枠。件数と項目名の一覧へフォーカスし、項目名から欄へ移れる。
- [ ] 棒の長さは隣に書く数値・割合と同じ尺度。件数は文字で1回だけ読ませ、棒は `aria-hidden`。0件の値は一覧へのリンクにしない。
- [ ] 狭い幅（目安 760px 未満）で、表は行ごとに縦へ積み、並べ替えの操作は1組だけ（列見出しを札の列にする）。版ずれ・網点・件数・操作が重ならず、ページ全体が横にはみ出さない。
- [ ] キーボードだけで主要操作ができる。絞り込み・並べ替え・開閉・登録の後も、フォーカスが操作した部品か自然な移動先に残る（描き直しで操作中の部品を作り直していない。ラジオなら矢印キーで続けて選べる）。
- [ ] IME の変換中に検索・入力が勝手に確定・再描画されない。
- [ ] 外部のフォント・CDN・API を追加していない。

## 報告するときの注意

- 参照したファイル（この SKILL.md、references、assets）と、対象に合わせて変えた点・使わなかった部品を書く。
- 確かめていないこと（スクリーンリーダー、実機の IME、別ブラウザ、強制カラー、色覚の違い、印刷）は「未確認」と書く。
- 親しみやすさ・業務効率・アクセシビリティ基準への適合を、確かめずに断定しない。
