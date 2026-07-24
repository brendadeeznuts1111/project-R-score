/**
 * Plays flow card.
 */
import { t } from '../i18n.ts';
import { navFooterKeyboard } from '../keyboards.ts';
import type { FlowContext, FlowInput, FlowOutput } from '../types.ts';

export function playsFlow(input: FlowInput, ctx: FlowContext): FlowOutput {
  const locale = input.locale ?? 'en';
  if (!ctx.node) {
    return {
      text: `<b>${t('card.not_registered', locale)}</b>`,
      parseMode: 'HTML',
    };
  }

  const plays = ctx.db
    .query(
      `SELECT p.sport, p.market, p.event, p.selection, p.odds, p.confidence, p.sent_at, d.ack_status
       FROM plays p JOIN play_distribution d ON p.id = d.play_id
       WHERE d.node_id = $n AND p.result = 'pending'
       ORDER BY p.sent_at DESC LIMIT 5`
    )
    .all({ $n: ctx.node.id }) as Array<{
    sport: string;
    market: string;
    event: string;
    selection: string;
    odds: number;
    confidence: number;
    sent_at: string;
    ack_status: string;
  }>;

  if (!plays.length) {
    return {
      text: '<b>Pending Plays</b>\nNone.',
      parseMode: 'HTML',
      keyboard: navFooterKeyboard('plays', 'f:plays:r'),
      editMessageId: input.editMessageId,
    };
  }

  const rows = plays.flatMap(p => [
    `🎯 <b>${p.sport} ${p.market}</b> (${p.ack_status})`,
    `${p.event}: ${p.selection} @ ${p.odds > 0 ? '+' : ''}${p.odds}`,
    `   ${p.confidence}% · ${p.sent_at.slice(11, 16)}`,
    '',
  ]);

  return {
    text: ['<b>Pending Plays</b>', '', ...rows].join('\n'),
    parseMode: 'HTML',
    keyboard: navFooterKeyboard('plays', 'f:plays:r'),
    editMessageId: input.editMessageId,
  };
}
