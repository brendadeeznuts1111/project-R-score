#!/usr/bin/env bun
// Enhanced setup script with comprehensive CLI argument parsing and file I/O
import { $, argv } from "bun";
import chalk from "chalk";
import { existsSync, mkdirSync } from "fs";
import prompts from "prompts";

// Parse CLI arguments for template customization
const args = {
  silent: argv.includes("--silent"),
  ifPresent: argv.includes("--if-present"),
  eval: argv.find((arg) => arg.startsWith("--eval="))?.split("=")[1],
  print: argv.find((arg) => arg.startsWith("--print="))?.split("=")[1],
  filter: argv.find((arg) => arg.startsWith("--filter="))?.split("=")[1],
  workspaces: argv.includes("--workspaces"),
  smol: argv.includes("--smol"),
  exposeGc: argv.includes("--expose-gc"),
  watch: argv.includes("--watch"),
  hot: argv.includes("--hot"),
  inspect: argv.includes("--inspect"),
  inspectWait: argv.includes("--inspect-wait"),
  inspectBrk: argv.includes("--inspect-brk"),
  noInstall: argv.includes("--no-install"),
  install:
    argv.find((arg) => arg.startsWith("--install="))?.split("=")[1] || "auto",
  preferOffline: argv.includes("--prefer-offline"),
  preferLatest: argv.includes("--prefer-latest"),
  define: argv.find((arg) => arg.startsWith("--define="))?.split("=")[1],
  drop: argv.find((arg) => arg.startsWith("--drop="))?.split("=")[1],
  loader: argv.find((arg) => arg.startsWith("--loader="))?.split("=")[1],
  port: argv.find((arg) => arg.startsWith("--port="))?.split("=")[1],
  envFile: argv.find((arg) => arg.startsWith("--env-file="))?.split("=")[1],
  cwd: argv.find((arg) => arg.startsWith("--cwd="))?.split("=")[1] || ".",
  config: argv.find((arg) => arg.startsWith("--config="))?.split("=")[1],
  consoleDepth: argv
    .find((arg) => arg.startsWith("--console-depth="))
    ?.split("=")[1],
  stdin: argv.includes("-") || argv.includes("--stdin"),
  title: argv.find((arg) => arg.startsWith("--title="))?.split("=")[1],
  useSystemCa: argv.includes("--use-system-ca"),
  maxHeaderSize: argv
    .find((arg) => arg.startsWith("--max-header-size="))
    ?.split("=")[1],
  dnsTimeout: argv
    .find((arg) => arg.startsWith("--dns-timeout="))
    ?.split("=")[1],
  sqlPreconnect: argv.includes("--sql-preconnect"),
  redisPreconnect: argv.includes("--redis-preconnect"),
  zeroFillBuffers: argv.includes("--zero-fill-buffers"),
  unhandledRejections: argv
    .find((arg) => arg.startsWith("--unhandled-rejections="))
    ?.split("=")[1],
  breakOnStart: argv.includes("--break-on-start"),
  preload: argv.find((arg) => arg.startsWith("--preload="))?.split("=")[1],
  editor: argv.find((arg) => arg.startsWith("--editor="))?.split("=")[1],
  macro: argv.includes("--macro"),
  jsxRuntime: argv
    .find((arg) => arg.startsWith("--jsx-runtime="))
    ?.split("=")[1],
  jsxImportSource: argv
    .find((arg) => arg.startsWith("--jsx-import-source="))
    ?.split("=")[1],
  jsxFactory: argv
    .find((arg) => arg.startsWith("--jsx-factory="))
    ?.split("=")[1],
  jsxFragment: argv
    .find((arg) => arg.startsWith("--jsx-fragment="))
    ?.split("=")[1],
  jsxDevelopment: argv.includes("--jsx-development"),
  minify: argv.includes("--minify"),
  splitting: argv.includes("--splitting"),
  target: argv.find((arg) => arg.startsWith("--target="))?.split("=")[1],
  outdir: argv.find((arg) => arg.startsWith("--outdir="))?.split("=")[1],
  sourcemap: argv.find((arg) => arg.startsWith("--sourcemap="))?.split("=")[1],
  external: argv.find((arg) => arg.startsWith("--external="))?.split("=")[1],
  packages: argv.find((arg) => arg.startsWith("--packages="))?.split("=")[1],
  format: argv.find((arg) => arg.startsWith("--format="))?.split("=")[1],
  global: argv.find((arg) => arg.startsWith("--global="))?.split("=")[1],
  alias: argv.find((arg) => arg.startsWith("--alias="))?.split("=")[1],
  manifest: argv.includes("--manifest"),
  root: argv.find((arg) => arg.startsWith("--root="))?.split("=")[1],
  publicDir: argv.find((arg) => arg.startsWith("--public-dir="))?.split("=")[1],
  entryNames: argv
    .find((arg) => arg.startsWith("--entry-names="))
    ?.split("=")[1],
  chunkNames: argv
    .find((arg) => arg.startsWith("--chunk-names="))
    ?.split("=")[1],
  assetNames: argv
    .find((arg) => arg.startsWith("--asset-names="))
    ?.split("=")[1],
  loaderExtensions: argv
    .find((arg) => arg.startsWith("--loader="))
    ?.split("=")[1],
  mainFields: argv
    .find((arg) => arg.startsWith("--main-fields="))
    ?.split("=")[1],
  conditions: argv
    .find((arg) => arg.startsWith("--conditions="))
    ?.split("=")[1],
  extensions: argv
    .find((arg) => arg.startsWith("--extensions="))
    ?.split("=")[1],
  tsconfig: argv.find((arg) => arg.startsWith("--tsconfig="))?.split("=")[1],
  tsconfigOverride: argv
    .find((arg) => arg.startsWith("--tsconfig-override="))
    ?.split("=")[1],
  platform: argv.find((arg) => arg.startsWith("--platform="))?.split("=")[1],
  origin: argv.find((arg) => arg.startsWith("--origin="))?.split("=")[1],
  serve: argv.includes("--serve"),
  randomPort: argv.includes("--random-port"),
  backend: argv.includes("--backend"),
  development: argv.includes("--development"),
  production: argv.includes("--production"),
  hot: argv.includes("--hot"),
  version: argv.includes("--version") || argv.includes("-v"),
  help: argv.includes("--help") || argv.includes("-h"),
  repl: argv.includes("--repl"),
  run: argv.includes("--run"),
  create: argv.find((arg) => arg.startsWith("--create="))?.split("=")[1],
  add: argv.find((arg) => arg.startsWith("--add="))?.split("=")[1],
  remove: argv.find((arg) => arg.startsWith("--remove="))?.split("=")[1],
  update: argv.find((arg) => arg.startsWith("--update="))?.split("=")[1],
  upgrade: argv.includes("--upgrade"),
  pm: argv.includes("--pm"),
  discord: argv.includes("--discord"),
  discordApiKey: argv
    .find((arg) => arg.startsWith("--discord-api-key="))
    ?.split("=")[1],
  bunfig: argv.includes("--bunfig"),
  emoji: argv.includes("--emoji"),
  noEmoji: argv.includes("--no-emoji"),
  verbose: argv.includes("--verbose"),
  logLevel: argv.find((arg) => arg.startsWith("--log-level="))?.split("=")[1],
  timeout: argv.find((arg) => arg.startsWith("--timeout="))?.split("=")[1],
  retry: argv.find((arg) => arg.startsWith("--retry="))?.split("=")[1],
  retryDelay: argv
    .find((arg) => arg.startsWith("--retry-delay="))
    ?.split("=")[1],
  concurrency: argv
    .find((arg) => arg.startsWith("--concurrency="))
    ?.split("=")[1],
  lockfile: argv.includes("--lockfile"),
  noLockfile: argv.includes("--no-lockfile"),
  frozenLockfile: argv.includes("--frozen-lockfile"),
  saveDev: argv.includes("--save-dev"),
  saveOptional: argv.includes("--save-optional"),
  saveExact: argv.includes("--save-exact"),
  savePeer: argv.includes("--save-peer"),
  global: argv.includes("--global"),
  force: argv.includes("--force"),
  dryRun: argv.includes("--dry-run"),
  cache: argv.includes("--cache"),
  noCache: argv.includes("--no-cache"),
  cacheDir: argv.find((arg) => arg.startsWith("--cache-dir="))?.split("=")[1],
  registry: argv.find((arg) => arg.startsWith("--registry="))?.split("=")[1],
  scope: argv.find((arg) => arg.startsWith("--scope="))?.split("=")[1],
  auto: argv.includes("--auto"),
  noAuto: argv.includes("--no-auto"),
  trustedDependencies: argv
    .find((arg) => arg.startsWith("--trusted-dependencies="))
    ?.split("=")[1],
  coverage: argv.includes("--coverage"),
  coverageThreshold: argv
    .find((arg) => arg.startsWith("--coverage-threshold="))
    ?.split("=")[1],
  coverageDir: argv
    .find((arg) => arg.startsWith("--coverage-dir="))
    ?.split("=")[1],
  coverageReporter: argv
    .find((arg) => arg.startsWith("--coverage-reporter="))
    ?.split("=")[1],
  coverageAll: argv.includes("--coverage-all"),
  coverageSkip: argv
    .find((arg) => arg.startsWith("--coverage-skip="))
    ?.split("=")[1],
  coverageInclude: argv
    .find((arg) => arg.startsWith("--coverage-include="))
    ?.split("=")[1],
  coverageExclude: argv
    .find((arg) => arg.startsWith("--coverage-exclude="))
    ?.split("=")[1],
  coverageIgnore: argv
    .find((arg) => arg.startsWith("--coverage-ignore="))
    ?.split("=")[1],
  coverageOnly: argv
    .find((arg) => arg.startsWith("--coverage-only="))
    ?.split("=")[1],
  coverageLines: argv
    .find((arg) => arg.startsWith("--coverage-lines="))
    ?.split("=")[1],
  coverageFunctions: argv
    .find((arg) => arg.startsWith("--coverage-functions="))
    ?.split("=")[1],
  coverageBranches: argv
    .find((arg) => arg.startsWith("--coverage-branches="))
    ?.split("=")[1],
  coverageStatements: argv
    .find((arg) => arg.startsWith("--coverage-statements="))
    ?.split("=")[1],
  watchAll: argv.includes("--watch-all"),
  watchPaths: argv
    .find((arg) => arg.startsWith("--watch-paths="))
    ?.split("=")[1],
  watchIgnore: argv
    .find((arg) => arg.startsWith("--watch-ignore="))
    ?.split("=")[1],
  watchExclude: argv
    .find((arg) => arg.startsWith("--watch-exclude="))
    ?.split("=")[1],
  watchInclude: argv
    .find((arg) => arg.startsWith("--watch-include="))
    ?.split("=")[1],
  watchClearScreen: argv.includes("--watch-clear-screen"),
  noWatchClearScreen: argv.includes("--no-watch-clear-screen"),
  watchServer: argv.includes("--watch-server"),
  watchServerPort: argv
    .find((arg) => arg.startsWith("--watch-server-port="))
    ?.split("=")[1],
  watchServerHost: argv
    .find((arg) => arg.startsWith("--watch-server-host="))
    ?.split("=")[1],
  watchServerKey: argv
    .find((arg) => arg.startsWith("--watch-server-key="))
    ?.split("=")[1],
  watchServerCert: argv
    .find((arg) => arg.startsWith("--watch-server-cert="))
    ?.split("=")[1],
  watchServerCa: argv
    .find((arg) => arg.startsWith("--watch-server-ca="))
    ?.split("=")[1],
  watchServerPassphrase: argv
    .find((arg) => arg.startsWith("--watch-server-passphrase="))
    ?.split("=")[1],
  watchServerPfx: argv
    .find((arg) => arg.startsWith("--watch-server-pfx="))
    ?.split("=")[1],
  watchServerCrl: argv
    .find((arg) => arg.startsWith("--watch-server-crl="))
    ?.split("=")[1],
  watchServerRequestCert: argv.includes("--watch-server-request-cert"),
  watchServerRejectUnauthorized: argv.includes(
    "--watch-server-reject-unauthorized"
  ),
  watchServerAgent: argv
    .find((arg) => arg.startsWith("--watch-server-agent="))
    ?.split("=")[1],
  watchServerPfxPassphrase: argv
    .find((arg) => arg.startsWith("--watch-server-pfx-passphrase="))
    ?.split("=")[1],
  watchServerKeyPassphrase: argv
    .find((arg) => arg.startsWith("--watch-server-key-passphrase="))
    ?.split("=")[1],
  watchServerCertPassphrase: argv
    .find((arg) => arg.startsWith("--watch-server-cert-passphrase="))
    ?.split("=")[1],
  watchServerCaPassphrase: argv
    .find((arg) => arg.startsWith("--watch-server-ca-passphrase="))
    ?.split("=")[1],
  watchServerCrlPassphrase: argv
    .find((arg) => arg.startsWith("--watch-server-crl-passphrase="))
    ?.split("=")[1],
  watchServerAgentPassphrase: argv
    .find((arg) => arg.startsWith("--watch-server-agent-passphrase="))
    ?.split("=")[1],
  watchServerPfxPassphrase: argv
    .find((arg) => arg.startsWith("--watch-server-pfx-passphrase="))
    ?.split("=")[1],
  watchServerKeyPassphrase: argv
    .find((arg) => arg.startsWith("--watch-server-key-passphrase="))
    ?.split("=")[1],
  watchServerCertPassphrase: argv
    .find((arg) => arg.startsWith("--watch-server-cert-passphrase="))
    ?.split("=")[1],
  watchServerCaPassphrase: argv
    .find((arg) => arg.startsWith("--watch-server-ca-passphrase="))
    ?.split("=")[1],
  watchServerCrlPassphrase: argv
    .find((arg) => arg.startsWith("--watch-server-crl-passphrase="))
    ?.split("=")[1],
  watchServerAgentPassphrase: argv
    .find((arg) => arg.startsWith("--watch-server-agent-passphrase="))
    ?.split("=")[1],
};

