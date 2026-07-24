// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash
// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/docs/bundler/bytecode#combining-with-other-optimizations — --minify
/**
 * Bun release-note cross-reference — changelog items → verification + doc links.
 *
 * SSOT for Bun v1.3.14 blog canonical anchors (permanent section URLs).
 *
 * @see https://bun.com/blog/bun-v1.3.14 — release post
 * @see https://bun.com/reference/node/tls/getCACertificates — tls.getCACertificates
 * @see https://github.com/oven-sh/bun/issues/24339 — system CA empty before fix
 * @see https://github.com/oven-sh/bun/pull/29526 — lazy-load system certs
 */
import tls from 'node:tls';
import { probeUrlHostLegacy } from '../verification/bun-runtime-nits-probes.ts';
import { buildVerificationLinks } from '../verification/links.ts';
import {
  INSTALL_ASPECT_CANONICAL_KEYS,
  resolveCanonicalUrl,
} from '../verification/canonical-coverage.ts';
import type { InstallPlatformAspectId } from '../verification/install-platform.ts';
import { withSubsystem } from '../verification/subsystem.ts';
import type { SemanticTags, VerificationResult } from '../verification/types.ts';
import { RELEASE_PROOF_REPORT_PATH } from '../verification/types.ts';
import { resolveCanonicalForProbe } from '../../tools/canonical-helpers.ts';
import { FETCH_PROTOCOL_DOCS } from './fetch-protocol-docs.ts';
import { INSTALL_PLATFORM_DOCS } from './bun-install-platform-docs.ts';
import { INSTALL_LINKER_DOCS } from './bun-install-linker-docs.ts';

/** Base URL for Bun v1.3.14 blog post (all section anchors are stable). */
export const BUN_V1314_BLOG = 'https://bun.com/blog/bun-v1.3.14' as const;

/** Permanent canonical anchors from the v1.3.14 blog post. */
export const BUN_V1314_ANCHORS = {
  'bun-image': `${BUN_V1314_BLOG}#bun-image`,
  'terminal-methods': `${BUN_V1314_BLOG}#terminal-methods`,
  'global-virtual-store': `${BUN_V1314_BLOG}#global-virtual-store`,
  http3: `${BUN_V1314_BLOG}#http3`,
  'http2-client': `${BUN_V1314_BLOG}#http2-client`,
  'rewritten-fswatch-backend': `${BUN_V1314_BLOG}#rewritten-fswatch-backend`,
  'no-orphans': `${BUN_V1314_BLOG}#no-orphans`,
  'process-execve-support': `${BUN_V1314_BLOG}#process-execve-support`,
  'bunterminal-on-windows-via-conpty': `${BUN_V1314_BLOG}#bunterminal-on-windows-via-conpty`,
  'using-await-using-no-longer-lowered-when-targeting-bun': `${BUN_V1314_BLOG}#using-await-using-no-longer-lowered-when-targeting-bun`,
  'sighup-and-sigbreak-signal-handling-on-windows': `${BUN_V1314_BLOG}#sighup-and-sigbreak-signal-handling-on-windows`,
  'websocket-permessagedeflate-false-now-respected-in-upgrade-requests': `${BUN_V1314_BLOG}#websocket-permessagedeflate-false-now-respected-in-upgrade-requests`,
  'freebsd-and-android-support': `${BUN_V1314_BLOG}#freebsd-and-android-support`,
  'reduced-memory-usage-for-mongodb-mongoose': `${BUN_V1314_BLOG}#reduced-memory-usage-for-mongodb-mongoose`,
  'upgraded-javascriptcore-engine': `${BUN_V1314_BLOG}#upgraded-javascriptcore-engine`,
  'bun-publish-now-sends-readme-metadata-to-the-registry': `${BUN_V1314_BLOG}#bun-publish-now-sends-readme-metadata-to-the-registry`,
  'updated-sqlite-to-3530': `${BUN_V1314_BLOG}#updated-sqlite-to-3530`,
  'cross-language-lto-for-zig-c-on-linux': `${BUN_V1314_BLOG}#cross-language-lto-for-zig-c-on-linux`,
  'faster-esm-module-loading': `${BUN_V1314_BLOG}#faster-esm-module-loading`,
  'reduced-gc-overhead-for-built-in-objects': `${BUN_V1314_BLOG}#reduced-gc-overhead-for-built-in-objects`,
  'smaller-binary-size': `${BUN_V1314_BLOG}#smaller-binary-size`,
  'tls-getcacertificates-system-now-works-without-use-system-ca': `${BUN_V1314_BLOG}#tls-getcacertificates-system-now-works-without-use-system-ca`,
  'tls-getcacertificates-system-no-longer-stalls-on-managed-macs': `${BUN_V1314_BLOG}#tls-getcacertificates-system-no-longer-stalls-on-managed-macs`,
  'use-system-ca-on-windows-now-loads-intermediate-and-trustedpeople-certificates': `${BUN_V1314_BLOG}#use-system-ca-on-windows-now-loads-intermediate-and-trustedpeople-certificates`,
  'event-loop-refactor': `${BUN_V1314_BLOG}#event-loop-refactor`,
  'bun-archive-api': 'https://bun.com/docs/runtime/archive',
} as const;

