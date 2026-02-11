// src/build/enhanced-builder.ts
import type { BuildMetafile, MetafileOptions } from './types';
import { MetafileAnalyzer } from './metafile-analyzer';
import { generateMarkdownReport } from './markdown-generator';

// Enhanced Bun Builder with Metafile Supremacy v4.0
export class EnhancedBuilder {
  private buildOptions: Partial<Bun.BuildConfig>;
  private metafileOptions: MetafileOptions;
  private lastBuildOutputCount = 0;
  private performanceMetrics = {
    startTime: 0,
    endTime: 0,
    metafileGenerationTime: 0,
    analysisTime: 0,
    markdownGenerationTime: 0,
  };

  constructor(options: Partial<Bun.BuildConfig> = {}, metafileOptions: MetafileOptions = {}) {
    this.buildOptions = {
      metafile: true, // Enable metafile by default
      ...options,
    };
    this.metafileOptions = metafileOptions;
  }

  // Main build method with enhanced metafile support
  async build() {
    this.performanceMetrics.startTime = performance.now();
    
    try {
      // Step 1: Execute Bun.build with metafile
      const buildResult = await this.executeBuild();
      this.lastBuildOutputCount = Array.isArray(buildResult.outputs) ? buildResult.outputs.length : 0;
      
      // Step 2: Process metafile if generated
      if (buildResult.metafile) {
        const metafileStartTime = performance.now();
        
        // Step 3: Save metafile in requested formats
        await this.saveMetafile(buildResult.metafile);
        
        this.performanceMetrics.metafileGenerationTime = performance.now() - metafileStartTime;
        
        // Step 4: Run analysis if requested
        if (this.metafileOptions.analyze) {
          const analysisStartTime = performance.now();
          const analysis = await this.runAnalysis(buildResult.metafile);
          this.performanceMetrics.analysisTime = performance.now() - analysisStartTime;
          
          // Step 5: Generate markdown if requested
          if (this.metafileOptions.markdown) {
            const markdownStartTime = performance.now();
            const markdown = this.generateMarkdown(buildResult.metafile, analysis);
            await this.saveMarkdown(markdown);
            this.performanceMetrics.markdownGenerationTime = performance.now() - markdownStartTime;
          }

          this.performanceMetrics.endTime = performance.now();
          return {
            ...buildResult,
            analysis,
            performance: this.getPerformanceMetrics(),
          };
        }
      }
      
      this.performanceMetrics.endTime = performance.now();
      return {
        ...buildResult,
        performance: this.getPerformanceMetrics(),
      };
      
    } catch (error) {
      this.performanceMetrics.endTime = performance.now();
      throw new Error(`Build failed: ${(error as Error).message}`);
    }
  }

  // Execute the actual build
  private async executeBuild(): Promise<Bun.BuildOutput> {
    const buildConfig = {
      ...this.buildOptions,
      metafile: true,
    };

    return await Bun.build(buildConfig as Bun.BuildConfig);
  }

  // Save metafile in different formats
  private async saveMetafile(metafile: BuildMetafile) {
    if (this.metafileOptions.json) {
      const jsonContent = JSON.stringify(metafile, null, 2);
      await Bun.write(this.metafileOptions.json, jsonContent);
      console.log(`📄 Metafile saved: ${this.metafileOptions.json}`);
    }
  }

  // Run comprehensive analysis
  private async runAnalysis(metafile: BuildMetafile) {
    const analyzer = new MetafileAnalyzer(metafile);
    
    return {
      inputAnalysis: analyzer.getInputAnalysis(),
      outputAnalysis: analyzer.getOutputAnalysis(),
      sizeAnalysis: analyzer.getSizeAnalysis(),
      dependencyGraph: analyzer.getDependencyGraph(),
      importFrequency: analyzer.getImportFrequency(),
      unusedExports: analyzer.getUnusedExports(),
      circularDependencies: analyzer.getCircularDependencies(),
      optimizationOpportunities: this.getOptimizationOpportunities(analyzer),
    };
  }

  // Generate markdown report
  private generateMarkdown(metafile: BuildMetafile, analysis: any) {
    const baseMarkdown = generateMarkdownReport(metafile);
    
    // Add analysis section if available
    if (analysis) {
      const analysisSection = this.generateAnalysisSection(analysis);
      return baseMarkdown + '\n\n' + analysisSection;
    }
    
    return baseMarkdown;
  }

  // Save markdown report
  private async saveMarkdown(markdown: string) {
    if (this.metafileOptions.markdown) {
      await Bun.write(this.metafileOptions.markdown, markdown);
      console.log(`📝 Markdown report saved: ${this.metafileOptions.markdown}`);
    }
  }

  // Generate analysis section for markdown
  private generateAnalysisSection(analysis: any): string {
    let section = `## 🔍 Advanced Analysis

### Performance Metrics
- **Analysis Time**: ${this.performanceMetrics.analysisTime.toFixed(2)}ms
- **Markdown Generation**: ${this.performanceMetrics.markdownGenerationTime.toFixed(2)}ms

### Bundle Health Score
${this.generateHealthScore(analysis)}

### Critical Issues
${this.generateCriticalIssues(analysis)}

### Recommendations
${this.generateRecommendations(analysis)}`;

    return section;
  }

