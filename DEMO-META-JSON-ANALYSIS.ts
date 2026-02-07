// Demo: Bun Meta.json Analysis Showcase
// Comprehensive demonstration of build metadata analysis capabilities

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

interface MetaInput {
  bytes: number;
  imports: string[];
  format: "esm" | "cjs" | "iife";
}

interface MetaOutput {
  bytes: number;
  inputs: Record<string, { bytesInOutput: number }>;
  imports: string[];
  exports: string[];
  entryPoint: string;
}

interface MetaJSON {
  inputs: Record<string, MetaInput>;
  outputs: Record<string, MetaOutput>;
}

interface AnalysisResult {
  totalInputSize: number;
  totalOutputSize: number;
  sizeChange: number;
  sizeChangePercentage: number;
  fileCount: number;
  largestFile: { path: string; size: number };
  overheadBytes: number;
  efficiency: number;
}

class MetaJSONAnalyzer {
  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  private formatPercentage(value: number): string {
    return value.toFixed(1) + "%";
  }

  analyzeBasicMetrics(meta: MetaJSON): AnalysisResult {
    console.log('📊 Basic Metrics Analysis');
    console.log('==========================');

    const totalInputSize = Object.values(meta.inputs)
      .reduce((sum, input) => sum + input.bytes, 0);

    const totalOutputSize = Object.values(meta.outputs)
      .reduce((sum, output) => sum + output.bytes, 0);

    const sizeChange = totalOutputSize - totalInputSize;
    const sizeChangePercentage = (sizeChange / totalInputSize) * 100;

    const fileCount = Object.keys(meta.inputs).length;

    const largestFile = Object.entries(meta.outputs)
      .reduce((max, [path, output]) => 
        output.bytes > max.size ? { path, size: output.bytes } : max, 
        { path: "", size: 0 });

    const contentBytes = Object.values(meta.outputs)
      .reduce((sum, output) => 
        sum + Object.values(output.inputs)
          .reduce((s, input) => s + input.bytesInOutput, 0), 0);

    const overheadBytes = totalOutputSize - contentBytes;
    const efficiency = (contentBytes / totalOutputSize) * 100;

    const result: AnalysisResult = {
      totalInputSize,
      totalOutputSize,
      sizeChange,
      sizeChangePercentage,
      fileCount,
      largestFile,
      overheadBytes,
      efficiency
    };

    console.log(`📁 Total Input Files: ${fileCount}`);
    console.log(`📥 Total Input Size: ${this.formatBytes(totalInputSize)}`);
    console.log(`📤 Total Output Size: ${this.formatBytes(totalOutputSize)}`);
    console.log(`📈 Size Change: ${this.formatBytes(sizeChange)} (${this.formatPercentage(sizeChangePercentage)})`);
    console.log(`📦 Largest File: ${largestFile.path} (${this.formatBytes(largestFile.size)})`);
    console.log(`🔧 Bundler Overhead: ${this.formatBytes(overheadBytes)}`);
    console.log(`⚡ Efficiency: ${this.formatPercentage(efficiency)} (content preservation)`);
    console.log('');

    return result;
  }

  analyzeDependencies(meta: MetaJSON): void {
    console.log('🔗 Dependency Analysis');
    console.log('=======================');

    const dependencyMap = new Map<string, string[]>();
    
    // Build dependency map
    for (const [inputPath, input] of Object.entries(meta.inputs)) {
      dependencyMap.set(inputPath, input.imports);
    }

    // Analyze each file's dependencies
    let totalImports = 0;
    let filesWithImports = 0;

    for (const [path, imports] of dependencyMap) {
      totalImports += imports.length;
      if (imports.length > 0) {
        filesWithImports++;
        console.log(`📄 ${path}`);
        console.log(`   📥 Imports: ${imports.length}`);
        if (imports.length > 0) {
          console.log(`   📋 Dependencies: ${imports.join(', ')}`);
        }
      }
    }

    console.log('');
    console.log(`📊 Dependency Summary:`);
    console.log(`   Files with imports: ${filesWithImports}/${Object.keys(meta.inputs).length}`);
    console.log(`   Total imports: ${totalImports}`);
    console.log(`   Average imports per file: ${filesWithImports > 0 ? (totalImports / filesWithImports).toFixed(1) : 0}`);
    console.log('');
  }

  analyzeFormats(meta: MetaJSON): void {
    console.log('📋 Module Format Analysis');
    console.log('========================');

    const formatCounts = new Map<string, number>();
    const formatSizes = new Map<string, number>();

    for (const [path, input] of Object.entries(meta.inputs)) {
      const format = input.format;
      formatCounts.set(format, (formatCounts.get(format) || 0) + 1);
      formatSizes.set(format, (formatSizes.get(format) || 0) + input.bytes);
    }

    console.log('📊 Format Distribution:');
    for (const [format, count] of formatCounts) {
      const size = formatSizes.get(format) || 0;
      console.log(`   ${format.toUpperCase()}: ${count} files (${this.formatBytes(size)})`);
    }
    console.log('');
  }

