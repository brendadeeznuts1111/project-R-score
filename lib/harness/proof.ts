// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/secrets#bun-secrets-get-options — Bun.secrets
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — WebView
// @see https://bun.com/blog/bun-v1.3.12#urlpattern-is-up-to-2-3x-faster — URLPattern
/**
 * Proof claim kinds for harness “done” checklists.
 * @see ../../docs/harness/PROOF.md
 * @see ../../docs/harness/FRESH-RERUN.md
 */

export type ProofKind = 'unit' | 'boundary' | 'journey' | 'deployed';

/** How the claim is enforced day-to-day (see docs/harness/PROOF.md Owner→gate). */
export type ProofGateClass = 'continuous' | 'workflow' | 'human-only';

export type ProofPath = {
  id: string; // brand-ok — opaque proof-path catalog key
  claim: string;
  kinds: ProofKind[];
  /**
   * continuous = pre-commit and/or ci:harness / ci:core
   * workflow = named GHA outside that envelope (required or not)
   * human-only = freshRerun paste / ad-hoc (no always-on gate)
   */
  gateClass: ProofGateClass;
  evidence: string[];
  /**
   * Command that re-proves the claim from a clean-enough state
   * (fresh session / no reliance on the proposing conversation).
   * Paste its terminal output into the PR when touching the claim’s owner.
   * @see ../../docs/harness/FRESH-RERUN.md
   */
  freshRerun: string;
};

