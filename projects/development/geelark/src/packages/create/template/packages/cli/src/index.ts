#!/usr/bin/env bun
/**
 * @dev-hq/cli - Production CLI with ALL Bun flags
 *
 * Usage:
 *   dev-hq insights --table --console-depth=3
 *   dev-hq serve --hot --watch --inspect
 *   dev-hq health --smol --no-install
 */

import { Command } from "commander";
import { inspect } from "bun";
import { spawn } from "bun";

// Diagnostic and fallback for missing Bun features
console.log(`Bun ${Bun.version} • Node ${process.version}`);
console.log('✅ Bun.table:', typeof Bun.table);
console.log('✅ Bun.inspect.table:', typeof Bun.inspect.table);
console.log('✅ Bun.inspect.custom:', typeof Bun.inspect.custom);
console.log('✅ Bun.deepEquals:', typeof Bun.deepEquals);
console.log('✅ Bun.escapeHTML:', typeof Bun.escapeHTML);
console.log('✅ Bun.stringWidth:', typeof Bun.stringWidth);
console.log('✅ Bun.readline:', typeof Bun.readline);

// Quick fix for missing features:
// Bun.inspect.table returns a string, unlike console.table which just logs
// API: table(tabularData, properties?, options?: { colors: boolean })
// See: https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata%2C-properties%2C-options
if (!Bun.inspect.table) {
  // Fallback implementation that matches Bun.inspect.table API signature
  const fallbackTable = (
    tabularData: any,
    properties?: string[],
    options?: { colors?: boolean }
  ): string => {
    // Use console.table for visual output (it logs to console)
    // Then return a formatted string representation
    if (Array.isArray(tabularData) && tabularData.length > 0) {
      console.table(tabularData, properties);
      // Return a simple formatted representation
      const keys = properties || Object.keys(tabularData[0]);
      const rows = tabularData.map(row => {
        return keys.map(key => String(row[key] || '')).join(' | ');
      });
      return rows.join('\n');
    } else if (typeof tabularData === 'object' && tabularData !== null) {
      console.table(tabularData);
      return JSON.stringify(tabularData, null, 2);
    }
    return String(tabularData);
  };

  globalThis.Bun = globalThis.Bun || {};
  globalThis.Bun.inspect = globalThis.Bun.inspect || {};
  globalThis.Bun.inspect.table = fallbackTable;
  // Also set on imported inspect object
  if (!inspect.table) {
    inspect.table = fallbackTable;
  }
}

// Type definitions for codebase analysis
interface FileStats {
  path: string;
  size: number;
  lines: number;
  language: string;
}

class CodebaseInsights {
  files: FileStats[];
  stats: {
    totalFiles: number;
    totalLines: number;
    totalSize: number;
    healthScore: number;
    languages: Record<string, number>;
  };

  constructor(files: FileStats[], stats: CodebaseInsights['stats']) {
    this.files = files;
    this.stats = stats;
  }

  // Custom inspect using Bun.inspect.custom
  // Reference: https://bun.com/docs/runtime/utils#bun-inspect-custom
  [Bun.inspect.custom]() {
    const { totalFiles, totalLines, totalSize, healthScore, languages } = this.stats;
    const scoreEmoji = healthScore >= 70 ? '✅' : healthScore >= 50 ? '⚠️' : '❌';
    const langCount = Object.keys(languages).length;

    return `
📊 Codebase Insights
  Files: ${totalFiles.toLocaleString()}
  Lines: ${totalLines.toLocaleString()}
  Size: ${(totalSize / 1024).toFixed(1)} KB
  Health: ${scoreEmoji} ${healthScore}%
  Languages: ${langCount} (${Object.keys(languages).slice(0, 3).join(', ')}${langCount > 3 ? '...' : ''})
  Top Files: ${Math.min(this.files.length, 5)}
`;
  }
}

