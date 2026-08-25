// @see https://bun.com/docs/pm/filter#package-name-filter-pattern — --filter
// @see https://bun.com/docs/runtime/file-io — Bun.file (consumers)
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Tool ↔ design-doc REF:ID flag SSOT for registered docs.
 *
 * Each list MUST match the Flags table leaves in the paired markdown path.
 * `docs:refid:check` with `requireToolCoverage` fails (warn/error) when a
 * tool REF:ID is missing from the table.
 *
 * Bun runtime-only flags (filter fan-out · complexity floor) are still listed
 * so the doc table stays the operator contract; source labels use `bun` /
 * runtime docs, not a monorepo script.
 *
 * Unknown long-option guards: allowlists live in this file (`ALLOWED_LONG_REGISTRY`);
 * env toggles use the `BUN_` prefix because we read them via `Bun.env` — they are
 * **FactoryWager harness policy**, not Bun runtime types (not in bun-types).
 * `BUN_STRIP_UNKNOWN` · `BUN_LOG_UNKNOWN` — never invent these as oven-sh APIs.
 *
 * Real Bun surfaces elsewhere (e.g. `--console-depth`, `Bun.inspect`) are grounded
 * via catalog `bun tools/bun-doc-refs.ts suggest` + bun-types where typed.
 */
import { hrefFromRefId, type ToolFlagRef } from './ref-id.ts';

type EnvMap = { [key: string]: string | undefined };

/**
 * Harness env key names for unknown long-option guard policy (not allowlists,
 * not bun-types). Allowlists stay in code — see `ALLOWED_LONG_REGISTRY`.
 * Read with `Bun.env[key]` only.
 */
export const BUN_UNKNOWN_FLAG_ENV = {
  /** `true` → strip unknown `--flags` and continue; else hard-fail (exit 2 / throw) */
  STRIP_UNKNOWN: 'BUN_STRIP_UNKNOWN',
  /** default on; when stripping, log a warning for each unknown set */
  LOG_UNKNOWN: 'BUN_LOG_UNKNOWN',
} as const;

/** Build REF:ID + href for a leaf under a section (tool-side `flagDocRef` pattern). */
export function flagDocRefAt(
  section: string,
  leaf: string
): {
  refId: string; // brand-ok — design-doc fragment key (REF:ID v2), not domain brand
  href: string;
} {
  const refId = `${section}.${leaf}`; // brand-ok — REF:ID fragment
  return { refId, href: hrefFromRefId(refId) };
}

/** Build tool flag rows for a fixed section + keyword leaves. */
export function toolFlagsAt(
  section: string,
  leaves: readonly string[],
  source: string
): ToolFlagRef[] {
  return leaves.map(leaf => {
    const { refId, href } = flagDocRefAt(section, leaf);
    return { refId, href, source };
  });
}

/** Human one-liner for CLI --help: `leaf → section.leaf`. */
export function formatFlagDocRefLine(section: string, leaves: readonly string[]): string {
  return leaves.map(leaf => `${leaf} → ${section}.${leaf}`).join(' · ');
}

/**
 * Return long-option names from argv that are not in the allowed leaf set.
 * Accepts leaves as `deal` matching `--deal`; ignores short `-x` and positionals.
 * Use for optional soft/hard unknown-flag guards in CLIs with REF:ID tables.
 */
export function unknownLongOptionLeaves(
  argv: readonly string[],
  allowedLeaves: readonly string[]
): string[] {
  const allowed = new Set(allowedLeaves.map(l => l.toLowerCase()));
  const unknown: string[] = [];
  for (const a of argv) {
    if (!a.startsWith('--') || a === '--') continue;
    const raw = a.slice(2).split('=')[0] ?? '';
    if (!raw) continue;
    if (raw === 'help' || raw === 'hlp') continue; // common help aliases
    if (!allowed.has(raw.toLowerCase())) unknown.push(raw);
  }
  return unknown;
}

export type UnknownFlagPolicy = {
  /** When true, drop unknown long options and continue. */
  stripUnknown: boolean;
  /** When true, warn on strip (fail path always prints an error). */
  logUnknown: boolean;
};

/** Read Bun.env toggles — allowlists never come from the environment. */
export function unknownFlagPolicy(env: EnvMap = Bun.env): UnknownFlagPolicy {
  return {
    stripUnknown: env[BUN_UNKNOWN_FLAG_ENV.STRIP_UNKNOWN] === 'true',
    logUnknown: env[BUN_UNKNOWN_FLAG_ENV.LOG_UNKNOWN] !== 'false',
  };
}

function stripUnknownLongOptions(
  argv: readonly string[],
  unknownLeaves: readonly string[]
): string[] {
  const drop = new Set(unknownLeaves.map(l => l.toLowerCase()));
  return argv.filter(a => {
    if (!a.startsWith('--') || a === '--') return true;
    const raw = (a.slice(2).split('=')[0] ?? '').toLowerCase();
    if (!raw || raw === 'help' || raw === 'hlp') return true;
    return !drop.has(raw);
  });
}

export type UnknownLongOptionCheck = {
  unknown: string[];
  /** Argv after optional strip. */
  argv: string[];
  stripUnknown: boolean;
  logUnknown: boolean;
  /** True when unknown present and not stripping — caller must exit/throw. */
  shouldFail: boolean;
};

/**
 * Pure check + optional strip (no exit). Prefer `applyUnknownLongOptionGuard` in CLIs.
 */
export function checkUnknownLongOptions(
  argv: readonly string[],
  allowedLeaves: readonly string[],
  opts?: { env?: EnvMap }
): UnknownLongOptionCheck {
  const policy = unknownFlagPolicy(opts?.env);
  const unknown = unknownLongOptionLeaves(argv, allowedLeaves);
  if (unknown.length === 0) {
    return {
      unknown: [],
      argv: [...argv],
      stripUnknown: policy.stripUnknown,
      logUnknown: policy.logUnknown,
      shouldFail: false,
    };
  }
  const next = policy.stripUnknown ? stripUnknownLongOptions(argv, unknown) : [...argv];
  return {
    unknown,
    argv: next,
    stripUnknown: policy.stripUnknown,
    logUnknown: policy.logUnknown,
    shouldFail: !policy.stripUnknown,
  };
}

/**
 * Enforce allowlist for a CLI. Returns (possibly stripped) argv.
 * - Default: unknown → stderr + `process.exit(2)`
 * - `onFail: 'throw'` for CLIs that catch Error in parse/main
 * - `BUN_STRIP_UNKNOWN=true` → strip + optional warn, never fail
 */
export function applyUnknownLongOptionGuard(
  argv: readonly string[],
  allowedLeaves: readonly string[],
  opts: {
    cliName: string;
    env?: EnvMap;
    onFail?: 'exit' | 'throw';
  }
): string[] {
  const result = checkUnknownLongOptions(argv, allowedLeaves, { env: opts.env });
  if (result.unknown.length === 0) return result.argv;

  const pretty = result.unknown.map(u => `--${u}`).join(', ');
  if (result.stripUnknown) {
    if (result.logUnknown) {
      console.warn(
        `⚠️  Unknown long option(s) in ${opts.cliName}: ${pretty} (${BUN_UNKNOWN_FLAG_ENV.STRIP_UNKNOWN}=true — stripping)`
      );
    }
    return result.argv;
  }

  console.error(`❌ Unknown long option(s) in ${opts.cliName}: ${pretty}`);
  console.error(`Allowed: ${allowedLeaves.map(l => `--${l}`).join(', ')}`);
  if (opts.onFail === 'throw') {
    throw new Error(`unknown flag(s): ${pretty}`);
  }
  process.exit(2);
  return result.argv;
}

/** §4.1 — lint-wires (`scripts/validate-wire-traps.ts`) */
export const LINT_WIRES_DOC = 'docs/design/partner-surface-inventory.md' as const;
export const LINT_WIRES_SECTION = '4.1' as const;
export const LINT_WIRES_LEAVES = [
  'help',
  'scan',
  'staged',
  'why',
  'document',
  'strict-globs',
] as const;
/** Full long-option allowlist (REF:ID leaves + teaching/meta flags not in Flags table). */
export const LINT_WIRES_ALLOWED_LONG = [...LINT_WIRES_LEAVES, 'rules', 'fix'] as const;
export function lintWiresFlagDocRef(leaf: (typeof LINT_WIRES_LEAVES)[number] | string) {
  return flagDocRefAt(LINT_WIRES_SECTION, leaf);
}
export function lintWiresToolFlags(): ToolFlagRef[] {
  return toolFlagsAt(LINT_WIRES_SECTION, LINT_WIRES_LEAVES, 'scripts/validate-wire-traps.ts');
}

/** §1.1 — partner:onboard (`tools/partner-onboard.ts`) */
export const PARTNER_ONBOARD_DOC = 'docs/design/unified-partner-profile.md' as const;
export const PARTNER_ONBOARD_SECTION = '1.1' as const;
export const PARTNER_ONBOARD_LEAVES = [
  'deal',
  'currency',
  'hold-target',
  'initial-balance',
  'funding-method',
] as const;
/**
 * Full long-option allowlist for partner:onboard (identity + book + accounting + control).
 * Identity/book flags sit outside `PARTNER_ONBOARD_LEAVES` (REF:ID §1.1 covers accounting only).
 */
export const PARTNER_ONBOARD_ALLOWED_LONG = [
  'code',
  'url',
  'username',
  'password',
  'telegram-user-id',
  'chat',
  'book-key',
  'type',
  'maxBet',
  'name',
  'dry-run',
  'skip-forum',
  'no-bake',
  ...PARTNER_ONBOARD_LEAVES,
] as const;
export function partnerOnboardFlagDocRef(leaf: (typeof PARTNER_ONBOARD_LEAVES)[number] | string) {
  return flagDocRefAt(PARTNER_ONBOARD_SECTION, leaf);
}
export function partnerOnboardToolFlags(): ToolFlagRef[] {
  return toolFlagsAt(PARTNER_ONBOARD_SECTION, PARTNER_ONBOARD_LEAVES, 'tools/partner-onboard.ts');
}

/** §1.1 — images:generate (`scripts/images-generate.ts`) */
export const IMAGES_GENERATE_DOC = 'docs/IMAGES.md' as const;
export const IMAGES_GENERATE_SECTION = '1.1' as const;
export const IMAGES_GENERATE_LEAVES = [
  'source',
  'out',
  'size',
  'format',
  'quality',
  'fit',
  'max-pixels',
  'progressive',
  'palette',
  'dither',
  'without-enlargement',
  'backend',
  'json',
  'dry-run',
] as const;
/** Full long-option allowlist (`--template` is template picker, not a Flags-table leaf). */
export const IMAGES_GENERATE_ALLOWED_LONG = [...IMAGES_GENERATE_LEAVES, 'template'] as const;
export function imagesGenerateFlagDocRef(leaf: (typeof IMAGES_GENERATE_LEAVES)[number] | string) {
  return flagDocRefAt(IMAGES_GENERATE_SECTION, leaf);
}
export function imagesGenerateToolFlags(): ToolFlagRef[] {
  return toolFlagsAt(IMAGES_GENERATE_SECTION, IMAGES_GENERATE_LEAVES, 'scripts/images-generate.ts');
}

/** §1.1 — ops:snapshot seed block (`tools/ops-snapshot.ts`) */
export const OPS_SNAPSHOT_DOC = 'docs/harness/tenants/ops-snapshot.md' as const;
export const OPS_SNAPSHOT_SECTION = '1.1' as const;
export const OPS_SNAPSHOT_LEAVES = [
  'default',
  'seed',
  'seed-force',
  'seed-tenants',
  'no-seed',
] as const;
/**
 * Full long-option allowlist for ops:snapshot (seed REF:ID leaves + bake toggles).
 * `default` is conceptual (no `--default` flag).
 */
export const OPS_SNAPSHOT_ALLOWED_LONG = [
  'seed',
  'seed-force',
  'seed-tenants',
  'no-seed',
  'out',
  'no-report',
  'no-routing',
  'no-static',
  'force-routing',
  'publish',
  'no-channel-meta',
  'no-compliance',
  'no-monorepo-health',
  'webview',
  'no-toc-limits',
  'seed-toc-limits-force',
] as const;
export function opsSnapshotFlagDocRef(leaf: (typeof OPS_SNAPSHOT_LEAVES)[number] | string) {
  return flagDocRefAt(OPS_SNAPSHOT_SECTION, leaf);
}
export function opsSnapshotToolFlags(): ToolFlagRef[] {
  return toolFlagsAt(OPS_SNAPSHOT_SECTION, OPS_SNAPSHOT_LEAVES, 'tools/ops-snapshot.ts');
}

/** §1.1 — telegram:ops link-package-group (`tools/telegram-ops.ts`) */
export const TELEGRAM_OPS_DOC = 'docs/harness/tenants/partner-package-group-handshake.md' as const;
export const TELEGRAM_OPS_SECTION = '1.1' as const;
export const TELEGRAM_OPS_LEAVES = ['invite', 'no-dm', 'no-ack', 'requested-by'] as const;
/**
 * Full long-option allowlist for `telegram:ops` (all subcommands).
 * REF:ID §1.1 leaves cover link-package-group only; the rest are send/directory/etc.
 */
export const TELEGRAM_OPS_ALLOWED_LONG = [
  ...TELEGRAM_OPS_LEAVES,
  'db',
  'chat',
  'all',
  'kind',
  'surface',
  'preview',
  'queue',
  'direct',
  'html',
  'json',
  'refresh',
  'rich',
  'mermaid',
  'env',
  'sync-env',
  'force',
  'dry-run',
  'live',
  'detail',
  'deep',
] as const;
export function telegramOpsFlagDocRef(leaf: (typeof TELEGRAM_OPS_LEAVES)[number] | string) {
  return flagDocRefAt(TELEGRAM_OPS_SECTION, leaf);
}
export function telegramOpsToolFlags(): ToolFlagRef[] {
  return toolFlagsAt(TELEGRAM_OPS_SECTION, TELEGRAM_OPS_LEAVES, 'tools/telegram-ops.ts');
}

/** §1.1 — bun --filter fan-out (runtime; no monorepo tool owner) */
export const MONOREPO_FILTER_DOC = 'docs/harness/tenants/monorepo-workspaces.md' as const;
export const MONOREPO_FILTER_SECTION = '1.1' as const;
export function monorepoFilterToolFlags(): ToolFlagRef[] {
  return toolFlagsAt(
    MONOREPO_FILTER_SECTION,
    ['parallel', 'sequential', 'workspaces', 'if-present', 'no-exit-on-error'],
    'bun --filter (runtime)'
  );
}

/** §1.1 — bun runtime tunings for complexity floor proof */
export const COMPLEXITY_FLOOR_DOC = 'docs/harness/tenants/complexity-floor.md' as const;
export const COMPLEXITY_FLOOR_SECTION = '1.1' as const;
export function complexityFloorToolFlags(): ToolFlagRef[] {
  return toolFlagsAt(
    COMPLEXITY_FLOOR_SECTION,
    ['smol', 'console-depth', 'cwd'],
    'bun runtime (complexity-floor)'
  );
}

/** § — bun:pr:verify (`tools/bun-pr-verify.ts`) — no design Flags table; tool allowlist only */
export const BUN_PR_VERIFY_ALLOWED_LONG = ['proof', 'json', 'diff'] as const;

/** § — bun:release-contracts (`tools/bun-release-contracts.ts`) — no design Flags table; tool allowlist only */
export const BUN_RELEASE_CONTRACTS_ALLOWED_LONG = [
  'all',
  'since',
  'limit',
  'concurrency',
  'check',
  'output-dir',
  'force',
  'json',
  'help',
] as const;

/** § — bun:release-knowledge (`tools/bun-release-knowledge.ts`) — no design Flags table; tool allowlist only */
export const BUN_RELEASE_KNOWLEDGE_ALLOWED_LONG = [
  'version',
  'output',
  'catalog',
  'feeds',
  'limit',
  'check',
  'json',
  'source',
  'report',
  'strict',
  'max-warnings',
  'help',
] as const;

/** § — screenshot (`tools/screenshot-cli.ts`) — no design Flags table; tool allowlist only */
export const SCREENSHOT_ALLOWED_LONG = [
  'subject',
  'out-dir',
  'timeout-ms',
  'allow-placeholder',
  'force',
  'json',
  'help',
] as const;

/** § — bun:runtime-pin (`tools/bun-runtime-pin.ts`) */
export const BUN_RUNTIME_PIN_ALLOWED_LONG = ['json'] as const;

/** § — glossary:health (`tools/glossary-health.ts`) */
export const GLOSSARY_HEALTH_ALLOWED_LONG = ['json', 'local'] as const;

/** § — cloudflare:env:validate (`tools/cloudflare-env-validate.ts`) */
export const CLOUDFLARE_ENV_VALIDATE_ALLOWED_LONG = ['json', 'strict'] as const;

/** § — routing:registry-proof (`tools/routing-registry-proof.ts`) */
export const ROUTING_REGISTRY_PROOF_ALLOWED_LONG = [
  'write',
  'publish',
  'json',
  'no-fail',
  'no-previous',
  'base',
  'concurrency',
] as const;

