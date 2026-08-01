#!/usr/bin/env bun
// @see https://bun.com/docs/guides/util/entrypoint — import.meta.main
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
/**
 * Check theme.jsonc dark aliases vs glossary / partner-ops / telegram kernels.
 *
 *   bun run portal:colors:check
 *   bun tools/check-portal-color-kernels.ts
 *
 * Check-only — never rewrites TypeScript kernels.
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { logTable } from '../lib/console-depth.ts';
import {
  assessColorKernelAlign,
  THEME_DARK_ALIAS_CHECKS,
} from '../lib/portal/color-kernel-align.ts';

export function main(): void {
  const result = assessColorKernelAlign();
  if (result.ok) {
    console.log(
      `OK portal color kernels align with theme.jsonc v${result.themeVersion} (${THEME_DARK_ALIAS_CHECKS.length} aliases)`
    );
    return;
  }

  console.error(
    `portal color kernels drift from theme.jsonc v${result.themeVersion} (${result.mismatches.length} mismatch(es))`
  );
  logTable(
    result.mismatches.map(m => ({
      consumer: m.consumer,
      key: m.key,
      theme: m.themeKey,
      expected: m.expected,
      actual: m.actual,
    })),
    ['consumer', 'key', 'theme', 'expected', 'actual']
  );
  process.exit(1);
}

if (isModuleEntrypoint(import.meta)) {
  try {
    main();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
