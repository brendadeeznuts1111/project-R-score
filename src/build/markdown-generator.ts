// src/build/markdown-generator.ts
import type { BuildMetafile, BundleAnalysis, SizeAnalysis, DependencyGraph } from './types';

// Markdown Generator for Metafile v4.0
export class MarkdownGenerator {
  private metafile: BuildMetafile;

  constructor(metafile: BuildMetafile) {
    this.metafile = metafile;
  }

  // Generate complete markdown report
  public generateReport(): string {
    const sections = [
      this.generateHeader(),
      this.generateOverview(),
      this.generateInputsSection(),
      this.generateOutputsSection(),
      this.generateDependencyGraph(),
      this.generateOptimizationSection(),
      this.generateFooter()
    ];

    return sections.join('\n\n');
  }

  // Generate header
  private generateHeader(): string {
    return `# Bun Build Metafile Report

> Generated on ${new Date().toISOString()} by Bun Metafile Analyzer v4.0`;
  }

  // Generate overview section
  private generateOverview(): string {
    const inputAnalysis = this.analyzeInputs();
    const outputAnalysis = this.analyzeOutputs();
    const compressionRatio = outputAnalysis.totalBytes / inputAnalysis.totalBytes;

    return `## 📊 Overview

| Metric | Value |
|--------|-------|
| **Input Files** | ${inputAnalysis.totalFiles} |
| **Output Files** | ${outputAnalysis.totalFiles} |
| **Total Input Size** | ${this.formatBytes(inputAnalysis.totalBytes)} |
| **Total Output Size** | ${this.formatBytes(outputAnalysis.totalBytes)} |
| **Compression Ratio** | ${(compressionRatio * 100).toFixed(1)}% |
| **Bundle Savings** | ${this.formatBytes(inputAnalysis.totalBytes - outputAnalysis.totalBytes)} |`;
  }

  // Generate inputs section
  private generateInputsSection(): string {
    const analysis = this.analyzeInputs();
    
    let section = `## 📁 Input Analysis

### Summary
- **Total Files**: ${analysis.totalFiles}
- **Total Size**: ${this.formatBytes(analysis.totalBytes)}
- **Average File Size**: ${this.formatBytes(analysis.averageFileSize)}

### Largest Files
| Path | Size | Format |
|------|------|--------|`;

    analysis.largestFiles.forEach(file => {
      section += `\n| \`${file.path}\` | ${this.formatBytes(file.bytes)} | ${file.format || 'unknown'} |`;
    });

    section += `\n\n### Format Breakdown
| Format | Files | Total Size |
|--------|-------|------------|`;

    Object.entries(analysis.formatBreakdown).forEach(([format, data]) => {
      section += `\n| ${format} | ${data.count} | ${this.formatBytes(data.bytes)} |`;
    });

    return section;
  }

  // Generate outputs section
  private generateOutputsSection(): string {
    const analysis = this.analyzeOutputs();
    
    let section = `## 📦 Output Analysis

### Summary
- **Total Bundles**: ${analysis.bundleAnalysis.totalBundles}
- **Entry Points**: ${analysis.bundleAnalysis.entryPointBundles}
- **CSS Bundles**: ${analysis.bundleAnalysis.cssBundles}
- **Average Exports per Bundle**: ${analysis.bundleAnalysis.averageExports.toFixed(1)}

### Export Summary
`;

    Object.entries(analysis.exportAnalysis).forEach(([name, count]) => {
      section += `- **${name}**: exported ${count} times\n`;
    });

    section += `\n### Bundle Details
| Path | Size | Exports | Type |
|------|------|---------|------|`;

    Object.entries(this.metafile.outputs).forEach(([path, meta]) => {
      const type = meta.entryPoint ? 'Entry Point' : meta.cssBundle ? 'CSS Bundle' : 'Bundle';
      section += `\n| \`${path}\` | ${this.formatBytes(meta.bytes)} | ${meta.exports.length} | ${type} |`;
    });

    return section;
  }

  // Generate dependency graph section
  private generateDependencyGraph(): string {
    const graph = this.buildDependencyGraph();
    const density = graph.edges.length / (graph.nodes.length * (graph.nodes.length - 1));
    
    let section = `## 🔗 Dependency Graph

### Graph Statistics
- **Total Nodes**: ${graph.nodes.length}
- **Total Edges**: ${graph.edges.length}
- **Graph Density**: ${density.toFixed(4)}

### Most Connected Nodes
| Node | Connections | Type |
|------|-------------|------|`;

    const connections = new Map<string, number>();
    graph.edges.forEach(edge => {
      connections.set(edge.from, (connections.get(edge.from) || 0) + 1);
      connections.set(edge.to, (connections.get(edge.to) || 0) + 1);
    });

    Array.from(connections.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([node, count]) => {
        const nodeData = graph.nodes.find(n => n.id === node);
        const type = nodeData?.type || 'unknown';
        section += `\n| \`${node}\` | ${count} | ${type} |`;
      });

    return section;
  }

