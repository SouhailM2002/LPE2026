const { parseCsvFile, normalizeBoardIdValue } = require('./index.js');
const rows = parseCsvFile('C:/Users/souha/Downloads/TEST FONC CO 591 M05/TEST FONC CO 591 M05/26/TRACA 26.csv');
const nokRows = rows.filter((row) => String(row['Status Carte'] || '').trim().toUpperCase() === 'NOK');
console.log(JSON.stringify({ nokRowsTotal: nokRows.length, blankNs: nokRows.filter((row) => !normalizeBoardIdValue(row)).length, firstNoks: nokRows.slice(0, 10).map((r) => ({ ns: r.NS, status: r['Status Carte'], boardIdValid: !!normalizeBoardIdValue(r) })) }, null, 2));
