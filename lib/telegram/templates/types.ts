/**
 * Telegram message template registry — partner-facing cards (HTML + keyboards).
 */
import type { FlowLocale, KeyboardSpec } from '../flows/types.ts';

export type TemplateId =
  | 'partner.welcome.v1'
  | 'status.v1'
  | 'balances.v1'
  | 'accounts.v1'
  | 'plays.v1'
  | 'tree.v1'
  | 'play.ack.v1'
  | 'onboard.complete.v1'
  | 'limit.stale.v1'
  | 'gate.blocked.v1'
  | 'menu.v1';

export type TemplateContext = {
  callSign?: string;
  displayName?: string;
  parentName?: string;
  expertName?: string;
  locale: FlowLocale;
  soft?: { partner: number; expert: number; house: number };
  principalOut?: number;
  hard?: number;
  pending?: number;
  treeNodeId?: string; // brand-ok — TreeNodeId wire in template context
  phoneLabel?: string;
  jurisdiction?: string;
  sportsbook?: string;
  taskId?: string; // brand-ok — toc task id wire
  gateReason?: string;
  playId?: string; // brand-ok — plays.id wire
  partnerTemplate?: string; // brand-ok — PartnerTemplateId slug
  accountsCount?: number;
  placedCount?: number;
  pnl?: number;
  treeHint?: string;
  menuTitle?: string;
  menuSubtitle?: string;
  menuHint?: string;
  /** Card body lines (HTML-safe when pre-escaped by caller). */
  detailLines?: string[];
  emptyHint?: string;
};

export type RenderedMessage = {
  templateId: TemplateId;
  text: string;
  parseMode: 'HTML';
  keyboard?: KeyboardSpec;
  photo?: { fileIdOrUrl: string; caption?: string };
};

export type ProfileMessageTemplates = {
  locale: FlowLocale;
  welcomeTemplate: TemplateId;
  balancesTemplate: TemplateId;
  statusTemplate: TemplateId;
};
