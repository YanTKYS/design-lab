# 汀線：画面の型（最小の例）

[../assets/tokens.css](../assets/tokens.css) を読み込んだ前提の、最小の HTML / CSS / SVG の例。クラス名（`k-` 接頭辞）や要素は**例**であり、対象アプリの命名・部品・フレームワークに合わせて書き直す。動作（JS）は対象アプリの仕組みを使う（6 の補間の関数だけは、そのまま使ってよい）。

## 目次

1. 地・帯・表題（等高線の装飾）
2. 検索と絞り込みの札
3. 表、選んだ行、行の直後の詳細（広い幅では右の列に見せる）
4. 章の陸と水際（汀線の曲線）
5. 操作・フォーカス・エラー
6. 推移の曲線（実測の点と、目安の単調な曲線）
7. 狭い幅
8. 強制カラー
9. 画面の種類ごとの当てはめ方

## 1. 地・帯・表題（等高線の装飾）

```html
<header class="k-top"><span class="k-top__org">組織名</span><span>システム名</span></header>
<div class="k-hero">
  <div class="k-hero__text"><h1 class="k-title">画面名</h1><p class="k-hero__count">全12件</p></div>
  <div class="k-hero__art" aria-hidden="true"></div>
</div>
```

```css
body { margin: 0; background: var(--k-ground); color: var(--k-ink); font: var(--k-body)/var(--k-line-height) var(--k-gothic); overflow-wrap: anywhere; }
.k-top { display: flex; flex-wrap: wrap; align-items: center; gap: 0 12px; min-height: 54px; padding: 0 var(--k-pad); border-bottom: 1px solid #8ba99c; }
.k-hero { display: flex; justify-content: space-between; min-height: 154px; background: var(--k-hero); border-bottom: 1px solid #8ba99c; overflow: hidden; }
.k-hero__text { flex: 1 1 auto; min-width: 0; padding: 22px var(--k-pad) 18px; }
.k-title { margin: 0; font-family: var(--k-mincho); font-size: 56px; font-weight: 700; line-height: 1.15; color: var(--k-deep); }
/* 等高線は自作の SVG（同じフォルダーの k-shore.svg を、対象アプリの画像の置き場へコピーして参照する） */
.k-hero__art { flex: 0 1 560px; min-width: 140px; background: url('k-shore.svg') left center / auto 100% no-repeat; }
```

装飾は背景画像なので読み上げられない。表題・件数・操作を装飾の上に置かない。

## 2. 検索と絞り込みの札

```html
<fieldset class="k-chips"><legend>状態</legend>
  <label class="k-chip"><input type="radio" name="st" value="" checked><span>すべて<span class="k-chip__n">12</span></span></label> …
</fieldset>
```

```css
.k-chips { display: flex; flex-wrap: wrap; gap: 4px; margin: 0; padding: 0; border: 0; }
.k-chips legend { width: 100%; margin-bottom: 6px; padding: 0; font-size: 13px; font-weight: 700; }
.k-chip { position: relative; display: inline-flex; }
.k-chip input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; }
.k-chip > span { display: inline-flex; align-items: center; min-height: 40px; padding: 4px 12px; border-bottom: 1px solid var(--k-line); }
.k-chip__n { margin-left: 8px; font-family: var(--k-mono); color: var(--k-muted); }
.k-chip input:checked + span { background: var(--k-land); font-weight: 700; border-bottom: 3px solid var(--k-green); }
.k-chip input:checked + span::before { content: '✓ '; }
.k-chip input:focus-visible + span { outline: var(--k-focus-ring); outline-offset: 2px; }
.k-search input { min-height: 40px; padding: 6px 12px; background: var(--k-field); color: var(--k-ink); border: 1px solid var(--k-control-line); border-radius: 0; font: inherit; }
.k-search input::placeholder { color: var(--k-placeholder); }
```

- 札（ラジオ）は**最初に1回だけ作り**、絞り込みの後は `checked` と件数の文字だけを更新する（作り直すと、選んだラジオのフォーカスが失われ、矢印キーで続けて選べない）。
- 検索をその場で絞り込むなら、IME の変換中（`compositionstart`〜`compositionend`）は絞り込まない。

## 3. 表、選んだ行、行の直後の詳細（広い幅では右の列に見せる）

