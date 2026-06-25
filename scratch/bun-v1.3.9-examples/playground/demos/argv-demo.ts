#!/usr/bin/env bun
/**
 * Demo: Command-Line Arguments (argv)
 * 
 * https://bun.com/docs/guides/process/argv
 */

console.info("📋 Bun Command-Line Arguments Demo\n");
console.info("=".repeat(70));

// Bun.argv contains the full command-line
console.info("\n1️⃣ Bun.argv - Full argument array");
console.info("-".repeat(70));
console.info("Bun.argv:", Bun.argv);
console.info("\nBreakdown:");
console.info("  [0] Bun executable:", Bun.argv[0]);
console.info("  [1] Script path:", Bun.argv[1]);
console.info("  [2+] Arguments:", Bun.argv.slice(2));

// Process-specific arguments
console.info("\n2️⃣ process.argv (Node.js compatible)");
console.info("-".repeat(70));
console.info("process.argv:", process.argv);

// Parse arguments
console.info("\n3️⃣ Parsing arguments");
console.info("-".repeat(70));
const args = Bun.argv.slice(2);
console.info("Raw arguments:", args);

// Parse flags
const flags = args.filter(arg => arg.startsWith('--'));
const values = args.filter(arg => !arg.startsWith('--'));

console.info("Flags:", flags);
console.info("Values:", values);

// Parse key=value pairs
const parsed: Record<string, string> = {};
for (const arg of args) {
  if (arg.includes('=')) {
    const [key, value] = arg.split('=');
    parsed[key.replace(/^--/, '')] = value;
  }
}

console.info("Parsed key=value pairs:", parsed);

// Example usage patterns
console.info("\n4️⃣ Common patterns");
console.info("-".repeat(70));
console.info(`// Get first argument
const name = Bun.argv[2] || "World";

// Check for flags
const verbose = Bun.argv.includes('--verbose');

// Parse port number
const port = parseInt(Bun.argv.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000');

// Bun.parseArgs() (experimental)
const { values: parsedArgs } = Bun.parseArgs({
  args: Bun.argv.slice(2),
  options: {
    port: { type: 'string', default: '3000' },
    verbose: { type: 'boolean', default: false },
  },
  strict: true,
  allowPositionals: true,
});
`);

// Demo parseArgs
console.info("\n5️⃣ Using Bun.parseArgs()");
console.info("-".repeat(70));
try {
  const { values, positionals } = Bun.parseArgs({
    args: args,
    options: {
      port: { type: 'string', default: '3000' },
      verbose: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
    strict: true,
    allowPositionals: true,
  });
  
  console.info("Parsed values:", values);
  console.info("Positional arguments:", positionals);
} catch (e) {
  console.info("(parseArgs failed - likely unknown flags in demo)");
}

console.info("\n✅ argv demo complete!");
console.info("\n💡 Try running with arguments:");
console.info("   bun run argv-demo.ts --port=8080 --verbose hello world");
