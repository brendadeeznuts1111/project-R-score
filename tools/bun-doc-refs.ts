#!/usr/bin/env bun
// @see https://bun.com/reference/globals/CompressionStream — CompressionStream
// @see https://bun.com/reference/globals/DecompressionStream — DecompressionStream
// @see https://bun.com/reference/globals/TextEncoderStream — TextEncoderStream
// @see https://bun.com/reference/globals/TextDecoderStream — TextDecoderStream
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve routes
// @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname — Bun.serve port
// @see https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname — Bun.serve hostname
// @see https://bun.com/docs/runtime/http/server#configuring-a-default-port — --port
// @see https://bun.com/docs/runtime/http/server#unix-domain-sockets — Bun.serve unix
// @see https://bun.com/docs/runtime/http/server#benchmarks — Bun.serve benchmarks
// @see https://bun.com/docs/runtime/networking/fetch#sending-an-http-request — Bun.fetch
// @see https://bun.com/docs/runtime/networking/fetch#preconnect-at-startup — --fetch-preconnect
// @see https://bun.com/docs/runtime/html-rewriter — HTMLRewriter
// @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — URLPattern
// @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — URLPatternInit
// @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — URLPatternResult
/**
 * bun-doc-refs.ts — canonical Bun documentation reference tool.
 *
 * Single source of truth for canonical Bun doc URLs used across the repo.
 * Use it to keep @see links accurate and to find files that use Bun APIs
 * without a doc reference.
 *
 * Usage:
 *   bun tools/bun-doc-refs.ts url <ApiName>      # print canonical URL for a Bun API
 *   bun tools/bun-doc-refs.ts token <token>      # resolve CLI flag / env var / config key
 *   bun tools/bun-doc-refs.ts list               # print the whole reference map
 *   bun tools/bun-doc-refs.ts catalog            # structured catalog (type/stability/pages)
 *   bun tools/bun-doc-refs.ts catalog --build    # rebuild tools/bun-docs-catalog.json
 *   bun tools/bun-doc-refs.ts suggest <q>        # Bun docs / BunToken suggest
 *   bun tools/bun-doc-refs.ts suggest --audit [--json] <q>  # FactoryWager audit SSOT
 *   bun tools/bun-doc-refs.ts index-audit                   # rebuild tools/audit-catalog.json
 *   bun tools/bun-doc-refs.ts check [paths...]   # find Bun API usages lacking a @see link
 *   bun tools/bun-doc-refs.ts validate [paths..] # HTTP-check all bun.com/github doc links
 *   bun tools/bun-doc-refs.ts integrity          # full stack gate (taxonomy·index·map·links)
 *   bun tools/bun-doc-refs.ts integrity --fix  # auto-heal taxonomy aliases, then re-check
 *   bun tools/bun-doc-refs.ts status             # operator dashboard (last run · index · Bun)
 *   bun tools/bun-doc-refs.ts schedule --once    # one integrity pass + JSONL log
 *   bun tools/bun-doc-refs.ts bundler            # print Bundler docs sidebar nav tree
 *   bun tools/bun-doc-refs.ts bundler --anchors  # each leaf + index anchors
 *   bun tools/bun-doc-refs.ts bundler --gaps     # high-signal uncovered report
 *   bun tools/bun-doc-refs.ts bundler --tokens   # catalog bundler join + hasRef
 *
 * Adding a new API reference? Add it to CANONICAL_REFS below — one place only.
 * Bundler sidebar leaves/groups: lib/docs/bundler-nav.ts (merged into CANONICAL_REFS).
 * Gap reports: lib/docs/bundler-gaps.ts
 * Structured catalog (type · stability · allPages): tools/bun-docs-catalog.ts
 * Audit findings (not BunToken): tools/audit-catalog.ts · lib/audit/
 * Operate runbook: docs/BUN_DOCS_OPERATE.md
 */

import {
  catalogMissingRefCount,
  computeBundlerGaps,
  computeBundlerTokenRows,
  formatBundlerAnchorsReport,
  formatBundlerGapsText,
  type BundlerGap,
} from '../lib/docs/bundler-gaps';
import {
  BUNDLER_NAV_GROUPS,
  bundlerNavCanonicalRefs,
  bundlerNavConceptOnlyKeys,
  formatBundlerNavTree,
  type BundlerNavGroup,
} from '../lib/docs/bundler-nav';
import { bunBlog, bunDocs, bunReference, mdnWebApi } from '../lib/docs/bun-site-url.ts';
import {
  BUN_REPOSITORY_URL,
  BUN_TYPES_SOURCE_URL,
  bunTypesVersionSourceUrl,
} from '../lib/docs/bun-source-links.ts';
import type { BunTokenKind, BunTokenStability } from '../lib/docs/bun-token.ts';
import type { VerificationSubsystem } from '../lib/verification/types.ts';
import { BUN_CONFIG_INSTALL_VARS } from './bun-install-env.ts';
import { getCuratedEntry } from './bun-docs-curated.ts';

/** @see https://bun.com/docs/pm/cli/install#cpu-and-os-flags */
const INSTALL_CPU_OS_FLAGS = bunDocs('pm/cli/install', 'cpu-and-os-flags');
/** @see https://bun.com/docs/pm/cli/install#platform-specific-dependencies */
const INSTALL_PLATFORM_DEPS = bunDocs('pm/cli/install', 'platform-specific-dependencies');
/** @see https://bun.com/docs/pm/cli/install#configuring-with-environment-variables */
const INSTALL_ENV_VARS = bunDocs('pm/cli/install', 'configuring-with-environment-variables');
/** @see https://bun.com/docs/pm/cli/install#cache */
const INSTALL_CACHE_DOCS = bunDocs('pm/cli/install', 'cache');

/** Token metadata shared by verification maps (url + BunToken + subsystem). */
export type CanonicalVerificationToken = {
  url: string;
  kind: BunTokenKind | 'SDK' | 'Global' | 'Meta' | 'Documentation' | 'Tooling';
  stability: BunTokenStability | 'stable';
  description?: string;
  subsystem?: VerificationSubsystem;
  introducedIn?: string;
};

const PM_TOKEN = {
  subsystem: 'package-manager' as const,
  introducedIn: 'all' as const,
};

/** Curated install platform tokens — url + BunToken metadata (canonical map SSOT). */
export const CANONICAL_INSTALL_PLATFORM_TOKENS: Record<string, CanonicalVerificationToken> = {
  'bun install --cpu': { url: INSTALL_CPU_OS_FLAGS, kind: 'CLI', stability: 'stable', ...PM_TOKEN },
  'bun install --os': { url: INSTALL_CPU_OS_FLAGS, kind: 'CLI', stability: 'stable', ...PM_TOKEN },
  '--cpu': { url: INSTALL_CPU_OS_FLAGS, kind: 'CLI', stability: 'stable', ...PM_TOKEN },
  '--os': { url: INSTALL_CPU_OS_FLAGS, kind: 'CLI', stability: 'stable', ...PM_TOKEN },
  'cpu-and-os-flags': { url: INSTALL_CPU_OS_FLAGS, kind: 'CLI', stability: 'stable', ...PM_TOKEN },
  'platform-specific dependencies': {
    url: INSTALL_PLATFORM_DEPS,
    kind: 'Concept',
    stability: 'stable',
    ...PM_TOKEN,
  },
  'bun install platform-specific dependencies': {
    url: INSTALL_PLATFORM_DEPS,
    kind: 'Concept',
    stability: 'stable',
    ...PM_TOKEN,
  },
  'platform-specific-dependencies': {
    url: INSTALL_PLATFORM_DEPS,
    kind: 'Concept',
    stability: 'stable',
    ...PM_TOKEN,
  },
};

const CANONICAL_INSTALL_PLATFORM_URLS = Object.fromEntries(
  Object.entries(CANONICAL_INSTALL_PLATFORM_TOKENS).map(([key, meta]) => [key, meta.url])
) as Record<string, string>;

/** Install env + mechanism tokens — BUN_CONFIG_* table and resolver behavior. */
export type CanonicalInstallEnvToken = CanonicalVerificationToken;

const BUN_CONFIG_ENV_TOKEN_ENTRIES = Object.fromEntries(
  BUN_CONFIG_INSTALL_VARS.map(v => [
    v.name,
    {
      url: INSTALL_ENV_VARS,
      kind: 'Env' as const,
      stability: 'stable' as const,
      description: v.description,
      ...PM_TOKEN,
    },
  ])
) as Record<(typeof BUN_CONFIG_INSTALL_VARS)[number]['name'], CanonicalInstallEnvToken>;

export const CANONICAL_INSTALL_ENV_TOKENS: Record<string, CanonicalInstallEnvToken> = {
  'BUN install environment variables': {
    url: INSTALL_ENV_VARS,
    kind: 'Concept',
    stability: 'stable',
    description: 'Environment variables take priority over bunfig.toml',
    ...PM_TOKEN,
  },
  'install env precedence': {
    url: INSTALL_ENV_VARS,
    kind: 'Concept',
    stability: 'stable',
    description: 'CLI flags → BUN_CONFIG_* → bunfig (project overlays machine)',
    ...PM_TOKEN,
  },
  ...BUN_CONFIG_ENV_TOKEN_ENTRIES,
  'install.scopes': {
    url: 'https://bun.com/docs/runtime/bunfig#install-registry',
    kind: 'Config',
    stability: 'stable',
    description: 'Scoped npm registry URLs — FactoryWager R2-backed registry via bunfig',
    ...PM_TOKEN,
  },
  'bun install cache mechanism': {
    url: INSTALL_CACHE_DOCS,
    kind: 'Concept',
    stability: 'stable',
    ...PM_TOKEN,
  },
};

const CANONICAL_INSTALL_ENV_URLS = Object.fromEntries(
  Object.entries(CANONICAL_INSTALL_ENV_TOKENS).map(([key, meta]) => [key, meta.url])
) as Record<string, string>;

/** Release-note blog anchors — versioned ship notes (runtime / pm by topic). */
export const CANONICAL_RELEASE_TOKENS: Record<string, CanonicalVerificationToken> = {
  'bun-image': {
    url: 'https://bun.com/blog/bun-v1.3.14#bun-image',
    kind: 'API',
    stability: 'stable',
    subsystem: 'runtime',
    introducedIn: '1.3.14',
    description: 'Bun.Image — built-in image processing',
  },
  'tls-getcacertificates-system': {
    url: 'https://bun.com/blog/bun-v1.3.14#tls-getcacertificates-system-now-works-without-use-system-ca',
    kind: 'API',
    stability: 'stable',
    subsystem: 'runtime',
    introducedIn: '1.3.14',
  },
  'event-loop-refactor': {
    url: 'https://bun.com/blog/bun-v1.3.14#event-loop-refactor',
    kind: 'Concept',
    stability: 'stable',
    subsystem: 'runtime',
    introducedIn: '1.3.14',
  },
  'global-virtual-store': {
    url: 'https://bun.com/blog/bun-v1.3.14#global-virtual-store',
    kind: 'Concept',
    stability: 'stable',
    subsystem: 'package-manager',
    introducedIn: '1.3.14',
  },
  'bun-terminal-pty': {
    url: 'https://bun.com/blog/bun-v1.3.5#bun-terminal-api-for-pseudo-terminal-pty-support',
    kind: 'API',
    stability: 'stable',
    subsystem: 'runtime',
    introducedIn: '1.3.5',
  },
  'compile-time-feature-flags': {
    url: 'https://bun.com/blog/bun-v1.3.5#compile-time-feature-flags-for-dead-code-elimination',
    kind: 'Concept',
    stability: 'stable',
    subsystem: 'bundler',
    introducedIn: '1.3.5',
  },
};

const CANONICAL_RELEASE_URLS = Object.fromEntries(
  Object.entries(CANONICAL_RELEASE_TOKENS).map(([key, meta]) => [key, meta.url])
) as Record<string, string>;

export type CanonicalRegistryClientToken = CanonicalVerificationToken & {
  kind: 'SDK';
  stability: 'stable';
};

const REGISTRY_CLIENT_DOC =
  'https://github.com/brendadeeznuts1111/project-R-score/blob/main/docs/registry-client.md';

const REGISTRY_CLIENT_TOKEN = {
  subsystem: 'package-manager' as const,
  introducedIn: 'all' as const,
};

export const CANONICAL_REGISTRY_CLIENT_TOKENS: Record<string, CanonicalRegistryClientToken> = {
  RegistryClient: {
    url: 'https://github.com/brendadeeznuts1111/project-R-score/blob/main/packages/registry-client/README.md',
    kind: 'SDK',
    stability: 'stable',
    description: 'Runtime-neutral FactoryWager registry read plane + publish SDK',
    ...REGISTRY_CLIENT_TOKEN,
  },
  'registry-client resolve': {
    url: `${REGISTRY_CLIENT_DOC}#resolve`,
    kind: 'SDK',
    stability: 'stable',
    description: 'resolve() — dist-tag to /registry/storage/…/artifact.tgz',
    ...REGISTRY_CLIENT_TOKEN,
  },
  'registry-client download': {
    url: `${REGISTRY_CLIENT_DOC}#download`,
    kind: 'SDK',
    stability: 'stable',
    description: 'download() — SHA-256 + size verification',
    ...REGISTRY_CLIENT_TOKEN,
  },
  'registry-client publish': {
    url: `${REGISTRY_CLIENT_DOC}#publish`,
    kind: 'SDK',
    stability: 'stable',
    description: 'publish() — authenticated multipart FormData',
    ...REGISTRY_CLIENT_TOKEN,
  },
};

export type RegistryClientToken = keyof typeof CANONICAL_REGISTRY_CLIENT_TOKENS;

const CANONICAL_REGISTRY_CLIENT_URLS = Object.fromEntries(
  Object.entries(CANONICAL_REGISTRY_CLIENT_TOKENS).map(([key, meta]) => [key, meta.url])
) as Record<string, string>;

const BUN_INSPECT_DOC = 'https://bun.com/docs/runtime/utils#bun-inspect';
const BUN_FILE_DOC = 'https://bun.com/docs/runtime/file-io#reading-files-bun-file';
const BUN_WRITE_DOC = 'https://bun.com/docs/runtime/file-io#writing-files-bun-write';
const RUNTIME_NITS_DOC =
  'https://github.com/brendadeeznuts1111/project-R-score/blob/main/docs/bun-runtime-nits.md';

export type CanonicalRuntimeNitsToken = CanonicalVerificationToken & {
  kind: BunTokenKind | 'Global' | 'Concept';
  stability: BunTokenStability;
};

const RUNTIME_NITS_TOKEN = {
  subsystem: 'runtime' as const,
  introducedIn: 'all' as const,
};

export const CANONICAL_RUNTIME_NITS_TOKENS: Record<string, CanonicalRuntimeNitsToken> = {
  'Bun.inspect.sorted': {
    url: BUN_INSPECT_DOC,
    kind: 'API',
    stability: 'stable',
    description: 'Bun.inspect sorted — deterministic key order for snapshots',
    ...RUNTIME_NITS_TOKEN,
  },
  'Bun.inspect.compact': {
    url: BUN_INSPECT_DOC,
    kind: 'API',
    stability: 'stable',
    description: 'Bun.inspect compact — single-line output',
    ...RUNTIME_NITS_TOKEN,
  },
  'inspect.showProxy': {
    url: 'https://bun.com/reference/bun/BunInspectOptions',
    kind: 'Global',
    stability: 'stable',
    description: 'showProxy — Proxy target/handler in inspect output',
    ...RUNTIME_NITS_TOKEN,
  },
  'inspect.getters': {
    url: 'https://bun.com/reference/bun/BunInspectOptions',
    kind: 'Global',
    stability: 'stable',
    description: 'getters — evaluate or suppress property getters',
    ...RUNTIME_NITS_TOKEN,
  },
  'inspect.numericSeparator': {
    url: 'https://bun.com/reference/bun/BunInspectOptions',
    kind: 'Global',
    stability: 'stable',
    description: 'numericSeparator — underscore separators in numbers (Node compat)',
    ...RUNTIME_NITS_TOKEN,
  },
  'util.inspect options': {
    url: 'https://nodejs.org/api/util.html#utilinspectobject-options',
    kind: 'Concept',
    stability: 'stable',
    description: 'Node util.inspect option delta vs BunInspectOptions',
    ...RUNTIME_NITS_TOKEN,
  },
  CompressionStream: {
    url: bunReference('globals/CompressionStream'),
    kind: 'Global',
    stability: 'stable',
    description: 'WHATWG gzip/deflate compression stream',
    ...RUNTIME_NITS_TOKEN,
  },
  DecompressionStream: {
    url: bunReference('globals/DecompressionStream'),
    kind: 'Global',
    stability: 'stable',
    description: 'WHATWG gzip/deflate decompression stream',
    ...RUNTIME_NITS_TOKEN,
  },
  TextEncoderStream: {
    url: bunReference('globals/TextEncoderStream'),
    kind: 'Global',
    stability: 'stable',
    description: 'Streaming string to Uint8Array',
    ...RUNTIME_NITS_TOKEN,
  },
  TextDecoderStream: {
    url: bunReference('globals/TextDecoderStream'),
    kind: 'Global',
    stability: 'stable',
    description: 'Streaming Uint8Array to string',
    ...RUNTIME_NITS_TOKEN,
  },
  'URL.origin': {
    url: bunReference('globals/URL/origin'),
    kind: 'Global',
    stability: 'stable',
    description: 'protocol + host + port',
    ...RUNTIME_NITS_TOKEN,
  },
  'URL.searchParams': {
    url: bunReference('globals/URL/searchParams'),
    kind: 'Global',
    stability: 'stable',
    description: 'Query parameter interface on URL',
    ...RUNTIME_NITS_TOKEN,
  },
  'bun.file.lazy-stat': {
    url: BUN_FILE_DOC,
    kind: 'API',
    stability: 'stable',
    description: 'Bun.file is lazy until .text/.bytes/.exists',
    ...RUNTIME_NITS_TOKEN,
  },
  'bun.write.auto-dir': {
    url: BUN_WRITE_DOC,
    kind: 'API',
    stability: 'stable',
    description: 'Bun.write creates parent directories',
    ...RUNTIME_NITS_TOKEN,
  },
  'bun.file.bytes-vs-buffer': {
    url: BUN_FILE_DOC,
    kind: 'API',
    stability: 'stable',
    description: 'Bun.file().bytes() matches fs read bytes',
    ...RUNTIME_NITS_TOKEN,
  },
  'bun-runtime-nits': {
    url: RUNTIME_NITS_DOC,
    kind: 'Concept',
    stability: 'stable',
    description: 'Phase 1 runtime nits verification lane',
    ...RUNTIME_NITS_TOKEN,
  },
};

export type RuntimeNitsToken = keyof typeof CANONICAL_RUNTIME_NITS_TOKENS;

const CANONICAL_RUNTIME_NITS_URLS = Object.fromEntries(
  Object.entries(CANONICAL_RUNTIME_NITS_TOKENS).map(([key, meta]) => [key, meta.url])
) as Record<string, string>;

// ── Official guides & onboarding paths (verify-guides.ts lane) ─────────────
export type CanonicalGuidesToken = CanonicalVerificationToken & {
  kind: 'Documentation' | 'Tooling';
  stability: 'stable';
  description: string;
};

export const CANONICAL_GUIDES_TOKENS: Record<string, CanonicalGuidesToken> = {
  'Bun Guides': {
    url: 'https://bun.com/guides',
    kind: 'Documentation',
    stability: 'stable',
    description: 'Index of all official guides (installation, migration, deployment)',
    subsystem: 'other',
    introducedIn: 'all',
  },
  'Bun Install Guide': {
    url: 'https://bun.com/guides/install/from-npm-install-to-bun-install',
    kind: 'Documentation',
    stability: 'stable',
    description: 'Step-by-step migration from npm install to bun install',
    subsystem: 'package-manager',
    introducedIn: 'all',
  },
  'Bun Get': {
    url: 'https://bun.com/get',
    kind: 'Tooling',
    stability: 'stable',
    description: 'Install landing page (serves 200 directly, no redirect on 2026-07)',
    subsystem: 'other',
    introducedIn: 'all',
  },
};

