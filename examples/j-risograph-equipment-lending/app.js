// 備品の貸出台帳：j-risograph-ui Skill の適用見本の動作。
// 外部通信・保存はせず、備品と貸出はこのページのメモリ上だけで扱う。file:// でも動くよう、モジュールにしない。
(function () {
  'use strict';

  var TODAY = '2026-11-24';
  var MAX_DAYS = 14;
  var STATES = {
    available: { label: '貸出可', mark: '○' },
    lent: { label: '貸出中', mark: '●' },
    overdue: { label: '返却期限切れ', mark: '△' },
    maintenance: { label: '点検中', mark: '◐' }
  };
  var STATE_ORDER = ['available', 'lent', 'overdue', 'maintenance'];
  var DEPTS = ['市民課', '子育て支援課', '都市計画課', '広報課', '福祉課', '総務課', '防災課'];
  var COLUMNS = [
    { key: 'id', label: '管理番号', sortable: true },
    { key: 'name', label: '備品名', sortable: true },
    { key: 'kind', label: '区分' },
    { key: 'place', label: '保管場所' },
    { key: 'state', label: '状態' },
    { key: 'due', label: '返却予定', sortable: true }
  ];

  var items = [
    { id: 'B-001', name: 'プロジェクター（小型）', kind: '映像機器', place: '倉庫A', state: 'lent', loan: { dept: '市民課', person: '加藤 翔', ext: '2101', lent: '2026-11-20', due: '2026-11-27', purpose: '転入者向け説明会' } },
    { id: 'B-002', name: 'プロジェクター（会議室用）', kind: '映像機器', place: '倉庫A', state: 'available' },
    { id: 'B-003', name: 'ノートパソコン（研修用 1）', kind: '情報機器', place: '総務課の棚', state: 'lent', loan: { dept: '都市計画課', person: '小川 陽子', ext: '3302', lent: '2026-11-10', due: '2026-11-21', purpose: '住民説明会の資料投影' } },
    { id: 'B-004', name: 'ノートパソコン（研修用 2）', kind: '情報機器', place: '総務課の棚', state: 'available' },
    { id: 'B-005', name: '拡声器', kind: '音響機器', place: '倉庫B', state: 'available' },
    { id: 'B-006', name: 'ワイヤレスマイク一式（受信機・マイク2本）', kind: '音響機器', place: '倉庫B', state: 'maintenance', note: '電池ぶたの破損。修理の見積もりを依頼中。' },
    { id: 'B-007', name: '折りたたみテーブル（6台）', kind: '会場用品', place: '倉庫C', state: 'lent', loan: { dept: '子育て支援課', person: '上田 美穂', ext: '2410', lent: '2026-11-22', due: '2026-12-01', purpose: '子育て講座の受付' } },
    { id: 'B-008', name: 'イベント用テント（3m×3m）', kind: '会場用品', place: '倉庫C', state: 'available' },
    { id: 'B-009', name: 'デジタルカメラ', kind: '映像機器', place: '総務課の棚', state: 'lent', loan: { dept: '広報課', person: '石井 健太', ext: '2205', lent: '2026-11-18', due: '2026-11-23', purpose: '広報紙の取材' } },
    { id: 'B-010', name: 'ポータブル電源', kind: '防災用品', place: '倉庫B', state: 'available' },
    { id: 'B-011', name: '書画カメラ', kind: '映像機器', place: '倉庫A', state: 'maintenance', note: 'レンズの清掃と動作の点検。11月26日に終わる予定。' },
    { id: 'B-012', name: '台車（大）', kind: '会場用品', place: '倉庫C', state: 'available' }
  ];

  var view = { q: '', state: '', sort: { key: 'id', dir: 'asc' } };
  var openId = null;
  var composing = false;

  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') node.textContent = v;
      else if (k === 'class') node.className = v;
      else node.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return node;
  };
  var announce = function (text) {
    var s = $('status');
    s.textContent = '';
    window.setTimeout(function () { s.textContent = text; }, 30);
  };
  var WEEK = ['日', '月', '火', '水', '木', '金', '土'];
  var parse = function (iso) { var p = iso.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  var dayText = function (iso) { var d = parse(iso); return (d.getMonth() + 1) + '月' + d.getDate() + '日（' + WEEK[d.getDay()] + '）'; };
  var slash = function (iso) { return iso ? iso.replace(/-/g, '/') : '—'; };
  var daysBetween = function (a, b) { return Math.round((parse(b) - parse(a)) / 86400000); };

  /** 状態は保存した値と基準日から決める（貸出中で返却予定日を過ぎたものは「返却期限切れ」）。 */
  var stateOf = function (it) { return it.state === 'lent' && it.loan.due < TODAY ? 'overdue' : it.state; };
  var itemOf = function (id) { return items.filter(function (it) { return it.id === id; })[0]; };
  var toHalf = function (s) { return s.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xfee0); }); };

  function matches(it, q) {
    if (!q) return true;
    var hay = [it.id, it.name, it.kind, it.place, it.loan ? it.loan.dept : ''].join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).filter(Boolean).every(function (w) { return hay.indexOf(w) >= 0; });
  }

  function visibleItems() {
    var list = items.filter(function (it) { return matches(it, view.q) && (!view.state || stateOf(it) === view.state); });
    var key = view.sort.key;
    var dir = view.sort.dir === 'asc' ? 1 : -1;
    return list.sort(function (a, b) {
      if (key === 'due') {
        // 返却予定のないもの（貸出していない）は、向きによらず最後
        var da = a.loan ? a.loan.due : null;
        var db = b.loan ? b.loan.due : null;
        if (!da || !db) return (da ? -1 : db ? 1 : 0) || a.id.localeCompare(b.id);
        return (da < db ? -1 : da > db ? 1 : 0) * dir || a.id.localeCompare(b.id);
      }
      return a[key].localeCompare(b[key], 'ja') * dir;
    });
  }

  /* ---------- 状態の札（最初に1回だけ作る） ---------- */

  var CHIP_ITEMS = [{ id: '', label: 'すべて' }].concat(STATE_ORDER.map(function (s) { return { id: s, label: STATES[s].label }; }));
  var chipId = function (id) { return 'chip-' + (id || 'all'); };

  function buildChips() {
    var box = $('chips');
    CHIP_ITEMS.forEach(function (c) {
      var input = el('input', { type: 'radio', name: 'state-filter', value: c.id, id: chipId(c.id) });
      input.addEventListener('change', function () { view.state = c.id; renderList(); });
      box.appendChild(el('label', { class: 'jr-chip', for: input.id }, [
        input,
        el('span', {}, [c.id ? el('span', { 'aria-hidden': 'true', class: 'jr-chip__mark', text: STATES[c.id].mark }) : null, c.label, el('span', { class: 'jr-chip__n', id: input.id + '-n' })])
      ]));
    });
  }

  function renderChips() {
    var base = items.filter(function (it) { return matches(it, view.q); });
    CHIP_ITEMS.forEach(function (c) {
      $(chipId(c.id)).checked = view.state === c.id;
      var n = base.filter(function (it) { return !c.id || stateOf(it) === c.id; }).length;
      $(chipId(c.id) + '-n').textContent = n + '点';
    });
  }

  /* ---------- 表 ---------- */

  function stateText(s) {
    return el('span', { class: 'jr-st jr-st--' + s }, [el('span', { 'aria-hidden': 'true', text: STATES[s].mark }), STATES[s].label]);
  }

  function head() {
    return el('thead', {}, [el('tr', {}, COLUMNS.map(function (c) {
      if (!c.sortable) return el('th', { scope: 'col', class: 'jr-col-' + c.key, text: c.label });
      var sorted = view.sort.key === c.key ? view.sort.dir : null;
      var btn = el('button', { type: 'button', class: 'jr-sort', 'data-sort': c.key }, [
        c.label,
        el('span', { 'aria-hidden': 'true', text: sorted === 'asc' ? '↑' : sorted === 'desc' ? '↓' : '↕' })
      ]);
      btn.addEventListener('click', function () {
        view.sort = { key: c.key, dir: view.sort.key === c.key && view.sort.dir === 'asc' ? 'desc' : 'asc' };
        renderList();
        $('table-box').querySelector('[data-sort="' + c.key + '"]').focus(); // 並べ替えた見出しのボタンにフォーカスを残す
      });
      return el('th', { scope: 'col', class: 'jr-col-' + c.key, 'aria-sort': sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : 'none' }, [btn]);
    }).concat([el('th', { scope: 'col', class: 'jr-col-act' }, [el('span', { class: 'visually-hidden', text: '操作' })])]))]);
  }

  function row(it) {
    var open = openId === it.id;
    var s = stateOf(it);
    var btn = el('button', { type: 'button', id: 'open-' + it.id, 'aria-expanded': open ? 'true' : 'false', 'aria-controls': open ? 'detail' : null }, [
      open ? '閉じる' : '詳細', el('span', { class: 'visually-hidden', text: '（' + it.id + '）' })
    ]);
    btn.addEventListener('click', function () { if (openId === it.id) closeDetail(); else openDetail(it.id); });
    return el('tr', { class: 'jr-row' + (open ? ' is-open' : '') }, [
      el('td', { class: 'jr-id' }, [it.id, open ? el('span', { class: 'jr-tag jr-open-tag', text: '表示中' }) : null]),
      el('td', { class: 'jr-name', text: it.name }),
      el('td', { class: 'jr-kind', 'data-label': '区分', text: it.kind }),
      el('td', { class: 'jr-place', 'data-label': '保管場所', text: it.place }),
      el('td', { class: 'jr-state' }, [stateText(s)]),
      el('td', { class: 'jr-due', 'data-label': '返却予定', text: it.loan ? slash(it.loan.due) : '—' }),
      el('td', { class: 'jr-act' }, [btn])
    ]);
  }

  function detail(it) {
    var s = stateOf(it);
    var item = function (term, value) { return el('div', {}, [el('dt', { text: term }), el('dd', {}, [value])]); };
    var dl = [item('備品名', it.name), item('区分', it.kind), item('保管場所', it.place), item('状態', stateText(s))];
    if (it.loan) {
      var over = s === 'overdue' ? '（' + daysBetween(it.loan.due, TODAY) + '日過ぎています）' : '';
      dl.push(item('借りている課', it.loan.dept), item('借りている人', it.loan.person + '　内線 ' + it.loan.ext), item('貸出日', slash(it.loan.lent)), item('返却予定', slash(it.loan.due) + over), item('用途', it.loan.purpose));
    }
    if (it.note) dl.push(item('備考', it.note));
    var actions = el('div', { class: 'jr-detail__actions' });
    if (s === 'available') actions.appendChild(action('この備品の貸出を記録する', 'jr-btn jr-btn--small', function () { startLoan(it.id); }));
    if (s === 'lent' || s === 'overdue') actions.appendChild(action('返却を受け付ける', 'jr-btn jr-btn--small', function () { setAvailable(it, '返却を受け付けました'); }));
    if (s === 'maintenance') actions.appendChild(action('点検を終える', 'jr-btn jr-btn--small', function () { setAvailable(it, '点検を終え、貸出できる状態にしました'); }));
    actions.appendChild(action('詳細を閉じる', 'jr-link', closeDetail));
    return el('tr', { class: 'jr-detail-row' }, [el('td', { colspan: String(COLUMNS.length + 1) }, [
      el('section', { class: 'jr-detail', id: 'detail', 'aria-labelledby': 'detail-title' }, [
        el('div', { class: 'jr-detail__id' }, [el('h3', { id: 'detail-title', tabindex: '-1', text: '備品の詳細' }), el('p', { text: it.id }), actions]),
        el('dl', { class: 'jr-dl' }, dl)
      ])
    ])]);
  }

  function action(label, cls, onClick) {
    var b = el('button', { type: 'button', class: cls, text: label });
    b.addEventListener('click', onClick);
    return b;
  }

  function renderList() {
    var list = visibleItems();
    if (openId !== null && !list.some(function (it) { return it.id === openId; })) openId = null;
    $('shown').textContent = list.length;
    $('total').textContent = '／ 全' + items.length + '点';
    renderChips();

    var cond = $('cond');
    cond.textContent = '';
    var filtered = view.q || view.state;
    if (filtered) {
      var parts = [];
      if (view.state) parts.push('状態「' + STATES[view.state].label + '」');
      if (view.q) parts.push('キーワード「' + view.q + '」');
      var clear = action('条件をクリア', 'jr-link', function () {
        view.q = '';
        view.state = '';
        $('q').value = '';
        renderList();
        $('q').focus();
      });
      cond.append(el('span', { class: 'jr-tag', text: '絞り込み中' }), parts.join('・') + '（' + items.length + '点中' + list.length + '点）　', clear);
    } else {
      cond.textContent = 'すべての備品を表示しています（' + items.length + '点）';
    }

    var box = $('table-box');
    box.textContent = '';
    if (!list.length) {
      box.appendChild(el('p', { class: 'jr-empty', text: '条件に一致する備品はありません。キーワードを変えるか、「条件をクリア」を選んでください。' }));
      return;
    }
    var tbody = el('tbody');
    list.forEach(function (it) {
      tbody.appendChild(row(it));
      if (openId === it.id) tbody.appendChild(detail(it));
    });
    box.appendChild(el('table', { class: 'jr-table' }, [
      el('caption', { class: 'visually-hidden', text: '備品の一覧（' + items.length + '点中' + list.length + '点）。列見出しのボタンで並べ替えできます。' }),
      head(),
      tbody
    ]));
  }

  function openDetail(id) { openId = id; renderList(); $('detail-title').focus(); }
  function closeDetail() {
    var id = openId;
    openId = null;
    renderList();
    var b = $('open-' + id);
    if (b) b.focus();
  }
  function setAvailable(it, done) {
    it.state = 'available';
    delete it.loan;
    delete it.note;
    if (view.state && view.state !== 'available') view.state = ''; // 状態の絞り込みで行が消えないように解除する
    renderList();
    fillItems();
    $('detail-title').focus();
    announce(it.id + '「' + it.name + '」の' + done + '。');
  }

  /* ---------- 検索（IME の変換中は絞り込まない） ---------- */

  var q = $('q');
  var applySearch = function () { view.q = q.value.trim(); renderList(); };
  q.addEventListener('compositionstart', function () { composing = true; });
  q.addEventListener('compositionend', function () { composing = false; applySearch(); });
  q.addEventListener('input', function (e) { if (!composing && !e.isComposing) applySearch(); });
  $('search').addEventListener('submit', function (e) { e.preventDefault(); applySearch(); });

  /* ---------- 貸出の記録 ---------- */

  var form = $('form');
  // form.elements[name] は使わない（name が item・reset などだと、コレクションやフォームのメソッドを指してしまう）
  var F = function (name) { return $('f-' + name); };
  var FIELD_FOCUS = { item: 'f-item', lent: 'f-lent', due: 'f-due', dept: 'f-dept', person: 'f-person', ext: 'f-ext', purpose: 'f-purpose', agree: 'f-agree' };
  var FIELD_LABEL = { item: '備品', lent: '貸出日', due: '返却予定日', dept: '課', person: '氏名', ext: '内線番号', purpose: '用途', agree: '破損・紛失のときの連絡' };

  function fillItems() {
    var sel = F('item');
    var keep = sel.value;
    sel.textContent = '';
    sel.appendChild(el('option', { value: '', text: '選んでください' }));
    items.filter(function (it) { return stateOf(it) === 'available'; }).forEach(function (it) {
      sel.appendChild(el('option', { value: it.id, text: it.id + '　' + it.name }));
    });
    sel.value = keep && itemOf(keep) && stateOf(itemOf(keep)) === 'available' ? keep : '';
  }

  function fillDepts() {
    var sel = F('dept');
    sel.appendChild(el('option', { value: '', text: '選んでください' }));
    DEPTS.forEach(function (d) { sel.appendChild(el('option', { value: d, text: d })); });
  }

  function validate() {
    var v = {
      item: F('item').value, lent: F('lent').value, due: F('due').value, dept: F('dept').value,
      person: F('person').value.trim(), ext: toHalf(F('ext').value.trim()), purpose: F('purpose').value.trim(), agree: F('agree').checked
    };
    var errors = [];
    var add = function (name, text) { errors.push({ name: name, text: text }); };
    if (!v.item) add('item', '借りる備品を選んでください。');
    if (!v.lent) add('lent', '貸出日を選んでください。');
    if (!v.due) add('due', '返却予定日を選んでください。');
    else if (v.lent && v.due < v.lent) add('due', '返却予定日は、貸出日と同じ日かそれより後にしてください。');
    else if (v.lent && daysBetween(v.lent, v.due) > MAX_DAYS) add('due', '返却予定日は、貸出日から' + MAX_DAYS + '日以内の日を選んでください（いま' + daysBetween(v.lent, v.due) + '日後）。');
    if (!v.dept) add('dept', '借りる人の課を選んでください。');
    if (!v.person) add('person', '借りる人の氏名を入力してください。');
    if (!v.ext) add('ext', '内線番号を入力してください。');
    else if (!/^\d{4}$/.test(v.ext)) add('ext', '内線番号は4桁の数字で入力してください。');
    if (!v.purpose) add('purpose', '用途を入力してください。');
    else if (v.purpose.length > 40) add('purpose', '用途は40字以内で入力してください（いま' + v.purpose.length + '字）。');
    if (!v.agree) add('agree', '借りる人に連絡先を伝えたら、チェックを入れてください。');
    return { values: v, errors: errors };
  }

  function clearErrors() {
    form.querySelectorAll('[data-field]').forEach(function (box) {
      box.classList.remove('is-invalid');
      var e = box.querySelector('.jr-error');
      if (e) e.remove();
      box.querySelectorAll('input, select').forEach(function (c) {
        c.removeAttribute('aria-invalid');
        var ids = (c.getAttribute('aria-describedby') || '').split(' ').filter(function (id) { return id && !/-error$/.test(id); });
        if (ids.length) c.setAttribute('aria-describedby', ids.join(' '));
        else c.removeAttribute('aria-describedby');
      });
    });
    $('errors').hidden = true;
  }

  function showErrors(errors) {
    errors.forEach(function (e) {
      var box = form.querySelector('[data-field="' + e.name + '"]');
      var id = 'f-' + e.name + '-error';
      box.classList.add('is-invalid');
      box.querySelector('.jr-label').insertAdjacentElement('afterend', el('p', { class: 'jr-error', id: id }, [el('span', { class: 'jr-error-tag', text: 'エラー' }), e.text]));
      box.querySelectorAll('input, select').forEach(function (c) {
        c.setAttribute('aria-invalid', 'true');
        c.setAttribute('aria-describedby', [id].concat((c.getAttribute('aria-describedby') || '').split(' ').filter(Boolean)).join(' '));
      });
    });
    $('errors-text').textContent = '入力エラーが' + errors.length + '件あります';
    var list = $('error-list');
    list.textContent = '';
    errors.forEach(function (e) {
      var b = action(FIELD_LABEL[e.name], 'jr-link', function () { $(FIELD_FOCUS[e.name]).focus(); });
      list.appendChild(el('li', {}, [b, '　' + e.text]));
    });
    $('errors').hidden = false;
    $('errors').focus();
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    clearErrors();
    var r = validate();
    if (r.errors.length) { showErrors(r.errors); return; }
    var v = r.values;
    var it = itemOf(v.item);
    it.state = 'lent';
    it.loan = { dept: v.dept, person: v.person, ext: v.ext, lent: v.lent, due: v.due, purpose: v.purpose };
    // 記録した備品が一覧から外れないよう、合わない絞り込みは解除する
    if (!matches(it, view.q)) { view.q = ''; q.value = ''; }
    if (view.state && view.state !== stateOf(it)) view.state = '';
    openId = null;
    renderList();
    resetForm();
    $('open-' + it.id).focus();
    announce(it.id + '「' + it.name + '」の貸出を記録しました（' + v.dept + '、返却予定 ' + dayText(v.due) + '）。');
  });

  function resetForm() {
    form.reset();
    clearErrors();
    fillItems();
    F('lent').value = TODAY;
  }

  function startLoan(id) {
    F('item').value = id;
    if (!F('lent').value) F('lent').value = TODAY;
    F('item').focus();
  }

  $('clear-form').addEventListener('click', function () { resetForm(); F('item').focus(); });
  $('to-form').addEventListener('click', function () { $('entry-title').focus(); });

  buildChips();
  fillDepts();
  fillItems();
  F('lent').value = TODAY;
  renderList();
})();
