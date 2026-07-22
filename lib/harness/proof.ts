// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
// @see https://bun.com/docs/runtime/utils#bun-peek — Bun.peek
// @see https://bun.com/docs/runtime/child-process#terminal-pty-support — Bun.Terminal
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/docs/guides/html-rewriter/extract-social-meta#extract-social-share-images-and-open-graph-tags — SocialMetadata
// @see https://bun.com/docs/runtime/html-rewriter — HTMLRewriter
// @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — URLPatternInit
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect-custom — Bun.inspect.custom
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/secrets#bun-secrets-get-options — Bun.secrets
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — WebView
// @see https://bun.com/blog/bun-v1.3.12#urlpattern-is-up-to-2-3x-faster — URLPattern
/**
 * Proof claim kinds for harness “done” checklists.
 * @see ../../docs/harness/PROOF.md
 * @see ../../docs/harness/FRESH-RERUN.md
 */

import { inspectCustom } from '../console-depth';

export type ProofKind = 'unit' | 'boundary' | 'journey' | 'deployed';

const PROOF_KIND_ORDER: readonly ProofKind[] = ['unit', 'boundary', 'journey', 'deployed'];

/** Stable kinds order for catalog entries (unit → boundary → journey → deployed). */
export function orderProofKinds(kinds: readonly ProofKind[]): ProofKind[] {
  return [...kinds].sort((a, b) => PROOF_KIND_ORDER.indexOf(a) - PROOF_KIND_ORDER.indexOf(b));
}

/** How the claim is enforced day-to-day (see docs/harness/PROOF.md Gate class). */
export type ProofGateClass = 'continuous' | 'workflow' | 'human-only';

/**
 * What ProofPath.freshRerun exit-0 proves.
 * - claim: behavioral re-proof of the claim
 * - catalog: catalog/doc presence (CI children → docs:ci-deploy); behavior on CiRunbook.intervention
 */
export type FreshRerunKind = 'claim' | 'catalog';

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
  /**
   * Machine pointer for gateClass ratchet (not free prose).
   * continuous → pre-commit-harness | ci:harness | ci:core
   * workflow → basename under .github/workflows/
   * human-only → none
   */
  gateRef: string;
  evidence: string[];
  /**
   * Command that re-proves the claim from a clean-enough state
   * (fresh session / no reliance on the proposing conversation).
   * Paste its terminal output into the PR when touching the claim’s owner.
   * Meaning of exit 0 is discriminated by freshRerunKind.
   * @see ../../docs/harness/FRESH-RERUN.md
   */
  freshRerun: string;
  /** claim = behavioral re-proof; catalog = docs/catalog presence only */
  freshRerunKind: FreshRerunKind;
  /**
   * Human/path owner accountable when the claim breaks (migrated from // owner: comments).
   */
  owner: string;
  /**
   * Parent catalog claims only — closed set of child ProofPath ids.
   * Asserted against CI_RUNBOOKS / CODE_QUALITY_TENANTS / MAINTENANCE_RUNBOOKS.
   */
  childIds?: readonly string[];
};

