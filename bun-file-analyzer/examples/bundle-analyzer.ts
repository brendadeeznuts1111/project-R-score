#!/usr/bin/env bun

/**
 * Advanced Bundle Analyzer Tool
 * Provides detailed analysis of build artifacts with optimization suggestions
 */

import { readFileSync, existsSync, statSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";
import { Bun } from "bun";

interface BundleAnalysis {
  totalSize: number;
  chunks: ChunkInfo[];
  dependencies: DependencyInfo[];
  assets: AssetInfo[];
  duplicates: DuplicateInfo[];
  unused: UnusedInfo[];
  optimizationScore: number;
  recommendations: Recommendation[];
}

interface ChunkInfo {
  name: string;
  size: number;
  sizeFormatted: string;
  type: 'js' | 'css' | 'html' | 'json';
  dependencies: string[];
  imports: string[];
}

interface DependencyInfo {
  name: string;
  version?: string;
  size: number;
  sizeFormatted: string;
  used: boolean;
  type: 'dependency' | 'devDependency' | 'peer';
  path: string;
}

interface AssetInfo {
  name: string;
  size: number;
  sizeFormatted: string;
  type: string;
  compressed: boolean;
  optimizations: string[];
}

interface DuplicateInfo {
  content: string;
  size: number;
  files: string[];
}

interface UnusedInfo {
  name: string;
  size: number;
  reason: string;
}

interface Recommendation {
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'easy' | 'moderate' | 'complex';
}

class BundleAnalyzer {
  private buildDir: string;
  private packageJson: any;

  constructor(buildDir: string = "./dist") {
    this.buildDir = buildDir;
    this.loadPackageJson();
  }

  private loadPackageJson() {
    try {
      this.packageJson = JSON.parse(readFileSync("package.json", "utf-8"));
    } catch (error) {
      console.warn("Could not read package.json");
      this.packageJson = { dependencies: {}, devDependencies: {} };
    }
  }

  async analyzeBundle(): Promise<BundleAnalysis> {
    console.log("🔍 Analyzing bundle...");
    
    const chunks = await this.analyzeChunks();
    const dependencies = await this.analyzeDependencies();
    const assets = await this.analyzeAssets();
    const duplicates = await this.findDuplicates();
    const unused = await this.findUnused();
    const recommendations = await this.generateRecommendations(chunks, dependencies, assets);
    const optimizationScore = this.calculateOptimizationScore(chunks, dependencies, assets, recommendations);

    return {
      totalSize: chunks.reduce((sum, chunk) => sum + chunk.size, 0),
      chunks,
      dependencies,
      assets,
      duplicates,
      unused,
      optimizationScore,
      recommendations
    };
  }

  private async analyzeChunks(): Promise<ChunkInfo[]> {
    const chunks: ChunkInfo[] = [];
    const fileTypes = ['.js', '.css', '.html', '.json'];

    try {
      const files = readdirSync(this.buildDir, { withFileTypes: true });
      
      for (const file of files) {
        if (file.isFile() && fileTypes.some(type => file.name.endsWith(type))) {
          const filePath = join(this.buildDir, file.name);
          const stats = statSync(filePath);
          const content = readFileSync(filePath, "utf-8");
          
          const chunk: ChunkInfo = {
            name: file.name,
            size: stats.size,
            sizeFormatted: this.formatBytes(stats.size),
            type: this.getFileType(file.name),
            dependencies: this.extractDependencies(content),
            imports: this.extractImports(content)
          };
          
          chunks.push(chunk);
        }
      }
    } catch (error) {
      console.error("Error analyzing chunks:", error);
    }

    return chunks.sort((a, b) => b.size - a.size);
  }

  private async analyzeDependencies(): Promise<DependencyInfo[]> {
    const dependencies: DependencyInfo[] = [];
    const seen = new Set<string>();

    try {
      // Analyze metafiles for dependency information
      const metafile = this.readMetafile();
      if (metafile) {
        for (const [file, info] of Object.entries(metafile.inputs || {})) {
          if (file.includes('node_modules')) {
            const packageName = this.extractPackageName(file);
            if (packageName && !seen.has(packageName)) {
              seen.add(packageName);
              
              const dep: DependencyInfo = {
                name: packageName,
                version: this.getPackageVersion(packageName),
                size: (info as any).bytes || 0,
                sizeFormatted: this.formatBytes((info as any).bytes || 0),
                used: true,
                type: this.getDependencyType(packageName),
                path: file
              };
              
              dependencies.push(dep);
            }
          }
        }
      }

      // Add dependencies from package.json that weren't found in metafile
      const allDeps = { ...this.packageJson.dependencies, ...this.packageJson.devDependencies };
      for (const [name, version] of Object.entries(allDeps)) {
        if (!seen.has(name)) {
          seen.add(name);
          
          const dep: DependencyInfo = {
            name,
            version: version as string,
            size: 0,
            sizeFormatted: "Unknown",
            used: false,
            type: this.getDependencyType(name),
            path: `node_modules/${name}`
          };
          
          dependencies.push(dep);
        }
      }
    } catch (error) {
      console.error("Error analyzing dependencies:", error);
    }

    return dependencies.sort((a, b) => b.size - a.size);
  }

  private async analyzeAssets(): Promise<AssetInfo[]> {
    const assets: AssetInfo[] = [];
    const assetTypes = ['.css', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2', '.webp'];

    try {
      const files = readdirSync(this.buildDir, { withFileTypes: true });
      
      for (const file of files) {
        if (file.isFile() && assetTypes.some(type => file.name.endsWith(type))) {
          const filePath = join(this.buildDir, file.name);
          const stats = statSync(filePath);
          
          const asset: AssetInfo = {
            name: file.name,
            size: stats.size,
            sizeFormatted: this.formatBytes(stats.size),
            type: file.name.split('.').pop() || 'unknown',
            compressed: this.isCompressed(file.name),
            optimizations: this.getAssetOptimizations(file.name, stats.size)
          };
          
          assets.push(asset);
        }
      }
    } catch (error) {
      console.error("Error analyzing assets:", error);
    }

    return assets.sort((a, b) => b.size - a.size);
  }

  private async findDuplicates(): Promise<DuplicateInfo[]> {
    const duplicates: DuplicateInfo[] = [];
    const contentHash = new Map<string, string[]>();

    try {
      const files = readdirSync(this.buildDir, { withFileTypes: true });
      
      for (const file of files) {
        if (file.isFile() && !file.name.endsWith('.map')) {
          const filePath = join(this.buildDir, file.name);
          const content = readFileSync(filePath);
          const hash = Bun.hash(content.toString());
          
          if (!contentHash.has(hash)) {
            contentHash.set(hash, []);
          }
          contentHash.get(hash)!.push(file.name);
        }
      }
      
      for (const [hash, files] of contentHash) {
        if (files.length > 1) {
          const filePath = join(this.buildDir, files[0]);
          const stats = statSync(filePath);
          
          duplicates.push({
            content: hash,
            size: stats.size,
            files
          });
        }
      }
    } catch (error) {
      console.error("Error finding duplicates:", error);
    }

    return duplicates;
  }

  private async findUnused(): Promise<UnusedInfo[]> {
    const unused: UnusedInfo[] = [];
    
    // This is a simplified implementation
    // In a real scenario, you'd analyze import/export usage
    
    try {
      const allDeps = { ...this.packageJson.dependencies, ...this.packageJson.devDependencies };
      const metafile = this.readMetafile();
      
      if (metafile) {
        const usedDeps = new Set<string>();
        
        for (const [file] of Object.entries(metafile.inputs || {})) {
          if (file.includes('node_modules')) {
            const packageName = this.extractPackageName(file);
            if (packageName) {
              usedDeps.add(packageName);
            }
          }
        }
        
        for (const [name, version] of Object.entries(allDeps)) {
          if (!usedDeps.has(name)) {
            unused.push({
              name,
              size: 0,
              reason: "Not found in build artifacts"
            });
          }
        }
      }
    } catch (error) {
      console.error("Error finding unused dependencies:", error);
    }

    return unused;
  }

  private async generateRecommendations(
    chunks: ChunkInfo[], 
    dependencies: DependencyInfo[], 
    assets: AssetInfo[]
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Bundle size recommendations
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    if (totalSize > 5 * 1024 * 1024) {
      recommendations.push({
        type: 'error',
        title: 'Bundle size exceeds 5MB',
        description: 'Consider code splitting, lazy loading, or removing unused dependencies',
        impact: 'high',
        effort: 'moderate'
      });
    } else if (totalSize > 2 * 1024 * 1024) {
      recommendations.push({
        type: 'warning',
        title: 'Large bundle size',
        description: 'Bundle is getting large, consider optimization',
        impact: 'medium',
        effort: 'easy'
      });
    }

    // Dependency recommendations
    const unusedDeps = dependencies.filter(dep => !dep.used);
    if (unusedDeps.length > 5) {
      recommendations.push({
        type: 'warning',
        title: 'Many unused dependencies',
        description: `Found ${unusedDeps.length} unused dependencies that can be removed`,
        impact: 'medium',
        effort: 'easy'
      });
    }

    // Large dependencies
    const largeDeps = dependencies.filter(dep => dep.size > 100 * 1024);
    if (largeDeps.length > 0) {
      recommendations.push({
        type: 'info',
        title: 'Large dependencies detected',
        description: `Consider alternatives for: ${largeDeps.map(d => d.name).join(', ')}`,
        impact: 'medium',
        effort: 'moderate'
      });
    }

    // Asset optimization
    const unoptimizedImages = assets.filter(asset => 
      ['png', 'jpg', 'jpeg'].includes(asset.type) && !asset.compressed
    );
    if (unoptimizedImages.length > 0) {
      recommendations.push({
        type: 'info',
        title: 'Unoptimized images',
        description: `${unoptimizedImages.length} images can be compressed`,
        impact: 'low',
        effort: 'easy'
      });
    }

    // Chunk analysis
    const jsChunks = chunks.filter(chunk => chunk.type === 'js');
    if (jsChunks.length > 5) {
      recommendations.push({
        type: 'success',
        title: 'Good chunk splitting',
        description: 'Application is well-split into multiple chunks',
        impact: 'low',
        effort: 'none'
      });
    }

    return recommendations;
  }

  private calculateOptimizationScore(
    chunks: ChunkInfo[],
    dependencies: DependencyInfo[],
    assets: AssetInfo[],
    recommendations: Recommendation[]
  ): number {
    let score = 100;

    // Deduct for large bundle
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    if (totalSize > 5 * 1024 * 1024) score -= 30;
    else if (totalSize > 2 * 1024 * 1024) score -= 15;

    // Deduct for unused dependencies
    const unusedCount = dependencies.filter(dep => !dep.used).length;
    score -= Math.min(unusedCount * 2, 20);

    // Deduct for unoptimized assets
    const unoptimizedAssets = assets.filter(asset => !asset.compressed).length;
    score -= Math.min(unoptimizedAssets, 10);

    // Deduct for error recommendations
    const errorCount = recommendations.filter(r => r.type === 'error').length;
    score -= errorCount * 10;

    return Math.max(0, score);
  }

  // Helper methods
  private readMetafile(): any {
    const paths = [
      join(this.buildDir, '.vite', 'metafile.json'),
      join(this.buildDir, '.bun', 'metafile.json'),
      join(this.buildDir, 'metafile.json')
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

  private getPackageVersion(packageName: string): string | undefined {
    return this.packageJson.dependencies?.[packageName] || 
           this.packageJson.devDependencies?.[packageName];
  }

  private getDependencyType(packageName: string): 'dependency' | 'devDependency' | 'peer' {
    if (this.packageJson.dependencies?.[packageName]) return 'dependency';
    if (this.packageJson.devDependencies?.[packageName]) return 'devDependency';
    return 'peer';
  }

  private getFileType(filename: string): ChunkInfo['type'] {
    if (filename.endsWith('.js')) return 'js';
    if (filename.endsWith('.css')) return 'css';
    if (filename.endsWith('.html')) return 'html';
    if (filename.endsWith('.json')) return 'json';
    return 'js';
  }

  private extractDependencies(content: string): string[] {
    const dependencies: string[] = [];
    
    // Match import statements
    const importMatches = content.match(/import.*from\s+['"]([^'"]+)['"]/g) || [];
    for (const match of importMatches) {
      const dep = match.match(/from\s+['"]([^'"]+)['"]/)?.[1];
      if (dep && dep.startsWith('node_modules/')) {
        dependencies.push(dep);
      }
    }

    return [...new Set(dependencies)];
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    
    // Match dynamic imports
    const dynamicMatches = content.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g) || [];
    for (const match of dynamicMatches) {
      const imp = match.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/)?.[1];
      if (imp) imports.push(imp);
    }

    return [...new Set(imports)];
  }

  private isCompressed(filename: string): boolean {
    const compressedExtensions = ['.br', '.gz', '.zip', '.webp'];
    return compressedExtensions.some(ext => filename.includes(ext));
  }

  private getAssetOptimizations(filename: string, size: number): string[] {
    const optimizations: string[] = [];
    
    if (['png', 'jpg', 'jpeg'].includes(filename.split('.').pop() || '')) {
      if (size > 100 * 1024) {
        optimizations.push('Consider WebP format');
      }
      if (!filename.includes('.min') && !filename.includes('.optimized')) {
        optimizations.push('Can be compressed');
      }
    }
    
    if (filename.endsWith('.css') && size > 50 * 1024) {
      optimizations.push('Consider CSS minification');
    }
    
    return optimizations;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async generateReport(outputPath?: string): Promise<string> {
    const analysis = await this.analyzeBundle();
    
    const report = this.generateReportContent(analysis);
    
    if (outputPath) {
      writeFileSync(outputPath, report, 'utf-8');
      console.log(`📄 Report saved to: ${outputPath}`);
    }
    
    return report;
  }

  private generateReportContent(analysis: BundleAnalysis): string {
    return `
# Bundle Analysis Report

Generated: ${new Date().toISOString()}

## 📊 Summary

- **Total Size**: ${this.formatBytes(analysis.totalSize)}
- **Chunks**: ${analysis.chunks.length}
- **Dependencies**: ${analysis.dependencies.length}
- **Assets**: ${analysis.assets.length}
- **Optimization Score**: ${analysis.optimizationScore}/100

## 📦 Chunks

| Name | Size | Type | Dependencies |
|------|------|------|-------------|
${analysis.chunks.map(chunk => 
  `| ${chunk.name} | ${chunk.sizeFormatted} | ${chunk.type} | ${chunk.dependencies.length} |`
).join('\n')}

## 📋 Dependencies

| Name | Size | Type | Used |
|------|------|------|------|
${analysis.dependencies.map(dep => 
  `| ${dep.name} | ${dep.sizeFormatted} | ${dep.type} | ${dep.used ? '✅' : '❌'} |`
).join('\n')}

## 🎨 Assets

| Name | Size | Type | Compressed |
|------|------|------|------------|
${analysis.assets.map(asset => 
  `| ${asset.name} | ${asset.sizeFormatted} | ${asset.type} | ${asset.compressed ? '✅' : '❌'} |`
).join('\n')}

## 🚨 Recommendations

${analysis.recommendations.map(rec => 
  `### ${rec.title} (${rec.type.toUpperCase()})
${rec.description}
**Impact**: ${rec.impact} | **Effort**: ${rec.effort}
`
).join('\n')}

## 📈 Optimization Score: ${analysis.optimizationScore}/100

${analysis.optimizationScore >= 80 ? '🟢 Excellent' : 
  analysis.optimizationScore >= 60 ? '🟡 Good' : 
  analysis.optimizationScore >= 40 ? '🟠 Fair' : '🔴 Needs Improvement'}
`;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const buildDir = args.find(arg => arg.startsWith('--dir='))?.split('=')[1] || './dist';
  const outputPath = args.find(arg => arg.startsWith('--output='))?.split('=')[1];
  const format = args.find(arg => arg.startsWith('--format='))?.split('=')[1] || 'markdown';

  console.log("🔍 Bundle Analyzer");
  console.log(`📁 Analyzing: ${buildDir}`);
  
  const analyzer = new BundleAnalyzer(buildDir);
  
  if (format === 'json') {
    const analysis = await analyzer.analyzeBundle();
    console.log(JSON.stringify(analysis, null, 2));
  } else {
    const report = await analyzer.generateReport(outputPath);
    if (!outputPath) {
      console.log(report);
    }
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { BundleAnalyzer, type BundleAnalysis, type Recommendation };
