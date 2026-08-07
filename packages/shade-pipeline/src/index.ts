/**
 * `@factorywager/shade-pipeline` — workspace extract target for the normalized
 * odds / shade engine (#284).
 *
 * This package is intentionally a **scaffold**: domain symbols
 * (`normalizeOdds`, `sportMapping`, `rotationResolver`) live in the nested
 * `bet-ticker-worker-v1.1` product (gitignored nested-park) and must be
 * extracted from that tree — not invented here.
 *
 * Consumers (bet-ticker · cascade-mover · registry) wire `"workspace:*"` only
 * after `implementation_status` advances past `scaffold-pending-extract`.
 */

export const SHADE_PIPELINE_PACKAGE_TARGET = {
  target_name: '@factorywager/shade-pipeline',
  target_workspace: 'packages/shade-pipeline',
  /** Domain extract blocked on nested bet-ticker checkout + ADR 0009. */
  implementation_status: 'scaffold-pending-extract',
  /** Issue tracking Phase 1.1 D1→R2 + extract. */
  tracker_issue: 284,
  /** Nested product path (own remote; not present in all checkouts). */
  nested_product: 'projects/active/enterprise/bet-ticker-worker-v1.1',
  /** Planned extract symbols — do not forge implementations until source lands. */
  pending_extract_symbols: ['normalizeOdds', 'sportMapping', 'rotationResolver'] as const,
} as const;

export type ShadePipelinePackageTarget = typeof SHADE_PIPELINE_PACKAGE_TARGET;
