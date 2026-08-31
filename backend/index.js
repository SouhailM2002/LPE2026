const express = require('express');
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mern-dashboard';

const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors());
app.use(express.json());

let inMemoryRecords = [];
let inMemorySummary = null;
let isMongoConnected = false;

const uploadedDatasetSchema = new mongoose.Schema(
  {
    fileName: String,
    summary: Object,
    rows: [Object],
  },
  { timestamps: true },
);

const UploadedDataset = mongoose.models.UploadedDataset || mongoose.model('UploadedDataset', uploadedDatasetSchema);

async function connectMongo() {
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    isMongoConnected = true;
    console.log('MongoDB connected successfully.');
  } catch (error) {
    isMongoConnected = false;
    console.warn('MongoDB is unavailable. The app is running in fallback mode.', error.message);
  }
}

function cleanNumericValue(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const normalized = String(value).trim().replace(/[$,%\s]/g, '').replace(/,/g, '');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function getNumericKeys(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const keys = Object.keys(rows[0]);

  return keys.filter((key) =>
    rows.some((row) => cleanNumericValue(row[key]) !== null),
  );
}

function normalizeCellStatus(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return 'EMPTY';
  }

  const normalized = String(value).trim().toUpperCase();

  if (normalized === 'OK') return 'OK';
  if (normalized === 'FAIL' || normalized === 'NOK') return 'FAIL';
  if (normalized.includes('NON TESTE') || normalized.includes('NOT TESTED')) return 'NON_TESTE';

  const numericValue = Number(String(value).trim().replace(/,/g, '.').replace(/\s/g, ''));
  if (Number.isFinite(numericValue) && numericValue === -1) {
    return 'FAIL_CHAIN';
  }

  return 'VALUE';
}

function parseTestTimeValue(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return null;
  }

  const normalized = String(value).trim().replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
  const numericValue = Number(normalized);

  return Number.isFinite(numericValue) ? numericValue : null;
}

function buildFailureBreakdown(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const validRows = rows.filter((row) => normalizeBoardIdValue(row) !== '');
  if (validRows.length === 0) {
    return [];
  }

  const keys = Object.keys(validRows[0]);
  const metadataKeys = new Set(['NS', 'MATRICULE OPERATEUR', 'HEUR PASSAGE', 'TEMPS TEST', 'STATUS CARTE']);
  const testColumns = keys.filter((key) => !metadataKeys.has(String(key).trim().toUpperCase()));

  const failureCounts = {};

  validRows.forEach((row) => {
    let rowFirstFailureName = null;

    for (const key of testColumns) {
      const status = normalizeCellStatus(row[key]);

      if (status === 'OK') {
        continue;
      }

      if (status === 'FAIL' || status === 'FAIL_CHAIN') {
        if (!rowFirstFailureName) {
          rowFirstFailureName = key;
          failureCounts[key] = (failureCounts[key] || 0) + 1;
        }
        break;
      }
    }
  });

  return Object.entries(failureCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, value: count }));
}