export type GuidesToken = keyof typeof CANONICAL_GUIDES_TOKENS;

const CANONICAL_GUIDES_URLS = Object.fromEntries(
  Object.entries(CANONICAL_GUIDES_TOKENS).map(([key, meta]) => [key, meta.url])
) as Record<string, string>;

/** Meta / pipeline tokens — RSS, reference index, docs coverage. */
export type CanonicalMetaToken = {
  url: string;
  kind: 'Meta';
  stability: 'stable';
  description?: string;
};

export const CANONICAL_META_TOKENS: Record<string, CanonicalMetaToken> = {
  'Bun API Reference': {
    url: bunReference(''),
    kind: 'Meta',
    stability: 'stable',
    description: 'Complete generated API reference for Bun, sourced from bun-types',
  },
  'rss feed verification': {
    url: 'https://bun.com/rss.xml',
    kind: 'Meta',
    stability: 'stable',
    description: 'RSS feed used to track Bun release blog posts (release-index Phase 0)',
  },
  'docs coverage verification': {
    url: 'https://github.com/brendadeeznuts1111/project-R-score/blob/main/docs/BUN_DOCS_OPERATE.md',
    kind: 'Meta',
    stability: 'stable',
    description: 'RSS + reference + canonical alignment gate (verify-docs-coverage)',
  },
};

export type MetaToken = keyof typeof CANONICAL_META_TOKENS;

const CANONICAL_META_URLS = Object.fromEntries(
  Object.entries(CANONICAL_META_TOKENS).map(([key, meta]) => [key, meta.url])
) as Record<string, string>;

/** Bundler Asset Processing / loader tokens — used by verify-bundler probes. */
const BUNDLER_TOKEN = {
  subsystem: 'bundler' as const,
  introducedIn: 'all' as const,
};

export const CANONICAL_BUNDLER_TOKENS: Record<string, CanonicalVerificationToken> = {
  'Asset Processing': {
    url: 'https://bun.com/docs/bundler#content-types',
    kind: 'Concept',
    stability: 'stable',
    description: 'Bun.build content-type / Asset Processing table',
    ...BUNDLER_TOKEN,
  },
  'bundler.asset-processing': {
    url: 'https://bun.com/docs/bundler#content-types',
    kind: 'Concept',
    stability: 'stable',
    description: 'Alias for Asset Processing content-types',
    ...BUNDLER_TOKEN,
  },
  Loaders: {
    url: 'https://bun.com/docs/bundler/loaders',
    kind: 'Concept',
    stability: 'stable',
    description: 'Built-in Bun.build loaders',
    ...BUNDLER_TOKEN,
  },
  'loader:css': {
    url: 'https://bun.com/docs/bundler/loaders#css',
    kind: 'API',
    stability: 'stable',
    description: 'CSS loader — bundles stylesheets via Bun.build',
    ...BUNDLER_TOKEN,
  },
  'bundler.loader.css': {
    url: 'https://bun.com/docs/bundler/loaders#css',
    kind: 'API',
    stability: 'stable',
    description: 'Alias for loader:css',
    ...BUNDLER_TOKEN,
  },
  'loader:jsonc': {
    url: 'https://bun.com/docs/bundler/loaders#jsonc',
    kind: 'API',
    stability: 'stable',
    description: 'JSONC loader — comments stripped (portal theme.jsonc)',
    ...BUNDLER_TOKEN,
  },
  'bundler.loader.jsonc': {
    url: 'https://bun.com/docs/bundler/loaders#jsonc',
    kind: 'API',
    stability: 'stable',
    description: 'Alias for loader:jsonc',
    ...BUNDLER_TOKEN,
  },
  'loader:text': {
    url: 'https://bun.com/docs/bundler/loaders#text',
    kind: 'API',
    stability: 'stable',
    description: 'Text loader — file contents as string export',
    ...BUNDLER_TOKEN,
  },
  'loader:ts': {
    url: 'https://bun.com/docs/bundler/loaders#ts',
    kind: 'API',
    stability: 'stable',
    description: 'TypeScript loader — strips types via Bun.build',
    ...BUNDLER_TOKEN,
  },
  'bundler.loader.ts': {
    url: 'https://bun.com/docs/bundler/loaders#ts',
    kind: 'API',
    stability: 'stable',
    description: 'Alias for loader:ts',
    ...BUNDLER_TOKEN,
  },
  'loader:file': {
    url: 'https://bun.com/docs/bundler/loaders#file',
    kind: 'API',
    stability: 'stable',
    description: 'File loader — copy asset to outdir and export path',
    ...BUNDLER_TOKEN,
  },
};

export type BundlerToken = keyof typeof CANONICAL_BUNDLER_TOKENS;

const CANONICAL_BUNDLER_URLS = Object.fromEntries(
  Object.entries(CANONICAL_BUNDLER_TOKENS).map(([key, meta]) => [key, meta.url])
) as Record<string, string>;

// Canonical doc map — the reference thesis for this repo's terminal layer:
//
//   Bun ships native, SIMD-accelerated replacements for the terminal npm
//   stack (string-width, wrap-ansi, strip-ansi, slice-ansi, ansi-styles,
//   cli-table). lib/console-depth.ts is the thin project layer over them.
//   Every reference below is (a) verified reachable, (b) as specific as the
//   official docs allow (anchor > topic page > generated reference), and
//   (c) checked by `bun tools/bun-doc-refs.ts validate`.
//
// Source tiers, in order of preference:
//   1. https://bun.com/docs/runtime/... — curated guides & CLI flags
//   2. https://bun.com/reference/bun/<name> — generated API reference
//   3. https://github.com/oven-sh/bun/tree/main/packages/bun-types — types
//
// Everything in CANONICAL_REFS resolves to Bun docs or Bun's own repo.
// Sole intentional exception elsewhere: tests/console-depth.test.ts cites
// github.com/sindresorhus/string-width — the reference vector suite
// Bun.stringWidth is validated against; Bun has no equivalent canonical
// vectors of its own.
//
// Agent-consumable docs: append `.md` to any bun.com/docs page for raw
// markdown (e.g. .../environment-variables.md). Full index:
//   https://bun.com/docs/llms.txt
export const BUN_TYPES_PINNED = bunTypesVersionSourceUrl('1.3.14');
export const BUN_TYPES_MAIN = BUN_TYPES_SOURCE_URL;
export const BUN_REPOSITORY = BUN_REPOSITORY_URL;

