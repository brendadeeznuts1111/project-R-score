// @see https://bun.com/docs/pm/filter#package-name-filter-pattern — --filter
// @see https://bun.com/docs/bundler/bytecode#with-standalone-executables — --compile
// @see https://bun.com/docs/runtime/console#object-inspection-depth — --console-depth
// @see https://bun.com/docs/bundler/index#basic-example — Bun.build
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/redis#getting-started — Bun.redis
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/docs/guides/runtime/timezone — TZ
// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/html-rewriter — HTMLRewriter
// @see https://bun.com/docs/runtime/networking/fetch#sending-an-http-request — fetch
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
// @see https://bun.com/docs/runtime/cron — Bun.cron
// @see https://bun.com/docs/runtime/s3 — Bun.s3
// @see https://bun.com/docs/cli/test — bun:test
// @see https://bun.com/blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel — --isolate / --parallel
// @see https://bun.com/blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs — --shard
// @see https://bun.com/blog/bun-v1.3.13#bun-test-changed — --changed
// @see https://bun.com/blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto — SHA3 / sha3-256
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/http/server — Bun.serve
// @see https://bun.com/docs/runtime/child-process#terminal-pty-support — Bun.Terminal
// @see https://bun.com/docs/bundler — Bun.build
// @see https://bun.com/docs/runtime/markdown — Bun.markdown
// @see https://bun.com/docs/runtime/markdown#bun-markdown-react — Bun.markdown.react
// @see https://bun.com/docs/runtime/markdown#component-overrides — component-overrides
// @see https://bun.com/docs/runtime/markdown#available-overrides — available-overrides
// @see https://bun.com/docs/runtime/markdown#options — options
// @see https://bun.com/docs/runtime/markdown#parser-options — parser-options
// @see https://bun.com/docs/runtime/markdown#parser-options-2 — parser-options-2
// @see https://bun.com/docs/bundler/executables#runtime-arguments-via-bun_options — BUN_OPTIONS
// @see https://bun.com/docs/bundler/executables#embedding-runtime-arguments — --compile-exec-argv
// @see https://bun.com/docs/guides/http/file-uploads#upload-files-via-http-using-formdata — file-uploads
// @see https://bun.com/docs/runtime/workers — Concurrency (Runtime nav group)
// @see https://bun.com/docs/runtime/workers#creating-a-worker — Worker
// @see https://bun.com/docs/runtime/workers#worker-ref — worker.ref
// @see https://bun.com/docs/runtime/workers#worker-unref — worker.unref
// @see https://bun.com/docs/runtime/workers#bun-ismainthread — Bun.isMainThread
// @see https://bun.com/docs/pm/global-store#concurrency — install concurrency
// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password
// @see https://bun.com/docs/runtime/secrets — Bun.secrets
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect-custom — Bun.inspect.custom
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/reference/bun/BunInspectOptions — BunInspectOptions
// @see https://bun.com/docs/runtime/webview — Bun.WebView
// @see https://bun.com/docs/runtime/networking/udp — Bun.udpSocket
// tools/bun-docs-curated.ts — Hot-path Bun doc entries (1.3.14+ aware)

import { bunBlog, bunDocs, bunReference } from '../lib/docs/bun-site-url.ts';

export type CuratedEntry = {
  term: string;
  path: string;
  description: string;
  minVersion?: string;
  stability?: 'stable' | 'experimental';
  /** Extra docs pages merged into allPages (path under docs/ or reference/). */
  related?: string[];
  /** Prefer these catalog token names in `related` after page-peer seeding. */
  relatedTokens?: string[];
  /**
   * Optional audit SSOT ids (AuditConcept / AuditFinding).
   * Surfaced by suggest — never merged into BunToken / CANONICAL_REFS.
   */
  auditRefs?: string[];
};