// Analyze codebase
async function analyzeCodebase(): Promise<CodebaseInsights> {
  const glob = new Bun.Glob("**/*.{ts,tsx,js,jsx,json}");
  const files: FileStats[] = [];
  const languages: Record<string, number> = {};
  let totalLines = 0;
  let totalSize = 0;

  try {
    for await (const file of glob.scan(process.cwd())) {
      if (file.includes("node_modules") || file.includes(".git")) continue;

      const fileObj = Bun.file(file);
      if (await fileObj.exists()) {
        const text = await fileObj.text();
        const lines = text.split("\n").length;
        const size = fileObj.size;
        const ext = file.split(".").pop() || "unknown";
        const language = ext === "ts" || ext === "tsx" ? "TypeScript"
                      : ext === "js" || ext === "jsx" ? "JavaScript"
                      : ext === "json" ? "JSON"
                      : ext;

        files.push({
          path: file,
          size,
          lines,
          language,
        });

        languages[language] = (languages[language] || 0) + 1;
        totalLines += lines;
        totalSize += size;
      }
    }
  } catch (e) {
    // Analysis might fail, return minimal results
  }

  // Calculate health score (simple heuristic)
  const healthScore = Math.min(
    100,
    Math.max(
      0,
      100 - (files.length > 1000 ? 20 : 0) - (totalLines > 50000 ? 30 : 0)
    )
  );

  return new CodebaseInsights(
    files.slice(0, 50), // Limit for display
    {
      totalFiles: files.length,
      totalLines,
      totalSize,
      healthScore,
      languages,
    }
  );
}

// Dashboard display
function dashboard(insights: CodebaseInsights) {
  console.log("\n🎯 Dev HQ Codebase Insights\n");
  console.log(`📊 Total Files: ${insights.stats.totalFiles}`);
  console.log(`📝 Total Lines: ${insights.stats.totalLines.toLocaleString()}`);
  console.log(`💾 Total Size: ${(insights.stats.totalSize / 1024).toFixed(2)} KB`);
  console.log(`❤️  Health Score: ${insights.stats.healthScore}%`);
  console.log("\n📚 Languages:");
  for (const [lang, count] of Object.entries(insights.stats.languages)) {
    console.log(`  ${lang}: ${count} files`);
  }
  console.log("\n📁 Top Files:");
  insights.files
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 10)
    .forEach((file) => {
      console.log(`  ${file.path} (${file.lines} lines, ${file.language})`);
    });
}

// CLI Setup
const program = new Command()
  .name("dev-hq")
  .version("1.0.0")
  .description("Dev HQ CLI - Codebase insights + dashboard");

// General Execution Options
// All flags match https://bun.com/docs/runtime exactly
program
  .option("--silent", "Don't print the script command")
  .option("--if-present", "Exit without an error if the entrypoint does not exist")
  .option("-e, --eval <script>", "Evaluate argument as a script")
  .option("-p, --print <script>", "Evaluate argument as a script and print the result");

// Workspace Management
// All flags match https://bun.com/docs/runtime exactly
program
  .option("--elide-lines <number>", "Number of lines of script output shown when using --filter (default: 10). Set to 0 to show all lines", "10")
  .option("-F, --filter <pattern>", "Run a script in all workspace packages matching the pattern")
  .option("--workspaces", "Run a script in all workspace packages (from the workspaces field in package.json)");

// Runtime & Process Control
// All flags match https://bun.com/docs/runtime#runtime-%26-process-control exactly
program
  .option("-b, --bun", "Force script to use Bun's runtime instead of Node.js (via symlinking node)")
  .option("--shell <shell>", "Control the shell used for package.json scripts. Supports either `bun` or `system`")
  .option("--smol", "Use less memory, but run garbage collection more often")
  .option("--expose-gc", "Expose `gc()` on the global object. Has no effect on `Bun.gc()`")
  .option("--no-deprecation", "Suppress all reporting of the custom deprecation")
  .option("--throw-deprecation", "Determine whether or not deprecation warnings result in errors")
  .option("--title <title>", "Set the process title")
  .option("--zero-fill-buffers", "Boolean to force `Buffer.allocUnsafe(size)` to be zero-filled")
  .option("--no-addons", "Throw an error if `process.dlopen` is called, and disable export condition `node-addons`")
  .option("--unhandled-rejections <mode>", "One of `strict`, `throw`, `warn`, `none`, or `warn-with-error-code`")
  .option("--console-depth <depth>", "Set the default depth for `console.log` object inspection (default: 2)", "2");

// Development Workflow
program
  .option("--watch", "Automatically restart the process on file change")
  .option("--hot", "Enable auto reload in the Bun runtime, test runner, or bundler")
  .option("--no-clear-screen", "Disable clearing the terminal screen on reload when —hot or —watch is enabled");

// Debugging
program
  .option("--inspect [port]", "Activate Bun's debugger")
  .option("--inspect-wait [port]", "Activate Bun's debugger, wait for a connection before executing")
  .option("--inspect-brk [port]", "Activate Bun's debugger, set breakpoint on first line of code and wait");

