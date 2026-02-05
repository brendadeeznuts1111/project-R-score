#!/usr/bin/env bun

/**
 * 📊 Bundle Analysis Script
 *
 * Analyzes bundle sizes, composition, and optimization opportunities
 */

/// <reference path="./types.d.ts" />
import { readFileSync, readdirSync, statSync } from 'fs';
import { extname, join } from 'path';

interface BundleMetrics {
  name: string;
  size: number;
  sizeFormatted: string;
  gzipSize?: number;
  modules: number;
  features: string[];
  optimizations: string[];
}

interface AnalysisResult {
  bundles: BundleMetrics[];
  totalSize: number;
  totalSizeFormatted: string;
  optimizations: string[];
  warnings: string[];
  recommendations: string[];
}

class BundleAnalyzer {
  private readonly WARNING_THRESHOLD = 500 * 1024; // 500KB
  private readonly OPTIMAL_THRESHOLD = 200 * 1024; // 200KB

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private analyzeBundle(filePath: string): BundleMetrics {
    const stats = statSync(filePath);
    const content = readFileSync(filePath, 'utf-8');
    const name = filePath.split('/').pop() || 'unknown';

    // Extract features from bundle content
    const features = this.extractFeatures(content);

    // Extract optimization indicators
    const optimizations = this.extractOptimizations(content);

    // Count module imports/exports
    const modules = this.countModules(content);

    return {
      name,
      size: stats.size,
      sizeFormatted: this.formatBytes(stats.size),
      modules,
      features,
      optimizations
    };
  }

  private extractFeatures(content: string): string[] {
    const features: string[] = [];

    // Look for feature flag patterns
    const featurePatterns = [
      /FEAT_[A-Z_]+/g,
      /ENV_[A-Z_]+/g,
      /INTEGRATION_[A-Z_]+/g,
      /PLATFORM_[A-Z_]+/g
    ];

    for (const pattern of featurePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        features.push(...matches);
      }
    }

