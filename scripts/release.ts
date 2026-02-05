#!/usr/bin/env bun
/**
 * Release workflow script
 * Usage: bun run release:minor|patch|major
 */
import { $ } from "bun";

const type = process.argv[2] as "patch" | "minor" | "major";

if (!type || !["patch", "minor", "major"].includes(type)) {
  console.error("❌ Usage: bun run release:<patch|minor|major>");
  process.exit(1);
}

console.log(`🚀 Starting ${type} release workflow...\n`);

const steps = [
  { name: "Lint check", cmd: "bun run lint" },
  { name: "Type check", cmd: "bun run type-check" },
  { name: "Run tests", cmd: "bun test" },
  { name: "Bump version", cmd: `bun pm version ${type}` },
  { name: "Generate changelog", cmd: "bun run changelog" },
  { name: "Build packages", cmd: "bun run build" },
];

for (const step of steps) {
  console.log(`📋 ${step.name}...`);
  try {
    await $`${{ raw: step.cmd }}`;
    console.log(`   ✓ ${step.name} complete\n`);
  } catch (error) {
    console.error(`   ✗ ${step.name} failed`);
    process.exit(1);
  }
}

// Get new version
const pkg = await Bun.file("package.json").json();
const version = pkg.version;

console.log(`\n✅ Release ${version} ready!`);
console.log("\nNext steps:");
console.log(`  1. Review the changes: git diff HEAD~1`);
console.log(`  2. Commit: git add -A && git commit -m "chore: release v${version}"`);
console.log(`  3. Tag: git tag -a v${version} -m "Release v${version}"`);
console.log(`  4. Push: git push && git push --tags`);
console.log(`  5. Publish: bun run pack:all && npm publish dist/packs/*.tgz`);