// File I/O utilities using Bun.file() and Bun.write()
async function createConfigFiles(config: any, args: any) {
  console.log(chalk.blue("📁 Creating configuration files..."));

  // Create .env file using Bun.write()
  const envContent = `# Generated by Dev HQ Template
NODE_ENV=${config.environment}
PORT=${config.serverPort}
DATABASE_URL=${config.features.includes("database") ? "postgresql://localhost:5432/" + args.projectName : ""}
REDIS_URL=${config.features.includes("redis") ? "redis://localhost:6379" : ""}
APP_VERSION=1.0.0
BUILD_TIMESTAMP=${new Date().toISOString()}
BUN_VERSION=${Bun.version}
CONSOLE_DEPTH=${args.consoleDepth || 4}
SMOL_MODE=${args.smol ? "true" : "false"}
EXPOSE_GC=${args.exposeGc ? "true" : "false"}
`;

  await Bun.write(".env", envContent);
  console.log(chalk.green("✅ .env file created"));

  // Create .env.example file
  await Bun.write(".env.example", envContent.replace(/=.+$/, "="));
  console.log(chalk.green("✅ .env.example file created"));

  // Create Dockerfile if requested
  if (config.useDocker) {
    const dockerfile = `FROM oven/bun:latest
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --production
COPY . .
EXPOSE ${config.serverPort}
CMD ["bun", "run", "start"]
`;
    await Bun.write("Dockerfile", dockerfile);
    console.log(chalk.green("✅ Dockerfile created"));
  }

  // Create CI config if requested
  if (config.enableCI) {
    mkdirSync(".github/workflows", { recursive: true });
    const ciConfig = await generateCIConfig(config);
    await Bun.write(".github/workflows/ci.yml", ciConfig);
    console.log(chalk.green("✅ CI configuration created"));
  }

  // Create enhanced bunfig.toml with CLI args
  const bunfigContent = generateBunfigConfig(args);
  await Bun.write("bunfig.toml", bunfigContent);
  console.log(chalk.green("✅ Enhanced bunfig.toml created"));

  // Create stdin processing scripts
  await createStdinScripts();
  console.log(chalk.green("✅ Stdin processing scripts created"));

  // Create file I/O utilities
  await createFileUtils();
  console.log(chalk.green("✅ File I/O utilities created"));
}

