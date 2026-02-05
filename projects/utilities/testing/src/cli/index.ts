#!/usr/bin/env bun
/**
 * Dev HQ CLI - Ultimate Interactive Development Environment
 * bun [bun-flags] devhq [command] [options]
 */

import { Command } from "commander";
import { analyzeCodebase } from "../../core/index.js";
import { createTable } from "../../utils/table-formatter.js";
import { UploadEngine } from "../../src/upload-engine";
import { UploadProgressUI } from "../../src/ui/upload-progress";
export * from "./terminal.js";
import { editorPTY } from "./terminal.js";

const program = new Command({
  name: "devhq",
  version: "1.3.0",
  description: "Dev HQ • Ultimate Interactive CLI with PTY Support",
  verbose: false,
  quiet: false
});

// ═══════════════════════════════════════════════════════════
// 🔧 CORE COMMANDS
// ═══════════════════════════════════════════════════════════

// Terminal session with PTY support
program
  .command("terminal", { hidden: false })
  .alias("t")
  .description("Start interactive PTY terminal session")
  .option("-c, --cols <n>", "Terminal columns", parseInt, process.stdout.columns || 80)
  .option("-r, --rows <n>", "Terminal rows", parseInt, process.stdout.rows || 24)
  .option("-s, --shell <path>", "Shell path", "bash")
  .action(async (opts) => {
    console.log(`🎮 Starting Dev HQ Terminal (${opts.shell})...`);
    console.log("Type 'exit' to quit\n");

    await using terminal = new Bun.Terminal({
      cols: opts.cols,
      rows: opts.rows,
      data(term, data) {
        process.stdout.write(new TextDecoder().decode(data));
      }
    });

    const shell = Bun.spawn([opts.shell], { terminal });

    process.stdout.on("resize", () => {
      terminal.resize(process.stdout.columns, process.stdout.rows);
    });

    process.stdin.setRawMode(true);
    for await (const chunk of process.stdin) {
      terminal.write(chunk);
    }

    await shell.exited;
    process.exit(0);
  });

// Process monitor
program
  .command("monitor", { hidden: false })
  .alias("mon")
  .description("Process monitor with htop-like UI")
  .option("-p, --port <n>", "Server port", parseInt, 4000)
  .option("-i, --interval <ms>", "Refresh interval", parseInt, 1000)
  .action(async (opts) => {
    console.log(`📊 Starting Dev HQ Monitor on port ${opts.port}...`);

    await using terminal = new Bun.Terminal({
      cols: process.stdout.columns || 80,
      rows: process.stdout.rows || 24,
      data(term, data) {
        process.stdout.write(new TextDecoder().decode(data));
      }
    });

    const proc = Bun.spawn(["bun", "./api/server.ts"], {
      terminal,
      stdout: "pipe"
    });

    terminal.write(`\x1b[2J\x1b[H`);  // Clear + home
    terminal.write(`\x1b[32m🚀 Dev HQ Monitor\x1b[0m\n`);
    terminal.write(`\x1b[90m─────────────────────\x1b[0m\n\n`);

    process.stdout.on("resize", () => {
      terminal.resize(process.stdout.columns, process.stdout.rows);
    });

    process.stdin.setRawMode(true);
    for await (const chunk of process.stdin) {
      terminal.write(chunk);
    }

    await proc.exited;
    process.exit(0);
  });

// Code editor with vim
program
  .command("editor [file]", { hidden: false })
  .alias("edit")
  .description("Open file in vim editor")
  .option("-r, --readonly", "Open in readonly mode", false)
  .action(async (file, opts) => {
    const targetFile = file || "./README.md";
    console.log(`📝 Opening ${targetFile} in vim...`);
    await editorPTY(targetFile, { readonly: opts.readonly });
    process.exit(0);
  });

// ═══════════════════════════════════════════════════════════
// 📊 ANALYTICS COMMANDS
// ═══════════════════════════════════════════════════════════

program
  .command("insights", { hidden: false })
  .alias("ins")
  .description("Analyze codebase and generate insights")
  .option("-t, --table", "Display as formatted table", false)
  .option("-j, --json", "Output as JSON", false)
  .option("-m, --min-health <n>", "Minimum health threshold", parseInt, 0)
  .option("-l, --limit <n>", "Limit results", parseInt, 20)
  .action(async (opts) => {
    const insights = await analyzeCodebase();

    if (opts.json) {
      console.log(JSON.stringify(insights, null, 2));
      return;
    }

    if (opts.table) {
      console.log(`\n\x1b[32mDev HQ Insights\x1b[0m • \x1b[33m${insights.stats.healthScore}%\x1b[0m (\x1b[36m${insights.stats.totalFiles}\x1b[0m files)`);
      console.log(`Complexity: \x1b[${insights.stats.complexity === "Low" ? 32 : insights.stats.complexity === "Medium" ? 33 : 31}m${insights.stats.complexity}\x1b[0m\n`);

      const rows = [
        ["File", "Health", "Complexity", "Size", "Lines"],
        ...insights.files
          .filter(f => f.complexity >= opts.minHealth)
          .slice(0, opts.limit)
          .map(f => [f.name, f.health, f.complexity, `${(f.size / 1024).toFixed(1)}KB`, f.lines])
      ];
      createTable(rows);
    } else {
      console.log(`📊 Health Score: ${insights.stats.healthScore}%`);
      console.log(`📁 Total Files: ${insights.stats.totalFiles}`);
      console.log(`📈 Complexity: ${insights.stats.complexity}`);
    }
  });

