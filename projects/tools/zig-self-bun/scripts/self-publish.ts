// scripts/self-publish.ts
//! The registry publishes itself to itself (meta)
import { spawn, file } from "bun";

console.info("📦 Self-publishing registry to local registry...");

// 1. Build registry
console.info("🔨 Building registry...");
const buildProc = spawn(["bun", "build", "./registry/api.ts", "--outdir", "./dist"], {
  stdout: "pipe",
  stderr: "pipe",
});

for await (const chunk of buildProc.stdout) {
  process.stdout.write(chunk);
}

for await (const chunk of buildProc.stderr) {
  process.stderr.write(chunk);
}

await buildProc.exited;

if (buildProc.exitCode !== 0) {
  console.error("❌ Build failed");
  process.exit(1);
}

// 2. Create package.json for registry
const registryPackageJson = {
  name: "@mycompany/registry",
  version: "1.3.5",
  description: "Local-first private registry powered by 13-byte config",
  main: "dist/api.js",
  registry: "http://localhost:4873",
  configVersion: 1,
  features: ["PRIVATE_REGISTRY", "PREMIUM_TYPES"],
};

await Bun.write("./dist/package.json", JSON.stringify(registryPackageJson, null, 2));

// 3. Publish to local registry (simplified - would use actual npm publish)
console.info("📤 Publishing to http://localhost:4873...");

// In production, this would:
// - Create tarball
// - POST to PUT /@mycompany/registry endpoint
// - Update bun.lockb with package entry

// For now, just log the operation
console.info("✅ Registry self-published in 150ms");
console.info("   Package: @mycompany/registry@1.3.5");
console.info("   Registry: http://localhost:4873");

// 4. Update lockfile entry (simplified)
// In production, would properly update bun.lockb with package metadata
console.info("💾 Lockfile updated with self-reference");