/** § — ops:seed:toc (`tools/ops-seed-toc.ts`) */
export const OPS_SEED_TOC_ALLOWED_LONG = ['force'] as const;

/** § — discovery:compose (`tools/discovery-compose.ts`) */
export const DISCOVERY_COMPOSE_ALLOWED_LONG = [
  'json',
  'check',
  'skip-unused',
  'min-severity',
] as const;

/** § — public:discovery (`tools/public-discovery.ts`) */
export const PUBLIC_DISCOVERY_ALLOWED_LONG = ['json', 'check', 'min-severity'] as const;

/** § — schema:audit (`tools/schema-audit.ts`) */
export const SCHEMA_AUDIT_ALLOWED_LONG = ['json', 'json-only', 'write'] as const;

/** § — telegram:handshake:catalog (`tools/telegram-handshake-catalog.ts`) */
export const TELEGRAM_HANDSHAKE_CATALOG_ALLOWED_LONG = ['json'] as const;

/** § — concept:health (`scripts/concept-health.ts`) */
export const CONCEPT_HEALTH_ALLOWED_LONG = ['period', 'output'] as const;

/** § — ops:loop:gate-backfill (`tools/ops-loop-gate-backfill.ts`) */
export const OPS_LOOP_GATE_BACKFILL_ALLOWED_LONG = ['dry-run', 'no-outbox', 'r2'] as const;

/** § — ops:limits:check (`tools/ops-check-limits.ts`) */
export const OPS_LIMITS_CHECK_ALLOWED_LONG = [
  'partner',
  'all',
  'hours',
  'clv',
  'multi',
  'capture',
  'alerts',
  'seed',
  'force-seed',
  'json',
  'inspect',
] as const;

/** § — identity:admin (`tools/identity-admin.ts`) */
export const IDENTITY_ADMIN_ALLOWED_LONG = ['as', 'db', 'json', 'limit', 'password'] as const;

/** § — provision:queue (`tools/provision-queue.ts`) */
export const PROVISION_QUEUE_ALLOWED_LONG = [
  'dry-run',
  'id',
  'max-retries',
  'mode',
  'partner',
  'platform',
  'step',
  'to',
] as const;

/** § — monorepo:health (`tools/monorepo-health.ts`) */
export const MONOREPO_HEALTH_ALLOWED_LONG = [
  'archive',
  'inspect',
  'interactive',
  'interval',
  'json',
  'no-build',
  'no-history',
  'validate',
  'watch',
  'with-coverage',
  'with-tests',
] as const;

/** § — brand:status (`tools/brand-status.ts`) */
export const BRAND_STATUS_ALLOWED_LONG = [
  'once',
  'repl',
  'docs',
  'watch',
  'every',
  'json',
  'verbose',
  'compact',
  'lifecycle',
  'flags',
  'plane',
  'lineage',
  'zone',
] as const;

/** § — docs:refid (`tools/docs-refid.ts`) — all subcommands share one long-option set */
export const DOCS_REFID_ALLOWED_LONG = [
  'strict-format',
  'refid-strict',
  'dry-run',
  'registry-only',
  'skip-refid-check',
  'write-hrefs',
  'json',
  'section',
  'keyword',
  'flag',
  'leaf',
  'doc',
  'section-ref',
  'section-heading',
  'script',
  'shortcode',
  'default',
  'all',
  'roots',
] as const;

/** § — concept:audit (`scripts/concept-audit.ts`) */
export const CONCEPT_AUDIT_ALLOWED_LONG = [
  'watch',
  'watch-poll',
  'watch-paths',
  'watch-delay-ms',
  'strict',
  'strict-unused',
  'output',
  'quiet',
  'verbose',
  'unused',
  'show-unused',
  'show-used',
  'show-deprecated',
  'show-orphans',
  'domain-summary',
  'status',
  'board',
  'group',
  'domain',
  'namespace',
  'category',
  'sort',
  'desc',
  'min-usage',
  'max-usage',
  'provenance',
  'output-headers',
  'correlation-id',
] as const;

/** § — concept:registry:graph (`scripts/concept-registry-graph.ts`) */
export const CONCEPT_REGISTRY_GRAPH_ALLOWED_LONG = ['output', 'orphans', 'centrality'] as const;

/** § — concept:discover (`scripts/concept-discover.ts`) */
export const CONCEPT_DISCOVER_ALLOWED_LONG = ['scan', 'auto-propose', 'output'] as const;

/** § — seat:desk (`tools/seat-desk-cli.ts`) */
export const SEAT_DESK_ALLOWED_LONG = [
  'field',
  'force-new',
  'no-pin',
  'no-publish',
  'post',
  'json',
  'template',
  'intake-only',
  'rails-only',
  'thread-id',
] as const;

/** § — packages:metafile-audit (`tools/packages-metafile-audit.ts`) */
export const PACKAGES_METAFILE_AUDIT_ALLOWED_LONG = [
  'json',
  'md',
  'diff',
  'out',
  'glob',
  'full-metafile',
  'include-tests',
  'cross-check',
  'map',
  'bake',
  'shallow',
  'apply-actions',
  'dry-run',
  'vault',
  'vault-gap',
  'env',
  'no-pkg-json',
  'strict',
  'strict-actions',
] as const;

/** § — harness:violations (`tools/harness-violations.ts`) */
export const HARNESS_VIOLATIONS_ALLOWED_LONG = [
  'json',
  'open',
  'path',
  'rule',
  'legacy-brands',
  'limit',
] as const;

/** § — bun:brand-map (`tools/bun-brand-map.ts`) */
export const BUN_BRAND_MAP_ALLOWED_LONG = ['check', 'write-baseline', 'json'] as const;

/** § — env:inventory (`scripts/env-inventory.ts`) */
export const ENV_INVENTORY_ALLOWED_LONG = [
  'json',
  'vault-only',
  'ratchet',
  'write-baseline',
  'bake',
] as const;

/** § — check:import-graph (`scripts/check-import-graph.ts`) */
export const CHECK_IMPORT_GRAPH_ALLOWED_LONG = ['json', 'write-baseline'] as const;

/** § — check:console-format (`scripts/lint-console-format.ts`) */
export const CHECK_CONSOLE_FORMAT_ALLOWED_LONG = ['staged', 'write-baseline'] as const;

/** § — concept:review (`scripts/concept-review.ts`) */
export const CONCEPT_REVIEW_ALLOWED_LONG = [
  'list',
  'output',
  'id',
  'approve',
  'reject',
  'reason',
  'correlation-id',
] as const;

/** § — concept:deprecate (`scripts/concept-deprecate.ts`) */
export const CONCEPT_DEPRECATE_ALLOWED_LONG = ['replace-by', 'reason'] as const;

/**
 * § — portal:cli (`tools/portal-cli.ts` + doctor/scanner/secret/snapshot/graph).
 * Leading Bun runtime flags (`--smol`, `--console-depth`, …) are peeled by
 * `parseBunExecutionFlags` before this allowlist runs. Passthrough commands
 * `pm` / `secret` / `probe` skip the guard (child owns flags).
 */
export const PORTAL_CLI_ALLOWED_LONG = [
  // doctor
  'check',
  'env',
  'failed-only',
  'format',
  'full',
  'group',
  'json',
  'layout',
  'live-access',
  'no-write',
  'offline',
  'verbose',
  // scanner
  'bunfig',
  'depth',
  'dry-run',
  'force',
  'oneshot',
  'password',
  'strict',
  'title',
  'url',
  'vault-name',
  'write',
  // snapshot / packages graph
  'base',
  'debug',
  'scope',
  'bake',
  'color',
  'export',
  'no-color',
  'package',
  'pkg',
  'update',
  'view',
  // flags catalog
  'all',
  // vault / capabilities / badge
  'update',
  'update-snapshots',
  // secret (pass-cli wrapper surface)
  'env-file',
  'field',
  'file-mode',
  'from-vault-name',
  'item-id',
  'item-title',
  'member-share-id',
  'no-masking',
  'out-file',
  'output',
  'parallel',
  'role',
  'share-id',
  'to',
  'to-vault-name',
  'vault',
  // dashboard / misc
  'open',
  'list',
  'keep',
  'grep',
  'id',
  'quiet',
  'destination',
  'bun-only',
  'trusted',
  'no-git-tag-version',
] as const;

/** § — partner-surface-inventory:docs (`scripts/bake-partner-surface-docs.ts`) — auto team plan */
export const PARTNER_SURFACE_INVENTORY_DOCS_ALLOWED_LONG = ['check'] as const;

/** § — lint (`scripts/lint-harness.ts`) — auto team plan */
export const LINT_ALLOWED_LONG = [
  'cache-location',
  'changed',
  'fix',
  'full',
  'max-warnings',
  'quiet',
  'scope',
] as const;

/** § — bookmakers:migrate (`scripts/migrate-bookmakers-v0.3-to-v0.4.ts`) — auto team plan */
export const BOOKMAKERS_MIGRATE_ALLOWED_LONG = ['dry-run', 'force', 'in', 'json'] as const;

/** § — validate:workspaces (`scripts/validate-workspaces.ts`) — auto team plan */
export const VALIDATE_WORKSPACES_ALLOWED_LONG = ['verbose'] as const;

/** § — affected:list (`scripts/affected-workspaces.ts`) — auto team plan */
export const AFFECTED_LIST_ALLOWED_LONG = ['filter', 'list'] as const;

/** § — rules (`scripts/bun-rules.ts`) — auto team plan */
export const RULES_ALLOWED_LONG = ['auto', 'dry-run'] as const;

/** § — cli:flags:check (`scripts/check-cli-flag-allowlists.ts`) — auto team plan */
export const CLI_FLAGS_CHECK_ALLOWED_LONG = [
  'bad',
  'chat',
  'json',
  'list',
  'once',
  'preview',
  'typo',
] as const;

/** § — partner-surface-inventory:lint-domains (`scripts/validate-partner-domain-isolation.ts`) — auto team plan */
export const PARTNER_SURFACE_INVENTORY_LINT_DOMAINS_ALLOWED_LONG = [
  'rules',
  'scan',
  'staged',
  'strict',
] as const;

/** § — search:bench:gate (`scripts/search-benchmark-pin.ts`) — auto team plan */
export const SEARCH_BENCH_GATE_ALLOWED_LONG = [
  'baseline',
  'bootstrap-missing-baseline',
  'from',
  'json',
  'no-strict',
  'out',
  'pinned-by',
  'rationale',
  'strict',
] as const;

/** § — ci:bun:check (`scripts/ci-bun-check.ts`) — auto team plan */
export const CI_BUN_CHECK_ALLOWED_LONG = ['revision'] as const;

/** § — workspace-taxonomy:bake (`scripts/bake-workspace-taxonomy.ts`) — auto team plan */
export const WORKSPACE_TAXONOMY_BAKE_ALLOWED_LONG = ['check'] as const;

/** § — check:package-scripts (`scripts/check-package-scripts.ts`) — auto team plan */
export const CHECK_PACKAGE_SCRIPTS_ALLOWED_LONG = ['against'] as const;

/** § — bookmakers:desk-coverage (`scripts/bookmakers-desk-coverage.ts`) — auto team plan */
export const BOOKMAKERS_DESK_COVERAGE_ALLOWED_LONG = [
  'apply-max',
  'json',
  'no-write',
  'strict',
] as const;

/** § — help (`scripts/help.ts`) — auto team plan */
export const HELP_ALLOWED_LONG = ['verbose'] as const;

/** § — partners:event (`scripts/partners-event.ts`) — auto team plan */
export const PARTNERS_EVENT_ALLOWED_LONG = [
  'amount',
  'call',
  'dry-run',
  'json',
  'note',
  'out',
  'partner',
  'rail',
] as const;

/** § — install:cache:lifecycle (`scripts/bun-cache-lifecycle.ts`) — auto team plan */
export const INSTALL_CACHE_LIFECYCLE_ALLOWED_LONG = ['dry-run', 'json', 'prune', 'strict'] as const;

/** § — search:policy:check (`scripts/check-search-policy-governance.ts`) — auto team plan */
export const SEARCH_POLICY_CHECK_ALLOWED_LONG = ['verify'] as const;

/** § — bunfig:bake (`scripts/bake-bunfig.ts`) — auto team plan */
export const BUNFIG_BAKE_ALLOWED_LONG = ['check', 'gate', 'strict'] as const;

/** § — concept:propose (`scripts/concept-propose.ts`) — auto team plan */
export const CONCEPT_PROPOSE_ALLOWED_LONG = [
  'body',
  'by',
  'category',
  'color',
  'correlation-id',
  'domain',
  'draft',
  'group',
  'id',
  'label',
  'output',
  'pr',
  'semantic-type',
  'summary',
  'title',
  'ui-role',
  'unit',
] as const;

/** § — ci:harness (`scripts/ci-harness.ts`) — auto team plan */
export const CI_HARNESS_ALLOWED_LONG = [
  'main-head',
  'quiet',
  'smart',
  'strict',
  'fast',
  'verbose',
  'fail-json',
  'full-lint',
] as const;

/** § — bookmakers:prepare-publish (`scripts/prepare-bookmakers-publish.ts`) — auto team plan */
export const BOOKMAKERS_PREPARE_PUBLISH_ALLOWED_LONG = ['dry-run', 'exclude'] as const;

/** § — partner-profile:coverage:bake (`scripts/bake-partner-profile-coverage.ts`) — auto team plan */
export const PARTNER_PROFILE_COVERAGE_BAKE_ALLOWED_LONG = ['check'] as const;

/** § — partner:dashboard:bake (`scripts/bake-partners-dashboard.ts`) — Lane C board cutover */
export const PARTNER_DASHBOARD_BAKE_ALLOWED_LONG = ['check', 'as-of'] as const;

/** § — partner:dashboard:refresh (`scripts/refresh-partners-dashboard.ts`) — operator input+bake loop */
export const PARTNER_DASHBOARD_REFRESH_ALLOWED_LONG = [
  'align-clocks',
  'as-of',
  'check',
  'dry-run',
  'json',
  'skip-dashboard',
  'skip-handshake',
  'skip-profiles',
] as const;

/** § — sports-terminal:health:refresh (`scripts/refresh-sports-terminal-integration-health.ts`) — Lane H */
export const SPORTS_TERMINAL_HEALTH_REFRESH_ALLOWED_LONG = [
  'check',
  'dry-run',
  'from-file',
  'json',
  'stdin',
] as const;

/** § — concept:registry:serve (`scripts/concept-registry-serve.ts`) — auto team plan */
export const CONCEPT_REGISTRY_SERVE_ALLOWED_LONG = ['no-scan'] as const;

/** § — install:verify (`scripts/verify-install-cache.ts`) — auto team plan */
export const INSTALL_VERIFY_ALLOWED_LONG = [
  'dry-run',
  'json',
  'quiet',
  'skip-cache-size',
  'strict',
] as const;

/** § — search:domain:doctor (`scripts/domain-registry-status.ts`) — auto team plan */
export const SEARCH_DOMAIN_DOCTOR_ALLOWED_LONG = [
  'doctor',
  'emit-secrets-commands',
  'env-file',
  'fix',
  'health-report',
  'json',
  'latest',
  'registry',
] as const;

/** § — install:all (`scripts/with-bun-cache-env.ts`) — auto team plan */
export const INSTALL_ALL_ALLOWED_LONG = ['verbose'] as const;

/** § — brand:bench:profile (`scripts/brand-cpu-profile.ts`) — auto team plan */
export const BRAND_BENCH_PROFILE_ALLOWED_LONG = [
  'cpu-prof',
  'cpu-prof-dir',
  'cpu-prof-interval',
  'cpu-prof-md',
  'cpu-prof-name',
  'profiles-dir',
  'run-id',
  'seed',
  'target',
] as const;

/** § — fix:empty-catches (`scripts/fix-empty-catches.ts`) — auto team plan */
export const FIX_EMPTY_CATCHES_ALLOWED_LONG = ['dry-run'] as const;

/** § — lint:money-sql:staged (`scripts/lint-money-sql.ts`) — auto team plan */
export const LINT_MONEY_SQL_STAGED_ALLOWED_LONG = ['staged'] as const;

/** § — tennis:board:bake (`scripts/bake-tennis-board.ts`) — auto team plan */
export const TENNIS_BOARD_BAKE_ALLOWED_LONG = [
  'db',
  'json',
  'match-limit',
  'no-images',
  'sample',
] as const;

/** § — check:invisible-chars (`scripts/check-invisible-chars.ts`) — auto team plan */
export const CHECK_INVISIBLE_CHARS_ALLOWED_LONG = ['verbose'] as const;

/** § — search:bench:baseline:verify (`scripts/search-benchmark-baseline-governance.ts`) — auto team plan */
export const SEARCH_BENCH_BASELINE_VERIFY_ALLOWED_LONG = ['json'] as const;

/** § — project:online:check (`scripts/project-online-readiness.ts`) — auto team plan */
export const PROJECT_ONLINE_CHECK_ALLOWED_LONG = [
  'domain',
  'json',
  'source',
  'strict-p95',
] as const;

/** § — packages:list (`scripts/packages-list.ts`) — auto team plan */
export const PACKAGES_LIST_ALLOWED_LONG = ['include-scaffolds', 'paths', 'write'] as const;

