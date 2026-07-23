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
} as const;

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
  | 'cross-language-lto';

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
    refs: [BUN_V1314_ANCHORS['reduced-gc-overhead-for-built-in-objects'], 'https://bun.com/docs/runtime/gc'],
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
    summary: 'JavaScriptCore native Explicit Resource Management — no __using helper transpile for bun target.',
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
] as const;

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
};

export type ReleaseVerifyResult = {
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
  /** Permanent canonical URL (blog anchor or runtime docs). */
  canonical?: string;
  /** Release channel: stable / canary / pin. */
  channel?: 'stable' | 'canary' | 'pin';
  /** Pinned version this test targets. */
  targetVersion?: string;
  /** Latest version at the time of testing. */
  latestAtTestTime?: string;
};

/** Resolve canonical URL for a release verification test by name. */
export function canonicalForReleaseTest(name: string): string | undefined {
  return BUN_RELEASE_TEST_CANONICAL[name];
}

/** Push a result with optional explicit anchor override. */
export function pushReleaseResult(
  results: ReleaseVerifyResult[],
  row: Omit<ReleaseVerifyResult, 'canonical' | 'channel' | 'targetVersion' | 'latestAtTestTime'> & { anchor?: BunV1314AnchorKey }
): void {
  const { anchor, ...rest } = row;
  results.push({
    ...rest,
    channel: (process.env.BUN_CHANNEL === 'canary' ? 'canary' : process.env.BUN_CHANNEL === 'pin' ? 'pin' : 'stable') as 'stable' | 'canary' | 'pin',
    targetVersion: Bun.version,
    latestAtTestTime: Bun.version,
    canonical: anchor ? BUN_V1314_ANCHORS[anchor] : canonicalForReleaseTest(row.name),
  });
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
  const [out, code] = await Promise.all([
    new Response(proc.stdout).text(),
    proc.exited,
  ]);
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

export function renderReleaseNoteMatrix(): string {
  const header = '| ID | Verify | Canonical | Title |\n|---|---|---|---|';
  const rows = BUN_RELEASE_NOTE_ROWS.map(
    r => `| \`${r.id}\` | ${r.verify} | [blog](${r.canonical}) | ${r.title} |`
  );
  return [header, ...rows].join('\n');
}
