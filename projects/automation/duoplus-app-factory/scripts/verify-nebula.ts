#!/usr/bin/env bun

/**
 * Nebula-Flow™ Verification Script
 * Verifies all components are properly installed and configured
 */

import { NebulaLogger } from "../src/nebula/logger.js";

const fs = require("fs");
const path = require("path");

interface VerificationResult {
  component: string;
  status: "✅" | "❌" | "⚠️";
  message: string;
}

export async function verifyNebulaFlow(): Promise<{
  success: boolean;
  results: VerificationResult[];
  summary: string;
}> {
  const results: VerificationResult[] = [];

  try {
    NebulaLogger.log("Verify-Nebula", "info", "Starting Nebula-Flow™ verification");

    // Check core components
    const components = [
      { name: "Logger Service", path: "src/nebula/logger.ts" },
      { name: "Risk Engine", path: "src/nebula/riskEngine.ts" },
      { name: "Signal Store", path: "src/nebula/signalStore.ts" },
      { name: "Orbit-Assign", path: "src/nebula/orbitAssign.ts" },
      { name: "AI Inference", path: "src/ai/inference.ts" },
      { name: "Training Script", path: "scripts/train-anomaly.ts" },
      { name: "Deployment Script", path: "scripts/nebula-harden.ts" },
      { name: "Build Script", path: "scripts/ai-build.ts" },
    ];

    for (const component of components) {
      const filePath = path.join(process.cwd(), component.path);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const size = stats.size;
        results.push({
          component: component.name,
          status: "✅",
          message: `Found (${size} bytes)`,
        });
      } else {
        results.push({
          component: component.name,
          status: "❌",
          message: "Not found",
        });
      }
    }

    // Check configuration files
    const configFiles = [
      { name: "package.json", path: "package.json" },
      { name: ".env.example", path: ".env.example" },
      { name: "NEBULA_FLOW_HARDENING.md", path: "NEBULA_FLOW_HARDENING.md" },
      { name: "NEBULA_QUICK_START.md", path: "NEBULA_QUICK_START.md" },
      { name: "NEBULA_DEPLOYMENT_SUMMARY.md", path: "NEBULA_DEPLOYMENT_SUMMARY.md" },
    ];

    for (const config of configFiles) {
      const filePath = path.join(process.cwd(), config.path);
      if (fs.existsSync(filePath)) {
        results.push({
          component: config.name,
          status: "✅",
          message: "Found",
        });
      } else {
        results.push({
          component: config.name,
          status: "❌",
          message: "Not found",
        });
      }
    }

    // Check package.json for required dependencies
    const packageJsonPath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      
      const requiredDeps = ["redis", "onnxruntime-web"];
      for (const dep of requiredDeps) {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
          results.push({
            component: `Dependency: ${dep}`,
            status: "✅",
            message: `Version: ${packageJson.dependencies[dep]}`,
          });
        } else {
          results.push({
            component: `Dependency: ${dep}`,
            status: "⚠️",
            message: "Not installed (run: bun add redis onnxruntime-web)",
          });
        }
      }

      const requiredScripts = ["nebula:harden", "ai:build", "ai:train", "nebula:deploy"];
      for (const script of requiredScripts) {
        if (packageJson.scripts && packageJson.scripts[script]) {
          results.push({
            component: `Script: ${script}`,
            status: "✅",
            message: "Found",
          });
        } else {
          results.push({
            component: `Script: ${script}`,
            status: "❌",
            message: "Not found in package.json",
          });
        }
      }
    }

    // Check directories
    const directories = [
      { name: "logs", path: "logs" },
      { name: "data", path: "data" },
      { name: "src/nebula", path: "src/nebula" },
      { name: "src/ai", path: "src/ai" },
      { name: "scripts", path: "scripts" },
    ];

    for (const dir of directories) {
      const dirPath = path.join(process.cwd(), dir.path);
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        results.push({
          component: `Directory: ${dir.name}`,
          status: "✅",
          message: "Exists",
        });
      } else {
        results.push({
          component: `Directory: ${dir.name}`,
          status: "⚠️",
          message: "Will be created on deployment",
        });
      }
    }

    // Check Redis connectivity
    try {
      const { createClient } = await import("redis");
      const redis = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
      await redis.connect();
      await redis.ping();
      await redis.quit();
      results.push({
        component: "Redis Connection",
        status: "✅",
        message: "Connected successfully",
      });
    } catch (error) {
      results.push({
        component: "Redis Connection",
        status: "⚠️",
        message: error instanceof Error ? error.message : "Connection failed",
      });
    }

    // Summary
    const success = results.filter(r => r.status === "❌").length === 0;
    const warnings = results.filter(r => r.status === "⚠️").length;
    const passed = results.filter(r => r.status === "✅").length;

    const summary = `
Nebula-Flow™ Verification Results
=================================
Total Checks: ${results.length}
Passed: ${passed}
Warnings: ${warnings}
Failed: ${results.filter(r => r.status === "❌").length}

Status: ${success ? "✅ READY" : "⚠️ NEEDS ATTENTION"}
`;

    NebulaLogger.log("Verify-Nebula", "info", "Verification completed", {
      passed,
      warnings,
      failed: results.filter(r => r.status === "❌").length,
    });

    return {
      success,
      results,
      summary,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    NebulaLogger.log("Verify-Nebula", "error", "Verification failed", {
      error: errorMessage,
    });

    return {
      success: false,
      results: [],
      summary: `Verification failed: ${errorMessage}`,
    };
  }
}

// Run if called directly
if (require.main === module) {
  verifyNebulaFlow()
    .then((result) => {
      console.info("\n" + "=".repeat(60));
      console.info("Nebula-Flow™ Hardening Pack v1.4 - Verification");
      console.info("=".repeat(60) + "\n");

      // Group results by status
      const grouped = {
        passed: result.results.filter(r => r.status === "✅"),
        warnings: result.results.filter(r => r.status === "⚠️"),
        failed: result.results.filter(r => r.status === "❌"),
      };

      if (grouped.passed.length > 0) {
        console.info("✅ PASSED:");
        grouped.passed.forEach(r => {
          console.info(`  ${r.component.padEnd(30)} ${r.message}`);
        });
        console.info();
      }

      if (grouped.warnings.length > 0) {
        console.info("⚠️  WARNINGS:");
        grouped.warnings.forEach(r => {
          console.info(`  ${r.component.padEnd(30)} ${r.message}`);
        });
        console.info();
      }

      if (grouped.failed.length > 0) {
        console.info("❌ FAILED:");
        grouped.failed.forEach(r => {
          console.info(`  ${r.component.padEnd(30)} ${r.message}`);
        });
        console.info();
      }

      console.info(result.summary);

      if (result.success) {
        console.info("🎉 Nebula-Flow™ is ready for deployment!");
        console.info("\nNext Steps:");
        console.info("  1. cp .env.example .env");
        console.info("  2. Edit .env with your settings");
        console.info("  3. bun run nebula:deploy");
      } else {
        console.info("⚠️  Please fix the issues above before deployment");
      }

      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Verification failed:", error);
      process.exit(1);
    });
}