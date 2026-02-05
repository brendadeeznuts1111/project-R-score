/**
 * Bundle Matrix Analyzer - Analyze Bun builds using DuoPlus Scoping Matrix principles
 * Tracks bundle health, file sizes, dependencies, and compliance metrics
 */

import { $ } from "bun";
import { Bun } from "bun";

export interface BundleAnalysisOptions {
  outdir?: string;
  target?: "browser" | "bun" | "node";
  minify?: boolean;
  external?: string[];
  verbose?: boolean;
}

export interface FileMetrics {
  path: string;
  size: number;
  gzipped: number;
  imports: string[];
  scope?: string;
}

export interface BundleMetrics {
  totalSize: number;
  gzippedSize: number;
  fileCount: number;
  avgFileSize: number;
  avgGzippedSize: number;
  largestFiles: FileMetrics[];
  bundleHealth: number; // 0-100
  tension: number; // 100 - health (measure of bloat)
}

export interface BundleMatrix {
  timestamp: string;
  target: string;
  files: FileMetrics[];
  summary: BundleMetrics;
  compliance: ComplianceCheck[];
  recommendations: string[];
}

export interface ComplianceCheck {
  rule: string;
  passed: boolean;
  details: string;
}

export class BundleMatrixAnalyzer {
  /**
   * Analyze a project's bundle using Bun's build system
   */
  static async analyzeProject(
    entryPoints: string[],
    options: BundleAnalysisOptions = {}
  ): Promise<BundleMatrix> {
    const {
      outdir = "./dist",
      target = "bun",
      minify = true,
      external = [],
      verbose = false
    } = options;

    if (verbose) console.log("🔍 Starting bundle analysis...");

    // 1. Build with Bun
    const buildResult = await this.buildBundle(entryPoints, {
      outdir,
      target,
      minify,
      external
    });

    // 2. Analyze built files
    const files = await this.analyzeBuiltFiles(outdir);

    // 3. Calculate metrics
    const summary = this.calculateMetrics(files);

    // 4. Check compliance
    const compliance = this.checkCompliance(files, summary);

    // 5. Generate recommendations
    const recommendations = this.generateRecommendations(files, summary);

    const matrix: BundleMatrix = {
      timestamp: new Date().toISOString(),
      target,
      files,
      summary,
      compliance,
      recommendations
    };

    if (verbose) {
      this.printReport(matrix);
    }

    return matrix;
  }

  /**
   * Build bundle with Bun
   */
  private static async buildBundle(
    entryPoints: string[],
    options: {
      outdir: string;
      target: "browser" | "bun" | "node";
      minify: boolean;
      external: string[];
    }
  ) {
    try {
      const result = await Bun.build({
        entrypoints: entryPoints,
        outdir: options.outdir,
        target: options.target as any,
        minify: options.minify,
        external: options.external
      });

      return result;
    } catch (error) {
      throw new Error(`Build failed: ${error}`);
    }
  }

  /**
   * Analyze all files in output directory
   */
  private static async analyzeBuiltFiles(outdir: string): Promise<FileMetrics[]> {
    const files: FileMetrics[] = [];

    try {
      // Read all .js files from outdir
      const dirPath = Bun.file(outdir);
      
      // Use Bun's file operations to read directory
      for await (const entry of dirPath.walk()) {
        if (entry.isFile && (entry.path.endsWith('.js') || entry.path.endsWith('.ts'))) {
          const file = Bun.file(entry.path);
          const content = await file.text();
          const size = await file.size;
          
          // Estimate gzipped size
          const gzipped = Math.round(size * 0.3); // Rough estimate: 30% of original

          // Extract imports
          const imports = this.extractImports(content);

          files.push({
            path: entry.path,
            size,
            gzipped,
            imports,
            scope: this.detectScope(entry.path)
          });
        }
      }
    } catch (error) {
      console.warn(`Could not read directory: ${error}`);
    }

    return files.sort((a, b) => b.size - a.size);
  }

  /**
   * Extract imports from source code
   */
  private static extractImports(content: string): string[] {
    const importRegex = /import\s+(?:.*from\s+)?['"]([^'"]+)['"]/g;
    const imports: string[] = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return [...new Set(imports)]; // Deduplicate
  }