/** Named critical paths — each must set `freshRerun` (see FRESH-RERUN.md). */
export const CRITICAL_PROOF_PATHS: readonly ProofPath[] = [
  {
    id: 'branded-ids',
    claim: 'New domain IDs are branded after the boundary',
    kinds: ['unit', 'boundary'],
    gateClass: 'continuous',
    gateRef: 'pre-commit-harness',
    evidence: ['bun tools/branded-id-check.ts --staged --strict', 'bun run check:brands:types'],
    freshRerun: 'bun run check:brands:types',
    freshRerunKind: 'claim',
    owner: 'platform / harness',
  },
  {
    id: 'install-verify',
    claim: 'Factory install produces a working Bun workspace',
    kinds: ['journey', 'deployed'],
    gateClass: 'continuous',
    gateRef: 'ci:core',
    evidence: [
      'bun run proof:install',
      'bun run install:verify',
      '.github/workflows/repo-hygiene.yml',
    ],
    freshRerun: 'bun run proof:install',
    freshRerunKind: 'claim',
    owner: 'platform / harness',
  },
  {
    id: 'install-verify-journey',
    claim: 'install:verify produces a successful WebView smoke report',
    kinds: ['journey'],
    gateClass: 'human-only',
    gateRef: 'none',
    evidence: [
      'bun run test:install-verify',
      'tests/journey/install-verify.test.ts',
      'docs/harness/install-verify.md',
    ],
    freshRerun: 'bun run test:install-verify',
    freshRerunKind: 'claim',
    owner: 'tests/journey/install-verify.test.ts',
  },
  {
    id: 'test-changed',
    claim: 'Import-graph filter runs affected bun tests (dirty or since main)',
    kinds: ['unit', 'journey'],
    gateClass: 'continuous',
    gateRef: 'ci:harness',
    evidence: [
      'bun run test:changed',
      'bun run test:changed:main',
      'bun run test:changed -- --main-head',
      'bun run test:changed -- HEAD~1',
      'bun scripts/bun-test-changed.ts',
      '.github/workflows/harness-gates.yml',
    ],
    freshRerun: 'bun run test:changed:main',
    freshRerunKind: 'claim',
    owner: 'platform / harness',
  },
  {
    id: 'search-governance',
    claim: 'Search bench gate policy holds',
    kinds: ['journey'],
    gateClass: 'workflow',
    gateRef: 'search-governance.yml',
    evidence: ['bun run search:bench:gate', '.github/workflows/search-governance.yml'],
    freshRerun: 'bun run search:bench:gate',
    freshRerunKind: 'claim',
    owner: 'platform / harness',
  },
  {
    id: 'search-governance-basic',
    claim: 'Search governance returns results for a known query (policy + search-smart + WebView)',
    kinds: ['journey'],
    gateClass: 'workflow',
    gateRef: 'search-governance.yml',
    evidence: [
      'bun run test:search-governance',
      'tests/journey/search-governance.test.ts',
      'docs/harness/search-governance.md',
      '.github/workflows/search-governance.yml',
    ],
    freshRerun: 'bun run test:search-governance',
    freshRerunKind: 'claim',
    owner: 'tests/journey/search-governance.test.ts',
  },
  {
    id: 'runtime-cli-boundaries',
    claim: 'Critical Bun runtime CLI flags behave as expected',
    kinds: ['boundary'],
    gateClass: 'continuous',
    gateRef: 'ci:harness',
    evidence: [
      'bun test tests/fixtures/runtime-cli/',
      'tests/fixtures/runtime-cli/**/fixture.test.ts',
    ],
    freshRerun: 'bun test tests/fixtures/runtime-cli/',
    freshRerunKind: 'claim',
    owner: 'platform / harness',
  },
  {
    id: 'bun-shell-boundaries',
    claim: 'Bun.$ shell tagged templates behave as this repo depends on them',
    kinds: ['boundary'],
    gateClass: 'continuous',
    gateRef: 'ci:harness',
    evidence: ['bun test tests/fixtures/bun-shell/', 'tests/fixtures/bun-shell/**/fixture.test.ts'],
    freshRerun: 'bun test tests/fixtures/bun-shell/',
    freshRerunKind: 'claim',
    owner: 'platform team',
  },
  {
    id: 'fs-native-boundaries',
    claim: 'Bun.file, Bun.write, and Bun.Glob behave as this repo depends on them',
    kinds: ['boundary'],
    gateClass: 'continuous',
    gateRef: 'ci:harness',
    evidence: [
      'bun test tests/fs-bun.test.ts tests/bun-glob-scan.test.ts',
      'tests/fs-bun.test.ts',
      'tests/bun-glob-scan.test.ts',
    ],
    freshRerun: 'bun test tests/fs-bun.test.ts tests/bun-glob-scan.test.ts',
    freshRerunKind: 'claim',
    owner: 'platform / harness',
  },
  {
    id: 'image-metadata-boundaries',
    claim:
      'Bun.Image metadata extract/resize/verify/parse and TEST-003 screenshot remediation behave as this repo depends on them (awaitAllSettled + deepEquals unchanged + evidence timing)',
    kinds: ['unit', 'boundary'],
    gateClass: 'human-only',
    gateRef: 'none',
    evidence: [
      'bun test ./tests/image-metadata.test.ts',
      'tests/image-metadata.test.ts',
      'lib/image-metadata.ts',
      'lib/screenshot-remediation.ts',
      'lib/deep-equals.ts',
      'lib/peek-settle.ts',
    ],
    freshRerun: 'bun test ./tests/image-metadata.test.ts',
    freshRerunKind: 'claim',
    owner: 'lib/image-metadata.ts',
  },
  {
    id: 'deep-equals-boundaries',
    claim:
      'Bun.deepEquals wrapper and strict/changed-index helpers behave as this repo depends on them',
    kinds: ['unit', 'boundary'],
    gateClass: 'human-only',
    gateRef: 'none',
    evidence: [
      'bun test ./tests/deep-equals.test.ts',
      'tests/deep-equals.test.ts',
      'lib/deep-equals.ts',
    ],
    freshRerun: 'bun test ./tests/deep-equals.test.ts',
    freshRerunKind: 'claim',
    owner: 'lib/deep-equals.ts',
  },
  {
    id: 'peek-settle-boundaries',
    claim:
      'Bun.peek settled-promise helpers (awaitSettled / awaitAllSettled / peekIfSettled) behave as this repo depends on them',
    kinds: ['unit', 'boundary'],
    gateClass: 'human-only',
    gateRef: 'none',
    evidence: [
      'bun test ./tests/peek-settle.test.ts',
      'tests/peek-settle.test.ts',
      'lib/peek-settle.ts',
    ],
    freshRerun: 'bun test ./tests/peek-settle.test.ts',
    freshRerunKind: 'claim',
    owner: 'lib/peek-settle.ts',
  },
  {
    id: 'bun-time-boundaries',
    claim:
      'Bun utils date/time/number tokens (nanoseconds, sleep/sleepSync, randomUUIDv7, version/revision) + evidenceId timing coherence behave as this repo depends on them',
    kinds: ['unit', 'boundary'],
    gateClass: 'human-only',
    gateRef: 'none',
    evidence: ['bun test ./tests/time.test.ts', 'tests/time.test.ts', 'lib/time.ts'],
    freshRerun: 'bun test ./tests/time.test.ts',
    freshRerunKind: 'claim',
    owner: 'lib/time.ts',
  },
  {
    id: 'cloudflare-pages-env-ssot',
    claim:
      'Cloudflare Pages project-r-score identity + build pins (BUN_VERSION 1.3.14, SKIP_DEPENDENCY_INSTALL, destination public) stay documented in config/r2-env and .env.example',
    kinds: ['unit', 'boundary'],
    gateClass: 'human-only',
    gateRef: 'none',
    evidence: [
      'bun test tests/r2-env.test.ts',
      'tests/r2-env.test.ts',
      'config/r2-env.ts',
      '.env.example',
      'public/index.html',
      'bun run cloudflare:env:assert',
      'bun run cloudflare:env:assert-apex',
      'docs/harness/tenants/cloudflare-pages.md',
    ],
    // freshRerun must be an evidence entry (parity ratchet); apex/assert stay optional ops evidence.
    freshRerun: 'bun test tests/r2-env.test.ts',
    freshRerunKind: 'claim',
    owner: 'config/r2-env.ts',
  },
  {
    id: 'terminal-pty-boundaries',
    claim: 'Bun.Terminal PTY helpers spawn and capture as this repo depends on them',
    kinds: ['unit', 'boundary'],
    gateClass: 'human-only',
    gateRef: 'none',
    evidence: ['bun test ./tests/terminal.test.ts', 'tests/terminal.test.ts', 'lib/terminal.ts'],
    freshRerun: 'bun test ./tests/terminal.test.ts',
    freshRerunKind: 'claim',
    owner: 'lib/terminal.ts',
  },
  {
    id: 'console-depth-boundaries',
    claim:
      'lib/console-depth Bun.inspect / .table / .custom / width / markdown helpers and depth precedence behave as this repo depends on them',
    kinds: ['unit', 'boundary'],
    gateClass: 'human-only',
    gateRef: 'none',
    evidence: [
      'bun test tests/console-depth.test.ts',
      'tests/console-depth.test.ts',
      'lib/console-depth.ts',
    ],
    freshRerun: 'bun test tests/console-depth.test.ts',
    freshRerunKind: 'claim',
    owner: 'lib/console-depth.ts',
  },
  {
    id: 'github-repository-ref-boundaries',
    claim:
      'GitHub repository identity resolves Actions → git remote → CANONICAL_REMOTES and fails loud on garbage wire',
    kinds: ['unit', 'boundary'],
    gateClass: 'human-only',
    gateRef: 'none',
    evidence: [
      'bun test tests/github-repository-ref.test.ts',
      'tests/github-repository-ref.test.ts',
      'lib/github-repository-ref.ts',
      'lib/docs/repo-docs.ts',
    ],
    freshRerun: 'bun test tests/github-repository-ref.test.ts',
    freshRerunKind: 'claim',
    owner: 'lib/github-repository-ref.ts',
  },
  {
    id: 'macros-embed-boundaries',
    claim:
      'Bundle-time macros inline git commit/branch and GitHub repo parts under bun build (no runtime substitution)',
    kinds: ['unit', 'boundary'],
    gateClass: 'human-only',
    gateRef: 'none',
    evidence: [
      'bun test tests/macros/embed-commit.test.ts',
      'tests/macros/embed-commit.test.ts',
      'lib/macros/',
      'lib/macros/README.md',
    ],
    freshRerun: 'bun test tests/macros/embed-commit.test.ts',
    freshRerunKind: 'claim',
    owner: 'lib/macros/',
  },
  {
    id: 'security-hash-boundaries',
    claim: 'Bun.password and CryptoHasher behave as this repo depends on them',
    kinds: ['boundary'],
    gateClass: 'continuous',
    gateRef: 'ci:harness',
    evidence: [
      'bun test tests/fixtures/security-hash/',
      'tests/fixtures/security-hash/**/fixture.test.ts',
    ],
    freshRerun: 'bun test tests/fixtures/security-hash/',
    freshRerunKind: 'claim',
    owner: 'platform / harness',
  },
  {
    id: 'url-pattern-boundaries',
    claim: 'Bun site URLs are derived from URLPatternInit protocol/hostname/pathname/hash',
    kinds: ['boundary'],
    gateClass: 'continuous',
    gateRef: 'ci:harness',
    evidence: ['bun test tests/bun-site-url.test.ts', 'tests/bun-site-url.test.ts'],
    freshRerun: 'bun test tests/bun-site-url.test.ts',
    freshRerunKind: 'claim',
    owner: 'lib/docs/bun-site-url.ts',
  },
  {
    id: 'social-metadata-boundaries',
    claim:
      'Social metadata extraction via HTMLRewriter matches expected OG/Twitter/fallback behavior',
    kinds: ['boundary'],
    gateClass: 'continuous',
    gateRef: 'ci:harness',
    evidence: [
      'bun test tests/fixtures/social-metadata/',
      'tests/fixtures/social-metadata/fixture.test.ts',
      'lib/docs/extract-metadata.ts',
    ],
    freshRerun: 'bun test tests/fixtures/social-metadata/',
    freshRerunKind: 'claim',
    owner: 'lib/docs/extract-metadata.ts',
  },
  {
    id: 'blog-extraction-boundaries',
    claim: 'Blog HTML extraction excludes nav/footer from article body',
    kinds: ['boundary'],
    gateClass: 'continuous',
    gateRef: 'ci:harness',
    evidence: [
      'bun test tests/fixtures/blog-extraction/',
      'tests/fixtures/blog-extraction/fixture.test.ts',
    ],
    freshRerun: 'bun test tests/fixtures/blog-extraction/',
    freshRerunKind: 'claim',
    owner: 'lib/docs/blog-extract.ts',
  },
  {
    id: 'fetch-page-boundaries',
    claim:
      'fetchPage enforces HTTPS, Accept/UA, 15s timeout, optional verbose; throws on non-OK; leaves success body unread (call-site dns.prefetch OK; fetch.preconnect deferred — Bun Invalid port)',
    kinds: ['boundary'],
    gateClass: 'continuous',
    gateRef: 'ci:harness',
    evidence: [
      'bun test tests/fixtures/fetch-page/',
      'tests/fixtures/fetch-page/fixture.test.ts',
      'lib/docs/fetch-page.ts',
    ],
    freshRerun: 'bun test tests/fixtures/fetch-page/',
    freshRerunKind: 'claim',
    owner: 'lib/docs/fetch-page.ts',
  },
  {
    id: 'blog-extraction-journey',
    claim:
      'CANONICAL_SOURCES.blog → URLPattern → dns.prefetch → fetchPage → SocialMetadata (+ streamed article)',
    kinds: ['journey'],
    gateClass: 'human-only',
    gateRef: 'none',
    evidence: [
      'bun test tests/journey/blog-extraction.test.ts',
      'tests/journey/blog-extraction.test.ts',
    ],
    freshRerun: 'bun test tests/journey/blog-extraction.test.ts',
    freshRerunKind: 'claim',
    owner: 'tests/journey/blog-extraction.test.ts',
  },
  {
    id: 'bun-http-server-docs',
    claim:
      'CANONICAL_REFS + GUIDE_EXAMPLES cover runtime/http/server TOC (routes, port/hostname, unix, HTTP/3, lifecycle, metrics, reference)',
    kinds: ['boundary'],
    gateClass: 'continuous',
    gateRef: 'ci:harness',
    evidence: [
      'bun test tests/bun-docs-catalog.test.ts',
      'tools/bun-doc-refs.ts',
      'tools/bun-docs-guide-examples.ts',
    ],
    freshRerun: 'bun test tests/bun-docs-catalog.test.ts',
    freshRerunKind: 'claim',
    owner: 'tools/bun-docs-guide-examples.ts · tools/bun-doc-refs.ts',
  },
  {
    id: 'path-bun',
    claim: 'Spine lib/ and tools/ do not import path/node:path',
    kinds: ['boundary'],
    gateClass: 'continuous',
    gateRef: 'pre-commit-harness',
    evidence: ['bun run check:path-bun'],
    freshRerun: 'bun run check:path-bun',
    freshRerunKind: 'claim',
    owner: 'platform / harness',
  },
  {
    id: 'bun-env',
    claim: 'Spine lib/ + scripts/ do not read environment via the Node process object',
    kinds: ['boundary'],
    gateClass: 'continuous',
    gateRef: 'pre-commit-harness',
    evidence: ['bun run check:bun-env', 'eslint bun/prefer-bun-env (error)'],
    freshRerun: 'bun run check:bun-env',
    freshRerunKind: 'claim',
    owner: 'platform / harness',
  },
  {
    id: 'invisible-chars',
    claim:
      'Invisible/format Unicode code points are written as \\u escapes in source, never literal bytes',
    kinds: ['boundary'],
    gateClass: 'continuous',
    gateRef: 'pre-commit-harness',
    evidence: ['bun run check:invisible-chars'],
    freshRerun: 'bun run check:invisible-chars',
    freshRerunKind: 'claim',
    owner: 'platform / harness',
  },
  {
    id: 'unknown-param',
    claim: 'Bare unknown function params stay at parse*/FromUnknown edges',
    kinds: ['boundary'],
    gateClass: 'continuous',
    gateRef: 'pre-commit-harness',
    evidence: [
      'eslint harness/no-unknown-function-param (error)',
      'bun eslint --config eslint.bun-native.config.ts --quiet',
    ],
    freshRerun: 'bun eslint --config eslint.bun-native.config.ts --quiet',
    freshRerunKind: 'claim',
    owner: 'platform / harness',
  },
  {
    id: 'day-loop-typecheck',
    claim: 'Advertised type-check covers spine agent edit surfaces',
    kinds: ['journey'],
    gateClass: 'workflow',
    gateRef: 'typescript-checks.yml',
    evidence: ['bun run type-check', 'tsconfig.check.json'],
    freshRerun: 'bun run type-check',
    freshRerunKind: 'claim',
    owner: 'platform / harness',
  },
  {
    id: 'lib-docs-typecheck',
    claim: 'lib/docs/** is inside tsconfig.check.json (no dual-era docs island)',
    kinds: ['boundary', 'journey'],
    gateClass: 'workflow',
    gateRef: 'typescript-checks.yml',
    evidence: ['bun run type-check', 'tsconfig.check.json include lib/docs/**/*', 'lib/docs/'],
    freshRerun: 'bun run type-check',
    freshRerunKind: 'claim',
    owner: 'tsconfig.check.json · lib/docs/**',
  },
  {
    id: 'lib-utils-typecheck',
    claim: 'lib/utils/** is inside tsconfig.check.json (no dual-era utils island)',
    kinds: ['boundary', 'journey'],
    gateClass: 'workflow',
    gateRef: 'typescript-checks.yml',
    evidence: ['bun run type-check', 'tsconfig.check.json include lib/utils/**/*', 'lib/utils/'],
    freshRerun: 'bun run type-check',
    freshRerunKind: 'claim',
    owner: 'tsconfig.check.json · lib/utils/**',
  },
  {
    id: 'lib-core-typecheck',
    claim:
      'lib/core/** is inside tsconfig.check.json with ErrorSeverity enum (no dual-era core island)',
    kinds: ['boundary', 'journey'],
    gateClass: 'workflow',
    gateRef: 'typescript-checks.yml',
    evidence: ['bun run type-check', 'tsconfig.check.json include lib/core/**/*', 'lib/core/'],
    freshRerun: 'bun run type-check',
    freshRerunKind: 'claim',
    owner: 'tsconfig.check.json · lib/core/**',
  },
  {
    id: 'lib-security-typecheck',
    claim: 'lib/security/** is inside tsconfig.check.json (no dual-era security island)',
    kinds: ['boundary', 'journey'],
    gateClass: 'workflow',
    gateRef: 'typescript-checks.yml',
    evidence: [
      'bun run type-check',
      'tsconfig.check.json include lib/security/**/*',
      'lib/security/',
    ],
    freshRerun: 'bun run type-check',
    freshRerunKind: 'claim',
    owner: 'tsconfig.check.json · lib/security/**',
  },
  {
    id: 'bun-cron',
    claim:
      'Scheduling mirrors Bun: OS-persistent Bun.cron(path, schedule, title) is primary; in-process is the complement (spine uses in-process deliberately)',
    kinds: ['unit', 'boundary'],
    gateClass: 'human-only',
    gateRef: 'none',
    evidence: [
      'bun run test:cron',
      'docs/harness/cron.md',
      'lib/harness/cron.ts',
      'spine/scheduler.ts',
    ],
    freshRerun: 'bun run test:cron',
    freshRerunKind: 'claim',
    owner: 'platform / harness',
  },
  {
    id: 'cron-os-persistent',
    claim:
      'OS-persistent Bun.cron(path, schedule, title) registers, fires scheduled(), and removes cleanly',
    kinds: ['boundary', 'journey'],
    gateClass: 'human-only',
    gateRef: 'none',
    evidence: [
      'bun run test:cron-os',
      'tests/journey/cron-os-persistent.test.ts',
      'tests/fixtures/cron-os-persistent-worker.ts',
      'docs/harness/cron.md',
    ],
    freshRerun: 'bun run test:cron-os',
    freshRerunKind: 'claim',
    owner: 'tests/journey/cron-os-persistent.test.ts',
  },
  {
    id: 'docs-integrity',
    claim: 'Bun docs stack integrity pass succeeds (schedule --once)',
    kinds: ['boundary', 'journey'],
    gateClass: 'human-only',
    gateRef: 'none',
    evidence: [
      'bun tools/bun-doc-refs.ts schedule --once',
      'tools/bun-doc-refs.ts',
      'docs/harness/tenants/docs-integrity.md',
    ],
    freshRerun: 'bun tools/bun-doc-refs.ts schedule --once',
    freshRerunKind: 'claim',
    owner: 'tools/bun-doc-refs.ts · spine tenant docs-integrity',
  },
  {
    id: 'audit-findings-catalog',
    claim:
      'FactoryWager audit findings+concepts verify (evidence · graph · relatedDocs · catalog/page parity; sha3-256 primary; sibling SSOT, not BunToken)',
    kinds: ['unit', 'boundary'],
    gateClass: 'continuous',
    gateRef: 'ci:harness',
    evidence: [
      'bun run audit:verify',
      'bun tools/audit-catalog.ts verify',
      'bun tools/audit-catalog.ts build',
      'bun test tests/audit-catalog.test.ts',
      'lib/audit/audit-finding.ts',
      'lib/audit/audit-concept.ts',
      'lib/audit/audit-refs.ts',
      'tools/audit-catalog.ts',
      'tools/bun-doc-refs.ts',
      'tools/audit-findings/',
      'tools/audit-concepts/',
      'tools/audit-catalog.json',
      'docs/audit/README.md',
      'docs/audit/findings/',
      'docs/audit/concepts/',
    ],
    freshRerun: 'bun run audit:verify',
    freshRerunKind: 'claim',
    owner: 'lib/audit/ · tools/audit-catalog.ts · tools/bun-doc-refs.ts',
  },
  {
    id: 'spine-multi-tenant',
    claim: 'Spine runs ≥2 in-process tenants (docs-integrity + install-verify journey)',
    kinds: ['boundary', 'journey'],
    gateClass: 'human-only',
    gateRef: 'none',
    evidence: [
      'spine/tenants.ts',
      'spine/scheduler.ts',
      'bun run spine:schedule:once -- --tenant=install-verify',
      'docs/harness/cron.md',
      'docs/harness/spine-tenants.md',
      'lib/harness/maintenance.ts',
    ],
    freshRerun: 'bun run spine:schedule:once -- --tenant=install-verify',
    freshRerunKind: 'claim',
    owner: 'spine/tenants.ts · spine/scheduler.ts',
  },
  {
    id: 'spine-maintenance-runbooks',
    claim: 'Every spine tenant has TenantRunbook + SignalMonitor; retirementCheck; live freshRerun',
    kinds: ['boundary', 'journey'],
    gateClass: 'human-only',
    gateRef: 'none',
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
    freshRerunKind: 'claim',
    owner: 'lib/harness/maintenance.ts · docs/harness/tenants/',
    childIds: ['docs-integrity', 'install-verify-journey'],
  },
  {
    id: 'spine-tenant-heal',
    claim: 'Sandboxed maintenance loop heals: break → signal → intervene → proof green',
    kinds: ['journey'],
    gateClass: 'human-only',
    gateRef: 'none',
    evidence: [
      'lib/harness/heal-fixture.ts',
      'scripts/tenant-heal-fixture.ts',
      'tests/fixtures/tenant-heal/',
      'tests/journey/tenant-heal.test.ts',
      'bun run test:tenant-heal',
      'docs/harness/spine-tenants.md',
    ],
    freshRerun: 'bun run test:tenant-heal',
    freshRerunKind: 'claim',
    owner: 'lib/harness/heal-fixture.ts · tests/journey/tenant-heal.test.ts',
  },
  {
    id: 'harness-coverage-ratchet',
    claim: 'lib/harness line/func coverage stays at or above coverage-baseline.json floors',
    kinds: ['boundary', 'journey'],
    gateClass: 'continuous',
    gateRef: 'ci:harness',
    evidence: [
      'lib/harness/coverage-ratchet.ts',
      'lib/harness/coverage-baseline.json',
      'bun run test:harness-coverage',
      'docs/harness/code-quality.md',
    ],
    freshRerun: 'bun run test:harness-coverage',
    freshRerunKind: 'claim',
    owner: 'lib/harness/coverage-ratchet.ts · coverage-baseline.json',
  },
  {
    id: 'harness-orphan-modules',
    claim: 'Every lib/harness/*.ts module has at least one importer outside itself',
    kinds: ['boundary'],
    gateClass: 'continuous',
    gateRef: 'ci:harness',
    evidence: [
      'scripts/check-harness-orphans.ts',
      'bun run check:harness-orphans',
      'docs/harness/tenants/orphan-modules.md',
    ],
    freshRerun: 'bun run check:harness-orphans',
    freshRerunKind: 'claim',
    owner: 'scripts/check-harness-orphans.ts',
  },
  {
    id: 'harness-complexity-floor',
    claim: 'No lib/harness function exceeds complexity-baseline.json maxComplexity',
    kinds: ['boundary'],
    gateClass: 'continuous',
    gateRef: 'ci:harness',
    evidence: [
      'lib/harness/complexity.ts',
      'lib/harness/complexity-baseline.json',
      'scripts/complexity-check.ts',
      'bun run check:harness-complexity',
      'docs/harness/tenants/complexity-floor.md',
    ],
    freshRerun: 'bun run check:harness-complexity',
    freshRerunKind: 'claim',
    owner: 'lib/harness/complexity.ts · complexity-baseline.json',
  },
  {
    id: 'code-quality-tenants',
    claim:
      'Code-quality tenants (types · coverage · orphans · complexity) have runbooks and live freshRerun',
    kinds: ['boundary', 'journey'],
    gateClass: 'continuous',
    gateRef: 'ci:harness',
    evidence: [
      'lib/harness/code-quality.ts',
      'docs/harness/code-quality.md',
      'bun run test:code-quality',
    ],
    freshRerun: 'bun run test:code-quality',
    freshRerunKind: 'claim',
    owner: 'lib/harness/code-quality.ts',
    childIds: [
      'lib-docs-typecheck',
      'harness-coverage-ratchet',
      'harness-orphan-modules',
      'harness-complexity-floor',
    ],
  },
  {
    id: 'ci-deploy-runbooks',
    claim: 'CI/deploy jobs have runbooks; discover-ci coverage is fail-closed',
    kinds: ['boundary'],
    gateClass: 'continuous',
    gateRef: 'ci:harness',
    evidence: [
      'lib/harness/ci-deploy.ts',
      'lib/harness/discover-ci.ts',
      'docs/harness/ci-deploy.md',
      'bun run test:ci-deploy',
    ],
    freshRerun: 'bun run test:ci-deploy',
    freshRerunKind: 'claim',
    owner: 'lib/harness/ci-deploy.ts · discover-ci.ts',
    childIds: [
      'ci-core-envelope',
      'typescript-ci-gate',
      'deploy-production-preflight',
      'deploy-staging-script',
      'bun-migrate-status',
    ],
  },
  // Catalog-owned CI/deploy children (ci-core-envelope … bun-migrate-status):
  // ProofPath.freshRerun is `bun run docs:ci-deploy` (catalog presence).
  // Behavior / intervention lives on CiRunbook; fail-closed coverage is ci-deploy-runbooks.
  {
    id: 'ci-core-envelope',
    claim: 'CI envelope bun run ci:core is cataloged (install verify · hygiene · ci:harness)',
    kinds: ['boundary'],
    gateClass: 'continuous',
    gateRef: 'ci:core',
    evidence: [
      'bun run docs:ci-deploy',
      'scripts/ci-core.ts',
      '.github/workflows/harness-gates.yml',
      'bun run ci:core',
      'docs/harness/tenants/ci-core.md',
    ],
    freshRerun: 'bun run docs:ci-deploy',
    freshRerunKind: 'catalog',
    owner: 'scripts/ci-core.ts · .github/workflows/harness-gates.yml',
  },
  {
    id: 'typescript-ci-gate',
    claim: 'typescript-checks ownership of type-check:ci / type-check:full is cataloged',
    kinds: ['boundary'],
    gateClass: 'workflow',
    gateRef: 'typescript-checks.yml',
    evidence: [
      'bun run docs:ci-deploy',
      '.github/workflows/typescript-checks.yml',
      'bun run type-check:ci',
      'docs/harness/tenants/typescript-ci.md',
    ],
    freshRerun: 'bun run docs:ci-deploy',
    freshRerunKind: 'catalog',
    owner: '.github/workflows/typescript-checks.yml',
  },
  {
    id: 'deploy-production-preflight',
    claim: 'Production deploy path bun run deploy:production is cataloged (Bun.secrets + R2)',
    kinds: ['boundary'],
    gateClass: 'human-only',
    gateRef: 'none',
    evidence: [
      'bun run docs:ci-deploy',
      'scripts/deployment/deploy-production.ts',
      'bun run deploy:production',
      'docs/harness/tenants/deploy-production.md',
    ],
    freshRerun: 'bun run docs:ci-deploy',
    freshRerunKind: 'catalog',
    owner: 'scripts/deployment/deploy-production.ts',
  },
  {
    id: 'deploy-staging-script',
    claim: 'Staging deploy path bun run deploy:staging is cataloged',
    kinds: ['boundary'],
    gateClass: 'human-only',
    gateRef: 'none',
    evidence: [
      'bun run docs:ci-deploy',
      'scripts/shell/deploy-staging.sh',
      'bun run deploy:staging',
      'docs/harness/tenants/deploy-staging.md',
    ],
    freshRerun: 'bun run docs:ci-deploy',
    freshRerunKind: 'catalog',
    owner: 'scripts/shell/deploy-staging.sh',
  },
  {
    id: 'bun-migrate-status',
    claim: 'Bun migration inventory path bun run migrate:status is cataloged',
    kinds: ['boundary'],
    gateClass: 'human-only',
    gateRef: 'none',
    evidence: [
      'bun run docs:ci-deploy',
      'scripts/bun-migrate.ts',
      'bun run migrate:status',
      'docs/harness/tenants/bun-migrate.md',
    ],
    freshRerun: 'bun run docs:ci-deploy',
    freshRerunKind: 'catalog',
    owner: 'scripts/bun-migrate.ts',
  },
  {
    id: 'factory-registry-cli-v1',
    claim:
      'R2-backed artifact registry client and CLI for publishing, installing, listing, searching packages with README auto-detection (mirroring bun publish)',
    kinds: ['unit', 'boundary'],
    gateClass: 'human-only',
    gateRef: 'none',
    evidence: [
      'bun test tests/registry.test.ts tests/cli.test.ts',
      'tests/registry.test.ts',
      'tests/cli.test.ts',
      'lib/factory/artifact.ts',
      'lib/factory/registry.ts',
      'lib/factory/cli.ts',
    ],
    freshRerun: 'bun test tests/registry.test.ts tests/cli.test.ts',
    freshRerunKind: 'claim',
    owner: 'lib/factory/',
  },
] as const;

