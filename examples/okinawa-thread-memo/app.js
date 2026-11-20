// 業務メモ：okinawa-thread-ui Skill の適用見本の動作。
// 外部通信・保存はせず、メモはこのページのメモリ上だけで扱う。file:// でも動くよう、モジュールにしない。
(function () {
  'use strict';

  var STATES = [
    { id: 'todo', label: '未着手' },
    { id: 'doing', label: '進行中' },
    { id: 'done', label: '完了' }
  ];
  var CATEGORIES = ['窓口', '庶務', '会議', 'システム'];
  var TITLE_MAX = 40;
  var BODY_MAX = 400;

  var memos = [
    { no: 1, title: '転入手続きの案内文を窓口用に差し替える', category: '窓口', state: 'doing', due: '2026-11-27', body: '住民課から最新版の案内文を受領済み。\n印刷は 20 部、残りは PDF で共有フォルダーへ。' },
    { no: 2, title: '会議室の予約表を来月分に更新', category: '庶務', state: 'todo', due: '2026-11-30', body: '' },
    { no: 3, title: '定例会議の議事録を確認して回覧する', category: '会議', state: 'done', due: '2026-11-18', body: '課長確認済み。回覧は 11 月 19 日に完了。' },
    { no: 4, title: '申請管理システムの操作研修の日程調整', category: 'システム', state: 'todo', due: '', body: '情報政策課と相談。候補日を 3 つ出してもらう。' },
    { no: 5, title: '窓口の待ち時間の集計（10月分）', category: '窓口', state: 'done', due: '2026-11-10', body: '' },
    { no: 6, title: '消耗品（トナー・封筒）の発注', category: '庶務', state: 'doing', due: '2026-11-25', body: 'トナーは 2 本、長形 3 号の封筒は 500 枚。' },
    { no: 7, title: '特定非営利活動法人やんばる地域づくり協議会からの問い合わせに回答する', category: '窓口', state: 'todo', due: '2026-12-02', body: '補助金の申請様式について。担当係に確認してから電話で回答する。' },
    { no: 8, title: '端末のパスワード変更の周知', category: 'システム', state: 'done', due: '2026-11-14', body: '' }
  ];
  var nextNo = 9;

  var filter = { q: '', state: '' };
  var openNo = null;
  var editingNo = null; // null: 新規、数値: 編集中
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

  var memoId = function (no) { return 'M-' + String(no).padStart(3, '0'); };
  var stateLabel = function (id) { return STATES.filter(function (s) { return s.id === id; })[0].label; };
  var formatDate = function (iso) {
    if (!iso) return '未定';
    var p = iso.split('-');
    return p[0] + '年' + Number(p[1]) + '月' + Number(p[2]) + '日';
  };
  var announce = function (text) { $('status').textContent = text; };

  function matches(m, f) {
    if (f.state && m.state !== f.state) return false;
    if (!f.q) return true;
    var q = f.q.trim().toLowerCase();
    return !q || (m.title + '\n' + m.body).toLowerCase().indexOf(q) !== -1;
  }
  function visible() { return memos.filter(function (m) { return matches(m, filter); }); }
  function countFor(stateId) { return memos.filter(function (m) { return matches(m, { q: filter.q, state: stateId }); }).length; }

  // ---------- 集計 ----------

  function renderSummary() {
    var total = memos.length;
    var by = {};
    STATES.forEach(function (s) { by[s.id] = memos.filter(function (m) { return m.state === s.id; }).length; });
    var rate = total ? Math.round((by.done / total) * 100) : 0;

    var link = function (stateId, label) {
      return el('a', { href: '#list', 'data-state': stateId, text: label });
    };
    var row = function (cls, name, value, def, linkNode) {
      return el('div', { class: 'ot-kpi' + cls }, [
        el('dt', { text: name }),
        el('dd', { class: 'v', text: value }),
        el('dd', { class: 'd', text: def }),
        el('dd', {}, [linkNode])
      ]);
    };
    var kpis = $('kpis');
    kpis.replaceChildren(
      row(' ot-kpi--lead', '全件', total + '件', '登録されているメモの数', link('', '一覧へ')),
      row('', '未着手', by.todo + '件', 'まだ手を付けていないメモ', link('todo', '未着手を見る')),
      row('', '進行中', by.doing + '件', '作業中のメモ', link('doing', '進行中を見る')),
      row('', '完了率', rate + '%', '完了 ' + by.done + '件 ÷ 全件 ' + total + '件', null)
    );

    var max = Math.max.apply(null, CATEGORIES.map(function (c) { return memos.filter(function (m) { return m.category === c; }).length; }).concat(1));
    $('bars').replaceChildren.apply($('bars'), CATEGORIES.map(function (c) {
      var n = memos.filter(function (m) { return m.category === c; }).length;
      return el('li', { class: 'ot-bar' }, [
        el('span', { text: c }),
        el('span', { class: 'ot-bar__track' }, [
          el('span', { class: 'ot-bar__fill', style: '--r:' + (n / max).toFixed(3), 'aria-hidden': 'true' }),
          el('span', { text: n + '件' })
        ])
      ]);
    }));
  }

  // ---------- 絞り込み ----------

  function renderFilter() {
    var group = $('state-filter');
    var options = [{ id: '', label: 'すべて' }].concat(STATES);
    var focusedState = document.activeElement && document.activeElement.closest('#state-filter') ? document.activeElement.dataset.state : null;
    group.replaceChildren.apply(group, options.map(function (s) {
      return el('button', {
        type: 'button', class: 'ot-choice', 'data-state': s.id,
        'aria-pressed': String(filter.state === s.id)
      }, [s.label + '（' + countFor(s.id) + '件）']);
    }));
    if (focusedState !== null) group.querySelector('[data-state="' + focusedState + '"]').focus();
  }

  // ---------- 一覧 ----------

  function detailRow(m) {
    var id = 'detail-' + m.no;
    var nextState = m.state === 'done' ? 'doing' : 'done';
    return el('tr', { class: 'ot-detail', id: id }, [
      el('td', { colspan: '6' }, [
        el('div', { class: 'ot-detail__inner' }, [
          el('dl', { class: 'ot-axis' }, [
            el('dt', { text: '番号' }), el('dd', { text: memoId(m.no) }),
            el('dt', { text: '件名' }), el('dd', { text: m.title }),
            el('dt', { text: '状態' }), el('dd', { text: stateLabel(m.state) }),
            el('dt', { text: '分類' }), el('dd', { text: m.category }),
            el('dt', { text: '期日' }), el('dd', { text: formatDate(m.due) }),
            el('dt', { text: '本文' }), el('dd', { text: m.body || '（なし）' })
          ]),
          el('div', { class: 'ot-actions' }, [
            el('button', { type: 'button', class: 'ot-secondary', 'data-act': 'edit', 'data-no': m.no, text: 'このメモを編集する' }),
            el('button', { type: 'button', class: 'ot-secondary', 'data-act': 'toggle-done', 'data-no': m.no, text: nextState === 'done' ? '完了にする' : '進行中に戻す' }),
            el('button', { type: 'button', class: 'ot-textlink', 'data-act': 'close', 'data-no': m.no, text: '閉じる' })
          ])
        ])
      ])
    ]);
  }

  function renderList() {
    var list = visible();
    if (openNo !== null && !list.some(function (m) { return m.no === openNo; })) openNo = null;

    $('count').textContent = '全 ' + memos.length + ' 件中 ' + list.length + ' 件を表示' + (filter.q || filter.state ? '（絞り込み中）' : '');
    $('clear').hidden = !(filter.q || filter.state);
    $('empty').hidden = list.length > 0;

    var rows = [];
    list.forEach(function (m) {
      var open = m.no === openNo;
      rows.push(el('tr', { class: open ? 'is-open' : null }, [
        el('td', { 'data-label': '番号', text: memoId(m.no) }),
        el('td', { 'data-label': '状態' }, [el('span', { class: 'ot-state', 'data-tone': m.state, text: stateLabel(m.state) })]),
        el('td', { 'data-label': '件名', text: m.title }),
        el('td', { 'data-label': '分類', text: m.category }),
        el('td', { 'data-label': '期日', text: formatDate(m.due) }),
        el('td', {}, [el('button', {
          type: 'button', class: 'ot-textlink', 'data-act': 'detail', 'data-no': m.no,
          'aria-expanded': String(open), 'aria-controls': 'detail-' + m.no
        }, [open ? '詳細を閉じる' : '詳細', el('span', { class: 'ot-visually-hidden', text: '（' + memoId(m.no) + '）' })])])
      ]));
      if (open) rows.push(detailRow(m));
    });
    $('rows').replaceChildren.apply($('rows'), rows);
  }

  function renderAll() { renderSummary(); renderFilter(); renderList(); }

  var detailButton = function (no) { return document.querySelector('[data-act="detail"][data-no="' + no + '"]'); };

  // ---------- 入力フォーム ----------

  function fillStateInput(value) {
    var group = $('state-input');
    group.replaceChildren.apply(group, STATES.map(function (s) {
      var input = el('input', { type: 'radio', name: 'state', value: s.id, id: 'state-' + s.id });
      input.checked = s.id === value;
      return el('label', { class: 'ot-radio', for: 'state-' + s.id }, [input, s.label]);
    }));
  }

  function clearErrors() {
    $('errors').hidden = true;
    $('errors').replaceChildren();
    document.querySelectorAll('.ot-field.is-error').forEach(function (f) { f.classList.remove('is-error'); });
    document.querySelectorAll('.ot-error').forEach(function (p) { p.remove(); });
    document.querySelectorAll('[aria-invalid]').forEach(function (i) {
      i.removeAttribute('aria-invalid');
      var ids = (i.getAttribute('aria-describedby') || '').split(' ').filter(function (x) { return x && x.indexOf('-error') === -1; });
      if (ids.length) i.setAttribute('aria-describedby', ids.join(' ')); else i.removeAttribute('aria-describedby');
    });
  }

  function openForm(no) {
    editingNo = no;
    var m = no === null ? null : memos.filter(function (x) { return x.no === no; })[0];
    clearErrors();
    $('ch-form').textContent = m ? 'メモの編集（' + memoId(m.no) + '）' : '新しいメモ';
    $('title').value = m ? m.title : '';
    $('category').value = m ? m.category : '';
    $('due').value = m ? m.due : '';
    $('body').value = m ? m.body : '';
    fillStateInput(m ? m.state : 'todo');
    $('form-chapter').hidden = false;
    $('ch-form').focus();
    $('form-chapter').scrollIntoView({ block: 'start' });
  }

  function closeForm(focusTarget) {
    $('form-chapter').hidden = true;
    clearErrors();
    var back = editingNo === null ? null : detailButton(editingNo);
    editingNo = null;
    (focusTarget || back || $('new')).focus();
  }

  function validate(values) {
    var errors = [];
    var title = values.title.trim();
    if (!title) errors.push({ field: 'title', text: '件名を入力してください。' });
    else if (title.length > TITLE_MAX) errors.push({ field: 'title', text: '件名は' + TITLE_MAX + '字以内にしてください（いまは ' + title.length + '字）。' });
    if (!values.category) errors.push({ field: 'category', text: '分類を選んでください。' });
    if (!values.state) errors.push({ field: 'state', text: '状態を選んでください。' });
    if (values.body.length > BODY_MAX) errors.push({ field: 'body', text: '本文は' + BODY_MAX + '字以内にしてください（いまは ' + values.body.length + '字）。' });
    return errors;
  }

  var LABELS = { title: '件名', category: '分類', state: '状態', body: '本文' };

  function showErrors(errors) {
    var box = $('errors');
    box.replaceChildren(
      el('h3', { text: 'エラー：' + errors.length + '件の入力を直してください' }),
      el('ul', {}, errors.map(function (e) {
        var target = e.field === 'state' ? 'state-' + STATES[0].id : e.field;
        return el('li', {}, [el('a', { href: '#' + target, 'data-target': target, text: LABELS[e.field] + '：' + e.text })]);
      }))
    );
    box.hidden = false;
    errors.forEach(function (e) {
      var field = $('f-' + e.field);
      field.classList.add('is-error');
      var msgId = e.field + '-error';
      var holder = e.field === 'state' ? $('state-input').parentNode : $(e.field).parentNode;
      var msg = el('p', { class: 'ot-error', id: msgId, text: 'エラー：' + e.text });
      if (e.field === 'state') holder.appendChild(msg); else holder.insertBefore(msg, $(e.field).nextSibling);
      var inputs = e.field === 'state' ? [$('state-input')] : [$(e.field)];
      inputs.forEach(function (i) {
        i.setAttribute('aria-invalid', 'true');
        var ids = (i.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
        i.setAttribute('aria-describedby', [msgId].concat(ids).join(' '));
      });
    });
    box.focus();
  }

  function save(event) {
    event.preventDefault();
    var checked = document.querySelector('input[name="state"]:checked');
    var values = {
      title: $('title').value,
      category: $('category').value,
      state: checked ? checked.value : '',
      due: $('due').value,
      body: $('body').value
    };
    clearErrors();
    var errors = validate(values);
    if (errors.length) { showErrors(errors); return; }

    var no = editingNo;
    var record = { title: values.title.trim(), category: values.category, state: values.state, due: values.due, body: values.body.trim() };
    if (no === null) {
      no = nextNo++;
      memos.unshift(Object.assign({ no: no }, record));
    } else {
      Object.assign(memos.filter(function (m) { return m.no === no; })[0], record);
    }
    // 保存したメモが見えるよう、絞り込みで隠れる場合は条件を解除する
    if (!matches(memos.filter(function (m) { return m.no === no; })[0], filter)) {
      filter = { q: '', state: '' };
      $('q').value = '';
    }
    openNo = no;
    renderAll();
    announce('メモ ' + memoId(no) + ' を保存しました。');
    editingNo = null;
    $('form-chapter').hidden = true;
    detailButton(no).focus();
  }

  // ---------- イベント ----------

  $('q').addEventListener('compositionstart', function () { composing = true; });
  $('q').addEventListener('compositionend', function (e) { composing = false; filter.q = e.target.value; renderFilter(); renderList(); });
  $('q').addEventListener('input', function (e) {
    if (composing || e.isComposing) return; // 変換中は絞り込まない
    filter.q = e.target.value;
    renderFilter();
    renderList();
  });

  $('state-filter').addEventListener('click', function (e) {
    var b = e.target.closest('[data-state]');
    if (!b) return;
    filter.state = b.dataset.state;
    renderFilter();
    renderList();
  });

  $('kpis').addEventListener('click', function (e) {
    var a = e.target.closest('a[data-state]');
    if (!a) return;
    e.preventDefault();
    filter = { q: '', state: a.dataset.state };
    $('q').value = '';
    renderFilter();
    renderList();
    $('ch-list').setAttribute('tabindex', '-1');
    $('ch-list').focus();
    announce('一覧を「' + (a.dataset.state ? stateLabel(a.dataset.state) : 'すべて') + '」で表示しています。');
  });

  $('clear').addEventListener('click', function () {
    filter = { q: '', state: '' };
    $('q').value = '';
    renderFilter();
    renderList();
    $('q').focus();
  });

  $('rows').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b) return;
    var no = Number(b.dataset.no);
    var act = b.dataset.act;
    if (act === 'detail') {
      openNo = openNo === no ? null : no;
      renderList();
      detailButton(no).focus();
    } else if (act === 'close') {
      openNo = null;
      renderList();
      detailButton(no).focus();
    } else if (act === 'edit') {
      openForm(no);
    } else if (act === 'toggle-done') {
      var m = memos.filter(function (x) { return x.no === no; })[0];
      m.state = m.state === 'done' ? 'doing' : 'done';
      if (!matches(m, filter)) openNo = null;
      renderAll();
      announce('メモ ' + memoId(no) + ' を「' + stateLabel(m.state) + '」にしました。');
      var target = document.querySelector('[data-act="toggle-done"][data-no="' + no + '"]') || $('count');
      if (target === $('count')) { $('ch-list').setAttribute('tabindex', '-1'); target = $('ch-list'); }
      target.focus();
    }
  });

  $('errors').addEventListener('click', function (e) {
    var a = e.target.closest('a[data-target]');
    if (!a) return;
    e.preventDefault();
    $(a.dataset.target).focus();
  });

  $('new').addEventListener('click', function () { openForm(null); });
  $('cancel').addEventListener('click', function () { closeForm(); });
  $('form').addEventListener('submit', save);
  $('form-chapter').addEventListener('keydown', function (e) { if (e.key === 'Escape') closeForm(); });

  var select = $('category');
  CATEGORIES.forEach(function (c) { select.appendChild(el('option', { value: c, text: c })); });

  renderAll();
})();
