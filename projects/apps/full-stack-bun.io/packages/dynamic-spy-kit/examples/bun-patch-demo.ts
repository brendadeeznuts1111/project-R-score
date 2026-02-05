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
	console.log("=".repeat(70));
	console.log("1. 🩹 BUN PATCH OVERVIEW");
	console.log("=".repeat(70));

	console.log(`
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
	console.log("\n" + "=".repeat(70));
	console.log("2. 📋 PATCH COMMANDS REFERENCE");
	console.log("=".repeat(70));

	const commands = [
		{ cmd: "bun patch <pkg>", desc: "Prepare package for patching", example: "bun patch lodash" },
		{ cmd: "bun patch <pkg>@<version>", desc: "Patch specific version", example: "bun patch react@18.2.0" },
		{ cmd: "bun patch node_modules/<pkg>", desc: "Patch by path", example: "bun patch node_modules/axios" },
		{ cmd: "bun patch --commit <pkg>", desc: "Commit changes to patch", example: "bun patch --commit lodash" },
		{ cmd: "bun patch --commit --patches-dir=<dir>", desc: "Custom patch directory", example: "bun patch --commit lodash --patches-dir=mypatches" },
		{ cmd: "bun patch-commit <pkg>", desc: "Alias for --commit (pnpm compat)", example: "bun patch-commit react" },
	];

	console.log(`\n📋 Available Commands:\n`);
	console.log(Bun.inspect.table(commands));
}

// =============================================================================
// 3. Arbitrage Patch Examples
// =============================================================================
function demoArbPatches() {
	console.log("\n" + "=".repeat(70));
	console.log("3. 🏀 ARBITRAGE PATCH EXAMPLES");
	console.log("=".repeat(70));

	console.log(`
📦 Example 1: Patch axios for custom retry logic
   
   # Step 1: Prepare axios for patching
   bun patch axios

   # Step 2: Edit node_modules/axios/lib/core/Axios.js
   # Add: console.log('[ARB] Request:', config.url);

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
	console.log(`📄 package.json after patching:`);
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

	console.log(JSON.stringify(examplePackageJson, null, 2));
}

// =============================================================================
// 4. Sample Patch File
// =============================================================================
function demoSamplePatch() {
	console.log("\n" + "=".repeat(70));
	console.log("4. 📝 SAMPLE PATCH FILE");
	console.log("=".repeat(70));

	const samplePatch = `
--- a/lib/core/Axios.js
+++ b/lib/core/Axios.js
@@ -42,6 +42,12 @@ class Axios {
   }

   async request(configOrUrl, config) {
+    // [ARB-PATCH] Custom logging for arbitrage requests
+    const startTime = Date.now();
+    console.log('[ARB] Request:', typeof configOrUrl === 'string' ? configOrUrl : configOrUrl.url);
+    const result = await this._request(configOrUrl, config);
+    console.log('[ARB] Response:', Date.now() - startTime, 'ms');
+    return result;
+  }
+
+  async _request(configOrUrl, config) {
     try {
       return await this._request(configOrUrl, config);
     } catch (error) {
`;

	console.log(`\n📄 patches/axios@1.6.0.patch:`);
	console.log("```diff");
	console.log(samplePatch);
	console.log("```");
}

// =============================================================================
// 5. Patch Workflow Script
// =============================================================================
function demoPatchWorkflow() {
	console.log("\n" + "=".repeat(70));
	console.log("5. 🔄 AUTOMATED PATCH WORKFLOW");
	console.log("=".repeat(70));

	console.log(`
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
  console.log("🩹 Applying arbitrage patches...");
  
  for (const [pkg, description] of Object.entries(patches)) {
    const patchFile = \`patches/\${pkg}@*.patch\`;
    const exists = await Bun.file(patchFile).exists();
    
    if (exists) {
      console.log(\`  ✅ \${pkg}: \${description}\`);
    } else {
      console.log(\`  ⚠️ \${pkg}: Patch file not found\`);
    }
  }
  
  // Run bun install to apply patches
  await $\`bun install\`;
  console.log("✅ All patches applied!");
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
	console.log("\n" + "=".repeat(70));
	console.log("6. 🔍 CHECK CURRENT PATCHES");
	console.log("=".repeat(70));

	// Check if patches directory exists
	const patchesDir = "./patches";
	const patchesDirExists = await Bun.file(patchesDir).exists().catch(() => false);

	console.log(`\n📂 Patches Directory:`);
	console.log(`   Path: ${patchesDir}`);
	console.log(`   Exists: ${patchesDirExists ? "✅ Yes" : "❌ No"}`);

	// Check package.json for patchedDependencies
	try {
		const pkgPath = "./package.json";
		const pkgExists = await Bun.file(pkgPath).exists();
		
		if (pkgExists) {
			const pkg = await Bun.file(pkgPath).json();
			const patched = pkg.patchedDependencies || {};
			const patchCount = Object.keys(patched).length;

			console.log(`\n📦 package.json patchedDependencies:`);
			if (patchCount > 0) {
				for (const [dep, path] of Object.entries(patched)) {
					console.log(`   ${dep}: ${path}`);
				}
			} else {
				console.log(`   No patched dependencies found`);
			}
		}
	} catch (e) {
		console.log(`   Could not read package.json`);
	}

	// List patch files if directory exists
	if (patchesDirExists) {
		try {
			const glob = new Bun.Glob("*.patch");
			const patches = await Array.fromAsync(glob.scan(patchesDir));
			
			console.log(`\n📄 Patch Files:`);
			if (patches.length > 0) {
				for (const patch of patches) {
					const stats = await Bun.file(`${patchesDir}/${patch}`).stat();
					console.log(`   ${patch} (${stats.size} bytes)`);
				}
			} else {
				console.log(`   No .patch files found`);
			}
		} catch (e) {
			console.log(`   Could not list patch files`);
		}
	}
}

// =============================================================================
// 7. CLI Options Reference
// =============================================================================
function demoCLIOptions() {
	console.log("\n" + "=".repeat(70));
	console.log("7. ⚙️ CLI OPTIONS REFERENCE");
	console.log("=".repeat(70));

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

	console.log(`\n📋 bun patch Options:\n`);
	console.log(Bun.inspect.table(options));
}

// =============================================================================
// 8. Best Practices
// =============================================================================
function demoBestPractices() {
	console.log("\n" + "=".repeat(70));
	console.log("8. 💡 BEST PRACTICES");
	console.log("=".repeat(70));

	console.log(`
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
	console.log("\n⚡ @dynamic-spy/kit v8.2 - BUN PATCH DEMO 🩹\n");
	console.log(`Bun version: ${Bun.version}`);

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

	console.log("\n" + "=".repeat(70));
	console.log("✅ BUN PATCH SUMMARY");
	console.log("=".repeat(70));
	console.log(`
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

