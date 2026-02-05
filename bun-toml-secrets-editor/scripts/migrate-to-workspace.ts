#!/usr/bin/env bun

/**
 * Workspace Migration Script
 * Migrates monorepo to proper workspace structure
 */

import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

console.log("🚀 Migrating to workspace structure...\n");

interface PackageStructure {
	[key: string]: string[];
}

const structure: PackageStructure = {
	packages: {
		core: ["src/types", "src/logging", "src/security", "src/utils"],
		"secrets-editor": [
			"src/cli/safe-toml-cli.ts",
			"src/main.ts",
			"src/templates",
		],
		cli: [
			"src/cli/matrix-cli.ts",
			"src/cli/duoplus-cli.ts",
			"src/cli/kimi-cli.ts",
		],
		rss: [
			"src/api",
			"src/rss",
			"src/cli/rss-secrets-simple-cli.ts",
			"src/integration/profile-rss-bridge.ts",
		],
		profiler: [
			"src/cli/profiling-cli.ts",
			"src/integration/v137-profile-rss-integration.ts",
			"tests/benchmarks",
		],
		logger: ["src/logging"],
	},
	apps: {
		"enterprise-dashboard": ["enterprise-app/src"],
	},
};

// Create directories and copy files
for (const [category, packages] of Object.entries(structure)) {
	console.log(`📦 Processing ${category}...`);

	for (const [pkg, dirs] of Object.entries(packages)) {
		const pkgPath = join(category, pkg);

		if (!existsSync(pkgPath)) {
			console.log(`  Creating ${pkgPath}`);
			mkdirSync(pkgPath, { recursive: true });
			mkdirSync(join(pkgPath, "src"), { recursive: true });

			// Copy files
			for (const dir of dirs) {
				const dest = join(pkgPath, dir.replace("src/", "src/"));
				const destDir = dirname(dest);

				if (!existsSync(destDir)) {
					mkdirSync(destDir, { recursive: true });
				}

				if (existsSync(dir)) {
					console.log(`    Copying ${dir} -> ${dest}`);
					cpSync(dir, dest, { recursive: true });
				} else {
					console.log(`    ⚠️  Source not found: ${dir}`);
				}
			}

			// Create package.json
			const packageJson = createPackageJson(pkg, category);
			writeFileSync(
				join(pkgPath, "package.json"),
				JSON.stringify(packageJson, null, 2),
			);

			// Create basic index.ts if it doesn't exist
			const indexPath = join(pkgPath, "src", "index.ts");
			if (!existsSync(indexPath)) {
				writeFileSync(indexPath, createIndexFile(pkg));
			}

			// Create tsconfig.json for each package
			const tsconfigPath = join(pkgPath, "tsconfig.json");
			if (!existsSync(tsconfigPath)) {
				writeFileSync(tsconfigPath, createTsConfig(pkg));
			}
		} else {
			console.log(`  ✅ ${pkgPath} already exists`);
		}
	}
}

// Create workspace root package.json if it doesn't exist
const rootPackageJsonPath = "package.json";
if (!existsSync(rootPackageJsonPath)) {
	console.log("📄 Creating root package.json");
	const rootPackageJson = {
		name: "@bun-toml/platform",
		version: "1.0.0",
		private: true,
		workspaces: ["packages/*", "apps/*"],
		scripts: {
			build: "bun run --filter='*' build",
			"build:cli": "bun run --filter=@bun-toml/cli build",
			"build:rss": "bun run --filter=@bun-toml/rss build",
			test: "bun run --filter='*' test",
			"test:security":
				"bun run --filter=@bun-toml/secrets-editor test:security",
			"security:audit": "bun scripts/security-audit-workspace.ts",
			clean: "rm -rf packages/*/dist packages/*/node_modules",
			typecheck: "bun run --filter='*' typecheck",
			"dev:cli": "bun run --filter=@bun-toml/cli dev",
			"dev:rss": "bun run --filter=@bun-toml/rss dev",
			release: "bun scripts/workspace-release.ts",
		},
		devDependencies: {
			"@types/bun": "latest",
			typescript: "5.9.3",
		},
	};
	writeFileSync(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2));
}

// Create migration validation script
writeFileSync("scripts/validate-migration.ts", createValidationScript());

console.log("\n✅ Workspace structure created");
console.log("\n📋 Next steps:");
console.log("1. Review moved files for import path updates");
console.log("2. Run: bun install (to link workspace dependencies)");
console.log("3. Run: bun run build (to test builds)");
console.log("4. Run: bun run test (to verify functionality)");
console.log(
	"5. Run: bun scripts/validate-migration.ts (to validate migration)",
);