  analyzeOptimizationOpportunities(meta: MetaJSON): void {
    console.log('🚀 Optimization Opportunities');
    console.log('============================');

    const opportunities = [];

    // Check for high overhead
    const totalOutputSize = Object.values(meta.outputs)
      .reduce((sum, output) => sum + output.bytes, 0);

    const totalContentBytes = Object.values(meta.outputs)
      .reduce((sum, output) => 
        sum + Object.values(output.inputs)
          .reduce((s, input) => s + input.bytesInOutput, 0), 0);

    const overheadPercentage = ((totalOutputSize - totalContentBytes) / totalOutputSize) * 100;

    if (overheadPercentage > 50) {
      opportunities.push({
        type: 'High Overhead',
        description: `Bundler overhead is ${this.formatPercentage(overheadPercentage)}`,
        recommendation: 'Consider tree-shaking or code splitting',
        severity: 'medium'
      });
    }

    // Check for unused exports
    for (const [outputPath, output] of Object.entries(meta.outputs)) {
      if (output.exports.length === 0 && output.bytes > 1000) {
        opportunities.push({
          type: 'No Exports',
          description: `${outputPath} has no exports but is ${this.formatBytes(output.bytes)}`,
          recommendation: 'Consider if this file should be a module or remove unused code',
          severity: 'low'
        });
      }
    }

    // Check for large files
    for (const [outputPath, output] of Object.entries(meta.outputs)) {
      if (output.bytes > 100 * 1024) { // 100KB
        opportunities.push({
          type: 'Large File',
          description: `${outputPath} is ${this.formatBytes(output.bytes)}`,
          recommendation: 'Consider code splitting or lazy loading',
          severity: 'high'
        });
      }
    }

    if (opportunities.length === 0) {
      console.log('✅ No optimization opportunities detected!');
    } else {
      console.log(`🔍 Found ${opportunities.length} optimization opportunities:`);
      opportunities.forEach((opp, index) => {
        const severityIcon = opp.severity === 'high' ? '🔴' : opp.severity === 'medium' ? '🟡' : '🟢';
        console.log(`\n${index + 1}. ${severityIcon} ${opp.type}`);
        console.log(`   📝 ${opp.description}`);
        console.log(`   💡 ${opp.recommendation}`);
      });
    }
    console.log('');
  }

  generateDependencyGraph(meta: MetaJSON): void {
    console.log('🕸️ Dependency Graph Data');
    console.log('========================');

    const nodes = [];
    const edges = [];

    // Add input nodes
    for (const [path, input] of Object.entries(meta.inputs)) {
      nodes.push({
        id: path,
        label: path.split('/').pop() || path,
        type: 'input',
        size: input.bytes,
        format: input.format
      });
    }

    // Add output nodes and edges
    for (const [outputPath, output] of Object.entries(meta.outputs)) {
      nodes.push({
        id: outputPath,
        label: outputPath.split('/').pop() || outputPath,
        type: 'output',
        size: output.bytes,
        entryPoint: output.entryPoint
      });

      // Add edges from inputs to outputs
      for (const [inputPath, input] of Object.entries(output.inputs)) {
        edges.push({
          from: inputPath,
          to: outputPath,
          weight: input.bytesInOutput,
          contribution: ((input.bytesInOutput / output.bytes) * 100).toFixed(1) + '%'
        });
      }
    }

    console.log(`📊 Graph Statistics:`);
    console.log(`   Nodes: ${nodes.length} (${nodes.filter(n => n.type === 'input').length} inputs, ${nodes.filter(n => n.type === 'output').length} outputs)`);
    console.log(`   Edges: ${edges.length}`);

    if (edges.length > 0) {
      console.log(`\n🔗 Dependencies:`);
      edges.forEach(edge => {
        console.log(`   ${edge.from.split('/').pop()} → ${edge.to.split('/').pop()} (${edge.contribution})`);
      });
    }
    console.log('');
  }

