#!/usr/bin/env bun

/**
 * Registry CLI - Command-line interface for FactoryWager Registry
 * 
 * Provides commands for managing workspaces, packages, tests, and benchmarks
 * in the R2-based registry system.
 */

import { Command } from "commander";
import { RootCatalogManager } from "./root-catalog.js";
import { R2RegistryStorage } from "./r2-storage.js";
import { PackageBundler } from "./package-bundler.js";
import { WorkspaceManager } from "./workspace-manager.js";

const program = new Command();

// Initialize registry components
function initializeRegistry() {
  const catalogManager = new RootCatalogManager();
  const r2Config = {
    accountId: process.env.R2_ACCOUNT_ID!,
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    bucketName: process.env.R2_BUCKET_NAME!,
    endpoint: process.env.R2_ENDPOINT,
    region: process.env.R2_REGION || "auto"
  };
  
  const r2Storage = new R2RegistryStorage(r2Config);
  const packageBundler = new PackageBundler(r2Storage);
  const workspaceManager = new WorkspaceManager(catalogManager, r2Storage, packageBundler);
  
  return { catalogManager, r2Storage, packageBundler, workspaceManager };
}

// Enhanced logging
function logInfo(message: string, data?: any): void {
  if (data) {
    console.info(`ℹ️  ${message}: %j`, data);
  } else {
    console.info(`ℹ️  ${message}`);
  }
}

function logSuccess(message: string, data?: any): void {
  if (data) {
    console.info(`✅ ${message}: %j`, data);
  } else {
    console.info(`✅ ${message}`);
  }
}

function logError(message: string, error?: any): void {
  if (error) {
    console.error(`❌ ${message}: %j`, error);
  } else {
    console.error(`❌ ${message}`);
  }
}

function logWarning(message: string, data?: any): void {
  if (data) {
    console.warn(`⚠️  ${message}: %j`, data);
  } else {
    console.warn(`⚠️  ${message}`);
  }
}

program
  .name("factory-wager-registry")
  .description("FactoryWager Registry CLI - Manage workspaces, packages, tests, and benchmarks")
  .version("1.0.0");

// Catalog commands
program
  .command("catalog:init")
  .description("Initialize root catalog")
  .option("-n, --name <name>", "Catalog name", "FactoryWager Registry")
  .option("-d, --description <description>", "Catalog description")
  .action(async (options) => {
    try {
      const { catalogManager } = initializeRegistry();
      
      const catalog = catalogManager.initialize({
        name: options.name,
        description: options.description
      });
      
      logSuccess("Root catalog initialized", {
        name: catalog.metadata.name,
        version: catalog.version,
        workspaces: Object.keys(catalog.workspaces).length
      });
    } catch (error) {
      logError("Failed to initialize catalog", error);
      process.exit(1);
    }
  });

program
  .command("catalog:stats")
  .description("Show catalog statistics")
  .action(async () => {
    try {
      const { catalogManager } = initializeRegistry();
      
      const stats = catalogManager.getStatistics();
      
      console.info("📊 Registry Statistics");
      console.info("=======================");
      console.info(`Total Workspaces: ${stats.totalWorkspaces}`);
      console.info(`Total Packages: ${stats.totalPackages}`);
      console.info(`Total Tests: ${stats.totalTests}`);
      console.info(`Total Benchmarks: ${stats.totalBenchmarks}`);
      console.info(`Total Entries: ${stats.totalEntries}`);
      
      console.info("\n📈 By Type:");
      Object.entries(stats.types).forEach(([type, count]) => {
        console.info(`  ${type}: ${count}`);
      });
      
      console.info("\n📂 By Category:");
      Object.entries(stats.categories).forEach(([category, count]) => {
        console.info(`  ${category}: ${count}`);
      });
    } catch (error) {
      logError("Failed to get catalog stats", error);
      process.exit(1);
    }
  });

program
  .command("catalog:validate")
  .description("Validate catalog integrity")
  .action(async () => {
    try {
      const { catalogManager } = initializeRegistry();
      
      const validation = catalogManager.validate();
      
      if (validation.valid) {
        logSuccess("Catalog validation passed");
      } else {
        logError("Catalog validation failed");
        console.info("\n❌ Errors:");
        validation.errors.forEach(error => console.info(`  - ${error}`));
        
        if (validation.warnings.length > 0) {
          console.info("\n⚠️  Warnings:");
          validation.warnings.forEach(warning => console.info(`  - ${warning}`));
        }
        
        process.exit(1);
      }
    } catch (error) {
      logError("Failed to validate catalog", error);
      process.exit(1);
    }
  });

