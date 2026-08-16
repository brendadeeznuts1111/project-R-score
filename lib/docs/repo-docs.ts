// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown
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

import { CLOUDFLARE_DEFAULTS } from '../../config/r2-env.ts';

/** Repo-relative paths to root / docs entrypoints. */
export const CANONICAL_REPO_DOCS = {
  /** Human hub */
  readme: 'README.md',
  /** GitHub contributor entrypoint */
  contributing: 'CONTRIBUTING.md',
  /** Wiki full navigation hub (GitHub Pages) */
  wikiIndex: 'wiki-index.md',
  /** Registry bake index (portal consumers) */
  registryIndex: 'registry-index.md',
  /** Always-loaded AI agent policy */
  agents: 'AGENTS.md',
  /** Just-in-time agent task router */
  agentsFull: 'docs/AGENTS.md',
  /** Workspace map */
  structure: 'STRUCTURE.md',
  /** Coding standards (complete) */
  standards: '.custom-instructions.md',
  /** Bun.markdown surface + repository validation contract */
  markdownApiReference: 'docs/markdown/API_REFERENCE.md',
  /** Contributor day loop for Markdown source */
  markdownContributorGuide: 'docs/markdown/CONTRIBUTING_MARKDOWN.md',
  /** Machine + workspace Bun install policy */
  unified: 'docs/UNIFIED.md',
  /** Import / package boundary rules (package graph — not wire types) */
  importBoundaries: 'docs/IMPORT_BOUNDARIES.md',
  /** Wire / parse-once boundary (unknown → domain) */
  wireBoundary: 'docs/WIRE_BOUNDARY.md',
  /** Concept vocabulary → wire → graph → audit lifecycle */
  conceptLifecycle: 'docs/CONCEPT_LIFECYCLE.md',
  /** Portal shared data + topbar foundation */
  portalFoundation: 'docs/portal-foundation.md',
  /** Portal Design agent — theme · kernels · UI blocks · dual-plane hosts */
  portalDesignAgent: 'docs/design/portal-design-agent.md',
  /** Local vs Pages routing map (domains · functions · auth) */
  platformRouting: 'docs/platform-routing.md',
  /** Newer Bun runtime APIs (WebView, markdown.ansi, cron, UDP) */
  bunNativeCapabilities: 'docs/BUN_NATIVE_CAPABILITIES.md',
  /** Bun runtime fetch proxy environment defaults and precedence */
  bunFetchProxyEnvironment: 'docs/guides/bun-fetch-proxy-environment.md',
  /** Bun process-wide runtime argument injection contract */
  bunOptions: 'docs/guides/bun-options.md',
  /** Bun token/catalog operate loop (RSS → scrape → catalog → integrity) */
  bunDocsOperate: 'docs/BUN_DOCS_OPERATE.md',
  /** Bun-types pin inventory + tip-diff + usage (not partner-surface) */
  bunTypesInventory: 'docs/design/bun-types-inventory.md',
  bunTypesInventoryJson: 'tools/bun-types-inventory.json',
  /** TokenRef interior + BunToken export (knowledge unit) */
  tokenRef: 'lib/docs/token-ref.ts',
  bunToken: 'lib/docs/bun-token.ts',
  /** Homebase discovery / organization map */
  organizationHistory: 'docs/organization/HOMEBASE_DISCOVERY.md',
  /** Reasonix session rename map · lane taxonomy (workspace archive) */
  sessionOrganization: 'docs/organization/session-organization.md',
  /** Archive filename grammar `<t>-<lane>-<slug>` (sessions · quarantine · scratch) */
  archiveNamingGrammar: 'docs/organization/naming-grammar.md',
  /** Session lane ↔ chrome Domain ↔ ConceptDomain correlations */
  workspaceTaxonomy: 'lib/docs/workspace-taxonomy.ts',
  workspaceLaneCrossMap: 'docs/harness/tenants/workspace-lane-cross-map.md',
  /** Bun harness microbench + CPU profile metric catalog */
  bunBenchProfiling: 'docs/harness/tenants/bun-bench-profiling.md',
  /** Grounded Bun/Proton capability matrix (JIT extract from root AGENTS) */
  capabilityMap: 'docs/harness/capability-map.md',
  /** Performance docs index (search pin + bench tenant pointer) */
  performanceIndex: 'docs/performance/README.md',
  /** Partner surface join (taxonomy · boards · brands · wire) — map before rename */
  partnerSurfaceInventory: 'docs/design/partner-surface-inventory.md',
  partnerSurfaceInventoryLib: 'lib/docs/partner-surface-inventory.ts',
  partnerTypeReferenceMap: 'docs/design/partner-type-reference-map.md',
  /** Velocity baseline + day-loop honesty */
  velocityBaseline: 'docs/organization/VELOCITY_BASELINE.md',
  /** JIT harness thesis index */
  harnessIndex: 'docs/harness/README.md',
  /** Proof claim kinds */
  harnessProof: 'docs/harness/PROOF.md',
  /** Fresh-rerun contract (PR paste of claim re-proof) */
  harnessFreshRerun: 'docs/harness/FRESH-RERUN.md',
  /** Claim discovery questionnaire (new ProofPath ceremony) */
  harnessClaimDiscovery: 'docs/harness/CLAIM-DISCOVERY.md',
  /** Spine tenants continuous-maintenance index */
  harnessSpineTenants: 'docs/harness/spine-tenants.md',
  /** Feedback → ratchet lessons */
  harnessFeedback: 'docs/harness/FEEDBACK.md',
  /** Capability vs permission / lanes */
  harnessAuthority: 'docs/harness/AUTHORITY.md',
  /** Nine trajectory review questions → owners */
  harnessReview: 'docs/harness/REVIEW.md',
  /** Projects triage + agent scope */
  projectsTriage: 'projects/README.md',
} as const;

