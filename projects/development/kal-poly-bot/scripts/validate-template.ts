#!/usr/bin/env bun

import { existsSync, readFileSync, statSync } from "fs";
import { join, resolve } from "path";
import { exit } from "process";

/**
 * Validate Surgical Precision Platform template structure
 * Ensures all required files and directories are present and correctly configured
 */

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  passed: string[];
}

const validateTemplate = (templatePath: string = "."): ValidationResult => {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    passed: [],
  };

  console.info("🔍 Validating Surgical Precision Platform template...");
  console.info(`📁 Template path: ${resolve(templatePath)}`);

  // Validate required files
  const requiredFiles = [
    "package.json",
    "README.md",
    "bunfig.toml",
    "eslint.config.js",
    "wrangler.toml",
    ".gitignore",
  ];

  console.info("\n📄 Checking required files...");
  requiredFiles.forEach((file) => {
    const filePath = join(templatePath, file);
    if (existsSync(filePath)) {
      const stats = statSync(filePath);
      if (stats.isFile() && stats.size > 0) {
        result.passed.push(`✅ ${file} (${stats.size} bytes)`);
      } else {
        result.errors.push(`❌ ${file} exists but is empty or not a file`);
        result.valid = false;
      }
    } else {
      result.errors.push(`❌ Missing required file: ${file}`);
      result.valid = false;
    }
  });

  // Validate required directories
  const requiredDirs = [
    "packages",
    "services",
    "data",
    "docs",
    "configs",
    "scripts",
    "utils",
    "workers",
    "demos",
  ];

  console.info("\n📁 Checking required directories...");
  requiredDirs.forEach((dir) => {
    const dirPath = join(templatePath, dir);
    if (existsSync(dirPath)) {
      const stats = statSync(dirPath);
      if (stats.isDirectory()) {
        result.passed.push(`✅ ${dir}/`);
      } else {
        result.errors.push(`❌ ${dir} exists but is not a directory`);
        result.valid = false;
      }
    } else {
      result.errors.push(`❌ Missing required directory: ${dir}/`);
      result.valid = false;
    }
  });

  // Validate package.json configuration
  console.info("\n⚙️ Checking package.json configuration...");
  try {
    const packageJson = JSON.parse(
      readFileSync(join(templatePath, "package.json"), "utf8")
    );

    // Check required fields
    const requiredFields = [
      "name",
      "version",
      "description",
      "workspaces",
      "scripts",
    ];
    requiredFields.forEach((field) => {
      if (packageJson[field]) {
        result.passed.push(`✅ package.json.${field}`);
      } else {
        result.errors.push(`❌ Missing package.json.${field}`);
        result.valid = false;
      }
    });

    // Check bun-create configuration
    if (packageJson["bun-create"]) {
      result.passed.push("✅ package.json.bun-create configuration");

      const bunCreate = packageJson["bun-create"];
      if (bunCreate.preinstall || bunCreate.postinstall || bunCreate.start) {
        result.passed.push("✅ bun-create hooks configured");
      } else {
        result.warnings.push("⚠️ No bun-create hooks configured");
      }
    } else {
      result.warnings.push("⚠️ No bun-create configuration found");
    }

    // Validate workspace configuration
    if (packageJson.workspaces && Array.isArray(packageJson.workspaces)) {
      const expectedWorkspaces = [
        "operation-surgical-precision",
        "surgical-precision-mcp",
      ];
      expectedWorkspaces.forEach((workspace) => {
        if (packageJson.workspaces.includes(workspace)) {
          result.passed.push(`✅ Workspace: ${workspace}`);
        } else {
          result.warnings.push(`⚠️ Expected workspace not found: ${workspace}`);
        }
      });
    }
  } catch {
    result.errors.push("❌ Failed to parse package.json");
    result.valid = false;
  }

  // Validate workspace directories exist
  console.info("\n📦 Checking workspace directories...");
  const workspaceDirs = [
    "operation-surgical-precision",
    "surgical-precision-mcp",
    "poly-kalshi-arb",
  ];

  workspaceDirs.forEach((workspace) => {
    const workspacePath = join(templatePath, workspace);
    if (existsSync(workspacePath)) {
      const stats = statSync(workspacePath);
      if (stats.isDirectory()) {
        result.passed.push(`✅ ${workspace}/`);

        // Check for package.json in workspace
        const workspacePackageJson = join(workspacePath, "package.json");
        if (existsSync(workspacePackageJson)) {
          result.passed.push(`✅ ${workspace}/package.json`);
        } else {
          result.warnings.push(`⚠️ ${workspace}/package.json not found`);
        }
      } else {
        result.errors.push(`❌ ${workspace} exists but is not a directory`);
        result.valid = false;
      }
    } else {
      result.warnings.push(`⚠️ Optional workspace not found: ${workspace}/`);
    }
  });

  // Validate data directory structure
  console.info("\n💾 Checking data directory structure...");
  const dataDirs = [
    "data/databases",
    "data/build-artifacts",
    "data/logs",
    "data/temp",
  ];

  dataDirs.forEach((dir) => {
    const dirPath = join(templatePath, dir);
    if (existsSync(dirPath)) {
      result.passed.push(`✅ ${dir}/`);
    } else {
      result.warnings.push(`⚠️ Data directory not found: ${dir}/`);
    }
  });

  // Validate docs directory structure
  console.info("\n📚 Checking documentation structure...");
  const docsDirs = ["docs/packages", "docs/workers", "docs/utils", "docs/root"];

  docsDirs.forEach((dir) => {
    const dirPath = join(templatePath, dir);
    if (existsSync(dirPath)) {
      result.passed.push(`✅ ${dir}/`);
    } else {
      result.warnings.push(`⚠️ Documentation directory not found: ${dir}/`);
    }
  });

  // Validate scripts directory
  console.info("\n🔧 Checking setup scripts...");
  const requiredScripts = [
    "scripts/setup-databases.ts",
    "scripts/setup-config.ts",
  ];

  requiredScripts.forEach((script) => {
    const scriptPath = join(templatePath, script);
    if (existsSync(scriptPath)) {
      result.passed.push(`✅ ${script}`);
    } else {
      result.warnings.push(`⚠️ Setup script not found: ${script}`);
    }
  });

  // Validate configuration files
  console.info("\n⚙️ Checking configuration files...");
  const configFiles = [
    "configs/team/alice.conf",
    "configs/deployment/cloudflare.conf",
    "configs/development.conf",
  ];

  configFiles.forEach((config) => {
    const configPath = join(templatePath, config);
    if (existsSync(configPath)) {
      result.passed.push(`✅ ${config}`);
    } else {
      result.warnings.push(`⚠️ Configuration file not found: ${config}`);
    }
  });

  return result;
};

