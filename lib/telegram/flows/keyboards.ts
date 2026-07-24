/**
 * Inline keyboard builders + i18n translation.
 */
import { t } from './i18n.ts';
import type {
  FlowId,
  FlowLocale,
  KeyboardSpec,
  LabelKey,
  TelegramInlineKeyboard,
} from './types.ts';

export function translateKeyboard(
  spec: KeyboardSpec,
  locale: FlowLocale = 'en'
): TelegramInlineKeyboard {
  return {
    inline_keyboard: spec.rows.map(row =>
      row.map(b => ({
        text: t(b.textKey, locale),
        callback_data: b.callbackData,
      }))
    ),
  };
}

export function menuKeyboard(): KeyboardSpec {
  return {
    rows: [
      [
        { textKey: 'btn.status', callbackData: 'f:status' },
        { textKey: 'btn.balances', callbackData: 'f:balances' },
      ],
      [
        { textKey: 'btn.accounts', callbackData: 'f:accounts' },
        { textKey: 'btn.plays', callbackData: 'f:plays' },
      ],
      [{ textKey: 'btn.tree', callbackData: 'f:tree' }],
    ],
  };
}

export function navFooterKeyboard(
  flow: 'balances' | 'status' | 'accounts' | 'plays' | 'tree',
  refreshData: string
): KeyboardSpec {
  const refreshKey: LabelKey = 'btn.refresh';
  return {
    rows: [
      [
        { textKey: refreshKey, callbackData: refreshData },
        { textKey: 'btn.menu', callbackData: 'f:menu' },
      ],
    ],
  };
}

export function balancesKeyboard(): KeyboardSpec {
  return {
    rows: [
      [
        { textKey: 'btn.refresh', callbackData: 'f:balances:r' },
        { textKey: 'btn.accounts', callbackData: 'f:accounts' },
      ],
      [
        { textKey: 'btn.status', callbackData: 'f:status' },
        { textKey: 'btn.menu', callbackData: 'f:menu' },
      ],
    ],
  };
}

/** Play ack inline keyboard (translated labels, stable callback_data). */
export function playAckKeyboard(
  playId: string, // brand-ok
  nodeId: string, // brand-ok
  locale: FlowLocale = 'en'
): TelegramInlineKeyboard {
  return translateKeyboard(
    {
      rows: [
        [
          { textKey: 'btn.placed', callbackData: `play:${playId}:${nodeId}:placed` },
          { textKey: 'btn.skip', callbackData: `play:${playId}:${nodeId}:skip` },
        ],
      ],
    },
    locale
  );
}

export function parseFlowCallback(data: string): { flowId: FlowId; refresh: boolean } | null {
  const m = /^f:([a-z_]+)(?::r)?$/.exec(data.trim());
  if (!m) return null;
  return { flowId: m[1]! as FlowId, refresh: data.endsWith(':r') };
}
