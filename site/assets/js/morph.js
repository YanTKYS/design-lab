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

function syncFormState(from, to) {
  if (from instanceof HTMLInputElement) {
    if (from.type === 'checkbox' || from.type === 'radio') {
      from.checked = to.hasAttribute('checked');
    } else if (from !== document.activeElement && from.value !== (to.getAttribute('value') ?? '')) {
      // フォーカス中の入力欄は利用者の入力（IME 変換中を含む）を優先する
      from.value = to.getAttribute('value') ?? '';
    }
  } else if (from instanceof HTMLSelectElement) {
    const selected = to.querySelector('option[selected]');
    const value = selected ? selected.value : to.options[0]?.value ?? '';
    if (from.value !== value) from.value = value;
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
  morphChildren(from, to);
  syncFormState(from, to);
}

export function morphChildren(parent, next) {
  const oldChildren = [...parent.childNodes];
  const newChildren = [...next.childNodes];
  newChildren.forEach((child, i) => {
    const current = oldChildren[i];
    if (!current) {
      parent.appendChild(child);
    } else if (sameKind(current, child)) {
      morphNode(current, child);
    } else {
      parent.replaceChild(child, current);
    }
  });
  for (let i = newChildren.length; i < oldChildren.length; i += 1) oldChildren[i].remove();
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