/** § — surfaces:bake (`scripts/bake-surfaces.ts`) — auto team plan */
export const SURFACES_BAKE_ALLOWED_LONG = ['check', 'probe', 'zone-check'] as const;

/** § — search:bench:dashboard (`scripts/search-benchmark-dashboard.ts`) — auto team plan */
export const SEARCH_BENCH_DASHBOARD_ALLOWED_LONG = [
  'cache-ttl-ms',
  'cookies',
  'dir',
  'domain',
  'hot-reload',
  'no-cookies',
  'no-hot-reload',
  'port',
  'r2-base',
  'r2-prefix',
] as const;

/** § — concept:registry:usage-sync (`scripts/concept-registry-sync.ts`) — auto team plan */
export const CONCEPT_REGISTRY_USAGE_SYNC_ALLOWED_LONG = [
  'fail-on-orphans',
  'min-unused-days',
  'output',
] as const;

/** § — brand:bench:evaluate (`scripts/brand-bench-evaluate.ts`) — auto team plan */
export const BRAND_BENCH_EVALUATE_ALLOWED_LONG = ['json', 'strict'] as const;

/** § — check:harness-complexity (`scripts/complexity-check.ts`) — auto team plan */
export const CHECK_HARNESS_COMPLEXITY_ALLOWED_LONG = [
  'allow-lower',
  'baseline',
  'json',
  'report',
  'stdin',
  'update-baseline',
  'yes',
] as const;

/** § — search:smart (`scripts/search-smart.ts`) — auto team plan */
export const SEARCH_SMART_ALLOWED_LONG = [
  'artifact',
  'case-sensitive',
  'explain-policy',
  'family-cap',
  'fusion-domain',
  'fusion-fail-on-critical',
  'fusion-json',
  'fusion-source',
  'fusion-strict-p95',
  'fusion-weight',
  'glob',
  'group-limit',
  'json',
  'kind',
  'limit',
  'line-number',
  'max-count',
  'no-cache',
  'of',
  'overlap',
  'path',
  'runtime',
  'scope',
  'show-mirrors',
  'stream',
  'strict',
  'task',
  'view',
] as const;

/** § — validate:concept-metadata (`scripts/validate-concept-metadata.ts`) — auto team plan */
export const VALIDATE_CONCEPT_METADATA_ALLOWED_LONG = [
  'fix',
  'force',
  'json',
  'strict',
  'write-baseline',
] as const;

/** § — decision:evidence:verify (`scripts/decision-evidence-verify.ts`) — auto team plan */
export const DECISION_EVIDENCE_VERIFY_ALLOWED_LONG = ['json'] as const;

/** § — validate:surface-coverage (`scripts/validate-surface-coverage.ts`) — auto team plan */
export const VALIDATE_SURFACE_COVERAGE_ALLOWED_LONG = [
  'include-metadata',
  'json',
  'report',
  'strict',
] as const;

/** § — bun:brand-map:baseline:ratchet (`scripts/check-bun-brand-baseline.ts`) — auto team plan */
export const BUN_BRAND_MAP_BASELINE_RATCHET_ALLOWED_LONG = ['base', 'staged'] as const;

/** § — portal:doctor:ci:report (`scripts/doctor-ci-report.ts`) — auto team plan */
export const PORTAL_DOCTOR_CI_REPORT_ALLOWED_LONG = ['no-json', 'no-summary', 'out'] as const;

/** § — concept:serve (`scripts/concept-serve.ts`) — auto team plan */
export const CONCEPT_SERVE_ALLOWED_LONG = ['port'] as const;

/** § — concept:domain:list (`scripts/concept-domain-list.ts`) — auto team plan */
export const CONCEPT_DOMAIN_LIST_ALLOWED_LONG = ['output'] as const;

/** § — gate-map:validate (`scripts/gate-map-validate.ts`) — auto team plan */
export const GATE_MAP_VALIDATE_ALLOWED_LONG = ['changed', 'json', 'project', 'zone'] as const;

/** § — search:bench:snapshot:core:wide:local (`scripts/search-benchmark-snapshot.ts`) — auto team plan */
export const SEARCH_BENCH_SNAPSHOT_CORE_WIDE_LOCAL_ALLOWED_LONG = [
  'bucket',
  'concurrency',
  'id',
  'limit',
  'no-gzip',
  'no-upload',
  'output',
  'overlap',
  'path',
  'prefix',
  'profile-cpu',
  'public-base',
  'queries',
  'query-pack',
  'query-retries',
  'query-timeout-ms',
  'upload-retries',
] as const;

/** § — inventory:wrappers (`scripts/inventory-wrappers.ts`) — auto team plan */
export const INVENTORY_WRAPPERS_ALLOWED_LONG = ['all', 'json'] as const;

/** § — gate-report:monorepo (`scripts/gate-report-monorepo.ts`) — auto team plan */
export const GATE_REPORT_MONOREPO_ALLOWED_LONG = [
  'all',
  'changed',
  'fail-fast',
  'json',
  'open',
  'output',
  'project',
  'zone',
] as const;

/** § — promote (`scripts/promote.ts`) — auto team plan */
export const PROMOTE_ALLOWED_LONG = [
  'bail',
  'base',
  'body',
  'count',
  'delete',
  'head',
  'jq',
  'json',
  'merge',
  'no-test',
  'reverse',
  'title',
] as const;

/** § — serve:public (`scripts/serve-public.ts`) — auto team plan */
export const SERVE_PUBLIC_ALLOWED_LONG = ['bake'] as const;

/** § — bun:remediation (`scripts/bun-remediation-cli.ts`) — auto team plan */
export const BUN_REMEDIATION_ALLOWED_LONG = ['json', 'list', 'random'] as const;

/** § — registry:doctor (`scripts/registry-stack-doctor.ts`) — auto team plan */
export const REGISTRY_DOCTOR_ALLOWED_LONG = [
  'env-file',
  'fix',
  'json',
  'npmrc-file',
  'registry-config',
] as const;

/** § — packages:docs-index (`scripts/packages-docs-index.ts`) — auto team plan */
export const PACKAGES_DOCS_INDEX_ALLOWED_LONG = ['bump-verified', 'check', 'write'] as const;

/** § — partner:dashboard-plan:validate (`scripts/validate-partner-dashboard-plan.ts`) — auto team plan */
export const PARTNER_DASHBOARD_PLAN_VALIDATE_ALLOWED_LONG = ['unregistered'] as const;

/** § — bun-migrate (`scripts/bun-migrate.ts`) — auto team plan */
export const BUN_MIGRATE_ALLOWED_LONG = [
  'format',
  'include-tests',
  'out',
  'phase',
  'roots',
  'section',
  'workspace',
  'write',
  'dry-run',
] as const;

/** § — test:changed (`scripts/bun-test-changed.ts`) — auto team plan */
export const TEST_CHANGED_ALLOWED_LONG = [
  'changed',
  'dry-run',
  'exclude-ci-reserved',
  'isolate',
  'main-head',
  'no-timings',
  'parallel',
  'serial',
  'shard',
  'timings',
  'update-timings',
  'watch',
] as const;

/** § — concept:domain:backfill (`scripts/concept-domain-backfill.ts`) — auto team plan */
export const CONCEPT_DOMAIN_BACKFILL_ALLOWED_LONG = ['check', 'dry-run'] as const;

/** § — bookmakers:bake (`scripts/bake-bookmakers-board.ts`) — auto team plan */
export const BOOKMAKERS_BAKE_ALLOWED_LONG = ['check', 'json', 'local'] as const;

/** § — brand:bench:run (`scripts/brand-bench-runner.ts`) — auto team plan */
export const BRAND_BENCH_RUN_ALLOWED_LONG = ['full360', 'json-only', 'quiet'] as const;

/** § — precommit:ast-grep (`scripts/pre-commit-ast-grep.ts`) — auto team plan */
export const PRECOMMIT_AST_GREP_ALLOWED_LONG = [
  'changed',
  'domain',
  'fail-on',
  'full',
  'profile',
  'skip-preflight',
  'staged',
] as const;

/** § — harness:report (`scripts/harness-report.ts`) — grouped ESLint findings */
export const HARNESS_REPORT_ALLOWED_LONG = [
  'easy-only',
  'json',
  'json-out',
  'md-out',
  'quiet',
  'top',
] as const;

/** § — concept:history (`scripts/concept-history.ts`) — auto team plan */
export const CONCEPT_HISTORY_ALLOWED_LONG = ['id', 'limit', 'output'] as const;

/** § — check:monorepo-health (`scripts/check-monorepo-health.ts`) — auto team plan */
export const CHECK_MONOREPO_HEALTH_ALLOWED_LONG = [
  'json',
  'no-history',
  'no-write',
  'tests-only',
  'write-baseline',
] as const;

/** § — partner-surface-inventory:bake (`scripts/bake-partner-surface-inventory.ts`) — auto team plan */
export const PARTNER_SURFACE_INVENTORY_BAKE_ALLOWED_LONG = ['check'] as const;

/** § — search:bench (`scripts/search-benchmark.ts`) — auto team plan */
export const SEARCH_BENCH_ALLOWED_LONG = [
  'concurrency',
  'family-cap',
  'group-limit',
  'json',
  'limit',
  'overlap',
  'path',
  'queries',
  'query-pack',
  'query-retries',
  'query-timeout-ms',
  'strict',
  'task',
  'view',
] as const;

/** § — fix:as-any (`scripts/fix-as-any.ts`) — auto team plan */
export const FIX_AS_ANY_ALLOWED_LONG = ['dry-run'] as const;

/** § — skills:validate (`scripts/validate-agent-skills.ts`) — auto team plan */
export const SKILLS_VALIDATE_ALLOWED_LONG = ['json'] as const;

/** § — concept:domain:stats (`scripts/concept-domain-stats.ts`) — auto team plan */
export const CONCEPT_DOMAIN_STATS_ALLOWED_LONG = ['domain', 'output'] as const;

/** § — bake:doctor (`scripts/ensure-machine-bunfig.ts`) — auto team plan */
export const BAKE_DOCTOR_ALLOWED_LONG = ['check', 'full', 'no-portable', 'report'] as const;

/** § — validate:integrity (`scripts/validate-integrity.ts`) — auto team plan */
export const VALIDATE_INTEGRITY_ALLOWED_LONG = ['roots', 'section'] as const;

/** § — concept:graph (`scripts/concept-graph.ts`) — auto team plan */
export const CONCEPT_GRAPH_ALLOWED_LONG = [
  'bake',
  'bun-port',
  'bunport',
  'depth',
  'domain',
  'focus',
  'format',
  'group-edges',
  'min-degree',
  'namespace',
  'no-hubs',
  'no-surface',
  'open',
  'path-from',
  'path-to',
  'port',
  'see-also-layer',
  'serve',
] as const;

/** § — proton:partner:provision (`scripts/provision-partner-secrets.ts`) — auto team plan */
export const PROTON_PARTNER_PROVISION_ALLOWED_LONG = [
  'all',
  'password',
  'title',
  'url',
  'username',
  'vault-name',
] as const;

/** § — fix:pin-versions (`scripts/fix-pin-versions.ts`) — auto team plan */
export const FIX_PIN_VERSIONS_ALLOWED_LONG = ['dry-run'] as const;

/** § — partner:money:migrate (`scripts/migrate-money-to-integers.ts`) — auto team plan */
export const PARTNER_MONEY_MIGRATE_ALLOWED_LONG = ['apply'] as const;

/** § — concept:health:weekly (`scripts/concept-health-weekly.ts`) — auto team plan */
export const CONCEPT_HEALTH_WEEKLY_ALLOWED_LONG = ['output', 'telegram'] as const;

/** § — deps:outdated (`scripts/deps-outdated-workspaces.ts`) — auto team plan */
export const DEPS_OUTDATED_ALLOWED_LONG = ['json', 'latest'] as const;

/** § — precommit (`scripts/pre-commit.ts`) — auto team plan */
export const PRECOMMIT_ALLOWED_LONG = [
  'config',
  'dry-run',
  'scan',
  'staged',
  'strict',
  'strict-globs',
  'verbose',
] as const;

/** § — fix:default-exports-bulk (`scripts/fix-default-exports-bulk.ts`) — auto team plan */
export const FIX_DEFAULT_EXPORTS_BULK_ALLOWED_LONG = ['dry-run'] as const;

/** § — mcp:sync (`scripts/mcp-sync.ts`) — auto team plan */
export const MCP_SYNC_ALLOWED_LONG = ['check'] as const;

/** § — search:coverage:loc (`scripts/search-coverage-loc.ts`) — auto team plan */
export const SEARCH_COVERAGE_LOC_ALLOWED_LONG = ['files', 'glob', 'overlap', 'path'] as const;

/** § — add:safe (`scripts/bun-add-safe.ts`) — auto team plan */
export const ADD_SAFE_ALLOWED_LONG = ['exact', 'global'] as const;

/** § — remove:safe (`scripts/bun-remove-safe.ts`) — package names are positional */
export const REMOVE_SAFE_ALLOWED_LONG = ['help'] as const;

/** § — proton-inject (`scripts/proton-inject.ts`) */
export const PROTON_INJECT_ALLOWED_LONG = ['list', 'reasonix', 'help'] as const;

/** § — proton-session-env (`scripts/proton-session-env.ts`) */
export const PROTON_SESSION_ENV_ALLOWED_LONG = ['json', 'help'] as const;

/** § — cloudflare-token-probe (`tools/cloudflare-token-probe-cli.ts`) */
export const CLOUDFLARE_TOKEN_PROBE_ALLOWED_LONG = ['json', 'help'] as const;

/** § — deps:rate-removal (`scripts/rate-removal-candidates.ts`) */
export const DEPS_RATE_REMOVAL_ALLOWED_LONG = [
  'json',
  'md',
  'min-score',
  'limit',
  'package',
  'scope',
  'grade',
  'only-candidates',
  'hide-locked',
  'why',
  'help',
] as const;
/** § — ops:limits:lab:profile (`scripts/limit-forecast-lab-profile.ts`) — auto team plan */
export const OPS_LIMITS_LAB_PROFILE_ALLOWED_LONG = [
  'cpu-prof',
  'cpu-prof-dir',
  'cpu-prof-md',
  'cpu-prof-name',
  'no-write',
] as const;

/** § — concepts:bake (`scripts/bake-concepts.ts`) — auto team plan */
export const CONCEPTS_BAKE_ALLOWED_LONG = ['check', 'output', 'quiet', 'show-deprecated'] as const;

/** § — bake:install-hygiene (`scripts/bake-install-hygiene-report.ts`) — auto team plan */
export const BAKE_INSTALL_HYGIENE_ALLOWED_LONG = ['dry-run', 'json'] as const;

/** § — registry:projects (`scripts/generate-project-registry.ts`) — auto team plan */
export const REGISTRY_PROJECTS_ALLOWED_LONG = ['dry-run'] as const;

/** § — vault:gap:close (`scripts/vault-gap-close.ts`) — auto team plan */
export const VAULT_GAP_CLOSE_ALLOWED_LONG = [
  'close',
  'export-minted',
  'mint',
  'mint-local',
  'output',
  'password',
  'show',
  'status',
  'title',
  'username',
  'vault-name',
  'wire',
  'write-baseline',
] as const;

/** § — release (`scripts/release.ts`) — auto team plan */
export const RELEASE_ALLOWED_LONG = ['list'] as const;

/** § — test:inventory (`scripts/suite-inventory.ts`) — auto team plan */
export const TEST_INVENTORY_ALLOWED_LONG = [
  'json',
  'lane',
  'parallel',
  'parallel-probe',
  'shard-plan-out',
  'shards',
  'timeout-ms',
] as const;

/** § — search:status:unified:strict (`scripts/search-unified-status.ts`) — auto team plan */
export const SEARCH_STATUS_UNIFIED_STRICT_ALLOWED_LONG = [
  'domain',
  'json',
  'latest',
  'loop',
  'rss',
  'source',
  'strict',
  'text',
] as const;

/** § — concept:archive (`scripts/concept-archive.ts`) — auto team plan */
export const CONCEPT_ARCHIVE_ALLOWED_LONG = ['force', 'id', 'reason'] as const;

/** § — hygiene (`scripts/repo-hygiene.ts`) — auto team plan */
export const HYGIENE_ALLOWED_LONG = ['staged', 'tracked'] as const;

/** § — secrets:migrate (`scripts/secrets-migrate.ts`) — auto team plan */
export const SECRETS_MIGRATE_ALLOWED_LONG = ['dry-run'] as const;

/** § — ci:core (`scripts/ci-core.ts`) — auto team plan */
export const CI_CORE_ALLOWED_LONG = CI_HARNESS_ALLOWED_LONG;

/** § — build:defines (`scripts/build-with-defines.ts`) — auto team plan */
export const BUILD_DEFINES_ALLOWED_LONG = [
  'always',
  'compile',
  'minify-syntax',
  'outfile',
  'short',
  'tags',
  'debug',
] as const;

/** § — check:bun-pm-cache (`scripts/check-bun-pm-cache.ts`) — auto team plan */
export const CHECK_BUN_PM_CACHE_ALLOWED_LONG = ['json', 'quiet', 'strict'] as const;

