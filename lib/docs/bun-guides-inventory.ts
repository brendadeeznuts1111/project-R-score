// @see https://bun.com/docs/runtime#transpilation-language-features — --define
// @updated --define · fixed v1.1.5 · 2024-04-26 · https://bun.com/blog/bun-v1.1.5
// @updated --define · fixed v1.1.6 · 2024-04-28 · https://bun.com/blog/bun-v1.1.6
// @updated --define · changed v1.3.13 · 2026-04-20 · https://bun.com/blog/bun-v1.3.13
// @verified --define · Bun v1.3.14 · 2026-08-06 · https://bun.com/docs/runtime#transpilation-language-features
/**
 * Bun Guides inventory (from https://bun.com/docs/guides / guides.md).
 * Used by tools/bun-guides-gap.ts to report monorepo doc coverage.
 *
 * @see https://bun.com/docs/guides/index
 * @see docs/BUN_NATIVE_CAPABILITIES.md
 */

export type GuideCluster =
  | 'deployment'
  | 'binary'
  | 'ecosystem'
  | 'html-rewriter'
  | 'http'
  | 'install'
  | 'process'
  | 'read-file'
  | 'runtime'
  | 'streams'
  | 'test'
  | 'util'
  | 'websocket'
  | 'write-file';

export type GuidePriority = 'spine' | 'useful' | 'optional' | 'out-of-scope';

export type BunGuide = {
  /** Path under /docs/guides/ e.g. install/add */
  path: string;
  cluster: GuideCluster;
  title: string;
  /** FactoryWager priority for operators/agents */
  priority: GuidePriority;
};