export const CANONICAL_REFS: Record<string, string> = {
  // ── Terminal width & ANSI (replaces string-width / strip-ansi / wrap-ansi /
  //    slice-ansi) ────────────────────────────────────────────────────────
  'Bun.stringWidth': 'https://bun.com/docs/runtime/utils#bun-stringwidth',
  'Bun.stripANSI': 'https://bun.com/docs/runtime/utils#bun-stripansi',
  'Bun.wrapAnsi': 'https://bun.com/docs/runtime/utils#bun-wrapansi',
  'Bun.sliceAnsi': 'https://bun.com/reference/bun/sliceAnsi',

  // ── File I/O & storage (top repo usage: Bun.file ×266, Bun.write ×153) ──
  'Bun.file': 'https://bun.com/docs/runtime/file-io#reading-files-bun-file',
  'Bun.write': 'https://bun.com/docs/runtime/file-io#writing-files-bun-write',
  // HTTP multipart upload guide (FormData + req.formData + Bun.write)
  'file-uploads':
    'https://bun.com/docs/guides/http/file-uploads#upload-files-via-http-using-formdata',
  'Upload files via HTTP using FormData':
    'https://bun.com/docs/guides/http/file-uploads#upload-files-via-http-using-formdata',
  'upload-files-via-http-using-formdata':
    'https://bun.com/docs/guides/http/file-uploads#upload-files-via-http-using-formdata',
  'guides/http/file-uploads':
    'https://bun.com/docs/guides/http/file-uploads#upload-files-via-http-using-formdata',
  'req.formData':
    'https://bun.com/docs/guides/http/file-uploads#upload-files-via-http-using-formdata',
  'Request.formData':
    'https://bun.com/docs/guides/http/file-uploads#upload-files-via-http-using-formdata',
  'Bun.mmap': 'https://bun.com/docs/runtime/bun-apis',
  'bun:sqlite': 'https://bun.com/docs/runtime/sqlite#load-via-es-module-import',
  'Bun.Archive': 'https://bun.com/docs/runtime/archive#quickstart',
  'Bun.gzipSync': 'https://bun.com/docs/runtime/utils#bun-gzipsync',

  // ── HTTP & networking ───────────────────────────────────────────────────
  // Bun.serve page TOC — howto anchors preferred over #reference type dump
  'Bun.serve': bunDocs('runtime/http/server', 'basic-setup'),
  'basic-setup': bunDocs('runtime/http/server', 'basic-setup'),
  'Bun.serve routes': bunDocs('runtime/http/server', 'basic-setup'),
  'html-imports': bunDocs('runtime/http/server', 'html-imports'),
  'HTML imports': bunDocs('runtime/http/server', 'html-imports'),
  'changing-the-port-and-hostname': bunDocs(
    'runtime/http/server',
    'changing-the-port-and-hostname'
  ),
  'Bun.serve port': bunDocs('runtime/http/server', 'changing-the-port-and-hostname'),
  'Bun.serve hostname': bunDocs('runtime/http/server', 'changing-the-port-and-hostname'),
  'server.port': bunDocs('runtime/http/server', 'changing-the-port-and-hostname'),
  'server.url': bunDocs('runtime/http/server', 'changing-the-port-and-hostname'),
  'port: 0': bunDocs('runtime/http/server', 'changing-the-port-and-hostname'),
  'configuring-a-default-port': bunDocs('runtime/http/server', 'configuring-a-default-port'),
  BUN_PORT: bunDocs('runtime/http/server', 'configuring-a-default-port'),
  NODE_PORT: bunDocs('runtime/http/server', 'configuring-a-default-port'),
  '--port': bunDocs('runtime/http/server', 'configuring-a-default-port'),
  'unix-domain-sockets': bunDocs('runtime/http/server', 'unix-domain-sockets'),
  'Bun.serve unix': bunDocs('runtime/http/server', 'unix-domain-sockets'),
  'abstract-namespace-sockets': bunDocs('runtime/http/server', 'abstract-namespace-sockets'),
  'http-3-quic': bunDocs('runtime/http/server', 'http-3-quic'),
  http3: bunDocs('runtime/http/server', 'http-3-quic'),
  'http1: false': bunDocs('runtime/http/server', 'http-3-quic'),
  idleTimeout: bunDocs('runtime/http/server', 'idletimeout'),
  idletimeout: bunDocs('runtime/http/server', 'idletimeout'),
  'export-default-syntax': bunDocs('runtime/http/server', 'export-default-syntax'),
  'Serve.Options': bunDocs('runtime/http/server', 'export-default-syntax'),
  'hot-route-reloading': bunDocs('runtime/http/server', 'hot-route-reloading'),
  'server-lifecycle-methods': bunDocs('runtime/http/server', 'server-lifecycle-methods'),
  'server-stop': bunDocs('runtime/http/server', 'server-stop'),
  'server.stop': bunDocs('runtime/http/server', 'server-stop'),
  'server-ref-and-server-unref': bunDocs('runtime/http/server', 'server-ref-and-server-unref'),
  'server.ref': bunDocs('runtime/http/server', 'server-ref-and-server-unref'),
  'server.unref': bunDocs('runtime/http/server', 'server-ref-and-server-unref'),
  'server-reload': bunDocs('runtime/http/server', 'server-reload'),
  'server.reload': bunDocs('runtime/http/server', 'server-reload'),
  'per-request-controls': bunDocs('runtime/http/server', 'per-request-controls'),
  'server-timeout-request-seconds': bunDocs(
    'runtime/http/server',
    'server-timeout-request-seconds'
  ),
  'server.timeout': bunDocs('runtime/http/server', 'server-timeout-request-seconds'),
  'server-requestip-request': bunDocs('runtime/http/server', 'server-requestip-request'),
  'server.requestIP': bunDocs('runtime/http/server', 'server-requestip-request'),
  'server-metrics': bunDocs('runtime/http/server', 'server-metrics'),
  'server-pendingrequests-and-server-pendingwebsockets': bunDocs(
    'runtime/http/server',
    'server-pendingrequests-and-server-pendingwebsockets'
  ),
  pendingRequests: bunDocs(
    'runtime/http/server',
    'server-pendingrequests-and-server-pendingwebsockets'
  ),
  pendingWebSockets: bunDocs(
    'runtime/http/server',
    'server-pendingrequests-and-server-pendingwebsockets'
  ),
  'server.pendingRequests': bunDocs(
    'runtime/http/server',
    'server-pendingrequests-and-server-pendingwebsockets'
  ),
  'server.pendingWebSockets': bunDocs(
    'runtime/http/server',
    'server-pendingrequests-and-server-pendingwebsockets'
  ),
  'server-subscribercount-topic': bunDocs('runtime/http/server', 'server-subscribercount-topic'),
  'server.subscriberCount': bunDocs('runtime/http/server', 'server-subscribercount-topic'),
  'Bun.serve benchmarks': bunDocs('runtime/http/server', 'benchmarks'),
  'practical-example-rest-api': bunDocs('runtime/http/server', 'practical-example-rest-api'),
  // Type surface (Server / WebSocketHandler / TLSOptions) — #reference
  'Bun.serve reference': bunDocs('runtime/http/server', 'reference'),
  'server reference': bunDocs('runtime/http/server', 'reference'),
  Server: bunDocs('runtime/http/server', 'reference'),
  'server.fetch': bunDocs('runtime/http/server', 'reference'),
  'server.upgrade': bunDocs('runtime/http/server', 'reference'),
  'server.publish': bunDocs('runtime/http/server', 'reference'),
  'server.development': bunDocs('runtime/http/server', 'reference'),
  'server.id': bunDocs('runtime/http/server', 'reference'),
  WebSocketHandler: bunDocs('runtime/http/server', 'reference'),
  TLSOptions: bunDocs('runtime/http/server', 'reference'),
  // Global fetch / Bun.fetch — networking page (not nodejs-compat)
  // TOC must-tier: sending · headers · timeout · error-handling (+ stream/debug discovery)
  fetch: bunDocs('runtime/networking/fetch', 'sending-an-http-request'),
  'Bun.fetch': bunDocs('runtime/networking/fetch', 'sending-an-http-request'),
  fetchPage: bunDocs('runtime/networking/fetch', 'sending-an-http-request'),
  'AbortSignal.timeout': bunDocs('runtime/networking/fetch', 'fetching-a-url-with-a-timeout'),
  'fetching-a-url-with-a-timeout': bunDocs(
    'runtime/networking/fetch',
    'fetching-a-url-with-a-timeout'
  ),
  AbortController: bunDocs('runtime/networking/fetch', 'canceling-a-request'),
  'canceling-a-request': bunDocs('runtime/networking/fetch', 'canceling-a-request'),
  'fetch headers': bunDocs('runtime/networking/fetch', 'custom-headers'),
  'fetch custom-headers': bunDocs('runtime/networking/fetch', 'custom-headers'),
  'fetch error-handling': bunDocs('runtime/networking/fetch', 'error-handling'),
  'sending-a-post-request': bunDocs('runtime/networking/fetch', 'sending-a-post-request'),
  'fetch POST': bunDocs('runtime/networking/fetch', 'sending-a-post-request'),
  'proxying-requests': bunDocs('runtime/networking/fetch', 'proxying-requests'),
  'fetch proxy': bunDocs('runtime/networking/fetch', 'proxying-requests'),
  'fetch proxy guide': 'https://bun.com/docs/guides/http/proxy',
  'guides/http/proxy': 'https://bun.com/docs/guides/http/proxy',
  'fetch proxy env': 'https://bun.com/docs/guides/http/proxy',
  'streaming-response-bodies': bunDocs('runtime/networking/fetch', 'streaming-response-bodies'),
  'streaming-request-bodies': bunDocs('runtime/networking/fetch', 'streaming-request-bodies'),
  'content-type-handling': bunDocs('runtime/networking/fetch', 'content-type-handling'),
  'fetch content-type': bunDocs('runtime/networking/fetch', 'content-type-handling'),
  'fetch performance': bunDocs('runtime/networking/fetch', 'performance'),
  'fetch debugging': bunDocs('runtime/networking/fetch', 'debugging'),
  'fetch verbose': bunDocs('runtime/networking/fetch', 'debugging'),
  'verbose: true': bunDocs('runtime/networking/fetch', 'debugging'),
  // Performance subsection TOC (API deep-dives stay on runtime/networking/dns)
  'dns-prefetching': bunDocs('runtime/networking/fetch', 'dns-prefetching'),
  'dns-caching': bunDocs('runtime/networking/fetch', 'dns-caching'),
  'fetch.preconnect': bunDocs('runtime/networking/fetch', 'preconnect-to-a-host'),
  'preconnect-to-a-host': bunDocs('runtime/networking/fetch', 'preconnect-to-a-host'),
  '--fetch-preconnect': bunDocs('runtime/networking/fetch', 'preconnect-at-startup'),
  'preconnect-at-startup': bunDocs('runtime/networking/fetch', 'preconnect-at-startup'),
  'connection-pooling-http-keep-alive': bunDocs(
    'runtime/networking/fetch',
    'connection-pooling-http-keep-alive'
  ),
  'connection pooling': bunDocs('runtime/networking/fetch', 'connection-pooling-http-keep-alive'),
  keepalive: bunDocs('runtime/networking/fetch', 'connection-pooling-http-keep-alive'),
  'Connection: close': bunDocs('runtime/networking/fetch', 'implementation-details'),
  'simultaneous-connection-limit': bunDocs(
    'runtime/networking/fetch',
    'simultaneous-connection-limit'
  ),
  'response-buffering': bunDocs('runtime/networking/fetch', 'response-buffering'),
  'response buffering': bunDocs('runtime/networking/fetch', 'response-buffering'),
  'implementation-details': bunDocs('runtime/networking/fetch', 'implementation-details'),
  'fetch protocol support': bunDocs('runtime/networking/fetch', 'protocol-support'),
  'protocol-support': bunDocs('runtime/networking/fetch', 'protocol-support'),
  'fetch s3': bunDocs('runtime/networking/fetch', 's3-urls-s3'),
  's3://': bunDocs('runtime/networking/fetch', 's3-urls-s3'),
  'fetch file': bunDocs('runtime/networking/fetch', 'file-urls-file'),
  'file://': bunDocs('runtime/networking/fetch', 'file-urls-file'),
  'fetch data': bunDocs('runtime/networking/fetch', 'data-urls-data'),
  'data:': bunDocs('runtime/networking/fetch', 'data-urls-data'),
  'fetch blob': bunDocs('runtime/networking/fetch', 'blob-urls-blob'),
  'blob:': bunDocs('runtime/networking/fetch', 'blob-urls-blob'),
  ...CANONICAL_INSTALL_PLATFORM_URLS,
  ...CANONICAL_INSTALL_ENV_URLS,
  ...CANONICAL_RELEASE_URLS,
  ...CANONICAL_REGISTRY_CLIENT_URLS,
  ...CANONICAL_RUNTIME_NITS_URLS,
  ...CANONICAL_GUIDES_URLS,
  ...CANONICAL_META_URLS,
  ...CANONICAL_BUNDLER_URLS,
  'isolated installs': bunDocs('pm/isolated-installs'),
  'global virtual store': bunDocs('pm/global-store'),
  configVersion: bunDocs('pm/isolated-installs'),
  // install CLI anchors (default strategy / linker modes)
  'install default strategy': bunDocs('pm/cli/install', 'default-strategy'),
  'install isolated': bunDocs('pm/cli/install', 'isolated-installs'),
  'install hoisted': bunDocs('pm/cli/install', 'hoisted-installs'),
  'isolated related documentation': bunDocs('pm/isolated-installs', 'related-documentation'),
  'Bun.Cookie': 'https://bun.com/docs/runtime/cookies#cookie-class',
  CookieMap: 'https://bun.com/docs/runtime/cookies#cookiemap-class',
  'Bun.connect': 'https://bun.com/docs/runtime/networking/tcp#create-a-connection-bun-connect',
  // WebSocket upgrade on Bun.serve (ServerWebSocket type + handlers)
  ServerWebSocket: 'https://bun.com/docs/runtime/http/websockets#start-a-websocket-server',
  'Bun.dns': 'https://bun.com/docs/runtime/networking/dns#dns-prefetch',
  'Bun.dns.prefetch': 'https://bun.com/docs/runtime/networking/dns#dns-prefetch',
  'Bun.dns.getCacheStats': 'https://bun.com/docs/runtime/networking/dns#dns-getcachestats',
  'Bun.dns.lookup': 'https://bun.com/docs/runtime/networking/dns#dns-caching-in-bun',
  dns: 'https://bun.com/docs/runtime/networking/dns#dns-prefetch',
  'Bun.listen': 'https://bun.com/docs/runtime/networking/tcp#start-a-server-bun-listen',
  'Bun.ArrayBufferSink': 'https://bun.com/docs/runtime/streams#bun-arraybuffersink',
  'Bun.FileSystemRouter': 'https://bun.com/reference/bun/FileSystemRouter',

  // ── Process & spawn ─────────────────────────────────────────────────────
  'Bun.argv': 'https://bun.com/reference/bun/argv',
  'Bun.spawnSync': 'https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync',
  'Bun.Terminal': 'https://bun.com/docs/runtime/child-process#terminal-pty-support',
  'Bun.Terminal (v1.3.5 ship)':
    'https://bun.com/blog/bun-v1.3.5#bun-terminal-api-for-pseudo-terminal-pty-support',
  'Bun.build': 'https://bun.com/docs/bundler/index#basic-example',
  'Bun.build css': 'https://bun.com/docs/bundler/css',
  'portal css build': 'https://bun.com/docs/bundler/css',
  // Universal plugin API — bundler page is SSOT; runtime/plugins mirrors it
  'Bun.plugin': 'https://bun.com/docs/bundler/plugins#usage',
  // In-process scheduler (returns CronJob with stop/ref/unref)
  'Bun.cron': 'https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process',
  // Shell template tag ($`…`)
  'Bun.$': 'https://bun.com/docs/runtime/shell#getting-started',

  // Headless browser automation (WebKit on macOS; CDP/Chrome elsewhere)
  'Bun.WebView': 'https://bun.com/docs/runtime/webview#new-bun-webview-options',
  WebView: 'https://bun.com/docs/runtime/webview#new-bun-webview-options',

  // UDP (ICMP errors + truncation flags)
  'Bun.udpSocket': 'https://bun.com/docs/runtime/networking/udp#bind-a-udp-socket-bun-udpsocket',
  udpSocket: 'https://bun.com/docs/runtime/networking/udp#bind-a-udp-socket-bun-udpsocket',

  // ── Security (native CSRF; pair with Bun.Cookie session ids) ────────────
  'Bun.CSRF': 'https://bun.com/docs/runtime/csrf#bun-csrf-generate',
  'Bun.CSRF.generate': 'https://bun.com/docs/runtime/csrf#bun-csrf-generate',
  'Bun.CSRF.verify': 'https://bun.com/docs/runtime/csrf#bun-csrf-verify',

  // ── Data stores (Redis / S3 / SQL / FFI) ──────────────────────────────────
  // Prefer RedisClient from 'bun' (not ioredis). Streams via client.send().
  RedisClient: 'https://bun.com/docs/runtime/redis#getting-started',
  'Bun.RedisClient': 'https://bun.com/reference/bun/RedisClient',
  'Bun.redis': 'https://bun.com/docs/runtime/redis#getting-started',
  redis: 'https://bun.com/docs/runtime/redis#getting-started',
  S3Client: 'https://bun.com/docs/runtime/s3#bun-s3client-bun-s3',
  'Bun.s3': 'https://bun.com/docs/runtime/s3#bun-s3client-bun-s3',
  'Bun.sql': 'https://bun.com/docs/runtime/sql#features',
  'Bun.SQL': 'https://bun.com/reference/bun/SQL',
  'bun:sql': 'https://bun.com/docs/runtime/sql#features',
  'bun:ffi': 'https://bun.com/docs/runtime/ffi#dlopen-usage-bunffi',

  // ── Data formats & hashing ──────────────────────────────────────────────
  'Bun.TOML': 'https://bun.com/docs/runtime/toml#bun-toml-parse',
  'Bun.TOML.parse': 'https://bun.com/reference/bun/TOML/parse',
  'Bun.TOML.stringify': 'https://bun.com/docs/runtime/toml',
  'Bun.JSON5': 'https://bun.com/reference/bun/JSON5',
  'Bun.JSONC': 'https://bun.com/reference/bun/JSONC',
  'Bun.JSONL': 'https://bun.com/reference/bun/JSONL',
  // Markdown page (html + ansi + render + react)
  'Bun.markdown': 'https://bun.com/docs/runtime/markdown#bun-markdown-html',
  'Bun.markdown.html': 'https://bun.com/docs/runtime/markdown#bun-markdown-html',
  'Bun.markdown.ansi': 'https://bun.com/docs/runtime/markdown#ansi-terminal-output',
  'Bun.markdown.render': 'https://bun.com/docs/runtime/markdown#bun-markdown-render',
  'Bun.markdown.react': 'https://bun.com/docs/runtime/markdown#bun-markdown-react',
  // React component overrides — #component-overrides → #available-overrides table
  'component-overrides': 'https://bun.com/docs/runtime/markdown#component-overrides',
  'Bun.markdown.react component overrides':
    'https://bun.com/docs/runtime/markdown#component-overrides',
  'available-overrides': 'https://bun.com/docs/runtime/markdown#available-overrides',
  'Bun.markdown.react available overrides':
    'https://bun.com/docs/runtime/markdown#available-overrides',
  // Parser options SSOT (#options) + render/react third-arg loci
  options: 'https://bun.com/docs/runtime/markdown#options',
  'Bun.markdown.html options': 'https://bun.com/docs/runtime/markdown#options',
  'parser-options': 'https://bun.com/docs/runtime/markdown#parser-options',
  'Bun.markdown.render parser options': 'https://bun.com/docs/runtime/markdown#parser-options',
  'parser-options-2': 'https://bun.com/docs/runtime/markdown#parser-options',
  'Bun.markdown.react parser options': 'https://bun.com/docs/runtime/markdown#parser-options',
  'Bun.YAML': 'https://bun.com/docs/runtime/yaml#bun-yaml-parse',
  YAML: 'https://bun.com/docs/runtime/yaml#bun-yaml-parse',
  'Bun.hash': 'https://bun.com/docs/runtime/hashing#bun-hash',
  'Bun.hash.crc32': 'https://bun.com/docs/runtime/hashing#bun-hash',
  'Bun.allocUnsafe': 'https://bun.com/reference/bun/allocUnsafe',
  'Bun.concatArrayBuffers': 'https://bun.com/reference/bun/concatArrayBuffers',
  'Bun.gc': 'https://bun.com/reference/bun/gc',
  'Bun.generateHeapSnapshot': 'https://bun.com/reference/bun/generateHeapSnapshot',
  'Bun.readableStreamToBytes': 'https://bun.com/reference/bun/readableStreamToBytes',
  'tls.getCACertificates': 'https://bun.com/reference/node/tls/getCACertificates',
  "tls.getCACertificates('system')":
    'https://bun.com/blog/bun-v1.3.14#tls-getcacertificates-system-now-works-without-use-system-ca',
  'node:tls': 'https://bun.com/reference/node/tls/getCACertificates',
  'Bun.sha': 'https://bun.com/docs/runtime/hashing#bun-hash',
  'Bun.CryptoHasher': 'https://bun.com/docs/runtime/hashing#bun-cryptohasher',
  // SHA-3 (v1.3.13+) — blog ship note; audit SSOT uses CryptoHasher('sha3-256') (see AuditConcept sha3-integrity)
  SHA3: 'https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  'SHA-3': 'https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  'SHA3-256': 'https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  'SHA3-224': 'https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  'SHA3-384': 'https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  'SHA3-512': 'https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  'sha3-256': 'https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  'sha3-224': 'https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  'sha3-384': 'https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  'sha3-512': 'https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  'crypto.createHash("sha3-256")':
    'https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  'crypto.subtle.digest("SHA3-256")':
    'https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  // SHA-3 family (node:crypto / WebCrypto / Bun.CryptoHasher) shipped in 1.3.13
  'crypto.sha3': 'https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
  'Bun.password': 'https://bun.com/docs/runtime/hashing#bun-password',
  'Bun.password.hash': 'https://bun.com/docs/runtime/hashing#bun-password',
  'Bun.password.verify': 'https://bun.com/docs/runtime/hashing#bun-password',
  'Bun.secrets': 'https://bun.com/docs/runtime/secrets#bun-secrets-get-options',
  'Bun.semver':
    'https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean',
  'Bun.semver.order': 'https://bun.com/reference/bun/semver/order',
  'Bun.semver.satisfies': 'https://bun.com/reference/bun/semver/satisfies',
  'Bun.Transpiler': 'https://bun.com/reference/bun/Transpiler',
  'Bun.Image': 'https://bun.com/docs/runtime/image#input',
  'Bun.Image (v1.3.14)': 'https://bun.com/blog/bun-v1.3.14#bun-image',
  'Bun.Image terminal methods': 'https://bun.com/blog/bun-v1.3.14#terminal-methods',
  '--no-orphans': 'https://bun.com/blog/bun-v1.3.14#no-orphans',
  BUN_FEATURE_FLAG_NO_ORPHANS: 'https://bun.com/blog/bun-v1.3.14#no-orphans',
  'using / await using':
    'https://bun.com/blog/bun-v1.3.14#using-await-using-no-longer-lowered-when-targeting-bun',
  'Bun.Terminal (ConPTY)': 'https://bun.com/blog/bun-v1.3.14#bunterminal-on-windows-via-conpty',
  'process.execve': 'https://bun.com/blog/bun-v1.3.14#process-execve-support',
  'Bun.serve http3': 'https://bun.com/blog/bun-v1.3.14#http3',
  'fetch protocol http2': 'https://bun.com/blog/bun-v1.3.14#http2-client',
  'install.globalStore': 'https://bun.com/blog/bun-v1.3.14#global-virtual-store',
  'Bun.CookieMap': 'https://bun.com/docs/runtime/cookies#cookiemap-class',

  // ── Workers (runtime/workers) — not bundler/executables#worker ──────────
  // Runtime docs nav group "Concurrency" (sole page: Workers). Distinct from
  // pm/global-store#concurrency (install linker concurrency).
  Concurrency: 'https://bun.com/docs/runtime/workers',
  'Runtime Concurrency': 'https://bun.com/docs/runtime/workers',
  'global-store concurrency': 'https://bun.com/docs/pm/global-store#concurrency',
  'install concurrency': 'https://bun.com/docs/pm/global-store#concurrency',
  'pm concurrency': 'https://bun.com/docs/pm/global-store#concurrency',
  // Lifetime: managing-lifetime → worker.unref → worker.ref
  Worker: 'https://bun.com/docs/runtime/workers#creating-a-worker',
  'new Worker': 'https://bun.com/docs/runtime/workers#creating-a-worker',
  Workers: 'https://bun.com/docs/runtime/workers#creating-a-worker',
  'creating-a-worker': 'https://bun.com/docs/runtime/workers#creating-a-worker',
  'worker.postMessage': 'https://bun.com/docs/runtime/workers#messages-with-postmessage',
  'messages-with-postmessage': 'https://bun.com/docs/runtime/workers#messages-with-postmessage',
  'worker.terminate': 'https://bun.com/docs/runtime/workers#terminating-a-worker',
  'terminating-a-worker': 'https://bun.com/docs/runtime/workers#terminating-a-worker',
  'managing-lifetime': 'https://bun.com/docs/runtime/workers#managing-lifetime',
  'worker.unref': 'https://bun.com/docs/runtime/workers#worker-unref',
  'worker-unref': 'https://bun.com/docs/runtime/workers#worker-unref',
  'worker.ref': 'https://bun.com/docs/runtime/workers#worker-ref',
  'worker-ref': 'https://bun.com/docs/runtime/workers#worker-ref',
  // Worker constructor options (distinct from bunfig smol / preload)
  'Worker.preload':
    'https://bun.com/docs/runtime/workers#preload-load-modules-before-the-worker-starts',
  'Worker smol': 'https://bun.com/docs/runtime/workers#memory-usage-with-smol',
  'memory-usage-with-smol': 'https://bun.com/docs/runtime/workers#memory-usage-with-smol',
  'worker open': 'https://bun.com/docs/runtime/workers#open',
  'worker close': 'https://bun.com/docs/runtime/workers#close',
  'environment-data': 'https://bun.com/docs/runtime/workers#environment-data',
  setEnvironmentData: 'https://bun.com/docs/runtime/workers#environment-data',
  getEnvironmentData: 'https://bun.com/docs/runtime/workers#environment-data',
  worker_threads: 'https://bun.com/docs/runtime/workers#environment-data',
  'Bun.isMainThread': 'https://bun.com/docs/runtime/workers#bun-ismainthread',
  // Compile-time worker entrypoints (standalone binaries) — keep distinct from runtime Worker API
  'executables Worker': 'https://bun.com/docs/bundler/executables#worker',

  // ── Inspection & formatting (replaces util.inspect options, cli-table) ──
  // Utils inspect family — #bun-inspect → .custom → .table(…)
  'Bun.inspect': bunDocs('runtime/utils', 'bun-inspect'),
  'Bun.inspect()': bunDocs('runtime/utils', 'bun-inspect'),
  // Heading: Bun.inspect.custom (well-known symbol; ≡ util.inspect.custom)
  'Bun.inspect.custom': bunDocs('runtime/utils', 'bun-inspect-custom'),
  // Heading: Bun.inspect.table(tabularData, properties, options)
  'Bun.inspect.table': bunDocs('runtime/utils', 'bun-inspect-table-tabulardata-properties-options'),
  'Bun.inspect.table(tabularData, properties, options)': bunDocs(
    'runtime/utils',
    'bun-inspect-table-tabulardata-properties-options'
  ),
  BunInspectOptions: 'https://bun.com/reference/bun/BunInspectOptions',
  console: 'https://bun.com/docs/runtime/console',
  '--console-depth': 'https://bun.com/docs/runtime/console#object-inspection-depth',

  // ── Color & TTY conventions (replaces chalk / ansi-styles) ─────────────
  'Bun.color': 'https://bun.com/docs/runtime/color#flexible-input',
  'process.stdout.isTTY': 'https://bun.com/docs/runtime/nodejs-compat#nodetty',
  'process.stdout.columns': 'https://bun.com/docs/runtime/nodejs-compat#nodetty',
  NO_COLOR: 'https://bun.com/docs/runtime/environment-variables',
  FORCE_COLOR: 'https://bun.com/docs/runtime/environment-variables',

  // ── Environment & configuration ────────────────────────────────────────
  // Guides (llms.txt): read-env / set-env — Bun.env ≡ process.env; .env load order
  'Read environment variables': 'https://bun.com/docs/guides/runtime/read-env',
  'read-env': 'https://bun.com/docs/guides/runtime/read-env',
  'Set environment variables': 'https://bun.com/docs/guides/runtime/set-env',
  'set-env': 'https://bun.com/docs/guides/runtime/set-env',
  // Guide: process.env.TZ / TZ=… on CLI; bun test defaults to UTC
  'Set a time zone in Bun': 'https://bun.com/docs/guides/runtime/timezone',
  timezone: 'https://bun.com/docs/guides/runtime/timezone',
  'set-timezone': 'https://bun.com/docs/guides/runtime/timezone',
  TZ: 'https://bun.com/docs/guides/runtime/timezone',
  'tz-timezone': 'https://bun.com/docs/test/runtime-behavior#tz-timezone',
  'set-the-time-zone': 'https://bun.com/docs/test/dates-times#set-the-time-zone',
  // Runtime property (utils#bun-env) + full Environment Variables guide
  'Bun.env': 'https://bun.com/docs/runtime/utils#bun-env',
  'process.env': 'https://bun.com/docs/runtime/utils#bun-env',
  'Environment variables': 'https://bun.com/docs/runtime/environment-variables',
  'reading environment variables':
    'https://bun.com/docs/runtime/environment-variables#reading-environment-variables',
  'setting environment variables':
    'https://bun.com/docs/runtime/environment-variables#setting-environment-variables',
  // Auto-load: .env → .env.$NODE_ENV → .env.local (see set-env guide + this section)
  '.env': 'https://bun.com/docs/runtime/environment-variables#setting-environment-variables',
  '.env files': 'https://bun.com/docs/runtime/environment-variables#setting-environment-variables',
  '.env.local': 'https://bun.com/docs/runtime/environment-variables#setting-environment-variables',
  '--env-file': 'https://bun.com/docs/runtime/environment-variables#manually-specifying-env-files',
  '--no-env-file':
    'https://bun.com/docs/runtime/environment-variables#disabling-automatic-env-loading',
  'configuring Bun': 'https://bun.com/docs/runtime/environment-variables#configuring-bun',
  // Standalone executables: runtime flags without recompile (also listed under env-vars)
  BUN_OPTIONS: 'https://bun.com/docs/bundler/executables#runtime-arguments-via-bun-options',
  'runtime-arguments-via-bun-options':
    'https://bun.com/docs/bundler/executables#runtime-arguments-via-bun-options',
  'Runtime arguments via BUN_OPTIONS':
    'https://bun.com/docs/bundler/executables#runtime-arguments-via-bun-options',
  'embedding-runtime-arguments':
    'https://bun.com/docs/bundler/executables#embedding-runtime-arguments',
  // Fetch performance knobs — locus is networking/fetch (env page only lists the names)
  BUN_CONFIG_VERBOSE_FETCH: bunDocs('runtime/networking/fetch', 'debugging'),
  BUN_CONFIG_MAX_HTTP_REQUESTS: bunDocs(
    'runtime/networking/fetch',
    'simultaneous-connection-limit'
  ),
  DO_NOT_TRACK: 'https://bun.com/docs/runtime/environment-variables#configuring-bun',
  BUN_RUNTIME_TRANSPILER_CACHE_PATH:
    'https://bun.com/docs/runtime/environment-variables#what-does-it-cache',
  'bunfig.toml': 'https://bun.com/docs/runtime/bunfig',
  // .npmrc (pm/npmrc) — prefer over scopes-registries#npmrc dump
  '.npmrc': 'https://bun.com/docs/pm/npmrc',
  npmrc: 'https://bun.com/docs/pm/npmrc',
  'link-workspace-packages':
    'https://bun.com/docs/pm/npmrc#link-workspace-packages-control-workspace-package-installation',
  'save-exact': 'https://bun.com/docs/pm/npmrc#save-exact-save-exact-versions',
  'ignore-scripts': 'https://bun.com/docs/pm/npmrc#ignore-scripts-skip-lifecycle-scripts',
  'install-strategy':
    'https://bun.com/docs/pm/npmrc#install-strategy-and-node-linker-installation-strategy',
  'node-linker':
    'https://bun.com/docs/pm/npmrc#install-strategy-and-node-linker-installation-strategy',
  'public-hoist-pattern':
    'https://bun.com/docs/pm/npmrc#public-hoist-pattern-and-hoist-pattern-control-hoisting',
  // bunfig equivalents (install.*) — frozen keys for suggest/url
  'install.registry': 'https://bun.com/docs/runtime/bunfig#install-registry',
  'install.linkWorkspacePackages':
    'https://bun.com/docs/runtime/bunfig#install-linkworkspacepackages',
  'install.exact': 'https://bun.com/docs/runtime/bunfig#install-exact',
  'install.dryRun': 'https://bun.com/docs/runtime/bunfig#install-dryrun',
  'install.cache': 'https://bun.com/docs/runtime/bunfig#install-cache',

  // ── Testing & snapshots ────────────────────────────────────────────────
  'bun:test': 'https://bun.com/docs/test/index#run-tests',
  'bun test': 'https://bun.com/docs/test/index#run-tests',
  'bun:test snapshots': 'https://bun.com/docs/test/snapshots#basic-snapshots',
  'snapshot guide': 'https://bun.com/docs/guides/test/snapshot',
  // Release blog deep links (docs index may lag; prefer these for ship notes)
  'bun v1.3.12': 'https://bun.com/blog/bun-v1.3.12',
  'bun v1.3.12 install': 'https://bun.com/blog/bun-v1.3.12#to-install-bun',
  'bun v1.3.12 upgrade': 'https://bun.com/blog/bun-v1.3.12#to-upgrade-bun',
  'bun upgrade': 'https://bun.com/blog/bun-v1.3.12#to-upgrade-bun',
  'bun v1.3.12 bugfixes': 'https://bun.com/blog/bun-v1.3.12#bugfixes',
  'bun v1.3.12 contributors': 'https://bun.com/blog/bun-v1.3.12#thanks-to-8-contributors',
  // HTMLRewriter — API page + social-meta guide (SocialMetadata / extractSocialMetadata)
  HTMLRewriter: bunDocs('runtime/html-rewriter'),
  'HTMLRewriter social': bunDocs(
    'guides/html-rewriter/extract-social-meta',
    'extract-social-share-images-and-open-graph-tags'
  ),
  'extract-social-meta': bunDocs(
    'guides/html-rewriter/extract-social-meta',
    'extract-social-share-images-and-open-graph-tags'
  ),
  'extract-social-share-images-and-open-graph-tags': bunDocs(
    'guides/html-rewriter/extract-social-meta',
    'extract-social-share-images-and-open-graph-tags'
  ),
  SocialMetadata: bunDocs(
    'guides/html-rewriter/extract-social-meta',
    'extract-social-share-images-and-open-graph-tags'
  ),
  extractSocialMetadata: bunDocs(
    'guides/html-rewriter/extract-social-meta',
    'extract-social-share-images-and-open-graph-tags'
  ),

  // URLPattern — hrefs from bunBlog/mdnWebApi (URLPatternInit protocol/hostname/pathname/hash)
  // Ship 1.3.4 (PR #25168); test/exec up to 2.3× faster in 1.3.12
  URLPattern: bunBlog('bun-v1.3.4', 'urlpattern-api'),
  'URLPattern ship': bunBlog('bun-v1.3.4', 'urlpattern-api'),
  'URLPattern API': bunBlog('bun-v1.3.4', 'urlpattern-api'),
  'urlpattern-api': bunBlog('bun-v1.3.4', 'urlpattern-api'),
  URLPatternInit: bunBlog('bun-v1.3.4', 'urlpattern-api'),
  URLPatternInput: bunBlog('bun-v1.3.4', 'urlpattern-api'),
  URLPatternResult: bunBlog('bun-v1.3.4', 'urlpattern-api'),
  'URLPattern.constructor': bunBlog('bun-v1.3.4', 'urlpattern-api'),
  'URLPattern.test()': bunBlog('bun-v1.3.4', 'urlpattern-api'),
  'URLPattern.exec()': bunBlog('bun-v1.3.4', 'urlpattern-api'),
  'test()': bunBlog('bun-v1.3.4', 'urlpattern-api'),
  'exec()': bunBlog('bun-v1.3.4', 'urlpattern-api'),
  hasRegExpGroups: bunBlog('bun-v1.3.4', 'urlpattern-api'),
  'URLPattern.hasRegExpGroups': bunBlog('bun-v1.3.4', 'urlpattern-api'),
  'URLPattern.protocol': bunBlog('bun-v1.3.4', 'urlpattern-api'),
  'URLPattern.username': bunBlog('bun-v1.3.4', 'urlpattern-api'),
  'URLPattern.password': bunBlog('bun-v1.3.4', 'urlpattern-api'),
  'URLPattern.hostname': bunBlog('bun-v1.3.4', 'urlpattern-api'),
  'URLPattern.port': bunBlog('bun-v1.3.4', 'urlpattern-api'),
  'URLPattern.pathname': bunBlog('bun-v1.3.4', 'urlpattern-api'),
  'URLPattern.search': bunBlog('bun-v1.3.4', 'urlpattern-api'),
  'URLPattern.hash': bunBlog('bun-v1.3.4', 'urlpattern-api'),
  // WHATWG URL — host includes port; hostname excludes port
  'URL.host': bunReference('globals/URL/host'),
  'URL.hostname': bunReference('globals/URL/hostname'),
  'URL.port': bunReference('globals/URL/port'),
  'URLPattern.test': bunBlog('bun-v1.3.12', 'urlpattern-is-up-to-2-3x-faster'),
  'URLPattern.exec': bunBlog('bun-v1.3.12', 'urlpattern-is-up-to-2-3x-faster'),
  'URLPattern perf': bunBlog('bun-v1.3.12', 'urlpattern-is-up-to-2-3x-faster'),
  'urlpattern-is-up-to-2-3x-faster': bunBlog('bun-v1.3.12', 'urlpattern-is-up-to-2-3x-faster'),
  'URLPattern MDN': mdnWebApi('URLPattern'),
  'URLPatternResult MDN': mdnWebApi('URLPatternResult'),
  'URLPatternInit MDN': mdnWebApi('URLPattern/URLPattern'),
  'Bun.Glob.scan': 'https://bun.com/blog/bun-v1.3.12#faster-bun-glob-scan',
  'bun v1.3.12 stripANSI':
    'https://bun.com/blog/bun-v1.3.12#faster-bun-stripansi-and-bun-stringwidth',
  'bun v1.3.12 stringWidth':
    'https://bun.com/blog/bun-v1.3.12#faster-bun-stripansi-and-bun-stringwidth',
  'bun v1.3.13': 'https://bun.com/blog/bun-v1.3.13',
  // SHA-3 + bun test flags share the v1.3.13 ship note (sibling sections)
  // bun test flags (v1.3.13+) — blog anchors are the ship notes
  // --isolate / --parallel share one heading; --shard and --changed are siblings
  'bun test --changed': 'https://bun.com/blog/bun-v1.3.13#bun-test-changed',
  '--changed': 'https://bun.com/blog/bun-v1.3.13#bun-test-changed',
  'bun test --isolate': 'https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
  '--isolate': 'https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
  'bun test --parallel': 'https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
  // bun test file workers (≠ bun run --parallel workspace Foreman mode)
  '--parallel': 'https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
  '--parallel=N': 'https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
  'bun test --shard':
    'https://bun.com/blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs',
  '--shard':
    'https://bun.com/blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs',
  '--shard=M/N':
    'https://bun.com/blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs',
  'bun run --parallel': 'https://bun.com/docs/pm/filter#parallel-and-sequential-mode',
  'bun run --sequential': 'https://bun.com/docs/pm/filter#parallel-and-sequential-mode',
  'bun test flags': 'https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
  // Worker env vars set by bun test --parallel (blog ship note)
  JEST_WORKER_ID: 'https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
  BUN_TEST_WORKER_ID: 'https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
  // Mentioned alongside --isolate/--parallel/--shard on the v1.3.13 ship note
  '--randomize': 'https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
  'bun test --watch': 'https://bun.com/blog/bun-v1.3.13#bun-test-changed',

  // ── Bundler sidebar nav (lib/docs/bundler-nav.ts) + APIs / flags ────────
  ...bundlerNavCanonicalRefs(),
  // Extensions / Optimization / Migration deep links (beyond leaf landing)
  'plugin lifecycle': 'https://bun.com/docs/bundler/plugins#plugin-lifecycle',
  onStart: 'https://bun.com/docs/bundler/plugins#onstart',
  onResolve: 'https://bun.com/docs/bundler/plugins#onresolve',
  onLoad: 'https://bun.com/docs/bundler/plugins#onload',
  onBeforeParse: 'https://bun.com/docs/bundler/plugins#onbeforeparse',
  onEnd: 'https://bun.com/docs/bundler/plugins#onend',
  'type: macro': 'https://bun.com/docs/bundler/macros#import-attributes',
  'with { type: "macro" }': 'https://bun.com/docs/bundler/macros#import-attributes',
  '--no-macros': 'https://bun.com/docs/runtime#transpilation-language-features',
  'macros security': 'https://bun.com/docs/bundler/macros#security-considerations',
  'export condition macro': 'https://bun.com/docs/bundler/macros#export-condition-macro',
  'embed git commit hash': 'https://bun.com/docs/bundler/macros#embed-latest-git-commit-hash',
  'bundle-time fetch': 'https://bun.com/docs/bundler/macros#make-fetch-requests-at-bundle-time',
  'bun:error': 'https://bun.com/docs/bundler/hot-reloading#built-in-events',
  'bun:invalidate': 'https://bun.com/docs/bundler/hot-reloading#built-in-events',
  'bun:ws': 'https://bun.com/docs/bundler/hot-reloading#built-in-events',
  'serve.static.env': 'https://bun.com/docs/bundler/fullstack#inline-environment-variables',
  'serve.static.plugins': 'https://bun.com/docs/bundler/fullstack',
  'compile targets': 'https://bun.com/docs/bundler/executables#supported-targets',
  'Bun.embeddedFiles': 'https://bun.com/docs/bundler/executables#listing-embedded-files',
  'Bun.isStandaloneExecutable':
    'https://bun.com/docs/bundler/executables#detecting-standalone-mode-at-runtime',
  BUN_BE_BUN: 'https://bun.com/docs/bundler/executables#act-as-the-bun-cli',
  'bun:bundle': 'https://bun.com/docs/bundler/index#features',
  'compile-time feature flags':
    'https://bun.com/blog/bun-v1.3.5#compile-time-feature-flags-for-dead-code-elimination',
  'feature()': 'https://bun.com/docs/guides/runtime/build-time-constants#feature-flags',
  'S3 contentDisposition':
    'https://bun.com/blog/bun-v1.3.5#content-disposition-support-for-s3-uploads',
  'npmrc env expansion':
    'https://bun.com/blog/bun-v1.3.5#environment-variable-expansion-in-npmrc-quoted-values',
  'registry-read-plane':
    'https://developers.cloudflare.com/pages/functions/bindings/#r2-bucket-bindings',
  // Bundler CLI flags (catalog -s bundler) — url/suggest; annotate only for --* code keys
  '--bytecode': 'https://bun.com/docs/bundler/bytecode#basic-usage-commonjs',
  '--compile': 'https://bun.com/docs/bundler/bytecode#with-standalone-executables',
  '--compile-autoload-package-json':
    'https://bun.com/docs/bundler/executables#enabling-config-loading-at-runtime',
  '--compile-autoload-tsconfig':
    'https://bun.com/docs/bundler/executables#enabling-config-loading-at-runtime',
  '--compile-exec-argv': 'https://bun.com/docs/bundler/executables#embedding-runtime-arguments',
  // Runtime CLI — pipe JS/TS/TSX/JSX from stdin (no temp file)
  // https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin
  'bun run -': 'https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin',
  'bun run - to pipe code from stdin':
    'https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin',
  'bun-run-to-pipe-code-from-stdin': 'https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin',
  'pipe code from stdin': 'https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin',
  // Runtime CLI (bun run) — https://bun.com/docs/runtime#transpilation-language-features
  // (bun.com/docs/runtime#transpilation-language-features → same slug)
  'Transpilation & Language Features':
    'https://bun.com/docs/runtime#transpilation-language-features',
  'transpilation-language-features': 'https://bun.com/docs/runtime#transpilation-language-features',
  '--tsconfig-override': 'https://bun.com/docs/runtime#transpilation-language-features',
  '--define': 'https://bun.com/docs/runtime#transpilation-language-features',
  '--drop': 'https://bun.com/docs/runtime#transpilation-language-features',
  '--loader': 'https://bun.com/docs/runtime#transpilation-language-features',
  '--jsx-factory': 'https://bun.com/docs/runtime#transpilation-language-features',
  '--jsx-fragment': 'https://bun.com/docs/runtime#transpilation-language-features',
  '--jsx-import-source': 'https://bun.com/docs/runtime#transpilation-language-features',
  '--jsx-runtime': 'https://bun.com/docs/runtime#transpilation-language-features',
  '--jsx-side-effects': 'https://bun.com/docs/runtime#transpilation-language-features',
  '--ignore-dce-annotations': 'https://bun.com/docs/runtime#transpilation-language-features',
  '--external': 'https://bun.com/docs/bundler/esbuild#cli-api',
  '--format': 'https://bun.com/docs/bundler/bytecode#with-standalone-executables',
  '--keep-names': 'https://bun.com/docs/bundler/minifier#keep-names',
  '--minify': 'https://bun.com/docs/bundler/bytecode#combining-with-other-optimizations',
  '--minify-identifiers': 'https://bun.com/docs/bundler/minifier#granular-control',
  '--minify-syntax': 'https://bun.com/docs/bundler/minifier#granular-control',
  '--minify-whitespace': 'https://bun.com/docs/bundler/minifier#granular-control',
  '--no-bundle': 'https://bun.com/docs/bundler/esbuild#cli-api',
  '--outfile': 'https://bun.com/docs/bundler/bytecode#with-standalone-executables',
  '--sourcemap': 'https://bun.com/docs/bundler/bytecode#combining-with-other-optimizations',
  '--splitting': 'https://bun.com/docs/bundler/executables#code-splitting',
  '--asset-naming': 'https://bun.com/docs/bundler/executables#content-hash',
  '--bundle': 'https://bun.com/docs/bundler/esbuild',
  '--windows-hide-console': 'https://bun.com/docs/bundler/executables#windows-specific-flags',
  '--windows-icon': 'https://bun.com/docs/bundler/executables#windows-specific-flags',
  // Catalog flag name keys (url already covered; name must resolve via suggest/url)
  '--force': 'https://bun.com/docs/bundler/executables',
  '--console':
    'https://bun.com/docs/bundler/html-static#echo-console-logs-from-browser-to-terminal',
  '--cpu-prof': 'https://bun.com/docs/bundler/executables#runtime-arguments-via-bun-options',
  '--cpu-prof-md': 'https://bun.com/docs/bundler/executables#runtime-arguments-via-bun-options',
  '--heap-prof-md': 'https://bun.com/docs/bundler/executables#runtime-arguments-via-bun-options',
  '--deep': 'https://bun.com/docs/bundler/executables#code-signing-on-macos',
  '--entitlements': 'https://bun.com/docs/bundler/executables#code-signing-on-macos',
  '--sign': 'https://bun.com/docs/bundler/executables#code-signing-on-macos',
  '--verify': 'https://bun.com/docs/bundler/executables#code-signing-on-macos',
  '--user-agent': 'https://bun.com/docs/bundler/executables#embedding-runtime-arguments',
  '--no-compile-autoload-bunfig':
    'https://bun.com/docs/bundler/executables#disabling-config-loading-at-runtime',
  '--no-compile-autoload-dotenv':
    'https://bun.com/docs/bundler/executables#disabling-config-loading-at-runtime',
  '--jsx-dev': 'https://bun.com/docs/bundler/esbuild#cli-api',
  '--sourcefile': 'https://bun.com/docs/bundler/esbuild#cli-api',
  '--production': 'https://bun.com/docs/bundler/fullstack#production-mode',
  // --env / --version: in map for url/suggest; excluded from annotate (ambiguous)
  '--env': 'https://bun.com/docs/bundler/html-static#build-for-production',
  '--version': 'https://bun.com/docs/bundler/esbuild#cli-api',
  'Bun.embeddedFiles.length':
    'https://bun.com/docs/bundler/executables#detecting-standalone-mode-at-runtime',
  // Core — Bun.build API section landings
  'bundler define': 'https://bun.com/docs/bundler/index#define',
  'bundler loader': 'https://bun.com/docs/bundler/index#loader',
  'bundler metafile': 'https://bun.com/docs/bundler/index#metafile',
  'bundler external': 'https://bun.com/docs/bundler/index#external',
  'bundler minify': 'https://bun.com/docs/bundler/index#minify',
  'bundler cli-usage': 'https://bun.com/docs/bundler/index#cli-usage',
  // Development Server
  'fullstack html-routes': 'https://bun.com/docs/bundler/fullstack#html-routes',
  'Fullstack dev server html-routes': 'https://bun.com/docs/bundler/fullstack#html-routes',
  'import.meta.hot': 'https://bun.com/docs/bundler/hot-reloading#import-meta-hot-api-reference',
  'import.meta.hot.accept': 'https://bun.com/docs/bundler/hot-reloading#import-meta-hot-accept',
  'import.meta.hot.data': 'https://bun.com/docs/bundler/hot-reloading#import-meta-hot-data',
  'import.meta.hot.dispose': 'https://bun.com/docs/bundler/hot-reloading#import-meta-hot-dispose',
  'import.meta.hot.prune': 'https://bun.com/docs/bundler/hot-reloading#import-meta-hot-prune',
  'import.meta.hot.on': 'https://bun.com/docs/bundler/hot-reloading#import-meta-hot-on-and-off',
  // Asset Processing (bundler nav group: HTML · CSS · Loaders)
  'Asset Processing': 'https://bun.com/docs/bundler#content-types',
  'content types': 'https://bun.com/docs/bundler#content-types',
  'Content types': 'https://bun.com/docs/bundler#content-types',
  Loaders: 'https://bun.com/docs/bundler/loaders',
  loaders: 'https://bun.com/docs/bundler/loaders',
  'html-static inline-env': 'https://bun.com/docs/bundler/html-static#inline-environment-variables',
  'HTML & static sites inline-environment-variables':
    'https://bun.com/docs/bundler/html-static#inline-environment-variables',
  'HTML & static sites build-for-production':
    'https://bun.com/docs/bundler/html-static#build-for-production',
  'HTML & static sites watch-mode': 'https://bun.com/docs/bundler/html-static#watch-mode',
  'HTML & static sites plugin-api': 'https://bun.com/docs/bundler/html-static#plugin-api',
  'Standalone HTML javascript-api': 'https://bun.com/docs/bundler/standalone-html#javascript-api',
  'CSS css-modules': 'https://bun.com/docs/bundler/css#css-modules',
  'CSS nesting': 'https://bun.com/docs/bundler/css#nesting',
  nesting: 'https://bun.com/docs/bundler/css#nesting',
  'CSS logical-properties': 'https://bun.com/docs/bundler/css#logical-properties',
  'logical properties': 'https://bun.com/docs/bundler/css#logical-properties',
  'CSS is-selector': 'https://bun.com/docs/bundler/css#is-selector',
  ':is()': 'https://bun.com/docs/bundler/css#is-selector',
  'CSS light-dark': 'https://bun.com/docs/bundler/css#light-dark-color-function',
  'light-dark': 'https://bun.com/docs/bundler/css#light-dark-color-function',
  'light-dark()': 'https://bun.com/docs/bundler/css#light-dark-color-function',
  'CSS color-mix': 'https://bun.com/docs/bundler/css#color-mix',
  'color-mix': 'https://bun.com/docs/bundler/css#color-mix',
  'color-mix()': 'https://bun.com/docs/bundler/css#color-mix',
  'CSS media-query-ranges': 'https://bun.com/docs/bundler/css#media-query-ranges',
  'media query ranges': 'https://bun.com/docs/bundler/css#media-query-ranges',
  'CSS dir-selector': 'https://bun.com/docs/bundler/css#dir-selector',
  ':dir()': 'https://bun.com/docs/bundler/css#dir-selector',
  'dir selector': 'https://bun.com/docs/bundler/css#dir-selector',
  'CSS lang-selector': 'https://bun.com/docs/bundler/css#lang-selector',
  ':lang()': 'https://bun.com/docs/bundler/css#lang-selector',
  'CSS not-selector': 'https://bun.com/docs/bundler/css#not-selector',
  ':not()': 'https://bun.com/docs/bundler/css#not-selector',
  'CSS shorthands': 'https://bun.com/docs/bundler/css#shorthands',
  'CSS system-ui': 'https://bun.com/docs/bundler/css#system-ui-font',
  'system-ui': 'https://bun.com/docs/bundler/css#system-ui-font',
  'loader:built-in-loaders': 'https://bun.com/docs/bundler/loaders#built-in-loaders',
  'loader:js': 'https://bun.com/docs/bundler/loaders#js',
  'loader:jsx': 'https://bun.com/docs/bundler/loaders#jsx',
  'loader:ts': 'https://bun.com/docs/bundler/loaders#ts',
  'loader:tsx': 'https://bun.com/docs/bundler/loaders#tsx',
  'loader:json': 'https://bun.com/docs/bundler/loaders#json',
  'loader:jsonc': 'https://bun.com/docs/bundler/loaders#jsonc',
  'loader:toml': 'https://bun.com/docs/bundler/loaders#toml',
  'loader:yaml': 'https://bun.com/docs/bundler/loaders#yaml',
  'loader:text': 'https://bun.com/docs/bundler/loaders#text',
  'loader:napi': 'https://bun.com/docs/bundler/loaders#napi',
  'loader:sqlite': 'https://bun.com/docs/bundler/loaders#sqlite',
  'loader:html': 'https://bun.com/docs/bundler/loaders#html',
  'loader:css': 'https://bun.com/docs/bundler/loaders#css',
  'bundler.loader.css': 'https://bun.com/docs/bundler/loaders#css',
  'loader:sh': 'https://bun.com/docs/bundler/loaders#sh',
  'loader:file': 'https://bun.com/docs/bundler/loaders#file',
  'bundler.loader.jsonc': 'https://bun.com/docs/bundler/loaders#jsonc',
  'bundler.asset-processing': 'https://bun.com/docs/bundler#content-types',
  // Single File Executable
  'build-time-constants': 'https://bun.com/docs/bundler/executables#build-time-constants',
  'Single-file executable build-time-constants':
    'https://bun.com/docs/bundler/executables#build-time-constants',
  // Extensions
  'plugins namespaces': 'https://bun.com/docs/bundler/plugins#namespaces',
  'plugins defer': 'https://bun.com/docs/bundler/plugins#defer',
  'plugins native-plugins': 'https://bun.com/docs/bundler/plugins#native-plugins',
  'macros when-to-use-macros': 'https://bun.com/docs/bundler/macros#when-to-use-macros',
  'macros execution': 'https://bun.com/docs/bundler/macros#execution',
  'macros dead-code-elimination': 'https://bun.com/docs/bundler/macros#dead-code-elimination',
  'macros examples': 'https://bun.com/docs/bundler/macros#examples',
  // Optimization
  'Bytecode Caching usage': 'https://bun.com/docs/bundler/bytecode#usage',
  'Bytecode Caching esm-bytecode': 'https://bun.com/docs/bundler/bytecode#esm-bytecode',
  'Bytecode Caching when-to-use-bytecode':
    'https://bun.com/docs/bundler/bytecode#when-to-use-bytecode',
  'Minifier cli-usage': 'https://bun.com/docs/bundler/minifier#cli-usage',
  'Minifier javascript-api': 'https://bun.com/docs/bundler/minifier#javascript-api',
  'Minifier dead-code-elimination': 'https://bun.com/docs/bundler/minifier#dead-code-elimination',
  'Minifier drop-console-calls': 'https://bun.com/docs/bundler/minifier#drop-console-calls',
  'Minifier when-to-use-minification':
    'https://bun.com/docs/bundler/minifier#when-to-use-minification',
  // Migration
  'esbuild javascript-api': 'https://bun.com/docs/bundler/esbuild#javascript-api',
  'esbuild plugin-api': 'https://bun.com/docs/bundler/esbuild#plugin-api',
  // Env / globals (bundler-touching)
  BUN_LOADER_JSX: 'https://bun.com/docs/bundler/loaders#jsx',

  // ── General utilities ──────────────────────────────────────────────────
  // @see pinned for tools that log runtime version in integrity/status
  'verify-channel': 'https://bun.com/docs/installation#upgrading',
  'Bun.version': 'https://bun.com/docs/runtime/utils#bun-version',
  'Bun.revision': 'https://bun.com/docs/runtime/utils#bun-revision',
  'Bun.randomUUIDv7': 'https://bun.com/docs/runtime/utils#bun-randomuuidv7',
  'Bun.Glob': 'https://bun.com/docs/runtime/glob#quickstart',
  'Bun.which': 'https://bun.com/docs/runtime/utils#bun-which',
  // Guides (llms.txt) — how-to + frozen fences in bun-docs-guide-examples.ts
  // NOTE: guides/util pages are JS-rendered; anchors verified manually against live bun.com
  'Get the path to an executable bin file':
    'https://bun.com/docs/guides/util/which-path-to-executable-bin#get-the-path-to-an-executable-bin-file',
  'which-path-to-executable-bin':
    'https://bun.com/docs/guides/util/which-path-to-executable-bin#get-the-path-to-an-executable-bin-file',
  'get-the-path-to-an-executable-bin-file':
    'https://bun.com/docs/guides/util/which-path-to-executable-bin#get-the-path-to-an-executable-bin-file',
  'Bun.nanoseconds': 'https://bun.com/docs/runtime/utils#bun-nanoseconds',
  'Bun.sleep': 'https://bun.com/docs/runtime/utils#bun-sleep',
  'Bun.sleepSync': 'https://bun.com/docs/runtime/utils#bun-sleepsync',
  'Bun.deepEquals': 'https://bun.com/docs/runtime/utils#bun-deepequals',
  'Bun.escapeHTML': 'https://bun.com/docs/runtime/utils#bun-escapehtml',
  'Bun.peek': 'https://bun.com/docs/runtime/utils#bun-peek',
  'Bun.main': 'https://bun.com/docs/runtime/utils#bun-main',
  'Bun.resolveSync': 'https://bun.com/docs/runtime/utils#bun-resolvesync',
  // Bun globals (primary) + guides + node:url compatibility (reference/)
  'Bun.fileURLToPath': 'https://bun.com/docs/runtime/utils#bun-fileurltopath',
  'Bun.pathToFileURL': 'https://bun.com/docs/runtime/utils#bun-pathtofileurl',
  'Convert a file URL to an absolute path':
    'https://bun.com/docs/guides/util/file-url-to-path#convert-a-file-url-to-an-absolute-path',
  'file-url-to-path':
    'https://bun.com/docs/guides/util/file-url-to-path#convert-a-file-url-to-an-absolute-path',
  'convert-a-file-url-to-an-absolute-path':
    'https://bun.com/docs/guides/util/file-url-to-path#convert-a-file-url-to-an-absolute-path',
  'Convert an absolute path to a file URL':
    'https://bun.com/docs/guides/util/path-to-file-url#convert-an-absolute-path-to-a-file-url',
  'path-to-file-url':
    'https://bun.com/docs/guides/util/path-to-file-url#convert-an-absolute-path-to-a-file-url',
  'convert-an-absolute-path-to-a-file-url':
    'https://bun.com/docs/guides/util/path-to-file-url#convert-an-absolute-path-to-a-file-url',
  // Node-compatible (fully implemented) — not in llms.txt /docs index; audit skips /reference/
  'node:url': 'https://bun.com/reference/node/url',
  fileURLToPath: 'https://bun.com/reference/node/url/fileURLToPath',
  'node:url/fileURLToPath': 'https://bun.com/reference/node/url/fileURLToPath',
  'url.fileURLToPath': 'https://bun.com/reference/node/url/fileURLToPath',
  pathToFileURL: 'https://bun.com/reference/node/url/pathToFileURL',
  'node:url/pathToFileURL': 'https://bun.com/reference/node/url/pathToFileURL',
  'url.pathToFileURL': 'https://bun.com/reference/node/url/pathToFileURL',
  FileUrlToPathOptions: 'https://bun.com/reference/node/url/fileURLToPath',
  PathToFileUrlOptions: 'https://bun.com/reference/node/url/pathToFileURL',
  // import.meta (module-resolution page) vs import-meta-dir guide — distinct keys, distinct pages.
  'import.meta.dir': 'https://bun.com/docs/runtime/module-resolution#import-meta',
  'import.meta': 'https://bun.com/docs/runtime/module-resolution#import-meta',
  'Get the directory of the current file':
    'https://bun.com/docs/guides/util/import-meta-dir#get-the-directory-of-the-current-file',
  'import-meta-dir':
    'https://bun.com/docs/guides/util/import-meta-dir#get-the-directory-of-the-current-file',
  'get-the-directory-of-the-current-file':
    'https://bun.com/docs/guides/util/import-meta-dir#get-the-directory-of-the-current-file',
  'Bun.deflateSync': 'https://bun.com/docs/runtime/utils#bun-deflatesync',
  'Bun.gunzipSync': 'https://bun.com/docs/runtime/utils#bun-gunzipsync',
  'Bun.inflateSync': 'https://bun.com/docs/runtime/utils#bun-inflatesync',
  'Bun.zstdCompress': 'https://bun.com/docs/runtime/utils#bun-zstdcompress-bun-zstdcompresssync',
  'Bun.zstdCompressSync':
    'https://bun.com/docs/runtime/utils#bun-zstdcompress-bun-zstdcompresssync',
  'Bun.zstdDecompress':
    'https://bun.com/docs/runtime/utils#bun-zstddecompress-bun-zstddecompresssync',
  'Bun.zstdDecompressSync':
    'https://bun.com/docs/runtime/utils#bun-zstddecompress-bun-zstddecompresssync',
  'Bun.readableStreamTo': 'https://bun.com/docs/runtime/utils#bun-readablestreamto',
  'Bun.stdin': 'https://bun.com/docs/runtime/console#reading-from-stdin',
  'Read from stdin': 'https://bun.com/docs/guides/process/stdin',
  'guides/process/stdin': 'https://bun.com/docs/guides/process/stdin',
  'Bun.spawn': 'https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn',
  'Bun.spawn terminal (PTY)': 'https://bun.com/docs/runtime/child-process#terminal-pty-support',
  'spawn terminal options': 'https://bun.com/docs/runtime/child-process#terminal-options',
  'spawn stdout guide': 'https://bun.com/docs/guides/process/spawn-stdout',
  'CI failures from terminal':
    'https://bun.com/docs/project/contributing#viewing-ci-failures-from-the-terminal',

  // ── Package manager CLI / config (depth-controlled locus batch) ─────────
  '--filter': 'https://bun.com/docs/pm/filter#package-name-filter-pattern',
  // Bundler watch (url/suggest only — excluded from annotate; ambiguous with bun test --watch)
  '--watch': 'https://bun.com/docs/bundler/index#watch-mode',
  'bun build --watch': 'https://bun.com/docs/bundler/index#watch-mode',
  '--linker': 'https://bun.com/docs/runtime/bunfig#install-linker',
  '--dry-run': 'https://bun.com/docs/pm/cli/install#dry-run',
  '--dev': 'https://bun.com/docs/pm/cli/add#dev',
  '--latest': 'https://bun.com/docs/pm/cli/update#latest',
  '--test-only': 'https://bun.com/docs/test/writing-tests#test-only',
  '--silent':
    'https://bun.com/docs/runtime/bunfig#run-silent-suppress-reporting-the-command-being-run',
  trustedDependencies: 'https://bun.com/docs/pm/lifecycle#trusteddependencies',
  globalStore: 'https://bun.com/docs/runtime/bunfig#install-globalstore',
  env: 'https://bun.com/docs/runtime/bunfig#env',
  'run.shell': 'https://bun.com/docs/runtime/bunfig#run-shell-use-the-system-shell-or-buns-shell',
  'run.noOrphans':
    'https://bun.com/docs/runtime/bunfig#run-noorphans-dont-leave-orphan-processes-behind',

  // ── Meta ───────────────────────────────────────────────────────────────
  'bun-types': BUN_TYPES_MAIN,
  'bun-types pinned': BUN_TYPES_PINNED,
  'Bun repository': BUN_REPOSITORY,
  'llms.txt index': 'https://bun.com/docs/llms.txt',
  'markdown docs': 'https://bun.com/docs/runtime/markdown.md',
  // Operational endpoints (verified live; bun.com has no subdomains —
  // everything is path-based under the apex + www)
  'rss feed': 'https://bun.com/rss.xml',
  discord: 'https://bun.com/discord',
  issues: 'https://bun.com/issues',
  'install script': 'https://bun.com/install.sh',
  download: 'https://bun.com/download',
  'security policy': 'https://github.com/oven-sh/bun/security/policy',
};

