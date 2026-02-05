#!/usr/bin/env bun
/**
 * Pack all workspace packages using bun pm pack
 */
import { $ } from "bun";
import { Glob } from "bun";
import { mkdir } from "node:fs/promises";

console.log("📦 Packing all workspace packages...\n");

await mkdir("./dist/packs", { recursive: true });

const glob = new Glob("*/package.json");
const packages = [...glob.scanSync({ cwd: "." })];

let packedCount = 0;

// Pack root package first
try {
  console.log("Packing root package...");
  await $`bun pm pack --destination ./dist/packs`;
  packedCount++;
} catch (error) {
  console.error("  ✗ Root package failed");
}

// Pack workspace packages
for (const pkgPath of packages) {
  const dir = pkgPath.replace("/package.json", "");
  try {
    const pkg = await Bun.file(pkgPath).json();
    if (!pkg.name || pkg.private) continue;

    console.log(`Packing ${pkg.name}...`);
    await $`cd ${dir} && bun pm pack --destination ../../dist/packs`;
    packedCount++;
  } catch (error) {
    console.error(`  ✗ ${dir}: ${error}`);
  }
}

console.log(`\n✅ Packed ${packedCount} packages to ./dist/packs/`);
