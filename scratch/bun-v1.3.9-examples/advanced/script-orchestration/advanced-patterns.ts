#!/usr/bin/env bun
/**
 * Advanced Patterns for bun run --parallel and --sequential
 * 
 * Demonstrates complex workspace scenarios, conditional execution,
 * dynamic script generation, performance benchmarking, and error recovery.
 */

import { spawn } from "bun";
import { performance } from "perf_hooks";
import { join } from "node:path";

console.log("🚀 Advanced Script Orchestration Patterns\n");
console.log("=".repeat(70));

// ============================================================================
// Pattern 1: Complex Workspace Dependency Graphs
// ============================================================================

interface PackageDependency {
  name: string;
  dependencies: string[];
  scripts: Record<string, string>;
}

const workspaceGraph: PackageDependency[] = [
  {
    name: "core",
    dependencies: [],
    scripts: { build: "echo 'Building core...'", test: "echo 'Testing core...'" }
  },
  {
    name: "utils",
    dependencies: [],
    scripts: { build: "echo 'Building utils...'", test: "echo 'Testing utils...'" }
  },
  {
    name: "api",
    dependencies: ["core", "utils"],
    scripts: { build: "echo 'Building api...'", test: "echo 'Testing api...'" }
  },
  {
    name: "frontend",
    dependencies: ["core", "utils"],
    scripts: { build: "echo 'Building frontend...'", test: "echo 'Testing frontend...'" }
  },
  {
    name: "app",
    dependencies: ["api", "frontend"],
    scripts: { build: "echo 'Building app...'", test: "echo 'Testing app...'" }
  }
];

function topologicalSort(packages: PackageDependency[]): string[][] {
  const levels: string[][] = [];
  const processed = new Set<string>();
  
  while (processed.size < packages.length) {
    const currentLevel: string[] = [];
    
    for (const pkg of packages) {
      if (processed.has(pkg.name)) continue;
      
      const allDepsProcessed = pkg.dependencies.every(dep => processed.has(dep));
      if (allDepsProcessed) {
        currentLevel.push(pkg.name);
        processed.add(pkg.name);
      }
    }
    
    if (currentLevel.length === 0) {
      throw new Error("Circular dependency detected!");
    }
    
    levels.push(currentLevel);
  }
  
  return levels;
}

console.log("\n📦 Pattern 1: Complex Dependency Graph");
console.log("-".repeat(70));
const levels = topologicalSort(workspaceGraph);
console.log("Dependency levels:");
levels.forEach((level, i) => {
  console.log(`  Level ${i + 1}: ${level.join(", ")}`);
});

console.log("\nSequential execution strategy:");
console.log("  bun run --sequential --filter 'core' build");
console.log("  bun run --sequential --filter 'utils' build");
console.log("  bun run --parallel --filter 'api|frontend' build");
console.log("  bun run --sequential --filter 'app' build");

console.log("\nParallel execution (no dependencies):");
console.log("  bun run --parallel --filter '*' build");
console.log("  ⚠️  Note: May fail if dependencies aren't built first");

// ============================================================================
// Pattern 2: Conditional Script Execution
// ============================================================================

interface ConditionalScript {
  name: string;
  condition: () => boolean;
  script: string;
  fallback?: string;
}

const conditionalScripts: ConditionalScript[] = [
  {
    name: "build:production",
    condition: () => process.env.NODE_ENV === "production",
    script: "bun run build:prod",
    fallback: "bun run build:dev"
  },
  {
    name: "test:coverage",
    condition: () => process.env.COVERAGE === "true",
    script: "bun run test --coverage",
    fallback: "bun run test"
  },
  {
    name: "deploy:staging",
    condition: () => process.env.BRANCH === "develop",
    script: "bun run deploy --env staging",
    fallback: "bun run deploy --env local"
  }
];

console.log("\n📋 Pattern 2: Conditional Script Execution");
console.log("-".repeat(70));

function executeConditional(scripts: ConditionalScript[]): string[] {
  return scripts
    .map(s => s.condition() ? s.script : s.fallback || s.script)
    .filter(Boolean);
}

const selectedScripts = executeConditional(conditionalScripts);
console.log("Selected scripts based on conditions:");
selectedScripts.forEach((script, i) => {
  console.log(`  ${i + 1}. ${script}`);
});

console.log("\nUsage:");
console.log("  const scripts = executeConditional(conditionalScripts);");
console.log("  bun run --parallel " + selectedScripts.join(" "));

// ============================================================================
// Pattern 3: Dynamic Script Generation
// ============================================================================

interface ScriptGenerator {
  generate(env: string, packages: string[]): string[];
}

class DynamicScriptGenerator implements ScriptGenerator {
  generate(env: string, packages: string[]): string[] {
    const scripts: string[] = [];
    
    // Generate build scripts
    if (env === "production") {
      scripts.push(...packages.map(pkg => `${pkg}:build:prod`));
    } else {
      scripts.push(...packages.map(pkg => `${pkg}:build:dev`));
    }
    
    // Generate test scripts
    if (process.env.RUN_TESTS === "true") {
      scripts.push(...packages.map(pkg => `${pkg}:test`));
    }
    
    // Generate lint scripts
    if (process.env.RUN_LINT === "true") {
      scripts.push(...packages.map(pkg => `${pkg}:lint`));
    }
    
    return scripts;
  }
}

console.log("\n🔧 Pattern 3: Dynamic Script Generation");
console.log("-".repeat(70));

const generator = new DynamicScriptGenerator();
const dynamicScripts = generator.generate("production", ["api", "frontend", "utils"]);

