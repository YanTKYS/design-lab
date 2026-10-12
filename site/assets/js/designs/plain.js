// 装飾を抑えた素の HTML。ブラウザ標準のフォーム部品と表を最小限の CSS で整えるだけにする。
// 他のデザインと比べたときの「基準線」として使う。

import { html } from '../html.js';
import { countText, formatDate } from '../query.js';

function notice(model) {
  if (!model.notice) return '';
  return html`
    <p class="plain-notice">
      <strong>${model.notice.title}：</strong>${model.notice.text}
      <button type="button" data-action="dismiss-notice">閉じる</button>
    </p>`;
}

function detail(model, ctx) {
  const d = model.detail;
  if (!d) return '';
  return html`
    <section class="plain-detail" aria-labelledby="${ctx.uid}-plain-detail">
      <h3 id="${ctx.uid}-plain-detail" tabindex="-1" data-focus="detail">申請詳細（${d.id}）</h3>
      <dl>
        <dt>申請者</dt><dd>${d.applicant}</dd>
        <dt>申請種別</dt><dd>${d.type}</dd>
        <dt>担当課</dt><dd>${d.department}</dd>
        <dt>受付日</dt><dd>${formatDate(d.receivedAt)}</dd>
        <dt>受付方法</dt><dd>${d.channel}</dd>
        <dt>処理期限</dt><dd>${formatDate(d.dueAt)}</dd>
        <dt>処理状態</dt><dd>${d.status.label}</dd>
        <dt>備考</dt><dd>${d.note || 'なし'}</dd>
      </dl>
      <p><button type="button" data-action="close-detail">詳細を閉じる</button></p>
    </section>`;
}

function table(model) {
  if (model.rows.length === 0) return html`<p>該当する申請はありません。</p>`;
  const mark = (c) => (c.sorted === 'asc' ? '▲' : c.sorted === 'desc' ? '▼' : '');
  return html`
    <div class="plain-table-wrap">
      <table>
        <thead>
          <tr>
            ${model.columns.map(
              (c) => html`<th scope="col" aria-sort="${c.ariaSort}">
                <button type="button" data-action="sort" data-key="${c.key}">${c.label}</button>
                <span aria-hidden="true">${mark(c)}</span>
              </th>`,
            )}
            <th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          ${model.rows.map(
            (row) => html`
              <tr>
                <td>${row.id}</td>
                <td>${row.applicant}</td>
                <td>${row.type}</td>
                <td>${formatDate(row.receivedAt, 'slash')}</td>
                <td>${row.status.label}</td>
                <td>
                  <button type="button" data-action="open-detail" data-id="${row.id}">
                    詳細<span class="visually-hidden">（${row.id}）</span>
                  </button>
                </td>
              </tr>`,
          )}
        </tbody>
      </table>
    </div>`;
}

export default {
  id: 'plain',
  name: 'Plain（素の HTML）',
  shortName: 'Plain',
  url: 'https://html.spec.whatwg.org/multipage/',
  summary: 'ブラウザ標準の表示に最小限の CSS を加えただけの基準線。装飾がなくても伝わる情報構造と、各デザインシステムが加えている価値を見比べるために使う。',
  traits: {
    density: 'ブラウザ既定の文字サイズと余白。表のセル余白も最小限で、情報量は多いが視線の誘導は弱い。',
    navigation: '見出しの下にリンクを並べただけのナビゲーション。現在地は aria-current と太字のみで示す。',
    table: '罫線だけの素の表。並べ替えは見出し内の標準ボタンと▲▼記号、状態は文字だけで表す。',
    input: 'ラベルで囲んだ標準のテキスト欄とセレクト。補足説明やアイコンはない。',
    actions: 'OS／ブラウザ標準のボタン。主要・副次の区別は配置だけで、見た目の差はない。',
    hierarchy: '見出し → 操作 → 検索 → 件数 → 表の文書順そのまま。詳細は表の上に差し込む。',
  },
  render(model, ctx) {
    const kwId = `${ctx.uid}-plain-kw`;
    const stId = `${ctx.uid}-plain-st`;
    return html`
      <div class="ds-plain">
        <header>
          <p class="plain-system"><a href="${ctx.href({ detail: null })}" data-action="nav" data-target="applications">${model.system.org} ${model.system.name}</a></p>
          <nav aria-label="メニュー">
            <ul>
              ${model.nav.map(
                (item) => html`<li>
                  <a href="${item.current ? ctx.href({ detail: null }) : '#'}" data-action="nav" data-target="${item.id}" ${item.current ? 'aria-current="page"' : ''}
                    >${item.label}</a
                  >
                </li>`,
              )}
            </ul>
          </nav>
        </header>
        <hr />
        ${notice(model)}
        <h2 tabindex="-1" data-focus="heading">申請一覧</h2>
        <p><button type="button" data-action="new">新規申請</button></p>
        <form role="search" aria-label="申請の検索">
          <p>
            <label for="${kwId}">キーワード</label>
            <input id="${kwId}" type="search" data-bind="keyword" value="${model.keyword}" autocomplete="off" />
            <button type="submit">検索</button>
          </p>
          <p>
            <label for="${stId}">処理状態</label>
            <select id="${stId}" data-bind="status">
              ${model.statusOptions.map((o) => html`<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}（${o.count}）</option>`)}
            </select>
            <button type="button" data-action="clear">条件をクリア</button>
          </p>
        </form>
        <p>${countText(model)}</p>
        ${detail(model, ctx)} ${table(model)}
        <hr />
        <footer><small>© ${model.system.org}（架空の自治体）</small></footer>
      </div>`;
  },
};