/** Base URL for Bun v1.3.5 blog post (PTY, feature flags, stringWidth, S3, npmrc). */
export const BUN_V135_BLOG = 'https://bun.com/blog/bun-v1.3.5' as const;

/** Permanent canonical anchors from the v1.3.5 blog post. */
export const BUN_V135_ANCHORS = {
  'bun-terminal-api-for-pseudo-terminal-pty-support': `${BUN_V135_BLOG}#bun-terminal-api-for-pseudo-terminal-pty-support`,
  'compile-time-feature-flags-for-dead-code-elimination': `${BUN_V135_BLOG}#compile-time-feature-flags-for-dead-code-elimination`,
  'improved-bun-stringwidth-accuracy': `${BUN_V135_BLOG}#improved-bun-stringwidth-accuracy`,
  'content-disposition-support-for-s3-uploads': `${BUN_V135_BLOG}#content-disposition-support-for-s3-uploads`,
  'environment-variable-expansion-in-npmrc-quoted-values': `${BUN_V135_BLOG}#environment-variable-expansion-in-npmrc-quoted-values`,
} as const;

export type BunV135AnchorKey = keyof typeof BUN_V135_ANCHORS;

export function bunV135Url(anchor: BunV135AnchorKey): string {
  return BUN_V135_ANCHORS[anchor];
}

export type BunV1314AnchorKey = keyof typeof BUN_V1314_ANCHORS;

/** Full canonical URL for a v1.3.14 blog section anchor. */
export function bunV1314Url(anchor: BunV1314AnchorKey): string {
  return BUN_V1314_ANCHORS[anchor];
}

export type BunReleaseNoteId =
  | 'bun-image'
  | 'tls-system-ca-no-flag'
  | 'gc-builtins-incremental'
  | 'binary-size-linux-windows'
  | 'event-loop-refactor'
  | 'using-await-using-native'
  | 'no-orphans'
  | 'faster-esm'
  | 'cross-language-lto'
  | 'bun-terminal-pty'
  | 'compile-time-feature-flags'
  | 'stringwidth-accuracy'
  | 's3-content-disposition'
  | 'npmrc-env-expansion';

export type BunReleaseNoteRow = {
  id: BunReleaseNoteId;
  title: string;
  summary: string;
  /** Permanent blog anchor URL for this release note. */
  canonical: string;
  /** Human verification status for FactoryWager proof pipeline. */
  verify: 'automated' | 'smoke' | 'informational';
  refs: readonly string[];
};

