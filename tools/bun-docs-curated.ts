// tools/bun-docs-curated.ts — Hot-path Bun doc entries (1.3.14+ aware)

export type CuratedEntry = {
  term: string;
  path: string;
  description: string;
  minVersion?: string;
  stability?: 'stable' | 'experimental';
  related?: string[];
};

export const CURATED_ENTRIES: CuratedEntry[] = [
  { term: 'Bun.Image', path: 'runtime/image', description: 'Built-in image decode/resize/encode pipeline', minVersion: '1.3.14', related: ['runtime/file-io', 'runtime/s3'] },
  { term: 'Bun.serve', path: 'runtime/http/server', description: 'HTTP server with routes, TLS, WebSockets, HTTP/3', related: ['runtime/http/websockets', 'runtime/http/tls'] },
  { term: 'http3', path: 'runtime/http/server', description: 'Experimental HTTP/3 (QUIC) in Bun.serve', minVersion: '1.3.14', stability: 'experimental' },
  { term: 'fetch', path: 'runtime/network/fetch', description: 'fetch() client with HTTP/2 and HTTP/3 options', minVersion: '1.3.14', stability: 'experimental', related: ['runtime/http/server'] },
  { term: 'globalStore', path: 'pm/global-store', description: 'Shared global virtual store for isolated installs', minVersion: '1.3.14' },
  { term: 'bun install', path: 'pm/cli/install', description: 'Package manager install with hoisted/isolated linkers' },
  { term: 'Bun.SQL', path: 'runtime/sql', description: 'Postgres and MySQL client with connection pooling' },
  { term: 'bun:sqlite', path: 'runtime/sqlite', description: 'Built-in SQLite driver (v3.53.0 in 1.3.14)' },
  { term: 'Bun.spawn', path: 'runtime/child-process', description: 'Spawn subprocesses with pipes and terminals' },
  { term: 'Bun.$', path: 'runtime/shell', description: 'Shell template tag for running commands' },
  { term: 'Bun.file', path: 'runtime/file-io', description: 'Lazy file I/O API' },
  { term: 'Bun.s3', path: 'runtime/s3', description: 'S3-compatible object storage client' },
  { term: 'Bun.secrets', path: 'runtime/secrets', description: 'OS keychain-backed secrets API' },
  { term: 'Bun.password', path: 'runtime/hashing', description: 'Argon2/bcrypt password hashing' },
  { term: 'Bun.build', path: 'bundler', description: 'Bundler and compile-to-binary' },
  { term: 'bun test', path: 'test', description: 'Built-in test runner (bun:test)' },
  { term: 'Bun.Terminal', path: 'runtime/terminal', description: 'PTY terminal for spawned processes (Windows ConPTY in 1.3.14)' },
  { term: 'Bun.cron', path: 'runtime/cron', description: 'In-process cron scheduling' },
  { term: 'Bun.WebView', path: 'runtime/webview', description: 'Headless browser automation' },
  { term: 'Bun.markdown', path: 'runtime/markdown', description: 'Native Markdown rendering' },
  { term: 'noOrphans', path: 'runtime/bunfig', description: 'Exit when parent dies (--no-orphans)', minVersion: '1.3.14' },
  { term: 'process.execve', path: 'runtime/node-api', description: 'Replace process image in-place', minVersion: '1.3.14' },
  { term: 'fs.watch', path: 'runtime/file-io', description: 'File watcher (rewritten backend in 1.3.14)' },
  { term: 'bun publish', path: 'pm/cli/publish', description: 'Publish packages to npm registry' },
  { term: 'workspaces', path: 'pm/workspaces', description: 'Monorepo workspace support' },
  { term: 'Bun.Transpiler', path: 'runtime/transpiler', description: 'JS/TS/JSX transpiler API' },
  { term: 'HTMLRewriter', path: 'runtime/html-rewriter', description: 'Streaming HTML transformation' },
  { term: 'WebSocket', path: 'runtime/http/websockets', description: 'WebSocket server and client' },
  { term: 'Bun.redis', path: 'runtime/redis', description: 'Redis/Valkey client' },
  { term: 'ffi', path: 'runtime/ffi', description: 'Call native libraries from JavaScript' },
];

const byTerm = new Map<string, CuratedEntry>();
for (const entry of CURATED_ENTRIES) {
  byTerm.set(entry.term.toLowerCase(), entry);
}

export function getCuratedEntry(term: string): (CuratedEntry & { url: string }) | null {
  const entry = byTerm.get(term.toLowerCase());
  if (!entry) return null;
  return { ...entry, url: `https://bun.com/docs/${entry.path}` };
}

export function searchCuratedEntries(query: string, limit = 10): (CuratedEntry & { url: string })[] {
  const q = query.toLowerCase();
  const hits = CURATED_ENTRIES.filter(
    e =>
      e.term.toLowerCase().includes(q) ||
      e.path.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q)
  ).slice(0, limit);
  return hits.map(e => ({ ...e, url: `https://bun.com/docs/${e.path}` }));
}
