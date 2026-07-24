/**
 * Accounts flow card.
 */
import { t } from '../i18n.ts';
import { navFooterKeyboard } from '../keyboards.ts';
import type { FlowContext, FlowInput, FlowOutput } from '../types.ts';

export function accountsFlow(input: FlowInput, ctx: FlowContext): FlowOutput {
  const locale = input.locale ?? 'en';
  if (!ctx.node) {
    return {
      text: `<b>${t('card.not_registered', locale)}</b>`,
      parseMode: 'HTML',
    };
  }

  const accounts = ctx.db
    .query(
      'SELECT book, username, balance, status FROM sb_accounts WHERE agent_id = $a ORDER BY book'
    )
    .all({ $a: ctx.node.id }) as {
    book: string;
    username: string;
    balance: number;
    status: string;
  }[];

  if (!accounts.length) {
    return {
      text: '<b>Accounts</b>\nNo accounts — contact referrer to get funded.',
      parseMode: 'HTML',
      keyboard: navFooterKeyboard('accounts', 'f:accounts:r'),
      editMessageId: input.editMessageId,
    };
  }

  const rows = accounts.map(
    a => `${a.book}: <b>${a.username || '—'}</b> — $${a.balance.toFixed(0)} (${a.status})`
  );

  return {
    text: ['<b>Accounts</b>', '', ...rows].join('\n'),
    parseMode: 'HTML',
    keyboard: navFooterKeyboard('accounts', 'f:accounts:r'),
    editMessageId: input.editMessageId,
  };
}