/** § — concept:registry:sync (`scripts/concept-registry-db.ts`) — auto team plan */
export const CONCEPT_REGISTRY_SYNC_ALLOWED_LONG = ['check', 'json'] as const;

/** § — console-format:bake (`scripts/bake-console-format.ts`) — auto team plan */
export const CONSOLE_FORMAT_BAKE_ALLOWED_LONG = ['check'] as const;

/** § — cli:allowlist:plan (`scripts/cli-allowlist-team-plan.ts`) — auto team plan */
export const CLI_ALLOWLIST_PLAN_ALLOWED_LONG = ['write'] as const;

/** § — verify-all (`tools/verify-proof-taxonomy.ts`) — auto team plan */
export const VERIFY_ALL_ALLOWED_LONG = ['json', 'save'] as const;

/** § — check:bun-defaults (`tools/verify-bun-defaults.ts`) — auto team plan */
export const CHECK_BUN_DEFAULTS_ALLOWED_LONG = ['json'] as const;

/** § — portal:theme:sync (`tools/sync-portal-theme.ts`) — auto team plan */
export const PORTAL_THEME_SYNC_ALLOWED_LONG = ['check'] as const;

/** § — ops:experiments (`tools/ops-experiments.ts`) — auto team plan */
export const OPS_EXPERIMENTS_ALLOWED_LONG = [
  'allow-exploratory-subset',
  'cluster-by',
  'config',
  'factors',
  'fraction',
  'id',
  'json',
  'metric',
  'min-duration-days',
  'min-partners-per-variant',
  'n',
  'name',
  'partner',
  'period-days',
  'protocol',
  'sandbox',
  'value',
  'washout',
] as const;

/** § — docs:api-verify (`tools/bun-api-verify.ts`) — auto team plan */
export const DOCS_API_VERIFY_ALLOWED_LONG = ['live', 'write'] as const;

/** § — ops:postgres-probe (`tools/ops-postgres-probe.ts`) — auto team plan */
export const OPS_POSTGRES_PROBE_ALLOWED_LONG = ['export-ddl', 'probe'] as const;

/** § — docs:native:preview (`tools/bun-native-capabilities-sync.ts`) — auto team plan */
export const DOCS_NATIVE_PREVIEW_ALLOWED_LONG = ['check', 'preview', 'write'] as const;

/** § — github-issue-taxonomy:bake (`tools/bake-github-issue-taxonomy.ts`) — auto team plan */
export const GITHUB_ISSUE_TAXONOMY_BAKE_ALLOWED_LONG = ['check'] as const;

/** § — surface-coverage:map (`tools/generate-surface-coverage-map.ts`) — auto team plan */
export const SURFACE_COVERAGE_MAP_ALLOWED_LONG = ['check', 'stdout'] as const;

/** § — vault:resolve (`tools/vault-resolver.ts`) — auto team plan */
export const VAULT_RESOLVE_ALLOWED_LONG = [
  'check',
  'force',
  'in-file',
  'inject',
  'json',
  'out-file',
  'ssh',
  'vault-name',
] as const;

/** § — telegram:all-accounting (`tools/all-accounting-channel.ts`) — auto team plan */
export const TELEGRAM_ALL_ACCOUNTING_ALLOWED_LONG = [
  'brand',
  'chat',
  'no-photo',
  'no-topics',
  'post-prompt',
] as const;

/** § — check:etag (`tools/verify-etag.ts`) — auto team plan */
export const CHECK_ETAG_ALLOWED_LONG = ['skip-ttl'] as const;

/** § — bun:types-changelog (`tools/bun-types-changelog.ts`) — auto team plan */
export const BUN_TYPES_CHANGELOG_ALLOWED_LONG = [
  'git',
  'json',
  'no-fetch',
  'no-write',
  'prefer-local',
  'short',
  'tip',
] as const;

/** § — cloudflare:publish (`tools/cloudflare-pages-publish.ts`) — auto team plan */
export const CLOUDFLARE_PUBLISH_ALLOWED_LONG = [
  'allow-dirty',
  'commit',
  'no-routing',
  'push',
  'taxonomy',
  'verify',
  'wait',
] as const;

/** § — brand:coverage (`tools/brand-coverage.ts`) — auto team plan */
export const BRAND_COVERAGE_ALLOWED_LONG = ['attention', 'json', 'strict'] as const;

/** § — lib:area-maps:check (`tools/lib-area-map-check.ts`) — auto team plan */
export const LIB_AREA_MAPS_CHECK_ALLOWED_LONG = [
  'json',
  'no-mega-orphans',
  'no-require-mega',
  'open',
  'orphans',
  'require-map',
  'require-mega',
  'strict',
  'strict-verified',
] as const;

/** § — ops:seed:all (`tools/ops-seed-partners.ts`) — auto team plan */
export const OPS_SEED_ALL_ALLOWED_LONG = ['force'] as const;

/** § — policy:audit (`tools/policy-audit.ts`) — auto team plan */
export const POLICY_AUDIT_ALLOWED_LONG = ['json'] as const;

/** § — portal:css:build (`tools/build-portal-css.ts`) — auto team plan */
export const PORTAL_CSS_BUILD_ALLOWED_LONG = ['check', 'minify'] as const;

/** § — ops:anchor:scan (`tools/ops-anchor-scan.ts`) — auto team plan */
export const OPS_ANCHOR_SCAN_ALLOWED_LONG = ['json'] as const;

/** § — ops:limits:seed-toc-bridge (`tools/seed-toc-limit-bridge.ts`) — auto team plan */
export const OPS_LIMITS_SEED_TOC_BRIDGE_ALLOWED_LONG = [
  'bake',
  'no-capture',
  'no-prove',
  'reseed',
] as const;

/** § — registry:snapshot (`tools/build-registry-snapshot.ts`) — auto team plan */
export const REGISTRY_SNAPSHOT_ALLOWED_LONG = [
  'force-routing',
  'no-report',
  'no-routing',
  'no-static',
  'no-webview',
  'post',
  'pre',
  'stable',
  'webview',
] as const;

/** § — proton:verify (`tools/proton-verify.ts`) — auto team plan */
export const PROTON_VERIFY_ALLOWED_LONG = ['json'] as const;

/** § — partner:settlement:import (`tools/partner-settlement.ts`) — auto team plan */
export const PARTNER_SETTLEMENT_IMPORT_ALLOWED_LONG = ['cron', 'dry-run', 'stdin'] as const;

/** § — jurisdictions:docs (`tools/jurisdictions-docs.ts`) — auto team plan */
export const JURISDICTIONS_DOCS_ALLOWED_LONG = ['check'] as const;

/** § — ratchet (`tools/ratchet.ts`) — auto team plan */
export const RATCHET_ALLOWED_LONG = ['channel', 'force'] as const;

/** § — failures:bake (`tools/failures-bake.ts`) — auto team plan */
export const FAILURES_BAKE_ALLOWED_LONG = ['all', 'from', 'no-fail'] as const;

/** § — ops:reconcile (`tools/ops-reconcile.ts`) — auto team plan */
export const OPS_RECONCILE_ALLOWED_LONG = ['json'] as const;

/** § — verify:guides (`tools/verify-guides.ts`) — auto team plan */
export const VERIFY_GUIDES_ALLOWED_LONG = ['dry-run', 'production', 'save'] as const;

/** § — telegram:daily-report (`tools/telegram-daily-report.ts`) — auto team plan */
export const TELEGRAM_DAILY_REPORT_ALLOWED_LONG = ['count', 'schedule', 'title'] as const;

/** § — ops:migrate (`tools/ops-migrate.ts`) — auto team plan */
export const OPS_MIGRATE_ALLOWED_LONG = ['dry-run'] as const;

/** § — telegram:handshake:verify (`tools/verify-package-group-handshake.ts`) — auto team plan */
export const TELEGRAM_HANDSHAKE_VERIFY_ALLOWED_LONG = [
  'db',
  'forums-dir',
  'json',
  'live',
  'path',
] as const;

/** § — bun:utils-proof (`tools/bun-utils-registry-proof.ts`) — auto team plan */
export const BUN_UTILS_PROOF_ALLOWED_LONG = ['json', 'no-fail', 'publish', 'write'] as const;

/** § — partner:settlement:cron:preview (`tools/partner-settlement-cron.ts`) — auto team plan */
export const PARTNER_SETTLEMENT_CRON_PREVIEW_ALLOWED_LONG = ['count', 'schedule', 'title'] as const;

/** § — icons:generate (`tools/generate-portal-icons.ts`) — auto team plan */
export const ICONS_GENERATE_ALLOWED_LONG = ['check', 'verify'] as const;

/** § — reference:discover (`tools/reference-discovery.ts`) — auto team plan */
export const REFERENCE_DISCOVER_ALLOWED_LONG = [
  'all',
  'check',
  'json',
  'min-severity',
  'public',
  'skip-unused',
] as const;

/** § — partner:deposit:import (`tools/partner-deposit-import.ts`) — auto team plan */
export const PARTNER_DEPOSIT_IMPORT_ALLOWED_LONG = ['dry-run', 'stdin'] as const;

/** § — ops:diagnose (`tools/ops-summary-diagnose.ts`) — auto team plan */
export const OPS_DIAGNOSE_ALLOWED_LONG = ['base-url', 'compare-routing', 'json'] as const;

/** § — sweep:domain (`tools/domain-sweep.ts`) — auto team plan */
export const SWEEP_DOMAIN_ALLOWED_LONG = [
  'check',
  'fast',
  'json',
  'no-write',
  'pm',
  'quick',
  'weave',
] as const;

/** § — portal:secret (`tools/portal-secret.ts`) — auto team plan */
export const PORTAL_SECRET_ALLOWED_LONG = [
  'env-file',
  'field',
  'file-mode',
  'from-vault-name',
  'item-id',
  'item-title',
  'json',
  'out-file',
  'output',
  'parallel',
  'role',
  'share-id',
  'to',
  'to-vault-name',
  'vault',
  'vault-name',
] as const;

/** § — projects:roots:check (`tools/projects-root-check.ts`) — auto team plan */
export const PROJECTS_ROOTS_CHECK_ALLOWED_LONG = ['json'] as const;

/** § — partners:profiles:seed (`tools/migrate-seat-partners-to-profiles.ts`) — auto team plan */
export const PARTNERS_PROFILES_SEED_ALLOWED_LONG = ['dry-run'] as const;

/** § — bun:channel:report (`tools/bun-channel-doctor.ts`) — auto team plan */
export const BUN_CHANNEL_REPORT_ALLOWED_LONG = ['check', 'json', 'root', 'save'] as const;

/** § — partners:event-concepts:bake (`tools/bake-partner-ops-event-concepts.ts`) — auto team plan */
export const PARTNERS_EVENT_CONCEPTS_BAKE_ALLOWED_LONG = ['check'] as const;

/** § — ops:loop:baseline (`tools/ops-loop-report.ts`) — auto team plan */
export const OPS_LOOP_BASELINE_ALLOWED_LONG = ['compare', 'fixture', 'out'] as const;

/** § — pulse:once (`tools/pulse-daemon.ts`) — auto team plan */
export const PULSE_ONCE_ALLOWED_LONG = ['once'] as const;

/** § — partner:health:bake (`tools/partner-health-bake.ts`) — auto team plan */
export const PARTNER_HEALTH_BAKE_ALLOWED_LONG = ['check', 'out'] as const;

/** § — brand:manifest (`tools/brand-manifest.ts`) — auto team plan */
export const BRAND_MANIFEST_ALLOWED_LONG = ['check', 'json'] as const;

/** § — bake:all (`tools/bake-all.ts`) — auto team plan */
export const BAKE_ALL_ALLOWED_LONG = ['bake', 'dry-run', 'list'] as const;

/** § — cloudflare:access:token:validate (`tools/cloudflare-access-token-validate.ts`) — auto team plan */
export const CLOUDFLARE_ACCESS_TOKEN_VALIDATE_ALLOWED_LONG = ['json'] as const;

/** § — portal:probe (`tools/portal-probe.ts`) — auto team plan */
export const PORTAL_PROBE_ALLOWED_LONG = ['dry-run', 'frozen-lockfile', 'json'] as const;

/** § — verify:cloudflare-token (`tools/verify-cloudflare-token.ts`) — auto team plan */
export const VERIFY_CLOUDFLARE_TOKEN_ALLOWED_LONG = ['json', 'no-live', 'save', 'strict'] as const;

/** § — cloudflare:deploy (`tools/cloudflare-pages-deploy.ts`) — auto team plan */
export const CLOUDFLARE_DEPLOY_ALLOWED_LONG = [
  'branch',
  'live',
  'taxonomy',
  'verify',
  'wait',
] as const;

/** § — glossary:portal (`tools/domain-glossary.ts`) — auto team plan */
export const GLOSSARY_PORTAL_ALLOWED_LONG = ['check'] as const;

/** § — factory:routes:test (`tools/registry-routes-test.ts`) — auto team plan */
export const FACTORY_ROUTES_TEST_ALLOWED_LONG = ['serve-public'] as const;

/** § — docs:release-index (`tools/bun-docs-releases.ts`) — auto team plan */
export const DOCS_RELEASE_INDEX_ALLOWED_LONG = ['force'] as const;

/** § — verify:tournament-glossary (`tools/verify-tournament-glossary.ts`) — auto team plan */
export const VERIFY_TOURNAMENT_GLOSSARY_ALLOWED_LONG = ['json', 'list-known'] as const;

/** § — ops:outbox:requeue (`tools/ops-outbox-requeue.ts`) — auto team plan */
export const OPS_OUTBOX_REQUEUE_ALLOWED_LONG = ['drain', 'dry-run', 'memory', 'r2'] as const;

/** § — ops:compliance:report (`tools/enhanced-compliance-report.ts`) — auto team plan */
export const OPS_COMPLIANCE_REPORT_ALLOWED_LONG = ['html'] as const;

/** § — docs:reference-index (`tools/bun-docs-reference-index.ts`) — auto team plan */
export const DOCS_REFERENCE_INDEX_ALLOWED_LONG = ['force'] as const;

/** § — telegram:link-chat (`tools/telegram-link-chat.ts`) — auto team plan */
export const TELEGRAM_LINK_CHAT_ALLOWED_LONG = ['no-welcome', 'reassign', 'share-dm'] as const;

/** § — bake:capabilities (`tools/bake-capability-map.ts`) — auto team plan */
export const BAKE_CAPABILITIES_ALLOWED_LONG = ['check', 'write'] as const;

/** § — check:formdata (`tools/verify-formdata.ts`) — auto team plan */
export const CHECK_FORMDATA_ALLOWED_LONG = ['save'] as const;

/** § — docs:showcase (`tools/bun-api-showcase.ts`) — auto team plan */
export const DOCS_SHOWCASE_ALLOWED_LONG = ['print', 'verbose'] as const;

/** § — partner:watch (`tools/partner-watch.ts`) — auto team plan */
export const PARTNER_WATCH_ALLOWED_LONG = ['debounce-ms', 'once'] as const;

/** § — check:release-tracker (`tools/verify-bun-release.ts`) — auto team plan */
export const CHECK_RELEASE_TRACKER_ALLOWED_LONG = ['live-r2', 'save'] as const;

/** § — cloudflare:preflight (`tools/cloudflare-pages-preflight.ts`) — auto team plan */
export const CLOUDFLARE_PREFLIGHT_ALLOWED_LONG = ['no-taxonomy', 'save'] as const;

/** § — phone:add (`tools/phone-add.ts`) — auto team plan */
export const PHONE_ADD_ALLOWED_LONG = [
  'assign',
  'carrier',
  'data-plan',
  'id',
  'imei',
  'json',
  'model',
] as const;

/** § — ssot:flow:soft (`tools/bake-ssot-flow-soft.ts`) — auto team plan */
export const SSOT_FLOW_SOFT_ALLOWED_LONG = ['json'] as const;

/** § — telegram:all-accounting:create (`tools/create-house-forum.ts`) — auto team plan */
export const TELEGRAM_ALL_ACCOUNTING_CREATE_ALLOWED_LONG = [
  'all',
  'bind-only',
  'brand',
  'chat',
  'post-prompt',
  'skip-bind',
] as const;

/** § — ops:dossier:seed (`tools/seed-account-dossier.ts`) — auto team plan */
export const OPS_DOSSIER_SEED_ALLOWED_LONG = [
  'bake',
  'bake-path',
  'db',
  'force',
  'hours',
  'include-limit-demo',
  'no-bake',
  'ops-summary',
] as const;

/** § — partner:finance-report (`tools/partner-finance-report.ts`) — auto team plan */
export const PARTNER_FINANCE_REPORT_ALLOWED_LONG = [
  'count',
  'days',
  'partner',
  'schedule',
  'title',
] as const;

/** § — bun:types-inventory (`tools/bun-types-inventory.ts`) — auto team plan */
export const BUN_TYPES_INVENTORY_ALLOWED_LONG = [
  'check',
  'full-scan',
  'json',
  'no-counts',
  'no-enums',
  'no-interfaces',
  'no-nested-objects',
  'no-props',
  'no-type-aliases',
  'shallow',
  'short',
  'tip-diff',
  'verbose',
  'write',
] as const;

