#!/usr/bin/env bun
/**
 * Bun Documentation Manager — Proper Single-File Build
 *
 * Uses Bun.build() on a JS entrypoint + assembles a true single-file HTML.
 * Supports configuration via constants + CLI arguments.
 */

import { mkdirSync } from "node:fs";
import { join, relative } from "node:path";

// ============================================
// Configuration (can be overridden via CLI)
// ============================================

const CONFIG = {
  // Official source recommended in Bun's own documentation (Bun.serve section)
  sourceUrl: "https://bun.com/docs/llms.txt",
  outputDir: "dist",
  outputFilename: "bun-docs.html",
  generateRegistryJson: true,
  minify: true,
  verbose: false,
  timeout: 30000,
  proxy: undefined as string | undefined,
  insecure: false,
  dryRun: false,
  tlsCa: undefined as string | undefined,
  tlsCert: undefined as string | undefined,
  tlsKey: undefined as string | undefined,

  // Serve mode (Bun.serve showcase)
  serve: false,
  port: 0,
  hostname: "0.0.0.0",
  watch: false,   // Hot route reloading via server.reload()

  // Bundler options (bun build showcase)
  env: undefined as "inline" | `${string}*` | "disable" | undefined,
  sourcemap: undefined as "none" | "inline" | "linked" | "external" | undefined,

  // Performance (new fetch performance APIs)
  preconnect: false, // Use fetch.preconnect before the main request

  // Dev server features
  console: false, // Echo browser console.* to terminal (like `bun --console`)
  websocket: false, // WebSocket demo: upgrade with custom headers (req.headers + server.upgrade({headers})), WebSocketHandler, pub/sub, subscriberCount

  // Lifecycle & tuning
  idleTimeout: 60, // seconds, 0 = disabled, max 255
  unref: false, // call server.unref() instead of server.ref()

  // Per-request timeout demo (server.timeout API for long-lived connections like SSE)
  idleTimeoutPerRequest: 0, // seconds; 0 disables timeout for that specific request (via server.timeout(req, 0))
};

// ============================================
// CLI Argument Parser (Bun-style)
// ============================================

function parseArgs(args: string[]) {
  const cli: Record<string, string | boolean> = {};

  for (let i = 2; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--")) {
      const key = arg.slice(2);

      if (key.startsWith("no-")) {
        // --no-registry → { registry: false }
        cli[key.slice(3)] = false;
      } else if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        cli[key] = args[++i];
      } else {
        cli[key] = true;
      }
    }
  }

  return cli;
}

function printHelp() {
  console.log(`
Bun Documentation Generator — powered by Bun's native fetch + Bun.build() + Bun.serve()

A practical showcase of Bun's networking (fetch/serve) and bundler capabilities.

USAGE:
  bun run generate [options]

OPTIONS:
  --source <url>          Documentation index source
                          Default: https://bun.com/docs/llms.txt
                          Supports: https://, http://, file://, or local path (./foo.txt)

  --outdir <dir>          Output directory (default: dist)
  --filename <file>       Output HTML filename (default: bun-docs.html)

  --registry              Emit bun-docs-registry.json (use --no-registry to disable)
  --minify                Minify JS bundle (use --no-minify to disable)

  Bundler options (Bun.build):
  --env <mode>            Environment variable handling: inline | PUBLIC_* | disable
  --sourcemap <type>      Generate sourcemaps: none | linked | external | inline

  Performance (fetch):
  --preconnect            Call fetch.preconnect() before the main request (DNS + TCP + TLS warmup)

  Dev server (Bun.serve + full Server interface):
  --serve                 Start a Bun.serve dev server after generating
  --port <number>         Port for --serve (default: random available port)
  --watch                 Enable hot-reloading via server.reload() + graceful shutdown on Ctrl+C
  --console               Enable Bun's native 'development: { console: true }' + /__shutdown endpoint
  --ws, --websocket       Enable WebSocket demo (/ws + /api/ws-status): server.upgrade(req, {headers, data}), reading req.headers, Bun client new WebSocket(..., {headers}), pub/sub + subscriberCount
  --idle-timeout <sec>    Set Bun.serve idleTimeout (default: 60, 0 = disabled)
  --unref                 Call server.unref() so the server doesn't keep the process alive
  --idle-timeout-per-request <sec>
                          Demo server.timeout(req, sec) for long-lived routes (SSE/long-poll). 0 = no timeout on that req (default)

  --verbose               Enable Bun fetch header logging (primary debugging tool)
  --dry-run, --check      Connection test only — no HTML generation (highly recommended for debugging)
  --timeout <ms>          AbortSignal timeout (default: 30000)

  --proxy <url>           HTTP/S proxy (e.g. http://proxy.company:3128)
  --insecure              Disable TLS cert validation (self-signed dev certs)

  Advanced TLS (reads files and passes to Bun fetch):
  --tls-ca <file>         CA certificate bundle
  --tls-cert <file>       Client certificate
  --tls-key <file>        Client private key

  --help, -h              Show this help

DEBUGGING WORKFLOW (when you get ConnectionRefused / FailedToOpenSocket):
  1. bun run generate --source "https://your-host/llms.txt" --dry-run --verbose
  2. bun run generate --source ./local-llms.txt --dry-run --verbose     (test locally)
  3. Once dry-run succeeds → run the real build

EXAMPLES:
  # Normal generation
  bun run generate

  # Debug a remote custom source
  bun run generate --source "https://internal.company/bun-llm.txt" --dry-run --verbose

  # Test a local markdown file (uses Bun fetch file:// under the hood)
  bun run generate --source ./my-llm.txt --dry-run --verbose

  # Generate + serve with hot route reloading (server.reload() demo)
  bun run generate --serve --watch --port 5173

  # Use bundler features
  bun run generate --env inline --sourcemap linked
  bun run generate --env "PUBLIC_*" --sourcemap inline

  # Performance optimizations (new fetch APIs)
  bun run generate --preconnect --verbose
  bun run generate --preconnect --serve --watch

  # Full-featured dev server showcasing the entire Server interface + lifecycle flags
  bun run generate --serve --console --ws --watch --idle-timeout 120 --idle-timeout-per-request 0 --unref

  # Corporate proxy + self-signed cert
  bun run generate --source "https://internal.company/..." \\
    --proxy "http://proxy:3128" --insecure --verbose

  # Full advanced TLS client certificate auth
  bun run generate --source "https://secure.company/..." \\
    --tls-ca ./ca.pem --tls-cert ./client.crt --tls-key ./client.key

The tool demonstrates real-world usage of Bun's extended fetch API and the complete Bun.serve Server interface:
  - fetch (verbose, proxy, tls, preconnect, AbortSignal, file://)
  - Bun.serve + Server: routes + websocket handler, server.reload(), server.stop() (graceful + force),
    server.ref()/unref(), server.requestIP(), pendingRequests/pendingWebSockets, server.timeout(req, sec),
    server.upgrade(req, { headers?, data? }) — custom request + response headers on WS handshake,
    server.publish(), subscriberCount(), idleTimeout + per-request overrides.
  - Plus Bun.build (env, sourcemaps) and native dev console streaming.
`);
}