  /**
   * Detect scope from file path
   */
  private static detectScope(path: string): string {
    if (path.includes('/api/')) return 'API';
    if (path.includes('/middleware/')) return 'Middleware';
    if (path.includes('/utils/')) return 'Utils';
    if (path.includes('/config/')) return 'Config';
    if (path.includes('/routes/')) return 'Routes';
    return 'Other';
  }

  /**
   * Calculate bundle metrics
   */
  private static calculateMetrics(files: FileMetrics[]): BundleMetrics {
    if (files.length === 0) {
      return {
        totalSize: 0,
        gzippedSize: 0,
        fileCount: 0,
        avgFileSize: 0,
        avgGzippedSize: 0,
        largestFiles: [],
        bundleHealth: 100,
        tension: 0
      };
    }

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const gzippedSize = files.reduce((sum, f) => sum + f.gzipped, 0);
    const avgFileSize = totalSize / files.length;
    const avgGzippedSize = gzippedSize / files.length;

    // Bundle health score (0-100)
    // Factors: total size, file count, average file size
    const healthScore = this.calculateHealthScore(totalSize, files.length, avgFileSize);

    return {
      totalSize,
      gzippedSize,
      fileCount: files.length,
      avgFileSize,
      avgGzippedSize,
      largestFiles: files.slice(0, 5),
      bundleHealth: healthScore,
      tension: 100 - healthScore
    };
  }

  /**
   * Calculate health score (0-100)
   * Higher is better
   */
  private static calculateHealthScore(
    totalSize: number,
    fileCount: number,
    avgFileSize: number
  ): number {
    // Ideal targets (in bytes)
    const idealTotalSize = 500000; // 500KB
    const idealFileCount = 5;
    const idealAvgSize = 100000; // 100KB

    // Penalize oversized bundles
    const sizePenalty = Math.min(50, (totalSize / idealTotalSize) * 30);

    // Penalize too many files (indicates fragmentation)
    const filePenalty = Math.min(25, Math.abs(fileCount - idealFileCount) * 2);

    // Reward consistent file sizes
    const sizeBenefit = Math.max(0, 10 - Math.abs(avgFileSize - idealAvgSize) / 10000);

    const health = 100 - sizePenalty - filePenalty + sizeBenefit;
    return Math.max(0, Math.min(100, Math.round(health)));
  }

  /**
   * Check compliance with scoping rules
   */
  private static checkCompliance(
    files: FileMetrics[],
    summary: BundleMetrics
  ): ComplianceCheck[] {
    const checks: ComplianceCheck[] = [];

    // Check 1: Bundle size under threshold
    checks.push({
      rule: "Bundle size < 1MB",
      passed: summary.gzippedSize < 1024 * 1024,
      details: `Current: ${this.formatBytes(summary.gzippedSize)}`
    });

    // Check 2: No excessive imports
    const maxImports = Math.max(
      ...files.map(f => f.imports.length)
    );
    checks.push({
      rule: "Max imports per file < 50",
      passed: maxImports < 50,
      details: `Highest: ${maxImports} imports`
    });

    // Check 3: File count reasonable
    checks.push({
      rule: "File count < 20",
      passed: summary.fileCount < 20,
      details: `Current: ${summary.fileCount} files`
    });

    // Check 4: No Bun-native violations
    const bunViolations = files.filter(f =>
      f.imports.some(imp =>
        ['axios', 'dotenv', 'form-data', 'node-fetch'].includes(imp)
      )
    );
    checks.push({
      rule: "No forbidden packages (axios, dotenv, form-data, node-fetch)",
      passed: bunViolations.length === 0,
      details: bunViolations.length > 0
        ? `Found in ${bunViolations.length} files`
        : "All Bun-native ✓"
    });

    // Check 5: Health score threshold
    checks.push({
      rule: "Bundle health > 60",
      passed: summary.bundleHealth > 60,
      details: `Current: ${summary.bundleHealth}/100`
    });

    return checks;
  }

