/**
 * 🧪 COMPILE-TIME VERIFICATION SCRIPT
 */

import { feature } from "bun:bundle";
import { ServiceFactory } from "../services/ServiceFactory";
import { IS_PRODUCTION, API_TIMEOUT_MS } from "../constants/features/compile-time";

console.info("🔍 Verifying Compile-Time Features");
console.info("==================================");

// 1. Environment Code Path Elimination
if (feature("ENV_PRODUCTION")) {
  console.info("🚀 PRODUCTION MODE ACTIVE");
  // This branch should be removed in development builds
}

if (feature("ENV_DEVELOPMENT")) {
  console.info("🔧 DEVELOPMENT MODE ACTIVE");
  // This branch should be removed in production builds
}

// 2. Service Factory Optimization
const api = ServiceFactory.createApiService();
console.info(`API Service Created: ${api.type}`);

const logger = ServiceFactory.createLoggingService();
logger.log("Testing logger optimization...");

// 3. Constants Optimization
console.info(`API Timeout: ${API_TIMEOUT_MS}ms`);

// 4. Feature-specific logic
if (feature("FEAT_PREMIUM")) {
  console.info("🏆 PREMIUM STATUS VERIFIED");
}

console.info("✅ Verification script execution complete");
