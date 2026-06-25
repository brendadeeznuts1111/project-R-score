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
    console.info(`File not found: ${fileName}`);
    return;
  }

  const cls = sourceFile.getClass(className);
  if (!cls) {
    console.info(`Class not found: ${className}`);
    return;
  }

  const methods = cls.getMethods();
  console.info(`\n${"=".repeat(60)}`);
  console.info(`📊 ${className} (${fileName})`);
  console.info(`${"=".repeat(60)}`);
  console.info(`Total methods: ${methods.length}`);
  console.info(`Total properties: ${cls.getProperties().length}`);

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

  console.info(`\n📦 Method Groups by Concern:`);
  for (const [group, groupMethods] of Object.entries(methodGroups)) {
    if (groupMethods.length > 0) {
      console.info(`\n  ${group}: ${groupMethods.length} methods`);
      for (const m of groupMethods) {
        const visibility = m.getScope() || "public";
        const isAsync = m.isAsync() ? "async " : "";
        console.info(`    - ${visibility} ${isAsync}${m.getName()}()`);
      }
    }
  }

  // List all methods
  console.info(`\n📋 All Methods:`);
  for (const m of methods) {
    const visibility = m.getScope() || "public";
    const isAsync = m.isAsync() ? "async " : "";
    const line = m.getStartLineNumber();
    console.info(`  [L${line}] ${visibility} ${isAsync}${m.getName()}()`);
  }

  // Generate extraction plan
  console.info(`\n🔧 Extraction Plan:`);
  if (methodGroups.retryLogic.length > 0) {
    console.info(
      `  → Extract ${methodGroups.retryLogic.length} methods to RetryPolicyEngine`
    );
  }
  if (methodGroups.androidSpecific.length > 0) {
    console.info(
      `  → Extract ${methodGroups.androidSpecific.length} methods to Android13Adapter`
    );
  }
  if (methodGroups.s3Storage.length > 0) {
    console.info(
      `  → Extract ${methodGroups.s3Storage.length} methods to S3StorageService`
    );
  }
  if (methodGroups.websocket.length > 0) {
    console.info(
      `  → Extract ${methodGroups.websocket.length} methods to WebSocketBroadcaster`
    );
  }
};

// Analyze KYC classes
analyzeClass("src/server/kyc/failsafeEngine.ts", "KYCFailsafeEngine");
analyzeClass("src/server/kyc/android13Failsafe.ts", "Android13KYCFailsafe");
analyzeClass("src/server/kyc/reviewQueueProcessor.ts", "ReviewQueueProcessor");
analyzeClass("src/server/kyc/kycDashboard.ts", "KYCDashboard");

console.info(`\n${"=".repeat(60)}`);
console.info("Analysis complete");