function generateBunfigConfig(args: any): string {
  return `# Enhanced Bun Configuration Template
# Generated with CLI arguments: ${JSON.stringify(args, null, 2)}

[install]
auto = ${args.auto !== false}
cache = ${args.noCache !== true}
frozenLockfile = ${args.frozenLockfile || false}
lockfile = ${args.noLockfile !== true}
registry = "${args.registry || "https://registry.npmjs.org"}"
${args.scope ? `scopes."${args.scope}" = "${args.registry}"` : ""}
${
  args.trustedDependencies
    ? `trustedDependencies = [${args.trustedDependencies
        .split(",")
        .map((d) => `"${d.trim()}"`)
        .join(", ")}]`
    : ""
}

[build]
target = "${args.target || "bun"}"
outdir = "${args.outdir || "dist"}"
minify = ${args.minify || false}
splitting = ${args.splitting || false}
sourcemap = "${args.sourcemap || "linked"}"
${args.define ? `define = { "${args.define}" }` : ""}
${
  args.external
    ? `external = [${args.external
        .split(",")
        .map((e) => `"${e.trim()}"`)
        .join(", ")}]`
    : ""
}
${
  args.packages
    ? `packages = [${args.packages
        .split(",")
        .map((p) => `"${p.trim()}"`)
        .join(", ")}]`
    : ""
}

[dev]
port = ${args.port || 3000}
hostname = "${args.host || "localhost"}"
open = true
watch = ${args.watch || false}
hot = ${args.hot || false}
sourcemap = true
breakOnStart = ${args.breakOnStart || false}

[test]
timeout = "${args.timeout || "30s"}"
coverage = ${args.coverage || false}
verbose = ${args.verbose || false}
runner = "bun:test"
${args.coverageDir ? `coverageDir = "${args.coverageDir}"` : ""}
${args.coverageReporter ? `coverageReporter = "${args.coverageReporter}"` : ""}

[runtime]
consoleDepth = ${args.consoleDepth || 4}
smol = ${args.smol || false}
exposeGc = ${args.exposeGc || false}
unhandledRejections = "${args.unhandledRejections || "warn"}"
zeroFillBuffers = ${args.zeroFillBuffers || false}

[debug]
editor = "${args.editor || "vscode"}"
breakOnStart = ${args.breakOnStart || false}
${args.preload ? `preload = ["${args.preload}"]` : ""}

[define]
process.env.NODE_ENV = "${args.production ? "production" : "development"}"
process.env.APP_VERSION = "1.0.0"
process.env.BUILD_TIMESTAMP = "${new Date().toISOString()}"

[loaders]
${
  args.loaderExtensions
    ? args.loaderExtensions
        .split(",")
        .map((ext) => `"${ext.trim()}" = "${args.loader || "js"}"`)
        .join("\n")
    : ""
}

[jsx]
runtime = "${args.jsxRuntime || "automatic"}"
importSource = "${args.jsxImportSource || "react"}"
${args.jsxFactory ? `factory = "${args.jsxFactory}"` : ""}
${args.jsxFragment ? `fragment = "${args.jsxFragment}"` : ""}
development = ${args.jsxDevelopment || true}

[macro]
enabled = ${args.macro || false}

[serve]
maxRequestBodySize = ${args.maxHeaderSize ? parseInt(args.maxHeaderSize) * 1024 : 104857600}
idleTimeout = 30

[run]
shell = "bash"
env = { NODE_ENV = "${args.production ? "production" : "development"}" }
hot = ${args.hot || false}

# Pre-connection options
sqlPreconnect = ${args.sqlPreconnect || false}
redisPreconnect = ${args.redisPreconnect || false}

# Network and security
useSystemCa = ${args.useSystemCa || false}
${args.maxHeaderSize ? `maxHeaderSize = ${args.maxHeaderSize}` : ""}
${args.dnsTimeout ? `dnsTimeout = "${args.dnsTimeout}"` : ""}
`;
}

