/**
 * Deterministic catalog analyzers — no LLM required.
 */
import { descriptionForSurface } from '../branding.ts';
import {
  ALL_ACCOUNTING_CHANNEL_TEMPLATE_SPEC,
  HOUSE_FORUM_WELCOME_TEMPLATE_SPECS,
  SEAT_DESK_PARTNER_MESSAGE_TEMPLATES,
} from '../seat-desk-partner-message.ts';
import {
  ALL_ACCOUNTING_SURFACE_SLUG,
  formatTocOpsGroupTitle,
  loadTelegramSurfacesMap,
  TOC_OPS_SURFACES,
} from '../surfaces.ts';
import { loadTelegramEnv } from '../telegram-config.ts';
import type { HandshakeCatalog } from '../handshake-catalog.ts';
import { HOUSE_TOPIC_ICON_SUGGESTIONS, PARTNER_TOPIC_ICON_SUGGESTIONS } from './suggested-icons.ts';
import type { CatalogEnhancementProposal, CatalogResearchContext } from './types.ts';
import { proposalId, validateForumTopicIconSuggestion } from './validators.ts';

function push(proposals: CatalogEnhancementProposal[], p: CatalogEnhancementProposal): void {
  if (proposals.some(x => x.id === p.id)) return;
  proposals.push(p);
}

function resolveHouseSurfaceChatId(
  surfaceSlug: string,
  context: CatalogResearchContext
): string | null {
  const map = loadTelegramSurfacesMap();
  const tg = loadTelegramEnv();
  const fromMap = map[surfaceSlug]?.trim();
  if (fromMap) return fromMap;
  const metaChat = context.houseMetaBySurface.get(surfaceSlug)?.chatId?.trim() ?? null;
  if (surfaceSlug === ALL_ACCOUNTING_SURFACE_SLUG) {
    return tg.accountingChatId?.trim() ?? metaChat;
  }
  if (surfaceSlug === 'hq') {
    return tg.opsChatId?.trim() ?? metaChat;
  }
  return metaChat;
}

/** Catalog rows lack icon metadata — suggest SSOT fields for partner topics. */
export function analyzePartnerTopicIconMetadata(
  catalog: HandshakeCatalog
): CatalogEnhancementProposal[] {
  const proposals: CatalogEnhancementProposal[] = [];
  for (const row of catalog.packageForumTopics.rows) {
    if (row.title === 'General') continue;
    if (row.icon) continue;
    const icon = PARTNER_TOPIC_ICON_SUGGESTIONS[row.mapKey];
    if (!icon) continue;
    const validation = validateForumTopicIconSuggestion(icon);
    push(proposals, {
      id: proposalId(['catalog', 'partner-icon', row.mapKey]),
      severity: 'recommendation',
      target: {
        kind: 'topic',
        forumKind: 'partner-package',
        mapKeyOrSlug: row.mapKey,
      },
      action: 'addTopicIconMetadata',
      title: `Add icon metadata for partner topic ${row.title}`,
      reason:
        'Handshake catalog defines topic titles and roles but not Bot API icon_color — operators cannot reproduce consistent forum branding.',
      evidence: [`mapKey=${row.mapKey}`, `role=${row.role}`, `catalog.schema=${catalog.schema}`],
      suggestedChange: { mapKey: row.mapKey, suggestedIcon: icon },
      autoApplySafe: true,
      validation: { ok: validation.ok, notes: validation.notes },
    });
  }
  return proposals;
}

/** House surface topics lack icon metadata in catalog. */
export function analyzeHouseTopicIconMetadata(
  catalog: HandshakeCatalog
): CatalogEnhancementProposal[] {
  const proposals: CatalogEnhancementProposal[] = [];
  for (const [slug, surface] of Object.entries(catalog.houseForumTopics.surfaces)) {
    const topicIcons = (surface as { topicIcons?: Record<string, unknown> }).topicIcons;
    for (const topicSlug of surface.topicSlugs) {
      if (topicIcons?.[topicSlug]) continue;
      const icon = HOUSE_TOPIC_ICON_SUGGESTIONS[topicSlug];
      if (!icon) continue;
      const validation = validateForumTopicIconSuggestion(icon);
      push(proposals, {
        id: proposalId(['catalog', 'house-icon', slug, topicSlug]),
        severity: 'recommendation',
        target: {
          kind: 'topic',
          forumKind: 'house-surface',
          mapKeyOrSlug: topicSlug,
          surfaceSlug: slug,
        },
        action: 'addTopicIconMetadata',
        title: `Add icon metadata for ${slug} · ${topicSlug}`,
        reason:
          'House surface topic slugs have no icon_color in catalog — hard to provision consistently via Bot API.',
        evidence: [`surface=${slug}`, `groupTitle=${surface.groupTitle}`, `topicSlug=${topicSlug}`],
        suggestedChange: { surfaceSlug: slug, topicSlug, suggestedIcon: icon },
        autoApplySafe: true,
        validation: { ok: validation.ok, notes: validation.notes },
      });
    }
  }
  return proposals;
}