  /**
   * Generate recommendations for optimization
   */
  private static generateRecommendations(
    files: FileMetrics[],
    summary: BundleMetrics
  ): string[] {
    const recommendations: string[] = [];

    // Large files recommendation
    const largeFiles = files.filter(f => f.size > 100000);
    if (largeFiles.length > 0) {
      recommendations.push(
        `Consider splitting large files: ${largeFiles
          .slice(0, 3)
          .map(f => f.path)
          .join(', ')}`
      );
    }

    // Bundle size recommendation
    if (summary.gzippedSize > 500000) {
      recommendations.push("Bundle size is large - consider code splitting or tree-shaking");
    }

    // File count recommendation
    if (summary.fileCount > 10) {
      recommendations.push("Many files - consider bundling related modules");
    }

    // Unused dependencies
    const externalDeps = files.flatMap(f => f.imports).filter(imp =>
      ['react', 'lodash', 'moment'].includes(imp)
    );
    if (externalDeps.length === 0) {
      recommendations.push("Consider using external dependencies if importing from node_modules");
    }

    // Health score
    if (summary.bundleHealth < 70) {
      recommendations.push("Bundle health below optimal - review largest files and import patterns");
    }

    return recommendations.length > 0
      ? recommendations
      : ["✓ Bundle looks healthy!"];
  }

  /**
   * Print formatted report
   */
  private static printReport(matrix: BundleMatrix): void {
    console.log("\n" + "=".repeat(60));
    console.log("📦 BUNDLE ANALYSIS REPORT");
    console.log("=".repeat(60));

    console.log(`\n⏰ ${matrix.timestamp}`);
    console.log(`🎯 Target: ${matrix.target}`);

    console.log("\n📊 METRICS");
    console.log("-".repeat(60));
    console.log(`  Total Size:        ${this.formatBytes(matrix.summary.totalSize)}`);
    console.log(`  Gzipped Size:      ${this.formatBytes(matrix.summary.gzippedSize)}`);
    console.log(`  File Count:        ${matrix.summary.fileCount}`);
    console.log(`  Avg File Size:     ${this.formatBytes(matrix.summary.avgFileSize)}`);
    console.log(`  Bundle Health:     ${matrix.summary.bundleHealth}/100`);

    console.log("\n🏆 TOP 5 LARGEST FILES");
    console.log("-".repeat(60));
    matrix.summary.largestFiles.forEach((file, i) => {
      console.log(`  ${i + 1}. ${file.path}`);
      console.log(`     Size: ${this.formatBytes(file.size)}`);
      console.log(`     Imports: ${file.imports.length}`);
    });

    console.log("\n✅ COMPLIANCE CHECKS");
    console.log("-".repeat(60));
    matrix.compliance.forEach(check => {
      const icon = check.passed ? "✓" : "✗";
      console.log(`  ${icon} ${check.rule}`);
      console.log(`    ${check.details}`);
    });

    console.log("\n💡 RECOMMENDATIONS");
    console.log("-".repeat(60));
    matrix.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });

    console.log("\n" + "=".repeat(60) + "\n");
  }

  /**
   * Format bytes to human-readable
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Compare two analyses
   */
  static compareAnalyses(
    before: BundleMatrix,
    after: BundleMatrix
  ): {
    sizeChange: number;
    healthChange: number;
    fileCountChange: number;
    summary: string;
  } {
    const sizeChange = after.summary.totalSize - before.summary.totalSize;
    const healthChange = after.summary.bundleHealth - before.summary.bundleHealth;
    const fileCountChange = after.summary.fileCount - before.summary.fileCount;

    const sizePercent = ((sizeChange / before.summary.totalSize) * 100).toFixed(1);
    const summary = `Size: ${sizeChange > 0 ? '+' : ''}${this.formatBytes(sizeChange)} (${sizePercent}%) | Health: ${healthChange > 0 ? '+' : ''}${healthChange} | Files: ${fileCountChange > 0 ? '+' : ''}${fileCountChange}`;

    return { sizeChange, healthChange, fileCountChange, summary };
  }

  /**
   * Export metrics to JSON file
   */
  static async exportMetrics(
    matrix: BundleMatrix,
    filepath: string = "./bundle-metrics.json"
  ): Promise<void> {
    await Bun.write(filepath, JSON.stringify(matrix, null, 2));
    console.log(`✓ Metrics exported to ${filepath}`);
  }

  /**
   * Load previous metrics from JSON
   */
  static async loadMetrics(filepath: string = "./bundle-metrics.json"): Promise<BundleMatrix | null> {
    try {
      const file = Bun.file(filepath);
      const exists = await file.exists?.();
      if (!exists) return null;
      const content = await file.json();
      return content as BundleMatrix;
    } catch {
      return null;
    }
  }
}
