// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
// @see https://bun.com/docs/runtime/color#output-formats
/**
 * Check-only alignment: theme.jsonc dark palette ↔ glossary / Telegram kernels.
 *
 * Does not rewrite files. Extended keys (purple, brand, …) are out of scope.
 */
import { PARTNER_OPS_COLORS } from '../telegram/partner-ops-color-kernel.ts';
import { TELEGRAM_COLORS } from '../telegram/telegram-color-kernel.ts';
import { PORTAL_KERNEL_PALETTE } from './portal-kernel-palette.ts';
import { portalTheme } from './theme.ts';

export type ColorKernelConsumer = 'glossary' | 'partner-ops' | 'telegram';

export type ColorKernelMismatch = {
  consumer: ColorKernelConsumer;
  key: string;
  themeKey: keyof typeof portalTheme.dark;
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
  themeKey: keyof typeof portalTheme.dark;
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