/**
 * Keys scanned by check/annotate: Bun.* properties, bun:* modules, and
 * PascalCase identifiers imported from the `bun` package
 * (RedisClient, S3Client, CookieMap, YAML, …).
 *
 * Excluded from scan (still in CANONICAL_REFS for url/list):
 *   - meta labels (llms.txt, rss feed, …)
 *   - ultra-common globals (console) — every file would need a @see
 *   - ambiguous short tokens (dns, redis) — use RedisClient / Bun.dns instead
 */
/** Concept / nav labels that match PascalCase but are not code symbols to annotate. */
const CONCEPT_ONLY_KEYS = new Set(bundlerNavConceptOnlyKeys());

function isCodeApiKey(k: string): boolean {
  if (k === 'console' || k === 'dns' || k === 'redis') return false;
  if (CONCEPT_ONLY_KEYS.has(k)) return false;
  // Ambiguous CLI flag: bundler watch vs `bun test --changed --watch` (blog #bun-test-changed)
  if (k === '--watch') return false;
  // Bundler CLI flags that collide with unrelated --env / --version / --console surfaces
  if (k === '--env' || k === '--version' || k === '--console') return false;
  if (k.startsWith('Bun.') || k.startsWith('bun:') || k.startsWith('--')) return true;
  // PascalCase Bun package exports / types
  if (/^[A-Z][A-Za-z0-9]+$/.test(k)) return true;
  return false;
}

