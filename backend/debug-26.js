const { parseCsvFile, calculateSummary } = require('./index.js');
const rows = parseCsvFile('C:/Users/souha/Downloads/TEST FONC CO 591 M05/TEST FONC CO 591 M05/26/TRACA 26.csv');
const summary = calculateSummary(rows);

const rawStatusCounts = { OK: 0, NOK: 0, blank: 0 };
for (const row of rows) {
  const status = String(row['Status Carte'] || '').trim().toUpperCase();
  if (status === 'OK') rawStatusCounts.OK += 1;
  else if (status === 'NOK') rawStatusCounts.NOK += 1;
  else rawStatusCounts.blank += 1;
}

console.log(JSON.stringify({
  rawRows: rows.length,
  rawStatusCounts,
  uniqueBoards: summary.totalRows,
  passedBoards: summary.passedBoards,
  failedBoards: summary.failedBoards,
  passRate: summary.passRate,
  failRate: summary.failRate,
  firstTryValidatedRate: summary.firstTryValidatedRate,
  firstTryValidatedBoards: summary.firstTryValidatedBoards,
}, null, 2));
