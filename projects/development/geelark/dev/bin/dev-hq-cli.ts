#!/usr/bin/env bun
/**
 * Dev HQ CLI - Enhanced Bun Syntax Implementation
 *
 * Perfect flag separation pattern with Commander.js and Bun-specific optimizations
 *
 * Usage:
 *   bunx dev-hq [command] [cli-flags]
 *   bun [bun-flags] dev-hq-cli.ts [command] [cli-flags]
 *
 * Examples:
 *   bunx dev-hq insights --table
 *   bunx dev-hq insights --json > insights.json
 *   bunx dev-hq insights --markdown > README.md
 *   bunx dev-hq insights --csv > insights.csv
 *   bun bin/dev-hq-cli.ts insights --table
 */

import { inspect, spawn } from "bun";
import { Command } from "commander";
import { DevHQActions, DevHQAutomation } from "../dev-hq/core/automation.js";
import {
    handleCommandError,
    setBunErrorHandler,
    theme,
} from "./errors.js";

// Add structured error handling
setBunErrorHandler({
  onBunError: (error) => {
    console.error(`${theme.error}🚨 Bun Runtime Error:${theme.reset}`);
    console.error(error.message);

    if (process.env.DEV_HQ_DEBUG) {
      console.error(inspect(error, { depth: 3, colors: true }));
    }

    process.exit(1);
  },
});

// Enhanced CLI configuration
const CONFIG = {
  // Command aliases for shortcuts
  COMMAND_ALIASES: {
    'i': 'insights',
    'h': 'health',
    't': 'test',
    'g': 'git',
    'd': 'docker',
    's': 'serve',
    'a': 'analyze',
    'c': 'cloc',
    'r': 'run',
    'p': 'profile'
  } as Record<string, string>,

  // Auto-corrections for common mistakes
  COMMAND_CORRECTIONS: {
    'insight': 'insights',
    'helth': 'health',
    'metrix': 'metrics',
    'teste': 'test',
    'analize': 'analyze',
    'analys': 'analyze',
    'doker': 'docker',
    'serv': 'serve',
    'profle': 'profile'
  } as Record<string, string>,

  // Local-only commands (development-only, not recommended for global binary)
  LOCAL_ONLY_COMMANDS: ['debug', 'profile', 'coverage'],

  // Default flags for commands
  DEFAULT_FLAGS: {
    'insights': ['--table'],
    'test': ['--verbose'],
    'health': [],
    'profile': ['--verbose']
  } as Record<string, string[]>
};

// Type definitions
interface CodebaseInsights {
  files: Array<{
    path: string;
    size: number;
    lines: number;
    language: string;
  }>;
  stats: {
    totalFiles: number;
    totalLines: number;
    totalSize: number;
    healthScore: number;
    languages: Record<string, number>;
    dependencies?: {
      installed: number;
      outdated: number;
      missing: number;
    };
  };
  performance?: {
    analysisTime: number;
    memoryUsed: number;
    heapGrowth: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    rss: number;
    filesPerSecond: number;
    avgComplexity: number;
    avgLineCount: number;
    functionCount: number;
    classCount: number;
    importCount: number;
    totalComplexity: number;
  };
}

interface FileStats {
  path: string;
  size: number;
  lines: number;
  language: string;
}

// Initialize CLI program
const program = new Command();

// Development mode auto-detection
const isDevelopmentMode = process.argv[1].includes('dev-hq-cli.ts');
const isGlobalMode = !isDevelopmentMode;

if (isDevelopmentMode) {
  // Auto-enable development features
  process.env.NODE_ENV = 'development';
  if (!process.env.DEBUG) {
    process.env.DEBUG = 'dev-hq:*';
  }
  console.log('🔧 Development mode enabled automatically');
}

// Flag separation layer
type ParsedFlags = {
  bunFlags: string[];
  cliFlags: string[];
  command: string;
  args: string[];
};