async function createStdinScripts() {
  // Create stdin processing utilities
  const stdinProcessor = `#!/usr/bin/env bun
// Stdin processing utility using Bun.stdin
import { Bun } from "bun";

async function processStdin() {
  const stdin = Bun.stdin;
  const content = await stdin.text();

  console.log("📥 Processing stdin input:");
  console.log("Length:", content.length, "characters");
  console.log("Type:", typeof content);
  console.log("First 100 chars:", content.substring(0, 100));

  // Try to parse as JSON
  try {
    const parsed = JSON.parse(content);
    console.log("✅ Valid JSON detected:");
    console.log(JSON.stringify(parsed, null, 2));
  } catch (e) {
    console.log("📝 Plain text detected");
    console.log(content);
  }
}

processStdin().catch(console.error);
`;

  await Bun.write("src/utils/stdin-processor.ts", stdinProcessor);

  const logProcessor = `#!/usr/bin/env bun
// Log file processor using stdin streaming
import { Bun } from "bun";

async function processLogs() {
  const stdin = Bun.stdin;
  const reader = stdin.stream().getReader();

  console.log("📋 Processing log stream...");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const line = new TextDecoder().decode(value);
    const timestamp = new Date().toISOString();

    // Process log line
    if (line.includes('ERROR')) {
      console.log(\`🔴 [\${timestamp}] ERROR: \${line.trim()}\`);
    } else if (line.includes('WARN')) {
      console.log(\`🟡 [\${timestamp}] WARN: \${line.trim()}\`);
    } else {
      console.log(\`🔵 [\${timestamp}] INFO: \${line.trim()}\`);
    }
  }
}

processLogs().catch(console.error);
`;

  await Bun.write("src/utils/log-processor.ts", logProcessor);
}

