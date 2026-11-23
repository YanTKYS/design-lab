# 標示盤：画面の型（最小の例）

[../assets/tokens.css](../assets/tokens.css) を読み込んだ前提の、最小の HTML / CSS / JS の例。クラス名（`ls-` 接頭辞）や要素は**例**であり、対象アプリの命名・部品・フレームワークに合わせて書き直す。動作（JS）は対象アプリの仕組みを使う（ドット文字の描画は [../assets/dot-digits.js](../assets/dot-digits.js) をそのまま使ってよい）。

## 目次

1. 盤面の地・帯・区画
2. ドット文字
3. 状態の盤面（ラジオの区画）
4. 台帳の表、選んだ行、直後の詳細
5. 手順のフォーム（現在の手順・琥珀の罫・章名の枝・次の手順）
6. 操作・フォーカス・エラー
7. 1目盛り＝1件
8. 狭い幅
9. 強制カラー
10. 画面の種類ごとの当てはめ方

## 1. 盤面の地・帯・区画

```html
<header class="ls-top"><span class="ls-top__org">組織名</span><span>システム名</span></header>   <!-- 明るい帯は任意 -->
<main class="ls-main"><h1 class="ls-title">画面名</h1> … </main>
```

```css
body { margin: 0; background: var(--ls-ground); color: var(--ls-text); font: var(--ls-body)/var(--ls-line-height) var(--ls-font); overflow-wrap: anywhere; }
.ls-top { display: flex; flex-wrap: wrap; align-items: center; gap: 0 14px; min-height: 50px; padding: 0 var(--ls-pad); background: var(--ls-top); color: #2a2b27; }
.ls-top :focus-visible { outline-color: #272928; }                 /* 明るい帯の上のフォーカスは濃い色 */
.ls-main { max-width: 1280px; margin: 0 auto; padding: 0 var(--ls-pad) 48px; }
.ls-title { margin: 0; padding: 28px 0 20px; font-size: 52px; font-weight: 700; letter-spacing: .02em; line-height: 1.1; }
/* 盤面：上下の太い罫の間に、継ぎ目で区画を並べる */
.ls-board { display: grid; gap: var(--ls-seam); padding: 6px 0; background: var(--ls-gap); border-top: 3px solid var(--ls-frame); border-bottom: 3px solid var(--ls-frame); }
.ls-panel { padding: 12px 14px; background: var(--ls-bar); border: 1px solid #454b43; }
.ls-panel.is-current { background: var(--ls-amber); color: var(--ls-ink); border-color: var(--ls-amber); }  /* 現在地だけ */
```

## 2. ドット文字

```html
<script src="dot-digits.js"></script>   <!-- Skill の assets から対象アプリへコピーする -->
<p class="ls-count">
  <span class="ls-count__dots"></span>                     <!-- 装飾（aria-hidden の SVG が入る） -->
  <span class="visually-hidden">12件</span>                 <!-- 読む数値は文字で1回だけ -->
</p>
<script>
  document.querySelector('.ls-count__dots').innerHTML = dotDigits(12, { width: 2, className: 'l-dots' });
</script>
```

```css
.l-dots { display: block; flex: none; height: 34px; width: calc(var(--w) * 34px / 7); }   /* 幅は字数に比例 */
.l-dots .on { fill: var(--ls-dot); }
.l-dots .off { fill: var(--ls-dot); opacity: var(--ls-dot-off); }
.is-current .l-dots :is(.on, .off) { fill: var(--ls-ink); }                              /* 琥珀の上 */
.is-current .l-dots .off { opacity: .13; }
```

- 桁数（`width`）は、同じ区画に並ぶ値の最大の桁数にそろえる。1桁の値は左が消灯の桁になる（0 では埋めない）。
- 高さ 18px 未満にしない。入らないときは、ドット文字をやめて普通の数字（等幅・太字）にする。

## 3. 状態の盤面（ラジオの区画）

```html
<fieldset class="ls-states">
  <legend class="ls-states__label">状態</legend>
  <label class="ls-state">
    <input type="radio" name="state" value="" checked>
    <span class="ls-state__face"><span class="ls-state__label"><span class="ls-state__check" aria-hidden="true">✓</span>すべて</span>
      <span class="ls-state__dots"><!-- dotDigits(n) --></span><span class="visually-hidden">12件</span></span>
  </label> …
</fieldset>
```