function parseFlags(args: string[]): ParsedFlags {
  const bunFlags: string[] = [];
  const cliFlags: string[] = [];
  let scriptIndex = -1;
  let commandIndex = -1;

  args.forEach((arg, i) => {
    if (arg.endsWith('.ts') || arg.endsWith('.js')) {
      scriptIndex = i;
    } else if (scriptIndex === -1 && arg.startsWith('--')) {
      bunFlags.push(arg);  // Flags before script are Bun's
    } else if (scriptIndex !== -1 && commandIndex === -1 && !arg.startsWith('-')) {
      commandIndex = i;  // First non-flag after script is command
    } else if (commandIndex !== -1 && i > commandIndex && arg.startsWith('-')) {
      cliFlags.push(arg);  // Flags after command are CLI's
    }
  });

  const command = commandIndex !== -1 ? args[commandIndex] : '';
  const commandArgs = commandIndex !== -1 ? args.slice(commandIndex + 1) : [];

  return { bunFlags, cliFlags, command, args: commandArgs };
}

// Auto-correct common mistakes
function autoCorrectCommand(command: string): string {
  if (command in CONFIG.COMMAND_CORRECTIONS) {
    console.log(`💡 Did you mean "${CONFIG.COMMAND_CORRECTIONS[command]}"?`);
    return CONFIG.COMMAND_CORRECTIONS[command];
  }
  return command;
}

// Resolve command aliases
function resolveCommand(command: string): string {
  return CONFIG.COMMAND_ALIASES[command] || command;
}

// Auto-add missing default flags
function autoAddFlags(flags: string[], command: string): string[] {
  if (!flags.length && command in CONFIG.DEFAULT_FLAGS) {
    console.log(`⚡ Auto-adding default flags: ${CONFIG.DEFAULT_FLAGS[command].join(' ')}`);
    return [...CONFIG.DEFAULT_FLAGS[command]];
  }
  return flags;
}

// Handle global vs local command separation
function handleGlobalCommand(command: string): void {
  if (isGlobalMode && CONFIG.LOCAL_ONLY_COMMANDS.includes(command)) {
    console.error(`🚫 Command "${command}" is development-only.`);
    console.error('💡 Use the local TypeScript implementation:');
    console.error(`   bun dev-hq-cli.ts ${command}`);
    console.error('📦 Or install locally: npm run dev-hq --', command);
    process.exit(1);
  }
}

program
  .name("dev-hq")
  .description("Dev HQ CLI - Codebase insights with Bun-native features")
  .version("2.0.0");

// Global options (CLI-specific flags)
program
  .option("--bun", "Bun-themed ASCII output")
  .option("--check-deps", "Validate package.json dependencies")
  .option("--perf", "Show Bun execution timing")
  .option("--json", "JSON format output")
  .option("--table", "Table format output (Bun.inspect.table)")
  .option("--verbose", "Verbose logging")
  .option("--quiet", "Quiet mode")
  .option("--timeout <ms>", "Command timeout in milliseconds", "30000")
  .option("--output <file>", "Output to file")
  .option("--format <format>", "Output format (json|table|pretty)", "pretty");

