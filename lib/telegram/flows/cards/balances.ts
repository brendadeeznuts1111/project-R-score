/**
 * Balances flow card — thin caller of balances.v1 (read-only Soft / hard).
 */
import { asTreeNodeId } from '../../../types/branded/operations.ts';
import { renderForNode, resolveTemplateIdForCard } from '../../templates/render.ts';
import { t } from '../i18n.ts';
import type { FlowContext, FlowInput, FlowOutput } from '../types.ts';

export function balancesFlow(input: FlowInput, ctx: FlowContext): FlowOutput {
  const locale = input.locale ?? 'en';
  if (!ctx.node) {
    return {
      text: `<b>${t('card.not_registered', locale)}</b>`,
      parseMode: 'HTML',
    };
  }

  const treeNodeId = input.treeNodeId ?? asTreeNodeId(ctx.node.id);
  const templateId = resolveTemplateIdForCard(ctx.db, treeNodeId, 'balances');
  const rendered = renderForNode(ctx.db, templateId, treeNodeId, { locale });
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
