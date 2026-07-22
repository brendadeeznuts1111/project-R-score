// lib/docs/index.ts — Documentation path SSOT re-exports

export {
  CANONICAL_REPO_DOCS,
  CANONICAL_HARNESS,
  CANONICAL_TOOLS,
  CANONICAL_DOC_ROLES,
  CANONICAL_REMOTES,
  CANONICAL_EXTERNAL,
  type CanonicalRepoDocKey,
  type CanonicalHarnessKey,
} from './repo-docs';

export {
  BUNDLER_NAV_GROUPS,
  BUNDLER_NAV_LEAVES,
  bundlerDocUrl,
  bundlerNavCanonicalRefs,
  bundlerNavConceptOnlyKeys,
  bundlerNavGroupLanding,
  formatBundlerNavMarkdown,
  formatBundlerNavTree,
  type BundlerNavGroup,
  type BundlerNavLeaf,
} from './bundler-nav';

export {
  catalogMissingRefCount,
  computeBundlerGaps,
  computeBundlerTokenRows,
  formatBundlerAnchorsReport,
  formatBundlerGapsText,
  isHighSignalAnchor,
  tokenForAnchor,
  type BundlerGap,
  type BundlerGapKind,
  type BundlerTokenRow,
} from './bundler-gaps';
