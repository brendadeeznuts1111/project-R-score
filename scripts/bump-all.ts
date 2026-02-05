#!/usr/bin/env bun
/**
 * @fileoverview Bump all workspace packages version
 * @module scripts/bump-all
 * 
 * @description
 * Bumps the version of all packages in the workspace (including root).
 * Uses semantic versioning (patch, minor, major).
 * 
 * @example
 * ```bash
 * bun run bump:all patch
 * bun run bump:all minor  
 * bun run bump:all major
 * ```
 * 
 * @see {@link https://npm.factory-wager.com} FactoryWager NPM Registry
 * @see {@link https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com/factory-wager-registry} R2 Storage
 */

import { Glob } from "bun";

/** Registry URL for FactoryWager packages */
const REGISTRY_URL = process.env.REGISTRY_URL || "https://npm.factory-wager.com";

/** R2 bucket URL for package storage */
const R2_BUCKET_URL = process.env.R2_BUCKET_URL || 
  "https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com/factory-wager-registry";

/** Version bump type */
type BumpType = "patch" | "minor" | "major";

/**
 * Bump version according to semver
 * @param current - Current version string
 * @param type - Bump type
 * @returns New version string
 */
function bumpVersion(current: string, type: BumpType): string {
  const [major, minor, patch] = current.split(".").map(Number);
  
  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

/**
 * Main bump function
 */
async function main(): Promise<void> {
  const type = process.argv[2] as BumpType;

  if (!type || !["patch", "minor", "major"].includes(type)) {
    console.error("❌ Usage: bun run bump:all <patch|minor|major>");
    console.error("\n📚 Documentation:");
    console.error("   Registry: https://npm.factory-wager.com");
    console.error("   R2 Store: https://7a470541a704caaf91e71efccc78fd36.r2.cloudflarestorage.com/factory-wager-registry");
    process.exit(1);
  }

  console.log(`📦 Bumping all workspace packages: ${type}\n`);
  console.log(`   Registry: ${REGISTRY_URL}`);
  console.log(`   R2 Store: ${R2_BUCKET_URL}\n`);

  const glob = new Glob("*/package.json");
  const packages = [...glob.scanSync({ cwd: "." }), "package.json"];

  let bumpedCount = 0;

  for (const pkgPath of packages) {
    try {
      const pkg = await Bun.file(pkgPath).json();
      if (!pkg.name) continue;

      const currentVersion = pkg.version || "0.0.0";
      const newVersion = bumpVersion(currentVersion, type);

      pkg.version = newVersion;
      await Bun.write(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
      console.log(`  ✓ ${pkg.name}: ${currentVersion} → ${newVersion}`);
      bumpedCount++;
    } catch (error) {
      console.error(`  ✗ ${pkgPath}: ${error}`);
    }
  }

  console.log(`\n✅ Bumped ${bumpedCount} packages`);
  console.log(`\n🚀 Next steps:`);
  console.log(`   1. Review changes: git diff`);
  console.log(`   2. Publish: bun run pack:all`);
  console.log(`   3. Deploy: bun run registry:publish`);
}

await main();
