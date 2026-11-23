# 折本：画面の型（最小の例）

[../assets/tokens.css](../assets/tokens.css) を読み込んだ前提の、最小の HTML / CSS の例。クラス名（`hp-` 接頭辞）や要素は**例**であり、対象アプリの命名・部品・フレームワークに合わせて書き直す。動作（JS）は対象アプリの仕組みを使う。

## 目次

1. 地・帯・表題
2. 右から左の面と、続く詳細
3. 見開きのフォーム
4. 確認の帯・操作・選択・フォーカス・エラー
5. 指標と区画（既に集計がある画面だけ）
6. 中間の幅・狭い幅
7. 画面の種類ごとの当てはめ方

## 1. 地・帯・表題

```html
<header class="hp-top">
  <svg class="hp-top__mark" width="26" height="22" viewBox="0 0 26 22" aria-hidden="true" focusable="false"><path d="M1 2l12 3v16L1 18zM25 2l-12 3v16l12-3z" fill="currentColor"/></svg>
  <span class="hp-top__org">組織名</span><span>システム名</span>
</header>
<main class="hp-main"><h1 class="hp-title">画面名</h1> … </main>
```

```css
body { margin: 0; background: var(--hp-ground); color: var(--hp-ink); font: var(--hp-body)/var(--hp-line-height) var(--hp-gothic); overflow-wrap: anywhere; }
.hp-top { display: flex; flex-wrap: wrap; align-items: center; gap: 0 12px; min-height: 54px; padding: 0 var(--hp-pad); border-bottom: 1px solid var(--hp-line); }
.hp-top__mark { color: var(--hp-grape); }
.hp-top__org { font-family: var(--hp-mincho); font-size: 20px; font-weight: 700; color: var(--hp-deep); }
.hp-main { max-width: 1280px; margin: 0 auto; padding: 18px var(--hp-pad) 48px; }
.hp-title { margin: 0 0 16px; font-family: var(--hp-mincho); font-size: 56px; font-weight: 700; line-height: 1.12; letter-spacing: .04em; color: var(--hp-deep); }
```

本の形の印（上の SVG）は自作の単純な図形。省いてよい。

## 2. 右から左の面と、続く詳細

```html
<p class="hp-dir" aria-hidden="true">右から左へ読みます ←</p>
<ol class="hp-faces" aria-label="今日の予約（右から時刻の順）">
  <li class="hp-face">                      <!-- DOM の先頭が右端 -->
    <p class="hp-face__id">09:00–11:00<small>和室</small></p>
    <div class="hp-face__tate">
      <p class="hp-name"><small>特定非営利活動法人</small>まちの本棚</p>
      <p class="hp-sub">読み聞かせ講座</p>
    </div>
    <p class="hp-face__st"><span aria-hidden="true">● </span>確定</p>
    <button type="button" class="hp-face__btn" aria-expanded="false" aria-controls="detail">詳細を開く<span aria-hidden="true">＋</span></button>
  </li>
  …
</ol>
<section id="detail" class="hp-detail" aria-labelledby="detail-title" hidden>
  <h2 id="detail-title" class="hp-detail__title" tabindex="-1">予約詳細</h2>
  <dl>…</dl>
  <button type="button" class="hp-link">詳細を閉じる</button>
</section>
```