/** Curated from Bun 1.3.14 release notes — each row links to a canonical blog anchor. */
export const BUN_RELEASE_NOTE_ROWS: readonly BunReleaseNoteRow[] = [
  {
    id: 'bun-image',
    title: 'Bun.Image — built-in image processing',
    summary:
      'JPEG/PNG/WebP/GIF/BMP plus HEIC/AVIF/TIFF on macOS/Windows; chainable pipeline with terminal output methods.',
    canonical: BUN_V1314_ANCHORS['bun-image'],
    verify: 'automated',
    refs: [BUN_V1314_ANCHORS['bun-image'], BUN_V1314_ANCHORS['terminal-methods']],
  },
  {
    id: 'tls-system-ca-no-flag',
    title: "tls.getCACertificates('system') without --use-system-ca",
    summary:
      "Previously returned [] unless --use-system-ca or NODE_USE_SYSTEM_CA=1. Now lazy-loads OS trust store on first 'system' query (Node parity); flag only affects 'default'.",
    canonical: BUN_V1314_ANCHORS['tls-getcacertificates-system-now-works-without-use-system-ca'],
    verify: 'automated',
    refs: [
      BUN_V1314_ANCHORS['tls-getcacertificates-system-now-works-without-use-system-ca'],
      'https://bun.com/reference/node/tls/getCACertificates',
      'https://github.com/oven-sh/bun/issues/24339',
      'https://github.com/oven-sh/bun/pull/29526',
    ],
  },
  {
    id: 'gc-builtins-incremental',
    title: 'Reduced incremental GC overhead for built-in objects',
    summary:
      'Codegen classes (Request, Response, Subprocess, …) no longer re-scan all live instances after every mutator yield; only visitChildren runs. Hand-written types unchanged.',
    canonical: BUN_V1314_ANCHORS['reduced-gc-overhead-for-built-in-objects'],
    verify: 'smoke',
    refs: [
      BUN_V1314_ANCHORS['reduced-gc-overhead-for-built-in-objects'],
      'https://bun.com/docs/blog/bun-v1.3.14#reduced-gc-overhead-for-built-in-objects',
    ],
  },
  {
    id: 'binary-size-linux-windows',
    title: 'Smaller Bun binary on Windows and Linux',
    summary:
      'Linux x64 ~-8.6 MB, Windows x64 ~-17.7 MB (macOS unchanged). Informational — tracked in release notes, not asserted in CI.',
    canonical: BUN_V1314_ANCHORS['smaller-binary-size'],
    verify: 'informational',
    refs: [BUN_V1314_ANCHORS['smaller-binary-size'], 'https://github.com/oven-sh/bun/releases'],
  },
  {
    id: 'event-loop-refactor',
    title: 'Event loop refactor (reliability + memory)',
    summary:
      'Large event-loop refactor fixed DuplexUpgradeContext/SSLWrapper leaks, TLSSocket.memoryCost, and timer.ref() on already-fired timers no longer keeps the process alive.',
    canonical: BUN_V1314_ANCHORS['event-loop-refactor'],
    verify: 'automated',
    refs: [BUN_V1314_ANCHORS['event-loop-refactor']],
  },
  {
    id: 'using-await-using-native',
    title: 'using / await using no longer lowered when targeting Bun',
    summary:
      'JavaScriptCore native Explicit Resource Management — no __using helper transpile for bun target.',
    canonical: BUN_V1314_ANCHORS['using-await-using-no-longer-lowered-when-targeting-bun'],
    verify: 'automated',
    refs: [BUN_V1314_ANCHORS['using-await-using-no-longer-lowered-when-targeting-bun']],
  },
  {
    id: 'no-orphans',
    title: '--no-orphans — exit when parent process dies',
    summary: 'Opt-in mode via CLI flag, bunfig [run] noOrphans, or BUN_FEATURE_FLAG_NO_ORPHANS.',
    canonical: BUN_V1314_ANCHORS['no-orphans'],
    verify: 'smoke',
    refs: [BUN_V1314_ANCHORS['no-orphans']],
  },
  {
    id: 'faster-esm',
    title: 'Faster ESM module loading',
    summary: '~12% faster loading 500 ESM files (struct copy fix in AST allocation).',
    canonical: BUN_V1314_ANCHORS['faster-esm-module-loading'],
    verify: 'smoke',
    refs: [BUN_V1314_ANCHORS['faster-esm-module-loading']],
  },
  {
    id: 'cross-language-lto',
    title: 'Cross-language LTO for Zig ↔ C++ on Linux',
    summary: 'Bun.escapeHTML ~6.5% faster; HTTP throughput ~3.5% faster on linux-x64.',
    canonical: BUN_V1314_ANCHORS['cross-language-lto-for-zig-c-on-linux'],
    verify: 'smoke',
    refs: [BUN_V1314_ANCHORS['cross-language-lto-for-zig-c-on-linux']],
  },
  {
    id: 'bun-terminal-pty',
    title: 'Bun.Terminal API for pseudo-terminal (PTY) support',
    summary:
      'Bun.spawn({ terminal }) and reusable new Bun.Terminal(); POSIX at ship (ConPTY in 1.3.14).',
    canonical: BUN_V135_ANCHORS['bun-terminal-api-for-pseudo-terminal-pty-support'],
    verify: 'automated',
    refs: [
      BUN_V135_ANCHORS['bun-terminal-api-for-pseudo-terminal-pty-support'],
      'https://bun.com/docs/runtime/child-process#terminal-pty-support',
    ],
  },
  {
    id: 'compile-time-feature-flags',
    title: 'Compile-time feature flags (bun:bundle)',
    summary:
      'import { feature } from "bun:bundle" — dead-code elimination via --feature / Bun.build features.',
    canonical: BUN_V135_ANCHORS['compile-time-feature-flags-for-dead-code-elimination'],
    verify: 'automated',
    refs: [
      BUN_V135_ANCHORS['compile-time-feature-flags-for-dead-code-elimination'],
      'https://bun.com/docs/bundler/index#features',
      'https://bun.com/docs/guides/runtime/build-time-constants#feature-flags',
    ],
  },
  {
    id: 'stringwidth-accuracy',
    title: 'Improved Bun.stringWidth accuracy',
    summary: 'Grapheme-aware emoji, zero-width chars, CSI/OSC ANSI sequences.',
    canonical: BUN_V135_ANCHORS['improved-bun-stringwidth-accuracy'],
    verify: 'automated',
    refs: [
      BUN_V135_ANCHORS['improved-bun-stringwidth-accuracy'],
      'https://bun.com/docs/runtime/utils#bun-stringwidth',
    ],
  },
  {
    id: 's3-content-disposition',
    title: 'S3 contentDisposition uploads',
    summary: 'contentDisposition option on s3.file / s3.write for inline vs attachment filenames.',
    canonical: BUN_V135_ANCHORS['content-disposition-support-for-s3-uploads'],
    verify: 'informational',
    refs: [
      BUN_V135_ANCHORS['content-disposition-support-for-s3-uploads'],
      'https://bun.com/docs/runtime/s3',
    ],
  },
  {
    id: 'npmrc-env-expansion',
    title: '.npmrc quoted env expansion + ? modifier',
    summary: 'Quoted ${NPM_TOKEN} values expand; ${VAR?} → empty when unset (npm parity).',
    canonical: BUN_V135_ANCHORS['environment-variable-expansion-in-npmrc-quoted-values'],
    verify: 'informational',
    refs: [
      BUN_V135_ANCHORS['environment-variable-expansion-in-npmrc-quoted-values'],
      'https://bun.com/docs/pm/npmrc',
    ],
  },
] as const;

