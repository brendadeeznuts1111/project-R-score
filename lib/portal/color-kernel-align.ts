// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
// @see https://bun.com/docs/runtime/color#output-formats
// @see https://bun.com/docs/bundler/loaders#jsonc — theme.jsonc via portalTheme
// @see https://bun.com/docs/guides/util/entrypoint — import.meta.main
/**
 * Check-only alignment: theme.jsonc dark palette ↔ glossary / Telegram kernels.
 *
 * Does not rewrite files. Extended keys (purple, brand, …) are out of scope.
 * Floors are **minimums** (actual may grow). Fail-closed via claim-reporter.
 */
import { isModuleEntrypoint } from '../bun-executable.ts';
import {
  PARTNER_OPS_COLORS,
  PARTNER_OPS_CONCEPT_COLORS,
} from '../telegram/partner-ops-color-kernel.ts';
import { TELEGRAM_COLORS, TELEGRAM_COLOR_ROLES } from '../telegram/telegram-color-kernel.ts';
import {
  createClaimReporter,
  mkFloorCheck,
  resolveClaimEnv,
  type ClaimCheck,
  type ClaimReport,
} from './claim-reporter.ts';
import { CATEGORY_COLOR_KEYS, PORTAL_KERNEL_PALETTE } from './portal-kernel-palette.ts';
import { portalTheme } from './theme.ts';

/** SSOT path for ClaimReport.meta.source (Bun jsonc loader → portalTheme). */
export const COLOR_KERNEL_THEME_SOURCE = 'public/portal/theme.jsonc';

export type ColorKernelConsumer = 'glossary' | 'partner-ops' | 'telegram';

/** Flat dark-palette color keys only — excludes nested objects (e.g. `neutral`). */
export type AlignColorKey = {
  [K in keyof typeof portalTheme.dark]: (typeof portalTheme.dark)[K] extends string ? K : never;
}[keyof typeof portalTheme.dark];

export type ColorKernelMismatch = {
  consumer: ColorKernelConsumer;
  key: string;
  themeKey: AlignColorKey;
  expected: string;
  actual: string;
};

export type ColorKernelAlignResult = {
  ok: boolean;
  mismatches: ColorKernelMismatch[];
  themeVersion: string;
};

/** Typed disk/module evidence — machine-verifiable extraction. */
export type ColorKernelEvidence = {
  chrome: { tokens: string[]; version: string };
  glossary: { aliases: string[]; paletteKeys: string[]; categories: number };
  partnerOps: { aliases: string[]; paletteKeys: string[]; mappings: number };
  telegram: { aliases: string[]; colorKeys: string[]; topicRoles: number };
};

function asHex(input: string, label: string): string {
  const hex = Bun.color(input, 'HEX');
  if (typeof hex !== 'string' || !hex) {
    throw new Error(`Bun.color failed for ${label}: ${input}`);
  }
  return hex;
}

