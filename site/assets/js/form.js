// 新規申請フォームの定義・検証・状態遷移。DOM に依存しない純粋関数のみ。
//
// フォームの状態（form）は URL に載せず、ページを開いている間だけメモリに持つ。
// 氏名やメールアドレスが URL・履歴に残らないよう、state.js（URL 対象）とは分けている。
//
//   form = { values, errors, submitted, step }
//   step: 'edit'（入力）→ 'confirm'（確認）→ 'done'（完了）

import { APPLICATION_TYPES, FORM_SAMPLES } from './data.js';
import { formatDate } from './query.js';

export const STEPS = [
  { value: 'edit', label: '入力' },
  { value: 'confirm', label: '確認' },
  { value: 'done', label: '完了' },
];

/** 項目の定義。ラベルと補足は共通で、見せ方（配置・必須表記・エラー表示）はデザイン側で決める。 */
export const FORM_FIELDS = [
  {
    name: 'name',
    label: '申請者氏名',
    required: true,
    control: 'text',
    autocomplete: 'name',
    hint: '住民票に記載されている氏名を入力してください。',
    example: '例：青木 さくら',
  },
  {
    name: 'kana',
    label: 'ふりがな',
    required: true,
    control: 'text',
    autocomplete: 'off',
    hint: 'ひらがなで入力してください。',
    example: '例：あおき さくら',
  },
  {
    name: 'email',
    label: 'メールアドレス',
    required: true,
    control: 'email',
    autocomplete: 'email',
    hint: '受付完了のお知らせを送ります。半角で入力してください。',
    example: '例：sakura@example.com',
  },
  {
    name: 'phone',
    label: '電話番号',
    required: false,
    control: 'tel',
    autocomplete: 'tel',
    hint: '日中に連絡がとれる番号。ハイフンはあってもなくても構いません。',
    example: '例：090-1234-5678',
  },
  {
    name: 'type',
    label: '申請種別',
    required: true,
    control: 'select',
    options: APPLICATION_TYPES,
    placeholder: '選択してください',
    hint: '手続きの種類を選んでください。',
  },
  {
    name: 'date',
    label: '希望日',
    required: true,
    control: 'date',
    hint: '手続きを希望する日を選んでください。',
  },
  {
    name: 'body',
    label: '申請内容',
    required: true,
    control: 'textarea',
    rows: 5,
    hint: '希望や事情を具体的に入力してください。改行できます。',
  },
  {
    name: 'agree',
    label: '確認事項への同意',
    required: true,
    control: 'checkbox',
    checkLabel: '記載内容に誤りがないことを確認し、申請の審査に必要な範囲で個人情報が利用されることに同意します。',
  },
];

export const FIELD_NAMES = FORM_FIELDS.map((f) => f.name);
const FIELD_BY_NAME = new Map(FORM_FIELDS.map((f) => [f.name, f]));

export const EMPTY_VALUES = Object.freeze({
  name: '',
  kana: '',
  email: '',
  phone: '',
  type: '',
  date: '',
  body: '',
  agree: false,
});

export const MESSAGES = {
  name: { required: '申請者氏名を入力してください' },
  kana: {
    required: 'ふりがなを入力してください',
    format: 'ふりがなは、ひらがなで入力してください',
  },
  email: {
    required: 'メールアドレスを入力してください',
    format: 'メールアドレスは、半角で「sakura@example.com」の形式で入力してください',
  },
  phone: { format: '電話番号は、数字とハイフンで10桁または11桁を入力してください' },
  type: { required: '申請種別を選択してください' },
  date: { required: '希望日を入力してください' },
  body: { required: '申請内容を入力してください' },
  agree: { consent: '確認事項に同意してください' },
};

/* ---------- 検証 ---------- */

const KANA = /^[ぁ-ゖゝゞー　 ]+$/; // ひらがな・長音・空白
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const PHONE_DIGITS = /^0\d{9,10}$/;

const blank = (v) => String(v ?? '').trim() === '';

/** 値の検証。エラーのある項目だけを { 項目名: 'required' | 'format' | 'consent' } で返す。 */
export function validate(values) {
  const errors = {};
  if (blank(values.name)) errors.name = 'required';

  if (blank(values.kana)) errors.kana = 'required';
  else if (!KANA.test(values.kana.trim())) errors.kana = 'format';

  if (blank(values.email)) errors.email = 'required';
  else if (!EMAIL.test(values.email.trim())) errors.email = 'format';

  if (!blank(values.phone)) {
    const digits = values.phone.trim().normalize('NFKC').replace(/[-－ー‐\s]/g, '');
    if (!PHONE_DIGITS.test(digits)) errors.phone = 'format';
  }

  if (blank(values.type)) errors.type = 'required';
  if (blank(values.date)) errors.date = 'required';
  if (blank(values.body)) errors.body = 'required';
  if (!values.agree) errors.agree = 'consent';
  return errors;
}

export const hasErrors = (errors) => Object.keys(errors).length > 0;

/* ---------- 状態遷移（すべて新しい form を返す） ---------- */

export function createForm() {
  return { values: { ...EMPTY_VALUES }, errors: {}, submitted: false, step: 'edit' };
}

/** 値を更新する。送信を試みた後は、修正に合わせてエラーも更新する。 */
export function setValue(form, name, value) {
  if (!FIELD_BY_NAME.has(name) || form.values[name] === value) return form;
  const values = { ...form.values, [name]: value };
  return { ...form, values, errors: form.submitted ? validate(values) : form.errors };
}

/** 「確認へ」：エラーがあれば入力画面のまま、なければ確認画面へ進む。 */
export function submit(form) {
  const errors = validate(form.values);
  if (hasErrors(errors)) return { ...form, errors, submitted: true, step: 'edit' };
  return { ...form, errors: {}, submitted: true, step: 'confirm' };
}

export const back = (form) => ({ ...form, step: 'edit' });
export const complete = (form) => (form.step === 'confirm' ? { ...form, step: 'done' } : form);

/** 比較用の入力例。valid は正常な入力、invalid はすべての種類のエラーを含む入力（検証済みの状態）。 */
export function fillSample(kind) {
  const values = { ...EMPTY_VALUES, ...FORM_SAMPLES[kind] };
  if (kind === 'invalid') return { values, errors: validate(values), submitted: true, step: 'edit' };
  return { values, errors: {}, submitted: false, step: 'edit' };
}

/* ---------- 表示用のモデル ---------- */

/** 確認画面などで表示する値。 */
export function displayValue(field, value) {
  if (field.control === 'checkbox') return value ? '同意する' : '同意しない';
  if (field.control === 'date') return value ? formatDate(value) : '';
  if (field.name === 'phone' && !value) return '入力なし';
  return value;
}

/** デザインへ渡すフォームのモデル。 */
export function buildFormModel(form) {
  const fields = FORM_FIELDS.map((f) => {
    const code = form.errors[f.name] ?? null;
    return {
      ...f,
      value: form.values[f.name],
      display: displayValue(f, form.values[f.name]),
      error: code ? { code, text: MESSAGES[f.name][code] } : null,
    };
  });
  const firstError = fields.find((f) => f.error);
  if (firstError) firstError.first = true;
  const errorList = fields.filter((f) => f.error).map((f) => ({ name: f.name, label: f.label, text: f.error.text }));
  const stepIndex = STEPS.findIndex((s) => s.value === form.step);
  return {
    step: form.step,
    stepIndex,
    steps: STEPS.map((s, i) => ({ ...s, number: i + 1, current: i === stepIndex, done: i < stepIndex })),
    fields,
    errorList,
    errorCount: errorList.length,
  };
}
