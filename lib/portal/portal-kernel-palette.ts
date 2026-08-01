/**
 * Glossary category palette — theme.jsonc dark tones + closed partner-ops extras.
 *
 * Shared by `tools/domain-glossary.ts` bake and `lib/portal/color-kernel-align.ts`.
 *
 * @see public/portal/theme.jsonc — colorKernel SSOT
 * @see https://bun.com/docs/bundler/loaders#jsonc
 */
import { portalTheme } from './theme.ts';

/** Glossary category → palette colorKey. */
export const CATEGORY_COLOR_KEYS = {
  market: 'accent',
  model: 'purple',
  tournament: 'green',
  warehouse: 'blueDeep',
  trading: 'yellow',
  ui: 'accent',
  pipeline: 'red',
  other: 'muted',
} as const satisfies Record<string, string>;

export type PortalKernelPaletteKey =
  (typeof CATEGORY_COLOR_KEYS)[keyof typeof CATEGORY_COLOR_KEYS];

/**
 * Closed portal + partner-ops palette used for glossary category tokens.
 * Theme-derived keys must stay aligned with `portalTheme.dark` (enforced by
 * `portal:colors:check`).
 */
export const PORTAL_KERNEL_PALETTE = {
  accent: portalTheme.dark.accent,
  green: portalTheme.dark.green,
  yellow: portalTheme.dark.yellow,
  red: portalTheme.dark.red,
  muted: portalTheme.dark.textDim,
  /** partner-ops `pinnacle` — model / calibration (extended; not theme SSOT) */
  purple: '#a371f7',
  /** partner-ops `polymarket` — warehouse / profiles (extended; not theme SSOT) */
  blueDeep: '#1f6feb',
} as const satisfies Record<PortalKernelPaletteKey, string>;