const APIS = Object.keys(CANONICAL_REFS).filter(isCodeApiKey);

/** Code-scan keys from CANONICAL_REFS (Bun.*, bun:*, flags, PascalCase exports). */
export function listCodeApiKeys(): readonly string[] {
  return APIS;
}

function printUrl(api: string): void {
  const url = CANONICAL_REFS[api] ?? CANONICAL_REFS[resolveApiAlias(api)];
  if (!url) {
    console.error(`❌ no canonical ref for "${api}". Known APIs:`);
    for (const k of Object.keys(CANONICAL_REFS)) console.error(`   ${k}`);
    process.exit(1);
  }
  console.info(`${api} → ${url}`);
}

/** Accept common aliases (Bun.redis → RedisClient, bun.cron → Bun.cron). */
export function resolveApiAlias(api: string): string {
  const aliases: Record<string, string> = {
    'Bun.redis': 'RedisClient',
    BunRedis: 'RedisClient',
    'bun.redis': 'RedisClient',
    'Bun.RedisClient': 'RedisClient',
    'bun.cron': 'Bun.cron',
    CronJob: 'Bun.cron',
    'Bun.CookieMap': 'CookieMap',
    'bun.s3': 'S3Client',
    'Bun.S3Client': 'S3Client',
    'Bun.csrf': 'Bun.CSRF',
    'Bun.CSRF.generate': 'Bun.CSRF',
    CSRF: 'Bun.CSRF',
    'bun.env': 'Bun.env',
  };
  return aliases[api] ?? api;
}

function listRefs(): void {
  for (const [api, url] of Object.entries(CANONICAL_REFS)) {
    console.info(`${api.padEnd(28)} ${url}`);
  }
}

async function tsFiles(paths: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const p of paths) {
    const info = await Bun.file(p)
      .stat()
      .catch(() => null);
    if (info?.isDirectory()) {
      const glob = new Bun.Glob('**/*.ts');
      for await (const f of glob.scan({ cwd: p, absolute: true })) out.push(f);
    } else if (p.endsWith('.ts')) {
      out.push(p);
    }
  }
  return out;
}

type MissingRef = { file: string; api: string; url: string };

/** True when `api` appears as a code identifier (not a substring of a longer name). */
function codeUsesApi(code: string, api: string): boolean {
  // Boundary-aware for all keys so:
  //   bun:sql  ≠ bun:sqlite
  //   Bun.env  ≠ Bun.environment (future)
  //   redis    ≠ ioredis
  //   dns      ≠ kindness / dns-prefetch strings still match "dns" token — keep
  //              short tokens out of isCodeApiKey instead.
  const escaped = api.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Allow trailing `.` for Bun.inspect.table when scanning Bun.inspect (optional);
  // refuse alphanumeric / `:` continuation so bun:sql stops before bun:sqlite's `ite`.
  return new RegExp(`(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_:])`).test(code);
}

/** Detect Bun API usages lacking a canonical doc ref (code lines only). */
async function findMissing(paths: string[]): Promise<MissingRef[]> {
  const missing: MissingRef[] = [];
  for (const file of await tsFiles(paths)) {
    const text = await Bun.file(file).text();
    // Only count usage in actual code lines (comments/doc headers are
    // reference material, not usage)
    const code = text
      .split('\n')
      .filter(l => {
        const t = l.trim();
        return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
      })
      .join('\n');
    for (const api of APIS) {
      if (!codeUsesApi(code, api)) continue;
      const url = CANONICAL_REFS[api];
      const [base, anchor] = url.split('#');
      const referenced =
        text.includes(url) ||
        text.includes(base) ||
        (anchor !== undefined && text.includes('#' + anchor));
      if (!referenced) missing.push({ file, api, url });
    }
  }
  return missing;
}

/** Find Bun.* usages whose file has no matching @see / doc link. */
async function check(paths: string[]): Promise<number> {
  const missing = await findMissing(paths);
  for (const m of missing) {
    console.info(`  ${m.file}: uses ${m.api} without a doc ref`);
    console.info(`    add: @see ${m.url}`);
  }
  if (missing.length === 0) console.info('✅ all Bun API usages have canonical doc refs');
  return missing.length;
}

/**
 * Insert `// @see <url> — <api>` header lines into files missing refs.
 * Idempotent (driven by findMissing). Default is dry-run; pass --write.
 */
async function annotate(paths: string[], write: boolean): Promise<number> {
  const missing = await findMissing(paths);
  const byFile = new Map<string, MissingRef[]>();
  for (const m of missing) byFile.set(m.file, [...(byFile.get(m.file) ?? []), m]);
  for (const [file, refs] of byFile) {
    const text = await Bun.file(file).text();
    const lines = text.split('\n');
    // Insertion point: after shebang and leading blank lines
    let at = 0;
    if (lines[0]?.startsWith('#!')) at = 1;
    while (at < lines.length && lines[at].trim() === '') at++;
    const header = refs.map(r => `// @see ${r.url} — ${r.api}`);
    if (write) {
      lines.splice(at, 0, ...header);
      await Bun.write(file, lines.join('\n'));
    }
    console.info(`${write ? '📝' : '🔍'} ${file}`);
    for (const r of refs) console.info(`   ${r.api} → ${r.url}`);
  }
  console.info(
    write
      ? `✅ annotated ${byFile.size} files (${missing.length} refs)`
      : `🔍 dry-run: ${byFile.size} files would be annotated (${missing.length} refs) — pass --write`
  );
  return byFile.size;
}

