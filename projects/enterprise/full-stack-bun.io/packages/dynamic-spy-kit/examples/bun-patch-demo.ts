#!/usr/bin/env bun
/**
 * @dynamic-spy/kit v8.2 - BUN PATCH DEMO 🩹
 * 
 * Persistently patch node_modules packages in a git-friendly way!
 * 
 * Features:
 * - Generate .patch files for dependencies
 * - Commit patches to repository
 * - Reuse patches across installs/projects
 * - Preserve Bun's Global Cache integrity
 * 
 * Usage:
 *   bun run examples/bun-patch-demo.ts
 *   bun run examples/bun-patch-demo.ts --list-patches
 */

import { $ } from "bun";

// =============================================================================
// Patch Workflow Demo
// =============================================================================

interface PatchInfo {
	package: string;
	version: string;
	patchFile: string;
	status: "pending" | "applied" | "committed";
}

interface PatchedDependency {
	name: string;
	patchPath: string;
}

// =============================================================================
// 1. Overview
// =============================================================================
function demoPatchOverview() {
	console.info("=".repeat(70));
	console.info("1. 🩹 BUN PATCH OVERVIEW");
	console.info("=".repeat(70));

	console.info(`
📋 What is bun patch?
   Persistently patch node_modules packages in a maintainable, git-friendly way.

🔧 Use Cases:
   • Fix a bug in a dependency while waiting for upstream fix
   • Add custom logging/instrumentation to a package
   • Modify behavior for your specific use case
   • Backport fixes from newer versions

📁 How it works:
   1. bun patch <pkg>        → Prepares package for editing
   2. Edit files in node_modules/<pkg>
   3. bun patch --commit <pkg> → Generates .patch file

📂 Files created:
   patches/<pkg>@<version>.patch  → The diff file
   package.json                   → "patchedDependencies" added
`);
}

// =============================================================================
// 2. Patch Commands Reference
// =============================================================================
function demoPatchCommands() {
	console.info("\n" + "=".repeat(70));
	console.info("2. 📋 PATCH COMMANDS REFERENCE");
	console.info("=".repeat(70));

	const commands = [
		{ cmd: "bun patch <pkg>", desc: "Prepare package for patching", example: "bun patch lodash" },
		{ cmd: "bun patch <pkg>@<version>", desc: "Patch specific version", example: "bun patch react@18.2.0" },
		{ cmd: "bun patch node_modules/<pkg>", desc: "Patch by path", example: "bun patch node_modules/axios" },
		{ cmd: "bun patch --commit <pkg>", desc: "Commit changes to patch", example: "bun patch --commit lodash" },
		{ cmd: "bun patch --commit --patches-dir=<dir>", desc: "Custom patch directory", example: "bun patch --commit lodash --patches-dir=mypatches" },
		{ cmd: "bun patch-commit <pkg>", desc: "Alias for --commit (pnpm compat)", example: "bun patch-commit react" },
	];

	console.info(`\n📋 Available Commands:\n`);
	console.info(Bun.inspect.table(commands));
}

// =============================================================================
// 3. Arbitrage Patch Examples
// =============================================================================
function demoArbPatches() {
	console.info("\n" + "=".repeat(70));
	console.info("3. 🏀 ARBITRAGE PATCH EXAMPLES");
	console.info("=".repeat(70));

	console.info(`
📦 Example 1: Patch axios for custom retry logic
   
   # Step 1: Prepare axios for patching
   bun patch axios

   # Step 2: Edit node_modules/axios/lib/core/Axios.js
   # Add: console.info('[ARB] Request:', config.url);

   # Step 3: Commit the patch
   bun patch --commit axios

   # Result: patches/axios@1.6.0.patch created

---

📦 Example 2: Patch ccxt for custom exchange handling
   
   # Step 1: Prepare
   bun patch ccxt

   # Step 2: Edit node_modules/ccxt/js/base/Exchange.js
   # Fix: Handle rate limit errors gracefully
   
   # Step 3: Commit
   bun patch --commit ccxt --patches-dir=arb-patches

---

📦 Example 3: Patch ws for binary message optimization
   
   # Prepare WebSocket library
   bun patch ws

   # Edit to add custom binary handling for odds streams
   # Commit the patch
   bun patch --commit ws
`);

	// Show what package.json looks like after patching
	console.info(`📄 package.json after patching:`);
	const examplePackageJson = {
		name: "arb-engine",
		version: "1.0.0",
		dependencies: {
			axios: "^1.6.0",
			ccxt: "^4.0.0",
			ws: "^8.14.0"
		},
		patchedDependencies: {
			"axios@1.6.0": "patches/axios@1.6.0.patch",
			"ccxt@4.0.0": "arb-patches/ccxt@4.0.0.patch",
			"ws@8.14.0": "patches/ws@8.14.0.patch"
		}
	};

	console.info(JSON.stringify(examplePackageJson, null, 2));
}

