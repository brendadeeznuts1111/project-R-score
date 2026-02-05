/**
 * URLPattern Runtime Guard Generator
 * 
 * Generates TypeScript security guards for URLPattern routes.
 * 
 * Usage:
 *   bun guard-generator.ts --input routes.ndjson --output security-guards.ts
 *   cat routes.ndjson | bun guard-generator.ts --stdin --output guards.ts
 *   echo '{"pattern":"/api/:id"}' | bun guard-generator.ts --stdin
 * 
 * Options:
 *   -i, --input <file>    Input NDJSON file (one pattern per line)
 *   -o, --output <file>   Output TypeScript file (default: stdout)
 *   --stdin               Read from stdin
 *   --timeout <ms>        Guard timeout in ms (default: 5)
 *   --no-audit            Disable audit logging
 *   -h, --help            Show help
 */

import { Database } from "bun:sqlite";

interface SecurityAnalysis {
  pattern: string;
  hash: string;
  riskLevel: "high" | "medium" | "low";
  riskScore: number;
  pathTraversal: boolean;
  openRedirect: boolean;
  ssrfPotential: boolean;
  regexDoS: boolean;
  envVars: string[];
}

class GuardGenerator {
  private patterns: SecurityAnalysis[] = [];
  private envVars = new Set<string>();

  constructor(
    private inputFile: string | null,
    private outputFile: string | null,
    private timeout: number,
    private includeAudit: boolean
  ) {}

  private parseLine(line: string): { pattern: string } | null {
    const t = line.trim();
    if (!t || t.startsWith("#") || t.startsWith("//")) return null;
    try {
      if (t.startsWith("{")) {
        const p = JSON.parse(t);
        return { pattern: p.pattern || p.pathname || p.p };
      }
      return { pattern: t };
    } catch {
      return { pattern: t };
    }
  }

  private analyze(pattern: string): SecurityAnalysis {
    const pt = /\.\.\/|\.\.\\/.test(pattern);
    const or = /^https?:\/\/\*|:\/\/\$\{/.test(pattern);
    const ssrf = /localhost|127\.0\.0\.1|metadata\.google|169\.254|internal|\$\{/.test(pattern);
    const redos = /(\+|\*)\s*(\+|\*)|\([^)]*(\+|\*)[^)]*\)\+/.test(pattern);
    const envMatches = [...pattern.matchAll(/\$\{?(\w+)\}?/g)].map(m => m[1]);
    envMatches.forEach(e => this.envVars.add(e));
    const risk = (pt ? 3 : 0) + (or ? 2 : 0) + (ssrf ? 2 : 0) + (redos ? 3 : 0) + (envMatches.length > 0 ? 2 : 0);

    return {
      pattern,
      hash: Bun.hash.crc32(pattern).toString(16).padStart(8, "0"),
      riskLevel: risk >= 5 ? "high" : risk >= 2 ? "medium" : "low",
      riskScore: risk,
      pathTraversal: pt,
      openRedirect: or,
      ssrfPotential: ssrf,
      regexDoS: redos,
      envVars: envMatches,
    };
  }

  async *streamPatterns(): AsyncGenerator<{ pattern: string }> {
    if (this.inputFile) {
      const file = Bun.file(this.inputFile);
      if (!(await file.exists())) throw new Error(`File not found: ${this.inputFile}`);
      const decoder = new TextDecoder();
      let buf = "";
      for await (const chunk of file.stream()) {
        buf += decoder.decode(chunk, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const l of lines) {
          const p = this.parseLine(l);
          if (p) yield p;
        }
      }
      if (buf.trim()) {
        const p = this.parseLine(buf);
        if (p) yield p;
      }
    } else {
      // Read from stdin
      const chunks: Uint8Array[] = [];
      for await (const chunk of Bun.stdin.stream()) {
        chunks.push(chunk);
      }
      const content = Buffer.concat(chunks).toString("utf-8");
      for (const line of content.split("\n")) {
        const p = this.parseLine(line);
        if (p) yield p;
      }
    }
  }

