const { buildEmailDraft } = require('./email-draft');

const MANAGEMENT_HEADERS = [
  '回答ID',
  'フォーム行番号',
  '回答タイムスタンプ',
  'メールアドレス',
  'お名前（会社名）',
  'サービス判定',
  '処理ステータス',
  '保留理由',
  '概算清掃単価（税抜）',
  '初期設定費（税抜）',
  'PDFファイル名',
  'PDF保存先URL',
  'メール下書き本文',
  '処理日時',
  '最終更新者',
  'メモ',
];

const HOLD_HEADERS = [
  '回答ID',
  'フォーム行番号',
  '回答タイムスタンプ',
  'メールアドレス',
  'お名前（会社名）',
  '保留カテゴリ',
  '保留理由',
  '次アクション',
  '担当者',
  'ステータス',
  '更新日時/メモ',
];

function holdReason(analysis) {
  return analysis.holds.map((hold) => hold.reason).join('\n');
}

function serviceLabel(analysis) {
  if (analysis.serviceDecision === 'full_package') return 'フルパッケージ';
  if (analysis.serviceDecision === 'cleaning_only') return '清掃サービスのみ';
  return '対象外';
}

function nextActionForHold(hold) {
  if (hold.category === 'cleaning_only') return '別清掃会社紹介フローで対応予定';
  if (hold.category === 'multiple_properties') return '物件ごとの見積対象を確認';
  return '担当者確認';
}

function buildManagementRow(row, analysis, options = {}) {
  const responseId = analysis.responseId;
  const pdfFileName = options.pdfFileNameByResponseId?.[responseId] || '';
  const pdfUrl = options.pdfUrlByResponseId?.[responseId] || '';
  const draft = analysis.status === 'estimate_ready'
    ? buildEmailDraft(row, analysis, { pdfFileName }).body
    : '';

  return [
    responseId,
    analysis.rowNumber || '',
    analysis.timestamp,
    analysis.email,
    analysis.name,
    serviceLabel(analysis),
    analysis.status === 'estimate_ready' ? '作成済み・要確認' : '保留',
    holdReason(analysis),
    analysis.cleaningFeeExTax || '',
    analysis.initialSetupFeeExTax || '',
    pdfFileName,
    pdfUrl,
    draft,
    options.processedAt || '',
    options.updatedBy || 'Codex',
    '',
  ];
}

function buildHoldRowsForAnalysis(analysis, options = {}) {
  return analysis.holds.map((hold) => [
    analysis.responseId,
    analysis.rowNumber || '',
    analysis.timestamp,
    analysis.email,
    analysis.name,
    hold.category,
    hold.reason,
    nextActionForHold(hold),
    options.assignee || '',
    '未対応',
    options.processedAt || '',
  ]);
}

function buildSpreadsheetRows(rows, analyses, options = {}) {
  return analyses.reduce((result, analysis, index) => {
    result.managementRows.push(buildManagementRow(rows[index], analysis, options));
    if (analysis.status === 'hold') {
      result.holdRows.push(...buildHoldRowsForAnalysis(analysis, options));
    }
    return result;
  }, { managementRows: [], holdRows: [] });
}

module.exports = {
  HOLD_HEADERS,
  MANAGEMENT_HEADERS,
  buildManagementRow,
  buildSpreadsheetRows,
};