console.log("Generated scripts:");
dynamicScripts.forEach(script => console.log(`  • ${script}`));

console.log("\nExecution:");
console.log(`  bun run --parallel ${dynamicScripts.join(" ")}`);

// ============================================================================
// Pattern 4: Performance Benchmarking
// ============================================================================

async function benchmarkExecution(
  name: string,
  command: string[],
  iterations: number = 5
): Promise<{ avg: number; min: number; max: number }> {
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    
    const proc = spawn({
      cmd: command,
      stdout: "pipe",
      stderr: "pipe",
    });
    
    await proc.exited;
    const end = performance.now();
    
    times.push(end - start);
  }
  
  return {
    avg: times.reduce((a, b) => a + b, 0) / times.length,
    min: Math.min(...times),
    max: Math.max(...times),
  };
}

console.log("\n⚡ Pattern 4: Performance Benchmarking");
console.log("-".repeat(70));

console.log("Benchmarking parallel vs sequential execution...");

// Note: This would require actual package.json files
// For demo, we'll show the pattern
console.log(`
async function compareExecution() {
  const parallel = await benchmarkExecution(
    "parallel",
    ["bun", "run", "--parallel", "build", "test", "lint"],
    5
  );
  
  const sequential = await benchmarkExecution(
    "sequential",
    ["bun", "run", "--sequential", "build", "test", "lint"],
    5
  );
  
  console.log(\`Parallel:   \${parallel.avg.toFixed(2)}ms (avg)\`);
  console.log(\`Sequential: \${sequential.avg.toFixed(2)}ms (avg)\`);
  console.log(\`Speedup:    \${(sequential.avg / parallel.avg).toFixed(2)}x\`);
}
`);

// ============================================================================
// Pattern 5: Error Recovery Strategies
// ============================================================================

interface ErrorRecoveryStrategy {
  name: string;
  retry: boolean;
  continueOnError: boolean;
  fallback?: string;
}

const errorStrategies: Record<string, ErrorRecoveryStrategy> = {
  "fail-fast": {
    name: "Fail Fast",
    retry: false,
    continueOnError: false,
  },
  "retry-once": {
    name: "Retry Once",
    retry: true,
    continueOnError: false,
  },
  "continue-all": {
    name: "Continue All",
    retry: false,
    continueOnError: true,
  },
  "retry-and-continue": {
    name: "Retry and Continue",
    retry: true,
    continueOnError: true,
  },
};

console.log("\n🛡️  Pattern 5: Error Recovery Strategies");
console.log("-".repeat(70));

Object.entries(errorStrategies).forEach(([key, strategy]) => {
  console.log(`\n${strategy.name} (${key}):`);
  
  const flags: string[] = [];
  if (strategy.continueOnError) {
    flags.push("--no-exit-on-error");
  }
  
  console.log(`  Command: bun run --parallel ${flags.join(" ")} build test lint`);
  console.log(`  Retry: ${strategy.retry ? "Yes" : "No"}`);
  console.log(`  Continue on error: ${strategy.continueOnError ? "Yes" : "No"}`);
});

// ============================================================================
// Pattern 6: Script Dependency Chains
// ============================================================================

interface ScriptChain {
  name: string;
  scripts: string[];
  parallel: boolean;
}

const scriptChains: ScriptChain[] = [
  {
    name: "CI Pipeline",
    scripts: ["lint", "typecheck", "build", "test"],
    parallel: false, // Must run in order
  },
  {
    name: "Development",
    scripts: ["build:watch", "test:watch", "lint:watch"],
    parallel: true, // Can run concurrently
  },
  {
    name: "Production Build",
    scripts: ["clean", "build:prod", "test:prod", "bundle"],
    parallel: false, // Sequential dependencies
  },
];

console.log("\n🔗 Pattern 6: Script Dependency Chains");
console.log("-".repeat(70));

scriptChains.forEach(chain => {
  console.log(`\n${chain.name}:`);
  if (chain.parallel) {
    console.log(`  bun run --parallel ${chain.scripts.join(" ")}`);
  } else {
    console.log(`  bun run --sequential ${chain.scripts.join(" ")}`);
  }
});

// ============================================================================
// Pattern 7: Workspace Filtering Strategies
// ============================================================================

console.log("\n🎯 Pattern 7: Workspace Filtering Strategies");
console.log("-".repeat(70));

const filteringStrategies = {
  "all-packages": {
    description: "Run in all packages",
    command: "bun run --parallel --filter '*' build",
  },
  "changed-packages": {
    description: "Run only in changed packages (requires git)",
    command: "bun run --parallel --filter '[HEAD^1]' build",
  },
  "specific-packages": {
    description: "Run in specific packages",
    command: "bun run --parallel --filter 'api|frontend' build",
  },
  "dependency-tree": {
    description: "Run in dependency order",
    command: "bun run --filter '...api' build", // Uses --filter for dependencies
  },
  "no-dependencies": {
    description: "Run without dependencies",
    command: "bun run --parallel --filter '^api' build",
  },
};

Object.entries(filteringStrategies).forEach(([key, strategy]) => {
  console.log(`\n${strategy.description}:`);
  console.log(`  ${strategy.command}`);
});

console.log("\n✅ Advanced Patterns Complete!");
console.log("\nKey Takeaways:");
console.log("  • Use --parallel for independent scripts");
console.log("  • Use --sequential for dependent scripts");
console.log("  • Use --filter for dependency-aware execution");
console.log("  • Use --no-exit-on-error for error tolerance");
console.log("  • Combine patterns for complex workflows");
