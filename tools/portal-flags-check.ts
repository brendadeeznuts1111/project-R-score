#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/auto-install — runtime -i ≡ --install=fallback
/**
 * Validate config/runtime-flags.json catalog (schema · shortcodes · bun --help parity · help coverage).
 *
 *   bun run portal:flags:check
 *   bun tools/portal-flags-check.ts --json
 *
 * Exit 0 only when load + assess (with live bun --help) is healthy.
 */
import {
  RUNTIME_FLAGS_CATALOG_PATH,
  assessRuntimeFlagsCatalog,
  fetchBunHelpText,
  tryLoadRuntimeFlagsCatalog,
} from './lib/portal-cli-bun-flags.ts';
import { cliTone, frameBlock, kvLines } from '../lib/portal/cli-chrome.ts';

const json = Bun.argv.includes('--json');
const skipParity = Bun.argv.includes('--skip-parity');

const loaded = await tryLoadRuntimeFlagsCatalog();
let bunHelpText: string | undefined;
if (!skipParity) {
  try {
    bunHelpText = await fetchBunHelpText();
  } catch {
    bunHelpText = undefined;
  }
}
const health = assessRuntimeFlagsCatalog(loaded.catalog, { bunHelpText });
const parityFailed = !skipParity && bunHelpText == null;
const ok = loaded.ok && health.ok && !parityFailed;

if (json) {
  console.log(
    JSON.stringify(
      {
        kind: 'portal-flags-check',
        path: RUNTIME_FLAGS_CATALOG_PATH,
        loadOk: loaded.ok,
        loadError: loaded.ok ? undefined : loaded.error,
        paritySkipped: skipParity,
        parityUnavailable: !skipParity && bunHelpText == null,
        health,
      },
      null,
      2
    )
  );
} else {
  const body = [
    ...kvLines([
      ['path', RUNTIME_FLAGS_CATALOG_PATH],
      ['flags', String(health.total)],
      ['curated', String(health.curated)],
      ['shortcodes', String(health.withShortcode)],
      ['deprecated', String(health.deprecated)],
      ['schema issues', String(health.schemaIssues.length)],
      ['shortcode conflicts', String(health.shortcodeConflicts.length)],
      ['bun --help misses', String(health.bunHelpMisses.length)],
      ['help misses', String(health.helpCoverageMisses.length)],
      ['unverified versions', String(health.unverifiedVersions.length)],
    ]),
  ];
  if (!ok) {
    body.push('');
    if (parityFailed) body.push(cliTone.fail('· could not read bun --help'));
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
    body.push(
      cliTone.ok(
        skipParity
          ? 'catalog healthy (parity skipped)'
          : 'catalog healthy · harvest sets + bun --help parity + help'
      )
    );
  }
  if (health.unverifiedVersions.length > 0) {
    body.push('');
    body.push(
      cliTone.warn(
        `· ${health.unverifiedVersions.length} flag(s) have unverified version (marked * in --verbose; set versionVerified: true after checking Bun release notes)`
      )
    );
  }
  console.log(frameBlock('portal:flags:check', ok ? 'OK' : 'FAIL', body, { width: 72, ok }));
}

process.exit(ok ? 0 : 1);