    return Array.from(new Set(features));
  }

  private extractOptimizations(content: string): string[] {
    const optimizations: string[] = [];

    if (!content.includes('console.log')) {
      optimizations.push('Console logging removed');
    }

    if (!content.includes('debugger')) {
      optimizations.push('Debugger statements removed');
    }

    if (content.includes('/*@__PURE__*/')) {
      optimizations.push('PURE annotations present');
    }

    if (content.includes('minified')) {
      optimizations.push('Code minified');
    }

    if (!content.includes('/*# sourceMappingURL')) {
      optimizations.push('Source maps removed');
    }

    return optimizations;
  }

  private countModules(content: string): number {
    const importPatterns = [
      /import\s+.*?from\s+['"][^'"]+['"]/g,
      /export\s+.*?from\s+['"][^'"]+['"]/g,
      /require\s*\(['"][^'"]+['"]\)/g
    ];

    let count = 0;
    for (const pattern of importPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }

    return count;
  }

  private analyzeDirectory(dirPath: string): BundleMetrics[] {
    const bundles: BundleMetrics[] = [];

    if (!readdirSync(dirPath)) {
      return bundles;
    }

    const files = readdirSync(dirPath);

    for (const file of files) {
      const filePath = join(dirPath, file);
      const ext = extname(file);

      if (['.js', '.mjs', '.ts'].includes(ext)) {
        try {
          const metrics = this.analyzeBundle(filePath);
          bundles.push(metrics);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn(`Warning: Could not analyze ${file}: ${errorMessage}`);
        }
      }
    }

    return bundles.sort((a, b) => b.size - a.size);
  }

  private generateRecommendations(bundles: BundleMetrics[]): string[] {
    const recommendations: string[] = [];

    // Size-based recommendations
    const largeBundles = bundles.filter(b => b.size > this.WARNING_THRESHOLD);
    if (largeBundles.length > 0) {
      recommendations.push('Consider code splitting for large bundles');
      recommendations.push('Enable tree shaking for unused dependencies');
    }

    // Feature-based recommendations
    const allFeatures = [...new Set(bundles.flatMap(b => b.features))];
    if (allFeatures.length > 10) {
      recommendations.push('Consider reducing feature flag complexity');
    }

    // Optimization recommendations
    const unoptimizedBundles = bundles.filter(b => b.optimizations.length < 3);
    if (unoptimizedBundles.length > 0) {
      recommendations.push('Enable additional build optimizations');
      recommendations.push('Consider using @PURE annotations for better DCE');
    }

    // Module recommendations
    const highModuleBundles = bundles.filter(b => b.modules > 100);
    if (highModuleBundles.length > 0) {
      recommendations.push('Consider dynamic imports for better lazy loading');
    }

    return recommendations;
  }

  private generateWarnings(bundles: BundleMetrics[]): string[] {
    const warnings: string[] = [];

    for (const bundle of bundles) {
      if (bundle.size > this.WARNING_THRESHOLD) {
        warnings.push(`${bundle.name} is large (${bundle.sizeFormatted})`);
      }

      if (bundle.features.length > 15) {
        warnings.push(`${bundle.name} has many feature flags (${bundle.features.length})`);
      }

      if (bundle.optimizations.length === 0) {
        warnings.push(`${bundle.name} appears unoptimized`);
      }
    }

    return warnings;
  }

  public analyze(distPath: string = 'dist'): AnalysisResult {
    const fullPath = join(process.cwd(), distPath);

    try {
      const bundles = this.analyzeDirectory(fullPath);
      const totalSize = bundles.reduce((sum, b) => sum + b.size, 0);

      return {
        bundles,
        totalSize,
        totalSizeFormatted: this.formatBytes(totalSize),
        optimizations: Array.from(new Set(bundles.flatMap(b => b.optimizations))),
        warnings: this.generateWarnings(bundles),
        recommendations: this.generateRecommendations(bundles)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to analyze bundles: ${errorMessage}`);
    }
  }

  public printAnalysis(result: AnalysisResult): void {
    console.log('\n📊 Bundle Analysis Report');
    console.log('='.repeat(50));

    // Summary
    console.log(`\n📦 Total Bundle Size: ${result.totalSizeFormatted}`);
    console.log(`📚 Number of Bundles: ${result.bundles.length}`);

    // Individual bundles
    console.log('\n📋 Individual Bundles:');
    for (const bundle of result.bundles) {
      const status = bundle.size > this.WARNING_THRESHOLD ? '🚨' :
                    bundle.size > this.OPTIMAL_THRESHOLD ? '⚠️' : '✅';

      console.log(`\n${status} ${bundle.name}`);
      console.log(`   Size: ${bundle.sizeFormatted}`);
      console.log(`   Modules: ${bundle.modules}`);
      console.log(`   Features: ${bundle.features.length}`);
      console.log(`   Optimizations: ${bundle.optimizations.length}`);

      if (bundle.features.length > 0) {
        console.log(`   Active Features: ${bundle.features.slice(0, 5).join(', ')}${bundle.features.length > 5 ? '...' : ''}`);
      }
    }

    // Warnings
    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(w => console.log(`   ${w}`));
    }

    // Optimizations
    if (result.optimizations.length > 0) {
      console.log('\n✅ Applied Optimizations:');
      result.optimizations.forEach(o => console.log(`   ${o}`));
    }

    // Recommendations
    if (result.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      result.recommendations.forEach(r => console.log(`   ${r}`));
    }

    // Overall assessment
    console.log('\n🎯 Overall Assessment:');
    if (result.warnings.length === 0) {
      console.log('   ✅ Excellent: No issues detected');
    } else if (result.warnings.length <= 2) {
      console.log('   🟡 Good: Minor issues to address');
    } else {
      console.log('   🔴 Needs Attention: Multiple issues detected');
    }
  }
}

// CLI interface - Universal approach for all environments
function isMainModule(): boolean {
  // For Bun runtime
  if (typeof globalThis.Bun !== 'undefined') {
    return globalThis.Bun.main === process.argv[1];
  }

  // For Node.js or other environments - check if this file is being executed directly
  return require.main === module || process.argv[1] === __filename;
}

if (isMainModule()) {
  const analyzer = new BundleAnalyzer();
  const args = process.argv.slice(2);
  const distPath = args[0] || 'dist';

  try {
    const result = analyzer.analyze(distPath);
    analyzer.printAnalysis(result);
  } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Analysis failed: ${errorMessage}`);
      process.exit(1);
    }
}

export { BundleAnalyzer };