  private generateCode(): string {
    const high = this.patterns.filter(p => p.riskLevel === "high").length;
    const med = this.patterns.filter(p => p.riskLevel === "medium").length;
    const ts = new Date().toISOString();
    const bunVersion = Bun.version;

    // Version compatibility checks using Bun.semver
    const requiresURLPattern = true;
    const minBunVersion = "1.0.0";
    const urlPatternAvailable = typeof URLPattern !== "undefined";
    const semverValid = Bun.semver.satisfies(bunVersion, `>=${minBunVersion}`);

    let code = `/**
 * URLPattern Runtime Security Guards
 * Generated: ${ts}
 * Bun: ${bunVersion} | Compatible: ${semverValid ? "✅" : "❌"}
 * Patterns: ${this.patterns.length} (high: ${high}, medium: ${med}, low: ${this.patterns.length - high - med})
 */

export interface GuardContext {
  url: string;
  groups: Record<string, string>;
  patternHash: string;
}

export interface GuardResult {
  allowed: boolean;
  blocked?: string;
  warnings: string[];
}

// Version compatibility
const MIN_BUN_VERSION = "${minBunVersion}";
const CURRENT_BUN_VERSION = "${bunVersion}";

export function checkVersion(): boolean {
  return Bun.semver.satisfies(CURRENT_BUN_VERSION, \`>=\${MIN_BUN_VERSION}\`);
}

${semverValid ? `// Semver API available: Bun.semver.satisfies("${bunVersion}", ">=${minBunVersion}") = true` : `// Warning: Semver API may have limited functionality`}

// SSRF protection - blocked hosts and private IP ranges
const BLOCKED_HOSTS = new Set([
  "localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254",
  "metadata.google.internal", "[::1]", "metadata.google.com"
]);

const PRIVATE_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
];

function isBlockedHost(hostname: string): boolean {
  if (BLOCKED_HOSTS.has(hostname)) return true;
  return PRIVATE_RANGES.some(r => r.test(hostname));
}

function hasPathTraversal(value: string): boolean {
  try {
    return /\.\.\/|\.\.\\|%2e%2e/i.test(decodeURIComponent(value));
  } catch {
    return false;
  }
}

${this.includeAudit ? `// Audit logging (enabled)
const MAX_AUDIT_ENTRIES = 10000;
const auditLog: { ts: number; hash: string; url: string; action: string }[] = [];

export function getAuditLog() {
  return auditLog;
}

function logAudit(hash: string, url: string, action: string) {
  auditLog.push({ ts: Date.now(), hash, url, action });
  if (auditLog.length > MAX_AUDIT_ENTRIES) {
    auditLog.shift();
  }
}
` : `// Audit logging disabled
function logAudit(_hash: string, _url: string, _action: string) {
  // Audit logging disabled
}
`}
// Guard registry - keyed by CRC32 hash
export const guards: Record<string, {
  pattern: string;
  riskLevel: string;
  timeout: number;
  beforeExec: (ctx: GuardContext) => GuardResult;
}> = {

`;

    for (const a of this.patterns) {
      const esc = a.pattern.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      code += `  "${a.hash}": {
    pattern: "${esc}",
    riskLevel: "${a.riskLevel}",
    timeout: ${a.regexDoS ? 2 : this.timeout},
    beforeExec(ctx) {
      const warnings: string[] = [];
      let blocked: string | undefined;

      // Path traversal check
${a.pathTraversal ? `      if (hasPathTraversal(ctx.url)) {
        blocked = "Path traversal detected";
      }` : `      // No path traversal risk detected`}

      // SSRF check
${a.ssrfPotential ? `      try {
        const urlObj = new URL(ctx.url);
        if (isBlockedHost(urlObj.hostname)) {
          blocked = "SSRF blocked: internal hostname";
        }
      } catch {
        // Invalid URL, let it pass to pattern matching
      }` : `      // No SSRF risk detected`}

      // Open redirect check
${a.openRedirect ? `      if (ctx.groups.redirect || ctx.groups.next || ctx.groups.url) {
        warnings.push("Potential open redirect in pattern");
      }` : `      // No open redirect risk detected`}

      // Environment variable validation
${a.envVars.length > 0 ? `      const requiredEnvVars = ${JSON.stringify(a.envVars)};
      for (const envVar of requiredEnvVars) {
        const value = process.env[envVar];
        if (value !== undefined && /[@%\\$]/.test(value)) {
          blocked = \`Unsafe character in env var: \${envVar}\`;
        }
      }` : `      // No env vars in pattern`}

      // High-risk pattern warning
${a.riskLevel === "high" ? `      warnings.push("High-risk pattern requires review");\n` : ""}
      // Audit log
      logAudit("${a.hash}", ctx.url, blocked ? "blocked" : "allowed");

      return { allowed: !blocked, blocked, warnings };
    },
  },

`;
    }

    code += `};

// Safe execution wrapper with timeout
export function safeExec(pat: URLPattern, url: string, hash: string): URLPatternResult | null {
  const g = guards[hash];
  if (!g) {
    // No guard for this pattern, execute directly
    return pat.exec(url);
  }

  // Pre-execution security check
  const ctx: GuardContext = {
    url,
    groups: {},
    patternHash: hash,
  };
  const result = g.beforeExec(ctx);

  if (!result.allowed) {
    throw new Error(result.blocked || "Request blocked by security guard");
  }

  // Execute with timeout protection
  const start = Bun.nanoseconds();
  const execResult = pat.exec(url);
  const elapsed = (Bun.nanoseconds() - start) / 1_000_000;

  if (elapsed > g.timeout) {
    throw new Error(\`Pattern execution exceeded timeout (\${g.timeout}ms, took \${elapsed.toFixed(2)}ms)\`);
  }

  return execResult;
}

// Statistics
export const guardStats = {
  total: ${this.patterns.length},
  highRisk: ${high},
  mediumRisk: ${med},
  lowRisk: ${this.patterns.length - high - med},
  generated: "${ts}",
  envVars: ${JSON.stringify([...this.envVars])},
};

// Helper to create a guarded pattern matcher
export function createGuardedMatcher(pattern: string, baseUrl?: string) {
  const pat = new URLPattern(pattern, baseUrl);
  const hash = Bun.hash.crc32(pattern).toString(16).padStart(8, "0");

  return {
    match(url: string) {
      return safeExec(pat, url, hash);
    },
    test(url: string): boolean {
      return pat.test(url);
    },
    pattern,
    hash,
  };
}
`;

    return code;
  }

  async run() {
    console.error(`\x1b[1m🛡️  Generating URLPattern Security Guards\x1b[0m`);
    console.error(`   Bun: ${Bun.version} | URLPattern: ${typeof URLPattern !== "undefined" ? "✅" : "❌"}`);

    for await (const { pattern } of this.streamPatterns()) {
      this.patterns.push(this.analyze(pattern));
    }

    const code = this.generateCode();

    if (this.outputFile) {
      await Bun.write(this.outputFile, code);
      console.error(`\x1b[32m✅ Generated ${this.patterns.length} guards → ${this.outputFile}\x1b[0m`);
    } else {
      console.log(code);
    }

    const high = this.patterns.filter(p => p.riskLevel === "high").length;
    const med = this.patterns.filter(p => p.riskLevel === "medium").length;
    console.error(`   Risk distribution: \x1b[31m${high} high\x1b[0m, \x1b[33m${med} medium\x1b[0m, \x1b[32m${this.patterns.length - high - med} low\x1b[0m`);
    console.error(`   Environment variables: ${[...this.envVars].join(", ") || "none"}`);

    // Semver validation example
    const minVersion = "1.0.0";
    const satisfies = Bun.semver.satisfies(Bun.version, `>=${minVersion}`);
    console.error(`   Version check: Bun ${Bun.version} >= ${minVersion} = ${satisfies ? "✅" : "❌"}`);
  }
}

// CLI parsing
const args = new Set(Bun.argv.slice(2));
const getArg = (short: string, long: string) => args.has(short) || args.has(long);
const getStringArg = (flag: string): string | null => {
  const idx = Bun.argv.indexOf(flag);
  if (idx !== -1 && Bun.argv[idx + 1] && !Bun.argv[idx + 1].startsWith("-")) {
    return Bun.argv[idx + 1];
  }
  return null;
};
const getNumArg = (flag: string): number | null => {
  const idx = Bun.argv.indexOf(flag);
  if (idx !== -1 && Bun.argv[idx + 1]) {
    return parseInt(Bun.argv[idx + 1], 10);
  }
  return null;
};

const HELP = getArg("-h", "--help");
const STDIN = getArg("--stdin", "-");
const INPUT_FILE = getStringArg("--input") || getStringArg("-i");
const OUTPUT_FILE = getStringArg("--output") || getStringArg("-o");
const TIMEOUT = getNumArg("--timeout") || 5;
const NO_AUDIT = args.has("--no-audit");

if (HELP) {
  console.log(`
\x1b[1m🛡️  URLPattern Guard Generator\x1b[0m

\x1b[1mUSAGE:\x1b[0m
  cat routes.ndjson | bun guard-generator.ts [OPTIONS]
  bun guard-generator.ts -i routes.ndjson -o guards.ts [OPTIONS]

\x1b[1mOPTIONS:\x1b[0m
  -i, --input <file>    Input NDJSON file (one pattern per line)
  -o, --output <file>   Output TypeScript file
  --stdin, -            Read patterns from stdin
  --timeout <ms>        Guard timeout in ms (default: 5)
  --no-audit            Disable audit logging
  -h, --help            Show this help

\x1b[1mINPUT FORMAT:\x1b[0m
  {"pattern": "/api/:id"}
  {"pathname": "/users/:id", "baseUrl": "https://example.com"}
  /api/v1/:resource

\x1b[1mEXAMPLE:\x1b[0m
  echo '{"pattern":"/api/:id"}' | bun guard-generator.ts -o guards.ts
  cat routes.ndjson | bun guard-generator.ts --stdin --output guards.ts

\x1b[1mOUTPUT:\x1b[0m
  TypeScript file with:
  - guards{} registry (pattern → security guard)
  - safeExec() wrapper with timeout
  - createGuardedMatcher() helper
  - GuardContext/GuardResult types
  - Audit logging (optional)
`);
  process.exit(0);
}

if (!INPUT_FILE && !STDIN) {
  console.error("\x1b[31mError: --input file or --stdin required\x1b[0m");
  console.error("Usage: cat routes.ndjson | bun guard-generator.ts --stdin -o guards.ts");
  process.exit(1);
}

new GuardGenerator(INPUT_FILE, OUTPUT_FILE, TIMEOUT, !NO_AUDIT).run();
