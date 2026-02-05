/**
 * Package Bundler following Bun's best practices
 * 
 * Creates optimized bundles for FactoryWager packages with proper hashing,
 * tree-shaking, and dependency management.
 */

import { PackageMetadata, BundleOptions } from "./root-catalog.js";
import { R2RegistryStorage } from "./r2-storage.js";

export interface BundleConfig {
  entry: string;
  format: "esm" | "cjs" | "iife";
  target: "bun" | "node" | "browser";
  minify: boolean;
  sourcemap: boolean;
  external: string[];
  plugins: string[];
}

export interface BundleResult {
  success: boolean;
  bundle?: Buffer;
  metadata?: {
    size: number;
    hash: string;
    integrity: string;
    dependencies: string[];
    exports: string[];
  };
  error?: string;
}

export interface DependencyGraph {
  [packageName: string]: {
    version: string;
    type: "dependency" | "devDependency" | "peerDependency";
    resolved: string;
  };
}

export class PackageBundler {
  private r2Storage: R2RegistryStorage;

  constructor(r2Storage: R2RegistryStorage) {
    this.r2Storage = r2Storage;
  }

  /**
   * Create optimized bundle for package
   */
  async createBundle(
    packagePath: string,
    metadata: PackageMetadata,
    config: Partial<BundleConfig> = {}
  ): Promise<BundleResult> {
    try {
      const bundleConfig = this.resolveBundleConfig(packagePath, metadata, config);
      
      // Analyze dependencies
      const dependencyGraph = await this.analyzeDependencies(packagePath, metadata);
      
      // Create bundle
      const bundleResult = await this.buildBundle(packagePath, bundleConfig, dependencyGraph);
      
      if (!bundleResult.success) {
        return bundleResult;
      }

      // Generate metadata
      const bundleMetadata = await this.generateBundleMetadata(
        bundleResult.bundle!,
        dependencyGraph,
        metadata
      );

      return {
        success: true,
        bundle: bundleResult.bundle,
        metadata: bundleMetadata
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Resolve bundle configuration
   */
  private resolveBundleConfig(
    packagePath: string,
    metadata: PackageMetadata,
    config: Partial<BundleConfig>
  ): BundleConfig {
    const defaultConfig: BundleConfig = {
      entry: metadata.main || "src/index.ts",
      format: "esm",
      target: "bun",
      minify: true,
      sourcemap: true,
      external: this.getExternalDependencies(metadata),
      plugins: []
    };

    return { ...defaultConfig, ...config };
  }

  /**
   * Get external dependencies from package metadata
   */
  private getExternalDependencies(metadata: PackageMetadata): string[] {
    const deps = [
      ...Object.keys(metadata.dependencies || {}),
      ...Object.keys(metadata.peerDependencies || {})
    ];

    // Add common external dependencies
    const commonExternals = [
      "bun:sqlite",
      "bun:crypto",
      "bun:ffi",
      "bun:ffi",
      "bun:socket",
      "bun:worker",
      "bun:toml",
      "bun:ws"
    ];

    return [...deps, ...commonExternals];
  }

  /**
   * Analyze package dependencies
   */
  private async analyzeDependencies(
    packagePath: string,
    metadata: PackageMetadata
  ): Promise<DependencyGraph> {
    const graph: DependencyGraph = {};

    // Add production dependencies
    Object.entries(metadata.dependencies || {}).forEach(([name, version]) => {
      graph[name] = {
        version,
        type: "dependency",
        resolved: this.resolveDependency(name, version)
      };
    });

    // Add peer dependencies
    Object.entries(metadata.peerDependencies || {}).forEach(([name, version]) => {
      graph[name] = {
        version,
        type: "peerDependency",
        resolved: this.resolveDependency(name, version)
      };
    });

    // Analyze dynamic imports in source files
    const dynamicImports = await this.findDynamicImports(packagePath);
    dynamicImports.forEach(imp => {
      if (!graph[imp]) {
        graph[imp] = {
          version: "latest",
          type: "dependency",
          resolved: this.resolveDependency(imp, "latest")
        };
      }
    });

    return graph;
  }

  /**
   * Find dynamic imports in source files
   */
  private async findDynamicImports(packagePath: string): Promise<string[]> {
    const imports = new Set<string>();
    
    // Scan TypeScript and JavaScript files
    const files = await this.scanSourceFiles(packagePath);
    
    for (const file of files) {
      try {
        const content = await Bun.file(file).text();
        
        // Find dynamic imports: import("module")
        const dynamicImportRegex = /import\s*\(\s*["']([^"']+)["']\s*\)/g;
        let match;
        
        while ((match = dynamicImportRegex.exec(content)) !== null) {
          imports.add(match[1]);
        }
        
        // Find require() calls
        const requireRegex = /require\s*\(\s*["']([^"']+)["']\s*\)/g;
        while ((match = requireRegex.exec(content)) !== null) {
          imports.add(match[1]);
        }
      } catch (error) {
        console.warn(`Failed to analyze ${file}:`, error);
      }
    }
    
    return Array.from(imports);
  }

  /**
   * Scan source files in package
   */
  private async scanSourceFiles(packagePath: string): Promise<string[]> {
    const files: string[] = [];
    
    async function scanDirectory(dir: string) {
      const entries = await Array.fromAsync(Bun.scan(dir));
      
      for (const entry of entries) {
        if (entry.isFile && (entry.path.endsWith('.ts') || entry.path.endsWith('.js'))) {
          files.push(entry.path);
        }
      }
    }
    
    await scanDirectory(packagePath);
    return files;
  }

  /**
   * Resolve dependency to actual package
   */
  private resolveDependency(name: string, version: string): string {
    // For now, return the name and version
    // In a real implementation, this would resolve to the actual package URL
    return `${name}@${version}`;
  }

  /**
   * Build bundle using Bun's build API
   */
  private async buildBundle(
    packagePath: string,
    config: BundleConfig,
    dependencyGraph: DependencyGraph
  ): Promise<{ success: boolean; bundle?: Buffer; error?: string }> {
    try {
      const entryPath = `${packagePath}/${config.entry}`;
      
      if (!Bun.file(entryPath).exists()) {
        return {
          success: false,
          error: `Entry file not found: ${entryPath}`
        };
      }

      // Use Bun's build API
      const buildResult = await Bun.build({
        entrypoints: [entryPath],
        format: config.format,
        target: config.target,
        minify: config.minify,
        sourcemap: config.sourcemap,
        external: config.external,
        root: packagePath,
        splitting: true,
        treeShaking: true,
        deadCodeElimination: true
      });

      if (buildResult.success) {
        // Get the main bundle
        const mainBundle = buildResult.outputs[0];
        const bundleBuffer = await mainBundle.arrayBuffer();
        
        return {
          success: true,
          bundle: Buffer.from(bundleBuffer)
        };
      } else {
        return {
          success: false,
          error: buildResult.logs.map(log => log.message).join("; ")
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Generate bundle metadata
   */
  private async generateBundleMetadata(
    bundle: Buffer,
    dependencyGraph: DependencyGraph,
    metadata: PackageMetadata
  ): Promise<{
    size: number;
    hash: string;
    integrity: string;
    dependencies: string[];
    exports: string[];
  }> {
    const hash = await Bun.crypto.hash(bundle, "sha256");
    const hashHex = Buffer.from(hash).toString("hex");
    const integrity = `sha256-${Buffer.from(hash).toString("base64")}`;
    
    const dependencies = Object.keys(dependencyGraph);
    const exports = Object.keys(metadata.exports || {});

    return {
      size: bundle.length,
      hash: hashHex,
      integrity,
      dependencies,
      exports
    };
  }

  /**
   * Create development bundle with source maps
   */
  async createDevBundle(
    packagePath: string,
    metadata: PackageMetadata
  ): Promise<BundleResult> {
    return this.createBundle(packagePath, metadata, {
      minify: false,
      sourcemap: true,
      target: "bun"
    });
  }

  /**
   * Create production bundle optimized for size
   */
  async createProdBundle(
    packagePath: string,
    metadata: PackageMetadata
  ): Promise<BundleResult> {
    return this.createBundle(packagePath, metadata, {
      minify: true,
      sourcemap: false,
      target: "bun"
    });
  }

  /**
   * Create library bundle for distribution
   */
  async createLibraryBundle(
    packagePath: string,
    metadata: PackageMetadata
  ): Promise<{ esm: BundleResult; cjs: BundleResult }> {
    const esmResult = await this.createBundle(packagePath, metadata, {
      format: "esm",
      minify: true,
      sourcemap: true,
      target: "node"
    });

    const cjsResult = await this.createBundle(packagePath, metadata, {
      format: "cjs",
      minify: true,
      sourcemap: true,
      target: "node"
    });

    return {
      esm: esmResult,
      cjs: cjsResult
    };
  }

  /**
   * Bundle tests with test framework
   */
  async bundleTests(
    packagePath: string,
    testFiles: string[]
  ): Promise<{ success: boolean; bundles?: Array<{ name: string; buffer: Buffer }>; error?: string }> {
    try {
      const bundles: Array<{ name: string; buffer: Buffer }> = [];

      for (const testFile of testFiles) {
        const testPath = `${packagePath}/${testFile}`;
        
        if (!Bun.file(testPath).exists()) {
          continue;
        }

        const buildResult = await Bun.build({
          entrypoints: [testPath],
          format: "esm",
          target: "bun",
          minify: false,
          sourcemap: true,
          external: ["bun:test", "@jest/globals"],
          root: packagePath
        });

        if (buildResult.success) {
          const mainBundle = buildResult.outputs[0];
          const bundleBuffer = await mainBundle.arrayBuffer();
          
          bundles.push({
            name: testFile,
            buffer: Buffer.from(bundleBuffer)
          });
        }
      }

      return {
        success: true,
        bundles
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Bundle benchmarks with performance optimizations
   */
  async bundleBenchmarks(
    packagePath: string,
    benchmarkFiles: string[]
  ): Promise<{ success: boolean; bundles?: Array<{ name: string; buffer: Buffer }>; error?: string }> {
    try {
      const bundles: Array<{ name: string; buffer: Buffer }> = [];

      for (const benchmarkFile of benchmarkFiles) {
        const benchmarkPath = `${packagePath}/${benchmarkFile}`;
        
        if (!Bun.file(benchmarkPath).exists()) {
          continue;
        }

        const buildResult = await Bun.build({
          entrypoints: [benchmarkPath],
          format: "esm",
          target: "bun",
          minify: false,
          sourcemap: true,
          external: ["bun:bench"],
          root: packagePath
        });

        if (buildResult.success) {
          const mainBundle = buildResult.outputs[0];
          const bundleBuffer = await mainBundle.arrayBuffer();
          
          bundles.push({
            name: benchmarkFile,
            buffer: Buffer.from(bundleBuffer)
          });
        }
      }

      return {
        success: true,
        bundles
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Validate bundle integrity
   */
  async validateBundle(bundle: Buffer, expectedIntegrity: string): Promise<boolean> {
    const hash = await Bun.crypto.hash(bundle, "sha256");
    const integrity = `sha256-${Buffer.from(hash).toString("base64")}`;
    return integrity === expectedIntegrity;
  }

  /**
   * Get bundle statistics
   */
  getBundleStatistics(bundle: Buffer): {
    size: number;
    gzipSize: number;
    brotliSize: number;
    lines: number;
    functions: number;
  } {
    const content = bundle.toString("utf-8");
    const lines = content.split("\n").length;
    const functions = (content.match(/function\s+\w+|const\s+\w+\s*=\s*\(|class\s+\w+/g) || []).length;

    // Estimate compressed sizes
    const gzipSize = Math.floor(bundle.length * 0.3); // Rough estimate
    const brotliSize = Math.floor(bundle.length * 0.25); // Rough estimate

    return {
      size: bundle.length,
      gzipSize,
      brotliSize,
      lines,
      functions
    };
  }
}

export default PackageBundler;