/**
 * Claim ids that prove Bun-native utils / hashing / Bun.inspect family.
 * Discover: `bun run harness:status` (always emits this cluster via inspect + table).
 */
export const BUN_NATIVE_UTILS_PROOF_IDS = [
  'console-depth-boundaries',
  'security-hash-boundaries',
  'deep-equals-boundaries',
  'peek-settle-boundaries',
  'bun-time-boundaries',
] as const;

export type BunNativeUtilsProofId = (typeof BUN_NATIVE_UTILS_PROOF_IDS)[number];

/** Compact Bun.inspect form for a catalog row (`Bun.inspect.custom`). */
export class ProofPathView {
  constructor(readonly path: ProofPath) {}

  [inspectCustom](): string {
    const k = this.path.kinds.join('+');
    return `${this.path.id} [${this.path.gateClass}/${this.path.gateRef}] (${k}) — ${this.path.claim}`;
  }
}

export function asProofPathView(path: ProofPath): ProofPathView {
  return new ProofPathView(path);
}

/** Flat rows for `Bun.inspect.table` / `logTable`. */
export function proofPathTableRow(path: ProofPath): {
  id: string; // brand-ok — opaque entity primary key for table rows
  gateClass: ProofGateClass;
  gateRef: string;
  kinds: string;
  freshRerunKind: FreshRerunKind;
  owner: string;
  claim: string;
  freshRerun: string;
} {
  return {
    id: path.id,
    gateClass: path.gateClass,
    gateRef: path.gateRef,
    kinds: path.kinds.join('+'),
    freshRerunKind: path.freshRerunKind,
    owner: path.owner,
    claim: path.claim,
    freshRerun: path.freshRerun,
  };
}