/** Full guide list as of Bun docs guides.md (2026-08). */
export const BUN_GUIDES: readonly BunGuide[] = [
  // install — package manager (spine for monorepo)
  { path: 'install/add', cluster: 'install', title: 'Add a dependency', priority: 'spine' },
  {
    path: 'install/add-dev',
    cluster: 'install',
    title: 'Add a development dependency',
    priority: 'spine',
  },
  {
    path: 'install/add-optional',
    cluster: 'install',
    title: 'Add an optional dependency',
    priority: 'useful',
  },
  {
    path: 'install/add-peer',
    cluster: 'install',
    title: 'Add a peer dependency',
    priority: 'useful',
  },
  {
    path: 'install/add-git',
    cluster: 'install',
    title: 'Add a Git dependency',
    priority: 'useful',
  },
  {
    path: 'install/add-tarball',
    cluster: 'install',
    title: 'Add a tarball dependency',
    priority: 'useful',
  },
  {
    path: 'install/trusted',
    cluster: 'install',
    title: 'Add a trusted dependency',
    priority: 'spine',
  },
  {
    path: 'install/workspaces',
    cluster: 'install',
    title: 'Configuring a monorepo using workspaces',
    priority: 'spine',
  },
  {
    path: 'install/registry-scope',
    cluster: 'install',
    title: 'Private registry for an organization scope',
    priority: 'spine',
  },
  {
    path: 'install/custom-registry',
    cluster: 'install',
    title: 'Override default npm registry',
    priority: 'useful',
  },
  {
    path: 'install/cicd',
    cluster: 'install',
    title: 'Install dependencies with Bun in GitHub Actions',
    priority: 'useful',
  },
  {
    path: 'install/from-npm-install-to-bun-install',
    cluster: 'install',
    title: 'Migrate from npm install',
    priority: 'useful',
  },
  {
    path: 'install/npm-alias',
    cluster: 'install',
    title: 'Install under a different name',
    priority: 'optional',
  },
  {
    path: 'install/yarnlock',
    cluster: 'install',
    title: 'Generate yarn-compatible lockfile',
    priority: 'optional',
  },
  {
    path: 'install/git-diff-bun-lockfile',
    cluster: 'install',
    title: 'git diff for lockb',
    priority: 'optional',
  },
  {
    path: 'install/jfrog-artifactory',
    cluster: 'install',
    title: 'Artifactory',
    priority: 'out-of-scope',
  },
  {
    path: 'install/azure-artifacts',
    cluster: 'install',
    title: 'Azure Artifacts',
    priority: 'out-of-scope',
  },

  // process
  { path: 'process/spawn', cluster: 'process', title: 'Spawn a child process', priority: 'spine' },
  {
    path: 'process/argv',
    cluster: 'process',
    title: 'Parse command-line arguments',
    priority: 'spine',
  },
  {
    path: 'process/spawn-stdout',
    cluster: 'process',
    title: 'Read stdout from a child process',
    priority: 'spine',
  },
  {
    path: 'process/spawn-stderr',
    cluster: 'process',
    title: 'Read stderr from a child process',
    priority: 'spine',
  },
  { path: 'process/stdin', cluster: 'process', title: 'Read from stdin', priority: 'useful' },
  { path: 'process/ctrl-c', cluster: 'process', title: 'Listen for CTRL+C', priority: 'useful' },
  {
    path: 'process/os-signals',
    cluster: 'process',
    title: 'Listen to OS signals',
    priority: 'useful',
  },
  {
    path: 'process/ipc',
    cluster: 'process',
    title: 'IPC with child process',
    priority: 'optional',
  },
  {
    path: 'process/nanoseconds',
    cluster: 'process',
    title: 'Process uptime nanoseconds',
    priority: 'optional',
  },

  // runtime (env + common)
  {
    path: 'runtime/read-env',
    cluster: 'runtime',
    title: 'Read environment variables',
    priority: 'spine',
  },
  {
    path: 'runtime/set-env',
    cluster: 'runtime',
    title: 'Set environment variables',
    priority: 'spine',
  },
  {
    path: 'runtime/import-toml',
    cluster: 'runtime',
    title: 'Import a TOML file',
    priority: 'spine',
  },
  {
    path: 'runtime/import-json',
    cluster: 'runtime',
    title: 'Import a JSON file',
    priority: 'useful',
  },
  {
    path: 'runtime/import-yaml',
    cluster: 'runtime',
    title: 'Import a YAML file',
    priority: 'useful',
  },
  {
    path: 'runtime/typescript',
    cluster: 'runtime',
    title: 'Install TypeScript declarations for Bun',
    priority: 'spine',
  },
  { path: 'runtime/shell', cluster: 'runtime', title: 'Run a Shell Command', priority: 'useful' },
  { path: 'runtime/delete-file', cluster: 'runtime', title: 'Delete files', priority: 'useful' },
  {
    path: 'runtime/delete-directory',
    cluster: 'runtime',
    title: 'Delete directories',
    priority: 'useful',
  },
  {
    path: 'runtime/tsconfig-paths',
    cluster: 'runtime',
    title: 'Re-map import paths',
    priority: 'useful',
  },
  {
    path: 'runtime/define-constant',
    cluster: 'runtime',
    title: 'Define static globals',
    priority: 'useful',
  },
  {
    path: 'runtime/build-time-constants',
    cluster: 'runtime',
    title: 'Build-time constants with --define',
    priority: 'useful',
  },
  {
    path: 'runtime/cicd',
    cluster: 'runtime',
    title: 'Install and run Bun in GitHub Actions',
    priority: 'useful',
  },
  {
    path: 'runtime/import-html',
    cluster: 'runtime',
    title: 'Import HTML as text',
    priority: 'optional',
  },
  { path: 'runtime/timezone', cluster: 'runtime', title: 'Set a time zone', priority: 'optional' },
  { path: 'runtime/web-debugger', cluster: 'runtime', title: 'Web debugger', priority: 'optional' },
  {
    path: 'runtime/vscode-debugger',
    cluster: 'runtime',
    title: 'VS Code debugger',
    priority: 'optional',
  },
  {
    path: 'runtime/heap-snapshot',
    cluster: 'runtime',
    title: 'V8 heap snapshots',
    priority: 'optional',
  },
  {
    path: 'runtime/codesign-macos-executable',
    cluster: 'runtime',
    title: 'Codesign executable on macOS',
    priority: 'optional',
  },

  // util — mostly covered
  {
    path: 'util/which-path-to-executable-bin',
    cluster: 'util',
    title: 'Path to executable bin',
    priority: 'spine',
  },
  { path: 'util/entrypoint', cluster: 'util', title: 'Check entrypoint', priority: 'spine' },
  { path: 'util/main', cluster: 'util', title: 'Absolute path of entrypoint', priority: 'spine' },
  { path: 'util/version', cluster: 'util', title: 'Bun version', priority: 'spine' },
  { path: 'util/sleep', cluster: 'util', title: 'Sleep', priority: 'spine' },
  { path: 'util/deep-equals', cluster: 'util', title: 'Deep equals', priority: 'spine' },
  { path: 'util/detect-bun', cluster: 'util', title: 'Detect Bun', priority: 'spine' },
  { path: 'util/import-meta-dir', cluster: 'util', title: 'import.meta.dir', priority: 'spine' },
  { path: 'util/import-meta-file', cluster: 'util', title: 'import.meta.file', priority: 'useful' },
  { path: 'util/import-meta-path', cluster: 'util', title: 'import.meta.path', priority: 'spine' },
  { path: 'util/file-url-to-path', cluster: 'util', title: 'file URL to path', priority: 'useful' },
  { path: 'util/path-to-file-url', cluster: 'util', title: 'path to file URL', priority: 'useful' },
  { path: 'util/escape-html', cluster: 'util', title: 'Escape HTML', priority: 'useful' },
  { path: 'util/base64', cluster: 'util', title: 'Base64', priority: 'useful' },
  { path: 'util/gzip', cluster: 'util', title: 'gzip', priority: 'useful' },
  { path: 'util/deflate', cluster: 'util', title: 'deflate', priority: 'useful' },
  { path: 'util/hash-a-password', cluster: 'util', title: 'Hash a password', priority: 'spine' },
  { path: 'util/javascript-uuid', cluster: 'util', title: 'UUID', priority: 'spine' },
  { path: 'util/upgrade', cluster: 'util', title: 'bun upgrade', priority: 'useful' },

  // write-file / read-file — spine subset
  {
    path: 'write-file/basic',
    cluster: 'write-file',
    title: 'Write a string to a file',
    priority: 'spine',
  },
  { path: 'write-file/unlink', cluster: 'write-file', title: 'Delete a file', priority: 'spine' },
  { path: 'write-file/append', cluster: 'write-file', title: 'Append content', priority: 'useful' },
  {
    path: 'write-file/stream',
    cluster: 'write-file',
    title: 'Write ReadableStream',
    priority: 'useful',
  },
  { path: 'write-file/file-cp', cluster: 'write-file', title: 'Copy a file', priority: 'useful' },
  {
    path: 'write-file/stdout',
    cluster: 'write-file',
    title: 'Write to stdout',
    priority: 'optional',
  },
  {
    path: 'write-file/cat',
    cluster: 'write-file',
    title: 'Write a file to stdout',
    priority: 'optional',
  },
  { path: 'write-file/blob', cluster: 'write-file', title: 'Write a Blob', priority: 'optional' },
  {
    path: 'write-file/response',
    cluster: 'write-file',
    title: 'Write a Response',
    priority: 'optional',
  },
  {
    path: 'write-file/filesink',
    cluster: 'write-file',
    title: 'Write incrementally',
    priority: 'optional',
  },
  {
    path: 'read-file/string',
    cluster: 'read-file',
    title: 'Read file as string',
    priority: 'spine',
  },
  { path: 'read-file/json', cluster: 'read-file', title: 'Read a JSON file', priority: 'spine' },
  {
    path: 'read-file/exists',
    cluster: 'read-file',
    title: 'Check if file exists',
    priority: 'spine',
  },
  { path: 'read-file/watch', cluster: 'read-file', title: 'Watch a directory', priority: 'useful' },
  {
    path: 'read-file/stream',
    cluster: 'read-file',
    title: 'Read as ReadableStream',
    priority: 'useful',
  },
  { path: 'read-file/buffer', cluster: 'read-file', title: 'Read to Buffer', priority: 'optional' },
  {
    path: 'read-file/uint8array',
    cluster: 'read-file',
    title: 'Read to Uint8Array',
    priority: 'optional',
  },
  {
    path: 'read-file/arraybuffer',
    cluster: 'read-file',
    title: 'Read to ArrayBuffer',
    priority: 'optional',
  },
  {
    path: 'read-file/mime',
    cluster: 'read-file',
    title: 'MIME type of a file',
    priority: 'optional',
  },

  // test
  { path: 'test/run-tests', cluster: 'test', title: 'Run tests', priority: 'spine' },
  { path: 'test/watch-mode', cluster: 'test', title: 'Watch mode', priority: 'spine' },
  { path: 'test/bail', cluster: 'test', title: 'Bail early', priority: 'spine' },
  { path: 'test/mock-functions', cluster: 'test', title: 'Mock functions', priority: 'useful' },
  { path: 'test/spy-on', cluster: 'test', title: 'Spy on methods', priority: 'useful' },
  { path: 'test/snapshot', cluster: 'test', title: 'Snapshot testing', priority: 'useful' },
  { path: 'test/update-snapshots', cluster: 'test', title: 'Update snapshots', priority: 'useful' },
  { path: 'test/skip-tests', cluster: 'test', title: 'Skip tests', priority: 'useful' },
  { path: 'test/timeout', cluster: 'test', title: 'Per-test timeout', priority: 'useful' },
  { path: 'test/coverage', cluster: 'test', title: 'Code coverage', priority: 'useful' },
  {
    path: 'test/coverage-threshold',
    cluster: 'test',
    title: 'Coverage threshold',
    priority: 'useful',
  },
  {
    path: 'test/concurrent-test-glob',
    cluster: 'test',
    title: 'Concurrent test glob',
    priority: 'useful',
  },
  { path: 'test/mock-clock', cluster: 'test', title: 'Mock clock', priority: 'useful' },
  { path: 'test/todo-tests', cluster: 'test', title: 'Todo tests', priority: 'optional' },
  {
    path: 'test/rerun-each',
    cluster: 'test',
    title: 'Re-run tests multiple times',
    priority: 'optional',
  },
  {
    path: 'test/migrate-from-jest',
    cluster: 'test',
    title: 'Migrate from Jest',
    priority: 'optional',
  },
  { path: 'test/testing-library', cluster: 'test', title: 'Testing Library', priority: 'optional' },
  { path: 'test/happy-dom', cluster: 'test', title: 'happy-dom', priority: 'optional' },
  {
    path: 'test/svelte-test',
    cluster: 'test',
    title: 'Svelte components',
    priority: 'out-of-scope',
  },

  // http (spine subset)
  { path: 'http/simple', cluster: 'http', title: 'Simple HTTP server', priority: 'useful' },
  { path: 'http/server', cluster: 'http', title: 'Common HTTP server usage', priority: 'useful' },
  { path: 'http/fetch', cluster: 'http', title: 'fetch', priority: 'spine' },
  { path: 'http/proxy', cluster: 'http', title: 'Proxy HTTP requests', priority: 'spine' },
  {
    path: 'http/stream-file',
    cluster: 'http',
    title: 'Stream a file as Response',
    priority: 'useful',
  },
  { path: 'http/hot', cluster: 'http', title: 'Hot reload HTTP server', priority: 'useful' },
  { path: 'http/sse', cluster: 'http', title: 'Server-Sent Events', priority: 'useful' },
  { path: 'http/tls', cluster: 'http', title: 'TLS on HTTP server', priority: 'optional' },
  { path: 'http/cluster', cluster: 'http', title: 'Cluster of HTTP servers', priority: 'optional' },
  { path: 'http/file-uploads', cluster: 'http', title: 'FormData uploads', priority: 'optional' },
  {
    path: 'http/fetch-unix',
    cluster: 'http',
    title: 'fetch with unix sockets',
    priority: 'optional',
  },
  {
    path: 'http/stream-iterator',
    cluster: 'http',
    title: 'Streaming with async iterators',
    priority: 'optional',
  },
  {
    path: 'http/stream-node-streams-in-bun',
    cluster: 'http',
    title: 'Node streams',
    priority: 'optional',
  },

  // websocket
  {
    path: 'websocket/simple',
    cluster: 'websocket',
    title: 'Simple WebSocket server',
    priority: 'useful',
  },
  {
    path: 'websocket/pubsub',
    cluster: 'websocket',
    title: 'Pub-sub WebSocket',
    priority: 'useful',
  },
  {
    path: 'websocket/compression',
    cluster: 'websocket',
    title: 'WebSocket compression',
    priority: 'optional',
  },
  {
    path: 'websocket/context',
    cluster: 'websocket',
    title: 'Per-socket context',
    priority: 'optional',
  },

  // html-rewriter
  {
    path: 'html-rewriter/extract-links',
    cluster: 'html-rewriter',
    title: 'Extract links',
    priority: 'optional',
  },
  {
    path: 'html-rewriter/extract-social-meta',
    cluster: 'html-rewriter',
    title: 'Extract social meta',
    priority: 'useful',
  },

  // streams / binary — bulk optional
  ...[
    'to-json',
    'to-blob',
    'to-buffer',
    'to-string',
    'to-typedarray',
    'to-arraybuffer',
    'to-array',
    'node-readable-to-json',
    'node-readable-to-blob',
    'node-readable-to-string',
    'node-readable-to-uint8array',
    'node-readable-to-arraybuffer',
  ].map((p): BunGuide => ({
    path: `streams/${p}`,
    cluster: 'streams',
    title: p,
    priority: 'optional',
  })),

  // deployment — out of scope for Pages monorepo
  {
    path: 'deployment/vercel',
    cluster: 'deployment',
    title: 'Deploy on Vercel',
    priority: 'out-of-scope',
  },
  {
    path: 'deployment/railway',
    cluster: 'deployment',
    title: 'Deploy on Railway',
    priority: 'out-of-scope',
  },
  {
    path: 'deployment/render',
    cluster: 'deployment',
    title: 'Deploy on Render',
    priority: 'out-of-scope',
  },
] as const;

export function guideUrl(path: string): string {
  return `https://bun.com/docs/guides/${path}`;
}

export function spineGuides(): BunGuide[] {
  return BUN_GUIDES.filter(g => g.priority === 'spine');
}
