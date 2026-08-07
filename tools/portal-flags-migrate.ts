#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * List deprecated runtime flags from the catalog (removal planning).
 *
 *   bun run portal:flags:migrate
 *   bun tools/portal-flags-migrate.ts --json
 */
import { RUNTIME_FLAGS_CATALOG_PATH, loadRuntimeFlagsCatalog } from './lib/portal-cli-bun-flags.ts';
import { cliTone, columnTable, frameBlock } from '../lib/portal/cli-chrome.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('portal:flags:migrate', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const json = argv.includes('--json');
const catalog = await loadRuntimeFlagsCatalog();
const deprecated = catalog.filter(r => r.deprecated);

if (json) {
  console.log(
    JSON.stringify(
      {
        kind: 'portal-flags-migrate',
        path: RUNTIME_FLAGS_CATALOG_PATH,
        count: deprecated.length,
        flags: deprecated.map(r => ({
          flag: r.flag,
          category: r.category,
          description: r.description,
          url: r.url,
        })),
      },
      null,
      2
    )
  );
  process.exit(0);
}

if (deprecated.length === 0) {
  console.log(
    frameBlock(
      'portal:flags:migrate',
      'OK',
      [
        cliTone.ok('no deprecated flags in catalog'),
        cliTone.dim(`SSOT · ${RUNTIME_FLAGS_CATALOG_PATH}`),
      ],
      { width: 64, ok: true }
    )
  );
  process.exit(0);
}

const body = [
  cliTone.warn(`${deprecated.length} deprecated flag(s) — plan removal from harvest set`),
  '',
  ...columnTable(
    ['flag', 'category', 'description'],
    deprecated.map(r => [r.flag, r.category, r.description]),
    { maxWidths: [22, 18, 36], gap: 2 }
  ),
  '',
  cliTone.dim(`edit · ${RUNTIME_FLAGS_CATALOG_PATH}`),
  cliTone.dim('verify · bun run portal:flags:check · portal-cli doctor --group catalog'),
];
console.log(frameBlock('portal:flags:migrate', 'PLAN', body, { width: 88, ok: undefined }));
process.exit(0);
