// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
// @see https://bun.com/docs/runtime/color#output-formats
/**
 * Check-only alignment: theme.jsonc dark palette ↔ glossary / Telegram kernels.
 *
 * Does not rewrite files. Extended keys (purple, brand, …) are out of scope.
 */
import {
  PARTNER_OPS_COLORS,
  PARTNER_OPS_CONCEPT_COLORS,
} from '../telegram/partner-ops-color-kernel.ts';
import { TELEGRAM_COLORS, TELEGRAM_COLOR_ROLES } from '../telegram/telegram-color-kernel.ts';
import { CATEGORY_COLOR_KEYS, PORTAL_KERNEL_PALETTE } from './portal-kernel-palette.ts';
import { portalTheme } from './theme.ts';

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

export type ColorKernelClaimReport = {
  ok: boolean;
  claim: string;
  /** Paste lines for PR Color Kernel Evidence (includes per-plane ✓/✗). */
  evidence: string[];
  themeVersion: string;
  mismatches: ColorKernelMismatch[];
};

function aliasCount(consumer: ColorKernelConsumer): number {
  return THEME_DARK_ALIAS_CHECKS.filter(r => r.consumer === consumer).length;
}

function planeMark(
  consumer: ColorKernelConsumer | 'chrome',
  mismatches: readonly ColorKernelMismatch[]
): '✓' | '✗' {
  if (consumer === 'chrome') return '✓';
  return mismatches.some(m => m.consumer === consumer) ? '✗' : '✓';
}

/**
 * Paste-ready Claim → evidence for theme-dark alias alignment.
 * `ok` is alias-align only; evidence lines include live counts from each plane.
 */
export function colorKernelClaimReport(
  result: ColorKernelAlignResult = assessColorKernelAlign()
): ColorKernelClaimReport {
  const { ok, mismatches, themeVersion } = result;
  const darkTokenCount = Object.keys(portalTheme.dark).length;
  const glossAliases = aliasCount('glossary');
  const partnerAliases = aliasCount('partner-ops');
  const telegramAliases = aliasCount('telegram');
  const paletteKeys = Object.keys(PORTAL_KERNEL_PALETTE).length;
  const categories = Object.keys(CATEGORY_COLOR_KEYS).length;
  const partnerPalette = Object.keys(PARTNER_OPS_COLORS).length;
  const concepts = Object.keys(PARTNER_OPS_CONCEPT_COLORS).length;
  const telegramKeys = Object.keys(TELEGRAM_COLORS).length;
  const topicRoles = Object.keys(TELEGRAM_COLOR_ROLES.topic).length;

  const evidence: string[] = [
    `${planeMark('chrome', mismatches)} Portal chrome: theme v${themeVersion} · ${darkTokenCount} dark tokens (SSOT theme.jsonc)`,
    `${planeMark('glossary', mismatches)} Glossary chips: ${glossAliases} theme aliases · ${paletteKeys} palette keys · ${categories} categories`,
    `${planeMark('partner-ops', mismatches)} Partner-ops: ${partnerAliases} theme aliases · ${partnerPalette} palette keys · ${concepts} concept→key mappings (fallback unknown)`,
    `${planeMark('telegram', mismatches)} Telegram topics: ${telegramAliases} theme aliases · ${telegramKeys} color keys · ${topicRoles} topic roles (fallback unknown)`,
  ];

  if (!ok) {
    for (const m of mismatches) {
      evidence.push(
        `✗ ${m.consumer}.${m.key}: theme.dark.${String(m.themeKey)} ${m.expected}≠${m.actual}`
      );
    }
  }

  const claim = ok
    ? `Color kernel theme-dark aliases are complete and conflict-free (theme v${themeVersion}).`
    : `Color kernel theme-dark aliases are inconsistent (theme v${themeVersion}, ${mismatches.length} mismatch(es)).`;

  return { ok, claim, evidence, themeVersion, mismatches };
}

/** Stdout paste block for `bun run validate:colors` / `portal:colors:check`. */
export function formatColorKernelClaimReport(report: ColorKernelClaimReport): string {
  return [`Claim: ${report.claim}`, '', 'Evidence:', ...report.evidence.map(line => `  ${line}`)].join(
    '\n'
  );
}
