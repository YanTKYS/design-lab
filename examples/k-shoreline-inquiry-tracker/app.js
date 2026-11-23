// 照会の進捗：k-shoreline-ui Skill の適用見本の動作。
// 外部通信・保存はせず、照会はこのページのメモリ上だけで扱う。file:// でも動くよう、モジュールにしない。
(function () {
  'use strict';

  var TODAY = '2026-11-24';
  var MAX_DAYS = 30;
  var STATES = {
    todo: { label: '未着手', mark: '○' },
    doing: { label: '対応中', mark: '◐' },
    asking: { label: '他課に確認中', mark: '△' },
    done: { label: '回答済', mark: '●' }
  };
  var STATE_ORDER = ['todo', 'doing', 'asking', 'done'];
  var DEPTS = ['市民課', '環境課', '道路管理課', '都市計画課', '子育て支援課', '防災課', '商工観光課', '生涯学習課', '総務課'];
  var WEEKS = ['2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23']; // 各週の月曜日
  var COLUMNS = [
    { key: 'id', label: '番号', sortable: true },
    { key: 'subject', label: '件名' },
    { key: 'dept', label: '担当課' },
    { key: 'due', label: '回答期限', sortable: true },
    { key: 'state', label: '状態' }
  ];

  var inquiries = [
    { id: 'Q-001', received: '2026-10-20', subject: '街灯が点かない場所の確認', kind: '市民', from: '木村 千尋', channel: '電話', dept: '道路管理課', due: '2026-10-30', state: 'done', body: '駅前の歩道の街灯が3本続けて点いていない。', log: ['10/20 受付', '10/22 現地を確認', '10/23 回答（11月上旬に交換）'] },
    { id: 'Q-002', received: '2026-10-22', subject: '粗大ごみの出し方（ピアノ）', kind: '市民', from: '加藤 翔', channel: '窓口', dept: '環境課', due: '2026-10-29', state: 'done', body: 'アップライトピアノを処分したい。市で収集できるか。', log: ['10/22 受付', '10/24 回答（市では収集しない。販売店の引き取りを案内）'] },
    { id: 'Q-003', received: '2026-10-27', subject: '公園の使用許可に必要な書類', kind: '事業者', from: '株式会社さくら野イベント', channel: 'メール', dept: '都市計画課', due: '2026-11-06', state: 'done', body: '中央公園でキッチンカーを出店するときの許可と書類。', log: ['10/27 受付', '11/02 回答（申請書と配置図）'] },
    { id: 'Q-004', received: '2026-10-28', subject: '児童手当の振込日', kind: '市民', from: '小川 陽子', channel: '電話', dept: '子育て支援課', due: '2026-11-04', state: 'done', body: '', log: ['10/28 受付', '10/28 回答'] },
    { id: 'Q-005', received: '2026-10-30', subject: '空き家の管理についての相談', kind: '市民', from: '遠藤 大輔', channel: '窓口', dept: '都市計画課', due: '2026-11-20', state: 'asking', body: '隣の空き家の庭木が道路にはみ出している。所有者に連絡してほしい。', log: ['10/30 受付', '11/05 所有者の確認を税務課に依頼'] },
    { id: 'Q-006', received: '2026-11-10', subject: '住民票の写しの郵送請求の方法', kind: '市民', from: '上田 美穂', channel: 'メール', dept: '市民課', due: '2026-11-17', state: 'done', body: '', log: ['11/10 受付', '11/11 回答（請求書の様式と返信用封筒）'] },
    { id: 'Q-007', received: '2026-11-11', subject: '防災無線が聞こえにくい地区', kind: '市民', from: '石井 健太', channel: '電話', dept: '防災課', due: '2026-11-25', state: 'doing', body: '北町3丁目で、屋外の防災無線が聞き取りにくい。', log: ['11/11 受付', '11/18 試験放送で音量を確認'] },
    { id: 'Q-008', received: '2026-11-13', subject: '商店街の催しの補助金の申請様式', kind: '事業者', from: '中央商店街振興組合', channel: 'メール', dept: '商工観光課', due: '2026-11-27', state: 'asking', body: '年末の催しに使える補助金と、申請の締め切り。', log: ['11/13 受付', '11/16 財政課に予算の残りを確認中'] },
    { id: 'Q-009', received: '2026-11-17', subject: '図書館の休館日の変更', kind: '他の自治体', from: '架空町 生涯学習係', channel: '電話', dept: '生涯学習課', due: '2026-11-24', state: 'doing', body: '相互貸借の受け渡し日を調整したい。', log: ['11/17 受付'] },
    { id: 'Q-010', received: '2026-11-19', subject: '保育所の空き状況', kind: '市民', from: '工藤 直樹', channel: '窓口', dept: '子育て支援課', due: '2026-11-26', state: 'todo', body: '', log: ['11/19 受付'] },
    { id: 'Q-011', received: '2026-11-20', subject: 'ごみ収集日の祝日の扱い', kind: '市民', from: '小林 彩', channel: '電話', dept: '環境課', due: '2026-11-27', state: 'todo', body: '', log: ['11/20 受付'] },
    { id: 'Q-012', received: '2026-11-24', subject: '公共施設の駐車場の利用時間', kind: '事業者', from: '有限会社ひだまり商店', channel: 'メール', dept: '総務課', due: '2026-12-01', state: 'todo', body: '', log: ['11/24 受付'] }
  ];
  var nextNo = 13;

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
  var svg = function (markup) { var t = document.createElement('template'); t.innerHTML = markup.trim(); return t.content.firstChild; };
  var announce = function (text) {
    var s = $('status');
    s.textContent = '';
    window.setTimeout(function () { s.textContent = text; }, 30);
  };
  var parse = function (iso) { var p = iso.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  var md = function (iso) { var d = parse(iso); return (d.getMonth() + 1) + '/' + d.getDate(); };
  var mdLong = function (iso) { var d = parse(iso); return (d.getMonth() + 1) + '月' + d.getDate() + '日'; };
  var daysBetween = function (a, b) { return Math.round((parse(b) - parse(a)) / 86400000); };
  var itemOf = function (id) { return inquiries.filter(function (x) { return x.id === id; })[0]; };
  /** 回答期限を過ぎた日数（回答済・期限内は 0）。 */
  var overdue = function (x) { return x.state === 'done' ? 0 : Math.max(0, daysBetween(x.due, TODAY)); };

  var SHORE = '<svg class="k-shore" viewBox="0 0 40 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="k-shore__sea" d="M40 0H18C8 30 6 64 14 100H40Z"/><path d="M15 0C5 30 3 64 11 100"/><path d="M10 0C1 30 -1 64 6 100"/></svg>';

  function matches(x, q) {
    if (!q) return true;
    var hay = [x.id, x.subject, x.from, x.kind, x.dept].join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).filter(Boolean).every(function (w) { return hay.indexOf(w) >= 0; });
  }

  function visible() {
    var dir = view.sort.dir === 'asc' ? 1 : -1;
    var key = view.sort.key;
    return inquiries
      .filter(function (x) { return matches(x, view.q) && (!view.state || x.state === view.state); })
      .sort(function (a, b) { return (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * dir || a.id.localeCompare(b.id); });
  }

  /* ---------- 状態の札（最初に1回だけ作る） ---------- */

  var CHIPS = [{ id: '', label: 'すべて' }].concat(STATE_ORDER.map(function (s) { return { id: s, label: STATES[s].label }; }));
  var chipId = function (id) { return 'chip-' + (id || 'all'); };

  function buildChips() {
    CHIPS.forEach(function (c) {
      var input = el('input', { type: 'radio', name: 'state-filter', value: c.id, id: chipId(c.id) });
      input.addEventListener('change', function () { view.state = c.id; renderList(); });
      $('chips').appendChild(el('label', { class: 'k-chip', for: input.id }, [
        input,
        el('span', {}, [c.id ? el('span', { class: 'k-chip__mark', 'aria-hidden': 'true', text: STATES[c.id].mark + ' ' }) : null, c.label, el('span', { class: 'k-chip__n', id: input.id + '-n' })])
      ]));
    });
  }

  function renderChips() {
    var base = inquiries.filter(function (x) { return matches(x, view.q); });
    CHIPS.forEach(function (c) {
      $(chipId(c.id)).checked = view.state === c.id;
      $(chipId(c.id) + '-n').textContent = base.filter(function (x) { return !c.id || x.state === c.id; }).length;
    });
  }

  /* ---------- 表と詳細 ---------- */

  var stateText = function (s) { return el('span', { class: 'k-st' }, [el('span', { 'aria-hidden': 'true', text: STATES[s].mark }), STATES[s].label]); };

  function head() {
    return el('thead', {}, [el('tr', {}, COLUMNS.map(function (c) {
      if (!c.sortable) return el('th', { scope: 'col', class: 'k-col-' + c.key, text: c.label });
      var sorted = view.sort.key === c.key ? view.sort.dir : null;
      var btn = el('button', { type: 'button', class: 'k-sort', 'data-sort': c.key }, [c.label, el('span', { 'aria-hidden': 'true', text: sorted === 'asc' ? '↑' : sorted === 'desc' ? '↓' : '' })]);
      btn.addEventListener('click', function () {
        view.sort = { key: c.key, dir: view.sort.key === c.key && view.sort.dir === 'asc' ? 'desc' : 'asc' };
        renderList();
        $('work').querySelector('[data-sort="' + c.key + '"]').focus(); // 描き直した表の、押した見出しのボタンへ
      });
      return el('th', { scope: 'col', class: 'k-col-' + c.key, 'aria-sort': sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : 'none' }, [btn]);
    }).concat([el('th', { scope: 'col', class: 'k-col-act' }, [el('span', { class: 'visually-hidden', text: '操作' })])]))]);
  }

  function row(x) {
    var open = openId === x.id;
    var late = overdue(x);
    var btn = el('button', { type: 'button', class: 'k-link', id: 'open-' + x.id, 'aria-expanded': open ? 'true' : 'false', 'aria-controls': open ? 'detail' : null }, [
      open ? '閉じる' : '詳細', el('span', { class: 'visually-hidden', text: '（' + x.id + '）' }), el('span', { 'aria-hidden': 'true', text: open ? ' ×' : ' ›' })
    ]);
    btn.addEventListener('click', function () { if (openId === x.id) closeDetail(); else openDetail(x.id); });
    return el('tr', { class: 'k-row' + (open ? ' is-open' : '') }, [
      el('td', { class: 'k-id' }, [x.id, open ? el('span', { class: 'k-open-tag', text: '表示中' }) : null]),
      el('td', { class: 'k-subject', text: x.subject }),
      el('td', { class: 'k-dept', 'data-label': '担当課', text: x.dept }),
      el('td', { class: 'k-due', 'data-label': '回答期限' }, [md(x.due), late ? el('span', { class: 'k-late', text: late + '日超過' }) : null]),
      el('td', { class: 'k-state' }, [stateText(x.state)]),
      el('td', { class: 'k-act' }, [btn])
    ]);
  }

  function detail(x) {
    var late = overdue(x);
    var item = function (term, value) { return el('div', {}, [el('dt', { text: term }), el('dd', {}, [value])]); };
    var actions = el('div', { class: 'k-detail__actions' });
    if (x.state === 'todo') actions.appendChild(action('対応を始める', 'k-btn k-btn--small', function () { setState(x, 'doing', '対応中にしました'); }));
    if (x.state === 'doing') actions.appendChild(action('他課に確認中にする', 'k-btn k-btn--ghost k-btn--small', function () { setState(x, 'asking', '他課に確認中にしました'); }));
    if (x.state === 'doing' || x.state === 'asking') actions.appendChild(action('回答済にする', 'k-btn k-btn--small', function () { setState(x, 'done', '回答済にしました'); }));
    return el('tr', { class: 'k-detail-row' }, [el('td', { colspan: String(COLUMNS.length + 1) }, [
      el('section', { class: 'k-detail', id: 'detail', 'aria-labelledby': 'detail-title' }, [
        svg(SHORE),
        el('div', { class: 'k-detail__in' }, [
          el('div', { class: 'k-detail__head' }, [
            el('h3', { id: 'detail-title', tabindex: '-1', text: '照会の詳細' }),
            action('詳細を閉じる', 'k-link k-detail__close', closeDetail)
          ]),
          el('div', { class: 'k-detail__body' }, [
            el('p', { class: 'k-badge' }, [stateText(x.state)]),
            el('p', { class: 'k-detail__id', text: x.id }),
            el('p', { class: 'k-detail__name', text: x.subject }),
            el('dl', {}, [
              item('照会元', x.from + '（' + x.kind + '）'),
              item('受付', mdLong(x.received) + '・' + x.channel),
              item('担当課', x.dept),
              item('回答期限', mdLong(x.due) + (late ? '（' + late + '日過ぎています）' : '')),
              item('内容', x.body || '（記録なし）')
            ]),
            el('h4', { class: 'k-detail__sub', text: '対応の記録' }),
            el('ol', { class: 'k-log' }, x.log.map(function (l) { return el('li', { text: l }); })),
            actions
          ])
        ])
      ])
    ])]);
  }

  function action(label, cls, onClick) {
    var b = el('button', { type: 'button', class: cls, text: label });
    b.addEventListener('click', onClick);
    return b;
  }

  function renderList() {
    var list = visible();
    if (openId !== null && !list.some(function (x) { return x.id === openId; })) openId = null;
    $('shown').textContent = list.length;
    $('total').textContent = '／ 全' + inquiries.length + '件';
    renderChips();

    var filtered = view.q || view.state;
    var parts = [];
    if (view.state) parts.push('状態「' + STATES[view.state].label + '」');
    if (view.q) parts.push('キーワード「' + view.q + '」');
    $('count').textContent = (filtered ? parts.join('・') + 'で ' : '') + inquiries.length + '件中 ' + list.length + '件';
    var slot = $('clear-slot');
    slot.textContent = '';
    if (filtered) slot.appendChild(action('条件をクリア', 'k-link', function () {
      view.q = '';
      view.state = '';
      $('q').value = '';
      renderList();
      $('q').focus();
    }));

    var work = $('work');
    work.textContent = '';
    work.className = 'k-work' + (list.length ? ' has-rows' : '');
    if (!list.length) {
      work.appendChild(el('p', { class: 'k-empty', text: '条件に一致する照会はありません。キーワードを変えるか、「条件をクリア」を選んでください。' }));
      return;
    }
    var tbody = el('tbody');
    list.forEach(function (x) {
      tbody.appendChild(row(x));
      if (openId === x.id) tbody.appendChild(detail(x));
    });
    work.appendChild(el('table', { class: 'k-table' }, [
      el('caption', { class: 'visually-hidden', text: '照会の一覧（' + inquiries.length + '件中' + list.length + '件）。列見出しのボタンで並べ替えできます。' }),
      head(),
      tbody
    ]));
    // 広い幅では、詳細を開く前から右の列を確保して見せる（開いた瞬間に表の幅が変わらない）
    if (openId === null) work.appendChild(el('div', { class: 'k-detail-slot', 'aria-hidden': 'true' }, [el('p', { class: 'k-detail-slot__text' }, [svg(SHORE), el('span', { text: '一覧の「詳細」を選ぶと、ここに表示します。' })])]));
  }

  function openDetail(id) { openId = id; renderList(); $('detail-title').focus(); }
  function closeDetail() {
    var id = openId;
    openId = null;
    renderList();
    var b = $('open-' + id);
    if (b) b.focus();
  }
  function setState(x, state, done) {
    x.state = state;
    x.log.push(md(TODAY) + ' ' + STATES[state].label + 'にした');
    if (view.state && view.state !== state) view.state = ''; // 状態の絞り込みで行が消えないように解除する
    renderList();
    $('detail-title').focus();
    announce(x.id + '「' + x.subject + '」を' + done + '。');
  }

  /* ---------- 週別の受付件数（実測の点と、目安の単調な曲線） ---------- */

  /** 単調3次補間（Fritsch–Carlson）。隣の2点の範囲を超える山・谷を作らない。SVG は上が 0。 */
  function curve(pts) {
    var p = pts.map(function (q) { return [q.x, 100 - q.y]; });
    var n = p.length;
    var s = p.slice(0, -1).map(function (a, i) { return (p[i + 1][1] - a[1]) / (p[i + 1][0] - a[0]); });
    var t = p.map(function (_, i) {
      if (i === 0) return s[0];
      if (i === n - 1) return s[n - 2];
      var a = s[i - 1];
      var b = s[i];
      return a * b <= 0 ? 0 : (Math.sign(a) + Math.sign(b)) * Math.min(Math.abs(a), Math.abs(b), Math.abs(a + b) / 4);
    });
    var f = function (v) { return v.toFixed(2); };
    var d = 'M' + f(p[0][0]) + ' ' + f(p[0][1]);
    for (var i = 0; i < n - 1; i += 1) {
      var h = (p[i + 1][0] - p[i][0]) / 3;
      d += 'C' + f(p[i][0] + h) + ' ' + f(p[i][1] + t[i] * h) + ' ' + f(p[i + 1][0] - h) + ' ' + f(p[i + 1][1] - t[i + 1] * h) + ' ' + f(p[i + 1][0]) + ' ' + f(p[i + 1][1]);
    }
    return d;
  }

  function renderTrend() {
    var counts = WEEKS.map(function (w) {
      return inquiries.filter(function (x) { var d = daysBetween(w, x.received); return d >= 0 && d < 7; }).length;
    });
    var max = Math.max.apply(null, counts);
    var pts = counts.map(function (n, i) { return { x: ((i + 0.5) / counts.length) * 100, y: max ? (n / max) * 78 : 0, n: n, week: WEEKS[i] }; });
    var line = curve(pts);
    var area = line + 'L' + pts[pts.length - 1].x.toFixed(2) + ' 100L' + pts[0].x.toFixed(2) + ' 100Z';
    var box = $('trend');
    box.textContent = '';
    var chart = el('div', { class: 'k-chart' });
    chart.appendChild(svg('<svg class="k-chart__shore" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="k-chart__area" d="' + area + '"/><path class="k-chart__line" d="' + line + '"/></svg>'));
    chart.appendChild(el('ol', { class: 'k-chart__points', 'aria-label': '週別の受付件数（10月19日の週から11月23日の週）' }, pts.map(function (p) {
      return el('li', { style: 'left:' + p.x.toFixed(2) + '%;--y:' + p.y.toFixed(2) + '%', 'data-week': p.week, 'data-count': String(p.n) }, [
        el('span', { class: 'k-chart__stem', 'aria-hidden': 'true' }),
        el('span', { class: 'k-chart__dot', 'aria-hidden': 'true' }),
        el('b', { 'aria-hidden': 'true', text: String(p.n) }),
        el('span', { class: 'k-chart__label' }, [md(p.week), el('span', { class: 'k-chart__label-sub', text: 'の週' })]),
        el('span', { class: 'visually-hidden', text: p.n + '件' })
      ]);
    })));
    box.appendChild(chart);
    box.appendChild(el('p', { class: 'k-chart__note', text: '点が各週（月曜日から日曜日）の受付件数です。線と面は推移の目安で、週の途中の値を示すものではありません。' }));
  }

  /* ---------- 検索（IME の変換中は絞り込まない） ---------- */

  var q = $('q');
  var applySearch = function () { view.q = q.value.trim(); renderList(); };
  q.addEventListener('compositionstart', function () { composing = true; });
  q.addEventListener('compositionend', function () { composing = false; applySearch(); });
  q.addEventListener('input', function (e) { if (!composing && !e.isComposing) applySearch(); });
  $('search').addEventListener('submit', function (e) { e.preventDefault(); applySearch(); });

  /* ---------- 照会の受付 ---------- */

  var form = $('form');
  // 欄は id で取り出す（form.elements[name] は、name が item・reset などのときメソッドを指してしまう）
  var F = function (name) { return $('f-' + name); };
  var FIELDS = { subject: '件名', channel: '受付方法', body: '照会の内容', kind: '照会元の区分', from: '照会元の名前', dept: '担当課', due: '回答期限' };

  function validate() {
    var v = {};
    Object.keys(FIELDS).forEach(function (k) { v[k] = F(k).value.trim(); });
    var errors = [];
    var add = function (name, text) { errors.push({ name: name, text: text }); };
    if (!v.subject) add('subject', '件名を入力してください。');
    else if (v.subject.length > 40) add('subject', '件名は40字以内で入力してください（いま' + v.subject.length + '字）。');
    if (!v.channel) add('channel', '受付方法を選んでください。');
    if (!v.body) add('body', '照会の内容を入力してください。');
    else if (v.body.length > 200) add('body', '照会の内容は200字以内で入力してください（いま' + v.body.length + '字）。');
    if (!v.kind) add('kind', '照会元の区分を選んでください。');
    if (!v.from) add('from', '照会元の名前を入力してください。');
    if (!v.dept) add('dept', '担当課を選んでください。');
    if (!v.due) add('due', '回答期限を選んでください。');
    else if (v.due < TODAY) add('due', '回答期限は今日（11月24日）以降の日にしてください。');
    else if (daysBetween(TODAY, v.due) > MAX_DAYS) add('due', '回答期限は今日から30日以内の日にしてください（いま' + daysBetween(TODAY, v.due) + '日後）。');
    return { values: v, errors: errors };
  }

  function clearErrors() {
    form.querySelectorAll('[data-field]').forEach(function (box) {
      box.classList.remove('is-invalid');
      var e = box.querySelector('.k-error');
      if (e) e.remove();
      box.querySelectorAll('input, select, textarea').forEach(function (c) {
        c.removeAttribute('aria-invalid');
        var ids = (c.getAttribute('aria-describedby') || '').split(' ').filter(function (id) { return id && !/-error$/.test(id); });
        if (ids.length) c.setAttribute('aria-describedby', ids.join(' '));
        else c.removeAttribute('aria-describedby');
      });
    });
    form.querySelectorAll('.k-chapter__err').forEach(function (p) { p.hidden = true; p.textContent = ''; });
    $('errors').hidden = true;
  }

  function showErrors(errors) {
    errors.forEach(function (e) {
      var box = form.querySelector('[data-field="' + e.name + '"]');
      var id = 'f-' + e.name + '-error';
      box.classList.add('is-invalid');
      box.querySelector('.k-label').insertAdjacentElement('afterend', el('p', { class: 'k-error', id: id, text: 'エラー：' + e.text }));
      var c = F(e.name);
      c.setAttribute('aria-invalid', 'true');
      c.setAttribute('aria-describedby', [id].concat((c.getAttribute('aria-describedby') || '').split(' ').filter(Boolean)).join(' '));
    });
    // 章名の陸にも、その章のエラーの件数を文字で出す
    form.querySelectorAll('.k-chapter').forEach(function (ch) {
      var n = ch.querySelectorAll('.k-field.is-invalid').length;
      var p = ch.querySelector('.k-chapter__err');
      p.hidden = !n;
      p.textContent = n ? 'この章に' + n + '件のエラー' : '';
    });
    $('errors-title').textContent = '入力エラーが' + errors.length + '件あります';
    var list = $('error-list');
    list.textContent = '';
    errors.forEach(function (e) {
      list.appendChild(el('li', {}, [action(FIELDS[e.name], 'k-link', function () { F(e.name).focus(); }), '　' + e.text]));
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
    var x = { id: 'Q-' + String(nextNo).padStart(3, '0'), received: TODAY, subject: v.subject, kind: v.kind, from: v.from, channel: v.channel, dept: v.dept, due: v.due, state: 'todo', body: v.body, log: [md(TODAY) + ' 受付'] };
    nextNo += 1;
    inquiries.push(x);
    // 受け付けた照会が一覧から外れないよう、合わない絞り込みは解除する
    if (!matches(x, view.q)) { view.q = ''; q.value = ''; }
    if (view.state && view.state !== x.state) view.state = '';
    openId = null;
    renderList();
    renderTrend();
    form.reset();
    clearErrors();
    $('open-' + x.id).focus();
    announce(x.id + '「' + x.subject + '」を受け付けました（' + x.dept + '、回答期限 ' + mdLong(x.due) + '）。');
  });

  $('clear-form').addEventListener('click', function () { form.reset(); clearErrors(); F('subject').focus(); });
  $('to-form').addEventListener('click', function () { $('entry-title').focus(); });

  var dept = F('dept');
  dept.appendChild(el('option', { value: '', text: '選んでください' }));
  DEPTS.forEach(function (d) { dept.appendChild(el('option', { value: d, text: d })); });

  buildChips();
  renderList();
  renderTrend();
})();
