/**
 * Workspace Manager for FactoryWager Registry
 * 
 * Manages workspaces, their packages, and relationships in the registry system.
 */

import { WorkspaceMetadata, PackageMetadata, TestMetadata, BenchmarkMetadata } from "./root-catalog.js";
import { RootCatalogManager } from "./root-catalog.js";
import { R2RegistryStorage } from "./r2-storage.js";
import { PackageBundler } from "./package-bundler.js";

export interface WorkspaceConfig {
  name: string;
  description: string;
  type: "application" | "library" | "cli" | "service" | "tool";
  path: string;
  packages: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  metadata: {
    entry?: string;
    main?: string;
    module?: string;
    types?: string;
    exports?: Record<string, string>;
    bun?: Record<string, any>;
  };
}

export interface PackageConfig {
  name: string;
  version: string;
  description: string;
  type: "library" | "cli" | "service" | "tool" | "test" | "benchmark";
  main?: string;
  module?: string;
  types?: string;
  exports?: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies?: Record<string, string>;
  scripts: Record<string, string>;
  files: string[];
  tests: string[];
  benchmarks: string[];
  assets: string[];
}

export class WorkspaceManager {
  private catalogManager: RootCatalogManager;
  private r2Storage: R2RegistryStorage;
  private packageBundler: PackageBundler;

  constructor(
    catalogManager: RootCatalogManager,
    r2Storage: R2RegistryStorage,
    packageBundler: PackageBundler
  ) {
    this.catalogManager = catalogManager;
    this.r2Storage = r2Storage;
    this.packageBundler = packageBundler;
  }

