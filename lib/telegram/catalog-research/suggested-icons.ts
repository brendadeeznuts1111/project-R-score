/**
 * Default forum topic icon suggestions (Bot API icon_color 0–6 + operator emoji).
 * Used when catalog rows lack icon metadata.
 */
import type { ForumTopicIconSuggestion } from './types.ts';

export const PARTNER_TOPIC_ICON_SUGGESTIONS: Record<string, ForumTopicIconSuggestion> = {
  ops: { iconColor: 4, emoji: '📋' },
  alerts: { iconColor: 2, emoji: '🚨' },
  'liquidity/outs': { iconColor: 3, emoji: '💧' },
  accounting: { iconColor: 1, emoji: '📸' },
};

export const HOUSE_TOPIC_ICON_SUGGESTIONS: Record<string, ForumTopicIconSuggestion> = {
  alerts: { iconColor: 2, emoji: '🚨' },
  'day-ops': { iconColor: 4, emoji: '📋' },
  aar: { iconColor: 0, emoji: '📝' },
  identity: { iconColor: 5, emoji: '🪪' },
  plays: { iconColor: 3, emoji: '🎯' },
  balances: { iconColor: 1, emoji: '💰' },
  onboard: { iconColor: 4, emoji: '👋' },
  deposits: { iconColor: 3, emoji: '⬇️' },
  withdrawals: { iconColor: 2, emoji: '⬆️' },
  reconcile: { iconColor: 0, emoji: '✅' },
  scratch: { iconColor: 5, emoji: '🧪' },
  experiments: { iconColor: 6, emoji: '🔬' },
};
