const assert = require('assert');
const { calculateSummary } = require('./index.js');

const rows = [
  {
    NS: 'B-100',
    'Status Carte': 'OK',
    'Presence Connecteur': 'OK',
    'Presence Blandage': 'OK',
    'Presence C2': 'OK',
    'Presence C24': 'OK',
    'Temps Test': '14,6',
    'INPUT CURRENT (NO TRIGER)': '0,000',
  },
  {
    NS: 'B-100',
    'Status Carte': 'OK',
    'Presence Connecteur': 'OK',
    'Presence Blandage': 'OK',
    'Presence C2': 'OK',
    'Presence C24': 'OK',
    'Temps Test': '14,6',
    'INPUT CURRENT (NO TRIGER)': '0,000',
  },
  {
    NS: 'B-200',
    'Status Carte': 'NOK',
    'Presence Connecteur': 'OK',
    'Presence Blandage': 'OK',
    'Presence C2': 'OK',
    'Presence C24': 'OK',
    'Temps Test': '12,5',
    'INPUT CURRENT (NO TRIGER)': '-1,000',
  },
  { NS: '', 'Status Carte': 'NOK', 'Presence Connecteur': 'FAIL' },
  {
    NS: 'B-300',
    'Status Carte': 'OK',
    'Presence Connecteur': 'OK',
    'Presence Blandage': 'OK',
    'Presence C2': 'OK',
    'Presence C24': 'OK',
    'Temps Test': '14,6',
    'INPUT CURRENT (NO TRIGER)': '0,500',
  },
  {
    NS: 'B-300',
    'Status Carte': 'OK',
    'Presence Connecteur': 'OK',
    'Presence Blandage': 'OK',
    'Presence C2': 'OK',
    'Presence C24': 'OK',
    'Temps Test': '14,6',
    'INPUT CURRENT (NO TRIGER)': '0,500',
  },
];

const summary = calculateSummary(rows);

assert.strictEqual(summary.totalRows, 3, 'Boards tested should ignore duplicates and blank IDs');
assert.strictEqual(summary.uniquePassedBoards, 2, 'unique passed cards should count unique NS values that end in OK');
assert.strictEqual(summary.uniqueFailedBoards, 1, 'unique failed cards should count unique NS values that end in NOK');
assert.strictEqual(summary.passedBoards, 4, 'pass rate should count valid duplicated board status rows, not unique boards');
assert.strictEqual(summary.failedBoards, 1, 'fail rate should count valid NOK rows and ignore blank NS rows');
assert.ok(Math.abs(summary.firstTryValidatedRate - (2 / 3) * 100) < 0.001, 'first-try percentage should be based on the first unique card appearances with Status Carte = OK');

const failureRows = [
  {
    NS: 'CARD-1',
    'Status Carte': 'OK',
    'Presence Connecteur': 'OK',
    'Apple Mode 3A D+  (0A/CC1)': 'FAIL',
    'Apple Mode 3A D-  (0A/CC1)': 'OK',
    'Temps Test': '10,0',
  },
  {
    NS: 'CARD-1',
    'Status Carte': 'OK',
    'Presence Connecteur': 'OK',
    'Apple Mode 3A D+  (0A/CC1)': 'FAIL',
    'Apple Mode 3A D-  (0A/CC1)': 'OK',
    'Temps Test': '10,0',
  },
  {
    NS: 'CARD-2',
    'Status Carte': 'NOK',
    'Presence Connecteur': 'FAIL',
    'Apple Mode 3A D+  (0A/CC1)': 'FAIL',
    'Apple Mode 3A D-  (0A/CC1)': 'OK',
    'Temps Test': '12,0',
  },
  {
    NS: 'CARD-3',
    'Status Carte': 'OK',
    'Presence Connecteur': 'OK',
    'apple mode 3a d+  (0a/cc1)': 'OK',
    'Apple Mode 3A D-  (0A/CC1)': 'OK',
    'Temps Test': '8,0',
  },
];

const failureSummary = calculateSummary(failureRows);
const dPlusFailures = failureSummary.failedTestBreakdown.find((item) => item.name === 'Apple Mode 3A D+  (0A/CC1)');
const connectorFailures = failureSummary.failedTestBreakdown.find((item) => item.name === 'Presence Connecteur');

assert.strictEqual(dPlusFailures && dPlusFailures.value, 2, 'each row should count once for its first failing test, even if the same card appears multiple times');
assert.strictEqual(connectorFailures && connectorFailures.value, 1, 'earlier failing tests should count once per row, while later fields on the same row should not');

const repeatedFailureRows = [
  {
    NS: 'CARD-10',
    'Status Carte': 'OK',
    'Presence Connecteur': 'OK',
    'Apple Mode 3A D+  (0A/CC1)': 'FAIL',
    'Temps Test': '10,0',
  },
  {
    NS: 'CARD-10',
    'Status Carte': 'OK',
    'Presence Connecteur': 'OK',
    'Apple Mode 3A D+  (0A/CC1)': 'FAIL',
    'Temps Test': '10,0',
  },
  {
    NS: 'CARD-11',
    'Status Carte': 'OK',
    'Presence Connecteur': 'OK',
    'Apple Mode 3A D+  (0A/CC1)': 'FAIL',
    'Temps Test': '11,0',
  },
];

const repeatedFailureSummary = calculateSummary(repeatedFailureRows);
const repeatedFailureCount = repeatedFailureSummary.failedTestBreakdown.find((item) => item.name === 'Apple Mode 3A D+  (0A/CC1)');
assert.strictEqual(repeatedFailureCount && repeatedFailureCount.value, 3, 'repeated failing rows should count in the top-failure breakdown');

