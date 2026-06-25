#!/usr/bin/env bun

// Enhanced CLI tool with argument parsing
import { parseArgs } from "util";
import { colourKit, pad, rgbaLattice } from "./quantum-toolkit-patch.ts";

// Parse command line arguments
const { values, positionals } = parseArgs({
  args: Bun.argv,
  options: {
    help: {
      type: "boolean",
      short: "h",
    },
    version: {
      type: "boolean",
      short: "v",
    },
    count: {
      type: "string",
      short: "c",
    },
    color: {
      type: "boolean",
      short: "C",
    },
    lattice: {
      type: "string",
      short: "l",
    },
    verbose: {
      type: "boolean",
      short: "V",
    },
    demo: {
      type: "boolean",
      short: "d",
    },
    benchmark: {
      type: "boolean",
      short: "b",
    },
    format: {
      type: "string",
      short: "f",
    },
    output: {
      type: "string",
      short: "o",
    },
    limit: {
      type: "string",
      short: "L",
    },
    json: {
      type: "boolean",
      short: "j",
    },
  },
  strict: true,
  allowPositionals: true,
});

// CLI version and help
const VERSION = "1.0.0";
const APP_NAME = "Quantum CLI";

function showHelp() {
  console.info(colourKit(0.7).ansi + `${APP_NAME} v${VERSION}` + "\x1b[0m");
  console.info("Enhanced CLI with quantum toolkit integration\n");
  console.info("Usage: bun run cli.ts [options] [positionals]\n");
  console.info("Options:");
  console.info("  -h, --help      Show this help message");
  console.info("  -v, --version   Show version information");
  console.info("  -c, --count     Count iterations (default: 10)");
  console.info("  -C, --color     Enable color output");
  console.info("  -l, --lattice   Generate lattice with tension 0-1");
  console.info("  -V, --verbose   Verbose output");
  console.info("  -d, --demo      Run demo mode");
  console.info("  -b, --benchmark Run performance benchmark");
  console.info("  -f, --format    Output format (text|json|table)");
  console.info("  -o, --output    Output file path");
  console.info("  -L, --limit     Limit results (e.g., 1000)");
  console.info("  -j, --json      Output JSON format (shorthand)");
  console.info("\nExamples:");
  console.info("  bun run cli.ts --help");
  console.info("  bun run cli.ts --count 100 --color");
  console.info("  bun run cli.ts --lattice 0.5 --verbose");
  console.info("  bun run cli.ts --demo --benchmark");
}

function showVersion() {
  console.info(`${APP_NAME} version ${VERSION}`);
  console.info("Built with Bun runtime and quantum toolkit");
}

// Demo function
function runDemo(count: number, useColor: boolean) {
  console.info(`\n🎮 Running demo with ${count} iterations...`);

  const start = performance.now();
  const results = [];

  for (let i = 0; i < count; i++) {
    const value = Math.random() * 100;
    results.push(value);

    if (values.verbose) {
      const color = useColor ? colourKit(value / 100).ansi : "";
      process.stdout.write(
        `\rIteration ${pad((i + 1).toString(), 4)}: ${color}${value.toFixed(
          2
        )}\x1b[0m`
      );
    }
  }

  const duration = performance.now() - start;
  const avg = results.reduce((a, b) => a + b, 0) / results.length;

  console.info(`\n✅ Completed in ${duration.toFixed(2)}ms`);
  console.info(`📊 Average: ${avg.toFixed(2)}`);
  console.info(
    `📈 Min: ${Math.min(...results).toFixed(2)}, Max: ${Math.max(
      ...results
    ).toFixed(2)}`
  );
}

// Lattice generator
function generateLattice(tension: string) {
  const t = parseFloat(tension);
  if (isNaN(t) || t < 0 || t > 1) {
    console.info("❌ Tension must be a number between 0 and 1");
    return;
  }

  console.info(`\n🎨 Generating lattice with tension ${t}...`);
  console.info(rgbaLattice(t * 10));
}

// Benchmark
async function runBenchmark() {
  console.info("\n⚡ Running performance benchmark...");

  const limit = parseInt(values.limit || "100");
  const useJson = values.json || values.format === "json";

  const tests = [
    {
      name: "Array operations",
      fn: () =>
        Array(1000)
          .fill(0)
          .map((_, i) => i * 2),
    },
    {
      name: "String operations",
      fn: () => "hello".repeat(1000).split("").reverse().join(""),
    },
    { name: "Math operations", fn: () => Math.random() * 1000 * Math.PI },
  ];

  const results: Record<string, unknown>[] = [];

  for (const test of tests) {
    const times = [];

    for (let i = 0; i < limit; i++) {
      const start = performance.now();
      test.fn();
      times.push(performance.now() - start);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const max = Math.max(...times);
    const min = Math.min(...times);

    results.push({
      test: test.name,
      iterations: limit,
      avgMs: parseFloat(avg.toFixed(3)),
      maxMs: parseFloat(max.toFixed(3)),
      minMs: parseFloat(min.toFixed(3)),
    });

    if (!useJson) {
      console.info(
        `│ ${pad(test.name, 15)} │ ${pad(limit.toString(), 10)} │ ${pad(
          avg.toFixed(3),
          8
        )} │ ${pad(max.toFixed(3), 8)} │`
      );
    }
  }

  if (useJson) {
    const output = {
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      limit,
      results,
    };

    if (values.output) {
      await Bun.write(values.output, JSON.stringify(output, null, 2));
      console.info(`\n📁 Results written to: ${values.output}`);
    } else {
      console.info(JSON.stringify(output, null, 2));
    }
  } else {
    console.info("└─────────────────┴──────────┴──────────┴──────────┘");
  }
}

// Main execution
async function main() {
  // Handle basic flags
  if (values.help) {
    showHelp();
    return;
  }

  if (values.version) {
    showVersion();
    return;
  }

  // Show parsed arguments if verbose
  if (values.verbose) {
    console.info(colourKit(0.5).ansi + "📋 Parsed arguments:" + "\x1b[0m");
    console.info("Values:", JSON.stringify(values, null, 2));
    console.info("Positionals:", positionals);
    console.info("Bun.argv:", Bun.argv);
    console.info("");
  }

  // Execute based on flags
  const count = parseInt(values.count || "10");

  if (values.demo) {
    runDemo(count, values.color);
  }

  if (values.lattice) {
    generateLattice(values.lattice);
  }

  if (values.benchmark) {
    await runBenchmark();
  }

  // Default behavior if no flags
  if (Object.keys(values).length === 0 && positionals.length <= 2) {
    console.info(`${APP_NAME} v${VERSION} - Use --help for usage information`);
    console.info("Try: bun run cli.ts --demo --color");
  }
}

// Run main function
main().catch(console.error);