```css
.ls-states { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--ls-seam); margin: 0; padding: 6px 0; border: 0;
  border-top: 3px solid var(--ls-frame); border-bottom: 3px solid var(--ls-frame); }
.ls-states__label { grid-column: 1 / -1; float: left; padding: 0 0 2px; font-size: 12px; color: var(--ls-muted); }
.ls-state { position: relative; display: flex; min-width: 0; }
.ls-state input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; }
.ls-state__face { display: flex; flex: 1; align-items: center; justify-content: space-between; gap: 8px; min-height: 64px; padding: 8px 14px; background: var(--ls-bar); border: 1px solid #454b43; }
.ls-state__label { font-size: 17px; font-weight: 700; white-space: nowrap; }
.ls-state__check { display: none; margin-right: 4px; }
.ls-state input:checked + .ls-state__face { background: var(--ls-amber); color: var(--ls-ink); border-color: var(--ls-amber); }
.ls-state input:checked + .ls-state__face .ls-state__check { display: inline; }
.ls-state input:checked + .ls-state__face .l-dots :is(.on, .off) { fill: var(--ls-ink); }
.ls-state input:focus-visible + .ls-state__face { outline: var(--ls-focus-ring); outline-offset: var(--ls-focus-offset); }
```

```js
// ラジオは最初に1回だけ作る。描き直しでは checked と件数だけを更新する（作り直すと、選んだラジオのフォーカスが失われ、矢印キーで続けて選べない）
function renderStates(counts, selected) {
  for (const s of STATES) {
    const input = document.getElementById('state-' + s.id);
    input.checked = s.id === selected;
    input.nextElementSibling.querySelector('.ls-state__dots').innerHTML = dotDigits(counts[s.id], { width: 2 });
    input.nextElementSibling.querySelector('.visually-hidden').textContent = counts[s.id] + '件';
  }
}
```

## 4. 台帳の表、選んだ行、直後の詳細

```html
<table class="ls-table">
  <thead><tr><th scope="col" aria-sort="ascending"><button type="button" class="ls-sort">番号<span aria-hidden="true">↑</span></button></th> … <th scope="col"><span class="visually-hidden">操作</span></th></tr></thead>
  <tbody>
    <tr class="ls-row is-open"> …
      <td><button type="button" aria-expanded="true" aria-controls="detail">閉じる</button></td></tr>
    <tr class="ls-detail-row"><td colspan="5">
      <section class="ls-detail" id="detail" aria-labelledby="detail-title"><h2 id="detail-title" tabindex="-1">詳細</h2> …</section>
    </td></tr>
  </tbody>
</table>
```

```css
.ls-table { width: 100%; border-collapse: collapse; }
.ls-table th { padding: 9px 16px; text-align: left; font-size: 13px; font-weight: 400; background: var(--ls-bar); }
.ls-sort { padding: 0; background: none; border: 0; color: var(--ls-text); font: inherit; cursor: pointer; white-space: nowrap; }
.ls-sort span { margin-left: 6px; color: var(--ls-amber); }
.ls-table td { padding: 11px 16px; border-bottom: 1px solid var(--ls-row); vertical-align: middle; }
.ls-row.is-open td { background: var(--ls-amber); color: var(--ls-ink); border-bottom: 0; font-weight: 700; }
.ls-row.is-open :focus-visible { outline-color: var(--ls-ink); }
.ls-row.is-open button { color: var(--ls-ink); border-color: var(--ls-ink); }
.ls-detail-row td { padding: 0; border-bottom: 1px solid var(--ls-row); }
.ls-detail { padding: 16px 20px 18px; background: var(--ls-detail); box-shadow: inset 5px 0 0 var(--ls-amber); }   /* 選んだ行の琥珀が左の帯で続く */
.ls-detail h2 { margin: 0; color: var(--ls-amber); font-size: 17px; }
.ls-detail dt { font-size: 12px; color: var(--ls-amber); }
```

並べ替えで表を描き直したら、押した見出しのボタンへフォーカスを戻す。並べ替えできない列の `th` には `aria-sort` を付けない（8 で隠すため）。

## 5. 手順のフォーム（現在の手順・琥珀の罫・章名の枝・次の手順）

