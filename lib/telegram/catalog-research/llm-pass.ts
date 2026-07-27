// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Optional LLM pass — merges structured suggestions when API key configured.
 *
 * Env: `TELEGRAM_CATALOG_RESEARCH_LLM_URL` (OpenAI-compatible) or `OPENAI_API_KEY`
 *      `TELEGRAM_CATALOG_RESEARCH_LLM_MODEL` (default gpt-4o-mini)
 */
import type { HandshakeCatalog } from '../handshake-catalog.ts';
import type { CatalogEnhancementProposal } from './types.ts';
import { proposalId, validateForumTopicIconSuggestion } from './validators.ts';

export type LlmResearchOpts = {
  catalog: HandshakeCatalog;
  deterministic: readonly CatalogEnhancementProposal[];
  telegramNotes?: readonly string[];
};

export type LlmResearchResult = {
  proposals: CatalogEnhancementProposal[];
  model: string;
  skipped?: string;
};

const SYSTEM_PROMPT = `You are a Telegram ops architect for FactoryWager TOC Ops.
Given the handshake catalog JSON and existing deterministic proposals, suggest ADDITIONAL
enhancements only when grounded in operational patterns or Bot API capabilities.

Return JSON: { "proposals": [ ... ] } matching this shape per item:
{
  "severity": "info"|"recommendation"|"action",
  "target": { "kind": "catalog"|"partner-forum"|"house-surface"|"topic", ... },
  "action": "addTopicIconMetadata"|"updateTopicIcon"|"addPinnedMessageTemplate"|"ensureTopic"|"postTopicPrompt"|"setGroupDescription"|"documentBehavior"|"addTopic"|"syncCatalogField",
  "title": "short title",
  "reason": "why",
  "evidence": ["fact"],
  "suggestedChange": {},
  "applyCommand": "optional bun command",
  "autoApplySafe": false
}

Rules:
- iconColor must be integer 0-6 if present in suggestedChange.suggestedIcon
- Do not duplicate deterministic proposal titles
- Do not remove topics or rename map keys
- Prefer catalog metadata additions over live Telegram mutations`;

export function buildLlmUserPrompt(opts: LlmResearchOpts): string {
  return JSON.stringify(
    {
      catalog: {
        schema: opts.catalog.schema,
        packageForumTopics: opts.catalog.packageForumTopics,
        houseForumTopics: opts.catalog.houseForumTopics,
      },
      deterministicProposalTitles: opts.deterministic.map(p => p.title),
      telegramNotes: opts.telegramNotes ?? [],
      task: 'Propose 0-5 additional enhancements as JSON.proposals array.',
    },
    null,
    2
  );
}

function llmEndpoint(): { url: string; headers: Record<string, string>; model: string } | null {
  const model = Bun.env.TELEGRAM_CATALOG_RESEARCH_LLM_MODEL?.trim() || 'gpt-4o-mini';
  const custom = Bun.env.TELEGRAM_CATALOG_RESEARCH_LLM_URL?.trim();
  if (custom) {
    const key = Bun.env.OPENAI_API_KEY?.trim() ?? Bun.env.TELEGRAM_CATALOG_RESEARCH_LLM_KEY?.trim();
    return {
      url: custom,
      headers: key
        ? { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' },
      model,
    };
  }
  const key = Bun.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return {
    url: 'https://api.openai.com/v1/chat/completions',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    model,
  };
}

export async function runLlmResearch(opts: LlmResearchOpts): Promise<LlmResearchResult> {
  const endpoint = llmEndpoint();
  if (!endpoint) {
    return {
      proposals: [],
      model: 'none',
      skipped: 'no LLM env (OPENAI_API_KEY or TELEGRAM_CATALOG_RESEARCH_LLM_URL)',
    };
  }

  const res = await fetch(endpoint.url, {
    method: 'POST',
    headers: endpoint.headers,
    body: JSON.stringify({
      model: endpoint.model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildLlmUserPrompt(opts) },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    return {
      proposals: [],
      model: endpoint.model,
      skipped: `LLM HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`,
    };
  }

  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) {
    return { proposals: [], model: endpoint.model, skipped: 'empty LLM response' };
  }

  let parsed: { proposals?: unknown[] };
  try {
    parsed = JSON.parse(content) as { proposals?: unknown[] };
  } catch {
    return { proposals: [], model: endpoint.model, skipped: 'LLM returned non-JSON' };
  }

  const proposals: CatalogEnhancementProposal[] = [];
  for (const raw of parsed.proposals ?? []) {
    if (!raw || typeof raw !== 'object') continue;
    const o = raw as Record<string, unknown>;
    const title = typeof o.title === 'string' ? o.title : '';
    if (!title || opts.deterministic.some(d => d.title === title)) continue;

    const icon = (o.suggestedChange as Record<string, unknown> | undefined)?.suggestedIcon;
    let validation: CatalogEnhancementProposal['validation'];
    if (icon && typeof icon === 'object') {
      const v = validateForumTopicIconSuggestion(icon as { iconColor: number; emoji: string });
      validation = { ok: v.ok, notes: v.notes };
      if (!v.ok) continue;
    }

    proposals.push({
      id: proposalId(['llm', title.slice(0, 40)]),
      severity: o.severity === 'action' || o.severity === 'info' ? o.severity : 'recommendation',
      target: (o.target as CatalogEnhancementProposal['target']) ?? {
        kind: 'catalog',
        section: 'packageForumTopics',
      },
      action: (o.action as CatalogEnhancementProposal['action']) ?? 'syncCatalogField',
      title,
      reason: typeof o.reason === 'string' ? o.reason : 'LLM suggestion',
      evidence: Array.isArray(o.evidence) ? o.evidence.map(String) : [],
      suggestedChange:
        o.suggestedChange && typeof o.suggestedChange === 'object'
          ? (o.suggestedChange as Record<string, unknown>)
          : undefined,
      applyCommand: typeof o.applyCommand === 'string' ? o.applyCommand : undefined,
      autoApplySafe: o.autoApplySafe === true,
      validation,
    });
  }

  return { proposals, model: endpoint.model };
}