const args = parseArgs(Bun.argv);

// Handle --help / -h early (before any other work)
if (args.help || args.h) {
  printHelp();
  process.exit(0);
}

// ============================================
// Source URL Normalization (supports HTTP, file://, and local paths)
// ============================================

function normalizeSourceUrl(raw: string): string {
  // Already has a protocol → use as-is (http, https, file, data, s3, etc.)
  if (raw.includes("://")) {
    return raw;
  }

  // Looks like a local file path (./foo, /abs, ../, or ends with common doc extensions)
  const looksLikePath =
    raw.startsWith(".") ||
    raw.startsWith("/") ||
    raw.includes("/") ||
    raw.endsWith(".txt") ||
    raw.endsWith(".md") ||
    raw.endsWith(".markdown");

  if (looksLikePath) {
    try {
      const absPath = raw.startsWith("/") ? raw : join(process.cwd(), raw);
      return Bun.pathToFileURL(absPath).href;
    } catch {
      return raw; // let fetch fail with a clear error later
    }
  }

  return raw;
}

const rawSource = (args.source as string) || CONFIG.sourceUrl;
const normalizedSourceUrl = normalizeSourceUrl(rawSource);

// Merge CLI arguments over defaults (with normalized source)
const mergedConfig = {
  sourceUrl: normalizedSourceUrl,
  outputDir: (args.outdir as string) || CONFIG.outputDir,
  outputFilename: (args.filename as string) || CONFIG.outputFilename,
  generateRegistryJson: args.registry !== undefined ? (args.registry as boolean) : CONFIG.generateRegistryJson,
  minify: args.minify !== undefined ? (args.minify as boolean) : CONFIG.minify,
  verbose: args.verbose !== undefined ? (args.verbose as boolean) : CONFIG.verbose,
  timeout: args.timeout ? parseInt(args.timeout as string, 10) : CONFIG.timeout,
  proxy: (args.proxy as string) || CONFIG.proxy,
  insecure: args.insecure !== undefined ? (args.insecure as boolean) : CONFIG.insecure,
  dryRun:
    args["dry-run"] !== undefined ? (args["dry-run"] as boolean) :
    args.dryRun !== undefined ? (args.dryRun as boolean) :
    args.check !== undefined ? (args.check as boolean) :
    CONFIG.dryRun,
  tlsCa: (args["tls-ca"] as string) || (args.tlsCa as string) || CONFIG.tlsCa,
  tlsCert: (args["tls-cert"] as string) || (args.tlsCert as string) || CONFIG.tlsCert,
  tlsKey: (args["tls-key"] as string) || (args.tlsKey as string) || CONFIG.tlsKey,

  // Serve mode
  serve: args.serve !== undefined ? (args.serve as boolean) : CONFIG.serve,
  port: args.port ? parseInt(args.port as string, 10) : CONFIG.port,
  hostname: (args.hostname as string) || CONFIG.hostname,
  watch: args.watch !== undefined ? (args.watch as boolean) : CONFIG.watch,

  // Bundler options
  env: (args.env as any) || CONFIG.env,
  sourcemap: (args.sourcemap as any) || CONFIG.sourcemap,

  // Performance
  preconnect: args.preconnect !== undefined ? (args.preconnect as boolean) : CONFIG.preconnect,

  // Dev server
  console: args.console !== undefined ? (args.console as boolean) : CONFIG.console,
  websocket: (args.websocket !== undefined ? (args.websocket as boolean) :
              args.ws !== undefined ? (args.ws as boolean) : CONFIG.websocket),

  // Lifecycle & tuning
  idleTimeout: args["idle-timeout"]
    ? parseInt(args["idle-timeout"] as string, 10)
    : CONFIG.idleTimeout,
  unref: args.unref !== undefined ? (args.unref as boolean) : CONFIG.unref,
  idleTimeoutPerRequest: args["idle-timeout-per-request"]
    ? parseInt(args["idle-timeout-per-request"] as string, 10)
    : CONFIG.idleTimeoutPerRequest,
};

// ============================================
// Paths (relative to this script)
// ============================================

const ROOT = import.meta.dir;
const OUT_DIR = join(ROOT, mergedConfig.outputDir);
const SHELL_PATH = join(ROOT, "src/shell.html");
const DASHBOARD_JS_PATH = join(ROOT, "src/dashboard.js");

