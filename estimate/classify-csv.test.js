const assert = require('node:assert/strict');
const test = require('node:test');

const { classifyCsvText } = require('./classify-csv');

test('classifies csv rows and preserves commas and newlines inside quoted cells', () => {
  const csv = [
    '"タイムスタンプ","メールアドレス","お名前（会社名）","ご希望のサービス内容を選択ください\n（複数選択可）\n","【施設管理運営代行、清掃サービスを希望するお客様】\n必要なサービスを選択ください。","【対象施設が既にあるお客様】\n物件平米数","【対象施設が既にあるお客様】\n間取り","【対象施設が既にあるお客様】\n希望最大収容人数","【対象施設が既にあるお客様】\n施設グレード","【対象施設が既にあるお客様】\n施設所在地域のゴミ処理方法\n","【対象施設が既にあるお客様】\nペット対応","【対象施設が既にあるお客様】\n住所","【対象施設が既にあるお客様】\nその他可能な限り\n施設の特別な設備など","宿泊施設の許可の種類\n"',
    '"2026/07/16 15:33:05","owner@example.com","和田彩香","施設管理運営代行, 清掃サービス","許可取得, 清掃サービス(利用後毎回)","75","2LDK","6名","高級","敷地内にゴミ集積所の設置スペース有（業定期的に回収必要）","受け入れ不可","石垣市真栄里260","駐車場,\nメモあり","民泊（住宅宿泊事業）"',
    '"2026/07/16 14:40:30","clean@example.com","株式会社ヤモリ","清掃サービス","清掃サービス(利用後毎回), リネンクリーニング","110","4LDK","6","割安 低予算向","敷地内に行政が回収可能なゴミ集積所有（ゴミ回収不要）","受け入れ可能","余市郡余市町富沢町","","民泊（住宅宿泊事業）"',
  ].join('\n');

  const results = classifyCsvText(csv);

  assert.equal(results.length, 2);
  assert.equal(results[0].status, 'estimate_ready');
  assert.equal(results[0].cleaningFeeExTax, 12500);
  assert.equal(results[1].status, 'hold');
  assert.equal(results[1].holds[0].category, 'cleaning_only');
});