// =============================================================================
// 4. Sample Patch File
// =============================================================================
function demoSamplePatch() {
	console.info("\n" + "=".repeat(70));
	console.info("4. 📝 SAMPLE PATCH FILE");
	console.info("=".repeat(70));

	const samplePatch = `
--- a/lib/core/Axios.js
+++ b/lib/core/Axios.js
@@ -42,6 +42,12 @@ class Axios {
   }

   async request(configOrUrl, config) {
+    // [ARB-PATCH] Custom logging for arbitrage requests
+    const startTime = Date.now();
+    console.info('[ARB] Request:', typeof configOrUrl === 'string' ? configOrUrl : configOrUrl.url);
+    const result = await this._request(configOrUrl, config);
+    console.info('[ARB] Response:', Date.now() - startTime, 'ms');
+    return result;
+  }
+
+  async _request(configOrUrl, config) {
     try {
       return await this._request(configOrUrl, config);
     } catch (error) {
`;

	console.info(`\n📄 patches/axios@1.6.0.patch:`);
	console.info("```diff");
	console.info(samplePatch);
	console.info("```");
}

// =============================================================================
// 5. Patch Workflow Script
// =============================================================================
function demoPatchWorkflow() {
	console.info("\n" + "=".repeat(70));
	console.info("5. 🔄 AUTOMATED PATCH WORKFLOW");
	console.info("=".repeat(70));

	console.info(`
📜 scripts/apply-arb-patches.ts:

\`\`\`typescript
#!/usr/bin/env bun
/**
 * Apply custom arbitrage patches to dependencies
 */

import { $ } from "bun";

const patches: Record<string, string> = {
  "axios": "Add request timing logs",
  "ccxt": "Fix rate limit handling",
  "ws": "Optimize binary messages"
};

async function applyPatches() {
  console.info("🩹 Applying arbitrage patches...");
  
  for (const [pkg, description] of Object.entries(patches)) {
    const patchFile = \`patches/\${pkg}@*.patch\`;
    const exists = await Bun.file(patchFile).exists();
    
    if (exists) {
      console.info(\`  ✅ \${pkg}: \${description}\`);
    } else {
      console.info(\`  ⚠️ \${pkg}: Patch file not found\`);
    }
  }
  
  // Run bun install to apply patches
  await $\`bun install\`;
  console.info("✅ All patches applied!");
}

if (import.meta.main) {
  applyPatches();
}
\`\`\`
`);
}

// =============================================================================
// 6. Check Current Patches
// =============================================================================
async function checkCurrentPatches() {
	console.info("\n" + "=".repeat(70));
	console.info("6. 🔍 CHECK CURRENT PATCHES");
	console.info("=".repeat(70));

	// Check if patches directory exists
	const patchesDir = "./patches";
	const patchesDirExists = await Bun.file(patchesDir).exists().catch(() => false);

	console.info(`\n📂 Patches Directory:`);
	console.info(`   Path: ${patchesDir}`);
	console.info(`   Exists: ${patchesDirExists ? "✅ Yes" : "❌ No"}`);

	// Check package.json for patchedDependencies
	try {
		const pkgPath = "./package.json";
		const pkgExists = await Bun.file(pkgPath).exists();
		
		if (pkgExists) {
			const pkg = await Bun.file(pkgPath).json();
			const patched = pkg.patchedDependencies || {};
			const patchCount = Object.keys(patched).length;

			console.info(`\n📦 package.json patchedDependencies:`);
			if (patchCount > 0) {
				for (const [dep, path] of Object.entries(patched)) {
					console.info(`   ${dep}: ${path}`);
				}
			} else {
				console.info(`   No patched dependencies found`);
			}
		}
	} catch (e) {
		console.info(`   Could not read package.json`);
	}

	// List patch files if directory exists
	if (patchesDirExists) {
		try {
			const glob = new Bun.Glob("*.patch");
			const patches = await Array.fromAsync(glob.scan(patchesDir));
			
			console.info(`\n📄 Patch Files:`);
			if (patches.length > 0) {
				for (const patch of patches) {
					const stats = await Bun.file(`${patchesDir}/${patch}`).stat();
					console.info(`   ${patch} (${stats.size} bytes)`);
				}
			} else {
				console.info(`   No .patch files found`);
			}
		} catch (e) {
			console.info(`   Could not list patch files`);
		}
	}
}