async function createFileUtils() {
  // File reader utility using Bun.file()
  const fileReader = `#!/usr/bin/env bun
// File reader utility using Bun.file()
import { Bun } from "bun";

async function readFile(filePath: string) {
  try {
    const file = Bun.file(filePath);

    console.log("📄 File Information:");
    console.log("Path:", filePath);
    console.log("Size:", file.size, "bytes");
    console.log("Type:", file.type);
    console.log("Exists:", await file.exists());

    if (await file.exists()) {
      const content = await file.text();
      console.log("Content preview:");
      console.log(content.substring(0, 500));

      if (content.length > 500) {
        console.log("... (truncated)");
      }

      // Try to parse as JSON
      if (file.type.includes('json')) {
        try {
          const json = await file.json();
          console.log("📋 JSON structure:");
          console.log(JSON.stringify(json, null, 2));
        } catch (e) {
          console.log("❌ Invalid JSON");
        }
      }
    }
  } catch (error) {
    console.error("❌ Error reading file:", error.message);
  }
}

const filePath = process.argv[2] || 'package.json';
readFile(filePath);
`;

  await Bun.write("src/utils/file-reader.ts", fileReader);

  // File writer utility using Bun.write()
  const fileWriter = `#!/usr/bin/env bun
// File writer utility using Bun.write()
import { Bun } from "bun";

async function writeFile(filePath: string, content: string) {
  try {
    const bytes = await Bun.write(filePath, content);
    console.log("✅ File written successfully:");
    console.log("Path:", filePath);
    console.log("Size:", bytes, "bytes");

    // Verify file was written
    const file = Bun.file(filePath);
    console.log("Verified size:", file.size, "bytes");
    console.log("Type:", file.type);

  } catch (error) {
    console.error("❌ Error writing file:", error.message);
  }
}

const filePath = process.argv[2] || 'output.txt';
const content = process.argv[3] || 'Hello from Bun.write()!\\nThis is a test file created with enhanced file I/O.';

writeFile(filePath, content);
`;

  await Bun.write("src/utils/file-writer.ts", fileWriter);

  // File copy utility
  const fileCopy = `#!/usr/bin/env bun
// File copy utility using Bun.file() and Bun.write()
import { Bun } from "bun";

async function copyFile(sourcePath: string, destPath: string) {
  try {
    const sourceFile = Bun.file(sourcePath);

    if (!(await sourceFile.exists())) {
      throw new Error(\`Source file does not exist: \${sourcePath}\`);
    }

    console.log("📋 Copying file:");
    console.log("Source:", sourcePath);
    console.log("Destination:", destPath);
    console.log("Source size:", sourceFile.size, "bytes");

    const bytes = await Bun.write(destPath, sourceFile);

    console.log("✅ File copied successfully:");
    console.log("Bytes copied:", bytes);

    // Verify copy
    const destFile = Bun.file(destPath);
    console.log("Destination size:", destFile.size, "bytes");
    console.log("Match:", sourceFile.size === destFile.size ? "✅" : "❌");

  } catch (error) {
    console.error("❌ Error copying file:", error.message);
  }
}

const sourcePath = process.argv[2] || 'package.json';
const destPath = process.argv[3] || 'package-copy.json';

copyFile(sourcePath, destPath);
`;

  await Bun.write("src/utils/file-copy.ts", fileCopy);

  // File analyzer utility
  const fileAnalyzer = `#!/usr/bin/env bun
// File analyzer utility using Bun.file()
import { Bun } from "bun";

async function analyzeFile(filePath: string) {
  try {
    const file = Bun.file(filePath);

    console.log("🔍 File Analysis:");
    console.log("=".repeat(40));
    console.log("Path:", filePath);
    console.log("Size:", file.size, "bytes");
    console.log("Type:", file.type);
    console.log("Exists:", await file.exists());

    if (await file.exists()) {
      // Get file stats
      const stats = await file.text();
      console.log("Character count:", stats.length);
      console.log("Line count:", stats.split('\\n').length);

      // Analyze content
      const isJSON = file.type.includes('json') || filePath.endsWith('.json');
      const isTS = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
      const isJS = filePath.endsWith('.js') || filePath.endsWith('.jsx');

      if (isJSON) {
        try {
          const json = await file.json();
          console.log("📋 JSON Keys:", Object.keys(json).join(', '));
          console.log("JSON Depth:", getMaxDepth(json));
        } catch (e) {
          console.log("❌ Invalid JSON");
        }
      }

      if (isTS || isJS) {
        const lines = stats.split('\\n');
        console.log("📝 Code lines:", lines.filter(line => line.trim() && !line.trim().startsWith('//')).length);
        console.log("Comment lines:", lines.filter(line => line.trim().startsWith('//')).length);
        console.log("Empty lines:", lines.filter(line => !line.trim()).length);
      }

      // Content preview
      console.log("\\n📄 Content Preview:");
      console.log("-".repeat(40));
      console.log(stats.substring(0, 300));
      if (stats.length > 300) {
        console.log("... (truncated)");
      }
    }

  } catch (error) {
    console.error("❌ Error analyzing file:", error.message);
  }
}

function getMaxDepth(obj: any, depth = 0): number {
  if (typeof obj !== 'object' || obj === null) return depth;
  return Math.max(...Object.values(obj).map(val => getMaxDepth(val, depth + 1)));
}

const filePath = process.argv[2] || 'package.json';
analyzeFile(filePath);
`;

  await Bun.write("src/utils/file-analyzer.ts", fileAnalyzer);
}