const INSTALL_PLATFORM_TEST_CANONICAL = Object.fromEntries(
  (Object.keys(INSTALL_ASPECT_CANONICAL_KEYS) as InstallPlatformAspectId[]).map(aspect => [
    `install platform: ${aspect}`,
    resolveCanonicalUrl(INSTALL_ASPECT_CANONICAL_KEYS[aspect]),
  ])
) as Record<string, string>;

/** Map verify-bun-release test names → canonical v1.3.14 blog URLs. */
export const BUN_RELEASE_TEST_CANONICAL: Readonly<Record<string, string>> = {
  "tls.getCACertificates('system')":
    BUN_V1314_ANCHORS['tls-getcacertificates-system-now-works-without-use-system-ca'],
  'Built-in objects GC smoke (Request/Response)':
    BUN_V1314_ANCHORS['reduced-gc-overhead-for-built-in-objects'],
  'Bun.escapeHTML performance': BUN_V1314_ANCHORS['cross-language-lto-for-zig-c-on-linux'],
  'ESM module load (node:fs)': BUN_V1314_ANCHORS['faster-esm-module-loading'],
  'Process exit with pending timer': BUN_V1314_ANCHORS['event-loop-refactor'],
  'timer.ref() after fired setTimeout': BUN_V1314_ANCHORS['event-loop-refactor'],
  'WebSocket cleanup on close':
    BUN_V1314_ANCHORS['websocket-permessagedeflate-false-now-respected-in-upgrade-requests'],
  'Child process stdin pipe cleanup': BUN_V1314_ANCHORS['event-loop-refactor'],
  'using / await using (Explicit Resource Mgmt)':
    BUN_V1314_ANCHORS['using-await-using-no-longer-lowered-when-targeting-bun'],
  'Built-in objects (Request, Response)':
    BUN_V1314_ANCHORS['reduced-gc-overhead-for-built-in-objects'],
  '--no-orphans support': BUN_V1314_ANCHORS['no-orphans'],
  'Bun.Image (all terminal methods: bytes, buffer, blob, toBase64, dataurl, placeholder, metadata, write)':
    BUN_V1314_ANCHORS['terminal-methods'],
  'Bun.Image (all terminal methods)': BUN_V1314_ANCHORS['bun-image'],
  'fetch protocol (data:)': FETCH_PROTOCOL_DOCS.data,
  'fetch protocol (blob:)': FETCH_PROTOCOL_DOCS.blob,
  'fetch protocol (file://)': FETCH_PROTOCOL_DOCS.file,
  'fetch s3:// (explicit s3: creds)': FETCH_PROTOCOL_DOCS.s3,
  'fetch s3:// (env credentials)': FETCH_PROTOCOL_DOCS.s3,
  'fetch s3:// (Bun.file)': FETCH_PROTOCOL_DOCS.s3,
  'Bun Shell basics': resolveCanonicalUrl('Bun.$'),
  'structuredClone Blob': resolveCanonicalUrl('Bun.file'),
  'Bun.password.hash': resolveCanonicalUrl('Bun.password'),
  'Bun.inspect depth': BUN_V1314_ANCHORS['upgraded-javascriptcore-engine'],
  'Bun.hash returns bigint': resolveCanonicalUrl('Bun.hash'),
  'Bun.version / Bun.revision': resolveCanonicalUrl('Bun.version'),
  'Bun.Archive (create, extract, gzip, read)': BUN_V1314_ANCHORS['bun-archive-api'],
  'Bun.stringWidth accuracy (emoji, ZWJ, soft hyphen, word joiner)':
    BUN_V135_ANCHORS['improved-bun-stringwidth-accuracy'],
  'Bun.spawn PTY (echo capture)':
    BUN_V135_ANCHORS['bun-terminal-api-for-pseudo-terminal-pty-support'],
  'Compile-time feature flags (bun:bundle)':
    BUN_V135_ANCHORS['compile-time-feature-flags-for-dead-code-elimination'],
  'URL.host (hostname + port)': resolveCanonicalUrl('URL.host'),
  'Uint8Array Bun extensions (toBase64, toHex, setFromBase64, setFromHex, mmap, file.bytes, blob.bytes)':
    'https://bun.sh/reference/globals/Uint8Array',
  'R2/S3 binary roundtrip (upload, download, verify)': 'https://bun.sh/docs/runtime/s3',
  'URL.host / hostname / port (WHATWG)': 'https://bun.sh/reference/globals/URL/host',
  'S3 contentDisposition option':
    'https://bun.com/blog/bun-v1.3.5#content-disposition-support-for-s3-uploads',
  'Response.clone() after body access (v1.3.5 fix)': 'https://bun.com/blog/bun-v1.3.5#bug-fixes',
  'URL.domainToASCII / domainToUnicode (Node.js compat)':
    'https://bun.com/blog/bun-v1.3.5#bug-fixes',
  ...INSTALL_PLATFORM_TEST_CANONICAL,
};

