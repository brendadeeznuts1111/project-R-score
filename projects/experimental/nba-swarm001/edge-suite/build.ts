// edge-suite/build.ts
/**
 * Build script for Edge-Suite Dashboard
 * 
 * Uses Bun macros to generate build metadata and embed it into the dashboard
 */

import { BUILD_METADATA, getBuildInfo } from "../src/core/build-metadata.js";

console.info("🔨 Building Edge-Suite Dashboard...");
console.info(`📦 Build Info: ${getBuildInfo()}`);
console.info(`📅 Build Time: ${new Date(BUILD_METADATA.buildTime).toLocaleString()}`);
console.info(`🔐 Git Hash: ${BUILD_METADATA.gitHash}`);
console.info(`📊 Version: ${BUILD_METADATA.version}`);
console.info(`✅ Build metadata ready for dashboard`);

// Export build metadata for server to use
export { BUILD_METADATA, getBuildInfo };