async function generateCIConfig(config: any): Promise<string> {
  return `name: CI/CD Pipeline
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
      with:
        bun-version: latest

    - name: Install dependencies
      run: bun install

    - name: Run tests
      run: bun test --coverage

    - name: Build
      run: bun run build

    - name: Upload coverage
      uses: codecov/codecov-action@v3

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3

    - name: Setup Bun
      uses: oven-sh/setup-bun@v1

    - name: Build and deploy
      run: |
        bun install
        bun run build
        # Add deployment commands here
`;
}

async function setup() {
  console.log(chalk.blue(`🔧 Setting up workspace with Bun ${Bun.version}`));

  // Apply CLI args to setup
  if (args.silent) {
    console.log = () => {};
  }

  if (args.cwd !== ".") {
    process.chdir(args.cwd);
  }

  // Handle stdin input
  if (args.stdin) {
    console.log(chalk.blue("📥 Processing stdin input..."));
    const stdinContent = await Bun.stdin.text();
    console.log("Received stdin input:", stdinContent.length, "characters");
  }

  // Interactive configuration
  const config = await prompts([
    {
      type: "select",
      name: "environment",
      message: "Environment:",
      choices: [
        { title: "🚀 Production", value: "production" },
        { title: "🔧 Development", value: "development" },
        { title: "🧪 Testing", value: "test" },
        { title: "📦 Staging", value: "staging" },
      ],
    },
    {
      type: "multiselect",
      name: "features",
      message: "Enable features:",
      choices: [
        { title: "📊 Database (PostgreSQL)", value: "database" },
        { title: "🔧 Redis Cache", value: "redis" },
        { title: "📡 Real-time WebSockets", value: "websockets" },
        { title: "📈 Analytics", value: "analytics" },
        { title: "🔐 Authentication", value: "auth" },
        { title: "📧 Email Service", value: "email" },
        { title: "💳 Payment Processing", value: "payments" },
        { title: "🤖 AI/ML Integration", value: "ai" },
      ],
    },
    {
      type: "confirm",
      name: "useDocker",
      message: "Use Docker for deployment?",
      initial: true,
    },
    {
      type: "confirm",
      name: "enableCI",
      message: "Set up CI/CD pipeline?",
      initial: true,
    },
    {
      type: "text",
      name: "serverPort",
      message: "Server port:",
      initial: args.port || "3000",
      validate: (value) =>
        !isNaN(parseInt(value)) ? true : "Must be a number",
    },
  ]);

  // Generate configuration files
  await createConfigFiles(config, args);

  // Install dependencies if not disabled
  if (!args.noInstall) {
    await installDependencies(args);
  }

  // Initialize git if not present
  if (!existsSync(".git")) {
    await $`git init`;
    await $`git add .`;
    await $`git commit -m "feat: initial commit from enhanced template"`;
  }

  // Run post-setup hooks
  await postSetup(config, args);

  console.log(chalk.green("✅ Setup complete!"));
  printNextSteps(config, args);
}

