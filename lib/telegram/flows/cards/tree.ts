/**
 * Tree flow card — thin caller of tree.v1.
 */
import { asTreeNodeId } from '../../../types/branded/operations.ts';
import { renderForNode } from '../../templates/render.ts';
import { t } from '../i18n.ts';
import type { FlowContext, FlowInput, FlowOutput } from '../types.ts';

export function treeFlow(input: FlowInput, ctx: FlowContext): FlowOutput {
  const locale = input.locale ?? 'en';
  if (!ctx.node) {
    return {
      text: `<b>${t('card.not_registered', locale)}</b>`,
      parseMode: 'HTML',
    };
  }

  const treeNodeId = input.treeNodeId ?? asTreeNodeId(ctx.node.id);

  if (ctx.node.type === 'sub_agent') {
    const rendered = renderForNode(ctx.db, 'tree.v1', treeNodeId, {
      locale,
      treeHint: 'Available for partners and agents only.',
    });
    if (!rendered) {
      return {
        text: `<b>${t('card.not_registered', locale)}</b>`,
        parseMode: 'HTML',
      };
    }
    return {
      text: rendered.text,
      parseMode: 'HTML',
      keyboard: rendered.keyboard,
      templateId: rendered.templateId,
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

  const detailLines = [
    ...children.map(r => `${r.type}: ${r.c}`),
    '',
    `Downstream liquidity: $${downstream.total.toLocaleString()}`,
  ];

  const rendered = renderForNode(ctx.db, 'tree.v1', treeNodeId, {
    locale,
    detailLines,
  });

  if (!rendered) {
    return {
      text: `<b>${t('card.not_registered', locale)}</b>`,
      parseMode: 'HTML',
    };
  }

  return {
    text: rendered.text,
    parseMode: 'HTML',
    keyboard: rendered.keyboard,
    templateId: rendered.templateId,
    editMessageId: input.editMessageId,
  };
}
