// 既存 DOM を新しい HTML に合わせて最小限だけ書き換える。
// 入力中の欄やフォーカス・スクロール位置を保ったまま再描画するために使う。

function syncAttributes(from, to) {
  for (const { name } of [...from.attributes]) {
    if (!to.hasAttribute(name)) from.removeAttribute(name);
  }
  for (const { name, value } of [...to.attributes]) {
    if (from.getAttribute(name) !== value) from.setAttribute(name, value);
  }
}

/** 子要素を差分更新する前に、新しい側のフォーム値を読み取る（子ノードは更新時に移動されるため）。 */
function readFormState(to) {
  if (to instanceof HTMLTextAreaElement) return { value: to.value };
  if (to instanceof HTMLSelectElement) {
    const selected = to.querySelector('option[selected]');
    return { value: selected ? selected.value : to.options[0]?.value ?? '' };
  }
  if (to instanceof HTMLInputElement) {
    return { value: to.getAttribute('value') ?? '', checked: to.hasAttribute('checked') };
  }
  return null;
}

function syncFormState(from, desired) {
  if (!desired) return;
  if (from instanceof HTMLInputElement) {
    if (from.type === 'checkbox' || from.type === 'radio') {
      from.checked = desired.checked;
    } else if (from !== document.activeElement && from.value !== desired.value) {
      // フォーカス中の入力欄は利用者の入力（IME 変換中を含む）を優先する
      from.value = desired.value;
    }
  } else if (from instanceof HTMLTextAreaElement) {
    if (from !== document.activeElement && from.value !== desired.value) from.value = desired.value;
  } else if (from instanceof HTMLSelectElement) {
    if (from.value !== desired.value) from.value = desired.value;
  }
}

function sameKind(a, b) {
  return a.nodeType === b.nodeType && a.nodeName === b.nodeName;
}

function morphNode(from, to) {
  if (from.nodeType === Node.TEXT_NODE || from.nodeType === Node.COMMENT_NODE) {
    if (from.nodeValue !== to.nodeValue) from.nodeValue = to.nodeValue;
    return;
  }
  syncAttributes(from, to);
  const desired = readFormState(to);
  // textarea の中身は value で同期する（子のテキストを差し替えると入力済みの値が壊れるため触らない）
  if (!(from instanceof HTMLTextAreaElement)) morphChildren(from, to);
  syncFormState(from, desired);
}

/** id を持つ要素は id で対応づける（前後に要素が増減しても、入力中の欄を作り直さない）。 */
const keyOf = (node) => (node.nodeType === Node.ELEMENT_NODE && node.id) || null;

export function morphChildren(parent, next) {
  const newChildren = [...next.childNodes];
  const keep = new Set(newChildren.map(keyOf).filter(Boolean));
  for (const old of [...parent.children]) {
    const key = keyOf(old);
    if (key && !keep.has(key)) old.remove();
  }

  let cursor = parent.firstChild;
  for (const child of newChildren) {
    const key = keyOf(child);
    let match = null;
    if (key) {
      match = [...parent.children].find((el) => el.id === key && el.nodeName === child.nodeName) ?? null;
    } else if (cursor && !keyOf(cursor) && sameKind(cursor, child)) {
      match = cursor;
    }

    if (!match) {
      parent.insertBefore(child, cursor);
      continue;
    }
    // 対応する要素の手前にある、新しい側に対応のない古い要素は取り除く
    while (cursor && cursor !== match && !keyOf(cursor)) {
      const following = cursor.nextSibling;
      cursor.remove();
      cursor = following;
    }
    if (cursor !== match) parent.insertBefore(match, cursor);
    morphNode(match, child);
    cursor = match.nextSibling;
  }
  while (cursor) {
    const following = cursor.nextSibling;
    cursor.remove();
    cursor = following;
  }
}

const template = document.createElement('template');

/** container の中身を html に置き換える。replace=true なら差分を取らずに入れ替える。 */
export function patch(container, htmlString, { replace = false } = {}) {
  if (replace) {
    container.innerHTML = htmlString;
    return;
  }
  template.innerHTML = htmlString;
  morphChildren(container, template.content);
}