```html
<form class="ls-form" novalidate>
  <div class="ls-frow ls-fhead">
    <div class="ls-now"><span class="ls-now__dots"><!-- dotDigits(1, { width: 1 }) --></span><span class="ls-now__label">入力</span><span class="ls-now__tag">現在</span>
      <span class="visually-hidden">（手順 1 / 2）</span></div>
    <div class="ls-titlebar"><h2 class="ls-ftitle" tabindex="-1">整理番号の発行</h2></div>
  </div>
  <section class="ls-frow ls-chapter" aria-labelledby="ch-1">
    <div class="ls-rail"><h3 class="ls-chapter__title" id="ch-1">用件</h3></div>
    <div class="ls-cells">…入力欄…</div>
  </section>
  …
  <div class="ls-frow ls-foot">
    <ol class="ls-next" aria-label="ほかの手順"><li class="ls-next__item is-next" id="step-2"><span class="ls-next__dots"><!-- dotDigits(2, { width: 1 }) --></span>確認<span class="visually-hidden">（次の手順）</span></li></ol>
    <div class="ls-actions"><span class="ls-connector" aria-hidden="true"></span><button type="submit" class="ls-btn ls-btn--primary" aria-describedby="step-2">確認へ<span aria-hidden="true">→</span></button></div>
  </div>
</form>
```

```css
.ls-form { display: grid; background: var(--ls-gap); border-top: 3px solid var(--ls-frame); border-bottom: 2px solid #858c7d; }
.ls-frow { display: grid; grid-template-columns: var(--ls-rail-width) minmax(0, 1fr); gap: 0 var(--ls-seam); }
.ls-fhead { margin-bottom: var(--ls-seam); }
.ls-foot { margin-top: var(--ls-seam); min-height: 66px; }
/* 現在の手順：琥珀の地にドット文字の番号と手順名 */
.ls-now { display: flex; align-items: center; gap: 12px; min-height: 80px; padding: 0 18px; background: var(--ls-amber); color: var(--ls-ink); }
.ls-now .l-dots { height: 42px; width: calc(var(--w) * 42px / 7); }
.ls-now .l-dots :is(.on, .off) { fill: var(--ls-ink); }
.ls-now__label { font-size: 28px; font-weight: 700; white-space: nowrap; }
.ls-now__tag { padding: 0 5px; border: 1.5px solid #6a5118; font-size: 13px; font-weight: 700; white-space: nowrap; }
.ls-titlebar { display: flex; align-items: center; padding: 10px 22px; background: var(--ls-bar); }
.ls-ftitle { margin: 0; font-size: 36px; font-weight: 700; }
/* 章：左の列に琥珀の縦の罫を通し、章名へ枝を出す。最後の章で罫が止まる */
.ls-rail { position: relative; padding: 22px 16px 22px 64px; background: var(--ls-rail); }
.ls-rail::before { content: ''; position: absolute; left: 36px; top: -1px; bottom: 0; width: 3px; background: var(--ls-amber-line); }
.ls-chapter .ls-rail::after { content: ''; position: absolute; left: 36px; top: 36px; width: 16px; height: 3px; background: var(--ls-amber-line); }
.ls-chapter:last-of-type .ls-rail::before { bottom: auto; height: 39px; }
.ls-chapter__title { margin: 0; font-size: 19px; font-weight: 700; }
.ls-cells { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); background: var(--ls-cell); }
.ls-fcell { min-width: 0; padding: 16px 20px 14px; border-bottom: 1px solid var(--ls-rule); }
.ls-input { display: block; box-sizing: border-box; width: 100%; min-height: 40px; padding: 6px 12px; background: var(--ls-field); color: var(--ls-text);
  border: 1px solid var(--ls-field-line); border-bottom: 2px solid var(--ls-field-under); border-radius: 0; font: inherit; font-size: 16px; }
.ls-input::placeholder { color: var(--ls-placeholder); }
/* 下段：次の手順と、そこへ進む主操作を琥珀の点線でつなぐ */
.ls-next { display: flex; flex-direction: column; justify-content: center; gap: 2px; margin: 0; padding: 8px 18px; list-style: none; background: var(--ls-foot-l); }
.ls-next__item { display: flex; align-items: center; gap: 8px; color: var(--ls-muted); font-size: 13px; }
.ls-next__item.is-next { color: var(--ls-text); font-size: 15px; font-weight: 700; }
.ls-next .l-dots { height: 24px; width: calc(var(--w) * 24px / 7); }
.ls-next .l-dots :is(.on, .off) { fill: currentColor; }
.ls-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; padding: 8px 0 8px 20px; background: var(--ls-foot-r); }
.ls-connector { flex: 1; min-width: 24px; border-top: 2px dashed var(--ls-amber-line); opacity: .75; }
.ls-foot:has(.ls-btn--primary:is(:hover, :focus-visible)) .ls-next__item.is-next { color: var(--ls-amber); }   /* 主操作に触れると次の手順も点く */
```