```html
<div class="k-work has-rows">                       <!-- 表と右の列をまとめる（position: relative） -->
  <table class="k-table">
    <thead><tr>
      <th scope="col" aria-sort="ascending"><button type="button" class="k-sort">番号<span aria-hidden="true">↑</span></button></th>
      <th scope="col">件名</th> …
      <th scope="col" class="k-col-act"><span class="visually-hidden">操作</span></th>
    </tr></thead>
    <tbody>
      <tr class="k-row is-open">
        <td class="k-id">Q-007<span class="k-open-tag">表示中</span></td> …
        <td class="k-act"><button type="button" class="k-link" aria-expanded="true" aria-controls="detail">閉じる<span aria-hidden="true"> ×</span></button></td>
      </tr>
      <tr class="k-detail-row"><td colspan="6">     <!-- DOM と Tab の順は、選んだ行の直後 -->
        <section class="k-detail" id="detail" aria-labelledby="detail-title">
          <svg class="k-shore" viewBox="0 0 40 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path class="k-shore__sea" d="M40 0H18C8 30 6 64 14 100H40Z"/><path d="M15 0C5 30 3 64 11 100"/><path d="M10 0C1 30 -1 64 6 100"/>
          </svg>
          <div class="k-detail__in">
            <div class="k-detail__head"><h2 id="detail-title" tabindex="-1">照会の詳細</h2><button type="button" class="k-link">詳細を閉じる</button></div>
            <div class="k-detail__body">…</div>
          </div>
        </section>
      </td></tr>
      …
    </tbody>
  </table>
  <!-- 詳細を開いていないときだけ置く。広い幅では右の列の場所を先に見せる -->
  <div class="k-detail-slot"><p class="k-detail-slot__text">一覧の「詳細」を選ぶと、ここに表示します。</p></div>
</div>
```

```css
.k-table { width: 100%; border-collapse: collapse; }
.k-table th { padding: 8px; text-align: left; font-size: 13px; font-weight: 400; color: var(--k-muted); border-top: 1px solid var(--k-line); border-bottom: 1px solid var(--k-line); }
.k-table td { padding: 14px 8px; border-bottom: 1px solid var(--k-row); vertical-align: middle; }
.k-id { font-family: var(--k-mono); font-size: 13.5px; white-space: nowrap; }
:is(.k-col-act, .k-act) { width: 6.5em; white-space: nowrap; } /* 「詳細 ›」⇔「閉じる ×」で列の幅が変わらないように */
/* 選んだ行：陸の面＋左の濃い緑の線＋「表示中」 */
.k-row.is-open td { background: var(--k-land); }
.k-row.is-open td:first-child { box-shadow: inset 4px 0 0 var(--k-green); }
.k-open-tag { display: block; width: fit-content; margin-top: 2px; padding: 0 6px; border: 1px solid var(--k-green); font-family: var(--k-gothic); font-size: 11px; }
/* 詳細：陸から海へ。左端に汀線、上端に濃い緑の線。行の直下に開くときは、選んだ行の陸の面と左の線が詳細の行まで続く */
.k-detail-row td { padding: 0 0 14px; background: var(--k-land); box-shadow: inset 4px 0 0 var(--k-green); }
.k-detail { display: grid; grid-template-columns: 26px minmax(0, 1fr); background: var(--k-land); }
.k-shore { width: 26px; height: 100%; }
.k-shore path { fill: none; stroke: var(--k-shore); stroke-width: 1.2; vector-effect: non-scaling-stroke; }
.k-shore .k-shore__sea { fill: var(--k-sea); stroke: none; }
.k-detail__in { padding: 18px 20px 20px 8px; background: var(--k-sea); border-top: 4px solid var(--k-green); }
.k-detail__head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 8px; }
.k-detail h2 { margin: 0; font-family: var(--k-mincho); font-size: 22px; }
.k-detail-slot { display: none; }

/* 広い幅：右の列を開く前から確保し、詳細の行をその列に見せる（DOM・Tab の順は行の直後のまま） */
@media (min-width: 1000px) {
  .k-work { position: relative; }
  .k-work.has-rows { padding-right: var(--k-detail-width); }
  .k-work :is(.k-detail-row, .k-detail-slot) { position: absolute; top: 0; right: 0; bottom: 0; display: block; width: var(--k-detail-width); }
  .k-detail-row td { display: block; height: 100%; padding: 0 0 0 12px; border: 0; background: none; box-shadow: none; }
  /* 詳細は画面の上に留め、高さを超える分は詳細の中でスクロール（「詳細を閉じる」はいつも見える） */
  .k-detail-row .k-detail { position: sticky; top: 12px; display: flex; max-height: max(260px, calc(100dvh - 120px)); }
  .k-detail-row .k-shore { flex: none; height: auto; }
  .k-detail-row .k-detail__in { display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0; min-height: 0; }
  .k-detail-row .k-detail__body { min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
  .k-detail-slot__text { position: sticky; top: 12px; margin: 0 0 0 12px; padding: 18px 16px; background: var(--k-sea); border-top: 4px solid var(--k-sep); color: var(--k-muted); font-size: 14px; }
}
```