  generateLLMAnalysis(meta: MetaJSON): void {
    console.log('🤖 LLM-Friendly Analysis');
    console.log('========================');

    const analysis = [];

    analysis.push('# Build Analysis Report');
    analysis.push('');
    analysis.push('## Overview');
    analysis.push(`- Input Files: ${Object.keys(meta.inputs).length}`);
    analysis.push(`- Output Files: ${Object.keys(meta.outputs).length}`);
    
    const totalInputSize = Object.values(meta.inputs).reduce((sum, input) => sum + input.bytes, 0);
    const totalOutputSize = Object.values(meta.outputs).reduce((sum, output) => sum + output.bytes, 0);
    
    analysis.push(`- Total Input Size: ${this.formatBytes(totalInputSize)}`);
    analysis.push(`- Total Output Size: ${this.formatBytes(totalOutputSize)}`);
    analysis.push(`- Size Change: ${this.formatBytes(totalOutputSize - totalInputSize)}`);
    analysis.push('');

    analysis.push('## Input Files');
    for (const [path, input] of Object.entries(meta.inputs)) {
      analysis.push(`### ${path}`);
      analysis.push(`- Size: ${this.formatBytes(input.bytes)}`);
      analysis.push(`- Format: ${input.format}`);
      analysis.push(`- Imports: ${input.imports.length}`);
      if (input.imports.length > 0) {
        analysis.push(`- Dependencies: ${input.imports.join(', ')}`);
      }
      analysis.push('');
    }

    analysis.push('## Output Files');
    for (const [path, output] of Object.entries(meta.outputs)) {
      analysis.push(`### ${path}`);
      analysis.push(`- Size: ${this.formatBytes(output.bytes)}`);
      analysis.push(`- Entry Point: ${output.entryPoint}`);
      analysis.push(`- Exports: ${output.exports.length}`);
      analysis.push(`- Input Contributions: ${Object.keys(output.inputs).length}`);
      analysis.push('');
    }

    analysis.push('## Optimization Recommendations');
    
    const overhead = totalOutputSize - Object.values(meta.outputs)
      .reduce((sum, output) => 
        sum + Object.values(output.inputs)
          .reduce((s, input) => s + input.bytesInOutput, 0), 0);
    
    if (overhead > totalOutputSize * 0.3) {
      analysis.push('- CONSIDER: High bundler overhead detected. Review bundle composition.');
    }
    
    if (totalOutputSize > 1024 * 1024) {
      analysis.push('- CONSIDER: Large bundle size. Implement code splitting.');
    }

    const llmOutput = analysis.join('\n');
    console.log(llmOutput);
    console.log('');

    // Save to file
    const outputDir = join(process.cwd(), "meta-analysis-output");
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    writeFileSync(join(outputDir, "llm-analysis.md"), llmOutput);
    console.log(`💾 LLM analysis saved to: ${join(outputDir, "llm-analysis.md")}`);
    console.log('');
  }

  generatePerformanceReport(meta: MetaJSON): void {
    console.log('📈 Performance Report');
    console.log('=====================');

    const metrics = {
      bundleComplexity: this.calculateComplexity(meta),
      modularityScore: this.calculateModularity(meta),
      optimizationScore: this.calculateOptimizationScore(meta),
      buildEfficiency: this.calculateBuildEfficiency(meta)
    };

    console.log('📊 Performance Metrics:');
    console.log(`   Bundle Complexity: ${metrics.bundleComplexity}/10`);
    console.log(`   Modularity Score: ${metrics.modularityScore}/10`);
    console.log(`   Optimization Score: ${metrics.optimizationScore}/10`);
    console.log(`   Build Efficiency: ${metrics.buildEfficiency}/10`);

    const overallScore = (metrics.bundleComplexity + metrics.modularityScore + 
                         metrics.optimizationScore + metrics.buildEfficiency) / 4;

    console.log(`\n🏆 Overall Score: ${overallScore.toFixed(1)}/10`);

    // Grade assignment
    let grade = 'A';
    if (overallScore < 8) grade = 'B';
    if (overallScore < 6) grade = 'C';
    if (overallScore < 4) grade = 'D';

    console.log(`📋 Grade: ${grade}`);
    console.log('');

    // Recommendations based on scores
    if (metrics.bundleComplexity < 6) {
      console.log('💡 Recommendation: Consider simplifying bundle structure');
    }
    if (metrics.modularityScore < 6) {
      console.log('💡 Recommendation: Improve code modularity and separation of concerns');
    }
    if (metrics.optimizationScore < 6) {
      console.log('💡 Recommendation: Implement optimization techniques (tree-shaking, code splitting)');
    }
    if (metrics.buildEfficiency < 6) {
      console.log('💡 Recommendation: Review build configuration for better efficiency');
    }
    console.log('');
  }

  private calculateComplexity(meta: MetaJSON): number {
    const fileCount = Object.keys(meta.inputs).length;
    const totalDependencies = Object.values(meta.inputs)
      .reduce((sum, input) => sum + input.imports.length, 0);
    
    // Simple complexity scoring (lower is better)
    const dependencyRatio = totalDependencies / fileCount;
    return Math.max(1, 10 - dependencyRatio * 2);
  }

