/**
 * Status flow card.
 */
import { t } from '../i18n.ts';
import { navFooterKeyboard } from '../keyboards.ts';
import type { FlowContext, FlowInput, FlowOutput } from '../types.ts';

export function statusFlow(input: FlowInput, ctx: FlowContext): FlowOutput {
  const locale = input.locale ?? 'en';
  if (!ctx.node) {
    return {
      text: `<b>${t('card.not_registered', locale)}</b>`,
      parseMode: 'HTML',
    };
  }

  const node = ctx.node;
  const accts = ctx.db
    .query('SELECT COUNT(*) as c FROM sb_accounts WHERE agent_id = $a')
    .get({ $a: node.id }) as { c: number };
  const placed = ctx.db
    .query(
      "SELECT COUNT(*) as c FROM play_distribution WHERE node_id = $n AND ack_status = 'placed'"
    )
    .get({ $n: node.id }) as { c: number };
  const pnl = ctx.db
    .query(
      `SELECT COALESCE(SUM(p.pnl), 0) as total
       FROM plays p JOIN play_distribution d ON p.id = d.play_id
       WHERE d.node_id = $n AND p.result IN ('win', 'loss')`
    )
    .get({ $n: node.id }) as { total: number };

  return {
    text: [
      `<b>${t('card.status.title', locale)}</b>`,
      `Accounts: ${accts.c}`,
      `Placed: ${placed.c}`,
      `P&amp;L: $${pnl.total.toFixed(2)}`,
    ].join('\n'),
    parseMode: 'HTML',
    keyboard: navFooterKeyboard('status', 'f:status:r'),
    editMessageId: input.editMessageId,
  };
}