## 6. 操作・フォーカス・エラー

```css
.ls-btn { display: inline-flex; align-items: center; justify-content: space-between; gap: 24px; min-height: 50px; padding: 8px 22px; border: 0; font: inherit; font-size: 17px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.ls-btn--primary { min-width: 160px; background: var(--ls-amber); color: var(--ls-ink); }
.ls-btn--ghost { min-height: 44px; background: transparent; color: var(--ls-text); border: 1.5px solid var(--ls-muted); }
.ls-link { padding: 0; background: none; border: 0; color: var(--ls-text); font: inherit; font-weight: 700; text-decoration: underline; text-decoration-color: var(--ls-amber); text-underline-offset: 3px; cursor: pointer; }
/* フォーカス：生成りの外枠。琥珀の面の上では濃い色に */
:focus-visible, [tabindex="-1"]:focus { outline: var(--ls-focus-ring); outline-offset: var(--ls-focus-offset); }
.ls-btn--primary:focus-visible { outline-color: var(--ls-focus); outline-offset: 3px; }   /* 琥珀のボタンの外側（暗い地の上）に出す */
/* エラー：「エラー」の文字と理由、欄の枠と左の赤い帯。チェックボックスの赤い印は影にして、フォーカスの外枠と重ねない */
.ls-fcell.is-invalid { box-shadow: inset 4px 0 0 var(--ls-error); }
.ls-fcell.is-invalid .ls-input { border: 2px solid var(--ls-error); }
.ls-fcell.is-invalid input[type="checkbox"] { box-shadow: 0 0 0 2px var(--ls-cell), 0 0 0 4px var(--ls-error); }
.ls-fcell.is-invalid input[type="checkbox"]:focus-visible { outline-offset: 6px; }
.ls-field-error { margin: 6px 0 0; color: var(--ls-error); font-size: 14px; }   /* 「! エラー　理由と直し方」 */
.ls-errors { padding: 16px 20px; background: var(--ls-cell); box-shadow: inset 4px 0 0 var(--ls-error); }
.ls-errors h3 { margin: 0; font-size: 17px; color: var(--ls-error); }
```

エラーの一覧は `tabindex="-1"` で、送信時にフォーカスを移す。中身は件数と、項目名のボタン（押すとその欄へ）＋理由。欄には `aria-invalid="true"` とエラー文への `aria-describedby`。

## 7. 1目盛り＝1件

```js
// 目盛りの数は最大値を5の倍数に切り上げた数（どの項目でも1目盛り＝1件のまま）。点灯の数＝件数
function ticks(n, max) {
  const total = Math.max(5, Math.ceil(max / 5) * 5);
  return '<span class="ls-ticks" style="--n:' + total + '" aria-hidden="true">' + Array.from({ length: total }, (_, i) => '<i' + (i < n ? ' class="on"' : '') + '></i>').join('') + '</span>';
}
```

```html
<tr><th scope="row">住民票・戸籍</th><td><!-- ticks(4, max) --></td><td class="ls-num">4</td></tr>
```

```css
.ls-ticks { display: grid; grid-template-columns: repeat(var(--n), minmax(3px, 1fr)); gap: 2px; }   /* 1目盛りは最低 3px */
.ls-ticks i { height: 10px; background: var(--ls-tick-off); }
.ls-ticks i.on { background: var(--ls-tick-on); }
.ls-num { text-align: right; font-family: var(--ls-mono); font-variant-numeric: tabular-nums; font-weight: 700; }
```

1項目の件数が数十件を超える業務では使わない（目盛りが 3px より細くなる、数えられない）。普通の棒グラフや表にする。

## 8. 狭い幅

