#!/usr/bin/env bun
/**
 * Demo: ESM bytecode in --compile
 * 
 * Demonstrates ESM bytecode compilation support
 */

import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";

console.info("📦 Bun v1.3.9: ESM Bytecode Compilation\n");
console.info("=".repeat(70));

console.info("\n📝 New Feature: ESM Bytecode Support");
console.info("  • Previously: --bytecode was CJS-only");
console.info("  • Now: ESM bytecode fully supported");
console.info("  • Default: Still CommonJS (may change in future)");

console.info("\n🔍 Usage Examples:");
console.info("-".repeat(70));

console.info("\n1. ESM bytecode (NEW):");
console.info("   bun build --compile --bytecode --format=esm ./cli.ts");

console.info("\n2. CJS bytecode (existing):");
console.info("   bun build --compile --bytecode --format=cjs ./cli.ts");

console.info("\n3. Default (CJS, for now):");
console.info("   bun build --compile --bytecode ./cli.ts");
console.info("   Note: May default to ESM in future versions");

console.info("\n💡 Creating example ESM module...");
console.info("-".repeat(70));

const demoDir = import.meta.dir;
const exampleFile = join(demoDir, "example-esm.ts");

const exampleCode = `#!/usr/bin/env bun
// Example ESM module for bytecode compilation

export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

export const version = "1.0.0";

if (import.meta.main) {
  console.info(greet("Bun v1.3.9"));
  console.info(\`Version: \${version}\`);
}
`;

writeFileSync(exampleFile, exampleCode);
console.info("✅ Created example-esm.ts");

console.info("\n📝 Compilation Commands:");
console.info("-".repeat(70));

console.info("\nTo compile as ESM bytecode:");
console.info(`  bun build --compile --bytecode --format=esm ${exampleFile}`);

console.info("\nTo compile as CJS bytecode:");
console.info(`  bun build --compile --bytecode --format=cjs ${exampleFile}`);

console.info("\n💡 Benefits:");
console.info("  • Faster startup time");
console.info("  • Smaller file size");
console.info("  • Source code protection");
console.info("  • Now supports ESM modules!");

console.info("\n✅ Demo complete!");
console.info("\nKey Features:");
console.info("  • ESM bytecode compilation supported");
console.info("  • Use --format=esm for ESM output");
console.info("  • Default may change to ESM in future");

// Cleanup
try {
  if (existsSync(exampleFile)) {
    unlinkSync(exampleFile);
  }
} catch {}