  // Generate bundle health score
  private generateHealthScore(analysis: any): string {
    let score = 100;
    const issues: string[] = [];
    
    // Check for unused exports
    if (analysis.unusedExports.length > 0) {
      score -= Math.min(20, analysis.unusedExports.length * 2);
      issues.push(`${analysis.unusedExports.length} unused exports`);
    }
    
    // Check for circular dependencies
    if (analysis.circularDependencies.length > 0) {
      score -= 30;
      issues.push(`${analysis.circularDependencies.length} circular dependencies`);
    }
    
    // Check compression ratio
    if (analysis.sizeAnalysis.compressionRatio > 0.8) {
      score -= 15;
      issues.push('Low compression ratio');
    }
    
    // Check for large files
    const largeFiles = analysis.inputAnalysis.largestFiles.filter(f => f.bytes > 100 * 1024).length;
    if (largeFiles > 0) {
      score -= Math.min(10, largeFiles * 2);
      issues.push(`${largeFiles} large files (>100KB)`);
    }
    
    const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
    
    return `**Score: ${score}/100 (Grade: ${grade})**

${issues.length > 0 ? `Issues detected:\n${issues.map(issue => `- ${issue}`).join('\n')}` : '✅ No critical issues detected'}`;
  }

  // Generate critical issues section
  private generateCriticalIssues(analysis: any): string {
    const issues: string[] = [];
    
    if (analysis.circularDependencies.length > 0) {
      issues.push(`🚨 **Circular Dependencies**: ${analysis.circularDependencies.length} cycles detected`);
    }
    
    if (analysis.unusedExports.length > 10) {
      issues.push(`🚨 **Many Unused Exports**: ${analysis.unusedExports.length} exports never used`);
    }
    
    if (analysis.sizeAnalysis.compressionRatio > 0.9) {
      issues.push(`🚨 **Poor Compression**: ${(analysis.sizeAnalysis.compressionRatio * 100).toFixed(1)}% ratio indicates unused code`);
    }
    
    return issues.length > 0 ? issues.join('\n\n') : '✅ No critical issues detected';
  }

  // Generate recommendations
  private generateRecommendations(analysis: any): string {
    const recommendations: string[] = [];
    
    // Size optimization
    if (analysis.sizeAnalysis.compressionRatio > 0.8) {
      recommendations.push('- **Enable Tree Shaking**: Remove unused exports to improve bundle size');
      recommendations.push('- **Code Splitting**: Consider splitting large bundles into smaller chunks');
    }
    
    // Unused exports
    if (analysis.unusedExports.length > 0) {
      recommendations.push(`- **Remove Unused Exports**: ${analysis.unusedExports.length} exports can be safely removed`);
    }
    
    // Circular dependencies
    if (analysis.circularDependencies.length > 0) {
      recommendations.push('- **Refactor Circular Dependencies**: Restructure modules to eliminate cycles');
    }
    
    // Import optimization
    const heavyImports = Object.entries(analysis.inputAnalysis.importAnalysis)
      .filter(([, data]: any) => data.count > 20)
      .length;
    
    if (heavyImports > 0) {
      recommendations.push('- **Create Barrel Exports**: Reduce import frequency with index files');
    }
    
    return recommendations.length > 0 ? recommendations.join('\n') : '✅ Bundle is well optimized';
  }

  // Get optimization opportunities
  private getOptimizationOpportunities(analyzer: MetafileAnalyzer): string[] {
    return [
      ...analyzer.findOptimizationOpportunities(),
      'Consider using dynamic imports for code splitting',
      'Review bundle splitting strategy for better caching',
      'Enable source maps for better debugging',
    ];
  }

  // Get performance metrics
  private getPerformanceMetrics() {
    return {
      totalBuildTime: this.performanceMetrics.endTime - this.performanceMetrics.startTime,
      metafileGenerationTime: this.performanceMetrics.metafileGenerationTime,
      analysisTime: this.performanceMetrics.analysisTime,
      markdownGenerationTime: this.performanceMetrics.markdownGenerationTime,
      throughput: this.calculateThroughput(),
    };
  }

  // Calculate build throughput
  private calculateThroughput(): number {
    const totalTime = this.performanceMetrics.endTime - this.performanceMetrics.startTime;
    if (totalTime === 0) return 0;

    const totalFiles = this.lastBuildOutputCount || 1;
    return (totalFiles / totalTime) * 1000; // files per second
  }
}

// Convenience functions for common patterns
export async function buildWithMetafile(
  entrypoints: string | string[],
  outdir: string,
  options: MetafileOptions = {}
) {
  const builder = new EnhancedBuilder(
    {
      entrypoints: Array.isArray(entrypoints) ? entrypoints : [entrypoints],
      outdir,
    },
    options
  );
  
  return await builder.build();
}

export async function buildAndAnalyze(
  entrypoints: string | string[],
  outdir: string,
  metafileJson?: string,
  metafileMd?: string
) {
  return buildWithMetafile(entrypoints, outdir, {
    json: metafileJson,
    markdown: metafileMd,
    analyze: true,
  });
}

// CLI-style build function
export async function buildWithCLIOptions(args: {
  entrypoints: string[];
  outdir: string;
  metafile?: string;
  'metafile-md'?: string;
  analyze?: boolean;
}) {
  const options: MetafileOptions = {};
  
  if (args.metafile) {
    options.json = args.metafile;
  }
  
  if (args['metafile-md']) {
    options.markdown = args['metafile-md'];
  }
  
  if (args.analyze) {
    options.analyze = true;
  }
  
  return buildWithMetafile(args.entrypoints, args.outdir, options);
}
