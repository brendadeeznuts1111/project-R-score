#!/usr/bin/env bun
/**
 * Bump all workspace packages version
 * Usage: bun run bump:all <patch|minor|major>
 */
import { Glob } from "bun";

const type = process.argv[2] as "patch" | "minor" | "major";

if (!type || !["patch", "minor", "major"].includes(type)) {
  console.error("❌ Usage: bun run bump:all <patch|minor|major>");
  process.exit(1);
}

console.log(`📦 Bumping all workspace packages: ${type}\n`);

const glob = new Glob("*/package.json");
const packages = [...glob.scanSync({ cwd: "." }), "package.json"];

let bumpedCount = 0;

for (const pkgPath of packages) {
  try {
    const pkg = await Bun.file(pkgPath).json();
    if (!pkg.name) continue;

    const currentVersion = pkg.version || "0.0.0";
    const [major, minor, patch] = currentVersion.split(".").map(Number);

    let newVersion: string;
    switch (type) {
      case "major":
        newVersion = `${major + 1}.0.0`;
        break;
      case "minor":
        newVersion = `${major}.${minor + 1}.0`;
        break;
      case "patch":
      default:
        newVersion = `${major}.${minor}.${patch + 1}`;
        break;
    }

    pkg.version = newVersion;
    await Bun.write(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    console.log(`  ✓ ${pkg.name}: ${currentVersion} → ${newVersion}`);
    bumpedCount++;
  } catch (error) {
    console.error(`  ✗ ${pkgPath}: ${error}`);
  }
}

console.log(`\n✅ Bumped ${bumpedCount} packages`);
