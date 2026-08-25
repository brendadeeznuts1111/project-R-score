// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
import { describe, expect, test } from 'bun:test';
import { bunSpawnArgs } from '../lib/bun-executable.ts';
import {
  assessColorKernelAlign,
  COLOR_KERNEL_COUNT_FLOORS,
  COLOR_KERNEL_THEME_SOURCE,
  collectColorKernelEvidence,
  colorKernelClaimReport,
  formatColorKernelClaimReport,
  GLOSSARY_EXTENDED_KEYS,
  normalizeColorForComparison,
  THEME_DARK_ALIAS_CHECKS,
  type ColorKernelCheckId,
} from '../lib/portal/color-kernel-align.ts';
import { PORTAL_KERNEL_PALETTE } from '../lib/portal/portal-kernel-palette.ts';
import {
  countPortalStyleRawColors,
  findPortalConsumerRawColors,
  PORTAL_STYLE_RAW_COLOR_MAX,
} from '../lib/portal/raw-color-policy.ts';
import { portalTheme } from '../lib/portal/theme.ts';
import { PARTNER_OPS_COLORS } from '../lib/telegram/partner-ops-color-kernel.ts';

describe('portal color-kernel align', () => {
  test('reusable components and Bun 1.4 board contain no raw color literals', async () => {
    expect(await findPortalConsumerRawColors()).toEqual([]);
  });

  test('shared stylesheet raw-color debt only decreases', async () => {
    expect(await countPortalStyleRawColors()).toBeLessThanOrEqual(PORTAL_STYLE_RAW_COLOR_MAX);
  });

  test('theme-dark aliases match across glossary / partner-ops / telegram', () => {
    const result = assessColorKernelAlign();
    expect(result.ok, Bun.inspect(result.mismatches)).toBe(true);
    expect(result.themeVersion).toBe(portalTheme.version);
    expect(THEME_DARK_ALIAS_CHECKS.length).toBeGreaterThanOrEqual(20);
  });

  test('alignment normalization preserves alpha', () => {
    const opaque = normalizeColorForComparison('rgba(88 166 255 / 1)');
    const translucent = normalizeColorForComparison('rgba(88 166 255 / 0.15)');
    expect(Bun.deepEquals(opaque, translucent)).toBe(false);
    expect(translucent.a).toBeLessThan(1);
  });

  test('glossary extended keys are outside the theme-alias check table', () => {
    const aliasKeys = new Set(
      THEME_DARK_ALIAS_CHECKS.filter(r => r.consumer === 'glossary').map(r => r.key)
    );
    for (const key of GLOSSARY_EXTENDED_KEYS) {
      expect(aliasKeys.has(key)).toBe(false);
      expect(Bun.color(PORTAL_KERNEL_PALETTE[key], 'HEX')).toMatch(/^#[0-9A-F]{6}$/i);
    }
    expect(PARTNER_OPS_COLORS.polymarket).toBeTruthy();
    expect(PARTNER_OPS_COLORS.pinnacle).toBeTruthy();
    expect(PARTNER_OPS_COLORS.research).toBeTruthy();
  });

  test('collectColorKernelEvidence is typed and populated', () => {
    const ev = collectColorKernelEvidence();
    expect(ev.chrome.version).toBe(portalTheme.version);
    expect(ev.chrome.tokens.length).toBeGreaterThanOrEqual(
      COLOR_KERNEL_COUNT_FLOORS['chrome.darkTokens']
    );
    expect(ev.glossary.aliases.length).toBeGreaterThanOrEqual(
      COLOR_KERNEL_COUNT_FLOORS['glossary.themeAliases']
    );
    expect(ev.partnerOps.mappings).toBeGreaterThan(0);
    expect(ev.telegram.topicRoles).toBeGreaterThan(0);
  });

  test('colorKernelClaimReport passes floors and ClaimReport shape', () => {
    const report = colorKernelClaimReport(undefined, {
      argv: ['bun', 'validate:colors'],
      timestamp: '2026-08-01T00:00:00.000Z',
    });
    expect(report.ok).toBe(true);
    expect(report.status).toBe('pass');
    expect(report.timestamp).toBe('2026-08-01T00:00:00.000Z');
    expect(report.meta.source).toBe(COLOR_KERNEL_THEME_SOURCE);
    expect(report.meta.version).toBe(portalTheme.version);
    expect(report.claim).toContain('complete and conflict-free');
    expect(report.claim).toContain(`theme v${portalTheme.version}`);
    expect(report.evidence.length).toBeGreaterThanOrEqual(4);
    expect(Array.isArray(report.checks)).toBe(true);

    for (const id of Object.keys(COLOR_KERNEL_COUNT_FLOORS) as ColorKernelCheckId[]) {
      const floor = report.floors[id];
      expect(floor.expectedMin).toBe(COLOR_KERNEL_COUNT_FLOORS[id]);
      expect(floor.actual).toBeGreaterThanOrEqual(floor.expectedMin);
      expect(floor.ok).toBe(true);
      const check = report.checks.find(c => c.id === id);
      expect(check?.passed).toBe(true);
      expect(check?.expected).toBe(COLOR_KERNEL_COUNT_FLOORS[id]);
    }
    expect(report.checks.some(c => c.id === 'theme-dark-aliases' && c.passed)).toBe(true);

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

  test('check CLI --json emits ClaimReport machine shape', () => {
    const proc = Bun.spawnSync(bunSpawnArgs(['tools/check-portal-color-kernels.ts', '--json']), {
      cwd: `${import.meta.dir}/..`,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(proc.exitCode).toBe(0);
    const parsed = JSON.parse(proc.stdout.toString()) as {
      status: string;
      ok: boolean;
      timestamp: string;
      checks: Array<{ id: string; expected: number; actual: number; passed: boolean; diff: number }>;
      meta: { source: string; version: string; env: string };
      floors: Record<string, { expectedMin: number; actual: number; ok: boolean }>;
    };
    expect(parsed.status).toBe('pass');
    expect(parsed.ok).toBe(true);
    expect(parsed.meta.source).toBe(COLOR_KERNEL_THEME_SOURCE);
    expect(parsed.timestamp).toBeTruthy();
    expect(Array.isArray(parsed.checks)).toBe(true);
    for (const id of Object.keys(COLOR_KERNEL_COUNT_FLOORS)) {
      expect(parsed.floors[id]?.ok).toBe(true);
      expect(parsed.floors[id]?.expectedMin).toBe(
        COLOR_KERNEL_COUNT_FLOORS[id as ColorKernelCheckId]
      );
      const check = parsed.checks.find(c => c.id === id);
      expect(check?.passed).toBe(true);
      expect(check?.expected).toBe(COLOR_KERNEL_COUNT_FLOORS[id as ColorKernelCheckId]);
    }
  });

  test('lib entrypoint --json exits 0', () => {
    const proc = Bun.spawnSync(
      bunSpawnArgs(['lib/portal/color-kernel-align.ts', '--json']),
      {
        cwd: `${import.meta.dir}/..`,
        stdout: 'pipe',
        stderr: 'pipe',
      }
    );
    expect(proc.exitCode).toBe(0);
    const parsed = JSON.parse(proc.stdout.toString()) as { status: string };
    expect(parsed.status).toBe('pass');
  });
});
