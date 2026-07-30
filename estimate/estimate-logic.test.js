const assert = require('node:assert/strict');
const test = require('node:test');

const {
  analyzeResponse,
  calculateCleaningFee,
  FORM_HEADERS,
} = require('./estimate-logic');

function row(overrides = {}) {
  return {
    [FORM_HEADERS.timestamp]: '2026/07/16 15:33:05',
    [FORM_HEADERS.email]: 'owner@example.com',
    [FORM_HEADERS.name]: '和田彩香',
    [FORM_HEADERS.serviceTypes]: '許可取得、宿泊施設立ち上げ, 施設管理運営代行, 清掃サービス',
    [FORM_HEADERS.requestedServices]: '許可取得, 集客、カスタマーサポート, 施設備品管理, 清掃サービス(利用後毎回), リネンクリーニング, 消耗品サプライ, 駆け付けサービス, 民泊管理契約',
    [FORM_HEADERS.area]: '75',
    [FORM_HEADERS.layout]: '2LDK',
    [FORM_HEADERS.guests]: '6名',
    [FORM_HEADERS.grade]: '高級',
    [FORM_HEADERS.trash]: '敷地内にゴミ集積所の設置スペース有（業定期的に回収必要）',
    [FORM_HEADERS.pet]: '受け入れ不可',
    [FORM_HEADERS.address]: '石垣市真栄里260ファインレジデンス石垣島904',
    [FORM_HEADERS.specialEquipment]: '駐車場',
    [FORM_HEADERS.permitType]: '民泊（住宅宿泊事業）',
    ...overrides,
  };
}

test('calculates cleaning fee from simulator values with luxury coefficient', () => {
  assert.equal(calculateCleaningFee({ areaSqm: 75, guests: 6, grade: '高級' }), 12500);
  assert.equal(calculateCleaningFee({ areaSqm: 150, guests: 15, grade: '高級' }), 20625);
});

test('creates a full-package estimate decision with current pricing rules', () => {
  const result = analyzeResponse(row());

  assert.equal(result.status, 'estimate_ready');
  assert.equal(result.serviceDecision, 'full_package');
  assert.equal(result.cleaningFeeExTax, 12500);
  assert.equal(result.initialSetupFeeExTax, 75000);
  assert.equal(result.permitSupportFeeExTax, 150000);
  assert.equal(result.trashFeePerCleaningExTax, 1000);
  assert.equal(result.petCleaningFeePerCleaningExTax, 0);
  assert.deepEqual(result.holds, []);
});

test('uses higher setup and permit prices when 3LDK and simple lodging are selected', () => {
  const result = analyzeResponse(row({
    [FORM_HEADERS.area]: '100㎡',
    [FORM_HEADERS.layout]: '3LDK',
    [FORM_HEADERS.grade]: 'スタンダード',
    [FORM_HEADERS.permitType]: '旅館業（簡易宿所）',
  }));

  assert.equal(result.status, 'estimate_ready');
  assert.equal(result.cleaningFeeExTax, 10000);
  assert.equal(result.initialSetupFeeExTax, 100000);
  assert.equal(result.permitSupportFeeExTax, 200000);
});

test('holds cleaning-only inquiries without creating an estimate', () => {
  const result = analyzeResponse(row({
    [FORM_HEADERS.serviceTypes]: '清掃サービス',
    [FORM_HEADERS.requestedServices]: '清掃サービス(利用後毎回), リネンクリーニング',
  }));

  assert.equal(result.status, 'hold');
  assert.equal(result.serviceDecision, 'cleaning_only');
  assert.match(result.holds[0].reason, /清掃サービスのみ/);
});

test('holds likely multi-building responses', () => {
  const result = analyzeResponse(row({
    [FORM_HEADERS.area]: '名護市久志 全2棟 （95.22平米、98.95平米）東村平良 全2棟 （61.27平米、70.38平米）',
    [FORM_HEADERS.address]: '・名護市久志136　・東村平良511',
  }));

  assert.equal(result.status, 'hold');
  assert.ok(result.holds.some((hold) => hold.category === 'multiple_properties'));
});

test('applies default values instead of holding when required inputs are missing', () => {
  const result = analyzeResponse(row({
    [FORM_HEADERS.area]: '',
    [FORM_HEADERS.guests]: '',
    [FORM_HEADERS.layout]: '',
    [FORM_HEADERS.grade]: '',
    [FORM_HEADERS.address]: '',
  }));

  // 不足項目は保留にせず、デフォルト値で見積を作成する
  assert.equal(result.status, 'estimate_ready');
  assert.ok(result.holds.every((hold) => hold.category !== 'missing_required_fields'));
  assert.equal(result.parsed.areaSqm, 100);
  assert.equal(result.parsed.guests, 8);
  assert.equal(result.parsed.layout, '3LDK');
  assert.equal(result.parsed.addressDisplay, '未確認');
  assert.ok(result.defaultsApplied.some((item) => item.includes('物件平米数')));
  assert.ok(result.defaultsApplied.some((item) => item.includes('住所')));
  // 面積100㎡・8名・標準グレードの概算清掃単価
  assert.equal(result.cleaningFeeExTax, 11000);
});