export type ReleaseVerifyResult = VerificationResult;
export type { SemanticTags, VerificationResult };
export {
  FETCH_PROTOCOL_COVERAGE,
  FETCH_PROTOCOL_DOCS,
  awsEnvFromR2Credentials,
  buildFetchS3Request,
  fetchS3InitFromR2,
  probeFetchS3Optional,
  runFetchProtocolProbes,
  smokeFetchProtocolSupport,
} from './fetch-protocol-docs.ts';
export {
  BUN_INSTALL_CPU_VALUES,
  BUN_INSTALL_OS_VALUES,
  BUN_INSTALL_PLATFORM_SUPPORTED,
  INSTALL_PLATFORM_COVERAGE,
  INSTALL_PLATFORM_DOCS,
  probeBunInstallPlatformFlags,
} from './bun-install-platform-docs.ts';
export {
  PROJECT_CROSS_INSTALL_PROFILES,
  PROJECT_INSTALL_PLATFORM_ASPECTS,
  runProjectInstallPlatformVerification,
} from '../verification/install-platform.ts';
export {
  INSTALL_LINKER_DOCS,
  LOCKFILE_CONFIG_VERSION_ISOLATED_DEFAULT,
  probeLockfileConfigVersion,
  readLockfileInstallMeta,
} from './bun-install-linker-docs.ts';