// Analyze codebase with Bun-native file operations
async function analyzeCodebase(options: {
  checkDeps?: boolean;
  perf?: boolean;
}): Promise<CodebaseInsights> {
  const startTime = performance.now();
  const startMemory = process.memoryUsage();
  let startHeap = { heapUsed: 0, heapTotal: 0 };

  try {
    // Try to get Bun heap usage if available
    if (typeof Bun !== 'undefined' && (Bun as any).heapUsage) {
      startHeap = (Bun as any).heapUsage();
    }
  } catch {
    // Fall back to 0 if not available
  }

  const glob = new Bun.Glob("**/*.{ts,tsx,js,jsx,json,mjs,cjs}");
  const files: FileStats[] = [];
  const languages: Record<string, number> = {};
  let totalLines = 0;
  let totalSize = 0;
  let totalComplexity = 0;
  let functionCount = 0;
  let classCount = 0;
  let importCount = 0;

  try {
    for await (const filePath of glob.scan(process.cwd())) {
      // Skip common directories
      if (
        filePath.includes("node_modules") ||
        filePath.includes(".git") ||
        filePath.includes("dist") ||
        filePath.includes(".next") ||
        filePath.includes(".turbo")
      ) {
        continue;
      }

      const fileObj = Bun.file(filePath);
      if (await fileObj.exists()) {
        try {
          const text = await fileObj.text();
          const lines = text.split("\n").length;
          const size = fileObj.size;
          const ext = filePath.split(".").pop() || "unknown";
          const language =
            ext === "ts" || ext === "tsx"
              ? "TypeScript"
              : ext === "js" || ext === "jsx"
                ? "JavaScript"
                : ext === "mjs"
                  ? "ESM"
                  : ext === "cjs"
                    ? "CommonJS"
                    : ext === "json"
                      ? "JSON"
                      : ext;

          files.push({
            path: filePath,
            size,
            lines,
            language,
          });

          languages[language] = (languages[language] || 0) + 1;
          totalLines += lines;
          totalSize += size;

          // Estimate code complexity
          const funcMatches = (text.match(/function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*\{/g) || []).length;
          const classMatches = (text.match(/class\s+\w+|interface\s+\w+/g) || []).length;
          const importMatches = (text.match(/import\s+|require\s*\(/g) || []).length;
          const cycloComplexity = (text.match(/if\s*\(|else|switch|case|for\s*\(|while\s*\(|catch|&&|\|\||ternary/g) || []).length;

          functionCount += funcMatches;
          classCount += classMatches;
          importCount += importMatches;
          totalComplexity += cycloComplexity;
        } catch {
          // Skip binary files or files we can't read
        }
      }
    }
  } catch (error) {
    console.error("Analysis error:", error);
  }

  // Check dependencies if requested
  let dependencies;
  if (options.checkDeps) {
    dependencies = await checkDependencies();
  }

  // Calculate health score with more factors
  const avgComplexity = files.length > 0 ? totalComplexity / files.length : 0;
  const avgLineCount = files.length > 0 ? totalLines / files.length : 0;
  const healthScore = Math.min(
    100,
    Math.max(
      0,
      100 -
        (files.length > 1000 ? 20 : 0) -
        (totalLines > 50000 ? 30 : 0) -
        (avgComplexity > 15 ? 15 : 0) -
        (avgLineCount > 500 ? 10 : 0) -
        (dependencies?.missing ? dependencies.missing * 2 : 0),
    ),
  );

  const endTime = performance.now();
  const endMemory = process.memoryUsage();
  let endHeap = { heapUsed: 0, heapTotal: 0 };

  try {
    // Try to get Bun heap usage if available
    if (typeof Bun !== 'undefined' && (Bun as any).heapUsage) {
      endHeap = (Bun as any).heapUsage();
    }
  } catch {
    // Fall back to 0 if not available
  }

  const analysisTime = endTime - startTime;
  const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;
  const heapGrowth = endHeap.heapUsed - startHeap.heapUsed;

  return {
    files: files.slice(0, 100), // Limit for display
    stats: {
      totalFiles: files.length,
      totalLines,
      totalSize,
      healthScore,
      languages,
      ...(dependencies && { dependencies }),
    },
    ...(options.perf && {
      performance: {
        analysisTime,
        memoryUsed,
        heapGrowth,
        heapTotal: endHeap.heapTotal,
        heapUsed: endHeap.heapUsed,
        external: endMemory.external,
        rss: endMemory.rss,
        filesPerSecond: files.length / (analysisTime / 1000),
        avgComplexity,
        avgLineCount,
        functionCount,
        classCount,
        importCount,
        totalComplexity,
      },
    }),
  };
}

// Check dependencies using Bun.which()
async function checkDependencies(): Promise<{
  installed: number;
  outdated: number;
  missing: number;
}> {
  try {
    const packageJsonFile = Bun.file("package.json");
    if (!(await packageJsonFile.exists())) {
      return { installed: 0, outdated: 0, missing: 0 };
    }

    const pkg = JSON.parse(await packageJsonFile.text());
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    let installed = 0;
    let missing = 0;

    // Use Bun.which() to check if binaries are available
    // For npm packages, we check if they exist in node_modules
    for (const [name] of Object.entries(allDeps)) {
      const modulePath = `node_modules/${name}`;
      const moduleFile = Bun.file(modulePath);
      if (await moduleFile.exists()) {
        installed++;
      } else {
        missing++;
      }
    }

    // Check for outdated packages (simplified - in production, use npm outdated)
    const outdated = 0; // Could enhance with actual version checking

    return { installed, outdated, missing };
  } catch {
    return { installed: 0, outdated: 0, missing: 0 };
  }
}

// Display Bun-themed ASCII output
function displayBunThemed(insights: CodebaseInsights) {
  console.log(`
╔════════════════════════════════════════╗
║    🎯 Dev HQ Codebase Insights 🎯      ║
║         Powered by Bun 🚀               ║
╚════════════════════════════════════════╝

📊 Statistics:
  • Total Files: ${insights.stats.totalFiles.toLocaleString()}
  • Total Lines: ${insights.stats.totalLines.toLocaleString()}
  • Total Size: ${(insights.stats.totalSize / 1024 / 1024).toFixed(2)} MB
  • Health Score: ${insights.stats.healthScore}%

📚 Languages:
${Object.entries(insights.stats.languages)
  .map(([lang, count]) => `  • ${lang}: ${count} files`)
  .join("\n")}

${insights.stats.dependencies
  ? `📦 Dependencies:
  • Installed: ${insights.stats.dependencies.installed}
  • Missing: ${insights.stats.dependencies.missing}
  • Outdated: ${insights.stats.dependencies.outdated}
`
  : ""}
${insights.performance
  ? `⚡ Performance:
  • Analysis Time: ${insights.performance.analysisTime.toFixed(2)}ms
  • Memory Used: ${(insights.performance.memoryUsed / 1024 / 1024).toFixed(2)} MB
  • Files/Second: ${insights.performance.filesPerSecond.toFixed(0)}
`
  : ""}
📁 Top 10 Largest Files:
${insights.files
  .sort((a, b) => b.lines - a.lines)
  .slice(0, 10)
  .map(
    (file, i) =>
      `  ${i + 1}. ${file.path.substring(0, 60).padEnd(60)} ${file.lines
        .toString()
        .padStart(6)} lines`,
  )
  .join("\n")}
  `);
}

// Format converters
function insightsToCSV(insights: CodebaseInsights): string {
  const lines: string[] = [];

  // Header
  lines.push("Path,Lines,Size (KB),Language");

  // File data
  for (const file of insights.files.slice(0, 100)) {
    const path = `"${file.path.replace(/"/g, '""')}"`;
    const size = (file.size / 1024).toFixed(1);
    lines.push(`${path},${file.lines},${size},${file.language}`);
  }

  // Add summary section
  lines.push("");
  lines.push("Metric,Value");
  lines.push(`Total Files,${insights.stats.totalFiles}`);
  lines.push(`Total Lines,${insights.stats.totalLines}`);
  lines.push(`Total Size (MB),${(insights.stats.totalSize / 1024 / 1024).toFixed(2)}`);
  lines.push(`Health Score,%,${insights.stats.healthScore}`);

  if (insights.stats.dependencies) {
    lines.push(`Dependencies Installed,,${insights.stats.dependencies.installed}`);
    lines.push(`Dependencies Missing,,${insights.stats.dependencies.missing}`);
  }

  if (insights.performance) {
    lines.push(`Analysis Time (ms),,${insights.performance.analysisTime.toFixed(2)}`);
    lines.push(`Memory Used (MB),,${(insights.performance.memoryUsed / 1024 / 1024).toFixed(2)}`);
  }

  return lines.join("\n");
}

function insightsToMarkdown(insights: CodebaseInsights): string {
  const lines: string[] = [];

  lines.push("# Dev HQ Codebase Analysis Report");
  lines.push("");
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push("");

  // Summary section
  lines.push("## 📊 Summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Total Files | ${insights.stats.totalFiles} |`);
  lines.push(`| Total Lines | ${insights.stats.totalLines.toLocaleString()} |`);
  lines.push(`| Total Size | ${(insights.stats.totalSize / 1024 / 1024).toFixed(2)} MB |`);
  lines.push(`| Health Score | ${insights.stats.healthScore}% |`);
  lines.push("");

  // Languages section
  lines.push("## 📚 Languages");
  lines.push("");
  lines.push("| Language | Files |");
  lines.push("|----------|-------|");
  for (const [lang, count] of Object.entries(insights.stats.languages)) {
    lines.push(`| ${lang} | ${count} |`);
  }
  lines.push("");

  // Dependencies section
  if (insights.stats.dependencies) {
    lines.push("## 📦 Dependencies");
    lines.push("");
    lines.push("| Type | Count |");
    lines.push("|------|-------|");
    lines.push(`| Installed | ${insights.stats.dependencies.installed} |`);
    lines.push(`| Missing | ${insights.stats.dependencies.missing} |`);
    lines.push(`| Outdated | ${insights.stats.dependencies.outdated} |`);
    lines.push("");
  }

  // Performance section
  if (insights.performance) {
    lines.push("## ⚡ Performance");
    lines.push("");
    lines.push("| Metric | Value |");
    lines.push("|--------|-------|");
    lines.push(`| Analysis Time | ${insights.performance.analysisTime.toFixed(2)}ms |`);
    lines.push(`| Memory Used | ${(insights.performance.memoryUsed / 1024 / 1024).toFixed(2)} MB |`);
    lines.push(`| Files/Second | ${insights.performance.filesPerSecond.toFixed(0)} |`);
    lines.push("");
  }

  // Top files section
  lines.push("## 🔝 Top Files by Lines of Code");
  lines.push("");
  lines.push("| File | Lines | Size | Language |");
  lines.push("|------|-------|------|----------|");
  for (const file of insights.files.sort((a, b) => b.lines - a.lines).slice(0, 10)) {
    const displayPath = file.path.length > 60 ? "..." + file.path.slice(-57) : file.path;
    lines.push(`| ${displayPath} | ${file.lines} | ${(file.size / 1024).toFixed(1)} KB | ${file.language} |`);
  }
  lines.push("");

  return lines.join("\n");
}

// Insights command
program
  .command("insights")
  .alias("analyze")
  .alias("i")  // Shortcut alias
  .description("Comprehensive codebase analysis")
  .option("--csv", "CSV format output")
  .option("--markdown", "Markdown format output")
  .action(async () => {
    const options = program.opts();
    const insights = await analyzeCodebase({
      checkDeps: options.checkDeps,
      perf: options.perf,
    });

    // Determine output format (check for specific format flags first)
    let output = "";
    let format = "pretty";

    if (options.csv) {
      output = insightsToCSV(insights);
      format = "csv";
    } else if (options.markdown) {
      output = insightsToMarkdown(insights);
      format = "markdown";
    } else if (options.json) {
      output = JSON.stringify(insights, null, 2);
      format = "json";
    }

    // Write to file if specified
    if (options.output) {
      const outputContent = output || JSON.stringify(insights, null, 2);
      const outputFile = Bun.file(options.output);
      await Bun.write(outputFile, outputContent);
      if (!options.quiet) {
        console.log(`✅ Output written to ${options.output} (${format})`);
      }
      return;
    }

    // Display output
    if (output) {
      console.log(output);
    } else if (options.table) {
      const tableData = insights.files.slice(0, 20).map((f) => ({
        Path: f.path.length > 50 ? "..." + f.path.slice(-47) : f.path,
        Lines: f.lines,
        Size: `${(f.size / 1024).toFixed(1)} KB`,
        Language: f.language,
      }));
      console.log(inspect.table(tableData));

      const statsTable = [
        { Metric: "Total Files", Value: insights.stats.totalFiles },
        {
          Metric: "Total Lines",
          Value: insights.stats.totalLines.toLocaleString(),
        },
        {
          Metric: "Total Size",
          Value: `${(insights.stats.totalSize / 1024 / 1024).toFixed(2)} MB`,
        },
        { Metric: "Health Score", Value: `${insights.stats.healthScore}%` },
      ];
      console.log("\n📊 Statistics:");
      console.log(inspect.table(statsTable));
    } else if (options.bun) {
      displayBunThemed(insights);
    } else {
      // Pretty format
      console.log("\n🎯 Dev HQ Codebase Insights\n");
      console.log(`📊 Total Files: ${insights.stats.totalFiles}`);
      console.log(
        `📝 Total Lines: ${insights.stats.totalLines.toLocaleString()}`,
      );
      console.log(
        `💾 Total Size: ${(insights.stats.totalSize / 1024 / 1024).toFixed(2)} MB`,
      );
      console.log(`❤️  Health Score: ${insights.stats.healthScore}%`);
      console.log("\n📚 Languages:");
      for (const [lang, count] of Object.entries(insights.stats.languages)) {
        console.log(`  ${lang}: ${count} files`);
      }

      if (insights.stats.dependencies) {
        console.log("\n📦 Dependencies:");
        console.log(
          `  Installed: ${insights.stats.dependencies.installed}, Missing: ${insights.stats.dependencies.missing}`,
        );
      }

      if (insights.performance) {
        console.log("\n⚡ Performance:");
        console.log(
          `  Analysis Time: ${insights.performance.analysisTime.toFixed(2)}ms`,
        );
        console.log(
          `  Memory Used: ${(insights.performance.memoryUsed / 1024 / 1024).toFixed(2)} MB`,
        );
        console.log(
          `  Files/Second: ${insights.performance.filesPerSecond.toFixed(0)}`,
        );
      }
    }
  });

// Git command
program
  .command("git")
  .alias("g")  // Shortcut alias
  .description("Git repository analysis")
  .action(async () => {
    const options = program.opts();
    if (!options.quiet) {
      console.log("📊 Analyzing Git repository...");
    }

    const insights = await DevHQActions.gitInsights();

    if (options.json) {
      console.log(JSON.stringify(insights, null, 2));
    } else if (options.table) {
      console.log(inspect.table(insights));
    } else {
      console.log(inspect(insights, { colors: true }));
    }
  });

// CLOC command
program
  .command("cloc")
  .alias("c")  // Shortcut alias
  .description("Count lines of code")
  .action(async () => {
    const options = program.opts();
    if (!options.quiet) {
      console.log("🔍 Analyzing code...");
    }

    const cloc = await DevHQActions.analyzeWithCLOC();

    if (options.json) {
      console.log(JSON.stringify(cloc, null, 2));
    } else if (options.table) {
      console.log(inspect.table(cloc));
    } else {
      console.log(inspect(cloc, { colors: true }));
    }
  });

// Test command
program
  .command("test")
  .alias("t")  // Shortcut alias
  .description("Run tests")
  .option("--coverage", "Run with coverage")
  .option("--watch", "Watch mode (CLI flag, not Bun flag)")
  .action(async (cmdOptions) => {
    const options = program.opts();
    if (!options.quiet) {
      console.log("🧪 Running tests...");
    }

    const testArgs = ["test"];
    if (cmdOptions.coverage) testArgs.push("--coverage");
    if (cmdOptions.watch) testArgs.push("--watch");

    const proc = spawn(["bun", ...testArgs], {
      stdout: options.quiet ? "pipe" : "inherit",
      stderr: options.quiet ? "pipe" : "inherit",
    });

    const exitCode = await proc.exited;
    process.exit(exitCode || 0);
  });

// Docker command
program
  .command("docker")
  .alias("d")  // Shortcut alias
  .description("Docker container insights")
  .action(async () => {
    const options = program.opts();
    if (!options.quiet) {
      console.log("🐳 Analyzing Docker containers...");
    }

    const insights = await DevHQActions.dockerInsights();

    if (options.json) {
      console.log(JSON.stringify(insights, null, 2));
    } else if (options.table) {
      console.log(inspect.table(insights));
    } else {
      console.log(inspect(insights, { colors: true }));
    }
  });

// Health command
program
  .command("health")
  .alias("h")  // Shortcut alias
  .description("System health check")
  .action(async () => {
    const options = program.opts();
    const automation = DevHQAutomation;

    if (!options.quiet) {
      console.log("🏥 Performing health check...");
    }

    const checks = {
      bun: typeof Bun !== "undefined",
      automation: true,
      git: await checkCommand("git", ["--version"]),
      docker: await checkCommand("docker", ["--version"]),
      nodeModules: await checkNodeModules(),
    };

    const health = {
      status: Object.values(checks).every((v) => v)
        ? ("healthy" as const)
        : ("unhealthy" as const),
      timestamp: new Date().toISOString(),
      checks,
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        bunVersion: typeof Bun !== "undefined" ? Bun.version : "N/A",
        memory: process.memoryUsage(),
        uptime: process.uptime(),
      },
    };

    if (options.json) {
      console.log(JSON.stringify(health, null, 2));
    } else if (options.table) {
      const checksTable = Object.entries(health.checks).map(([key, value]) => ({
        Check: key,
        Status: value ? "✅" : "❌",
      }));
      console.log(inspect.table(checksTable));
    } else {
      console.log(`Status: ${health.status}`);
      console.log(inspect(health.checks, { colors: true }));
    }

    process.exit(health.status === "healthy" ? 0 : 1);
  });

// Server command
program
  .command("serve")
  .alias("s")  // Shortcut alias
  .description("Start Dev HQ server")
  .option("--port <port>", "Port number", "3000")
  .action(async (cmdOptions) => {
    const options = program.opts();
    if (!options.quiet) {
      console.log("🚀 Starting Dev HQ server...");
    }

    const port = parseInt(cmdOptions.port) || 3000;
    const { server } = await import("../dev-hq/servers/api-server.js");

    if (!options.quiet) {
      console.log(`✅ Server started on port ${port}`);
      console.log(`📍 Visit http://localhost:${port} for API endpoints`);
    }
  });

// Run command - Execute any command
program
  .command("run")
  .alias("r")  // Shortcut alias
  .description("Execute any command with Dev HQ monitoring")
  .option("-m, --metrics", "Capture metrics", false)
  .action(async (cmd: string[], cmdOptions) => {
    const options = program.opts();
    if (!options.quiet) {
      console.log(`🏃‍♂️ Running: ${cmd.join(" ")}`);
    }

    const startTime = performance.now();
    const automation = DevHQAutomation;

    // Use spawn for command execution
    // Note: Bun.$ template is available but spawn is more flexible for this use case
    let exitCode = 0;
    try {
      const proc = spawn(cmd, {
        stdout: options.quiet ? "pipe" : "inherit",
        stderr: options.quiet ? "pipe" : "inherit",
        cwd: process.cwd(),
      });
      exitCode = (await proc.exited) || 0;
    } catch (error: any) {
      if (!options.quiet) {
        console.error(`❌ Error: ${error.message}`);
      }
      exitCode = 1;
    }

    const duration = performance.now() - startTime;

    if (cmdOptions.metrics) {
      const insights = await analyzeCodebase({ perf: true });
      const metrics = {
        command: cmd.join(" "),
        duration: `${duration.toFixed(2)}ms`,
        exitCode,
        timestamp: new Date().toISOString(),
        ...(insights.performance && {
          performance: insights.performance,
        }),
      };

      if (options.json) {
        console.log(JSON.stringify(metrics, null, 2));
      } else {
        console.log("\n📊 Dev HQ Metrics:");
        console.log(inspect(metrics, { colors: true }));
      }
    }

    process.exit(exitCode);
  });

// Helper functions
async function checkCommand(cmd: string, args: string[]): Promise<boolean> {
  try {
    const automation = DevHQAutomation;
    const result = await automation.runCommand(`${cmd}-check`, [cmd, ...args]);
    return result && "exitCode" in result && result.exitCode === 0;
  } catch {
    return false;
  }
}

async function checkNodeModules(): Promise<boolean> {
  try {
    // Use stat() to properly check if directory exists
    const stat = await Bun.file("node_modules").stat();
    return stat.isDirectory();
  } catch {
    return false;
  }
}

// Enhanced argument parsing with auto-correction and aliases
const rawArgs = process.argv.slice(2);
const parsed = parseFlags(process.argv);

// Apply auto-correction and alias resolution
let command = parsed.command;
if (command) {
  command = autoCorrectCommand(command);
  command = resolveCommand(command);

  // Handle global vs local command separation
  handleGlobalCommand(command);

  // Auto-add default flags
  const enhancedArgs = autoAddFlags(parsed.args, command);

  // Reconstruct argv with enhanced arguments
  if (enhancedArgs.length !== parsed.args.length) {
    process.argv = [
      process.argv[0],
      process.argv[1],
      command,
      ...enhancedArgs
    ];
  }
}

// Parse arguments with error recovery
// Note: Bun flags (--hot, --watch, --smol, etc.) are handled by Bun runtime
// This CLI only processes its own flags via Commander.js
try {
  program.parse(process.argv);
} catch (error: unknown) {
  const err = error as Error & { code?: string };
  if (err.code === "ENOENT") {
    console.log(`${theme.warning}⚠️  Project not initialized${theme.reset}`);
    console.log(`${theme.info}Run: dev-hq init${theme.reset}`);
  } else {
    handleCommandError(err);
  }
  process.exit(1);
}

// Export for testing
export { analyzeCodebase, checkDependencies, program };