```css
@media (max-width: 999px) {
  :root { --ls-pad: 24px; --ls-rail-width: 180px; }
  .ls-cells { grid-template-columns: minmax(0, 1fr); }
  .ls-now__label { font-size: 22px; }
  .ls-now .l-dots { height: 26px; width: calc(var(--w) * 26px / 7); }
}
@media (max-width: 759px) {
  :root { --ls-pad: 16px; }
  .ls-title { font-size: 36px; }
  .ls-states { grid-template-columns: repeat(2, minmax(0, 1fr)); }   /* 3列では状態名が1字ずつ折り返す */
  .ls-state__face { min-height: 54px; padding: 6px 10px; }
  .ls-state__label { font-size: 14px; }
  .ls-state__face .l-dots { height: 26px; width: calc(var(--w) * 26px / 7); }
  /* 表は行ごとに縦へ積み、並べ替えは列見出しの札の1組だけ */
  .ls-table, .ls-table tbody, .ls-table thead, .ls-table td { display: block; }
  .ls-table thead tr { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 8px 12px; background: var(--ls-bar); }
  .ls-table thead tr::before { content: '並べ替え'; font-size: 13px; color: var(--ls-muted); }
  .ls-table th { padding: 0; background: none; }
  .ls-table th:not([aria-sort]) { display: none; }
  .ls-sort { min-height: 32px; padding: 2px 10px; border: 1px solid #5b6258; font-size: 13px; }
  .ls-table th:not([aria-sort='none']) .ls-sort { background: var(--ls-amber); color: var(--ls-ink); border-color: var(--ls-amber); }
  .ls-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 10px; padding: 12px; border-bottom: 1px solid var(--ls-row); }
  .ls-table td { padding: 0; border: 0; }
  .ls-row.is-open { background: var(--ls-amber); color: var(--ls-ink); font-weight: 700; border-bottom: 0; }
  .ls-row.is-open td { background: none; }
  .ls-detail-row { display: block; }
}
@media (max-width: 639px) {
  /* フォームは1列。手順の罫は左端に通したまま、章名を欄の上に置く */
  .ls-frow { grid-template-columns: minmax(0, 1fr); gap: 0; }
  .ls-now { min-height: 64px; padding: 0 16px; }
  .ls-rail { padding: 14px 16px 10px 52px; }
  .ls-rail::before { left: 24px; }
  .ls-chapter .ls-rail::after { left: 24px; top: 26px; }
  .ls-cells { background: linear-gradient(var(--ls-amber-line), var(--ls-amber-line)) 24px 0 / 3px 100% no-repeat, var(--ls-cell); }
  .ls-chapter:last-of-type .ls-cells { background: var(--ls-cell); }
  .ls-fcell { padding-left: 44px; }
  .ls-next { flex-direction: row; flex-wrap: wrap; gap: 4px 18px; padding: 10px 16px; }
  .ls-actions { padding: 12px 16px 16px; }
  .ls-connector { display: none; }
  .ls-actions .ls-btn { width: 100%; }
}
```

## 9. 強制カラー

```css
@media (forced-colors: active) {
  :is(.ls-ticks, .l-dots) { forced-color-adjust: none; }       /* 装飾のドット文字と目盛りだけ */
  .ls-ticks i { background: Canvas; border: 1px solid CanvasText; }
  .ls-ticks i.on { background: CanvasText; }
  .l-dots .on { fill: CanvasText !important; opacity: 1 !important; }
  .l-dots .off { fill: CanvasText !important; opacity: .18 !important; }
  .ls-state input:checked + .ls-state__face { border: 3px solid Highlight; }
  .ls-row.is-open td { border-top: 2px solid Highlight; border-bottom: 2px solid Highlight; }
  :is(.ls-now, .ls-panel.is-current) { border: 2px solid Highlight; }
}
```

## 10. 画面の種類ごとの当てはめ方

| 画面 | 使う部品 | 入れなくてよい部品 |
| --- | --- | --- |
| 申請の一覧（原本） | 状態の盤面、台帳の表、選んだ行と詳細、手順のフォーム、指標の盤面と目盛り | — |
| 窓口の呼び出し・整理番号 | 窓口ごとの区画（呼び出し中の番号をドット文字）、状態の盤面、台帳と詳細、発行の手順のフォーム、用件別の待ち人数の目盛り | 推移のグラフ |
| 設備の稼働状態 | 設備ごとの区画（稼働・停止・点検を記号と文字）、状態の盤面、詳細 | 手順のフォーム（登録がないなら） |
| 作業の受付・進行 | 状態の盤面、台帳と詳細、受付の手順のフォーム | 指標の盤面（集計がないなら） |
| 設定・ログイン | 暗い区画と入力欄、生成りのフォーカス | 盤面・ドット文字・目盛り |
