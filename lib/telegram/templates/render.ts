// @see https://bun.com/docs/runtime/sqlite
/**
 * Single render path for outbox + bot flows: templateId + treeNodeId → RenderedMessage.
 */
import type { Database } from 'bun:sqlite';
import type { TreeNodeId } from '../../types/branded/operations.ts';
import {
  buildTemplateContext,
  getPartnerMessageProfile,
  type BuildTemplateContextOpts,
} from './context.ts';
import { renderTemplate } from './registry.ts';
import type { RenderedMessage, TemplateId } from './types.ts';

export type RenderForNodeOpts = BuildTemplateContextOpts & {
  /** Override profile-selected template id. */
  templateId?: TemplateId;
};

/** Resolve profile template preference for common cards. */
export function resolveTemplateIdForCard(
  db: Database,
  treeNodeId: TreeNodeId,
  card: 'welcome' | 'balances' | 'status'
): TemplateId {
  const profile = getPartnerMessageProfile(db, treeNodeId);
  if (!profile) {
    if (card === 'balances') return 'balances.v1';
    if (card === 'status') return 'status.v1';
    return 'partner.welcome.v1';
  }
  if (card === 'balances') return profile.templates.balancesTemplate;
  if (card === 'status') return profile.templates.statusTemplate;
  return profile.templates.welcomeTemplate;
}

/**
 * Deep render path — profile + seat Soft + phone → HTML + KeyboardSpec.
 * Returns null when the tree node does not exist.
 */
export function renderForNode(
  db: Database,
  templateId: TemplateId,
  treeNodeId: TreeNodeId,
  opts?: RenderForNodeOpts
): RenderedMessage | null {
  const ctx = buildTemplateContext(db, treeNodeId, opts);
  if (!ctx) return null;
  return renderTemplate(opts?.templateId ?? templateId, ctx);
}
