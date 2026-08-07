#!/usr/bin/env bun
/**
 * Measure cold-start doc fan-out (line counts + Bun.file read ns).
 *
 *   bun run tools/velocity-cold-start.ts
 *   bun run tools/velocity-cold-start.ts -- --json
 *
 * Writes nothing — paste numbers into docs/organization/VELOCITY_BASELINE.md.
 *
 * @see https://bun.com/docs/runtime/utils#bun-nanoseconds
 * @see https://bun.com/docs/runtime/file-io
 * @see https://bun.com/reference/bun/argv — Bun.argv
 */
import { cliOut, logTable } from '../lib/console-depth.ts';

const ROOT = (await Bun.file(import.meta.dir + '/../package.json').exists())
  ? import.meta.dir + '/..'
  : process.cwd();

const FILES = [
  'AGENTS.md',
  'docs/AGENTS.md',
  '.custom-instructions.md',
  'docs/WIRE_BOUNDARY.md',
] as const;

const JSON_MODE = Bun.argv.includes('--json');

type Row = {
  file: string;
  lines: number;
  bytes: number;
  readNs: number;
};

const rows: Row[] = [];
for (const rel of FILES) {
  const path = `${ROOT}/${rel}`;
  const file = Bun.file(path);
  const t0 = Bun.nanoseconds();
  const text = await file.text();
  const readNs = Bun.nanoseconds() - t0;
  rows.push({
    file: rel,
    lines: text.split(/\r?\n/).length - (text.endsWith('\n') ? 1 : 0),
    bytes: text.length,
    readNs,
  });
}

const totalLines = rows.reduce((s, r) => s + r.lines, 0);
const totalBytes = rows.reduce((s, r) => s + r.bytes, 0);
const totalReadNs = rows.reduce((s, r) => s + r.readNs, 0);

const report = {
  measuredAt: new Date().toISOString(),
  bunVersion: Bun.version,
  method: 'Bun.file().text() + Bun.nanoseconds(); line count = split(/\\r?\\n/)',
  files: rows,
  totals: { lines: totalLines, bytes: totalBytes, readNs: totalReadNs },
};

if (JSON_MODE) {
  cliOut(report, { json: true });
} else {
  console.log(`Cold-start fan-out · Bun ${Bun.version} · ${report.measuredAt}\n`);
  logTable(
    rows.map(r => ({
      file: r.file,
      lines: r.lines,
      bytes: r.bytes,
      readNs: r.readNs,
    })),
    ['file', 'lines', 'bytes', 'readNs']
  );
  console.log(`\nTotal lines ${totalLines} · bytes ${totalBytes} · readNs ${totalReadNs}`);
  console.log('Paste into docs/organization/VELOCITY_BASELINE.md § Context fan-out');
}
