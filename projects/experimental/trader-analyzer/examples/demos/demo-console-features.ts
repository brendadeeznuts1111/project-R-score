#!/usr/bin/env bun
/**
 * @fileoverview Demo: Bun Console Features
 * @description Demonstrates Bun-specific console features including depth configuration and reading from stdin using console as AsyncIterable for interactive input.
 * @module examples/demos/demo-console-features
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@6.2.3.0.0.0.0;instance-id=EXAMPLE-CONSOLE-FEATURES-001;version=6.2.3.0.0.0.0}]
 * [PROPERTIES:{example={value:"Console Features Demo";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-DEMO"];@version:"6.2.3.0.0.0.0"}}]
 * [CLASS:ConsoleFeaturesDemo][#REF:v-6.2.3.0.0.0.0.BP.EXAMPLES.DEMO.1.0.A.1.1.EXAMPLE.1.1]]
 * 
 * Version: 6.2.3.0.0.0.0
 * Ripgrep Pattern: 6\.2\.3\.0\.0\.0\.0|EXAMPLE-CONSOLE-FEATURES-001|BP-EXAMPLE@6\.2\.3\.0\.0\.0\.0
 * 
 * Features:
 * - Console depth configuration (--console-depth flag)
 * - Reading from stdin using console as AsyncIterable
 * - Interactive console input
 * 
 * @example 6.2.3.0.0.0.0.1: Console Depth Configuration
 * // Test Formula:
 * // 1. Create nested object structure
 * // 2. Use console.log() with default depth
 * // 3. Run with --console-depth flag to change depth
 * // Expected Result: Console output respects depth configuration
 * //
 * // Snippet:
 * ```bash
 * bun --console-depth 4 scripts/demo-console-features.ts
 * ```
 * 
 * @example 6.2.3.0.0.0.0.2: Interactive Console Input
 * // Test Formula:
 * // 1. Use console as AsyncIterable
 * // 2. Read lines from stdin
 * // 3. Process input interactively
 * // Expected Result: Interactive console input works correctly
 * //
 * // Snippet:
 * ```typescript
 * for await (const line of console) {
 *   console.log(`You entered: ${line}`);
 * }
 * ```
 * 
 * // Ripgrep: 6.2.3.0.0.0.0
 * // Ripgrep: EXAMPLE-CONSOLE-FEATURES-001
 * // Ripgrep: BP-EXAMPLE@6.2.3.0.0.0.0
 */

// ============================================================================
// CONSOLE DEPTH DEMONSTRATION
// ============================================================================

function demonstrateConsoleDepth() {
  console.log("\n📊 Console Depth Demonstration");
  console.log("─".repeat(60));
  
  const nested = {
    level1: {
      level2: {
        level3: {
          level4: {
            level5: {
              deep: "This is very deep!"
            }
          }
        }
      }
    }
  };
  
  console.log("Default depth (2):");
  console.log(nested);
  
  console.log("\nNote: Use --console-depth <number> to change depth");
  console.log("Example: bun --console-depth 4 scripts/demo-console-features.ts");
  console.log("\nOr set in bunfig.toml:");
  console.log("  [console]");
  console.log("  depth = 4");
}

// ============================================================================
// INTERACTIVE CONSOLE INPUT (AsyncIterable)
// ============================================================================

async function interactiveCalculator() {
  console.log("\n🧮 Interactive Calculator");
  console.log("─".repeat(60));
  console.log("Type numbers to add them together.");
  console.log("Type 'quit' or 'exit' to stop.");
  console.log("Type 'depth' to see current console depth.\n");
  
  let count = 0;
  console.write(`Count: ${count}\n> `);
  
  // Use console as AsyncIterable to read from stdin
  for await (const line of console) {
    const trimmed = line.trim();
    
    if (trimmed === 'quit' || trimmed === 'exit') {
      console.log(`\nFinal count: ${count}`);
      console.log("Goodbye! 👋");
      break;
    }
    
    if (trimmed === 'depth') {
      // Note: console.depth is not directly accessible, but we can show the concept
      console.log("Console depth is controlled by:");
      console.log("  - CLI flag: --console-depth <number>");
      console.log("  - bunfig.toml: [console] depth = <number>");
      console.log("  - Default: 2 levels");
      console.write(`Count: ${count}\n> `);
      continue;
    }
    
    const num = Number(trimmed);
    if (isNaN(num)) {
      console.log(`Invalid number: "${trimmed}"`);
      console.write(`Count: ${count}\n> `);
      continue;
    }
    
    count += num;
    console.write(`Count: ${count}\n> `);
  }
}

// ============================================================================
// FILE TAG SCANNER (Interactive)
// ============================================================================

async function interactiveTagScanner() {
  console.log("\n🏷️  Interactive Tag Scanner");
  console.log("─".repeat(60));
  console.log("Enter file patterns to scan (glob patterns).");
  console.log("Type 'quit' to exit.\n");
  
  const scanned: string[] = [];
  
  console.write("Pattern> ");
  
  for await (const line of console) {
    const pattern = line.trim();
    
    if (pattern === 'quit' || pattern === 'exit') {
      console.log(`\nScanned ${scanned.length} patterns:`);
      for (const p of scanned) {
        console.log(`  - ${p}`);
      }
      break;
    }
    
    if (!pattern) {
      console.write("Pattern> ");
      continue;
    }
    
    try {
      const glob = new Bun.Glob(pattern);
      const files = Array.from(glob.scanSync());
      scanned.push(pattern);
      
      console.log(`Found ${files.length} files matching "${pattern}"`);
      if (files.length > 0 && files.length <= 10) {
        for (const file of files) {
          console.log(`  - ${file}`);
        }
      } else if (files.length > 10) {
        console.log(`  (showing first 10 of ${files.length})`);
        for (const file of files.slice(0, 10)) {
          console.log(`  - ${file}`);
        }
      }
    } catch (error) {
      console.log(`Error: ${(error as Error).message}`);
    }
    
    console.write("Pattern> ");
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = Bun.argv.slice(2);
  const command = args[0] || 'depth';
  
  switch (command) {
    case 'depth':
      demonstrateConsoleDepth();
      break;
      
    case 'calc':
      await interactiveCalculator();
      break;
      
    case 'scan':
      await interactiveTagScanner();
      break;
      
    case 'all':
      demonstrateConsoleDepth();
      await Bun.sleep(1000);
      await interactiveCalculator();
      break;
      
    default:
      console.log("Usage:");
      console.log("  bun run scripts/demo-console-features.ts [command]");
      console.log("\nCommands:");
      console.log("  depth  - Show console depth demonstration");
      console.log("  calc   - Interactive calculator");
      console.log("  scan   - Interactive tag scanner");
      console.log("  all    - Run all demos");
      console.log("\nExamples:");
      console.log("  bun --console-depth 4 run scripts/demo-console-features.ts depth");
      console.log("  bun run scripts/demo-console-features.ts calc");
      console.log("  bun run scripts/demo-console-features.ts scan");
  }
}

if (import.meta.main) {
  await main();
}