/** Intentional theme-dark aliases (case-normalized via Bun.color HEX). */
export const THEME_DARK_ALIAS_CHECKS: readonly {
  themeKey: AlignColorKey;
  consumer: ColorKernelConsumer;
  key: string;
  value: string;
}[] = [
  { themeKey: 'accent', consumer: 'glossary', key: 'accent', value: PORTAL_KERNEL_PALETTE.accent },
  { themeKey: 'green', consumer: 'glossary', key: 'green', value: PORTAL_KERNEL_PALETTE.green },
  { themeKey: 'yellow', consumer: 'glossary', key: 'yellow', value: PORTAL_KERNEL_PALETTE.yellow },
  { themeKey: 'red', consumer: 'glossary', key: 'red', value: PORTAL_KERNEL_PALETTE.red },
  { themeKey: 'textDim', consumer: 'glossary', key: 'muted', value: PORTAL_KERNEL_PALETTE.muted },

  { themeKey: 'accent', consumer: 'partner-ops', key: 'kalshi', value: PARTNER_OPS_COLORS.kalshi },
  { themeKey: 'green', consumer: 'partner-ops', key: 'tennis', value: PARTNER_OPS_COLORS.tennis },
  {
    themeKey: 'yellow',
    consumer: 'partner-ops',
    key: 'middleware',
    value: PARTNER_OPS_COLORS.middleware,
  },
  { themeKey: 'red', consumer: 'partner-ops', key: 'trading', value: PARTNER_OPS_COLORS.trading },
  { themeKey: 'textDim', consumer: 'partner-ops', key: 'env', value: PARTNER_OPS_COLORS.env },
  {
    themeKey: 'textDim',
    consumer: 'partner-ops',
    key: 'unknown',
    value: PARTNER_OPS_COLORS.unknown,
  },

  { themeKey: 'accent', consumer: 'telegram', key: 'topicOps', value: TELEGRAM_COLORS.topicOps },
  {
    themeKey: 'accent',
    consumer: 'telegram',
    key: 'surfacePartner',
    value: TELEGRAM_COLORS.surfacePartner,
  },
  {
    themeKey: 'green',
    consumer: 'telegram',
    key: 'topicLiquidityOuts',
    value: TELEGRAM_COLORS.topicLiquidityOuts,
  },
  {
    themeKey: 'green',
    consumer: 'telegram',
    key: 'topicDeposits',
    value: TELEGRAM_COLORS.topicDeposits,
  },
  {
    themeKey: 'yellow',
    consumer: 'telegram',
    key: 'topicAccounting',
    value: TELEGRAM_COLORS.topicAccounting,
  },
  {
    themeKey: 'yellow',
    consumer: 'telegram',
    key: 'surfaceAllAccounting',
    value: TELEGRAM_COLORS.surfaceAllAccounting,
  },
  {
    themeKey: 'red',
    consumer: 'telegram',
    key: 'topicAlerts',
    value: TELEGRAM_COLORS.topicAlerts,
  },
  {
    themeKey: 'red',
    consumer: 'telegram',
    key: 'topicWithdrawals',
    value: TELEGRAM_COLORS.topicWithdrawals,
  },
  { themeKey: 'textDim', consumer: 'telegram', key: 'unknown', value: TELEGRAM_COLORS.unknown },
  {
    themeKey: 'textDim',
    consumer: 'telegram',
    key: 'topicGeneral',
    value: TELEGRAM_COLORS.topicGeneral,
  },
  {
    themeKey: 'textDim',
    consumer: 'telegram',
    key: 'topicReconcile',
    value: TELEGRAM_COLORS.topicReconcile,
  },
];

/** Extended keys intentionally not equal to theme dark SSOT. */
export const GLOSSARY_EXTENDED_KEYS = ['purple', 'blueDeep'] as const;

export function assessColorKernelAlign(): ColorKernelAlignResult {
  const mismatches: ColorKernelMismatch[] = [];

  for (const row of THEME_DARK_ALIAS_CHECKS) {
    const expected = asHex(portalTheme.dark[row.themeKey], `theme.dark.${row.themeKey}`);
    const actual = asHex(row.value, `${row.consumer}.${row.key}`);
    if (expected !== actual) {
      mismatches.push({
        consumer: row.consumer,
        key: row.key,
        themeKey: row.themeKey,
        expected,
        actual,
      });
    }
  }

  return {
    ok: mismatches.length === 0,
    mismatches,
    themeVersion: portalTheme.version,
  };
}

/** Minimum counts — actual may grow; dropping below floor fails the claim. */
export const COLOR_KERNEL_COUNT_FLOORS = {
  'chrome.darkTokens': 12,
  'glossary.themeAliases': 5,
  'partnerOps.themeAliases': 6,
  'telegram.themeAliases': 11,
} as const;

export type ColorKernelCheckId = keyof typeof COLOR_KERNEL_COUNT_FLOORS;

/** @deprecated Prefer ClaimCheck on ClaimReport.checks — kept for floor map lookups. */
export type ColorKernelCheck = {
  expectedMin: number;
  actual: number;
  ok: boolean;
};

export type ColorKernelClaimReport = ClaimReport & {
  ok: boolean;
  /** Paste lines for PR Color Kernel Evidence (includes per-plane ✓/✗). */
  evidence: string[];
  themeVersion: string;
  mismatches: ColorKernelMismatch[];
  /** Floor checks keyed by id (compat with older consumers). */
  floors: Record<ColorKernelCheckId, ColorKernelCheck>;
};

