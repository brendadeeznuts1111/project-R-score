// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — WebView
// @see https://bun.com/blog/bun-v1.3.12#urlpattern-is-up-to-2-3x-faster — URLPattern
/**
 * Proof claim kinds for harness “done” checklists.
 * @see ../../docs/harness/PROOF.md
 * @see ../../docs/harness/FRESH-RERUN.md
 */

export type ProofKind = 'unit' | 'boundary' | 'journey' | 'deployed';

export type ProofPath = {
  id: string; // brand-ok — opaque proof-path catalog key
  claim: string;
  kinds: ProofKind[];
  evidence: string[];
  /**
   * Command that re-proves the claim from a clean-enough state
   * (fresh session / no reliance on the proposing conversation).
   * Paste its terminal output into the PR when touching the claim’s owner.
   * @see ../../docs/harness/FRESH-RERUN.md
   */
  freshRerun: string;
};

/** Manual Bun-native smoke files (not a second CI SSOT — prefer test:changed:main). */
export const CI_SPINE_SMOKE_TESTS = [
  'tests/bun-urlpattern.test.ts',
  'tests/bun-glob-scan.test.ts',
  'tests/bun-ansi-width.test.ts',
  'tests/console-depth.test.ts',
  'tests/bun-cron.test.ts',
  'tests/bun-explicit-resource.test.ts',
  'tests/harness-cron-contract.test.ts',
  'tests/bun-markdown-ansi.test.ts',
  'tests/journey/install-verify.test.ts',
  'tests/journey/search-governance.test.ts',
  'tests/harness-fresh-rerun-contract.test.ts',
] as const;

/** Named critical paths — each must set `freshRerun` (see FRESH-RERUN.md). */
export const CRITICAL_PROOF_PATHS: readonly ProofPath[] = [
  {
    id: 'branded-ids',
    claim: 'New domain IDs are branded after the boundary',
    kinds: ['boundary', 'unit'],
    evidence: ['bun tools/branded-id-check.ts --staged --strict', 'bun run check:brands:types'],
    freshRerun: 'bun run check:brands:types',
  },
  {
    id: 'install-verify',
    claim: 'Factory install produces a working Bun workspace',
    kinds: ['journey', 'deployed'],
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
    claim: 'Search bench gate policy holds in CI',
    kinds: ['journey'],
    evidence: ['.github/workflows/search-governance.yml'],
    freshRerun: 'bun run search:bench:gate',
  },
  {
    id: 'search-governance-basic',
    // owner: tests/journey/search-governance.test.ts
    claim: 'Search governance returns results for a known query (policy + search-smart + WebView)',
    kinds: ['journey'],
    evidence: [
      'bun run test:search-governance',
      'tests/journey/search-governance.test.ts',
      'docs/harness/search-governance.md',
      '.github/workflows/search-governance.yml',
    ],
    freshRerun: 'bun run test:search-governance',
  },
  {
    id: 'path-bun',
    claim: 'Spine lib/ does not import path/node:path',
    kinds: ['boundary'],
    evidence: ['bun run check:path-bun'],
    freshRerun: 'bun run check:path-bun',
  },
  {
    id: 'bun-env',
    claim: 'Spine lib/ + scripts/ do not read environment via the Node process object',
    kinds: ['boundary'],
    evidence: ['bun run check:bun-env', 'eslint bun/prefer-bun-env (error)'],
    freshRerun: 'bun run check:bun-env',
  },
  {
    id: 'unknown-param',
    claim: 'Bare unknown function params stay at parse*/FromUnknown edges',
    kinds: ['boundary'],
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
    evidence: ['bun run type-check', 'tsconfig.check.json'],
    freshRerun: 'bun run type-check',
  },
  {
    id: 'bun-cron',
    claim:
      'Scheduling mirrors Bun: OS-persistent Bun.cron(path, schedule, title) is primary; in-process is the complement (spine uses in-process deliberately)',
    kinds: ['unit', 'boundary'],
    evidence: [
      'bun run test:cron',
      'docs/harness/cron.md',
      'lib/harness/cron.ts',
      'spine/scheduler.ts',
    ],
    freshRerun: 'bun run test:cron',
  },
] as const;

export function proofPathById(id: string): ProofPath | undefined {
  // brand-ok — opaque catalog key
  return CRITICAL_PROOF_PATHS.find(p => p.id === id);
}
