#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/networking/fetch#sending-an-http-request — Bun.fetch
// @see https://bun.com/docs/runtime/html-rewriter — HTMLRewriter
// @see https://bun.com/blog/bun-v1.3.4#urlpattern-api — URLPattern
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
 *   bun tools/bun-doc-refs.ts check [paths...]   # find Bun API usages lacking a @see link
 *   bun tools/bun-doc-refs.ts validate [paths..] # HTTP-check all bun.com/github doc links
 *   bun tools/bun-doc-refs.ts integrity          # full stack gate (taxonomy·index·map·links)
 *   bun tools/bun-doc-refs.ts integrity --fix  # auto-heal taxonomy aliases, then re-check
 *   bun tools/bun-doc-refs.ts status             # operator dashboard (last run · index · Bun)
 *   bun tools/bun-doc-refs.ts schedule --once    # one integrity pass + JSONL log
 *
 * Adding a new API reference? Add it to CANONICAL_REFS below — one place only.
 * Structured catalog (type · stability · allPages): tools/bun-docs-catalog.ts
 * Operate runbook: docs/BUN_DOCS_OPERATE.md
 */

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
export const BUN_TYPES_PINNED =
  'https://github.com/oven-sh/bun/tree/98f664962ffe4c6ba9b38382babc623ef0ba8693/packages/bun-types';
export const BUN_TYPES_MAIN = 'https://github.com/oven-sh/bun/tree/main/packages/bun-types';

