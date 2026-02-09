#!/usr/bin/env bun
/**
 * Demo: ESM bytecode in --compile
 * 
 * Demonstrates ESM bytecode compilation support
 */

import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";

console.log("📦 Bun v1.3.9: ESM Bytecode Compilation\n");
console.log("=".repeat(70));

console.log("\n📝 New Feature: ESM Bytecode Support");
console.log("  • Previously: --bytecode was CJS-only");
console.log("  • Now: ESM bytecode fully supported");
console.log("  • Default: Still CommonJS (may change in future)");

console.log("\n🔍 Usage Examples:");
console.log("-".repeat(70));

console.log("\n1. ESM bytecode (NEW):");
console.log("   bun build --compile --bytecode --format=esm ./cli.ts");

console.log("\n2. CJS bytecode (existing):");
console.log("   bun build --compile --bytecode --format=cjs ./cli.ts");

console.log("\n3. Default (CJS, for now):");
console.log("   bun build --compile --bytecode ./cli.ts");
console.log("   Note: May default to ESM in future versions");

console.log("\n💡 Creating example ESM module...");
console.log("-".repeat(70));

const demoDir = import.meta.dir;
const exampleFile = join(demoDir, "example-esm.ts");

const exampleCode = `#!/usr/bin/env bun
// Example ESM module for bytecode compilation

export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

export const version = "1.0.0";

if (import.meta.main) {
  console.log(greet("Bun v1.3.9"));
  console.log(\`Version: \${version}\`);
}
`;

writeFileSync(exampleFile, exampleCode);
console.log("✅ Created example-esm.ts");

console.log("\n📝 Compilation Commands:");
console.log("-".repeat(70));

console.log("\nTo compile as ESM bytecode:");
console.log(`  bun build --compile --bytecode --format=esm ${exampleFile}`);

console.log("\nTo compile as CJS bytecode:");
console.log(`  bun build --compile --bytecode --format=cjs ${exampleFile}`);

console.log("\n💡 Benefits:");
console.log("  • Faster startup time");
console.log("  • Smaller file size");
console.log("  • Source code protection");
console.log("  • Now supports ESM modules!");

console.log("\n✅ Demo complete!");
console.log("\nKey Features:");
console.log("  • ESM bytecode compilation supported");
console.log("  • Use --format=esm for ESM output");
console.log("  • Default may change to ESM in future");

// Cleanup
try {
  if (existsSync(exampleFile)) {
    unlinkSync(exampleFile);
  }
} catch {}