/** Resolve canonical URL for a release verification test by name. */
export function canonicalForReleaseTest(name: string): string | undefined {
  return BUN_RELEASE_TEST_CANONICAL[name];
}

export type PushReleaseResultContext = {
  semanticTags: SemanticTags;
};

/** Push a result with optional explicit anchor override and report-level semantic tags. */
export function pushReleaseResult(
  results: VerificationResult[],
  row: Omit<
    VerificationResult,
    'canonical' | '_links' | 'channel' | 'targetVersion' | 'latestAtTestTime'
  > & {
    anchor?: BunV1314AnchorKey;
    /** Explicit canonical URL override (e.g. install platform row). */
    canonical?: string;
    /** CANONICAL_REFS / token key for metadata lookup. */
    canonicalKey?: string;
    /** Override subsystem (e.g. package-manager for embedded install rows). */
    subsystem?: VerificationResult['subsystem'];
  },
  ctx?: PushReleaseResultContext
): void {
  const {
    anchor,
    canonical: explicitCanonical,
    canonicalKey,
    subsystem: explicitSubsystem,
    ...rest
  } = row;
  const canonical =
    explicitCanonical ?? (anchor ? BUN_V1314_ANCHORS[anchor] : canonicalForReleaseTest(row.name));
  const lookupKey = canonicalKey ?? anchor ?? row.name;
  const meta = resolveCanonicalForProbe(lookupKey, {
    reportPath: RELEASE_PROOF_REPORT_PATH,
    sourcePath: 'tools/verify-bun-release.ts',
    fallback: canonical,
    subsystem: explicitSubsystem,
  });
  const tags = ctx?.semanticTags;
  results.push(
    withSubsystem(
      {
        ...rest,
        ...meta,
        canonical: explicitCanonical ?? meta.canonical,
        _links: meta._links.docs ? meta._links : buildVerificationLinks(canonical),
        ...(tags
          ? {
              channel: tags.channel,
              targetVersion: tags.targetVersion,
              latestAtTestTime: tags.latestAtTestTime,
            }
          : {}),
      },
      explicitSubsystem
    )
  );
}

