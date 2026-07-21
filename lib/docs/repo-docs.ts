/**
 * Canonical monorepo documentation paths (repo-relative).
 *
 * SSOT for human/agent doc routing and for tooling that needs stable paths
 * (e.g. standards integration, LIB_INFO). Keep in lockstep with root MD maps.
 *
 * @see ../../AGENTS.md
 * @see ../../.custom-instructions.md
 * @see ../../STRUCTURE.md
 */

/** Repo-relative paths to root / docs entrypoints. */
export const CANONICAL_REPO_DOCS = {
  /** Human hub */
  readme: 'README.md',
  /** AI agent entrypoint (thin) */
  agents: 'AGENTS.md',
  /** Full agent guide */
  agentsFull: 'docs/AGENTS.md',
  /** Workspace map */
  structure: 'STRUCTURE.md',
  /** Coding standards (complete) */
  standards: '.custom-instructions.md',
  /** Coding standards (quick reference) */
  standardsQuick: 'docs/DEVELOPMENT-STANDARDS.md',
  /** Machine + workspace Bun install policy */
  unified: 'docs/UNIFIED.md',
  /** Import / package boundary rules (package graph — not wire types) */
  importBoundaries: 'docs/IMPORT_BOUNDARIES.md',
  /** Wire / parse-once boundary (unknown → domain) */
  wireBoundary: 'docs/WIRE_BOUNDARY.md',
  /** Newer Bun runtime APIs (WebView, markdown.ansi, cron, UDP) */
  bunNativeCapabilities: 'docs/BUN_NATIVE_CAPABILITIES.md',
  /** Bun token/catalog operate loop (RSS → scrape → catalog → integrity) */
  bunDocsOperate: 'docs/BUN_DOCS_OPERATE.md',
  /** TokenRef interior + BunToken export (knowledge unit) */
  tokenRef: 'lib/docs/token-ref.ts',
  bunToken: 'lib/docs/bun-token.ts',
  /** Root cleanup / organization history */
  organizationHistory: 'docs/organization/ROOT_CLEANUP_SUMMARY.md',
  /** Velocity baseline + day-loop honesty */
  velocityBaseline: 'docs/organization/VELOCITY_BASELINE.md',
  /** JIT harness thesis index */
  harnessIndex: 'docs/harness/README.md',
  /** Proof claim kinds */
  harnessProof: 'docs/harness/PROOF.md',
  /** Feedback → ratchet lessons */
  harnessFeedback: 'docs/harness/FEEDBACK.md',
  /** Projects triage + agent scope */
  projectsTriage: 'projects/README.md',
  /** Historical standards implementation notes */
  standardsImplementation: 'docs/archives/STANDARDS-IMPLEMENTATION.md',
} as const;

/** Harness modules agents hit most often. */
export const CANONICAL_HARNESS = {
  brandedFacade: 'lib/types/branded.ts',
  brandedMap: 'lib/types/branded/README.md',
  brandManifest: 'lib/types/brand-manifest.json',
  consoleDepth: 'lib/console-depth.ts',
  pathBun: 'lib/path-bun.ts',
  harnessProof: 'lib/harness/proof.ts',
  projectsScan: 'lib/projects-scan.ts',
  r2Credentials: 'lib/security/r2-credentials.ts',
  standardsIntegration: 'lib/validation/standards-integration.ts',
  /** AST rules: decodeUnknown* + unknown params */
  boundaryEslint: 'config/eslint/plugin-harness/boundary.ts',
  boundaryEslintPlugin: 'config/eslint/plugin-harness/index.ts',
  eslintHarnessConfig: 'eslint.harness.config.ts',
  ports: 'config/ports.ts',
  r2Env: 'config/r2-env.ts',
} as const;

