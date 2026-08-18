#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
import { resolve } from 'node:path';

import { validateReleaseInventoryDirectory } from './catalog';

const repoRoot = resolve(import.meta.dir, '..', '..', '..');
const outputDir = resolve(Bun.argv[2] ?? resolve(import.meta.dir, '..', 'contracts'));
const result = await validateReleaseInventoryDirectory({ outputDir, repoRoot });

console.info(
  `Bun release contracts valid: ${result.releases} releases, ${result.executable} executable, ${result.planned} planned.`
);
