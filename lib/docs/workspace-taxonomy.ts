/**
 * Workspace taxonomy crosswalk — session archive lanes ↔ chrome Domain lanes ↔
 * ConceptDomain (correlations, not containment).
 *
 * @see docs/harness/tenants/workspace-lane-cross-map.md
 * @see docs/organization/naming-grammar.md
 * @see docs/DOMAIN_CONCEPT_SHAPE.md
 * @see docs/harness/ISSUE-ROUTING.md
 */
import { PORTAL_DOMAIN_LANE_META, type PortalChromeDomainLane } from '../portal/chrome-catalog.ts';
import {
  CONCEPT_DOMAINS,
  DOMAIN_METADATA,
  isConceptDomain,
  type ConceptDomain,
} from '../portal/concept-domains.ts';

/** Filename kebab for session archive lanes (`<t>-<lane>-<slug>`). */
export const SESSION_LANE_IDS = [
  'harness-infra',
  'partner',
  'portal-ui',
  'concepts',
  'tennis-hq',
  'git-ops-meta',
  'docs',
  'bugfix',
  'empty-misc',
] as const;

export type SessionLaneId = (typeof SESSION_LANE_IDS)[number];

export type SessionLaneMeta = {
  readonly id: SessionLaneId;
  /** Display form in session-organization taxonomy */
  readonly display: string;
  readonly description: string;
};

export const SESSION_LANES: readonly SessionLaneMeta[] = [
  {
    id: 'harness-infra',
    display: 'harness/infra',
    description:
      'Remote SSH/staging, config, proof pipeline, verification ratchets, hooks, architecture review',
  },
  {
    id: 'partner',
    display: 'partner',
    description: 'Limits detection, accounting/ledger, onboarding, Fantasy402, partner domain map',
  },
  {
    id: 'portal-ui',
    display: 'portal/UI',
    description: 'HTML designs, ops portal tables/cards, registry/package cards dashboard',
  },
  {
    id: 'concepts',
    display: 'concepts',
    description: 'Concept audit / graph / health dashboard proposals',
  },
  {
    id: 'tennis-hq',
    display: 'tennis-hq',
    description: 'Tennis HQ producer/runtime PR review and site checks',
  },
  {
    id: 'git-ops-meta',
    display: 'git-ops / meta',
    description: 'Main rebase, bun:ci sync, commit summaries, session archive map',
  },
  {
    id: 'docs',
    display: 'docs',
    description: 'Documentation translation and doc-map hygiene',
  },
  {
    id: 'bugfix',
    display: 'bugfix',
    description: 'Generic bug hunt sessions',
  },
  {
    id: 'empty-misc',
    display: 'empty / misc',
    description: 'Casual Q&A and misc zero-product sessions',
  },
] as const;

const SESSION_LANE_SET = new Set<string>(SESSION_LANE_IDS);

export function isSessionLane(value: string): value is SessionLaneId {
  return SESSION_LANE_SET.has(value);
}

export function sessionLaneMeta(id: SessionLaneId): SessionLaneMeta {
  const row = SESSION_LANES.find(l => l.id === id);
  if (!row) throw new Error(`unknown session lane: ${id}`);
  return row;
}

/** Chrome Domain lane ids — re-export live catalog, do not duplicate. */
export type ChromeDomainLaneId = PortalChromeDomainLane;

export const CHROME_DOMAIN_LANE_IDS: readonly ChromeDomainLaneId[] = PORTAL_DOMAIN_LANE_META.map(
  m => m.id
);

export { CONCEPT_DOMAINS, isConceptDomain, type ConceptDomain };

/**
 * Reviewed correlation row. Fields are *correlates*, never parent/child.
 * commitScopeHints are open-set guidance for conventional commits — not frozen.
 */
export type WorkspaceTaxonomyCorrelation = {
  readonly sessionLane: SessionLaneId;
  readonly chromeDomains: readonly ChromeDomainLaneId[];
  readonly conceptDomains: readonly ConceptDomain[];
  readonly commitScopeHints: readonly string[];
  readonly rationale: string;
};