/** Pinned templates already exist in code but not wired in catalog rows. */
export function analyzePinnedMessageTemplates(
  catalog: HandshakeCatalog,
  context: CatalogResearchContext
): CatalogEnhancementProposal[] {
  const proposals: CatalogEnhancementProposal[] = [];
  const pinnedRefs = (
    catalog.seatDeskTemplates as {
      pinnedTemplateRefs?: Record<string, { templateId?: string; builder?: string }>; // brand-ok — template slug wire
    }
  ).pinnedTemplateRefs;
  const accounting = SEAT_DESK_PARTNER_MESSAGE_TEMPLATES['topic-accounting'];
  if (!pinnedRefs?.['partner:accounting']) {
    push(proposals, {
      id: proposalId(['catalog', 'pinned-template', 'accounting']),
      severity: 'recommendation',
      target: {
        kind: 'topic',
        forumKind: 'partner-package',
        mapKeyOrSlug: catalog.packageForumTopics.accountingTopicKey,
      },
      action: 'addPinnedMessageTemplate',
      title: 'Wire Accounting topic pinned prompt into catalog metadata',
      reason:
        'Intake-driven accounting prompt exists in seat-desk templates but catalog topic rows lack pinnedMessageTemplate ref.',
      evidence: [`template=${accounting.id}`, `cli=${accounting.cli}`],
      suggestedChange: {
        mapKey: catalog.packageForumTopics.accountingTopicKey,
        templateId: accounting.id,
        builder: 'buildSeatDeskAccountingTopicPrompt',
      },
      applyCommand: 'bun run telegram:package-group:accounting',
      autoApplySafe: false,
    });
  }

  for (const kind of ['topic-intake', 'topic-rails'] as const) {
    const spec = SEAT_DESK_PARTNER_MESSAGE_TEMPLATES[kind];
    const intakeKey = `partner:${catalog.packageForumTopics.deskTopicKey}:intake`;
    const railsKey = `partner:${catalog.packageForumTopics.deskTopicKey}:rails`;
    if (kind === 'topic-intake' && pinnedRefs?.[intakeKey]) continue;
    if (
      kind === 'topic-rails' &&
      (pinnedRefs?.[railsKey] || pinnedRefs?.['partner:liquidity/outs'])
    )
      continue;
    push(proposals, {
      id: proposalId(['catalog', 'pinned-template', kind]),
      severity: 'info',
      target: {
        kind: 'topic',
        forumKind: 'partner-package',
        mapKeyOrSlug: catalog.packageForumTopics.deskTopicKey,
      },
      action: 'addPinnedMessageTemplate',
      title: `Catalog ref for Liquidity/Outs template ${kind}`,
      reason:
        'Short intake-driven thread prompts should be first-class catalog metadata for partner forums.',
      evidence: [`template=${spec.id}`, `thread=${spec.thread}`],
      suggestedChange: { mapKey: catalog.packageForumTopics.deskTopicKey, templateId: spec.id },
      applyCommand: 'bun run seat:desk:topic-prompts CALL-SIGN --post',
      autoApplySafe: false,
    });
  }

  if (
    !pinnedRefs?.['house:all-accounting'] &&
    !context.allAccountingPromptPosted &&
    !resolveHouseSurfaceChatId(ALL_ACCOUNTING_SURFACE_SLUG, context)
  ) {
    push(proposals, {
      id: proposalId(['catalog', 'pinned-template', 'all-accounting']),
      severity: 'info',
      target: { kind: 'house-surface', surfaceSlug: 'all-accounting' },
      action: 'addPinnedMessageTemplate',
      title: 'House all-accounting channel rollup prompt',
      reason: ALL_ACCOUNTING_CHANNEL_TEMPLATE_SPEC.purpose,
      evidence: [`cli=${ALL_ACCOUNTING_CHANNEL_TEMPLATE_SPEC.cli}`],
      suggestedChange: {
        templateId: 'all-accounting-channel',
        builder: ALL_ACCOUNTING_CHANNEL_TEMPLATE_SPEC.builder,
      },
      applyCommand: ALL_ACCOUNTING_CHANNEL_TEMPLATE_SPEC.cli,
      autoApplySafe: false,
    });
  }

  for (const spec of HOUSE_FORUM_WELCOME_TEMPLATE_SPECS) {
    if (pinnedRefs?.[`house:${spec.surfaceSlug}`]) continue;
    if (context.houseMetaBySurface.get(spec.surfaceSlug)?.welcomePromptPosted) continue;
    if (!resolveHouseSurfaceChatId(spec.surfaceSlug, context)) continue;
    push(proposals, {
      id: proposalId(['catalog', 'pinned-template', spec.surfaceSlug]),
      severity: 'info',
      target: { kind: 'house-surface', surfaceSlug: spec.surfaceSlug },
      action: 'addPinnedMessageTemplate',
      title: `${spec.label} welcome prompt`,
      reason: 'House forum General topic should carry operator routing copy once surface is bound.',
      evidence: [`cli=${spec.cli}`, `builder=${spec.builder}`],
      suggestedChange: {
        templateId: spec.id,
        builder: spec.builder,
      },
      applyCommand: spec.cli,
      autoApplySafe: false,
    });
  }

  return proposals;
}

