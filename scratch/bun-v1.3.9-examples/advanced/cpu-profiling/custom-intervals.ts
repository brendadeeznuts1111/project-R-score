#!/usr/bin/env bun
/**
 * Custom CPU Profiling Intervals
 * 
 * Demonstrates interval selection strategies, performance impact analysis,
 * memory considerations, best practices by use case, and result interpretation.
 */

import { spawn } from "bun";
import { performance } from "perf_hooks";

console.log("📊 Custom CPU Profiling Intervals\n");
console.log("=".repeat(70));

// ============================================================================
// Interval Selection Strategies
// ============================================================================

interface ProfilingConfig {
  interval: number; // microseconds
  duration: number; // seconds
  description: string;
  useCase: string;
}

const profilingConfigs: ProfilingConfig[] = [
  {
    interval: 100, // 0.1ms
    duration: 10,
    description: "Very high resolution",
    useCase: "Micro-benchmarks, hot path analysis",
  },
  {
    interval: 500, // 0.5ms
    duration: 30,
    description: "High resolution",
    useCase: "Performance debugging, optimization",
  },
  {
    interval: 1000, // 1ms (default)
    duration: 60,
    description: "Standard resolution",
    useCase: "General profiling, production analysis",
  },
  {
    interval: 5000, // 5ms
    duration: 300,
    description: "Low resolution",
    useCase: "Long-running processes, memory profiling",
  },
  {
    interval: 10000, // 10ms
    duration: 600,
    description: "Very low resolution",
    useCase: "Background processes, system monitoring",
  },
];

console.log("\n⏱️  Interval Selection Strategies");
console.log("-".repeat(70));

profilingConfigs.forEach(config => {
  console.log(`\n${config.description} (${config.interval}μs):`);
  console.log(`  Use Case: ${config.useCase}`);
  console.log(`  Command: bun --cpu-prof --cpu-prof-interval ${config.interval} script.js`);
  console.log(`  Duration: ${config.duration}s`);
});

// ============================================================================
// Performance Impact Analysis
// ============================================================================

console.log("\n⚡ Performance Impact Analysis");
console.log("-".repeat(70));

console.log(`
CPU profiling overhead depends on interval:

• 100μs (0.1ms):   ~5-10% overhead, very detailed
• 500μs (0.5ms):   ~2-5% overhead, detailed
• 1000μs (1ms):    ~1-2% overhead, standard (default)
• 5000μs (5ms):    ~0.5% overhead, low detail
• 10000μs (10ms):  ~0.1% overhead, minimal detail

Trade-offs:
  Lower interval = More overhead + More detail
  Higher interval = Less overhead + Less detail
`);

// ============================================================================
// Memory Considerations
// ============================================================================

console.log("\n💾 Memory Considerations");
console.log("-".repeat(70));

console.log(`
CPU profiling memory usage:

• Profile size ≈ (duration / interval) × sample_size
• Sample size ≈ 100-200 bytes per sample
• Example: 60s at 1000μs = ~60,000 samples ≈ 6-12 MB

Memory impact:
  • Lower interval = More samples = More memory
  • Profile files can be large for long-running processes
  • Consider disk space for profile storage
`);

// ============================================================================
// Best Practices by Use Case
// ============================================================================

console.log("\n📚 Best Practices by Use Case");
console.log("-".repeat(70));

interface UseCaseGuide {
  scenario: string;
  interval: number;
  duration: number;
  reasoning: string;
  command: string;
}