- `top` は表の上端に合わせる（表の上に見出しの行があるなら、その高さ分を下げる）。
- 開いたら詳細の見出しへ、閉じたら開閉ボタンへフォーカスを移す。並べ替え・絞り込みで表を描き直したら、操作したボタンへフォーカスを戻す。
- 右の列が合わない業務では、`@media (min-width: 1000px)` の部分を使わない（行の直下に開くだけになる）。

## 4. 章の陸と水際（汀線の曲線）

```html
<section class="k-chapter" aria-labelledby="ch-1">
  <div class="k-rail">
    <svg class="k-chapter__shore" viewBox="0 0 60 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path class="k-chapter__land" d="M0 0H44C34 30 30 62 36 100H0Z"/><path d="M46 0C36 30 32 62 38 100"/><path d="M50 0C40 30 37 62 43 100"/><path d="M55 0C46 30 43 62 49 100"/>
    </svg>
    <h2 class="k-chapter__title" id="ch-1">照会の内容</h2>
  </div>
  <div class="k-fields">…入力欄…</div>
</section>
```

```css
.k-chapter { display: grid; grid-template-columns: var(--k-rail-width) minmax(0, 1fr); background: var(--k-area); }
.k-chapter + .k-chapter { border-top: 1px solid var(--k-sep); }
.k-rail { position: relative; padding: 26px 60px 22px 26px; }
.k-chapter__title { position: relative; z-index: 1; margin: 0; font-family: var(--k-mincho); font-size: 24px; font-weight: 700; line-height: 1.4; }
.k-chapter__shore { position: absolute; inset: 0; width: 100%; height: 100%; }      /* 章の高さに合わせて伸びる */
.k-chapter__shore path { fill: none; stroke: var(--k-shore); stroke-width: 1.2; vector-effect: non-scaling-stroke; }
.k-chapter__shore .k-chapter__land { fill: var(--k-land); stroke: none; }
.k-fields { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px 26px; padding: 20px 20px 22px 18px; }
.k-field.is-wide { grid-column: 1 / -1; }
.k-label { display: flex; align-items: center; gap: 8px; margin: 0 0 5px; font-size: 16px; font-weight: 700; }
.k-req { padding: 0 5px; background: #e1efe3; border: 1px solid #476863; font-size: 11px; font-weight: 700; }
.k-input { display: block; box-sizing: border-box; width: 100%; min-height: 40px; padding: 6px 10px; background: var(--k-field); color: var(--k-ink);
  border: 1px solid var(--k-control-line); border-radius: 0; font: inherit; font-size: 16px; }
.k-input::placeholder { color: var(--k-placeholder); }
.k-hint { margin: 4px 0 0; font-size: 12.5px; color: var(--k-muted); }
```

章名の右の余白（`padding-right: 60px`）を、曲線の幅より広く取る（章名が曲線に重ならない）。

## 5. 操作・フォーカス・エラー

```css
.k-btn { display: inline-flex; align-items: center; gap: 16px; min-height: 44px; padding: 8px 28px; background: var(--k-green); color: var(--k-on-green); border: 1.5px solid var(--k-green); border-radius: 2px; font: inherit; font-size: 16px; font-weight: 700; cursor: pointer; }
.k-btn--ghost { background: transparent; color: var(--k-green); }
.k-link { padding: 0; background: none; border: 0; color: var(--k-green); font: inherit; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
:focus-visible, [tabindex="-1"]:focus { outline: var(--k-focus-ring); outline-offset: var(--k-focus-offset); box-shadow: var(--k-focus-halo); }
.k-errors { margin-bottom: 14px; padding: 14px 18px; background: var(--k-field); border: 1px solid #e3c4b8; border-left: 5px solid var(--k-error); border-radius: 0 12px 12px 0; }
.k-errors h2 { margin: 0; font-family: var(--k-mincho); font-size: 19px; color: var(--k-error); }
.k-error { margin: 4px 0 0; color: var(--k-error); font-size: 14px; font-weight: 700; } /* 「エラー：理由と直し方」 */
.k-field.is-invalid .k-input { border: 2px solid var(--k-error); }
.k-chapter__err { position: relative; z-index: 1; margin: 6px 0 0; color: var(--k-error); font-size: 14px; font-weight: 700; } /* 章名の下に「この章に n 件」 */
```