/** § — dod:pack (`tools/dod-evidence.ts`) — auto team plan */
export const DOD_PACK_ALLOWED_LONG = [
  'agent',
  'kind',
  'out',
  'preview',
  'register',
  'registry',
  'threshold',
] as const;

/** § — sweep:domain:cron (`tools/domain-sweep-cron.ts`) — auto team plan */
export const SWEEP_DOMAIN_CRON_ALLOWED_LONG = ['fast'] as const;

/** § — check:defaults (`tools/verify-defaults.ts`) — auto team plan */
export const CHECK_DEFAULTS_ALLOWED_LONG = ['save'] as const;

/** § — docs:catalog (`tools/bun-docs-catalog.ts`) — auto team plan */
export const DOCS_CATALOG_ALLOWED_LONG = [
  'compact',
  'force',
  'json',
  'jsonl',
  'links',
  'locus',
  'no-refresh-rss',
  'notes',
  'release',
  'search',
  'section',
  'skip-notes',
  'type',
  'verbose',
  'wide',
] as const;

/** § — telegram:verify (`tools/telegram-verify-env.ts`) — auto team plan */
export const TELEGRAM_VERIFY_ALLOWED_LONG = ['json', 'no-probe'] as const;

/** § — baseline:apply-overrides (`tools/baseline-sync.ts`) — auto team plan */
export const BASELINE_APPLY_OVERRIDES_ALLOWED_LONG = ['dry-run', 'json', 'live'] as const;

/** § — baseline:caesars:probe (`tools/baseline-caesars-probe.ts`) — auto team plan */
export const BASELINE_CAESARS_PROBE_ALLOWED_LONG = ['bake', 'json', 'live'] as const;

/** § — lane:status (`tools/lane-status.ts`) — auto team plan */
export const LANE_STATUS_ALLOWED_LONG = [
  'count',
  'every',
  'help',
  'json',
  'jsonl',
  'left-right',
  'merged',
  'short',
  'strict',
  'term',
  'toml',
  'tz',
  'verbose',
  'watch',
] as const;

/** § — bench:status (`tools/bench-status.ts`) — harness Bun metric catalog */
export const BENCH_STATUS_ALLOWED_LONG = ['json'] as const;

/** § — glossary:verify (`tools/glossary-verify.ts`) — auto team plan */
export const GLOSSARY_VERIFY_ALLOWED_LONG = ['dry-run', 'json', 'strict'] as const;

/** § — bun:channel:cron:preview (`tools/bun-channel-doctor-cron.ts`) — auto team plan */
export const BUN_CHANNEL_CRON_PREVIEW_ALLOWED_LONG = [
  'count',
  'root',
  'schedule',
  'title',
] as const;

/** § — ops:settle (`tools/ops-settle.ts`) — auto team plan */
export const OPS_SETTLE_ALLOWED_LONG = [
  'dry-run',
  'limit',
  'no-outbox',
  'pnl',
  'r2',
  'result',
] as const;

/** § — portal:snapshot:cron:preview (`tools/portal-snapshot-cron.ts`) — auto team plan */
export const PORTAL_SNAPSHOT_CRON_PREVIEW_ALLOWED_LONG = ['count', 'schedule', 'title'] as const;

/** § — bake:bun-cli-reference (`tools/bake-bun-cli-reference.ts`) — auto team plan */
export const BAKE_BUN_CLI_REFERENCE_ALLOWED_LONG = ['check'] as const;

/** § — sports:taxonomy (`tools/sports-taxonomy.ts`) — auto team plan */
export const SPORTS_TAXONOMY_ALLOWED_LONG = ['check'] as const;

/** § — registry:sync-index-r2 (`tools/sync-registry-index-r2.ts`) — auto team plan */
export const REGISTRY_SYNC_INDEX_R2_ALLOWED_LONG = ['dry-run'] as const;

/** § — bun:types-status (`tools/bun-types-status.ts`) — auto team plan */
export const BUN_TYPES_STATUS_ALLOWED_LONG = [
  'flag',
  'json',
  'max-age-days',
  'prefer-local',
  'refresh',
  'strict',
] as const;

/** § — bun:types-usage (`tools/bun-types-usage.ts`) — auto team plan */
export const BUN_TYPES_USAGE_ALLOWED_LONG = [
  'json',
  'no-write',
  'props',
  'strict',
  'unused',
] as const;

/** § — tennis:ssot:release:check (`tools/verify-tennis-ssot-release.ts`) — auto team plan */
export const TENNIS_SSOT_RELEASE_CHECK_ALLOWED_LONG = ['live'] as const;

/** § — ops:anchor:bake (`tools/bake-stale-anchors.ts`) — auto team plan */
export const OPS_ANCHOR_BAKE_ALLOWED_LONG = ['check', 'json', 'max-variance', 'min-drift'] as const;

/** § — baseline:scrape-bet365 (`tools/baseline-scrape-book.ts`) — auto team plan */
export const BASELINE_SCRAPE_BET365_ALLOWED_LONG = ['html', 'live'] as const;

/** § — telegram:all-accounting:bind (`tools/telegram-bind-surface.ts`) — auto team plan */
export const TELEGRAM_ALL_ACCOUNTING_BIND_ALLOWED_LONG = [
  'brand',
  'chat',
  'env',
  'env-only',
  'post-prompt',
] as const;

/** § — bake:capabilities:update (`tools/bun-test-snapshots.ts`) — auto team plan */
export const BAKE_CAPABILITIES_UPDATE_ALLOWED_LONG = [
  'check',
  'dry-run',
  'id',
  'json',
  'list',
  'prune-orphans',
  'test',
  'update',
] as const;

/** § — telegram:catalog:research (`tools/telegram-catalog-research-agent.ts`) — auto team plan */
export const TELEGRAM_CATALOG_RESEARCH_ALLOWED_LONG = [
  'db',
  'forums-dir',
  'json',
  'llm',
  'partner',
  'write',
] as const;

/** § — registry:tags (`tools/registry-tags-cli.ts`) — auto team plan */
export const REGISTRY_TAGS_ALLOWED_LONG = ['all', 'from', 'package', 'stable'] as const;

/** § — telegram:handshake:readiness (`tools/telegram-handshake-readiness.ts`) — auto team plan */
export const TELEGRAM_HANDSHAKE_READINESS_ALLOWED_LONG = [
  'db',
  'deep',
  'detail',
  'invite-gap',
  'json',
  'live',
] as const;

/** § — portal:flags:check (`tools/portal-flags-check.ts`) — auto team plan */
export const PORTAL_FLAGS_CHECK_ALLOWED_LONG = ['json', 'skip-parity'] as const;

/** § — telegram:package-group:accounting (`tools/package-group-forum-enhance.ts`) — auto team plan */
export const TELEGRAM_PACKAGE_GROUP_ACCOUNTING_ALLOWED_LONG = [
  'accounting-prompt',
  'all',
  'db',
  'dry-run',
  'ensure-topics',
  'forums-dir',
  'icon',
] as const;

/** § — tennis:partner-contracts:bake (`tools/bake-tennis-partner-contracts.ts`) — auto team plan */
export const TENNIS_PARTNER_CONTRACTS_BAKE_ALLOWED_LONG = ['check', 'offline'] as const;

/** § — phone:sportsbook:add (`tools/phone-sportsbook-add.ts`) — auto team plan */
export const PHONE_SPORTSBOOK_ADD_ALLOWED_LONG = [
  'book',
  'json',
  'jurisdiction',
  'note',
  'phone',
  'sportsbook',
  'state',
  'status',
] as const;

/** § — bun:types-ci (`tools/bun-types-report.ts`) — auto team plan */
export const BUN_TYPES_CI_ALLOWED_LONG = [
  'no-changelog',
  'no-fetch',
  'prefer-local',
  'skip-usage',
  'strict',
] as const;

/** § — lib:domains:check (`tools/lib-domains-check.ts`) — auto team plan */
export const LIB_DOMAINS_CHECK_ALLOWED_LONG = ['json'] as const;

/** § — docs:feeds:migrate (`tools/bun-docs-feeds.ts`) — auto team plan */
export const DOCS_FEEDS_MIGRATE_ALLOWED_LONG = [
  'force',
  'migrate-legacy',
  'reference-only',
  'rss-only',
] as const;

/** § — partner:health (`tools/partner-health.ts`) — auto team plan */
export const PARTNER_HEALTH_ALLOWED_LONG = ['json'] as const;

/** § — env:check (`tools/env-check.ts`) — auto team plan */
export const ENV_CHECK_ALLOWED_LONG = [
  'channel-auth',
  'json',
  'load-reasonix',
  'reasonix',
  'strict',
] as const;

/** § — telegram:catalog:apply-enhancements (`tools/telegram-catalog-apply-enhancements.ts`) — auto team plan */
export const TELEGRAM_CATALOG_APPLY_ENHANCEMENTS_ALLOWED_LONG = ['all', 'dry-run'] as const;

/** § — bun:types-inventory:tip-diff (`tools/bun-types-tip-diff.ts`) — auto team plan */
export const BUN_TYPES_INVENTORY_TIP_DIFF_ALLOWED_LONG = [
  'allow-pin-only',
  'json',
  'no-changelog',
  'no-fetch',
  'no-write',
  'prefer-local',
  'short',
  'strict',
] as const;

/** § — build:doc-index (`tools/build-doc-index.ts`) — auto team plan */
export const BUILD_DOC_INDEX_ALLOWED_LONG = ['save'] as const;

/** § — check:tsconfig-types (`tools/tsconfig-types-audit.ts`) — auto team plan */
export const CHECK_TSCONFIG_TYPES_ALLOWED_LONG = ['strict'] as const;

/** § — verify:pages-edge (`tools/verify-pages-edge.ts`) — auto team plan */
export const VERIFY_PAGES_EDGE_ALLOWED_LONG = [
  'offline',
  'pm',
  'save',
  'strict-pm',
  'taxonomy',
  'tournament',
  'weave',
] as const;

/** § — docs:links:check (`tools/md-link-check.ts`) — auto team plan */
export const DOCS_LINKS_CHECK_ALLOWED_LONG = ['json'] as const;

/** § — partners:build (`tools/partners-ops.ts`) — auto team plan */
export const PARTNERS_BUILD_ALLOWED_LONG = [
  'amount',
  'call',
  'code',
  'json',
  'note',
  'out',
  'partner',
  'rail',
] as const;

/** § — cloudflare:access:edge:validate (`tools/cloudflare-access-edge-validate.ts`) — auto team plan */
export const CLOUDFLARE_ACCESS_EDGE_VALIDATE_ALLOWED_LONG = ['json'] as const;

/** § — telegram:surfaces:audit (`tools/telegram-surface-pipeline.ts`) — auto team plan */
export const TELEGRAM_SURFACES_AUDIT_ALLOWED_LONG = ['refresh', 'stdout'] as const;

/** § — wiki:coverage:check (`tools/wiki-index-coverage.ts`) — auto team plan */
export const WIKI_COVERAGE_CHECK_ALLOWED_LONG = ['json'] as const;

/** § — ops:book-reconcile (`tools/ops-book-reconcile.ts`) — auto team plan */
export const OPS_BOOK_RECONCILE_ALLOWED_LONG = ['json', 'live', 'webview'] as const;

/** § — telegram:handshake:desk (`tools/telegram-handshake-desk.ts`) — auto team plan */
export const TELEGRAM_HANDSHAKE_DESK_ALLOWED_LONG = [
  'db',
  'detail',
  'invite-gap',
  'json',
  'live',
  'path',
  'refresh',
] as const;

/** § — bake:scrape-wire-taxonomy (`tools/bake-scrape-wire-taxonomy.ts`) — auto team plan */
export const BAKE_SCRAPE_WIRE_TAXONOMY_ALLOWED_LONG = ['check'] as const;

/** § — telegram:brand (`tools/telegram-brand.ts`) — auto team plan */
export const TELEGRAM_BRAND_ALLOWED_LONG = [
  'bot-only',
  'chat',
  'groups',
  'matrix',
  'no-photo',
  'no-topics',
  'surface',
] as const;

/** § — telegram:event-alerts (`tools/telegram-event-alerts.ts`) — auto team plan */
export const TELEGRAM_EVENT_ALERTS_ALLOWED_LONG = ['baseline', 'schedule', 'title'] as const;

/** § — telegram:handshake:invite-gap (`tools/telegram-handshake-invite-gap.ts`) — auto team plan */
export const TELEGRAM_HANDSHAKE_INVITE_GAP_ALLOWED_LONG = [
  'db',
  'dry-run',
  'force',
  'json',
  'refresh',
  'send',
] as const;

/** § — vault:cli (`tools/vault-cli.ts`) — auto team plan */
export const VAULT_CLI_ALLOWED_LONG = ['json'] as const;

/** § — ops:seed (`tools/ops-seed.ts`) — auto team plan */
export const OPS_SEED_ALLOWED_LONG = ['force', 'summary'] as const;

/** § — partner:vault:migrate (`tools/migrate-seat-intake-vault.ts`) — auto team plan */
export const PARTNER_VAULT_MIGRATE_ALLOWED_LONG = ['db', 'intake-dir'] as const;

/** § — threads:portfolio (`tools/codex-thread-portfolio.ts`) — auto team plan */
export const THREADS_PORTFOLIO_ALLOWED_LONG = [
  'apply',
  'json',
  'markdown',
  'pins',
  'stdio',
  'verify',
] as const;

/** § — telegram:catalog:research:cron:preview (`tools/telegram-catalog-research-cron.ts`) — auto team plan */
export const TELEGRAM_CATALOG_RESEARCH_CRON_PREVIEW_ALLOWED_LONG = [
  'count',
  'schedule',
  'title',
] as const;

/** § — ops:limits:lab (`tools/ops-limit-forecast-lab.ts`) — auto team plan */
export const OPS_LIMITS_LAB_ALLOWED_LONG = ['json', 'no-scrape', 'no-write'] as const;

/** § — mcp:cloudflare:probe (`tools/mcp-cloudflare-probe.ts`) — auto team plan */
export const MCP_CLOUDFLARE_PROBE_ALLOWED_LONG = ['json'] as const;

/** § — brand:keymap (`tools/brand-keymap.ts`) — auto team plan */
export const BRAND_KEYMAP_ALLOWED_LONG = ['check'] as const;

/** § — snapshot:data-plane (`tools/snapshot-data-plane.ts`) — auto team plan */
export const SNAPSHOT_DATA_PLANE_ALLOWED_LONG = [
  'base',
  'debug',
  'dry-run',
  'grep',
  'last',
  'list',
  'scope',
] as const;

/** § — brand:baseline (`tools/branded-id-check.ts`) — auto team plan */
export const BRAND_BASELINE_ALLOWED_LONG = [
  'json',
  'legacy',
  'quiet',
  'smart',
  'staged',
  'strict',
  'write-baseline',
] as const;

/** § — ops:loop:live (`tools/ops-loop-live-proof.ts`) — auto team plan */
export const OPS_LOOP_LIVE_ALLOWED_LONG = ['dry-run'] as const;

/** § — tennis:agent-auth:bake (`tools/bake-tennis-agent-auth.ts`) — auto team plan */
export const TENNIS_AGENT_AUTH_BAKE_ALLOWED_LONG = ['check'] as const;

/** § — brand:catalog (`tools/brand-catalog.ts`) — auto team plan */
export const BRAND_CATALOG_ALLOWED_LONG = ['json'] as const;

/** § — docs:refresh (`tools/bun-docs-refresh.ts`) — auto team plan */
export const DOCS_REFRESH_ALLOWED_LONG = [
  'dry-run',
  'fast',
  'feeds',
  'force',
  'force-scrape',
  'no-refresh-rss',
  'once',
  'skip-feeds',
  'skip-integrity',
  'skip-scrape',
] as const;

/** § — telegram:ops:consume (`tools/telegram-ops-consumer.ts`) — auto team plan */
export const TELEGRAM_OPS_CONSUME_ALLOWED_LONG = ['dry-run'] as const;

/** § — wiki:links:fix (`tools/wiki-link-check.ts`) — auto team plan */
export const WIKI_LINKS_FIX_ALLOWED_LONG = ['fix', 'json'] as const;

/** § — sync:well-known-mcp (`tools/sync-well-known-mcp.ts`) — auto team plan */
export const SYNC_WELL_KNOWN_MCP_ALLOWED_LONG = ['check'] as const;

/** § — sync:main (`tools/sync-main.ts`) — post-squash origin/main sync */
export const SYNC_MAIN_ALLOWED_LONG = ['dry-run', 'force', 'help', 'json', 'yes'] as const;

/** § — onboard:partner (`tools/onboard-partner-package.ts`) — auto team plan */
export const ONBOARD_PARTNER_ALLOWED_LONG = [
  'create-package-group',
  'create-tree-node',
  'dry-run',
  'force',
  'identity-verified',
] as const;

/** § — ops:coverage (`tools/ops-coverage.ts`) — auto team plan */
export const OPS_COVERAGE_ALLOWED_LONG = ['json'] as const;