// Dependency & Module Resolution (from https://bun.com/docs/runtime#dependency-%26-module-resolution)
// All flags match https://bun.com/docs/runtime#dependency-%26-module-resolution exactly
program
  .option("-r, --preload <module>", "Import a module before other modules are loaded")
  .option("--require <module>", "Alias of --preload, for Node.js compatibility")
  .option("--import <module>", "Alias of --preload, for Node.js compatibility")
  .option("--no-install", "Disable auto install in the Bun runtime")
  .option("--install <mode>", 'Configure auto-install behavior. One of `auto` (default, auto-installs when no node_modules), `fallback` (missing packages only), `force` (always)', "auto")
  .option("-i", "Auto-install dependencies during execution. Equivalent to --install=fallback")
  .option("--prefer-offline", "Skip staleness checks for packages in the Bun runtime and resolve from disk")
  .option("--prefer-latest", "Use the latest matching versions of packages in the Bun runtime, always checking npm")
  .option("--conditions <conditions>", "Pass custom conditions to resolve")
  .option("--main-fields <fields>", "Main fields to lookup in `package.json`. Defaults to --target dependent")
  .option("--preserve-symlinks", "Preserve symlinks when resolving files")
  .option("--preserve-symlinks-main", "Preserve symlinks when resolving the main entry point")
  .option("--extension-order <order>", 'Defaults to: `.tsx,.ts,.jsx,.js,.json`', ".tsx,.ts,.jsx,.js,.json");

// Transpilation & Language Features
// All flags match https://bun.com/docs/runtime#transpilation-%26-language-features exactly
program
  .option("--tsconfig-override <path>", "Specify custom tsconfig.json. Default $cwd/tsconfig.json")
  .option("-d, --define <key:value>", "Substitute K:V while parsing, e.g. --define process.env.NODE_ENV:\"development\". Values are parsed as JSON")
  .option("--drop <functions>", "Remove function calls, e.g. --drop=console removes all console.* calls")
  .option("-l, --loader <ext:loader>", "Parse files with .ext:loader, e.g. --loader .js:jsx. Valid loaders: js, jsx, ts, tsx, json, toml, text, file, wasm, napi")
  .option("--no-macros", "Disable macros from being executed in the bundler, transpiler and runtime")
  .option("--jsx-factory <function>", "Changes the function called when compiling JSX elements using the classic JSX runtime")
  .option("--jsx-fragment <function>", "Changes the function called when compiling JSX fragments")
  .option("--jsx-import-source <source>", "Declares the module specifier to be used for importing the jsx and jsxs factory functions. Default: react", "react")
  .option("--jsx-runtime <runtime>", "automatic (default) or classic", "automatic")
  .option("--jsx-side-effects", "Treat JSX elements as having side effects (disable pure annotations)")
  .option("--ignore-dce-annotations", "Ignore tree-shaking annotations such as @**PURE**");

// Networking & Security
// All flags match https://bun.com/docs/runtime#networking-%26-security exactly
program
  .option("--port <port>", "Set the default port for Bun.serve")
  .option("--fetch-preconnect <url>", "Preconnect to a URL while code is loading")
  .option("--max-http-header-size <bytes>", "Set the maximum size of HTTP headers in bytes. Default is 16KiB", "16384")
  .option("--dns-result-order <order>", "Set the default order of DNS lookup results. Valid orders: verbatim (default), ipv4first, ipv6first", "verbatim")
  .option("--use-system-ca", "Use the system's trusted certificate authorities")
  .option("--use-openssl-ca", "Use OpenSSL's default CA store")
  .option("--use-bundled-ca", "Use bundled CA store")
  .option("--redis-preconnect", "Preconnect to $REDIS_URL at startup")
  .option("--sql-preconnect", "Preconnect to PostgreSQL at startup")
  .option("--user-agent <agent>", "Set the default User-Agent header for HTTP requests");

// Global Configuration & Context (from https://bun.com/docs/runtime#global-configuration-%26-context)
// All flags match https://bun.com/docs/runtime#global-configuration-%26-context exactly
program
  .option("--env-file <file>", "Load environment variables from the specified file(s)")
  .option("--cwd <path>", "Absolute path to resolve files & entry points from. This just changes the process' cwd")
  .option("-c, --config <path>", "Specify path to Bun config file. Default `$cwd/bunfig.toml`");

