#!/usr/bin/env bun

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";

describe("Advanced Feature Elimination Tests", () => {
  const testDir = "/tmp/bun-advanced-tests";

  beforeAll(() => {
    // Ensure test directory exists
    try {
      mkdirSync(testDir, { recursive: true });
    } catch {}
  });

  afterAll(() => {
    // Cleanup test directory if needed
    // Note: Individual tests clean up their own files
  });

  test("should handle complex feature dependencies", async () => {
    const testFile = join(testDir, "dependency-test.ts");
    const output = join(testDir, "dependency.js");

    const testCode = `
import { feature } from "bun:bundle";

const features = [];

// Basic features (always available)
features.push("core");

// Premium features (require premium tier)
if (feature("FEAT_PREMIUM")) {
  features.push("analytics");
  features.push("export");

  // Advanced monitoring (requires premium + advanced monitoring)
  if (feature("FEAT_ADVANCED_MONITORING")) {
    features.push("real-time");
    features.push("alerts");
  }

  // Enterprise features (requires premium + enterprise)
  if (feature("FEAT_ENTERPRISE")) {
    features.push("sso");
    features.push("audit-logs");
  }
}

console.log("Available features:", features.join(","));
`;

    await Bun.write(testFile, testCode);

    try {
      // Test dependency chain: enterprise > premium > basic
      execSync(
        `bun build --feature=FEAT_PREMIUM --feature=FEAT_ENTERPRISE ${testFile} --outfile=${output}`
      );
      const enterpriseContent = await Bun.file(output).text();
      expect(enterpriseContent).toContain("sso");
      expect(enterpriseContent).toContain("analytics");

      execSync(
        `bun build --feature=FEAT_PREMIUM ${testFile} --outfile=${output}`
      );
      const premiumContent = await Bun.file(output).text();
      expect(premiumContent).toContain("analytics");
      expect(premiumContent).not.toContain("sso");

      execSync(`bun build ${testFile} --outfile=${output}`);
      const basicContent = await Bun.file(output).text();
      expect(basicContent).toContain("core");
      expect(basicContent).not.toContain("analytics");
    } finally {
      try {
        unlinkSync(testFile);
        unlinkSync(output);
      } catch {}
    }
  });

  test("should validate bundle size thresholds", async () => {
    const testFile = join(testDir, "size-test.ts");
    const smallOutput = join(testDir, "small.js");
    const largeOutput = join(testDir, "large.js");

    // Small bundle (minimal features)
    const smallCode = `
import { feature } from "bun:bundle";
console.log("Minimal app");
`;

    // Large bundle (many features)
    const largeCode = `
import { feature } from "bun:bundle";

const app = {
  core: () => "core functionality"
};

if (feature("FEAT_PREMIUM")) {
  app.premium = {
    analytics: () => "analytics",
    export: () => "export",
    reports: new Array(1000).fill(0).map((_, i) => (\`report_\${i}\`))
  };
}

if (feature("FEAT_ADVANCED_MONITORING")) {
  app.monitoring = {
    realtime: () => "realtime",
    alerts: () => "alerts",
    metrics: new Array(500).fill(0).map((_, i) => (\`metric_\${i}\`))
  };
}

if (feature("FEAT_BATCH_PROCESSING")) {
  app.batch = {
    process: () => "batch",
    queue: new Array(300).fill(0).map((_, i) => (\`item_\${i}\`))
  };
}

console.log("Full app");
`;

    await Bun.write(testFile, smallCode);

    try {
      // Test small bundle
      execSync(`bun build ${testFile} --outfile=${smallOutput}`);
      const smallSize = Bun.file(smallOutput).size;

      // Test large bundle
      await Bun.write(testFile, largeCode);
      execSync(
        `bun build --feature=FEAT_PREMIUM --feature=FEAT_ADVANCED_MONITORING --feature=FEAT_BATCH_PROCESSING ${testFile} --outfile=${largeOutput}`
      );
      const largeSize = Bun.file(largeOutput).size;

      // Large bundle should be significantly bigger
      expect(largeSize).toBeGreaterThan(smallSize * 2); // At least 2x bigger

      console.log(`Small bundle: ${smallSize} bytes`);
      console.log(`Large bundle: ${largeSize} bytes`);
      console.log(`Size ratio: ${(largeSize / smallSize).toFixed(2)}x`);
    } finally {
      try {
        unlinkSync(testFile);
        unlinkSync(smallOutput);
        unlinkSync(largeOutput);
      } catch {}
    }
  });

  test("should handle feature flag edge cases", async () => {
    const testFile = join(testDir, "edge-case-test.ts");
    const output = join(testDir, "edge-case.js");

    const testCode = `
import { feature } from "bun:bundle";

// Test nested conditions with multiple features
let result = "base";

if (feature("FEAT_PREMIUM")) {
  result += "-premium";

  if (feature("FEAT_ADVANCED_MONITORING")) {
    result += "-monitoring";

    if (feature("FEAT_BATCH_PROCESSING")) {
      result += "-batch";
    } else {
      result += "-no-batch";
    }
  } else {
    result += "-no-monitoring";
  }
} else {
  result += "-free";
}

if (feature("FEAT_BATCH_PROCESSING")) {
  result += "-batch-standalone";
}

console.log(result);
`;

    await Bun.write(testFile, testCode);

    try {
      // Test all features enabled
      execSync(
        `bun build --feature=FEAT_PREMIUM --feature=FEAT_ADVANCED_MONITORING --feature=FEAT_BATCH_PROCESSING ${testFile} --outfile=${output}`
      );
      const allFeatures = await Bun.file(output).text();
      expect(allFeatures).toContain('result += "-premium"');
      expect(allFeatures).toContain('result += "-monitoring"');
      expect(allFeatures).toContain('result += "-batch"');
      expect(allFeatures).toContain('result += "-batch-standalone"');

      // Test partial features
      execSync(
        `bun build --feature=FEAT_PREMIUM ${testFile} --outfile=${output}`
      );
      const partialFeatures = await Bun.file(output).text();
      expect(partialFeatures).toContain('result += "-premium"');
      expect(partialFeatures).toContain('result += "-no-monitoring"');
      expect(partialFeatures).not.toContain('result += "-batch-standalone"');

      // Test standalone feature
      execSync(
        `bun build --feature=FEAT_BATCH_PROCESSING ${testFile} --outfile=${output}`
      );
      const standaloneFeature = await Bun.file(output).text();
      expect(standaloneFeature).toContain('result += "-free"');
      expect(standaloneFeature).toContain('result += "-batch-standalone"');
    } finally {
      try {
        unlinkSync(testFile);
        unlinkSync(output);
      } catch {}
    }
  });
});