// Workspace commands
program
  .command("workspace:create <path>")
  .description("Create workspace from directory")
  .option("-d, --dry-run", "Dry run without creating")
  .action(async (path, options) => {
    try {
      const { workspaceManager } = initializeRegistry();
      
      if (options.dryRun) {
        logInfo("Dry run mode - workspace would be created", { path });
        return;
      }
      
      logInfo("Creating workspace", { path });
      
      const workspace = await workspaceManager.createWorkspace(path);
      
      logSuccess("Workspace created", {
        id: workspace.id,
        name: workspace.name,
        type: workspace.type,
        packages: workspace.packages.length
      });
      
      console.info(`\n📦 Packages in workspace:`);
      workspace.packages.forEach(packageId => {
        const pkg = workspaceManager.getWorkspacePackages(workspace.id).find(p => p.id === packageId);
        if (pkg) {
          console.info(`  - ${pkg.name} (${pkg.type})`);
        }
      });
    } catch (error) {
      logError("Failed to create workspace", error);
      process.exit(1);
    }
  });

program
  .command("workspace:list")
  .description("List all workspaces")
  .option("-t, --type <type>", "Filter by type")
  .action(async (options) => {
    try {
      const { workspaceManager } = initializeRegistry();
      
      let workspaces = workspaceManager.getAllWorkspaces();
      
      if (options.type) {
        workspaces = workspaces.filter(ws => ws.type === options.type);
      }
      
      console.info("🏢 Workspaces");
      console.info("=============");
      
      if (workspaces.length === 0) {
        console.info("No workspaces found");
        return;
      }
      
      workspaces.forEach(workspace => {
        console.info(`${workspace.name} (${workspace.type})`);
        console.info(`  ID: ${workspace.id}`);
        console.info(`  Path: ${workspace.path}`);
        console.info(`  Packages: ${workspace.packages.length}`);
        console.info(`  Created: ${new Date(workspace.createdAt).toLocaleDateString()}`);
        console.info("");
      });
    } catch (error) {
      logError("Failed to list workspaces", error);
      process.exit(1);
    }
  });

program
  .command("workspace:packages <workspaceId>")
  .description("List packages in workspace")
  .action(async (workspaceId) => {
    try {
      const { workspaceManager } = initializeRegistry();
      
      const workspace = workspaceManager.getWorkspace(workspaceId);
      if (!workspace) {
        logError("Workspace not found", { workspaceId });
        process.exit(1);
      }
      
      const packages = workspaceManager.getWorkspacePackages(workspaceId);
      
      console.info(`📦 Packages in ${workspace.name}`);
      console.info("==============================");
      
      if (packages.length === 0) {
        console.info("No packages found");
        return;
      }
      
      packages.forEach(pkg => {
        console.info(`${pkg.name} (${pkg.type})`);
        console.info(`  Version: ${pkg.version}`);
        console.info(`  Description: ${pkg.description}`);
        console.info(`  Tests: ${pkg.tests.length}`);
        console.info(`  Benchmarks: ${pkg.benchmarks.length}`);
        console.info("");
      });
    } catch (error) {
      logError("Failed to get workspace packages", error);
      process.exit(1);
    }
  });

// Package commands
program
  .command("package:bundle <path>")
  .description("Bundle package")
  .option("-t, --target <target>", "Build target (dev|prod|library)", "prod")
  .option("-o, --output <output>", "Output directory", "./dist")
  .action(async (path, options) => {
    try {
      const { packageBundler, catalogManager } = initializeRegistry();
      
      logInfo("Bundling package", { path, target: options.target });
      
      // Load package metadata
      const packageConfig = await loadPackageConfig(path);
      const packageId = generatePackageId(packageConfig.name);
      
      let bundleResult;
      switch (options.target) {
        case "dev":
          bundleResult = await packageBundler.createDevBundle(path, packageConfig);
          break;
        case "prod":
          bundleResult = await packageBundler.createProdBundle(path, packageConfig);
          break;
        case "library":
          const libraryBundles = await packageBundler.createLibraryBundle(path, packageConfig);
          logSuccess("Library bundles created", {
            esm: libraryBundles.esm.success,
            cjs: libraryBundles.cjs.success
          });
          return;
        default:
          throw new Error(`Invalid target: ${options.target}`);
      }
      
      if (!bundleResult.success) {
        logError("Bundle failed", bundleResult.error);
        process.exit(1);
      }
      
      // Write bundle to output
      const outputPath = `${options.output}/${packageConfig.name}.bundle.js`;
      await Bun.write(outputPath, bundleResult.bundle!);
      
      logSuccess("Package bundled", {
        name: packageConfig.name,
        size: bundleResult.bundle!.length,
        output: outputPath
      });
      
      if (bundleResult.metadata) {
        console.info("\n📊 Bundle Statistics:");
        console.info(`  Size: ${bundleResult.metadata.size} bytes`);
        console.info(`  Hash: ${bundleResult.metadata.hash}`);
        console.info(`  Dependencies: ${bundleResult.metadata.dependencies.length}`);
        console.info(`  Exports: ${bundleResult.metadata.exports.length}`);
      }
    } catch (error) {
      logError("Failed to bundle package", error);
      process.exit(1);
    }
  });

