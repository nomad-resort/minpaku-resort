const assert = require('node:assert/strict');
const test = require('node:test');

const { buildEmailDraft } = require('./email-draft');
const { analyzeResponse, FORM_HEADERS } = require('./estimate-logic');

function row() {
  return {
    [FORM_HEADERS.name]: '和田彩香',
    [FORM_HEADERS.email]: 'owner@example.com',
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

test('builds a review-ready email draft for an estimate-ready row', () => {
  const analysis = analyzeResponse(row());
  const draft = buildEmailDraft(row(), analysis, {
    pdfFileName: 'MinpakuResort管理サービス概算見積書_20260717_和田彩香様.pdf',
  });

  assert.equal(draft.to, 'owner@example.com');
  assert.match(draft.subject, /概算お見積書/);
  assert.match(draft.body, /和田彩香様/);
  assert.match(draft.body, /PDFにて概算お見積書/);
  assert.match(draft.body, /清掃基本単価：12,500円/);
  assert.match(draft.body, /MinpakuResort管理サービス概算見積書_20260717_和田彩香様.pdf/);
});

test('does not build a customer email for held rows', () => {
  const heldRow = row();
  heldRow[FORM_HEADERS.serviceTypes] = '清掃サービス';

  assert.throws(
    () => buildEmailDraft(heldRow, analyzeResponse(heldRow)),
    /保留/
  );
});
