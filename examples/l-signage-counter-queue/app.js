// 窓口の呼び出し：l-signage-ui Skill の適用見本の動作。
// 外部通信・保存はせず、整理番号はこのページのメモリ上だけで扱う。file:// でも動くよう、モジュールにしない。
// ドット文字は assets/dot-digits.js（Skill の assets と同じ）の dotDigits() で描き、数値は文字でも1回だけ置く。
(function () {
  'use strict';

  var NOW = '10:30';
  var STATES = {
    waiting: { label: '待ち', mark: '○' },
    calling: { label: '呼び出し中', mark: '◎' },
    serving: { label: '対応中', mark: '◐' },
    done: { label: '完了', mark: '●' },
    absent: { label: '不在', mark: '×' }
  };
  var STATE_ORDER = ['waiting', 'calling', 'serving', 'done', 'absent'];
  var TYPES = ['住民票・戸籍', '転入・転出', 'マイナンバー', 'その他'];
  var COUNTERS = ['窓口1', '窓口2', '窓口3'];
  var NEEDS = ['車いす', '筆談', '通訳'];

  var tickets = [
    { no: 31, type: '住民票・戸籍', people: 1, issued: '09:02', state: 'done', counter: '窓口1', needs: [], memo: '' },
    { no: 32, type: '転入・転出', people: 2, issued: '09:05', state: 'done', counter: '窓口2', needs: [], memo: '' },
    { no: 33, type: 'マイナンバー', people: 1, issued: '09:11', state: 'done', counter: '窓口3', needs: [], memo: '' },
    { no: 34, type: '住民票・戸籍', people: 1, issued: '09:18', state: 'absent', counter: '', needs: [], memo: '2回呼び出したが応答なし' },
    { no: 35, type: '住民票・戸籍', people: 1, issued: '09:25', state: 'done', counter: '窓口1', needs: [], memo: '' },
    { no: 36, type: '転入・転出', people: 3, issued: '09:31', state: 'serving', counter: '窓口2', needs: ['通訳'], memo: '英語の通訳を手配済み' },
    { no: 37, type: 'その他', people: 1, issued: '09:40', state: 'done', counter: '窓口1', needs: [], memo: '' },
    { no: 38, type: 'マイナンバー', people: 1, issued: '09:46', state: 'serving', counter: '窓口3', needs: [], memo: '' },
    { no: 39, type: '住民票・戸籍', people: 1, issued: '09:52', state: 'calling', counter: '窓口1', needs: ['車いす'], memo: '' },
    { no: 40, type: '住民票・戸籍', people: 1, issued: '10:01', state: 'waiting', counter: '', needs: [], memo: '' },
    { no: 41, type: '転入・転出', people: 2, issued: '10:08', state: 'waiting', counter: '', needs: [], memo: '' },
    { no: 42, type: '住民票・戸籍', people: 1, issued: '10:12', state: 'waiting', counter: '', needs: ['筆談'], memo: '' },
    { no: 43, type: 'マイナンバー', people: 1, issued: '10:17', state: 'waiting', counter: '', needs: [], memo: '' },
    { no: 44, type: '住民票・戸籍', people: 1, issued: '10:21', state: 'waiting', counter: '', needs: [], memo: '' },
    { no: 45, type: 'その他', people: 1, issued: '10:26', state: 'waiting', counter: '', needs: [], memo: '' }
  ];
  var nextNo = 46;

  var view = { state: '', sort: { key: 'no', dir: 'asc' } };
  var openNo = null;
  var draft = { type: '', people: '1', needs: [], memo: '' };
  var step = 'edit';

  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') node.textContent = v;
      else if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v; // dotDigits() の SVG だけに使う
      else node.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return node;
  };
  /** ドット文字（装飾）。数値の文字は呼び出し側が別に置く。 */
  var dots = function (value, width, cls) { return el('span', { class: 'ls-dots-box', html: window.dotDigits(value, { width: width, className: 'l-dots ' + (cls || '') }) }); };
  var announce = function (text) {
    var s = $('status');
    s.textContent = '';
    window.setTimeout(function () { s.textContent = text; }, 30);
  };
  var minutes = function (hhmm) { var p = hhmm.split(':').map(Number); return p[0] * 60 + p[1]; };
  var ticketOf = function (no) { return tickets.filter(function (t) { return t.no === no; })[0]; };
  var waiting = function () { return tickets.filter(function (t) { return t.state === 'waiting'; }).sort(function (a, b) { return a.no - b.no; }); };
  var atCounter = function (c) { return tickets.filter(function (t) { return t.counter === c && (t.state === 'calling' || t.state === 'serving'); })[0]; };
  var stateText = function (s) { return el('span', { class: 'ls-st' }, [el('span', { 'aria-hidden': 'true', text: STATES[s].mark }), STATES[s].label]); };
  var action = function (label, cls, onClick, attrs) {
    var b = el('button', Object.assign({ type: 'button', class: cls, text: label }, attrs || {}));
    b.addEventListener('click', onClick);
    return b;
  };

  function renderAll() {
    renderCounters();
    renderWaiting();
    renderList();
  }

  /* ---------- 窓口：呼び出し中の窓口だけ琥珀に点灯 ---------- */

  function counterAction(c, kind) {
    var t = atCounter(c);
    if (kind === 'call') {
      var next = waiting()[0];
      if (!next) return;
      next.state = 'calling';
      next.counter = c;
      announce(next.no + '番を' + c + 'へ呼び出しました。');
    } else if (kind === 'start') {
      t.state = 'serving';
      announce(c + 'で' + t.no + '番の対応を始めました。');
    } else if (kind === 'finish') {
      t.state = 'done';
      announce(c + 'で' + t.no + '番の対応を終えました。');
    } else if (kind === 'absent') {
      t.state = 'absent';
      t.counter = '';
      announce(t.no + '番を不在にしました。');
    }
    renderAll();
    // 描き直した窓口の区画の、次に押す操作へフォーカスを移す（操作したボタンは無くなるため）
    var first = $('counter-' + c).querySelector('button:not([disabled])');
    if (first) first.focus();
    else $('counter-' + c).querySelector('.ls-counter__name').focus();
  }

  function renderCounters() {
    var box = $('counters');
    box.textContent = '';
    var nextWaiting = waiting()[0];
    COUNTERS.forEach(function (c) {
      var t = atCounter(c);
      var calling = t && t.state === 'calling';
      var acts = el('div', { class: 'ls-counter__acts' });
      if (!t) acts.appendChild(action(nextWaiting ? '次を呼ぶ（' + nextWaiting.no + '番）' : '次を呼ぶ', 'ls-btn ls-btn--small ls-btn--primary', function () { counterAction(c, 'call'); }, { disabled: !nextWaiting }));
      if (calling) {
        acts.appendChild(action('対応を始める', 'ls-btn ls-btn--small ls-btn--on-amber', function () { counterAction(c, 'start'); }));
        acts.appendChild(action('不在にする', 'ls-link', function () { counterAction(c, 'absent'); }));
      }
      if (t && t.state === 'serving') acts.appendChild(action('完了にする', 'ls-btn ls-btn--small ls-btn--ghost', function () { counterAction(c, 'finish'); }));
      var spoken = t ? t.no + '番（' + STATES[t.state].label + '）' : '空き';
      box.appendChild(el('li', { class: 'ls-counter' + (calling ? ' is-current' : ''), id: 'counter-' + c }, [
        el('h3', { class: 'ls-counter__name', tabindex: '-1', text: c }),
        el('div', { class: 'ls-counter__now' }, [
          t ? dots(t.no, 3, 'ls-counter__dots') : el('span', { class: 'ls-counter__idle', 'aria-hidden': 'true', text: '空き' }),
          el('p', { class: 'ls-counter__state' }, [t ? stateText(t.state) : '', el('span', { class: 'visually-hidden', text: spoken })])
        ]),
        acts
      ]));
    });
  }

  /* ---------- 待っている人：ドット文字と、用件ごとの「1目盛り＝1人」 ---------- */

  function ticks(n, max) {
    var total = Math.max(5, Math.ceil(max / 5) * 5);
    var box = el('span', { class: 'ls-ticks', style: '--n:' + total, 'aria-hidden': 'true' });
    for (var i = 0; i < total; i += 1) box.appendChild(el('i', { class: i < n ? 'on' : null }));
    return box;
  }

  /** 待っている人数（整理番号1件に複数人のことがあるので、件数ではなく people の合計）。 */
  var peopleOf = function (list) { return list.reduce(function (sum, t) { return sum + t.people; }, 0); };

  function renderWaiting() {
    var w = waiting();
    var total = peopleOf(w);
    $('waiting-dots').textContent = '';
    $('waiting-dots').appendChild(dots(total, 2, 'ls-waiting__dots'));
    $('waiting-text').textContent = total + '人';
    var counts = TYPES.map(function (ty) { return peopleOf(w.filter(function (t) { return t.type === ty; })); });
    var max = Math.max.apply(null, counts);
    var body = $('types');
    body.textContent = '';
    TYPES.forEach(function (ty, i) {
      body.appendChild(el('tr', {}, [
        el('th', { scope: 'row', text: ty }),
        el('td', {}, [ticks(counts[i], max)]),
        el('td', { class: 'ls-num', 'data-type': ty, text: String(counts[i]) })
      ]));
    });
  }

  /* ---------- 整理番号の一覧：状態の盤面（ラジオは最初に1回だけ作る） ---------- */

  var STATE_ITEMS = [{ id: '', label: 'すべて' }].concat(STATE_ORDER.map(function (s) { return { id: s, label: STATES[s].label }; }));
  var stateId = function (id) { return 'state-' + (id || 'all'); };

  function buildStates() {
    STATE_ITEMS.forEach(function (s) {
      var input = el('input', { type: 'radio', name: 'state-filter', value: s.id, id: stateId(s.id) });
      input.addEventListener('change', function () { view.state = s.id; renderList(); });
      $('states').appendChild(el('label', { class: 'ls-state', for: input.id }, [
        input,
        el('span', { class: 'ls-state__face' }, [
          el('span', { class: 'ls-state__label' }, [el('span', { class: 'ls-state__check', 'aria-hidden': 'true', text: '✓' }), s.label]),
          el('span', { class: 'ls-state__dots', id: input.id + '-dots' }),
          el('span', { class: 'visually-hidden', id: input.id + '-n' })
        ])
      ]));
    });
  }

  function renderStates() {
    STATE_ITEMS.forEach(function (s) {
      var n = tickets.filter(function (t) { return !s.id || t.state === s.id; }).length;
      $(stateId(s.id)).checked = view.state === s.id;
      var d = $(stateId(s.id) + '-dots');
      d.textContent = '';
      d.appendChild(dots(n, 2));
      d.setAttribute('data-count', String(n));
      $(stateId(s.id) + '-n').textContent = n + '件';
    });
  }

  var COLUMNS = [
    { key: 'no', label: '番号', sortable: true },
    { key: 'type', label: '用件' },
    { key: 'issued', label: '発行', sortable: true },
    { key: 'state', label: '状態' },
    { key: 'counter', label: '窓口' }
  ];

  function visible() {
    var dir = view.sort.dir === 'asc' ? 1 : -1;
    var key = view.sort.key;
    return tickets
      .filter(function (t) { return !view.state || t.state === view.state; })
      .sort(function (a, b) { return (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * dir || a.no - b.no; });
  }

  function head() {
    return el('thead', {}, [el('tr', {}, COLUMNS.map(function (c) {
      if (!c.sortable) return el('th', { scope: 'col', text: c.label });
      var sorted = view.sort.key === c.key ? view.sort.dir : null;
      var b = action('', 'ls-sort', function () {
        view.sort = { key: c.key, dir: view.sort.key === c.key && view.sort.dir === 'asc' ? 'desc' : 'asc' };
        renderList();
        $('table-box').querySelector('[data-sort="' + c.key + '"]').focus(); // 描き直した表の、押した見出しのボタンへ
      }, { 'data-sort': c.key });
      b.append(c.label, el('span', { 'aria-hidden': 'true', text: sorted === 'asc' ? '↑' : sorted === 'desc' ? '↓' : '↕' }));
      return el('th', { scope: 'col', 'aria-sort': sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : 'none' }, [b]);
    }).concat([el('th', { scope: 'col' }, [el('span', { class: 'visually-hidden', text: '操作' })])]))]);
  }

  function row(t) {
    var open = openNo === t.no;
    var btn = action(open ? '閉じる' : '詳細', '', function () { if (openNo === t.no) closeDetail(); else openDetail(t.no); }, { id: 'open-' + t.no, 'aria-expanded': open ? 'true' : 'false', 'aria-controls': open ? 'detail' : null });
    btn.appendChild(el('span', { class: 'visually-hidden', text: '（' + t.no + '番）' }));
    return el('tr', { class: 'ls-row' + (open ? ' is-open' : '') }, [
      el('td', { class: 'ls-no', text: t.no + '番' }),
      el('td', { class: 'ls-type', text: t.type }),
      el('td', { class: 'ls-issued', 'data-label': '発行', text: t.issued }),
      el('td', { class: 'ls-state-cell' }, [stateText(t.state)]),
      el('td', { class: 'ls-counter-cell', 'data-label': '窓口', text: t.counter || '—' }),
      el('td', { class: 'ls-act' }, [btn])
    ]);
  }

  function detail(t) {
    var item = function (term, value) { return el('div', {}, [el('dt', { text: term }), el('dd', {}, [value])]); };
    var wait = t.state === 'waiting' ? '（' + (minutes(NOW) - minutes(t.issued)) + '分待ち）' : '';
    var acts = el('div', { class: 'ls-detail__acts' });
    if (t.state === 'absent') acts.appendChild(action('待ちに戻す', 'ls-btn ls-btn--small ls-btn--ghost', function () {
      t.state = 'waiting';
      if (view.state && view.state !== 'waiting') view.state = '';
      renderAll();
      $('detail-title').focus();
      announce(t.no + '番を待ちに戻しました。');
    }));
    acts.appendChild(action('詳細を閉じる', 'ls-link', closeDetail));
    return el('tr', { class: 'ls-detail-row' }, [el('td', { colspan: String(COLUMNS.length + 1) }, [
      el('section', { class: 'ls-detail', id: 'detail', 'aria-labelledby': 'detail-title' }, [
        el('div', { class: 'ls-detail__id' }, [el('h3', { id: 'detail-title', tabindex: '-1', text: '整理番号の詳細' }), el('p', { class: 'ls-detail__no', text: t.no + '番' }), el('p', {}, [stateText(t.state)]), acts]),
        el('dl', {}, [
          item('用件', t.type),
          item('人数', t.people + '人'),
          item('発行', t.issued + wait),
          item('窓口', t.counter || '—'),
          item('配慮', t.needs.length ? t.needs.join('・') : 'なし'),
          item('メモ', t.memo || 'なし')
        ])
      ])
    ])]);
  }

  function renderList() {
    var list = visible();
    if (openNo !== null && !list.some(function (t) { return t.no === openNo; })) openNo = null;
    renderStates();
    $('count').textContent = (view.state ? '状態「' + STATES[view.state].label + '」で ' : '') + '全' + tickets.length + '件中 ' + list.length + '件';
    var box = $('table-box');
    box.textContent = '';
    if (!list.length) {
      box.appendChild(el('p', { class: 'ls-empty', text: 'この状態の整理番号はありません。状態の「すべて」を選ぶと、すべて表示します。' }));
      return;
    }
    var tbody = el('tbody');
    list.forEach(function (t) {
      tbody.appendChild(row(t));
      if (openNo === t.no) tbody.appendChild(detail(t));
    });
    box.appendChild(el('table', { class: 'ls-table' }, [el('caption', { class: 'visually-hidden', text: '整理番号の一覧（' + list.length + '件）。列見出しのボタンで並べ替えできます。' }), head(), tbody]));
  }

  function openDetail(no) { openNo = no; renderList(); $('detail-title').focus(); }
  function closeDetail() {
    var no = openNo;
    openNo = null;
    renderList();
    var b = $('open-' + no);
    if (b) b.focus();
  }

  /* ---------- 整理番号の発行：手順（入力 → 確認）。左の列に現在の手順、下段に次の手順 ---------- */

  var STEPS = [{ id: 'edit', label: '入力' }, { id: 'confirm', label: '確認' }];

  function headRow() {
    var i = step === 'edit' ? 0 : 1;
    return el('div', { class: 'ls-frow ls-fhead' }, [
      el('div', { class: 'ls-now' }, [dots(i + 1, 1, 'ls-now__dots'), el('span', { class: 'ls-now__label', text: STEPS[i].label }), el('span', { class: 'ls-now__tag', text: '現在' }), el('span', { class: 'visually-hidden', text: '（手順 ' + (i + 1) + ' / 2）' })]),
      el('div', { class: 'ls-titlebar' }, [el('h2', { class: 'ls-ftitle', id: 'form-title', tabindex: '-1', text: step === 'edit' ? '整理番号の発行' : '発行する内容の確認' })])
    ]);
  }

  function footRow(buttons) {
    var i = step === 'edit' ? 0 : 1;
    var other = STEPS[1 - i];
    var isNext = i === 0;
    return el('div', { class: 'ls-frow ls-foot' }, [
      el('ol', { class: 'ls-next', 'aria-label': 'ほかの手順' }, [el('li', { class: 'ls-next__item' + (isNext ? ' is-next' : ' is-done'), id: 'step-' + other.id }, [
        dots(2 - i, 1, 'ls-next__dots'), other.label, isNext ? el('span', { class: 'visually-hidden', text: '（次の手順）' }) : el('span', { class: 'ls-next__done', text: '済' })
      ])]),
      el('div', { class: 'ls-actions' }, buttons)
    ]);
  }

  var chapter = function (id, title, cells, extra) {
    return el('section', { class: 'ls-frow ls-chapter', 'aria-labelledby': 'ch-' + id }, [
      el('div', { class: 'ls-rail' }, [el('h3', { class: 'ls-chapter__title', id: 'ch-' + id, text: title }), extra || null]),
      el('div', { class: 'ls-cells' }, cells)
    ]);
  };

  function fieldCell(name, label, required, control, hint, error) {
    var id = 'f-' + name;
    var describedby = [error ? id + '-error' : null, hint ? id + '-hint' : null].filter(Boolean).join(' ');
    if (describedby) control.setAttribute('aria-describedby', describedby);
    if (error) control.setAttribute('aria-invalid', 'true');
    var isGroup = control.tagName === 'FIELDSET';
    return el('div', { class: 'ls-fcell' + (error ? ' is-invalid' : ''), 'data-field': name }, [
      el('p', { class: 'ls-fcell__head' }, [isGroup ? el('span', { class: 'ls-label', id: id + '-label', text: label }) : el('label', { class: 'ls-label', for: id, text: label }), el('span', { class: required ? 'ls-req' : 'ls-opt', text: required ? '必須' : '任意' })]),
      control,
      error ? el('p', { class: 'ls-field-error', id: id + '-error' }, [el('span', { class: 'ls-field-error__mark', 'aria-hidden': 'true', text: '!' }), el('span', {}, [el('strong', { text: 'エラー' }), '　' + error])]) : null,
      hint ? el('p', { class: 'ls-hint', id: id + '-hint', text: hint }) : null
    ]);
  }

  function validate() {
    var errors = [];
    if (!draft.type) errors.push({ name: 'type', label: '用件', text: '用件を選んでください。' });
    if (draft.memo.length > 40) errors.push({ name: 'memo', label: 'メモ', text: 'メモは40字以内で入力してください（いま' + draft.memo.length + '字）。' });
    return errors;
  }

  function renderForm(errors) {
    var box = $('form-box');
    box.textContent = '';
    var err = {};
    (errors || []).forEach(function (e) { err[e.name] = e.text; });
    if (step === 'edit') {
      var type = el('select', { id: 'f-type', class: 'ls-input ls-select' }, [el('option', { value: '', text: '選んでください' })].concat(TYPES.map(function (t) { return el('option', { value: t, text: t }); })));
      type.value = draft.type;
      var people = el('select', { id: 'f-people', class: 'ls-input ls-select ls-input--short' }, ['1', '2', '3', '4'].map(function (n) { return el('option', { value: n, text: n + '人' }); }));
      people.value = draft.people;
      var needs = el('fieldset', { id: 'f-needs', class: 'ls-checks', 'aria-labelledby': 'f-needs-label' }, NEEDS.map(function (n) {
        var cb = el('input', { type: 'checkbox', id: 'f-need-' + n, value: n, class: 'ls-checkbox' });
        cb.checked = draft.needs.indexOf(n) >= 0;
        return el('label', { class: 'ls-check', for: cb.id }, [cb, n]);
      }));
      var memo = el('input', { type: 'text', id: 'f-memo', class: 'ls-input', autocomplete: 'off' });
      memo.value = draft.memo;
      var form = el('form', { class: 'ls-form', novalidate: true, 'aria-labelledby': 'form-title' }, [
        headRow(),
        errors && errors.length ? el('div', { class: 'ls-frow ls-alert' }, [
          el('div', { class: 'ls-rail' }, [el('p', { class: 'ls-alert__tag' }, [el('span', { 'aria-hidden': 'true', text: '!' }), 'エラー'])]),
          el('div', { class: 'ls-errors', id: 'errors', tabindex: '-1', 'aria-labelledby': 'errors-title' }, [
            el('h3', { id: 'errors-title', text: '入力エラーが' + errors.length + '件あります' }),
            el('p', { text: '項目名を選ぶと、その欄へ移動します。' }),
            el('ul', {}, errors.map(function (e) { return el('li', {}, [action(e.label, 'ls-link', function () { $('f-' + e.name).focus(); }), '：' + e.text]); }))
          ])
        ]) : null,
        chapter('use', '用件', [
          fieldCell('type', '用件', true, type, '窓口で伺う手続きの種類。', err.type),
          fieldCell('people', '人数', true, people, '一緒に窓口へ来る人の数。', err.people)
        ], err.type ? el('p', { class: 'ls-chapter__err', text: 'エラー 1件' }) : null),
        chapter('care', '配慮', [
          fieldCell('needs', '配慮が必要なこと', false, needs, '窓口で準備するもの。', null),
          fieldCell('memo', 'メモ', false, memo, '40字以内。例：番号を呼ぶときは肩をたたく', err.memo)
        ], err.memo ? el('p', { class: 'ls-chapter__err', text: 'エラー 1件' }) : null),
        footRow([el('p', { class: 'ls-demo', text: '発行した番号はこのページの中だけで扱います。' }), el('span', { class: 'ls-connector', 'aria-hidden': 'true' }), el('button', { type: 'submit', class: 'ls-btn ls-btn--primary', 'aria-describedby': 'step-confirm' }, ['確認へ', el('span', { class: 'ls-btn__arrow', 'aria-hidden': 'true', text: '→' })])])
      ]);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        draft = { type: type.value, people: people.value, needs: NEEDS.filter(function (n) { return $('f-need-' + n).checked; }), memo: memo.value.trim() };
        var errs = validate();
        if (errs.length) { renderForm(errs); $('errors').focus(); return; }
        step = 'confirm';
        renderForm();
        $('form-title').focus();
      });
      box.appendChild(form);
      return;
    }
    var value = function (name, label, text) {
      return el('div', { class: 'ls-fcell' }, [
        el('p', { class: 'ls-fcell__head' }, [el('span', { class: 'ls-label', text: label }), action('修正', 'ls-link ls-fix', function () { step = 'edit'; renderForm(); $('f-' + name).focus(); }, { 'aria-label': '修正（' + label + '）' })]),
        el('p', { class: 'ls-value', text: text })
      ]);
    };
    box.appendChild(el('div', { class: 'ls-form' }, [
      headRow(),
      chapter('use', '用件', [value('type', '用件', draft.type), value('people', '人数', draft.people + '人')]),
      chapter('care', '配慮', [value('needs', '配慮が必要なこと', draft.needs.length ? draft.needs.join('・') : 'なし'), value('memo', 'メモ', draft.memo || 'なし')]),
      footRow([
        action('入力に戻る', 'ls-btn ls-btn--ghost', function () { step = 'edit'; renderForm(); $('form-title').focus(); }),
        el('span', { class: 'ls-connector', 'aria-hidden': 'true' }),
        action('発行する', 'ls-btn ls-btn--primary', issue)
      ])
    ]));
  }

  function issue() {
    var t = { no: nextNo, type: draft.type, people: Number(draft.people), issued: NOW, state: 'waiting', counter: '', needs: draft.needs, memo: draft.memo };
    nextNo += 1;
    tickets.push(t);
    if (view.state && view.state !== 'waiting') view.state = ''; // 発行した番号が一覧から外れないように
    openNo = null;
    draft = { type: '', people: '1', needs: [], memo: '' };
    step = 'edit';
    renderAll();
    renderForm();
    $('open-' + t.no).focus();
    announce('整理番号 ' + t.no + '番（' + t.type + '）を発行しました。待っている人は' + peopleOf(waiting()) + '人です。');
  }

  buildStates();
  renderAll();
  renderForm();
})();
