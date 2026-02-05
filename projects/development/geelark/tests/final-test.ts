// Test based on how Geelark actually uses feature flags
import { feature } from "bun:bundle";

// Pattern from TelemetrySystem.ts - using try-catch
try {
  if (typeof feature === "function" && feature("FEAT_CLOUD_UPLOAD")) {
    console.log("✅ FEAT_CLOUD_UPLOAD is ENABLED");
  } else {
    console.log("❌ FEAT_CLOUD_UPLOAD is DISABLED");
  }
} catch (e) {
  console.log("⚠️  feature() not available:", e);
  console.log("   (Falling back to disabled)");
}
