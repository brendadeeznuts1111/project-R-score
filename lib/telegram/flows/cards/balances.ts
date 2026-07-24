/**
 * Balances flow card — read-only TOC Soft / hard snapshot.
 */
import { fmt, getBalancesSnapshot } from '../balances-snapshot.ts';
import { t } from '../i18n.ts';
import { balancesKeyboard } from '../keyboards.ts';
import type { FlowContext, FlowInput, FlowOutput } from '../types.ts';

export function balancesFlow(input: FlowInput, ctx: FlowContext): FlowOutput {
  const locale = input.locale ?? 'en';
  if (!ctx.node) {
    return {
      text: `<b>${t('card.not_registered', locale)}</b>`,
      parseMode: 'HTML',
    };
  }

  const snap = getBalancesSnapshot(ctx.db, {
    treeNodeId: input.treeNodeId,
    callSign: input.callSign ?? ctx.node.call_sign,
  });

  return {
    text: [
      `<b>${t('card.balances.title', locale)} · ${snap.label}</b>`,
      `Soft Partner: ${fmt(snap.soft.partner)}`,
      `Soft Expert:  ${fmt(snap.soft.expert)}`,
      `Soft House:   ${fmt(snap.soft.house)}`,
      `Principal out: ${fmt(snap.principalOut)}`,
      `Hard (seat):  ${fmt(snap.hard)}`,
      `Pending plays: ${snap.pending}`,
      '',
      '<i>Read-only · no Soft post from bot</i>',
    ].join('\n'),
    parseMode: 'HTML',
    keyboard: balancesKeyboard(),
    editMessageId: input.editMessageId,
  };
}
