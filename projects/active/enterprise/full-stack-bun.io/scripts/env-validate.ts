#!/usr/bin/env bun
import { structuredLog } from "../src/shared/utils";

async function validateEnvironment() {
  structuredLog("🔍 Validating environment configuration...");

  const requiredEnvVars = [
    'NODE_ENV',
    'PORT',
    'HOST'
  ];

  const recommendedEnvVars = [
    'BUN_VERSION',
    'DATABASE_URL',
    'API_KEY',
    'SECRET_KEY'
  ];

  let allRequired = true;
  let issues: string[] = [];

  // Check required environment variables
  for (const envVar of requiredEnvVars) {
    if (!Bun.env[envVar]) {
      structuredLog(`❌ Required environment variable missing: ${envVar}`, "error");
      allRequired = false;
      issues.push(`Missing required: ${envVar}`);
    } else {
      structuredLog(`✅ Required: ${envVar} = ${Bun.env[envVar]}`);
    }
  }

  // Check recommended environment variables
  for (const envVar of recommendedEnvVars) {
    if (!Bun.env[envVar]) {
      structuredLog(`⚠️ Recommended environment variable missing: ${envVar}`, "warn");
      issues.push(`Missing recommended: ${envVar}`);
    } else {
      // Basic validation for sensitive vars
      if (envVar.includes('KEY') || envVar.includes('SECRET')) {
        if (Bun.env[envVar]!.length < 8) {
          structuredLog(`⚠️ ${envVar} appears to be too short (security risk)`, "warn");
          issues.push(`${envVar} too short`);
        } else {
          structuredLog(`✅ Recommended: ${envVar} = [HIDDEN]`);
        }
      } else {
        structuredLog(`✅ Recommended: ${envVar} = ${Bun.env[envVar]}`);
      }
    }
  }

  // Check Bun version compatibility
  const currentVersion = Bun.version;
  const requiredVersion = '1.3.0';

  if (currentVersion < requiredVersion) {
    structuredLog(`❌ Bun version ${currentVersion} is below required ${requiredVersion}`, "error");
    issues.push(`Bun version too old: ${currentVersion} < ${requiredVersion}`);
    allRequired = false;
  } else {
    structuredLog(`✅ Bun version: ${currentVersion}`);
  }

  // Check for .env file
  try {
    await Bun.file('.env').stat();
    structuredLog("✅ .env file found");
  } catch {
    structuredLog("⚠️ No .env file found", "warn");
    issues.push("No .env file");
  }

  // Check file permissions
  const criticalFiles = [
    'package.json',
    'bunfig.toml',
    'tsconfig.json'
  ];

  for (const file of criticalFiles) {
    try {
      await Bun.file(file).stat();
      structuredLog(`✅ Critical file exists: ${file}`);
    } catch {
      structuredLog(`❌ Critical file missing: ${file}`, "error");
      issues.push(`Missing file: ${file}`);
      allRequired = false;
    }
  }

  // Check network connectivity
  try {
    const response = await fetch('https://registry.npmjs.org/bun/latest', {
      signal: AbortSignal.timeout(5000)
    });
    if (response.ok) {
      structuredLog("✅ Network connectivity check passed");
    } else {
      structuredLog("⚠️ Network connectivity check failed", "warn");
      issues.push("Network issues detected");
    }
  } catch {
    structuredLog("⚠️ Network connectivity check failed", "warn");
    issues.push("Network issues detected");
  }

  // Summary
  if (allRequired && issues.length === 0) {
    structuredLog("🎉 Environment validation passed! All systems ready.", "info");
    process.exit(0);
  } else if (allRequired) {
    structuredLog(`⚠️ Environment validation passed with warnings. Issues: ${issues.join(', ')}`, "warn");
    process.exit(0);
  } else {
    structuredLog(`❌ Environment validation failed. Critical issues: ${issues.join(', ')}`, "error");
    process.exit(1);
  }
}

validateEnvironment();