export type TlsSystemCaProbe = {
  count: number;
  platform: NodeJS.Platform;
  /** Node parity: system store non-empty on Linux/Windows; macOS may be sparse in CI. */
  nodeParity: boolean;
  note: string;
};

/**
 * Probe tls.getCACertificates('system') without --use-system-ca.
 * @see https://bun.com/reference/node/tls/getCACertificates
 */
export function probeTlsSystemCaCertificates(): TlsSystemCaProbe {
  const certs = tls.getCACertificates('system');
  const count = Array.isArray(certs) ? certs.length : -1;
  const platform = process.platform;
  let nodeParity = Array.isArray(certs);
  let note = 'array returned';

  if (!Array.isArray(certs)) {
    nodeParity = false;
    note = 'not an array';
  } else if (count === 0) {
    nodeParity = platform === 'darwin';
    note =
      platform === 'darwin'
        ? 'empty on macOS allowed (Node CI skips non-empty assert)'
        : 'empty — regresses pre-fix [] without --use-system-ca';
  } else {
    nodeParity = true;
    note = 'non-empty without --use-system-ca';
  }

  return { count, platform, nodeParity, note };
}

/** Smoke: allocate many built-in objects (GC path exercised, no crash). */
export type EventLoopProbe = { ok: boolean; note: string };

/** Spawn helper with stdin detached and hard timeout (avoids hung subprocess in bun test). */
async function spawnProbe(
  argv: string[],
  timeoutMs = 3000
): Promise<{ out: string; code: number | null; timedOut: boolean }> {
  const proc = Bun.spawn(argv, { stdout: 'pipe', stderr: 'pipe', stdin: 'ignore' });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill();
  }, timeoutMs);
  const [out, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
  clearTimeout(timer);
  return { out, code: timedOut ? null : code, timedOut };
}

/** Pending timer with unref() must not block process exit. */
export async function probeProcessExitWithPendingTimer(): Promise<EventLoopProbe> {
  try {
    const { out, code, timedOut } = await spawnProbe([
      'bun',
      '-e',
      'const t=setTimeout(()=>{},5000);t.unref();console.log("ok");',
    ]);
    if (timedOut) {
      return { ok: false, note: `timed out after 3s (out=${out.trim()})` };
    }
    const ok = code === 0 && out.trim() === 'ok';
    return {
      ok,
      note: ok ? 'exits before unref timer fires' : `code=${code} out=${out.trim()}`,
    };
  } catch (e) {
    return { ok: false, note: e instanceof Error ? e.message : String(e) };
  }
}

/** timer.ref() on an already-fired setTimeout must not keep the event loop alive. */
export async function probeTimerRefAfterFire(): Promise<EventLoopProbe> {
  try {
    const { out, code, timedOut } = await spawnProbe([
      'bun',
      '-e',
      `await Bun.sleep(20);
const t=setTimeout(()=>{},5);
await Bun.sleep(20);
t.ref();
console.log("ok");`,
    ]);
    if (timedOut) {
      return { ok: false, note: `timed out after 3s (out=${out.trim()})` };
    }
    const ok = code === 0 && out.trim() === 'ok';
    return {
      ok,
      note: ok ? 'exits after ref on fired timer' : `code=${code} out=${out.trim()}`,
    };
  } catch (e) {
    return { ok: false, note: e instanceof Error ? e.message : String(e) };
  }
}

export function smokeBuiltinObjectsGc(): { ok: boolean; count: number } {
  const holders: Request[] = [];
  for (let i = 0; i < 2000; i++) {
    holders.push(new Request(`https://example.com/${i}`));
  }
  holders.length = 0;
  if (typeof Bun.gc === 'function') {
    Bun.gc(true);
  }
  try {
    new Request('https://example.com/');
    new Response('ok');
    return { ok: true, count: 2000 };
  } catch {
    return { ok: false, count: 2000 };
  }
}