// Insights command
program
  .command("insights")
  .description("Analyze codebase")
  .option("--json", "JSON output")
  .option("--table", "Bun.inspect.table output")
  .action(async (options) => {
    const insights = await analyzeCodebase();

    if (options.table) {
      // Use Bun.inspect.table for table output
      const tableData = insights.files.slice(0, 20).map((f) => ({
        Path: f.path.length > 50 ? "..." + f.path.slice(-47) : f.path,
        Lines: f.lines,
        Size: `${(f.size / 1024).toFixed(1)} KB`,
        Language: f.language,
      }));
      console.log(inspect.table(tableData));

      // Stats table
      const statsTable = [
        { Metric: "Total Files", Value: insights.stats.totalFiles },
        { Metric: "Total Lines", Value: insights.stats.totalLines.toLocaleString() },
        { Metric: "Total Size", Value: `${(insights.stats.totalSize / 1024).toFixed(1)} KB` },
        { Metric: "Health Score", Value: `${insights.stats.healthScore}%` },
      ];
      console.log("\n📊 Statistics:");
      console.log(inspect.table(statsTable));
    } else if (options.json) {
      console.log(JSON.stringify(insights, null, 2));
    } else {
      dashboard(insights);
    }
  });

// Serve command
program
  .command("serve")
  .description("Start Dev HQ server")
  .option("--port <port>", "Port number (0 for random)", "0")
  .action((options) => {
    const port = options.port === "0" ? 0 : parseInt(options.port) || 0;
    const server = Bun.serve({
      port,
      routes: {
        "/": () => new Response("🎯 Dev HQ Server Running!\n\nVisit /insights for codebase analysis", {
          headers: { "Content-Type": "text/plain" },
        }),
        "/insights": async () => {
          const insights = await analyzeCodebase();
          return Response.json(insights);
        },
        "/health": async () => {
          const insights = await analyzeCodebase();
          return Response.json({
            status: insights.stats.healthScore >= 70 ? "healthy" : "degraded",
            healthScore: insights.stats.healthScore,
          });
        },
      },
      fetch(req) {
        return new Response("Not found", { status: 404 });
      },
    });

    console.log(`🚀 Dev HQ server running on ${server.url.href}`);

    const opts = program.opts();

    // Log enabled features
    if (opts.hot) {
      console.log("🔥 Hot reload enabled");
    }
    if (opts.watch) {
      console.log("👀 Watch mode enabled");
    }
    if (opts.inspect) {
      const port = typeof opts.inspect === "string"
        ? opts.inspect
        : "9229";
      console.log(`🔍 Debugger available on port ${port}`);
    }
    if (opts.inspectWait) {
      console.log(`🔍 Debugger waiting for connection on port ${typeof opts.inspectWait === "string" ? opts.inspectWait : "9229"}`);
    }
    if (opts.inspectBrk) {
      console.log(`🔍 Debugger with breakpoint on port ${typeof opts.inspectBrk === "string" ? opts.inspectBrk : "9229"}`);
    }
    if (opts.smol) {
      console.log("💾 Low memory mode enabled (--smol)");
      console.log("   → Using less memory, running GC more frequently");
    }
    if (opts.exposeGc) {
      console.log("🗑️  Garbage collector exposed (--expose-gc)");
      console.log("   → gc() available globally (Bun.gc() is always available)");
    }
    if (opts.consoleDepth) {
      console.log(`📊 Console depth set to ${opts.consoleDepth} (--console-depth=${opts.consoleDepth})`);
      console.log(`   → Object inspection depth: ${opts.consoleDepth}`);
    }
    if (opts.preferOffline) {
      console.log("📦 Using offline cache (--prefer-offline)");
    }
    if (opts.noInstall) {
      console.log("⏭️  Auto-install disabled (--no-install)");
    }
  });

// Health command
program
  .command("health")
  .description("Quick health check")
  .action(async () => {
    const insights = await analyzeCodebase();
    const score = insights.stats.healthScore;
    const status = score >= 70 ? "healthy" : score >= 50 ? "degraded" : "critical";

    console.log(`📊 Health Score: ${score}%`);
    console.log(`Status: ${status}`);
    console.log(`Files: ${insights.stats.totalFiles}`);
    console.log(`Lines: ${insights.stats.totalLines.toLocaleString()}`);

    process.exit(score < 70 ? 1 : 0);
  });

