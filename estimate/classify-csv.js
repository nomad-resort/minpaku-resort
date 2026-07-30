#!/usr/bin/env node

const fs = require('node:fs');
const { analyzeResponse } = require('./estimate-logic');
const { stripBom } = require('./utils');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((candidate) => candidate.some((value) => value !== ''));
}

function rowsToObjects(rows) {
  const [headers, ...dataRows] = rows;
  return dataRows.map((values) => {
    const object = {};
    headers.forEach((header, index) => {
      object[header] = values[index] || '';
    });
    return object;
  });
}

function readCsvRecords(csvText) {
  return rowsToObjects(parseCsv(stripBom(csvText)));
}

function classifyRows(rows) {
  return rows.map((row, index) => (
    analyzeResponse(row, { rowNumber: index + 2 })
  ));
}

function classifyCsvText(csvText) {
  return classifyRows(readCsvRecords(csvText));
}

function summarize(results) {
  return {
    total: results.length,
    estimateReady: results.filter((result) => result.status === 'estimate_ready').length,
    hold: results.filter((result) => result.status === 'hold').length,
    byHoldCategory: results.reduce((counts, result) => {
      result.holds.forEach((hold) => {
        counts[hold.category] = (counts[hold.category] || 0) + 1;
      });
      return counts;
    }, {}),
  };
}

function main(argv) {
  const [, , csvPath] = argv;
  if (!csvPath) {
    console.error('Usage: node estimate/classify-csv.js path/to/form-responses.csv');
    process.exitCode = 1;
    return;
  }

  const csvText = fs.readFileSync(csvPath, 'utf8');
  const results = classifyCsvText(csvText);
  const output = {
    summary: summarize(results),
    results,
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

if (require.main === module) {
  main(process.argv);
}

module.exports = {
  classifyCsvText,
  classifyRows,
  parseCsv,
  readCsvRecords,
  rowsToObjects,
  summarize,
};
