#!/usr/bin/env bun
/**
 * Bun v1.3.9: Parallel & Sequential Script Execution Demo
 * 
 * Demonstrates the new --parallel and --sequential flags for bun run
 */

import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdir, rm, writeFile } from "node:fs/promises";

console.info("🚀 Bun v1.3.9: Script Orchestration Demo\n");
console.info("=" .repeat(70));

// Create a temporary workspace for the demo
const demoDir = join(tmpdir(), `bun-parallel-demo-${Date.now()}`);

// Sample package.json with multiple scripts
const packageJson = {
  name: "parallel-demo",
  version: "1.0.0",
  scripts: {
    "build:js": "echo '🔨 [build:js] Compiling JavaScript...' && sleep 0.3 && echo '✅ [build:js] Done'",
    "build:css": "echo '💅 [build:css] Processing CSS...' && sleep 0.2 && echo '✅ [build:css] Done'",
    "build:types": "echo '📘 [build:types] Generating types...' && sleep 0.25 && echo '✅ [build:types] Done'",
    "test:unit": "echo '🧪 [test:unit] Running unit tests...' && sleep 0.4 && echo '✅ [test:unit] Passed'",
    "test:e2e": "echo '🎭 [test:e2e] Running E2E tests...' && sleep 0.5 && echo '✅ [test:e2e] Passed'",
    "lint:js": "echo '🔍 [lint:js] Linting JS...' && sleep 0.15 && echo '✅ [lint:js] Clean'",
    "lint:ts": "echo '🔍 [lint:ts] Linting TS...' && sleep 0.15 && echo '✅ [lint:ts] Clean'",
    "dev:server": "echo '🌐 [dev:server] Starting server...' && sleep 0.2 && echo '✅ [dev:server] Ready on :3000'",
    "dev:client": "echo '💻 [dev:client] Starting client...' && sleep 0.3 && echo '✅ [dev:client] Ready on :8080'",
  },
  workspaces: ["packages/*"],
};

// Create workspace packages
const packages = {
  "packages/ui": {
    name: "@demo/ui",
    scripts: {
      build: "echo '🎨 [ui:build] Building UI...' && sleep 0.2 && echo '✅ Done'",
      test: "echo '🧪 [ui:test] Testing UI...' && sleep 0.3 && echo '✅ Passed'",
    },
  },
  "packages/core": {
    name: "@demo/core",
    scripts: {
      build: "echo '🔧 [core:build] Building core...' && sleep 0.3 && echo '✅ Done'",
      test: "echo '🧪 [core:test] Testing core...' && sleep 0.2 && echo '✅ Passed'",
    },
  },
};

async function setup() {
  await mkdir(demoDir, { recursive: true });
  await writeFile(join(demoDir, "package.json"), JSON.stringify(packageJson, null, 2));
  
  for (const [dir, pkg] of Object.entries(packages)) {
    const pkgDir = join(demoDir, dir);
    await mkdir(pkgDir, { recursive: true });
    await writeFile(join(pkgDir, "package.json"), JSON.stringify(pkg, null, 2));
  }
}

async function cleanup() {
  await rm(demoDir, { recursive: true, force: true });
}

async function demo1_basicParallel() {
  console.info("\n📦 Demo 1: Basic Parallel Execution");
  console.info("Command: bun run --parallel build:js build:css build:types");
  console.info("-".repeat(70));
  
  const proc = Bun.spawn({
    cmd: ["bun", "run", "--parallel", "build:js", "build:css", "build:types"],
    cwd: demoDir,
    stdout: "inherit",
    stderr: "inherit",
  });
  
  await proc.exited;
  console.info("\n✅ Parallel builds complete! (All ran simultaneously)\n");
}

async function demo2_basicSequential() {
  console.info("\n📦 Demo 2: Sequential Execution");
  console.info("Command: bun run --sequential lint:js lint:ts");
  console.info("-".repeat(70));
  
  const proc = Bun.spawn({
    cmd: ["bun", "run", "--sequential", "lint:js", "lint:ts"],
    cwd: demoDir,
    stdout: "inherit",
    stderr: "inherit",
  });
  
  await proc.exited;
  console.info("\n✅ Sequential tasks complete! (Ran one after another)\n");
}

