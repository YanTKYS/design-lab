// 部屋の予約台帳：h-prime-ui Skill の適用見本の動作。
// 外部通信・保存はせず、予約はこのページのメモリ上だけで扱う。file:// でも動くよう、モジュールにしない。
(function () {
  'use strict';

  var ROOMS = [
    { id: 'r1', label: '第1会議室', capacity: 30 },
    { id: 'r2', label: '第2会議室', capacity: 12 },
    { id: 'jp', label: '和室', capacity: 20 },
    { id: 'ck', label: '調理室', capacity: 16 }
  ];
  var STATES = {
    tentative: { label: '仮予約', mark: '○' },
    confirmed: { label: '確定', mark: '●' },
    cancelled: { label: '取消', mark: '×' }
  };
  var OPEN = 9;
  var CLOSE = 21;
  var LAST_DATE = '2026-12-31';
  var CORP = /^(特定非営利活動法人|一般社団法人|一般財団法人|社会福祉法人|株式会社|有限会社|合同会社)\s*/;

  var bookings = [
    { no: 101, date: '2026-11-24', room: 'jp', start: 9, end: 11, purpose: '茶道の稽古', group: 'さくら野茶道の会', person: '木村 千尋', phone: '090-1111-2222', people: 12, state: 'confirmed' },
    { no: 102, date: '2026-11-24', room: 'r1', start: 10, end: 12, purpose: '役員会', group: '中央地区自治会連合会', person: '加藤 翔', phone: '080-3333-4444', people: 24, state: 'confirmed' },
    { no: 103, date: '2026-11-24', room: 'ck', start: 10, end: 13, purpose: '子ども食堂の仕込み', group: '子ども食堂ひだまり', person: '小川 陽子', phone: '070-5555-6666', people: 10, state: 'tentative' },
    { no: 104, date: '2026-11-24', room: 'r2', start: 13, end: 15, purpose: '打合せ', group: '架空市社会福祉協議会', person: '遠藤 大輔', phone: '0120-000-111', people: 8, state: 'confirmed' },
    { no: 105, date: '2026-11-24', room: 'r1', start: 13, end: 16, purpose: '読み聞かせ講座', group: '特定非営利活動法人 まちの本棚', person: '上田 美穂', phone: '090-7777-8888', people: 28, state: 'tentative' },
    { no: 106, date: '2026-11-24', room: 'jp', start: 18, end: 20, purpose: '書道教室', group: '書道サークル 墨の会', person: '石井 健太', phone: '080-9999-0000', people: 6, state: 'cancelled' },
    { no: 107, date: '2026-11-25', room: 'r2', start: 10, end: 12, purpose: '健康相談', group: '架空市 保健センター', person: '青木 さくら', phone: '0120-222-333', people: 4, state: 'confirmed' },
    { no: 108, date: '2026-11-25', room: 'ck', start: 14, end: 17, purpose: '料理教室', group: '一般社団法人 食と暮らしの学校', person: '林 由紀', phone: '090-4444-1212', people: 16, state: 'tentative' }
  ];
  var nextNo = 109;

  var view = { date: '2026-11-24', room: '' };
  var openNo = null;
  var detailBox = document.getElementById('detail');
  // 狭い幅では面が縦に積まれるため、列の直後に置くと詳細が選んだ帯から離れる。狭い幅だけ、選んだ帯の中（開閉ボタンの直後）に置く。
  var narrow = window.matchMedia('(max-width: 759px)');

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

  var roomOf = function (id) { return ROOMS.filter(function (r) { return r.id === id; })[0]; };
  var hh = function (h) { return String(h).padStart(2, '0') + ':00'; };
  var timeText = function (b) { return hh(b.start) + '–' + hh(b.end); };
  var bookingId = function (no) { return 'R-' + no; };
  var WEEK = ['日', '月', '火', '水', '木', '金', '土'];
  var parse = function (iso) { var p = iso.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  var dayText = function (iso) { var d = parse(iso); return (d.getMonth() + 1) + '月' + d.getDate() + '日（' + WEEK[d.getDay()] + '）'; };
  var shiftDay = function (iso, n) {
    var d = parse(iso);
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  var announce = function (text) {
    // 同じ文でも読み上げられるよう、一度空にしてから入れる
    var s = $('status');
    s.textContent = '';
    window.setTimeout(function () { s.textContent = text; }, 30);
  };

  /** その日の予約を時刻の順に。DOM の先頭が右端の面になる。 */
  function dayBookings(all) {
    return bookings
      .filter(function (b) { return b.date === view.date && (all || !view.room || b.room === view.room); })
      .sort(function (a, b) {
        return a.start - b.start || ROOMS.indexOf(roomOf(a.room)) - ROOMS.indexOf(roomOf(b.room)) || a.no - b.no;
      });
  }

  /* ---------- 部屋の選択 ---------- */

  var ROOM_ITEMS = [{ id: '', label: 'すべて' }].concat(ROOMS);
  var roomInputId = function (id) { return 'room-' + (id || 'all'); };

  /** ラジオは最初に1回だけ作る（作り直すと、キーボードで選んだラジオのフォーカスが失われ、矢印キーで続けて移れない）。 */
  function buildRooms() {
    var box = $('rooms');
    ROOM_ITEMS.forEach(function (r) {
      var input = el('input', { type: 'radio', name: 'room-filter', value: r.id, id: roomInputId(r.id) });
      input.addEventListener('change', function () {
        view.room = r.id;
        if (openNo !== null && r.id && bookingOf(openNo).room !== r.id) openNo = null;
        renderDay();
      });
      box.appendChild(el('label', { class: 'hp-choice', for: input.id }, [
        input,
        el('span', {}, [r.label, el('span', { class: 'hp-n', id: input.id + '-n' })])
      ]));
    });
  }

  /** 描き直しでは、選択の状態とその日の件数だけを更新する。 */
  function renderRooms() {
    var all = dayBookings(true);
    ROOM_ITEMS.forEach(function (r) {
      $(roomInputId(r.id)).checked = view.room === r.id;
      $(roomInputId(r.id) + '-n').textContent = all.filter(function (b) { return !r.id || b.room === r.id; }).length + '件';
    });
  }

  /* ---------- 面と詳細 ---------- */

  var bookingOf = function (no) { return bookings.filter(function (b) { return b.no === no; })[0]; };

  function face(b) {
    var corp = b.group.match(CORP);
    var name = corp ? b.group.slice(corp[0].length) : b.group;
    var open = openNo === b.no;
    var st = STATES[b.state];
    var btn = el('button', {
      type: 'button', class: 'hp-face__btn', id: 'open-' + b.no,
      'aria-expanded': open ? 'true' : 'false', 'aria-controls': 'detail'
    }, [open ? '詳細を閉じる' : '詳細を開く', el('span', { 'aria-hidden': 'true', text: open ? '－' : '＋' })]);
    btn.addEventListener('click', function () {
      if (openNo === b.no) closeDetail();
      else openDetail(b.no);
    });
    return el('li', { class: 'hp-face' + (open ? ' is-open' : '') + (b.state === 'cancelled' ? ' is-cancelled' : ''), 'data-no': b.no }, [
      el('p', { class: 'hp-face__id' }, [el('span', { class: 'hp-mono', text: timeText(b) }), el('small', { text: roomOf(b.room).label })]),
      el('div', { class: 'hp-face__tate' }, [
        el('p', { class: 'hp-name' + (name.length > 8 ? ' is-long' : '') }, [corp ? el('small', { text: corp[1] }) : null, name]),
        el('p', { class: 'hp-sub', text: b.purpose })
      ]),
      el('p', { class: 'hp-face__st' }, [el('span', { 'aria-hidden': 'true', text: st.mark + ' ' }), st.label, el('span', { class: 'hp-face__people', text: '　' + b.people + '人' })]),
      btn
    ]);
  }

  function renderDetail() {
    var box = detailBox;
    var b = openNo === null ? null : bookingOf(openNo);
    box.textContent = '';
    box.hidden = !b;
    if (!b) return;
    var room = roomOf(b.room);
    var st = STATES[b.state];
    var item = function (term, value, cls) { return el('div', { class: cls || '' }, [el('dt', { text: term }), el('dd', {}, [value])]); };
    var actions = el('div', { class: 'hp-detail__actions' });
    if (b.state === 'tentative') actions.appendChild(actionButton('確定にする', 'hp-btn hp-btn--light', function () { setState(b, 'confirmed', '確定にしました'); }));
    if (b.state !== 'cancelled') actions.appendChild(actionButton('取り消す', 'hp-btn hp-btn--outline-light', function () { setState(b, 'cancelled', '取り消しました'); }));
    actions.appendChild(actionButton('詳細を閉じる', 'hp-link hp-link--light', closeDetail));
    box.appendChild(el('h3', { id: 'detail-title', class: 'hp-detail__title', tabindex: '-1', text: '予約詳細' }));
    box.appendChild(el('div', { class: 'hp-detail__who' }, [
      el('p', {}, [el('small', { text: '予約番号' }), el('b', { class: 'hp-mono', text: bookingId(b.no) })]),
      el('p', {}, [el('small', { text: '団体名' }), el('b', { class: 'hp-detail__name', text: b.group })]),
      el('p', {}, [el('small', { text: '担当者' }), b.person + '　' + b.phone])
    ]));
    box.appendChild(el('div', { class: 'hp-detail__body' }, [
      el('p', { class: 'hp-detail__use' }, [el('small', { text: '利用目的' }), b.purpose]),
      el('dl', {}, [
        item('状態', el('span', {}, [el('span', { 'aria-hidden': 'true', text: st.mark + ' ' }), st.label])),
        item('利用日', dayText(b.date)),
        item('時間', el('span', { class: 'hp-mono', text: timeText(b) })),
        item('部屋', room.label + '（定員' + room.capacity + '人）'),
        item('人数', b.people + '人')
      ]),
      actions
    ]));
  }

  function actionButton(label, cls, onClick) {
    var b = el('button', { type: 'button', class: cls, text: label });
    b.addEventListener('click', onClick);
    return b;
  }

  function setState(b, state, done) {
    b.state = state;
    renderDay();
    $('detail-title').focus();
    announce(bookingId(b.no) + '「' + b.group + '」を' + done + '。');
  }

  function openDetail(no) {
    openNo = no;
    renderDay();
    $('detail-title').focus();
  }

  function closeDetail() {
    var no = openNo;
    openNo = null;
    renderDay();
    var btn = $('open-' + no);
    if (btn) btn.focus();
  }

  function renderDay() {
    var list = dayBookings(false);
    var all = dayBookings(true);
    var active = all.filter(function (b) { return b.state !== 'cancelled'; });
    var n = function (s) { return all.filter(function (b) { return b.state === s; }).length; };
    if (openNo !== null && !list.some(function (b) { return b.no === openNo; })) openNo = null;

    $('day-title').textContent = dayText(view.date) + 'の予約';
    $('view-date').value = view.date;
    renderRooms();
    var text = 'この日の予約 ' + active.length + '件（仮予約 ' + n('tentative') + '・確定 ' + n('confirmed') + '）';
    if (n('cancelled')) text += '　取消 ' + n('cancelled') + '件';
    if (view.room) text += '　表示中：' + roomOf(view.room).label + ' ' + list.length + '件';
    $('count').textContent = text;

    var faces = $('faces');
    placeDetail(true); // 面を描き直す前に、詳細を列の外へ戻す
    faces.textContent = '';
    list.forEach(function (b) { faces.appendChild(face(b)); });
    faces.hidden = list.length === 0;
    $('dir').hidden = list.length < 2;
    $('empty').hidden = list.length !== 0;
    $('empty').querySelector('p').textContent = view.room ? 'この日の' + roomOf(view.room).label + 'の予約はありません。' : 'この日の予約はありません。';
    renderDetail();
    placeDetail(false);
  }

  function placeDetail(home) {
    var openFace = home || openNo === null ? null : $('faces').querySelector('[data-no="' + openNo + '"]');
    if (narrow.matches && openFace) openFace.appendChild(detailBox);
    else if (detailBox.previousElementSibling !== $('empty')) $('empty').insertAdjacentElement('afterend', detailBox);
  }

  narrow.addEventListener('change', function () {
    var hadFocus = detailBox.contains(document.activeElement);
    placeDetail(false);
    if (hadFocus) $('detail-title').focus();
  });

  function goDay(iso) {
    if (!iso) return;
    view.date = iso;
    openNo = null;
    renderDay();
  }

  /* ---------- 予約の入力 ---------- */

  var form = $('form');
  var F = function (name) { return form.elements[name]; };
  var FIELD_FOCUS = { date: 'f-date', room: 'f-room', time: 'f-start', purpose: 'f-purpose', group: 'f-group', person: 'f-person', phone: 'f-phone', people: 'f-people', agree: 'f-agree' };
  var FIELD_LABEL = { date: '利用日', room: '部屋', time: '利用時間', purpose: '利用目的', group: '団体名', person: '担当者の氏名', phone: '電話番号', people: '利用人数', agree: '利用の決まりの確認' };

  function fillOptions() {
    var room = F('room');
    room.appendChild(el('option', { value: '', text: '選んでください' }));
    ROOMS.forEach(function (r) { room.appendChild(el('option', { value: r.id, text: r.label + '（' + r.capacity + '人）' })); });
    var start = F('start');
    var end = F('end');
    start.appendChild(el('option', { value: '', text: '開始' }));
    end.appendChild(el('option', { value: '', text: '終了' }));
    for (var h = OPEN; h < CLOSE; h += 1) start.appendChild(el('option', { value: h, text: hh(h) }));
    for (var k = OPEN + 1; k <= CLOSE; k += 1) end.appendChild(el('option', { value: k, text: hh(k) }));
  }

  function validate() {
    var v = {
      date: F('date').value, room: F('room').value, start: Number(F('start').value), end: Number(F('end').value),
      purpose: F('purpose').value.trim(), group: F('group').value.trim(), person: F('person').value.trim(),
      phone: F('phone').value.trim(), people: F('people').value.trim(), agree: F('agree').checked
    };
    var errors = [];
    var add = function (name, text) { errors.push({ name: name, text: text }); };
    if (!v.date) add('date', '利用日を選んでください。');
    else if (v.date < '2026-11-24' || v.date > LAST_DATE) add('date', '利用日は2026年11月24日から12月31日までの日を選んでください。');
    if (!v.room) add('room', '部屋を選んでください。');
    if (!F('start').value || !F('end').value) add('time', '開始と終了の時刻を選んでください。');
    else if (v.end <= v.start) add('time', '終了の時刻は、開始より後にしてください。');
    else if (v.date && v.room) {
      var hit = bookings.filter(function (b) {
        return b.date === v.date && b.room === v.room && b.state !== 'cancelled' && b.start < v.end && v.start < b.end;
      })[0];
      if (hit) add('time', roomOf(v.room).label + 'は ' + timeText(hit) + ' に「' + hit.group + '」の予約があります。別の時間か部屋を選んでください。');
    }
    if (!v.purpose) add('purpose', '利用目的を入力してください。');
    else if (v.purpose.length > 30) add('purpose', '利用目的は30字以内で入力してください（いま' + v.purpose.length + '字）。');
    if (!v.group) add('group', '団体名を入力してください。個人の利用は氏名を入力します。');
    else if (v.group.length > 40) add('group', '団体名は40字以内で入力してください（いま' + v.group.length + '字）。');
    if (!v.person) add('person', '担当者の氏名を入力してください。');
    var digits = v.phone.replace(/[-ー－‐\s]/g, '');
    if (!v.phone) add('phone', '電話番号を入力してください。');
    else if (!/^0\d{9,10}$/.test(digits)) add('phone', '電話番号は0から始まる10桁か11桁の数字で入力してください。');
    var people = Number(v.people.replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xfee0); }));
    if (!v.people) add('people', '利用人数を入力してください。');
    else if (!Number.isInteger(people) || people < 1) add('people', '利用人数は1以上の数字で入力してください。');
    else if (v.room && people > roomOf(v.room).capacity) add('people', roomOf(v.room).label + 'の定員は' + roomOf(v.room).capacity + '人です。人数を減らすか、ほかの部屋を選んでください。');
    if (!v.agree) add('agree', '申込者へ利用の決まりを伝えたら、チェックを入れてください。');
    v.people = people;
    return { values: v, errors: errors };
  }

  function clearErrors() {
    form.querySelectorAll('[data-field]').forEach(function (box) {
      box.classList.remove('is-invalid');
      var e = box.querySelector('.hp-error');
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
      var msg = el('p', { class: 'hp-error', id: id }, [el('span', { 'aria-hidden': 'true', text: '！' }), 'エラー：' + e.text]);
      var label = box.querySelector('.hp-label');
      label.insertAdjacentElement('afterend', msg);
      box.querySelectorAll('input, select').forEach(function (c) {
        c.setAttribute('aria-invalid', 'true');
        c.setAttribute('aria-describedby', [id].concat((c.getAttribute('aria-describedby') || '').split(' ').filter(Boolean)).join(' '));
      });
    });
    $('errors-title').textContent = '入力エラーが' + errors.length + '件あります';
    var list = $('error-list');
    list.textContent = '';
    errors.forEach(function (e) {
      var b = el('button', { type: 'button', class: 'hp-link', text: FIELD_LABEL[e.name] });
      b.addEventListener('click', function () { $(FIELD_FOCUS[e.name]).focus(); });
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
    var b = { no: nextNo, date: v.date, room: v.room, start: v.start, end: v.end, purpose: v.purpose, group: v.group, person: v.person, phone: v.phone, people: v.people, state: 'tentative' };
    nextNo += 1;
    bookings.push(b);
    view.date = b.date;
    if (view.room && view.room !== b.room) view.room = '';
    openNo = null;
    renderDay();
    resetForm(b.date);
    $('open-' + b.no).focus();
    announce(dayText(b.date) + ' ' + roomOf(b.room).label + ' ' + timeText(b) + ' に「' + b.group + '」の仮予約を登録しました（' + bookingId(b.no) + '）。');
  });

  function resetForm(date) {
    form.reset();
    clearErrors();
    F('date').value = date || view.date;
  }

  /* ---------- 日の切り替え ---------- */

  $('prev-day').addEventListener('click', function () { goDay(shiftDay(view.date, -1)); });
  $('next-day').addEventListener('click', function () { goDay(shiftDay(view.date, 1)); });
  $('view-date').addEventListener('change', function (e) { goDay(e.target.value); });
  $('clear-form').addEventListener('click', function () { resetForm(); F('date').focus(); });
  $('empty-entry').addEventListener('click', function () {
    F('date').value = view.date;
    if (view.room) F('room').value = view.room;
    F('date').focus();
  });

  fillOptions();
  buildRooms();
  F('date').value = view.date;
  renderDay();
})();
