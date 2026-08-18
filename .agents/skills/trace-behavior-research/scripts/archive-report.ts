#!/usr/bin/env bun

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

// @see https://bun.com/docs/runtime/archive#quickstart
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write
// @see https://bun.com/reference/bun/argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file

const args = Bun.argv.slice(2);
const valueOf = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const reportDir = valueOf('--report-dir') ?? './trace-behavior-report';
const output = valueOf('--output') ?? `${reportDir}/report.tar.gz`;
const names = (await readdir(reportDir)).filter(name =>
  /^(behavior-research\.(json|md|html|summary\.txt)|\.trace-cache\.json)$/.test(name)
);
const files: Record<string, string | Blob> = {};
for (const name of names) files[name] = Bun.file(join(reportDir, name));
if (Object.keys(files).length === 0) throw new Error(`No report artifacts found in ${reportDir}`);
await Bun.write(output, new Bun.Archive(files, { compress: 'gzip' }));
console.log(`Archived ${names.length} report artifact(s) to ${output}`);
