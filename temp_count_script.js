const fs = require('fs');
const file = 'C:/Users/souha/Downloads/TEST FONC CO 591 M05/TEST FONC CO 591 M05/19/TRACA.csv';
const raw = fs.readFileSync(file, 'utf8').replace(/\uFEFF/g, '');
const lines = raw.split(/\r?\n/).map((line) => line.trimEnd()).filter((line) => line.trim() !== '');
console.log('raw_nonempty_lines', lines.length);

if (lines.length < 2) {
  console.log('parsed_rows', 0);
  process.exit(0);
}

const firstLine = lines[0];
const delimiter = ((firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length) ? ';' : ',';
const headers = firstLine.split(delimiter).map((header) => header.trim());
const rows = [];
for (let i = 1; i < lines.length; i += 1) {
  const values = lines[i].split(delimiter).map((value) => value.trim());
  const row = {};
  headers.forEach((header, index) => {
    row[header] = values[index] ?? '';
  });
  rows.push(row);
}
console.log('parsed_rows', rows.length);

const nsValues = rows
  .map((row) => String(row.NS || row['Board ID'] || row.BoardID || '').trim())
  .filter((value) => value !== '');
console.log('nonempty_ns', nsValues.length);
console.log('unique_ns', new Set(nsValues).size);
