# 二色刷り：画面の型（最小の例）

[../assets/tokens.css](../assets/tokens.css) を読み込んだ前提の、最小の HTML / CSS の例。クラス名（`jr-` 接頭辞）や要素は**例**であり、対象アプリの命名・部品・フレームワークに合わせて書き直す。動作（JS）は対象アプリの仕組みを使う。

## 目次

1. 紙・帯・大見出し（版ずれと網点の帯）
2. 検索と状態の札
3. 点線罫の表、選んだ行、直後の詳細
4. 章と入力欄
5. 操作・フォーカス・エラー
6. 指標と棒（既に集計がある画面だけ）
7. 狭い幅
8. 画面の種類ごとの当てはめ方

## 1. 紙・帯・大見出し（版ずれと網点の帯）

```html
<header class="jr-top"><span class="jr-top__org">組織名</span><span>システム名</span></header>
<main class="jr-main">
  <div class="jr-hero">
    <h1 class="jr-title">画面名</h1>
    <p class="jr-count"><b>12</b>点 <span>／ 全12点</span></p>
    <span class="jr-hero__dots" aria-hidden="true"></span>
  </div>
  …
</main>
```

```css
body { margin: 0; background: var(--jr-paper); color: var(--jr-ink); font: var(--jr-body)/var(--jr-line-height) var(--jr-font); overflow-wrap: anywhere; }
.jr-top { display: flex; flex-wrap: wrap; align-items: center; gap: 0 12px; min-height: 54px; padding: 0 var(--jr-pad); border-bottom: var(--jr-rule); }
.jr-top__org { font-size: 20px; font-weight: var(--jr-weight-strong); }
.jr-main { max-width: 1280px; margin: 0 auto; padding: 0 var(--jr-pad) 48px; }
/* 網点は表題の上の余白の帯（--band）だけ。見出し・件数・操作は帯の下に置く */
.jr-hero { --band: 64px; position: relative; display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px 26px; padding: var(--band) 0 18px; border-bottom: var(--jr-rule-bold); overflow: hidden; }
.jr-title { position: relative; z-index: 1; margin: 0; font-size: 60px; font-weight: var(--jr-weight-strong); line-height: 1.05; letter-spacing: .03em; color: var(--jr-blue);
  text-shadow: var(--jr-misreg); } /* 版ずれ：文字を複製しないので読み上げは1回 */
.jr-count { position: relative; z-index: 1; margin: 0; font-size: 22px; font-weight: var(--jr-weight-strong); }
.jr-count b { font-size: 50px; line-height: 1; color: var(--jr-blue); font-variant-numeric: tabular-nums; }
.jr-hero__dots { position: absolute; right: -30px; top: calc(var(--band) * -0.8); width: 460px; height: calc(var(--band) * 1.8 - 20px); pointer-events: none;
  background: var(--jr-dot) 0 0 / 10px 10px; opacity: .85;
  -webkit-mask-image: radial-gradient(closest-side, #000 25%, transparent 100%); mask-image: radial-gradient(closest-side, #000 25%, transparent 100%); }
```

- 帯の高さ（`--band`）の中に網点を収め、下端を見出しの字面より上で止める（大きな文字は行の上へはみ出すため、帯の下端より 20px 上で止める）。
- 版ずれは大見出しだけ。中見出し（章名・区画名）は青の極太だけにし、網点の短い下線を添える。

## 2. 検索と状態の札

```html
<form class="jr-search" role="search"><label for="q">キーワード</label><input id="q" type="search"><button type="submit">検索</button></form>
<fieldset class="jr-chips"><legend class="visually-hidden">状態</legend>
  <label class="jr-chip"><input type="radio" name="st" value="" checked><span>すべて<span class="jr-chip__n">12</span></span></label>
  …
</fieldset>
<p class="jr-cond"><span class="jr-tag">絞り込み中</span>状態「貸出中」（12点中3点）　<button type="button" class="jr-link">条件をクリア</button></p>
```

