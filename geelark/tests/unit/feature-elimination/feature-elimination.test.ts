#!/usr/bin/env bun

import { describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";
import { unlinkSync } from "node:fs";
import { join } from "node:path";

describe("Feature Elimination Tests", () => {
  const testDir = "/tmp/bun-feature-tests";

  it("should eliminate premium features when FEAT_PREMIUM is disabled", async () => {
    const testFile = join(testDir, "premium-test.ts");
    const premiumOutput = join(testDir, "premium.js");
    const freeOutput = join(testDir, "free.js");

    // Create test file with premium features
    const testCode = `
import { feature } from "bun:bundle";

if (feature("FEAT_PREMIUM")) {
  console.log("🏆 Premium features enabled");
  const premiumService = {
    analytics: () => "premium-analytics",
    export: () => "premium-export",
    advancedFeatures: new Array(1000).fill(0).map((_, i) => (\`feature_\${i}\`))
  };
  premiumService.analytics();
  premiumService.export();
} else {
  console.log("📱 Free tier - no premium features");
}
console.log("✅ Base functionality");
`;

    // Write test file
    await Bun.write(testFile, testCode);

    try {
      // Build with premium features
      execSync(
        `bun build --feature=FEAT_PREMIUM ${testFile} --outfile=${premiumOutput}`
      );
      const premiumSize = Bun.file(premiumOutput).size.toString();

      // Build without premium features
      execSync(`bun build ${testFile} --outfile=${freeOutput}`);
      const freeSize = Bun.file(freeOutput).size.toString();

      // Premium bundle should be larger
      expect(parseInt(premiumSize)).toBeGreaterThan(parseInt(freeSize));

      // Size difference should be significant (at least 50% larger)
      const sizeRatio = parseInt(premiumSize) / parseInt(freeSize);
      expect(sizeRatio).toBeGreaterThan(1.5);

      console.log(`Premium bundle: ${premiumSize} bytes`);
      console.log(`Free bundle: ${freeSize} bytes`);
      console.log(`Size ratio: ${sizeRatio.toFixed(2)}x`);
    } finally {
      // Cleanup
      try {
        unlinkSync(premiumOutput);
        unlinkSync(freeOutput);
        unlinkSync(testFile);
      } catch {}
    }
  });

  it("should eliminate multiple features correctly", async () => {
    const testFile = join(testDir, "multi-feature-test.ts");
    const fullOutput = join(testDir, "full.js");
    const minimalOutput = join(testDir, "minimal.js");

    const testCode = `
import { feature } from "bun:bundle";

const features = [];

if (feature("FEAT_PREMIUM")) {
  features.push("premium-analytics");
  features.push(...new Array(500).fill(0).map((_, i) => \`premium_\${i}\`));
}

if (feature("FEAT_ADVANCED_MONITORING")) {
  features.push("advanced-monitoring");
  features.push(...new Array(300).fill(0).map((_, i) => \`monitoring_\${i}\`));
}

if (feature("FEAT_BATCH_PROCESSING")) {
  features.push("batch-processing");
  features.push(...new Array(200).fill(0).map((_, i) => \`batch_\${i}\`));
}

console.log("Features loaded:", features.length);
`;

    await Bun.write(testFile, testCode);

    try {
      // Build with all features
      execSync(
        `bun build --feature=FEAT_PREMIUM --feature=FEAT_ADVANCED_MONITORING --feature=FEAT_BATCH_PROCESSING ${testFile} --outfile=${fullOutput}`
      );
      const fullSize = Bun.file(fullOutput).size.toString();

      // Build with no features
      execSync(`bun build ${testFile} --outfile=${minimalOutput}`);
      const minimalSize = Bun.file(minimalOutput).size.toString();

      // Full bundle should be significantly larger
      expect(parseInt(fullSize)).toBeGreaterThan(parseInt(minimalSize));

      const sizeRatio = parseInt(fullSize) / parseInt(minimalSize);
      expect(sizeRatio).toBeGreaterThan(2.0); // Should be at least 2x larger

      console.log(`Full bundle: ${fullSize} bytes`);
      console.log(`Minimal bundle: ${minimalSize} bytes`);
      console.log(`Size ratio: ${sizeRatio.toFixed(2)}x`);
    } finally {
      try {
        unlinkSync(fullOutput);
        unlinkSync(minimalOutput);
        unlinkSync(testFile);
      } catch {}
    }
  });

  it("should handle nested feature conditions", async () => {
    const testFile = join(testDir, "nested-test.ts");
    const enterpriseOutput = join(testDir, "enterprise.js");
    const premiumOutput = join(testDir, "premium.js");
    const basicOutput = join(testDir, "basic.js");

    const testCode = `
import { feature } from "bun:bundle";

let serviceLevel = "basic";

if (feature("FEAT_PREMIUM")) {
  serviceLevel = "premium";

  if (feature("FEAT_ENTERPRISE")) {
    serviceLevel = "enterprise";
    // Enterprise-specific code
    const enterpriseFeatures = new Array(1000).fill(0).map((_, i) => ({
      id: i,
      enterprise: true,
      sso: \`sso_\${i}\`,
      audit: \`audit_\${i}\`
    }));
  }

  // Premium-specific code
  const premiumFeatures = new Array(500).fill(0).map((_, i) => ({
    id: i,
    premium: true,
    analytics: \`analytics_\${i}\`
  }));
}

console.log("Service level:", serviceLevel);
`;

    await Bun.write(testFile, testCode);

    try {
      // Build with enterprise (includes premium)
      execSync(
        `bun build --feature=FEAT_PREMIUM --feature=FEAT_ENTERPRISE ${testFile} --outfile=${enterpriseOutput}`
      );
      const enterpriseSize = Bun.file(enterpriseOutput).size.toString();

      // Build with premium only
      execSync(
        `bun build --feature=FEAT_PREMIUM ${testFile} --outfile=${premiumOutput}`
      );
      const premiumSize = Bun.file(premiumOutput).size.toString();

      // Build with no features
      execSync(`bun build ${testFile} --outfile=${basicOutput}`);
      const basicSize = Bun.file(basicOutput).size.toString();

      // Size hierarchy: enterprise > premium > basic
      expect(parseInt(enterpriseSize)).toBeGreaterThan(parseInt(premiumSize));
      expect(parseInt(premiumSize)).toBeGreaterThan(parseInt(basicSize));

      console.log(`Enterprise bundle: ${enterpriseSize} bytes`);
      console.log(`Premium bundle: ${premiumSize} bytes`);
      console.log(`Basic bundle: ${basicSize} bytes`);
    } finally {
      try {
        unlinkSync(enterpriseOutput);
        unlinkSync(premiumOutput);
        unlinkSync(basicOutput);
        unlinkSync(testFile);
      } catch {}
    }
  });

  it("should verify dead code elimination in output", async () => {
    const testFile = join(testDir, "dead-code-test.ts");
    const premiumOutput = join(testDir, "premium-dead.js");
    const freeOutput = join(testDir, "free-dead.js");

    const testCode = `
import { feature } from "bun:bundle";

if (feature("FEAT_PREMIUM")) {
  console.log("Premium code that should be eliminated");
  const heavyPremiumLogic = {
    process: () => {
      // This entire block should disappear in free builds
      const data = new Array(100).fill(0).map((_, i) => ({
        id: i,
        premium: true,
        complex: {
          nested: {
            value: i * 2,
            metadata: \`premium_meta_\${i}\`
          }
        }
      }));
      return data;
    }
  };
  heavyPremiumLogic.process();
} else {
  console.log("Free tier code");
}
`;

    await Bun.write(testFile, testCode);

    try {
      // Build both versions
      execSync(
        `bun build --feature=FEAT_PREMIUM ${testFile} --outfile=${premiumOutput}`
      );
      execSync(`bun build ${testFile} --outfile=${freeOutput}`);

      const premiumContent = await Bun.file(premiumOutput).text();
      const freeContent = await Bun.file(freeOutput).text();

      // Premium build should contain premium-related strings
      expect(premiumContent).toContain("Premium code");
      expect(premiumContent).toContain("heavyPremiumLogic");

      // Free build should NOT contain premium-related strings
      expect(freeContent).not.toContain("heavyPremiumLogic");
      expect(freeContent).not.toContain("premium_meta");
      expect(freeContent).toContain("Free tier code");

      console.log("✅ Dead code elimination verified");
      console.log(`Premium content length: ${premiumContent.length}`);
      console.log(`Free content length: ${freeContent.length}`);
    } finally {
      try {
        unlinkSync(premiumOutput);
        unlinkSync(freeOutput);
        unlinkSync(testFile);
      } catch {}
    }
  });
});
