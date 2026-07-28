#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Validate config/runtime-flags.json catalog (schema · shortcodes · help coverage).
 *
 *   bun run portal:flags:check
 *   bun tools/portal-flags-check.ts --json
 *
 * Exit 0 only when assessRuntimeFlagsCatalog is healthy.
 */
import {
  RUNTIME_FLAGS_CATALOG_PATH,
  assessRuntimeFlagsCatalog,
  tryLoadRuntimeFlagsCatalog,
} from './lib/portal-cli-bun-flags.ts';
import { cliTone, frameBlock, kvLines } from '../lib/portal/cli-chrome.ts';

const json = Bun.argv.includes('--json');

const loaded = await tryLoadRuntimeFlagsCatalog();
const health = assessRuntimeFlagsCatalog(loaded.catalog);

if (json) {
  console.log(
    JSON.stringify(
      {
        kind: 'portal-flags-check',
        path: RUNTIME_FLAGS_CATALOG_PATH,
        loadOk: loaded.ok,
        loadError: loaded.ok ? undefined : loaded.error,
        health,
      },
      null,
      2
    )
  );
} else {
  const ok = loaded.ok && health.ok;
  const body = [
    ...kvLines([
      ['path', RUNTIME_FLAGS_CATALOG_PATH],
      ['flags', String(health.total)],
      ['curated', String(health.curated)],
      ['shortcodes', String(health.withShortcode)],
      ['deprecated', String(health.deprecated)],
      ['schema issues', String(health.schemaIssues.length)],
      ['shortcode conflicts', String(health.shortcodeConflicts.length)],
      ['help misses', String(health.helpCoverageMisses.length)],
    ]),
  ];
  if (!ok) {
    body.push('');
    for (const issue of health.issues.slice(0, 12)) {
      body.push(cliTone.fail(`· ${issue}`));
    }
    if (health.issues.length > 12) {
      body.push(cliTone.dim(`… +${health.issues.length - 12} more`));
    }
    body.push('');
    body.push(cliTone.dim('also: portal-cli doctor --group catalog --verbose'));
  } else {
    body.push('');
    body.push(cliTone.ok('catalog healthy · harvest sets + help can load'));
  }
  console.log(frameBlock('portal:flags:check', ok ? 'OK' : 'FAIL', body, { width: 72, ok }));
}

process.exit(loaded.ok && health.ok ? 0 : 1);
