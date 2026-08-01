// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
import { describe, expect, test } from 'bun:test';
import { bunSpawnArgs } from '../lib/bun-executable.ts';
import {
  assessColorKernelAlign,
  colorKernelClaimReport,
  formatColorKernelClaimReport,
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

  test('colorKernelClaimReport is paste-ready when aligned', () => {
    const report = colorKernelClaimReport();
    expect(report.ok).toBe(true);
    expect(report.claim).toContain('complete and conflict-free');
    expect(report.claim).toContain(`theme v${portalTheme.version}`);
    expect(report.evidence.length).toBeGreaterThanOrEqual(4);
    expect(report.evidence.some(l => l.startsWith('✓ Portal chrome:'))).toBe(true);
    expect(report.evidence.some(l => l.startsWith('✓ Glossary chips:'))).toBe(true);
    expect(report.evidence.some(l => l.startsWith('✓ Partner-ops:'))).toBe(true);
    expect(report.evidence.some(l => l.startsWith('✓ Telegram topics:'))).toBe(true);
    const text = formatColorKernelClaimReport(report);
    expect(text).toContain('Claim:');
    expect(text).toContain('Evidence:');
  });

  test('check CLI exits 0 and prints Claim / Evidence', () => {
    const proc = Bun.spawnSync(bunSpawnArgs(['tools/check-portal-color-kernels.ts']), {
      cwd: `${import.meta.dir}/..`,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(proc.exitCode).toBe(0);
    const out = proc.stdout.toString();
    expect(out).toContain('Claim:');
    expect(out).toContain('Evidence:');
    expect(out).toContain('Portal chrome:');
    expect(out).toContain('complete and conflict-free');
  });
});
