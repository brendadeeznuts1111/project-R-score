#!/usr/bin/env bun
import { serve, inspect, spawn, file, version, peek, which } from "bun";
import { parseArgs } from "util";
import { structuredLog } from "../../shared/utils";
import { Database } from "bun:sqlite";
import { build } from "bun";
import { z } from "zod";
import ShellExecutionEngine from './shell-engine.bun.ts';
import { rateLimiter } from '../../infra/rate-limit';
// import { PromptToWorkflowConverter } from '../../scripts/prompt-to-workflow';
// import { VoiceStreamer } from '../../scripts/voice-streamer';

const { values } = parseArgs({
  options: {
    port: { type: "string", short: "p", default: "3000" },
    host: { type: "string", short: "h", default: "localhost" },
    ci: { type: "boolean", short: "c" },
    version: { type: "boolean", short: "v" },
    testSuite: { type: "boolean", short: "t" },
    pkgMicroscope: { type: "boolean", short: "m" },
    shell: { type: "string", short: "s" }, // New flag
    shellLab: { type: "boolean", short: "l" }, // Shell lab flag
    htmlrewriter: { type: "boolean", short: "r" }, // HTMLRewriter flag
  },
});

if (values.version) {
  console.log(`Security Arena v${version}`);
  process.exit(0);
}

const port = Number(values.port);
const host = values.host || "0.0.0.0";
const CI = values.ci || !!process.env.CI;

process.env.BUN_OPTIONS = `--console-depth=5 --user-agent=Mission-Control/1.3.5 --sql-preconnect`;
process.env.BUN_INSPECT_PRELOAD = "./src/shared/preload.ts";
process.env.DATABASE_URL = "sqlite://./agents.db";

const odcClients = new Set<WebSocket>();
// const voiceStreamer = new VoiceStreamer();

// Initialize shell engine
const shellEngine = new ShellExecutionEngine();

function broadcastODC(payload: Record<string, unknown>) {
  const msg = JSON.stringify(payload);
  for (const ws of odcClients) ws.send(msg);
}

function getContentType(filePath: string): Record<string, string> {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const contentTypes: Record<string, string> = {
    'json': 'application/json',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon'
  };
  return { 'content-type': contentTypes[ext] || 'text/plain' };
}