function aliasesFor(consumer: ColorKernelConsumer): string[] {
  return THEME_DARK_ALIAS_CHECKS.filter(r => r.consumer === consumer).map(r => r.key);
}

/** Extract typed evidence from theme.jsonc (via portalTheme) + kernel modules. */
export function collectColorKernelEvidence(): ColorKernelEvidence {
  return {
    chrome: {
      tokens: Object.keys(portalTheme.dark),
      version: portalTheme.version,
    },
    glossary: {
      aliases: aliasesFor('glossary'),
      paletteKeys: Object.keys(PORTAL_KERNEL_PALETTE),
      categories: Object.keys(CATEGORY_COLOR_KEYS).length,
    },
    partnerOps: {
      aliases: aliasesFor('partner-ops'),
      paletteKeys: Object.keys(PARTNER_OPS_COLORS),
      mappings: Object.keys(PARTNER_OPS_CONCEPT_COLORS).length,
    },
    telegram: {
      aliases: aliasesFor('telegram'),
      colorKeys: Object.keys(TELEGRAM_COLORS),
      topicRoles: Object.keys(TELEGRAM_COLOR_ROLES.topic).length,
    },
  };
}

function planeMark(
  consumer: ColorKernelConsumer | 'chrome',
  mismatches: readonly ColorKernelMismatch[],
  floorOk: boolean
): '✓' | '✗' {
  if (!floorOk) return '✗';
  if (consumer === 'chrome') return '✓';
  return mismatches.some(m => m.consumer === consumer) ? '✗' : '✓';
}

function floorRecord(checks: readonly ClaimCheck[]): Record<ColorKernelCheckId, ColorKernelCheck> {
  const out = {} as Record<ColorKernelCheckId, ColorKernelCheck>;
  for (const id of Object.keys(COLOR_KERNEL_COUNT_FLOORS) as ColorKernelCheckId[]) {
    const c = checks.find(x => x.id === id);
    const expectedMin = COLOR_KERNEL_COUNT_FLOORS[id];
    const actual = c?.actual ?? 0;
    out[id] = { expectedMin, actual, ok: actual >= expectedMin };
  }
  return out;
}

/**
 * Claim → evidence for theme-dark alias alignment + count floors.
 * `ok` / `status` require alias-align AND every floor (actual ≥ expectedMin).
 */