export const WORKSPACE_TAXONOMY_CORRELATIONS: readonly WorkspaceTaxonomyCorrelation[] = [
  {
    sessionLane: 'harness-infra',
    chromeDomains: ['platform', 'knowledge'],
    conceptDomains: ['operations', 'infrastructure', 'registry'],
    commitScopeHints: ['harness', 'ci', 'lib', 'bun'],
    rationale:
      'Proof/config/hooks sessions usually land on platform chrome and operations/infrastructure concept ownership.',
  },
  {
    sessionLane: 'partner',
    chromeDomains: ['partner'],
    conceptDomains: ['partners', 'accounting', 'telegram'],
    commitScopeHints: ['ops', 'partners', 'partner'],
    rationale:
      'Partner desk chats correlate to chrome partner Domain; meaning often spans partners/accounting/telegram ConceptDomains.',
  },
  {
    sessionLane: 'portal-ui',
    chromeDomains: ['knowledge', 'platform'],
    conceptDomains: ['portal'],
    commitScopeHints: ['portal', 'ui'],
    rationale:
      'Static portal HTML/UX work is portal ConceptDomain; chrome routing often knowledge or platform.',
  },
  {
    sessionLane: 'concepts',
    chromeDomains: ['knowledge'],
    conceptDomains: ['portal', 'registry', 'tbd'],
    commitScopeHints: ['concepts', 'glossary', 'portal'],
    rationale:
      'Vocabulary/graph sessions sit under knowledge chrome; ConceptDomain varies by topic (often portal/registry).',
  },
  {
    sessionLane: 'tennis-hq',
    chromeDomains: ['trading'],
    conceptDomains: ['trading', 'marketdata', 'research'],
    commitScopeHints: ['tennis', 'sports-terminal'],
    rationale:
      'Tennis HQ producer/runtime aligns with trading chrome Domain and trading/marketdata concepts.',
  },
  {
    sessionLane: 'git-ops-meta',
    chromeDomains: ['platform'],
    conceptDomains: ['operations'],
    commitScopeHints: ['chore', 'docs', 'organization'],
    rationale:
      'Rebase/ci/session-map meta work is platform chrome; operations ConceptDomain for tooling ownership.',
  },
  {
    sessionLane: 'docs',
    chromeDomains: ['knowledge', 'platform'],
    conceptDomains: ['portal', 'operations'],
    commitScopeHints: ['docs', 'organization', 'harness'],
    rationale: 'Doc translation/hygiene spans knowledge boards and platform authority docs.',
  },
  {
    sessionLane: 'bugfix',
    chromeDomains: ['platform'],
    conceptDomains: ['tbd', 'operations'],
    commitScopeHints: ['fix'],
    rationale:
      'Generic bug hunts have no stable product Domain; default platform chrome and tbd until scoped.',
  },
  {
    sessionLane: 'empty-misc',
    chromeDomains: [],
    conceptDomains: ['tbd'],
    commitScopeHints: [],
    rationale: 'Casual/empty sessions do not imply product Domain or commit scope.',
  },
] as const;

export function correlationsForSessionLane(lane: SessionLaneId): WorkspaceTaxonomyCorrelation {
  const row = WORKSPACE_TAXONOMY_CORRELATIONS.find(r => r.sessionLane === lane);
  if (!row) throw new Error(`missing correlation for session lane: ${lane}`);
  return row;
}

export type HomonymMachineHit = {
  readonly machine: 'sessionLane' | 'chromeDomain' | 'conceptDomain' | 'commitScopeHint';
  readonly id: string; // brand-ok — opaque taxonomy token across machines, not a domain *Id
  readonly label: string;
  readonly note: string;
};

export type HomonymExplanation = {
  readonly token: string;
  readonly hits: readonly HomonymMachineHit[];
  readonly summary: string;
};

/**
 * Explain which taxonomy machines define a token (homonym trap helper).
 * Accepts display forms (`harness/infra`) or kebab ids (`harness-infra`).
 */
