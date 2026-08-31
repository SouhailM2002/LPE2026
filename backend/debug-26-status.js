const { parseCsvFile, calculateSummary } = require('./index.js');
const rows = parseCsvFile('C:/Users/souha/Downloads/TEST FONC CO 591 M05/TEST FONC CO 591 M05/26/TRACA 26.csv');
const summary = calculateSummary(rows);
const statusCounts = {};
for (const row of rows) {
  const status = String(row['Status Carte'] || '').trim().toUpperCase();
  statusCounts[status] = (statusCounts[status] || 0) + 1;
}
console.log(JSON.stringify({ statusCounts, summaryPassed: summary.passedBoards, summaryFailed: summary.failedBoards, summaryTotalRows: summary.totalRows, passRate: summary.passRate, failRate: summary.failRate }, null, 2));