export const CURATED_ENTRIES: CuratedEntry[] = [
  {
    term: 'Bun.Image',
    path: 'runtime/image',
    description: 'Built-in image decode/resize/encode pipeline',
    minVersion: '1.3.14',
    related: ['runtime/file-io', 'runtime/s3'],
  },
  {
    term: 'Bun.serve',
    path: 'runtime/http/server',
    description: 'HTTP server with routes, TLS, WebSockets, HTTP/3',
    related: ['runtime/http/websockets', 'runtime/http/tls'],
  },
  {
    term: 'http3',
    path: 'runtime/http/server',
    description: 'Experimental HTTP/3 (QUIC) in Bun.serve',
    minVersion: '1.3.14',
    stability: 'experimental',
  },
  {
    term: 'fetch',
    path: 'runtime/networking/fetch',
    description: 'fetch() client with HTTP/2 and HTTP/3 options',
    minVersion: '1.3.14',
    stability: 'experimental',
    related: ['runtime/http/server'],
  },
  {
    term: 'globalStore',
    path: 'pm/global-store',
    description: 'Shared global virtual store for isolated installs',
    minVersion: '1.3.14',
  },
  {
    term: 'bun install',
    path: 'pm/cli/install',
    description: 'Package manager install with hoisted/isolated linkers',
  },
  {
    term: 'Bun.SQL',
    path: 'runtime/sql',
    description: 'Postgres and MySQL client with connection pooling',
  },
  {
    term: 'bun:sqlite',
    path: 'runtime/sqlite',
    description: 'Built-in SQLite driver (v3.53.0 in 1.3.14)',
  },
  {
    term: 'Bun.spawn',
    path: 'runtime/child-process',
    description: 'Spawn subprocesses with pipes and terminals',
  },
  { term: 'Bun.$', path: 'runtime/shell', description: 'Shell template tag for running commands' },
  { term: 'Bun.file', path: 'runtime/file-io', description: 'Lazy file I/O API' },
  { term: 'Bun.s3', path: 'runtime/s3', description: 'S3-compatible object storage client' },
  { term: 'Bun.secrets', path: 'runtime/secrets', description: 'OS keychain-backed secrets API' },
  { term: 'Bun.password', path: 'runtime/hashing', description: 'Argon2/bcrypt password hashing' },
  {
    term: 'Bun.CryptoHasher',
    path: 'runtime/hashing#bun-cryptohasher',
    description:
      'Native sync hasher (sha256, sha3-256, …). FactoryWager audit SSOT uses sha256 today — not SHA-3.',
    relatedTokens: ['sha3-256', 'SHA3-256', 'Bun.password'],
  },
  {
    term: 'SHA3',
    path: 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
    description:
      'v1.3.13: SHA3-224/256/384/512 in node:crypto + WebCrypto (createHash/createHmac/subtle.digest). Also Bun.CryptoHasher("sha3-256"). Docs-only — audit evidence remains sha256.',
    minVersion: '1.3.13',
    relatedTokens: [
      'sha3-256',
      'SHA3-256',
      'Bun.CryptoHasher',
      'crypto.createHash("sha3-256")',
      'crypto.subtle.digest("SHA3-256")',
    ],
  },
  {
    term: 'SHA-3',
    path: 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
    description: 'Alias for SHA3 (FIPS 202) ship note on bun-v1.3.13.',
    minVersion: '1.3.13',
    relatedTokens: ['SHA3', 'sha3-256'],
  },
  {
    term: 'sha3-256',
    path: 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
    description:
      'node:crypto createHash("sha3-256") / Bun.CryptoHasher("sha3-256"). WebCrypto id is SHA3-256 (uppercase).',
    minVersion: '1.3.13',
    relatedTokens: ['SHA3-256', 'SHA3', 'Bun.CryptoHasher', 'sha3-512'],
  },
  {
    term: 'SHA3-256',
    path: 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
    description: 'WebCrypto subtle.digest("SHA3-256", …). node:crypto / CryptoHasher use sha3-256.',
    minVersion: '1.3.13',
    relatedTokens: ['sha3-256', 'SHA3', 'Bun.CryptoHasher'],
  },
  {
    term: 'sha3-224',
    path: 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
    description: 'SHA3-224 via createHash / CryptoHasher / subtle.digest("SHA3-224").',
    minVersion: '1.3.13',
    relatedTokens: ['SHA3', 'sha3-256'],
  },
  {
    term: 'SHA3-224',
    path: 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
    description: 'WebCrypto algorithm id for SHA3-224.',
    minVersion: '1.3.13',
    relatedTokens: ['sha3-224', 'SHA3'],
  },
  {
    term: 'sha3-384',
    path: 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
    description: 'SHA3-384 via createHash / CryptoHasher / subtle.digest("SHA3-384").',
    minVersion: '1.3.13',
    relatedTokens: ['SHA3', 'sha3-256'],
  },
  {
    term: 'SHA3-384',
    path: 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
    description: 'WebCrypto algorithm id for SHA3-384.',
    minVersion: '1.3.13',
    relatedTokens: ['sha3-384', 'SHA3'],
  },
  {
    term: 'sha3-512',
    path: 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
    description: 'SHA3-512 via createHash / CryptoHasher / subtle.digest("SHA3-512").',
    minVersion: '1.3.13',
    relatedTokens: ['SHA3', 'sha3-256'],
  },
  {
    term: 'SHA3-512',
    path: 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
    description: 'WebCrypto algorithm id for SHA3-512.',
    minVersion: '1.3.13',
    relatedTokens: ['sha3-512', 'SHA3'],
  },
  {
    term: 'crypto.createHash("sha3-256")',
    path: 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
    description: 'node:crypto SHA-3 digest (also createHmac / getHashes).',
    minVersion: '1.3.13',
    relatedTokens: ['sha3-256', 'SHA3', 'crypto.subtle.digest("SHA3-256")'],
  },
  {
    term: 'crypto.subtle.digest("SHA3-256")',
    path: 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
    description: 'WebCrypto SHA-3 digest (HMAC via subtle.sign/verify).',
    minVersion: '1.3.13',
    relatedTokens: ['SHA3-256', 'SHA3', 'crypto.createHash("sha3-256")'],
  },
  { term: 'Bun.build', path: 'bundler', description: 'Bundler and compile-to-binary' },
  { term: 'bun test', path: 'test', description: 'Built-in test runner (bun:test)' },
  {
    term: '--isolate',
    path: 'blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
    description:
      'bun test: run each test file in a fresh global environment within the same process (drain microtasks, close sockets, cancel timers, kill subprocesses). VM transpilation cache keeps shared deps parsed once.',
    minVersion: '1.3.13',
    relatedTokens: ['--parallel', '--changed', '--shard', 'bun test --isolate'],
  },
  {
    term: 'bun test --isolate',
    path: 'blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
    description:
      'bun test: run each test file in a fresh global environment within the same process. Shared deps reuse a VM-level transpilation cache. Implied by --parallel workers.',
    minVersion: '1.3.13',
    relatedTokens: ['--isolate', '--parallel', 'bun test --parallel'],
  },
  {
    term: '--parallel',
    path: 'blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
    description:
      'bun test --parallel[=N]: distribute test files across up to N worker processes (default CPU count). Workers auto --isolate; console buffered per file. ≠ bun run --parallel (Foreman scripts — cli/run#parallel-and-sequential-mode). FactoryWager NOTE: docs/guides/bun-test-flags-1.3.13.md',
    minVersion: '1.3.13',
    relatedTokens: [
      '--isolate',
      '--shard',
      '--changed',
      'bun test --parallel',
      'bun run --parallel',
      'JEST_WORKER_ID',
      'BUN_TEST_WORKER_ID',
    ],
  },
  {
    term: 'bun test --parallel',
    path: 'blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
    description:
      'Parallel workers for test files (work-stealing queue, atomic per-file console flush). Sets JEST_WORKER_ID and BUN_TEST_WORKER_ID. Callout: ≠ bun run --parallel — that is workspace Foreman mode at cli/run#parallel-and-sequential-mode.',
    minVersion: '1.3.13',
    relatedTokens: [
      '--isolate',
      '--shard',
      '--changed',
      'bun run --parallel',
      'JEST_WORKER_ID',
      'BUN_TEST_WORKER_ID',
    ],
  },
  {
    term: 'bun test flags',
    path: 'blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
    description:
      'v1.3.13 NOTE family: --isolate, --parallel, --shard, --changed. Scannable TOC + fences: docs/guides/bun-test-flags-1.3.13.md. Day-loop wrappers: docs/harness/day-loop.md.',
    minVersion: '1.3.13',
    relatedTokens: ['--isolate', '--parallel', '--shard', '--changed', 'bun run --parallel'],
    auditRefs: ['harness-day-loop'],
  },
  {
    term: '--shard',
    path: 'blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs',
    description:
      'bun test --shard=M/N: split test files across CI jobs (1-based, round-robin by sorted path). Empty shards exit 0. Composes with --changed and --randomize.',
    minVersion: '1.3.13',
    relatedTokens: ['--shard=M/N', '--parallel', '--changed', '--randomize', '--isolate'],
  },
  {
    term: '--shard=M/N',
    path: 'blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs',
    description:
      'Split bun test files across CI runners (Jest/Vitest/Playwright syntax). Index is 1-based; invalid inputs like 0/3 exit non-zero.',
    minVersion: '1.3.13',
    relatedTokens: ['--shard', '--parallel', '--changed', '--randomize'],
  },
  {
    term: 'bun test --shard',
    path: 'blog/bun-v1.3.13#bun-test-shard-m-n-for-splitting-tests-across-ci-jobs',
    description:
      'Split bun test files across CI jobs with --shard=M/N (sorted paths, round-robin).',
    minVersion: '1.3.13',
    relatedTokens: ['--shard', '--parallel', '--changed', '--randomize'],
  },
  {
    term: '--changed',
    path: 'blog/bun-v1.3.13#bun-test-changed',
    description:
      'bun test --changed[=ref]: run only test files whose import graph transitively depends on git-changed files (unstaged+staged+untracked, or since a commit/branch). Combines with --watch.',
    minVersion: '1.3.13',
    relatedTokens: ['bun test --changed', '--shard', 'bun test --watch', '--parallel', '--isolate'],
  },
  {
    term: 'bun test --changed',
    path: 'blog/bun-v1.3.13#bun-test-changed',
    description:
      'Run only tests affected by git changes via import-graph analysis (skips node_modules). Empty set exits cleanly; with --watch keeps the process alive.',
    minVersion: '1.3.13',
    relatedTokens: ['--changed', '--shard', 'bun test --watch', '--parallel'],
  },
  {
    term: 'bun run --parallel',
    // Shipped 1.3.9 — https://bun.com/blog/bun-v1.3.9#bun-run-parallel-and-bun-run-sequential
    path: 'cli/run#parallel-and-sequential-mode',
    description:
      'bun run --parallel: Foreman-style parallel package.json scripts (prefixed output, --filter/--workspaces). Canonical: cli/run#parallel-and-sequential-mode. ≠ bun test --parallel (test-file workers; blog v1.3.13).',
    minVersion: '1.3.9',
    relatedTokens: ['bun test --parallel', '--parallel'],
  },
  {
    term: '--parallel=N',
    path: 'blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
    description:
      'bun test --parallel=N: cap worker processes at N (default CPU count). Workers auto-enable --isolate.',
    minVersion: '1.3.13',
    relatedTokens: ['--parallel', '--isolate', 'bun test --parallel'],
  },
  {
    term: 'JEST_WORKER_ID',
    path: 'blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
    description:
      'Environment variable set by bun test --parallel (Jest-compatible worker id). Also see BUN_TEST_WORKER_ID.',
    minVersion: '1.3.13',
    relatedTokens: ['BUN_TEST_WORKER_ID', 'bun test --parallel', '--parallel'],
  },
  {
    term: 'BUN_TEST_WORKER_ID',
    path: 'blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
    description:
      'Environment variable set by bun test --parallel identifying the worker process. Also see JEST_WORKER_ID.',
    minVersion: '1.3.13',
    relatedTokens: ['JEST_WORKER_ID', 'bun test --parallel', '--parallel'],
  },
  {
    term: '--randomize',
    path: 'blog/bun-v1.3.13#bun-test-isolate-and-bun-test-parallel',
    description:
      'bun test: shuffle test order. With --shard, shuffle happens after shard selection (within the shard).',
    minVersion: '1.3.13',
    relatedTokens: ['--shard', '--parallel', '--isolate', '--changed'],
  },
  {
    term: 'bun test --watch',
    path: 'blog/bun-v1.3.13#bun-test-changed',
    description:
      'Re-run bun test on file changes. Combined with --changed, each restart re-queries git and re-filters the import graph.',
    minVersion: '1.3.13',
    relatedTokens: ['--changed', 'bun test --changed'],
  },
  {
    term: 'Bun.Terminal',
    path: 'runtime/terminal',
    // Shipped 1.3.5 (POSIX PTY); Windows ConPTY later (1.3.14 notes)
    // https://bun.com/blog/bun-v1.3.5#bun-terminal-api-for-pseudo-terminal-pty-support
    description: 'PTY terminal for spawned processes (new Bun.Terminal + spawn terminal)',
    minVersion: '1.3.5',
    related: ['runtime/child-process'],
  },
  {
    term: 'Bun.cron',
    path: 'runtime/cron',
    // Prefer deep links: #bun-cron-schedule-handler-—-in-process · #no-overlap-guarantee
    // (bare #cron is not a section id on the page)
    description: 'In-process cron scheduling (UTC; no-overlap after handler settles)',
    minVersion: '1.3.14',
  },
  {
    term: 'Bun.WebView',
    path: 'runtime/webview',
    description: 'Headless browser automation',
    minVersion: '1.4.0',
    stability: 'experimental',
  },
  {
    term: 'Bun.markdown',
    path: 'runtime/markdown#bun-markdown-html',
    description: 'Native Markdown rendering (html/ansi/render/react)',
    minVersion: '1.3.0',
    relatedTokens: [
      'Bun.markdown.html',
      'Bun.markdown.ansi',
      'Bun.markdown.render',
      'Bun.markdown.react',
      'options',
    ],
  },
  {
    term: 'Bun.markdown.html',
    path: 'runtime/markdown#bun-markdown-html',
    description: 'Render Markdown to an HTML string. Pass parser options as the second argument.',
    minVersion: '1.3.0',
    related: ['runtime/markdown#options'],
    relatedTokens: ['options', 'Bun.markdown', 'Bun.markdown.render', 'Bun.markdown.react'],
  },
  {
    term: 'Bun.markdown.ansi',
    path: 'runtime/markdown#ansi-terminal-output',
    description: 'Markdown → ANSI for the terminal',
    minVersion: '1.3.12',
    relatedTokens: ['Bun.markdown', 'Bun.markdown.render', 'Bun.markdown.react'],
  },
  {
    term: 'Bun.markdown.render',
    path: 'runtime/markdown#bun-markdown-render',
    description:
      'Render Markdown via callbacks. Pass parser options as a separate third argument (see parser-options).',
    minVersion: '1.3.0',
    related: ['runtime/markdown#parser-options', 'runtime/markdown#options'],
    relatedTokens: [
      'parser-options',
      'options',
      'Bun.markdown',
      'Bun.markdown.html',
      'Bun.markdown.react',
    ],
  },
  {
    term: 'Bun.markdown.react',
    path: 'runtime/markdown#bun-markdown-react',
    description:
      'Render Markdown directly to React elements. Replace any HTML tag via component overrides (see available-overrides).',
    minVersion: '1.3.8',
    related: [
      'runtime/markdown#component-overrides',
      'runtime/markdown#available-overrides',
      'runtime/markdown#parser-options-2',
      'runtime/markdown#options',
    ],
    relatedTokens: [
      'component-overrides',
      'available-overrides',
      'parser-options-2',
      'options',
      'Bun.markdown',
      'Bun.markdown.html',
      'Bun.markdown.render',
    ],
  },
  {
    term: 'component-overrides',
    path: 'runtime/markdown#component-overrides',
    description:
      'Replace any HTML element with a custom React component by passing it in the second argument to Bun.markdown.react, keyed by tag name.',
    minVersion: '1.3.8',
    relatedTokens: ['available-overrides', 'Bun.markdown.react'],
  },
  {
    term: 'available-overrides',
    path: 'runtime/markdown#available-overrides',
    description:
      'Every HTML tag produced by the Bun.markdown.react parser can be overridden (h1–h6, p, pre, a, code, …).',
    minVersion: '1.3.8',
    relatedTokens: ['component-overrides', 'Bun.markdown.react'],
  },
  {
    term: 'options',
    path: 'runtime/markdown#options',
    description:
      'Pass an options object as the second argument to Bun.markdown.html to configure the parser (tables, autolinks, headings, …).',
    minVersion: '1.3.0',
    relatedTokens: [
      'parser-options',
      'parser-options-2',
      'Bun.markdown.html',
      'Bun.markdown.render',
      'Bun.markdown.react',
    ],
  },
  {
    term: 'parser-options',
    path: 'runtime/markdown#parser-options',
    description:
      'Pass parser options as a separate third argument to Bun.markdown.render (same option set as #options).',
    minVersion: '1.3.0',
    relatedTokens: ['options', 'parser-options-2', 'Bun.markdown.render'],
  },
  {
    term: 'parser-options-2',
    path: 'runtime/markdown#parser-options-2',
    description:
      'Pass any of the parser options (#options) as the third argument to Bun.markdown.react.',
    minVersion: '1.3.8',
    relatedTokens: ['options', 'parser-options', 'Bun.markdown.react'],
  },
  {
    term: 'BUN_OPTIONS',
    path: 'bundler/executables#runtime-arguments-via-bun_options',
    description:
      'Standalone executables read the BUN_OPTIONS environment variable, so you can pass runtime flags without recompiling.',
    related: [
      'bundler/executables#embedding-runtime-arguments',
      'runtime/environment-variables#configuring-bun',
    ],
    relatedTokens: [
      'runtime-arguments-via-bun_options',
      'embedding-runtime-arguments',
      '--compile-exec-argv',
    ],
  },
  {
    term: 'runtime-arguments-via-bun_options',
    path: 'bundler/executables#runtime-arguments-via-bun_options',
    description:
      'Standalone executables read the BUN_OPTIONS environment variable, so you can pass runtime flags without recompiling.',
    relatedTokens: ['BUN_OPTIONS', 'embedding-runtime-arguments', '--compile-exec-argv'],
  },
  {
    term: 'embedding-runtime-arguments',
    path: 'bundler/executables#embedding-runtime-arguments',
    description:
      'Embed runtime arguments with --compile-exec-argv / compile.execArgv, available at runtime in process.execArgv.',
    relatedTokens: ['--compile-exec-argv', 'BUN_OPTIONS', 'runtime-arguments-via-bun_options'],
  },
  {
    term: 'file-uploads',
    path: 'guides/http/file-uploads#upload-files-via-http-using-formdata',
    description:
      'Upload files over HTTP with Bun using the FormData API — parse with req.formData() and persist with Bun.write().',
    related: [
      'runtime/file-io#writing-files-bun-write',
      'runtime/http/server#basic-setup',
      'runtime/file-io',
    ],
    relatedTokens: [
      'Upload files via HTTP using FormData',
      'req.formData',
      'Bun.write',
      'Bun.serve',
      'Bun.file',
    ],
  },
  {
    term: 'Upload files via HTTP using FormData',
    path: 'guides/http/file-uploads#upload-files-via-http-using-formdata',
    description:
      'Upload files over HTTP with Bun using the FormData API — parse with req.formData() and persist with Bun.write().',
    relatedTokens: ['file-uploads', 'req.formData', 'Bun.write', 'Bun.serve'],
  },
  {
    term: 'upload-files-via-http-using-formdata',
    path: 'guides/http/file-uploads#upload-files-via-http-using-formdata',
    description:
      'Upload files over HTTP with Bun using the FormData API — parse with req.formData() and persist with Bun.write().',
    relatedTokens: ['file-uploads', 'req.formData', 'Bun.write'],
  },
  {
    term: 'req.formData',
    path: 'guides/http/file-uploads#upload-files-via-http-using-formdata',
    description:
      'Parse an incoming multipart Request into FormData (await req.formData()), then read fields with .get().',
    relatedTokens: ['file-uploads', 'Bun.write', 'Bun.serve'],
  },
  {
    term: 'Concurrency',
    path: 'runtime/workers',
    description:
      'Runtime docs nav group (Workers). Sidebar: after Networking / Redis clients, before Process & System. Distinct from pm/global-store install concurrency.',
    related: ['runtime/workers#creating-a-worker', 'runtime/child-process', 'runtime/redis'],
    relatedTokens: ['Workers', 'Worker', 'worker.ref', 'worker.unref', 'Bun.isMainThread'],
  },
  {
    term: 'Runtime Concurrency',
    path: 'runtime/workers',
    description:
      'Runtime docs nav group (Workers). Sidebar: after Networking / Redis clients, before Process & System.',
    relatedTokens: ['Concurrency', 'Workers', 'Worker'],
  },
  {
    term: 'global-store concurrency',
    path: 'pm/global-store#concurrency',
    description:
      'Package install linker concurrency for the global virtual store (pm) — not the Runtime Workers nav group.',
    relatedTokens: ['install concurrency', 'pm concurrency'],
  },
  {
    term: 'install concurrency',
    path: 'pm/global-store#concurrency',
    description:
      'Package install linker concurrency for the global virtual store (pm) — not the Runtime Workers nav group.',
    relatedTokens: ['global-store concurrency', 'pm concurrency'],
  },
  {
    term: 'pm concurrency',
    path: 'pm/global-store#concurrency',
    description:
      'Package install linker concurrency for the global virtual store (pm) — not the Runtime Workers nav group.',
    relatedTokens: ['global-store concurrency', 'install concurrency'],
  },
  {
    term: 'Worker',
    path: 'runtime/workers#creating-a-worker',
    description:
      'Create a worker thread with new Worker (global, like browsers). Share I/O with the main thread; communicate via postMessage.',
    relatedTokens: [
      'worker.ref',
      'worker.unref',
      'worker.terminate',
      'worker.postMessage',
      'Bun.isMainThread',
    ],
  },
  {
    term: 'Workers',
    path: 'runtime/workers#creating-a-worker',
    description:
      "Bun's Workers API — create and communicate with a JavaScript instance on a separate thread while sharing I/O with the main thread.",
    relatedTokens: ['Worker', 'worker.ref', 'worker.unref', 'Bun.isMainThread', 'Concurrency'],
  },
  {
    term: 'worker.unref',
    path: 'runtime/workers#worker-unref',
    description:
      "Stop a running worker from keeping the process alive. Decouples the worker's lifetime from the main process (≡ Node.js worker_threads). Not available in browsers.",
    relatedTokens: ['worker.ref', 'Worker', 'managing-lifetime'],
  },
  {
    term: 'worker.ref',
    path: 'runtime/workers#worker-ref',
    description:
      'Keep the process alive until the Worker terminates. Workers are ref\'d by default; a ref\'d worker still needs something on its event loop (such as a "message" listener) to continue running. Not available in browsers.',
    relatedTokens: ['worker.unref', 'Worker', 'managing-lifetime'],
  },
  {
    term: 'managing-lifetime',
    path: 'runtime/workers#managing-lifetime',
    description:
      'By default an active Worker keeps the main process alive. Use worker.unref() / worker.ref() (or Worker options.ref) to manage lifetime.',
    relatedTokens: ['worker.ref', 'worker.unref', 'Worker'],
  },
  {
    term: 'worker.terminate',
    path: 'runtime/workers#terminating-a-worker',
    description:
      'Explicitly terminate a Worker. Workers also exit when their event loop has no work left (message listeners keep them alive).',
    relatedTokens: ['Worker', 'worker.ref', 'worker.unref'],
  },
  {
    term: 'worker.postMessage',
    path: 'runtime/workers#messages-with-postmessage',
    description:
      'Send messages between main thread and worker via worker.postMessage / self.postMessage (structured clone; Bun has string fast paths).',
    relatedTokens: ['Worker', 'worker.ref'],
  },
  {
    term: 'Worker.preload',
    path: 'runtime/workers#preload-load-modules-before-the-worker-starts',
    description:
      "Pass preload module specifiers in the Worker constructor options to load them before the worker's own code runs (like --preload).",
    relatedTokens: ['Worker'],
  },
  {
    term: 'Worker smol',
    path: 'runtime/workers#memory-usage-with-smol',
    description:
      'Worker constructor option smol: true reduces memory usage at a cost of performance (distinct from bunfig smol).',
    relatedTokens: ['Worker'],
  },
  {
    term: 'Bun.isMainThread',
    path: 'runtime/workers#bun-ismainthread',
    description:
      "Check Bun.isMainThread to tell whether you're on the main thread or inside a worker.",
    relatedTokens: ['Worker', 'worker.ref'],
  },
  {
    term: 'executables Worker',
    path: 'bundler/executables#worker',
    description:
      'When compiling standalone executables, list worker files as additional entrypoints so new Worker(...) paths are bundled.',
    relatedTokens: ['Worker', 'BUN_OPTIONS'],
  },
  {
    term: 'Bun.udpSocket',
    path: 'runtime/networking/udp',
    description: 'UDP sockets with ICMP/truncation handling',
    minVersion: '1.0.0',
  },
  {
    term: 'Bun.secrets',
    path: 'runtime/secrets',
    description: 'OS keychain-backed secrets API',
    minVersion: '1.3.0',
    stability: 'experimental',
  },
  {
    term: 'noOrphans',
    path: 'runtime/bunfig',
    description: 'Exit when parent dies (--no-orphans)',
    minVersion: '1.3.14',
  },
  {
    term: 'process.execve',
    path: 'runtime/node-api',
    description: 'Replace process image in-place',
    minVersion: '1.3.14',
  },
  {
    term: 'fs.watch',
    path: 'runtime/file-io',
    description: 'File watcher (rewritten backend in 1.3.14)',
  },
  { term: 'bun publish', path: 'pm/cli/publish', description: 'Publish packages to npm registry' },
  { term: 'workspaces', path: 'pm/workspaces', description: 'Monorepo workspace support' },
  { term: 'Bun.Transpiler', path: 'runtime/transpiler', description: 'JS/TS/JSX transpiler API' },
  {
    term: 'HTMLRewriter',
    path: 'runtime/html-rewriter',
    description: 'Streaming HTML transformation',
  },
  {
    term: 'WebSocket',
    path: 'runtime/http/websockets',
    description: 'WebSocket server and client',
  },
  { term: 'Bun.redis', path: 'runtime/redis', description: 'Redis/Valkey client' },
  { term: 'ffi', path: 'runtime/ffi', description: 'Call native libraries from JavaScript' },
  {
    term: 'Bun.inspect',
    path: 'runtime/utils#bun-inspect',
    description: 'Serializes an object to a string exactly as it would be printed by console.log',
    related: ['runtime/console', 'reference/bun/BunInspectOptions'],
    relatedTokens: [
      'Bun.inspect.custom',
      'Bun.inspect.table',
      'BunInspectOptions',
      '--console-depth',
    ],
  },
  {
    term: 'Bun.inspect()',
    path: 'runtime/utils#bun-inspect',
    description: 'Serializes an object to a string exactly as it would be printed by console.log',
    related: ['runtime/console', 'reference/bun/BunInspectOptions'],
    relatedTokens: ['Bun.inspect.custom', 'Bun.inspect.table', 'BunInspectOptions'],
  },
  {
    term: 'Bun.inspect.custom',
    path: 'runtime/utils#bun-inspect-custom',
    description:
      'The symbol Bun uses to implement Bun.inspect. Override it to customize how your objects are printed. It is identical to util.inspect.custom in Node.js.',
    related: ['runtime/utils#bun-inspect'],
    relatedTokens: ['Bun.inspect', 'Bun.inspect.table', 'BunInspectOptions'],
  },
  {
    term: 'Bun.inspect.table',
    path: 'runtime/utils#bun-inspect-table-tabulardata-properties-options',
    description:
      'Bun.inspect.table(tabularData, properties, options) — format tabular data into a string (like console.table, returns a string)',
    related: ['runtime/utils#bun-inspect'],
    relatedTokens: ['Bun.inspect', 'Bun.inspect.custom', 'BunInspectOptions'],
  },
  {
    term: 'Bun.inspect.table(tabularData, properties, options)',
    path: 'runtime/utils#bun-inspect-table-tabulardata-properties-options',
    description:
      'Format tabular data into a string. Like console.table, except it returns a string rather than printing to the console.',
    related: ['runtime/utils#bun-inspect'],
    relatedTokens: ['Bun.inspect', 'Bun.inspect.custom', 'BunInspectOptions'],
  },
  {
    term: 'BunInspectOptions',
    path: 'reference/bun/BunInspectOptions',
    description:
      'Options for Bun.inspect — colors, depth, sorted, compact (Node util.inspect extras are ignored)',
    related: ['runtime/utils#bun-inspect', 'runtime/console'],
    relatedTokens: ['Bun.inspect', 'Bun.inspect.custom', 'Bun.inspect.table', '--console-depth'],
  },
  // Env: Bun.env ≡ process.env (guide: guides/runtime/read-env). Prefer utils#bun-env over changelog dump.
  {
    term: 'Bun.env',
    path: 'runtime/utils',
    description: 'Alias of process.env — current environment variables',
    related: ['runtime/environment-variables', 'guides/runtime/read-env'],
  },
  {
    term: 'process.env',
    path: 'runtime/utils',
    description: 'Current environment variables (Bun.env is an alias)',
    related: ['runtime/environment-variables', 'guides/runtime/read-env'],
  },
  {
    term: '.env',
    path: 'runtime/environment-variables',
    description:
      'Auto-loaded env files (.env, .env.$NODE_ENV, .env.local) — see also guides/runtime/set-env',
    related: ['guides/runtime/set-env', 'runtime/utils'],
  },
  {
    term: 'TZ',
    path: 'guides/runtime/timezone',
    description:
      'Default process time zone (IANA id); bun test forces UTC — see also test/runtime-behavior#tz-timezone',
    related: ['test/runtime-behavior', 'test/dates-times'],
  },
  {
    term: 'Bun.which',
    path: 'runtime/utils',
    description:
      'Resolve path to an executable on PATH (guide: guides/util/which-path-to-executable-bin)',
    related: ['guides/util/which-path-to-executable-bin'],
  },
  {
    term: 'Bun.pathToFileURL',
    path: 'runtime/utils',
    description: 'Absolute path → file: URL (guide: guides/util/path-to-file-url)',
    related: ['guides/util/path-to-file-url'],
  },
  {
    term: 'Bun.fileURLToPath',
    path: 'runtime/utils',
    description: 'file: URL → absolute path (guide: guides/util/file-url-to-path)',
    related: ['guides/util/file-url-to-path'],
  },
  {
    term: 'import.meta.dir',
    path: 'runtime/module-resolution',
    description: 'Directory of the current module (guide: guides/util/import-meta-dir)',
    related: ['guides/util/import-meta-dir'],
  },
  {
    term: '.npmrc',
    path: 'pm/npmrc',
    description: 'npm-compatible .npmrc options Bun reads for install',
    related: ['runtime/bunfig', 'pm/scopes-registries'],
  },
];

