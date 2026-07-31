/**
 * Bun-native Telegram topic / surface color kernel.
 *
 * Closed palette for package-forum topics, house accounting topics, and the
 * TOC Ops brand mark. Validated via Bun.color on load.
 *
 * @see https://bun.com/docs/runtime/color#flexible-input
 * @see https://bun.com/docs/runtime/color#output-formats
 * @see lib/telegram/catalog-research/suggested-icons.ts — Bot API icon_color 0–6
 */

export const TELEGRAM_COLORS = {
  // TOC Ops brand mark (#0f766e)
  brand: '#0F766E',
  unknown: '#8B949E',

  // Partner package forum topics (aligned to suggested icon hues)
  topicGeneral: '#8B949E',
  topicOps: '#58A6FF', // icon_color 4-ish blue
  topicAlerts: '#F85149', // icon_color 2 red
  topicLiquidityOuts: '#3FB950', // icon_color 3 green
  topicAccounting: '#D29922', // icon_color 1 gold

  // House all-accounting topics
  topicDeposits: '#3FB950',
  topicWithdrawals: '#F85149',
  topicReconcile: '#8B949E',

  // Surfaces
  surfaceHq: '#0F766E',
  surfaceSandbox: '#A371F7',
  surfaceAllAccounting: '#D29922',
  surfacePartner: '#58A6FF',
} as const;

export type TelegramColorKey = keyof typeof TELEGRAM_COLORS;

export function isTelegramColorKey(value: string): value is TelegramColorKey {
  return Object.hasOwn(TELEGRAM_COLORS, value);
}

export type TelegramColorWire = {
  colorKey: TelegramColorKey;
  hex: string;
  css: string;
};

type DeterministicFormat = 'css' | 'HEX';

for (const [key, value] of Object.entries(TELEGRAM_COLORS)) {
  const hex = Bun.color(value, 'HEX');
  if (typeof hex !== 'string' || !hex) {
    throw new Error(`Invalid telegram color for "${key}": ${value}`);
  }
}

const hexCache = {} as Record<TelegramColorKey, string>;
const cssCache = {} as Record<TelegramColorKey, string>;
for (const key of Object.keys(TELEGRAM_COLORS) as TelegramColorKey[]) {
  for (const format of ['HEX', 'css'] as const satisfies readonly DeterministicFormat[]) {
    const converted = Bun.color(TELEGRAM_COLORS[key], format);
    if (converted == null || typeof converted !== 'string') {
      throw new Error(`Bun.color failed for telegram "${key}" format "${format}"`);
    }
    if (format === 'HEX') hexCache[key] = converted;
    else cssCache[key] = converted;
  }
}

export const TELEGRAM_COLOR_ROLES = {
  topic: {
    general: 'topicGeneral',
    ops: 'topicOps',
    alerts: 'topicAlerts',
    'liquidity/outs': 'topicLiquidityOuts',
    accounting: 'topicAccounting',
    deposits: 'topicDeposits',
    withdrawals: 'topicWithdrawals',
    reconcile: 'topicReconcile',
  },
  surface: {
    hq: 'surfaceHq',
    sandbox: 'surfaceSandbox',
    'all-accounting': 'surfaceAllAccounting',
    partner: 'surfacePartner',
  },
  brand: {
    tocOps: 'brand',
    unknown: 'unknown',
  },
} as const satisfies Readonly<Record<string, Readonly<Record<string, TelegramColorKey>>>>;

export type TelegramColorRolePath =
  | `topic.${keyof typeof TELEGRAM_COLOR_ROLES.topic}`
  | `surface.${keyof typeof TELEGRAM_COLOR_ROLES.surface}`
  | `brand.${keyof typeof TELEGRAM_COLOR_ROLES.brand}`;

export function telegramRoleColor(path: TelegramColorRolePath): TelegramColorKey {
  const [group, leaf] = path.split('.') as [keyof typeof TELEGRAM_COLOR_ROLES, string];
  const key = TELEGRAM_COLOR_ROLES[group]?.[leaf as never] as TelegramColorKey | undefined;
  if (!key) throw new Error(`Unknown telegram color role: ${path}`);
  return key;
}

export function telegramHexColor(key: TelegramColorKey): string {
  return hexCache[key];
}

export function telegramCssColor(key: TelegramColorKey): string {
  return cssCache[key];
}

export function telegramColorWire(key: TelegramColorKey): TelegramColorWire {
  return { colorKey: key, hex: telegramHexColor(key), css: telegramCssColor(key) };
}

export function telegramTopicColorWire(mapKey: string): TelegramColorWire {
  const roles = TELEGRAM_COLOR_ROLES.topic as Record<string, TelegramColorKey>;
  const key = roles[mapKey.toLowerCase()] ?? 'unknown';
  return telegramColorWire(key);
}

/** Bot API forum icon_color 0–6 → approximate hex (for catalog chips). */
export const TELEGRAM_FORUM_ICON_COLOR_HEX = [
  '#8B949E', // 0 gray
  '#D29922', // 1 gold
  '#F85149', // 2 red
  '#3FB950', // 3 green
  '#58A6FF', // 4 blue
  '#A371F7', // 5 purple
  '#F778BA', // 6 pink
] as const;

export function telegramForumIconColorHex(iconColor: number): string {
  if (!Number.isInteger(iconColor) || iconColor < 0 || iconColor > 6) {
    return telegramHexColor('unknown');
  }
  return TELEGRAM_FORUM_ICON_COLOR_HEX[iconColor]!;
}