/** House surfaces missing TELEGRAM_SURFACES / env chat binding. */
export function analyzeHouseSurfaceBindingGaps(
  context: CatalogResearchContext
): CatalogEnhancementProposal[] {
  const proposals: CatalogEnhancementProposal[] = [];

  for (const surface of TOC_OPS_SURFACES) {
    if (surface.concern === 'partner') continue;
    const chatId = resolveHouseSurfaceChatId(surface.slug, context);
    if (chatId) continue;

    const isAccounting = surface.slug === ALL_ACCOUNTING_SURFACE_SLUG;
    if (isAccounting && context.allAccountingPromptPosted) continue;

    push(proposals, {
      id: proposalId(['house', surface.slug, 'unbound']),
      severity: isAccounting ? 'action' : 'recommendation',
      target: { kind: 'house-surface', surfaceSlug: surface.slug },
      action: 'ensureTopic',
      title: `${surface.slug}: house surface unbound`,
      reason: `No chat_id for ${formatTocOpsGroupTitle(surface)} — surface graph shows missing binding.`,
      evidence: [`expectedTitle=${formatTocOpsGroupTitle(surface)}`, 'TELEGRAM_SURFACES unset'],
      applyCommand: isAccounting
        ? 'bun run telegram:all-accounting:bind --chat CHAT_ID --brand --post-prompt'
        : `bun run telegram:brand -- --surface ${surface.slug} --chat CHAT_ID`,
      autoApplySafe: false,
    });
  }
  return proposals;
}

/** Group descriptions for house supergroups. */
export function analyzeHouseGroupDescriptions(
  catalog: HandshakeCatalog
): CatalogEnhancementProposal[] {
  const proposals: CatalogEnhancementProposal[] = [];
  for (const surface of TOC_OPS_SURFACES) {
    const live = catalog.houseForumTopics.surfaces[surface.slug] as
      | { groupDescription?: string }
      | undefined;
    if (live?.groupDescription?.trim()) continue;
    push(proposals, {
      id: proposalId(['house', 'description', surface.slug]),
      severity: 'recommendation',
      target: { kind: 'house-surface', surfaceSlug: surface.slug },
      action: 'setGroupDescription',
      title: `Set Telegram About for ${surface.slug}`,
      reason:
        'House surfaces have purpose text in surfaces.ts but no catalog field driving setChatDescription sync.',
      evidence: [`purpose=${surface.purpose.slice(0, 80)}…`],
      suggestedChange: {
        surfaceSlug: surface.slug,
        description: descriptionForSurface(surface.slug),
      },
      applyCommand: `bun run telegram:brand -- --groups  # includes ${surface.slug}`,
      autoApplySafe: false,
    });
  }
  return proposals;
}

/** General topic is implicit — document, do not bot-create. */
export function analyzeGeneralTopicBehavior(
  catalog: HandshakeCatalog
): CatalogEnhancementProposal[] {
  const general = catalog.packageForumTopics.rows.find(r => r.mapKey === 'general');
  if (!general) return [];
  return [
    {
      id: proposalId(['partner', 'general', 'document']),
      severity: 'info',
      target: { kind: 'catalog', section: 'packageForumTopics' },
      action: 'documentBehavior',
      title: 'Partner General topic stays implicit (thread 1)',
      reason:
        'Telegram forums always have General as thread 1 — createForumTopic must not recreate it; catalog should document operator expectation.',
      evidence: [`botCreated=${general.botCreated}`, 'enhance-package-group-forum skips General'],
      suggestedChange: {
        mapKey: 'general',
        operatorNote: 'Never call createForumTopic for General — use message_thread_id=1.',
      },
      autoApplySafe: true,
    },
  ];
}