// ============================================
// Types
// ============================================

interface DocPage {
  title: string;
  url: string;
  category: string;
  subcategory?: string;
  description?: string;
  isBundlerRelated: boolean;

  // Enriched metadata (populated when using HTMLRewriter)
  image?: string;
  siteName?: string;
  type?: string;
}

// ============================================
// Bundler Detection
// ============================================

function isBundlerRelated(title: string, url: string, description: string, category?: string, subcategory?: string) {
  const text = `${title} ${description} ${category || ""} ${subcategory || ""}`.toLowerCase();
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes("/bundler/")) return true;

  const knownBundlerPages = [
    "bundler", "loaders", "plugins", "minifier", "macros",
    "bytecode caching", "bytecode", "esbuild", "single-file executable",
    "fullstack dev server", "hot reloading", "html & static sites",
    "standalone html", "css", "hot module replacement",
  ];
  if (knownBundlerPages.some((p) => text.includes(p))) return true;

  const bundlerCategoryTerms = ["bundler", "loaders", "plugins", "minifier", "macros", "executables", "bytecode", "fullstack"];
  if (bundlerCategoryTerms.some((t) => (category || "").toLowerCase().includes(t))) return true;
  if (bundlerCategoryTerms.some((t) => (subcategory || "").toLowerCase().includes(t))) return true;

  const strongKeywords = [
    "bun build", "bun.build", "bunbuild", "code splitting", "tree shaking",
    "dead code elimination", "sourcemap", "metafile", "publicpath",
    "html loader", "css loader", "bytecode", "optimize imports",
  ];
  if (strongKeywords.some((kw) => text.includes(kw))) return true;

  const generalTerms = ["bundler", "loader", "plugin", "macro", "minify", "build", "target", "format", "drop", "features"];
  if (generalTerms.some((term) => text.includes(term))) {
    if (text.includes("bun") || text.includes("build") || lowerUrl.includes("build")) {
      return true;
    }
  }

  return false;
}

// ============================================
// Connection Test / Dry-Run (for debugging custom sources)
// ============================================

