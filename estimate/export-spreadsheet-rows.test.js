const assert = require('node:assert/strict');
const test = require('node:test');

const { exportSpreadsheetRowsFromCsvText } = require('./export-spreadsheet-rows');

test('exports spreadsheet writeback rows from csv text', () => {
  const csv = [
    '"タイムスタンプ","メールアドレス","お名前（会社名）","ご希望のサービス内容を選択ください\n（複数選択可）\n","【施設管理運営代行、清掃サービスを希望するお客様】\n必要なサービスを選択ください。","【対象施設が既にあるお客様】\n物件平米数","【対象施設が既にあるお客様】\n間取り","【対象施設が既にあるお客様】\n希望最大収容人数","【対象施設が既にあるお客様】\n施設グレード","【対象施設が既にあるお客様】\n施設所在地域のゴミ処理方法\n","【対象施設が既にあるお客様】\nペット対応","【対象施設が既にあるお客様】\n住所","【対象施設が既にあるお客様】\nその他可能な限り\n施設の特別な設備など","宿泊施設の許可の種類\n"',
    '"2026/07/16 15:33:05","owner@example.com","和田彩香","施設管理運営代行, 清掃サービス","許可取得, 清掃サービス(利用後毎回)","75","2LDK","6名","高級","業定期的に回収必要","受け入れ不可","石垣市真栄里260","駐車場","民泊（住宅宿泊事業）"',
  ].join('\n');

  const exported = exportSpreadsheetRowsFromCsvText(csv, { processedAt: '2026/07/17 23:40:00' });

  assert.equal(exported.summary.total, 1);
  assert.equal(exported.managementRows.length, 1);
  assert.equal(exported.holdRows.length, 0);
  assert.equal(exported.managementRows[0][6], '作成済み・要確認');
});
