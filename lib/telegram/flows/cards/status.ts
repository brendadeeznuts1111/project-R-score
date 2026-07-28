/**
 * Status flow card — thin caller of status.v1.
 */
import { asTreeNodeId } from '../../brands.ts';
import { renderForNode, resolveTemplateIdForCard } from '../../templates/render.ts';
import { t } from '../i18n.ts';
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

  const treeNodeId = input.treeNodeId ?? asTreeNodeId(node.id);
  const templateId = resolveTemplateIdForCard(ctx.db, treeNodeId, 'status');
  const rendered = renderForNode(ctx.db, templateId, treeNodeId, {
    locale,
    accountsCount: accts.c,
    placedCount: placed.c,
    pnl: pnl.total,
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
