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
  /** Import / package boundary rules */
  importBoundaries: 'docs/IMPORT_BOUNDARIES.md',
  /** Root cleanup / organization history */
  organizationHistory: 'docs/organization/ROOT_CLEANUP_SUMMARY.md',
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
  projectsScan: 'lib/projects-scan.ts',
  r2Credentials: 'lib/security/r2-credentials.ts',
  standardsIntegration: 'lib/validation/standards-integration.ts',
  ports: 'config/ports.ts',
  r2Env: 'config/r2-env.ts',
} as const;

/** Tools / skills (repo-relative). */
export const CANONICAL_TOOLS = {
  bunDocRefs: 'tools/bun-doc-refs.ts',
  bunDocsIndex: 'tools/bun-docs-index.json',
  brandCatalog: 'tools/brand-catalog.ts',
  brandManifestCli: 'tools/brand-manifest.ts',
  brandedIdsSkill: '.agents/skills/branded-ids/',
  brandedTypeProof: 'tests/branded-types.test-d.ts',
  consoleDepthTest: 'tests/console-depth.test.ts',
  consoleDepthBench: 'tools/benchmarks/console-depth-perf.ts',
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
  organizationHistory: 'Root organization history',
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
  },
} as const;