// Storage commands
program
  .command("storage:sync")
  .description("Sync catalog to R2 storage")
  .action(async () => {
    try {
      const { catalogManager, r2Storage } = initializeRegistry();
      
      logInfo("Syncing catalog to R2 storage");
      
      const catalog = catalogManager.getCatalog();
      const result = await r2Storage.storeCatalog(catalog);
      
      if (!result.success) {
        logError("Failed to sync catalog", result.error);
        process.exit(1);
      }
      
      logSuccess("Catalog synced to R2", {
        key: result.key,
        size: result.size,
        etag: result.etag
      });
    } catch (error) {
      logError("Failed to sync catalog", error);
      process.exit(1);
    }
  });

program
  .command("storage:stats")
  .description("Show R2 storage statistics")
  .action(async () => {
    try {
      const { r2Storage } = initializeRegistry();
      
      const stats = await r2Storage.getStorageStatistics();
      
      console.info("💾 R2 Storage Statistics");
      console.info("========================");
      console.info(`Total Packages: ${stats.totalPackages}`);
      console.info(`Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
      console.info(`Total Tests: ${stats.totalTests}`);
      console.info(`Total Benchmarks: ${stats.totalBenchmarks}`);
      console.info(`Last Updated: ${new Date(stats.lastUpdated).toLocaleString()}`);
    } catch (error) {
      logError("Failed to get storage stats", error);
      process.exit(1);
    }
  });

program
  .command("storage:list")
  .description("List packages in R2 storage")
  .action(async () => {
    try {
      const { r2Storage } = initializeRegistry();
      
      const packages = await r2Storage.listPackages();
      
      console.info("📦 Packages in R2 Storage");
      console.info("==========================");
      
      if (packages.length === 0) {
        console.info("No packages found");
        return;
      }
      
      for (const packageId of packages) {
        const metadata = await r2Storage.getPackageMetadata(packageId);
        if (metadata) {
          console.info(`${metadata.name} (${metadata.version})`);
          console.info(`  ID: ${packageId}`);
          console.info(`  Size: ${metadata.metadata.size} bytes`);
          console.info(`  Hash: ${metadata.metadata.hash}`);
          console.info("");
        }
      }
    } catch (error) {
      logError("Failed to list packages", error);
      process.exit(1);
    }
  });

// Search commands
program
  .command("search <query>")
  .description("Search catalog")
  .option("-t, --type <type>", "Filter by type")
  .option("-c, --category <category>", "Filter by category")
  .option("-w, --workspace <workspace>", "Filter by workspace")
  .action(async (query, options) => {
    try {
      const { catalogManager } = initializeRegistry();
      
      const results = catalogManager.search({
        keyword: query,
        type: options.type,
        category: options.category,
        workspace: options.workspace
      });
      
      console.info(`🔍 Search Results for "${query}"`);
      console.info("===============================");
      
      console.info(`\n🏢 Workspaces (${results.workspaces.length}):`);
      results.workspaces.forEach(ws => {
        console.info(`  - ${ws.name} (${ws.type})`);
      });
      
      console.info(`\n📦 Packages (${results.packages.length}):`);
      results.packages.forEach(pkg => {
        console.info(`  - ${pkg.name} v${pkg.version} (${pkg.type})`);
      });
      
      console.info(`\n🧪 Tests (${results.tests.length}):`);
      results.tests.forEach(test => {
        console.info(`  - ${test.name} (${test.type})`);
      });
      
      console.info(`\n⚡ Benchmarks (${results.benchmarks.length}):`);
      results.benchmarks.forEach(bench => {
        console.info(`  - ${bench.name} (${bench.type})`);
      });
    } catch (error) {
      logError("Failed to search catalog", error);
      process.exit(1);
    }
  });

// Utility functions
async function loadPackageConfig(packagePath: string) {
  const packageJsonPath = `${packagePath}/package.json`;
  
  if (!Bun.file(packageJsonPath).exists()) {
    throw new Error(`package.json not found: ${packageJsonPath}`);
  }
  
  const packageJsonContent = await Bun.file(packageJsonPath).text();
  const packageJson = JSON.parse(packageJsonContent);
  
  return {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description || "",
    main: packageJson.main,
    module: packageJson.module,
    types: packageJson.types,
    exports: packageJson.exports,
    dependencies: packageJson.dependencies || {},
    devDependencies: packageJson.devDependencies || {},
    peerDependencies: packageJson.peerDependencies,
    scripts: packageJson.scripts || {},
    files: packageJson.files || []
  };
}

function generatePackageId(name: string): string {
  return `package-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
}

// Error handling
process.on("uncaughtException", (error) => {
  logError("Uncaught exception", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logError("Unhandled rejection", { reason, promise });
  process.exit(1);
});

// Parse command line arguments
program.parse();

export default program;
