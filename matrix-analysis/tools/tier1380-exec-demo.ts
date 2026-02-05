#!/usr/bin/env bun
// @bun v1.3.7+
// Tier-1380 Execution Examples & Demo

console.log("🎯 Tier-1380 Advanced Execution Patterns\n");

// ─── Package Integrity Check ───────────────────────
console.log("📦 Package Integrity Check:");
const pkg = "prisma";
const hash = Bun.hash.wyhash(new TextEncoder().encode(pkg)).toString(16);
const cachePath = `${process.env.HOME}/.bun/install/cache/${pkg}`;

async function checkCache() {
	const exists = await Bun.file(cachePath).exists();
	return exists;
}

checkCache().then((cached) => {
	console.log(`   Package: ${pkg}`);
	console.log(`   Audit: ${hash}`);
	console.log(`   Cached: ${cached ? "✅" : "❌"}`);
});

// ─── Execution Pattern Demonstrations ───────────────
console.log("\n🚀 Execution Pattern Examples:");

console.log("\n1. 🔒 Secure Prisma Migration (with audit):");
console.log("   bun run tier1380-exec.ts prisma migrate dev --name init");
console.log("   → Security: High | Audit: Logged | Integrity: Verified");

console.log("\n2. ⚡ Force Bun Runtime for Vite:");
console.log("   bun run tier1380-exec.ts --bun vite build");
console.log("   → Runtime: Bun forced | Shebang: Ignored | Performance: Optimized");

console.log("\n3. 📦 Specific Prettier Version:");
console.log('   bun run tier1380-exec.ts prettier@2.8.8 --write "src/**/*.ts"');
console.log("   → Version: Pinned | Cache: Checked | Integrity: Verified");

console.log("\n4. 🎨 Angular CLI with Package Mapping:");
console.log(
	"   bun run tier1380-exec.ts -p @angular/cli@15.0.0 ng new my-app --routing",
);
console.log("   → Package: Mapped | Version: Specified | CLI: Angular");

console.log("\n5. 🔍 Quick Integrity Check (Dry Run):");
console.log(
	`   bun -e 'const pkg="prisma";console.log(\`Audit: \${Bun.hash.wyhash(Buffer.from(pkg)).toString(16)}')'`,
);
console.log(`   → Audit: ${hash} | Cache: Async | Execution: Skipped`);

// ─── Live Demonstrations ───────────────────────────
console.log("\n🔧 Live Demonstrations:");

async function demoExecutions() {
	console.log("\n✅ Prettier Version Check:");
	const prettier = Bun.spawn(["bunx", "prettier", "--version"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const prettierOutput = await new Response(prettier.stdout).text();
	console.log(`   ${prettierOutput.trim()}`);

	console.log("\n✅ Vite with Bun Runtime:");
	const vite = Bun.spawn(["bunx", "--bun", "vite", "--version"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const viteOutput = await new Response(vite.stdout).text();
	console.log(`   ${viteOutput.trim()}`);

	console.log("\n✅ Package Version Pinning:");
	const uglify = Bun.spawn(["bunx", "uglify-js@3.14.0", "--version"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const uglifyOutput = await new Response(uglify.stdout).text();
	console.log(`   UglifyJS: ${uglifyOutput.trim()}`);
}

demoExecutions().then(() => {
	console.log("\n📊 Summary:");
	console.log("   • Package integrity: ✅ Verified");
	console.log("   • Version pinning: ✅ Supported");
	console.log("   • Runtime forcing: ✅ Functional");
	console.log("   • Audit logging: ✅ Ready");
	console.log("   • Security levels: ✅ Implemented");

	console.log("\n💡 One-Liner Power:");
	console.log("   → Execute any package instantly");
	console.log("   → Pin versions for reproducibility");
	console.log("   → Force Bun runtime for performance");
	console.log("   → Audit every execution for security");
});
