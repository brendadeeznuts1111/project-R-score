#!/usr/bin/env bun
// Get package info from custom registry

export {}; // Make this file a module

const pkg = process.argv[2];
if (!pkg) {
  console.error("Usage: bun scripts/registry-info.ts <package-name>");
  console.error("Example: bun scripts/registry-info.ts windsurf-project");
  process.exit(1);
}

const REGISTRY_URL = "https://duo-npm-registry.utahj4754.workers.dev";
const TOKEN = "Njk3NjVkZDczODc2NmJjYTM4YmU2M2U3ZDAxOTJjZjg6MWQ5MzI2ZmZiMGM1OWViZWNiNjEyZjQwMWE4N2Y3MTk0MjU3NDk4NDM3NWZiMjgzZmM0MzU5NjMwZDdkOTI5YQ==";

console.log(`🔍 Getting info for: ${pkg}`);
console.log(`🌐 Registry: ${REGISTRY_URL}`);

try {
  const response = await fetch(`${REGISTRY_URL}/${pkg}`, {
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const packageData = await response.json();
  
  console.log("✅ Package info retrieved:");
  console.log(`📦 Name: ${packageData.name}`);
  console.log(`📋 Latest version: ${packageData["dist-tags"]?.latest}`);
  console.log(`📋 Description: ${packageData.description || 'Enterprise automation framework with CLI tools and utilities'}`);
  console.log(`📋 Versions available: ${Object.keys(packageData.versions || {}).join(', ')}`);
  console.log(`📋 Maintainers: ${packageData.maintainers?.map((m: any) => m.name).join(', ') || 'Unknown'}`);
  
  if (packageData.repository) {
    console.log(`📋 Repository: ${packageData.repository.url || packageData.repository}`);
  }
  
  if (packageData.bin) {
    console.log(`📋 Binaries: ${Object.keys(packageData.bin).join(', ')}`);
  }
  
} catch (error: unknown) {
  console.error("❌ Failed to get package info:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}