function analyzeBoardTestResults(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      totalRows: 0,
      totalColumns: 0,
      passedBoards: 0,
      failedBoards: 0,
      untestedBoards: 0,
      passedTests: 0,
      failedTests: 0,
      notTestedTests: 0,
      failedTestBreakdown: [],
      primaryMetric: 'Board test results',
      totalTestTime: 0,
      averageTestTime: 0,
      bestTestTime: 0,
      bestTestTimeCount: 0,
      bestTestTimePercent: 0,
      worstTestTime: 0,
      worstTestTimeCount: 0,
      worstTestTimePercent: 0,
    };
  }

  const validRows = rows.filter((row) => normalizeBoardIdValue(row) !== '');
  if (validRows.length === 0) {
    return {
      totalRows: 0,
      totalColumns: Object.keys(rows[0] || {}).length,
      passedBoards: 0,
      failedBoards: 0,
      untestedBoards: 0,
      passedTests: 0,
      failedTests: 0,
      notTestedTests: 0,
      failedTestBreakdown: [],
      primaryMetric: 'Board test results',
      totalTestTime: 0,
      averageTestTime: 0,
      bestTestTime: 0,
      bestTestTimeCount: 0,
      bestTestTimePercent: 0,
      worstTestTime: 0,
      worstTestTimeCount: 0,
      worstTestTimePercent: 0,
    };
  }

  const keys = Object.keys(validRows[0]);
  const metadataKeys = new Set(['NS', 'MATRICULE OPERATEUR', 'HEUR PASSAGE', 'TEMPS TEST', 'STATUS CARTE']);
  const testColumns = keys.filter((key) => !metadataKeys.has(String(key).trim().toUpperCase()));

  const failureCounts = {};
  let passedBoards = 0;
  let failedBoards = 0;
  let untestedBoards = 0;
  let passedTests = 0;
  let failedTests = 0;
  let notTestedTests = 0;
  const testTimes = [];

  validRows.forEach((row) => {
    let rowFailed = false;
    let rowFirstFailureName = null;
    let rowPassedCount = 0;
    let rowNotTestedCount = 0;

    for (const key of testColumns) {
      const status = normalizeCellStatus(row[key]);

      if (status === 'OK') {
        rowPassedCount += 1;
        continue;
      }

      if (status === 'FAIL' || status === 'FAIL_CHAIN') {
        if (!rowFirstFailureName) {
          rowFirstFailureName = key;
          failureCounts[key] = (failureCounts[key] || 0) + 1;
          failedTests += 1;
        }
        rowFailed = true;
        break;
      }

      if (status === 'NON_TESTE') {
        rowNotTestedCount += 1;
        notTestedTests += 1;
      }
    }

    const finalStatus = String(row['Status Carte'] || '').trim().toUpperCase();
    if (finalStatus === 'OK') {
      passedBoards += 1;
    } else if (finalStatus === 'NOK' || finalStatus === 'FAIL') {
      failedBoards += 1;
    } else if (rowFailed) {
      failedBoards += 1;
    } else if (rowNotTestedCount > 0) {
      untestedBoards += 1;
    } else {
      passedBoards += 1;
    }

    const parsedTime = parseTestTimeValue(row['Temps Test']);
    if (parsedTime !== null) {
      testTimes.push(parsedTime);
    }

    passedTests += rowPassedCount;
  });

  const failedTestBreakdown = Object.entries(failureCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, value: count }));

  const evaluatedBoards = passedBoards + failedBoards + untestedBoards;
  const passRate = evaluatedBoards > 0 ? (passedBoards / evaluatedBoards) * 100 : 0;
  const failRate = evaluatedBoards > 0 ? (failedBoards / evaluatedBoards) * 100 : 0;
  const untestedRate = evaluatedBoards > 0 ? (untestedBoards / evaluatedBoards) * 100 : 0;
  const totalMeasuredTests = passedTests + failedTests + notTestedTests;
  const coverageRate = totalMeasuredTests > 0 ? ((passedTests + failedTests) / totalMeasuredTests) * 100 : 0;
  const uniqueFailureTests = Object.keys(failureCounts).length;

  const totalTestTime = testTimes.reduce((sum, value) => sum + value, 0);
  const averageTestTime = testTimes.length > 0 ? totalTestTime / testTimes.length : 0;
  const bestTestTime = testTimes.length > 0 ? Math.min(...testTimes) : 0;
  const worstTestTime = testTimes.length > 0 ? Math.max(...testTimes) : 0;
  const bestTestTimeCount = testTimes.filter((value) => Math.abs(value - bestTestTime) < 1e-9).length;
  const worstTestTimeCount = testTimes.filter((value) => Math.abs(value - worstTestTime) < 1e-9).length;

  return {
    totalRows: validRows.length,
    totalColumns: keys.length,
    passedBoards,
    failedBoards,
    untestedBoards,
    passedTests,
    failedTests,
    notTestedTests,
    failedTestBreakdown,
    passRate,
    failRate,
    untestedRate,
    coverageRate,
    uniqueFailureTests,
    primaryMetric: 'Board test health',
    totalTestTime,
    averageTestTime,
    bestTestTime,
    bestTestTimeCount,
    bestTestTimePercent: testTimes.length > 0 ? (bestTestTimeCount / testTimes.length) * 100 : 0,
    worstTestTime,
    worstTestTimeCount,
    worstTestTimePercent: testTimes.length > 0 ? (worstTestTimeCount / testTimes.length) * 100 : 0,
  };
}

function normalizeBoardIdValue(row) {
  if (!row || typeof row !== 'object') {
    return '';
  }

  const candidateKeys = ['NS', 'Board ID', 'BoardID', 'Board Number', 'Board Serial', 'Carte', 'ID'];

  for (const key of candidateKeys) {
    const value = row[key];
    if (value !== null && value !== undefined) {
      const normalized = String(value).trim().replace(/\s+/g, ' ');
      if (normalized !== '') {
        return normalized;
      }
    }
  }

  return '';
}

function normalizeTextValue(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function deduplicateBoardRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const uniqueRows = new Map();

  rows.forEach((row) => {
    const boardId = normalizeBoardIdValue(row);
    if (!boardId) {
      return;
    }

    uniqueRows.set(boardId, row);
  });

  return Array.from(uniqueRows.values());
}

function getFirstAttemptRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const firstAttemptRows = [];
  const seenBoardIds = new Set();

  rows.forEach((row) => {
    const boardId = normalizeBoardIdValue(row);
    if (!boardId || seenBoardIds.has(boardId)) {
      return;
    }

    seenBoardIds.add(boardId);
    firstAttemptRows.push(row);
  });

  return firstAttemptRows;
}

function buildAttemptStats(rows, { onlyValidated = false } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const attemptsByCard = new Map();
  const finalStatusByCard = new Map();

  rows.forEach((row) => {
    const cardId = normalizeBoardIdValue(row);
    if (!cardId) {
      return;
    }

    const nextAttemptCount = (attemptsByCard.get(cardId) || 0) + 1;
    attemptsByCard.set(cardId, nextAttemptCount);

    const finalStatus = String(row['Status Carte'] || '').trim().toUpperCase();
    finalStatusByCard.set(cardId, finalStatus);
  });

  const stats = Array.from(attemptsByCard.entries())
    .map(([ns, attempts]) => ({
      ns,
      attempts,
      finalStatus: finalStatusByCard.get(ns) || '',
    }))
    .filter((entry) => !onlyValidated || entry.finalStatus === 'OK')
    .sort((a, b) => b.attempts - a.attempts || a.ns.localeCompare(b.ns))
    .slice(0, 5);

  return stats;
}

function isBoardValidatedFromFirstTry(row) {
  if (!row || typeof row !== 'object') {
    return false;
  }

  const finalStatus = String(row['Status Carte'] || '').trim().toUpperCase();
  if (finalStatus !== 'OK') {
    return false;
  }

  const requiredChecks = ['Presence Connecteur', 'Presence Blandage', 'Presence C2', 'Presence C24'];
  const keyNames = Object.keys(row);

  for (const checkName of requiredChecks) {
    const matchingKey = keyNames.find((key) => normalizeTextValue(key) === normalizeTextValue(checkName));

    if (!matchingKey) {
      return false;
    }

    const cellValue = row[matchingKey];
    if (cellValue === null || cellValue === undefined || String(cellValue).trim() === '') {
      return false;
    }

    if (normalizeCellStatus(cellValue) !== 'OK') {
      return false;
    }
  }

  return true;
}