const printValidationResult = (result: ValidationResult) => {
  console.info("\n" + "=".repeat(60));
  console.info("📊 VALIDATION RESULTS");
  console.info("=".repeat(60));

  if (result.passed.length > 0) {
    console.info("\n✅ PASSED CHECKS:");
    result.passed.forEach((check) => console.info(`   ${check}`));
  }

  if (result.warnings.length > 0) {
    console.info("\n⚠️ WARNINGS:");
    result.warnings.forEach((warning) => console.info(`   ${warning}`));
  }

  if (result.errors.length > 0) {
    console.info("\n❌ ERRORS:");
    result.errors.forEach((error) => console.info(`   ${error}`));
  }

  console.info("\n" + "=".repeat(60));
  console.info(`🎯 OVERALL STATUS: ${result.valid ? "✅ VALID" : "❌ INVALID"}`);
  console.info(`📈 Passed: ${result.passed.length}`);
  console.info(`⚠️ Warnings: ${result.warnings.length}`);
  console.info(`❌ Errors: ${result.errors.length}`);
  console.info("=".repeat(60));

  if (result.valid) {
    console.info("\n🎉 Template is ready for use!");
    console.info(
      "💡 Run 'bun create surgical-precision-platform <project-name>' to create a new project"
    );
  } else {
    console.info("\n🔧 Please fix the errors before using this template");
    console.info("💡 Refer to the documentation for setup instructions");
  }
};

// Run validation
if (import.meta.main) {
  const templatePath = process.argv[2] || ".";

  try {
    const result = validateTemplate(templatePath);
    printValidationResult(result);
    exit(result.valid ? 0 : 1);
  } catch (error) {
    console.error("❌ Validation failed:", error);
    exit(1);
  }
}

export { ValidationResult, validateTemplate };
