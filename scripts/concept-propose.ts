#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/api/spawn — Bun.spawn
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Propose a new portal semantic concept (pending review).
 *
 *   bun scripts/concept-propose.ts --id ops.metric.example --label "Example" \
 *     --category ops --group ops.metric --domain ops --summary "…" \
 *     [--unit usd] [--color infoBlue] [--semantic-type state] [--ui-role token] \
 *     [--correlation-id PR#999] [--pr] [--output json]
 *
 * Env (flags override): CONCEPT_PROPOSE_PR=1 · CONCEPT_REVIEWER ·
 * CONCEPT_PROPOSAL_TEMPLATE (path to JSON merged as proposal defaults).
 */
import { colorize, jsonOut, logTable } from '../lib/console-depth.ts';
import {
  appendHistory,
  loadLifecycleStore,
  saveLifecycleStore,
  validateProposal,
  type ConceptProposal,
} from '../lib/portal/concept-lifecycle.ts';

function argValue(argv: readonly string[], flag: string): string | undefined {
  const eq = argv.find(a => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const i = argv.indexOf(flag);
  if (i !== -1) return argv[i + 1];
  return undefined;
}

function resolveStr(argv: readonly string[], flag: string, envKey: string): string | undefined {
  const fromFlag = argValue(argv, flag)?.trim();
  if (fromFlag) return fromFlag;
  const fromEnv = Bun.env[envKey]?.trim();
  return fromEnv || undefined;
}

async function loadTemplate(): Promise<Record<string, string>> {
  const path = Bun.env.CONCEPT_PROPOSAL_TEMPLATE?.trim();
  if (!path) return {};
  const file = Bun.file(path);
  if (!(await file.exists())) {
    console.error(colorize(`warning: CONCEPT_PROPOSAL_TEMPLATE not found: ${path}`, '#d29922'));
    return {};
  }
  return (await file.json()) as Record<string, string>;
}

export async function runPropose(argv: readonly string[]): Promise<number> {
  const template = await loadTemplate();
  const pick = (flag: string, envKey: string, templateKey: string): string | undefined =>
    resolveStr(argv, flag, envKey) ?? template[templateKey];

  const id = pick('--id', 'CONCEPT_ID', 'id') ?? '';
  const proposal: ConceptProposal = {
    id,
    label: pick('--label', 'CONCEPT_LABEL', 'label') ?? '',
    description: pick('--summary', 'CONCEPT_SUMMARY', 'description') ?? '',
    category: pick('--category', 'CONCEPT_CATEGORY', 'category') ?? '',
    group: pick('--group', 'CONCEPT_GROUP', 'group') ?? '',
    domain: pick('--domain', 'CONCEPT_DOMAIN', 'domain') ?? '',
    unit: pick('--unit', 'CONCEPT_UNIT', 'unit') ?? null,
    color: pick('--color', 'CONCEPT_COLOR', 'color') ?? null,
    semanticType: pick('--semantic-type', 'CONCEPT_SEMANTIC_TYPE', 'semanticType') ?? null,
    uiRole: pick('--ui-role', 'CONCEPT_UI_ROLE', 'uiRole') ?? null,
    correlationId: pick('--correlation-id', 'CONCEPT_CORRELATION_ID', 'correlationId') ?? null,
    status: 'pending',
    proposedBy: pick('--by', 'CONCEPT_PROPOSER', 'proposedBy') ?? 'agent',
    proposedAt: new Date().toISOString(),
    reviewer: Bun.env.CONCEPT_REVIEWER?.trim() || null,
    reviewedBy: null,
    reviewedAt: null,
    reviewReason: null,
  };

  const store = await loadLifecycleStore();
  const errors = validateProposal(proposal, store);
  if (errors.length > 0) {
    console.error(colorize(`❌ invalid proposal:`, '#f85149'));
    for (const error of errors) console.error(`  · ${error}`);
    return 1;
  }

  store.proposals.push(proposal);
  const next = appendHistory(store, {
    at: proposal.proposedAt,
    action: 'propose',
    id: proposal.id,
    actor: 'cli',
    reason: null,
    replaceBy: null,
  });
  await saveLifecycleStore(next);

  const output = resolveStr(argv, '--output', 'CONCEPT_OUTPUT') ?? 'table';
  if (output === 'json') {
    jsonOut({ ok: true, proposal });
  } else {
    console.log(colorize(`✅ proposed ${proposal.id} (pending review)`, '#2da44e'));
    logTable(
      [
        {
          id: proposal.id,
          label: proposal.label,
          domain: proposal.domain,
          group: proposal.group,
          reviewer: proposal.reviewer ?? '',
        },
      ],
      ['id', 'label', 'domain', 'group', 'reviewer']
    );
  }

  const wantPr = argv.includes('--pr') || Bun.env.CONCEPT_PROPOSE_PR === '1';
  if (wantPr) {
    if (!Bun.which('gh')) {
      console.error(
        colorize('warning: --pr requested but `gh` CLI is unavailable; skipping PR', '#d29922')
      );
    } else {
      const title = `feat(concepts): propose ${proposal.id}`;
      const body = [
        `## Concept proposal`,
        ``,
        `- id: \`${proposal.id}\``,
        `- label: ${proposal.label}`,
        `- domain: ${proposal.domain} · group: ${proposal.group} · category: ${proposal.category}`,
        `- summary: ${proposal.description}`,
        proposal.correlationId ? `- correlationId: ${proposal.correlationId}` : null,
        ``,
        `Status: pending review (\`bun scripts/concept-review.ts --list\`).`,
      ]
        .filter(line => line !== null)
        .join('\n');
      const proc = Bun.spawn(['gh', 'pr', 'create', '--draft', '--title', title, '--body', body], {
        stdout: 'inherit',
        stderr: 'inherit',
      });
      const code = await proc.exited;
      if (code !== 0) {
        console.error(colorize(`warning: gh pr create exited ${code}`, '#d29922'));
      }
    }
  }
  return 0;
}

if (import.meta.main) {
  process.exit(
    await runPropose(applyUnknownLongOptionGuardFor('concept:propose', Bun.argv.slice(2)))
  );
}
