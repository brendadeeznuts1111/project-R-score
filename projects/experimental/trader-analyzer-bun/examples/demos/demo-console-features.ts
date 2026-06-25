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
 * // 2. Use console.info() with default depth
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
 *   console.info(`You entered: ${line}`);
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
  console.info("\n📊 Console Depth Demonstration");
  console.info("─".repeat(60));
  
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
  
  console.info("Default depth (2):");
  console.info(nested);
  
  console.info("\nNote: Use --console-depth <number> to change depth");
  console.info("Example: bun --console-depth 4 scripts/demo-console-features.ts");
  console.info("\nOr set in bunfig.toml:");
  console.info("  [console]");
  console.info("  depth = 4");
}

// ============================================================================
// INTERACTIVE CONSOLE INPUT (AsyncIterable)
// ============================================================================

async function interactiveCalculator() {
  console.info("\n🧮 Interactive Calculator");
  console.info("─".repeat(60));
  console.info("Type numbers to add them together.");
  console.info("Type 'quit' or 'exit' to stop.");
  console.info("Type 'depth' to see current console depth.\n");
  
  let count = 0;
  console.write(`Count: ${count}\n> `);
  
  // Use console as AsyncIterable to read from stdin
  for await (const line of console) {
    const trimmed = line.trim();
    
    if (trimmed === 'quit' || trimmed === 'exit') {
      console.info(`\nFinal count: ${count}`);
      console.info("Goodbye! 👋");
      break;
    }
    
    if (trimmed === 'depth') {
      // Note: console.depth is not directly accessible, but we can show the concept
      console.info("Console depth is controlled by:");
      console.info("  - CLI flag: --console-depth <number>");
      console.info("  - bunfig.toml: [console] depth = <number>");
      console.info("  - Default: 2 levels");
      console.write(`Count: ${count}\n> `);
      continue;
    }
    
    const num = Number(trimmed);
    if (isNaN(num)) {
      console.info(`Invalid number: "${trimmed}"`);
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
  console.info("\n🏷️  Interactive Tag Scanner");
  console.info("─".repeat(60));
  console.info("Enter file patterns to scan (glob patterns).");
  console.info("Type 'quit' to exit.\n");
  
  const scanned: string[] = [];
  
  console.write("Pattern> ");
  
  for await (const line of console) {
    const pattern = line.trim();
    
    if (pattern === 'quit' || pattern === 'exit') {
      console.info(`\nScanned ${scanned.length} patterns:`);
      for (const p of scanned) {
        console.info(`  - ${p}`);
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
      
      console.info(`Found ${files.length} files matching "${pattern}"`);
      if (files.length > 0 && files.length <= 10) {
        for (const file of files) {
          console.info(`  - ${file}`);
        }
      } else if (files.length > 10) {
        console.info(`  (showing first 10 of ${files.length})`);
        for (const file of files.slice(0, 10)) {
          console.info(`  - ${file}`);
        }
      }
    } catch (error) {
      console.info(`Error: ${(error as Error).message}`);
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
      console.info("Usage:");
      console.info("  bun run scripts/demo-console-features.ts [command]");
      console.info("\nCommands:");
      console.info("  depth  - Show console depth demonstration");
      console.info("  calc   - Interactive calculator");
      console.info("  scan   - Interactive tag scanner");
      console.info("  all    - Run all demos");
      console.info("\nExamples:");
      console.info("  bun --console-depth 4 run scripts/demo-console-features.ts depth");
      console.info("  bun run scripts/demo-console-features.ts calc");
      console.info("  bun run scripts/demo-console-features.ts scan");
  }
}

if (import.meta.main) {
  await main();
}
