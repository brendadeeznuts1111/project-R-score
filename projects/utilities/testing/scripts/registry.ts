import type { FileSystemDirectory } from "bun";

// ============================================
// BUN NATIVE APIS - FILE SYSTEM
// ============================================

const bfile = (path: string) => Bun.file(path);
const bwrite = (path: string, data: string | Blob) => Bun.write(path, data);

function spwarn(message: string): void {
  console.warn(`⚠️ ${message}`);
}

function spinfo(message: string): void {
  console.log(`ℹ️ ${message}`);
}

function spsuccess(message: string): void {
  console.log(`✅ ${message}`);
}

// ============================================
// REGISTRY CONFIGURATION
// ============================================

interface RegistryConfig {
  directory: string;
  outputDir: string;
  extensions: string[];
  emojiMap: Record<string, string>;
  envVars: {
    inline: string[];
    prefix: string[];
    disabled: boolean;
  };
}

const config: RegistryConfig = {
  directory: "examples/network-apis/urlpattern",
  outputDir: "data/registry",
  extensions: [".ts"],
  emojiMap: {
    examples: "🔰",
    static: "📁",
    api: "🔄"
  },
  envVars: {
    inline: ["REGISTRY_VERSION", "BUN_VERSION", "TIMESTAMP"],
    prefix: ["REGISTRY_PUBLIC_", "EXAMPLE_CONFIG_"],
    disabled: false
  }
};

// ============================================
// REGISTRY ENTRY TYPES
// ============================================

interface RegistryEntry {
  id: string;
  name: string;
  category: string;
  tags: string[];
  difficulty: string;
  lines: number;
  emoji: string;
  file: string;
  oneliner: string;
  bundlePath?: string;
  bundleSize?: number;
  sourcemapPath?: string;
  hash?: string;
}

interface CrossReference {
  from: string;
  to: string;
  type: "similar-to" | "prerequisite" | "depends-on";
}

// ============================================
// BUN UTILITY FUNCTIONS (PRO-TIPS)
// ============================================

/**
 * Quick file hash using Bun.hash()
 * Pro-tip: Bun.hash() is a fast, non-cryptographic hash
 */
function hashContent(content: string): string {
  return Bun.hash(content).toString(16).padStart(8, "0");
}

/**
 * Inspect object with Bun.inspect()
 * Pro-tip: Bun.inspect() provides detailed object inspection
 */
function inspectObject(obj: unknown): string {
  return Bun.inspect(obj);
}

/**
 * Escape HTML entities with Bun.escapeHtml()
 * Pro-tip: Use for safe HTML rendering
 */
function escapeHtml(unsafe: string): string {
  return Bun.escapeHtml(unsafe);
}

/**
 * Deep clone using structuredClone or JSON methods
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Measure execution time with console.time/timeEnd
 */
async function measureTime<T>(label: string, fn: () => Promise<T>): Promise<T> {
  console.time(label);
  try {
    return await fn();
  } finally {
    console.timeEnd(label);
  }
}

/**
 * Concurrent execution with Promise.allSettled()
 * Pro-tip: Run multiple tasks in parallel for better performance
 */
async function runConcurrent<T>(
  tasks: (() => Promise<T>)[]
): Promise<{ results: T[]; errors: Error[] }> {
  const results: T[] = [];
  const errors: Error[] = [];
  
  const settled = await Promise.allSettled(tasks.map(t => t()));
  
  for (let i = 0; i < settled.length; i++) {
    if (settled[i].status === "fulfilled") {
      results.push(settled[i].value);
    } else {
      errors.push(new Error(`Task ${i} failed: ${settled[i].reason}`));
    }
  }
  
  return { results, errors };
}

// ============================================
// BUN TERMINAL (PTY) SUPPORT - ENHANCED
// ============================================

async function runInteractiveSession(
  entries: RegistryEntry[],
  options: { cols?: number; rows?: number } = {}
): Promise<void> {
  const cols = options.cols || process.stdout.columns || 80;
  const rows = options.rows || process.stdout.rows || 24;

  await using terminal = new Bun.Terminal({
    cols,
    rows,
    data(term, data) {
      process.stdout.write(data);
    },
  });

  terminal.write(`\x1b[1;32m🚀 Interactive Registry Session\x1b[0m\n`);
  terminal.write(`\x1b[33mFound ${entries.length} examples registered\x1b[0m\n\n`);

  // Handle terminal resize
  process.stdout.on("resize", () => {
    terminal.resize(process.stdout.columns, process.stdout.rows);
  });

  const commandQueue: string[] = ["list", "info urlpattern-examples", "run urlpattern-basics 2>&1 || true", "quit"];
  let waitingForInput = true;

  while (waitingForInput) {
    terminal.write(`\x1b[36mregistry> \x1b[0m`);

    if (commandQueue.length > 0) {
      const cmd = commandQueue.shift()!;
      terminal.write(`${cmd}\n`);

      if (cmd === "quit" || cmd === "exit") {
        waitingForInput = false;
        terminal.write(`\x1b[32m👋 Goodbye!\x1b[0m\n`);
        break;
      }

      await processCommand(term, entries, cmd);
    } else {
      waitingForInput = false;
    }
  }
}