/** Named critical paths — each must set `freshRerun` (see FRESH-RERUN.md). */
export const CRITICAL_PROOF_PATHS: readonly ProofPath[] = [
  {
    id: 'branded-ids',
    claim: 'New domain IDs are branded after the boundary',
    kinds: ['boundary', 'unit'],
    gateClass: 'continuous',
    evidence: ['bun tools/branded-id-check.ts --staged --strict', 'bun run check:brands:types'],
    freshRerun: 'bun run check:brands:types',
  },
  {
    id: 'install-verify',
    claim: 'Factory install produces a working Bun workspace',
    kinds: ['journey', 'deployed'],
    gateClass: 'continuous',
    evidence: [
      'bun run proof:install',
      'bun run install:verify',
      '.github/workflows/repo-hygiene.yml',
    ],
    freshRerun: 'bun run proof:install',
  },
  {
    id: 'install-verify-journey',
    // owner: tests/journey/install-verify.test.ts
    claim: 'install:verify produces a successful WebView smoke report',
    kinds: ['journey'],
    gateClass: 'human-only',
    evidence: [
      'bun run test:install-verify',
      'tests/journey/install-verify.test.ts',
      'docs/harness/install-verify.md',
    ],
    freshRerun: 'bun run test:install-verify',
  },
  {
    id: 'test-changed',
    claim: 'Import-graph filter runs affected bun tests (dirty or since main)',
    kinds: ['unit', 'journey'],
    gateClass: 'continuous',
    evidence: [
      'bun run test:changed',
      'bun run test:changed:main',
      'bun run test:changed -- --main-head',
      'bun run test:changed -- HEAD~1',
      'bun scripts/bun-test-changed.ts',
      '.github/workflows/harness-gates.yml',
    ],
    freshRerun: 'bun run test:changed:main',
  },
  {
    id: 'search-governance',
    claim: 'Search bench gate policy holds',
    kinds: ['journey'],
    gateClass: 'workflow',
    evidence: ['bun run search:bench:gate', '.github/workflows/search-governance.yml'],
    freshRerun: 'bun run search:bench:gate',
  },
  {
    id: 'search-governance-basic',
    // owner: tests/journey/search-governance.test.ts
    claim: 'Search governance returns results for a known query (policy + search-smart + WebView)',
    kinds: ['journey'],
    gateClass: 'workflow',
    evidence: [
      'bun run test:search-governance',
      'tests/journey/search-governance.test.ts',
      'docs/harness/search-governance.md',
      '.github/workflows/search-governance.yml',
    ],
    freshRerun: 'bun run test:search-governance',
  },
  {
    id: 'runtime-cli-boundaries',
    claim: 'Critical Bun runtime CLI flags behave as expected',
    kinds: ['boundary'],
    gateClass: 'continuous',
    evidence: [
      'bun test tests/fixtures/runtime-cli/',
      'tests/fixtures/runtime-cli/**/fixture.test.ts',
    ],
    freshRerun: 'bun test tests/fixtures/runtime-cli/',
  },
  {
    // owner: platform team
    id: 'bun-shell-boundaries',
    claim: 'Bun.$ shell tagged templates behave as this repo depends on them',
    kinds: ['boundary'],
    gateClass: 'continuous',
    evidence: ['bun test tests/fixtures/bun-shell/', 'tests/fixtures/bun-shell/**/fixture.test.ts'],
    freshRerun: 'bun test tests/fixtures/bun-shell/',
  },
  {
    id: 'fs-native-boundaries',
    claim: 'Bun.file, Bun.write, and Bun.Glob behave as this repo depends on them',
    kinds: ['boundary'],
    gateClass: 'continuous',
    evidence: [
      'bun test tests/fs-bun.test.ts tests/bun-glob-scan.test.ts',
      'tests/fs-bun.test.ts',
      'tests/bun-glob-scan.test.ts',
    ],
    freshRerun: 'bun test tests/fs-bun.test.ts tests/bun-glob-scan.test.ts',
  },
  {
    id: 'security-hash-boundaries',
    claim: 'Bun.password and CryptoHasher behave as this repo depends on them',
    kinds: ['boundary'],
    gateClass: 'continuous',
    evidence: [
      'bun test tests/fixtures/security-hash/',
      'tests/fixtures/security-hash/**/fixture.test.ts',
    ],
    freshRerun: 'bun test tests/fixtures/security-hash/',
  },
  {
    id: 'path-bun',
    claim: 'Spine lib/ and tools/ do not import path/node:path',
    kinds: ['boundary'],
    gateClass: 'continuous',
    evidence: ['bun run check:path-bun'],
    freshRerun: 'bun run check:path-bun',
  },
  {
    id: 'bun-env',
    claim: 'Spine lib/ + scripts/ do not read environment via the Node process object',
    kinds: ['boundary'],
    gateClass: 'continuous',
    evidence: ['bun run check:bun-env', 'eslint bun/prefer-bun-env (error)'],
    freshRerun: 'bun run check:bun-env',
  },
  {
    id: 'unknown-param',
    claim: 'Bare unknown function params stay at parse*/FromUnknown edges',
    kinds: ['boundary'],
    gateClass: 'continuous',
    evidence: [
      'eslint harness/no-unknown-function-param (error)',
      'bun eslint --config eslint.bun-native.config.ts --quiet',
    ],
    freshRerun: 'bun eslint --config eslint.bun-native.config.ts --quiet',
  },
  {
    id: 'day-loop-typecheck',
    claim: 'Advertised type-check covers spine agent edit surfaces',
    kinds: ['journey'],
    gateClass: 'workflow',
    evidence: ['bun run type-check', 'tsconfig.check.json'],
    freshRerun: 'bun run type-check',
  },
  {
    id: 'lib-docs-typecheck',
    // owner: tsconfig.check.json · lib/docs/**
    claim: 'lib/docs/** is inside tsconfig.check.json (no dual-era docs island)',
    kinds: ['boundary', 'journey'],
    gateClass: 'workflow',
    evidence: ['bun run type-check', 'tsconfig.check.json include lib/docs/**/*', 'lib/docs/'],
    freshRerun: 'bun run type-check',
  },
  {
    id: 'lib-utils-typecheck',
    // owner: tsconfig.check.json · lib/utils/**
    claim: 'lib/utils/** is inside tsconfig.check.json (no dual-era utils island)',
    kinds: ['boundary', 'journey'],
    gateClass: 'workflow',
    evidence: ['bun run type-check', 'tsconfig.check.json include lib/utils/**/*', 'lib/utils/'],
    freshRerun: 'bun run type-check',
  },
  {
    id: 'lib-core-typecheck',
    // owner: tsconfig.check.json · lib/core/**
    claim:
      'lib/core/** is inside tsconfig.check.json with ErrorSeverity enum (no dual-era core island)',
    kinds: ['boundary', 'journey'],
    gateClass: 'workflow',
    evidence: ['bun run type-check', 'tsconfig.check.json include lib/core/**/*', 'lib/core/'],
    freshRerun: 'bun run type-check',
  },
  {
    id: 'lib-security-typecheck',
    // owner: tsconfig.check.json · lib/security/**
    claim: 'lib/security/** is inside tsconfig.check.json (no dual-era security island)',
    kinds: ['boundary', 'journey'],
    gateClass: 'workflow',
    evidence: [
      'bun run type-check',
      'tsconfig.check.json include lib/security/**/*',
      'lib/security/',
    ],
    freshRerun: 'bun run type-check',
  },
  {
    id: 'bun-cron',
    claim:
      'Scheduling mirrors Bun: OS-persistent Bun.cron(path, schedule, title) is primary; in-process is the complement (spine uses in-process deliberately)',
    kinds: ['unit', 'boundary'],
    gateClass: 'human-only',
    evidence: [
      'bun run test:cron',
      'docs/harness/cron.md',
      'lib/harness/cron.ts',
      'spine/scheduler.ts',
    ],
    freshRerun: 'bun run test:cron',
  },
  {
    id: 'cron-os-persistent',
    // owner: tests/journey/cron-os-persistent.test.ts
    claim:
      'OS-persistent Bun.cron(path, schedule, title) registers, fires scheduled(), and removes cleanly',
    kinds: ['journey', 'boundary'],
    gateClass: 'human-only',
    evidence: [
      'bun run test:cron-os',
      'tests/journey/cron-os-persistent.test.ts',
      'tests/fixtures/cron-os-persistent-worker.ts',
      'docs/harness/cron.md',
    ],
    freshRerun: 'bun run test:cron-os',
  },
  {
    id: 'docs-integrity',
    // owner: tools/bun-doc-refs.ts · spine tenant docs-integrity
    claim: 'Bun docs stack integrity pass succeeds (schedule --once)',
    kinds: ['journey', 'boundary'],
    gateClass: 'human-only',
    evidence: [
      'bun tools/bun-doc-refs.ts schedule --once',
      'tools/bun-doc-refs.ts',
      'docs/harness/tenants/docs-integrity.md',
    ],
    freshRerun: 'bun tools/bun-doc-refs.ts schedule --once',
  },
  {
    id: 'spine-multi-tenant',
    // owner: spine/tenants.ts · spine/scheduler.ts
    claim: 'Spine runs ≥2 in-process tenants (docs-integrity + install-verify journey)',
    kinds: ['journey', 'boundary'],
    gateClass: 'human-only',
    evidence: [
      'spine/tenants.ts',
      'spine/scheduler.ts',
      'bun run spine:schedule:once -- --tenant=install-verify',
      'docs/harness/cron.md',
      'docs/harness/spine-tenants.md',
      'lib/harness/maintenance.ts',
    ],
    freshRerun: 'bun run spine:schedule:once -- --tenant=install-verify',
  },
  {
    id: 'spine-maintenance-runbooks',
    // owner: lib/harness/maintenance.ts · docs/harness/tenants/
    claim: 'Every spine tenant has TenantRunbook + SignalMonitor; retirementCheck; live freshRerun',
    kinds: ['boundary', 'journey'],
    gateClass: 'human-only',
    evidence: [
      'lib/harness/maintenance.ts',
      'lib/harness/discover-scheduled.ts',
      'lib/harness/signal-monitoring.ts',
      'lib/harness/intervention-validity.ts',
      'docs/harness/tenants/',
      'bun run test:tenant-runbooks',
      'docs/harness/spine-tenants.md',
    ],
    freshRerun: 'bun run test:tenant-runbooks',
  },
  {
    id: 'spine-tenant-heal',
    // owner: lib/harness/heal-fixture.ts · tests/journey/tenant-heal.test.ts
    claim: 'Sandboxed maintenance loop heals: break → signal → intervene → proof green',
    kinds: ['journey'],
    gateClass: 'human-only',
    evidence: [
      'lib/harness/heal-fixture.ts',
      'scripts/tenant-heal-fixture.ts',
      'tests/fixtures/tenant-heal/',
      'tests/journey/tenant-heal.test.ts',
      'bun run test:tenant-heal',
      'docs/harness/spine-tenants.md',
    ],
    freshRerun: 'bun run test:tenant-heal',
  },
  {
    id: 'harness-coverage-ratchet',
    // owner: lib/harness/coverage-ratchet.ts · coverage-baseline.json
    claim: 'lib/harness line/func coverage stays at or above coverage-baseline.json floors',
    kinds: ['boundary', 'journey'],
    gateClass: 'continuous',
    evidence: [
      'lib/harness/coverage-ratchet.ts',
      'lib/harness/coverage-baseline.json',
      'bun run test:harness-coverage',
      'docs/harness/code-quality.md',
    ],
    freshRerun: 'bun run test:harness-coverage',
  },
  {
    id: 'harness-orphan-modules',
    // owner: scripts/check-harness-orphans.ts
    claim: 'Every lib/harness/*.ts module has at least one importer outside itself',
    kinds: ['boundary'],
    gateClass: 'continuous',
    evidence: [
      'scripts/check-harness-orphans.ts',
      'bun run check:harness-orphans',
      'docs/harness/tenants/orphan-modules.md',
    ],
    freshRerun: 'bun run check:harness-orphans',
  },
  {
    id: 'harness-complexity-floor',
    // owner: lib/harness/complexity.ts · complexity-baseline.json
    claim: 'No lib/harness function exceeds complexity-baseline.json maxComplexity',
    kinds: ['boundary'],
    gateClass: 'continuous',
    evidence: [
      'lib/harness/complexity.ts',
      'lib/harness/complexity-baseline.json',
      'scripts/complexity-check.ts',
      'bun run check:harness-complexity',
      'docs/harness/tenants/complexity-floor.md',
    ],
    freshRerun: 'bun run check:harness-complexity',
  },
  {
    id: 'code-quality-tenants',
    // owner: lib/harness/code-quality.ts
    claim:
      'Code-quality tenants (types · coverage · orphans · complexity) have runbooks and live freshRerun',
    kinds: ['boundary', 'journey'],
    gateClass: 'continuous',
    evidence: [
      'lib/harness/code-quality.ts',
      'docs/harness/code-quality.md',
      'bun run test:code-quality',
    ],
    freshRerun: 'bun run test:code-quality',
  },
  {
    id: 'ci-deploy-runbooks',
    // owner: lib/harness/ci-deploy.ts · discover-ci.ts
    claim: 'CI/deploy jobs have runbooks; discover-ci coverage is fail-closed',
    kinds: ['boundary'],
    gateClass: 'continuous',
    evidence: [
      'lib/harness/ci-deploy.ts',
      'lib/harness/discover-ci.ts',
      'docs/harness/ci-deploy.md',
      'bun run test:ci-deploy',
    ],
    freshRerun: 'bun run test:ci-deploy',
  },
  // Catalog-owned CI/deploy children (ci-core-envelope … bun-migrate-status):
  // ProofPath.freshRerun is `bun run docs:ci-deploy` (catalog presence).
  // Behavior / intervention lives on CiRunbook; fail-closed coverage is ci-deploy-runbooks.
  {
    id: 'ci-core-envelope',
    // owner: scripts/ci-core.ts · .github/workflows/harness-gates.yml
    claim: 'CI envelope bun run ci:core is cataloged (install verify · hygiene · ci:harness)',
    kinds: ['boundary'],
    gateClass: 'continuous',
    evidence: [
      'bun run docs:ci-deploy',
      'scripts/ci-core.ts',
      '.github/workflows/harness-gates.yml',
      'bun run ci:core',
      'docs/harness/tenants/ci-core.md',
    ],
    freshRerun: 'bun run docs:ci-deploy',
  },
  {
    id: 'typescript-ci-gate',
    // owner: .github/workflows/typescript-checks.yml
    claim: 'typescript-checks ownership of type-check:ci / type-check:full is cataloged',
    kinds: ['boundary'],
    gateClass: 'workflow',
    evidence: [
      'bun run docs:ci-deploy',
      '.github/workflows/typescript-checks.yml',
      'bun run type-check:ci',
      'docs/harness/tenants/typescript-ci.md',
    ],
    freshRerun: 'bun run docs:ci-deploy',
  },
  {
    id: 'deploy-production-preflight',
    // owner: scripts/deployment/deploy-production.ts
    claim: 'Production deploy path bun run deploy:production is cataloged (Bun.secrets + R2)',
    kinds: ['boundary'],
    gateClass: 'human-only',
    evidence: [
      'bun run docs:ci-deploy',
      'scripts/deployment/deploy-production.ts',
      'bun run deploy:production',
      'docs/harness/tenants/deploy-production.md',
    ],
    freshRerun: 'bun run docs:ci-deploy',
  },
  {
    id: 'deploy-staging-script',
    // owner: scripts/shell/deploy-staging.sh
    claim: 'Staging deploy path bun run deploy:staging is cataloged',
    kinds: ['boundary'],
    gateClass: 'human-only',
    evidence: [
      'bun run docs:ci-deploy',
      'scripts/shell/deploy-staging.sh',
      'bun run deploy:staging',
      'docs/harness/tenants/deploy-staging.md',
    ],
    freshRerun: 'bun run docs:ci-deploy',
  },
  {
    id: 'bun-migrate-status',
    // owner: scripts/bun-migrate.ts
    claim: 'Bun migration inventory path bun run migrate:status is cataloged',
    kinds: ['boundary'],
    gateClass: 'human-only',
    evidence: [
      'bun run docs:ci-deploy',
      'scripts/bun-migrate.ts',
      'bun run migrate:status',
      'docs/harness/tenants/bun-migrate.md',
    ],
    freshRerun: 'bun run docs:ci-deploy',
  },
] as const;

export function proofPathById(id: string): ProofPath | undefined {
  // brand-ok — opaque catalog key
  return CRITICAL_PROOF_PATHS.find(p => p.id === id);
}