  private calculateModularity(meta: MetaJSON): number {
    const outputCount = Object.keys(meta.outputs).length;
    const inputCount = Object.keys(meta.inputs).length;
    
    // Good modularity: reasonable output-to-input ratio
    const ratio = outputCount / inputCount;
    if (ratio >= 0.5 && ratio <= 2) return 9;
    if (ratio >= 0.3 && ratio <= 3) return 7;
    return 5;
  }

  private calculateOptimizationScore(meta: MetaJSON): number {
    const totalOutputSize = Object.values(meta.outputs)
      .reduce((sum, output) => sum + output.bytes, 0);

    const totalContentBytes = Object.values(meta.outputs)
      .reduce((sum, output) => 
        sum + Object.values(output.inputs)
          .reduce((s, input) => s + input.bytesInOutput, 0), 0);

    const efficiency = (totalContentBytes / totalOutputSize) * 100;
    return Math.min(10, efficiency / 10);
  }

  private calculateBuildEfficiency(meta: MetaJSON): number {
    const totalInputSize = Object.values(meta.inputs)
      .reduce((sum, input) => sum + input.bytes, 0);

    const totalOutputSize = Object.values(meta.outputs)
      .reduce((sum, output) => sum + output.bytes, 0);

    const sizeRatio = totalOutputSize / totalInputSize;
    
    // Ideal ratio is close to 1 (minimal overhead)
    if (sizeRatio >= 0.8 && sizeRatio <= 1.5) return 9;
    if (sizeRatio >= 0.6 && sizeRatio <= 2) return 7;
    return 5;
  }

  performCompleteAnalysis(meta: MetaJSON): void {
    console.log('🔍 Comprehensive Meta.json Analysis');
    console.log('===================================');
    console.log('');

    this.analyzeBasicMetrics(meta);
    this.analyzeDependencies(meta);
    this.analyzeFormats(meta);
    this.analyzeOptimizationOpportunities(meta);
    this.generateDependencyGraph(meta);
    this.generateLLMAnalysis(meta);
    this.generatePerformanceReport(meta);

    console.log('✨ Analysis Complete!');
    console.log('==================');
    console.log('All analysis components have been executed successfully.');
    console.log('Check the output directory for generated reports.');
  }
}

// Sample meta.json for demonstration
const sampleMeta: MetaJSON = {
  inputs: {
    "../../tmp/test-entry.js": {
      bytes: 21,
      imports: [],
      format: "esm"
    }
  },
  outputs: {
    "./test-entry.js": {
      bytes: 49,
      inputs: {
        "../../tmp/test-entry.js": {
          "bytesInOutput": 22
        }
      },
      imports: [],
      exports: [],
      entryPoint: "../../tmp/test-entry.js"
    }
  }
};

// Enhanced sample with more complexity
const complexSample: MetaJSON = {
  inputs: {
    "./src/index.js": {
      bytes: 1024,
      imports: ["./utils.js", "./components/Button.js"],
      format: "esm"
    },
    "./src/utils.js": {
      bytes: 512,
      imports: ["./helpers.js"],
      format: "esm"
    },
    "./src/components/Button.js": {
      bytes: 2048,
      imports: ["./styles.css"],
      format: "esm"
    },
    "./src/helpers.js": {
      bytes: 256,
      imports: [],
      format: "esm"
    },
    "./src/styles.css": {
      bytes: 4096,
      imports: [],
      format: "esm"
    }
  },
  outputs: {
    "./dist/bundle.js": {
      bytes: 8192,
      inputs: {
        "./src/index.js": { "bytesInOutput": 1100 },
        "./src/utils.js": { "bytesInOutput": 530 },
        "./src/components/Button.js": { "bytesInOutput": 2100 },
        "./src/helpers.js": { "bytesInOutput": 260 },
        "./src/styles.css": { "bytesInOutput": 4200 }
      },
      imports: [],
      exports: ["default", "Button", "utils"],
      entryPoint: "./src/index.js"
    }
  }
};

// Main execution
async function main() {
  console.log('🚀 Bun Meta.json Analysis Showcase');
  console.log('===================================');
  console.log('This tool demonstrates comprehensive analysis of Bun build metadata.');
  console.log('');

  const analyzer = new MetaJSONAnalyzer();

  console.log('📋 Analyzing Simple Sample (from the GitHub file):');
  console.log('====================================================');
  analyzer.performCompleteAnalysis(sampleMeta);

  console.log('\n' + '='.repeat(60) + '\n');

  console.log('📋 Analyzing Complex Sample (demonstration):');
  console.log('===========================================');
  analyzer.performCompleteAnalysis(complexSample);
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}
