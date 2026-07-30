const assert = require('node:assert/strict');
const test = require('node:test');

const { analyzeResponse, FORM_HEADERS } = require('./estimate-logic');
const {
  HOLD_HEADERS,
  MANAGEMENT_HEADERS,
  buildSpreadsheetRows,
} = require('./spreadsheet-rows');

function fullPackageRow() {
  return {
    [FORM_HEADERS.timestamp]: '2026/07/16 15:33:05',
    [FORM_HEADERS.email]: 'owner@example.com',
    [FORM_HEADERS.name]: '和田彩香',
    [FORM_HEADERS.serviceTypes]: '施設管理運営代行, 清掃サービス',
    [FORM_HEADERS.requestedServices]: '許可取得, 清掃サービス(利用後毎回)',
    [FORM_HEADERS.area]: '75',
    [FORM_HEADERS.layout]: '2LDK',
    [FORM_HEADERS.guests]: '6名',
    [FORM_HEADERS.grade]: '高級',
    [FORM_HEADERS.trash]: '業定期的に回収必要',
    [FORM_HEADERS.pet]: '受け入れ不可',
    [FORM_HEADERS.address]: '石垣市真栄里260',
    [FORM_HEADERS.specialEquipment]: '駐車場',
    [FORM_HEADERS.permitType]: '民泊（住宅宿泊事業）',
  };
}

function cleaningOnlyRow() {
  return {
    ...fullPackageRow(),
    [FORM_HEADERS.email]: 'clean@example.com',
    [FORM_HEADERS.name]: '株式会社ヤモリ',
    [FORM_HEADERS.serviceTypes]: '清掃サービス',
  };
}

test('builds management and hold rows for spreadsheet writeback', () => {
  const rows = [fullPackageRow(), cleaningOnlyRow()];
  const analyses = rows.map((row, index) => analyzeResponse(row, { rowNumber: index + 2 }));
  const result = buildSpreadsheetRows(rows, analyses, {
    processedAt: '2026/07/17 23:30:00',
    pdfUrlByResponseId: {
      [analyses[0].responseId]: 'https://drive.example/pdf',
    },
    pdfFileNameByResponseId: {
      [analyses[0].responseId]: 'estimate.pdf',
    },
  });

  assert.equal(MANAGEMENT_HEADERS.length, 16);
  assert.equal(HOLD_HEADERS.length, 11);
  assert.equal(result.managementRows.length, 2);
  assert.equal(result.holdRows.length, 1);
  assert.equal(result.managementRows[0][6], '作成済み・要確認');
  assert.equal(result.managementRows[0][8], 12500);
  assert.equal(result.managementRows[0][10], 'estimate.pdf');
  assert.match(result.managementRows[0][12], /PDFにて概算お見積書/);
  assert.equal(result.managementRows[1][6], '保留');
  assert.match(result.managementRows[1][7], /清掃サービスのみ/);
  assert.equal(result.holdRows[0][5], 'cleaning_only');
  assert.equal(result.holdRows[0][9], '未対応');
});
