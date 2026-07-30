const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { analyzeResponse, FORM_HEADERS } = require('./estimate-logic');
const { buildPdfModel } = require('./pdf-model');

test('renders an estimate pdf with searchable Japanese text', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minpaku-estimate-pdf-'));
  const modelPath = path.join(tempDir, 'model.json');
  const pdfPath = path.join(tempDir, 'estimate.pdf');
  const textPath = path.join(tempDir, 'text.txt');
  const row = {
    [FORM_HEADERS.timestamp]: '2026/07/16 15:33:05',
    [FORM_HEADERS.email]: 'owner@example.com',
    [FORM_HEADERS.name]: '和田彩香',
    [FORM_HEADERS.serviceTypes]: '許可取得、宿泊施設立ち上げ, 施設管理運営代行, 清掃サービス',
    [FORM_HEADERS.requestedServices]: '許可取得, 集客、カスタマーサポート, 清掃サービス(利用後毎回)',
    [FORM_HEADERS.area]: '75',
    [FORM_HEADERS.layout]: '2LDK',
    [FORM_HEADERS.guests]: '6名',
    [FORM_HEADERS.grade]: '高級',
    [FORM_HEADERS.trash]: '敷地内にゴミ集積所の設置スペース有（業定期的に回収必要）',
    [FORM_HEADERS.pet]: '受け入れ不可',
    [FORM_HEADERS.address]: '石垣市真栄里260',
    [FORM_HEADERS.specialEquipment]: '駐車場',
    [FORM_HEADERS.permitType]: '民泊（住宅宿泊事業）',
  };

  fs.writeFileSync(
    modelPath,
    JSON.stringify(buildPdfModel(row, analyzeResponse(row), { issueDate: '2026年7月16日' }), null, 2)
  );

  const render = spawnSync('python3', ['estimate/render-pdf.py', modelPath, pdfPath], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
  });
  assert.equal(render.status, 0, render.stderr || render.stdout);
  assert.ok(fs.existsSync(pdfPath));
  assert.ok(fs.statSync(pdfPath).size > 1000);

  const extract = spawnSync('python3', ['-c', `
from pypdf import PdfReader
import sys
reader = PdfReader(sys.argv[1])
text = "\\n".join(page.extract_text() or "" for page in reader.pages)
open(sys.argv[2], "w", encoding="utf-8").write(text)
`, pdfPath, textPath], { encoding: 'utf8' });
  assert.equal(extract.status, 0, extract.stderr || extract.stdout);
  const extracted = fs.readFileSync(textPath, 'utf8');
  assert.match(extracted, /概算お見積書/);
  assert.match(extracted, /和田彩香様/);
  assert.match(extracted, /清掃回数 x 12,500円/);
  assert.match(extracted, /フルサービスの場合は不動産管理と同様に/);
  assert.match(extracted, /月末閉め後約1ヶ月で精算致します/);
  assert.match(extracted, /契約は年単位での更新となります/);
  assert.match(extracted, /サービス内容の変更または停止は3ヶ月前までに通知が必要になります/);
  assert.match(extracted, /M I N P A K U/);
  assert.match(extracted, /R E S O R T/);
});
