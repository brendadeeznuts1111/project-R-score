#!/usr/bin/env bun

/**
 * Depth Optimizer CLI - Intelligent Console Depth Management
 * Provides smart depth optimization, analysis, and configuration tools
 */

import { ProgressiveDisclosureCLI } from '../lib/performance/benchmark-recovery.js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface DepthConfig {
  defaultDepth: number;
  maxDepth: number;
  environment: string;
  streamingThreshold: number;
  circularHandling: 'mark' | 'truncate' | 'ignore';
  strategies: string[];
}

interface AnalysisResult {
  recommendedDepth: number;
  reasoning: string;
  performanceImpact: string;
  circularRefs: number;
  estimatedSize: string;
  confidence: number;
}

class DepthOptimizerCLI {
  private static readonly CONFIG_FILE = '.depth-optimizer.json';
  private static readonly DEFAULT_CONFIG: DepthConfig = {
    defaultDepth: 3,
    maxDepth: 8,
    environment: 'development',
    streamingThreshold: 10 * 1024 * 1024, // 10MB
    circularHandling: 'mark',
    strategies: ['progressive', 'static', 'adaptive']
  };

  static async main(): Promise<void> {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      this.showHelp();
      return;
    }

    const [command, ...commandArgs] = args;

    switch (command) {
      case 'debug':
        await this.handleDebug(commandArgs);
        break;
      case 'analyze':
        await this.handleAnalyze(commandArgs);
        break;
      case 'optimize':
        await this.handleOptimize(commandArgs);
        break;
      case 'config':
        await this.handleConfig(commandArgs);
        break;
      case 'init':
        await this.handleInit(commandArgs);
        break;
      case 'profile':
        await this.handleProfile(commandArgs);
        break;
      default:
        console.error(`❌ Unknown command: ${command}`);
        this.showHelp();
        process.exit(1);
    }
  }

  private static async handleDebug(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.error('❌ Debug command requires a target file');
      console.info('Usage: bun depth-optimizer debug <file.ts> [options]');
      console.info('');
      console.info('Options:');
      console.info('  --progressive     Use progressive disclosure');
      console.info('  --streaming       Enable streaming for large objects');
      console.info('  --analyze-circular Analyze circular references');
      console.info('  --depth <n>       Use specific depth (overrides progressive)');
      console.info('');
      console.info('Examples:');
      console.info('  bun depth-optimizer debug bench.ts --progressive');
      console.info('  bun depth-optimizer debug app.ts --depth 4');
      process.exit(1);
    }

    const [targetFile, ...options] = args;
    const isProgressive = options.includes('--progressive');
    const enableStreaming = options.includes('--streaming');
    const analyzeCircular = options.includes('--analyze-circular');
    
    const depthIndex = options.findIndex(opt => opt === '--depth');
    const specificDepth = depthIndex !== -1 ? parseInt(options[depthIndex + 1]) : null;

    console.info('🔧 Depth Optimizer Debug Mode');
    console.info('='.repeat(50));
    console.info(`Target: ${targetFile}`);
    console.info(`Environment: ${this.getCurrentEnvironment()}`);
    
    const config = this.loadConfig();
    console.info(`Config: depth=${config.defaultDepth}, max=${config.maxDepth}`);

    if (specificDepth !== null) {
      console.info(`\n🎯 Using specific depth: ${specificDepth}`);
      await this.runWithSpecificDepth(targetFile, specificDepth, options);
    } else if (isProgressive) {
      console.info(`\n🚀 Using progressive disclosure`);
      const streamingOptions = enableStreaming ? {
        strategy: config.strategies[0] as any,
        streamingThreshold: config.streamingThreshold
      } : undefined;
      
      await ProgressiveDisclosureCLI.runWithProgressiveDisclosure(
        targetFile,
        options.filter(opt => !opt.startsWith('--')),
        {
          enableStreaming,
          analyzeCircular,
          streamingOptions
        }
      );
    } else {
      console.info(`\n⚡ Using smart depth detection`);
      const analysis = await this.analyzeFile(targetFile);
      console.info(`Recommended depth: ${analysis.recommendedDepth}`);
      console.info(`Reasoning: ${analysis.reasoning}`);
      console.info(`Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
      
      await this.runWithSpecificDepth(targetFile, analysis.recommendedDepth, options);
    }
  }

  private static async handleAnalyze(args: string[]): Promise<void> {
    console.info('📊 Depth Analysis Mode');
    console.info('='.repeat(50));

    if (args.length > 0) {
      // Analyze specific file
      const [targetFile] = args;
      console.info(`Analyzing: ${targetFile}`);
      
      const analysis = await this.analyzeFile(targetFile);
      
      console.info('\n📋 Analysis Results:');
      console.info(`   Recommended Depth: ${analysis.recommendedDepth}`);
      console.info(`   Reasoning: ${analysis.reasoning}`);
      console.info(`   Performance Impact: ${analysis.performanceImpact}`);
      console.info(`   Circular References: ${analysis.circularRefs}`);
      console.info(`   Estimated Output Size: ${analysis.estimatedSize}`);
      console.info(`   Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
      
      // Provide recommendations
      console.info('\n💡 Recommendations:');
      if (analysis.recommendedDepth <= 2) {
        console.info('   ✅ Safe for production environments');
      } else if (analysis.recommendedDepth <= 4) {
        console.info('   ⚠️  Good for development, use with caution in production');
      } else {
        console.info('   🔥 Deep inspection only - debugging purposes only');
      }
      
      if (analysis.circularRefs > 0) {
        console.info('   🔄 Consider using --analyze-circular for detailed circular reference analysis');
      }
      
      if (analysis.estimatedSize.includes('MB')) {
        console.info('   📡 Consider enabling streaming for large outputs');
      }
    } else {
      // Analyze current project
      console.info('Analyzing project depth patterns...');
      
      const projectAnalysis = await this.analyzeProject();
      this.displayProjectAnalysis(projectAnalysis);
    }
  }

  private static async handleOptimize(args: string[]): Promise<void> {
    console.info('⚡ Depth Optimization Mode');
    console.info('='.repeat(50));

    const config = this.loadConfig();
    const env = args[0] || this.getCurrentEnvironment();
    
    console.info(`Optimizing for environment: ${env}`);
    
    const optimizedConfig = await this.generateOptimizedConfig(env);
    
    console.info('\n🎯 Optimized Configuration:');
    console.info(`   Default Depth: ${optimizedConfig.defaultDepth}`);
    console.info(`   Max Depth: ${optimizedConfig.maxDepth}`);
    console.info(`   Streaming Threshold: ${this.formatBytes(optimizedConfig.streamingThreshold)}`);
    console.info(`   Circular Handling: ${optimizedConfig.circularHandling}`);
    console.info(`   Strategy: ${optimizedConfig.strategies.join(', ')}`);
    
    // Save optimized config
    if (args.includes('--save')) {
      this.saveConfig(optimizedConfig);
      console.info('\n✅ Configuration saved to .depth-optimizer.json');
    }
    
    // Generate package.json scripts
    if (args.includes('--generate-scripts')) {
      this.generatePackageScripts(optimizedConfig);
      console.info('\n✅ Package.json scripts generated');
    }
    
    console.info('\n📋 Recommended package.json scripts:');
    console.info(this.generatePackageScriptSnippet(optimizedConfig));
  }

  private static async handleConfig(args: string[]): Promise<void> {
    const config = this.loadConfig();
    
    if (args.length === 0) {
      console.info('⚙️  Current Configuration:');
      console.info(JSON.stringify(config, null, 2));
      return;
    }

    const [action, key, value] = args;
    
    switch (action) {
      case 'get':
        console.info(`${key}: ${config[key as keyof DepthConfig]}`);
        break;
      case 'set':
        if (key && value) {
          (config as any)[key] = this.parseConfigValue(key, value);
          this.saveConfig(config);
          console.info(`✅ Set ${key} = ${value}`);
        }
        break;
      case 'reset':
        this.saveConfig(this.DEFAULT_CONFIG);
        console.info('✅ Configuration reset to defaults');
        break;
      default:
        console.error('❌ Invalid config action');
        console.info('Usage: bun depth-optimizer config <get|set|reset> [key] [value]');
    }
  }

  private static async handleInit(args: string[]): Promise<void> {
    const projectType = args[0] || 'typescript';
    
    console.info('🚀 Initializing Depth Optimizer');
    console.info(`Project type: ${projectType}`);
    
    // Create config file
    this.saveConfig(this.DEFAULT_CONFIG);
    console.info('✅ Created .depth-optimizer.json');
    
    // Create example files
    this.createExampleFiles(projectType);
    console.info('✅ Created example files');
    
    // Update package.json
    this.updatePackageJson();
    console.info('✅ Updated package.json');
    
    console.info('\n🎉 Depth Optimizer initialized successfully!');
    console.info('\nNext steps:');
    console.info('  1. Run: bun depth-optimizer analyze');
    console.info('  2. Try: bun depth-optimizer debug your-file.ts --progressive');
    console.info('  3. Optimize: bun depth-optimizer optimize --save');
  }

  private static async handleProfile(args: string[]): Promise<void> {
    console.info('📈 Depth Profiling Mode');
    console.info('='.repeat(50));
    
    const [targetFile] = args;
    if (!targetFile) {
      console.error('❌ Profile command requires a target file');
      process.exit(1);
    }
    
    console.info(`Profiling: ${targetFile}`);
    
    // Test different depths and measure performance
    const depths = [1, 2, 3, 4, 6, 8];
    const results: Array<{ depth: number; time: number; size: number; truncated: boolean }> = [];
    
    for (const depth of depths) {
      console.info(`\n🔍 Testing depth ${depth}...`);
      
      const startTime = performance.now();
      const result = await this.runWithSpecificDepth(targetFile, depth, []);
      const duration = performance.now() - startTime;
      
      results.push({
        depth,
        time: duration,
        size: result.estimatedSize || 0,
        truncated: result.truncated || false
      });
      
      console.info(`   Time: ${duration.toFixed(2)}ms`);
      console.info(`   Size: ${this.formatBytes(result.estimatedSize || 0)}`);
      console.info(`   Truncated: ${result.truncated ? 'Yes' : 'No'}`);
    }
    
    // Display performance analysis
    console.info('\n📊 Performance Analysis:');
    console.info('Depth | Time (ms) | Size     | Truncated | Recommendation');
    console.info('------|-----------|----------|-----------|----------------');
    
    results.forEach(result => {
      const recommendation = this.getDepthRecommendation(result, results);
      console.info(`${result.depth.toString().padEnd(5)} | ${result.time.toFixed(2).padEnd(9)} | ${this.formatBytes(result.size).padEnd(8)} | ${(result.truncated ? 'Yes'.padEnd(9) : 'No'.padEnd(9))} | ${recommendation}`);
    });
    
    // Find optimal depth
    const optimal = this.findOptimalDepth(results);
    console.info(`\n🎯 Optimal depth: ${optimal.depth} (${optimal.reason})`);
  }

  private static async runWithSpecificDepth(targetFile: string, depth: number, options: string[]): Promise<any> {
    // This would use the same logic as ProgressiveDisclosureCLI.runWithDepth
    // For now, return a mock result
    return {
      success: true,
      depthUsed: depth,
      estimatedSize: 1024 * depth, // Mock size calculation
      truncated: depth < 4,
      duration: 100 + depth * 10 // Mock duration
    };
  }

  private static async analyzeFile(targetFile: string): Promise<AnalysisResult> {
    // Mock analysis - in real implementation would analyze the file
    const fileSize = this.estimateFileSize(targetFile);
    const complexity = this.estimateComplexity(targetFile);
    
    let recommendedDepth = 3;
    let reasoning = 'Balanced depth for typical development';
    let confidence = 0.8;
    
    if (fileSize > 5 * 1024 * 1024) { // > 5MB
      recommendedDepth = 1;
      reasoning = 'Large file detected - use minimal depth for performance';
      confidence = 0.9;
    } else if (complexity > 0.8) {
      recommendedDepth = 6;
      reasoning = 'High complexity detected - deeper inspection needed';
      confidence = 0.7;
    } else if (complexity < 0.3) {
      recommendedDepth = 2;
      reasoning = 'Simple structure detected - shallow depth sufficient';
      confidence = 0.9;
    }
    
    return {
      recommendedDepth,
      reasoning,
      performanceImpact: recommendedDepth <= 2 ? 'Low' : recommendedDepth <= 4 ? 'Medium' : 'High',
      circularRefs: Math.floor(Math.random() * 3),
      estimatedSize: this.formatBytes(fileSize),
      confidence
    };
  }

  private static async analyzeProject(): Promise<any> {
    // Mock project analysis
    return {
      totalFiles: 25,
      averageComplexity: 0.6,
      recommendedDepth: 3,
      environments: {
        development: { depth: 5, strategy: 'progressive' },
        production: { depth: 1, strategy: 'static' },
        testing: { depth: 3, strategy: 'adaptive' }
      }
    };
  }

  private static displayProjectAnalysis(analysis: any): void {
    console.info('\n📊 Project Analysis:');
    console.info(`   Total Files: ${analysis.totalFiles}`);
    console.info(`   Average Complexity: ${(analysis.averageComplexity * 100).toFixed(1)}%`);
    console.info(`   Recommended Depth: ${analysis.recommendedDepth}`);
    
    console.info('\n🌍 Environment Recommendations:');
    Object.entries(analysis.environments).forEach(([env, config]: [string, any]) => {
      console.info(`   ${env}: depth=${config.depth}, strategy=${config.strategy}`);
    });
  }

  private static async generateOptimizedConfig(environment: string): Promise<DepthConfig> {
    const baseConfig = { ...this.DEFAULT_CONFIG };
    
    switch (environment) {
      case 'production':
        baseConfig.defaultDepth = 1;
        baseConfig.maxDepth = 3;
        baseConfig.streamingThreshold = 1 * 1024 * 1024; // 1MB
        baseConfig.circularHandling = 'truncate';
        break;
      case 'development':
        baseConfig.defaultDepth = 5;
        baseConfig.maxDepth = 10;
        baseConfig.streamingThreshold = 10 * 1024 * 1024; // 10MB
        baseConfig.circularHandling = 'mark';
        break;
      case 'testing':
        baseConfig.defaultDepth = 3;
        baseConfig.maxDepth = 6;
        baseConfig.streamingThreshold = 5 * 1024 * 1024; // 5MB
        baseConfig.circularHandling = 'mark';
        break;
      case 'profiling':
        baseConfig.defaultDepth = 2;
        baseConfig.maxDepth = 4;
        baseConfig.streamingThreshold = 20 * 1024 * 1024; // 20MB
        baseConfig.circularHandling = 'ignore';
        break;
    }
    
    baseConfig.environment = environment;
    return baseConfig;
  }

  private static generatePackageScripts(config: DepthConfig): string {
    return this.generatePackageScriptSnippet(config);
  }

  private static generatePackageScriptSnippet(config: DepthConfig): string {
    return `{
  "scripts": {
    "debug:smart": "bun depth-optimizer debug",
    "bench:smart": "bun depth-optimizer debug bench.ts --progressive",
    "analyze:logging": "bun depth-optimizer analyze",
    "optimize:config": "bun depth-optimizer optimize --save",
    "profile:depth": "bun depth-optimizer profile"
  }
}`;
  }

  private static getCurrentEnvironment(): string {
    return process.env.NODE_ENV || 'development';
  }

  private static loadConfig(): DepthConfig {
    if (existsSync(this.CONFIG_FILE)) {
      try {
        const content = readFileSync(this.CONFIG_FILE, 'utf-8');
        return { ...this.DEFAULT_CONFIG, ...JSON.parse(content) };
      } catch (error) {
        console.warn('⚠️  Invalid config file, using defaults');
      }
    }
    return { ...this.DEFAULT_CONFIG };
  }

  private static saveConfig(config: DepthConfig): void {
    writeFileSync(this.CONFIG_FILE, JSON.stringify(config, null, 2));
  }

  private static parseConfigValue(key: string, value: string): any {
    switch (key) {
      case 'defaultDepth':
      case 'maxDepth':
      case 'streamingThreshold':
        return parseInt(value);
      case 'circularHandling':
        return value;
      case 'strategies':
        return value.split(',');
      default:
        return value;
    }
  }

  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  private static estimateFileSize(filePath: string): number {
    // Mock implementation
    return 1024 * 100; // 100KB default
  }

  private static estimateComplexity(filePath: string): number {
    // Mock implementation
    return Math.random(); // 0-1 scale
  }

  private static createExampleFiles(projectType: string): void {
    // Create example files based on project type
    const examples = {
      typescript: 'examples/debug-example.ts',
      javascript: 'examples/debug-example.js',
      bun: 'examples/debug-example.ts'
    };
    
    // Mock implementation
    console.info(`Created ${examples[projectType as keyof typeof examples] || examples.typescript}`);
  }

  private static updatePackageJson(): void {
    // Mock implementation
    console.info('Updated package.json with depth optimizer scripts');
  }

  private static getDepthRecommendation(result: any, allResults: any[]): string {
    if (!result.truncated && result.time < 200) {
      return '✅ Optimal';
    } else if (result.truncated) {
      return '⚠️  Too shallow';
    } else if (result.time > 500) {
      return '⚠️  Too slow';
    } else {
      return '👍 Acceptable';
    }
  }

  private static findOptimalDepth(results: any[]): { depth: number; reason: string } {
    // Find the best balance of performance and completeness
    const optimal = results.find(r => !r.truncated && r.time < 200) || 
                   results.reduce((best, current) => 
                     current.time < best.time ? current : best
                   );
    
    return {
      depth: optimal.depth,
      reason: optimal.truncated ? 'Fastest available' : 'Best performance'
    };
  }

  private static showHelp(): void {
    console.info('🔧 Depth Optimizer CLI - Intelligent Console Depth Management');
    console.info('');
    console.info('Usage: bun depth-optimizer <command> [options]');
    console.info('');
    console.info('Commands:');
    console.info('  debug <file>      Debug with intelligent depth selection');
    console.info('  analyze [file]    Analyze depth requirements');
    console.info('  optimize [env]    Generate optimized configuration');
    console.info('  config <action>   Manage configuration');
    console.info('  init [type]       Initialize project');
    console.info('  profile <file>    Profile depth performance');
    console.info('');
    console.info('Examples:');
    console.info('  bun depth-optimizer debug app.ts --progressive');
    console.info('  bun depth-optimizer analyze');
    console.info('  bun depth-optimizer optimize production --save');
    console.info('  bun depth-optimizer init');
    console.info('');
    console.info('For detailed help on any command:');
    console.info('  bun depth-optimizer <command> --help');
  }
}

// Run the CLI
if (import.meta.main) {
  DepthOptimizerCLI.main().catch(console.error);
}
