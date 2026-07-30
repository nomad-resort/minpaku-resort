#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const { classifyRows, readCsvRecords } = require('./classify-csv');
const { buildPdfModel } = require('./pdf-model');
const { datePart, safeFilePart } = require('./utils');

function renderPdf(modelPath, pdfPath) {
  const result = spawnSync('python3', ['estimate/render-pdf.py', modelPath, pdfPath], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'PDF生成に失敗しました。');
  }
}

function generateEstimatePdfFromCsvText(csvText, options = {}) {
  const outputDir = options.outputDir || path.resolve(__dirname, '..', 'output', 'pdf');
  const rows = readCsvRecords(csvText);
  const analyses = classifyRows(rows);
  const index = options.rowNumber
    ? analyses.findIndex((analysis) => analysis.rowNumber === Number(options.rowNumber))
    : analyses.findIndex((analysis) => analysis.status === 'estimate_ready');

  if (index === -1) {
    throw new Error(options.rowNumber
      ? `指定されたフォーム行番号が見つかりませんでした: ${options.rowNumber}`
      : '見積作成可能な行が見つかりませんでした。');
  }

  const analysis = analyses[index];
  if (analysis.status !== 'estimate_ready') {
    throw new Error(`指定行は保留のためPDFを生成できません: ${analysis.holds.map((hold) => hold.reason).join(' / ')}`);
  }
  const row = rows[index];
  const model = buildPdfModel(row, analysis, { issueDate: options.issueDate });
  const baseName = `MinpakuResort管理サービス概算見積書_${datePart(model.issueDate)}_${safeFilePart(analysis.name)}様`;
  const modelPath = path.join(outputDir, `${baseName}.json`);
  const pdfPath = path.join(outputDir, `${baseName}.pdf`);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(modelPath, JSON.stringify(model, null, 2), 'utf8');
  renderPdf(modelPath, pdfPath);

  return {
    analysis,
    modelPath,
    pdfPath,
  };
}

function main(argv) {
  const [, , csvPath, outputDirArg, rowNumberArg] = argv;
  if (!csvPath) {
    console.error('Usage: node estimate/generate-pdf-from-csv.js path/to/form-responses.csv [output-dir]');
    process.exitCode = 1;
    return;
  }

  const result = generateEstimatePdfFromCsvText(
    fs.readFileSync(csvPath, 'utf8'),
    {
      outputDir: outputDirArg || path.resolve('output/pdf'),
      rowNumber: rowNumberArg ? Number(rowNumberArg) : null,
    }
  );
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (require.main === module) {
  main(process.argv);
}

module.exports = {
  generateEstimatePdfFromCsvText,
};