export function colorKernelClaimReport(
  result: ColorKernelAlignResult = assessColorKernelAlign(),
  opts: { argv?: readonly string[]; timestamp?: string } = {}
): ColorKernelClaimReport {
  const { ok: alignOk, mismatches, themeVersion } = result;
  const evidenceData = collectColorKernelEvidence();
  const argv = opts.argv ?? Bun.argv;

  const floorChecks: ClaimCheck[] = [
    mkFloorCheck(
      'chrome.darkTokens',
      'Portal chrome dark tokens',
      COLOR_KERNEL_COUNT_FLOORS['chrome.darkTokens'],
      evidenceData.chrome.tokens.length
    ),
    mkFloorCheck(
      'glossary.themeAliases',
      'Glossary chips theme aliases',
      COLOR_KERNEL_COUNT_FLOORS['glossary.themeAliases'],
      evidenceData.glossary.aliases.length
    ),
    mkFloorCheck(
      'partnerOps.themeAliases',
      'Partner-ops theme aliases',
      COLOR_KERNEL_COUNT_FLOORS['partnerOps.themeAliases'],
      evidenceData.partnerOps.aliases.length
    ),
    mkFloorCheck(
      'telegram.themeAliases',
      'Telegram topic theme aliases',
      COLOR_KERNEL_COUNT_FLOORS['telegram.themeAliases'],
      evidenceData.telegram.aliases.length
    ),
  ];

  const aliasCheck: ClaimCheck = {
    id: 'theme-dark-aliases',
    description: 'Theme-dark alias HEX match',
    expected: 0,
    actual: mismatches.length,
    passed: alignOk,
    diff: 0 - mismatches.length,
    ...(mismatches.length > 0
      ? {
          details: {
            missing: mismatches.map(
              m =>
                `${m.consumer}.${m.key}: theme.dark.${String(m.themeKey)} ${m.expected}≠${m.actual}`
            ),
          },
        }
      : {}),
  };

  const checks = [...floorChecks, aliasCheck];
  const floors = floorRecord(floorChecks);
  const floorsOk = floorChecks.every(c => c.passed);
  const ok = alignOk && floorsOk;
  const status = ok ? 'pass' : 'fail';

  const evidence: string[] = [
    `${planeMark('chrome', mismatches, floors['chrome.darkTokens'].ok)} Portal chrome: theme v${themeVersion} · ${evidenceData.chrome.tokens.length} dark tokens (SSOT theme.jsonc)`,
    `${planeMark('glossary', mismatches, floors['glossary.themeAliases'].ok)} Glossary chips: ${evidenceData.glossary.aliases.length} theme aliases · ${evidenceData.glossary.paletteKeys.length} palette keys · ${evidenceData.glossary.categories} categories`,
    `${planeMark('partner-ops', mismatches, floors['partnerOps.themeAliases'].ok)} Partner-ops: ${evidenceData.partnerOps.aliases.length} theme aliases · ${evidenceData.partnerOps.paletteKeys.length} palette keys · ${evidenceData.partnerOps.mappings} concept→key mappings (fallback unknown)`,
    `${planeMark('telegram', mismatches, floors['telegram.themeAliases'].ok)} Telegram topics: ${evidenceData.telegram.aliases.length} theme aliases · ${evidenceData.telegram.colorKeys.length} color keys · ${evidenceData.telegram.topicRoles} topic roles (fallback unknown)`,
  ];

  if (!floorsOk) {
    for (const c of floorChecks) {
      if (!c.passed) {
        evidence.push(`✗ floor ${c.id}: actual ${c.actual} < min ${c.expected}`);
      }
    }
  }

  if (!alignOk) {
    for (const m of mismatches) {
      evidence.push(
        `✗ ${m.consumer}.${m.key}: theme.dark.${String(m.themeKey)} ${m.expected}≠${m.actual}`
      );
    }
  }

  const claim = ok
    ? `Color kernel theme-dark aliases are complete and conflict-free (theme v${themeVersion}).`
    : `Color kernel theme-dark aliases are inconsistent (theme v${themeVersion}, ${mismatches.length} mismatch(es), floors ${floorsOk ? 'ok' : 'fail'}).`;

  return {
    claim,
    timestamp: opts.timestamp ?? new Date().toISOString(),
    status,
    checks,
    meta: {
      env: resolveClaimEnv(argv),
      source: COLOR_KERNEL_THEME_SOURCE,
      version: themeVersion,
    },
    ok,
    evidence,
    themeVersion,
    mismatches,
    floors,
  };
}

/** Alias for Bun-native entry / importers that prefer generate* naming. */
export const generateColorKernelClaimReport = colorKernelClaimReport;

/** Stdout paste block for `bun run validate:colors` / `portal:colors:check`. */
export function formatColorKernelClaimReport(report: ColorKernelClaimReport): string {
  return [
    `Claim: ${report.claim}`,
    '',
    'Evidence:',
    ...report.evidence.map(line => `  ${line}`),
  ].join('\n');
}

/**
 * Build + print ClaimReport (human or `--json`). Fail-closes unless `--no-strict`.
 * Prefer `bun run validate:colors` / tools CLI; this enables `bun lib/portal/color-kernel-align.ts`.
 */
export async function reportColorKernelClaim(
  opts: { argv?: readonly string[]; exitOnFail?: boolean } = {}
): Promise<ColorKernelClaimReport> {
  const argv = opts.argv ?? Bun.argv;
  const report = colorKernelClaimReport(undefined, { argv });
  await createClaimReporter(report, {
    argv,
    formatHuman: r => formatColorKernelClaimReport(r as ColorKernelClaimReport),
    exitOnFail: opts.exitOnFail,
  });
  return report;
}

if (isModuleEntrypoint(import.meta)) {
  try {
    await reportColorKernelClaim();
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
