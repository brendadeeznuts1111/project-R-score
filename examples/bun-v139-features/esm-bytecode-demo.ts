#!/usr/bin/env bun
/**
 * Bun v1.3.9: ESM Bytecode Compilation Demo
 * 
 * Demonstrates the new --format=esm support with --bytecode
 */

import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdir, rm, writeFile } from "node:fs/promises";

console.log("📦 Bun v1.3.9: ESM Bytecode Compilation Demo\n");
console.log("=" .repeat(70));

const demoDir = join(tmpdir(), `bun-esm-bytecode-demo-${Date.now()}`);

// Example ESM CLI source code
const cliSource = `#!/usr/bin/env bun
/**
 * Example CLI tool with ESM bytecode compilation
 */

import { parseArgs } from "node:util";

// Top-level await works in ESM bytecode!
const config = await loadConfig();

interface Config {
  name: string;
  version: string;
  defaults: Record<string, unknown>;
}

async function loadConfig(): Promise<Config> {
  // Simulated async config loading
  return {
    name: "esm-cli-demo",
    version: "1.0.0",
    defaults: { verbose: false, output: "stdout" },
  };
}

function showHelp(): void {
  console.log(\`
ESM CLI Demo (Bun v1.3.9+ Bytecode Compiled)

Usage: cli [options] <command>

Commands:
  greet <name>     Greet someone
  info             Show configuration info
  version          Show version

Options:
  -h, --help       Show this help
  -v, --verbose    Enable verbose output
\`);
}

function greet(name: string, verbose: boolean): void {
  if (verbose) {
    console.log(\`[VERBOSE] Config loaded: \${config.name}@\${config.version}\`);
  }
  console.log(\`Hello, \${name}! 👋\`);
  console.log(\`Running on Bun \${Bun.version}\`);
}

function showInfo(): void {
  console.log("📊 Configuration Info:");
  console.log(\`  Name:    \${config.name}\`);
  console.log(\`  Version: \${config.version}\`);
  console.log(\`  Defaults: \${JSON.stringify(config.defaults, null, 2)}\`);
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      help: { type: "boolean", short: "h" },
      verbose: { type: "boolean", short: "v" },
    },
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    showHelp();
    return;
  }

  const [command, ...args] = positionals;

  switch (command) {
    case "greet":
      greet(args[0] || "World", values.verbose || false);
      break;
    case "info":
      showInfo();
      break;
    case "version":
      console.log(config.version);
      break;
    default:
      console.error(\`Unknown command: \${command}\`);
      showHelp();
      process.exit(1);
  }
}

await main();
`;

// Package.json for the demo
const packageJson = {
  name: "esm-bytecode-demo",
  version: "1.0.0",
  type: "module",  // ESM mode
  scripts: {
    "build:esm": "bun build --compile --bytecode --format=esm ./cli.ts --outfile ./dist/cli-esm",
    "build:cjs": "bun build --compile --bytecode --format=cjs ./cli.ts --outfile ./dist/cli-cjs",
    "build:smol": "bun build --compile --bytecode --format=esm --minify --sourcemap ./cli.ts --outfile ./dist/cli-smol",
    "run:esm": "./dist/cli-esm greet 'ESM World'",
    "run:cjs": "./dist/cli-cjs greet 'CJS World'",
  },
};

async function setup() {
  await mkdir(demoDir, { recursive: true });
  await mkdir(join(demoDir, "dist"), { recursive: true });
  await writeFile(join(demoDir, "cli.ts"), cliSource);
  await writeFile(join(demoDir, "package.json"), JSON.stringify(packageJson, null, 2));
}

async function cleanup() {
  await rm(demoDir, { recursive: true, force: true });
}