export const CANONICAL_REFS: Record<string, string> = {
  // HTMLRewriter — social-meta guide (SocialMetadata / extractSocialMetadata)
  HTMLRewriter: bunDocs('runtime/html-rewriter'),
  'HTMLRewriter social': bunDocs(
    'guides/html-rewriter/extract-social-meta',
    'extract-social-share-images-and-open-graph-tags'
  ),
  'extract-social-meta': bunDocs(
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

  // URLPattern — ship 1.3.4; test/exec perf 1.3.12
  URLPattern: bunBlog('bun-v1.3.4', 'urlpattern-api'),
  'URLPattern ship': bunBlog('bun-v1.3.4', 'urlpattern-api'),
  'URLPattern API': bunBlog('bun-v1.3.4', 'urlpattern-api'),
  URLPatternInit: bunBlog('bun-v1.3.4', 'urlpattern-api'),
  'URLPattern.test': bunBlog('bun-v1.3.12', 'urlpattern-is-up-to-2-3x-faster'),
  'URLPattern.exec': bunBlog('bun-v1.3.12', 'urlpattern-is-up-to-2-3x-faster'),
  'URLPattern MDN': mdnWebApi('URLPattern'),

  // ── Terminal width & ANSI (replaces string-width / strip-ansi / wrap-ansi /
  //    slice-ansi) ────────────────────────────────────────────────────────
  'Bun.stringWidth': 'https://bun.com/docs/runtime/utils#bun-stringwidth',
  'Bun.stripANSI': 'https://bun.com/docs/runtime/utils#bun-stripansi',
  'Bun.wrapAnsi': 'https://bun.com/docs/runtime/utils#bun-wrapansi',
  'Bun.sliceAnsi': 'https://bun.com/reference/bun/sliceAnsi',

  // ── File I/O & storage (top repo usage: Bun.file ×266, Bun.write ×153) ──
  'Bun.file': 'https://bun.com/docs/runtime/file-io#reading-files-bun-file',
  'Bun.write': 'https://bun.com/docs/runtime/file-io#writing-files-bun-write',
  'bun:sqlite': 'https://bun.com/docs/runtime/sqlite#load-via-es-module-import',
  'Bun.Archive': 'https://bun.com/docs/runtime/archive#quickstart',
  'Bun.gzipSync': 'https://bun.com/docs/runtime/utils#bun-gzipsync',

  // ── HTTP & networking ───────────────────────────────────────────────────
  'Bun.serve': 'https://bun.com/docs/runtime/http/server#basic-setup',
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
  'streaming-response-bodies': bunDocs('runtime/networking/fetch', 'streaming-response-bodies'),
  'streaming-request-bodies': bunDocs('runtime/networking/fetch', 'streaming-request-bodies'),
  'content-type-handling': bunDocs('runtime/networking/fetch', 'content-type-handling'),
  'fetch content-type': bunDocs('runtime/networking/fetch', 'content-type-handling'),
  'fetch performance': bunDocs('runtime/networking/fetch', 'performance'),
  'fetch verbose': bunDocs('runtime/networking/fetch', 'debugging'),
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
  'simultaneous-connection-limit': bunDocs(
    'runtime/networking/fetch',
    'simultaneous-connection-limit'
  ),
  'response-buffering': bunDocs('runtime/networking/fetch', 'response-buffering'),
  'response buffering': bunDocs('runtime/networking/fetch', 'response-buffering'),
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

  // ── Process & spawn ─────────────────────────────────────────────────────
  'Bun.spawnSync': 'https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync',
  'Bun.Terminal': 'https://bun.com/docs/runtime/child-process#terminal-pty-support',
  'Bun.build': 'https://bun.com/docs/bundler/index#basic-example',
  'Bun.plugin': 'https://bun.com/docs/runtime/plugins#usage',
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
  'Bun.redis': 'https://bun.com/docs/runtime/redis#getting-started',
  redis: 'https://bun.com/docs/runtime/redis#getting-started',
  S3Client: 'https://bun.com/docs/runtime/s3#bun-s3client-bun-s3',
  'Bun.s3': 'https://bun.com/docs/runtime/s3#bun-s3client-bun-s3',
  'Bun.sql': 'https://bun.com/docs/runtime/sql#features',
  'bun:sql': 'https://bun.com/docs/runtime/sql#features',
  'bun:ffi': 'https://bun.com/docs/runtime/ffi#dlopen-usage-bunffi',

  // ── Data formats & hashing ──────────────────────────────────────────────
  'Bun.TOML': 'https://bun.com/docs/runtime/toml#bun-toml-parse',
  // Markdown page (html + ansi + render + react)
  'Bun.markdown': 'https://bun.com/docs/runtime/markdown#bun-markdown-html',
  'Bun.markdown.html': 'https://bun.com/docs/runtime/markdown#bun-markdown-html',
  'Bun.markdown.ansi': 'https://bun.com/docs/runtime/markdown#ansi-terminal-output',
  'Bun.YAML': 'https://bun.com/docs/runtime/yaml#bun-yaml-parse',
  YAML: 'https://bun.com/docs/runtime/yaml#bun-yaml-parse',
  'Bun.hash': 'https://bun.com/docs/runtime/hashing#bun-hash',
  'Bun.sha': 'https://bun.com/docs/runtime/hashing#bun-hash',
  'Bun.CryptoHasher': 'https://bun.com/docs/runtime/hashing#bun-cryptohasher',
  'Bun.password': 'https://bun.com/docs/runtime/hashing#bun-password',
  'Bun.secrets': 'https://bun.com/docs/runtime/secrets#bun-secrets-get-options',
  'Bun.semver':
    'https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean',
  'Bun.Image': 'https://bun.com/docs/runtime/image#input',
  'Bun.CookieMap': 'https://bun.com/docs/runtime/cookies#cookiemap-class',

  // ── Inspection & formatting (replaces util.inspect options, cli-table) ──
  'Bun.inspect': 'https://bun.com/docs/runtime/utils#bun-inspect',
  'Bun.inspect.table': 'https://bun.com/docs/runtime/utils#bun-inspect',
  'Bun.inspect.custom': 'https://bun.com/docs/runtime/utils#bun-inspect',
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
  // Runtime property (utils#bun-env) + env-file loading guide
  'Bun.env': 'https://bun.com/docs/runtime/utils#bun-env',
  '.env files': 'https://bun.com/docs/runtime/environment-variables#setting-environment-variables',
  'configuring Bun': 'https://bun.com/docs/runtime/environment-variables#configuring-bun',
  BUN_OPTIONS: 'https://bun.com/docs/runtime/environment-variables#configuring-bun',
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

  // ── Testing & snapshots ────────────────────────────────────────────────
  'bun:test': 'https://bun.com/docs/test/index#run-tests',
  'bun test': 'https://bun.com/docs/test/index#run-tests',
  'bun:test snapshots': 'https://bun.com/docs/test/snapshots#basic-snapshots',
  'snapshot guide': 'https://bun.com/guides/test/snapshot',
  // Release blog deep links (docs index may lag; prefer these for ship notes)
  'bun v1.3.12': 'https://bun.com/blog/bun-v1.3.12',
  'bun v1.3.12 install': 'https://bun.com/blog/bun-v1.3.12#to-install-bun',
  'bun v1.3.12 upgrade': 'https://bun.com/blog/bun-v1.3.12#to-upgrade-bun',
  'bun upgrade': 'https://bun.com/blog/bun-v1.3.12#to-upgrade-bun',
  'bun v1.3.12 bugfixes': 'https://bun.com/blog/bun-v1.3.12#bugfixes',
  'bun v1.3.12 contributors': 'https://bun.com/blog/bun-v1.3.12#thanks-to-8-contributors',
  // v1.3.12 perf ship notes (runtime inherit; docs index may lag)
  'Bun.Glob.scan': 'https://bun.com/blog/bun-v1.3.12#faster-bun-glob-scan',
  'bun v1.3.12 stripANSI':
    'https://bun.com/blog/bun-v1.3.12#faster-bun-stripansi-and-bun-stringwidth',
  'bun v1.3.12 stringWidth':
    'https://bun.com/blog/bun-v1.3.12#faster-bun-stripansi-and-bun-stringwidth',
  'bun v1.3.13': 'https://bun.com/blog/bun-v1.3.13',
  // bun test flags (v1.3.13+) — blog anchors are the ship notes
  'bun test --changed': 'https://bun.com/blog/bun-v1.3.13#bun-test-changed',
  '--changed': 'https://bun.com/blog/bun-v1.3.13#bun-test-changed',
  '--isolate': 'https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
  '--parallel': 'https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
  '--shard':
    'https://bun.com/blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs',

  // ── Bundler / executables ──────────────────────────────────────────────
  'bun build --compile': 'https://bun.com/docs/bundler/executables',
  'compile targets': 'https://bun.com/docs/bundler/executables#supported-targets',

  // ── General utilities ──────────────────────────────────────────────────
  // @see pinned for tools that log runtime version in integrity/status
  'Bun.version': 'https://bun.com/docs/runtime/utils#bun-version',
  'Bun.revision': 'https://bun.com/docs/runtime/utils#bun-revision',
  'Bun.randomUUIDv7': 'https://bun.com/docs/runtime/utils#bun-randomuuidv7',
  'Bun.Glob': 'https://bun.com/docs/runtime/glob#quickstart',
  'Bun.which': 'https://bun.com/docs/runtime/utils#bun-which',
  'Bun.nanoseconds': 'https://bun.com/docs/runtime/utils#bun-nanoseconds',
  'Bun.sleep': 'https://bun.com/docs/runtime/utils#bun-sleep',
  'Bun.sleepSync': 'https://bun.com/docs/runtime/utils#bun-sleepsync',
  'Bun.deepEquals': 'https://bun.com/docs/runtime/utils#bun-deepequals',
  'Bun.escapeHTML': 'https://bun.com/docs/runtime/utils#bun-escapehtml',
  'Bun.peek': 'https://bun.com/docs/runtime/utils#bun-peek',
  'Bun.main': 'https://bun.com/docs/runtime/utils#bun-main',
  'Bun.resolveSync': 'https://bun.com/docs/runtime/utils#bun-resolvesync',
  'Bun.fileURLToPath': 'https://bun.com/docs/runtime/utils#bun-fileurltopath',
  'Bun.pathToFileURL': 'https://bun.com/docs/runtime/utils#bun-pathtofileurl',
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
  'bun-types': BUN_TYPES_PINNED,
  'llms.txt index': 'https://bun.com/docs/llms.txt',
  'markdown docs': 'https://bun.com/docs/runtime/environment-variables.md',
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
function isCodeApiKey(k: string): boolean {
  if (k === 'console' || k === 'dns' || k === 'redis') return false;
  // Ambiguous CLI flag: bundler watch vs `bun test --changed --watch` (blog #bun-test-changed)
  if (k === '--watch') return false;
  if (k.startsWith('Bun.') || k.startsWith('bun:') || k.startsWith('--')) return true;
  // PascalCase Bun package exports / types
  if (/^[A-Z][A-Za-z0-9]+$/.test(k)) return true;
  return false;
}

const APIS = Object.keys(CANONICAL_REFS).filter(isCodeApiKey);

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
    'process.env': 'Bun.env',
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
  const ex = token.examples[0];
  if (ex) {
    const preview = ex.code.split('\n')[0]!.slice(0, 72);
    console.info(`  example[${ex.lang}]: ${preview}${ex.code.length > 72 ? '…' : ''}`);
  }
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
}

async function suggest(query: string): Promise<void> {
  if (!query) {
    console.error('usage: bun tools/bun-doc-refs.ts suggest <api-or-topic>');
    process.exit(1);
  }

  // 1) Frozen institutional map wins (never lose to a stale catalog locus)
  const mapped = CANONICAL_REFS[query] ?? CANONICAL_REFS[resolveApiAlias(query)];
  if (mapped) {
    try {
      const { getBunToken } = await import('./bun-docs-catalog.ts');
      const token = await getBunToken(query);
      if (token) {
        printBunTokenSuggest(query, token, 'canonical map — tools/bun-doc-refs.ts CANONICAL_REFS', {
          locusOverride: mapped,
        });
        if (!token.examples?.length) {
          try {
            const { guideExamplesForQuery } = await import('./bun-docs-guide-examples.ts');
            for (const ex of guideExamplesForQuery(query, mapped)) {
              console.info(`  example[${ex.lang}]:`);
              for (const line of ex.body.split('\n')) console.info(`    ${line}`);
            }
          } catch {
            /* guide fences optional */
          }
        }
        return;
      }
    } catch {
      /* catalog optional */
    }
    console.info(`${query} → ${mapped}`);
    console.info('  (canonical map — tools/bun-doc-refs.ts CANONICAL_REFS)');
    try {
      const { guideExamplesForQuery } = await import('./bun-docs-guide-examples.ts');
      for (const ex of guideExamplesForQuery(query, mapped)) {
        console.info(`  example[${ex.lang}]:`);
        for (const line of ex.body.split('\n')) console.info(`    ${line}`);
      }
    } catch {
      /* guide fences optional */
    }
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
  console.info(`❌ no docs page found for "${query}" — browse https://bun.com/docs/llms.txt`);
  process.exit(1);
}

/** Verify every CANONICAL_REFS anchor against the generated docs index. */ async function audit(): Promise<number> {
  const { entries } = await docsIndex();
  let bad = 0;
  for (const [api, url] of Object.entries(CANONICAL_REFS)) {
    if (!url.startsWith('https://bun.com/docs') || url.endsWith('llms.txt') || url.endsWith('.md'))
      continue;
    const [base, anchor] = url.split('#');
    if (!anchor) continue;
    const entry = entries.find(e => e.url.replace(/\.md$/, '') === base);
    if (!entry) {
      console.info(`❌ ${api}: page not in index: ${base}`);
      bad++;
      continue;
    }
    if (!entry.anchors.includes(anchor)) {
      console.info(`❌ ${api}: anchor missing from page: #${anchor}`);
      console.info(`   available: ${entry.anchors.slice(0, 8).join(', ')}…`);
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
import { bunBlog, bunDocs, mdnWebApi } from '../lib/docs/bun-site-url.ts';

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
  let last: {
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
  } | null = null;
  if (await Bun.file(LOG).exists()) {
    const lines = (await Bun.file(LOG).text()).trim().split('\n').filter(Boolean);
    const raw = lines.at(-1);
    if (raw) {
      try {
        last = JSON.parse(raw) as typeof last;
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
    console.info(
      `🕐 [${started}] integrity ${failures === 0 ? 'PASS' : `FAIL (${failures})`}` +
        ` · bun ${Bun.version}` +
        (failures === 0
          ? regen.ok
            ? ` — regen OK (${regen.pages} pages, ${regen.anchors} anchors)`
            : ` — regen FAILED: ${regen.error}`
          : ' — regen skipped') +
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
    if (!okStatus(status) && status !== 'inherited') {
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
    case 'suggest':
      await suggest(rest.join(' '));
      break;
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
    default:
      console.error(
        `unknown command: ${cmd}\n` +
          `commands: url|token|list|catalog|suggest|locus|audit|deepcheck|integrity|status|schedule|export|annotate|check|validate\n` +
          `catalog: --build · list --section=… --type=… · get <Name>  (also: bun run docs:catalog:export · docs:refresh)\n` +
          `locus: --depth=N · --all · --tsv · --json · --type=api  (TOKEN/TYPE/STATUS/PAGE/FRAGMENT…)\n` +
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