const useCaseGuides: UseCaseGuide[] = [
  {
    scenario: "Micro-benchmark optimization",
    interval: 100,
    duration: 5,
    reasoning: "Need maximum detail for hot paths",
    command: "bun --cpu-prof --cpu-prof-interval 100 benchmark.js",
  },
  {
    scenario: "Production performance issue",
    interval: 1000,
    duration: 60,
    reasoning: "Balance between detail and overhead",
    command: "bun --cpu-prof --cpu-prof-interval 1000 app.js",
  },
  {
    scenario: "Long-running background job",
    interval: 5000,
    duration: 300,
    reasoning: "Minimize overhead, capture trends",
    command: "bun --cpu-prof --cpu-prof-interval 5000 worker.js",
  },
  {
    scenario: "Startup performance",
    interval: 500,
    duration: 10,
    reasoning: "High detail for short duration",
    command: "bun --cpu-prof --cpu-prof-interval 500 --cpu-prof-duration 10 app.js",
  },
  {
    scenario: "Memory leak investigation",
    interval: 1000,
    duration: 600,
    reasoning: "Standard interval, long duration",
    command: "bun --cpu-prof --cpu-prof-interval 1000 --cpu-prof-duration 600 app.js",
  },
];

useCaseGuides.forEach(guide => {
  console.log(`\n${guide.scenario}:`);
  console.log(`  Interval: ${guide.interval}μs`);
  console.log(`  Duration: ${guide.duration}s`);
  console.log(`  Reasoning: ${guide.reasoning}`);
  console.log(`  Command: ${guide.command}`);
});

// ============================================================================
// Result Interpretation
// ============================================================================

console.log("\n📈 Result Interpretation");
console.log("-".repeat(70));

console.log(`
Analyzing CPU profiles:

1. Open profile in Chrome DevTools:
   chrome://inspect → Open dedicated DevTools → Performance → Load profile

2. Key metrics:
   • Self Time: Time spent in function itself
   • Total Time: Time including called functions
   • Call Count: Number of times function called

3. Common patterns:
   • High Self Time = Function is slow
   • High Total Time = Function or its calls are slow
   • High Call Count = Function called too frequently

4. Optimization targets:
   • Functions with high Self Time
   • Functions called many times
   • Functions in hot paths
`);

// ============================================================================
// Profiling Helper
// ============================================================================

class CPUProfilingHelper {
  /**
   * Generate profiling command
   */
  static generateCommand(
    script: string,
    options: {
      interval?: number;
      output?: string;
      duration?: number;
    } = {}
  ): string {
    const parts = ["bun", "--cpu-prof"];
    
    if (options.interval) {
      parts.push(`--cpu-prof-interval`, options.interval.toString());
    }
    
    if (options.output) {
      parts.push(`--cpu-prof-output`, options.output);
    }
    
    if (options.duration) {
      parts.push(`--cpu-prof-duration`, options.duration.toString());
    }
    
    parts.push(script);
    
    return parts.join(" ");
  }
  
  /**
   * Estimate profile size
   */
  static estimateProfileSize(durationSeconds: number, intervalMicroseconds: number): {
    samples: number;
    sizeMB: number;
  } {
    const samples = Math.floor((durationSeconds * 1_000_000) / intervalMicroseconds);
    const sizeMB = (samples * 150) / (1024 * 1024); // ~150 bytes per sample
    
    return {
      samples,
      sizeMB: Math.round(sizeMB * 100) / 100,
    };
  }
}

console.log("\n🛠️  Profiling Helper");
console.log("-".repeat(70));

console.log("\nGenerate command:");
const cmd = CPUProfilingHelper.generateCommand("app.js", {
  interval: 500,
  output: "profile.cpuprofile",
  duration: 60,
});
console.log(`  ${cmd}`);

console.log("\nEstimate profile size:");
const estimate = CPUProfilingHelper.estimateProfileSize(60, 1000);
console.log(`  Duration: 60s, Interval: 1000μs`);
console.log(`  Samples: ~${estimate.samples.toLocaleString()}`);
console.log(`  Size: ~${estimate.sizeMB} MB`);

console.log("\n✅ Custom Intervals Guide Complete!");
console.log("\nKey Takeaways:");
console.log("  • Lower interval = More detail + More overhead");
console.log("  • Higher interval = Less detail + Less overhead");
console.log("  • Choose interval based on use case");
console.log("  • Consider memory usage for long profiles");
console.log("  • Use Chrome DevTools to analyze profiles");
