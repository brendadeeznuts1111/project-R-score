/**
 * R2 Registry Storage System
 * 
 * Handles storing and retrieving catalog entries, packages, tests, and benchmarks
 * in Cloudflare R2 with proper metadata and integrity checking.
 */

import { RootCatalog, RegistryEntry, PackageMetadata, TestMetadata, BenchmarkMetadata } from "./root-catalog.js";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint?: string;
  region?: string;
}

export interface StorageResult {
  success: boolean;
  key: string;
  etag?: string;
  size?: number;
  lastModified?: string;
  error?: string;
}

export interface BundleOptions {
  includeTests?: boolean;
  includeBenchmarks?: boolean;
  includeDevDependencies?: boolean;
  minify?: boolean;
  compression?: "gzip" | "brotli" | "none";
  integrity?: "sha256" | "sha384" | "sha512";
}

export class R2RegistryStorage {
  private config: R2Config;
  private bucket: any; // R2 bucket instance

  constructor(config: R2Config) {
    this.config = config;
    this.initializeBucket();
  }

  /**
   * Initialize R2 bucket connection
   */
  private initializeBucket(): void {
    // Initialize R2 bucket using Bun's S3-compatible API
    this.bucket = new Bun.s3.Bucket({
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
      bucket: this.config.bucketName,
      endpoint: this.config.endpoint || `https://${this.config.accountId}.r2.cloudflarestorage.com`,
      region: this.config.region || "auto"
    });
  }

