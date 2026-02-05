// Use the actual pattern from TelemetrySystem.ts
import { feature } from "bun:bundle";

// @ts-ignore - feature() from bun:bundle
if (typeof feature === "function" && feature("FEAT_CLOUD_UPLOAD", false)) {
  console.log("✅ FEAT_CLOUD_UPLOAD ENABLED");
} else {
  console.log("❌ FEAT_CLOUD_UPLOAD DISABLED");
}
