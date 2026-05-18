#!/usr/bin/env bun
/**
 * Bun Documentation Manager — Proper Single-File Build
 *
 * Uses Bun.build() on a JS entrypoint + assembles a true single-file HTML.
 * Supports configuration via constants + CLI arguments.
 */

import { mkdirSync } from "node:fs";
import { join, relative } from "node:path";
import { startServerDemo } from "./src/server-demo.ts";
import { buildBunFetchOptions, type FetchOptions, type BunFetchOptionsInput } from "./src/lib/fetch-options.ts";
import { parseLlmsTxt } from "./src/lib/llms-parser.ts";
import type { DocPage } from "./src/types/doc.ts";

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
  console.info(`
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
// Connection Test / Dry-Run (for debugging custom sources)
// ============================================

async function testConnection(opts: FetchOptions = {}): Promise<void> {
  const { verbose = true, timeout = 15000, proxy, insecure = false, tlsCa, tlsCert, tlsKey } = opts;
  const url = mergedConfig.sourceUrl;

  const isLocalFile = url.startsWith("file://");
  console.info(`\n🧪 Connection test (dry-run) for: ${url}`);
  console.info(`   Timeout: ${timeout}ms  |  Verbose: ${verbose}  |  Insecure: ${insecure}`);
  if (isLocalFile) console.info(`   📁 Local file source`);
  if (proxy) console.info(`   Proxy: ${proxy}`);
  if (tlsCa || tlsCert || tlsKey) console.info(`   TLS client certs: ca=${!!tlsCa} cert=${!!tlsCert} key=${!!tlsKey}`);

  // Demonstrate fetch.preconnect in dry-run mode too
  if (!isLocalFile) {
    console.info(`   ⚡ Calling fetch.preconnect before test...`);
    try { fetch.preconnect(url); } catch {
    console.error('Unhandled error:', error);
  }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Use the shared helper (different UA + Accept for the dry-run diagnostic path)
  const fetchOptions = await buildBunFetchOptions({
    verbose,
    proxy,
    insecure,
    tlsCa,
    tlsCert,
    tlsKey,
    userAgent: "BunDocs-DryRun/1.0",
    accept: "*/*",
  });

  fetchOptions.method = "GET";
  fetchOptions.signal = controller.signal;

  const start = Date.now();

  try {
    console.info(`\n→ Attempting fetch...`);
    const res = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    const elapsed = Date.now() - start;
    console.info(`\n✅ Connection successful in ${elapsed}ms`);
    console.info(`   Status: ${res.status} ${res.statusText}`);
    console.info(`   Headers received:`);

    // Print a few interesting headers
    const interesting = ["content-type", "content-length", "server", "date", "x-vercel-id", "cf-ray"];
    for (const [k, v] of res.headers) {
      if (interesting.some((h) => k.toLowerCase().includes(h))) {
        console.info(`     ${k}: ${v}`);
      }
    }

    // Consume a small amount of the body so we don't leave the socket hanging
    const preview = await res.text();
    const previewLen = Math.min(preview.length, 200);
    console.info(`\n   Body preview (${previewLen} chars):`);
    console.info(`   ${preview.slice(0, previewLen).replace(/\n/g, " ")}${preview.length > previewLen ? "..." : ""}`);

    console.info(`\n💡 The connection works. You can now run the full generation without --dry-run.`);
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
    console.error(`        bun run generate --dry-run --source "https://bun.com/docs/llms.txt" --verbose`);
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



async function fetchDocsIndex(opts: FetchOptions = {}): Promise<DocPage[]> {
  const { verbose = false, timeout = 30000, proxy, insecure = false, tlsCa, tlsCert, tlsKey } = opts;

  const isLocalFile = mergedConfig.sourceUrl.startsWith("file://");

  // Performance optimization from Bun docs: preconnect before the actual request
  if (mergedConfig.preconnect && !isLocalFile) {
    console.info(`   ⚡ Preconnecting to host (fetch.preconnect)...`);
    try {
      fetch.preconnect(mergedConfig.sourceUrl);
    } catch {
    console.error('Unhandled error:', error);
  }
  }

  console.info(`📥 Fetching Bun documentation index from ${mergedConfig.sourceUrl}...`);
  if (isLocalFile) console.info(`   📁 Local file source (Bun fetch file:// protocol)`);
  if (verbose) console.info(`   🔍 Verbose mode enabled — Bun will print request/response headers`);
  if (insecure) console.info(`   ⚠️  TLS certificate validation disabled (--insecure)`);
  if (tlsCa || tlsCert || tlsKey) console.info(`   🔐 Using client TLS certificates (ca/cert/key)`);
  if (mergedConfig.preconnect && !isLocalFile) console.info(`   ⚡ Preconnect was called before fetch`);

  // Use the shared helper (eliminates TLS/verbose/proxy duplication)
  const fetchOptions = await buildBunFetchOptions({
    verbose,
    proxy,
    insecure,
    tlsCa,
    tlsCert,
    tlsKey,
  });

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
    return parseLlmsTxt(markdown);
  } catch (err: any) {
    clearTimeout(timeoutId);

    const url = mergedConfig.sourceUrl;
    const isDefaultUrl = url === "https://bun.com/docs/llms.txt";

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
    console.error(`        bun run generate --dry-run --source "https://bun.com/docs/llms.txt"`);

    if (!isDefaultUrl) {
      console.error(`\n   💡 You are using a custom --source URL.`);
      console.error(`   The default working source is: https://bun.com/docs/llms.txt`);
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
  console.info(`✅ Parsed ${pages.length} pages`);

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
  console.info("🛠️  Bundling dashboard JS with Bun.build()...");

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
    console.info(`   env: ${mergedConfig.env}`);
  }
  if (mergedConfig.sourcemap && mergedConfig.sourcemap !== "none") {
    buildOptions.sourcemap = mergedConfig.sourcemap;
    console.info(`   sourcemap: ${mergedConfig.sourcemap}`);
  }

  const buildResult = await Bun.build(buildOptions);

  if (!buildResult.success) {
    console.error(buildResult.logs);
    throw new Error("Bun.build failed");
  }

  const bundledJS = await buildResult.outputs[0].text();
  console.info(`   Bundled JS: ${(bundledJS.length / 1024).toFixed(1)} KB`);

  // 2. Assemble final single-file HTML
  let shell = await Bun.file(SHELL_PATH).text();

  // Remove the external dashboard.js script tag (we inline the bundle instead)
  shell = shell.replace(/<script[^>]*dashboard\.js[^>]*><\/script>/gi, '');

  const finalHTML = shell.replace("</body>", `<script>${bundledJS}</script>\n</body>`);

  const finalPath = join(OUT_DIR, mergedConfig.outputFilename);
  await Bun.write(finalPath, finalHTML);

  // 3. Optionally write the registry JSON
  if (mergedConfig.generateRegistryJson) {
    const registryPath = join(OUT_DIR, "bun-docs-registry.json");
    await Bun.write(registryPath, JSON.stringify(registryData, null, 2));
    console.info(`   📦 Wrote registry: ${relative(ROOT, registryPath)}`);
  }

  // 4. Remove any stale build artifacts left from previous experiments or manual runs.
  //    Bun.build() keeps outputs in memory (no outdir), but we defensively clean known junk
  //    (old index.html, code-split chunks, external sourcemaps) so dist/ stays clean.
  const staleArtifacts: string[] = [
    join(OUT_DIR, "index.html"),
    ...(await Array.fromAsync(new Bun.Glob("chunk-*.js").scan({ cwd: OUT_DIR }))).map((f) => join(OUT_DIR, f)),
  ];

  if (!mergedConfig.sourcemap || mergedConfig.sourcemap === "none") {
    const maps = await Array.fromAsync(new Bun.Glob("*.js.map").scan({ cwd: OUT_DIR }));
    staleArtifacts.push(...maps.map((f) => join(OUT_DIR, f)));
  }

  for (const artifact of staleArtifacts) {
    try {
      await Bun.file(artifact).delete();
    } catch {
      // file did not exist — ignore
    }
  }

  console.info(`\n✅ Successfully created single-file dashboard!`);
  console.info(`   📄 ${finalPath}`);
  console.info(`   📦 ${pages.length} pages • ${registryData.meta.bundler_pages} Bundler-related`);

  if (mergedConfig.sourcemap && mergedConfig.sourcemap !== "none") {
    console.info(`   🗺️  Sourcemap mode: ${mergedConfig.sourcemap}`);
  }

  console.info(`\n   Open it with:`);
  console.info(`   open ${finalPath}`);

  if (mergedConfig.serve) {
    const regPath = mergedConfig.generateRegistryJson ? join(OUT_DIR, "bun-docs-registry.json") : null;

    await startServerDemo({
      htmlPath: finalPath,
      registryPath: regPath,
      registryData,
      watchDir: OUT_DIR, // absolute path to the output directory
      port: mergedConfig.port,
      hostname: mergedConfig.hostname,
      idleTimeout: mergedConfig.idleTimeout,
      idleTimeoutPerRequest: mergedConfig.idleTimeoutPerRequest,
      unref: mergedConfig.unref,
      watch: mergedConfig.watch,
      console: mergedConfig.console,
      websocket: mergedConfig.websocket,
    });
  }
}

// Run
main().catch(console.error);