// =============================================================================
// 7. CLI Options Reference
// =============================================================================
function demoCLIOptions() {
	console.info("\n" + "=".repeat(70));
	console.info("7. ⚙️ CLI OPTIONS REFERENCE");
	console.info("=".repeat(70));

	const options = [
		{ flag: "--commit", type: "boolean", desc: "Generate patch file from modifications" },
		{ flag: "--patches-dir", type: "string", desc: "Custom directory for patch files" },
		{ flag: "--production", type: "boolean", desc: "Skip devDependencies" },
		{ flag: "--ignore-scripts", type: "boolean", desc: "Skip lifecycle scripts" },
		{ flag: "--frozen-lockfile", type: "boolean", desc: "Disallow lockfile changes" },
		{ flag: "--dry-run", type: "boolean", desc: "Preview without applying" },
		{ flag: "--force", type: "boolean", desc: "Force reinstall all deps" },
		{ flag: "--verbose", type: "boolean", desc: "Detailed logging" },
		{ flag: "--silent", type: "boolean", desc: "No output" },
	];

	console.info(`\n📋 bun patch Options:\n`);
	console.info(Bun.inspect.table(options));
}

// =============================================================================
// 8. Best Practices
// =============================================================================
function demoBestPractices() {
	console.info("\n" + "=".repeat(70));
	console.info("8. 💡 BEST PRACTICES");
	console.info("=".repeat(70));

	console.info(`
✅ DO:
   • Always run 'bun patch <pkg>' before editing
   • Keep patches small and focused
   • Document why the patch was needed
   • Review patches when upgrading dependencies
   • Commit .patch files to version control
   • Check if patch is still needed on version bumps

❌ DON'T:
   • Edit node_modules directly without 'bun patch'
   • Create large patches (consider forking instead)
   • Forget to test patches after dependency updates
   • Rely on patches for major functionality changes

📁 Recommended Structure:
   project/
   ├── package.json          # Contains patchedDependencies
   ├── bun.lock             
   ├── patches/              # Default patch directory
   │   ├── axios@1.6.0.patch
   │   ├── ccxt@4.0.0.patch
   │   └── ws@8.14.0.patch
   └── node_modules/         # Patches applied on install
`);
}

// =============================================================================
// Main
// =============================================================================
async function main() {
	console.info("\n⚡ @dynamic-spy/kit v8.2 - BUN PATCH DEMO 🩹\n");
	console.info(`Bun version: ${Bun.version}`);

	const args = Bun.argv.slice(2);
	const listPatches = args.includes("--list-patches");

	demoPatchOverview();
	demoPatchCommands();
	demoArbPatches();
	demoSamplePatch();
	demoPatchWorkflow();

	if (listPatches) {
		await checkCurrentPatches();
	}

	demoCLIOptions();
	demoBestPractices();

	console.info("\n" + "=".repeat(70));
	console.info("✅ BUN PATCH SUMMARY");
	console.info("=".repeat(70));
	console.info(`
🩹 Quick Start:
   1. bun patch <package>           # Prepare for editing
   2. Edit node_modules/<package>   # Make your changes
   3. bun patch --commit <package>  # Generate .patch file
   4. git add patches/              # Commit to repo
   5. bun install                   # Patches auto-applied!

📦 Arbitrage Use Cases:
   • Patch axios for custom retry/timeout logic
   • Patch ccxt for exchange-specific fixes
   • Patch ws for optimized binary message handling
   • Patch any dependency without waiting for upstream

Bun patch → Git-friendly fixes → Industrial reliability! 🚀
`);
}

if (import.meta.main) {
	main().catch(console.error);
}