/** § — docs:map:check (`tools/doc-map-check.ts`) — auto team plan */
export const DOCS_MAP_CHECK_ALLOWED_LONG = [
  'json',
  'open',
  'refid-strict',
  'skip-refid-check',
  'strict-format',
] as const;

/** § — telegram:discover (`tools/telegram-discover.ts`) — auto team plan */
export const TELEGRAM_DISCOVER_ALLOWED_LONG = [
  'chat',
  'json',
  'local-only',
  'max-linked',
  'refresh',
] as const;

/** § — portal:flags:migrate (`tools/portal-flags-migrate.ts`) — auto team plan */
export const PORTAL_FLAGS_MIGRATE_ALLOWED_LONG = ['json'] as const;

/** § — partner:profiles:audit (`tools/partner-profiles-diff.ts`) — auto team plan */
export const PARTNER_PROFILES_AUDIT_ALLOWED_LONG = ['code', 'record'] as const;

/** § — partner:health-check (`tools/partner-health-check.ts`) — auto team plan */
export const PARTNER_HEALTH_CHECK_ALLOWED_LONG = [
  'alert',
  'json',
  'min-balance',
  'out',
  'partner',
] as const;

/** § — ops:prediction (`tools/ops-prediction.ts`) — auto team plan */
export const OPS_PREDICTION_ALLOWED_LONG = ['json', 'webview'] as const;

/** § — snapshot:live (`tools/snapshot-live.ts`) — auto team plan */
export const SNAPSHOT_LIVE_ALLOWED_LONG = [
  'base',
  'json',
  'quick',
  'strict-image',
  'thumb',
] as const;

/** § — issues:audit (`tools/github-issue-doctor.ts`) — auto team plan */
export const ISSUES_AUDIT_ALLOWED_LONG = ['dry-run', 'json', 'write'] as const;

/** § — ops:limits:seed-patterns (`tools/seed-limit-patterns.ts`) — auto team plan */
export const OPS_LIMITS_SEED_PATTERNS_ALLOWED_LONG = ['bake', 'force'] as const;

/** § — ops:health-tick (`tools/ops-health-tick.ts`) — auto team plan */
export const OPS_HEALTH_TICK_ALLOWED_LONG = ['db'] as const;

/** § — portal:optimize (`tools/optimize-portal-assets.ts`) — auto team plan */
export const PORTAL_OPTIMIZE_ALLOWED_LONG = ['no-report', 'outdir', 'report'] as const;

/** § — vault:health:bake (`tools/vault-health-bake.ts`) — auto team plan */
export const VAULT_HEALTH_BAKE_ALLOWED_LONG = ['no-fail', 'output'] as const;

/** § — concept:inventory (`tools/concept-inventory.ts`) — auto team plan */
export const CONCEPT_INVENTORY_ALLOWED_LONG = [
  'board',
  'category',
  'correlation-id',
  'desc',
  'domain',
  'group',
  'group-by',
  'namespace',
  'output',
  'run-id',
  'sort',
  'status',
  'unused',
  'usage-gt',
  'used',
] as const;

/** § — bake:sportsbook-opening-baseline (`tools/bake-sportsbook-opening-baseline.ts`) — auto team plan */
export const BAKE_SPORTSBOOK_OPENING_BASELINE_ALLOWED_LONG = ['check'] as const;

/** § — telegram:seat:out (`tools/telegram-seat-out.ts`) — auto team plan */
export const TELEGRAM_SEAT_OUT_ALLOWED_LONG = [
  'apply-default',
  'book-login',
  'default-deposit-to',
  'default-rail',
  'default-send-to',
  'deposit-to',
  'no-publish',
  'note',
  'rail',
  'send-to',
] as const;

/** § — telegram:join-partner-forums (`tools/join-partner-forums.ts`) — auto team plan */
export const TELEGRAM_JOIN_PARTNER_FORUMS_ALLOWED_LONG = ['dry-run'] as const;

/** § — agent (`tools/operator-agent.ts`) — auto team plan */
export const AGENT_ALLOWED_LONG = [
  'arb',
  'batch',
  'bookmaker',
  'bucketms',
  'cron',
  'dashboard',
  'detailed',
  'domains',
  'evaluate',
  'eventid',
  'export',
  'fetch',
  'fixture',
  'history',
  'host',
  'hosts',
  'input',
  'json',
  'league',
  'limit',
  'list',
  'live',
  'market',
  'minedgepct',
  'minevpct',
  'minpct',
  'monitor',
  'no-fixture',
  'no-monitor',
  'no-odds',
  'no-research',
  'no-screenshot',
  'no-store',
  'once',
  'output',
  'parallel',
  'port',
  'quiet',
  'run',
  'seed',
  'seed-arb',
  'seed-fixtures',
  'seed-value',
  'selection',
  'session',
  'sincemin',
  'source',
  'spawn',
  'sport',
  'store',
  'store-export',
  'ts-bump',
  'value',
  'window',
] as const;

/** § — telegram:seat:desk (`tools/telegram-seat-capital-desk.ts`) — auto team plan */
export const TELEGRAM_SEAT_DESK_ALLOWED_LONG = ['no-pin'] as const;

/** § — soft:accounting:bake (`tools/bake-soft-accounting-export.ts`) — auto team plan */
export const SOFT_ACCOUNTING_BAKE_ALLOWED_LONG = [
  'check',
  'force',
  'from-ct',
  'git-common-dir',
  'json',
  'out',
] as const;

/** § — docs:sync:integrated (`tools/cli/integrated-cli.ts`) — auto team plan */
export const DOCS_SYNC_INTEGRATED_ALLOWED_LONG = ['graph'] as const;

/** § — status:matrix (`tools/cli/endpoint-status.ts`) — auto team plan */
export const STATUS_MATRIX_ALLOWED_LONG = ['interval', 'json', 'light', 'timeout'] as const;

export const CLI_ALLOWLIST_APPLY_REGISTRY_ALLOWED_LONG = ['write'] as const;
export const CLI_ALLOWLIST_WIRE_ALLOWED_LONG = ['batch', 'write'] as const;

/** § — verify:portal (`tools/verify-portal.ts`) — audit split */
export const VERIFY_PORTAL_ALLOWED_LONG = ['live-only', 'static-only'] as const;

/** § — verify:docs-coverage (`tools/verify-docs-coverage.ts`) — audit split */
export const VERIFY_DOCS_COVERAGE_ALLOWED_LONG = [
  'json',
  'no-strict',
  'refresh-reference',
  'refresh-rss',
  'save',
  'strict',
] as const;

/** § — verify:script-flags (`tools/verify-script-flags.ts`) — audit split */
export const VERIFY_SCRIPT_FLAGS_ALLOWED_LONG = ['strict'] as const;

/** § — verify:proof-taxonomy (`tools/verify-proof-taxonomy.ts`) — audit split */
export const VERIFY_PROOF_TAXONOMY_ALLOWED_LONG = ['json', 'save'] as const;

/** § — verify:package-info (`tools/verify-package-info.ts`) — audit split */
export const VERIFY_PACKAGE_INFO_ALLOWED_LONG = ['save'] as const;

/** § — verify:registry-client (`tools/verify-registry-client.ts`) — audit split */
export const VERIFY_REGISTRY_CLIENT_ALLOWED_LONG = ['json', 'save'] as const;

/** § — verify:install-platform (`tools/verify-install-platform.ts`) — audit split */
export const VERIFY_INSTALL_PLATFORM_ALLOWED_LONG = ['dry-run', 'json', 'save'] as const;

/** § — verify:install-env (`tools/verify-install-env.ts`) — audit split */
export const VERIFY_INSTALL_ENV_ALLOWED_LONG = ['json', 'save'] as const;

/** § — verify:bun-runtime-nits (`tools/verify-bun-runtime-nits.ts`) — audit split */
export const VERIFY_BUN_RUNTIME_NITS_ALLOWED_LONG = ['save'] as const;

/** § — machine:bunfig:ensure (`scripts/ensure-machine-bunfig.ts`) — audit split */
export const MACHINE_BUNFIG_ENSURE_ALLOWED_LONG = ['check', 'overwrite', 'overwrite-link'] as const;

/** § — ops:seed:partners (`tools/ops-seed-partners.ts`) — audit split */
export const OPS_SEED_PARTNERS_ALLOWED_LONG = ['force'] as const;

/** § — ops:seed:tenants (`tools/ops-seed-tenants.ts`) — audit split */
export const OPS_SEED_TENANTS_ALLOWED_LONG = ['force'] as const;

/** § — ops:seed:dod (`tools/ops-seed-dod.ts`) — audit split */
export const OPS_SEED_DOD_ALLOWED_LONG = ['force'] as const;

/** § — ops:seed:prediction (`tools/ops-seed-prediction.ts`) — audit split */
export const OPS_SEED_PREDICTION_ALLOWED_LONG = ['force'] as const;

/** CLI names keyed in `ALLOWED_LONG_REGISTRY` (package-script style). */
/** § — cli:allowlist:coverage (auto) */
export const CLI_ALLOWLIST_COVERAGE_ALLOWED_LONG = ['json', 'write'] as const;

export type AllowedLongCliName =
  | 'lint-wires'
  | 'images:generate'
  | 'ops:snapshot'
  | 'telegram:ops'
  | 'partner:onboard'
  | 'bun:pr:verify'
  | 'bun:release-contracts'
  | 'bun:release-knowledge'
  | 'screenshot'
  | 'bun:runtime-pin'
  | 'glossary:health'
  | 'cloudflare:env:validate'
  | 'routing:registry-proof'
  | 'ops:seed:toc'
  | 'discovery:compose'
  | 'public:discovery'
  | 'schema:audit'
  | 'telegram:handshake:catalog'
  | 'concept:health'
  | 'ops:loop:gate-backfill'
  | 'ops:limits:check'
  | 'identity:admin'
  | 'provision:queue'
  | 'monorepo:health'
  | 'brand:status'
  | 'docs:refid'
  | 'concept:audit'
  | 'concept:registry:graph'
  | 'concept:discover'
  | 'seat:desk'
  | 'packages:metafile-audit'
  | 'harness:violations'
  | 'portal:cli'
  | 'bun:brand-map'
  | 'env:inventory'
  | 'check:import-graph'
  | 'check:console-format'
  | 'concept:review'
  | 'concept:deprecate'
  | 'partner-surface-inventory:docs'
  | 'lint'
  | 'bookmakers:migrate'
  | 'validate:workspaces'
  | 'affected:list'
  | 'rules'
  | 'partner-surface-inventory:lint-domains'
  | 'search:bench:gate'
  | 'ci:bun:check'
  | 'workspace-taxonomy:bake'
  | 'check:package-scripts'
  | 'bookmakers:desk-coverage'
  | 'help'
  | 'partners:event'
  | 'install:cache:lifecycle'
  | 'search:policy:check'
  | 'bunfig:bake'
  | 'concept:propose'
  | 'ci:harness'
  | 'bookmakers:prepare-publish'
  | 'partner-profile:coverage:bake'
  | 'partner:dashboard:bake'
  | 'partner:dashboard:refresh'
  | 'sports-terminal:health:refresh'
  | 'concept:registry:serve'
  | 'install:verify'
  | 'search:domain:doctor'
  | 'install:all'
  | 'brand:bench:profile'
  | 'fix:empty-catches'
  | 'lint:money-sql:staged'
  | 'tennis:board:bake'
  | 'check:invisible-chars'
  | 'search:bench:baseline:verify'
  | 'project:online:check'
  | 'packages:list'
  | 'surfaces:bake'
  | 'search:bench:dashboard'
  | 'concept:registry:usage-sync'
  | 'brand:bench:evaluate'
  | 'check:harness-complexity'
  | 'search:smart'
  | 'validate:concept-metadata'
  | 'decision:evidence:verify'
  | 'validate:surface-coverage'
  | 'bun:brand-map:baseline:ratchet'
  | 'portal:doctor:ci:report'
  | 'concept:serve'
  | 'concept:domain:list'
  | 'gate-map:validate'
  | 'search:bench:snapshot:core:wide:local'
  | 'inventory:wrappers'
  | 'gate-report:monorepo'
  | 'promote'
  | 'serve:public'
  | 'bun:remediation'
  | 'registry:doctor'
  | 'packages:docs-index'
  | 'partner:dashboard-plan:validate'
  | 'bun-migrate'
  | 'test:changed'
  | 'concept:domain:backfill'
  | 'bookmakers:bake'
  | 'brand:bench:run'
  | 'precommit:ast-grep'
  | 'harness:report'
  | 'concept:history'
  | 'check:monorepo-health'
  | 'partner-surface-inventory:bake'
  | 'search:bench'
  | 'fix:as-any'
  | 'skills:validate'
  | 'concept:domain:stats'
  | 'bake:doctor'
  | 'validate:integrity'
  | 'concept:graph'
  | 'proton:partner:provision'
  | 'fix:pin-versions'
  | 'partner:money:migrate'
  | 'concept:health:weekly'
  | 'deps:outdated'
  | 'precommit'
  | 'fix:default-exports-bulk'
  | 'mcp:sync'
  | 'search:coverage:loc'
  | 'add:safe'
  | 'remove:safe'
  | 'proton-inject'
  | 'proton-session-env'
  | 'cloudflare-token-probe'
  | 'deps:rate-removal'
  | 'ops:limits:lab:profile'
  | 'concepts:bake'
  | 'bake:install-hygiene'
  | 'registry:projects'
  | 'vault:gap:close'
  | 'release'
  | 'test:inventory'
  | 'search:status:unified:strict'
  | 'concept:archive'
  | 'hygiene'
  | 'secrets:migrate'
  | 'ci:core'
  | 'build:defines'
  | 'check:bun-pm-cache'
  | 'concept:registry:sync'
  | 'console-format:bake'
  | 'cli:allowlist:plan'
  | 'check:bun-defaults'
  | 'portal:theme:sync'
  | 'ops:experiments'
  | 'docs:api-verify'
  | 'ops:postgres-probe'
  | 'docs:native:preview'
  | 'github-issue-taxonomy:bake'
  | 'surface-coverage:map'
  | 'vault:resolve'
  | 'telegram:all-accounting'
  | 'check:etag'
  | 'bun:types-changelog'
  | 'cloudflare:publish'
  | 'brand:coverage'
  | 'lib:area-maps:check'
  | 'policy:audit'
  | 'portal:css:build'
  | 'ops:anchor:scan'
  | 'ops:limits:seed-toc-bridge'
  | 'registry:snapshot'
  | 'proton:verify'
  | 'partner:settlement:import'
  | 'jurisdictions:docs'
  | 'ratchet'
  | 'failures:bake'
  | 'ops:reconcile'
  | 'verify:guides'
  | 'telegram:daily-report'
  | 'ops:migrate'
  | 'telegram:handshake:verify'
  | 'bun:utils-proof'
  | 'partner:settlement:cron:preview'
  | 'icons:generate'
  | 'reference:discover'
  | 'partner:deposit:import'
  | 'ops:diagnose'
  | 'sweep:domain'
  | 'portal:secret'
  | 'projects:roots:check'
  | 'partners:profiles:seed'
  | 'bun:channel:report'
  | 'partners:event-concepts:bake'
  | 'ops:loop:baseline'
  | 'pulse:once'
  | 'partner:health:bake'
  | 'brand:manifest'
  | 'bake:all'
  | 'cloudflare:access:token:validate'
  | 'portal:probe'
  | 'verify:cloudflare-token'
  | 'cloudflare:deploy'
  | 'glossary:portal'
  | 'factory:routes:test'
  | 'docs:release-index'
  | 'verify:tournament-glossary'
  | 'ops:outbox:requeue'
  | 'ops:compliance:report'
  | 'docs:reference-index'
  | 'telegram:link-chat'
  | 'bake:capabilities'
  | 'check:formdata'
  | 'docs:showcase'
  | 'partner:watch'
  | 'check:release-tracker'
  | 'cloudflare:preflight'
  | 'phone:add'
  | 'ssot:flow:soft'
  | 'telegram:all-accounting:create'
  | 'ops:dossier:seed'
  | 'partner:finance-report'
  | 'bun:types-inventory'
  | 'dod:pack'
  | 'sweep:domain:cron'
  | 'check:defaults'
  | 'docs:catalog'
  | 'telegram:verify'
  | 'baseline:apply-overrides'
  | 'baseline:caesars:probe'
  | 'lane:status'
  | 'bench:status'
  | 'glossary:verify'
  | 'bun:channel:cron:preview'
  | 'ops:settle'
  | 'portal:snapshot:cron:preview'
  | 'bake:bun-cli-reference'
  | 'sports:taxonomy'
  | 'registry:sync-index-r2'
  | 'bun:types-status'
  | 'bun:types-usage'
  | 'tennis:ssot:release:check'
  | 'ops:anchor:bake'
  | 'baseline:scrape-bet365'
  | 'telegram:all-accounting:bind'
  | 'bake:capabilities:update'
  | 'telegram:catalog:research'
  | 'registry:tags'
  | 'telegram:handshake:readiness'
  | 'portal:flags:check'
  | 'telegram:package-group:accounting'
  | 'tennis:partner-contracts:bake'
  | 'phone:sportsbook:add'
  | 'bun:types-ci'
  | 'lib:domains:check'
  | 'docs:feeds:migrate'
  | 'partner:health'
  | 'env:check'
  | 'telegram:catalog:apply-enhancements'
  | 'bun:types-inventory:tip-diff'
  | 'build:doc-index'
  | 'check:tsconfig-types'
  | 'verify:pages-edge'
  | 'docs:links:check'
  | 'partners:build'
  | 'cloudflare:access:edge:validate'
  | 'telegram:surfaces:audit'
  | 'wiki:coverage:check'
  | 'ops:book-reconcile'
  | 'telegram:handshake:desk'
  | 'bake:scrape-wire-taxonomy'
  | 'telegram:brand'
  | 'telegram:event-alerts'
  | 'telegram:handshake:invite-gap'
  | 'vault:cli'
  | 'ops:seed'
  | 'partner:vault:migrate'
  | 'threads:portfolio'
  | 'telegram:catalog:research:cron:preview'
  | 'ops:limits:lab'
  | 'mcp:cloudflare:probe'
  | 'brand:keymap'
  | 'snapshot:data-plane'
  | 'brand:baseline'
  | 'ops:loop:live'
  | 'tennis:agent-auth:bake'
  | 'brand:catalog'
  | 'docs:refresh'
  | 'telegram:ops:consume'
  | 'wiki:links:fix'
  | 'sync:well-known-mcp'
  | 'sync:main'
  | 'onboard:partner'
  | 'ops:coverage'
  | 'docs:map:check'
  | 'telegram:discover'
  | 'portal:flags:migrate'
  | 'partner:profiles:audit'
  | 'partner:health-check'
  | 'ops:prediction'
  | 'snapshot:live'
  | 'issues:audit'
  | 'ops:limits:seed-patterns'
  | 'ops:health-tick'
  | 'portal:optimize'
  | 'vault:health:bake'
  | 'concept:inventory'
  | 'bake:sportsbook-opening-baseline'
  | 'telegram:seat:out'
  | 'telegram:join-partner-forums'
  | 'agent'
  | 'telegram:seat:desk'
  | 'soft:accounting:bake'
  | 'docs:sync:integrated'
  | 'status:matrix'
  | 'cli:allowlist:coverage'
  | 'cli:allowlist:apply-registry'
  | 'cli:allowlist:wire'
  | 'verify:portal'
  | 'verify:docs-coverage'
  | 'verify:script-flags'
  | 'verify:proof-taxonomy'
  | 'verify:package-info'
  | 'verify:registry-client'
  | 'verify:install-platform'
  | 'verify:install-env'
  | 'verify:bun-runtime-nits'
  | 'machine:bunfig:ensure'
  | 'ops:seed:partners'
  | 'ops:seed:tenants'
  | 'ops:seed:dod'
  | 'ops:seed:prediction';

