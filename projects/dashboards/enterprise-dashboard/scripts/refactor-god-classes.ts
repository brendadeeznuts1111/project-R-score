// scripts/refactor-god-classes.ts
import { Project } from "ts-morph";

const project = new Project({
  tsConfigFilePath: "./tsconfig.json",
});

// Add source files
project.addSourceFilesAtPaths("src/server/kyc/*.ts");

const analyzeClass = (fileName: string, className: string) => {
  const sourceFile = project.getSourceFile(fileName);
  if (!sourceFile) {
    console.log(`File not found: ${fileName}`);
    return;
  }

  const cls = sourceFile.getClass(className);
  if (!cls) {
    console.log(`Class not found: ${className}`);
    return;
  }

  const methods = cls.getMethods();
  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 ${className} (${fileName})`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Total methods: ${methods.length}`);
  console.log(`Total properties: ${cls.getProperties().length}`);

  // Extract methods by concern using naming patterns
  const methodGroups = {
    retryLogic: methods.filter(
      (m) =>
        m.getName().toLowerCase().includes("retry") ||
        m.getName().toLowerCase().includes("backoff")
    ),
    androidSpecific: methods.filter(
      (m) =>
        m.getName().toLowerCase().includes("android") ||
        m.getName().toLowerCase().includes("permission") ||
        m.getName().toLowerCase().includes("emulat") ||
        m.getName().toLowerCase().includes("root") ||
        m.getName().toLowerCase().includes("play")
    ),
    dashboard: methods.filter(
      (m) =>
        m.getName().toLowerCase().includes("dashboard") ||
        m.getName().toLowerCase().includes("metric")
    ),
    s3Storage: methods.filter(
      (m) =>
        m.getName().toLowerCase().includes("s3") ||
        m.getName().toLowerCase().includes("upload") ||
        m.getName().toLowerCase().includes("log")
    ),
    websocket: methods.filter(
      (m) =>
        m.getName().toLowerCase().includes("broadcast") ||
        m.getName().toLowerCase().includes("websocket") ||
        m.getName().toLowerCase().includes("client")
    ),
    queue: methods.filter(
      (m) =>
        m.getName().toLowerCase().includes("queue") ||
        m.getName().toLowerCase().includes("review")
    ),
    verification: methods.filter(
      (m) =>
        m.getName().toLowerCase().includes("verify") ||
        m.getName().toLowerCase().includes("check") ||
        m.getName().toLowerCase().includes("validate")
    ),
  };

  console.log(`\n📦 Method Groups by Concern:`);
  for (const [group, groupMethods] of Object.entries(methodGroups)) {
    if (groupMethods.length > 0) {
      console.log(`\n  ${group}: ${groupMethods.length} methods`);
      for (const m of groupMethods) {
        const visibility = m.getScope() || "public";
        const isAsync = m.isAsync() ? "async " : "";
        console.log(`    - ${visibility} ${isAsync}${m.getName()}()`);
      }
    }
  }

  // List all methods
  console.log(`\n📋 All Methods:`);
  for (const m of methods) {
    const visibility = m.getScope() || "public";
    const isAsync = m.isAsync() ? "async " : "";
    const line = m.getStartLineNumber();
    console.log(`  [L${line}] ${visibility} ${isAsync}${m.getName()}()`);
  }

  // Generate extraction plan
  console.log(`\n🔧 Extraction Plan:`);
  if (methodGroups.retryLogic.length > 0) {
    console.log(
      `  → Extract ${methodGroups.retryLogic.length} methods to RetryPolicyEngine`
    );
  }
  if (methodGroups.androidSpecific.length > 0) {
    console.log(
      `  → Extract ${methodGroups.androidSpecific.length} methods to Android13Adapter`
    );
  }
  if (methodGroups.s3Storage.length > 0) {
    console.log(
      `  → Extract ${methodGroups.s3Storage.length} methods to S3StorageService`
    );
  }
  if (methodGroups.websocket.length > 0) {
    console.log(
      `  → Extract ${methodGroups.websocket.length} methods to WebSocketBroadcaster`
    );
  }
};

// Analyze KYC classes
analyzeClass("src/server/kyc/failsafeEngine.ts", "KYCFailsafeEngine");
analyzeClass("src/server/kyc/android13Failsafe.ts", "Android13KYCFailsafe");
analyzeClass("src/server/kyc/reviewQueueProcessor.ts", "ReviewQueueProcessor");
analyzeClass("src/server/kyc/kycDashboard.ts", "KYCDashboard");

console.log(`\n${"=".repeat(60)}`);
console.log("Analysis complete");