async function buildESM() {
  console.log("\n📦 Building ESM Bytecode Binary");
  console.log("Command: bun build --compile --bytecode --format=esm ./cli.ts");
  console.log("-".repeat(70));

  const proc = Bun.spawn({
    cmd: ["bun", "build", "--compile", "--bytecode", "--format=esm", "./cli.ts", "--outfile", "./dist/cli-esm"],
    cwd: demoDir,
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await proc.exited;
  return exitCode === 0;
}

async function buildCJS() {
  console.log("\n📦 Building CJS Bytecode Binary (for comparison)");
  console.log("Command: bun build --compile --bytecode --format=cjs ./cli.ts");
  console.log("-".repeat(70));

  const proc = Bun.spawn({
    cmd: ["bun", "build", "--compile", "--bytecode", "--format=cjs", "./cli.ts", "--outfile", "./dist/cli-cjs"],
    cwd: demoDir,
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await proc.exited;
  return exitCode === 0;
}

async function runBinary(binary: string, args: string[]) {
  const binaryPath = join(demoDir, "dist", binary);
  
  console.log(`\n▶️ Running: ./dist/${binary} ${args.join(" ")}`);
  console.log("-".repeat(70));

  const proc = Bun.spawn({
    cmd: [binaryPath, ...args],
    cwd: demoDir,
    stdout: "inherit",
    stderr: "inherit",
  });

  return await proc.exited;
}

async function compareBinaries() {
  console.log("\n" + "=".repeat(70));
  console.log("📊 Binary Comparison");
  console.log("=".repeat(70));

  const esmPath = join(demoDir, "dist", "cli-esm");
  const cjsPath = join(demoDir, "dist", "cli-cjs");

  const esmFile = Bun.file(esmPath);
  const cjsFile = Bun.file(cjsPath);

  const esmExists = await esmFile.exists();
  const cjsExists = await cjsFile.exists();

  console.log("\nBinary files:");
  console.log(`  ESM: ${esmExists ? `${(await esmFile.size()).toLocaleString()} bytes` : "Not found"}`);
  console.log(`  CJS: ${cjsExists ? `${(await cjsFile.size()).toLocaleString()} bytes` : "Not found"}`);
}

function showBuildConfigurations() {
  console.log("\n" + "=".repeat(70));
  console.log("🔧 Build Configuration Examples");
  console.log("=".repeat(70));
  console.log(`
# ESM Bytecode (NEW in v1.3.9)
bun build --compile --bytecode --format=esm ./cli.ts --outfile ./dist/my-cli

# CJS Bytecode (existing)
bun build --compile --bytecode --format=cjs ./cli.ts --outfile ./dist/my-cli

# Minified ESM bytecode (smaller size)
bun build --compile --bytecode --format=esm --minify ./cli.ts --outfile ./dist/my-cli

# With source maps for debugging
bun build --compile --bytecode --format=esm --sourcemap ./cli.ts --outfile ./dist/my-cli

# Cross-platform builds
bun build --compile --bytecode --format=esm --target=bun-linux-x64 ./cli.ts
bun build --compile --bytecode --format=esm --target=bun-darwin-arm64 ./cli.ts
bun build --compile --bytecode --format=esm --target=bun-windows-x64 ./cli.ts
`);
}

function showPackageJsonExample() {
  console.log("\n" + "=".repeat(70));
  console.log("📦 Recommended package.json Setup");
  console.log("=".repeat(70));
  console.log(`
{
  "name": "my-cli-tool",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "my-cli": "./dist/cli"
  },
  "scripts": {
    "build": "bun build --compile --bytecode --format=esm ./src/cli.ts --outfile ./dist/cli",
    "build:all": "bun run build:linux && bun run build:mac && bun run build:win",
    "build:linux": "bun build --compile --bytecode --format=esm --target=bun-linux-x64 ./src/cli.ts --outfile ./dist/cli-linux",
    "build:mac": "bun build --compile --bytecode --format=esm --target=bun-darwin-arm64 ./src/cli.ts --outfile ./dist/cli-mac",
    "build:win": "bun build --compile --bytecode --format=esm --target=bun-windows-x64 ./src/cli.ts --outfile ./dist/cli-win.exe"
  }
}
`);
}

// Main
async function main() {
  try {
    console.log(`Bun version: ${Bun.version}`);
    console.log(`Platform: ${process.platform} ${process.arch}`);

    await setup();

    // Build binaries
    const esmBuilt = await buildESM();
    const cjsBuilt = await buildCJS();

    if (esmBuilt) {
      await runBinary("cli-esm", ["greet", "ESM Bytecode World"]);
      await runBinary("cli-esm", ["info"]);
      await runBinary("cli-esm", ["--verbose", "greet", "Verbose"]);
    }

    if (cjsBuilt) {
      await runBinary("cli-cjs", ["greet", "CJS Bytecode World"]);
    }

    await compareBinaries();
    showBuildConfigurations();
    showPackageJsonExample();

    console.log("\n✅ ESM Bytecode demo complete!\n");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await cleanup();
  }
}

if (import.meta.main) {
  main();
}

export { main };
