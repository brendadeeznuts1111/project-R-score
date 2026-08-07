// @see https://bun.com/docs/pm/filter#package-name-filter-pattern — --filter
// @see https://bun.com/docs/runtime/file-io — Bun.file (consumers)
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
 */
import { hrefFromRefId, type ToolFlagRef } from './ref-id.ts';

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

/** §4.1 — lint-wires (`scripts/validate-wire-traps.ts`) */
export const LINT_WIRES_DOC = 'docs/design/partner-surface-inventory.md' as const;
export const LINT_WIRES_SECTION = '4.1' as const;
export const LINT_WIRES_LEAVES = ['help', 'scan', 'why', 'document', 'strict-globs'] as const;
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
