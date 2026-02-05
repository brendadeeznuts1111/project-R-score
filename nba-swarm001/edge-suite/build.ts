// edge-suite/build.ts
/**
 * Build script for Edge-Suite Dashboard
 * 
 * Uses Bun macros to generate build metadata and embed it into the dashboard
 */

import { BUILD_METADATA, getBuildInfo } from "../src/core/build-metadata.js";

console.log("🔨 Building Edge-Suite Dashboard...");
console.log(`📦 Build Info: ${getBuildInfo()}`);
console.log(`📅 Build Time: ${new Date(BUILD_METADATA.buildTime).toLocaleString()}`);
console.log(`🔐 Git Hash: ${BUILD_METADATA.gitHash}`);
console.log(`📊 Version: ${BUILD_METADATA.version}`);
console.log(`✅ Build metadata ready for dashboard`);

// Export build metadata for server to use
export { BUILD_METADATA, getBuildInfo };