const firstTryRows = [
  { NS: 'FIRST-NOK', 'Status Carte': 'NOK', 'Presence Connecteur': 'OK', 'Presence Blandage': 'OK', 'Presence C2': 'OK', 'Presence C24': 'OK' },
  { NS: 'FIRST-OK', 'Status Carte': 'OK', 'Presence Connecteur': 'OK', 'Presence Blandage': 'OK', 'Presence C2': 'OK', 'Presence C24': 'OK' },
  { NS: 'FIRST-OK', 'Status Carte': 'OK', 'Presence Connecteur': 'OK', 'Presence Blandage': 'OK', 'Presence C2': 'OK', 'Presence C24': 'OK' },
  { NS: 'FIRST-LATE-FAIL', 'Status Carte': 'OK', 'Presence Connecteur': 'OK', 'Presence Blandage': 'OK', 'Presence C2': 'OK', 'Presence C24': 'FAIL' },
  { NS: 'RETRY-AFTER-NOK', 'Status Carte': 'NOK', 'Presence Connecteur': 'FAIL', 'Presence Blandage': 'OK', 'Presence C2': 'OK', 'Presence C24': 'OK' },
  { NS: 'RETRY-AFTER-NOK', 'Status Carte': 'OK', 'Presence Connecteur': 'OK', 'Presence Blandage': 'OK', 'Presence C2': 'OK', 'Presence C24': 'OK' },
];

const firstTrySummary = calculateSummary(firstTryRows);
assert.strictEqual(firstTrySummary.firstAttemptCards, 4, 'the denominator is the unique card IDs in first appearance order');
assert.strictEqual(firstTrySummary.firstTryValidatedBoards, 2, 'a card should not count as first-try if it had a prior NOK for the same NS');
assert.ok(Math.abs(firstTrySummary.firstTryValidatedRate - 50) < 0.001, 'percentage must count only cards with no prior NOK against the same NS');

const retryRows = [
  { NS: 'RET-9', 'Status Carte': 'OK', 'Presence Connecteur': 'OK', 'Presence Blandage': 'OK', 'Presence C2': 'OK', 'Presence C24': 'OK' },
  { NS: 'RET-9', 'Status Carte': 'NOK', 'Presence Connecteur': 'FAIL', 'Presence Blandage': 'OK', 'Presence C2': 'OK', 'Presence C24': 'OK' },
  { NS: 'RET-9', 'Status Carte': 'OK', 'Presence Connecteur': 'OK', 'Presence Blandage': 'OK', 'Presence C2': 'OK', 'Presence C24': 'OK' },
  { NS: 'RET-7', 'Status Carte': 'OK', 'Presence Connecteur': 'OK', 'Presence Blandage': 'OK', 'Presence C2': 'OK', 'Presence C24': 'OK' },
  { NS: 'RET-7', 'Status Carte': 'OK', 'Presence Connecteur': 'OK', 'Presence Blandage': 'OK', 'Presence C2': 'OK', 'Presence C24': 'OK' },
  { NS: 'RET-7', 'Status Carte': 'NOK', 'Presence Connecteur': 'FAIL', 'Presence Blandage': 'OK', 'Presence C2': 'OK', 'Presence C24': 'OK' },
  { NS: 'RET-7', 'Status Carte': 'OK', 'Presence Connecteur': 'OK', 'Presence Blandage': 'OK', 'Presence C2': 'OK', 'Presence C24': 'OK' },
  { NS: 'RET-5', 'Status Carte': 'OK', 'Presence Connecteur': 'OK', 'Presence Blandage': 'OK', 'Presence C2': 'OK', 'Presence C24': 'OK' },
  { NS: 'RET-5', 'Status Carte': 'NOK', 'Presence Connecteur': 'FAIL', 'Presence Blandage': 'OK', 'Presence C2': 'OK', 'Presence C24': 'OK' },
  { NS: 'RET-5', 'Status Carte': 'OK', 'Presence Connecteur': 'OK', 'Presence Blandage': 'OK', 'Presence C2': 'OK', 'Presence C24': 'OK' },
  { NS: 'RET-3', 'Status Carte': 'OK', 'Presence Connecteur': 'OK', 'Presence Blandage': 'OK', 'Presence C2': 'OK', 'Presence C24': 'OK' },
  { NS: 'RET-3', 'Status Carte': 'NOK', 'Presence Connecteur': 'FAIL', 'Presence Blandage': 'OK', 'Presence C2': 'OK', 'Presence C24': 'OK' },
  { NS: 'RET-3', 'Status Carte': 'OK', 'Presence Connecteur': 'OK', 'Presence Blandage': 'OK', 'Presence C2': 'OK', 'Presence C24': 'OK' },
];

const retrySummary = calculateSummary(retryRows);
assert.deepStrictEqual(retrySummary.topValidationAttempts.map((item) => ({ ns: item.ns, attempts: item.attempts })), [
  { ns: 'RET-7', attempts: 4 },
  { ns: 'RET-3', attempts: 3 },
  { ns: 'RET-5', attempts: 3 },
  { ns: 'RET-9', attempts: 3 },
], 'top validation attempts should include the card NS and the number of tries it took to reach a valid result');
assert.deepStrictEqual(retrySummary.topAttemptCards.map((item) => ({ ns: item.ns, attempts: item.attempts })), [
  { ns: 'RET-7', attempts: 4 },
  { ns: 'RET-3', attempts: 3 },
  { ns: 'RET-5', attempts: 3 },
  { ns: 'RET-9', attempts: 3 },
], 'top attempt cards should list the NS with the highest total counted attempts');

console.log('duplicate summary test passed');