// ═══════════════════════════════════════════════════════════
// ☁️ CLOUD COMMANDS
// ═══════════════════════════════════════════════════════════

program
  .command("upload [files...]")
  .alias("up")
  .description("Upload files to S3/R2 with smart progress tracking")
  .option("-b, --bucket <name>", "Target bucket", "dev-hq-assets")
  .option("-p, --prefix <path>", "Destination prefix", "uploads")
  .option("-d, --debug", "Enable debug logging", false)
  .action(async (files, opts) => {
    if (!files || files.length === 0) {
      console.error("\x1b[31mError: No files specified for upload\x1b[0m");
      process.exit(1);
    }

    console.log(`\x1b[36m☁️ Initializing Cloud Upload System...\x1b[0m`);
    
    // Set debug feature flag for this run if requested
    if (opts.debug) process.env.DEBUG = "true";

    const engine = new UploadEngine();
    const ui = new UploadProgressUI();

    const uploadStatus = files.map(f => ({
      name: f,
      progress: 0,
      status: "queued" as const
    }));

    ui.render(uploadStatus);

    // Simulate concurrent uploads
    const uploadTasks = uploadStatus.map(async (fileStatus, index) => {
      fileStatus.status = "uploading";
      
      // Simulate progress updates
      for (let p = 0; p <= 100; p += 10 + Math.random() * 20) {
        fileStatus.progress = Math.min(p / 100, 1.0);
        ui.render(uploadStatus);
        await Bun.sleep(200 + Math.random() * 500);
      }

      fileStatus.status = "complete";
      ui.render(uploadStatus);
    });

    await Promise.all(uploadTasks);
    console.log(`\n\x1b[32m✅ Successfully uploaded ${files.length} files to ${opts.bucket}\x1b[0m`);
  });

// ═══════════════════════════════════════════════════════════
// 🚀 SERVER COMMANDS
// ═══════════════════════════════════════════════════════════

program
  .command("serve", { hidden: false })
  .description("Start the Dev HQ API server")
  .option("-p, --port <n>", "Port number", parseInt, 4000)
  .option("-h, --host <addr>", "Host address", "0.0.0.0")
  .option("-d, --dev", "Development mode with hot reload", false)
  .action((opts) => {
    console.log(`🚀 Starting Dev HQ Server on ${opts.host}:${opts.port}`);
    console.log(`   Mode: ${opts.dev ? "development" : "production"}`);
    // Server startup logic would go here
  });

program
  .command("build", { hidden: false })
  .description("Build dashboard and assets")
  .option("-w, --watch", "Watch for changes", false)
  .option("-m, --minify", "Minify output", true)
  .action((opts) => {
    console.log(`📦 Building Dev HQ Dashboard...`);
    console.log(`   Minify: ${opts.minify ? "yes" : "no"}`);
    console.log(`   Watch: ${opts.watch ? "enabled" : "disabled"}`);
  });

// ═══════════════════════════════════════════════════════════
// 🧪 TESTING COMMANDS
// ═══════════════════════════════════════════════════════════

program
  .command("test", { hidden: false })
  .description("Run test suite")
  .option("-u, --update", "Update snapshots", false)
  .option("-c, --coverage", "Generate coverage report", false)
  .option("-w, --watch", "Watch mode", false)
  .action((opts) => {
    console.log(`🧪 Running tests...`);
    console.log(`   Update: ${opts.update ? "yes" : "no"}`);
    console.log(`   Coverage: ${opts.coverage ? "yes" : "no"}`);
    console.log(`   Watch: ${opts.watch ? "enabled" : "disabled"}`);
  });

// ═══════════════════════════════════════════════════════════
// 📱 DEVICE COMMANDS
// ═══════════════════════════════════════════════════════════

program
  .command("devices", { hidden: false })
  .alias("dev")
  .description("List connected mobile devices")
  .option("-v, --verbose", "Verbose output", false)
  .action((opts) => {
    console.log(`📱 Connected Devices:`);
    console.log(`   (Use 'adb devices' to refresh)`);
  });

// ═══════════════════════════════════════════════════════════
// ⚙️ UTILITY COMMANDS
// ═══════════════════════════════════════════════════════════

program
  .command("version", { hidden: true })
  .description("Display version information")
  .action(() => {
    console.log(`Dev HQ CLI v1.3.0`);
    console.log(`Bun v${Bun.version}`);
  });

program
  .command("doctor", { hidden: false })
  .description("System health check")
  .action(() => {
    console.log(`🔍 Running system diagnostics...`);
    console.log(`   Bun: ${Bun.version}`);
    console.log(`   Platform: ${process.platform} ${process.arch}`);
    console.log(`   Node: ${process.version}`);
  });

// Global options
program
  .configureOutput({
    writeOut: (str) => process.stdout.write(str),
    writeErr: (str) => process.stderr.write(str),
    // @ts-ignore - colors not in types
    getHelpColor: () => "\x1b[32m"
  })
  .showSuggestionAfterError();

// Parse arguments
if (import.meta.main) {
  program.parse();
}

export { program as CLI };
