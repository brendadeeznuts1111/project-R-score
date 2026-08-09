// @see https://bun.com/reference/bun/TerminalOptions — Bun.TerminalOptions
// @see https://bun.com/reference/bun/sliceAnsi — Bun.sliceAnsi
// @see https://bun.com/reference/bun/SQL — Bun.SQL
// @see https://bun.com/reference/bun/Transpiler — Bun.Transpiler
// @see https://bun.com/blog/bun-v1.3.14#no-orphans — --no-orphans
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
// @see https://bun.com/docs/runtime/markdown#autolinks — autolinks
// @see https://bun.com/docs/runtime/markdown#heading-ids — heading-ids
// @see https://bun.com/docs/runtime/markdown#callback-signature — callback-signature
// @see https://bun.com/docs/runtime/markdown#block-callbacks — block-callbacks
// @see https://bun.com/docs/runtime/markdown#list-item-meta — list-item-meta
// @see https://bun.com/docs/runtime/markdown#inline-callbacks — inline-callbacks
// @see https://bun.com/docs/runtime/markdown#examples — examples (render cookbook parent)
// @see https://bun.com/docs/runtime/markdown#custom-html-with-classes — custom-html-with-classes
// @see https://bun.com/docs/runtime/markdown#stripping-all-formatting — stripping-all-formatting
// @see https://bun.com/docs/runtime/markdown#code-block-syntax-highlighting — code-block-syntax-highlighting
// @see https://bun.com/docs/runtime/markdown#nested-list-numbering — nested-list-numbering
// @see https://bun.com/docs/runtime/markdown#server-side-rendering — server-side-rendering
// @see https://bun.com/docs/runtime/markdown#parser-options — parser-options
// @see https://bun.com/docs/runtime/markdown#parser-options-2 — parser-options-2
// @see https://bun.com/docs/runtime/markdown#react-18-and-older — reactVersion: 18
// @see https://bun.com/docs/bundler/executables#runtime-arguments-via-bun-options — BUN_OPTIONS
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
      'Native sync hasher (sha256, sha3-256, …). FactoryWager audit SSOT fingerprints evidence with sha3-256 (see AuditConcept sha3-integrity).',
    relatedTokens: ['sha3-256', 'SHA3-256', 'Bun.password'],
    auditRefs: ['sha3-integrity'],
  },
  {
    term: 'SHA3',
    path: 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
    description:
      'v1.3.13: SHA3-224/256/384/512 in node:crypto + WebCrypto (createHash/createHmac/subtle.digest). Also Bun.CryptoHasher("sha3-256"). Audit SSOT uses sha3-256 via evidence.algorithm + evidence.digest (AuditConcept sha3-integrity).',
    minVersion: '1.3.13',
    relatedTokens: [
      'sha3-256',
      'SHA3-256',
      'Bun.CryptoHasher',
      'crypto.createHash("sha3-256")',
      'crypto.subtle.digest("SHA3-256")',
    ],
    auditRefs: ['sha3-integrity'],
  },
  {
    term: 'SHA-3',
    path: 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
    description: 'Alias for SHA3 (FIPS 202) ship note on bun-v1.3.13.',
    minVersion: '1.3.13',
    relatedTokens: ['SHA3', 'sha3-256'],
    auditRefs: ['sha3-integrity'],
  },
  {
    term: 'sha3-256',
    path: 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
    description:
      'node:crypto createHash("sha3-256") / Bun.CryptoHasher("sha3-256"). WebCrypto id is SHA3-256 (uppercase).',
    minVersion: '1.3.13',
    relatedTokens: ['SHA3-256', 'SHA3', 'Bun.CryptoHasher', 'sha3-512'],
    auditRefs: ['sha3-integrity'],
  },
  {
    term: 'SHA3-256',
    path: 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
    description: 'WebCrypto subtle.digest("SHA3-256", …). node:crypto / CryptoHasher use sha3-256.',
    minVersion: '1.3.13',
    relatedTokens: ['sha3-256', 'SHA3', 'Bun.CryptoHasher'],
    auditRefs: ['sha3-integrity'],
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
    auditRefs: ['sha3-integrity'],
  },
  {
    term: 'crypto.subtle.digest("SHA3-256")',
    path: 'blog/bun-v1.3.13#sha3-support-in-webcrypto-and-node-crypto',
    description: 'WebCrypto SHA-3 digest (HMAC via subtle.sign/verify).',
    minVersion: '1.3.13',
    relatedTokens: ['SHA3-256', 'SHA3', 'crypto.createHash("sha3-256")'],
    auditRefs: ['sha3-integrity'],
  },
  { term: 'Bun.build', path: 'bundler', description: 'Bundler and compile-to-binary' },
  { term: 'bun test', path: 'test', description: 'Built-in test runner (bun:test)' },
  {
    term: '--isolate',
    path: 'test/parallel#isolate',
    description:
      'bun test: run each test file in a fresh global environment within the same process (drain microtasks, close sockets, cancel timers, kill subprocesses). VM transpilation cache keeps shared deps parsed once.',
    minVersion: '1.3.13',
    relatedTokens: ['--parallel', '--changed', '--shard', 'bun test --isolate'],
    auditRefs: ['harness-day-loop'],
  },
  {
    term: 'bun test --isolate',
    path: 'test/parallel#isolate',
    description:
      'bun test: run each test file in a fresh global environment within the same process. Shared deps reuse a VM-level transpilation cache. Implied by --parallel workers.',
    minVersion: '1.3.13',
    relatedTokens: ['--isolate', '--parallel', 'bun test --parallel'],
    auditRefs: ['harness-day-loop'],
  },
  {
    term: '--parallel',
    path: 'test/parallel#parallel',
    description:
      'bun test --parallel[=N]: distribute test files across up to N worker processes (default CPU count). Workers auto --isolate; console buffered per file. ≠ bun run --parallel (Foreman scripts — pm/filter#parallel-and-sequential-mode). FactoryWager NOTE: docs/guides/bun-test-flags-1.3.13.md',
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
    auditRefs: ['harness-day-loop'],
  },
  {
    term: 'bun test --parallel',
    path: 'test/parallel#parallel',
    description:
      'Parallel workers for test files (work-stealing queue, atomic per-file console flush). Sets JEST_WORKER_ID and BUN_TEST_WORKER_ID. Callout: ≠ bun run --parallel — that is workspace Foreman mode at pm/filter#parallel-and-sequential-mode.',
    minVersion: '1.3.13',
    relatedTokens: [
      '--isolate',
      '--shard',
      '--changed',
      'bun run --parallel',
      'JEST_WORKER_ID',
      'BUN_TEST_WORKER_ID',
    ],
    auditRefs: ['harness-day-loop'],
  },
  {
    term: 'bun test flags',
    path: 'test/parallel#parallel',
    description:
      'v1.3.13 NOTE family: --isolate, --parallel, --shard, --changed. Scannable TOC + fences: docs/guides/bun-test-flags-1.3.13.md. Day-loop wrappers: docs/harness/day-loop.md.',
    minVersion: '1.3.13',
    relatedTokens: ['--isolate', '--parallel', '--shard', '--changed', 'bun run --parallel'],
    auditRefs: ['harness-day-loop'],
  },
  {
    term: '--shard',
    path: 'test/parallel#one-timings-file-per-shard',
    description:
      'bun test --shard=M/N: split test files across CI jobs (1-based, round-robin by sorted path). Empty shards exit 0. Composes with --changed and --randomize.',
    minVersion: '1.3.13',
    relatedTokens: ['--shard=M/N', '--parallel', '--changed', '--randomize', '--isolate'],
    auditRefs: ['harness-day-loop'],
  },
  {
    term: '--shard=M/N',
    path: 'test/parallel#one-timings-file-per-shard',
    description:
      'Split bun test files across CI runners (Jest/Vitest/Playwright syntax). Index is 1-based; invalid inputs like 0/3 exit non-zero.',
    minVersion: '1.3.13',
    relatedTokens: ['--shard', '--parallel', '--changed', '--randomize'],
    auditRefs: ['harness-day-loop'],
  },
  {
    term: 'bun test --shard',
    path: 'test/parallel#one-timings-file-per-shard',
    description:
      'Split bun test files across CI jobs with --shard=M/N (sorted paths, round-robin).',
    minVersion: '1.3.13',
    relatedTokens: ['--shard', '--parallel', '--changed', '--randomize'],
    auditRefs: ['harness-day-loop'],
  },
  {
    term: '--changed',
    path: 'blog/bun-v1.3.13#bun-test-changed',
    description:
      'bun test --changed[=ref]: run only test files whose import graph transitively depends on git-changed files (unstaged+staged+untracked, or since a commit/branch). Combines with --watch.',
    minVersion: '1.3.13',
    relatedTokens: ['bun test --changed', '--shard', 'bun test --watch', '--parallel', '--isolate'],
    auditRefs: ['harness-day-loop'],
  },
  {
    term: 'bun test --changed',
    path: 'blog/bun-v1.3.13#bun-test-changed',
    description:
      'Run only tests affected by git changes via import-graph analysis (skips node_modules). Empty set exits cleanly; with --watch keeps the process alive.',
    minVersion: '1.3.13',
    relatedTokens: ['--changed', '--shard', 'bun test --watch', '--parallel'],
    auditRefs: ['harness-day-loop'],
  },
  {
    term: 'bun run --parallel',
    // Shipped 1.3.9 — https://bun.com/blog/bun-v1.3.9#bun-run-parallel-and-bun-run-sequential
    path: 'pm/filter#parallel-and-sequential-mode',
    description:
      'bun run --parallel: Foreman-style parallel package.json scripts (prefixed output, --filter/--workspaces). Canonical: pm/filter#parallel-and-sequential-mode. ≠ bun test --parallel (test-file workers; blog v1.3.13).',
    minVersion: '1.3.9',
    relatedTokens: ['bun test --parallel', '--parallel'],
  },
  {
    term: '--parallel=N',
    path: 'test/parallel#parallel',
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
    // Guide locus (not /docs/runtime/terminal — that path 404s). Reference: bun.com/reference/bun/Terminal
    path: 'runtime/child-process#terminal-pty-support',
    // Shipped 1.3.5 (POSIX PTY); Windows ConPTY later (1.3.14 notes)
    // https://bun.com/blog/bun-v1.3.5#bun-terminal-api-for-pseudo-terminal-pty-support
    description:
      'PTY for spawned processes (new Bun.Terminal + spawn terminal); types → reference/bun/Terminal',
    minVersion: '1.3.5',
    relatedTokens: ['Bun.spawn terminal (PTY)', 'Bun.TerminalOptions'],
  },
  {
    term: 'Bun.cron',
    path: 'runtime/cron',
    // Prefer deep links: #bun-cron-schedule-handler-—-in-process · #no-overlap-guarantee
    // (bare #cron is not a section id on the page)
    description: 'In-process cron scheduling (UTC; no-overlap after handler settles)',
    minVersion: '1.3.12',
  },
  {
    term: 'Bun.WebView',
    path: 'runtime/webview',
    description: 'Headless browser automation',
    minVersion: '1.3.12',
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
    related: [
      'runtime/markdown#options',
      'runtime/markdown#autolinks',
      'runtime/markdown#heading-ids',
    ],
    relatedTokens: [
      'options',
      'autolinks',
      'heading-ids',
      'Bun.markdown',
      'Bun.markdown.render',
      'Bun.markdown.react',
    ],
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
    related: [
      'runtime/markdown#parser-options',
      'runtime/markdown#options',
      'runtime/markdown#callback-signature',
      'runtime/markdown#block-callbacks',
      'runtime/markdown#list-item-meta',
      'runtime/markdown#inline-callbacks',
      'runtime/markdown#examples',
    ],
    relatedTokens: [
      'callback-signature',
      'block-callbacks',
      'parser-options',
      'list-item-meta',
      'inline-callbacks',
      'examples',
      'custom-html-with-classes',
      'stripping-all-formatting',
      'code-block-syntax-highlighting',
      'options',
      'autolinks',
      'heading-ids',
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
      'runtime/markdown#server-side-rendering',
      'runtime/markdown#parser-options-2',
      'runtime/markdown#options',
      'runtime/markdown#react-18-and-older',
    ],
    relatedTokens: [
      'component-overrides',
      'available-overrides',
      'server-side-rendering',
      'parser-options-2',
      'options',
      'react-18-and-older',
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
      'autolinks',
      'heading-ids',
      'parser-options',
      'parser-options-2',
      'Bun.markdown.html',
      'Bun.markdown.render',
      'Bun.markdown.react',
    ],
  },
  {
    term: 'autolinks',
    path: 'runtime/markdown#autolinks',
    description:
      'Pass true to enable all autolink types (URL, WWW, email), or an object for granular control ({ url, www, email }).',
    minVersion: '1.3.0',
    relatedTokens: ['options', 'heading-ids', 'Bun.markdown.html', 'parser-options'],
  },
  {
    term: 'heading-ids',
    path: 'runtime/markdown#heading-ids',
    description:
      'Pass true for heading IDs + autolink headings, or { ids: true } for IDs only (no autolink wrap).',
    minVersion: '1.3.0',
    relatedTokens: ['options', 'autolinks', 'Bun.markdown.html', 'parser-options-2'],
  },
  {
    term: 'callback-signature',
    path: 'runtime/markdown#callback-signature',
    description:
      'Bun.markdown.render callbacks receive children (string) and optional meta; return string to replace, null/undefined to omit; unregistered → children pass through.',
    minVersion: '1.3.0',
    relatedTokens: [
      'block-callbacks',
      'list-item-meta',
      'inline-callbacks',
      'Bun.markdown.render',
      'omitting-elements',
    ],
  },
  {
    term: 'block-callbacks',
    path: 'runtime/markdown#block-callbacks',
    description:
      'Bun.markdown.render block callbacks: heading, paragraph, blockquote, code, list, listItem, hr, table/thead/tbody/tr/th/td, html.',
    minVersion: '1.3.0',
    relatedTokens: [
      'callback-signature',
      'list-item-meta',
      'inline-callbacks',
      'Bun.markdown.render',
    ],
  },
  {
    term: 'list-item-meta',
    path: 'runtime/markdown#list-item-meta',
    description:
      'listItem callback meta: index (0-based), depth, ordered, start? (ordered lists), checked? (task lists).',
    minVersion: '1.3.0',
    relatedTokens: [
      'callback-signature',
      'nested-list-numbering',
      'inline-callbacks',
      'Bun.markdown.render',
      'parser-options',
    ],
  },
  {
    term: 'inline-callbacks',
    path: 'runtime/markdown#inline-callbacks',
    description:
      'Bun.markdown.render inline callbacks: strong, emphasis, link, image, codespan, strikethrough, text.',
    minVersion: '1.3.0',
    relatedTokens: [
      'callback-signature',
      'list-item-meta',
      'Bun.markdown.render',
      'parser-options',
    ],
  },
  {
    term: 'examples',
    path: 'runtime/markdown#examples',
    description:
      'Bun.markdown.render cookbook under #examples: custom HTML classes, strip formatting, omit elements, ANSI via callbacks, nested list numbering, code language meta.',
    minVersion: '1.3.0',
    related: [
      'runtime/markdown#custom-html-with-classes',
      'runtime/markdown#stripping-all-formatting',
      'runtime/markdown#omitting-elements',
      'runtime/markdown#ansi-terminal-output',
      'runtime/markdown#nested-list-numbering',
      'runtime/markdown#code-block-syntax-highlighting',
    ],
    relatedTokens: [
      'custom-html-with-classes',
      'stripping-all-formatting',
      'code-block-syntax-highlighting',
      'nested-list-numbering',
      'omitting-elements',
      'Bun.markdown.render',
      'callback-signature',
    ],
  },
  {
    term: 'custom-html-with-classes',
    path: 'runtime/markdown#custom-html-with-classes',
    description:
      'Bun.markdown.render cookbook: emit HTML with custom class names from heading/paragraph/strong callbacks.',
    minVersion: '1.3.0',
    relatedTokens: [
      'examples',
      'stripping-all-formatting',
      'code-block-syntax-highlighting',
      'Bun.markdown.render',
      'callback-signature',
    ],
  },
  {
    term: 'stripping-all-formatting',
    path: 'runtime/markdown#stripping-all-formatting',
    description:
      'Bun.markdown.render cookbook: return children unchanged from callbacks to strip markup to plaintext.',
    minVersion: '1.3.0',
    relatedTokens: [
      'examples',
      'custom-html-with-classes',
      'omitting-elements',
      'Bun.markdown.render',
      'callback-signature',
    ],
  },
  {
    term: 'code-block-syntax-highlighting',
    path: 'runtime/markdown#code-block-syntax-highlighting',
    description:
      'Bun.markdown.render cookbook: use code callback meta.language for language-* class highlighting wrappers.',
    minVersion: '1.3.0',
    relatedTokens: [
      'examples',
      'custom-html-with-classes',
      'block-callbacks',
      'Bun.markdown.render',
    ],
  },
  {
    term: 'nested-list-numbering',
    path: 'runtime/markdown#nested-list-numbering',
    description:
      'Render nested ordered lists with listItem meta (index/depth/ordered/start) — no post-processing.',
    minVersion: '1.3.0',
    relatedTokens: ['list-item-meta', 'Bun.markdown.render', 'examples'],
  },
  {
    term: 'omitting-elements',
    path: 'runtime/markdown#omitting-elements',
    description:
      'Return null or undefined from a Bun.markdown.render callback to remove that element from the output.',
    minVersion: '1.3.0',
    relatedTokens: ['callback-signature', 'Bun.markdown.render'],
  },
  {
    term: 'parser-options',
    path: 'runtime/markdown#parser-options',
    description:
      'Pass parser options as a separate third argument to Bun.markdown.render (same option set as #options).',
    minVersion: '1.3.0',
    relatedTokens: ['options', 'autolinks', 'parser-options-2', 'Bun.markdown.render'],
  },
  {
    term: 'parser-options-2',
    path: 'runtime/markdown#parser-options-2',
    description:
      'Pass any of the parser options (#options) as the third argument to Bun.markdown.react. Live Bun docs slug is #parser-options-2 (duplicate “Parser options” heading under react).',
    minVersion: '1.3.8',
    relatedTokens: ['options', 'heading-ids', 'parser-options', 'Bun.markdown.react'],
  },
  {
    term: 'server-side-rendering',
    path: 'runtime/markdown#server-side-rendering',
    description:
      'Bun.markdown.react works with renderToString() and React Server Components. On React 18, pass reactVersion: 18 (see react-18-and-older).',
    minVersion: '1.3.8',
    relatedTokens: ['Bun.markdown.react', 'react-18-and-older', 'component-overrides'],
  },
  {
    term: 'react-18-and-older',
    path: 'runtime/markdown#react-18-and-older',
    description:
      'Default Bun.markdown.react uses Symbol.for("react.transitional.element"). Pass reactVersion: 18 as the third argument for React 18/older (Symbol.for("react.element")). Options must be the 3rd arg — not the components slot.',
    minVersion: '1.3.8',
    relatedTokens: ['Bun.markdown.react', 'server-side-rendering', 'parser-options-2'],
  },
  {
    term: 'BUN_OPTIONS',
    path: 'bundler/executables#runtime-arguments-via-bun-options',
    description:
      'Standalone executables read the BUN_OPTIONS environment variable, so you can pass runtime flags without recompiling.',
    related: [
      'bundler/executables#embedding-runtime-arguments',
      'runtime/environment-variables#configuring-bun',
    ],
    relatedTokens: [
      'runtime-arguments-via-bun-options',
      'embedding-runtime-arguments',
      '--compile-exec-argv',
    ],
  },
  {
    term: 'runtime-arguments-via-bun-options',
    path: 'bundler/executables#runtime-arguments-via-bun-options',
    description:
      'Standalone executables read the BUN_OPTIONS environment variable, so you can pass runtime flags without recompiling.',
    relatedTokens: ['BUN_OPTIONS', 'embedding-runtime-arguments', '--compile-exec-argv'],
  },
  {
    term: 'embedding-runtime-arguments',
    path: 'bundler/executables#embedding-runtime-arguments',
    description:
      'Embed runtime arguments with --compile-exec-argv / compile.execArgv, available at runtime in process.execArgv.',
    relatedTokens: ['--compile-exec-argv', 'BUN_OPTIONS', 'runtime-arguments-via-bun-options'],
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
  // Inspection family completion: bunfig depth key + inspect options + ANSI utils.
  // Without curated entries these fall back to page-peer `related` noise
  // (console.depth was previously grouped with test-runner flags).
  {
    term: 'console.depth',
    path: 'runtime/console#object-inspection-depth',
    description:
      'bunfig.toml [console] depth — persistent object-inspection depth for console.log (default 2; --console-depth flag overrides)',
    related: ['runtime/console'],
    relatedTokens: ['--console-depth', 'Bun.inspect', 'BunInspectOptions'],
  },
  {
    term: 'Bun.inspect.sorted',
    path: 'reference/bun/BunInspectOptions',
    description:
      'Bun.inspect option — sort object keys alphabetically, recursively (deterministic output for snapshots/diffs)',
    related: ['runtime/utils#bun-inspect'],
    relatedTokens: ['Bun.inspect', 'Bun.inspect.compact', 'BunInspectOptions'],
  },
  {
    term: 'Bun.inspect.compact',
    path: 'reference/bun/BunInspectOptions',
    description: 'Bun.inspect option — single-line output for hot paths / watch loops',
    related: ['runtime/utils#bun-inspect'],
    relatedTokens: ['Bun.inspect', 'Bun.inspect.sorted', 'BunInspectOptions'],
  },
  {
    term: 'Bun.stringWidth',
    path: 'runtime/utils#bun-stringwidth',
    description:
      'Column count of a string as displayed in a terminal (ANSI-aware, emoji/wide chars; ~6,756x faster than string-width)',
    related: ['runtime/utils'],
    relatedTokens: ['Bun.sliceAnsi', 'Bun.stripANSI', 'Bun.wrapAnsi'],
  },
  {
    term: 'Bun.stripANSI',
    path: 'runtime/utils#bun-stripansi',
    description: 'Remove ANSI escape codes from a string',
    related: ['runtime/utils'],
    relatedTokens: ['Bun.stringWidth', 'Bun.wrapAnsi', 'Bun.sliceAnsi'],
  },
  {
    term: 'Bun.wrapAnsi',
    path: 'runtime/utils#bun-wrapansi',
    description:
      'Word-wrap text to a column width, ANSI- and grapheme-safe (styles closed and re-opened per row)',
    related: ['runtime/utils'],
    relatedTokens: ['Bun.stringWidth', 'Bun.stripANSI', 'Bun.sliceAnsi'],
  },
  {
    term: 'Bun.sliceAnsi',
    path: 'reference/bun/sliceAnsi',
    description:
      'Slice a string by visual column range without breaking ANSI codes or graphemes — truncation primitive',
    minVersion: '1.3.11',
    related: ['runtime/utils#bun-stringwidth'],
    relatedTokens: ['Bun.stringWidth', 'Bun.stripANSI', 'Bun.wrapAnsi'],
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