async function installDependencies(args: any) {
  console.log(chalk.blue("📦 Installing dependencies..."));

  const installArgs = [];
  if (args.preferOffline) installArgs.push("--prefer-offline");
  if (args.preferLatest) installArgs.push("--prefer-latest");
  if (args.force) installArgs.push("--force");
  if (args.cache === false) installArgs.push("--no-cache");

  if (args.install === "force") {
    await $`rm -rf node_modules bun.lockb`;
  }

  await $`bun install ${installArgs.join(" ")}`;
}

async function postSetup(config: any, args: any) {
  // Apply CLI-defined values
  if (args.define) {
    const [key, value] = args.define.split(":");
    await $`echo "${key}=${value}" >> .env`;
  }

  // Run database migrations if database feature is enabled
  if (config.features.includes("database")) {
    console.log(chalk.blue("🗃️  Setting up database..."));
    await $`bun run --if-present db:migrate`;
  }

  // Run any eval scripts passed via CLI
  if (args.eval) {
    console.log(chalk.blue("📝 Running eval script..."));
    await $`bun -e "${args.eval}"`;
  }

  if (args.print) {
    console.log(chalk.blue("🖨️  Running print script..."));
    const result = await $`bun -p "${args.print}"`.text();
    console.log(chalk.green("Result:"), result);
  }

  // Test stdin functionality
  if (args.stdin) {
    console.log(chalk.blue("📥 Testing stdin processing..."));
    await $`echo "Test stdin input" | bun run src/utils/stdin-processor.ts`;
  }

  // Test file I/O functionality
  console.log(chalk.blue("📁 Testing file I/O..."));
  await $`bun run src/utils/file-reader.ts package.json`;
  await $`bun run src/utils/file-writer.ts test-output.txt "Hello from enhanced setup!"`;
}