/** Harness modules agents hit most often. */
export const CANONICAL_HARNESS = {
  brandedFacade: 'lib/types/branded.ts',
  brandedMap: 'lib/types/branded/README.md',
  brandManifest: 'lib/types/brand-manifest.json',
  consoleDomain: 'lib/console/README.md',
  consoleFacade: 'lib/console/index.ts',
  consoleDepth: 'lib/console-depth.ts',
  consoleDepthGuide: 'lib/console-depth.md',
  bunRuntimeGuide: 'lib/bun-runtime.md',
  bunFetchProxyRegistry: 'lib/net/proxy.ts',
  terminal: 'lib/terminal.ts',
  deepEquals: 'lib/deep-equals.ts',
  peekSettle: 'lib/peek-settle.ts',
  time: 'lib/time.ts',
  imageMetadata: 'lib/image-metadata.ts',
  screenshotRemediation: 'lib/screenshot-remediation.ts',
  operatorResearchPaths: 'lib/operator-research/paths.ts',
  pathBun: 'lib/path-bun.ts',
  repoContainment: 'lib/repo-containment.ts',
  checkPathBun: 'scripts/check-path-bun.ts',
  checkBunEnv: 'scripts/check-bun-env.ts',
  harnessStatus: 'scripts/harness-status.ts',
  harnessProof: 'lib/harness/proof.ts',
  harnessMaintenance: 'lib/harness/maintenance.ts',
  projectsScan: 'lib/projects-scan.ts',
  r2Credentials: 'lib/security/r2-credentials.ts',
  /** AST rules: decodeUnknown* + unknown params */
  boundaryEslint: 'config/eslint/plugin-harness/boundary.ts',
  boundaryEslintPlugin: 'config/eslint/plugin-harness/index.ts',
  eslintHarnessConfig: 'eslint.harness.config.ts',
  ports: 'config/ports.ts',
  r2Env: 'config/r2-env.ts',
  envExample: '.env.example',
  cloudflarePagesTenant: 'docs/harness/tenants/cloudflare-pages.md',
  opsLoopThroughputTenant: 'docs/harness/tenants/ops-loop-throughput.md',
  telegramFactoryTenant: 'docs/harness/tenants/telegram-factory.md',
  telegramPackageReadme: 'lib/telegram/README.md',
  channelsPackageReadme: 'lib/channels/README.md',
} as const;

