/**
 * Welcome flow — thin caller of partner.welcome.v1 template.
 */
import { asTreeNodeId } from '../../../types/branded/operations.ts';
import { renderForNode, resolveTemplateIdForCard } from '../../templates/render.ts';
import { t } from '../i18n.ts';
import { menuKeyboard } from '../keyboards.ts';
import type { FlowContext, FlowInput, FlowOutput } from '../types.ts';
import { menuFlow } from './menu.ts';

export function welcomeFlow(input: FlowInput, ctx: FlowContext): FlowOutput {
  const locale = input.locale ?? 'en';
  if (!ctx.node) {
    return {
      text: `<b>${t('card.not_registered', locale)}</b>`,
      parseMode: 'HTML',
      keyboard: menuKeyboard(),
    };
  }

  const treeNodeId = input.treeNodeId ?? asTreeNodeId(ctx.node.id);
  const templateId = resolveTemplateIdForCard(ctx.db, treeNodeId, 'welcome');
  const rendered = renderForNode(ctx.db, templateId, treeNodeId, { locale });
  if (!rendered) return menuFlow(input, ctx);

  return {
    text: rendered.text,
    parseMode: 'HTML',
    keyboard: rendered.keyboard,
    templateId: rendered.templateId,
    editMessageId: input.editMessageId,
  };
}