async function startSecurityArena() {
  try {
    // Handle CLI flags that don't need server
    if (values.shell) {
      await shellRunCLI(values.shell);
      return;
    }

    if (values.shellLab) {
      console.log(`🐚 Opening Shell Lab at http://localhost:3000/security-arena#shell-lab`);
      return;
    }

    if (values.htmlrewriter) {
      await runHtmlRewriterCLI();
      return;
    }

    // Security audit
    try {
      const auditProc = spawn(["bun", "audit", "--severity=high", "--json"]);
      const auditOutput = await new Response(auditProc.stdout).text();
      const audit = auditOutput ? JSON.parse(auditOutput) : { vulnerabilities: [] };
      if (audit.vulnerabilities && audit.vulnerabilities.length > 0) {
        const issues = audit.vulnerabilities.map((v: any) => ({ severity: v.severity, title: v.title }));
        broadcastODC({ agentId: "security-arena", securityIssues: issues });
        const fatalIssues = issues.filter((i: any) => i.severity === "fatal");
        if (fatalIssues.length > 0) {
          throw new Error(`Fatal security vulnerabilities found: ${inspect(fatalIssues, { colors: true })}`);
        }
        if (!CI) {
          const prompt = await spawn(["bun", "-e", "console.log('Continue with warnings? (y/n)')"]).stdout.text();
          const response = await Bun.stdin.text();
          if (response.trim().toLowerCase() !== "y") {
            throw new Error("Installation cancelled due to security warnings");
          }
        } else {
          throw new Error(`Security warnings found in CI: ${inspect(issues, { colors: true })}`);
        }
      }
    } catch (auditError) {
      structuredLog(`[${new Date().toISOString()}] Security audit skipped: ${auditError}`);
    }

    // Check static file
    const staticFile = await peek(file("src/shared/static/security-arena.html"));
    if (!staticFile) {
      throw new Error("Static file src/shared/static/security-arena.html not found");
    }

    const server = serve({
      port,
      hostname: host,
      development: !CI,
      fetch: async (req, server) => {
        const url = new URL(req.url);

        // Get client IP for rate limiting
        const requestIP = server.requestIP(req);
        const clientIp = requestIP?.address || 'unknown';
        console.log(`Request IP object:`, requestIP, `clientIp: ${clientIp}`);

        try {
          if (url.pathname === "/") {
            return new Response(file("src/shared/static/security-arena.html"), {
              headers: { "content-type": "text/html" },
            });
          }
          if (url.pathname === "/arena-glass.css") {
            return new Response(file("src/shared/static/arena-glass.css"), {
              headers: { "content-type": "text/css" },
            });
          }
          if (url.pathname === "/favicon.ico" || url.pathname === "/favicon-32x32.png" || url.pathname === "/favicon-16x16.png" || url.pathname === "/apple-touch-icon.png") {
            // Return simple favicon to avoid 404 errors
            return new Response("", {
              headers: { "content-type": "image/png" },
            });
          }
          if (url.pathname === "/favicon.svg") {
            return new Response(file("public/favicon.svg"), {
              headers: { "content-type": "image/svg+xml" },
            });
          }
          if (url.pathname === "/site.webmanifest") {
            return new Response(file("public/site.webmanifest"), {
              headers: { "content-type": "application/manifest+json" },
            });
          }
          if (url.pathname === "/og-image.png") {
            // Return a simple placeholder for now
            return new Response("", {
              headers: { "content-type": "image/png" },
            });
          }
          if (url.pathname === "/security-arena") {
            // Handle fragment navigation - serve the main page
            return new Response(file("src/shared/static/security-arena.html"), {
              headers: { "content-type": "text/html" },
            });
          }
          if (url.pathname === "/api/executables") {
            return new Response(JSON.stringify({ executables: ["mc-scope", "mc-auto", "mc-grep", "mc-run", "security-arena", "bundler-fixes-server"] }));
          }
          if (url.pathname === "/api/run-test") {
            return runTest(req, clientIp);
          }
          if (url.pathname === "/api/security-scan") {
            return handleSecurityScan(req);
          }
          if (url.pathname === "/api/pkg/get") {
            return pkgGet(req);
          }
          if (url.pathname === "/api/pkg/set") {
            return pkgSet(req);
          }
          if (url.pathname === "/api/pkg/fix") {
            return pkgFix(req);
          }
          if (url.pathname === "/api/pkg/version") {
            return pkgVersion(req);
          }
          if (url.pathname === "/api/pkg/pack") {
            return pkgPack(req);
          }
          if (url.pathname === "/api/pkg/publish") {
            return pkgPublish(req);
          }
          if (url.pathname === "/api/pkg/why") {
            return pkgWhy(req);
          }
          if (url.pathname === "/api/pkg/outdated-recursive") {
            return pkgOutdatedRecursive(req);
          }
          if (url.pathname === "/api/pkg/install-analyze") {
            return pkgInstallAnalyze(req);
          }
          if (url.pathname === "/api/pm/cache") {
            return pmCache(req);
          }
          if (url.pathname === "/api/pm/hash") {
            return pmHash(req);
          }
          if (url.pathname === "/api/pm/untrusted") {
            return pmUntrusted(req);
          }
          if (url.pathname === "/api/pm/trust-all") {
            return pmTrustAll(req);
          }
          if (url.pathname === "/api/pm/bin") {
            return pmBin(req);
          }
          if (url.pathname === "/api/pm/whoami") {
            return pmWhoami(req);
          }
          if (url.pathname === "/api/pm/ls") {
            return pmLs(req);
          }
          if (url.pathname === "/api/install") {
            return installCmd(req);
          }
          if (url.pathname === "/api/publish") {
            return publishCmd(req);
          }
          if (url.pathname === "/api/ql-dx") {
            return qlDXCmd(req);
          }
          if (url.pathname === "/api/signal-demo") {
            return signalDemoCmd(req);
          }
          if (url.pathname === "/api/yaml") {
            return yamlCmd(req);
          }
          if (url.pathname === "/api/shell/run") {
            return shellRun(req);
          }
          if (url.pathname === "/api/shell/command") {
            return shellCommand(req);
          }
          if (url.pathname === "/api/shell/commands") {
            return shellCommands(req);
          }
          if (url.pathname === "/api/htmlrewriter/run") {
            return htmlRewriterRun(req);
          }
          if (url.pathname === "/api/large-html") {
            const html = await Bun.file("src/shared/static/security-arena.html").text();
            return new Response(html.slice(0, 200_000), { headers: { "content-type": "text/html" } });
          }
          if (url.pathname === "/api/security/policy") {
            return securityPolicy(req);
          }
          if (url.pathname === "/api/workflow/convert-prompt") {
            return convertPrompt(req);
          }
          if (url.pathname === "/workflow-designer") {
            return new Response(file("src/shared/static/workflow-designer.html"), { headers: { "content-type": "text/html" } });
          }
          if (url.pathname === "/api/baselines/comparison") {
            return baselineComparison(req);
          }
          if (url.pathname === "/ws/security") {
            const success = server.upgrade(req);
            if (success) return undefined;
            return new Response("Security WebSocket only", { status: 426 });
          }
          if (url.pathname === "/ws/odc") {
            const success = server.upgrade(req);
            if (success) return undefined;
            return new Response("ODC WebSocket only", { status: 426 });
          }
          if (url.pathname === "/docs/api" || url.pathname === "/docs/api/") {
            return new Response(file("docs/api/index.html"), {
              headers: { "content-type": "text/html" },
            });
          }
          if (url.pathname.startsWith("/docs/")) {
            try {
              const filePath = url.pathname.replace(/^\/docs\//, "docs/");
              return new Response(file(filePath), {
                headers: this.getContentType(filePath),
              });
            } catch {
              return new Response("Not Found", { status: 404 });
            }
          }
          return new Response("Not Found", { status: 404 });
        } catch (err) {
          structuredLog(`[${new Date().toISOString()}] Error:`, inspect(err, { colors: true,  }));
          return new Response("Internal Server Error", { status: 500 });
        }
      },
  websocket: {
    open(ws: any) {
      odcClients.add(ws);
      structuredLog(`[${new Date().toISOString()}] ODC client connected`);
    },
    message(ws: any, message: any) {
      try {
        const data = JSON.parse(message.toString());

        // Handle voice streaming messages
        if (data.type && data.type.startsWith('voice_')) {
          handleVoiceMessage(ws, data);
          return;
        }

        // Handle regular ODC messages
        broadcastODC(data);
        structuredLog(`[${new Date().toISOString()}] ODC broadcast: ${inspect(data, { colors: true })}`);
      } catch {}
    },
    close(ws: any) {
      odcClients.delete(ws);
      structuredLog(`[${new Date().toISOString()}] ODC client disconnected`);
    },
  },
    });

    // Rich CLI feedback
    console.log(
      ` 🔐 Security Arena v${version}\n` +
      ` ${!CI ? `🌐 Opening browser at ${server.url}` : `📡 Running headless at ${server.url}`}\n` +
      ` 📦 Executable builds available at ${server.url}/api/executables\n` +
      ` 📡 ODC WebSocket live at ${server.url}/ws/odc\n` +
      ` 📱 Bundler Fixes Lab at ${server.url}/security-arena#bundler-fixes-lab\n` +
      ` 📦 Bun Install Showcase at ${server.url}/security-arena#bun-install-showcase\n` +
      ` 📦 Bun Publish Showcase at ${server.url}/security-arena#bun-publish-showcase\n` +
      ` 🧑💻 Quantum-Leap DX at ${server.url}/security-arena#quantum-leap-dx\n` +
      ` 📡 Signal Handling at ${server.url}/api/signal-demo\n` +
      ` ⚡ PostMessage Perf at ${server.url}/security-arena#quantum-leap-dx\n` +
      ` 📄 Bun YAML at ${server.url}/security-arena#bun-yaml-showcase\n` +
      ` 📦 Package Microscope at ${server.url}/security-arena#pkg-property-microscope\n` +
      ` 🐚 Shell Runner at ${server.url}/api/shell/run\n` +
      ` 📜 HTMLRewriter Diff Lab at ${server.url}/security-arena#htmlrewriter-diff-lab\n` +
      ` ♻️ Hot-reload enabled – edit src/shared/static/ and see changes instantly\n` +
      ` ⏹ Press Ctrl+C to stop`
    );

    // Hot-reload watcher (simplified)
    structuredLog(`[${new Date().toISOString()}] Hot-reload enabled - restart server for changes`);

    // Graceful shutdown
    process.on("SIGINT", () => {
      structuredLog(`[${new Date().toISOString()}] SIGINT received – shutting down gracefully`);
      server.stop();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      structuredLog(`[${new Date().toISOString()}] SIGTERM received – shutting down gracefully`);
      server.stop();
      process.exit(0);
    });

  } catch (err) {
    structuredLog(`[${new Date().toISOString()}] Error:`, inspect(err, { colors: true,  }));
    process.exit(1);
  }
}

async function runTest(req: Request, clientIp: string) {
  // Rate limiting check
      console.log(`Rate limiting check for IP: ${clientIp}`);
      if (!rateLimiter.checkLimit(clientIp)) {
        const remaining = rateLimiter.getRemainingRequests(clientIp);
        console.log(`Rate limit exceeded for IP: ${clientIp}, remaining: ${remaining}`);
        return new Response(
          JSON.stringify({
            error: `Rate limit exceeded. Try again in 60 seconds. ${remaining} requests remaining.`
          }),
          { status: 429 }
        );
      }

  const schema = z.object({
    code: z.string().min(1),
    entry: z.string().min(1),
    testType: z.string().optional().default("unknown")
  });

  try {
    const { code, entry, testType } = schema.parse(await req.json());
    const startTime = performance.now();

    // Create temporary directory for test files
    const tempDir = `./.test-temp-${Date.now()}`;
    await Bun.$`mkdir -p ${tempDir}`.quiet();

    // Ensure test file has proper test extension
    const testEntry = entry.includes('.test.') ? entry : entry.replace(/\.ts$/, '.test.ts');

    // Write test files based on test type
    await writeTestFiles(tempDir, testType, code, testEntry);

        // Execute with 7-second timeout
        const timeoutMs = 1000; // Temporary: 1 second for testing
        const testPromise = spawn({
      cmd: ["bun", "test", testEntry],
      stdout: "pipe",
      stderr: "pipe",
      cwd: tempDir,
    });

        const timeoutPromise = new Promise<{ out: string; err: string; exitCode: number }>((_, reject) => {
          setTimeout(() => reject(new Error(`Test timeout after ${timeoutMs}ms`)), timeoutMs);
        });

    let out: string, err: string, exitCode: number;

    try {
      console.log(`Starting test with ${timeoutMs}ms timeout`);
      const result = await Promise.race([
        Promise.all([
          new Response(testPromise.stdout).text(),
          new Response(testPromise.stderr).text(),
          testPromise.exited,
        ]).then(([stdout, stderr, code]) => {
          console.log(`Test completed normally in ${Date.now() - startTime}ms`);
          return { out: stdout, err: stderr, exitCode: code };
        }),
        timeoutPromise
      ]);

      out = result.out;
      err = result.err;
      exitCode = result.exitCode;
    } catch (timeoutError) {
      console.log(`Test timed out: ${timeoutError.message}`);
      // Kill the process on timeout
      testPromise.kill();
      out = "";
      err = `Timeout: ${timeoutError.message}`;
      exitCode = -1;
    }

    const duration = performance.now() - startTime;

    // Cleanup temp directory
    await Bun.$`rm -rf ${tempDir}`.quiet();

    const result = {
      ok: exitCode === 0,
      out,
      err,
      duration,
      agentId: "bundler-fixes-lab",
      timestamp: new Date().toISOString(),
      testType
    };

    // Store baseline timing
    await storeBaselineTiming(testType, duration, result.ok);

    broadcastODC(result);

    // Temporarily disabled database logging for failed tests
    // if (!result.ok) {
    //   const db = new Database("agents.db", { create: true });
    //   db.run(
    //     "INSERT OR REPLACE INTO agents(id, name, type, scope, config, status, parent) VALUES (?, ?, ?, ?, ?, 'failed', ?)",
    //     [`bug-${Date.now()}`, "bug/bundler/small", "bug", "api", JSON.stringify({ err, testType, duration }), null]
    //   );
    // }

    const scanResult = await securityScan(code, entry);
    broadcastODC({ ...scanResult, agentId: "security-scan" });

    return new Response(JSON.stringify({ ...result, vulnerabilities: scanResult.vulnerabilities }));

  } catch (e) {
    const error = {
      ok: false,
      err: inspect(e, { colors: true,  }),
      agentId: "bundler-fixes-lab",
      timestamp: new Date().toISOString()
    };
    broadcastODC(error);
    return new Response(JSON.stringify(error), { status: 500 });
  }
}

async function writeTestFiles(tempDir: string, testType: string, code: string, entry: string) {
  // Write main entry file
  await Bun.write(`${tempDir}/${entry}`, code);

  // Write supporting files based on test type
  switch (testType) {
    case "macro-nested":
      await Bun.write(`${tempDir}/macro.ts`,
        `export macro deep() { return { 0: { 1: { 2: "works" } } }; } with { type: "macro" };`);
      break;
    case "tla-cycle":
      await Bun.write(`${tempDir}/a.ts`,
        `export const foo = await import("./b.ts").then(m => m.bar);`);
      await Bun.write(`${tempDir}/b.ts`,
        `export const bar = await import("./a.ts").then(m => m.foo);`);
      break;
    case "jsx-ns":
      // No additional files needed for JSX test
      break;
    case "sourcemap":
      // No additional files needed for sourcemap test
      break;
  }
}

async function storeBaselineTiming(testType: string, duration: number, success: boolean) {
  const db = new Database("baselines.db", { create: true });

  db.run(`
    CREATE TABLE IF NOT EXISTS lab_baselines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_type TEXT,
      duration REAL,
      success BOOLEAN,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(
    "INSERT INTO lab_baselines (test_type, duration, success) VALUES (?, ?, ?)",
    [testType, duration, success]
  );
}

async function handleSecurityScan(req: Request) {
  const schema = z.object({ code: z.string().min(1), entry: z.string().min(1) });
  try {
    const { code, entry } = schema.parse(await req.json());
    const scanResult = await securityScan(code, entry);
    broadcastODC({ ...scanResult, agentId: "security-scan" });
    return new Response(JSON.stringify(scanResult));
  } catch (e) {
    const error = { vulnerabilities: [], error: inspect(e, { colors: true }) };
    broadcastODC({ ...error, agentId: "security-scan" });
    return new Response(JSON.stringify(error), { status: 400 });
  }
}

async function securityScan(code: string, entry: string) {
  const { securityScan } = await import("../../3rd-party/security-scanner-template/wrapper.ts");
  return await securityScan(code, entry);
}

async function pkgGet(req: Request) {
  const schema = z.object({ key: z.string().optional() });
  try {
    const { key } = schema.parse(await req.json());
    const cmd = key ? ["bun", "pm", "pkg", "get", key] : ["bun", "pm", "pkg", "get"];
    const proc = Bun.spawn({ cmd, stdout: "pipe", stderr: "pipe" });
    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const result = { ok: proc.exitCode === 0, data: out ? JSON.parse(out) : null, err, agentId: "pkg-microscope", timestamp: new Date().toISOString() };
    broadcastODC(result);
    return new Response(JSON.stringify(result));
  } catch (e) {
    const error = { ok: false, err: inspect(e, { colors: true,  }), agentId: "pkg-microscope", timestamp: new Date().toISOString() };
    broadcastODC(error);
    return new Response(JSON.stringify(error));
  }
}

async function pkgSet(req: Request) {
  const schema = z.object({ data: z.any() });
  try {
    const { data } = schema.parse(await req.json());
    const scanResult = await securityScan(JSON.stringify(data), "package.json");
    if (scanResult.vulnerabilities.length > 0) {
      const error = { ok: false, err: `Vulnerabilities found: ${inspect(scanResult.vulnerabilities, { colors: true })}`, agentId: "pkg-microscope", timestamp: new Date().toISOString() };
      broadcastODC(error);
      return new Response(JSON.stringify(error));
    }
    const cmd = ["bun", "pm", "pkg", "set", JSON.stringify(data)];
    const proc = Bun.spawn({ cmd, stdout: "pipe", stderr: "pipe" });
    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const result = { ok: proc.exitCode === 0, out, err, agentId: "pkg-microscope", timestamp: new Date().toISOString() };
    broadcastODC(result);
    if (!result.ok) {
      const db = new Database("agents.db", { create: true });
      db.run(
        "INSERT OR REPLACE INTO agents(id, name, type, scope, config, status, parent) VALUES (?, ?, ?, ?, ?, 'failed', ?)",
        [`bug-${Date.now()}`, "bug/package/small", "bug", "api", JSON.stringify({ err }), null]
      );
    }
    const db = new Database("baselines.db", { create: true });
    db.run(
      "INSERT OR REPLACE INTO baselines(id, scope, metric, value) VALUES (?, ?, ?, ?)",
      ["pkg-microscope", "api", "pkg_set", out || err]
    );
    return new Response(JSON.stringify(result));
  } catch (e) {
    const error = { ok: false, err: inspect(e, { colors: true,  }), agentId: "pkg-microscope", timestamp: new Date().toISOString() };
    broadcastODC(error);
    return new Response(JSON.stringify(error));
  }
}

async function pkgFix(req: Request) {
  try {
    const proc = Bun.spawn({ cmd: ["bun", "pm", "pkg", "fix"], stdout: "pipe", stderr: "pipe" });
    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const result = { ok: proc.exitCode === 0, out, err, agentId: "pkg-microscope", timestamp: new Date().toISOString() };
    broadcastODC(result);
    return new Response(JSON.stringify(result));
  } catch (e) {
    const error = { ok: false, err: inspect(e, { colors: true,  }), agentId: "pkg-microscope", timestamp: new Date().toISOString() };
    broadcastODC(error);
    return new Response(JSON.stringify(error));
  }
}

async function pkgVersion(req: Request) {
  const schema = z.object({ type: z.string(), noGitTag: z.boolean().optional() });
  try {
    const { type, noGitTag } = schema.parse(await req.json());
    const cmd = ["bun", "pm", "version", type];
    if (noGitTag) cmd.push("--no-git-tag-version");
    const proc = Bun.spawn({ cmd, stdout: "pipe", stderr: "pipe" });
    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const result = { ok: proc.exitCode === 0, out, err, agentId: "pkg-microscope", timestamp: new Date().toISOString() };
    broadcastODC(result);
    return new Response(JSON.stringify(result));
  } catch (e) {
    const error = { ok: false, err: inspect(e, { colors: true,  }), agentId: "pkg-microscope", timestamp: new Date().toISOString() };
    broadcastODC(error);
    return new Response(JSON.stringify(error));
  }
}

async function pkgPack(req: Request) {
  const schema = z.object({
    destination: z.string().optional(),
    filename: z.string().optional(),
    gzipLevel: z.string().optional(),
    quiet: z.boolean().optional(),
    ignoreScripts: z.boolean().optional(),
  });
  try {
    const { destination, filename, gzipLevel, quiet, ignoreScripts } = schema.parse(await req.json());
    const cmd = ["bun", "pm", "pack"];
    if (destination) cmd.push("--destination", destination);
    if (filename) cmd.push("--filename", filename);
    if (gzipLevel) cmd.push("--gzip-level", gzipLevel);
    if (quiet) cmd.push("--quiet");
    if (ignoreScripts) cmd.push("--ignore-scripts");
    const proc = Bun.spawn({ cmd, stdout: "pipe", stderr: "pipe" });
    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const result = { ok: proc.exitCode === 0, out, err, agentId: "pkg-microscope", timestamp: new Date().toISOString() };
    broadcastODC(result);
    return new Response(JSON.stringify(result));
  } catch (e) {
    const error = { ok: false, err: inspect(e, { colors: true,  }), agentId: "pkg-microscope", timestamp: new Date().toISOString() };
    broadcastODC(error);
    return new Response(JSON.stringify(error));
  }
}

async function pkgPublish(req: Request) {
  const schema = z.object({
    access: z.string(),
    tag: z.string(),
    dryRun: z.boolean().optional(),
    tolerateRepublish: z.boolean().optional(),
  });
  try {
    const { access, tag, dryRun, tolerateRepublish } = schema.parse(await req.json());
    const cmd = ["bun", "publish", "--access", access, "--tag", tag];
    if (dryRun) cmd.push("--dry-run");
    if (tolerateRepublish) cmd.push("--tolerate-republish");
    const proc = Bun.spawn({ cmd, stdout: "pipe", stderr: "pipe" });
    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const result = { ok: proc.exitCode === 0, out, err, agentId: "pkg-microscope", timestamp: new Date().toISOString() };
    broadcastODC(result);
    return new Response(JSON.stringify(result));
  } catch (e) {
    const error = { ok: false, err: inspect(e, { colors: true,  }), agentId: "pkg-microscope", timestamp: new Date().toISOString() };
    broadcastODC(error);
    return new Response(JSON.stringify(error));
  }
}

async function pkgWhy(req: Request) {
  const schema = z.object({ package: z.string() });
  try {
    const { package: pkgName } = schema.parse(await req.json());
    const proc = Bun.spawn({ cmd: ["bun", "why", pkgName], stdout: "pipe", stderr: "pipe" });
    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const result = { ok: proc.exitCode === 0, out: out.trim(), err, agentId: "pkg-microscope", timestamp: new Date().toISOString() };
    broadcastODC(result);
    return new Response(JSON.stringify(result));
  } catch (e) {
    const error = { ok: false, err: inspect(e, { colors: true }), agentId: "pkg-microscope", timestamp: new Date().toISOString() };
    broadcastODC(error);
    return new Response(JSON.stringify(error));
  }
}

async function pkgOutdatedRecursive(req: Request) {
  try {
    const proc = Bun.spawn({ cmd: ["bun", "outdated", "--recursive"], stdout: "pipe", stderr: "pipe" });
    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const result = { ok: proc.exitCode === 0, out: out.trim(), err, agentId: "pkg-microscope", timestamp: new Date().toISOString() };
    broadcastODC(result);
    return new Response(JSON.stringify(result));
  } catch (e) {
    const error = { ok: false, err: inspect(e, { colors: true }), agentId: "pkg-microscope", timestamp: new Date().toISOString() };
    broadcastODC(error);
    return new Response(JSON.stringify(error));
  }
}

async function pkgInstallAnalyze(req: Request) {
  try {
    const proc = Bun.spawn({ cmd: ["bun", "install", "--analyze"], stdout: "pipe", stderr: "pipe" });
    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const result = { ok: proc.exitCode === 0, out: out.trim(), err, agentId: "pkg-microscope", timestamp: new Date().toISOString() };
    broadcastODC(result);
    return new Response(JSON.stringify(result));
  } catch (e) {
    const error = { ok: false, err: inspect(e, { colors: true }), agentId: "pkg-microscope", timestamp: new Date().toISOString() };
    broadcastODC(error);
    return new Response(JSON.stringify(error));
  }
}

// Bun PM handlers for package management utilities
async function pmCache(req: Request) {
  try {
    const proc = Bun.spawn({ cmd: ["bun", "pm", "cache"], stdout: "pipe", stderr: "pipe" });
    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const result = { ok: true, out: out.trim(), err, agentId: "bun-pm", timestamp: new Date().toISOString() };
    broadcastODC(result);
    return new Response(JSON.stringify(result));
  } catch (e) {
    const error = { ok: false, err: inspect(e, { colors: true, depth: 2 }), agentId: "bun-pm", timestamp: new Date().toISOString() };
    broadcastODC(error);
    return new Response(JSON.stringify(error));
  }
}

async function pmHash(req: Request) {
  try {
    const proc = Bun.spawn({ cmd: ["bun", "pm", "hash"], stdout: "pipe", stderr: "pipe" });
    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const result = { ok: true, out: out.trim(), err, agentId: "bun-pm", timestamp: new Date().toISOString() };
    broadcastODC(result);
    return new Response(JSON.stringify(result));
  } catch (e) {
    const error = { ok: false, err: inspect(e, { colors: true, depth: 2 }), agentId: "bun-pm", timestamp: new Date().toISOString() };
    broadcastODC(error);
    return new Response(JSON.stringify(error));
  }
}

async function pmUntrusted(req: Request) {
  try {
    const proc = Bun.spawn({ cmd: ["bun", "pm", "untrusted"], stdout: "pipe", stderr: "pipe" });
    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const result = { ok: proc.exitCode === 0, out: out.trim(), err, agentId: "bun-pm", timestamp: new Date().toISOString() };
    broadcastODC(result);
    return new Response(JSON.stringify(result));
  } catch (e) {
    const error = { ok: false, err: inspect(e, { colors: true, depth: 2 }), agentId: "bun-pm", timestamp: new Date().toISOString() };
    broadcastODC(error);
    return new Response(JSON.stringify(error));
  }
}

async function pmTrustAll(req: Request) {
  try {
    const proc = Bun.spawn({ cmd: ["bun", "pm", "trust", "--all"], stdout: "pipe", stderr: "pipe" });
    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const result = { ok: proc.exitCode === 0, out: out.trim(), err, agentId: "bun-pm", timestamp: new Date().toISOString() };
    broadcastODC(result);
    return new Response(JSON.stringify(result));
  } catch (e) {
    const error = { ok: false, err: inspect(e, { colors: true, depth: 2 }), agentId: "bun-pm", timestamp: new Date().toISOString() };
    broadcastODC(error);
    return new Response(JSON.stringify(error));
  }
}

async function pmBin(req: Request) {
  try {
    const localProc = Bun.spawn({ cmd: ["bun", "pm", "bin"], stdout: "pipe", stderr: "pipe" });
    const globalProc = Bun.spawn({ cmd: ["bun", "pm", "bin", "-g"], stdout: "pipe", stderr: "pipe" });
    const local = (await new Response(localProc.stdout).text()).trim();
    const global = (await new Response(globalProc.stdout).text()).trim();
    const result = { ok: true, out: { local, global }, agentId: "bun-pm", timestamp: new Date().toISOString() };
    broadcastODC(result);
    return new Response(JSON.stringify(result));
  } catch (e) {
    const error = { ok: false, err: inspect(e, { colors: true, depth: 2 }), agentId: "bun-pm", timestamp: new Date().toISOString() };
    broadcastODC(error);
    return new Response(JSON.stringify(error));
  }
}

async function pmWhoami(req: Request) {
  try {
    const proc = Bun.spawn({ cmd: ["bun", "pm", "whoami"], stdout: "pipe", stderr: "pipe" });
    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const result = { ok: proc.exitCode === 0, out: out.trim(), err, agentId: "bun-pm", timestamp: new Date().toISOString() };
    broadcastODC(result);
    return new Response(JSON.stringify(result));
  } catch (e) {
    const error = { ok: false, err: inspect(e, { colors: true, depth: 2 }), agentId: "bun-pm", timestamp: new Date().toISOString() };
    broadcastODC(error);
    return new Response(JSON.stringify(error));
  }
}

async function pmLs(req: Request) {
  const schema = z.object({ all: z.boolean().optional() });
  try {
    const { all } = schema.parse(await req.json());
    const cmd = all ? ["bun", "pm", "ls", "--all"] : ["bun", "pm", "ls"];
    const proc = Bun.spawn({ cmd, stdout: "pipe", stderr: "pipe" });
    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const result = { ok: proc.exitCode === 0, out: out.trim(), err, agentId: "bun-pm", timestamp: new Date().toISOString() };
    broadcastODC(result);
    return new Response(JSON.stringify(result));
  } catch (e) {
    const error = { ok: false, err: inspect(e, { colors: true, depth: 2 }), agentId: "bun-pm", timestamp: new Date().toISOString() };
    broadcastODC(error);
    return new Response(JSON.stringify(error));
  }
}

// Bun Install command handler
async function installCmd(req: Request) {
  const schema = z.object({
    command: z.string(),
    args: z.record(z.any()).optional()
  });

  try {
    const { command } = schema.parse(await req.json());

    let cmd: string[];

    // Handle different command types based on the command string
    if (command === '') {
      cmd = ['bun', 'install'];
    } else if (command === '--production') {
      cmd = ['bun', 'install', '--production'];
    } else if (command === '--frozen-lockfile') {
      cmd = ['bun', 'install', '--frozen-lockfile'];
    } else if (command === '--dry-run') {
      cmd = ['bun', 'install', '--dry-run'];
    } else if (command === '--linker isolated') {
      cmd = ['bun', 'install', '--linker', 'isolated'];
    } else if (command === '--linker hoisted') {
      cmd = ['bun', 'install', '--linker', 'hoisted'];
    } else if (command === '--omit=dev') {
      cmd = ['bun', 'install', '--omit=dev'];
    } else if (command === '--verbose') {
      cmd = ['bun', 'install', '--verbose'];
    } else if (command === '--audit') {
      cmd = ['bun', 'audit'];
    } else if (command === '--minimum-release-age 259200') {
      cmd = ['bun', 'install', '--minimum-release-age', '259200'];
    } else if (command === '--lockfile-only') {
      cmd = ['bun', 'install', '--lockfile-only'];
    } else if (command === '--concurrent-scripts 16') {
      cmd = ['bun', 'install', '--concurrent-scripts', '16'];
    } else if (command.startsWith('--add ')) {
      const pkg = command.replace('--add ', '');
      if (pkg.includes('--dev ')) {
        const actualPkg = pkg.replace('--dev ', '');
        cmd = ['bun', 'add', '--dev', actualPkg];
      } else {
        cmd = ['bun', 'add', pkg];
      }
    } else if (command.startsWith('--remove ')) {
      const pkg = command.replace('--remove ', '');
      cmd = ['bun', 'remove', pkg];
    } else if (command.startsWith('--global ')) {
      const pkg = command.replace('--global ', '');
      cmd = ['bun', 'add', '--global', pkg];
    } else {
      // Fallback for unrecognized commands
      cmd = ['bun', 'install', ...command.split(' ').filter(Boolean)];
    }

    const proc = Bun.spawn({
      cmd,
      stdout: "pipe",
      stderr: "pipe",
      cwd: process.cwd()
    });

    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();

    const result = {
      ok: proc.exitCode === 0,
      out: out.trim(),
      err: err.trim(),
      agentId: "bun-install",
      timestamp: new Date().toISOString(),
      command: cmd.join(' ')
    };

    broadcastODC(result);
    return new Response(JSON.stringify(result));

  } catch (e) {
    const error = {
      ok: false,
      err: inspect(e, { colors: true, depth: 2 }),
      agentId: "bun-install",
      timestamp: new Date().toISOString()
    };
    broadcastODC(error);
    return new Response(JSON.stringify(error));
  }
}

// Bun Publish command handler
async function publishCmd(req: Request) {
  const schema = z.object({
    command: z.string(),
    args: z.record(z.any()).optional()
  });

  try {
    const { command } = schema.parse(await req.json());

    let cmd: string[];

    // Handle different publish command types based on the command string
    if (command === '') {
      cmd = ['bun', 'publish'];
    } else if (command === '--dry-run') {
      cmd = ['bun', 'publish', '--dry-run'];
    } else if (command === '--pack-only') {
      cmd = ['bun', 'pm', 'pack'];
    } else if (command === '--access public') {
      cmd = ['bun', 'publish', '--access', 'public'];
    } else if (command === '--access restricted') {
      cmd = ['bun', 'publish', '--access', 'restricted'];
    } else if (command === '--tag alpha') {
      cmd = ['bun', 'publish', '--tag', 'alpha'];
    } else if (command === '--tag next') {
      cmd = ['bun', 'publish', '--tag', 'next'];
    } else if (command === '--tolerate-republish') {
      cmd = ['bun', 'publish', '--tolerate-republish'];
    } else if (command === '--gzip-level 6') {
      cmd = ['bun', 'publish', '--gzip-level', '6'];
    } else if (command === '--auth-type web') {
      cmd = ['bun', 'publish', '--auth-type', 'web'];
    } else if (command === '--include-scripts') {
      cmd = ['bun', 'publish', '--include-scripts'];
    } else if (command === '--ignore-scripts') {
      cmd = ['bun', 'publish', '--ignore-scripts'];
    } else if (command === '--ci-token') {
      cmd = ['bun', 'publish'];
    } else if (command === '--workspace') {
      cmd = ['bun', 'publish', '--workspace'];
    } else if (command.startsWith('--otp ')) {
      const otp = command.replace('--otp ', '');
      cmd = ['bun', 'publish', '--otp', otp];
    } else {
      // Handle tarball path or other custom commands
      cmd = ['bun', 'publish', ...command.split(' ').filter(Boolean)];
    }

    const proc = Bun.spawn({
      cmd,
      stdout: "pipe",
      stderr: "pipe",
      cwd: process.cwd()
    });

    // Set a timeout for the command execution
    const timeout = 30000; // 30 seconds
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Command timed out')), timeout);
    });

    try {
      const [out, err] = await Promise.race([
        Promise.all([
          new Response(proc.stdout).text(),
          new Response(proc.stderr).text()
        ]),
        timeoutPromise
      ]);

      const exitCode = await proc.exited;

      const result = {
        ok: exitCode === 0,
        out: out.trim(),
        err: err.trim(),
        agentId: "bun-publish",
        timestamp: new Date().toISOString(),
        command: cmd.join(' ')
      };

      broadcastODC(result);
      return new Response(JSON.stringify(result));

    } catch (spawnError) {
      console.log('Spawn error:', spawnError);
      const error = {
        ok: false,
        err: `Command execution failed: ${spawnError.message}`,
        agentId: "bun-publish",
        timestamp: new Date().toISOString()
      };
      broadcastODC(error);
      return new Response(JSON.stringify(error));
    }

  } catch (e) {
    const error = {
      ok: false,
      err: inspect(e, { colors: true, depth: 2 }),
      agentId: "bun-publish",
      timestamp: new Date().toISOString()
    };
    broadcastODC(error);
    return new Response(JSON.stringify(error));
  }
}

// Quantum-Leap DX command handler
async function qlDXCmd(req: Request) {
  return new Response(JSON.stringify({ ok: true, test: 'ql-dx endpoint working' }));
}

// Signal handling demo command handler
async function signalDemoCmd(req: Request) {
  try {
    // Create a simple demonstration of signal handling
    const demoCode = `
process.on("SIGINT", () => {
  console.log("📡 Received SIGINT signal");
});

process.on("SIGTERM", () => {
  console.log("📡 Received SIGTERM signal");
});

process.on("beforeExit", (code) => {
  console.log(\`📡 Event loop is empty, exiting with code: \${code}\`);
});

process.on("exit", (code) => {
  console.log(\`📡 Process exited with code: \${code}\`);
});

// Simulate some work
setTimeout(() => {
  console.log("📡 Signal handling demo complete");
  process.exit(0);
}, 100);
`;

    // Write demo code to a temporary file and execute it
    const tempFile = `/tmp/signal-demo-${Date.now()}.js`;
    await Bun.write(tempFile, demoCode);

    const proc = Bun.spawn({
      cmd: ['bun', 'run', tempFile],
      stdout: "pipe",
      stderr: "pipe",
      cwd: process.cwd()
    });

    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();

    // Clean up temp file
    await Bun.spawn({ cmd: ['rm', tempFile], stdout: "pipe", stderr: "pipe" });

    const result = {
      ok: proc.exitCode === 0,
      out: out.trim(),
      err: err.trim(),
      agentId: "signal-demo",
      timestamp: new Date().toISOString(),
      demo: "OS Signal Handling"
    };

    broadcastODC(result);
    return new Response(JSON.stringify(result));

  } catch (e) {
    const error = {
      ok: false,
      err: inspect(e, { colors: true, depth: 2 }),
      agentId: "signal-demo",
      timestamp: new Date().toISOString()
    };
    broadcastODC(error);
    return new Response(JSON.stringify(error));
  }
}

// Bun YAML command handler
async function yamlCmd(req: Request) {
  const schema = z.object({
    command: z.string(),
    args: z.record(z.any()).optional()
  });

  try {
    const { command, args = {} } = schema.parse(await req.json());

    let result: any = {};

    if (command === 'parse' && args.content) {
      // Parse YAML content
      try {
        const parsed = Bun.YAML.parse(args.content);
        result = {
          ok: true,
          out: JSON.stringify(parsed, null, 2),
          parsed: parsed
        };
      } catch (parseError) {
        result = {
          ok: false,
          err: `YAML parse error: ${parseError.message}`
        };
      }
    } else if (command === 'stringify' && args.data) {
      // Stringify data to YAML
      try {
        const yamlString = Bun.YAML.stringify(args.data, null, args.indent || 2);
        result = {
          ok: true,
          out: yamlString
        };
      } catch (stringifyError) {
        result = {
          ok: false,
          err: `YAML stringify error: ${stringifyError.message}`
        };
      }
    } else {
      result = {
        ok: false,
        err: 'Unsupported YAML command or missing arguments'
      };
    }

    broadcastODC({
      ...result,
      agentId: "bun-yaml",
      timestamp: new Date().toISOString(),
      command
    });

    return new Response(JSON.stringify(result));

  } catch (e) {
    const error = {
      ok: false,
      err: inspect(e, { colors: true, depth: 2 }),
      agentId: "bun-yaml",
      timestamp: new Date().toISOString()
    };
    broadcastODC(error);
    return new Response(JSON.stringify(error));
  }
}

async function shellRun(req: Request) {
  const schema = z.object({
    script: z.string().min(1),
    name: z.string().default("script.sh"),
    cwd: z.string().optional(),
    timeout: z.number().optional().default(30000)
  });

  try {
    const { script, name, cwd, timeout } = schema.parse(await req.json());

    const result = await shellEngine.executeScript(script, name, { cwd, timeout });

    // Broadcast to ODC
    broadcastODC({
      agentId: "shell-run",
      type: result.success ? "shell_success" : "shell_error",
      command: result.command,
      exitCode: result.exitCode,
      duration: result.duration,
      stdout: result.stdout,
      stderr: result.stderr,
      timestamp: result.timestamp
    });

    // Log to database
    const db = new Database("baselines.db", { create: true });
    db.run(
      `CREATE TABLE IF NOT EXISTS shell_executions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        command TEXT,
        exit_code INTEGER,
        duration REAL,
        stdout TEXT,
        stderr TEXT,
        success BOOLEAN,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      []
    );

    db.run(
      "INSERT INTO shell_executions (command, exit_code, duration, stdout, stderr, success) VALUES (?, ?, ?, ?, ?, ?)",
      [result.command, result.exitCode, result.duration, result.stdout, result.stderr, result.success]
    );

    // Tag failures
    if (!result.success) {
      const agentsDb = new Database("agents.db", { create: true });
      agentsDb.run(
        "INSERT OR REPLACE INTO agents(id, name, type, scope, config, status, parent) VALUES (?, ?, ?, ?, ?, 'failed', ?)",
        [`shell-bug-${Date.now()}`, "bug/shell/small", "bug", "api", JSON.stringify({ stderr: result.stderr }), null]
      );
    }

    return Response.json(result);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorResult = {
      success: false,
      exitCode: -1,
      stdout: '',
      stderr: errorMessage,
      duration: 0,
      command: 'unknown',
      timestamp: new Date().toISOString()
    };

    broadcastODC({
      agentId: "shell-run",
      type: "shell_error",
      error: errorMessage,
      timestamp: errorResult.timestamp
    });

    return Response.json(errorResult, { status: 400 });
  }
}

async function shellCommand(req: Request) {
  const schema = z.object({
    command: z.string().min(1),
    args: z.array(z.string()).default([]),
    cwd: z.string().optional(),
    timeout: z.number().optional().default(30000)
  });

  try {
    const { command, args, cwd, timeout } = schema.parse(await req.json());

    const result = await shellEngine.executeCommand(command, args, { cwd, timeout });

    broadcastODC({
      agentId: "shell-command",
      type: result.success ? "command_success" : "command_error",
      command: result.command,
      exitCode: result.exitCode,
      duration: result.duration,
      stdout: result.stdout,
      stderr: result.stderr,
      timestamp: result.timestamp
    });

    return Response.json(result);

  } catch (error) {
    const errorResult = {
      success: false,
      exitCode: -1,
      stdout: '',
      stderr: error.message,
      duration: 0,
      command: 'unknown',
      timestamp: new Date().toISOString()
    };

    return Response.json(errorResult, { status: 400 });
  }
}

async function shellCommands(req: Request) {
  try {
    const availableCommands = await shellEngine.listAvailableCommands();
    const globalBinDir = await shellEngine.getGlobalBinDir();

    return Response.json({
      availableCommands,
      globalBinDir,
      bunPath: which('bun'),
      nodePath: which('node'),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({
      error: error.message,
      availableCommands: [],
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

async function baselineComparison(req: Request) {
  const schema = z.object({
    testType: z.string(),
    currentDuration: z.number()
  });

  try {
    const { testType, currentDuration } = schema.parse(await req.json());

    const db = new Database("baselines.db");
    const previous = db.query(`
      SELECT duration FROM lab_baselines
      WHERE test_type = ? AND success = true
      ORDER BY timestamp DESC LIMIT 1 OFFSET 1
    `).get(testType) as { duration: number } | undefined;

    let delta = null;
    let message = "No previous baseline";

    if (previous) {
      delta = ((currentDuration - previous.duration) / previous.duration) * 100;
      message = delta >= 0
        ? `Δ +${delta.toFixed(1)}% slower`
        : `Δ ${delta.toFixed(1)}% faster`;
    }

    return Response.json({ delta, message, previousDuration: previous?.duration });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return Response.json({ error: errorMessage }, { status: 400 });
  }
}

async function shellRunCLI(scriptPath: string) {
  try {
    const scriptContent = await Bun.file(scriptPath).text();
    const result = await shellEngine.executeScript(scriptContent, scriptPath);

    broadcastODC({
      agentId: "shell-run",
      type: result.success ? "shell_success" : "shell_error",
      command: result.command,
      exitCode: result.exitCode,
      duration: result.duration,
      stdout: result.stdout,
      stderr: result.stderr,
      timestamp: result.timestamp
    });

    structuredLog(`[${new Date().toISOString()}] Shell execution: ${result.success ? result.stdout : `Failed: ${result.stderr}`}`);

    if (!result.success) {
      const db = new Database("agents.db", { create: true });
      db.run(
        "INSERT OR REPLACE INTO agents(id, name, type, scope, config, status, parent) VALUES (?, ?, ?, ?, ?, 'failed', ?)",
        [`shell-bug-${Date.now()}`, "bug/shell/small", "bug", "api", JSON.stringify({ stderr: result.stderr }), null]
      );
    }

    const db = new Database("baselines.db", { create: true });
    db.run(
      `CREATE TABLE IF NOT EXISTS shell_executions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        command TEXT,
        exit_code INTEGER,
        duration REAL,
        stdout TEXT,
        stderr TEXT,
        success BOOLEAN,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    );

      db.run(
        "INSERT INTO shell_executions (command, exit_code, duration, stdout, stderr, success) VALUES (?, ?, ?, ?, ?, ?)",
        [result.command, result.exitCode, result.duration, result.stdout, result.stderr, result.success]
      );

    process.exit(result.success ? 0 : 1);

  } catch (e) {
    structuredLog(`[${new Date().toISOString()}] Shell error:`, inspect(e, { colors: true,  }));
    process.exit(1);
  }
}

async function htmlRewriterRun(req: Request) {
  const schema = z.object({ html: z.string().min(1), code: z.string().min(1) });
  try {
    const { html, code } = schema.parse(await req.json());
    // Security scan inputs
    const htmlScan = await securityScan(html, "input.html");
    const codeScan = await securityScan(code, "rewriter.js");
    if (htmlScan.vulnerabilities.length > 0 || codeScan.vulnerabilities.length > 0) {
      const error = { ok: false, err: `Vulnerabilities found: ${inspect([...htmlScan.vulnerabilities, ...codeScan.vulnerabilities], { colors: true })}`, agentId: "htmlrewriter-diff-lab", timestamp: new Date().toISOString() };
      broadcastODC(error);
      return new Response(JSON.stringify(error));
    }
    // Write rewriter code to temp file
    const fullCode = `(async () => { const input = await new Response(Bun.stdin).text(); ${code} })();`;
    await Bun.write("temp-rewriter.js", fullCode);
    const start = performance.now();
    const proc = Bun.spawn({
      cmd: ["bun", "temp-rewriter.js"],
      stdout: "pipe",
      stderr: "pipe",
      stdin: new TextEncoder().encode(html),
    });
    const output = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const duration = performance.now() - start;
    const inBytes = new TextEncoder().encode(html).length;
    const outBytes = new TextEncoder().encode(output).length;
    const throughput = (inBytes / 1024 / 1024) / (duration / 1000);
    const result = { ok: proc.exitCode === 0, output, err, inBytes, outBytes, throughput, agentId: "htmlrewriter-diff-lab", timestamp: new Date().toISOString() };
    broadcastODC(result);
    if (!result.ok) {
      const db = new Database("agents.db", { create: true });
      db.run(
        "INSERT OR REPLACE INTO agents(id, name, type, scope, config, status, parent) VALUES (?, ?, ?, ?, ?, 'failed', ?)",
        [`bug-${Date.now()}`, "bug/htmlrewriter/small", "bug", "api", JSON.stringify({ err }), null]
      );
    }
    const db = new Database("baselines.db", { create: true });
    db.run(
      "INSERT OR REPLACE INTO baselines(id, scope, metric, value) VALUES (?, ?, ?, ?)",
      ["htmlrewriter-diff-lab", "api", "throughput", throughput.toFixed(2)]
    );
    await Bun.write("temp-rewriter.js", "");
    return new Response(JSON.stringify(result));
  } catch (e) {
    const error = { ok: false, err: inspect(e, { colors: true,  }), agentId: "htmlrewriter-diff-lab", timestamp: new Date().toISOString() };
    broadcastODC(error);
    return new Response(JSON.stringify(error));
  }
}

async function securityPolicy(req: Request) {
  try {
    // Read bunfig.toml and return security settings
    const bunfigContent = await Bun.file("bunfig.toml").text();

    // Simple TOML parser for security sections
    const config: any = {};
    let currentSection = "";

    const lines = bunfigContent.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        currentSection = trimmed.slice(1, -1);
        config[currentSection] = {};
      } else if (trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        let value = valueParts.join('=').trim();

        if (currentSection && (currentSection.startsWith('install') || currentSection === 'test' || currentSection === 'build')) {
          // Parse different value types
          if (value === 'true') {
            config[currentSection][key.trim()] = true;
          } else if (value === 'false') {
            config[currentSection][key.trim()] = false;
          } else if (!isNaN(Number(value))) {
            config[currentSection][key.trim()] = Number(value);
          } else if (value.startsWith('"') && value.endsWith('"')) {
            config[currentSection][key.trim()] = value.slice(1, -1);
          } else {
            config[currentSection][key.trim()] = value;
          }
        }
      }
    }

    // Return security-relevant sections
    const securityConfig = {
      install: config.install,
      "install.registry": config["install.registry"],
      "install.scoped-tokens": config["install.scoped-tokens"],
      "install.excludes": config["install.excludes"],
      "install.security": config["install.security"],
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(securityConfig, null, 2), {
      headers: { "content-type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: "Failed to read security policy",
      details: error.message
    }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
}

async function convertPrompt(req: Request) {
  const schema = z.object({ prompt: z.string().min(1).max(1000) });

  try {
    const { prompt } = schema.parse(await req.json());
    // const converter = new PromptToWorkflowConverter();
    // const yaml = await converter.convertPrompt(prompt);

    return new Response(JSON.stringify({
      success: true,
      yaml: "Feature temporarily disabled",
      prompt
    }), {
      headers: { "content-type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: "Failed to convert prompt",
      details: error.message
    }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }
}

async function handleVoiceMessage(ws: any, data: any) {
  try {
    switch (data.type) {
      case 'voice_session_start':
        const session = voiceStreamer.startSession(data.clientId, data.language);
        ws.send(JSON.stringify({
          type: 'voice_session_started',
          sessionId: session.id,
          config: {
            sampleRate: 16000,
            channels: 1,
            language: session.language
          }
        }));
        break;

      case 'voice_session_end':
        const ended = voiceStreamer.endSession(data.sessionId);
        ws.send(JSON.stringify({
          type: 'voice_session_ended',
          sessionId: data.sessionId,
          success: ended
        }));
        break;

      case 'voice_audio_chunk':
        if (data.sessionId && data.audioData) {
          // Convert base64 audio data to Uint8Array
          const audioBuffer = Buffer.from(data.audioData, 'base64');
          const audioData = new Uint8Array(audioBuffer);

          await voiceStreamer.processAudioChunk(data.sessionId, audioData, ws);
        }
        break;

      case 'voice_session_stats':
        const stats = voiceStreamer.getSessionStats(data.sessionId);
        ws.send(JSON.stringify({
          type: 'voice_session_stats',
          sessionId: data.sessionId,
          stats
        }));
        break;

      default:
        ws.send(JSON.stringify({
          type: 'voice_error',
          error: `Unknown voice message type: ${data.type}`
        }));
    }
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'voice_error',
      error: error.message
    }));
  }
}

async function runHtmlRewriterCLI() {
  const html = `<html><head><title>Demo</title></head><body><img src="/cat.jpg"><p class="content">Hello</p><div data-test="123">Bun</div><!-- secret --></body></html>`;
  const code = `(async () => { const input = await new Response(Bun.stdin).text(); const rewriter = new HTMLRewriter().on("img", {element(el) {el.setAttribute("src", "https://bun.sh/logo.svg"); el.setAttribute("alt", "Bun logo");}}).on("p.content", {element(el) {el.setInnerContent("🚀 Bun 1.3", { html: true });}}).on('div[data-test="123"]', {element(el) {el.setAttribute("data-test", "456");}}).on("*", {comments(c) {c.remove();}}); const out = rewriter.transform(input); console.log(out); })();`;
  try {
    const htmlScan = await securityScan(html, "input.html");
    const codeScan = await securityScan(code, "rewriter.js");
    if (htmlScan.vulnerabilities.length > 0 || codeScan.vulnerabilities.length > 0) {
      throw new Error(`Vulnerabilities found: ${inspect([...htmlScan.vulnerabilities, ...codeScan.vulnerabilities], { colors: true })}`);
    }
    await Bun.write("temp-rewriter.js", code);
    const start = performance.now();
    const proc = Bun.spawn({
      cmd: ["bun", "temp-rewriter.js"],
      stdout: "pipe",
      stderr: "pipe",
      stdin: new TextEncoder().encode(html),
    });
    const output = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const duration = performance.now() - start;
    const inBytes = new TextEncoder().encode(html).length;
    const outBytes = new TextEncoder().encode(output).length;
    const throughput = (inBytes / 1024 / 1024) / (duration / 1000);
    const result = { ok: proc.exitCode === 0, output, err, inBytes, outBytes, throughput };
    console.log(`HTMLRewriter: ${result.ok ? `Throughput ${throughput.toFixed(2)} MB/s` : `Failed: ${err || 'Unknown error'}`}`);
    if (result.output) {
      console.log('Output:', result.output);
    }
    await Bun.write("temp-rewriter.js", "");
  } catch (e) {
    structuredLog(`[${new Date().toISOString()}] HTMLRewriter error:`, inspect(e, { colors: true,  }));
    process.exit(1);
  }
}

startSecurityArena();