エラーの一覧は `tabindex="-1"` で、送信時にフォーカスを移す。中身は件数と、項目名のボタン（押すとその欄へ）＋理由。欄には `aria-invalid="true"` とエラー文への `aria-describedby`。

## 6. 推移の曲線（実測の点と、目安の単調な曲線）

既に推移の集計がある画面だけで使う。

```js
// 点の位置：横は各期間の列の中央、縦は件数に比例（最多を 78%、0件は 0 = 基準線）
const points = (counts, max) => counts.map((n, i) => ({ x: ((i + 0.5) / counts.length) * 100, y: max ? (n / max) * 78 : 0, n }));
// 単調3次補間（Fritsch–Carlson）。隣の2点の範囲を超える山・谷を作らない。SVG は上が 0
function curve(pts) {
  const p = pts.map((q) => [q.x, 100 - q.y]);
  if (p.length === 1) return `M0 ${p[0][1]}H100`;
  const n = p.length;
  const s = p.slice(0, -1).map((a, i) => (p[i + 1][1] - a[1]) / (p[i + 1][0] - a[0]));
  const t = p.map((_, i) => {
    if (i === 0) return s[0];
    if (i === n - 1) return s[n - 2];
    const [a, b] = [s[i - 1], s[i]];
    return a * b <= 0 ? 0 : (Math.sign(a) + Math.sign(b)) * Math.min(Math.abs(a), Math.abs(b), Math.abs(a + b) / 4);
  });
  let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < n - 1; i += 1) {
    const h = (p[i + 1][0] - p[i][0]) / 3;
    d += `C${p[i][0] + h} ${p[i][1] + t[i] * h} ${p[i + 1][0] - h} ${p[i + 1][1] - t[i + 1] * h} ${p[i + 1][0]} ${p[i + 1][1]}`;
  }
  return d;
}
```

```html
<div class="k-chart">
  <svg class="k-chart__shore" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <path class="k-chart__area" d="（curve の d）L（最後の x） 100L（最初の x） 100Z"/>
    <path class="k-chart__line" d="（curve の d）"/>
  </svg>
  <ol class="k-chart__points" aria-label="週別の受付件数">
    <li style="left:8.33%;--y:52%"><span class="k-chart__stem" aria-hidden="true"></span><span class="k-chart__dot" aria-hidden="true"></span>
      <b aria-hidden="true">2</b><span class="k-chart__label">10/19の週</span><span class="visually-hidden">2件</span></li> …
  </ol>
</div>
<p class="k-chart__note">点が各週の件数です。線と面は推移の目安で、週の途中の値を示すものではありません。</p>
```

```css
.k-chart { position: relative; height: 170px; }
.k-chart__shore { position: absolute; left: 0; right: 0; top: 0; width: 100%; height: 140px; }   /* 点と同じ高さ・同じ基準線 */
.k-chart__area { fill: var(--k-chart-area); }
.k-chart__line { fill: none; stroke: var(--k-chart-line); stroke-width: 1.5; stroke-dasharray: 5 4; vector-effect: non-scaling-stroke; }
.k-chart__points { position: absolute; inset: 0; margin: 0; padding: 0; list-style: none; }
.k-chart__points li { position: absolute; bottom: 30px; height: 140px; width: 0; }
.k-chart__stem { position: absolute; left: -0.5px; bottom: 0; width: 1px; height: var(--y); background: var(--k-chart-stem); }
.k-chart__dot { position: absolute; left: -5px; bottom: calc(var(--y) - 5px); width: 10px; height: 10px; border-radius: 50%; background: var(--k-green); box-shadow: 0 0 0 2px var(--k-ground); }
.k-chart__points b { position: absolute; left: 50%; bottom: calc(var(--y) + 8px); transform: translateX(-50%); font-family: var(--k-mincho); font-size: 18px; line-height: 1; }
.k-chart__label { position: absolute; left: 50%; top: 100%; transform: translateX(-50%); margin-top: 6px; font-size: 13px; white-space: nowrap; }
.k-chart::after { content: ''; position: absolute; left: 0; right: 0; bottom: 30px; border-bottom: 1px solid var(--k-line); } /* 基準線（0件） */
```

