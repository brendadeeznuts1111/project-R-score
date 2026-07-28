/**
 * Accounts flow card — thin caller of accounts.v1.
 */
import { asTreeNodeId } from '../../brands.ts';
import { escapeHtml } from '../../templates/escape.ts';
import { renderForNode } from '../../templates/render.ts';
import { t } from '../i18n.ts';
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

  const treeNodeId = input.treeNodeId ?? asTreeNodeId(ctx.node.id);
  const detailLines = accounts.map(
    a =>
      `${escapeHtml(a.book)}: <b>${escapeHtml(a.username || '—')}</b> — $${a.balance.toFixed(0)} (${escapeHtml(a.status)})`
  );

  const rendered = renderForNode(ctx.db, 'accounts.v1', treeNodeId, {
    locale,
    accountsCount: accounts.length,
    detailLines,
    emptyHint: accounts.length ? undefined : 'No accounts — contact referrer to get funded.',
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
