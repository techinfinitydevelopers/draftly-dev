/**
 * One-off helper: sum credits_remaining from paid-subscribers-credits-export.csv
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = resolve(__dirname, '../paid-subscribers-credits-export.csv');

const raw = readFileSync(csvPath, 'utf8');
const lines = raw.trim().split(/\r?\n/);
const header = lines[0].split(',');

function parseCsvLine(line) {
  const cols = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        q = !q;
      }
      continue;
    }
    if (ch === ',' && !q) {
      cols.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  cols.push(cur);
  return cols;
}

const iRem = header.indexOf('credits_remaining');
const iOwner = header.indexOf('is_owner_unlimited');
let sum = 0;
let unlimited = 0;
let skipped = 0;

for (let r = 1; r < lines.length; r++) {
  const cols = parseCsvLine(lines[r]);
  const rem = cols[iRem];
  const own = cols[iOwner];
  if (own === 'yes' || rem === 'unlimited') {
    unlimited++;
    continue;
  }
  const n = parseFloat(rem, 10);
  if (Number.isFinite(n)) sum += n;
  else skipped++;
}

console.log(
  JSON.stringify(
    {
      csvPath,
      dataRows: lines.length - 1,
      sumRemainingCredits: Math.round(sum * 100) / 100,
      ownerUnlimitedRows: unlimited,
      nonNumericSkipped: skipped,
    },
    null,
    2,
  ),
);