```css
.hp-faces { display: flex; flex-direction: row-reverse; margin: 0; padding: 0; list-style: none; }
.hp-face { display: grid; grid-template-rows: auto 1fr auto auto; flex: 1 1 0; min-width: 0; padding: calc(var(--hp-tilt) + 14px) 12px 12px;
  background: var(--hp-page-l); border-left: 1px solid var(--hp-fold); clip-path: polygon(0 0, 100% var(--hp-tilt), 100% 100%, 0 100%); }
.hp-face:nth-child(even) { background: var(--hp-page-r); clip-path: polygon(0 var(--hp-tilt), 100% 0, 100% 100%, 0 100%); }
.hp-face__id { margin: 0; padding-bottom: 8px; border-bottom: 1px solid var(--hp-line); font-family: var(--hp-mono); font-weight: 700; }
.hp-face__id small { display: block; font-family: var(--hp-gothic); font-weight: 400; color: var(--hp-muted); }
.hp-face__tate { display: flex; flex-direction: row-reverse; justify-content: center; gap: 6px; min-height: 240px; padding: 14px 0; }
.hp-name { margin: 0; writing-mode: vertical-rl; font-family: var(--hp-mincho); font-size: 28px; font-weight: 700; line-height: 1.1; letter-spacing: .06em; color: var(--hp-deep); }
.hp-name small { display: block; margin-bottom: 6px; font-size: 14px; letter-spacing: .02em; } /* 法人格は小さく別の行 */
.hp-sub { margin: 0; writing-mode: vertical-rl; font-size: 13px; line-height: 1.3; }
.hp-face__btn { display: flex; justify-content: space-between; width: 100%; min-height: 36px; padding: 6px 0 0; border: 0; border-top: 1px solid var(--hp-line);
  background: none; color: inherit; font: inherit; font-weight: 700; text-align: left; cursor: pointer; }
/* 選んだ面：葡萄色に反転し、詳細の帯へ続く */
.hp-face.is-open { background: var(--hp-grape); color: var(--hp-light); }
.hp-face.is-open :is(.hp-name, .hp-sub) { color: var(--hp-light); }
.hp-face.is-open :is(small, .hp-face__st, .hp-face__btn) { color: var(--hp-light-sub); }
.hp-face.is-open :focus-visible { outline-color: var(--hp-light); }
.hp-detail { display: grid; grid-template-columns: 58px minmax(0, 1fr); gap: 0 28px; padding: 22px 28px; background: var(--hp-grape); color: var(--hp-light); }
.hp-detail__title { margin: 0; writing-mode: vertical-rl; font-family: var(--hp-mincho); font-size: 20px; letter-spacing: .1em; border-right: 1px solid var(--hp-light-rule); }
.hp-detail dt { font-size: 12px; color: var(--hp-light-sub); }
.hp-detail :focus-visible, .hp-detail__title:focus { outline-color: var(--hp-light); }
```

- 名前が長い面は文字を小さくする（例：12字を超えたら 24px）。それでも収まらない業務では、縦組みをやめる判断をする（[design-principles.md](design-principles.md) の「変えてよい点」）。
- 詳細を開いたら、詳細の見出し（`tabindex="-1"`）へフォーカスを移してよい。閉じたら開いた面のボタンへ戻す。
- 狭い幅では面が縦に積まれるので、列の直後の詳細は選んだ帯から離れる（帯が多いほど遠い）。離したくない場合は、狭い幅のときだけ詳細を選んだ帯の中（開閉ボタンの直後）に置く。置き場所は `matchMedia` などで切り替え、DOM を描き直す前に詳細を列の外へ戻し、移動の前後でフォーカスを保つ（`order` で見た目だけ動かさない）。
- 中間の幅で面が2段に折り返すと、詳細は2段目の下に開き、上の段の選んだ面とのつながりは弱まる。1日分・1見開き分など、件数を1段に収まる数に抑えられる業務に向く。
- 送りを作る場合：`<button>← 次の8件</button>` を左、`<button>前の8件 →</button>` を右に置き、間に「1〜8件目」を文字で示す。

## 3. 見開きのフォーム