/** HTTP-validate every bun.com/github/no-color doc link found in the files. */
async function validate(paths: string[]): Promise<number> {
  // Character class stops at markup/quotes and template-literal `${` so
  // doc text like </link>, trailing ', and `...${var}` stems never pollute
  const urlRe =
    /https:\/\/(?:bun\.com|github\.com\/oven-sh|no-color\.org|nodejs\.org)[a-zA-Z0-9\-._~:/?#@!&*+,;=%[\]]*/g;
  const urls = new Set<string>();
  for (const file of await tsFiles(paths)) {
    const text = await Bun.file(file).text();
    // Skip intentional placeholder URLs: lines/blocks marked @planned are
    // cataloged future links, not live references (e.g. domains.ts catalog)
    const lines = text.split('\n');
    let plannedBlock = false;
    for (const line of lines) {
      if (line.includes('@planned')) plannedBlock = true;
      else if (line.trim().startsWith('};') || line.trim().startsWith('];')) plannedBlock = false;
      if (plannedBlock) continue;
      for (const m of line.matchAll(urlRe)) {
        // Skip template-literal stems: `https://.../tree/${var}` is not a real URL
        const after = line.slice(m.index! + m[0].length, m.index! + m[0].length + 2);
        if (after === '${') continue;
        urls.add(m[0].replace(/[).,;*]+$/, ''));
      }
    }
  }
  let bad = 0;
  for (const url of urls) {
    const ok = await fetch(url, { method: 'HEAD', redirect: 'follow' })
      .then(r => r.status < 400)
      .catch(() => false);
    console.info(`${ok ? '✅' : '❌'} ${url}`);
    if (!ok) bad++;
  }
  console.info(bad === 0 ? `\n✅ ${urls.size} links valid` : `\n❌ ${bad} broken links`);
  return bad;
}

/** Lazy-load the generated docs index (tools/bun-docs-index.json). */
async function docsIndex(): Promise<{
  generated?: string;
  source?: string;
  bunVersion?: string;
  entries: Array<{
    title: string;
    url: string;
    desc: string;
    domain: string;
    anchors: string[];
    officialSection?: string;
  }>;
}> {
  const path = new URL('./bun-docs-index.json', import.meta.url).pathname;
  return Bun.file(path).json();
}

import { slugify } from '../lib/text';

type TokenCatalog = {
  page: string;
  pageTitle: string;
  cliFlags: Record<string, string>;
  envVars: Record<string, string>;
  bunfigKeys: Record<string, string>;
  packageJsonKeys: Record<string, string>;
};

/** Detect whether a parsed JSON object is a flat TokenCatalog or a nested map. */
function isTokenCatalog(value: unknown): value is TokenCatalog {
  const v = value as Record<string, unknown> | undefined;
  return !!v && typeof v.page === 'string' && typeof v.cliFlags === 'object';
}

/** Load every `tools/*-tokens.json` catalog (CLI flags, env vars, config keys).
 * Supports both flat catalogs and generated nested maps keyed by page title. */
async function loadTokenCatalogs(): Promise<TokenCatalog[]> {
  const root = new URL('..', import.meta.url).pathname;
  const glob = new Bun.Glob('tools/*-tokens.json');
  const files: string[] = [];
  for await (const f of glob.scan({ cwd: root, absolute: true })) files.push(f);
  const catalogs: TokenCatalog[] = [];
  for (const f of files.sort()) {
    try {
      const parsed = (await Bun.file(f).json()) as unknown;
      if (isTokenCatalog(parsed)) {
        catalogs.push(parsed);
      } else if (parsed && typeof parsed === 'object') {
        // Generated nested format: { "bun install": TokenCatalog, ... }
        for (const entry of Object.values(parsed)) {
          if (isTokenCatalog(entry)) catalogs.push(entry);
        }
      }
    } catch {
      // ignore malformed token catalogs
    }
  }
  return catalogs;
}

type CatalogEntry = {
  name: string;
  type: 'api' | 'cli-flag' | 'config' | 'concept';
  stability: 'stable' | 'experimental' | 'deprecated';
  description?: string;
  canonicalPage: string;
  anchor?: string;
  allPages: string[];
};

function isCatalog(value: unknown): value is { entries: CatalogEntry[] } {
  const v = value as Record<string, unknown> | undefined;
  return !!v && Array.isArray(v.entries);
}

/** Load the generated docs catalog (tools/bun-docs-catalog.json), if present. */
async function loadDocsCatalog(): Promise<CatalogEntry[] | null> {
  const path = new URL('./bun-docs-catalog.json', import.meta.url).pathname;
  try {
    const parsed = (await Bun.file(path).json()) as unknown;
    return isCatalog(parsed) ? parsed.entries : null;
  } catch {
    return null;
  }
}

/**
 * Resolve a real CLI/config token to its canonical doc URL.
 * Tokens live in `tools/*-tokens.json` (flat or generated nested maps) and in
 * `tools/bun-docs-catalog.json` (typed unified catalog).
 */
async function tokenLookup(query: string): Promise<void> {
  if (!query) {
    console.error('usage: bun tools/bun-doc-refs.ts token <token>');
    process.exit(1);
  }
  const catalogs = await loadTokenCatalogs();
  const docsCatalog = await loadDocsCatalog();
  const q = query.trim();
  const normalized = q.replace(/^-+/, ''); // allow `--filter` or `filter`

  // 1. Authoritative manual catalogs first.
  for (const cat of catalogs) {
    const hits: Array<[kind: string, url: string]> = [];
    if (cat.cliFlags[q] || cat.cliFlags[`--${normalized}`]) {
      hits.push(['CLI flag', cat.cliFlags[q] ?? cat.cliFlags[`--${normalized}`]!]);
    }
    if (cat.envVars[q]) hits.push(['env var', cat.envVars[q]!]);
    if (cat.bunfigKeys[q]) hits.push(['bunfig.toml key', cat.bunfigKeys[q]!]);
    if (cat.packageJsonKeys[q]) hits.push(['package.json key', cat.packageJsonKeys[q]!]);
    if (hits.length > 0) {
      console.info(`${q} → ${cat.pageTitle}`);
      for (const [kind, url] of hits) {
        console.info(`  [${kind}] ${url}`);
      }
      return;
    }
  }

  // 2. Generated docs catalog (APIs, CLI flags, env vars/config keys, concepts).
  if (docsCatalog) {
    for (const entry of docsCatalog) {
      if (entry.name === q || (entry.type === 'cli-flag' && entry.name === `--${normalized}`)) {
        const url = entry.anchor ? `${entry.canonicalPage}#${entry.anchor}` : entry.canonicalPage;
        console.info(`${entry.name}`);
        console.info(`  [${entry.type}] ${url}`);
        if (entry.stability !== 'stable') console.info(`  [stability] ${entry.stability}`);
        if (entry.description) console.info(`  ${entry.description}`);
        if (entry.allPages.length > 1) {
          console.info(
            `  [also on] ${entry.allPages.slice(1, 6).join(', ')}${entry.allPages.length > 6 ? '...' : ''}`
          );
        }
        return;
      }
    }
  }

  console.error(`❌ no token catalog entry for "${q}"`);
  console.error('   known CLI/config tokens:');
  for (const cat of catalogs) {
    for (const k of Object.keys(cat.cliFlags)) console.error(`     ${k}`);
    for (const k of Object.keys(cat.envVars)) console.error(`     ${k}`);
    for (const k of Object.keys(cat.bunfigKeys)) console.error(`     ${k}`);
    for (const k of Object.keys(cat.packageJsonKeys)) console.error(`     ${k}`);
  }
  process.exit(1);
}

/**
 * Map any API name or topic to its canonical Bun docs page + anchor using
 * the generated index. Matches: exact anchor, title substring, then desc.
 */
function printExamples(
  examples: Array<{ lang: string; code: string; description?: string }>,
  limit = 6
): void {
  for (const ex of examples.slice(0, limit)) {
    const label = ex.description ? `example[${ex.lang} ${ex.description}]` : `example[${ex.lang}]`;
    const lines = ex.code.split('\n');
    if (lines.length === 1) {
      console.info(`  ${label}: ${lines[0]}`);
      continue;
    }
    console.info(`  ${label}:`);
    for (const line of lines) console.info(`    ${line}`);
  }
}

function printBunTokenSuggest(
  query: string,
  token: import('../lib/docs/bun-token.ts').BunToken,
  source: string,
  opts?: { locusOverride?: string }
): void {
  const locus =
    opts?.locusOverride ??
    (token.docsLocus.anchor != null
      ? `${token.docsLocus.page}#${token.docsLocus.anchor}`
      : token.docsLocus.page);
  console.info(`${query} → ${locus}`);
  console.info(`  (${source} — BunToken)`);
  console.info(`  kind: ${token.kind}  stability: ${token.stability}`);
  if (token.description) console.info(`  ${token.description}`);
  if (token.docsLocus.anchor == null && !opts?.locusOverride?.includes('#')) {
    console.info(`  docsLocus: page-only (anchor unresolved)`);
  }
  if (token.examples.length) printExamples(token.examples);
  console.info(`  since: ${token.since ?? 'unknown'}`);
  if (token.versionEvents.length > 0) {
    const summary = token.versionEvents
      .slice(0, 6)
      .map(e => `${e.type}@${e.version}`)
      .join(' · ');
    console.info(
      `  versionEvents: ${summary}${token.versionEvents.length > 6 ? '…' : ''} (${token.versionEvents.length})`
    );
  }
  if (token.announcementUrl) console.info(`  announcementUrl: ${token.announcementUrl}`);
  if (token.related?.length) {
    console.info(
      `  related: ${token.related.slice(0, 5).join(', ')}${token.related.length > 5 ? '…' : ''}`
    );
  }
  if (token.meta?.buildPin) console.info(`  meta.buildPin: ${token.meta.buildPin}`);
  // Bidirectional: curated.auditRefs → audit SSOT (never BunToken fields)
  const curated = getCuratedEntry(query) ?? getCuratedEntry(resolveApiAlias(query) ?? query);
  if (curated?.auditRefs?.length) {
    console.info(`  auditRefs: ${curated.auditRefs.join(', ')}`);
    console.info(`  also try: bun tools/bun-doc-refs.ts suggest --audit "${curated.auditRefs[0]}"`);
  }
}

/**
 * Resolve BunToken for a frozen URL.
 * Never scavenge peer examples from the same page (that glued Bun.serve onto process.env).
 * Prefer frozen guide fences (token→guide map or mapped guide URL) for example[lang]/code.
 */
async function bunTokenForMapped(
  query: string,
  mapped: string
): Promise<import('../lib/docs/bun-token.ts').BunToken | null> {
  const { getBunToken, loadCatalogFile } = await import('./bun-docs-catalog.ts');
  const { catalogEntryToBunToken } = await import('../lib/docs/token-ref-adapter.ts');
  const { guideExamplesForQuery } = await import('./bun-docs-guide-examples.ts');

  const page = mapped.replace(/#.*$/, '');
  const frozen = guideExamplesForQuery(query, mapped).map(e => ({
    lang: e.lang,
    code: e.body,
  }));

  const direct = (await getBunToken(query)) ?? (await getBunToken(resolveApiAlias(query)));

  if (direct) {
    if (frozen.length) return { ...direct, examples: frozen };
    return direct;
  }

  if (frozen.length) {
    const meta = await loadCatalogFile();
    // Only reuse catalog metadata when the entry name matches the query (never peer page)
    const named =
      meta.entries.find(e => e.name === query) ??
      meta.entries.find(e => e.name === resolveApiAlias(query));
    if (named) {
      return {
        ...catalogEntryToBunToken(named, { catalogGenerated: meta.generated }),
        examples: frozen,
      };
    }
    return {
      name: query,
      kind: 'Concept',
      description: '',
      stability: 'stable',
      docsLocus: {
        page,
        anchor: mapped.includes('#') ? (mapped.split('#')[1] ?? null) : null,
        status: mapped.includes('#') ? 'fragment' : 'page',
      },
      since: null,
      announcementUrl: null,
      versionEvents: [],
      examples: frozen,
    };
  }

  return null;
}

/** FactoryWager audit suggest — findings + concepts (sibling SSOT, never BunToken). */
async function suggestAudit(query: string, opts?: { json?: boolean }): Promise<boolean> {
  if (!query) {
    console.error(
      'usage: bun tools/bun-doc-refs.ts suggest --audit [--json] <finding-id-or-topic>'
    );
    process.exit(1);
  }
  const { loadAuditCatalog, searchAuditCatalog, printAuditEntry } = await import(
    './audit-catalog.ts'
  );
  const { resolveAuditAlias } = await import('../lib/audit/audit-refs.ts');
  let catalog: Awaited<ReturnType<typeof loadAuditCatalog>>;
  try {
    catalog = await loadAuditCatalog();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (opts?.json) {
      console.info(
        JSON.stringify({
          ok: false,
          query,
          error: msg,
          repair: 'bun run audit:catalog:build',
        })
      );
    } else {
      console.error(`❌ audit catalog load failed: ${msg}`);
      console.error('   repair: bun run audit:catalog:build');
    }
    process.exit(1);
  }
  const alias = resolveAuditAlias(query);
  const hits = searchAuditCatalog(catalog, query);
  if (hits.length === 0) {
    if (opts?.json) {
      console.info(JSON.stringify({ ok: false, query, alias: alias ?? null, hits: [] }));
    } else {
      console.info(`❌ no audit entries for "${query}"`);
      console.info('  (sibling SSOT — tools/audit-catalog.json · lib/audit/)');
    }
    return false;
  }
  if (opts?.json) {
    console.info(
      JSON.stringify(
        {
          ok: true,
          query,
          alias: alias ?? null,
          source: 'tools/audit-catalog.json',
          bunToken: false,
          hits,
        },
        null,
        2
      )
    );
    return true;
  }
  if (alias && hits[0] && normalizeAuditSuggestId(hits[0].id) === normalizeAuditSuggestId(alias)) {
    console.info(`alias: "${query}" → ${alias}`);
  }
  for (const e of hits) {
    printAuditEntry(e);
    console.info('  (audit catalog — tools/audit-catalog.json · not BunToken)');
    console.info('---');
  }
  return true;
}

function normalizeAuditSuggestId(id: string | { toString(): string }): string {
  // brand-ok — suggest compare key
  return String(id).trim().toLowerCase();
}

async function suggest(query: string): Promise<void> {
  if (!query) {
    console.error('usage: bun tools/bun-doc-refs.ts suggest <api-or-topic>');
    console.error(
      '       bun tools/bun-doc-refs.ts suggest --audit [--json] <finding-id-or-topic>'
    );
    console.error('       bun tools/bun-doc-refs.ts index-audit');
    process.exit(1);
  }

  // 1) Frozen institutional map wins (never lose to a bad catalog dump locus)
  const mapped = CANONICAL_REFS[query] ?? CANONICAL_REFS[resolveApiAlias(query)];
  const platformToken =
    CANONICAL_INSTALL_PLATFORM_TOKENS[query] ??
    CANONICAL_INSTALL_PLATFORM_TOKENS[resolveApiAlias(query)];
  const envToken =
    CANONICAL_INSTALL_ENV_TOKENS[query] ?? CANONICAL_INSTALL_ENV_TOKENS[resolveApiAlias(query)];
  const registryClientToken =
    CANONICAL_REGISTRY_CLIENT_TOKENS[query] ??
    CANONICAL_REGISTRY_CLIENT_TOKENS[resolveApiAlias(query)];
  const runtimeNitsToken =
    CANONICAL_RUNTIME_NITS_TOKENS[query] ?? CANONICAL_RUNTIME_NITS_TOKENS[resolveApiAlias(query)];
  if (mapped) {
    const upstreamSourceDescription =
      query === 'bun-types'
        ? 'Current TypeScript declaration source in the upstream Bun repository.'
        : query === 'bun-types pinned'
          ? 'Immutable TypeScript declaration source matching the project bun-types pin.'
          : query === 'Bun repository'
            ? 'Canonical upstream source repository for Bun.'
            : null;
    if (upstreamSourceDescription) {
      console.info(`${query} → ${mapped}`);
      console.info('  (canonical upstream source — tools/bun-doc-refs.ts CANONICAL_REFS)');
      console.info(`  ${upstreamSourceDescription}`);
      return;
    }
    if (platformToken) {
      console.info(`${query} → ${platformToken.url}`);
      console.info(`  kind: ${platformToken.kind}  stability: ${platformToken.stability}`);
      console.info('  (canonical map — tools/bun-doc-refs.ts CANONICAL_INSTALL_PLATFORM_TOKENS)');
      return;
    }
    if (envToken) {
      console.info(`${query} → ${envToken.url}`);
      console.info(`  kind: ${envToken.kind}  stability: ${envToken.stability}`);
      if (envToken.description) console.info(`  description: ${envToken.description}`);
      console.info('  (canonical map — tools/bun-doc-refs.ts CANONICAL_INSTALL_ENV_TOKENS)');
      return;
    }
    if (registryClientToken) {
      console.info(`${query} → ${registryClientToken.url}`);
      console.info(
        `  kind: ${registryClientToken.kind}  stability: ${registryClientToken.stability}`
      );
      if (registryClientToken.description)
        console.info(`  description: ${registryClientToken.description}`);
      console.info('  (canonical map — tools/bun-doc-refs.ts CANONICAL_REGISTRY_CLIENT_TOKENS)');
      return;
    }
    if (runtimeNitsToken) {
      console.info(`${query} → ${runtimeNitsToken.url}`);
      console.info(`  kind: ${runtimeNitsToken.kind}  stability: ${runtimeNitsToken.stability}`);
      if (runtimeNitsToken.description)
        console.info(`  description: ${runtimeNitsToken.description}`);
      console.info('  (canonical map — tools/bun-doc-refs.ts CANONICAL_RUNTIME_NITS_TOKENS)');
      return;
    }
    try {
      const token = await bunTokenForMapped(query, mapped);
      if (token) {
        printBunTokenSuggest(query, token, 'canonical map — tools/bun-doc-refs.ts CANONICAL_REFS', {
          locusOverride: mapped,
        });
        return;
      }
    } catch {
      /* catalog optional */
    }
    console.info(`${query} → ${mapped}`);
    console.info('  (canonical map — tools/bun-doc-refs.ts CANONICAL_REFS)');
    return;
  }

  // 2) BunToken export when no frozen key
  try {
    const { getBunToken } = await import('./bun-docs-catalog.ts');
    const token = await getBunToken(query);
    if (token) {
      printBunTokenSuggest(query, token, 'catalog — tools/bun-docs-catalog.json');
      return;
    }
  } catch {
    /* catalog optional */
  }

  // 2b) FactoryWager audit sibling SSOT (concepts + findings) — never BunToken
  try {
    const { resolveAuditAlias } = await import('../lib/audit/audit-refs.ts');
    if (resolveAuditAlias(query)) {
      const ok = await suggestAudit(query);
      if (ok) return;
    } else {
      const { loadAuditCatalog, searchAuditCatalog } = await import('./audit-catalog.ts');
      const catalog = await loadAuditCatalog();
      const auditHits = searchAuditCatalog(catalog, query);
      if (auditHits.length > 0) {
        await suggestAudit(query);
        return;
      }
    }
  } catch {
    /* audit catalog optional */
  }

  const { entries } = await docsIndex();
  const q = query.toLowerCase();
  const anchorGuess = slugify(query);

  // 3. exact anchor match on a page
  for (const e of entries) {
    if (e.anchors.includes(anchorGuess)) {
      const url = e.url.replace(/\.md$/, '');
      console.info(`${query} → ${url}#${anchorGuess}`);
      console.info(`  (${e.title} — ${e.desc})`);
      return;
    }
  }
  // 2. title match (substring, ranked by earliest occurrence)
  const titleHits = entries
    .filter(e => e.title.toLowerCase().includes(q))
    .sort((a, b) => a.title.toLowerCase().indexOf(q) - b.title.toLowerCase().indexOf(q))
    .slice(0, 5);
  // 3. last segment of a dotted/camel query (e.g. "Bun.secrets" → "secrets")
  //    matched against page title or URL path
  const lastSeg = (query.includes('.') ? query.split('.').pop()! : query)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();
  const segHits = entries.filter(
    e =>
      e.title.toLowerCase() === lastSeg ||
      e.url.toLowerCase().includes('/' + lastSeg.replace(/ /g, '-')) ||
      e.title.toLowerCase().split(' ').includes(lastSeg)
  );
  const hits = titleHits.length > 0 ? titleHits : segHits.slice(0, 5);
  if (hits.length > 0) {
    console.info(`closest pages for "${query}":`);
    for (const e of hits) {
      console.info(
        `  ${e.url.replace(/\.md$/, '')} — ${e.title}${e.officialSection ? `  [${e.officialSection}]` : ''}`
      );
      if (e.anchors.length > 0)
        console.info(
          `    anchors: ${e.anchors.slice(0, 6).join(', ')}${e.anchors.length > 6 ? '…' : ''}`
        );
    }
    return;
  }
  const llms = CANONICAL_REFS['llms.txt index'] ?? 'https://bun.com/docs/llms.txt';
  console.info(
    `❌ no docs page found for "${query}" — browse frozen key "llms.txt index" → ${llms}`
  );
  // Sibling audit catalog hint (findings + concepts — never merge into BunToken)
  try {
    const { loadAuditCatalog, searchAuditCatalog } = await import('./audit-catalog.ts');
    const catalog = await loadAuditCatalog();
    const auditHits = searchAuditCatalog(catalog, query);
    if (auditHits.length > 0) {
      console.info(
        `  also try: bun tools/bun-doc-refs.ts suggest --audit "${query}"  (${auditHits.length} audit hit(s))`
      );
    }
  } catch {
    /* audit catalog optional */
  }
  process.exit(1);
}

/** Resolve a docs page URL against the index (bare /docs/runtime → runtime/index.md). */
function indexEntryForDocsUrl(
  entries: Awaited<ReturnType<typeof docsIndex>>['entries'],
  baseUrl: string
): (typeof entries)[number] | undefined {
  const bare = baseUrl.replace(/\.md$/i, '');
  return (
    entries.find(e => e.url.replace(/\.md$/, '') === bare) ??
    entries.find(e => e.url.replace(/\.md$/, '') === `${bare}/index`) ??
    entries.find(e => e.url === `${bare}.md`) ??
    entries.find(e => e.url === `${bare}/index.md`)
  );
}

/** Verify every CANONICAL_REFS anchor against the generated docs index. */ async function audit(): Promise<number> {
  const { entries } = await docsIndex();
  let bad = 0;
  for (const [api, url] of Object.entries(CANONICAL_REFS)) {
    if (!url.startsWith('https://bun.com/docs') || url.endsWith('llms.txt') || url.endsWith('.md'))
      continue;
    const [base, anchor] = url.split('#');
    if (!anchor) continue;
    const entry = indexEntryForDocsUrl(entries, base!);
    if (!entry) {
      console.info(`❌ ${api}: page not in index: ${base}`);
      bad++;
      continue;
    }
    const titleSlug = slugify(entry.title);
    // Mintlify guide share links: #slug(H1 title) when the index lists no section anchors
    const anchorOk =
      entry.anchors.includes(anchor) || (entry.anchors.length === 0 && titleSlug === anchor);
    if (!anchorOk) {
      console.info(`❌ ${api}: anchor missing from page: #${anchor}`);
      console.info(
        `   available: ${entry.anchors.slice(0, 8).join(', ') || `(title slug: ${titleSlug})`}…`
      );
      bad++;
    }
  }
  console.info(bad === 0 ? '✅ all anchored refs verified against index' : `❌ ${bad} bad refs`);
  return bad;
}

/**
 * Deep anchor check: every bun.com/docs#anchor link in the given files is
 * verified against the generated docs index (bun-docs-index.json), resolving
 * directory index pages (/docs/test → test/index.md). Catches dead anchors
 * that plain HTTP validation cannot (200 page, missing fragment).
 */
async function deepcheck(paths: string[]): Promise<number> {
  const { entries } = await docsIndex();
  const linkRe = /https:\/\/bun\.com\/docs\/([a-z0-9\-/]+)#([a-z0-9-]+)/g;
  const findEntry = (path: string) =>
    entries.find(e => e.url === `https://bun.com/docs/${path}.md`) ??
    entries.find(e => e.url === `https://bun.com/docs/${path}/index.md`);
  let checked = 0;
  let bad = 0;
  for (const file of await tsFiles(paths)) {
    const text = await Bun.file(file).text();
    for (const m of text.matchAll(linkRe)) {
      checked++;
      const [, path, anchor] = m;
      const entry = findEntry(path);
      if (!entry) {
        console.info(`❌ ${file}: page not indexed: ${path}#${anchor}`);
        bad++;
        continue;
      }
      if (!entry.anchors.includes(anchor)) {
        console.info(`❌ ${file}: dead anchor ${path}#${anchor}`);
        bad++;
      }
    }
  }
  console.info(
    bad === 0
      ? `✅ ${checked} anchored bun.com links verified against index`
      : `❌ ${bad}/${checked} dead anchors`
  );
  return bad;
}

import { LLMS_URL } from '../lib/shared/tools/bun-urls.ts';

const TAXONOMY_PATH = new URL('./bun-docs-taxonomy.json', import.meta.url).pathname;
const INTEGRITY_LOG = 'reports/doc-integrity.jsonl';

type TaxonomyFile = {
  _comment?: string;
  aliases?: Record<string, string>;
  sections?: Record<string, string[]>;
};

/** Levenshtein distance for small title strings (taxonomy auto-fix). */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[m]![n]!;
}

