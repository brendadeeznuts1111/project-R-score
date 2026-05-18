#!/usr/bin/env bun
/**
 * Enhanced Depth Configuration CLI Tool
 * Interactive depth management for Bun benchmarking
 */

import { 
  DepthOptimizer, 
  DepthPerformanceAnalyzer,
  DepthExplorer,
  EnvironmentDepthConfig 
} from '../../src/benchmarking/depth-optimizer';

interface CLIOptions {
  analyze?: string;
  auto?: string;
  interactive?: boolean;
  generate?: string;
  apply?: boolean;
  performance?: boolean;
  depth?: number;
  environment?: string;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--analyze':
        options.analyze = args[++i];
        break;
      case '--auto':
        options.auto = args[++i];
        break;
      case '--interactive':
      case '-i':
        options.interactive = true;
        break;
      case '--generate':
        options.generate = args[++i];
        break;
      case '--apply':
        options.apply = true;
        break;
      case '--performance':
      case '-p':
        options.performance = true;
        break;
      case '--depth':
      case '-d':
        options.depth = parseInt(args[++i]);
        break;
      case '--environment':
      case '-e':
        options.environment = args[++i];
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.info(`
🎯 Enhanced Depth Configuration CLI

Usage: depth-cli [options] [file]

Options:
  --analyze <file>        Analyze file and suggest optimal depth
  --auto <file>           Auto-optimize depth based on file size
  --interactive, -i       Interactive depth explorer
  --generate <env>        Generate environment configuration script
  --apply                 Apply current environment configuration
  --performance, -p       Show performance analysis for depth
  --depth <n>, -d <n>      Set specific depth
  --environment <env>, -e <env>  Specify environment (development|test|staging|production|profiling)
  --help, -h              Show this help

Examples:
  depth-cli --analyze benchmark.ts
  depth-cli --auto large-benchmark.ts
  depth-cli --interactive
  depth-cli --generate production > setup-depth.sh
  depth-cli --apply --environment development
  depth-cli --performance --depth 5 --size 50000
`);
}