function createPackageJson(pkgName: string, category: string): any {
	const fullName = `@bun-toml/${pkgName}`;
	const isCore = pkgName === "core";
	const isApp = category === "apps";

	const base = {
		name: fullName,
		version: "1.0.0",
		description: `${pkgName} package for bun-toml platform`,
		main: isApp ? "./src/index.ts" : "./dist/index.js",
		types: isApp ? "./src/index.ts" : "./dist/index.d.ts",
		scripts: {
			build: isApp
				? "bun build ./src/index.ts --outdir ./dist"
				: "bun build ./src/index.ts --outdir ./dist",
			test: "bun test",
			typecheck: "tsc --noEmit",
			dev: isApp ? "bun run ./src/index.ts" : "bun --watch src/index.ts",
		},
		dependencies: isCore
			? {}
			: {
					"@bun-toml/core": "workspace:*",
				},
		devDependencies: {
			"@types/bun": "latest",
			typescript: "5.9.3",
		},
	};

	// Add specific exports and dependencies based on package type
	switch (pkgName) {
		case "core":
			base.exports = {
				".": "./src/index.ts",
				"./types": "./src/types/index.ts",
				"./logger": "./src/logging/enhanced-logger.ts",
				"./security": "./src/security/index.ts",
			};
			break;

		case "rss":
			base.dependencies = {
				"@bun-toml/core": "workspace:*",
				"fast-xml-parser": "5.3.3",
			};
			base.exports = {
				".": "./src/rss-server.ts",
				"./fetcher": "./src/rss-fetcher.ts",
				"./bridge": "./src/profile-rss-bridge.ts",
			};
			break;

		case "secrets-editor":
			base.bin = {
				"secrets-editor": "./src/main.ts",
				"safe-toml": "./src/cli/safe-toml-cli.ts",
			};
			base.dependencies = {
				"@bun-toml/core": "workspace:*",
				"@bun-toml/rss": "workspace:*",
			};
			base.scripts = {
				...base.scripts,
				"test:security":
					"bun test src/__tests__/integration/security-profile-rss.test.ts",
				"security:audit": "bun scripts/security-audit.ts",
			};
			break;

		case "cli":
			base.bin = {
				matrix: "./src/index.ts",
				duoplus: "./src/duoplus-cli.ts",
			};
			base.dependencies = {
				"@bun-toml/core": "workspace:*",
				"@bun-toml/profiler": "workspace:*",
			};
			break;

		case "profiler":
			base.exports = {
				".": "./src/profiling-cli.ts",
				"./v137": "./src/integration/v137-profile-rss-integration.ts",
			};
			break;
	}

	return base;
}

function createIndexFile(pkgName: string): string {
	switch (pkgName) {
		case "core":
			return `// Core package exports
export * from './types';
export * from './logging';
export * from './security';
export * from './utils';
`;

		case "rss":
			return `// RSS package exports
export * from './rss-server';
export * from './rss-fetcher';
export * from './profile-rss-bridge';
`;

		case "logger":
			return `// Logger package exports
export * from './enhanced-logger';
`;

		case "cli":
			return `// CLI package exports
export * from './index';
export * from './duoplus-cli';
export * from './kimi-cli';
`;

		case "profiler":
			return `// Profiler package exports
export * from './profiling-cli';
export * from './integration/v137-profile-rss-integration';
`;

		default:
			return `// ${pkgName} package exports
// Add exports here
`;
	}
}

function createTsConfig(_pkgName: string): string {
	return {
		extends: "../../tsconfig.json",
		compilerOptions: {
			outDir: "./dist",
			rootDir: "./src",
			composite: true,
			declaration: true,
			declarationMap: true,
		},
		include: ["src/**/*"],
		exclude: ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"],
	};
}

function createValidationScript(): string {
	return `#!/usr/bin/env bun
/**
 * Migration Validation Script
 * Validates that the workspace migration was successful
 */

import { $ } from "bun";
import { existsSync } from "fs";

console.log("🔍 Validating workspace migration...\n");

const validations = [
  {
    name: "Workspace configuration exists",
    check: () => existsSync("bun-workspace.toml"),
    required: true
  },
  {
    name: "Core package exists",
    check: () => existsSync("packages/core/package.json"),
    required: true
  },
  {
    name: "RSS package exists",
    check: () => existsSync("packages/rss/package.json"),
    required: true
  },
  {
    name: "CLI package exists",
    check: () => existsSync("packages/cli/package.json"),
    required: true
  },
  {
    name: "Logger package exists",
    check: () => existsSync("packages/logger/package.json"),
    required: true
  },
  {
    name: "Profiler package exists",
    check: () => existsSync("packages/profiler/package.json"),
    required: true
  },
  {
    name: "Secrets Editor package exists",
    check: () => existsSync("packages/secrets-editor/package.json"),
    required: true
  },
  {
    name: "TypeScript configs exist",
    check: () => existsSync("packages/core/tsconfig.json"),
    required: true
  }
];

let passed = 0;
let failed = 0;

for (const validation of validations) {
  try {
    const result = validation.check();
    if (result) {
      console.log(\`✅ \${validation.name}\`);
      passed++;
    } else {
      console.log(\`❌ \${validation.name}\`);
      if (validation.required) {
        failed++;
      }
    }
  } catch (error) {
    console.log(\`❌ \${validation.name} - Error: \${error}\`);
    if (validation.required) {
      failed++;
    }
  }
}

console.log(\`\n📊 Results: \${passed} passed, \${failed} failed\`);

if (failed > 0) {
  console.log("\n⚠️  Some required validations failed. Please review the migration.");
  process.exit(1);
} else {
  console.log("\n🎉 All validations passed! Migration successful.");
  
  console.log("\n🧪 Running test validation...");
  try {
    await $\`bun run test\`;
    console.log("✅ All tests pass");
  } catch (error) {
    console.log("❌ Some tests failed. Please review:");
    console.log(error);
    process.exit(1);
  }
}
`;
}
