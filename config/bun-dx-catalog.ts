// @see https://bun.com/blog/bun-v1.3.12#urlpattern-is-up-to-2-3x-faster — URLPattern
// @see https://bun.com/blog/bun-v1.3.12#faster-bun-glob-scan — Bun.Glob.scan
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/http/server#basic-setup — Bun.serve
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/yaml#bun-yaml-parse — Bun.YAML
// @see https://bun.com/docs/runtime/yaml#bun-yaml-parse — YAML
// @see https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean — Bun.semver
// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * Bun DX catalog — single source for lint messages, guards, and cheatsheets.
 * Each entry links an anti-pattern to an elite one-liner and official docs.
 */

export type BunDxSeverity = 'error' | 'warn';
export type FixTier = 'easy' | 'medium' | 'hard';

export type BunDxEntry = {
  id: string;
  summary: string;
  bad?: string;
  good: string;
  docs: string;
  severity: BunDxSeverity;
  fixTier?: FixTier;
  eslintRule?: string;
  eslintRules?: string[];
  modules?: string[];
  patterns?: RegExp[];
};

export const BUN_DX_CATALOG: BunDxEntry[] = [
  {
    id: 'file.read',
    summary: 'Read file contents',
    bad: 'readFileSync(path, "utf8")',
    good: 'const text = await Bun.file(path).text();',
    docs: 'https://bun.com/docs/runtime/file-io#reading-files-bun-file',
    severity: 'error',
    fixTier: 'medium',
    eslintRules: ['no-restricted-imports', 'no-restricted-syntax'],
    modules: ['fs', 'node:fs', 'node:fs/promises'],
    patterns: [/fs\.readFileSync|readFileSync\s*\(/],
  },
  {
    id: 'file.write',
    summary: 'Write file contents',
    bad: 'writeFileSync(path, data)',
    good: 'await Bun.write(path, data);',
    docs: 'https://bun.com/docs/runtime/file-io#writing-files-bun-write',
    severity: 'error',
    fixTier: 'medium',
    eslintRules: ['no-restricted-imports', 'no-restricted-syntax'],
    modules: ['fs', 'node:fs', 'node:fs/promises'],
    patterns: [/fs\.writeFileSync|writeFileSync\s*\(/],
  },
  {
    id: 'file.exists',
    summary: 'Check file existence',
    bad: 'existsSync(path)',
    good: 'if (await Bun.file(path).exists()) { ... }',
    docs: 'https://bun.com/docs/guides/read-file/exists',
    severity: 'error',
    fixTier: 'medium',
    eslintRules: ['no-restricted-syntax'],
    patterns: [/fs\.existsSync|existsSync\s*\(/],
  },
  {
    id: 'file.json',
    summary: 'Read JSON file',
    bad: 'JSON.parse(readFileSync(path, "utf8"))',
    good: 'const data = await Bun.file(path).json();',
    docs: 'https://bun.com/docs/runtime/file-io#reading-files-bun-file',
    severity: 'error',
    fixTier: 'medium',
    eslintRules: ['no-restricted-imports', 'no-restricted-syntax'],
  },
  {
    id: 'file.stream',
    summary: 'Stream large files',
    bad: 'createReadStream(path)',
    good: 'for await (const chunk of Bun.file(path).stream()) { ... }',
    docs: 'https://bun.com/docs/runtime/file-io#reading-files-bun-file',
    severity: 'error',
    fixTier: 'hard',
    eslintRules: ['no-restricted-syntax'],
    patterns: [/fs\.createReadStream|createReadStream\s*\(/],
  },
  {
    id: 'file.glob',
    summary: 'Glob file patterns (async scan — up to 2× faster on 1.3.12+)',
    bad: 'readdirSync + filter / fast-glob',
    good: 'for await (const path of new Bun.Glob("**/node_modules/**/*.js").scan({ cwd: "./my-project" })) { ... }',
    docs: 'https://bun.com/docs/runtime/glob#quickstart',
    severity: 'error',
    fixTier: 'hard',
    eslintRules: ['no-restricted-imports', 'no-restricted-syntax'],
    modules: ['fs', 'node:fs'],
    patterns: [/fast-glob|globby|readdirSync\s*\(/],
  },
  {
    id: 'file.glob.scan',
    summary: 'Bun.Glob.scan async iterator (prefer over walk)',
    bad: 'for (const path of new Bun.Glob("**/*.js").scanSync(".")) { ... }',
    good: 'for await (const path of new Bun.Glob("**/*.js").scan({ cwd: "." })) { ... }',
    docs: 'https://bun.com/docs/runtime/glob#quickstart',
    severity: 'info',
    fixTier: 'easy',
    eslintRules: [],
    modules: [],
    patterns: [/\.scanSync\s*\(/, /new\s+Bun\.Glob\s*\(/],
  },
  {
    id: 'tty.stringWidth',
    summary: 'ANSI-aware column width (prefer Bun.stringWidth)',
    bad: 'import stringWidth from "string-width"; stringWidth(text)',
    good: 'Bun.stringWidth(text) // or widthOf from lib/console-depth',
    docs: 'https://bun.com/docs/runtime/utils#bun-stringwidth',
    severity: 'warn',
    fixTier: 'easy',
    eslintRules: [],
    modules: ['string-width'],
    patterns: [/from\s+['"]string-width['"]|require\s*\(\s*['"]string-width['"]/],
  },
  {
    id: 'tty.stripANSI',
    summary: 'Strip ANSI (prefer Bun.stripANSI)',
    bad: 'import stripAnsi from "strip-ansi"; stripAnsi(text)',
    good: 'Bun.stripANSI(text)',
    docs: 'https://bun.com/docs/runtime/utils#bun-stripansi',
    severity: 'warn',
    fixTier: 'easy',
    eslintRules: [],
    modules: ['strip-ansi'],
    patterns: [/from\s+['"]strip-ansi['"]|require\s*\(\s*['"]strip-ansi['"]/],
  },
  {
    id: 'spawn.exec',
    summary: 'Run subprocess',
    bad: 'spawn("bun", ["script.ts"])',
    good: 'const proc = Bun.spawn(["bun", "script.ts"], { stdio: ["inherit", "inherit", "inherit"] });',
    docs: 'https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn',
    severity: 'error',
    fixTier: 'medium',
    eslintRules: ['no-restricted-imports', 'no-restricted-syntax'],
    modules: ['child_process', 'node:child_process'],
    patterns: [/(?<!Bun\.)spawn\s*\(|child_process\.spawn/],
  },
  {
    id: 'spawn.sync',
    summary: 'Run subprocess synchronously',
    bad: 'execSync("bun --version")',
    good: 'const result = Bun.spawnSync(["bun", "--version"], { stdout: "pipe" });',
    docs: 'https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync',
    severity: 'error',
    fixTier: 'medium',
    eslintRules: ['no-restricted-imports', 'no-restricted-syntax'],
    modules: ['child_process', 'node:child_process'],
    patterns: [/(?<!Bun\.)execSync\s*\(|child_process\.execSync/],
  },
  {
    id: 'spawn.exec-async',
    summary: 'Run shell command async',
    bad: 'exec("npm install", callback)',
    good: 'const proc = Bun.spawn(["npm", "install"], { cwd: "./project" }); await proc.exited;',
    docs: 'https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn',
    severity: 'error',
    fixTier: 'medium',
    eslintRules: ['no-restricted-syntax'],
    patterns: [/child_process\.exec\s*\(/, /(?<![.\w])exec\s*\(\s*['"`]/],
  },
  {
    id: 'crypto.hash',
    summary: 'Hash data (non-crypto fingerprint)',
    bad: 'crypto.createHash("sha256").update(data).digest("hex")',
    good: 'const hash = Bun.hash(data); // wyhash — not for security',
    docs: 'https://bun.com/docs/runtime/hashing#bun-hash',
    severity: 'warn',
    fixTier: 'hard',
    eslintRules: ['no-restricted-imports'],
    modules: ['crypto', 'node:crypto'],
    patterns: [/createHash\s*\(|crypto\.createHash/],
  },
  {
    id: 'crypto.sha3',
    summary: 'Cryptographic hash (SHA3)',
    bad: 'crypto.createHash("sha256").update(data).digest("hex")',
    good: 'new Bun.CryptoHasher("sha3-256").update(data).digest("hex")',
    docs: 'https://bun.com/docs/runtime/hashing#bun-cryptohasher',
    severity: 'info',
    fixTier: 'medium',
    eslintRules: [],
    modules: ['crypto', 'node:crypto'],
    patterns: [/createHash\s*\(\s*['"]sha3-/i, /subtle\.digest\s*\(\s*['"]SHA3-/],
  },
  {
    id: 'crypto.x25519',
    summary: 'X25519 key agreement (deriveBits)',
    bad: '// NotSupportedError on older Bun for subtle.deriveBits(X25519)',
    good: 'await crypto.subtle.deriveBits({ name: "X25519", public }, privateKey, 256)',
    docs: 'https://bun.com/docs/runtime/nodejs-compat#nodecrypto',
    severity: 'info',
    fixTier: 'hard',
    eslintRules: [],
    modules: ['crypto', 'node:crypto'],
    patterns: [/deriveBits\s*\([\s\S]*X25519/],
  },
  {
    id: 'crypto.password',
    summary: 'Hash passwords',
    bad: 'crypto.pbkdf2Sync(password, salt, ...)',
    good: 'const hashed = await Bun.password.hash(password, { algorithm: "bcrypt" });',
    docs: 'https://bun.com/docs/runtime/hashing#bun-password',
    severity: 'warn',
    fixTier: 'hard',
    eslintRules: ['no-restricted-imports'],
    modules: ['crypto', 'node:crypto'],
    patterns: [/pbkdf2|crypto\.pbkdf2/],
  },
  {
    id: 'url.urlpattern',
    summary: 'Route match with URLPattern (fast; no RegExp.$N leak)',
    bad: 'const m = req.url.match(/^\\/api\\/users\\/([^/]+)\\/posts\\/([^/]+)/)',
    good: 'const p = new URLPattern({ pathname: "/api/users/:id/posts/:postId" }); p.exec(url)?.pathname.groups',
    docs: 'https://developer.mozilla.org/en-US/docs/Web/API/URLPattern',
    severity: 'info',
    fixTier: 'medium',
    eslintRules: [],
    modules: [],
    patterns: [/new\s+URLPattern\s*\(/, /URLPattern\s*\(/],
  },
  {
    id: 'http.serve',
    summary: 'HTTP server',
    bad: 'http.createServer((req, res) => ...)',
    good: 'Bun.serve({ port: 3000, fetch(req) { return new Response("OK"); } });',
    docs: 'https://bun.com/docs/runtime/http/server#basic-setup',
    severity: 'warn',
    fixTier: 'hard',
    eslintRules: ['no-restricted-imports'],
    modules: ['http', 'https', 'node:http', 'node:https'],
    patterns: [/http\.createServer|createServer\s*\(/],
  },
  {
    id: 'http.fetch',
    summary: 'HTTP client',
    bad: 'axios.get(url)',
    good: 'const data = await fetch(url).then(r => r.json());',
    docs: 'https://bun.com/docs/runtime/nodejs-compat',
    severity: 'warn',
    fixTier: 'medium',
    eslintRules: ['no-restricted-imports'],
    modules: ['axios'],
  },
  {
    id: 'zlib.compress',
    summary: 'Compression',
    bad: 'zlib.gzipSync(data)',
    good: 'const compressed = Bun.gzipSync(data);',
    docs: 'https://bun.com/docs/runtime/utils#bun-gzipsync',
    severity: 'warn',
    fixTier: 'hard',
    eslintRules: ['no-restricted-imports'],
    modules: ['zlib', 'node:zlib'],
  },
  {
    id: 'env.read',
    summary: 'Read environment variables',
    bad: 'process.env.API_KEY',
    good: 'const apiKey = Bun.env.API_KEY;',
    docs: 'https://bun.com/docs/runtime/environment-variables',
    severity: 'warn',
    fixTier: 'easy',
    eslintRule: 'bun/prefer-bun-env',
    eslintRules: ['bun/prefer-bun-env'],
    patterns: [/process\.env\./],
  },
  {
    id: 'cli.main',
    summary: 'CLI entrypoint guard',
    bad: 'main(); // runs on import',
    good: 'if (import.meta.main) { await main(); }',
    docs: 'https://bun.com/docs/guides/util/main',
    severity: 'warn',
    fixTier: 'easy',
    eslintRule: 'bun/prefer-import-meta-main',
    eslintRules: ['bun/prefer-import-meta-main'],
  },
  {
    id: 'test.bun',
    summary: 'Test runner',
    bad: 'import { test } from "node:test"',
    good: 'import { test, expect } from "bun:test";',
    docs: 'https://bun.com/docs/test/index#run-tests',
    severity: 'warn',
    fixTier: 'medium',
    eslintRule: 'bun/prefer-bun-test',
    eslintRules: ['bun/prefer-bun-test', 'no-restricted-imports'],
    modules: ['node:test', 'jest'],
  },
  {
    id: 'sqlite.bun',
    summary: 'SQLite database',
    bad: 'import Database from "better-sqlite3"',
    good: 'import { Database } from "bun:sqlite";',
    docs: 'https://bun.com/docs/runtime/sqlite#load-via-es-module-import',
    severity: 'warn',
    fixTier: 'medium',
    eslintRule: 'bun/prefer-bun-sqlite',
    eslintRules: ['bun/prefer-bun-sqlite', 'no-restricted-imports'],
    modules: ['better-sqlite3'],
  },
  {
    id: 'runtime.sleep',
    summary: 'Async delay',
    bad: 'await new Promise(r => setTimeout(r, 1000))',
    good: 'await Bun.sleep(1000);',
    docs: 'https://bun.com/docs/runtime/utils#bun-sleep',
    severity: 'warn',
    fixTier: 'easy',
    patterns: [/new\s+Promise.*setTimeout|setTimeout.*Promise/],
  },
  {
    id: 'runtime.deep-equals',
    summary: 'Deep equality check (prefer strict)',
    bad: 'JSON.stringify(a) === JSON.stringify(b)',
    good: 'deepEquals(a, b) // Bun.deepEquals(a, b, true) — undefined key ≠ missing',
    docs: 'https://bun.com/docs/runtime/utils#bun-deepequals',
    severity: 'warn',
    fixTier: 'medium',
    patterns: [/JSON\.stringify.*===.*JSON\.stringify/],
  },
  {
    id: 'runtime.gc',
    summary: 'GC control during hot paths',
    bad: 'rely on implicit GC pauses',
    good: 'Bun.gc(false); /* work */ Bun.gc(true);',
    docs: 'https://bun.com/docs/runtime/utils#bun-gc',
    severity: 'warn',
    fixTier: 'hard',
  },
  {
    id: 'runtime.yaml',
    summary: 'Parse YAML config',
    bad: 'yaml.parse(await readFile(...))',
    good: 'const config = Bun.YAML.parse(await Bun.file("config.yaml").text());',
    docs: 'https://bun.com/docs/runtime/yaml#bun-yaml-parse',
    severity: 'warn',
    fixTier: 'medium',
  },
  {
    id: 'runtime.semver',
    summary: 'Semver checks',
    bad: 'semver.satisfies(version, range)',
    good: 'Bun.semver.satisfies(version, range)',
    docs: 'https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean',
    severity: 'warn',
    fixTier: 'medium',
  },
  {
    id: 'runtime.which',
    summary: 'Find binary in PATH',
    bad: 'which.sync("tsc")',
    good: 'const tscPath = Bun.which("tsc");',
    docs: 'https://bun.com/docs/runtime/utils#bun-which',
    severity: 'warn',
    fixTier: 'medium',
  },
  {
    id: 'runtime.inspect',
    summary: 'Debug logging',
    bad: 'console.log(JSON.stringify(obj, null, 2))',
    good: 'console.log(Bun.inspect(obj, { depth: 2 }));',
    docs: 'https://bun.com/docs/runtime/utils#bun-inspect',
    severity: 'warn',
    fixTier: 'easy',
  },
];

const catalogById = new Map(BUN_DX_CATALOG.map(entry => [entry.id, entry]));

const ruleToCatalogIds = new Map<string, string[]>();
for (const entry of BUN_DX_CATALOG) {
  const rules = entry.eslintRules ?? (entry.eslintRule ? [entry.eslintRule] : []);
  for (const rule of rules) {
    const list = ruleToCatalogIds.get(rule) ?? [];
    list.push(entry.id);
    ruleToCatalogIds.set(rule, list);
  }
}

const MODULE_IMPORT_RE =
  /(?:Avoid|Use|Prefer)[^\n]*?["']((?:node:)?(?:fs(?:\/promises)?|child_process|crypto|zlib|axios|http|https|node:test|better-sqlite3))["']|import[^\n]*["']((?:node:)?(?:fs(?:\/promises)?|child_process|crypto|zlib|axios|http|https|node:test|better-sqlite3))["']/i;

export function getBunDxEntry(id: string): BunDxEntry | undefined {
  return catalogById.get(id);
}

export function formatBunMessage(id: string, prefix?: string): string {
  const entry = catalogById.get(id);
  if (!entry) return prefix ?? `See Bun docs: https://bun.com/docs`;

  const lines = [prefix ?? entry.summary, `One-liner: ${entry.good}`, `Docs: ${entry.docs}`];
  return lines.join('\n');
}

export function getCatalogByModule(moduleName: string): BunDxEntry | undefined {
  return BUN_DX_CATALOG.find(entry => entry.modules?.includes(moduleName));
}

export function getCatalogByPattern(line: string): BunDxEntry | undefined {
  return BUN_DX_CATALOG.find(entry => entry.patterns?.some(pattern => pattern.test(line)));
}

export function mapRuleToCatalog(ruleId: string, message: string): string | undefined {
  if (ruleId === 'no-restricted-imports' || ruleId === 'no-restricted-syntax') {
    const modMatch = message.match(MODULE_IMPORT_RE);
    if (modMatch) {
      const mod = modMatch[1] ?? modMatch[2];
      if (mod) {
        const byMod = getCatalogByModule(mod);
        if (byMod) return byMod.id;
      }
    }
    if (/Bun\.file|readFileSync|writeFileSync|existsSync|readdirSync/.test(message)) {
      if (/writeFileSync|Bun\.write/.test(message)) return 'file.write';
      if (/existsSync/.test(message)) return 'file.exists';
      return 'file.read';
    }
    if (/execSync|spawnSync|child_process|Bun\.spawn/.test(message)) {
      if (/execSync|spawnSync/.test(message)) return 'spawn.sync';
      return 'spawn.exec';
    }
    if (/createServer/.test(message)) return 'http.serve';
  }

  const direct = BUN_DX_CATALOG.find(entry => {
    const rules = entry.eslintRules ?? (entry.eslintRule ? [entry.eslintRule] : []);
    return rules.includes(ruleId);
  });
  if (direct) return direct.id;

  const candidates = ruleToCatalogIds.get(ruleId);
  if (candidates?.length === 1) return candidates[0];

  const byPattern = getCatalogByPattern(message);
  if (byPattern) return byPattern.id;

  return undefined;
}

export function getStandardCatches(tier?: FixTier): BunDxEntry[] {
  return BUN_DX_CATALOG.filter(entry => !tier || entry.fixTier === tier);
}

export function getGuardModuleViolations(): Record<
  string,
  { replacement: string; severity: BunDxSeverity; catalogId: string }
> {
  const result: Record<
    string,
    { replacement: string; severity: BunDxSeverity; catalogId: string }
  > = {};

  for (const entry of BUN_DX_CATALOG) {
    if (!entry.modules) continue;
    for (const mod of entry.modules) {
      if (!result[mod]) {
        result[mod] = {
          replacement: entry.good,
          severity: entry.severity,
          catalogId: entry.id,
        };
      }
    }
  }

  return result;
}

export function getGuardApiPatterns(): Array<{
  pattern: RegExp;
  message: string;
  replacement: string;
  severity: BunDxSeverity;
  catalogId: string;
  docs: string;
}> {
  return BUN_DX_CATALOG.flatMap(entry => {
    if (!entry.patterns?.length) return [];
    return entry.patterns.map(pattern => ({
      pattern,
      message: `${entry.summary} detected`,
      replacement: entry.good,
      severity: entry.severity,
      catalogId: entry.id,
      docs: entry.docs,
    }));
  });
}

export function searchCatalog(query: string): BunDxEntry[] {
  const q = query.toLowerCase();
  return BUN_DX_CATALOG.filter(
    entry =>
      entry.id.includes(q) ||
      entry.summary.toLowerCase().includes(q) ||
      entry.good.toLowerCase().includes(q) ||
      entry.modules?.some(m => m.includes(q))
  );
}

export function randomCatalogEntry(): BunDxEntry {
  return BUN_DX_CATALOG[Math.floor(Math.random() * BUN_DX_CATALOG.length)]!;
}
