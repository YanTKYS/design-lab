---
name: h-prime-ui
description: Applies the "折本" (H′, folding-book) visual design to a web UI — cream ground with a grape accent used only for "you are here", Mincho titles, items as vertical-text (縦組み) faces read right to left, two-part forms laid out as a 見開き (right page first, then left page, matching Tab order), and a switch to horizontal text on narrow screens. Use only when the user asks for 折本, H′, or this folding-book / 縦組み・見開き style for a new or existing screen. Do not use for other design styles (including 糸の交点), for general vertical-text typesetting, or for unrelated coding.
compatibility: Plain HTML/CSS (optionally JS). Works offline; no CDN, web font or external API is required. Needs CSS writing-mode (all current browsers).
metadata:
  source: "YanTKYS/design-lab h-prime (10th comparison design, H′)"
  version: "0.1"
---

# 折本（H′）UI を適用する

蛇腹に折った本（折本）に**着想した独自のデザイン**（名称は仮称）を、Web 画面に適用する。和本・経本の再現、公式のデザインシステム、伝統的な様式ではない。依頼者や画面にもそう説明しない。

目的は縦組みの見た目を貼ることではなく、**読む順を紙の順に合わせること**：先に読むものを右に置き、右から左へ読ませる。そのうえで、見た目の順・DOM の順・Tab の順を一致させる。

## 使う場面

- 「折本」「H′」の見た目、または「縦組みの面」「見開きのフォーム」をこのデザインで、と指定された依頼。
- 1件ずつの見分けが大事な少数の一覧（数件〜十数件）、2つのまとまりを並べて読む入力画面。

使わない場面：このデザインの指定がない作業、ほかのデザインの適用、縦書きの文書組版一般、見た目と無関係な修正。

## 手順

1. **対象を先に確認する。** 技術スタック、既存の CSS の読み込み順、画面の目的と主要操作、件数の規模、入力の検証と保存、IME で入力する欄、キーボード操作とフォーカスの移動、既存の `aria-*`。動作・データ・保存・ルーティングは変えない。
2. **規則を読む。** [references/design-principles.md](references/design-principles.md) の「必ず守る規則」「変えてよい点」「避ける誤用」と、どの部品を使うかの判断表。
3. **部品を選ぶ。** 対象の業務にあるものだけ。縦組みの面は少数の一覧だけ、見開きは2つのまとまりがある入力だけ、指標の面は既に集計がある画面だけ。**ない部品は足さない。**
4. **トークンを入れる。** [assets/tokens.css](assets/tokens.css) を取り込む（コピーしてよい）。既存の変数・クラスと衝突するなら、接頭辞を変えるか画面のルート要素に範囲を限る。
5. **型に当てはめる。** [references/patterns.md](references/patterns.md) の最小例を、対象のマークアップ・命名・フレームワークで書き直す。動作は対象アプリの仕組みを使う。
6. **自己点検する**（下記）。直したら 1280px 前後・中間の幅・375px でもう一度確かめる。

## 自己点検

- [ ] 右から左へ読む箇所で、**見た目の順＝DOM の順＝Tab の順**になっている（先頭が右端。狭い幅では先頭が上）。CSS の `order` で入れ替えていない。
- [ ] 時系列（月別・時刻）や表の列は、左から右のままにしている。向きが混ざる画面では「右から左へ」「月の順 →」のように文字で示している。
- [ ] 縦組みは名前・章名などの短い語だけ。入力欄・本文・番号・日付・時刻・数値・英字は横組み。
- [ ] 葡萄色は選択・現在地・主操作・確認の帯だけで、画面の大半を塗っていない。
- [ ] 選択（葡萄色の塗り＋白い文字＋太字や ✓）とフォーカス（葡萄色の外枠と淡い外光、葡萄色の上では生成りの外枠）が別に見える。プログラムで移したフォーカスにも枠が出る。
- [ ] エラーは「エラー：」の文字・理由・欄の左の赤い帯と太枠で示し、色だけに頼らない。件数と項目名の一覧を先頭に置いてフォーカスし、項目名から欄へ移れる。
- [ ] 状態は記号（○ ◐ △ ● × など）と文字で示している。
- [ ] 狭い幅（目安 760px 未満）で、縦組みの名前が横組みになり、面は上から積まれ、見開きは右頁が上・左頁が下になる。ページ全体が横にはみ出さない。
- [ ] 上辺の傾き・折り目の装飾が、文字・フォーカスの枠・操作を切っていない。
- [ ] 補助文字と入力欄の枠が地の色から読める（目安：文字 4.5:1、部品の枠 3:1）。
- [ ] IME の変換中に入力・検索が勝手に確定・再描画されない（既存の挙動を壊していない）。
- [ ] 外部のフォント・CDN・API を追加していない。明朝がない端末でもゴシックで崩れない。

## 報告するときの注意

- 参照したファイル（この SKILL.md、references、assets）と、対象に合わせて変えた点・使わなかった部品を書く。
- 確かめていないこと（スクリーンリーダー、実機の IME、別ブラウザ、明朝のない端末など）は「未確認」と書く。
- 読みやすさ・業務効率・アクセシビリティ基準への適合を、確かめずに断定しない。