/**
 * Interactive REPL-like session with history
 * Pro-tip: Use terminal.setRawMode() for interactive programs
 */
async function runReplSession(): Promise<void> {
  await using terminal = new Bun.Terminal({
    cols: 80,
    rows: 24,
    data(term, data) {
      process.stdout.write(data);
    },
  });

  terminal.write(`\x1b[1;36m╔══════════════════════════════════════╗\x1b[0m\n`);
  terminal.write(`\x1b[1;36m║    Bun Registry REPL v1.0        ║\x1b[0m\n`);
  terminal.write(`\x1b[1;36m╚══════════════════════════════════════╝\x1b[0m\n\n`);
  terminal.write(`Type ".help" for available commands\n\n`);

  // Enable raw mode for interactive input
  terminal.setRawMode(true);
  
  let input = "";
  
  // Read character by character
  for await (const chunk of terminal) {
    const char = new TextDecoder().decode(chunk);
    
    if (char === "\r" || char === "\n") {
      terminal.write("\n");
      
      if (input.trim() === ".exit" || input.trim() === ".quit") {
        terminal.write("👋 Bye!\n");
        break;
      } else if (input.trim() === ".help") {
        terminal.write(`
\x1b[1mAvailable Commands:\x1b[0m
  .list     - List all registered examples
  .run <id> - Run a specific example
  .info <id> - Show example details
  .clear    - Clear screen
  .time     - Toggle timing
  .exit     - Exit REPL
`);
      } else if (input.trim() === ".clear") {
        terminal.write("\x1b[2J\x1b[H");
      } else if (input.trim() === ".time") {
        terminal.write("Timing enabled\n");
      } else if (input.trim() === ".list") {
        terminal.write("📋 Run 'bun run scripts/registry.ts list' to see all examples\n");
      } else if (input.trim()) {
        terminal.write(`Unknown command: ${input.trim()}\n`);
      }
      
      input = "";
      terminal.write("\n\x1b[36m> \x1b[0m");
    } else if (char === "\x03") { // Ctrl+C
      terminal.write("^C\n");
      input = "";
      terminal.write("\x1b[36m> \x1b[0m");
    } else if (char === "\x7f") { // Backspace
      if (input.length > 0) {
        input = input.slice(0, -1);
        terminal.write("\x1b[D\x1b[K");
      }
    } else {
      input += char;
      terminal.write(char);
    }
  }
}

// ============================================
// BUN SPAWN WITH PIPED IO
// ============================================

/**
 * Spawn with custom stdin/stdout/stderr
 * Pro-tip: Use stdio: "pipe" for capturing output programmatically
 */