function printNextSteps(config: any, args: any) {
  console.log("\n" + "=".repeat(50));
  console.log(chalk.bold.cyan("🚀 Your enhanced workspace is ready!"));
  console.log("=".repeat(50) + "\n");

  console.log(chalk.bold("📁 Project:"), process.cwd());
  console.log(chalk.bold("🌍 Environment:"), config.environment);
  console.log(chalk.bold("🔧 Features:"), config.features.join(", ") || "None");
  console.log(chalk.bold("🚪 Server port:"), config.serverPort);
  console.log(chalk.bold("🔧 Bun version:"), Bun.version);

  console.log("\n" + chalk.bold("👉 Next Steps:"));
  console.log(`  1. ${chalk.cyan("cd " + process.cwd())}`);

  if (!args.noInstall) {
    console.log(`  2. ${chalk.cyan("bun run dev")} - Start development server`);
  } else {
    console.log(
      `  2. ${chalk.cyan("bun install")} - Install dependencies first`
    );
    console.log(`  3. ${chalk.cyan("bun run dev")} - Start development server`);
  }

  console.log(`  3. ${chalk.cyan("bun test")} - Run tests`);
  console.log(`  4. ${chalk.cyan("bun run build")} - Build for production`);

  console.log("\n" + chalk.bold("📡 Stdin Examples:"));
  console.log(
    `  ${chalk.cyan('echo "Hello" | bun run -')} - Pipe stdin to Bun`
  );
  console.log(
    `  ${chalk.cyan("cat package.json | bun run src/utils/file-analyzer.ts")} - Analyze file via stdin`
  );
  console.log(
    `  ${chalk.cyan("tail -f log.txt | bun run src/utils/log-processor.ts")} - Stream logs`
  );

  console.log("\n" + chalk.bold("📁 File I/O Examples:"));
  console.log(
    `  ${chalk.cyan("bun run file:read package.json")} - Read file with Bun.file()`
  );
  console.log(
    `  ${chalk.cyan('bun run file:write output.txt "content"')} - Write file with Bun.write()`
  );
  console.log(
    `  ${chalk.cyan("bun run file:copy src.txt dest.txt")} - Copy files`
  );
  console.log(
    `  ${chalk.cyan("bun run file:analyze package.json")} - Analyze file structure`
  );

  if (config.useDocker) {
    console.log(`\n${chalk.bold("🐳 Docker Commands:")}`);
    console.log(`  ${chalk.cyan("bun run docker:build")} - Build Docker image`);
    console.log(`  ${chalk.cyan("bun run docker:run")} - Run in Docker`);
  }

  if (args.inspect || args.inspectWait || args.inspectBrk) {
    console.log(`\n${chalk.bold("🔍 Debugging:")}`);
    console.log(`  Open Chrome DevTools at ${chalk.cyan("chrome://inspect")}`);
  }

  if (args.watch || args.hot) {
    console.log(`\n${chalk.bold("🔄 Auto-reload enabled:")}`);
    console.log(`  Changes will trigger automatic restart`);
  }

  if (args.smol) {
    console.log(`\n${chalk.bold("📦 Memory optimization:")}`);
    console.log(`  Running in smol mode for reduced memory usage`);
  }

  console.log("\n" + "=".repeat(50));
}

// Export for testing
export { createConfigFiles, generateBunfigConfig, setup };

// Run if called directly
if (import.meta.main) {
  setup().catch(console.error);
}
