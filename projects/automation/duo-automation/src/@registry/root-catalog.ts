/**
 * Root Catalog System for FactoryWager Registry
 * 
 * Establishes the root catalog structure for organizing workspaces, packages,
 * and their associated metadata, tests, and benchmarks in R2 storage.
 */

export interface CatalogMetadata {
  name: string;
  version: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  maintainer: string;
  license: string;
  homepage?: string;
  repository?: string;
  keywords: string[];
  categories: string[];
}

export interface WorkspaceMetadata {
  id: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface PackageMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  workspaceId: string;
  type: "library" | "cli" | "service" | "tool" | "test" | "benchmark";
  path: string;
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
  metadata: {
    size?: number;
    hash?: string;
    tarball?: string;
    integrity?: string;
    bun?: Record<string, any>;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TestMetadata {
  id: string;
  packageId: string;
  name: string;
  path: string;
  type: "unit" | "integration" | "e2e" | "benchmark" | "performance";
  framework: "bun:test" | "jest" | "vitest" | "custom";
  timeout?: number;
  coverage?: boolean;
  dependencies: string[];
  metadata: {
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BenchmarkMetadata {
  id: string;
  packageId: string;
  name: string;
  path: string;
  type: "performance" | "memory" | "throughput" | "latency" | "custom";
  framework: "bun:bench" | "benchmark.js" | "custom";
  metrics: string[];
  baseline?: number;
  threshold?: number;
  dependencies: string[];
  metadata: {
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RegistryEntry {
  type: "catalog" | "workspace" | "package" | "test" | "benchmark";
  id: string;
  hash: string;
  path: string;
  size: number;
  integrity: string;
  lastModified: string;
  metadata: CatalogMetadata | WorkspaceMetadata | PackageMetadata | TestMetadata | BenchmarkMetadata;
}

export interface RootCatalog {
  metadata: CatalogMetadata;
  workspaces: Record<string, WorkspaceMetadata>;
  packages: Record<string, PackageMetadata>;
  tests: Record<string, TestMetadata>;
  benchmarks: Record<string, BenchmarkMetadata>;
  registry: Record<string, RegistryEntry>;
  index: {
    byName: Record<string, string>;
    byType: Record<string, string[]>;
    byCategory: Record<string, string[]>;
    byWorkspace: Record<string, string[]>;
    byDependency: Record<string, string[]>;
  };
  version: string;
  createdAt: string;
  updatedAt: string;
}

export class RootCatalogManager {
  private catalog: RootCatalog;
  private catalogPath: string;

  constructor(catalogPath: string = "./registry/root-catalog.json") {
    this.catalogPath = catalogPath;
    this.catalog = this.loadCatalog();
  }

  /**
   * Initialize a new root catalog
   */
  initialize(metadata: Partial<CatalogMetadata>): RootCatalog {
    const defaultMetadata: CatalogMetadata = {
      name: "FactoryWager Registry",
      version: "1.0.0",
      description: "FactoryWager Package Registry and Catalog System",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      maintainer: "FactoryWager Team",
      license: "MIT",
      homepage: "https://factory-wager.com",
      repository: "https://github.com/factory-wager/registry",
      keywords: ["factory-wager", "registry", "packages", "bun"],
      categories: ["framework", "tools", "libraries", "applications"]
    };

    this.catalog = {
      metadata: { ...defaultMetadata, ...metadata },
      workspaces: {},
      packages: {},
      tests: {},
      benchmarks: {},
      registry: {},
      index: {
        byName: {},
        byType: {},
        byCategory: {},
        byWorkspace: {},
        byDependency: {}
      },
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.saveCatalog();
    return this.catalog;
  }

  /**
   * Load existing catalog from disk
   */
  private loadCatalog(): RootCatalog {
    try {
      if (Bun.file(this.catalogPath).exists()) {
        const content = Bun.file(this.catalogPath).text();
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn("Failed to load catalog, creating new one:", error);
    }

    // Return default catalog if none exists
    return this.initialize({});
  }

  /**
   * Save catalog to disk
   */
  private saveCatalog(): void {
    this.catalog.updatedAt = new Date().toISOString();
    Bun.write(this.catalogPath, JSON.stringify(this.catalog, null, 2));
  }

  /**
   * Add workspace to catalog
   */
  addWorkspace(workspace: WorkspaceMetadata): void {
    this.catalog.workspaces[workspace.id] = workspace;
    this.updateIndex("workspace", workspace.id, workspace);
    this.saveCatalog();
  }

  /**
   * Add package to catalog
   */
  addPackage(pkg: PackageMetadata): void {
    this.catalog.packages[pkg.id] = pkg;
    this.updateIndex("package", pkg.id, pkg);
    this.saveCatalog();
  }

  /**
   * Add test to catalog
   */
  addTest(test: TestMetadata): void {
    this.catalog.tests[test.id] = test;
    this.updateIndex("test", test.id, test);
    this.saveCatalog();
  }

  /**
   * Add benchmark to catalog
   */
  addBenchmark(benchmark: BenchmarkMetadata): void {
    this.catalog.benchmarks[benchmark.id] = benchmark;
    this.updateIndex("benchmark", benchmark.id, benchmark);
    this.saveCatalog();
  }

  /**
   * Update index for efficient lookups
   */
  private updateIndex(type: string, id: string, metadata: any): void {
    const index = this.catalog.index;

    // Update by name
    if (metadata.name) {
      index.byName[metadata.name] = id;
    }

    // Update by type
    if (!index.byType[type]) {
      index.byType[type] = [];
    }
    if (!index.byType[type].includes(id)) {
      index.byType[type].push(id);
    }

    // Update by category
    if (metadata.categories) {
      metadata.categories.forEach((category: string) => {
        if (!index.byCategory[category]) {
          index.byCategory[category] = [];
        }
        if (!index.byCategory[category].includes(id)) {
          index.byCategory[category].push(id);
        }
      });
    }

    // Update by workspace
    if (metadata.workspaceId) {
      if (!index.byWorkspace[metadata.workspaceId]) {
        index.byWorkspace[metadata.workspaceId] = [];
      }
      if (!index.byWorkspace[metadata.workspaceId].includes(id)) {
        index.byWorkspace[metadata.workspaceId].push(id);
      }
    }

    // Update by dependency
    if (metadata.dependencies) {
      Object.keys(metadata.dependencies).forEach(dep => {
        if (!index.byDependency[dep]) {
          index.byDependency[dep] = [];
        }
        if (!index.byDependency[dep].includes(id)) {
          index.byDependency[dep].push(id);
        }
      });
    }
  }

  /**
   * Get workspace by ID
   */
  getWorkspace(id: string): WorkspaceMetadata | null {
    return this.catalog.workspaces[id] || null;
  }

  /**
   * Get package by ID
   */
  getPackage(id: string): PackageMetadata | null {
    return this.catalog.packages[id] || null;
  }

  /**
   * Get test by ID
   */
  getTest(id: string): TestMetadata | null {
    return this.catalog.tests[id] || null;
  }

  /**
   * Get benchmark by ID
   */
  getBenchmark(id: string): BenchmarkMetadata | null {
    return this.catalog.benchmarks[id] || null;
  }

  /**
   * Search catalog
   */
  search(query: {
    type?: string;
    category?: string;
    workspace?: string;
    dependency?: string;
    keyword?: string;
  }): {
    workspaces: WorkspaceMetadata[];
    packages: PackageMetadata[];
    tests: TestMetadata[];
    benchmarks: BenchmarkMetadata[];
  } {
    const results = {
      workspaces: [] as WorkspaceMetadata[],
      packages: [] as PackageMetadata[],
      tests: [] as TestMetadata[],
      benchmarks: [] as BenchmarkMetadata[]
    };

    let candidateIds: string[] = [];

    // Filter by type
    if (query.type) {
      candidateIds = this.catalog.index.byType[query.type] || [];
    } else {
      candidateIds = Object.keys(this.catalog.registry);
    }

    // Filter by other criteria
    candidateIds.forEach(id => {
      const entry = this.catalog.registry[id];
      if (!entry) return;

      // Skip if doesn't match category filter
      if (query.category && entry.metadata.categories) {
        if (!entry.metadata.categories.includes(query.category)) return;
      }

      // Skip if doesn't match workspace filter
      if (query.workspace && entry.metadata.workspaceId !== query.workspace) return;

      // Skip if doesn't match dependency filter
      if (query.dependency && entry.metadata.dependencies) {
        if (!Object.keys(entry.metadata.dependencies).includes(query.dependency)) return;
      }

      // Skip if doesn't match keyword filter
      if (query.keyword) {
        const searchText = `${entry.metadata.name} ${entry.metadata.description}`.toLowerCase();
        if (!searchText.includes(query.keyword.toLowerCase())) return;
      }

      // Add to appropriate results
      switch (entry.type) {
        case "workspace":
          results.workspaces.push(entry.metadata as WorkspaceMetadata);
          break;
        case "package":
          results.packages.push(entry.metadata as PackageMetadata);
          break;
        case "test":
          results.tests.push(entry.metadata as TestMetadata);
          break;
        case "benchmark":
          results.benchmarks.push(entry.metadata as BenchmarkMetadata);
          break;
      }
    });

    return results;
  }

  /**
   * Get complete catalog
   */
  getCatalog(): RootCatalog {
    return this.catalog;
  }

  /**
   * Get catalog statistics
   */
  getStatistics(): {
    totalWorkspaces: number;
    totalPackages: number;
    totalTests: number;
    totalBenchmarks: number;
    totalEntries: number;
    categories: Record<string, number>;
    types: Record<string, number>;
  } {
    const stats = {
      totalWorkspaces: Object.keys(this.catalog.workspaces).length,
      totalPackages: Object.keys(this.catalog.packages).length,
      totalTests: Object.keys(this.catalog.tests).length,
      totalBenchmarks: Object.keys(this.catalog.benchmarks).length,
      totalEntries: Object.keys(this.catalog.registry).length,
      categories: {} as Record<string, number>,
      types: {} as Record<string, number>
    };

    // Count categories
    Object.values(this.catalog.registry).forEach(entry => {
      if (entry.metadata.categories) {
        entry.metadata.categories.forEach((category: string) => {
          stats.categories[category] = (stats.categories[category] || 0) + 1;
        });
      }

      stats.types[entry.type] = (stats.types[entry.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Validate catalog integrity
   */
  validate(): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for missing references
    Object.values(this.catalog.packages).forEach(pkg => {
      if (!this.catalog.workspaces[pkg.workspaceId]) {
        errors.push(`Package ${pkg.id} references non-existent workspace ${pkg.workspaceId}`);
      }
    });

    Object.values(this.catalog.tests).forEach(test => {
      if (!this.catalog.packages[test.packageId]) {
        errors.push(`Test ${test.id} references non-existent package ${test.packageId}`);
      }
    });

    Object.values(this.catalog.benchmarks).forEach(benchmark => {
      if (!this.catalog.packages[benchmark.packageId]) {
        errors.push(`Benchmark ${benchmark.id} references non-existent package ${benchmark.packageId}`);
      }
    });

    // Check for duplicate names
    const nameCount: Record<string, number> = {};
    Object.values(this.catalog.registry).forEach(entry => {
      const name = entry.metadata.name;
      nameCount[name] = (nameCount[name] || 0) + 1;
    });

    Object.entries(nameCount).forEach(([name, count]) => {
      if (count > 1) {
        warnings.push(`Duplicate name found: ${name} (${count} entries)`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export default RootCatalogManager;
