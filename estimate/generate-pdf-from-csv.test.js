const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { generateEstimatePdfFromCsvText } = require('./generate-pdf-from-csv');

test('generates the first estimate-ready pdf from csv text', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minpaku-generate-pdf-'));
  const csv = [
    '"タイムスタンプ","メールアドレス","お名前（会社名）","ご希望のサービス内容を選択ください\n（複数選択可）\n","【施設管理運営代行、清掃サービスを希望するお客様】\n必要なサービスを選択ください。","【対象施設が既にあるお客様】\n物件平米数","【対象施設が既にあるお客様】\n間取り","【対象施設が既にあるお客様】\n希望最大収容人数","【対象施設が既にあるお客様】\n施設グレード","【対象施設が既にあるお客様】\n施設所在地域のゴミ処理方法\n","【対象施設が既にあるお客様】\nペット対応","【対象施設が既にあるお客様】\n住所","【対象施設が既にあるお客様】\nその他可能な限り\n施設の特別な設備など","宿泊施設の許可の種類\n"',
    '"2026/07/16 14:40:30","clean@example.com","株式会社ヤモリ","清掃サービス","清掃サービス(利用後毎回)","110","4LDK","6","割安 低予算向","ゴミ回収不要","受け入れ可能","余市町","","民泊（住宅宿泊事業）"',
    '"2026/07/16 15:33:05","owner@example.com","和田彩香","施設管理運営代行, 清掃サービス","許可取得, 清掃サービス(利用後毎回)","75","2LDK","6名","高級","業定期的に回収必要","受け入れ不可","石垣市真栄里260","駐車場","民泊（住宅宿泊事業）"',
  ].join('\n');

  const result = generateEstimatePdfFromCsvText(csv, { outputDir, issueDate: '2026年7月16日' });

  assert.equal(result.analysis.name, '和田彩香');
  assert.ok(result.pdfPath.endsWith('.pdf'));
  assert.ok(fs.existsSync(result.pdfPath));
  assert.ok(fs.statSync(result.pdfPath).size > 1000);
});

test('generates a pdf for a requested form row number', () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minpaku-generate-pdf-row-'));
  const csv = [
    '"タイムスタンプ","メールアドレス","お名前（会社名）","ご希望のサービス内容を選択ください\n（複数選択可）\n","【施設管理運営代行、清掃サービスを希望するお客様】\n必要なサービスを選択ください。","【対象施設が既にあるお客様】\n物件平米数","【対象施設が既にあるお客様】\n間取り","【対象施設が既にあるお客様】\n希望最大収容人数","【対象施設が既にあるお客様】\n施設グレード","【対象施設が既にあるお客様】\n施設所在地域のゴミ処理方法\n","【対象施設が既にあるお客様】\nペット対応","【対象施設が既にあるお客様】\n住所","【対象施設が既にあるお客様】\nその他可能な限り\n施設の特別な設備など","宿泊施設の許可の種類\n"',
    '"2026/07/16 15:33:05","owner@example.com","和田彩香","施設管理運営代行, 清掃サービス","許可取得, 清掃サービス(利用後毎回)","75","2LDK","6名","高級","業定期的に回収必要","受け入れ不可","石垣市真栄里260","駐車場","民泊（住宅宿泊事業）"',
    '"2026/07/16 11:57:10","taira@example.com","平良　豊","施設管理運営代行, 清掃サービス","清掃サービス(利用後毎回)","150㎡","","15人位","高級","","","恩納村山田","ジャグジー","旅館業（簡易宿所）"',
  ].join('\n');

  const result = generateEstimatePdfFromCsvText(csv, {
    outputDir,
    issueDate: '2026年7月17日',
    rowNumber: 3,
  });

  assert.equal(result.analysis.name, '平良　豊');
  assert.equal(result.analysis.rowNumber, 3);
  assert.ok(fs.existsSync(result.pdfPath));
});