export function explainHomonym(raw: string): HomonymExplanation {
  const token = raw.trim();
  const normalized = token.toLowerCase().replace(/\s+/g, ' ');
  const kebab = normalized.replace(/[/\s]+/g, '-').replace(/-+/g, '-');
  const hits: HomonymMachineHit[] = [];

  for (const lane of SESSION_LANES) {
    if (lane.id === kebab || lane.display.toLowerCase() === normalized) {
      hits.push({
        machine: 'sessionLane',
        id: lane.id,
        label: lane.display,
        note: lane.description,
      });
    }
  }

  for (const meta of PORTAL_DOMAIN_LANE_META) {
    if (meta.id === kebab || meta.id === normalized) {
      hits.push({
        machine: 'chromeDomain',
        id: meta.id,
        label: meta.label,
        note: meta.description,
      });
    }
  }

  if (isConceptDomain(kebab) || isConceptDomain(normalized)) {
    const id = (isConceptDomain(kebab) ? kebab : normalized) as ConceptDomain;
    hits.push({
      machine: 'conceptDomain',
      id,
      label: DOMAIN_METADATA[id].label,
      note: DOMAIN_METADATA[id].description,
    });
  }

  // Also match plural/singular partner ↔ partners
  if (
    (kebab === 'partner' || kebab === 'partners') &&
    !hits.some(h => h.machine === 'conceptDomain' && h.id === 'partners')
  ) {
    if (isConceptDomain('partners')) {
      hits.push({
        machine: 'conceptDomain',
        id: 'partners',
        label: DOMAIN_METADATA.partners.label,
        note: `${DOMAIN_METADATA.partners.description} (homonym of chrome/session "partner")`,
      });
    }
  }

  const hintScopes = new Set<string>();
  for (const row of WORKSPACE_TAXONOMY_CORRELATIONS) {
    for (const hint of row.commitScopeHints) {
      if (hint.toLowerCase() === kebab || hint.toLowerCase() === normalized) {
        hintScopes.add(hint);
      }
    }
  }
  for (const hint of hintScopes) {
    hits.push({
      machine: 'commitScopeHint',
      id: hint,
      label: `type(${hint}):`,
      note: 'Open-set conventional-commit scope hint from workspace correlations — not a frozen enum.',
    });
  }

  const machines = [...new Set(hits.map(h => h.machine))];
  const summary =
    hits.length === 0
      ? `No workspace taxonomy machine defines "${token}".`
      : machines.length === 1
        ? `"${token}" is defined only as ${machines[0]}.`
        : `"${token}" is a homonym across: ${machines.join(', ')}. Do not nest these machines.`;

  return { token, hits, summary };
}

export type WorkspaceTaxonomyMap = {
  readonly kind: 'workspace-lane-map';
  readonly schemaVersion: 1;
  readonly claim: 'workspace-lane-cross-map';
  readonly bakedAt: string;
  readonly principle: 'correlations-not-containment';
  readonly sessionLanes: readonly SessionLaneMeta[];
  readonly chromeDomains: readonly {
    readonly id: ChromeDomainLaneId;
    readonly label: string;
    readonly description: string;
    readonly doc: string;
  }[];
  readonly conceptDomains: readonly {
    readonly id: ConceptDomain;
    readonly label: string;
    readonly description: string;
  }[];
  readonly correlations: readonly WorkspaceTaxonomyCorrelation[];
  readonly docs: {
    readonly tenant: string;
    readonly namingGrammar: string;
    readonly domainConceptShape: string;
    readonly issueRouting: string;
    readonly lib: string;
  };
};

export function buildWorkspaceTaxonomyMap(
  bakedAt: string = new Date().toISOString()
): WorkspaceTaxonomyMap {
  return {
    kind: 'workspace-lane-map',
    schemaVersion: 1,
    claim: 'workspace-lane-cross-map',
    bakedAt,
    principle: 'correlations-not-containment',
    sessionLanes: SESSION_LANES,
    chromeDomains: PORTAL_DOMAIN_LANE_META.map(m => ({
      id: m.id,
      label: m.label,
      description: m.description,
      doc: m.doc,
    })),
    conceptDomains: CONCEPT_DOMAINS.map(id => ({
      id,
      label: DOMAIN_METADATA[id].label,
      description: DOMAIN_METADATA[id].description,
    })),
    correlations: WORKSPACE_TAXONOMY_CORRELATIONS,
    docs: {
      tenant: 'docs/harness/tenants/workspace-lane-cross-map.md',
      namingGrammar: 'docs/organization/naming-grammar.md',
      domainConceptShape: 'docs/DOMAIN_CONCEPT_SHAPE.md',
      issueRouting: 'docs/harness/ISSUE-ROUTING.md',
      lib: 'lib/docs/workspace-taxonomy.ts',
    },
  };
}

/** Markdown snippet for TTY (`Bun.markdown.ansi`). */
export function formatHomonymMarkdown(raw: string): string {
  const exp = explainHomonym(raw);
  const lines = [
    `## Homonym: \`${exp.token}\``,
    '',
    exp.summary,
    '',
    '| Machine | Id | Label |',
    '| ------- | -- | ----- |',
  ];
  for (const h of exp.hits) {
    lines.push(`| ${h.machine} | \`${h.id}\` | ${h.label} |`);
  }
  if (exp.hits.length === 0) {
    lines.push('| — | — | — |');
  }
  return `${lines.join('\n')}\n`;
}