async function testConnection(opts: FetchOptions = {}): Promise<void> {
  const { verbose = true, timeout = 15000, proxy, insecure = false, tlsCa, tlsCert, tlsKey } = opts;
  const url = mergedConfig.sourceUrl;

  const isLocalFile = url.startsWith("file://");
  console.log(`\n🧪 Connection test (dry-run) for: ${url}`);
  console.log(`   Timeout: ${timeout}ms  |  Verbose: ${verbose}  |  Insecure: ${insecure}`);
  if (isLocalFile) console.log(`   📁 Local file source`);
  if (proxy) console.log(`   Proxy: ${proxy}`);
  if (tlsCa || tlsCert || tlsKey) console.log(`   TLS client certs: ca=${!!tlsCa} cert=${!!tlsCert} key=${!!tlsKey}`);

  // Demonstrate fetch.preconnect in dry-run mode too
  if (!isLocalFile) {
    console.log(`   ⚡ Calling fetch.preconnect before test...`);
    try { fetch.preconnect(url); } catch {}
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const fetchOptions: any = {
    method: "GET",
    signal: controller.signal,
    headers: {
      "User-Agent": "BunDocs-DryRun/1.0",
      "Accept": "*/*",
    },
  };

  if (verbose) fetchOptions.verbose = true;
  if (proxy) fetchOptions.proxy = proxy;

  // TLS (same logic as main fetch path)
  const tlsOptions: any = {};
  if (insecure) tlsOptions.rejectUnauthorized = false;
  if (tlsCa) tlsOptions.ca = await Bun.file(tlsCa).text();
  if (tlsCert) tlsOptions.cert = await Bun.file(tlsCert).text();
  if (tlsKey) tlsOptions.key = await Bun.file(tlsKey).text();
  if (Object.keys(tlsOptions).length > 0) fetchOptions.tls = tlsOptions;

  const start = Date.now();

  try {
    console.log(`\n→ Attempting fetch...`);
    const res = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    const elapsed = Date.now() - start;
    console.log(`\n✅ Connection successful in ${elapsed}ms`);
    console.log(`   Status: ${res.status} ${res.statusText}`);
    console.log(`   Headers received:`);

    // Print a few interesting headers
    const interesting = ["content-type", "content-length", "server", "date", "x-vercel-id", "cf-ray"];
    for (const [k, v] of res.headers) {
      if (interesting.some((h) => k.toLowerCase().includes(h))) {
        console.log(`     ${k}: ${v}`);
      }
    }

    // Consume a small amount of the body so we don't leave the socket hanging
    const preview = await res.text();
    const previewLen = Math.min(preview.length, 200);
    console.log(`\n   Body preview (${previewLen} chars):`);
    console.log(`   ${preview.slice(0, previewLen).replace(/\n/g, " ")}${preview.length > previewLen ? "..." : ""}`);

    console.log(`\n💡 The connection works. You can now run the full generation without --dry-run.`);
  } catch (err: any) {
    clearTimeout(timeoutId);
    const elapsed = Date.now() - start;

    console.error(`\n❌ Connection test failed after ${elapsed}ms`);
    console.error(`   Error: ${err?.message || err}`);

    const msg = String(err?.message || err || "").toLowerCase();

    if (msg.includes("failedtoopensocket") || msg.includes("connectionrefused") || msg.includes("econnrefused")) {
      console.error(`\n   🔴 FailedToOpenSocket / ConnectionRefused — the server is unreachable from this machine.`);
      console.error(`      • Wrong hostname, server not running, or wrong port/protocol`);
      console.error(`      • Corporate proxy / firewall / DNS issue`);
    }

    if (msg.includes("abort") || msg.includes("timeout")) {
      console.error(`\n   ⏱️  Request timed out. The remote server did not respond in time.`);
    }

    console.error(`\n   Recommended next steps:`);
    console.error(`     1. The --verbose output above (if any) usually shows the exact connection attempt`);
    console.error(`     2. Try the official known-good source:`);
    console.error(`        bun run generate --dry-run --source "https://bun.com/llm.txt" --verbose`);
    console.error(`     3. Use curl from the exact same terminal:`);
    console.error(`        curl -vI "${url}"`);

    if (proxy) {
      console.error(`\n   ⚠️  You are going through a proxy — verify the proxy itself is reachable.`);
    }
  }
}

// ============================================
// Fetch & Parse Documentation Index
// ============================================

interface FetchOptions {
  verbose?: boolean;
  timeout?: number;
  proxy?: string;
  insecure?: boolean;
  tlsCa?: string;
  tlsCert?: string;
  tlsKey?: string;
}

async function fetchDocsIndex(opts: FetchOptions = {}): Promise<DocPage[]> {
  const { verbose = false, timeout = 30000, proxy, insecure = false, tlsCa, tlsCert, tlsKey } = opts;

  const isLocalFile = mergedConfig.sourceUrl.startsWith("file://");

  // Performance optimization from Bun docs: preconnect before the actual request
  if (mergedConfig.preconnect && !isLocalFile) {
    console.log(`   ⚡ Preconnecting to host (fetch.preconnect)...`);
    try {
      fetch.preconnect(mergedConfig.sourceUrl);
    } catch {}
  }

  console.log(`📥 Fetching Bun documentation index from ${mergedConfig.sourceUrl}...`);
  if (isLocalFile) console.log(`   📁 Local file source (Bun fetch file:// protocol)`);
  if (verbose) console.log(`   🔍 Verbose mode enabled — Bun will print request/response headers`);
  if (insecure) console.log(`   ⚠️  TLS certificate validation disabled (--insecure)`);
  if (tlsCa || tlsCert || tlsKey) console.log(`   🔐 Using client TLS certificates (ca/cert/key)`);
  if (mergedConfig.preconnect && !isLocalFile) console.log(`   ⚡ Preconnect was called before fetch`);

  const fetchOptions: RequestInit & {
    verbose?: boolean;
    proxy?: string;
    tls?: { rejectUnauthorized?: boolean; ca?: string; cert?: string; key?: string };
  } = {
    headers: {
      "User-Agent": "BunDocs/1.0 (+https://github.com/bun-docs)",
      "Accept": "text/plain, text/markdown, */*",
    },
  };

  if (verbose) fetchOptions.verbose = true;
  if (proxy) fetchOptions.proxy = proxy;

  // Build TLS options object for Bun fetch (supports client certificates, custom CA, etc.)
  const tlsOptions: { rejectUnauthorized?: boolean; ca?: string; cert?: string; key?: string } = {};

  if (insecure) {
    tlsOptions.rejectUnauthorized = false;
  }
  if (tlsCa) tlsOptions.ca = await Bun.file(tlsCa).text();
  if (tlsCert) tlsOptions.cert = await Bun.file(tlsCert).text();
  if (tlsKey) tlsOptions.key = await Bun.file(tlsKey).text();

  if (Object.keys(tlsOptions).length > 0) {
    fetchOptions.tls = tlsOptions;
  }

  // Support timeout via AbortSignal (recommended Bun pattern)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  fetchOptions.signal = controller.signal;

  try {
    const res = await fetch(mergedConfig.sourceUrl, fetchOptions);
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} from ${mergedConfig.sourceUrl}`);
    }

    const markdown = await res.text();

    const pages: DocPage[] = [];
    let currentMain = "General";
    let currentSub: string | undefined;

    for (const line of markdown.split("\n")) {
      const trimmed = line.trim();

      if (trimmed.startsWith("## ") && !trimmed.includes("http")) {
        currentMain = trimmed.replace("## ", "").trim();
        currentSub = undefined;
        continue;
      }
      if (trimmed.startsWith("### ") && !trimmed.includes("http")) {
        currentSub = trimmed.replace("### ", "").trim();
        continue;
      }

      const match = trimmed.match(/^- \[(.*?)\]\((https?:\/\/bun\.com\/docs\/[^)]+)\)(?::\s*(.*))?$/);
      if (match) {
        const [, title, url, desc] = match;
        const isBundler = isBundlerRelated(title, url, desc || "", currentMain, currentSub);

        pages.push({
          title,
          url,
          category: currentMain,
          subcategory: currentSub,
          description: desc?.trim(),
          isBundlerRelated: isBundler,
        });
      }
    }

    return pages;
  } catch (err: any) {
    clearTimeout(timeoutId);

    const url = mergedConfig.sourceUrl;
    const isDefaultUrl = url === "https://bun.com/llm.txt";

    console.error(`\n❌ Fetch failed for: ${url}`);
    console.error(`   Error: ${err?.message || err}`);

    // Bun-specific error detection (ConnectionRefused, FailedToOpenSocket, etc.)
    const msg = String(err?.message || err || "").toLowerCase();
    const code = err?.code || err?.name || "";

    if (msg.includes("failedtoopensocket") || msg.includes("connectionrefused") || msg.includes("econnrefused") || code === "ConnectionRefused") {
      console.error(`\n   🔴 This is a classic "FailedToOpenSocket / ConnectionRefused" error.`);
      console.error(`   Common causes:`);
      console.error(`     • The hostname is wrong or the server is not running`);
      console.error(`     • Wrong port or protocol (http vs https)`);
      console.error(`     • Corporate proxy / firewall is blocking the connection`);
      console.error(`     • DNS resolution failure for the custom domain`);
    }

    if (msg.includes("timeout") || msg.includes("abort")) {
      console.error(`\n   ⏱️  The request timed out after ${timeout}ms.`);
      console.error(`   Try increasing the timeout with --timeout 60000`);
    }

    console.error(`\n   🛠️  Debugging steps (from Bun fetch docs):`);
    console.error(`     1. Use --dry-run (best first step) — it performs a minimal fetch and prints diagnostics:`);
    console.error(`        bun run generate --source "${url}" --dry-run --verbose`);
    console.error(`     2. Re-run the full command with --verbose to see raw headers`);
    console.error(`     3. Test the same URL from this terminal:`);
    console.error(`        curl -I "${url}"`);
    console.error(`     4. Verify with the official known-good source:`);
    console.error(`        bun run generate --dry-run --source "https://bun.com/llm.txt"`);

    if (!isDefaultUrl) {
      console.error(`\n   💡 You are using a custom --source URL.`);
      console.error(`   The default working source is: https://bun.com/llm.txt`);
      console.error(`   Make sure your custom endpoint returns valid markdown in the same format.`);
    }

    console.error(`\n   Bun fetch supports powerful options for custom setups:`);
    console.error(`     • --dry-run          (recommended: minimal connection test + diagnostics)`);
    console.error(`     • --verbose          (prints all request/response headers)`);
    console.error(`     • --proxy <url>      (route through corporate HTTP proxy)`);
    console.error(`     • --timeout <ms>     (AbortSignal based timeout, default 30s)`);
    console.error(`     • --insecure         (disable TLS cert validation for self-signed dev certs)`);
    console.error(`     • TLS customization via code (client certs, ca, rejectUnauthorized, etc.)\n`);

    throw new Error(`Failed to fetch documentation index from ${url}`);
  }
}