  // Generate optimization section
  private generateOptimizationSection(): string {
    const opportunities = this.findOptimizationOpportunities();
    
    let section = `## 🚨 Optimization Opportunities`;

    if (opportunities.length === 0) {
      section += `\n\n✅ **No major optimization opportunities detected**`;
    } else {
      section += `\n\n`;
      opportunities.forEach(opp => {
        section += `- ⚠️ ${opp}\n`;
      });
    }

    // Add import frequency analysis
    const importFreq = this.getImportFrequency();
    if (importFreq.length > 0) {
      section += `\n### 📈 Import Frequency
| Dependency | Usage Count |
|------------|-------------|`;
      importFreq.slice(0, 10).forEach(imp => {
        section += `\n| \`${imp.path}\` | ${imp.count} |`;
      });
    }

    // Add unused exports
    const unusedExports = this.getUnusedExports();
    if (unusedExports.length > 0) {
      section += `\n\n### 🗑️ Unused Exports
${unusedExports.map(exp => `- \`${exp}\``).join('\n')}`;
    }

    return section;
  }

  // Generate footer
  private generateFooter(): string {
    return `---

*Report generated by [Bun Metafile Analyzer v4.0](https://bun.sh) - World's fastest JavaScript runtime*`;
  }

  // Analysis methods
  private analyzeInputs(): BundleAnalysis {
    const inputs = Object.entries(this.metafile.inputs);
    const totalBytes = inputs.reduce((sum, [, meta]) => sum + meta.bytes, 0);
    const formatBreakdown = this.analyzeFormats(inputs);

    return {
      totalFiles: inputs.length,
      totalBytes,
      averageFileSize: totalBytes / inputs.length,
      formatBreakdown,
      importAnalysis: this.analyzeImports(inputs),
      largestFiles: inputs
        .sort(([, a], [, b]) => b.bytes - a.bytes)
        .slice(0, 10)
        .map(([path, meta]) => ({ path, bytes: meta.bytes, format: meta.format })),
    };
  }

  private analyzeOutputs() {
    const outputs = Object.entries(this.metafile.outputs);
    const totalBytes = outputs.reduce((sum, [, meta]) => sum + meta.bytes, 0);
    const exportAnalysis = this.analyzeExports(outputs);

    return {
      totalFiles: outputs.length,
      totalBytes,
      averageFileSize: totalBytes / outputs.length,
      exportAnalysis,
      bundleAnalysis: {
        totalBundles: outputs.length,
        entryPointBundles: outputs.filter(([, meta]) => meta.entryPoint).length,
        cssBundles: outputs.filter(([, meta]) => meta.cssBundle).length,
        averageExports: outputs.reduce((sum, [, meta]) => sum + meta.exports.length, 0) / outputs.length,
      },
      entryPoints: outputs
        .filter(([, meta]) => meta.entryPoint)
        .map(([path, meta]) => ({ path, entryPoint: meta.entryPoint! })),
      cssBundles: outputs
        .filter(([, meta]) => meta.cssBundle)
        .map(([path, meta]) => ({ path, cssBundle: meta.cssBundle! })),
    };
  }

  private buildDependencyGraph(): DependencyGraph {
    const graph: DependencyGraph = {
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
      meta.imports.forEach(imp => {
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

    return graph;
  }

  // Helper methods
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

  private getImportFrequency() {
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

  private getUnusedExports() {
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

    // Check for compression opportunities
    const inputSize = Object.values(this.metafile.inputs).reduce((sum, meta) => sum + meta.bytes, 0);
    const outputSize = Object.values(this.metafile.outputs).reduce((sum, meta) => sum + meta.bytes, 0);
    const compressionRatio = outputSize / inputSize;
    
    if (compressionRatio > 0.8) {
      opportunities.push(`Low compression ratio (${(compressionRatio * 100).toFixed(1)}%) - check for unused code`);
    }

    return opportunities;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Factory function
export function generateMarkdownReport(metafile: BuildMetafile): string {
  const generator = new MarkdownGenerator(metafile);
  return generator.generateReport();
}