async function demo3_globPatterns() {
  console.info("\n📦 Demo 3: Glob Pattern Matching");
  console.info("Command: bun run --parallel \"build:*\"");
  console.info("-".repeat(70));
  
  const proc = Bun.spawn({
    cmd: ["bun", "run", "--parallel", "build:*"],
    cwd: demoDir,
    stdout: "inherit",
    stderr: "inherit",
  });
  
  await proc.exited;
  console.info("\n✅ Glob pattern matched all 'build:*' scripts!\n");
}

async function demo4_workspaceParallel() {
  console.info("\n📦 Demo 4: Workspace Parallel Execution");
  console.info("Command: bun run --parallel --filter '*' build");
  console.info("-".repeat(70));
  
  const proc = Bun.spawn({
    cmd: ["bun", "run", "--parallel", "--filter", "*", "build"],
    cwd: demoDir,
    stdout: "inherit",
    stderr: "inherit",
  });
  
  await proc.exited;
  console.info("\n✅ Workspace builds complete!\n");
}

async function demo5_multipleScriptsWorkspace() {
  console.info("\n📦 Demo 5: Multiple Scripts Across Workspaces");
  console.info("Command: bun run --parallel --filter '*' build test");
  console.info("-".repeat(70));
  
  const proc = Bun.spawn({
    cmd: ["bun", "run", "--parallel", "--filter", "*", "build", "test"],
    cwd: demoDir,
    stdout: "inherit",
    stderr: "inherit",
  });
  
  await proc.exited;
  console.info("\n✅ Multiple scripts across workspaces complete!\n");
}

async function showKeyDifferences() {
  console.info("\n" + "=".repeat(70));
  console.info("🔑 Key Differences: --filter vs --parallel/--sequential");
  console.info("=".repeat(70));
  console.info(`
┌─────────────────┬─────────────────────┬──────────────────────────────┐
│ Feature         │ --filter            │ --parallel / --sequential    │
├─────────────────┼─────────────────────┼──────────────────────────────┤
│ Dependency order│ ✅ Respected        │ ❌ Not respected              │
│ Execution       │ Topological sort    │ Immediate start               │
│ Use case        │ Build dependencies  │ Independent scripts           │
│ Watch scripts   │ May wait            │ Starts immediately            │
│ CI/CD pipelines │ Complex workflows   │ Simple parallel/sequential    │
└─────────────────┴─────────────────────┴──────────────────────────────┘
`);
}

async function showCommandReference() {
  console.info("\n" + "=".repeat(70));
  console.info("📚 Command Reference");
  console.info("=".repeat(70));
  console.info(`
# Parallel execution (all scripts start immediately)
bun run --parallel script1 script2 script3

# Sequential execution (scripts run one after another)
bun run --sequential script1 script2 script3

# Glob patterns
bun run --parallel "build:*"
bun run --parallel "test:*"

# Workspace support
bun run --parallel --filter '*' build       # All packages, parallel
bun run --sequential --workspaces build     # All packages, sequential

# Error handling
bun run --parallel --no-exit-on-error test  # Continue on failure
bun run --parallel --if-present build       # Skip missing scripts

# Multiple scripts across packages
bun run --parallel --filter '*' build lint test
`);
}

// Main execution
async function main() {
  try {
    await setup();
    
    await demo1_basicParallel();
    await new Promise(r => setTimeout(r, 500));
    
    await demo2_basicSequential();
    await new Promise(r => setTimeout(r, 500));
    
    await demo3_globPatterns();
    await new Promise(r => setTimeout(r, 500));
    
    await demo4_workspaceParallel();
    await new Promise(r => setTimeout(r, 500));
    
    await demo5_multipleScriptsWorkspace();
    
    await showKeyDifferences();
    await showCommandReference();
    
    console.info("\n✨ All demos complete!\n");
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