/** Tools / skills (repo-relative). */
export const CANONICAL_TOOLS = {
  bunDocRefs: 'tools/bun-doc-refs.ts',
  bunNativeCapabilitiesSync: 'tools/bun-native-capabilities-sync.ts',
  bunDocsIndex: 'tools/bun-docs-index.json',
  bunDocsCatalog: 'tools/bun-docs-catalog.ts',
  bunDocsCatalogJson: 'tools/bun-docs-catalog.json',
  bunDocsReleases: 'tools/bun-docs-releases.ts',
  bunDocsRefresh: 'tools/bun-docs-refresh.ts',
  docsFeedsJson: 'tools/bun-docs-feeds.json',
  docsArtifactPaths: 'lib/docs/docs-artifact-paths.ts',
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
  benchmarksReadme: 'tools/benchmarks/README.md',
  benchStatus: 'tools/bench-status.ts',
  deepBenchmark: 'tools/benchmarks/deep-benchmark.ts',
  velocityColdStart: 'tools/velocity-cold-start.ts',
  terminalTest: 'tests/terminal.test.ts',
  deepEqualsTest: 'tests/deep-equals.test.ts',
  peekSettleTest: 'tests/peek-settle.test.ts',
  timeTest: 'tests/time.test.ts',
  imageMetadataTest: 'tests/image-metadata.test.ts',
  screenshotCli: 'tools/screenshot-cli.ts',
  screenshotCliTest: 'tests/screenshot-cli.test.ts',
  bunReleaseContractsCli: 'tools/bun-release-contracts.ts',
  harnessViolations: 'tools/harness-violations.ts',
  docMapCheck: 'tools/doc-map-check.ts',
  referenceDiscovery: 'tools/reference-discovery.ts',
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
  contributing: 'GitHub contributor entrypoint',
  wikiIndex: 'Wiki navigation hub (portal · registry · tenants)',
  registryIndex: 'Registry bake index (portal consumers)',
  agents: 'Always-loaded AI agent policy',
  agentsFull: 'Just-in-time agent task router',
  structure: 'Workspace map',
  standards: 'Coding standards (complete)',
  markdownApiReference: 'Bun.markdown API + repository validation contract',
  markdownContributorGuide: 'Markdown contributor day loop',
  unified: 'Bun install policy (machine + workspace)',
  importBoundaries: 'Import / package boundaries',
  wireBoundary: 'Wire boundary (parse once / unknown → domain)',
  conceptLifecycle: 'Concept lifecycle (vocabulary · wire · graph · audit)',
  portalFoundation: 'Portal static UI foundation',
  portalDesignAgent: 'Portal Design agent (theme · kernels · UI blocks)',
  platformRouting: 'Local vs Pages routing map',
  bunNativeCapabilities: 'Bun native capabilities note (browser, md, scheduler, datagram)',
  bunFetchProxyEnvironment: 'Bun fetch proxy env defaults · aliases · precedence',
  bunOptions: 'BUN_OPTIONS runtime argument injection · argv · precedence',
  bunDocsOperate: 'Bun token/catalog operate (RSS → scrape → catalog)',
  bunTypesInventory: 'Bun-types inventory pipeline (pin SSOT · tip-diff · usage)',
  bunTypesInventoryJson: 'Bun-types inventory JSON SSOT (committed under tools/)',
  tokenRef: 'TokenRef interior knowledge-unit schema',
  bunToken: 'BunToken agent export contract (northstar)',
  organizationHistory: 'Homebase discovery / organization map',
  sessionOrganization: 'Reasonix session rename map · lane taxonomy',
  archiveNamingGrammar: 'Archive filename grammar (<t>-<lane>-<slug>)',
  workspaceTaxonomy: 'Workspace taxonomy crosswalk (session · chrome · concept)',
  workspaceLaneCrossMap: 'Workspace lane cross-map tenant (claim workspace-lane-cross-map)',
  bunBenchProfiling: 'Bun bench + CPU profile metric catalog (claim bun-bench-profiling)',
  capabilityMap: 'Grounded Bun/Proton capability matrix (bake:capabilities SSOT)',
  performanceIndex: 'Performance docs index (search pin · bench tenant)',
  partnerSurfaceInventory: 'Partner surface inventory (map before rename)',
  partnerSurfaceInventoryLib: 'Partner surface inventory row SSOT',
  partnerTypeReferenceMap: 'Partner type / identity reference map',
  velocityBaseline: 'Velocity baseline + day-loop honesty',
  harnessIndex: 'JIT harness thesis index',
  harnessProof: 'Proof claim kinds',
  harnessFreshRerun: 'Fresh-rerun contract (PR paste of claim re-proof)',
  harnessClaimDiscovery: 'Claim discovery questionnaire (new ProofPath)',
  harnessSpineTenants: 'Spine tenants index (continuous maintenance)',
  harnessFeedback: 'Feedback → ratchet lessons',
  harnessAuthority: 'Authority / lanes / consequential grants',
  harnessReview: 'Repository review questions → owners',
  projectsTriage: 'Projects triage + agent scope',
} as const;

/** Build remote SSOT entry — parts first; `url` derived (link edge only). */
function canonicalRemote<R extends 'origin' | 'cascade'>(
  remote: R,
  host: string,
  owner: string, // brand-ok — github login/org
  name: string // brand-ok — repository name
) {
  return {
    remote,
    host,
    owner,
    name,
    url: `https://${host}/${owner}/${name}`,
  } as const;
}

/** Remotes (do not default-push to cascade). Parts are SSOT; `url` is the link edge. */
export const CANONICAL_REMOTES = {
  origin: canonicalRemote('origin', 'github.com', 'brendadeeznuts1111', 'project-R-score'),
  cascade: canonicalRemote('cascade', 'github.com', 'brendadeeznuts1111', 'cascade-mover-v3'),
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
  reasonixRemote: {
    name: 'remote-ssh',
    configPath: '~/.reasonix/config.toml',
    activeHosts: ['factorywager-staging', 'cloudflare-pages'],
    reasonixBinary: '/Applications/Reasonix.app/Contents/MacOS/reasonix',
    setupScript: 'scripts/reasonix-remote-setup.sh',
    cloudflarePages: {
      deployScript: 'scripts/cloudflare-pages-deploy.sh',
      tunnelConfig: 'scripts/cloudflared-reasonix.yml',
      mcpServers: [
        'mcp__cloudflare__connect',
        'mcp__cloudflare-docs__connect',
        'mcp__cloudflare-bindings__connect',
        'mcp__cloudflare-observability__connect',
      ],
      accountId: CLOUDFLARE_DEFAULTS.accountId,
      project: 'project-r-score',
      pagesDomain: 'project-r-score.pages.dev',
    },
  },
} as const;
