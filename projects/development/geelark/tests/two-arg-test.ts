// Use the actual pattern from TelemetrySystem.ts
import { feature } from "bun:bundle";

// @ts-ignore - feature() from bun:bundle
if (typeof feature === "function" && feature("FEAT_CLOUD_UPLOAD", false)) {
  console.info("✅ FEAT_CLOUD_UPLOAD ENABLED");
} else {
  console.info("❌ FEAT_CLOUD_UPLOAD DISABLED");
}
