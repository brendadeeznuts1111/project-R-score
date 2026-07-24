/**
 * Flow card label keys — en / es (extensible).
 */
import type { FlowLocale, LabelKey } from './types.ts';

export const labels: Record<FlowLocale, Record<LabelKey, string>> = {
  en: {
    'btn.menu': '🏠 Menu',
    'btn.status': '📋 Status',
    'btn.balances': '💰 Balances',
    'btn.accounts': '🏦 Accounts',
    'btn.plays': '🎯 Plays',
    'btn.tree': '🌳 Tree',
    'btn.refresh': '🔄 Refresh',
    'btn.placed': '✅ Placed',
    'btn.skip': '⏭ Skip',
    'btn.back': '← Back',
    'card.menu.title': 'Operations Menu',
    'card.menu.hint': 'Tap a card or use slash commands.',
    'card.balances.title': 'Balances',
    'card.status.title': 'Status',
    'card.not_registered': 'Not registered — link portal or /register',
  },
  es: {
    'btn.menu': '🏠 Menú',
    'btn.status': '📋 Estado',
    'btn.balances': '💰 Saldos',
    'btn.accounts': '🏦 Cuentas',
    'btn.plays': '🎯 Jugadas',
    'btn.tree': '🌳 Red',
    'btn.refresh': '🔄 Actualizar',
    'btn.placed': '✅ Colocado',
    'btn.skip': '⏭ Omitir',
    'btn.back': '← Atrás',
    'card.menu.title': 'Menú de operaciones',
    'card.menu.hint': 'Elige una tarjeta o usa comandos.',
    'card.balances.title': 'Saldos',
    'card.status.title': 'Estado',
    'card.not_registered': 'No registrado — vincula portal o /register',
  },
};

export function t(key: LabelKey, locale: FlowLocale = 'en'): string {
  return labels[locale]?.[key] ?? labels.en[key] ?? key;
}

export function resolveLocale(raw?: string | null): FlowLocale {
  const l = raw?.trim().toLowerCase();
  if (l === 'es') return 'es';
  return 'en';
}
