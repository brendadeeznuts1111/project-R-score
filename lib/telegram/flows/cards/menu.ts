/**
 * Menu flow card — thin caller of menu.v1.
 */
import { asTreeNodeId } from '../../../types/branded/operations.ts';
import { renderForNode } from '../../templates/render.ts';
import { t } from '../i18n.ts';
import type { FlowContext, FlowInput, FlowOutput } from '../types.ts';

export function menuFlow(input: FlowInput, ctx: FlowContext): FlowOutput {
  const locale = input.locale ?? 'en';
  if (!ctx.node) {
    return {
      text: `<b>${t('card.not_registered', locale)}</b>\n\n/register &lt;referral-id&gt; &lt;name&gt;`,
      parseMode: 'HTML',
    };
  }

  const cs = ctx.node.call_sign ? ` · ${ctx.node.call_sign}` : '';
  const treeNodeId = input.treeNodeId ?? asTreeNodeId(ctx.node.id);
  const rendered = renderForNode(ctx.db, 'menu.v1', treeNodeId, {
    locale,
    menuTitle: t('card.menu.title', locale),
    menuSubtitle: `${ctx.node.name}${cs}`,
    menuHint: t('card.menu.hint', locale),
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
