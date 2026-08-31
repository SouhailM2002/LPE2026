const { parseCsvFile, calculateSummary } = require('./index.js');
const rows = parseCsvFile('../TRACA.csv');
const summary = calculateSummary(rows);

const idMap = new Map();
let rawNok = 0;
let rawOk = 0;
let uniqueNok = 0;
let uniqueOk = 0;

for (const row of rows) {
  const ns = String(row.NS || '').trim();
  const status = String(row['Status Carte'] || '').trim().toUpperCase();

  if (!ns) continue;
  if (status === 'NOK') rawNok += 1;
  if (status === 'OK') rawOk += 1;

  if (!idMap.has(ns)) {
    idMap.set(ns, status);
    if (status === 'NOK') uniqueNok += 1;
    if (status === 'OK') uniqueOk += 1;
  }
}

console.log(JSON.stringify({
  totalRaw: rows.length,
  totalUniqueBoardRows: summary.totalRows,
  passedBoards: summary.passedBoards,
  failedBoards: summary.failedBoards,
  passRate: summary.passRate,
  failRate: summary.failRate,
  untestedBoards: summary.untestedBoards,
  firstTryValidatedBoards: summary.firstTryValidatedBoards,
  firstTryValidatedRate: summary.firstTryValidatedRate,
  rawNOKs: rawNok,
  rawOKs: rawOk,
  uniqueNOKBoards: uniqueNok,
  uniqueOKBoards: uniqueOk,
  uniqueBoardIds: idMap.size,
}, null, 2));