```css
.jr-search { display: flex; align-items: center; gap: 10px; }
.jr-search input { flex: 1; min-width: 0; min-height: 42px; padding: 6px 14px; background: var(--jr-field); color: var(--jr-ink); border: 2px solid var(--jr-blue); border-radius: var(--jr-pill); font: inherit; }
.jr-search input::placeholder { color: var(--jr-placeholder); }
.jr-chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; border: 0; }
.jr-chip { position: relative; display: inline-flex; }
.jr-chip input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; }
.jr-chip > span { display: inline-flex; align-items: center; min-height: 38px; padding: 4px 14px; border: 2px solid var(--jr-blue); border-radius: var(--jr-pill); font-weight: var(--jr-weight-strong); }
.jr-chip__n { margin-left: 6px; font-weight: 400; font-variant-numeric: tabular-nums; }
.jr-chip input:checked + span { background: var(--jr-blue); color: var(--jr-on-blue); box-shadow: var(--jr-shadow-sm); }
.jr-chip input:checked + span::before { content: '✓ '; }
.jr-chip input:focus-visible + span { outline: var(--jr-focus-ring); outline-offset: var(--jr-focus-offset); box-shadow: var(--jr-focus-halo); }
.jr-tag { display: inline-block; margin-right: 10px; padding: 0 8px; background: var(--jr-ink); color: var(--jr-on-blue); font-size: 12px; font-weight: var(--jr-weight-strong); }
```

- 札のラジオは**最初に1回だけ作り**、絞り込みの後は `checked` と件数の文字だけを更新する（作り直すと、キーボードで選んだラジオのフォーカスが失われ、矢印キーで続けて選べない）。
- 検索をその場で絞り込むなら、IME の変換中（`compositionstart`〜`compositionend`）は絞り込まない。

## 3. 点線罫の表、選んだ行、直後の詳細

```html
<table class="jr-table"><caption class="visually-hidden">備品の一覧（12点中12点）。列見出しのボタンで並べ替えできます。</caption>
  <thead><tr>
    <th scope="col" aria-sort="ascending"><button type="button" class="jr-sort">管理番号<span aria-hidden="true">↑</span></button></th>
    …<th scope="col"><span class="visually-hidden">操作</span></th>
  </tr></thead>
  <tbody>
    <tr class="jr-row is-open">
      <td class="jr-id">B-003<span class="jr-tag jr-open-tag">表示中</span></td> …
      <td class="jr-act"><button type="button" aria-expanded="true" aria-controls="detail-b003">閉じる<span class="visually-hidden">（B-003）</span></button></td>
    </tr>
    <tr class="jr-detail-row"><td colspan="7"><section class="jr-detail" id="detail-b003" aria-labelledby="d-title">
      <h2 id="d-title" tabindex="-1">備品の詳細</h2> …
    </section></td></tr>
  </tbody>
</table>
```

```css
.jr-table { width: 100%; border-collapse: collapse; }
.jr-table th { padding: 10px 12px; text-align: left; font-size: 13px; border-top: var(--jr-rule); border-bottom: var(--jr-rule); }
.jr-sort { padding: 0; background: none; border: 0; color: inherit; font: inherit; font-weight: var(--jr-weight-strong); cursor: pointer; white-space: nowrap; }
.jr-table td { padding: 14px 12px; border-bottom: var(--jr-dot-rule); vertical-align: middle; }
/* 選んだ行：淡い網点の地＋左の青い帯＋「表示中」の札（文字の札が強制カラーでも残る手がかり） */
.jr-row.is-open td { background: var(--jr-dot-soft) 0 0 / 6px 6px; border-bottom: 0; }
.jr-row.is-open td:first-child { box-shadow: inset 6px 0 0 var(--jr-blue); padding-left: 18px; }
.jr-open-tag { display: block; width: fit-content; margin: 2px 0 0; font-size: 11px; }
.jr-detail-row td { padding: 0 12px 18px; background: var(--jr-dot-soft) 0 0 / 6px 6px; border-bottom: var(--jr-rule); }
.jr-detail-row td:first-child { box-shadow: inset 6px 0 0 var(--jr-blue); }
.jr-detail { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 0 30px; padding: 16px 20px; background: var(--jr-field); border: var(--jr-rule); border-radius: var(--jr-radius); box-shadow: var(--jr-shadow); }
.jr-act button { min-height: 36px; padding: 4px 16px; background: none; color: inherit; border: 2px solid var(--jr-blue); border-radius: var(--jr-pill); font: inherit; font-weight: var(--jr-weight-strong); cursor: pointer; }
.jr-row.is-open .jr-act button { background: var(--jr-blue); color: var(--jr-on-blue); }
```