```html
<form class="hp-form" novalidate>
  <div class="hp-book">
    <section class="hp-page hp-page--right" aria-labelledby="ch-use">   <!-- 先に読む頁を DOM の先に -->
      <div class="hp-page__body">
        <div class="hp-field">
          <label class="hp-label" for="room">部屋<span class="hp-req">必須</span></label>
          <select id="room" class="hp-input" aria-describedby="room-hint">…</select>
          <p class="hp-hint" id="room-hint">定員を超える人数では予約できません。</p>
        </div>
      </div>
      <h2 class="hp-page__title" id="ch-use">利用の内容</h2>
    </section>
    <section class="hp-page hp-page--left" aria-labelledby="ch-who">…<h2 class="hp-page__title" id="ch-who">申込者</h2></section>
  </div>
  …
</form>
```

```css
.hp-book { display: grid; grid-template-columns: 1fr 1fr; grid-template-areas: 'left right';
  clip-path: polygon(0 var(--hp-book-tilt), 50% 0, 100% var(--hp-book-tilt), 100% 100%, 0 100%); }
.hp-page { display: grid; grid-template-columns: minmax(0, 1fr) var(--hp-page-title); gap: 0 18px; padding: calc(var(--hp-book-tilt) + 24px) 0 22px 26px; }
.hp-page--right { grid-area: right; background: var(--hp-page-r); }
.hp-page--left { grid-area: left; background: var(--hp-page-l); }
.hp-page__title { margin: 0; writing-mode: vertical-rl; justify-self: center; padding-left: 18px; border-left: 1px solid var(--hp-rule);
  font-family: var(--hp-mincho); font-size: 30px; font-weight: 700; line-height: 1.1; letter-spacing: .08em; color: var(--hp-deep); }
.hp-page__body { display: grid; gap: 18px; align-content: start; min-width: 0; }
.hp-label { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; font-family: var(--hp-mincho); font-size: 17px; font-weight: 700; }
.hp-req { padding: 0 5px; border: 1px solid var(--hp-grape); color: var(--hp-grape); font-family: var(--hp-gothic); font-size: 11px; font-weight: 700; }
.hp-req.is-opt { border-color: var(--hp-muted); color: var(--hp-muted); font-weight: 400; }
.hp-input { display: block; box-sizing: border-box; width: 100%; min-height: 40px; padding: 6px 10px; background: var(--hp-field); color: var(--hp-ink);
  border: 1px solid var(--hp-control-line); border-radius: 0; font: inherit; font-size: 16px; }
.hp-hint { margin: 4px 0 0; font-size: 12.5px; color: var(--hp-muted); }
```

- 見開きの中身（入力欄・ヒント・エラー文）は横書き。縦組みは頁の右端の章名だけ。
- 「どちらを右頁にするか」は、利用者が先に決める・先に話すほう（窓口なら用件、申請なら申請者など）。業務の流れで決め、理由を設計メモに残す。

## 4. 確認の帯・操作・選択・フォーカス・エラー

```html
<section class="hp-band" aria-labelledby="ch-agree">
  <h2 class="hp-band__title" id="ch-agree">確認事項</h2>
  <div><div class="hp-check"><input type="checkbox" id="agree" class="hp-checkbox"><label for="agree">利用の決まりを確認しました。</label></div></div>
</section>
<div class="hp-actions"><button type="button" class="hp-link">入力を消す</button><button type="submit" class="hp-btn">登録する<span aria-hidden="true">→</span></button></div>
```