const byTerm = new Map<string, CuratedEntry>();
for (const entry of CURATED_ENTRIES) {
  byTerm.set(entry.term.toLowerCase(), entry);
}

/** Absolute bun.com URL for a curated `path` (docs/ · blog/ · reference/). */
export function curatedEntryUrl(pathWithOptionalHash: string): string {
  const [page = '', hash] = pathWithOptionalHash.split('#');
  if (page.startsWith('blog/')) {
    return bunBlog(page.slice('blog/'.length), hash);
  }
  if (page.startsWith('reference/')) {
    return bunReference(page.slice('reference/'.length), hash);
  }
  return bunDocs(page, hash);
}

export function getCuratedEntry(term: string): (CuratedEntry & { url: string }) | null {
  const entry = byTerm.get(term.toLowerCase());
  if (!entry) return null;
  return { ...entry, url: curatedEntryUrl(entry.path) };
}

export function searchCuratedEntries(
  query: string,
  limit = 10
): (CuratedEntry & { url: string })[] {
  const q = query.toLowerCase();
  const hits = CURATED_ENTRIES.filter(
    e =>
      e.term.toLowerCase().includes(q) ||
      e.path.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q)
  ).slice(0, limit);
  return hits.map(e => ({ ...e, url: curatedEntryUrl(e.path) }));
}