function calculateSummary(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      totalRows: 0,
      totalColumns: 0,
      passedBoards: 0,
      failedBoards: 0,
      untestedBoards: 0,
      passedTests: 0,
      failedTests: 0,
      notTestedTests: 0,
      failedTestBreakdown: [],
      passRate: 0,
      failRate: 0,
      untestedRate: 0,
      coverageRate: 0,
      uniqueFailureTests: 0,
      uniquePassedBoards: 0,
      uniqueFailedBoards: 0,
      primaryMetric: 'No board data found',
      firstTryValidatedRate: 0,
      firstTryValidatedBoards: 0,
      topValidationAttempts: [],
      topAttemptCards: [],
      totalTestTime: 0,
      averageTestTime: 0,
      bestTestTime: 0,
      bestTestTimeCount: 0,
      bestTestTimePercent: 0,
      worstTestTime: 0,
      worstTestTimeCount: 0,
      worstTestTimePercent: 0,
    };
  }

  const validRows = rows.filter((row) => normalizeBoardIdValue(row) !== '');
  const uniqueBoardRows = deduplicateBoardRows(validRows);
  const validOkCardRows = uniqueBoardRows.filter((row) => String(row['Status Carte'] || '').trim().toUpperCase() === 'OK');
  const passFailMetrics = analyzeBoardTestResults(validRows);
  const firstAttemptRows = getFirstAttemptRows(validRows);
  const failureBreakdown = buildFailureBreakdown(validRows);

  const topValidationAttempts = buildAttemptStats(validRows, { onlyValidated: true });
  const topAttemptCards = buildAttemptStats(validRows, { onlyValidated: false });

  const validAllStatusTimes = validRows
    .map((row) => parseTestTimeValue(row['Temps Test']))
    .filter((value) => value !== null && Number.isFinite(value));

  const validOkTimes = validOkCardRows
    .map((row) => parseTestTimeValue(row['Temps Test']))
    .filter((value) => value !== null && Number.isFinite(value));

  const uniquePassedCardIds = new Set();
  const uniqueFailedCardIds = new Set();

  validRows.forEach((row) => {
    const boardId = normalizeBoardIdValue(row);
    if (!boardId) {
      return;
    }

    const status = String(row['Status Carte'] || '').trim().toUpperCase();

    if (status === 'OK') {
      uniquePassedCardIds.add(boardId);
    }

    if (status === 'NOK' || status === 'FAIL') {
      uniqueFailedCardIds.add(boardId);
    }
  });

  const uniquePassedBoards = uniquePassedCardIds.size;
  const uniqueFailedBoards = uniqueFailedCardIds.size;

  const priorNokCardIds = new Set();
  const firstTryValidatedBoardIds = new Set();

  validRows.forEach((row) => {
    const boardId = normalizeBoardIdValue(row);
    if (!boardId) {
      return;
    }

    const status = String(row['Status Carte'] || '').trim().toUpperCase();

    if (status === 'NOK' || status === 'FAIL') {
      priorNokCardIds.add(boardId);
      return;
    }

    if (status === 'OK' && !priorNokCardIds.has(boardId)) {
      firstTryValidatedBoardIds.add(boardId);
    }
  });

  const firstAttemptOkCards = firstTryValidatedBoardIds.size;
  const firstTryValidatedBoards = firstAttemptOkCards;
  const firstTryValidatedRate = firstAttemptRows.length > 0
    ? (firstTryValidatedBoards / firstAttemptRows.length) * 100
    : 0;

  const timeMetrics = {
    totalTestTime: 0,
    averageTestTime: 0,
    bestTestTime: 0,
    bestTestTimeCount: 0,
    bestTestTimePercent: 0,
    worstTestTime: 0,
    worstTestTimeCount: 0,
    worstTestTimePercent: 0,
  };

  if (validAllStatusTimes.length > 0) {
    const totalTime = validAllStatusTimes.reduce((sum, value) => sum + value, 0);
    const averageTime = totalTime / validAllStatusTimes.length;

    Object.assign(timeMetrics, {
      totalTestTime: totalTime,
      averageTestTime: averageTime,
    });
  }

  if (validOkTimes.length > 0) {
    const bestTime = Math.min(...validOkTimes);
    const worstTime = Math.max(...validOkTimes);
    const bestCount = validOkTimes.filter((value) => Math.abs(value - bestTime) < 1e-9).length;
    const worstCount = validOkTimes.filter((value) => Math.abs(value - worstTime) < 1e-9).length;

    Object.assign(timeMetrics, {
      bestTestTime: bestTime,
      bestTestTimeCount: bestCount,
      bestTestTimePercent: (bestCount / validOkTimes.length) * 100,
      worstTestTime: worstTime,
      worstTestTimeCount: worstCount,
      worstTestTimePercent: (worstCount / validOkTimes.length) * 100,
    });
  }

  return {
    ...passFailMetrics,
    ...timeMetrics,
    failedTestBreakdown: failureBreakdown,
    uniqueFailureTests: failureBreakdown.length,
    totalRows: uniqueBoardRows.length,
    uniquePassedBoards,
    uniqueFailedBoards,
    firstAttemptCards: firstAttemptRows.length,
    firstAttemptOkCards,
    firstTryValidatedRate,
    firstTryValidatedBoards,
    topValidationAttempts,
    topAttemptCards,
  };
}

function splitCsvLine(line, delimiter) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function parseCsvFile(filePath) {
  const rawContent = fs.readFileSync(filePath, 'utf8').replace(/\uFEFF/g, '');
  const lines = rawContent
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    return [];
  }

  const firstLine = lines[0];
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = semicolonCount >= commaCount ? ';' : ',';

  const headers = splitCsvLine(firstLine, delimiter).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line, delimiter);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] !== undefined ? values[index] : '';
    });

    return row;
  });
}

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'CSV Dashboard API is running',
    mongoConnected: isMongoConnected,
  });
});

app.get('/api/dashboard', (req, res) => {
  res.json({
    summary: inMemorySummary,
    rows: inMemoryRecords,
    mongoConnected: isMongoConnected,
  });
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Please upload a CSV file.' });
  }

  const filePath = req.file.path;

  try {
    const parsedRows = parseCsvFile(filePath);
    fs.unlinkSync(filePath);

    const summary = calculateSummary(parsedRows);
    inMemoryRecords = parsedRows;
    inMemorySummary = summary;

    if (isMongoConnected) {
      try {
        await UploadedDataset.create({
          fileName: req.file.originalname,
          summary,
          rows: parsedRows,
        });
      } catch (databaseError) {
        console.warn('Unable to save uploaded CSV to MongoDB.', databaseError.message);
      }
    }

    return res.json({
      success: true,
      fileName: req.file.originalname,
      summary,
      rows: parsedRows,
      mongoConnected: isMongoConnected,
    });
  } catch (error) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return res.status(500).json({ message: 'Failed to read CSV file.', error: error.message });
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'Server error', error: error.message });
});

if (require.main === module) {
  connectMongo().then(() => {
    app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
    });
  });
}

module.exports = {
  app,
  calculateSummary,
  parseCsvFile,
  analyzeBoardTestResults,
  normalizeBoardIdValue,
  normalizeTextValue,
  deduplicateBoardRows,
  getFirstAttemptRows,
  isBoardValidatedFromFirstTry,
};
