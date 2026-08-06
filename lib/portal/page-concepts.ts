// @see https://bun.com/docs/runtime/image#input — Bun.Image
/**
 * Portal page glossary catalog.
 *
 * Every committed static portal index receives one page.* concept. Rich section
 * maps remain in page-glossary.ts; this catalog owns page identity and wording.
 */
export const PORTAL_PAGE_CONCEPT_DEFINITIONS = [
  {
    path: '/portal/',
    id: 'page.registry',
    label: 'Factory registry',
    description: 'Portal home for registry packages, artifacts, proofs, and operating surfaces.',
    synonyms: ['registry home', 'portal home'],
  },
  {
    path: '/portal/account/',
    id: 'page.accountDossier',
    label: 'Account dossier',
    description:
      'Portal page for one partner-tree account (ops.view.per_account): identity, connected tree, location, monitoring, limit telemetry, outs, Telegram package-group readiness, per-account accounting chrome, and betlog exports. Bot: /dossier.',
    synonyms: [
      'account dossier',
      'account breakdown',
      'node dossier',
      'telegram dossier',
      'per-account accounting',
      '/dossier',
    ],
  },
  {
    path: '/portal/bookmakers/',
    id: 'page.bookmakers',
    label: 'Bookmaker registry',
    description:
      'Portal page for the canonical bookmaker registry mirrored from the @factorywager/bookmakers artifact on the FactoryWager artifact registry.',
    synonyms: ['bookmakers', 'bookmaker registry', 'bookmaker board', 'book books'],
  },
  {
    path: '/portal/brands/',
    id: 'page.brandKeymap',
    label: 'Brand keymap',
    description: 'Portal page for branded domain values, constructors, and adoption evidence.',
    synonyms: ['brand catalog', 'domain IDs'],
  },
  {
    path: '/portal/bunfig/',
    id: 'page.bunfig',
    label: 'Bunfig',
    description:
      'Portal page for Bun installation policy, effective configuration, and drift checks.',
    synonyms: ['Bun config', 'installation policy'],
  },
  {
    path: '/portal/catalog/',
    id: 'page.catalog',
    label: 'Account catalog',
    description: 'Portal page for governed account, source, and scrape-wire catalog evidence.',
    synonyms: ['catalog', 'scrape-wire registry'],
  },
  {
    path: '/portal/compliance/',
    id: 'page.compliance',
    label: 'Compliance',
    description: 'Portal page for jurisdiction policy controls and compliance evidence.',
    synonyms: ['compliance board', 'regulatory controls'],
  },
  {
    path: '/portal/console-format/',
    id: 'page.consoleFormat',
    label: 'Console format',
    description: 'Portal page for governed console output, depth, and formatting policy.',
    synonyms: ['console output', 'format gate'],
  },
  {
    path: '/portal/concepts/',
    id: 'page.concepts',
    label: 'Concepts',
    description:
      'Portal page for the semantic vocabulary inventory: domain summary, usage, provenance, and concept graph entry points.',
    synonyms: ['concepts board', 'semantic vocabulary', 'concept inventory'],
  },
  {
    path: '/portal/dashboard/',
    id: 'page.dashboard',
    label: 'Executive dashboard',
    description: 'Portal page summarizing operational, package, proof, and health signals.',
    synonyms: ['dashboard', 'executive summary'],
  },
  {
    path: '/portal/doctor/',
    id: 'page.doctor',
    label: 'Portal doctor',
    description: 'Portal page for deterministic control-plane diagnostics and repair guidance.',
    synonyms: ['doctor', 'diagnostics'],
  },
  {
    path: '/portal/dod/',
    id: 'page.dodReview',
    label: 'DOD visual-proof review',
    description:
      'Portal page for the visual-proof submission queue: Accounting-topic photos, OCR amounts, Telegram deep-links, Bun.Image meta, and stake reconciliation against execution expected amounts.',
    synonyms: [
      'DOD review',
      'proof review',
      'visual proof',
      'document of deposit',
      'accounting proof queue',
    ],
    seeAlso: [
      'ui.semantic.surface',
      'ui.semantic.resources',
      'ui.semantic.artifact',
      'section.partnersAccounting',
      'ops.dod.ingest',
      'ops.dod.reconcile',
      'ops.dod.meta_log',
    ],
  },
  {
    path: '/portal/env/',
    id: 'page.environment',
    label: 'Environment inventory',
    description: 'Portal page for environment-variable ownership, defaults, and vault mappings.',
    synonyms: ['environment', 'env inventory'],
  },
  {
    path: '/portal/factory/',
    id: 'page.factoryRegistry',
    label: 'Factory registry surface',
    description: 'Legacy-compatible FactoryWager registry surface using shared portal governance.',
    synonyms: ['factory page', 'registry surface'],
  },
  {
    path: '/portal/failures/',
    id: 'page.failures',
    label: 'Test failures',
    description: 'Portal page for failed checks, replay commands, and diagnostic evidence.',
    synonyms: ['failures board', 'test report'],
  },
  {
    path: '/portal/glossary/',
    id: 'page.glossary',
    label: 'Domain glossary',
    description:
      'Portal page for governed terminology, semantic types, UI roles, and relationships.',
    synonyms: ['glossary', 'terminology registry'],
  },
  {
    path: '/portal/health/',
    id: 'page.health',
    label: 'Health',
    description: 'Portal page for system status, live checks, resources, and versioned evidence.',
    synonyms: ['health board', 'system status'],
  },
  {
    path: '/portal/identity/',
    id: 'page.identity',
    label: 'Identity',
    description: 'Portal page for authentication, identity, lockout, and anomaly controls.',
    synonyms: ['identity board', 'authentication controls'],
  },
  {
    path: '/portal/issues/',
    id: 'page.issueTaxonomy',
    label: 'GitHub issue taxonomy',
    description:
      'Portal page for repository-governed issue dimensions, provider labels, ownership, and public registry drift health.',
    synonyms: ['issue spine', 'issue labels', 'issue governance', 'GitHub taxonomy'],
  },
  {
    path: '/portal/install-hygiene/',
    id: 'page.installHygiene',
    label: 'Install hygiene',
    description: 'Portal page for Bun package installation, cache, trust, and workspace hygiene.',
    synonyms: ['package hygiene', 'install policy'],
  },
  {
    path: '/portal/limits-lab/',
    id: 'page.limitForecastLab',
    label: 'Limits forecast lab',
    description:
      'Read-only laboratory for global and sportsbook-specific limit forecast candidates.',
    synonyms: ['limits lab', 'forecast sandbox'],
  },
  {
    path: '/portal/limits/',
    id: 'page.limitPatterns',
    label: 'Partner limit patterns',
    description:
      'Portal page for account controls, policies, limit patterns, and prediction evidence.',
    synonyms: ['partner limit control', 'limit patterns page'],
  },
  {
    path: '/portal/ops/',
    id: 'page.operations',
    label: 'Operations',
    description: 'Portal page for operational summaries, throughput, and control-plane actions.',
    synonyms: ['ops board', 'operations summary'],
  },
  {
    path: '/portal/packages/',
    id: 'page.packages',
    label: 'Packages map',
    description: 'Portal page for package ownership, dependency roles, and artifact health.',
    synonyms: ['package graph', 'packages board'],
  },
  {
    path: '/portal/agent-odds/',
    id: 'page.agentOdds',
    label: 'Agent odds dashboard',
    description: 'Standalone portal page for agent odds monitoring and local dashboard snapshots.',
    synonyms: ['agent odds', 'odds dashboard'],
  },
  {
    path: '/portal/partner/',
    id: 'page.partnerHealth',
    label: 'Partner health',
    description: 'Portal page for partner profile alignment, Telegram output, and finance health.',
    synonyms: ['partner health', 'partner status'],
  },
  {
    path: '/portal/partners/',
    id: 'page.partners',
    label: 'Partners',
    description:
      'Portal page for partner accounts, limit coverage, package Telegram forums, Accounting topic deals, and seat-desk deposit rails.',
    synonyms: ['package groups', 'telegram partners', 'partner account control'],
  },
  {
    path: '/portal/partner-history/',
    id: 'page.partnerHistory',
    label: 'Partner limit history',
    description: 'Portal page for account-specific limit observations and opening baselines.',
    synonyms: ['limit history', 'partner history'],
  },
  {
    path: '/portal/science/',
    id: 'page.science',
    label: 'Science lab',
    description: 'Portal page for experimental analytical and model evidence.',
    synonyms: ['science', 'model lab'],
  },
  {
    path: '/portal/skills/',
    id: 'page.skills',
    label: 'Skills',
    description: 'Portal page for agent skill inventory, validation, and ownership.',
    synonyms: ['skill catalog', 'agent capabilities'],
  },
  {
    path: '/portal/surfaces/',
    id: 'page.surfaces',
    label: 'Surface inventory',
    description: 'Portal page for public hosts, access domains, backends, and edge surfaces.',
    synonyms: ['surfaces', 'edge inventory'],
  },
  {
    path: '/portal/tennis/',
    id: 'page.tennis',
    label: 'Tennis desk',
    description: 'Portal page for tennis market, venue, competition, and live-event evidence.',
    synonyms: ['tennis board', 'tennis operations'],
  },
  {
    path: '/portal/toc/',
    id: 'page.toc',
    label: 'TOC operations',
    description: 'Portal page for Drum-Buffer-Rope flow, partner queues, and throughput evidence.',
    synonyms: ['TOC board', 'operations flow'],
  },
  {
    path: '/portal/tools/',
    id: 'page.tools',
    label: 'CLI tools',
    description: 'Portal page for governed operator commands and supporting artifacts.',
    synonyms: ['tools hub', 'CLI catalog'],
  },
  {
    path: '/portal/vault/',
    id: 'page.vault',
    label: 'Vault',
    description: 'Portal page for secret inventory health, ownership, and remediation actions.',
    synonyms: ['vault health', 'secret inventory'],
  },
] as const;

export type PortalPageConceptKey = (typeof PORTAL_PAGE_CONCEPT_DEFINITIONS)[number]['id'];
