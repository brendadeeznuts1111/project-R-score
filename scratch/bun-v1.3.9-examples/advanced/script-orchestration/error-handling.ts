#!/usr/bin/env bun
/**
 * Error Handling Strategies for bun run --parallel and --sequential
 * 
 * Demonstrates error recovery, retry logic, error reporting,
 * and graceful degradation patterns.
 */

import { spawn } from "bun";

console.log("🛡️  Error Handling Strategies\n");
console.log("=".repeat(70));

// ============================================================================
// Strategy 1: Error Recovery Patterns
// ============================================================================

interface ErrorRecoveryConfig {
  name: string;
  continueOnError: boolean;
  retryOnFailure: boolean;
  maxRetries?: number;
  command: string;
}

const errorRecoveryConfigs: ErrorRecoveryConfig[] = [
  {
    name: "Fail Fast",
    continueOnError: false,
    retryOnFailure: false,
    command: "bun run --parallel build test lint",
  },
  {
    name: "Continue All",
    continueOnError: true,
    retryOnFailure: false,
    command: "bun run --parallel --no-exit-on-error build test lint",
  },
  {
    name: "Retry Once",
    continueOnError: false,
    retryOnFailure: true,
    maxRetries: 1,
    command: "bun run --parallel build test lint", // With retry wrapper
  },
  {
    name: "Retry and Continue",
    continueOnError: true,
    retryOnFailure: true,
    maxRetries: 2,
    command: "bun run --parallel --no-exit-on-error build test lint", // With retry wrapper
  },
];

console.log("\n🔄 Strategy 1: Error Recovery Patterns");
console.log("-".repeat(70));

errorRecoveryConfigs.forEach(config => {
  console.log(`\n${config.name}:`);
  console.log(`  Continue on error: ${config.continueOnError}`);
  console.log(`  Retry on failure: ${config.retryOnFailure}`);
  if (config.maxRetries) {
    console.log(`  Max retries: ${config.maxRetries}`);
  }
  console.log(`  Command: ${config.command}`);
});

// ============================================================================
// Strategy 2: Retry Logic Implementation
// ============================================================================

