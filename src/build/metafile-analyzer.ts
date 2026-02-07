// src/build/metafile-analyzer.ts
import type { BuildMetafile, ImportKind } from './types';

// Metafile Analysis Engine v4.0
export class MetafileAnalyzer {
  private metafile: BuildMetafile;
  private analysisCache = new Map<string, any>();

  constructor(metafile: BuildMetafile) {
    this.metafile = metafile;
  }

  // Core Analysis Methods
  public getInputAnalysis() {
    const cacheKey = 'input-analysis';
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey);
    }

    const inputs = Object.entries(this.metafile.inputs);
    const totalBytes = inputs.reduce((sum, [, meta]) => sum + meta.bytes, 0);
    const formatBreakdown = this.analyzeFormats(inputs);
    const importAnalysis = this.analyzeImports(inputs);

    const analysis = {
      totalFiles: inputs.length,
      totalBytes,
      averageFileSize: totalBytes / inputs.length,
      formatBreakdown,
      importAnalysis,
      largestFiles: inputs
        .sort(([, a], [, b]) => b.bytes - a.bytes)
        .slice(0, 10)
        .map(([path, meta]) => ({ path, bytes: meta.bytes, format: meta.format })),
    };

    this.analysisCache.set(cacheKey, analysis);
    return analysis;
  }

  public getOutputAnalysis() {
    const cacheKey = 'output-analysis';
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey);
    }

    const outputs = Object.entries(this.metafile.outputs);
    const totalBytes = outputs.reduce((sum, [, meta]) => sum + meta.bytes, 0);
    const exportAnalysis = this.analyzeExports(outputs);
    const bundleAnalysis = this.analyzeBundles(outputs);

    const analysis = {
      totalFiles: outputs.length,
      totalBytes,
      averageFileSize: totalBytes / outputs.length,
      exportAnalysis,
      bundleAnalysis,
      entryPoints: outputs
        .filter(([, meta]) => meta.entryPoint)
        .map(([path, meta]) => ({ path, entryPoint: meta.entryPoint })),
      cssBundles: outputs
        .filter(([, meta]) => meta.cssBundle)
        .map(([path, meta]) => ({ path, cssBundle: meta.cssBundle })),
    };

    this.analysisCache.set(cacheKey, analysis);
    return analysis;
  }

  public getDependencyGraph() {
    const cacheKey = 'dependency-graph';
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey);
    }

    const graph: {
      nodes: Array<{ id: string; label: string; type: 'input' | 'output'; bytes: number }>;
      edges: Array<{ from: string; to: string; type: 'import' | 'input'; weight: number }>;
    } = {
      nodes: [],
      edges: [],
    };

    // Add input nodes
    Object.entries(this.metafile.inputs).forEach(([path, meta]) => {
      graph.nodes.push({
        id: path,
        label: path.split('/').pop() || path,
        type: 'input',
        bytes: meta.bytes,
      });

      // Add import edges
      meta.imports.forEach((imp) => {
        graph.edges.push({
          from: imp.path,
          to: path,
          type: 'import',
          weight: 1,
        });
      });
    });

    // Add output nodes and their input relationships
    Object.entries(this.metafile.outputs).forEach(([path, meta]) => {
      graph.nodes.push({
        id: path,
        label: path.split('/').pop() || path,
        type: 'output',
        bytes: meta.bytes,
      });

      // Add input->output edges
      Object.entries(meta.inputs).forEach(([inputPath, inputMeta]) => {
        graph.edges.push({
          from: inputPath,
          to: path,
          type: 'input',
          weight: inputMeta.bytesInOutput,
        });
      });
    });

    this.analysisCache.set(cacheKey, graph);
    return graph;
  }

  public getSizeAnalysis() {
    const cacheKey = 'size-analysis';
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey);
    }

    const inputAnalysis = this.getInputAnalysis();
    const outputAnalysis = this.getOutputAnalysis();

    const analysis = {
      compressionRatio: outputAnalysis.totalBytes / inputAnalysis.totalBytes,
      sizeBreakdown: {
        inputs: inputAnalysis.totalBytes,
        outputs: outputAnalysis.totalBytes,
        savings: inputAnalysis.totalBytes - outputAnalysis.totalBytes,
      },
      largestDependencies: this.findLargestDependencies(),
      optimizationOpportunities: this.findOptimizationOpportunities(),
    };

    this.analysisCache.set(cacheKey, analysis);
    return analysis;
  }

  // Advanced Analysis Methods
  public getImportFrequency() {
    const imports = new Map<string, number>();
    
    Object.values(this.metafile.inputs).forEach((input) => {
      input.imports.forEach((imp) => {
        imports.set(imp.path, (imports.get(imp.path) || 0) + 1);
      });
    });

    return Array.from(imports.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([path, count]) => ({ path, count }));
  }

  public getUnusedExports() {
    const allExports = new Set<string>();
    const usedExports = new Set<string>();

    // Collect all exports
    Object.values(this.metafile.outputs).forEach((output) => {
      output.exports.forEach((exp) => allExports.add(exp));
    });

    // Collect used exports from imports
    Object.values(this.metafile.inputs).forEach((input) => {
      input.imports.forEach((imp) => {
        if (imp.original) {
          usedExports.add(imp.original);
        }
      });
    });

    return Array.from(allExports).filter((exp) => !usedExports.has(exp));
  }

  public getCircularDependencies() {
    const graph = new Map<string, string[]>();
    
    // Build adjacency list
    Object.entries(this.metafile.inputs).forEach(([path, meta]) => {
      const imports = meta.imports
        .filter((imp) => !imp.external && this.metafile.inputs[imp.path])
        .map((imp) => imp.path);
      graph.set(path, imports);
    });

    // Detect cycles using DFS
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): boolean => {
      if (recursionStack.has(node)) {
        const cycleStart = path.indexOf(node);
        cycles.push([...path.slice(cycleStart), node]);
        return true;
      }

      if (visited.has(node)) return false;

      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (dfs(neighbor)) return true;
      }

      recursionStack.delete(node);
      path.pop();
      return false;
    };

    graph.forEach((_, node) => {
      if (!visited.has(node)) {
        dfs(node);
      }
    });

    return cycles;
  }

  // Helper Methods
  private analyzeFormats(inputs: Array<[string, any]>) {
    const formats = new Map<string, { count: number; bytes: number }>();
    
    inputs.forEach(([, meta]) => {
      const format = meta.format || 'esm';
      const current = formats.get(format) || { count: 0, bytes: 0 };
      current.count++;
      current.bytes += meta.bytes;
      formats.set(format, current);
    });

    return Object.fromEntries(formats);
  }

  private analyzeImports(inputs: Array<[string, any]>) {
    const imports = new Map<string, { count: number; external: number; internal: number }>();
    
    inputs.forEach(([, meta]) => {
      meta.imports.forEach((imp: any) => {
        const current = imports.get(imp.path) || { count: 0, external: 0, internal: 0 };
        current.count++;
        if (imp.external) {
          current.external++;
        } else {
          current.internal++;
        }
        imports.set(imp.path, current);
      });
    });

    return Object.fromEntries(imports);
  }

  private analyzeExports(outputs: Array<[string, any]>) {
    const exports = new Map<string, number>();
    
    outputs.forEach(([, meta]) => {
      meta.exports.forEach((exp: string) => {
        exports.set(exp, (exports.get(exp) || 0) + 1);
      });
    });

    return Object.fromEntries(exports);
  }

  private analyzeBundles(outputs: Array<[string, any]>) {
    return {
      totalBundles: outputs.length,
      entryPointBundles: outputs.filter(([, meta]) => meta.entryPoint).length,
      cssBundles: outputs.filter(([, meta]) => meta.cssBundle).length,
      averageExports: outputs.reduce((sum, [, meta]) => sum + meta.exports.length, 0) / outputs.length,
    };
  }

  private findLargestDependencies() {
    const deps = new Map<string, { size: number; files: number }>();
    
    Object.entries(this.metafile.inputs).forEach(([path, meta]) => {
      meta.imports.forEach((imp: any) => {
        if (!imp.external) return;
        
        const current = deps.get(imp.path) || { size: 0, files: 0 };
        current.size += meta.bytes;
        current.files++;
        deps.set(imp.path, current);
      });
    });

    return Array.from(deps.entries())
      .sort(([, a], [, b]) => b.size - a.size)
      .slice(0, 10)
      .map(([path, data]) => ({ path, ...data }));
  }

  private findOptimizationOpportunities() {
    const opportunities: string[] = [];
    
    // Check for large files
    const largeFiles = Object.entries(this.metafile.inputs)
      .filter(([, meta]) => meta.bytes > 100 * 1024) // > 100KB
      .length;
    
    if (largeFiles > 0) {
      opportunities.push(`${largeFiles} files exceed 100KB - consider code splitting`);
    }

    // Check for many imports
    const heavyImports = Object.entries(this.metafile.inputs)
      .filter(([, meta]) => meta.imports.length > 50)
      .length;
    
    if (heavyImports > 0) {
      opportunities.push(`${heavyImports} files have >50 imports - consider barrel exports`);
    }

    // Check for unused exports
    const unusedExports = this.getUnusedExports();
    if (unusedExports.length > 0) {
      opportunities.push(`${unusedExports.length} unused exports detected - consider tree shaking`);
    }

    // Check for circular dependencies
    const circularDeps = this.getCircularDependencies();
    if (circularDeps.length > 0) {
      opportunities.push(`${circularDeps.length} circular dependencies detected - refactor required`);
    }

    return opportunities;
  }

  // Export Methods
  public generateMarkdownReport(): string {
    const inputAnalysis = this.getInputAnalysis();
    const outputAnalysis = this.getOutputAnalysis();
    const sizeAnalysis = this.getSizeAnalysis();
    const dependencyGraph = this.getDependencyGraph();

    return `# Bun Build Metafile Analysis Report

## 📊 Overview
- **Input Files**: ${inputAnalysis.totalFiles}
- **Output Files**: ${outputAnalysis.totalFiles}
- **Total Input Size**: ${this.formatBytes(inputAnalysis.totalBytes)}
- **Total Output Size**: ${this.formatBytes(outputAnalysis.totalBytes)}
- **Compression Ratio**: ${(sizeAnalysis.compressionRatio * 100).toFixed(1)}%

## 📁 Input Analysis
### Largest Files
| Path | Size | Format |
|------|------|--------|
${inputAnalysis.largestFiles.map(f => `| ${f.path} | ${this.formatBytes(f.bytes)} | ${f.format} |`).join('\n')}

### Format Breakdown
| Format | Files | Total Size |
|--------|-------|------------|
${Object.entries(inputAnalysis.formatBreakdown).map(([format, data]: [string, any]) => 
  `| ${format} | ${data.count} | ${this.formatBytes(data.bytes)} |`
).join('\n')}

## 📦 Output Analysis
### Export Summary
${Object.entries(outputAnalysis.exportAnalysis).map(([name, count]) => 
  `- **${name}**: exported ${count} times`
).join('\n')}

### Bundle Information
- **Total Bundles**: ${outputAnalysis.bundleAnalysis.totalBundles}
- **Entry Points**: ${outputAnalysis.bundleAnalysis.entryPointBundles}
- **CSS Bundles**: ${outputAnalysis.bundleAnalysis.cssBundles}
- **Average Exports per Bundle**: ${outputAnalysis.bundleAnalysis.averageExports.toFixed(1)}

## 🔗 Dependency Graph
- **Total Nodes**: ${dependencyGraph.nodes.length}
- **Total Edges**: ${dependencyGraph.edges.length}
- **Graph Density**: ${(dependencyGraph.edges.length / (dependencyGraph.nodes.length * (dependencyGraph.nodes.length - 1))).toFixed(4)}

## 🚨 Optimization Opportunities
${sizeAnalysis.optimizationOpportunities.length > 0 
  ? sizeAnalysis.optimizationOpportunities.map(opp => `- ⚠️ ${opp}`).join('\n')
  : '✅ No major optimization opportunities detected'
}

## 📈 Import Frequency
| Dependency | Usage Count |
|------------|-------------|
${this.getImportFrequency().slice(0, 10).map(imp => 
  `| ${imp.path} | ${imp.count} |`
).join('\n')}

---
*Generated by Bun Metafile Analyzer v4.0*`;
  }

  public generateJSONReport() {
    return {
      timestamp: new Date().toISOString(),
      version: '4.0',
      inputAnalysis: this.getInputAnalysis(),
      outputAnalysis: this.getOutputAnalysis(),
      sizeAnalysis: this.getSizeAnalysis(),
      dependencyGraph: this.getDependencyGraph(),
      importFrequency: this.getImportFrequency(),
      unusedExports: this.getUnusedExports(),
      circularDependencies: this.getCircularDependencies(),
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Factory function for easy usage
export function analyzeMetafile(metafile: BuildMetafile): MetafileAnalyzer {
  return new MetafileAnalyzer(metafile);
}
