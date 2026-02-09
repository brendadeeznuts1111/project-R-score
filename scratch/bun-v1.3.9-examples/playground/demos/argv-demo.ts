#!/usr/bin/env bun
/**
 * Demo: Command-Line Arguments (argv)
 * 
 * https://bun.com/docs/guides/process/argv
 */

console.log("📋 Bun Command-Line Arguments Demo\n");
console.log("=".repeat(70));

// Bun.argv contains the full command-line
console.log("\n1️⃣ Bun.argv - Full argument array");
console.log("-".repeat(70));
console.log("Bun.argv:", Bun.argv);
console.log("\nBreakdown:");
console.log("  [0] Bun executable:", Bun.argv[0]);
console.log("  [1] Script path:", Bun.argv[1]);
console.log("  [2+] Arguments:", Bun.argv.slice(2));

// Process-specific arguments
console.log("\n2️⃣ process.argv (Node.js compatible)");
console.log("-".repeat(70));
console.log("process.argv:", process.argv);

// Parse arguments
console.log("\n3️⃣ Parsing arguments");
console.log("-".repeat(70));
const args = Bun.argv.slice(2);
console.log("Raw arguments:", args);

// Parse flags
const flags = args.filter(arg => arg.startsWith('--'));
const values = args.filter(arg => !arg.startsWith('--'));

console.log("Flags:", flags);
console.log("Values:", values);

// Parse key=value pairs
const parsed: Record<string, string> = {};
for (const arg of args) {
  if (arg.includes('=')) {
    const [key, value] = arg.split('=');
    parsed[key.replace(/^--/, '')] = value;
  }
}

console.log("Parsed key=value pairs:", parsed);

// Example usage patterns
console.log("\n4️⃣ Common patterns");
console.log("-".repeat(70));
console.log(`// Get first argument
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
console.log("\n5️⃣ Using Bun.parseArgs()");
console.log("-".repeat(70));
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
  
  console.log("Parsed values:", values);
  console.log("Positional arguments:", positionals);
} catch (e) {
  console.log("(parseArgs failed - likely unknown flags in demo)");
}

console.log("\n✅ argv demo complete!");
console.log("\n💡 Try running with arguments:");
console.log("   bun run argv-demo.ts --port=8080 --verbose hello world");
