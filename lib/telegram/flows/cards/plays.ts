/**
 * Plays flow card — thin caller of plays.v1.
 */
import { asTreeNodeId } from '../../brands.ts';
import { escapeHtml } from '../../templates/escape.ts';
import { renderForNode } from '../../templates/render.ts';
import { t } from '../i18n.ts';
import type { FlowContext, FlowInput, FlowOutput } from '../types.ts';

export function playsFlow(input: FlowInput, ctx: FlowContext): FlowOutput {
  const locale = input.locale ?? 'en';
  if (!ctx.node) {
    return {
      text: `<b>${t('card.not_registered', locale)}</b>`,
      parseMode: 'HTML',
    };
  }

  const plays = ctx.db
    .query(
      `SELECT p.sport, p.market, p.event, p.selection, p.odds, p.confidence, p.sent_at, d.ack_status
       FROM plays p JOIN play_distribution d ON p.id = d.play_id
       WHERE d.node_id = $n AND p.result = 'pending'
       ORDER BY p.sent_at DESC LIMIT 5`
    )
    .all({ $n: ctx.node.id }) as Array<{
    sport: string;
    market: string;
    event: string;
    selection: string;
    odds: number;
    confidence: number;
    sent_at: string;
    ack_status: string;
  }>;

  const treeNodeId = input.treeNodeId ?? asTreeNodeId(ctx.node.id);
  const detailLines = plays.flatMap(p => [
    `🎯 <b>${escapeHtml(p.sport)} ${escapeHtml(p.market)}</b> (${escapeHtml(p.ack_status)})`,
    `${escapeHtml(p.event)}: ${escapeHtml(p.selection)} @ ${p.odds > 0 ? '+' : ''}${p.odds}`,
    `   ${p.confidence}% · ${p.sent_at.slice(11, 16)}`,
    '',
  ]);

  const rendered = renderForNode(ctx.db, 'plays.v1', treeNodeId, {
    locale,
    pending: plays.length,
    detailLines,
    emptyHint: plays.length ? undefined : 'None.',
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