- 強制カラー（Windows のハイコントラストなど）では、背景の網点・ずれた影・`box-shadow` の左の帯が消える。「表示中」の札（文字）は残るが、選んだ行が一目で分かるよう、枠で補う：

  ```css
  @media (forced-colors: active) {
    .jr-row.is-open td:first-child, .jr-detail-row td:first-child { border-left: 6px solid Highlight; }
    .jr-tag, .jr-error-tag { border: 1px solid CanvasText; }   /* 反転札は地の色が消えるので枠で囲む */
    .jr-chip input:checked + span { border-width: 4px; }        /* 選んだ札は枠を太く（塗りが消えるため） */
  }
  ```

  枠のない塗りだけのボタンには `border: 2px solid transparent` を付けておく（強制カラーでは枠が見える色に置き換わる）。
- 列は「番号 → 名前 → 区分 → 日付 → 状態 → 操作」を基本に、業務に合わせる。状態のセルは記号と文字（`<span aria-hidden="true">●</span>貸出中`）。
- 並べ替えは `th[aria-sort]` と列見出しのボタンだけ。別の並べ替えの部品を作らない。

## 4. 章と入力欄

```html
<section class="jr-section" aria-labelledby="ch-item">
  <h2 class="jr-chapter" id="ch-item">借りる備品</h2>
  <div class="jr-fields">
    <div class="jr-field">
      <label class="jr-label" for="item">備品<span class="jr-req">必須</span></label>
      <select id="item" class="jr-input" aria-describedby="item-hint">…</select>
      <p class="jr-hint" id="item-hint">貸出できる備品だけが並びます。</p>
    </div>
    <div class="jr-field is-wide">…</div>
  </div>
</section>
```

```css
.jr-section { display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 0 14px; padding: 18px 0 16px; border-bottom: var(--jr-dot-rule); }
.jr-chapter { margin: 0; font-size: 24px; font-weight: var(--jr-weight-strong); color: var(--jr-blue); line-height: 1.4; }
.jr-chapter::after { content: ''; display: block; width: 66px; height: 8px; margin-top: 8px; background: var(--jr-dot) 0 0 / 6px 6px; } /* 網点の下線（飾り） */
.jr-fields { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px 22px; }
.jr-field { min-width: 0; }
.jr-field.is-wide { grid-column: 1 / -1; }
.jr-label { display: flex; align-items: center; gap: 8px; margin: 0 0 4px; font-size: 16px; font-weight: var(--jr-weight-strong); }
.jr-req { padding: 0 6px; background: var(--jr-pink-soft); color: var(--jr-ink); font-size: 11px; font-weight: var(--jr-weight-strong); line-height: 1.7; border-radius: 2px; }
.jr-req.is-opt { background: transparent; border: 1px solid var(--jr-ink); font-weight: 400; }
.jr-input { display: block; box-sizing: border-box; width: 100%; min-height: 40px; padding: 6px 10px; background: var(--jr-field); color: var(--jr-ink); border: 1px solid var(--jr-blue); border-radius: 4px; font: inherit; font-size: 16px; }
.jr-input::placeholder { color: var(--jr-placeholder); }
.jr-hint { margin: 4px 0 0; font-size: 12.5px; color: var(--jr-muted); }
/* 確認事項：薄い網点の地に、紙の色の箱と青の枠 */
.jr-section--consent { padding: 14px; background: radial-gradient(circle, rgba(255, 87, 155, .35) 0 1.2px, transparent 1.6px) 0 0 / 7px 7px; border-bottom: 0; }
.jr-consent { padding: 12px 16px; background: var(--jr-field); border: var(--jr-rule); }
```

