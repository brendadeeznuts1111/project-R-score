#!/usr/bin/env bun

// [SEMVER][BUN][FULL][SEMVER-BUN-001][v3.0.0][ACTIVE]

// [UTILITIES][TOOLS][UT-TO-3AE][v3.0.0][ACTIVE]

import semver from "semver";

const cmd = process.argv[2];
const version = process.argv[3] || "0.0.0";
const level = process.argv[4] || "patch";

async function main() {
  try {
    const pkg = JSON.parse(await Bun.file("package.json").text());

    switch (cmd) {
      case "inc":
        const newVer = semver.inc(pkg.version, level);
        if (!newVer) throw new Error(`❌ Invalid increment level: ${level}`);

        pkg.version = newVer;

        await Bun.write("package.json", JSON.stringify(pkg, null, 2));

        // Git commit and tag
        await $`git add package.json && git commit -m "v${newVer}" && git tag v${newVer}`;

        // Build EXE with new version
        try {
          await $`bun build:exe`;
          console.log(`✅ v${newVer} → EXE + Tagged + Committed`);
        } catch (buildError) {
          console.log(`✅ v${newVer} → Tagged + Committed (EXE build skipped: ${buildError.message})`);
        }
        break;

      case "validate":
        if (!semver.valid(version)) {
          throw new Error(`❌ Invalid semver: ${version}`);
        }
        console.log(`✅ Valid semver: ${version}`);
        break;

      case "compare":
        const otherVersion = process.argv[4] || pkg.version;
        const cmp = semver.compare(version, otherVersion);
        const symbol = cmp > 0 ? ">" : cmp < 0 ? "<" : "=";
        console.log(`Compare: ${version} ${symbol} ${otherVersion} (${cmp})`);
        break;

      case "prerelease":
        const preId = level || "beta";
        const current = pkg.version;

        // Remove any existing prerelease
        const cleanVersion = current.split('-')[0];
        const preVersion = `${cleanVersion}-${preId}.1`;

        if (!semver.valid(preVersion)) {
          throw new Error(`❌ Invalid prerelease version: ${preVersion}`);
        }

        pkg.version = preVersion;
        await Bun.write("package.json", JSON.stringify(pkg, null, 2));

        console.log(`✅ Prerelease: ${current} → ${preVersion}`);
        break;

      case "vault":
        console.log(`🔄 Bumping ALL vault versions to next ${level}...`);

        // Find all files with version tags
        const files = await Bun.glob(["**/*.ts", "**/*.md", "rules/**/*.yaml"], {
          cwd: ".",
          ignore: ["node_modules/**", ".git/**"]
        });

        let bumpedCount = 0;

        for (const filePath of files) {
          try {
            const content = await Bun.file(filePath).text();

            // Match version patterns like [v1.2.3] or [v2.9.0]
            const versionRegex = /\[v(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?)\]/g;
            let newContent = content;
            let hasChanges = false;

            newContent = newContent.replace(versionRegex, (match, ver) => {
              const newVer = semver.inc(ver, level);
              if (newVer && newVer !== ver) {
                hasChanges = true;
                return `[v${newVer}]`;
              }
              return match;
            });

            if (hasChanges) {
              await Bun.write(filePath, newContent);
              bumpedCount++;
            }
          } catch (error) {
            // Skip files that can't be processed
            console.warn(`⚠️  Skipped ${filePath}: ${error.message}`);
          }
        }

        console.log(`✅ Vault: ${bumpedCount} files version-bumped`);
        break;

      case "parse":
        const parsed = semver.parse(version);
        if (!parsed) {
          throw new Error(`❌ Cannot parse: ${version}`);
        }
        console.log(`📋 Parsed: ${version}`);
        console.log(`   Major: ${parsed.major}`);
        console.log(`   Minor: ${parsed.minor}`);
        console.log(`   Patch: ${parsed.patch}`);
        if (parsed.prerelease) {
          console.log(`   Prerelease: ${parsed.prerelease.join('.')}`);
        }
        if (parsed.build) {
          console.log(`   Build: ${parsed.build.join('.')}`);
        }
        break;

      case "current":
        console.log(`📋 Current version: ${pkg.version}`);
        const parsedCurrent = semver.parse(pkg.version);
        if (parsedCurrent) {
          console.log(`   Valid: ✅`);
          console.log(`   Major: ${parsedCurrent.major}`);
          console.log(`   Minor: ${parsedCurrent.minor}`);
          console.log(`   Patch: ${parsedCurrent.patch}`);
        } else {
          console.log(`   Valid: ❌`);
        }
        break;

      case "clean":
        // Clean/remove prerelease from version
        const cleanVer = pkg.version.split('-')[0];
        if (cleanVer !== pkg.version) {
          pkg.version = cleanVer;
          await Bun.write("package.json", JSON.stringify(pkg, null, 2));
          console.log(`🧹 Cleaned: ${pkg.version} (removed prerelease)`);
        } else {
          console.log(`📋 Already clean: ${pkg.version}`);
        }
        break;

      default:
        console.log(`🚀 Bun Semver v3.0.0 - Native Implementation

USAGE:
  bun semver <command> [version] [level]

COMMANDS:
  inc <level>           # Increment version (patch/minor/major)
  validate <version>    # Validate semver format
  compare <v1> <v2>     # Compare two versions
  prerelease <id>       # Add prerelease identifier (beta/alpha/rc)
  vault <level>         # Bump ALL vault versions
  parse <version>       # Parse version components
  current               # Show current package version
  clean                 # Remove prerelease from current version

LEVELS: patch, minor, major, prepatch, preminor, premajor, prerelease

EXAMPLES:
  bun semver inc patch           # 1.2.3 → 1.2.4 + git tag + EXE
  bun semver prerelease beta     # 1.2.4 → 1.2.4-beta.1
  bun semver validate 2.0.0      # Check if valid
  bun semver vault minor         # Bump all [v1.2.3] to [v1.3.0]
  bun semver compare 2.0.0 1.9.9 # Compare versions

WORKFLOW:
  1. Develop: bun --watch
  2. Test: bun test
  3. Bump: bun semver inc patch
  4. Release: bun release
`);
        break;
    }
  } catch (error) {
    console.error(`❌ Semver error: ${error.message}`);
    process.exit(1);
  }
}

// CLI execution
if (import.meta.main) {
  main();
}