```css
.hp-band { display: grid; grid-template-columns: 136px minmax(0, 1fr); align-items: center; gap: 0 24px; margin-top: 20px; padding: 18px 24px; background: var(--hp-grape); color: var(--hp-light); }
.hp-band__title { margin: 0; padding-right: 24px; border-right: 1px solid var(--hp-light-rule); font-family: var(--hp-mincho); font-size: 22px; letter-spacing: .1em; }
.hp-band :focus-visible { outline-color: var(--hp-light); }
.hp-check { display: flex; align-items: flex-start; gap: 10px; }
.hp-checkbox { flex: none; width: 20px; height: 20px; margin: 2px 0 0; accent-color: var(--hp-light-sub); }

.hp-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; }
.hp-btn { display: inline-flex; align-items: center; gap: 18px; min-height: 44px; padding: 8px 26px; background: var(--hp-grape); color: #fff;
  border: 1.5px solid var(--hp-grape); font: inherit; font-size: 16px; font-weight: 700; cursor: pointer; }
.hp-btn--ghost { background: transparent; color: var(--hp-grape); }
.hp-link { padding: 0; background: none; border: 0; color: var(--hp-grape); font: inherit; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }

/* 選択：葡萄色の塗り＋白い文字＋太字（＋✓）。フォーカス：外枠＋淡い外光（形が違う） */
.hp-choice input:checked + span { background: var(--hp-grape); color: #fff; font-weight: 700; }
.hp-choice input:checked + span::before { content: '✓ '; }
:focus-visible, [tabindex="-1"]:focus { outline: var(--hp-focus-ring); outline-offset: var(--hp-focus-offset); box-shadow: var(--hp-focus-halo); }
.hp-choice input:focus-visible + span { outline: var(--hp-focus-ring); outline-offset: 2px; } /* 見えない input の代わりに見た目の側へ */

/* エラー */
.hp-errors { margin-bottom: 18px; padding: 14px 18px; background: #fff; border-left: 5px solid var(--hp-error); box-shadow: 0 0 0 1px #e1c8c6; }
.hp-errors h2 { margin: 0; font-family: var(--hp-mincho); font-size: 19px; color: var(--hp-error); }
.hp-error { margin: 0 0 6px; color: var(--hp-error); font-size: 14px; font-weight: 700; } /* 「！エラー：理由と直し方」 */
.hp-field.is-invalid { padding-left: 12px; border-left: 4px solid var(--hp-error); }
.hp-field.is-invalid .hp-input { border: 2px solid var(--hp-error); }
.hp-band.is-invalid { box-shadow: inset 6px 0 0 #ffb3ad; }
.hp-band .hp-error { color: var(--hp-error-on-grape); }
```

エラーの一覧は `tabindex="-1"` で、送信時にフォーカスを移す。中身は「入力エラーが n 件あります」と、項目名のボタン（押すとその欄へフォーカス）＋理由。欄には `aria-invalid="true"` とエラー文への `aria-describedby`。

## 5. 指標と区画（既に集計がある画面だけ）

```html
<p class="hp-dir" aria-hidden="true">指標は右から左へ ←</p>
<dl class="hp-kpis">
  <div class="hp-kpi hp-kpi--lead"><dt class="hp-kpi__title">受付件数</dt><dd class="hp-kpi__value"><b>71</b>件</dd><dd class="hp-kpi__note">対象期間の受付</dd></div>
  <div class="hp-kpi">…</div>
</dl>
<section class="hp-sec" aria-labelledby="sec-month">
  <div>…（表・グラフ）</div>
  <h2 class="hp-sec__title" id="sec-month">月別の件数</h2>
</section>
```

```css
.hp-kpis { display: flex; flex-direction: row-reverse; margin: 0; }
.hp-kpi { flex: 1 1 0; min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0 12px; padding: calc(var(--hp-tilt) + 22px) 16px 14px 18px;
  background: var(--hp-page-l); border-left: 1px solid var(--hp-fold); clip-path: polygon(0 var(--hp-tilt), 100% 0, 100% 100%, 0 100%); }
.hp-kpi:nth-child(even) { background: var(--hp-page-r); clip-path: polygon(0 0, 100% var(--hp-tilt), 100% 100%, 0 100%); }
.hp-kpi--lead { background: var(--hp-grape); color: var(--hp-light); }
.hp-kpi__title { grid-column: 2; grid-row: 1 / span 2; writing-mode: vertical-rl; font-family: var(--hp-mincho); font-size: 20px; font-weight: 700; }
.hp-kpi__value { margin: 0; font-family: var(--hp-mincho); white-space: nowrap; } /* 73.2% などを折り返さない */
.hp-kpi__value b { font-size: 54px; font-weight: 500; font-variant-numeric: tabular-nums; }
.hp-sec { display: grid; grid-template-columns: minmax(0, 1fr) 40px; gap: 0 10px; padding-top: 10px; border-top: var(--hp-section-rule); }
.hp-sec__title { margin: 0; writing-mode: vertical-rl; font-family: var(--hp-mincho); font-size: 20px; font-weight: 700; color: var(--hp-deep); }
```