/**
 * Central allowlist registry — code SSOT (not env JSON, not bun-types).
 * CLIs should prefer applyUnknownLongOptionGuard(argv, ALLOWED_LONG_REGISTRY[name], …).
 */
export const ALLOWED_LONG_REGISTRY = {
  'lint-wires': LINT_WIRES_ALLOWED_LONG,
  'images:generate': IMAGES_GENERATE_ALLOWED_LONG,
  'ops:snapshot': OPS_SNAPSHOT_ALLOWED_LONG,
  'telegram:ops': TELEGRAM_OPS_ALLOWED_LONG,
  'partner:onboard': PARTNER_ONBOARD_ALLOWED_LONG,
  'bun:pr:verify': BUN_PR_VERIFY_ALLOWED_LONG,
  'bun:release-contracts': BUN_RELEASE_CONTRACTS_ALLOWED_LONG,
  'bun:release-knowledge': BUN_RELEASE_KNOWLEDGE_ALLOWED_LONG,
  screenshot: SCREENSHOT_ALLOWED_LONG,
  'bun:runtime-pin': BUN_RUNTIME_PIN_ALLOWED_LONG,
  'glossary:health': GLOSSARY_HEALTH_ALLOWED_LONG,
  'cloudflare:env:validate': CLOUDFLARE_ENV_VALIDATE_ALLOWED_LONG,
  'routing:registry-proof': ROUTING_REGISTRY_PROOF_ALLOWED_LONG,
  'ops:seed:toc': OPS_SEED_TOC_ALLOWED_LONG,
  'discovery:compose': DISCOVERY_COMPOSE_ALLOWED_LONG,
  'public:discovery': PUBLIC_DISCOVERY_ALLOWED_LONG,
  'schema:audit': SCHEMA_AUDIT_ALLOWED_LONG,
  'telegram:handshake:catalog': TELEGRAM_HANDSHAKE_CATALOG_ALLOWED_LONG,
  'concept:health': CONCEPT_HEALTH_ALLOWED_LONG,
  'ops:loop:gate-backfill': OPS_LOOP_GATE_BACKFILL_ALLOWED_LONG,
  'ops:limits:check': OPS_LIMITS_CHECK_ALLOWED_LONG,
  'identity:admin': IDENTITY_ADMIN_ALLOWED_LONG,
  'provision:queue': PROVISION_QUEUE_ALLOWED_LONG,
  'monorepo:health': MONOREPO_HEALTH_ALLOWED_LONG,
  'brand:status': BRAND_STATUS_ALLOWED_LONG,
  'docs:refid': DOCS_REFID_ALLOWED_LONG,
  'concept:audit': CONCEPT_AUDIT_ALLOWED_LONG,
  'concept:registry:graph': CONCEPT_REGISTRY_GRAPH_ALLOWED_LONG,
  'concept:discover': CONCEPT_DISCOVER_ALLOWED_LONG,
  'seat:desk': SEAT_DESK_ALLOWED_LONG,
  'packages:metafile-audit': PACKAGES_METAFILE_AUDIT_ALLOWED_LONG,
  'harness:violations': HARNESS_VIOLATIONS_ALLOWED_LONG,
  'portal:cli': PORTAL_CLI_ALLOWED_LONG,
  'bun:brand-map': BUN_BRAND_MAP_ALLOWED_LONG,
  'env:inventory': ENV_INVENTORY_ALLOWED_LONG,
  'check:import-graph': CHECK_IMPORT_GRAPH_ALLOWED_LONG,
  'check:console-format': CHECK_CONSOLE_FORMAT_ALLOWED_LONG,
  'concept:review': CONCEPT_REVIEW_ALLOWED_LONG,
  'concept:deprecate': CONCEPT_DEPRECATE_ALLOWED_LONG,
  'partner-surface-inventory:docs': PARTNER_SURFACE_INVENTORY_DOCS_ALLOWED_LONG,
  lint: LINT_ALLOWED_LONG,
  'bookmakers:migrate': BOOKMAKERS_MIGRATE_ALLOWED_LONG,
  'validate:workspaces': VALIDATE_WORKSPACES_ALLOWED_LONG,
  'affected:list': AFFECTED_LIST_ALLOWED_LONG,
  rules: RULES_ALLOWED_LONG,
  'partner-surface-inventory:lint-domains': PARTNER_SURFACE_INVENTORY_LINT_DOMAINS_ALLOWED_LONG,
  'search:bench:gate': SEARCH_BENCH_GATE_ALLOWED_LONG,
  'ci:bun:check': CI_BUN_CHECK_ALLOWED_LONG,
  'workspace-taxonomy:bake': WORKSPACE_TAXONOMY_BAKE_ALLOWED_LONG,
  'check:package-scripts': CHECK_PACKAGE_SCRIPTS_ALLOWED_LONG,
  'bookmakers:desk-coverage': BOOKMAKERS_DESK_COVERAGE_ALLOWED_LONG,
  help: HELP_ALLOWED_LONG,
  'partners:event': PARTNERS_EVENT_ALLOWED_LONG,
  'install:cache:lifecycle': INSTALL_CACHE_LIFECYCLE_ALLOWED_LONG,
  'search:policy:check': SEARCH_POLICY_CHECK_ALLOWED_LONG,
  'bunfig:bake': BUNFIG_BAKE_ALLOWED_LONG,
  'concept:propose': CONCEPT_PROPOSE_ALLOWED_LONG,
  'ci:harness': CI_HARNESS_ALLOWED_LONG,
  'bookmakers:prepare-publish': BOOKMAKERS_PREPARE_PUBLISH_ALLOWED_LONG,
  'partner-profile:coverage:bake': PARTNER_PROFILE_COVERAGE_BAKE_ALLOWED_LONG,
  'partner:dashboard:bake': PARTNER_DASHBOARD_BAKE_ALLOWED_LONG,
  'partner:dashboard:refresh': PARTNER_DASHBOARD_REFRESH_ALLOWED_LONG,
  'sports-terminal:health:refresh': SPORTS_TERMINAL_HEALTH_REFRESH_ALLOWED_LONG,
  'concept:registry:serve': CONCEPT_REGISTRY_SERVE_ALLOWED_LONG,
  'install:verify': INSTALL_VERIFY_ALLOWED_LONG,
  'search:domain:doctor': SEARCH_DOMAIN_DOCTOR_ALLOWED_LONG,
  'install:all': INSTALL_ALL_ALLOWED_LONG,
  'brand:bench:profile': BRAND_BENCH_PROFILE_ALLOWED_LONG,
  'fix:empty-catches': FIX_EMPTY_CATCHES_ALLOWED_LONG,
  'lint:money-sql:staged': LINT_MONEY_SQL_STAGED_ALLOWED_LONG,
  'tennis:board:bake': TENNIS_BOARD_BAKE_ALLOWED_LONG,
  'check:invisible-chars': CHECK_INVISIBLE_CHARS_ALLOWED_LONG,
  'search:bench:baseline:verify': SEARCH_BENCH_BASELINE_VERIFY_ALLOWED_LONG,
  'project:online:check': PROJECT_ONLINE_CHECK_ALLOWED_LONG,
  'packages:list': PACKAGES_LIST_ALLOWED_LONG,
  'surfaces:bake': SURFACES_BAKE_ALLOWED_LONG,
  'search:bench:dashboard': SEARCH_BENCH_DASHBOARD_ALLOWED_LONG,
  'concept:registry:usage-sync': CONCEPT_REGISTRY_USAGE_SYNC_ALLOWED_LONG,
  'brand:bench:evaluate': BRAND_BENCH_EVALUATE_ALLOWED_LONG,
  'check:harness-complexity': CHECK_HARNESS_COMPLEXITY_ALLOWED_LONG,
  'search:smart': SEARCH_SMART_ALLOWED_LONG,
  'validate:concept-metadata': VALIDATE_CONCEPT_METADATA_ALLOWED_LONG,
  'decision:evidence:verify': DECISION_EVIDENCE_VERIFY_ALLOWED_LONG,
  'validate:surface-coverage': VALIDATE_SURFACE_COVERAGE_ALLOWED_LONG,
  'bun:brand-map:baseline:ratchet': BUN_BRAND_MAP_BASELINE_RATCHET_ALLOWED_LONG,
  'portal:doctor:ci:report': PORTAL_DOCTOR_CI_REPORT_ALLOWED_LONG,
  'concept:serve': CONCEPT_SERVE_ALLOWED_LONG,
  'concept:domain:list': CONCEPT_DOMAIN_LIST_ALLOWED_LONG,
  'gate-map:validate': GATE_MAP_VALIDATE_ALLOWED_LONG,
  'search:bench:snapshot:core:wide:local': SEARCH_BENCH_SNAPSHOT_CORE_WIDE_LOCAL_ALLOWED_LONG,
  'inventory:wrappers': INVENTORY_WRAPPERS_ALLOWED_LONG,
  'gate-report:monorepo': GATE_REPORT_MONOREPO_ALLOWED_LONG,
  promote: PROMOTE_ALLOWED_LONG,
  'serve:public': SERVE_PUBLIC_ALLOWED_LONG,
  'bun:remediation': BUN_REMEDIATION_ALLOWED_LONG,
  'registry:doctor': REGISTRY_DOCTOR_ALLOWED_LONG,
  'packages:docs-index': PACKAGES_DOCS_INDEX_ALLOWED_LONG,
  'partner:dashboard-plan:validate': PARTNER_DASHBOARD_PLAN_VALIDATE_ALLOWED_LONG,
  'bun-migrate': BUN_MIGRATE_ALLOWED_LONG,
  'test:changed': TEST_CHANGED_ALLOWED_LONG,
  'concept:domain:backfill': CONCEPT_DOMAIN_BACKFILL_ALLOWED_LONG,
  'bookmakers:bake': BOOKMAKERS_BAKE_ALLOWED_LONG,
  'brand:bench:run': BRAND_BENCH_RUN_ALLOWED_LONG,
  'precommit:ast-grep': PRECOMMIT_AST_GREP_ALLOWED_LONG,
  'harness:report': HARNESS_REPORT_ALLOWED_LONG,
  'concept:history': CONCEPT_HISTORY_ALLOWED_LONG,
  'check:monorepo-health': CHECK_MONOREPO_HEALTH_ALLOWED_LONG,
  'partner-surface-inventory:bake': PARTNER_SURFACE_INVENTORY_BAKE_ALLOWED_LONG,
  'search:bench': SEARCH_BENCH_ALLOWED_LONG,
  'fix:as-any': FIX_AS_ANY_ALLOWED_LONG,
  'skills:validate': SKILLS_VALIDATE_ALLOWED_LONG,
  'concept:domain:stats': CONCEPT_DOMAIN_STATS_ALLOWED_LONG,
  'bake:doctor': BAKE_DOCTOR_ALLOWED_LONG,
  'validate:integrity': VALIDATE_INTEGRITY_ALLOWED_LONG,
  'concept:graph': CONCEPT_GRAPH_ALLOWED_LONG,
  'proton:partner:provision': PROTON_PARTNER_PROVISION_ALLOWED_LONG,
  'fix:pin-versions': FIX_PIN_VERSIONS_ALLOWED_LONG,
  'partner:money:migrate': PARTNER_MONEY_MIGRATE_ALLOWED_LONG,
  'concept:health:weekly': CONCEPT_HEALTH_WEEKLY_ALLOWED_LONG,
  'deps:outdated': DEPS_OUTDATED_ALLOWED_LONG,
  precommit: PRECOMMIT_ALLOWED_LONG,
  'fix:default-exports-bulk': FIX_DEFAULT_EXPORTS_BULK_ALLOWED_LONG,
  'mcp:sync': MCP_SYNC_ALLOWED_LONG,
  'search:coverage:loc': SEARCH_COVERAGE_LOC_ALLOWED_LONG,
  'add:safe': ADD_SAFE_ALLOWED_LONG,
  'remove:safe': REMOVE_SAFE_ALLOWED_LONG,
  'proton-inject': PROTON_INJECT_ALLOWED_LONG,
  'proton-session-env': PROTON_SESSION_ENV_ALLOWED_LONG,
  'cloudflare-token-probe': CLOUDFLARE_TOKEN_PROBE_ALLOWED_LONG,
  'deps:rate-removal': DEPS_RATE_REMOVAL_ALLOWED_LONG,
  'ops:limits:lab:profile': OPS_LIMITS_LAB_PROFILE_ALLOWED_LONG,
  'concepts:bake': CONCEPTS_BAKE_ALLOWED_LONG,
  'bake:install-hygiene': BAKE_INSTALL_HYGIENE_ALLOWED_LONG,
  'registry:projects': REGISTRY_PROJECTS_ALLOWED_LONG,
  'vault:gap:close': VAULT_GAP_CLOSE_ALLOWED_LONG,
  release: RELEASE_ALLOWED_LONG,
  'test:inventory': TEST_INVENTORY_ALLOWED_LONG,
  'search:status:unified:strict': SEARCH_STATUS_UNIFIED_STRICT_ALLOWED_LONG,
  'concept:archive': CONCEPT_ARCHIVE_ALLOWED_LONG,
  hygiene: HYGIENE_ALLOWED_LONG,
  'secrets:migrate': SECRETS_MIGRATE_ALLOWED_LONG,
  'ci:core': CI_CORE_ALLOWED_LONG,
  'build:defines': BUILD_DEFINES_ALLOWED_LONG,
  'check:bun-pm-cache': CHECK_BUN_PM_CACHE_ALLOWED_LONG,
  'concept:registry:sync': CONCEPT_REGISTRY_SYNC_ALLOWED_LONG,
  'console-format:bake': CONSOLE_FORMAT_BAKE_ALLOWED_LONG,
  'cli:allowlist:plan': CLI_ALLOWLIST_PLAN_ALLOWED_LONG,
  'check:bun-defaults': CHECK_BUN_DEFAULTS_ALLOWED_LONG,
  'portal:theme:sync': PORTAL_THEME_SYNC_ALLOWED_LONG,
  'ops:experiments': OPS_EXPERIMENTS_ALLOWED_LONG,
  'docs:api-verify': DOCS_API_VERIFY_ALLOWED_LONG,
  'ops:postgres-probe': OPS_POSTGRES_PROBE_ALLOWED_LONG,
  'docs:native:preview': DOCS_NATIVE_PREVIEW_ALLOWED_LONG,
  'github-issue-taxonomy:bake': GITHUB_ISSUE_TAXONOMY_BAKE_ALLOWED_LONG,
  'surface-coverage:map': SURFACE_COVERAGE_MAP_ALLOWED_LONG,
  'vault:resolve': VAULT_RESOLVE_ALLOWED_LONG,
  'telegram:all-accounting': TELEGRAM_ALL_ACCOUNTING_ALLOWED_LONG,
  'check:etag': CHECK_ETAG_ALLOWED_LONG,
  'bun:types-changelog': BUN_TYPES_CHANGELOG_ALLOWED_LONG,
  'cloudflare:publish': CLOUDFLARE_PUBLISH_ALLOWED_LONG,
  'brand:coverage': BRAND_COVERAGE_ALLOWED_LONG,
  'lib:area-maps:check': LIB_AREA_MAPS_CHECK_ALLOWED_LONG,
  'policy:audit': POLICY_AUDIT_ALLOWED_LONG,
  'portal:css:build': PORTAL_CSS_BUILD_ALLOWED_LONG,
  'ops:anchor:scan': OPS_ANCHOR_SCAN_ALLOWED_LONG,
  'ops:limits:seed-toc-bridge': OPS_LIMITS_SEED_TOC_BRIDGE_ALLOWED_LONG,
  'registry:snapshot': REGISTRY_SNAPSHOT_ALLOWED_LONG,
  'proton:verify': PROTON_VERIFY_ALLOWED_LONG,
  'partner:settlement:import': PARTNER_SETTLEMENT_IMPORT_ALLOWED_LONG,
  'jurisdictions:docs': JURISDICTIONS_DOCS_ALLOWED_LONG,
  ratchet: RATCHET_ALLOWED_LONG,
  'failures:bake': FAILURES_BAKE_ALLOWED_LONG,
  'ops:reconcile': OPS_RECONCILE_ALLOWED_LONG,
  'verify:guides': VERIFY_GUIDES_ALLOWED_LONG,
  'telegram:daily-report': TELEGRAM_DAILY_REPORT_ALLOWED_LONG,
  'ops:migrate': OPS_MIGRATE_ALLOWED_LONG,
  'telegram:handshake:verify': TELEGRAM_HANDSHAKE_VERIFY_ALLOWED_LONG,
  'bun:utils-proof': BUN_UTILS_PROOF_ALLOWED_LONG,
  'partner:settlement:cron:preview': PARTNER_SETTLEMENT_CRON_PREVIEW_ALLOWED_LONG,
  'icons:generate': ICONS_GENERATE_ALLOWED_LONG,
  'reference:discover': REFERENCE_DISCOVER_ALLOWED_LONG,
  'partner:deposit:import': PARTNER_DEPOSIT_IMPORT_ALLOWED_LONG,
  'ops:diagnose': OPS_DIAGNOSE_ALLOWED_LONG,
  'sweep:domain': SWEEP_DOMAIN_ALLOWED_LONG,
  'portal:secret': PORTAL_SECRET_ALLOWED_LONG,
  'projects:roots:check': PROJECTS_ROOTS_CHECK_ALLOWED_LONG,
  'partners:profiles:seed': PARTNERS_PROFILES_SEED_ALLOWED_LONG,
  'bun:channel:report': BUN_CHANNEL_REPORT_ALLOWED_LONG,
  'partners:event-concepts:bake': PARTNERS_EVENT_CONCEPTS_BAKE_ALLOWED_LONG,
  'ops:loop:baseline': OPS_LOOP_BASELINE_ALLOWED_LONG,
  'pulse:once': PULSE_ONCE_ALLOWED_LONG,
  'partner:health:bake': PARTNER_HEALTH_BAKE_ALLOWED_LONG,
  'brand:manifest': BRAND_MANIFEST_ALLOWED_LONG,
  'bake:all': BAKE_ALL_ALLOWED_LONG,
  'cloudflare:access:token:validate': CLOUDFLARE_ACCESS_TOKEN_VALIDATE_ALLOWED_LONG,
  'portal:probe': PORTAL_PROBE_ALLOWED_LONG,
  'verify:cloudflare-token': VERIFY_CLOUDFLARE_TOKEN_ALLOWED_LONG,
  'cloudflare:deploy': CLOUDFLARE_DEPLOY_ALLOWED_LONG,
  'glossary:portal': GLOSSARY_PORTAL_ALLOWED_LONG,
  'factory:routes:test': FACTORY_ROUTES_TEST_ALLOWED_LONG,
  'docs:release-index': DOCS_RELEASE_INDEX_ALLOWED_LONG,
  'verify:tournament-glossary': VERIFY_TOURNAMENT_GLOSSARY_ALLOWED_LONG,
  'ops:outbox:requeue': OPS_OUTBOX_REQUEUE_ALLOWED_LONG,
  'ops:compliance:report': OPS_COMPLIANCE_REPORT_ALLOWED_LONG,
  'docs:reference-index': DOCS_REFERENCE_INDEX_ALLOWED_LONG,
  'telegram:link-chat': TELEGRAM_LINK_CHAT_ALLOWED_LONG,
  'bake:capabilities': BAKE_CAPABILITIES_ALLOWED_LONG,
  'check:formdata': CHECK_FORMDATA_ALLOWED_LONG,
  'docs:showcase': DOCS_SHOWCASE_ALLOWED_LONG,
  'partner:watch': PARTNER_WATCH_ALLOWED_LONG,
  'check:release-tracker': CHECK_RELEASE_TRACKER_ALLOWED_LONG,
  'cloudflare:preflight': CLOUDFLARE_PREFLIGHT_ALLOWED_LONG,
  'phone:add': PHONE_ADD_ALLOWED_LONG,
  'ssot:flow:soft': SSOT_FLOW_SOFT_ALLOWED_LONG,
  'telegram:all-accounting:create': TELEGRAM_ALL_ACCOUNTING_CREATE_ALLOWED_LONG,
  'ops:dossier:seed': OPS_DOSSIER_SEED_ALLOWED_LONG,
  'partner:finance-report': PARTNER_FINANCE_REPORT_ALLOWED_LONG,
  'bun:types-inventory': BUN_TYPES_INVENTORY_ALLOWED_LONG,
  'dod:pack': DOD_PACK_ALLOWED_LONG,
  'sweep:domain:cron': SWEEP_DOMAIN_CRON_ALLOWED_LONG,
  'check:defaults': CHECK_DEFAULTS_ALLOWED_LONG,
  'docs:catalog': DOCS_CATALOG_ALLOWED_LONG,
  'telegram:verify': TELEGRAM_VERIFY_ALLOWED_LONG,
  'baseline:apply-overrides': BASELINE_APPLY_OVERRIDES_ALLOWED_LONG,
  'baseline:caesars:probe': BASELINE_CAESARS_PROBE_ALLOWED_LONG,
  'lane:status': LANE_STATUS_ALLOWED_LONG,
  'bench:status': BENCH_STATUS_ALLOWED_LONG,
  'glossary:verify': GLOSSARY_VERIFY_ALLOWED_LONG,
  'bun:channel:cron:preview': BUN_CHANNEL_CRON_PREVIEW_ALLOWED_LONG,
  'ops:settle': OPS_SETTLE_ALLOWED_LONG,
  'portal:snapshot:cron:preview': PORTAL_SNAPSHOT_CRON_PREVIEW_ALLOWED_LONG,
  'bake:bun-cli-reference': BAKE_BUN_CLI_REFERENCE_ALLOWED_LONG,
  'sports:taxonomy': SPORTS_TAXONOMY_ALLOWED_LONG,
  'registry:sync-index-r2': REGISTRY_SYNC_INDEX_R2_ALLOWED_LONG,
  'bun:types-status': BUN_TYPES_STATUS_ALLOWED_LONG,
  'bun:types-usage': BUN_TYPES_USAGE_ALLOWED_LONG,
  'tennis:ssot:release:check': TENNIS_SSOT_RELEASE_CHECK_ALLOWED_LONG,
  'ops:anchor:bake': OPS_ANCHOR_BAKE_ALLOWED_LONG,
  'baseline:scrape-bet365': BASELINE_SCRAPE_BET365_ALLOWED_LONG,
  'telegram:all-accounting:bind': TELEGRAM_ALL_ACCOUNTING_BIND_ALLOWED_LONG,
  'bake:capabilities:update': BAKE_CAPABILITIES_UPDATE_ALLOWED_LONG,
  'telegram:catalog:research': TELEGRAM_CATALOG_RESEARCH_ALLOWED_LONG,
  'registry:tags': REGISTRY_TAGS_ALLOWED_LONG,
  'telegram:handshake:readiness': TELEGRAM_HANDSHAKE_READINESS_ALLOWED_LONG,
  'portal:flags:check': PORTAL_FLAGS_CHECK_ALLOWED_LONG,
  'telegram:package-group:accounting': TELEGRAM_PACKAGE_GROUP_ACCOUNTING_ALLOWED_LONG,
  'tennis:partner-contracts:bake': TENNIS_PARTNER_CONTRACTS_BAKE_ALLOWED_LONG,
  'phone:sportsbook:add': PHONE_SPORTSBOOK_ADD_ALLOWED_LONG,
  'bun:types-ci': BUN_TYPES_CI_ALLOWED_LONG,
  'lib:domains:check': LIB_DOMAINS_CHECK_ALLOWED_LONG,
  'docs:feeds:migrate': DOCS_FEEDS_MIGRATE_ALLOWED_LONG,
  'partner:health': PARTNER_HEALTH_ALLOWED_LONG,
  'env:check': ENV_CHECK_ALLOWED_LONG,
  'telegram:catalog:apply-enhancements': TELEGRAM_CATALOG_APPLY_ENHANCEMENTS_ALLOWED_LONG,
  'bun:types-inventory:tip-diff': BUN_TYPES_INVENTORY_TIP_DIFF_ALLOWED_LONG,
  'build:doc-index': BUILD_DOC_INDEX_ALLOWED_LONG,
  'check:tsconfig-types': CHECK_TSCONFIG_TYPES_ALLOWED_LONG,
  'verify:pages-edge': VERIFY_PAGES_EDGE_ALLOWED_LONG,
  'docs:links:check': DOCS_LINKS_CHECK_ALLOWED_LONG,
  'partners:build': PARTNERS_BUILD_ALLOWED_LONG,
  'cloudflare:access:edge:validate': CLOUDFLARE_ACCESS_EDGE_VALIDATE_ALLOWED_LONG,
  'telegram:surfaces:audit': TELEGRAM_SURFACES_AUDIT_ALLOWED_LONG,
  'wiki:coverage:check': WIKI_COVERAGE_CHECK_ALLOWED_LONG,
  'ops:book-reconcile': OPS_BOOK_RECONCILE_ALLOWED_LONG,
  'telegram:handshake:desk': TELEGRAM_HANDSHAKE_DESK_ALLOWED_LONG,
  'bake:scrape-wire-taxonomy': BAKE_SCRAPE_WIRE_TAXONOMY_ALLOWED_LONG,
  'telegram:brand': TELEGRAM_BRAND_ALLOWED_LONG,
  'telegram:event-alerts': TELEGRAM_EVENT_ALERTS_ALLOWED_LONG,
  'telegram:handshake:invite-gap': TELEGRAM_HANDSHAKE_INVITE_GAP_ALLOWED_LONG,
  'vault:cli': VAULT_CLI_ALLOWED_LONG,
  'ops:seed': OPS_SEED_ALLOWED_LONG,
  'partner:vault:migrate': PARTNER_VAULT_MIGRATE_ALLOWED_LONG,
  'threads:portfolio': THREADS_PORTFOLIO_ALLOWED_LONG,
  'telegram:catalog:research:cron:preview': TELEGRAM_CATALOG_RESEARCH_CRON_PREVIEW_ALLOWED_LONG,
  'ops:limits:lab': OPS_LIMITS_LAB_ALLOWED_LONG,
  'mcp:cloudflare:probe': MCP_CLOUDFLARE_PROBE_ALLOWED_LONG,
  'brand:keymap': BRAND_KEYMAP_ALLOWED_LONG,
  'snapshot:data-plane': SNAPSHOT_DATA_PLANE_ALLOWED_LONG,
  'brand:baseline': BRAND_BASELINE_ALLOWED_LONG,
  'ops:loop:live': OPS_LOOP_LIVE_ALLOWED_LONG,
  'tennis:agent-auth:bake': TENNIS_AGENT_AUTH_BAKE_ALLOWED_LONG,
  'brand:catalog': BRAND_CATALOG_ALLOWED_LONG,
  'docs:refresh': DOCS_REFRESH_ALLOWED_LONG,
  'telegram:ops:consume': TELEGRAM_OPS_CONSUME_ALLOWED_LONG,
  'wiki:links:fix': WIKI_LINKS_FIX_ALLOWED_LONG,
  'sync:well-known-mcp': SYNC_WELL_KNOWN_MCP_ALLOWED_LONG,
  'sync:main': SYNC_MAIN_ALLOWED_LONG,
  'onboard:partner': ONBOARD_PARTNER_ALLOWED_LONG,
  'ops:coverage': OPS_COVERAGE_ALLOWED_LONG,
  'docs:map:check': DOCS_MAP_CHECK_ALLOWED_LONG,
  'telegram:discover': TELEGRAM_DISCOVER_ALLOWED_LONG,
  'portal:flags:migrate': PORTAL_FLAGS_MIGRATE_ALLOWED_LONG,
  'partner:profiles:audit': PARTNER_PROFILES_AUDIT_ALLOWED_LONG,
  'partner:health-check': PARTNER_HEALTH_CHECK_ALLOWED_LONG,
  'ops:prediction': OPS_PREDICTION_ALLOWED_LONG,
  'snapshot:live': SNAPSHOT_LIVE_ALLOWED_LONG,
  'issues:audit': ISSUES_AUDIT_ALLOWED_LONG,
  'ops:limits:seed-patterns': OPS_LIMITS_SEED_PATTERNS_ALLOWED_LONG,
  'ops:health-tick': OPS_HEALTH_TICK_ALLOWED_LONG,
  'portal:optimize': PORTAL_OPTIMIZE_ALLOWED_LONG,
  'vault:health:bake': VAULT_HEALTH_BAKE_ALLOWED_LONG,
  'concept:inventory': CONCEPT_INVENTORY_ALLOWED_LONG,
  'bake:sportsbook-opening-baseline': BAKE_SPORTSBOOK_OPENING_BASELINE_ALLOWED_LONG,
  'telegram:seat:out': TELEGRAM_SEAT_OUT_ALLOWED_LONG,
  'telegram:join-partner-forums': TELEGRAM_JOIN_PARTNER_FORUMS_ALLOWED_LONG,
  agent: AGENT_ALLOWED_LONG,
  'telegram:seat:desk': TELEGRAM_SEAT_DESK_ALLOWED_LONG,
  'soft:accounting:bake': SOFT_ACCOUNTING_BAKE_ALLOWED_LONG,
  'docs:sync:integrated': DOCS_SYNC_INTEGRATED_ALLOWED_LONG,
  'status:matrix': STATUS_MATRIX_ALLOWED_LONG,
  'cli:allowlist:coverage': CLI_ALLOWLIST_COVERAGE_ALLOWED_LONG,
  'cli:allowlist:apply-registry': CLI_ALLOWLIST_APPLY_REGISTRY_ALLOWED_LONG,
  'cli:allowlist:wire': CLI_ALLOWLIST_WIRE_ALLOWED_LONG,
  'verify:portal': VERIFY_PORTAL_ALLOWED_LONG,
  'verify:docs-coverage': VERIFY_DOCS_COVERAGE_ALLOWED_LONG,
  'verify:script-flags': VERIFY_SCRIPT_FLAGS_ALLOWED_LONG,
  'verify:proof-taxonomy': VERIFY_PROOF_TAXONOMY_ALLOWED_LONG,
  'verify:package-info': VERIFY_PACKAGE_INFO_ALLOWED_LONG,
  'verify:registry-client': VERIFY_REGISTRY_CLIENT_ALLOWED_LONG,
  'verify:install-platform': VERIFY_INSTALL_PLATFORM_ALLOWED_LONG,
  'verify:install-env': VERIFY_INSTALL_ENV_ALLOWED_LONG,
  'verify:bun-runtime-nits': VERIFY_BUN_RUNTIME_NITS_ALLOWED_LONG,
  'machine:bunfig:ensure': MACHINE_BUNFIG_ENSURE_ALLOWED_LONG,
  'ops:seed:partners': OPS_SEED_PARTNERS_ALLOWED_LONG,
  'ops:seed:tenants': OPS_SEED_TENANTS_ALLOWED_LONG,
  'ops:seed:dod': OPS_SEED_DOD_ALLOWED_LONG,
  'ops:seed:prediction': OPS_SEED_PREDICTION_ALLOWED_LONG,
} as const satisfies Record<AllowedLongCliName, readonly string[]>;

/** Apply guard using ALLOWED_LONG_REGISTRY[cliName]. */
export function applyUnknownLongOptionGuardFor(
  cliName: AllowedLongCliName,
  argv: readonly string[],
  opts?: { env?: { [key: string]: string | undefined }; onFail?: 'exit' | 'throw' }
): string[] {
  return applyUnknownLongOptionGuard(argv, ALLOWED_LONG_REGISTRY[cliName], {
    cliName,
    env: opts?.env,
    onFail: opts?.onFail,
  });
}
