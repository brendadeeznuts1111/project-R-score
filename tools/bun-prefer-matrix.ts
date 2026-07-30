// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-stripansi — Bun.stripANSI
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — Bun.WebView
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — WebView
// @see https://bun.com/docs/runtime/redis#getting-started — Bun.redis
// @see https://bun.com/docs/runtime/s3#bun-s3client-bun-s3 — Bun.s3
// @see https://bun.com/docs/runtime/sql#features — Bun.sql
// @see https://bun.com/docs/runtime/sql#features — bun:sql
// @see https://bun.com/docs/runtime/toml#bun-toml-parse — Bun.TOML
// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown
// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown.html
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
// @see https://bun.com/docs/runtime/markdown#bun-markdown-render — Bun.markdown.render
// @see https://bun.com/docs/runtime/markdown#bun-markdown-react — Bun.markdown.react
// @see https://bun.com/docs/runtime/yaml#bun-yaml-parse — Bun.YAML
// @see https://bun.com/docs/runtime/yaml#bun-yaml-parse — YAML
// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password
// @see https://bun.com/docs/runtime/secrets#bun-secrets-get-options — Bun.secrets
// @see https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean — Bun.semver
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
// @see https://bun.com/docs/runtime/utils#bun-peek — Bun.peek
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * Prefer-matrix SSOT — Bun-native task → use/avoid tokens.
 * Consumed by bun-docs-coverage + export-bun-api-index.
 * Keep aligned with .cursor/rules/bun-harness.mdc.
 *
 * @see https://bun.com/docs/llms.txt
 */

export type PreferMatrixTask = {
  id: string; // brand-ok — static documentation entry key
  /** Display group for agents / docs */
  group: 'io' | 'crypto' | 'process' | 'data' | 'ui' | 'harness';
  use: string[];
  avoid: string[];
};

