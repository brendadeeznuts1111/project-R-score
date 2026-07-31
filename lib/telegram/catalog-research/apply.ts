// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/**
 * Apply enhancement report → catalog overrides + regenerate registry catalog.
 */
import { exportTelegramHandshakeCatalog } from '../handshake-snapshot.ts';
import {
  CATALOG_ENHANCEMENTS_REL,
  type CatalogEnhancementProposal,
  type CatalogEnhancementReport,
} from './types.ts';
import { loadCatalogOverrides, saveCatalogOverrides, type CatalogOverrides } from './merge.ts';

export type ApplyEnhancementsOpts = {
  root?: string;
  /** Only apply proposals with autoApplySafe (default true). */
  safeOnly?: boolean;
  dryRun?: boolean;
};

export type ApplyEnhancementsResult = {
  applied: number;
  skipped: number;
  overridesPath?: string;
  catalogPath?: string;
  appliedIds: string[];
};

function houseIconKey(proposal: CatalogEnhancementProposal): string | null {
  if (proposal.target.kind !== 'topic' || proposal.target.forumKind !== 'house-surface')
    return null;
  const slug = proposal.target.surfaceSlug;
  if (!slug) return null;
  return `${slug}:${proposal.target.mapKeyOrSlug}`;
}

export function applyProposalToOverrides(
  overrides: CatalogOverrides,
  proposal: CatalogEnhancementProposal
): boolean {
  if (overrides.appliedChangeIds.includes(proposal.id)) return false;

  const icon = proposal.suggestedChange?.suggestedIcon as
    | { iconColor: number; emoji: string }
    | undefined;

  switch (proposal.action) {
    case 'addTopicIconMetadata':
    case 'updateTopicIcon': {
      if (!icon) return false;
      if (proposal.target.kind === 'topic' && proposal.target.forumKind === 'partner-package') {
        overrides.partnerTopicIcons[proposal.target.mapKeyOrSlug] = icon;
        overrides.appliedChangeIds.push(proposal.id);
        return true;
      }
      const hk = houseIconKey(proposal);
      if (hk && icon) {
        overrides.houseTopicIcons[hk] = icon;
        overrides.appliedChangeIds.push(proposal.id);
        return true;
      }
      return false;
    }
    case 'addPinnedMessageTemplate': {
      const templateId = proposal.suggestedChange?.templateId;
      if (typeof templateId !== 'string') return false;
      const builder =
        typeof proposal.suggestedChange?.builder === 'string'
          ? proposal.suggestedChange.builder
          : undefined;
      if (proposal.target.kind === 'topic' && proposal.target.forumKind === 'partner-package') {
        const mapKey = proposal.target.mapKeyOrSlug;
        const key =
          templateId === 'topic-intake'
            ? `partner:${mapKey}:intake`
            : templateId === 'topic-rails'
              ? `partner:${mapKey}:rails`
              : `partner:${mapKey}`;
        overrides.pinnedMessageTemplates[key] = {
          templateId,
          builder,
        };
        overrides.appliedChangeIds.push(proposal.id);
        return true;
      }
      if (proposal.target.kind === 'house-surface') {
        overrides.pinnedMessageTemplates[`house:${proposal.target.surfaceSlug}`] = {
          templateId,
          builder,
        };
        overrides.appliedChangeIds.push(proposal.id);
        return true;
      }
      return false;
    }
    case 'setGroupDescription': {
      if (proposal.target.kind !== 'house-surface') return false;
      const desc = proposal.suggestedChange?.description;
      if (typeof desc !== 'string' || !desc.trim()) return false;
      overrides.groupDescriptions[proposal.target.surfaceSlug] = desc;
      overrides.appliedChangeIds.push(proposal.id);
      return true;
    }
    case 'documentBehavior': {
      overrides.behaviorNotes[proposal.id] = {
        title: proposal.title,
        reason: proposal.reason,
        evidence: [...(proposal.evidence ?? [])],
      };
      overrides.appliedChangeIds.push(proposal.id);
      return true;
    }
    default:
      return false;
  }
}

export async function loadEnhancementReport(
  root = process.cwd()
): Promise<CatalogEnhancementReport | null> {
  const rel = CATALOG_ENHANCEMENTS_REL;
  const abs = root.endsWith('/') ? `${root}${rel}` : `${root}/${rel}`;
  const file = Bun.file(abs);
  if (!(await file.exists())) return null;
  return (await file.json()) as CatalogEnhancementReport;
}

export async function applyCatalogEnhancements(
  opts: ApplyEnhancementsOpts = {}
): Promise<ApplyEnhancementsResult> {
  const root = opts.root ?? process.cwd();
  const report = await loadEnhancementReport(root);
  if (!report) {
    throw new Error(
      `Missing ${CATALOG_ENHANCEMENTS_REL} — run bun run telegram:catalog:research first`
    );
  }

  const safeOnly = opts.safeOnly !== false;
  const candidates = report.changes ?? report.proposals;
  const toApply = candidates.filter(p => !safeOnly || p.autoApplySafe);

  const overrides = await loadCatalogOverrides(root);
  let applied = 0;
  let skipped = 0;
  const appliedIds: string[] = [];

  for (const proposal of toApply) {
    const ok = applyProposalToOverrides(overrides, proposal);
    if (ok) {
      applied++;
      appliedIds.push(proposal.id);
    } else {
      skipped++;
    }
  }

  let overridesPath: string | undefined;
  let catalogPath: string | undefined;

  if (!opts.dryRun && applied > 0) {
    overridesPath = await saveCatalogOverrides(overrides, root);
    catalogPath = await exportTelegramHandshakeCatalog(root);
  }

  return { applied, skipped, overridesPath, catalogPath, appliedIds };
}
