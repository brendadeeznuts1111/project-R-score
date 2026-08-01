// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
import { describe, expect, test } from 'bun:test';
import { bunSpawnArgs } from '../lib/bun-executable.ts';
import {
  assessColorKernelAlign,
  GLOSSARY_EXTENDED_KEYS,
  THEME_DARK_ALIAS_CHECKS,
} from '../lib/portal/color-kernel-align.ts';
import { PORTAL_KERNEL_PALETTE } from '../lib/portal/portal-kernel-palette.ts';
import { portalTheme } from '../lib/portal/theme.ts';
import { PARTNER_OPS_COLORS } from '../lib/telegram/partner-ops-color-kernel.ts';

describe('portal color-kernel align', () => {
  test('theme-dark aliases match across glossary / partner-ops / telegram', () => {
    const result = assessColorKernelAlign();
    expect(result.ok, Bun.inspect(result.mismatches)).toBe(true);
    expect(result.themeVersion).toBe(portalTheme.version);
    expect(THEME_DARK_ALIAS_CHECKS.length).toBeGreaterThanOrEqual(20);
  });

  test('glossary extended keys are outside the theme-alias check table', () => {
    const aliasKeys = new Set(
      THEME_DARK_ALIAS_CHECKS.filter(r => r.consumer === 'glossary').map(r => r.key)
    );
    for (const key of GLOSSARY_EXTENDED_KEYS) {
      expect(aliasKeys.has(key)).toBe(false);
      expect(Bun.color(PORTAL_KERNEL_PALETTE[key], 'HEX')).toMatch(/^#[0-9A-F]{6}$/i);
    }
    // Partner-ops extras that must not be forced onto theme dark SSOT
    expect(PARTNER_OPS_COLORS.polymarket).toBeTruthy();
    expect(PARTNER_OPS_COLORS.pinnacle).toBeTruthy();
    expect(PARTNER_OPS_COLORS.research).toBeTruthy();
  });

  test('check CLI exits 0 when aligned', () => {
    const proc = Bun.spawnSync(bunSpawnArgs(['tools/check-portal-color-kernels.ts']), {
      cwd: `${import.meta.dir}/..`,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(proc.exitCode).toBe(0);
    expect(proc.stdout.toString()).toContain('OK portal color kernels');
  });
});
