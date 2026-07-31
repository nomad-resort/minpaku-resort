const assert = require('node:assert/strict');
const test = require('node:test');

const { analyzeResponse, FORM_HEADERS } = require('./estimate-logic');
const { buildPdfModel, formatYen } = require('./pdf-model');

function row() {
  return {
    [FORM_HEADERS.timestamp]: '2026/07/16 15:33:05',
    [FORM_HEADERS.email]: 'owner@example.com',
    [FORM_HEADERS.name]: '和田彩香',
    [FORM_HEADERS.serviceTypes]: '許可取得、宿泊施設立ち上げ, 施設管理運営代行, 清掃サービス',
    [FORM_HEADERS.requestedServices]: '許可取得, 集客、カスタマーサポート, 施設備品管理, 清掃サービス(利用後毎回), リネンクリーニング, 消耗品サプライ, 駆け付けサービス, 民泊管理契約',
    [FORM_HEADERS.area]: '75',
    [FORM_HEADERS.layout]: '2LDK',
    [FORM_HEADERS.beds]: 'シングル2、クイーン1、エアベッドシングル2',
    [FORM_HEADERS.guests]: '6名',
    [FORM_HEADERS.grade]: '高級',
    [FORM_HEADERS.trash]: '敷地内にゴミ集積所の設置スペース有（業定期的に回収必要）',
    [FORM_HEADERS.pet]: '受け入れ不可',
    [FORM_HEADERS.address]: '石垣市真栄里260ファインレジデンス石垣島904',
    [FORM_HEADERS.specialEquipment]: '駐車場',
    [FORM_HEADERS.permitType]: '民泊（住宅宿泊事業）',
  };
}

test('formats yen amounts for estimate tables', () => {
  assert.equal(formatYen(13000), '13,000円');
  assert.equal(formatYen(0), '0円');
});

test('builds a pdf model from an estimate-ready analysis result', () => {
  const analysis = analyzeResponse(row(), { rowNumber: 39 });
  const model = buildPdfModel(row(), analysis, { issueDate: '2026年7月16日' });

  assert.equal(model.customerName, '和田彩香様');
  assert.equal(model.issueDate, '2026年7月16日');
  assert.match(model.facilitySummary, /収容人数6名、75m2、2LDK/);
  assert.deepEqual(model.priceRows.slice(0, 4), [
    ['許可取得サポート', '150,000円'],
    ['販売開始OTA準備、初期設定', '75,000円'],
    ['管理、カスタマーサービス', '売上合計 x 15%'],
    ['一棟 清掃サービス 基本単価（リネンクリーニング込）', '清掃回数 x 12,500円'],
  ]);
  assert.equal(model.serviceTables.length, 4);
  assert.deepEqual(model.serviceTables[0].headers, ['区分', '内容']);
  assert.equal(model.serviceTables[0].category, '管理、マーケティング業務');
  assert.ok(model.serviceTables[3].items.includes('シャンプー及びコンディショナー'));
  assert.ok(model.notes.some((note) => note.includes('リネンサプライ')));
  assert.deepEqual(model.paymentTerms, [
    'フルサービスの場合は不動産管理と同様に、弊社アカウントにて集金し、必要経費を控除した上で、オーナー様に剰余金をお振込みいたします。',
    'OTAの入金期間に依存しますが、月末閉め後約1ヶ月で精算致します。',
    '契約は年単位での更新となります。',
    'サービス内容の変更または停止は3ヶ月前までに通知が必要になります。',
  ]);
  assert.ok(!model.otherTerms.some((term) => term.includes('契約は年単位')));
});

test('does not build a pdf model for held rows', () => {
  const heldRow = row();
  heldRow[FORM_HEADERS.serviceTypes] = '清掃サービス';
  const analysis = analyzeResponse(heldRow);

  assert.throws(() => buildPdfModel(heldRow, analysis), /保留/);
});
