const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const code = fs.readFileSync(path.join(__dirname, 'apps-script', 'Code.gs'), 'utf8');

test('apps script exposes a spreadsheet-only document generation menu item', () => {
  assert.match(code, /function installEstimateMenu\(\)/);
  assert.match(code, /function onOpen\(\)\s*{\s*installEstimateMenu\(\);\s*}/);
  assert.match(code, /\.addItem\('選択行の見積書\(Doc\)を生成', 'generateDocForSelectedManagementRow'\)/);
  assert.match(code, /function generateDocForSelectedManagementRow\(\)/);
});

test('apps script generates editable Google Docs via Drive conversion', () => {
  assert.match(code, /Utilities\.newBlob\(html, MimeType\.HTML/);
  assert.match(code, /mimeType: MimeType\.GOOGLE_DOCS/);
  assert.match(code, /function insertConvertedDoc\(fileName, folderId, htmlBlob\)/);
  // Drive 高度サービス v2(insert)/v3(create) の両対応
  assert.match(code, /Drive\.Files\.insert === 'function'/);
  assert.match(code, /Drive\.Files\.create === 'function'/);
  assert.match(code, /見積書URL/);
});

test('apps script embeds the logo image and normalizes addresses for geocoding', () => {
  assert.match(code, /const LOGO_DATA_URI = 'data:image\/png;base64,/);
  assert.match(code, /<img src="\$\{LOGO_DATA_URI\}"/);
  assert.match(code, /function normalizeAddressForGeocode\(address\)/);
});

test('apps script inserts real page breaks after conversion instead of CSS breaks', () => {
  assert.doesNotMatch(code, /page-break-before/);
  assert.doesNotMatch(code, /class="page-break"/);
  assert.match(code, /function applyDocPagination\(docId\)/);
  assert.match(code, /appendPageBreak\(\)/);
  assert.match(code, /DOC_PAGE_BREAK_HEADINGS = \['サービス内容', 'その他条件'\]/);
});

test('apps script reads pricing rules from the 料金ルール sheet (E column)', () => {
  assert.match(code, /function loadPricing\(\)/);
  assert.match(code, /function parsePricingValue\(raw\)/);
  assert.match(code, /headers\.indexOf\('キー'\)/);
  assert.match(code, /headers\.indexOf\('値'\)/);
});

test('apps script fills defaults instead of holding on missing fields', () => {
  assert.doesNotMatch(code, /missing_required_fields/);
  assert.match(code, /defaultsApplied/);
  assert.match(code, /const DEFAULTS = \{/);
});

test('apps script computes transport fee with a 2000 yen fallback', () => {
  assert.match(code, /function computeTransport\(address\)/);
  assert.match(code, /function kmToTransportFee\(km\)/);
  assert.match(code, /TRANSPORT_DEFAULT_FEE = 2000/);
  assert.match(code, /msearch\.gsi\.go\.jp\/address-search/);
});

test('apps script renders service details as compact checklist tables', () => {
  assert.match(code, /function serviceChecklistHtml\(table\)/);
  assert.match(code, /class="service-grid"/);
  assert.match(code, /class="service-category"/);
  assert.match(code, /class="service-item"/);
  assert.match(code, /カテゴリ/);
  assert.match(code, /含まれる内容/);
  assert.doesNotMatch(code, /<td>\$\{escapeHtml\(table\.category\)\}<\/td><td>\$\{escapeHtml\(item\)\}<\/td>/);
  assert.doesNotMatch(code, /class="check-grid"/);
});
