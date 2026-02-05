#!/usr/bin/env bun

/**
 * Build Comparison Tool
 * Compare different builds and analyze changes over time
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

interface BuildInfo {
  timestamp: number;
  hash: string;
  totalSize: number;
  chunks: ChunkInfo[];
  dependencies: DependencyInfo[];
  assets: AssetInfo[];
  buildSystem: string;
  buildTime: number;
}

interface ChunkInfo {
  name: string;
  size: number;
  type: string;
}

interface DependencyInfo {
  name: string;
  size: number;
  version?: string;
}

interface AssetInfo {
  name: string;
  size: number;
  type: string;
}

interface ComparisonResult {
  baseline: BuildInfo;
  comparison: BuildInfo;
  summary: {
    totalSizeChange: number;
    totalSizeChangePercent: number;
    chunksAdded: number;
    chunksRemoved: number;
    dependenciesAdded: number;
    dependenciesRemoved: number;
    dependenciesUpdated: number;
    assetsAdded: number;
    assetsRemoved: number;
    buildTimeChange: number;
  };
  details: {
    chunkChanges: ChunkChange[];
    dependencyChanges: DependencyChange[];
    assetChanges: AssetChange[];
    sizeBreakdown: SizeBreakdown;
  };
  recommendations: string[];
}

interface ChunkChange {
  name: string;
  type: 'added' | 'removed' | 'modified';
  sizeBefore?: number;
  sizeAfter?: number;
  sizeChange?: number;
  sizeChangePercent?: number;
}

interface DependencyChange {
  name: string;
  type: 'added' | 'removed' | 'updated' | 'downgraded';
  versionBefore?: string;
  versionAfter?: string;
  sizeBefore?: number;
  sizeAfter?: number;
  sizeChange?: number;
}

interface AssetChange {
  name: string;
  type: 'added' | 'removed' | 'modified';
  sizeBefore?: number;
  sizeAfter?: number;
  sizeChange?: number;
  sizeChangePercent?: number;
}

interface SizeBreakdown {
  byType: { [key: string]: { before: number; after: number; change: number } };
  largestChanges: { name: string; change: number; percent: number }[];
}

class BuildComparator {
  private buildsDir: string;

  constructor(buildsDir: string = "./builds") {
    this.buildsDir = buildsDir;
    this.ensureBuildsDirectory();
  }

  private ensureBuildsDirectory(): void {
    if (!existsSync(this.buildsDir)) {
      mkdirSync(this.buildsDir, { recursive: true });
    }
  }

  async captureBuild(buildDir: string = "./dist", label?: string): Promise<string> {
    console.log(`📸 Capturing build from ${buildDir}...`);
    
    const buildInfo = await this.analyzeBuild(buildDir);
    const timestamp = Date.now();
    const hash = this.generateHash(buildInfo);
    
    const filename = `${timestamp}-${hash.slice(0, 8)}${label ? `-${label}` : ''}.json`;
    const filepath = join(this.buildsDir, filename);
    
    const captureData = {
      ...buildInfo,
      timestamp,
      hash,
      label,
      capturedAt: new Date().toISOString()
    };
    
    writeFileSync(filepath, JSON.stringify(captureData, null, 2));
    console.log(`✅ Build captured: ${filename}`);
    
    return filename;
  }

  private async analyzeBuild(buildDir: string): Promise<Omit<BuildInfo, 'timestamp' | 'hash'>> {
    const chunks: ChunkInfo[] = [];
    const dependencies: DependencyInfo[] = [];
    const assets: AssetInfo[] = [];
    let totalSize = 0;
    let buildSystem = 'Unknown';
    let buildTime = Date.now();

    try {
      // Analyze chunks
      const files = readFileSync(buildDir);
      for (const file of files) {
        if (file.isFile()) {
          const filePath = join(buildDir, file.name);
          const stats = readFileSync(filePath);
          const size = stats.length;
          
          totalSize += size;
          
          const fileType = this.getFileType(file.name);
          const info = { name: file.name, size, type: fileType };
          
          if (fileType === 'js' || fileType === 'css' || fileType === 'html') {
            chunks.push(info);
          } else if (fileType === 'asset') {
            assets.push(info);
          }
        }
      }

      // Detect build system
      if (existsSync(join(buildDir, '.vite'))) buildSystem = 'Vite';
      else if (existsSync(join(buildDir, '.bun'))) buildSystem = 'Bun';
      else if (existsSync(join(buildDir, 'webpack-stats.json'))) buildSystem = 'Webpack';

      // Extract dependencies from metafiles
      const metafile = this.readMetafile(buildDir);
      if (metafile) {
        for (const [file, info] of Object.entries(metafile.inputs || {})) {
          if (file.includes('node_modules')) {
            const packageName = this.extractPackageName(file);
            if (packageName) {
              dependencies.push({
                name: packageName,
                size: (info as any).bytes || 0
              });
            }
          }
        }
      }

    } catch (error) {
      console.error("Error analyzing build:", error);
    }

    return {
      totalSize,
      chunks,
      dependencies,
      assets,
      buildSystem,
      buildTime
    };
  }

  async compareBuilds(baselineFile: string, comparisonFile: string): Promise<ComparisonResult> {
    console.log(`🔍 Comparing builds: ${baselineFile} vs ${comparisonFile}`);
    
    const baseline = this.loadBuild(baselineFile);
    const comparison = this.loadBuild(comparisonFile);
    
    const summary = this.calculateSummary(baseline, comparison);
    const details = this.calculateDetails(baseline, comparison);
    const recommendations = this.generateRecommendations(summary, details);
    
    return {
      baseline,
      comparison,
      summary,
      details,
      recommendations
    };
  }

  async compareLatest(count: number = 2): Promise<ComparisonResult> {
    const builds = this.listBuilds().slice(-count);
    if (builds.length < 2) {
      throw new Error("Need at least 2 builds to compare");
    }
    
    return this.compareBuilds(builds[0], builds[1]);
  }

  private calculateSummary(baseline: BuildInfo, comparison: BuildInfo): ComparisonResult['summary'] {
    const totalSizeChange = comparison.totalSize - baseline.totalSize;
    const totalSizeChangePercent = baseline.totalSize > 0 
      ? (totalSizeChange / baseline.totalSize) * 100 
      : 0;

    const baselineChunkNames = new Set(baseline.chunks.map(c => c.name));
    const comparisonChunkNames = new Set(comparison.chunks.map(c => c.name));
    
    const chunksAdded = comparison.chunks.filter(c => !baselineChunkNames.has(c.name)).length;
    const chunksRemoved = baseline.chunks.filter(c => !comparisonChunkNames.has(c.name)).length;

    const baselineDeps = new Set(baseline.dependencies.map(d => d.name));
    const comparisonDeps = new Set(comparison.dependencies.map(d => d.name));
    
    const dependenciesAdded = comparison.dependencies.filter(d => !baselineDeps.has(d.name)).length;
    const dependenciesRemoved = baseline.dependencies.filter(d => !comparisonDeps.has(d.name)).length;
    
    const dependenciesUpdated = baseline.dependencies.filter(baselineDep => {
      const comparisonDep = comparison.dependencies.find(d => d.name === baselineDep.name);
      return comparisonDep && comparisonDep.size !== baselineDep.size;
    }).length;

    const baselineAssets = new Set(baseline.assets.map(a => a.name));
    const comparisonAssets = new Set(comparison.assets.map(a => a.name));
    
    const assetsAdded = comparison.assets.filter(a => !baselineAssets.has(a.name)).length;
    const assetsRemoved = baseline.assets.filter(a => !comparisonAssets.has(a.name)).length;

    const buildTimeChange = comparison.buildTime - baseline.buildTime;

    return {
      totalSizeChange,
      totalSizeChangePercent,
      chunksAdded,
      chunksRemoved,
      dependenciesAdded,
      dependenciesRemoved,
      dependenciesUpdated,
      assetsAdded,
      assetsRemoved,
      buildTimeChange
    };
  }

  private calculateDetails(baseline: BuildInfo, comparison: BuildInfo): ComparisonResult['details'] {
    const chunkChanges = this.calculateChunkChanges(baseline.chunks, comparison.chunks);
    const dependencyChanges = this.calculateDependencyChanges(baseline.dependencies, comparison.dependencies);
    const assetChanges = this.calculateAssetChanges(baseline.assets, comparison.assets);
    const sizeBreakdown = this.calculateSizeBreakdown(baseline, comparison);

    return {
      chunkChanges,
      dependencyChanges,
      assetChanges,
      sizeBreakdown
    };
  }

  private calculateChunkChanges(baseline: ChunkInfo[], comparison: ChunkInfo[]): ChunkChange[] {
    const changes: ChunkChange[] = [];
    const baselineMap = new Map(baseline.map(c => [c.name, c]));
    const comparisonMap = new Map(comparison.map(c => [c.name, c]));

    // Find added chunks
    for (const [name, chunk] of comparisonMap) {
      if (!baselineMap.has(name)) {
        changes.push({
          name,
          type: 'added',
          sizeAfter: chunk.size
        });
      }
    }

    // Find removed chunks
    for (const [name, chunk] of baselineMap) {
      if (!comparisonMap.has(name)) {
        changes.push({
          name,
          type: 'removed',
          sizeBefore: chunk.size
        });
      }
    }

    // Find modified chunks
    for (const [name, baselineChunk] of baselineMap) {
      const comparisonChunk = comparisonMap.get(name);
      if (comparisonChunk && comparisonChunk.size !== baselineChunk.size) {
        const sizeChange = comparisonChunk.size - baselineChunk.size;
        const sizeChangePercent = baselineChunk.size > 0 
          ? (sizeChange / baselineChunk.size) * 100 
          : 0;

        changes.push({
          name,
          type: 'modified',
          sizeBefore: baselineChunk.size,
          sizeAfter: comparisonChunk.size,
          sizeChange,
          sizeChangePercent
        });
      }
    }

    return changes.sort((a, b) => Math.abs(b.sizeChange || 0) - Math.abs(a.sizeChange || 0));
  }

  private calculateDependencyChanges(baseline: DependencyInfo[], comparison: DependencyInfo[]): DependencyChange[] {
    const changes: DependencyChange[] = [];
    const baselineMap = new Map(baseline.map(d => [d.name, d]));
    const comparisonMap = new Map(comparison.map(d => [d.name, d]));

    // Find added dependencies
    for (const [name, dep] of comparisonMap) {
      if (!baselineMap.has(name)) {
        changes.push({
          name,
          type: 'added',
          versionAfter: dep.version,
          sizeAfter: dep.size
        });
      }
    }

    // Find removed dependencies
    for (const [name, dep] of baselineMap) {
      if (!comparisonMap.has(name)) {
        changes.push({
          name,
          type: 'removed',
          versionBefore: dep.version,
          sizeBefore: dep.size
        });
      }
    }

    // Find updated dependencies
    for (const [name, baselineDep] of baselineMap) {
      const comparisonDep = comparisonMap.get(name);
      if (comparisonDep && comparisonDep.size !== baselineDep.size) {
        changes.push({
          name,
          type: comparisonDep.size > baselineDep.size ? 'updated' : 'downgraded',
          versionBefore: baselineDep.version,
          versionAfter: comparisonDep.version,
          sizeBefore: baselineDep.size,
          sizeAfter: comparisonDep.size,
          sizeChange: comparisonDep.size - baselineDep.size
        });
      }
    }

    return changes.sort((a, b) => Math.abs(b.sizeChange || 0) - Math.abs(a.sizeChange || 0));
  }

  private calculateAssetChanges(baseline: AssetInfo[], comparison: AssetInfo[]): AssetChange[] {
    const changes: AssetChange[] = [];
    const baselineMap = new Map(baseline.map(a => [a.name, a]));
    const comparisonMap = new Map(comparison.map(a => [a.name, a]));

    // Find added assets
    for (const [name, asset] of comparisonMap) {
      if (!baselineMap.has(name)) {
        changes.push({
          name,
          type: 'added',
          sizeAfter: asset.size
        });
      }
    }

    // Find removed assets
    for (const [name, asset] of baselineMap) {
      if (!comparisonMap.has(name)) {
        changes.push({
          name,
          type: 'removed',
          sizeBefore: asset.size
        });
      }
    }

    // Find modified assets
    for (const [name, baselineAsset] of baselineMap) {
      const comparisonAsset = comparisonMap.get(name);
      if (comparisonAsset && comparisonAsset.size !== baselineAsset.size) {
        const sizeChange = comparisonAsset.size - baselineAsset.size;
        const sizeChangePercent = baselineAsset.size > 0 
          ? (sizeChange / baselineAsset.size) * 100 
          : 0;

        changes.push({
          name,
          type: 'modified',
          sizeBefore: baselineAsset.size,
          sizeAfter: comparisonAsset.size,
          sizeChange,
          sizeChangePercent
        });
      }
    }

    return changes.sort((a, b) => Math.abs(b.sizeChange || 0) - Math.abs(a.sizeChange || 0));
  }

  private calculateSizeBreakdown(baseline: BuildInfo, comparison: BuildInfo): SizeBreakdown {
    const byType: { [key: string]: { before: number; after: number; change: number } } = {};
    
    // Group by type for baseline
    baseline.chunks.forEach(chunk => {
      if (!byType[chunk.type]) {
        byType[chunk.type] = { before: 0, after: 0, change: 0 };
      }
      byType[chunk.type].before += chunk.size;
    });

    // Group by type for comparison
    comparison.chunks.forEach(chunk => {
      if (!byType[chunk.type]) {
        byType[chunk.type] = { before: 0, after: 0, change: 0 };
      }
      byType[chunk.type].after += chunk.size;
    });

    // Calculate changes
    Object.keys(byType).forEach(type => {
      byType[type].change = byType[type].after - byType[type].before;
    });

    // Find largest changes
    const allChanges = [
      ...this.details?.chunkChanges || [],
      ...this.details?.assetChanges || []
    ].filter(change => change.type === 'modified' && change.sizeChange)
     .map(change => ({
       name: change.name,
       change: change.sizeChange || 0,
       percent: change.sizeChangePercent || 0
     }))
     .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
     .slice(0, 10);

    return {
      byType,
      largestChanges: allChanges
    };
  }

  private generateRecommendations(summary: ComparisonResult['summary'], details: ComparisonResult['details']): string[] {
    const recommendations: string[] = [];

    if (summary.totalSizeChangePercent > 10) {
      recommendations.push(`⚠️ Bundle size increased by ${summary.totalSizeChangePercent.toFixed(1)}%`);
    } else if (summary.totalSizeChangePercent < -5) {
      recommendations.push(`✅ Bundle size decreased by ${Math.abs(summary.totalSizeChangePercent).toFixed(1)}%`);
    }

    if (summary.dependenciesAdded > 5) {
      recommendations.push(`📦 ${summary.dependenciesAdded} new dependencies added - review if all are necessary`);
    }

    if (summary.dependenciesRemoved > 0) {
      recommendations.push(`🗑️ ${summary.dependenciesRemoved} dependencies removed - good cleanup!`);
    }

    if (summary.chunksAdded > 3) {
      recommendations.push(`📄 ${summary.chunksAdded} new chunks added - consider code splitting strategy`);
    }

    const largeIncreases = details.chunkChanges
      .filter(change => change.type === 'modified' && (change.sizeChange || 0) > 50000)
      .slice(0, 3);
    
    if (largeIncreases.length > 0) {
      recommendations.push(`📈 Large chunk increases: ${largeIncreases.map(c => c.name).join(', ')}`);
    }

    if (recommendations.length === 0) {
      recommendations.push("✅ No significant changes detected");
    }

    return recommendations;
  }

  private loadBuild(filename: string): BuildInfo {
    const filepath = join(this.buildsDir, filename);
    const data = JSON.parse(readFileSync(filepath, 'utf-8'));
    
    return {
      timestamp: data.timestamp,
      hash: data.hash,
      totalSize: data.totalSize,
      chunks: data.chunks,
      dependencies: data.dependencies,
      assets: data.assets,
      buildSystem: data.buildSystem,
      buildTime: data.buildTime
    };
  }

  listBuilds(): string[] {
    try {
      const files = readFileSync(this.buildsDir);
      return files
        .filter((file: any) => file.isFile() && file.name.endsWith('.json'))
        .map((file: any) => file.name)
        .sort();
    } catch (error) {
      return [];
    }
  }

  printComparison(result: ComparisonResult): void {
    console.log("\n" + "=".repeat(60));
    console.log("📊 Build Comparison Results");
    console.log("=".repeat(60));
    
    console.log(`\n📈 Summary:`);
    console.log(`  Total Size Change: ${result.summary.totalSizeChange > 0 ? '+' : ''}${this.formatBytes(result.summary.totalSizeChange)} (${result.summary.totalSizeChangePercent > 0 ? '+' : ''}${result.summary.totalSizeChangePercent.toFixed(1)}%)`);
    console.log(`  Chunks: +${result.summary.chunksAdded} / -${result.summary.chunksRemoved}`);
    console.log(`  Dependencies: +${result.summary.dependenciesAdded} / -${result.summary.dependenciesRemoved} (${result.summary.dependenciesUpdated} updated)`);
    console.log(`  Assets: +${result.summary.assetsAdded} / -${result.summary.assetsRemoved}`);
    console.log(`  Build Time Change: ${result.summary.buildTimeChange > 0 ? '+' : ''}${result.summary.buildTimeChange}ms`);

    console.log(`\n📋 Size Breakdown by Type:`);
    Object.entries(result.details.sizeBreakdown.byType).forEach(([type, sizes]) => {
      const change = sizes.change > 0 ? '+' : '';
      console.log(`  ${type}: ${this.formatBytes(sizes.before)} → ${this.formatBytes(sizes.after)} (${change}${this.formatBytes(sizes.change)})`);
    });

    if (result.details.chunkChanges.length > 0) {
      console.log(`\n📄 Significant Chunk Changes:`);
      result.details.chunkChanges.slice(0, 5).forEach(change => {
        const changeStr = change.sizeChange ? `${change.sizeChange > 0 ? '+' : ''}${this.formatBytes(change.sizeChange || 0)}` : '';
        console.log(`  ${change.name}: ${change.type} ${changeStr}`);
      });
    }

    if (result.details.dependencyChanges.length > 0) {
      console.log(`\n📦 Dependency Changes:`);
      result.details.dependencyChanges.slice(0, 5).forEach(change => {
        const changeStr = change.sizeChange ? `${change.sizeChange > 0 ? '+' : ''}${this.formatBytes(change.sizeChange || 0)}` : '';
        console.log(`  ${change.name}: ${change.type} ${changeStr}`);
      });
    }

    console.log(`\n💡 Recommendations:`);
    result.recommendations.forEach(rec => {
      console.log(`  ${rec}`);
    });

    console.log("\n" + "=".repeat(60));
  }

  async saveComparison(result: ComparisonResult, filename: string): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      comparison: result,
      system: {
        platform: process.platform,
        bunVersion: Bun.version
      }
    };
    
    writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`💾 Comparison saved to: ${filename}`);
  }

  // Helper methods
  private readMetafile(buildDir: string): any {
    const paths = [
      join(buildDir, '.vite', 'metafile.json'),
      join(buildDir, '.bun', 'metafile.json'),
      join(buildDir, 'metafile.json')
    ];

    for (const path of paths) {
      if (existsSync(path)) {
        try {
          return JSON.parse(readFileSync(path, 'utf-8'));
        } catch (error) {
          console.warn(`Could not read metafile: ${path}`);
        }
      }
    }

    return null;
  }

  private extractPackageName(file: string): string | null {
    const match = file.match(/node_modules\/([^\/]+)/);
    return match ? match[1] : null;
  }

  private getFileType(filename: string): string {
    if (filename.endsWith('.js')) return 'js';
    if (filename.endsWith('.css')) return 'css';
    if (filename.endsWith('.html')) return 'html';
    if (filename.endsWith('.json')) return 'json';
    return 'asset';
  }

  private generateHash(buildInfo: any): string {
    const content = JSON.stringify(buildInfo);
    return Bun.hash(content).toString(16);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const buildsDir = args.find(arg => arg.startsWith('--dir='))?.split('=')[1] || './builds';

  const comparator = new BuildComparator(buildsDir);

  switch (command) {
    case 'capture':
      const buildDir = args.find(arg => arg.startsWith('--build='))?.split('=')[1] || './dist';
      const label = args.find(arg => arg.startsWith('--label='))?.split('=')[1];
      await comparator.captureBuild(buildDir, label);
      break;

    case 'compare':
      if (args.length < 3) {
        console.error('Usage: compare <baseline> <comparison>');
        process.exit(1);
      }
      const comparison = await comparator.compareBuilds(args[1], args[2]);
      comparator.printComparison(comparison);
      
      const output = args.find(arg => arg.startsWith('--output='))?.split('=')[1];
      if (output) {
        await comparator.saveComparison(comparison, output);
      }
      break;

    case 'latest':
      const latestComparison = await comparator.compareLatest();
      comparator.printComparison(latestComparison);
      break;

    case 'list':
      const builds = comparator.listBuilds();
      console.log('📁 Available builds:');
      builds.forEach((build, index) => {
        console.log(`  ${index + 1}. ${build}`);
      });
      break;

    default:
      console.log(`
Build Comparison Tool

Usage:
  capture [--build=./dist] [--label=label]    Capture a build snapshot
  compare <baseline> <comparison> [--output=file.json]  Compare two builds
  latest [--output=file.json]               Compare the two most recent builds
  list                                      List all captured builds

Examples:
  capture --build=./dist --label=feature-branch
  compare build1.json build2.json
  latest
  list
      `);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { BuildComparator, type ComparisonResult, type BuildInfo };