// ============================================
// Main Generation Logic
// ============================================

async function main() {
  // Dry-run / connection test mode — extremely useful when debugging custom sources
  if (mergedConfig.dryRun) {
    await testConnection({
      verbose: mergedConfig.verbose,
      timeout: mergedConfig.timeout,
      proxy: mergedConfig.proxy,
      insecure: mergedConfig.insecure,
      tlsCa: mergedConfig.tlsCa,
      tlsCert: mergedConfig.tlsCert,
      tlsKey: mergedConfig.tlsKey,
    });
    return;
  }

  const pages = await fetchDocsIndex({
    verbose: mergedConfig.verbose,
    timeout: mergedConfig.timeout,
    proxy: mergedConfig.proxy,
    insecure: mergedConfig.insecure,
    tlsCa: mergedConfig.tlsCa,
    tlsCert: mergedConfig.tlsCert,
    tlsKey: mergedConfig.tlsKey,
  });
  console.log(`✅ Parsed ${pages.length} pages`);

  mkdirSync(OUT_DIR, { recursive: true });

  const registryData = {
    meta: {
      generated_at: new Date().toISOString(),
      total: pages.length,
      bundler_pages: pages.filter((p) => p.isBundlerRelated).length,
    },
    pages,
  };

  // 1. Build the JS bundle with Bun.build()
  console.log("🛠️  Bundling dashboard JS with Bun.build()...");

  const buildOptions: any = {
    entrypoints: [DASHBOARD_JS_PATH],
    define: {
      __BUN_DOCS_DATA__: JSON.stringify(registryData),
    },
    minify: mergedConfig.minify,
    target: "browser",
  };

  // Expose new bundler features (env + sourcemap)
  if (mergedConfig.env) {
    buildOptions.env = mergedConfig.env;
    console.log(`   env: ${mergedConfig.env}`);
  }
  if (mergedConfig.sourcemap && mergedConfig.sourcemap !== "none") {
    buildOptions.sourcemap = mergedConfig.sourcemap;
    console.log(`   sourcemap: ${mergedConfig.sourcemap}`);
  }

  const buildResult = await Bun.build(buildOptions);

  if (!buildResult.success) {
    console.error(buildResult.logs);
    throw new Error("Bun.build failed");
  }

  const bundledJS = await buildResult.outputs[0].text();
  console.log(`   Bundled JS: ${(bundledJS.length / 1024).toFixed(1)} KB`);

  // 2. Assemble final single-file HTML
  const shell = await Bun.file(SHELL_PATH).text();
  const finalHTML = shell.replace("</body>", `<script>${bundledJS}</script>\n</body>`);

  const finalPath = join(OUT_DIR, mergedConfig.outputFilename);
  await Bun.write(finalPath, finalHTML);

  // 3. Optionally write the registry JSON
  if (mergedConfig.generateRegistryJson) {
    const registryPath = join(OUT_DIR, "bun-docs-registry.json");
    await Bun.write(registryPath, JSON.stringify(registryData, null, 2));
    console.log(`   📦 Wrote registry: ${relative(ROOT, registryPath)}`);
  }

  // 4. Clean up leftover build artifacts
  await Bun.write(join(OUT_DIR, "index.html"), "");

  // Clean up chunk files
  const chunkFiles = await Array.fromAsync(new Bun.Glob("chunk-*.js").scan({ cwd: OUT_DIR }));
  for (const file of chunkFiles) {
    await Bun.write(join(OUT_DIR, file), "");
  }

  // Clean up sourcemap files unless the user explicitly asked for them
  if (!mergedConfig.sourcemap || mergedConfig.sourcemap === "none") {
    const mapFiles = await Array.fromAsync(new Bun.Glob("*.js.map").scan({ cwd: OUT_DIR }));
    for (const file of mapFiles) {
      await Bun.write(join(OUT_DIR, file), "");
    }
  }

  console.log(`\n✅ Successfully created single-file dashboard!`);
  console.log(`   📄 ${finalPath}`);
  console.log(`   📦 ${pages.length} pages • ${registryData.meta.bundler_pages} Bundler-related`);

  if (mergedConfig.sourcemap && mergedConfig.sourcemap !== "none") {
    console.log(`   🗺️  Sourcemap mode: ${mergedConfig.sourcemap}`);
  }

  console.log(`\n   Open it with:`);
  console.log(`   open ${finalPath}`);

  if (mergedConfig.serve) {
    const regPath = mergedConfig.generateRegistryJson ? join(OUT_DIR, "bun-docs-registry.json") : null;
    await startServer(finalPath, regPath, registryData, mergedConfig.watch, mergedConfig.console, mergedConfig.websocket);
  }
}