- 月別などの時系列は左から右のまま（「月の順 →」と書く）。指標の向き（右から左）と違うことを文字で示す。
- 細い棒は、隣の割合と同じ尺度で：`<span class="bar" aria-hidden="true"><i style="width: 12.5%"></i></span>`（地 `--hp-bar-track`、棒 `--hp-bar-fill`）。件数と割合は文字で置く。
- 0件の値は一覧へのリンクにしない。

## 6. 中間の幅・狭い幅

```css
@media (max-width: 1099px) {
  :root { --hp-pad: 28px; }
  .hp-faces { flex-wrap: wrap; }          /* 上の段の右端が先頭のまま */
  .hp-face { flex: 0 0 25%; }
}
@media (max-width: 759px) {
  :root { --hp-pad: 16px; --hp-tilt: 8px; --hp-book-tilt: 8px; --hp-page-title: 40px; }
  .hp-title { font-size: 36px; }
  /* 面：横組みの帯を上から積む（先頭が上） */
  .hp-faces { flex-direction: column; flex-wrap: nowrap; }
  .hp-face { flex: none; grid-template-rows: none; border-left: 0; border-top: 1px solid var(--hp-fold); }
  .hp-face__tate { flex-direction: column; align-items: flex-start; min-height: 0; padding: 2px 0; gap: 0; }
  .hp-name, .hp-sub { writing-mode: horizontal-tb; }
  .hp-name { font-size: 22px; }
  .hp-name small { display: inline; margin: 0 4px 0 0; }
  .hp-dir { display: none; }
  /* 詳細の章名も横組みに */
  .hp-detail { grid-template-columns: 1fr; gap: 12px; padding: 16px; }
  .hp-detail__title { writing-mode: horizontal-tb; border-right: 0; border-bottom: 1px solid var(--hp-light-rule); padding-bottom: 6px; }
  /* 見開き：右頁を上、左頁を下（DOM の順のまま） */
  .hp-book { grid-template-columns: 1fr; grid-template-areas: 'right' 'left'; }
  .hp-page { gap: 0 10px; padding-left: 16px; }
  .hp-page__title { padding-left: 10px; font-size: 22px; }
  .hp-band { grid-template-columns: 1fr; gap: 8px; padding: 16px; }
  .hp-band__title { padding: 0 0 6px; border-right: 0; border-bottom: 1px solid var(--hp-light-rule); }
  .hp-actions .hp-btn { width: 100%; justify-content: space-between; }
  .hp-kpis { flex-direction: column; }
}
```

## 7. 画面の種類ごとの当てはめ方

| 画面 | 右から左に読むもの | 見開き（右頁 → 左頁） | 入れなくてよい部品 |
| --- | --- | --- | --- |
| 申請の一覧（原本） | 申請を受付日の新しい順に8面 | 申請者情報 → 手続きの内容 | — |
| 施設の予約（1日分） | その日の予約を時刻の順に | 利用の内容 → 申込者 | 指標の面、ページ送り（1日の件数が少ない） |
| 当番・担当の割り当て | 担当者の面を当番の順に | — | 見開き、指標 |
| 窓口の受付票 | — | 用件 → 来庁者 | 面、指標 |
| 設定・ログイン | — | 1頁、または頁なし | 面、見開き、指標 |
| 件数の多い台帳 | —（表を横組みで） | — | 縦組みの面、送り |
