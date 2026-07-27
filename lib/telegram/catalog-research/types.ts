/**
 * Telegram catalog research agent — enhancement proposal schema.
 *
 * Output: `reports/telegram/catalog-enhancements.json`
 * Machine ref: `bun run telegram:catalog:research --json`
 */
export const CATALOG_ENHANCEMENT_SCHEMA = 'factorywager.telegram-catalog-enhancement.v1' as const;

/** Bot API `createForumTopic` / `editForumTopic` icon_color (0–6). */
export const FORUM_TOPIC_ICON_COLOR_MAX = 6 as const;

export type CatalogEnhancementSeverity = 'info' | 'recommendation' | 'action';

export type CatalogEnhancementTarget =
  | { kind: 'catalog'; section: 'packageForumTopics' | 'houseForumTopics' | 'seatDeskTemplates' }
  | { kind: 'partner-forum'; partnerCode: string }
  | { kind: 'house-surface'; surfaceSlug: string }
  | {
      kind: 'topic';
      forumKind: 'partner-package' | 'house-surface';
      mapKeyOrSlug: string;
      partnerCode?: string;
      surfaceSlug?: string;
    };

export type CatalogEnhancementAction =
  | 'addTopicIconMetadata'
  | 'updateTopicIcon'
  | 'addPinnedMessageTemplate'
  | 'ensureTopic'
  | 'postTopicPrompt'
  | 'setGroupDescription'
  | 'documentBehavior'
  | 'addTopic'
  | 'syncCatalogField';

export type ForumTopicIconSuggestion = {
  /** Bot API icon_color index 0–6. */
  iconColor: number;
  /** Display emoji for operators (not sent to API unless custom emoji id wired). */
  emoji: string;
};

export type CatalogEnhancementValidation = {
  ok: boolean;
  notes: readonly string[];
};

export type CatalogEnhancementProposal = {
  /** Stable id for dedupe / PR threads. */
  id: string; // brand-ok — opaque proposal primary key
  severity: CatalogEnhancementSeverity;
  target: CatalogEnhancementTarget;
  action: CatalogEnhancementAction;
  title: string;
  reason: string;
  evidence: readonly string[];
  suggestedChange?: Record<string, unknown>;
  /** Operator or bot command when applicable. */
  applyCommand?: string;
  /** Safe to auto-apply without human review (metadata-only, no deletes). */
  autoApplySafe: boolean;
  validation?: CatalogEnhancementValidation;
};

export const CATALOG_ENHANCEMENTS_REL = 'reports/telegram/catalog-enhancements.json';

export type CatalogEnhancementChange = CatalogEnhancementProposal & {
  /** Shorthand for icon patches (matches user-facing schema). */
  newIcon?: ForumTopicIconSuggestion;
  newDescription?: string;
  templateId?: string; // brand-ok — catalog template slug
};

export function proposalToChange(proposal: CatalogEnhancementProposal): CatalogEnhancementChange {
  const change: CatalogEnhancementChange = { ...proposal };
  const sc = proposal.suggestedChange;
  if (sc?.suggestedIcon && typeof sc.suggestedIcon === 'object') {
    change.newIcon = sc.suggestedIcon as ForumTopicIconSuggestion;
  }
  if (typeof sc?.description === 'string') change.newDescription = sc.description;
  if (typeof sc?.templateId === 'string') change.templateId = sc.templateId;
  return change;
}

import type { HandshakeCatalog } from '../handshake-catalog.ts';
import type { CatalogResearchSignals } from './signals.ts';

export type CatalogEnhancementReport = {
  schema: typeof CATALOG_ENHANCEMENT_SCHEMA;
  meta: {
    timestamp: string;
    reason: string;
    catalogPath: string;
    catalogSchema: string;
    catalogGeneratedAt: string;
    systemTimeZone: string;
  };
  catalog: {
    schema: string;
    generatedAt: string;
    packageForumTopics: HandshakeCatalog['packageForumTopics'];
    houseForumTopics: HandshakeCatalog['houseForumTopics'];
  };
  signals: CatalogResearchSignals;
  changes: CatalogEnhancementChange[];
  generatedAt: string;
  catalogSchema: string;
  catalogGeneratedAt: string;
  sources: readonly string[];
  proposalCount: number;
  bySeverity: Record<CatalogEnhancementSeverity, number>;
  proposals: CatalogEnhancementProposal[];
  llm?: {
    model: string;
    proposalCount: number;
    skipped?: string;
  };
};

export type CatalogResearchContext = {
  catalogPath: string;
  forumsMetaDir: string;
  partnerCodes: readonly string[];
  forumMetaByPartner: Map<
    string,
    {
      topicsComplete: boolean;
      accountingThreadId: number | null;
      accountingPromptPosted: boolean;
      /** Seat capital desk pinned in Liquidity/Outs (intake JSON). */
      seatDeskPosted: boolean;
      missingTopics: readonly string[];
      liquidityThreadId: number | null;
    }
  >;
  /** House forum metadata snapshot (hq · all-accounting · sandbox). */
  houseMetaBySurface: Map<
    string,
    {
      chatId: string | null; // brand-ok
      welcomePromptPosted: boolean;
    }
  >;
  /** Seat capital fund status from intake JSON (when desk posted). */
  seatCapitalByPartner: Map<
    string,
    {
      callSign: string;
      fundStatus: string;
      fundDetail: string;
      incompleteOuts: number;
    }
  >;
  allAccountingPromptPosted: boolean;
};