## 5. 操作・フォーカス・エラー

```css
.jr-btn { display: inline-flex; align-items: center; gap: 16px; min-height: 44px; padding: 8px 26px; background: var(--jr-blue); color: var(--jr-on-blue); border: 2px solid var(--jr-blue);
  border-radius: var(--jr-pill); font: inherit; font-size: 16px; font-weight: var(--jr-weight-strong); box-shadow: var(--jr-shadow); cursor: pointer; }
.jr-btn--ghost { background: transparent; color: var(--jr-ink); box-shadow: none; }
.jr-link { padding: 0; background: none; border: 0; color: var(--jr-ink); font: inherit; font-weight: var(--jr-weight-strong); text-decoration: underline wavy var(--jr-pink); text-underline-offset: 5px; cursor: pointer; }
/* フォーカス：選択の塗り・ピンクの影とは別の形。プログラムで移したフォーカス（tabindex="-1"）にも */
:focus-visible, [tabindex="-1"]:focus { outline: var(--jr-focus-ring); outline-offset: var(--jr-focus-offset); box-shadow: var(--jr-focus-halo); }
/* エラー：版を増やさず、青の反転札と二重罫。ピンクは使わない */
.jr-errors { margin: 20px 0; padding: 14px 18px; background: var(--jr-field); border: var(--jr-double); }
.jr-errors h2 { display: flex; align-items: center; gap: 10px; margin: 0; font-size: 18px; font-weight: var(--jr-weight-strong); }
.jr-error-tag { flex: none; padding: 0 8px; background: var(--jr-ink); color: var(--jr-on-blue); font-size: 12px; font-weight: var(--jr-weight-strong); line-height: 1.8; }
.jr-error { display: flex; align-items: baseline; gap: 8px; margin: 4px 0; font-size: 14px; font-weight: var(--jr-weight-strong); }
.jr-field.is-invalid .jr-input { border: var(--jr-double-field); }
.jr-consent.is-invalid { border: var(--jr-double); }
```

```html
<div class="jr-errors" tabindex="-1" aria-labelledby="err-title">
  <h2 id="err-title"><span class="jr-error-tag">エラー</span>入力エラーが3件あります</h2>
  <ul><li><button type="button" class="jr-link">返却予定日</button>　貸出日から14日以内の日を選んでください。</li></ul>
</div>
…
<p class="jr-error" id="due-error"><span class="jr-error-tag">エラー</span>貸出日から14日以内の日を選んでください。</p>
```

送信時はエラーの一覧へフォーカスを移す。欄には `aria-invalid="true"` と、エラー文への `aria-describedby`。

## 6. 指標と棒（既に集計がある画面だけ）

```css
.jr-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: var(--jr-rule-bold); border-bottom: var(--jr-rule-bold); }
.jr-kpi { padding: 12px 18px 14px; }
.jr-kpi + .jr-kpi { border-left: var(--jr-dot-rule); }
.jr-kpi__value { white-space: nowrap; } /* 73.2% を途中で折り返さない */
.jr-kpi__value b { font-size: 48px; font-weight: var(--jr-weight-strong); color: var(--jr-blue); font-variant-numeric: tabular-nums; }
.jr-col__bar { width: 38px; height: calc(var(--r) * 72px); background: var(--jr-blue); box-shadow: 3px 0 0 var(--jr-pink); } /* --r は 0〜1、隣の数値と同じ尺度 */
.jr-mini { display: block; width: 72px; height: 6px; background: #dcd8e4; }
.jr-mini i { display: block; height: 100%; background: var(--jr-blue); }
```

