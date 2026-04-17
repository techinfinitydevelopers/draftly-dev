import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = resolve(__dirname, '../paid-subscribers-credits-export.csv');

function parseLine(line) {
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

const raw = readFileSync(csvPath, 'utf8');
const lines = raw.trim().split(/\r?\n/);
const header = parseLine(lines[0]);
const iTot = header.indexOf('credits_total');
const iRem = header.indexOf('credits_remaining');
const iOwn = header.indexOf('is_owner_unlimited');

let sumTot = 0;
let sumRem = 0;
let n = 0;

for (let r = 1; r < lines.length; r++) {
  const c = parseLine(lines[r]);
  n++;
  const t = c[iTot];
  const rem = c[iRem];
  if (t !== 'unlimited') {
    const x = parseFloat(t);
    if (Number.isFinite(x)) sumTot += x;
  }
  if (rem !== 'unlimited') {
    const y = parseFloat(rem);
    if (Number.isFinite(y)) sumRem += y;
  }
}

console.log(
  JSON.stringify({
    dataRows: n,
    totalCreditsAllotted: Math.round(sumTot),
    totalCreditsRemaining: Math.round(sumRem),
  }),
);