/** Tools / skills (repo-relative). */
export const CANONICAL_TOOLS = {
  bunDocRefs: 'tools/bun-doc-refs.ts',
  bunDocsIndex: 'tools/bun-docs-index.json',
  bunDocsCatalog: 'tools/bun-docs-catalog.ts',
  bunDocsCatalogJson: 'tools/bun-docs-catalog.json',
  bunDocsReleases: 'tools/bun-docs-releases.ts',
  bunDocsRefresh: 'tools/bun-docs-refresh.ts',
  releaseIndexJson: 'tools/release-index.json',
  tokenRef: 'lib/docs/token-ref.ts',
  tokenRefSchema: 'lib/docs/token-ref.schema.json',
  bunToken: 'lib/docs/bun-token.ts',
  bunTokenSchema: 'lib/docs/bun-token.schema.json',
  brandCatalog: 'tools/brand-catalog.ts',
  brandManifestCli: 'tools/brand-manifest.ts',
  brandedIdsSkill: '.agents/skills/branded-ids/',
  harnessImproveSkill: '.agents/skills/harness-improve/',
  brandedTypeProof: 'tests/branded-types.test-d.ts',
  consoleDepthTest: 'tests/console-depth.test.ts',
  consoleDepthBench: 'tools/benchmarks/console-depth-perf.ts',
  harnessViolations: 'tools/harness-violations.ts',
  docMapCheck: 'tools/doc-map-check.ts',
  wireBoundaryTest: 'tests/wire-boundary-policy.test.ts',
  docsIndex: 'docs/README.md',
} as const;

export type CanonicalRepoDocKey = keyof typeof CANONICAL_REPO_DOCS;
export type CanonicalHarnessKey = keyof typeof CANONICAL_HARNESS;

/**
 * Role labels for root markdown “doc map” tables (keep copy short).
 */
export const CANONICAL_DOC_ROLES: Record<CanonicalRepoDocKey, string> = {
  readme: 'Human hub + scripts',
  agents: 'AI agent entrypoint',
  agentsFull: 'Full agent guide',
  structure: 'Workspace map',
  standards: 'Coding standards (complete)',
  standardsQuick: 'Coding standards (quick)',
  unified: 'Bun install policy (machine + workspace)',
  importBoundaries: 'Import / package boundaries',
  wireBoundary: 'Wire boundary (parse once / unknown → domain)',
  bunNativeCapabilities: 'Bun native capabilities note (browser, md, scheduler, datagram)',
  bunDocsOperate: 'Bun token/catalog operate (RSS → scrape → catalog)',
  tokenRef: 'TokenRef interior knowledge-unit schema',
  bunToken: 'BunToken agent export contract (northstar)',
  organizationHistory: 'Root organization history',
  velocityBaseline: 'Velocity baseline + day-loop honesty',
  harnessIndex: 'JIT harness thesis index',
  harnessProof: 'Proof claim kinds',
  harnessFeedback: 'Feedback → ratchet lessons',
  projectsTriage: 'Projects triage + agent scope',
  standardsImplementation: 'Historical standards implementation',
} as const;

/** Remotes (do not default-push to cascade). */
export const CANONICAL_REMOTES = {
  origin: {
    name: 'project-R-score',
    url: 'https://github.com/brendadeeznuts1111/project-R-score',
  },
  cascade: {
    name: 'cascade-mover-v3',
    url: 'https://github.com/brendadeeznuts1111/cascade-mover-v3',
  },
} as const;

/**
 * External thesis / practice references (not repo paths).
 * Primary: https://github.com/lopopolo/harness-engineering
 */
export const CANONICAL_EXTERNAL = {
  harnessEngineering: {
    name: 'harness-engineering',
    url: 'https://github.com/lopopolo/harness-engineering',
    domainModeling:
      'https://github.com/lopopolo/harness-engineering/blob/trunk/docs/domain-modeling/README.md',
    durableSystems:
      'https://github.com/lopopolo/harness-engineering/blob/trunk/docs/durable-systems/README.md',
    proof: 'https://github.com/lopopolo/harness-engineering/blob/trunk/docs/proof/README.md',
    /** Prefer "artifact" over "codebase" in agent/docs prose */
    replaceCodebaseWithArtifact: 'https://x.com/_lopopolo/status/2076878736507736390',
    codeIsNotTheArtifact: 'https://hyperbo.la/w/code-is-not-the-artifact/',
    parseDontValidate: 'https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/',
    hyperbolaCase:
      'https://github.com/lopopolo/harness-engineering/blob/trunk/docs/domain-modeling/hyperbola.md',
  },
} as const;