async function spawnWithPipedIO(
  command: string[],
  options: {
    input?: string;
    captureOutput?: boolean;
  } = {}
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(command, {
    stdio: ["pipe", options.captureOutput ? "pipe" : "inherit", options.captureOutput ? "pipe" : "inherit"],
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  // Send input if provided
  if (options.input) {
    proc.stdin.write(options.input);
    proc.stdin.close();
  }

  // Capture output if requested
  let stdout = "";
  let stderr = "";

  if (options.captureOutput) {
    const [out, err] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    stdout = out;
    stderr = err;
  }

  await proc.exited;

  return {
    exitCode: proc.exitCode || 0,
    stdout,
    stderr,
  };
}

/**
 * Spawn with shell: true for command string execution
 * Pro-tip: Use shell: true for complex commands with pipes and redirects
 */
async function spawnWithShell(command: string): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  const proc = Bun.spawn(["bash", "-c", command], {
    shell: true,
    stdio: ["inherit", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  await proc.exited;

  return {
    exitCode: proc.exitCode || 0,
    stdout,
    stderr,
  };
}

// ============================================
// BUN SERIALIZATION & COMPRESSION
// ============================================

/**
 * Serialize with Bun.serialize() / Bun.deserialize()
 * Pro-tip: Fast binary serialization for complex objects
 */
function serializeData<T>(data: T): Uint8Array {
  return Bun.serialize(data);
}

function deserializeData<T>(serialized: Uint8Array): T {
  return Bun.deserialize(serialized);
}

/**
 * Gzip compression with Bun.gzipSync/Bun.gunzipSync
 * Pro-tip: Use for compressing data before storage or transmission
 */
function compressData(data: string): Uint8Array {
  return Bun.gzipSync(new TextEncoder().encode(data));
}

function decompressData(compressed: Uint8Array): string {
  return new TextDecoder().decode(Bun.gunzipSync(compressed));
}

/**
 * Deflate compression (raw, no header)
 */
function deflateData(data: string): Uint8Array {
  return Bun.deflateSync(new TextEncoder().encode(data));
}

function inflateData(deflated: Uint8Array): string {
  return new TextDecoder().decode(Bun.inflateSync(deflated));
}

// ============================================
// BUN STRING UTILITIES
// ============================================

/**
 * String width with Bun.stringWidth()
 * Pro-tip: Correctly handles emoji, ANSI codes, and Unicode
 */
function getStringWidth(str: string): number {
  return Bun.stringWidth(str);
}

/**
 * SHA-256 hash with Bun.sha()
 * Pro-tip: Cryptographic hash for security-sensitive operations
 */
async function sha256Hash(data: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// ============================================
// BUN FILE UTILITIES
// ============================================

/**
 * Check file exists synchronously
 * Pro-tip: Use for quick synchronous checks
 */
function fileExists(path: string): boolean {
  return Bun.file(path).exists();
}

/**
 * Get file stats with Bun.file().size
 * Pro-tip: Quick access to file metadata
 */
async function getFileInfo(path: string): Promise<{
  size: number;
  exists: boolean;
  content?: string;
}> {
  const file = bfile(path);
  const exists = await file.exists();
  
  if (!exists) {
    return { size: 0, exists: false };
  }
  
  return {
    size: await file.size,
    exists: true,
    content: await file.text(),
  };
}

// ============================================
// COMMAND PROCESSING
// ============================================

async function processCommand(
  term: Bun.Terminal,
  entries: RegistryEntry[],
  command: string
): Promise<void> {
  const [cmd, ...args] = command.trim().split(/\s+/);

  switch (cmd.toLowerCase()) {
    case "list":
      displayRegistryList(term, entries);
      break;
    case "run":
      const exampleId = args[0];
      if (!exampleId) {
        term.write(`\x1b[31m❌ Missing example ID\x1b[0m\n`);
        return;
      }
      await runExampleInPTY(term, entries, exampleId);
      break;
    case "all":
      for (const entry of entries) {
        await runExampleInPTY(term, entries, entry.id);
      }
      break;
    case "info":
      const infoId = args[0];
      if (!infoId) {
        term.write(`\x1b[31m❌ Missing example ID\x1b[0m\n`);
        return;
      }
      displayExampleInfo(term, entries, infoId);
      break;
    case "hash":
      // Pro-tip: Show hash of example files
      for (const entry of entries) {
        const filePath = `${config.directory}/${entry.file}`;
        const content = await bfile(filePath).text();
        const hash = hashContent(content);
        term.write(`\x1b[36m${entry.id}:\x1b[0m ${hash}\n`);
      }
      break;
    case "stats":
      // Pro-tip: Show statistics
      const totalLines = entries.reduce((sum, e) => sum + e.lines, 0);
      const avgLines = Math.round(totalLines / entries.length);
      term.write(`\n\x1b[1;4m📊 Registry Statistics\x1b[0m\n`);
      term.write(`═`.repeat(30) + `\n`);
      term.write(`Total Examples: ${entries.length}\n`);
      term.write(`Total Lines: ${totalLines}\n`);
      term.write(`Average Lines: ${avgLines}\n`);
      term.write(`Difficulty: ${[...new Set(entries.map(e => e.difficulty))].join(", ")}\n`);
      term.write(`\n`);
      break;
    case "help":
      term.write(`\x1b[1mCommands:\x1b[0m\n`);
      term.write(`  run <id>   - Run example by ID\n`);
      term.write(`  list       - Show all examples\n`);
      term.write(`  info <id>  - Show details\n`);
      term.write(`  all        - Run all examples\n`);
      term.write(`  hash       - Show file hashes\n`);
      term.write(`  stats      - Show statistics\n`);
      term.write(`  quit       - Exit\n`);
      break;
    case "":
      break;
    default:
      term.write(`\x1b[31m❓ Unknown: ${cmd}\x1b[0m\n`);
      break;
  }
}

function displayRegistryList(term: Bun.Terminal, entries: RegistryEntry[]): void {
  term.write(`\n\x1b[1;4m📋 Registered Examples\x1b[0m\n`);
  term.write(`═`.repeat(50) + `\n`);

  for (const entry of entries) {
    const status = entry.difficulty === "intermediate" ? "🟡" : "🟢";
    term.write(`${status} \x1b[1m${entry.id}\x1b[0m ${entry.emoji}\n`);
    term.write(`   └─ ${entry.name} (${entry.lines} lines)\n`);
    if (entry.bundleSize) {
      term.write(`   └─ 📦 ${(entry.bundleSize / 1024).toFixed(2)} KB bundled\n`);
    }
  }

  term.write(`\n`);
}

function displayExampleInfo(
  term: Bun.Terminal,
  entries: RegistryEntry[],
  exampleId: string
): void {
  const entry = entries.find(e => e.id === exampleId || e.id.includes(exampleId));

  if (!entry) {
    term.write(`\x1b[31m❌ Example not found: ${exampleId}\x1b[0m\n`);
    return;
  }

  term.write(`\n\x1b[1;4m📖 Example Details\x1b[0m\n`);
  term.write(`═`.repeat(50) + `\n`);
  term.write(`\x1b[1mID:\x1b[0m ${entry.id}\n`);
  term.write(`\x1b[1mName:\x1b[0m ${entry.emoji} ${entry.name}\n`);
  term.write(`\x1b[1mFile:\x1b[0m ${entry.file}\n`);
  term.write(`\x1b[1mCategory:\x1b[0m ${entry.category}\n`);
  term.write(`\x1b[1mTags:\x1b[0m ${entry.tags.join(", ")}\n`);
  term.write(`\x1b[1mDifficulty:\x1b[0m ${entry.difficulty}\n`);
  term.write(`\x1b[1mLines:\x1b[0m ${entry.lines}\n`);
  term.write(`\x1b[1mOneliner:\x1b[0m \x1b[36m${entry.oneliner}\x1b[0m\n`);
  if (entry.bundlePath) {
    term.write(`\x1b[1mBundle:\x1b[0m ${entry.bundlePath}\n`);
    term.write(`\x1b[1mSize:\x1b[0m ${(entry.bundleSize! / 1024).toFixed(2)} KB\n`);
  }
  if (entry.hash) {
    term.write(`\x1b[1mHash:\x1b[0m ${entry.hash}\n`);
  }
  term.write(`\n`);
}

async function runExampleInPTY(
  term: Bun.Terminal,
  entries: RegistryEntry[],
  exampleId: string
): Promise<void> {
  const entry = entries.find(e => e.id === exampleId || e.id.includes(exampleId));

  if (!entry) {
    term.write(`\x1b[31m❌ Example not found: ${exampleId}\x1b[0m\n`);
    return;
  }

  term.write(`\n\x1b[1;4m▶ Running: ${entry.name}\x1b[0m\n`);
  term.write(`─`.repeat(50) + `\n`);

  const proc = Bun.spawn(["bun", "run", entry.file], {
    terminal: term,
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  await proc.exited;

  const exitCode = proc.exitCode || 0;
  if (exitCode === 0) {
    term.write(`\x1b[32m✅ Completed successfully\x1b[0m\n`);
  } else {
    term.write(`\x1b[31m❌ Exit code: ${exitCode}\x1b[0m\n`);
  }

  term.write(`─`.repeat(50) + `\n\n`);
}

async function runAllExamples(
  entries: RegistryEntry[],
  options: { cols?: number; rows?: number } = {}
): Promise<void> {
  const cols = options.cols || process.stdout.columns || 80;
  const rows = options.rows || process.stdout.rows || 24;

  await using terminal = new Bun.Terminal({
    cols,
    rows,
    data(term, data) {
      process.stdout.write(data);
    },
  });

  terminal.write(`\n\x1b[1;32m🚀 Running All URLPattern Examples\x1b[0m\n`);
  terminal.write(`═`.repeat(50) + `\n\n`);

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    terminal.write(`\x1b[1m[${i + 1}/${entries.length}] ${entry.name}\x1b[0m\n`);

    const proc = Bun.spawn(["bun", "run", entry.file], {
      terminal: term,
      env: { ...process.env, FORCE_COLOR: "1" },
    });

    await proc.exited;

    if (proc.exitCode === 0) {
      passed++;
      terminal.write(`\x1b[32m  ✅ PASSED\x1b[0m\n`);
    } else {
      failed++;
      terminal.write(`\x1b[31m  ❌ FAILED (code: ${proc.exitCode})\x1b[0m\n`);
    }

    terminal.write(`\n`);
  }

  terminal.write(`\x1b[1;4m📊 Results\x1b[0m\n`);
  terminal.write(`═`.repeat(50) + `\n`);
  terminal.write(`\x1b[32mPassed: ${passed}\x1b[0m  `);
  terminal.write(`\x1b[31mFailed: ${failed}\x1b[0m  `);
  terminal.write(`Total: ${entries.length}\n`);

  if (failed === 0) {
    terminal.write(`\x1b[1;32m🎉 All examples passed!\x1b[0m\n`);
  } else {
    terminal.write(`\x1b[1;33m⚠️  Some examples failed.\x1b[0m\n`);
  }
}

// ============================================
// BUN BUILD WITH ENV INLINING
// ============================================

interface BuildOptions {
  env?: "inline" | "disable" | `${string}_*`;
  sourcemap?: "none" | "linked" | "external" | "inline";
  minify?: boolean;
}

async function buildWithEnvInlining(
  entrypoints: string[],
  outdir: string,
  options: BuildOptions = {}
): Promise<void> {
  const { env = "inline", sourcemap = "linked", minify = true } = options;

  spinfo(`Building ${entrypoints.length} entrypoints with env: "${env}"`);

  let envConfig: "inline" | "disable" | string;
  
  if (env === "inline") {
    envConfig = "inline";
    spinfo(`Inlining all process.env references`);
  } else if (env === "disable") {
    envConfig = "disable";
    spinfo(`Environment variable injection disabled`);
  } else if (env.endsWith("_*")) {
    envConfig = env;
    spinfo(`Inlining env vars matching prefix: ${env}`);
  } else {
    envConfig = "inline";
  }

  const buildResult = await Bun.build({
    entrypoints,
    outdir,
    minify,
    sourcemap,
    env: envConfig,
    target: "bun",
    format: "esm",
  });

  if (!buildResult.success) {
    spwarn("Build failed!");
    for (const log of buildResult.logs) {
      console.error(log);
    }
    throw new Error("Build failed");
  }

  spsuccess(`Build completed successfully!`);
  
  for (const output of buildResult.outputs) {
    const size = output.size;
    const path = output.path;
    
    console.log(`  📦 ${path} (${(size / 1024).toFixed(2)} KB)`);
    
    if (sourcemap !== "none") {
      const mapPath = path.replace(/\.(js|ts|jsx|tsx)$/, ".map");
      const mapFile = bfile(mapPath);
      if (await mapFile.exists()) {
        console.log(`    └─ 🗺️  ${mapPath}`);
      }
    }
  }
}

// ============================================
// FILE PROCESSING
// ============================================

function extractMetadata(content: string, filename: string): RegistryEntry {
  const baseName = filename.replace(/\.ts$/, "");
  
  const difficultyMatch = content.match(/@difficulty\s+(\w+)/);
  const difficulty = difficultyMatch ? difficultyMatch[1] : "intermediate";
  
  const tagsMatch = content.match(/@tags?\s+([^\n]+)/);
  const tags = tagsMatch 
    ? tagsMatch[1].split(",").map(t => t.trim().toLowerCase())
    : ["urlpattern"];
  
  let emoji = config.emojiMap[baseName] || "📄";
  const emojiMatch = content.match(/@emoji\s+(\S+)/);
  if (emojiMatch) emoji = emojiMatch[1];
  
  // Pro-tip: Include file hash for integrity checking
  const contentHash = hashContent(content);
  
  return {
    id: `urlpattern-${baseName}`,
    name: formatName(baseName),
    category: "network-apis/urlpattern",
    tags,
    difficulty,
    lines: content.split("\n").length,
    emoji,
    file: filename,
    oneliner: `bun run ${config.directory}/${filename}`,
    hash: contentHash
  };
}

function formatName(filename: string): string {
  return filename
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function processDirectory(dir: string): Promise<RegistryEntry[]> {
  const entries: RegistryEntry[] = [];
  
  const globPattern = `${dir}/*.ts`;
  const files = await new Bun.Glob(globPattern).scanSync();
  const fileList = Array.from(files);
  
  spwarn(`Found ${fileList.length} files in ${dir}`);
  
  for (const filePath of files) {
    const filename = filePath.split("/").pop() || "";
    const content = await bfile(filePath).text();
    const entry = extractMetadata(content, filename);
    entries.push(entry);
  }
  
  return entries;
}

function generateCrossReferences(entries: RegistryEntry[]): CrossReference[] {
  const refs: CrossReference[] = [];
  
  for (const entry of entries) {
    if (entry.id.includes("examples")) {
      const others = entries.filter(e => !e.id.includes("examples"));
      for (const other of others) {
        refs.push({ from: entry.id, to: other.id, type: "similar-to" });
        refs.push({ from: other.id, to: entry.id, type: "prerequisite" });
      }
    }
  }
  
  return refs;
}

// ============================================
// OUTPUT GENERATION
// ============================================

function generateTable(entries: RegistryEntry[]): string {
  if (entries.length === 0) return "No entries found";
  
  const maxIdLen = Math.max(2, ...entries.map(e => e.id.length));
  const maxNameLen = Math.max(4, ...entries.map(e => e.name.length));
  const maxLinesLen = Math.max(5, ...entries.map(e => e.lines.toString().length));
  const maxLevelLen = Math.max(5, ...entries.map(e => e.difficulty.length));
  const maxCmdLen = Math.max(7, ...entries.map(e => e.oneliner.length));
  const maxHashLen = Math.max(4, ...entries.map(e => (e.hash || "").length));
  
  let table = `┌${"─".repeat(maxIdLen + 2)}┬${"─".repeat(maxNameLen + 2)}┬${"─".repeat(maxLinesLen + 2)}┬${"─".repeat(maxLevelLen + 2)}┬${"─".repeat(maxHashLen + 2)}┬${"─".repeat(maxCmdLen + 2)}┐\n`;
  table += `│  ID${" ".repeat(Math.max(0, maxIdLen - 1))} │ NAME${" ".repeat(Math.max(0, maxNameLen - 4))} │ LINES │ LEVEL │ HASH ${" ".repeat(Math.max(0, maxHashLen - 4))} │ COMMAND │\n`;
  table += `├${"─".repeat(maxIdLen + 2)}┴${"─".repeat(maxNameLen + 2)}┴${"─".repeat(maxLinesLen + 2)}┴${"─".repeat(maxLevelLen + 2)}┴${"─".repeat(maxHashLen + 2)}┴${"─".repeat(maxCmdLen + 2)}┤\n`;
  
  for (const entry of entries) {
    table += `│ ${entry.id}${" ".repeat(maxIdLen + 1 - entry.id.length)} │ ${entry.name}${" ".repeat(maxNameLen + 1 - entry.name.length)} │ ${entry.lines}${" ".repeat(maxLinesLen + 1 - entry.lines.toString().length)} │ ${entry.difficulty}${" ".repeat(maxLevelLen + 1 - entry.difficulty.length)} │ ${(entry.hash || "")}${" ".repeat(maxHashLen + 1 - (entry.hash || "").length)} │ ${entry.oneliner}${" ".repeat(maxCmdLen + 1 - entry.oneliner.length)} │\n`;
  }
  
  table += `└${"─".repeat(maxIdLen + 2)}┴${"─".repeat(maxNameLen + 2)}┴${"─".repeat(maxLinesLen + 2)}┴${"─".repeat(maxLevelLen + 2)}┴${"─".repeat(maxHashLen + 2)}┴${"─".repeat(maxCmdLen + 2)}┘`;
  
  return table;
}

// ============================================
// PRO-TIPS & ONELINERS GENERATION
// ============================================

interface ProTip {
  category: string;
  tip: string;
  oneliner: string;
  description: string;
}

function generateProTips(): ProTip[] {
  return [
    {
      category: "🐰 Bun Basics",
      tip: "Run TypeScript directly",
      oneliner: "bun run script.ts",
      description: "No build step needed - Bun runs TypeScript natively"
    },
    {
      category: "🐰 Bun Basics",
      tip: "Install dependencies",
      oneliner: "bun add package-name",
      description: "Faster than npm/yarn with built-in lockfile"
    },
    {
      category: "🐰 Bun Basics",
      tip: "Install dev dependencies",
      oneliner: "bun add -d package-name",
      description: "Development dependencies with -d flag"
    },
    {
      category: "🐰 Bun Basics",
      tip: "Run tests",
      oneliner: "bun test",
      description: "Built-in test runner with native Bun APIs"
    },
    {
      category: "🐰 Bun Basics",
      tip: "Auto-reload server",
      oneliner: "bun --watch server.ts",
      description: "Development with hot reloading"
    },
    {
      category: "📁 File System",
      tip: "Read file as text",
      oneliner: "const content = await Bun.file('file.txt').text()",
      description: "Native file reading with Bun.file()"
    },
    {
      category: "📁 File System",
      tip: "Write file",
      oneliner: "await Bun.write('output.txt', 'data')",
      description: "Fast file writing with Bun.write()"
    },
    {
      category: "📁 File System",
      tip: "Glob patterns",
      oneliner: "await glob('**/*.ts').toArray()",
      description: "Fast file discovery with Bun.glob()"
    },
    {
      category: "🌐 HTTP Server",
      tip: "Simple HTTP server",
      oneliner: "Bun.serve({ port: 3000, fetch: () => new Response('Hello') })",
      description: "Native HTTP server with zero config"
    },
    {
      category: "🌐 HTTP Server",
      tip: "Static files",
      oneliner: "Bun.serve({ static: new URL('./public', import.meta.url) })",
      description: "Serve static files with built-in routing"
    },
    {
      category: "🔧 Spawn & Process",
      tip: "Spawn subprocess",
      oneliner: "const proc = Bun.spawn(['echo', 'hello'])",
      description: "Fast subprocess spawning with Bun.spawn()"
    },
    {
      category: "🔧 Spawn & Process",
      tip: "Spawn with PTY",
      oneliner: "new Bun.Terminal({ data: (t, d) => console.log(d) })",
      description: "Interactive terminal sessions with PTY support"
    },
    {
      category: "🔧 Spawn & Process",
      tip: "Shell execution",
      oneliner: "Bun.spawn(['bash', '-c', 'cmd1 | cmd2'], { shell: true })",
      description: "Complex shell commands with pipes and redirects"
    },
    {
      category: "🔨 Build & Bundle",
      tip: "Bundle for production",
      oneliner: "bun build ./app.ts --outdir ./dist --minify",
      description: "Production bundling with minification"
    },
    {
      category: "🔨 Build & Bundle",
      tip: "Inline env vars",
      oneliner: "bun build --env=INLINE ./app.ts",
      description: "Embed environment variables in bundle"
    },
    {
      category: "🔨 Build & Bundle",
      tip: "Generate sourcemaps",
      oneliner: "bun build --sourcemap=linked ./app.ts",
      description: "Debugging with linked sourcemaps"
    },
    {
      category: "🔨 Build & Bundle",
      tip: "Feature flags",
      oneliner: "bun build --feature=PREMIUM ./app.ts",
      description: "Dead-code elimination with feature flags"
    },
    {
      category: "📦 Serialization",
      tip: "Serialize data",
      oneliner: "const bytes = Bun.serialize(obj)",
      description: "Fast binary serialization"
    },
    {
      category: "📦 Serialization",
      tip: "Deserialize data",
      oneliner: "const obj = Bun.deserialize(bytes)",
      description: "Restore serialized objects"
    },
    {
      category: "📦 Serialization",
      tip: "Gzip compression",
      oneliner: "const compressed = Bun.gzipSync(new TextEncoder().encode(str))",
      description: "Compress data with gzip"
    },
    {
      category: "📦 Serialization",
      tip: "String width",
      oneliner: "Bun.stringWidth('👋🏿') // Returns 2",
      description: "Correct emoji width calculation"
    },
    {
      category: "🔐 Hash & Crypto",
      tip: "SHA-256 hash",
      oneliner: "await crypto.subtle.digest('SHA-256', data)",
      description: "Cryptographic hashing with Web Crypto API"
    },
    {
      category: "🔐 Hash & Crypto",
      tip: "Fast hash",
      oneliner: "Bun.hash(str).toString(16)",
      description: "Non-cryptographic fast hash"
    },
    {
      category: "🎨 Utilities",
      tip: "Escape HTML",
      oneliner: "Bun.escapeHtml('<script>alert(1)</script>')",
      description: "Safe HTML entity escaping"
    },
    {
      category: "🎨 Utilities",
      tip: "Deep inspect",
      oneliner: "Bun.inspect(obj)",
      description: "Detailed object inspection"
    },
    {
      category: "🧪 Testing",
      tip: "Write test",
      oneliner: "test('adds 1 + 2 to equal 3', () => { expect(1+2).toBe(3) })",
      description: "Built-in testing with Bun.test"
    },
    {
      category: "🧪 Testing",
      tip: "Mock fetch",
      oneliner: "import { mock } from 'bun:test'",
      description: "Mocking utilities for tests"
    },
    {
      category: "🚀 Performance",
      tip: "Concurrent execution",
      oneliner: "const results = await Promise.all(tasks.map(t => t()))",
      description: "Parallel execution for better performance"
    },
    {
      category: "🚀 Performance",
      tip: "Stream files",
      oneliner: "await Bun.write(file, Bun.file(input).stream())",
      description: "Streaming I/O for large files"
    },
    {
      category: "🚀 Performance",
      tip: "Timer",
      oneliner: "console.time('label'); /* code */ console.timeEnd('label')",
      description: "Quick performance profiling"
    }
  ];
}

function formatProTipsAscii(proTips: ProTip[]): string {
  const maxTipLen = Math.max(...proTips.map(t => t.tip.length));
  const maxCmdLen = Math.max(...proTips.map(t => t.oneliner.length));
  const maxDescLen = Math.max(...proTips.map(t => t.description.length));
  
  let ascii = "";
  
  // Group by category
  const categories = [...new Set(proTips.map(t => t.category))];
  
  for (const category of categories) {
    const tips = proTips.filter(t => t.category === category);
    
    ascii += `╔${"═".repeat(maxTipLen + 2)}╦${"═".repeat(maxCmdLen + 2)}╦${"═".repeat(maxDescLen + 2)}╗\n`;
    ascii += `║ ${category.padEnd(maxTipLen + 1)}║ ${"ONELINER".padEnd(maxCmdLen + 1)}║ ${"DESCRIPTION".padEnd(maxDescLen + 1)}║\n`;
    ascii += `╠${"═".repeat(maxTipLen + 2)}╬${"═".repeat(maxCmdLen + 2)}╬${"═".repeat(maxDescLen + 2)}╣\n`;
    
    for (const tip of tips) {
      ascii += `║ ${tip.tip.padEnd(maxTipLen + 1)}║ ${tip.oneliner.padEnd(maxCmdLen + 1)}║ ${tip.description.padEnd(maxDescLen + 1)}║\n`;
    }
    
    ascii += `\n`;
  }
  
  ascii += `╚${"═".repeat(maxTipLen + 2)}╩${"═".repeat(maxCmdLen + 2)}╩${"═".repeat(maxDescLen + 2)}╝`;
  
  return ascii;
}

// ============================================
// MAIN REGISTRY UPDATE FUNCTION
// ============================================

export async function updateRegistry(config: {
  directory: string;
  emoji?: boolean;
  graphical?: boolean;
  crossRef?: boolean;
  oneliner?: boolean;
  verbose?: boolean;
  interactive?: boolean;
  runAll?: boolean;
  build?: boolean;
  envInlining?: "inline" | "disable" | `${string}_*`;
  sourcemap?: "none" | "linked" | "external" | "inline";
  protips?: boolean;
}): Promise<void> {
  const {
    directory,
    emoji = true,
    graphical = false,
    crossRef = false,
    oneliner = false,
    verbose = false,
    interactive = false,
    runAll = false,
    build = false,
    envInlining = "inline",
    sourcemap = "linked",
    protips = false
  } = config;

  spwarn(`Processing directory: ${directory}`);

  const entries = await processDirectory(directory);

  if (verbose) {
    spwarn(`Found ${entries.length} files to register`);
  }

  if (crossRef) {
    const crossRefs = generateCrossReferences(entries);
    await bwrite(`${config.outputDir || "data/registry"}/cross-ref.json`, JSON.stringify(crossRefs, null, 2));
    spwarn("Cross-references generated");
  }

  if (graphical) {
    const table = generateTable(entries);
    await bwrite(`${config.outputDir || "data/registry"}/urlpattern-graphical-table.txt`, table);
    spwarn("Graphical table generated");
  }

  // Generate pro-tips file
  if (protips) {
    const proTips = generateProTips();
    const asciiTable = formatProTipsAscii(proTips);
    const proTipsJson = JSON.stringify(proTips, null, 2);
    
    await bwrite("data/registry/bun-protips.txt", asciiTable);
    await bwrite("data/registry/bun-protips.json", proTipsJson);
    
    spsuccess(`Generated ${proTips.length} pro-tips`);
  }

  const registryContent = `// Auto-generated registry - DO NOT EDIT
export const urlpatternRegistry = ${JSON.stringify(entries, null, 2)} as const;
export type UrlpatternRegistryEntry = typeof urlpatternRegistry[number];
`;

  await bwrite(`${config.outputDir || "data/registry"}/urlpattern-registry.ts`, registryContent);

  if (oneliner) {
    let script = "#!/bin/bash\n# Auto-generated URLPattern commands\n\n";
    for (const entry of entries) {
      const cmdName = entry.id.replace("urlpattern-", "");
      script += `alias ${cmdName}="${entry.oneliner}"\n`;
    }
    await bwrite("bin/urlpattern-commands.sh", script);
    spwarn("Shell aliases generated");
  }

  console.log(`✅ Registered ${entries.length} URLPattern examples`);

  if (build) {
    spinfo(`Building with env: "${envInlining}" and sourcemap: "${sourcemap}"`);
    
    const entrypoints = entries.map(e => `${directory}/${e.file}`);
    const outdir = "dist/urlpattern";
    
    await buildWithEnvInlining(entrypoints, outdir, {
      env: envInlining,
      sourcemap,
      minify: true
    });

    for (const entry of entries) {
      const bundlePath = `${outdir}/${entry.file.replace(/\.ts$/, ".js")}`;
      const bundleFile = bfile(bundlePath);
      
      if (await bundleFile.exists()) {
        entry.bundlePath = bundlePath;
        entry.bundleSize = (await bundleFile.size());
        entry.sourcemapPath = bundlePath.replace(/\.js$/, ".js.map");
      }
    }
  }

  if (interactive) {
    await runInteractiveSession(entries);
  }

  if (runAll) {
    await runAllExamples(entries);
  }
}

// ============================================
// CLI INTERFACE
// ============================================

const args = Bun.argv.slice(2);
const command = args[0] || "add";

function parseArgs(args: string[]): {
  directory: string;
  flags: Record<string, boolean>;
} {
  let directory = config.directory;
  const flags: Record<string, boolean> = {};
  
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      flags[arg] = true;
    } else if (!arg.startsWith("-") && directory === config.directory) {
      directory = arg;
    }
  }
  
  return { directory, flags };
}

if (command === "add") {
  const { directory, flags } = parseArgs(args);
  await updateRegistry({
    directory,
    emoji: flags["--emoji"] ?? true,
    graphical: flags["--graphical"] ?? false,
    crossRef: flags["--cross-ref"] ?? false,
    oneliner: flags["--oneliner"] ?? false,
    verbose: flags["--verbose"] ?? false,
    interactive: flags["--interactive"] ?? false,
    runAll: flags["--run-all"] ?? false,
    build: flags["--build"] ?? false,
    envInlining: flags["--env-disable"] 
      ? "disable" 
      : Object.keys(flags).find(a => a.startsWith("--env-prefix="))?.replace("--env-prefix=", "") as `${string}_*` || "inline",
    sourcemap: flags["--sourcemap-linked"] 
      ? "linked" 
      : flags["--sourcemap-external"] 
        ? "external" 
        : flags["--sourcemap-inline"] 
          ? "inline" 
          : "none",
    protips: flags["--protips"] ?? false
  });
} else if (command === "interactive") {
  const entries = await processDirectory(config.directory);
  await runInteractiveSession(entries);
} else if (command === "repl") {
  await runReplSession();
} else if (command === "run") {
  const entries = await processDirectory(config.directory);
  await runAllExamples(entries);
} else if (command === "build") {
  const entries = await processDirectory(config.directory);
  const entrypoints = entries.map(e => `${config.directory}/${e.file}`);
  
  const envOption = args.find(a => a.startsWith("--env="))?.replace("--env=", "") || "inline";
  const sourcemapOption = args.find(a => a.startsWith("--sourcemap="))?.replace("--sourcemap=", "") || "linked";
  
  await buildWithEnvInlining(entrypoints, "dist/urlpattern", {
    env: envOption as "inline" | "disable" | `${string}_*`,
    sourcemap: sourcemapOption as "none" | "linked" | "external" | "inline",
    minify: true
  });
} else if (command === "protips") {
  const proTips = generateProTips();
  const asciiTable = formatProTipsAscii(proTips);
  console.log(asciiTable);
} else if (command === "list") {
  const registryFile = bfile("data/registry/urlpattern-registry.ts");
  if (await registryFile.exists()) {
    console.log(await registryFile.text());
  } else {
    spwarn("Registry file not found. Run 'add' first.");
  }
} else if (command === "hash") {
  const entries = await processDirectory(config.directory);
  for (const entry of entries) {
    const filePath = `${config.directory}/${entry.file}`;
    const content = await bfile(filePath).text();
    const hash = hashContent(content);
    console.log(`${entry.id}: ${hash}`);
  }
} else if (command === "stats") {
  const entries = await processDirectory(config.directory);
  const totalLines = entries.reduce((sum, e) => sum + e.lines, 0);
  const avgLines = Math.round(totalLines / entries.length);
  console.log(`
📊 Registry Statistics
═══════════════════════════
Total Examples: ${entries.length}
Total Lines: ${totalLines}
Average Lines: ${avgLines}
Difficulty: ${[...new Set(entries.map(e => e.difficulty))].join(", ")}
Categories: ${[...new Set(entries.map(e => e.category))].join(", ")}
`);
}
