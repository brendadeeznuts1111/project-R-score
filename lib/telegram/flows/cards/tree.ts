/**
 * Tree flow card.
 */
import { t } from '../i18n.ts';
import { navFooterKeyboard } from '../keyboards.ts';
import type { FlowContext, FlowInput, FlowOutput } from '../types.ts';

export function treeFlow(input: FlowInput, ctx: FlowContext): FlowOutput {
  const locale = input.locale ?? 'en';
  if (!ctx.node) {
    return {
      text: `<b>${t('card.not_registered', locale)}</b>`,
      parseMode: 'HTML',
    };
  }

  if (ctx.node.type === 'sub_agent') {
    return {
      text: '<b>Tree</b>\nAvailable for partners and agents only.',
      parseMode: 'HTML',
      keyboard: navFooterKeyboard('tree', 'f:tree:r'),
      editMessageId: input.editMessageId,
    };
  }

  const children = ctx.db
    .query(
      'SELECT type, COUNT(*) as c FROM tree_nodes WHERE parent_id = $p AND active = 1 GROUP BY type'
    )
    .all({ $p: ctx.node.id }) as { type: string; c: number }[];

  const downstream = ctx.db
    .query(
      `WITH RECURSIVE down_tree AS (
         SELECT id FROM tree_nodes WHERE parent_id = $p AND active = 1
         UNION ALL
         SELECT n.id FROM tree_nodes n JOIN down_tree t ON n.parent_id = t.id
       )
       SELECT COALESCE(SUM(a.balance), 0) as total
       FROM sb_accounts a JOIN down_tree d ON a.agent_id = d.id
       WHERE a.status = 'active'`
    )
    .get({ $p: ctx.node.id }) as { total: number };

  const rows = children.map(r => `${r.type}: ${r.c}`);

  return {
    text: [
      '<b>Your Tree</b>',
      '',
      ...rows,
      '',
      `Downstream liquidity: $${downstream.total.toLocaleString()}`,
    ].join('\n'),
    parseMode: 'HTML',
    keyboard: navFooterKeyboard('tree', 'f:tree:r'),
    editMessageId: input.editMessageId,
  };
}