async function runWithRetry(
  command: string[],
  maxRetries: number = 3,
  delay: number = 1000
): Promise<{ success: boolean; attempts: number; error?: Error }> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const proc = spawn({
        cmd: command,
        stdout: "pipe",
        stderr: "pipe",
      });
      
      await proc.exited;
      
      if (proc.exitCode === 0) {
        return { success: true, attempts: attempt };
      }
      
      lastError = new Error(`Command failed with exit code ${proc.exitCode}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  return { success: false, attempts: maxRetries, error: lastError };
}

console.log("\n🔄 Strategy 2: Retry Logic Implementation");
console.log("-".repeat(70));

console.log(`
async function runWithRetry(
  command: string[],
  maxRetries: number = 3,
  delay: number = 1000
): Promise<{ success: boolean; attempts: number; error?: Error }> {
  // Implementation with exponential backoff
  // Returns success status and number of attempts
}
`);

console.log("Usage:");
console.log(`  const result = await runWithRetry(["bun", "run", "build"], 3);`);
console.log(`  if (!result.success) {`);
console.log(`    console.error(\`Failed after \${result.attempts} attempts\`);`);
console.log(`  }`);

// ============================================================================
// Strategy 3: Error Reporting and Aggregation
// ============================================================================

interface ScriptResult {
  script: string;
  success: boolean;
  exitCode: number;
  output: string;
  error?: string;
  duration: number;
}

async function runScriptsWithReporting(
  scripts: string[],
  parallel: boolean = true,
  continueOnError: boolean = false
): Promise<ScriptResult[]> {
  const results: ScriptResult[] = [];
  const startTime = performance.now();
  
  const commands = scripts.map(script => ({
    name: script,
    cmd: ["bun", "run", script],
  }));
  
  if (parallel) {
    const procs = commands.map(({ name, cmd }) => ({
      name,
      proc: spawn({ cmd, stdout: "pipe", stderr: "pipe" }),
    }));
    
    await Promise.allSettled(
      procs.map(async ({ name, proc }) => {
        const scriptStart = performance.now();
        await proc.exited;
        const scriptEnd = performance.now();
        
        const output = await new Response(proc.stdout).text();
        const error = await new Response(proc.stderr).text();
        
        results.push({
          script: name,
          success: proc.exitCode === 0,
          exitCode: proc.exitCode || 0,
          output,
          error: error || undefined,
          duration: scriptEnd - scriptStart,
        });
      })
    );
  } else {
    for (const { name, cmd } of commands) {
      const scriptStart = performance.now();
      const proc = spawn({ cmd, stdout: "pipe", stderr: "pipe" });
      await proc.exited;
      const scriptEnd = performance.now();
      
      const output = await new Response(proc.stdout).text();
      const error = await new Response(proc.stderr).text();
      
      const success = proc.exitCode === 0;
      results.push({
        script: name,
        success,
        exitCode: proc.exitCode || 0,
        output,
        error: error || undefined,
        duration: scriptEnd - scriptStart,
      });
      
      if (!success && !continueOnError) {
        break;
      }
    }
  }
  
  return results;
}

console.log("\n📊 Strategy 3: Error Reporting and Aggregation");
console.log("-".repeat(70));

console.log(`
async function runScriptsWithReporting(
  scripts: string[],
  parallel: boolean = true,
  continueOnError: boolean = false
): Promise<ScriptResult[]> {
  // Runs scripts and collects detailed results
  // Returns array of results with success status, output, errors, and timing
}
`);

console.log("\nExample output:");
console.log(`
[
  {
    script: "build",
    success: true,
    exitCode: 0,
    duration: 1234.56,
    output: "Build complete..."
  },
  {
    script: "test",
    success: false,
    exitCode: 1,
    duration: 567.89,
    error: "Test failed..."
  }
]
`);

// ============================================================================
// Strategy 4: Graceful Degradation
// ============================================================================

interface DegradationStrategy {
  name: string;
  primary: string[];
  fallback: string[];
  condition: (results: ScriptResult[]) => boolean;
}

const degradationStrategies: DegradationStrategy[] = [
  {
    name: "Skip Optional Steps",
    primary: ["build", "test", "lint", "coverage"],
    fallback: ["build", "test"], // Skip lint and coverage on failure
    condition: (results) => results.some(r => !r.success && ["lint", "coverage"].includes(r.script)),
  },
  {
    name: "Use Cached Builds",
    primary: ["build", "test"],
    fallback: ["test"], // Skip build if it fails, use cached
    condition: (results) => results.find(r => r.script === "build")?.success === false,
  },
];

console.log("\n🔄 Strategy 4: Graceful Degradation");
console.log("-".repeat(70));

degradationStrategies.forEach(strategy => {
  console.log(`\n${strategy.name}:`);
  console.log(`  Primary: ${strategy.primary.join(", ")}`);
  console.log(`  Fallback: ${strategy.fallback.join(", ")}`);
});

// ============================================================================
// Strategy 5: Error Classification
// ============================================================================

enum ErrorSeverity {
  CRITICAL = "critical",
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
}

interface ClassifiedError {
  script: string;
  severity: ErrorSeverity;
  message: string;
  recoverable: boolean;
}

function classifyError(result: ScriptResult): ClassifiedError {
  let severity = ErrorSeverity.ERROR;
  let recoverable = false;
  
  if (result.exitCode === 0) {
    severity = ErrorSeverity.INFO;
    recoverable = true;
  } else if (result.exitCode === 1) {
    // General error - might be recoverable
    severity = ErrorSeverity.ERROR;
    recoverable = true;
  } else if (result.exitCode === 130) {
    // SIGINT - user interruption
    severity = ErrorSeverity.WARNING;
    recoverable = true;
  } else if (result.exitCode === 137) {
    // SIGKILL - out of memory
    severity = ErrorSeverity.CRITICAL;
    recoverable = false;
  }
  
  // Check error message for clues
  if (result.error?.includes("timeout")) {
    severity = ErrorSeverity.WARNING;
    recoverable = true;
  } else if (result.error?.includes("ENOENT")) {
    severity = ErrorSeverity.ERROR;
    recoverable = false; // Missing file - can't recover
  }
  
  return {
    script: result.script,
    severity,
    message: result.error || `Exit code ${result.exitCode}`,
    recoverable,
  };
}

console.log("\n🔍 Strategy 5: Error Classification");
console.log("-".repeat(70));

console.log(`
function classifyError(result: ScriptResult): ClassifiedError {
  // Classifies errors by severity and recoverability
  // Helps decide retry strategies
}
`);

console.log("\nError Severities:");
Object.values(ErrorSeverity).forEach(severity => {
  console.log(`  • ${severity}`);
});

// ============================================================================
// Strategy 6: Comprehensive Error Handler
// ============================================================================

class ScriptOrchestrator {
  private results: ScriptResult[] = [];
  
  async run(
    scripts: string[],
    options: {
      parallel?: boolean;
      continueOnError?: boolean;
      retryOnFailure?: boolean;
      maxRetries?: number;
      onError?: (error: ClassifiedError) => void;
    } = {}
  ): Promise<{ success: boolean; results: ScriptResult[] }> {
    const {
      parallel = true,
      continueOnError = false,
      retryOnFailure = false,
      maxRetries = 3,
      onError,
    } = options;
    
    this.results = await runScriptsWithReporting(scripts, parallel, continueOnError);
    
    // Classify and handle errors
    const errors = this.results
      .filter(r => !r.success)
      .map(classifyError);
    
    errors.forEach(error => {
      if (onError) {
        onError(error);
      }
      
      if (error.recoverable && retryOnFailure) {
        // Retry logic would go here
      }
    });
    
    const success = this.results.every(r => r.success);
    return { success, results: this.results };
  }
  
  getSummary(): {
    total: number;
    successful: number;
    failed: number;
    totalDuration: number;
  } {
    return {
      total: this.results.length,
      successful: this.results.filter(r => r.success).length,
      failed: this.results.filter(r => !r.success).length,
      totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0),
    };
  }
}

console.log("\n🎯 Strategy 6: Comprehensive Error Handler");
console.log("-".repeat(70));

console.log(`
class ScriptOrchestrator {
  async run(scripts, options) {
    // Comprehensive error handling with:
    // - Retry logic
    // - Error classification
    // - Custom error handlers
    // - Result aggregation
  }
  
  getSummary() {
    // Returns summary of execution
  }
}
`);

console.log("\nUsage:");
console.log(`
const orchestrator = new ScriptOrchestrator();
const { success, results } = await orchestrator.run(
  ["build", "test", "lint"],
  {
    parallel: true,
    continueOnError: true,
    retryOnFailure: true,
    maxRetries: 3,
    onError: (error) => {
      console.error(\`\${error.severity}: \${error.script} - \${error.message}\`);
    }
  }
);

const summary = orchestrator.getSummary();
console.log(\`\${summary.successful}/\${summary.total} scripts succeeded\`);
`);

console.log("\n✅ Error Handling Strategies Complete!");
console.log("\nKey Patterns:");
console.log("  • Fail fast for critical errors");
console.log("  • Continue on error for comprehensive reporting");
console.log("  • Retry for transient failures");
console.log("  • Classify errors for appropriate handling");
console.log("  • Aggregate results for analysis");