/** Live forum metadata gaps vs standardized partner plan. */
export function analyzeLiveForumGaps(
  context: CatalogResearchContext
): CatalogEnhancementProposal[] {
  const proposals: CatalogEnhancementProposal[] = [];
  for (const code of context.partnerCodes) {
    const live = context.forumMetaByPartner.get(code);
    if (!live) {
      push(proposals, {
        id: proposalId(['partner', code, 'no-metadata']),
        severity: 'action',
        target: { kind: 'partner-forum', partnerCode: code },
        action: 'ensureTopic',
        title: `${code}: missing forum metadata file`,
        reason:
          'Linked partner has no reports/telegram/forums/{CODE}.json — topic routing cannot resolve.',
        evidence: [`expected=${context.forumsMetaDir}/${code}.json`],
        applyCommand: `bun run telegram:package-group:enhance ${code} --ensure-topics`,
        autoApplySafe: false,
      });
      continue;
    }

    if (live.missingTopics.length) {
      push(proposals, {
        id: proposalId(['partner', code, 'missing-topics']),
        severity: 'action',
        target: { kind: 'partner-forum', partnerCode: code },
        action: 'ensureTopic',
        title: `${code}: incomplete topic plan`,
        reason: 'Partner package forums must expose the full five-topic plan with thread ids.',
        evidence: live.missingTopics.map(t => `missing=${t}`),
        applyCommand: `bun run telegram:package-group:enhance ${code} --ensure-topics`,
        autoApplySafe: false,
      });
    }

    if (live.accountingThreadId && !live.accountingPromptPosted) {
      push(proposals, {
        id: proposalId(['partner', code, 'accounting-prompt']),
        severity: 'action',
        target: {
          kind: 'topic',
          forumKind: 'partner-package',
          mapKeyOrSlug: 'accounting',
          partnerCode: code,
        },
        action: 'postTopicPrompt',
        title: `${code}: Accounting topic missing bootstrap prompt`,
        reason:
          'Accounting thread exists but accountingPromptMessageId not set — partners lack proof-thread instructions.',
        evidence: [`accountingThreadId=${live.accountingThreadId}`],
        applyCommand: `bun run telegram:package-group:enhance ${code} --accounting-prompt`,
        autoApplySafe: false,
      });
    }

    if (live.liquidityThreadId && !live.seatDeskPosted) {
      push(proposals, {
        id: proposalId(['partner', code, 'liquidity-prompts']),
        severity: 'recommendation',
        target: {
          kind: 'topic',
          forumKind: 'partner-package',
          mapKeyOrSlug: 'liquidity/outs',
          partnerCode: code,
        },
        action: 'postTopicPrompt',
        title: `${code}: post short Liquidity/Outs topic prompts`,
        reason: 'Intake-driven topic-intake and topic-rails replace verbose manual TOC Ops posts.',
        evidence: [`liquidityThreadId=${live.liquidityThreadId}`, 'seat:desk:topic-prompts'],
        applyCommand: `bun run seat:desk:topic-prompts ${code}-001 --post`,
        autoApplySafe: false,
      });
    }
  }
  return proposals;
}

/** Capital desks blocked on default rail/send-to — harness or partner Fill. */
export function analyzeSeatCapitalDeskGaps(
  context: CatalogResearchContext
): CatalogEnhancementProposal[] {
  const proposals: CatalogEnhancementProposal[] = [];
  for (const code of context.partnerCodes) {
    const live = context.seatCapitalByPartner.get(code);
    if (!live || live.fundStatus !== 'blocked') continue;
    push(proposals, {
      id: proposalId(['partner', code, 'capital-blocked']),
      severity: 'action',
      target: { kind: 'partner-forum', partnerCode: code },
      action: 'postTopicPrompt',
      title: `${code}: capital desk blocked — ${live.fundDetail}`,
      reason:
        'Lead out missing deposit method and/or send-to. Post topic-rails or apply harness staging defaults for single-operator testing.',
      evidence: [
        `callSign=${live.callSign}`,
        `fundStatus=${live.fundStatus}`,
        `incompleteOuts=${live.incompleteOuts}`,
      ],
      applyCommand: `bun tools/seat-desk-cli.ts harness-rails ${live.callSign}`,
      autoApplySafe: false,
    });
  }
  return proposals;
}

export function runDeterministicAnalyzers(
  catalog: HandshakeCatalog,
  context: CatalogResearchContext
): CatalogEnhancementProposal[] {
  return [
    ...analyzePartnerTopicIconMetadata(catalog),
    ...analyzeHouseTopicIconMetadata(catalog),
    ...analyzePinnedMessageTemplates(catalog, context),
    ...analyzeHouseGroupDescriptions(catalog),
    ...analyzeGeneralTopicBehavior(catalog),
    ...analyzeLiveForumGaps(context),
    ...analyzeSeatCapitalDeskGaps(context),
    ...analyzeHouseSurfaceBindingGaps(context),
  ].sort((a, b) => {
    const rank = { action: 0, recommendation: 1, info: 2 };
    return rank[a.severity] - rank[b.severity] || a.id.localeCompare(b.id);
  });
}