  /**
   * Create workspace from directory structure
   */
  async createWorkspace(workspacePath: string): Promise<WorkspaceMetadata> {
    const config = await this.loadWorkspaceConfig(workspacePath);
    const workspaceId = this.generateWorkspaceId(config.name);
    
    // Discover packages in workspace
    const packages = await this.discoverPackages(workspacePath);
    
    const workspaceMetadata: WorkspaceMetadata = {
      id: workspaceId,
      name: config.name,
      description: config.description,
      type: config.type,
      path: workspacePath,
      packages: packages.map(pkg => pkg.id),
      dependencies: config.dependencies,
      devDependencies: config.devDependencies,
      scripts: config.scripts,
      metadata: config.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add to catalog
    this.catalogManager.addWorkspace(workspaceMetadata);
    
    // Process packages
    for (const packageConfig of packages) {
      await this.processPackage(workspaceId, packageConfig, workspacePath);
    }

    return workspaceMetadata;
  }

  /**
   * Load workspace configuration
   */
  private async loadWorkspaceConfig(workspacePath: string): Promise<WorkspaceConfig> {
    const configPath = `${workspacePath}/workspace.json`;
    
    if (!Bun.file(configPath).exists()) {
      throw new Error(`Workspace config not found: ${configPath}`);
    }

    const configContent = await Bun.file(configPath).text();
    const config = JSON.parse(configContent);
    
    return {
      name: config.name,
      description: config.description || "",
      type: config.type || "library",
      path: workspacePath,
      packages: config.packages || [],
      dependencies: config.dependencies || {},
      devDependencies: config.devDependencies || {},
      scripts: config.scripts || {},
      metadata: config.metadata || {}
    };
  }

  /**
   * Discover packages in workspace
   */
  private async discoverPackages(workspacePath: string): Promise<PackageConfig[]> {
    const packages: PackageConfig[] = [];
    
    // Look for package.json files
    const entries = await Array.fromAsync(Bun.scan(workspacePath));
    
    for (const entry of entries) {
      if (entry.isFile && entry.path.endsWith("package.json")) {
        try {
          const packageConfig = await this.loadPackageConfig(entry.path);
          packages.push(packageConfig);
        } catch (error) {
          console.warn(`Failed to load package config from ${entry.path}:`, error);
        }
      }
    }
    
    return packages;
  }

  /**
   * Load package configuration
   */
  private async loadPackageConfig(packagePath: string): Promise<PackageConfig> {
    const configContent = await Bun.file(packagePath).text();
    const packageJson = JSON.parse(configContent);
    
    // Extract directory path
    const dirPath = packagePath.replace("/package.json", "");
    
    return {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description || "",
      type: this.inferPackageType(packageJson),
      main: packageJson.main,
      module: packageJson.module,
      types: packageJson.types,
      exports: packageJson.exports,
      dependencies: packageJson.dependencies || {},
      devDependencies: packageJson.devDependencies || {},
      peerDependencies: packageJson.peerDependencies,
      scripts: packageJson.scripts || {},
      files: packageJson.files || [],
      tests: await this.findTestFiles(dirPath),
      benchmarks: await this.findBenchmarkFiles(dirPath),
      assets: await this.findAssetFiles(dirPath)
    };
  }

  /**
   * Infer package type from package.json
   */
  private inferPackageType(packageJson: any): PackageConfig["type"] {
    if (packageJson.bin) return "cli";
    if (packageJson.main?.includes("server") || packageJson.scripts?.serve) return "service";
    if (packageJson.name?.includes("test")) return "test";
    if (packageJson.name?.includes("bench")) return "benchmark";
    if (packageJson.exports?.["./service"]) return "service";
    return "library";
  }

  /**
   * Find test files in package directory
   */
  private async findTestFiles(packagePath: string): Promise<string[]> {
    const testFiles: string[] = [];
    const entries = await Array.fromAsync(Bun.scan(packagePath));
    
    for (const entry of entries) {
      if (entry.isFile && (
        entry.path.endsWith(".test.ts") ||
        entry.path.endsWith(".test.js") ||
        entry.path.endsWith(".spec.ts") ||
        entry.path.endsWith(".spec.js")
      )) {
        // Get relative path from package root
        const relativePath = entry.path.replace(packagePath + "/", "");
        testFiles.push(relativePath);
      }
    }
    
    return testFiles;
  }

  /**
   * Find benchmark files in package directory
   */
  private async findBenchmarkFiles(packagePath: string): Promise<string[]> {
    const benchmarkFiles: string[] = [];
    const entries = await Array.fromAsync(Bun.scan(packagePath));
    
    for (const entry of entries) {
      if (entry.isFile && (
        entry.path.endsWith(".bench.ts") ||
        entry.path.endsWith(".bench.js") ||
        entry.path.endsWith(".benchmark.ts") ||
        entry.path.endsWith(".benchmark.js")
      )) {
        // Get relative path from package root
        const relativePath = entry.path.replace(packagePath + "/", "");
        benchmarkFiles.push(relativePath);
      }
    }
    
    return benchmarkFiles;
  }

  /**
   * Find asset files in package directory
   */
  private async findAssetFiles(packagePath: string): Promise<string[]> {
    const assetFiles: string[] = [];
    const entries = await Array.fromAsync(Bun.scan(packagePath));
    
    for (const entry of entries) {
      if (entry.isFile && (
        entry.path.endsWith(".json") ||
        entry.path.endsWith(".md") ||
        entry.path.endsWith(".yml") ||
        entry.path.endsWith(".yaml") ||
        entry.path.endsWith(".toml") ||
        entry.path.endsWith(".png") ||
        entry.path.endsWith(".jpg") ||
        entry.path.endsWith(".svg") ||
        entry.path.endsWith(".css")
      )) {
        // Get relative path from package root
        const relativePath = entry.path.replace(packagePath + "/", "");
        assetFiles.push(relativePath);
      }
    }
    
    return assetFiles;
  }

  /**
   * Process individual package
   */
  private async processPackage(
    workspaceId: string,
    packageConfig: PackageConfig,
    workspacePath: string
  ): Promise<void> {
    const packageId = this.generatePackageId(packageConfig.name);
    const packagePath = `${workspacePath}/${packageConfig.name}`;
    
    const packageMetadata: PackageMetadata = {
      id: packageId,
      name: packageConfig.name,
      version: packageConfig.version,
      description: packageConfig.description,
      workspaceId,
      type: packageConfig.type,
      path: packagePath,
      main: packageConfig.main,
      module: packageConfig.module,
      types: packageConfig.types,
      exports: packageConfig.exports,
      dependencies: packageConfig.dependencies,
      devDependencies: packageConfig.devDependencies,
      peerDependencies: packageConfig.peerDependencies,
      scripts: packageConfig.scripts,
      files: packageConfig.files,
      tests: packageConfig.tests,
      benchmarks: packageConfig.benchmarks,
      assets: packageConfig.assets,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add to catalog
    this.catalogManager.addPackage(packageMetadata);
    
    // Process tests
    await this.processTests(packageId, packageConfig.tests, packagePath);
    
    // Process benchmarks
    await this.processBenchmarks(packageId, packageConfig.benchmarks, packagePath);
    
    // Bundle and store package
    await this.bundleAndStorePackage(packageMetadata, packagePath);
  }

  /**
   * Process test files
   */
  private async processTests(
    packageId: string,
    testFiles: string[],
    packagePath: string
  ): Promise<void> {
    for (const testFile of testFiles) {
      const testId = this.generateTestId(testFile);
      const testPath = `${packagePath}/${testFile}`;
      
      const testMetadata: TestMetadata = {
        id: testId,
        packageId,
        name: testFile.replace(/\.(test|spec)\.(ts|js)$/, ""),
        path: testFile,
        type: this.inferTestType(testFile),
        framework: this.inferTestFramework(testFile),
        dependencies: await this.findTestDependencies(testPath),
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.catalogManager.addTest(testMetadata);
    }
  }

  /**
   * Process benchmark files
   */
  private async processBenchmarks(
    packageId: string,
    benchmarkFiles: string[],
    packagePath: string
  ): Promise<void> {
    for (const benchmarkFile of benchmarkFiles) {
      const benchmarkId = this.generateBenchmarkId(benchmarkFile);
      const benchmarkPath = `${packagePath}/${benchmarkFile}`;
      
      const benchmarkMetadata: BenchmarkMetadata = {
        id: benchmarkId,
        packageId,
        name: benchmarkFile.replace(/\.(bench|benchmark)\.(ts|js)$/, ""),
        path: benchmarkFile,
        type: this.inferBenchmarkType(benchmarkFile),
        framework: this.inferBenchmarkFramework(benchmarkFile),
        metrics: await this.findBenchmarkMetrics(benchmarkPath),
        dependencies: await this.findBenchmarkDependencies(benchmarkPath),
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.catalogManager.addBenchmark(benchmarkMetadata);
    }
  }

  /**
   * Bundle and store package
   */
  private async bundleAndStorePackage(
    metadata: PackageMetadata,
    packagePath: string
  ): Promise<void> {
    const bundleResult = await this.packageBundler.createBundle(packagePath, metadata);
    
    if (!bundleResult.success) {
      throw new Error(`Failed to bundle package ${metadata.name}: ${bundleResult.error}`);
    }

    // Store in R2
    const storageResult = await this.r2Storage.bundleAndStorePackage(packagePath, metadata, {
      includeTests: true,
      includeBenchmarks: true,
      minify: true,
      compression: "gzip",
      integrity: "sha256"
    });

    if (!storageResult.success) {
      throw new Error(`Failed to store package ${metadata.name}: ${storageResult.error}`);
    }
  }

  /**
   * Infer test type from filename
   */
  private inferTestType(filename: string): TestMetadata["type"] {
    if (filename.includes("integration")) return "integration";
    if (filename.includes("e2e")) return "e2e";
    if (filename.includes("performance")) return "performance";
    return "unit";
  }

  /**
   * Infer test framework from filename or content
   */
  private async inferTestFramework(filename: string): Promise<TestMetadata["framework"]> {
    // Default to bun:test for FactoryWager
    return "bun:test";
  }

  /**
   * Find test dependencies
   */
  private async findTestDependencies(testPath: string): Promise<string[]> {
    const dependencies = new Set<string>();
    
    try {
      const content = await Bun.file(testPath).text();
      
      // Find import statements
      const importRegex = /import\s+.*?\s+from\s+["']([^"']+)["']/g;
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        dependencies.add(match[1]);
      }
    } catch (error) {
      console.warn(`Failed to analyze test dependencies for ${testPath}:`, error);
    }
    
    return Array.from(dependencies);
  }

  /**
   * Infer benchmark type from filename
   */
  private inferBenchmarkType(filename: string): BenchmarkMetadata["type"] {
    if (filename.includes("memory")) return "memory";
    if (filename.includes("throughput")) return "throughput";
    if (filename.includes("latency")) return "latency";
    return "performance";
  }

  /**
   * Infer benchmark framework from filename
   */
  private async inferBenchmarkFramework(filename: string): Promise<BenchmarkMetadata["framework"]> {
    // Default to bun:bench for FactoryWager
    return "bun:bench";
  }

  /**
   * Find benchmark metrics
   */
  private async findBenchmarkMetrics(benchmarkPath: string): Promise<string[]> {
    const metrics = new Set<string>();
    
    try {
      const content = await Bun.file(benchmarkPath).text();
      
      // Find common metric patterns
      const metricPatterns = [
        /bench\s*\(\s*["']([^"']+)["']/g,
        /measure\s*\(\s*["']([^"']+)["']/g,
        /time\s*\(\s*["']([^"']+)["']/g
      ];
      
      for (const pattern of metricPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          metrics.add(match[1]);
        }
      }
    } catch (error) {
      console.warn(`Failed to analyze benchmark metrics for ${benchmarkPath}:`, error);
    }
    
    return Array.from(metrics);
  }

  /**
   * Find benchmark dependencies
   */
  private async findBenchmarkDependencies(benchmarkPath: string): Promise<string[]> {
    const dependencies = new Set<string>();
    
    try {
      const content = await Bun.file(benchmarkPath).text();
      
      // Find import statements
      const importRegex = /import\s+.*?\s+from\s+["']([^"']+)["']/g;
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        dependencies.add(match[1]);
      }
    } catch (error) {
      console.warn(`Failed to analyze benchmark dependencies for ${benchmarkPath}:`, error);
    }
    
    return Array.from(dependencies);
  }

  /**
   * Generate workspace ID
   */
  private generateWorkspaceId(name: string): string {
    return `workspace-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  }

  /**
   * Generate package ID
   */
  private generatePackageId(name: string): string {
    return `package-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  }

  /**
   * Generate test ID
   */
  private generateTestId(filename: string): string {
    return `test-${filename.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  }

  /**
   * Generate benchmark ID
   */
  private generateBenchmarkId(filename: string): string {
    return `benchmark-${filename.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  }

  /**
   * Get workspace by ID
   */
  getWorkspace(id: string): WorkspaceMetadata | null {
    return this.catalogManager.getWorkspace(id);
  }

  /**
   * Get all workspaces
   */
  getAllWorkspaces(): WorkspaceMetadata[] {
    const catalog = this.catalogManager.getCatalog();
    return Object.values(catalog.workspaces);
  }

  /**
   * Get packages in workspace
   */
  getWorkspacePackages(workspaceId: string): PackageMetadata[] {
    const catalog = this.catalogManager.getCatalog();
    const workspace = catalog.workspaces[workspaceId];
    
    if (!workspace) return [];
    
    return workspace.packages.map(packageId => catalog.packages[packageId]).filter(Boolean);
  }

  /**
   * Update workspace
   */
  async updateWorkspace(workspaceId: string, updates: Partial<WorkspaceMetadata>): Promise<void> {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    const updatedWorkspace = {
      ...workspace,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.catalogManager.addWorkspace(updatedWorkspace);
  }

  /**
   * Delete workspace
   */
  async deleteWorkspace(workspaceId: string): Promise<void> {
    const workspace = this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    // Delete all packages in workspace
    for (const packageId of workspace.packages) {
      await this.deletePackage(packageId);
    }

    // Remove from catalog (would need to implement in RootCatalogManager)
    console.log(`Workspace ${workspaceId} marked for deletion`);
  }

  /**
   * Delete package
   */
  private async deletePackage(packageId: string): Promise<void> {
    const packageMetadata = this.catalogManager.getPackage(packageId);
    if (!packageMetadata) return;

    // Delete from R2 storage
    await this.r2Storage.deletePackage(packageId);
    
    console.log(`Package ${packageId} deleted`);
  }
}

export default WorkspaceManager;