export function bunNativeUtilsProofPaths(): ProofPath[] {
  const want = new Set<string>(BUN_NATIVE_UTILS_PROOF_IDS);
  return CRITICAL_PROOF_PATHS.filter(p => want.has(p.id));
}

export function proofPathById(id: string): ProofPath | undefined {
  // brand-ok — opaque catalog key
  return CRITICAL_PROOF_PATHS.find(p => p.id === id);
}

/** Failures for owner / parent childIds shape (empty = ok). */
export function assertProofOwnersAndChildren(): string[] {
  const missing: string[] = [];
  const ids = new Set(CRITICAL_PROOF_PATHS.map(p => p.id));
  for (const p of CRITICAL_PROOF_PATHS) {
    if (!p.owner.trim()) missing.push(`${p.id}: owner empty`);
    if (p.childIds) {
      if (p.childIds.length === 0) missing.push(`${p.id}: childIds empty array`);
      const seen = new Set<string>();
      for (const c of p.childIds) {
        if (!ids.has(c)) missing.push(`${p.id}: childIds unknown ${c}`);
        if (seen.has(c)) missing.push(`${p.id}: childIds duplicate ${c}`);
        seen.add(c);
      }
    }
  }
  const parents = CRITICAL_PROOF_PATHS.filter(p => p.childIds);
  if (parents.length !== 3) {
    missing.push(`expected 3 parent claims with childIds, got ${parents.length}`);
  }
  return missing;
}
