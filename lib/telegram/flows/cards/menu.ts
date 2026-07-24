/**
 * Menu flow card.
 */
import { t } from '../i18n.ts';
import { menuKeyboard } from '../keyboards.ts';
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
  return {
    text: [
      `<b>${t('card.menu.title', locale)}</b>`,
      `${ctx.node.name}${cs}`,
      `<i>${t('card.menu.hint', locale)}</i>`,
    ].join('\n'),
    parseMode: 'HTML',
    keyboard: menuKeyboard(),
    editMessageId: input.editMessageId,
  };
}