- 件数は棒の真上・表の列に文字で置く。棒は `aria-hidden`。
- 網点の飾りを指標に置く場合は、最初の指標の右上の、数値・説明に掛からない位置だけ（上の罫で切る）。
- 0件の値は一覧へのリンクにしない。

## 7. 狭い幅

```css
@media (max-width: 1099px) { :root { --jr-pad: 28px; } }
@media (max-width: 759px) {
  :root { --jr-pad: 16px; }
  .jr-hero { --band: 48px; }
  .jr-title { font-size: 38px; }
  .jr-hero__dots { width: 260px; right: -40px; }
  /* 表は行ごとに縦へ積み、列見出しは並べ替えの札の列に（並べ替えの操作は1組だけ） */
  .jr-table, .jr-table tbody, .jr-table thead, .jr-table td { display: block; }
  .jr-table thead tr { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 10px 0; border-top: var(--jr-rule); border-bottom: var(--jr-rule); }
  .jr-table thead tr::before { content: '並べ替え'; font-size: 13px; font-weight: var(--jr-weight-strong); }
  .jr-table th { padding: 0; border: 0; }
  .jr-table th:last-child { display: none; } /* 操作の列の見出し */
  .jr-sort { min-height: 32px; padding: 2px 10px; border: 2px solid var(--jr-blue); border-radius: var(--jr-pill); font-size: 13px; }
  .jr-table th[aria-sort]:not([aria-sort='none']) .jr-sort { background: var(--jr-blue); color: var(--jr-on-blue); }
  .jr-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 10px; padding: 12px 10px; border-bottom: var(--jr-dot-rule); }
  .jr-table td { padding: 0; border: 0; }
  .jr-act { grid-column: 2; grid-row: 1; }
  .jr-row.is-open { box-shadow: inset 6px 0 0 var(--jr-blue); padding-left: 16px; background: var(--jr-dot-soft) 0 0 / 6px 6px; }
  .jr-row.is-open td, .jr-row.is-open td:first-child { background: none; box-shadow: none; padding-left: 0; }
  .jr-detail-row { display: block; }
  .jr-detail { grid-template-columns: 1fr; gap: 8px; padding: 14px; }
  .jr-section, .jr-fields { grid-template-columns: 1fr; }
  .jr-btn { width: 100%; justify-content: space-between; }
}
```

- 縦に積んだ行では、値の前に項目名を添える（`td::before { content: '返却予定　'; }` など。または見える文字のラベル）。
- `display: block` にした表は、支援技術によっては表として読まれなくなる。必要なら `role` を補う（対象アプリの方針に合わせる）。

## 8. 画面の種類ごとの当てはめ方

| 画面 | 使う部品 | 入れなくてよい部品 |
| --- | --- | --- |
| 申請の台帳（原本） | 大見出しと件数、検索と状態の札、点線罫の表、行の直後の詳細、章の入力欄、指標と棒 | — |
| 備品の貸出・点検記録 | 大見出しと件数、検索と状態の札、表、行の直後の詳細、章の入力欄 | 指標の帯・棒グラフ（集計がないなら） |
| 短い依頼の受付ボード（数件） | 状態の札、点線罫のリスト、章の入力欄 | 表の並べ替え、件数の大見出し |
| 住民向けの案内・申込 | 大見出し（版ずれ）、章の入力欄、確認事項、エラー | 表・指標 |
| 長時間使う業務画面 | 罫・札・選択・フォーカス・エラーの形 | 網点の帯、大見出しの版ずれ（減らす） |
