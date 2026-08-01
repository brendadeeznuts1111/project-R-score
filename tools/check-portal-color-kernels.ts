#!/usr/bin/env bun
// @see https://bun.com/docs/guides/util/entrypoint — import.meta.main
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
/**
 * Check theme.jsonc aliases vs glossary / partner-ops / telegram kernels,
 * plus the component plane (var(--token, <fallback>) pairs in
 * public/portal/components must equal the theme token they mirror).
 *
 *   bun run portal:colors:check
 *   bun tools/check-portal-color-kernels.ts
 *
 * Check-only — never rewrites TypeScript kernels or components.
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { logTable } from '../lib/console-depth.ts';
import {
  assessColorKernelAlign,
  THEME_DARK_ALIAS_CHECKS,
} from '../lib/portal/color-kernel-align.ts';
import { assessComponentColorAlign } from '../lib/portal/component-color-align.ts';

export async function main(): Promise<void> {
  const result = assessColorKernelAlign();
  if (!result.ok) {
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

  const components = await assessComponentColorAlign();
  if (components.unmapped.length > 0) {
    console.warn(
      `⚠️  ${components.unmapped.length} component var(s) with color fallbacks have no mapped theme token:`
    );
    for (const u of components.unmapped) {
      console.warn(`   ${u.file}  ${u.variable} (fallback ${u.fallback})`);
    }
  }
  if (!components.ok) {
    console.error(
      `component color fallbacks drift from theme.jsonc v${components.themeVersion} (${components.mismatches.length} mismatch(es))`
    );
    logTable(
      components.mismatches.map(m => ({
        file: m.file,
        variable: m.variable,
        token: m.token,
        expected: m.expected,
        actual: m.actual,
      })),
      ['file', 'variable', 'token', 'expected', 'actual']
    );
    process.exit(1);
  }

  console.log(
    `OK portal color kernels align with theme.jsonc v${result.themeVersion} (${THEME_DARK_ALIAS_CHECKS.length} aliases · ${components.checked} component fallbacks)`
  );
}

if (isModuleEntrypoint(import.meta)) {
  try {
    await main();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