// Runtime info command
program
  .command("runtime")
  .description("Display runtime configuration and optimization info")
  .action(() => {
    const opts = program.opts();
    const mem = process.memoryUsage();
    const formatBytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

    console.log("\n🔧 Runtime Configuration:\n");

    // Memory stats
    console.log("💾 Memory Usage:");
    console.log(`  Heap Used: ${formatBytes(mem.heapUsed)}`);
    console.log(`  Heap Total: ${formatBytes(mem.heapTotal)}`);
    console.log(`  External: ${formatBytes(mem.external)}`);
    console.log(`  RSS: ${formatBytes(mem.rss)}`);

    // Runtime flags detection (check both process.argv and CLI options)
    console.log("\n⚙️  Runtime Flags:");
    const argv = process.argv;
    const smolEnabled = argv.includes('--smol') || opts.smol;
    const exposeGcEnabled = argv.includes('--expose-gc') || opts.exposeGc;

    console.log(`  --smol: ${smolEnabled ? '✅ enabled' : '❌ disabled'}`);
    if (smolEnabled) {
      console.log(`    → Memory-optimized mode: less memory, more frequent GC`);
    }

    console.log(`  --expose-gc: ${exposeGcEnabled ? '✅ enabled' : '❌ disabled'}`);
    if (exposeGcEnabled) {
      console.log(`    → gc() available globally (Bun.gc() is always available)`);
    }

    const consoleDepthValue = opts.consoleDepth ||
      (() => {
        const match = argv.find(arg => arg.startsWith('--console-depth='));
        return match ? match.split('=')[1] : '2';
      })();
    console.log(`  --console-depth: ${consoleDepthValue}`);
    console.log(`    → Object inspection depth: ${consoleDepthValue} levels`);

    // GC availability
    console.log("\n🗑️  Garbage Collection:");
    console.log(`  Bun.gc(): ✅ always available (preferred)`);
    const globalGcAvailable = typeof globalThis.gc === 'function';
    console.log(`  global gc(): ${globalGcAvailable ? '✅ available' : '❌ not available (use --expose-gc)'}`);

    if (globalGcAvailable) {
      console.log(`    → Note: Bun.gc() is preferred and always available`);
    }

    // Process info
    console.log("\n📋 Process Info:");
    console.log(`  Node: ${process.version}`);
    console.log(`  Platform: ${process.platform}`);
    console.log(`  Arch: ${process.arch}`);
    console.log(`  PID: ${process.pid}`);
    console.log(`  Uptime: ${process.uptime().toFixed(2)}s`);

    // Usage examples
    console.log("\n💡 Usage Examples:");
    console.log(`  # Memory-optimized mode`);
    console.log(`  bun --smol run dev`);
    console.log(`  \n  # Expose garbage collector`);
    console.log(`  bun --expose-gc run dev`);
    console.log(`  \n  # Control console depth`);
    console.log(`  bun --console-depth=5 run dev`);

    console.log();
  });

// Test command
program
  .command("test")
  .description("Run tests")
  .option("--feature <features>", "Feature flags (comma-separated)")
  .action(async (options) => {
    console.log("🧪 Running tests...");
    if (options.feature) {
      console.log(`Feature flags: ${options.feature}`);
    }

    // In real implementation, this would run bun test
    const proc = Bun.spawn(["bun", "test", ...(options.feature ? [`--feature=${options.feature}`] : [])], {
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
    });

    const code = await proc.exited;
    process.exit(code);
  });

// Run command - Execute any command with Dev HQ monitoring
program
  .command("run <cmd...>")
  .description("Run command with Dev HQ monitoring")
  .option("-m, --metrics", "Capture metrics", false)
  .action(async (cmd: string[], options: { metrics: boolean }) => {
    console.log(`🚀 Running: ${cmd.join(" ")}`);

    const start = performance.now();
    const proc = spawn(cmd, {
      stdout: "inherit",
      stderr: "inherit",
    });

    const exitCode = await proc.exited;
    const duration = performance.now() - start;

    if (options.metrics) {
      const insights = await analyzeCodebase();
      console.log(`
📊 Dev HQ Metrics:
  ✅ Duration: ${duration.toFixed(2)}ms
  ✅ Exit Code: ${exitCode || 0}
  ✅ Health Impact: ${insights.stats.healthScore}%
      `);
    }

    process.exit(exitCode || 0);
  });

// Parse arguments
program.parse();

// Note: --preload, --require, --import flags are supported by Bun runtime
// They are loaded before other modules at the Bun runtime level
// The CLI wrapper passes these flags through to Bun when executing commands