async function analyzeFile(filePath: string): Promise<void> {
  console.info(`🔍 Analyzing ${filePath}...`);
  
  try {
    // Read and parse the file to analyze its structure
    const fileContent = await Bun.file(filePath).text();
    
    // Try to extract data structures from the file
    let data: any = {};
    
    // Simple heuristic to find data structures
    if (fileContent.includes('export ') || fileContent.includes('const ')) {
      // Look for object literals and exports
      const objectMatches = fileContent.match(/\{[\s\S]*?\}/g);
      if (objectMatches) {
        data = {
          fileAnalysis: true,
          objectCount: objectMatches.length,
          estimatedComplexity: objectMatches.length > 5 ? 'high' : objectMatches.length > 2 ? 'medium' : 'low',
          sampleStructures: objectMatches.slice(0, 3).map((obj, i) => ({ [`structure_${i + 1}`]: JSON.parse(obj) }))
        };
      }
    }
    
    // If no structures found, create sample data for analysis
    if (Object.keys(data).length === 0) {
      data = {
        fileAnalysis: true,
        estimatedComplexity: 'unknown',
        recommendation: 'Use default depth 4 for general debugging'
      };
    }
    
    const context = {
      mode: 'development' as const,
      environment: EnvironmentDepthConfig.detectEnvironment(),
      dataSize: fileContent.length
    };
    
    const recommendation = DepthOptimizer.recommendDepth(data, context);
    
    console.info('\n📊 Analysis Results:');
    console.info(`   Suggested depth: ${recommendation.suggestedDepth}`);
    console.info(`   Reasoning: ${recommendation.reasoning}`);
    
    if (recommendation.warnings.length > 0) {
      console.info('   ⚠️  Warnings:');
      recommendation.warnings.forEach(warning => console.info(`      - ${warning}`));
    }
    
    console.info(`   Auto-apply: ${recommendation.autoApply ? '✅ Yes' : '❌ No'}`);
    
    // Show performance analysis
    const perfAnalysis = DepthPerformanceAnalyzer.analyzeTradeoffs(
      recommendation.suggestedDepth, 
      fileContent.length
    );
    
    console.info('\n⚡ Performance Impact:');
    console.info(`   Estimated time: ${perfAnalysis.estimatedTimeMs.toFixed(1)}ms`);
    console.info(`   Estimated memory: ${perfAnalysis.estimatedMemoryMB.toFixed(1)}MB`);
    console.info(`   Log size: ${perfAnalysis.estimatedLogSizeKB.toFixed(1)}KB`);
    console.info(`   ${perfAnalysis.recommendation}`);
    
    // Show recommended command
    console.info('\n🚀 Recommended command:');
    console.info(`   bun --console-depth=${recommendation.suggestedDepth} run ${filePath}`);
    
  } catch (error) {
    console.error(`❌ Error analyzing file: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

async function autoOptimize(filePath: string): Promise<void> {
  console.info(`🔧 Auto-optimizing depth for ${filePath}...`);
  
  try {
    const fileStats = await Bun.file(filePath).stat();
    const fileSize = fileStats.size;
    
    let recommendedDepth: number;
    let reason: string;
    
    if (fileSize > 100000) {
      recommendedDepth = 3;
      reason = `Large file detected (${(fileSize / 1024).toFixed(1)}KB), using conservative depth`;
    } else if (fileSize > 10000) {
      recommendedDepth = 5;
      reason = `Medium file (${(fileSize / 1024).toFixed(1)}KB), using moderate depth`;
    } else {
      recommendedDepth = 7;
      reason = `Small file (${(fileSize / 1024).toFixed(1)}KB), can use deeper inspection`;
    }
    
    console.info(`   Recommended depth: ${recommendedDepth}`);
    console.info(`   Reason: ${reason}`);
    
    // Run with recommended depth
    console.info(`\n🚀 Running: bun --console-depth=${recommendedDepth} run ${filePath}`);
    
    // Set environment variable and run
    process.env.BUN_CONSOLE_DEPTH = recommendedDepth.toString();
    
    // Import and run the file
    await import(Bun.resolveSync(filePath, import.meta.dir));
    
  } catch (error) {
    console.error(`❌ Error auto-optimizing: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

async function interactiveExplorer(): Promise<void> {
  console.info('🎮 Starting Interactive Depth Explorer...\n');
  
  try {
    await DepthExplorer.interactive();
  } catch (error) {
    console.error(`❌ Error in interactive mode: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function generateEnvironmentScript(environment: string): void {
  try {
    const script = EnvironmentDepthConfig.generateEnvScript(environment);
    console.info(script);
  } catch (error) {
    console.error(`❌ Error generating script: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function applyEnvironmentConfig(environment?: string): void {
  try {
    if (environment) {
      // Override environment detection
      process.env.NODE_ENV = environment;
      process.env.BUN_ENV = environment;
    }
    
    EnvironmentDepthConfig.applyEnvironmentConfig();
  } catch (error) {
    console.error(`❌ Error applying configuration: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function showPerformanceAnalysis(depth: number, environment?: string): void {
  try {
    const env = environment || EnvironmentDepthConfig.detectEnvironment();
    const config = EnvironmentDepthConfig.getOptimalDepth(env);
    const analysisDepth = depth || config.defaultDepth;
    
    console.info(`📊 Performance Analysis for depth ${analysisDepth} (${env} environment):`);
    
    // Show analysis for different data sizes
    const dataSizes = [1000, 10000, 100000, 1000000]; // 1KB, 10KB, 100KB, 1MB
    
    console.info('\nData Size | Time (ms) | Memory (MB) | Log Size (KB) | Recommendation');
    console.info('---------|-----------|-------------|---------------|----------------');
    
    dataSizes.forEach(size => {
      const analysis = DepthPerformanceAnalyzer.analyzeTradeoffs(analysisDepth, size);
      const sizeStr = size >= 1000000 ? `${size / 1000000}MB` : `${size / 1000}KB`;
      console.info(`${sizeStr.padEnd(8)} | ${analysis.estimatedTimeMs.toFixed(1).padEnd(9)} | ${analysis.estimatedMemoryMB.toFixed(1).padEnd(11)} | ${analysis.estimatedLogSizeKB.toFixed(1).padEnd(13)} | ${analysis.recommendation}`);
    });
    
    console.info(`\n🎯 Current environment configuration:`);
    console.info(`   Environment: ${env}`);
    console.info(`   Default depth: ${config.defaultDepth}`);
    console.info(`   Max depth: ${config.maxDepth}`);
    console.info(`   Error depth: ${config.onErrorDepth}`);
    console.info(`   Log level: ${config.logLevel}`);
    
  } catch (error) {
    console.error(`❌ Error in performance analysis: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const options = parseArgs();
  
  console.info('🎯 Enhanced Depth Configuration CLI');
  console.info('='.repeat(50));
  
  // Handle different commands
  if (options.analyze) {
    await analyzeFile(options.analyze);
  } else if (options.auto) {
    await autoOptimize(options.auto);
  } else if (options.interactive) {
    await interactiveExplorer();
  } else if (options.generate) {
    generateEnvironmentScript(options.generate);
  } else if (options.apply) {
    applyEnvironmentConfig(options.environment);
  } else if (options.performance) {
    showPerformanceAnalysis(options.depth || 4, options.environment);
  } else {
    console.info('❌ No command specified. Use --help for usage information.');
    process.exit(1);
  }
}

// Run the CLI
main().catch((error: unknown) => {
  console.error('❌ CLI Error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
