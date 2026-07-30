#!/usr/bin/env node

const fs = require('node:fs');

const { classifyRows, readCsvRecords, summarize } = require('./classify-csv');
const { buildSpreadsheetRows } = require('./spreadsheet-rows');

function exportSpreadsheetRowsFromCsvText(csvText, options = {}) {
  const rows = readCsvRecords(csvText);
  const analyses = classifyRows(rows);
  const spreadsheetRows = buildSpreadsheetRows(rows, analyses, options);

  return {
    summary: summarize(analyses),
    ...spreadsheetRows,
  };
}

function main(argv) {
  const [, , csvPath] = argv;
  if (!csvPath) {
    console.error('Usage: node estimate/export-spreadsheet-rows.js path/to/form-responses.csv');
    process.exitCode = 1;
    return;
  }

  const exported = exportSpreadsheetRowsFromCsvText(fs.readFileSync(csvPath, 'utf8'), {
    processedAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
  });
  process.stdout.write(`${JSON.stringify(exported, null, 2)}\n`);
}

if (require.main === module) {
  main(process.argv);
}

module.exports = {
  exportSpreadsheetRowsFromCsvText,
};