`clipPath` などの ID を使う場合は、同じページに2つ以上の図があっても衝突しない ID にする。

## 7. 狭い幅

```css
@media (max-width: 1099px) { :root { --k-pad: 28px; } }
@media (max-width: 759px) {
  :root { --k-pad: 16px; }
  .k-hero { position: relative; min-height: 0; }
  .k-hero__text { position: relative; z-index: 1; padding-top: 46px; }
  .k-hero__art { position: absolute; top: 0; left: 0; right: 0; height: 34px; min-width: 0; background-position: right top; background-size: auto 154px; } /* 表題の上の細い帯だけ */
  .k-title { font-size: 36px; }
  /* 表は行ごとに縦へ積み、並べ替えは列見出しの札の1組だけ */
  .k-table, .k-table tbody, .k-table thead, .k-table td { display: block; }
  .k-table thead tr { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; padding: 8px 4px; border-top: 1px solid var(--k-line); border-bottom: 1px solid var(--k-line); }
  .k-table thead tr::before { content: '並べ替え'; font-size: 13px; color: var(--k-muted); }
  .k-table th { padding: 0; border: 0; }
  .k-table th:not([aria-sort]) { display: none; } /* 並べ替えできない列の見出しは札にしない */
  .k-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 10px; padding: 12px 8px; border-bottom: 1px solid var(--k-row); }
  .k-table td { padding: 0; border: 0; }
  .k-act { grid-column: 2; grid-row: 1; }
  .k-row.is-open { background: var(--k-land); box-shadow: inset 4px 0 0 var(--k-green); border-bottom: 0; }
  .k-row.is-open td, .k-row.is-open td:first-child { background: none; box-shadow: none; }
  .k-detail-row { display: block; }
  .k-detail { grid-template-columns: 1fr; }
  .k-shore { display: none; }
  .k-detail__in { padding: 14px 16px; border-radius: 0 0 0 28px; }   /* 曲線の代わりに角の丸み */
  /* 章：章名を上、入力欄を下。曲線は下の角の丸みに置き換える */
  .k-chapter { grid-template-columns: 1fr; }
  .k-rail { padding: 14px 16px 18px; background: var(--k-land); border-radius: 0 0 50% 0 / 0 0 18px 0; }
  .k-chapter__shore { display: none; }
  .k-fields { grid-template-columns: 1fr; padding: 14px 16px 18px; }
  .k-btn { width: 100%; justify-content: space-between; }
}
```

並べ替えできない列の `th` には `aria-sort` を付けない（上の `th:not([aria-sort])` で隠すため）。

## 8. 強制カラー

面の色・SVG の曲線・`box-shadow` は消える。選択と現在地を枠と文字で残す。画面全体に `forced-color-adjust: none` を掛けない。

```css
@media (forced-colors: active) {
  .k-row.is-open td { border-top: 2px solid Highlight; border-bottom: 2px solid Highlight; }
  .k-row.is-open td:first-child, .k-detail-row td { border-left: 6px solid Highlight; }
  .k-detail__in { border: 2px solid CanvasText; }
  .k-chip input:checked + span { border: 2px solid Highlight; }
  .k-chart__dot { forced-color-adjust: none; background: CanvasText; box-shadow: none; } /* 実測の点は残す（装飾の面は消えてよい） */
}
```

## 9. 画面の種類ごとの当てはめ方

| 画面 | 使う部品 | 入れなくてよい部品 |
| --- | --- | --- |
| 申請の一覧（原本） | 表題の装飾、絞り込みの札、表、右の列の詳細、章の陸と水際、月別の推移 | — |
| 照会・問い合わせの進捗 | 絞り込みの札、表、右の列（広い幅）・行の直下（狭い幅）の詳細、受付の章、週別の推移（集計がある場合） | 指標の帯 |
| 設備の点検記録 | 表、行の直下の詳細、点検結果の章 | 右の列（列が多い場合）、推移 |
| 設定・ログイン | 1つの章（陸と水際） | 表・詳細・推移 |
