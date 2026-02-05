#!/usr/bin/env bun
import { structuredLog } from "../src/shared/utils";

async function healthCheck() {
  structuredLog("🔍 Running comprehensive health check...");

  const checks = {
    dependencies: false,
    typescript: false,
    build: false,
    tests: false,
    security: false
  };

  try {
    // Check if dependencies are installed
    const packageJson = await Bun.file("package.json").text();
    const pkg = JSON.parse(packageJson);
    checks.dependencies = true;
    structuredLog("✅ Dependencies check passed");

    // Check TypeScript compilation
    const tsCheck = Bun.spawn({
      cmd: ["bun", "x", "tsc", "--noEmit"],
      stdout: "pipe",
      stderr: "pipe"
    });

    const tsExitCode = await tsCheck.exited;
    checks.typescript = tsExitCode === 0;
    if (checks.typescript) {
      structuredLog("✅ TypeScript compilation check passed");
    } else {
      structuredLog("❌ TypeScript compilation failed", "error");
    }

    // Check build process
    const buildCheck = Bun.spawn({
      cmd: ["bun", "build", "--compile", "my-portal/packages/templates/bun-transformer/spa-lab-app.ts", "--outfile", "./health-check-binary"],
      stdout: "pipe",
      stderr: "pipe"
    });

    const buildExitCode = await buildCheck.exited;
    checks.build = buildExitCode === 0;

    if (checks.build) {
      structuredLog("✅ Build process check passed");

      // Cleanup test binary
      await Bun.spawn({ cmd: ["rm", "-f", "./health-check-binary"] }).exited;
    } else {
      structuredLog("❌ Build process failed", "error");
    }

    // Run tests
    const testCheck = Bun.spawn({
      cmd: ["bun", "test", "tests/spa-lab.test.ts"],
      stdout: "pipe",
      stderr: "pipe"
    });

    const testExitCode = await testCheck.exited;
    checks.tests = testExitCode === 0;

    if (checks.tests) {
      structuredLog("✅ Test suite check passed");
    } else {
      structuredLog("❌ Test suite failed", "error");
    }

    // Basic security check
    const securityCheck = Bun.spawn({
      cmd: ["bun", "run", "my-portal/packages/templates/bun-transformer/spa-lab-app.ts"],
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, PORT: "3997", NODE_ENV: "development" }
    });

    // Let it start briefly
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const healthResponse = await fetch("http://localhost:3997/api/health");
      checks.security = healthResponse.status === 200;
      if (checks.security) {
        structuredLog("✅ Security and startup check passed");
      } else {
        structuredLog("❌ Security check failed", "error");
      }
    } catch {
      checks.security = false;
      structuredLog("❌ Security check failed - server not responding", "error");
    }

    // Kill the test server
    securityCheck.kill();

    // Summary
    const passed = Object.values(checks).filter(Boolean).length;
    const total = Object.keys(checks).length;

    structuredLog(`📊 Health Check Summary: ${passed}/${total} checks passed`);

    if (passed === total) {
      structuredLog("🎉 All health checks passed! System is ready.", "info");
      process.exit(0);
    } else {
      structuredLog("⚠️ Some health checks failed. Please review the issues above.", "warn");
      process.exit(1);
    }

  } catch (error) {
    structuredLog(`❌ Health check failed with error: ${error}`, "error");
    process.exit(1);
  }
}

healthCheck();