export const PREFER_MATRIX: readonly PreferMatrixTask[] = [
  // ── io ──────────────────────────────────────────────────────────────
  {
    id: 'fileIo',
    group: 'io',
    use: ['Bun.file', 'Bun.write'],
    avoid: ['fs.readFile', 'fs.writeFile', 'fs-extra'],
  },
  { id: 'exists', group: 'io', use: ['Bun.file'], avoid: ['existsSync'] },
  { id: 'glob', group: 'io', use: ['Bun.Glob'], avoid: ['fast-glob', 'globby'] },
  { id: 'paths', group: 'io', use: [], avoid: ['path', 'node:path'] },

  // ── crypto ──────────────────────────────────────────────────────────
  {
    id: 'hashing',
    group: 'crypto',
    use: ['Bun.CryptoHasher', 'Bun.hash'],
    avoid: ['crypto.createHash'],
  },
  { id: 'passwords', group: 'crypto', use: ['Bun.password'], avoid: ['bcrypt', 'argon2'] },
  { id: 'secrets', group: 'crypto', use: ['Bun.secrets'], avoid: [] },

  // ── process ─────────────────────────────────────────────────────────
  {
    id: 'spawn',
    group: 'process',
    use: ['Bun.spawn', 'Bun.spawnSync', 'Bun.$'],
    avoid: ['child_process', 'execa'],
  },
  { id: 'which', group: 'process', use: ['Bun.which'], avoid: [] },
  { id: 'httpServer', group: 'process', use: ['Bun.serve'], avoid: ['express', 'fastify'] },
  { id: 'fetch', group: 'process', use: ['fetch'], avoid: ['axios', 'node-fetch'] },
  { id: 'cron', group: 'process', use: ['Bun.cron'], avoid: ['node-cron'] },
  { id: 'entryGuard', group: 'process', use: [], avoid: [] },

  // ── data ────────────────────────────────────────────────────────────
  { id: 'sqlite', group: 'data', use: ['bun:sqlite'], avoid: ['better-sqlite3'] },
  { id: 'sql', group: 'data', use: ['Bun.sql', 'bun:sql'], avoid: ['pg', 'mysql2'] },
  { id: 'redis', group: 'data', use: ['Bun.redis'], avoid: ['ioredis'] },
  { id: 's3', group: 'data', use: ['Bun.s3'], avoid: [] },
  {
    id: 'tomlYaml',
    group: 'data',
    use: ['Bun.TOML', 'Bun.YAML'],
    avoid: ['@iarna/toml', 'toml'],
  },
  { id: 'semver', group: 'data', use: ['Bun.semver'], avoid: ['semver'] },
  { id: 'test', group: 'data', use: ['bun:test'], avoid: ['vitest', 'jest'] },

  // ── ui ──────────────────────────────────────────────────────────────
  { id: 'image', group: 'ui', use: ['Bun.Image'], avoid: ['sharp'] },
  { id: 'webview', group: 'ui', use: ['Bun.WebView'], avoid: ['puppeteer', 'playwright'] },
  {
    id: 'colorAnsi',
    group: 'ui',
    use: ['Bun.color', 'Bun.stripANSI', 'Bun.stringWidth', 'Bun.wrapAnsi'],
    avoid: ['chalk', 'kleur', 'string-width', 'strip-ansi', 'wrap-ansi'],
  },
  {
    id: 'markdown',
    group: 'ui',
    use: [
      'Bun.markdown',
      'Bun.markdown.html',
      'Bun.markdown.ansi',
      'Bun.markdown.render',
      'Bun.markdown.react',
    ],
    avoid: ['marked'],
  },
  {
    id: 'inspect',
    group: 'ui',
    use: ['Bun.inspect', 'Bun.inspect.table'],
    avoid: ['util.inspect', 'cli-table', 'cli-table3'],
  },
  {
    id: 'htmlEscape',
    group: 'ui',
    use: ['Bun.escapeHTML'],
    avoid: ['escape-html'],
  },

  // ── harness ─────────────────────────────────────────────────────────
  { id: 'env', group: 'harness', use: ['Bun.env'], avoid: ['process.env'] },
  { id: 'deepEquals', group: 'harness', use: ['Bun.deepEquals'], avoid: [] },
  { id: 'peek', group: 'harness', use: ['Bun.peek'], avoid: [] },
  {
    id: 'timeUuid',
    group: 'harness',
    use: ['Bun.nanoseconds', 'Bun.sleep', 'Bun.randomUUIDv7'],
    avoid: [],
  },
] as const;

/**
 * Tier-A npm packages banned as *direct* workspace dependencies.
 * Source imports are gated by ESLint; transitive lockfile hits are inventory-only.
 */
export const TIER_A_AVOID_PACKAGES = [
  'wrap-ansi',
  'string-width',
  'strip-ansi',
  'slice-ansi',
  'chalk',
  'kleur',
  'cli-table',
  'cli-table3',
  'escape-html',
  '@iarna/toml',
  'toml',
  'axios',
  'node-fetch',
  'execa',
  'fs-extra',
  'better-sqlite3',
] as const;

export type TierAAvoidPackage = (typeof TIER_A_AVOID_PACKAGES)[number];

export function tierAAvoidPackages(): readonly string[] {
  return TIER_A_AVOID_PACKAGES;
}

/** Prefer tokens that participate in API coverage (Bun.* / bun:). */
export function preferApiTokens(matrix: readonly PreferMatrixTask[] = PREFER_MATRIX): string[] {
  const out = new Set<string>();
  for (const task of matrix) {
    for (const u of task.use) {
      if (u.startsWith('Bun.') || u.startsWith('bun:')) out.add(u);
    }
  }
  return [...out].sort();
}

/** Build api-index `prefer` object from the matrix SSOT. */
export function preferObjectFromMatrix(
  matrix: readonly PreferMatrixTask[] = PREFER_MATRIX
): Record<string, { use: string[]; avoid: string[]; group: string }> {
  const prefer: Record<string, { use: string[]; avoid: string[]; group: string }> = {};
  for (const task of matrix) {
    prefer[task.id] = { use: [...task.use], avoid: [...task.avoid], group: task.group };
  }
  return prefer;
}