/** WHATWG URL.host — hostname plus port when present. @deprecated use probeUrlHostLegacy from nits probes */
export function probeUrlHost(): { ok: boolean; note: string } {
  return probeUrlHostLegacy();
}

/**
 * v1.3.5 blog vectors — flag, skin tone, ZWJ family, soft hyphen, word joiner.
 * @see https://bun.com/blog/bun-v1.3.5#improved-bun-stringwidth-accuracy
 * @see https://github.com/oven-sh/bun/blob/main/test/js/bun/util/stringWidth.test.ts
 */
export const STRING_WIDTH_V135_VECTORS: ReadonlyArray<readonly [string, number]> = [
  ['\u{1F1FA}\u{1F1F8}', 2], // flag emoji
  ['\u{1F44B}\u{1F3FD}', 2], // skin tone
  ['\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}', 2], // ZWJ family
  ['\u00AD', 0], // soft hyphen
  ['\u2060', 0], // word joiner
];

/** v1.3.5 stringWidth vectors from release notes. */
export function probeStringWidthV135Accuracy(): { ok: boolean; note: string } {
  const bad = STRING_WIDTH_V135_VECTORS.filter(([text, width]) => Bun.stringWidth(text) !== width);
  return {
    ok: bad.length === 0,
    note:
      bad.length === 0
        ? 'flag=2 skin=2 zwj=2 hyphen=0 joiner=0'
        : bad.map(([t, w]) => `${JSON.stringify(t)}≠${w}`).join(', '),
  };
}

/** v1.3.5 Bun.Terminal PTY — echo through reusable terminal. */
export async function probeBunTerminalPty(): Promise<{ ok: boolean; note: string }> {
  try {
    const { spawnWithTerminal } = await import('../terminal.ts');
    const result = await spawnWithTerminal({ cmd: ['echo', 'pty-probe'] });
    const text = result.output.replace(/\r/g, '');
    const ok = result.exitCode === 0 && text.includes('pty-probe');
    return {
      ok,
      note: ok
        ? `exit=0 captured pty output (${result.chunks.length} chunks)`
        : `exit=${result.exitCode} out=${text.slice(0, 40)}`,
    };
  } catch (e) {
    return { ok: false, note: e instanceof Error ? e.message : String(e) };
  }
}

/** v1.3.5 compile-time feature flags via bun:bundle + bun build --feature. */
export async function probeCompileTimeFeatureFlags(): Promise<{ ok: boolean; note: string }> {
  const { mkdtemp, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = await mkdtemp(join(tmpdir(), 'fw-feature-probe-'));
  try {
    const entry = join(dir, 'entry.ts');
    const outdir = join(dir, 'out');
    await Bun.write(
      entry,
      'import { feature } from "bun:bundle";\nexport const mode = feature("FW_PROBE_PREMIUM") ? "premium" : "free";\n'
    );
    const proc = Bun.spawnSync(
      ['bun', 'build', '--feature=FW_PROBE_PREMIUM', entry, '--outdir', outdir, '--minify'],
      { cwd: dir, stdout: 'pipe', stderr: 'pipe' }
    );
    if (proc.exitCode !== 0) {
      return {
        ok: false,
        note: `build exit=${proc.exitCode} ${new TextDecoder().decode(proc.stderr).slice(0, 120)}`,
      };
    }
    const built = await Bun.file(join(outdir, 'entry.js')).text();
    const ok = built.includes('premium') && !built.includes('free');
    return {
      ok,
      note: ok
        ? 'PREMIUM branch kept; free eliminated'
        : `unexpected bundle: ${built.slice(0, 80)}`,
    };
  } catch (e) {
    return { ok: false, note: e instanceof Error ? e.message : String(e) };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export function renderReleaseNoteMatrix(): string {
  const header = '| ID | Verify | Canonical | Title |\n|---|---|---|---|';
  const rows = BUN_RELEASE_NOTE_ROWS.map(
    r => `| \`${r.id}\` | ${r.verify} | [blog](${r.canonical}) | ${r.title} |`
  );
  return [header, ...rows].join('\n');
}