/**
 * Best fuzzy match of a sidebar title against live/index titles.
 * Prefers exact, then containment, then edit-distance similarity ≥ minScore.
 */
function bestFuzzyMatch(
  needle: string,
  haystack: readonly string[],
  minScore = 0.72
): { match: string; score: number } | null {
  const n = needle.toLowerCase().trim();
  if (!n) return null;
  let best: string | null = null;
  let bestScore = 0;
  for (const h of haystack) {
    const hl = h.toLowerCase().trim();
    if (!hl) continue;
    if (hl === n) return { match: hl, score: 1 };
    let score = 0;
    if (hl.includes(n) || n.includes(hl)) {
      score = Math.min(n.length, hl.length) / Math.max(n.length, hl.length);
    }
    const edit = 1 - levenshtein(n, hl) / Math.max(n.length, hl.length, 1);
    score = Math.max(score, edit);
    // Prefer shorter titles when scores tie (Utils vs Utilities Utils Extra)
    if (score > bestScore || (score === bestScore && best && hl.length < best.length)) {
      bestScore = score;
      best = hl;
    }
  }
  return best && bestScore >= minScore ? { match: best, score: bestScore } : null;
}

/** Titles from local index (fast) and optional live llms.txt refresh. */
async function collectLiveTitles(useNetwork: boolean): Promise<string[]> {
  const idx = await docsIndex();
  const titles = new Set(idx.entries.map(e => e.title));
  if (useNetwork) {
    try {
      const text = await (await fetch(LLMS_URL)).text();
      for (const line of text.split('\n')) {
        const m = line.match(/^- \[(.+?)\]\(/);
        if (m?.[1]) titles.add(m[1]);
      }
    } catch (e) {
      console.info(`⚠️  live llms.txt fetch failed: ${e} — using local index only`);
    }
  }
  return [...titles];
}

/**
 * Auto-heal taxonomy alias drift: sidebar titles that no longer match llms/index
 * titles get aliases when a high-confidence fuzzy match exists.
 * Writes tools/bun-docs-taxonomy.json in place.
 */
async function fixTaxonomyAliases(opts?: {
  live?: boolean;
  dryRun?: boolean;
  minScore?: number;
}): Promise<{ fixed: Array<{ from: string; to: string; score: number }>; unresolved: string[] }> {
  const taxPath = TAXONOMY_PATH;
  const tax = (await Bun.file(taxPath).json()) as TaxonomyFile;
  if (!tax.sections) {
    console.info('❌ no taxonomy sections — cannot --fix');
    return { fixed: [], unresolved: [] };
  }

  const liveTitles = await collectLiveTitles(opts?.live !== false);
  const titleSet = new Set(liveTitles.map(t => t.toLowerCase()));
  const aliases: Record<string, string> = {};
  for (const [k, v] of Object.entries(tax.aliases ?? {})) {
    if (k.startsWith('_')) continue;
    if (typeof v === 'string') aliases[k] = v;
  }

  const fixed: Array<{ from: string; to: string; score: number }> = [];
  const unresolved: string[] = [];

  for (const pages of Object.values(tax.sections)) {
    for (const page of pages) {
      const key = page.toLowerCase();
      if (titleSet.has(key)) continue;
      if (aliases[key] !== undefined && titleSet.has(String(aliases[key]).toLowerCase())) continue;

      const hit = bestFuzzyMatch(page, liveTitles, opts?.minScore ?? 0.72);
      if (!hit) {
        unresolved.push(page);
        continue;
      }
      // Don't alias to itself if case differs only — store lowercase key → lowercase title
      if (hit.match === key) {
        // Title case drift only — still counts as covered once index has exact key
        continue;
      }
      aliases[key] = hit.match;
      fixed.push({ from: page, to: hit.match, score: hit.score });
      console.info(`🔧 alias: "${page}" → "${hit.match}" (score ${(hit.score * 100).toFixed(0)}%)`);
    }
  }

  if (fixed.length === 0) {
    console.info(
      unresolved.length === 0
        ? '✅ taxonomy aliases already cover all sidebar pages'
        : `⚠️  no high-confidence fixes; unresolved: ${unresolved.join(', ')}`
    );
    return { fixed, unresolved };
  }

  if (opts?.dryRun) {
    console.info(`📝 dry-run: would write ${fixed.length} alias(es) to ${taxPath}`);
    return { fixed, unresolved };
  }

  const next: TaxonomyFile = {
    ...tax,
    aliases: {
      _comment:
        'Sidebar titles that differ from llms.txt page titles (lowercase). Auto-healed by: bun tools/bun-doc-refs.ts integrity --fix',
      ...aliases,
    },
  };
  await Bun.write(taxPath, JSON.stringify(next, null, 2) + '\n');
  console.info(`✅ wrote ${fixed.length} alias(es) → tools/bun-docs-taxonomy.json`);
  return { fixed, unresolved };
}

type IntegrityStats = {
  taxHit: number;
  taxTotal: number;
  pages: number;
  anchors: number;
  tagged: number;
  mapBad: number;
  linkBad: number;
  failed: number;
  bunVersion: string;
};

/**
 * Unified integrity report for the whole reference stack:
 * taxonomy coverage → index anchors → canonical map anchors → repo links.
 * Exit 1 if any layer fails — CI-callable proof of the doc stack.
 *
 * Flags (via integrity CLI):
 *   --fix       auto-heal taxonomy aliases from live/index titles, then re-check
 *   --fix-dry   report alias fixes without writing taxonomy
 *   --no-live    --fix uses local index only (no llms.txt fetch)
 */
async function integrity(opts?: {
  fix?: boolean;
  fixDry?: boolean;
  live?: boolean;
}): Promise<number> {
  if (opts?.fix || opts?.fixDry) {
    console.info(
      opts.fixDry
        ? '\n🩹 integrity --fix-dry (taxonomy alias heal, no write)'
        : '\n🩹 integrity --fix (taxonomy alias auto-heal)'
    );
    await fixTaxonomyAliases({
      live: opts.live !== false,
      dryRun: opts.fixDry === true,
    });
  }

  const idx = await docsIndex();
  const tax = (await Bun.file(TAXONOMY_PATH)
    .json()
    .catch(() => null)) as TaxonomyFile | null;

  // Layer 1: taxonomy coverage (sidebar pages present in index, alias-aware)
  let taxTotal = 0;
  let taxHit = 0;
  if (tax?.sections) {
    const titles = new Set(idx.entries.map(e => e.title.toLowerCase()));
    const aliases = (tax.aliases ?? {}) as Record<string, string>;
    for (const pages of Object.values(tax.sections as Record<string, string[]>)) {
      for (const p of pages) {
        taxTotal++;
        const key = p.toLowerCase();
        if (
          titles.has(key) ||
          (aliases[key] !== undefined && titles.has(String(aliases[key]).toLowerCase()))
        ) {
          taxHit++;
        }
      }
    }
  }

  // Layer 2: index stats
  const pages = idx.entries.length;
  const anchors = idx.entries.reduce((n, e) => n + e.anchors.length, 0);
  const tagged = idx.entries.filter(e => e.officialSection).length;

  // Layer 3: canonical map anchors vs index
  const mapBad = await audit();

  // Layer 4: repo links vs index
  const linkBad = await deepcheck(['lib', 'tools', 'scripts', 'tests']);

  const row = (label: string, value: string, ok: boolean) =>
    console.info(`  ${ok ? '✅' : '❌'} ${label.padEnd(38)} ${value}`);
  console.info('\n📋 Doc-stack integrity');
  row('taxonomy coverage', `${taxHit}/${taxTotal} sidebar pages in index`, taxHit === taxTotal);
  row('index pages / anchors', `${pages} / ${anchors}`, pages > 0 && anchors > 0);
  row('taxonomy-tagged entries', `${tagged}`, tagged > 0);
  row('canonical map anchors', mapBad === 0 ? 'all valid' : `${mapBad} bad`, mapBad === 0);
  row('repo links', linkBad === 0 ? 'all valid' : `${linkBad} dead`, linkBad === 0);
  row('runtime Bun.version', Bun.version, true);
  const failed = (taxHit === taxTotal ? 0 : 1) + (mapBad > 0 ? 1 : 0) + (linkBad > 0 ? 1 : 0);
  console.info(
    failed === 0 ? '\n🟢 integrity: PASS' : `\n🔴 integrity: ${failed} layer(s) failing`
  );
  // Attach stats for schedule logging / status (module-level last run)
  lastIntegrityStats = {
    taxHit,
    taxTotal,
    pages,
    anchors,
    tagged,
    mapBad,
    linkBad,
    failed,
    bunVersion: Bun.version,
  };
  return failed;
}

let lastIntegrityStats: IntegrityStats | null = null;

/**
 * Operator dashboard: last integrity JSONL + index snapshot + next weekly cron hint.
 */
async function status(): Promise<void> {
  const LOG = INTEGRITY_LOG;
  type StatusLast = {
    ts?: string;
    failures?: number;
    ok?: boolean;
    regen?: unknown;
    bunVersion?: string;
    tierA?: {
      total: number;
      note: { pct: number };
      ship: { pct: number };
      blog: { pct: number };
    };
  };
  let last: StatusLast | null = null;
  if (await Bun.file(LOG).exists()) {
    const lines = (await Bun.file(LOG).text()).trim().split('\n').filter(Boolean);
    const raw = lines.at(-1);
    if (raw) {
      try {
        last = JSON.parse(raw) as StatusLast;
      } catch {
        last = null;
      }
    }
  }

  const idx = await docsIndex().catch(() => null);
  const generated =
    idx && 'generated' in idx ? String((idx as { generated?: string }).generated ?? '') : '';
  const pages = idx?.entries.length ?? 0;
  const anchors = idx?.entries.reduce((n, e) => n + e.anchors.length, 0) ?? 0;

  const ageDays =
    last?.ts != null
      ? (Date.now() - Date.parse(last.ts)) / (24 * 60 * 60 * 1000)
      : Number.POSITIVE_INFINITY;
  const stale = ageDays > 7;
  const ok = last?.ok === true && !stale;

  const line = (icon: string, label: string, value: string) =>
    console.info(`${icon} ${label.padEnd(18)} ${value}`);

  console.info('\n📊 Bun docs stack — status\n');
  line(
    ok ? '🟢' : stale ? '🟡' : '🔴',
    'Integrity',
    last
      ? `${last.ok ? 'PASS' : 'FAIL'} (last: ${last.ts ?? '?'}${stale ? ' · STALE >7d' : ''})`
      : 'no runs yet — bun tools/bun-doc-refs.ts schedule --once'
  );
  line('📚', 'Docs indexed', pages > 0 ? `${pages} pages · ${anchors} anchors` : 'missing index');
  line('📌', 'Index generated', generated || 'unknown');
  line('🐇', 'Bun.version', Bun.version);
  if (last?.bunVersion) line('🐇', 'Last run Bun', last.bunVersion);

  try {
    const { loadTierACoverageFromDisk } = await import('./bun-docs-catalog.ts');
    const tier = await loadTierACoverageFromDisk();
    if (tier) {
      line(
        '🎯',
        'Catalog tier-A',
        `NOTE ${tier.note.pct}% · SHIP ${tier.ship.pct}% · BLOG ${tier.blog.pct}% · FIX ${tier.fix.pct}% · LOC ${tier.locus.pct}% · EX ${tier.examples.pct}% · HIST ${tier.history.pct}% (${tier.total} tokens)`
      );
      if (tier.bunVersion)
        line(
          '📦',
          'Catalog pin',
          `${tier.bunVersion}${tier.generated ? ` · ${tier.generated.slice(0, 10)}` : ''}`
        );
    } else {
      line('🎯', 'Catalog tier-A', 'no catalog — bun run docs:catalog:build');
    }
  } catch {
    line('🎯', 'Catalog tier-A', 'unavailable');
  }

  if (last?.tierA) {
    line(
      '📈',
      'Last log tier-A',
      `NOTE ${last.tierA.note.pct}% · SHIP ${last.tierA.ship.pct}% · BLOG ${last.tierA.blog.pct}%`
    );
  }

  line('⏰', 'Weekly cron', '0 6 * * * UTC (schedule command; in-process)');
  line('🩹', 'Self-heal', 'bun tools/bun-doc-refs.ts integrity --fix');
  console.info('');
  if (stale) process.exitCode = 1;
}

/**
 * Export a hierarchical llms-full.txt: every docs entry prefixed with its
 * official taxonomy path, giving RAG consumers location context.
 */
async function exportHierarchical(): Promise<void> {
  const idx = await docsIndex();
  const lines: string[] = [
    '# Bun Documentation — hierarchical index',
    `# Generated from tools/bun-docs-index.json (${idx.entries.length} pages)`,
    '',
  ];
  const bySection = new Map<string, typeof idx.entries>();
  for (const e of idx.entries) {
    const s = e.officialSection ?? e.domain;
    bySection.set(s, [...(bySection.get(s) ?? []), e]);
  }
  for (const [section, entries] of [...bySection.entries()].sort()) {
    lines.push(`\n## ${section}`);
    for (const e of entries) {
      const url = e.url.replace(/\.md$/, '');
      lines.push(`- [${e.title}](${url})${e.desc ? `: ${e.desc}` : ''}`);
      if (e.anchors.length > 0) {
        lines.push(`  anchors: ${e.anchors.map(a => `#${a}`).join(', ')}`);
      }
    }
  }
  const out = 'tools/bun-docs-llms-full.txt';
  await Bun.write(out, lines.join('\n') + '\n');
  console.info(`✅ ${out} — ${idx.entries.length} pages, ${bySection.size} sections`);
}

/**
 * Integrity gate scheduler.
 *
 * Canonical primary (OS-persistent) — Bun docs hierarchy / lib/harness/cron:
 *   await Bun.cron(path, schedule, title)  → crontab/launchd/Task Scheduler (local time)
 *   https://bun.com/docs/runtime/cron#bun-cron-path-schedule-title-os-level
 *   Contract: docs/harness/cron.md
 *
 * This daemon deliberately uses the **in-process complement** (spine owns process lifetime):
 *   scheduleInProcess / runInProcessUntilSignal → UTC, no-overlap, Disposable
 *   https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process
 *   Owner: lib/harness/cron.ts + spine/scheduler.ts
 */
/** Repo root (parent of tools/), used as cwd for the regen subprocess. */
const REPO_ROOT = new URL('..', import.meta.url).pathname;

/**
 * Regenerate the docs index after a PASS. Returns { ok, pages, anchors }
 * parsed from the generator's stdout, or { ok: false } on any failure.
 */
async function regenIndex(): Promise<{
  ok: boolean;
  pages?: number;
  anchors?: number;
  error?: string;
}> {
  try {
    const proc = Bun.spawn(['bun', 'tools/bun-docs-index-gen.ts'], {
      cwd: REPO_ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    if (exitCode !== 0) return { ok: false, error: stderr.trim() || `exit ${exitCode}` };
    // Final line: "✅ <pages> pages, <anchors> anchors (… fetch failures), …"
    const m = stdout.match(/(\d+) pages, (\d+) anchors/);
    return m ? { ok: true, pages: +m[1], anchors: +m[2] } : { ok: false, error: 'unparsed output' };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function schedule(pattern: string, once: boolean): Promise<void> {
  const LOG = INTEGRITY_LOG;
  const run = async () => {
    const started = new Date().toISOString();
    // Attempt auto-heal on FAIL paths only when DOC_INTEGRITY_AUTOFIX=1
    // @see https://bun.com/docs/runtime/utils#bun-version
    const autoFix = Bun.env.DOC_INTEGRITY_AUTOFIX === '1';
    let failures = await integrity();
    if (failures > 0 && autoFix) {
      console.info('🩹 DOC_INTEGRITY_AUTOFIX=1 — retrying with --fix');
      failures = await integrity({ fix: true, live: true });
    }
    // Ingest-on-success: PASS regenerates the docs index; FAIL skips regen.
    const regen = failures === 0 ? await regenIndex() : ({ skipped: true } as const);
    let tierA: Awaited<
      ReturnType<(typeof import('./bun-docs-catalog.ts'))['loadTierACoverageFromDisk']>
    > = null;
    try {
      const { loadTierACoverageFromDisk } = await import('./bun-docs-catalog.ts');
      tierA = await loadTierACoverageFromDisk();
    } catch {
      tierA = null;
    }
    // JSONL append via read-modify-write (Bun.write has no append mode)
    const prev = (await Bun.file(LOG).exists()) ? await Bun.file(LOG).text() : '';
    await Bun.write(
      LOG,
      prev +
        JSON.stringify({
          ts: started,
          failures,
          ok: failures === 0,
          bunVersion: Bun.version,
          stats: lastIntegrityStats,
          regen,
          autoFix,
          ...(tierA
            ? {
                tierA: {
                  total: tierA.total,
                  note: { pct: tierA.note.pct },
                  ship: { pct: tierA.ship.pct },
                  blog: { pct: tierA.blog.pct },
                  fix: { pct: tierA.fix.pct },
                },
              }
            : {}),
        }) +
        '\n'
    );
    const regenNote =
      failures !== 0
        ? ' — regen skipped'
        : 'ok' in regen && regen.ok
          ? ` — regen OK (${regen.pages ?? 0} pages, ${regen.anchors ?? 0} anchors)`
          : ` — regen FAILED: ${'error' in regen ? String(regen.error) : 'unknown'}`;
    console.info(
      `🕐 [${started}] integrity ${failures === 0 ? 'PASS' : `FAIL (${failures})`}` +
        ` · bun ${Bun.version}` +
        regenNote +
        ` — logged to ${LOG}`
    );
  };

  if (once) {
    await run();
    return;
  }

  // In-process complement via spine (OS-persistent remains Bun's primary form).
  // @see ../docs/harness/cron.md
  const { runInProcessUntilSignal } = await import('../spine/scheduler');
  await runInProcessUntilSignal(pattern, run, {
    label: `integrity scheduler · log ${LOG}`,
    runImmediately: true,
  });
}

const defaultPaths = ['lib', 'tools', 'scripts', 'tests'];

function parseLocusDepth(args: string[], fallback = 20): number {
  const eq = args.find(a => a.startsWith('--depth='));
  if (eq) {
    const n = Number.parseInt(eq.slice('--depth='.length), 10);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  }
  const idx = args.indexOf('--depth');
  if (idx !== -1) {
    const n = Number.parseInt(args[idx + 1] ?? '', 10);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  }
  return fallback;
}

/**
 * Locus table: TOKEN · TYPE · STATUS · PAGE · FRAGMENT · SUGGESTION · SCORE · HAS_REF
 *
 * STATUS: fragment | page | inherited | dump | reference | coincidence | unresolved
 *
 * Default: non-ok statuses only (bounded by `--depth=N`).
 * `--all`: include fragment/page rows (still depth-capped after sort).
 * `--tsv` / `--json`: machine-readable.
 */
async function locusAudit(args: string[]): Promise<number> {
  // Read catalog JSON directly — do not import bun-docs-catalog.ts here.
  // That module dynamically imports this file; awaiting it from import.meta.main deadlocks.
  const {
    buildPageAnchorIndex,
    classifyLocusStatus,
    findParentWithFragment,
    suggestAnchorsForToken,
  } = await import('../lib/docs/locus-resolve.ts');
  type LocusStatus = import('../lib/docs/locus-resolve.ts').LocusStatus;
  const depth = parseLocusDepth(args, 20);
  const asJson = args.includes('--json');
  const asTsv = args.includes('--tsv');
  const showAll = args.includes('--all');
  const typeEq = args.find(a => a.startsWith('--type='));
  const typeFilter = typeEq?.slice('--type='.length);

  const NOTE_COVERAGE_TYPES = new Set([
    'api',
    'cli-flag',
    'config-key',
    'env-var',
    'package-json-key',
    'cli-command',
    'cli-option',
  ]);
  const catalogPath = new URL('./bun-docs-catalog.json', import.meta.url).pathname;
  const catalogFile = (await Bun.file(catalogPath).json()) as {
    entries: Array<{
      name: string;
      type: string;
      canonicalPage: string;
      anchor?: string;
      locusUnresolved?: boolean;
      allPages?: string[];
    }>;
  };
  const entries = catalogFile.entries;
  const index = await docsIndex();
  const pageAnchors = buildPageAnchorIndex(index.entries);
  const byName = new Map(entries.map(e => [e.name, e]));

  type Row = {
    token: string;
    type: string;
    status: LocusStatus;
    page: string;
    fragment: string;
    inheritFrom: string;
    suggestion: string;
    score: string;
    hasRef: string;
  };

  const shortPage = (url: string) =>
    url.replace(/^https:\/\/bun\.com\/docs\//, '').replace(/^https:\/\/bun\.com\//, '');

  const okStatus = (s: LocusStatus) =>
    s === 'fragment' || s === 'page' || s === 'inherited' || s === 'reference';

  const rows: Row[] = [];
  for (const e of entries) {
    if (!NOTE_COVERAGE_TYPES.has(e.type)) continue;
    if (typeFilter && e.type !== typeFilter) continue;

    const parentFragment = findParentWithFragment(e.name, byName);
    const status = classifyLocusStatus({
      name: e.name,
      canonicalPage: e.canonicalPage,
      anchor: e.anchor,
      locusUnresolved: e.locusUnresolved,
      pageAnchors,
      parentFragment,
    });
    if (!showAll && okStatus(status)) continue;

    let suggestion = '';
    let score = '';
    if (!okStatus(status)) {
      const local = suggestAnchorsForToken(e.name, pageAnchors, {
        pages: e.allPages,
        limit: 1,
      });
      const best =
        !local[0] || (local[0].score ?? 0) < 80
          ? (suggestAnchorsForToken(e.name, pageAnchors, { limit: 1 })[0] ?? local[0])
          : local[0];
      if (best) {
        suggestion = shortPage(best.url);
        score = String(best.score);
      }
    } else if (status === 'inherited' && parentFragment) {
      suggestion = `${shortPage(parentFragment.page)}#${parentFragment.fragment}`;
      score = 'inherit';
    }

    const refKey = resolveApiAlias(e.name);
    rows.push({
      token: e.name,
      type: e.type,
      status,
      page: shortPage(e.canonicalPage),
      fragment: e.anchor ?? '',
      inheritFrom: parentFragment?.name ?? '',
      suggestion,
      score,
      hasRef: CANONICAL_REFS[e.name] || CANONICAL_REFS[refKey] ? 'yes' : 'no',
    });
  }

  const statusRank: Record<LocusStatus, number> = {
    coincidence: 500,
    dump: 400,
    unresolved: 300,
    inherited: 250,
    reference: 200,
    page: 50,
    fragment: 0,
  };

  rows.sort(
    (a, b) =>
      statusRank[b.status] - statusRank[a.status] ||
      (Number.parseInt(b.score, 10) || 0) - (Number.parseInt(a.score, 10) || 0) ||
      a.token.localeCompare(b.token)
  );

  const byStatus = (s: LocusStatus) => rows.filter(r => r.status === s).length;
  const needsWork = rows.filter(r => !okStatus(r.status)).length;
  const total = rows.length;
  const slice = rows.slice(0, depth === 0 ? 0 : depth);

  const headers = [
    'TOKEN',
    'TYPE',
    'STATUS',
    'PAGE',
    'FRAGMENT',
    'SUGGESTION',
    'SCORE',
    'HAS_REF',
  ] as const;
  const widths = [28, 14, 12, 28, 36, 44, 7, 7];

  if (asJson) {
    console.info(
      JSON.stringify(
        {
          depth,
          showAll,
          total,
          needsWork,
          byStatus: {
            fragment: byStatus('fragment'),
            page: byStatus('page'),
            inherited: byStatus('inherited'),
            dump: byStatus('dump'),
            reference: byStatus('reference'),
            coincidence: byStatus('coincidence'),
            unresolved: byStatus('unresolved'),
          },
          shown: slice.length,
          entries: slice,
        },
        null,
        2
      )
    );
  } else if (asTsv) {
    console.info([...headers, 'INHERIT_FROM'].join('\t'));
    for (const r of slice) {
      console.info(
        [
          r.token,
          r.type,
          r.status,
          r.page,
          r.fragment,
          r.suggestion,
          r.score,
          r.hasRef,
          r.inheritFrom,
        ].join('\t')
      );
    }
  } else {
    const pad = (s: string, w: number) => (s.length > w ? `${s.slice(0, w - 1)}…` : s.padEnd(w));
    console.info(
      showAll
        ? `Locus table: ${total} rows · needs-work=${needsWork} · depth=${depth}`
        : `Locus table (needs-work): ${needsWork} · depth=${depth}`
    );
    console.info(
      `status counts: dump=${byStatus('dump')} inherited=${byStatus('inherited')} page=${byStatus('page')} reference=${byStatus('reference')} unresolved=${byStatus('unresolved')} coincidence=${byStatus('coincidence')} fragment=${byStatus('fragment')}`
    );
    console.info(headers.map((h, i) => pad(h, widths[i]!)).join(' '));
    console.info(widths.map(w => '─'.repeat(w)).join(' '));
    for (const r of slice) {
      console.info(
        [
          pad(r.token, widths[0]!),
          pad(r.type, widths[1]!),
          pad(r.status, widths[2]!),
          pad(r.page, widths[3]!),
          pad(r.fragment || '—', widths[4]!),
          pad(r.suggestion || '—', widths[5]!),
          pad(r.score || '—', widths[6]!),
          pad(r.hasRef, widths[7]!),
        ].join(' ')
      );
    }
    if (total > depth) {
      console.info(`… ${total - depth} more (raise --depth)`);
    }
    console.info(
      `\nSTATUS: fragment=verified # · page=right page no heading · inherited=use parent · dump=bun-apis · reference=outside index`
    );
    console.info(`Flags: --depth=N · --all · --tsv · --json · --type=api`);
  }
  return needsWork;
}

function parseBundlerGroup(argv: string[]): BundlerNavGroup | undefined {
  const eq = argv.find(a => a.startsWith('--group='));
  const raw = eq
    ? eq.slice('--group='.length)
    : (() => {
        const i = argv.indexOf('--group');
        return i >= 0 ? argv[i + 1] : undefined;
      })();
  if (!raw) return undefined;
  if ((BUNDLER_NAV_GROUPS as readonly string[]).includes(raw)) return raw as BundlerNavGroup;
  console.error(`unknown --group=${raw}; expect one of: ${BUNDLER_NAV_GROUPS.join(' | ')}`);
  process.exit(2);
}

async function runBundlerCli(argv: string[]): Promise<number> {
  const wantAnchors = argv.includes('--anchors');
  const wantGaps = argv.includes('--gaps');
  const wantTokens = argv.includes('--tokens');
  const asJson = argv.includes('--json');
  const strict = argv.includes('--strict');
  const group = parseBundlerGroup(argv);

  if (!wantAnchors && !wantGaps && !wantTokens) {
    console.info(formatBundlerNavTree().trimEnd());
    return 0;
  }

  const idx = await docsIndex();
  const { loadCatalog } = await import('./bun-docs-catalog.ts');
  const catalog = await loadCatalog();

  if (wantAnchors) {
    const text = formatBundlerAnchorsReport(idx.entries, group);
    if (asJson) {
      const byDomain = new Map(
        idx.entries.map(e => [
          e.domain ?? e.url.replace(/^https:\/\/bun\.com\/docs\//, '').replace(/\.md$/, ''),
          e,
        ])
      );
      const leaves = group
        ? (await import('../lib/docs/bundler-nav')).BUNDLER_NAV_LEAVES.filter(
            l => l.group === group
          )
        : (await import('../lib/docs/bundler-nav')).BUNDLER_NAV_LEAVES;
      console.info(
        JSON.stringify(
          leaves.map(l => ({
            group: l.group,
            title: l.title,
            path: l.path,
            url: `https://bun.com/docs/${l.path}`,
            anchors: byDomain.get(l.path)?.anchors ?? [],
          })),
          null,
          2
        )
      );
    } else {
      console.info(text.trimEnd());
    }
  }

  if (wantTokens) {
    const rows = computeBundlerTokenRows({ catalogEntries: catalog, refs: CANONICAL_REFS });
    const filtered = group ? rows.filter(r => r.group === group) : rows;
    if (asJson) {
      console.info(
        JSON.stringify(
          { count: filtered.length, missing: catalogMissingRefCount(filtered), rows: filtered },
          null,
          2
        )
      );
    } else {
      console.info(
        `bundler catalog tokens: ${filtered.length} · missingRef=${catalogMissingRefCount(filtered)}`
      );
      for (const r of filtered) {
        console.info(
          `${r.hasRef ? '✓' : '✗'} ${r.name.padEnd(36)} ${r.type.padEnd(10)} ${r.docsUrl}`
        );
      }
    }
    if (strict && catalogMissingRefCount(filtered) > 0) return 1;
  }

  if (wantGaps) {
    const gaps: BundlerGap[] = computeBundlerGaps({
      indexEntries: idx.entries,
      catalogEntries: catalog,
      refs: CANONICAL_REFS,
      group,
    });
    if (asJson) {
      console.info(JSON.stringify({ count: gaps.length, gaps }, null, 2));
    } else {
      console.info(formatBundlerGapsText(gaps).trimEnd());
    }
    const catalogGaps = gaps.filter(
      g => g.kind === 'catalog' && g.reason.includes('missing from CANONICAL_REFS')
    );
    if (strict && catalogGaps.length > 0) return 1;
  }

  return 0;
}

async function mainCli(): Promise<void> {
  const [, , cmd = 'list', ...rest] = Bun.argv;
  switch (cmd) {
    case 'url':
      printUrl(rest[0] ?? '');
      break;
    case 'token':
      await tokenLookup(rest.join(' '));
      break;
    case 'list':
      listRefs();
      break;
    case 'catalog': {
      // bun tools/bun-doc-refs.ts catalog [--build] [--section=runtime] [--type=api] [--json] [get Name]
      if (rest.includes('--build') || rest[0] === 'build') {
        const { buildCatalog, writeCatalog } = await import('./bun-docs-catalog.ts');
        const entries = await buildCatalog();
        await writeCatalog(entries);
        console.info(`✅ catalog ${entries.length} → tools/bun-docs-catalog.json`);
        break;
      }
      const getIdx = rest.indexOf('get');
      if (getIdx !== -1) {
        const name = rest.slice(getIdx + 1).join(' ');
        const proc = Bun.spawn(['bun', 'tools/bun-docs-catalog.ts', 'get', name], {
          cwd: import.meta.dir + '/..',
          stdout: 'inherit',
          stderr: 'inherit',
        });
        process.exit((await proc.exited) === 0 ? 0 : 1);
      }
      const args = ['bun', 'tools/bun-docs-catalog.ts', 'list', ...rest.filter(a => a !== 'list')];
      const proc = Bun.spawn(args, {
        cwd: import.meta.dir + '/..',
        stdout: 'inherit',
        stderr: 'inherit',
      });
      process.exit((await proc.exited) === 0 ? 0 : 1);
      break;
    }
    case 'suggest': {
      const auditMode = rest.includes('--audit');
      const jsonMode = rest.includes('--json') || rest.includes('-j');
      const q = rest.filter(a => a !== '--audit' && a !== '--json' && a !== '-j').join(' ');
      if (auditMode) {
        const ok = await suggestAudit(q, { json: jsonMode });
        if (!ok) process.exit(1);
      } else await suggest(q);
      break;
    }
    case 'index-audit': {
      const proc = Bun.spawn(['bun', 'tools/audit-catalog.ts', 'build'], {
        cwd: import.meta.dir + '/..',
        stdout: 'inherit',
        stderr: 'inherit',
      });
      process.exit((await proc.exited) === 0 ? 0 : 1);
      break;
    }
    case 'locus':
      await locusAudit(rest);
      break;
    case 'audit':
      process.exit((await audit()) > 0 ? 1 : 0);
      break;
    case 'deepcheck':
      process.exit((await deepcheck(rest.length ? rest : defaultPaths)) > 0 ? 1 : 0);
      break;
    case 'integrity': {
      const fix = rest.includes('--fix');
      const fixDry = rest.includes('--fix-dry');
      const live = !rest.includes('--no-live');
      process.exit((await integrity({ fix, fixDry, live })) > 0 ? 1 : 0);
      break;
    }
    case 'status':
      await status();
      break;
    case 'schedule': {
      const pIdx = rest.indexOf('--pattern');
      const pattern = pIdx !== -1 ? rest[pIdx + 1] : '0 6 * * *';
      await schedule(pattern, rest.includes('--once'));
      break;
    }
    case 'export':
      await exportHierarchical();
      break;
    case 'annotate': {
      const targets = rest.filter(a => a !== '--write');
      const write = rest.includes('--write');
      const files = await annotate(targets.length ? targets : defaultPaths, write);
      process.exit(!write && files > 0 ? 1 : 0);
      break;
    }
    case 'check':
      process.exit((await check(rest.length ? rest : defaultPaths)) > 0 ? 1 : 0);
      break;
    case 'validate':
      process.exit((await validate(rest.length ? rest : defaultPaths)) > 0 ? 1 : 0);
      break;
    case 'bundler': {
      const code = await runBundlerCli(rest);
      process.exit(code);
      break;
    }
    default:
      console.error(
        `unknown command: ${cmd}\n` +
          `commands: url|token|list|catalog|suggest|index-audit|locus|audit|deepcheck|integrity|status|schedule|export|annotate|check|validate|bundler\n` +
          `suggest --audit [--json] <q>  ·  index-audit → bun tools/audit-catalog.ts build\n` +
          `catalog: --build · list --section=… --type=… · get <Name>  (also: bun run docs:catalog:export · docs:refresh)\n` +
          `locus: --depth=N · --all · --tsv · --json · --type=api  (TOKEN/TYPE/STATUS/PAGE/FRAGMENT…)\n` +
          `bundler: [--anchors|--gaps|--tokens] [--json] [--strict] [--group=Name]  (lib/docs/bundler-nav.ts)\n` +
          `operate: bun run docs:refresh · docs/BUN_DOCS_OPERATE.md\n` +
          `integrity flags: --fix · --fix-dry · --no-live\n` +
          `schedule flags: --pattern "0 6 * * *" · --once · env DOC_INTEGRITY_AUTOFIX=1`
      );
      process.exit(1);
  }
}

if (import.meta.main) {
  await mainCli();
}
