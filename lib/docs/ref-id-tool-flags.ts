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

/** §4.1 — lint-wires (`scripts/validate-wire-traps.ts`) */
export const LINT_WIRES_DOC = 'docs/design/partner-surface-inventory.md' as const;
export const LINT_WIRES_SECTION = '4.1' as const;
export const LINT_WIRES_LEAVES = ['help', 'scan', 'why', 'document', 'strict-globs'] as const;
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
export function imagesGenerateToolFlags(): ToolFlagRef[] {
  return toolFlagsAt(
    IMAGES_GENERATE_SECTION,
    ['source', 'out', 'size', 'format', 'quality', 'fit', 'max-pixels', 'json', 'dry-run'],
    'scripts/images-generate.ts'
  );
}

/** §1.1 — ops:snapshot seed block (`tools/ops-snapshot.ts`) */
export const OPS_SNAPSHOT_DOC = 'docs/harness/tenants/ops-snapshot.md' as const;
export const OPS_SNAPSHOT_SECTION = '1.1' as const;
export function opsSnapshotToolFlags(): ToolFlagRef[] {
  return toolFlagsAt(
    OPS_SNAPSHOT_SECTION,
    ['default', 'seed', 'seed-force', 'seed-tenants', 'no-seed'],
    'tools/ops-snapshot.ts'
  );
}

/** §1.1 — telegram:ops link-package-group (`tools/telegram-ops.ts`) */
export const TELEGRAM_OPS_DOC = 'docs/harness/tenants/partner-package-group-handshake.md' as const;
export const TELEGRAM_OPS_SECTION = '1.1' as const;
export const TELEGRAM_OPS_LEAVES = ['invite', 'no-dm', 'no-ack', 'requested-by'] as const;
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