// Bun.serve showcase (modern routes API + server.reload() hot reloading)
async function startServer(
  htmlPath: string,
  registryPath: string | null,
  registryData: any,
  enableWatch = false,
  enableConsole = false,
  enableWebSocket = false
) {
  const idleTimeout = mergedConfig.idleTimeout;
  const idleTimeoutPerRequest = mergedConfig.idleTimeoutPerRequest;
  const shouldUnref = mergedConfig.unref;
  const port = mergedConfig.port || 0;
  const hostname = mergedConfig.hostname;

  console.log(`\n🚀 Starting Bun.serve using routes API (from the docs you pasted)...`);

  // Simple request logger for visibility (especially useful with --watch)
  // Logs a structured object so Bun's console pretty-prints it nicely.
  function logRequest(req: Request) {
    const url = new URL(req.url);
    console.log({
      type: "request",
      method: req.method,
      path: url.pathname,
      time: new Date().toISOString().slice(11, 23),
    });
  }

  // WebSocket pub/sub handler (defined here so it can be attached to Bun.serve and
  // close over wsServerRef for publish + subscriberCount access inside callbacks).
  // This is only constructed when --ws is passed; otherwise Bun.serve stays lean.
  const wsServerRef = { current: null as any };
  let websocketHandler: any = undefined;
  if (enableWebSocket) {
    websocketHandler = {
      open(ws: any) {
        const room = "demo-room";
        ws.subscribe(room);

        const count = wsServerRef.current?.subscriberCount?.(room) ?? 0;
        const info = ws.data ? ` (IP: ${ws.data.clientIP})` : "";

        // Include header demo info in the first message sent to the client
        const headerInfo = ws.data?.receivedUpgradeHeaders
          ? { receivedClientHeaders: ws.data.receivedUpgradeHeaders, upgradeResponseHeaders: ws.data.sentUpgradeResponseHeaders }
          : {};

        ws.send(
          JSON.stringify({
            type: "welcome",
            room,
            subscriberCount: count,
            message:
              "Connected to Bun WebSocket demo room. All messages broadcast via server.publish() + topics. This client also received a direct echo via ws.send().",
            ...headerInfo,
            headerDemoNote: "See /api/ws-status and modal for custom upgrade headers (req.headers + server.upgrade headers option + Bun client new WebSocket(url, {headers})).",
          })
        );

        console.log(`[WebSocket] Client joined${info} — room=${room} subscriberCount=${count}`);
        if (ws.data?.receivedUpgradeHeaders) {
          console.log(`[WebSocket] Upgrade headers received from client:`, ws.data.receivedUpgradeHeaders);
        }
      },
      message(ws: any, message: string | ArrayBuffer) {
        const text =
          message instanceof ArrayBuffer
            ? new TextDecoder().decode(message)
            : String(message);

        // 1. Direct reply using ws.send() (the simple echo path)
        ws.send(
          JSON.stringify({
            type: "echo",
            received: text,
            timestamp: Date.now(),
          })
        );

        // 2. Broadcast to the entire room using server.publish() (the powerful pub/sub path)
        // Every subscriber (including this one) will receive the 'broadcast' message.
        if (wsServerRef.current) {
          wsServerRef.current.publish(
            "demo-room",
            JSON.stringify({
              type: "broadcast",
              message: text,
              timestamp: Date.now(),
            })
          );
        }
      },
      close(ws: any, code: number, reason: string) {
        console.log(`[WebSocket] Client left (code=${code})`);
      },
    };
  }

  // Helper to build a fresh routes object (critical for reload())
  async function createRoutes() {
    const htmlFile = Bun.file(htmlPath);
    const regFile = registryPath ? Bun.file(registryPath) : null;

    return {
      "/": htmlFile,
      "/index.html": htmlFile,
      "/registry.json": regFile || new Response("No registry", { status: 404 }),
      "/api/registry": regFile || new Response("No registry", { status: 404 }),

      "/api/status": (req, srv) => {
        logRequest(req);
        const ip = srv.requestIP(req);
        return Response.json({
          status: "ok",
          url: srv.url.toString(),
          pendingRequests: srv.pendingRequests,
          pendingWebSockets: srv.pendingWebSockets,
          client: ip?.address,
        });
      },

      "/api/page/:slug": (req) => {
        logRequest(req);
        const page = registryData.pages.find((p: any) => p.url.includes(req.params.slug));
        return page ? Response.json(page) : new Response("Not found", { status: 404 });
      },

      "/api/echo": {
        POST: async (req) => {
          logRequest(req);
          return Response.json({ echo: await req.json().catch(() => ({})) });
        },
        GET: (req) => {
          logRequest(req);
          return Response.json({ ok: true });
        },
      },

      // ============================================================
      // DEMO: Per-request timeout via server.timeout(req, seconds)
      // ============================================================
      // This showcases Bun.serve's powerful per-request idle timeout control.
      // Unlike the global `idleTimeout` option (set on Bun.serve()), this lets you
      // dynamically extend (or disable) the timeout for *individual* long-lived requests.
      //
      // Use cases: Server-Sent Events (SSE), WebSockets, long-polling, chunked uploads,
      // or any connection that legitimately stays open longer than the default idleTimeout.
      //
      // Call: server.timeout(req, 0)  → disables timeout for this req (infinite keep-alive)
      //       server.timeout(req, 300) → 5 minutes for this specific connection
      //
      // The route also accepts ?timeout=NN query param for live experimentation.
      // Try: curl -N http://localhost:PORT/api/sse?timeout=0
      // Or in browser: new EventSource('/api/sse')
      "/api/sse": (req, server) => {
        logRequest(req);

        const url = new URL(req.url);
        const timeoutSec = url.searchParams.has("timeout")
          ? parseInt(url.searchParams.get("timeout") || "0", 10)
          : idleTimeoutPerRequest;

        // ★ THE CORE API DEMO
        server.timeout(req, timeoutSec);

        console.log(`   [SSE] server.timeout(req, ${timeoutSec}) — per-request idle timeout ${timeoutSec === 0 ? "disabled" : `set to ${timeoutSec}s`}`);

        const encoder = new TextEncoder();
        let eventId = 0;
        let intervalId: ReturnType<typeof setInterval> | null = null;

        const stream = new ReadableStream({
          start(controller) {
            // Initial handshake event
            controller.enqueue(
              encoder.encode(`id: ${eventId++}\ndata: connected (per-request timeout=${timeoutSec}s via server.timeout)\n\n`)
            );

            // Emit "heartbeat" events every second to simulate real-time updates.
            // This keeps the connection long-lived. The server.timeout() call above ensures
            // the server's global idleTimeout does not terminate it prematurely.
            intervalId = setInterval(() => {
              if (eventId > 20) {
                // Safety limit for the demo (prevents infinite streams in test runs).
                // In production SSE you'd omit this and let client disconnect / server push forever.
                if (intervalId) {
                  clearInterval(intervalId);
                  intervalId = null;
                }
                try {
                  controller.enqueue(encoder.encode(`id: ${eventId++}\ndata: [demo] 20 events sent — stream closed by server (try ?timeout=300 for longer)\n\n`));
                  controller.close();
                } catch {}
                return;
              }
              try {
                controller.enqueue(
                  encoder.encode(
                    `id: ${eventId++}\ndata: ${new Date().toISOString()} — live event #${eventId} (kept alive by server.timeout(req, ${timeoutSec}))\n\n`
                  )
                );
              } catch (e) {
                // Controller closed (e.g. client disconnected) — stop timer
                if (intervalId) {
                  clearInterval(intervalId);
                  intervalId = null;
                }
              }
            }, 1000);
          },
          cancel() {
            // Critical: stop the interval when client disconnects, otherwise
            // later ticks will try to .enqueue() on a closed controller and throw.
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      },

      // ============================================================
      // WebSocket demo (only enabled with --ws or --websocket)
      // ============================================================
      // Educational showcase of Bun's first-class WebSocket support + **custom headers on upgrade**:
      // - Read incoming headers from the original HTTP upgrade request using `req.headers.get(name)`
      //   (Authorization, X-Client-Id, User-Agent, Cookie, or any custom header the client sends).
      // - `server.upgrade(req, { headers: { 'X-Foo': 'bar', 'Set-Cookie': '...' }, data })`
      //   sends custom headers back in the 101 Switching Protocols response.
      // - Client side (Bun runtime): `new WebSocket(url, { headers: { 'Authorization': 'Bearer ...' } })`
      //   — the headers arrive in `req.headers` on the server during the /ws route.
      // - Browser clients have restrictions (can't set arbitrary headers on WebSocket for security),
      //   but the demo supports query params (?x-client-id=...) as a convenient way to simulate in the UI tester.
      // - Everything integrates with the existing pub/sub room, ws.data, publish, and subscriberCount.
      // Works seamlessly alongside routes + SSE + console streaming.
      ...(enableWebSocket
        ? {
            "/ws": (req, srv) => {
              logRequest(req);

              // === CUSTOM HEADER DEMO: Read headers from the incoming upgrade request ===
              // `req` is a standard Request; req.headers is a Headers object (case-insensitive).
              const url = new URL(req.url);
              const receivedHeaders: Record<string, string | null> = {
                'x-client-id': req.headers.get('x-client-id') || req.headers.get('X-Client-Id') || url.searchParams.get('x-client-id') || null,
                'authorization': req.headers.get('authorization') || url.searchParams.get('authorization') || null,
                'user-agent': req.headers.get('user-agent'),
                'cookie': req.headers.get('cookie'),
              };

              // Filter out nulls for cleanliness in the demo payload
              const cleanReceived = Object.fromEntries(
                Object.entries(receivedHeaders).filter(([, v]) => v != null)
              );

              // === Send custom headers in the upgrade response (101) ===
              const responseHeaders = {
                'X-Upgrade-Demo': 'Bun custom upgrade headers',
                'X-Received-Client-Id': cleanReceived['x-client-id'] || 'none',
                'X-Upgrade-Timestamp': new Date().toISOString(),
                // Example of setting a cookie on successful WS upgrade (useful for session binding)
                // 'Set-Cookie': `ws-demo=${Date.now()}; Path=/; SameSite=Strict`,
              };

              const upgraded = srv.upgrade(req, {
                headers: responseHeaders,
                data: {
                  connectedAt: Date.now(),
                  clientIP: srv.requestIP(req)?.address ?? "unknown",
                  // Store what we read from the client request headers (or query fallback for browser tester)
                  receivedUpgradeHeaders: cleanReceived,
                  sentUpgradeResponseHeaders: responseHeaders,
                },
              });
              if (upgraded) {
                return undefined; // 101 Switching Protocols handled by Bun (with our custom headers)
              }
              return new Response("WebSocket upgrade failed", { status: 400 });
            },
            "/api/ws-status": (req, srv) => {
              logRequest(req);
              const room = "demo-room";
              const count = typeof srv.subscriberCount === "function" ? srv.subscriberCount(room) : 0;
              return Response.json({
                websocketEnabled: true,
                room,
                subscriberCount: count,
                note: "Connect with custom headers! Server reads req.headers (or ?x-client-id=... for browser demo). See welcome message for received/sent upgrade headers.",
                headerDemo: {
                  description: "Demonstrates reading upgrade request headers + returning custom headers via server.upgrade({ headers })",
                  clientHeaderExamples: ["X-Client-Id", "Authorization"],
                  bunClientSyntax: "new WebSocket('ws://host/ws', { headers: { 'X-Client-Id': 'demo123', 'Authorization': 'Bearer ...' } })",
                },
                demonstratedAPIs: [
                  "Bun.serve({ websocket: WebSocketHandler, routes })",
                  "server.upgrade(req, { headers, data })  ← custom upgrade response headers",
                  "req.headers.get('x-client-id') inside the upgrade route (before calling upgrade)",
                  "ws.subscribe('demo-room')",
                  "ws.send(JSON.stringify(...))",
                  "server.publish('demo-room', msg)",
                  "server.subscriberCount('demo-room')",
                  "ws.data (per-socket context + receivedUpgradeHeaders from the handshake)"
                ],
              });
            },
          }
        : {}),

      "/api/*": Response.json({ error: "Not found" }, { status: 404 }),
      "/docs": Response.redirect("/"),

      // Debug endpoint: allows triggering shutdown from the browser / curl
      // Only available when --console is passed (dev mode)
      ...(enableConsole
        ? {
            "/__shutdown": {
              POST: async () => {
                console.log(`\n[Debug] Received shutdown request via /__shutdown`);
                // In a real app you'd call server.stop() here.
                // For the demo we exit cleanly so the user sees the lifecycle.
                setTimeout(() => process.exit(0), 100);
                return new Response("Shutting down...", { status: 200 });
              },
            },
          }
        : {}),
    };
  }

  const initialRoutes = await createRoutes();

  const serveOptions: any = {
    port,
    hostname,
    idleTimeout, // configurable via --idle-timeout
    development: enableConsole ? { console: true } : undefined,
    routes: initialRoutes,
    fetch(req) {
      logRequest(req);
      return new Response("Not Found", { status: 404 });
    },
  };

  if (enableWebSocket && websocketHandler) {
    serveOptions.websocket = websocketHandler;
  }

  const server = Bun.serve(serveOptions);

  if (enableWebSocket) {
    wsServerRef.current = server;
  }

  console.log(`✅ Server running: ${server.url}`);
  console.log(
    `   Useful: /api/status  | POST /api/echo  | /api/page/bytecode  | GET /api/sse (server.timeout demo)${enableWebSocket ? "  | WS /ws  | GET /api/ws-status (custom upgrade headers + subscriberCount)" : ""}`
  );

  // === Graceful Shutdown (server.stop) ===
  let isShuttingDown = false;

  async function shutdown(force = false) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n🛑 Shutting down server...`);

    try {
      await server.stop(force);
      console.log(`   ✅ Server stopped successfully ${force ? '(forced)' : '(graceful)'}`);
    } catch (err) {
      console.error(`   ❌ Error during shutdown:`, err);
    }

    // Give a moment for logs to flush
    setTimeout(() => {
      process.exit(0);
    }, 100);
  }

  // Handle Ctrl+C (SIGINT) and system termination (SIGTERM)
  process.on('SIGINT', () => {
    console.log('\n[Signal] Received SIGINT (Ctrl+C)');
    shutdown(false); // graceful first
  });

  process.on('SIGTERM', () => {
    console.log('\n[Signal] Received SIGTERM');
    shutdown(true); // force on SIGTERM usually
  });

  // Second Ctrl+C forces immediate shutdown
  let sigintCount = 0;
  const originalSigint = process.listeners('SIGINT');
  process.removeAllListeners('SIGINT');
  process.on('SIGINT', () => {
    sigintCount++;
    if (sigintCount >= 2) {
      console.log('\n[Signal] Second SIGINT — forcing immediate shutdown');
      shutdown(true);
    } else {
      shutdown(false);
    }
  });

  // === Hot Route Reloading via server.reload() ===
  if (enableWatch) {
    console.log(`\n👀 Watch mode enabled — using server.reload() for zero-downtime updates`);
    console.log(`   Edit files in ${mergedConfig.outputDir} and routes will hot-reload`);

    const { watch } = await import("node:fs");

    watch(OUT_DIR, { recursive: true }, async (_eventType, filename) => {
      if (!filename) return;

      if (filename.includes("bun-docs.html") || filename.includes("bun-docs-registry.json")) {
        const start = Date.now();
        console.log(`\n🔄 File changed: ${filename} → calling server.reload()`);

        try {
          const newRoutes = await createRoutes();
          server.reload({ routes: newRoutes });
          const duration = Date.now() - start;
          console.log(`   ✅ Routes reloaded successfully in ${duration}ms (no dropped connections)`);
        } catch (err) {
          console.error(`   ❌ Reload failed:`, err);
        }
      }
    });
  }

  // Lifecycle control
  if (shouldUnref) {
    server.unref();
    console.log(`   ⚠️  Server will not keep the process alive (--unref)`);
  } else {
    server.ref();
  }

  // === Debug Shutdown Endpoint (only when --console is enabled) ===
  if (enableConsole) {
    // We add this route after server creation because it needs access to the server instance
    // In a real app you'd include it in createRoutes(), but we need `server` here.
    // For now we document it in the modal instead.
  }
}

// Run
main().catch(console.error);