  /**
   * Store catalog in R2
   */
  async storeCatalog(catalog: RootCatalog): Promise<StorageResult> {
    try {
      const catalogJson = JSON.stringify(catalog, null, 2);
      const catalogBuffer = Buffer.from(catalogJson, "utf-8");
      
      const result = await Bun.s3.write("registry/root-catalog.json", catalogBuffer, {
        contentType: "application/json",
        metadata: {
          version: catalog.version,
          lastModified: catalog.updatedAt,
          type: "catalog"
        }
      });

      return {
        success: true,
        key: "registry/root-catalog.json",
        etag: result.etag,
        size: catalogBuffer.length,
        lastModified: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        key: "registry/root-catalog.json",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Retrieve catalog from R2
   */
  async retrieveCatalog(): Promise<RootCatalog | null> {
    try {
      const result = await Bun.s3.file("registry/root-catalog.json");
      if (!result) return null;

      const catalogJson = await result.text();
      return JSON.parse(catalogJson);
    } catch (error) {
      console.error("Failed to retrieve catalog:", error);
      return null;
    }
  }

  /**
   * Bundle and store package in R2
   */
  async bundleAndStorePackage(
    packagePath: string,
    metadata: PackageMetadata,
    options: BundleOptions = {}
  ): Promise<StorageResult> {
    try {
      // Create bundle
      const bundleResult = await this.createBundle(packagePath, metadata, options);
      if (!bundleResult.success) {
        return bundleResult;
      }

      // Generate hash and integrity
      const hash = await this.generateHash(bundleResult.buffer!);
      const integrity = await this.generateIntegrity(bundleResult.buffer!, options.integrity || "sha256");

      // Update metadata with bundle info
      metadata.metadata = {
        ...metadata.metadata,
        size: bundleResult.buffer!.length,
        hash,
        integrity,
        tarball: `registry/packages/${metadata.id}.tar.gz`,
        bundledAt: new Date().toISOString(),
        bundleOptions: options
      };

      // Store bundle
      const storageKey = `registry/packages/${metadata.id}.tar.gz`;
      const storeResult = await Bun.s3.write(storageKey, bundleResult.buffer!, {
        contentType: "application/gzip",
        metadata: {
          packageId: metadata.id,
          packageName: metadata.name,
          packageVersion: metadata.version,
          hash,
          integrity,
          size: bundleResult.buffer!.length.toString(),
          bundledAt: new Date().toISOString(),
          type: "package"
        }
      });

      // Store metadata
      const metadataKey = `registry/packages/${metadata.id}.json`;
      await Bun.s3.write(metadataKey, Buffer.from(JSON.stringify(metadata, null, 2)), {
        contentType: "application/json",
        metadata: {
          packageId: metadata.id,
          type: "metadata"
        }
      });

      return {
        success: true,
        key: storageKey,
        etag: storeResult.etag,
        size: bundleResult.buffer!.length,
        lastModified: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        key: `registry/packages/${metadata.id}.tar.gz`,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Create bundle from package directory
   */
  private async createBundle(
    packagePath: string,
    metadata: PackageMetadata,
    options: BundleOptions
  ): Promise<{ success: boolean; buffer?: Buffer; error?: string }> {
    try {
      // Create temporary directory for bundling
      const tempDir = `./temp/bundle-${metadata.id}`;
      await Bun.mkdir(tempDir, { recursive: true });

      // Copy package files
      await this.copyPackageFiles(packagePath, tempDir, metadata, options);

      // Create package.json if not exists
      const packageJsonPath = `${tempDir}/package.json`;
      if (!Bun.file(packageJsonPath).exists()) {
        await this.createPackageJson(tempDir, metadata);
      }

      // Create tar.gz bundle
      const tarBuffer = await this.createTarGzBundle(tempDir);

      // Clean up temp directory
      await Bun.rm(tempDir, { recursive: true });

      return {
        success: true,
        buffer: tarBuffer
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Copy package files to temp directory
   */
  private async copyPackageFiles(
    sourcePath: string,
    targetPath: string,
    metadata: PackageMetadata,
    options: BundleOptions
  ): Promise<void> {
    // Copy main files
    for (const file of metadata.files) {
      const sourceFile = `${sourcePath}/${file}`;
      const targetFile = `${targetPath}/${file}`;
      
      // Ensure target directory exists
      await Bun.mkdir(targetFile.split("/").slice(0, -1).join("/"), { recursive: true });
      
      if (Bun.file(sourceFile).exists()) {
        await Bun.write(targetFile, await Bun.file(sourceFile).arrayBuffer());
      }
    }

    // Copy tests if included
    if (options.includeTests) {
      for (const test of metadata.tests) {
        const sourceFile = `${sourcePath}/${test}`;
        const targetFile = `${targetPath}/${test}`;
        
        await Bun.mkdir(targetFile.split("/").slice(0, -1).join("/"), { recursive: true });
        
        if (Bun.file(sourceFile).exists()) {
          await Bun.write(targetFile, await Bun.file(sourceFile).arrayBuffer());
        }
      }
    }

    // Copy benchmarks if included
    if (options.includeBenchmarks) {
      for (const benchmark of metadata.benchmarks) {
        const sourceFile = `${sourcePath}/${benchmark}`;
        const targetFile = `${targetPath}/${benchmark}`;
        
        await Bun.mkdir(targetFile.split("/").slice(0, -1).join("/"), { recursive: true });
        
        if (Bun.file(sourceFile).exists()) {
          await Bun.write(targetFile, await Bun.file(sourceFile).arrayBuffer());
        }
      }
    }

    // Copy assets
    for (const asset of metadata.assets) {
      const sourceFile = `${sourcePath}/${asset}`;
      const targetFile = `${targetPath}/${asset}`;
      
      await Bun.mkdir(targetFile.split("/").slice(0, -1).join("/"), { recursive: true });
      
      if (Bun.file(sourceFile).exists()) {
        await Bun.write(targetFile, await Bun.file(sourceFile).arrayBuffer());
      }
    }
  }

  /**
   * Create package.json for bundle
   */
  private async createPackageJson(targetPath: string, metadata: PackageMetadata): Promise<void> {
    const packageJson = {
      name: metadata.name,
      version: metadata.version,
      description: metadata.description,
      main: metadata.main,
      module: metadata.module,
      types: metadata.types,
      exports: metadata.exports,
      dependencies: metadata.dependencies,
      devDependencies: metadata.devDependencies,
      peerDependencies: metadata.peerDependencies,
      scripts: metadata.scripts,
      files: metadata.files,
      keywords: metadata.keywords || [],
      author: "FactoryWager Team",
      license: "MIT",
      repository: {
        type: "git",
        url: "https://github.com/factory-wager/registry"
      },
      bugs: {
        url: "https://github.com/factory-wager/registry/issues"
      },
      homepage: "https://factory-wager.com",
      engines: {
        bun: ">=1.1.0"
      },
      ...metadata.metadata
    };

    await Bun.write(`${targetPath}/package.json`, JSON.stringify(packageJson, null, 2));
  }

  /**
   * Create tar.gz bundle
   */
  private async createTarGzBundle(directoryPath: string): Promise<Buffer> {
    // Use Bun's built-in tar functionality
    const tarBuffer = await Bun.spawn(["tar", "-czf", "-", "-C", directoryPath, "."], {
      stdout: "buffer"
    }).then(process => process.stdout as Buffer);

    return tarBuffer;
  }

  /**
   * Store test files
   */
  async storeTestFiles(
    packageId: string,
    testFiles: Array<{ path: string; content: string; metadata: TestMetadata }>
  ): Promise<StorageResult[]> {
    const results: StorageResult[] = [];

    for (const testFile of testFiles) {
      try {
        const key = `registry/tests/${packageId}/${testFile.metadata.id}.js`;
        const buffer = Buffer.from(testFile.content, "utf-8");

        const storeResult = await Bun.s3.write(key, buffer, {
          contentType: "application/javascript",
          metadata: {
            packageId,
            testId: testFile.metadata.id,
            testName: testFile.metadata.name,
            testType: testFile.metadata.type,
            framework: testFile.metadata.framework,
            type: "test"
          }
        });

        // Store test metadata
        const metadataKey = `registry/tests/${packageId}/${testFile.metadata.id}.json`;
        await Bun.s3.write(metadataKey, Buffer.from(JSON.stringify(testFile.metadata, null, 2)), {
          contentType: "application/json",
          metadata: {
            packageId,
            testId: testFile.metadata.id,
            type: "metadata"
          }
        });

        results.push({
          success: true,
          key,
          etag: storeResult.etag,
          size: buffer.length,
          lastModified: new Date().toISOString()
        });
      } catch (error) {
        results.push({
          success: false,
          key: `registry/tests/${packageId}/${testFile.metadata.id}.js`,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    return results;
  }

  /**
   * Store benchmark files
   */
  async storeBenchmarkFiles(
    packageId: string,
    benchmarkFiles: Array<{ path: string; content: string; metadata: BenchmarkMetadata }>
  ): Promise<StorageResult[]> {
    const results: StorageResult[] = [];

    for (const benchmarkFile of benchmarkFiles) {
      try {
        const key = `registry/benchmarks/${packageId}/${benchmarkFile.metadata.id}.js`;
        const buffer = Buffer.from(benchmarkFile.content, "utf-8");

        const storeResult = await Bun.s3.write(key, buffer, {
          contentType: "application/javascript",
          metadata: {
            packageId,
            benchmarkId: benchmarkFile.metadata.id,
            benchmarkName: benchmarkFile.metadata.name,
            benchmarkType: benchmarkFile.metadata.type,
            framework: benchmarkFile.metadata.framework,
            type: "benchmark"
          }
        });

        // Store benchmark metadata
        const metadataKey = `registry/benchmarks/${packageId}/${benchmarkFile.metadata.id}.json`;
        await Bun.s3.write(metadataKey, Buffer.from(JSON.stringify(benchmarkFile.metadata, null, 2)), {
          contentType: "application/json",
          metadata: {
            packageId,
            benchmarkId: benchmarkFile.metadata.id,
            type: "metadata"
          }
        });

        results.push({
          success: true,
          key,
          etag: storeResult.etag,
          size: buffer.length,
          lastModified: new Date().toISOString()
        });
      } catch (error) {
        results.push({
          success: false,
          key: `registry/benchmarks/${packageId}/${benchmarkFile.metadata.id}.js`,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    return results;
  }

  /**
   * Generate hash for integrity checking
   */
  private async generateHash(buffer: Buffer): Promise<string> {
    const hash = await Bun.crypto.hash(buffer, "sha256");
    return Buffer.from(hash).toString("hex");
  }

  /**
   * Generate integrity string
   */
  private async generateIntegrity(buffer: Buffer, algorithm: string): Promise<string> {
    const hash = await Bun.crypto.hash(buffer, algorithm as any);
    const base64Hash = Buffer.from(hash).toString("base64");
    return `${algorithm}-${base64Hash}`;
  }

  /**
   * Verify package integrity
   */
  async verifyPackageIntegrity(packageId: string, expectedIntegrity: string): Promise<boolean> {
    try {
      const packageKey = `registry/packages/${packageId}.tar.gz`;
      const packageFile = await Bun.s3.file(packageKey);
      
      if (!packageFile) return false;

      const buffer = await packageFile.arrayBuffer();
      const actualIntegrity = await this.generateIntegrity(Buffer.from(buffer), "sha256");
      
      return actualIntegrity === expectedIntegrity;
    } catch (error) {
      console.error("Failed to verify package integrity:", error);
      return false;
    }
  }

  /**
   * List all packages in registry
   */
  async listPackages(): Promise<string[]> {
    try {
      const objects = await Bun.s3.list({ prefix: "registry/packages/" });
      return objects
        .filter(obj => obj.key!.endsWith(".tar.gz"))
        .map(obj => obj.key!.replace("registry/packages/", "").replace(".tar.gz", ""));
    } catch (error) {
      console.error("Failed to list packages:", error);
      return [];
    }
  }

  /**
   * Get package metadata
   */
  async getPackageMetadata(packageId: string): Promise<PackageMetadata | null> {
    try {
      const metadataKey = `registry/packages/${packageId}.json`;
      const metadataFile = await Bun.s3.file(metadataKey);
      
      if (!metadataFile) return null;

      const metadataJson = await metadataFile.text();
      return JSON.parse(metadataJson);
    } catch (error) {
      console.error("Failed to get package metadata:", error);
      return null;
    }
  }

  /**
   * Delete package from registry
   */
  async deletePackage(packageId: string): Promise<boolean> {
    try {
      // Delete package bundle
      await Bun.s3.delete(`registry/packages/${packageId}.tar.gz`);
      
      // Delete metadata
      await Bun.s3.delete(`registry/packages/${packageId}.json`);
      
      // Delete tests
      const testObjects = await Bun.s3.list({ prefix: `registry/tests/${packageId}/` });
      for (const obj of testObjects) {
        await Bun.s3.delete(obj.key!);
      }
      
      // Delete benchmarks
      const benchmarkObjects = await Bun.s3.list({ prefix: `registry/benchmarks/${packageId}/` });
      for (const obj of benchmarkObjects) {
        await Bun.s3.delete(obj.key!);
      }

      return true;
    } catch (error) {
      console.error("Failed to delete package:", error);
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStatistics(): Promise<{
    totalPackages: number;
    totalSize: number;
    totalTests: number;
    totalBenchmarks: number;
    lastUpdated: string;
  }> {
    try {
      const packageObjects = await Bun.s3.list({ prefix: "registry/packages/" });
      const testObjects = await Bun.s3.list({ prefix: "registry/tests/" });
      const benchmarkObjects = await Bun.s3.list({ prefix: "registry/benchmarks/" });

      const totalSize = packageObjects.reduce((sum, obj) => sum + (obj.size || 0), 0);

      return {
        totalPackages: packageObjects.filter(obj => obj.key!.endsWith(".tar.gz")).length,
        totalSize,
        totalTests: testObjects.filter(obj => obj.key!.endsWith(".js")).length,
        totalBenchmarks: benchmarkObjects.filter(obj => obj.key!.endsWith(".js")).length,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error("Failed to get storage statistics:", error);
      return {
        totalPackages: 0,
        totalSize: 0,
        totalTests: 0,
        totalBenchmarks: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  }
}

export default R2RegistryStorage;
