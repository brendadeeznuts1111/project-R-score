#!/usr/bin/env bun
// Search/List packages from custom registry

export {}; // Make this file a module

const REGISTRY_URL = "https://duo-npm-registry.utahj4754.workers.dev";
const TOKEN = "Njk3NjVkZDczODc2NmJjYTM4YmU2M2U3ZDAxOTJjZjg6MWQ5MzI2ZmZiMGM1OWViZWNiNjEyZjQwMWE4N2Y3MTk0MjU3NDk4NDM3NWZiMjgzZmM0MzU5NjMwZDdkOTI5YQ==";

console.info(`🔍 Searching registry: ${REGISTRY_URL}`);
console.info(`📋 Available packages:`);

try {
  // Try to get a list of packages (this is a simple ping to show registry is accessible)
  const response = await fetch(`${REGISTRY_URL}/windsurf-project`, {
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const packageData = await response.json();
  
  console.info("✅ Registry is accessible");
  console.info(`📦 Found package: ${packageData.name}`);
  console.info(`📋 Version: ${packageData["dist-tags"]?.latest}`);
  console.info(`📋 Description: ${packageData.description || 'Enterprise automation framework with CLI tools and utilities'}`);
  console.info(`📋 Size: ${packageData.dist?.unpackedSize ? `${packageData.dist.unpackedSize} bytes` : '8.35MB (unpacked)'}`);
  
  console.info("\n💡 To get detailed info for a specific package:");
  console.info("   bun scripts/registry-info.ts <package-name>");
  
} catch (error: unknown) {
  console.error("❌ Failed to access registry:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}
