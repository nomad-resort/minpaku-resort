const { FORM_HEADERS } = require('./estimate-logic');
const { formatYen } = require('./pdf-model');
const { text } = require('./utils');

function salutation(name) {
  const raw = text(name);
  if (!raw) return 'ご担当者様';
  if (raw.endsWith('様') || raw.endsWith('御中')) return raw;
  return `${raw}様`;
}

function buildEmailDraft(row, analysis, options = {}) {
  if (analysis.status !== 'estimate_ready') {
    throw new Error('保留行のため顧客向けメール下書きを作成できません。');
  }

  const pdfFileName = options.pdfFileName || '概算お見積書.pdf';
  const customer = salutation(row[FORM_HEADERS.name]);
  const subject = '【Minpaku Resort】概算お見積書のご送付';
  const body = [
    `${customer}`,
    '',
    'この度はMinpaku Resortへお問い合わせいただき、誠にありがとうございます。',
    'ヒアリングフォームにご入力いただいた内容をもとに、PDFにて概算お見積書を作成いたしました。',
    '',
    `添付予定ファイル：${pdfFileName}`,
    '',
    '【概算条件】',
    `施設所在地：${analysis.parsed.address || '未定'}`,
    `施設概要：${analysis.parsed.guests || '-'}名 / ${analysis.parsed.areaSqm || '-'}m2 / ${analysis.parsed.layout || '-'}`,
    `清掃基本単価：${formatYen(analysis.cleaningFeeExTax)}（税抜・清掃回数ごと）`,
    '',
    '本見積はフォーム回答に基づく概算です。物件の状態、設備内容、運用方法の詳細確認後に金額が変動する場合がございます。',
    '内容をご確認いただき、ご不明点や追加のご要望がございましたらお気軽にお知らせください。',
    '',
    'どうぞよろしくお願いいたします。',
    '',
    'Jin Watanabe',
    'Minpaku Resort',
    '電話番号: 070-3188-5667',
    'メールアドレス: jin@nomadresort.com',
  ].join('\n');

  return {
    to: text(row[FORM_HEADERS.email]),
    subject,
    body,
  };
}

module.exports = {
  buildEmailDraft,
};
