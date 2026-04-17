#!/usr/bin/env node
/**
 * Split firebase-signup-emails-export.txt into numbered files of at most N emails.
 *
 * Usage:
 *   node tools/split-emails-into-batches.mjs
 *   node tools/split-emails-into-batches.mjs --out "F:\\ALL EMAILS"
 *   node tools/split-emails-into-batches.mjs --source path/to/export.txt --batch 100
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DEFAULT_SOURCE = join(ROOT, 'firebase-signup-emails-export.txt');
const DEFAULT_BATCH = 100;

function argValue(name) {
  const i = process.argv.indexOf(name);
  if (i === -1 || i + 1 >= process.argv.length) return null;
  return process.argv[i + 1];
}

function parseEmails(content) {
  const emails = [];
  for (const raw of content.split(',')) {
    const e = raw.trim().replace(/\s+/g, ' ').trim();
    if (e && e.includes('@')) emails.push(e.toLowerCase());
  }
  return emails;
}

function formatChunk(chunk) {
  return chunk.map((e) => `${e},`).join(' ');
}

function main() {
  const source = argValue('--source') || DEFAULT_SOURCE;
  const outDir = argValue('--out') || join('F:', 'ALL EMAILS');
  const batchSize = Math.max(1, parseInt(argValue('--batch') || String(DEFAULT_BATCH), 10) || DEFAULT_BATCH);

  if (!existsSync(source)) {
    console.error(`Source file not found: ${source}`);
    console.error('Run: npm run export-signup-emails');
    process.exit(1);
  }

  const raw = readFileSync(source, 'utf8');
  const emails = parseEmails(raw);
  if (emails.length === 0) {
    console.error('No emails parsed from', source);
    process.exit(1);
  }

  mkdirSync(outDir, { recursive: true });

  let fileNum = 1;
  for (let i = 0; i < emails.length; i += batchSize) {
    const chunk = emails.slice(i, i + batchSize);
    const body = formatChunk(chunk);
    const outPath = join(outDir, `${fileNum}.txt`);
    writeFileSync(outPath, body + '\n', 'utf8');
    fileNum += 1;
  }

  const totalFiles = fileNum - 1;
  console.log(`Emails: ${emails.length}`);
  console.log(`Batch size: ${batchSize}`)
  console.log(`Files written: ${totalFiles} → ${outDir}\\1.txt … ${outDir}\\${totalFiles}.txt`);
}

main();
