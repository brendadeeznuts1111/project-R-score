#!/usr/bin/env bun

/**
 * Progressive Debug Script - Smart debugging with automatic depth escalation
 * A user-friendly wrapper around the depth optimizer for quick debugging
 */

import { spawn, ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';

interface DebugOptions {
  progressive?: boolean;
  streaming?: boolean;
  analyzeCircular?: boolean;
  depth?: number;
  verbose?: boolean;
  env?: string;
}

class ProgressiveDebugger {
  private static readonly DEFAULT_OPTIONS: DebugOptions = {
    progressive: true,
    streaming: true,
    analyzeCircular: true,
    verbose: false
  };

  static async main(): Promise<void> {
    const args = process.argv.slice(2);
    
    // Handle help flag first
    if (args.includes('--help') || args.includes('-h')) {
      this.showHelp();
      return;
    }
    
    if (args.length === 0) {
      this.showHelp();
      return;
    }

    const [targetFile, ...options] = args;
    const parsedOptions = this.parseOptions(options);
    
    console.info('🐛 Progressive Debug Mode');
    console.info('='.repeat(50));
    console.info(`Target: ${targetFile}`);
    console.info(`Mode: ${parsedOptions.progressive ? 'Progressive' : 'Static'}`);
    
    if (parsedOptions.verbose) {
      console.info(`Options: ${JSON.stringify(parsedOptions, null, 2)}`);
    }

    // Check if file exists
    if (!existsSync(targetFile)) {
      console.error(`❌ File not found: ${targetFile}`);
      process.exit(1);
    }

    try {
      await this.debugFile(targetFile, parsedOptions);
    } catch (error) {
      console.error('❌ Debug session failed:', error);
      process.exit(1);
    }
  }

  private static async debugFile(targetFile: string, options: DebugOptions): Promise<void> {
    // Set up environment
    const env = {
      ...process.env,
      NODE_ENV: options.env || process.env.NODE_ENV || 'development',
      DEBUG_PROGRESSIVE: options.progressive ? 'true' : 'false',
      DEBUG_STREAMING: options.streaming ? 'true' : 'false',
      DEBUG_CIRCULAR: options.analyzeCircular ? 'true' : 'false'
    };

    if (options.verbose) {
      console.info('\n🔧 Environment Setup:');
      console.info(`   NODE_ENV: ${env.NODE_ENV}`);
      console.info(`   DEBUG_PROGRESSIVE: ${env.DEBUG_PROGRESSIVE}`);
      console.info(`   DEBUG_STREAMING: ${env.DEBUG_STREAMING}`);
      console.info(`   DEBUG_CIRCULAR: ${env.DEBUG_CIRCULAR}`);
    }

    // Choose debugging strategy
    if (options.progressive) {
      await this.runProgressiveDebug(targetFile, options, env);
    } else {
      await this.runStaticDebug(targetFile, options, env);
    }
  }

  private static async runProgressiveDebug(targetFile: string, options: DebugOptions, env: any): Promise<void> {
    console.info('\n🚀 Starting Progressive Debug...');
    
    // Use the enhanced ProgressiveDisclosureCLI
    const { ProgressiveDisclosureCLI } = await import('../lib/performance/benchmark-recovery.js');
    
    const streamingOptions = options.streaming ? {
      strategy: 'sample' as const,
      streamingThreshold: 5 * 1024 * 1024 // 5MB
    } : undefined;

    const result = await ProgressiveDisclosureCLI.runWithProgressiveDisclosure(
      targetFile,
      [], // No additional args
      {
        enableStreaming: options.streaming,
        analyzeCircular: options.analyzeCircular,
        streamingOptions
      }
    );

    console.info('\n🎯 Debug Session Summary:');
    console.info(`   Success: ${result.success ? '✅' : '❌'}`);
    console.info(`   Optimal Depth: ${result.depthUsed}`);
    console.info(`   Duration: ${result.duration}ms`);
    console.info(`   Output Size: ${this.formatBytes(result.estimatedSize || 0)}`);
    
    if (result.circularRefs !== undefined && result.circularRefs > 0) {
      console.info(`   Circular References: ${result.circularRefs}`);
      console.info('   💡 Consider using --analyze-circular for detailed analysis');
    }
    
    if (result.truncated) {
      console.info('   ⚠️  Output was truncated - deeper inspection may be needed');
    }
    
    if (result.streamingUsed) {
      console.info('   📡 Streaming was used for large output');
    }

    // Provide next steps
    console.info('\n📋 Next Steps:');
    if (result.success) {
      console.info('   ✅ Debugging completed successfully');
      if (result.depthUsed >= 6) {
        console.info('   💡 Consider optimizing data structures to reduce depth requirements');
      }
    } else {
      console.info('   ❌ Issues detected - try the following:');
      console.info('      1. Run with higher depth: --depth 8');
      console.info('      2. Enable circular analysis: --analyze-circular');
      console.info('      3. Try static mode: --no-progressive');
    }
  }

  private static async runStaticDebug(targetFile: string, options: DebugOptions, env: any): Promise<void> {
    const depth = options.depth || 3;
    console.info(`\n⚡ Starting Static Debug (depth=${depth})...`);
    
    const result = await this.runCommand(targetFile, depth, env);
    
    console.info('\n📊 Static Debug Results:');
    console.info(`   Exit Code: ${result.code}`);
    console.info(`   Duration: ${result.duration}ms`);
    console.info(`   Output Size: ${this.formatBytes(result.outputSize)}`);
    
    if (result.output.includes('[Circular]')) {
      console.info('   🔄 Circular references detected');
    }
    
    if (result.output.includes('...') || result.output.includes('[Object ...]')) {
      console.info('   ⚠️  Output appears truncated');
      console.info('   💡 Try progressive mode: --progressive');
    }
  }

  private static async runCommand(targetFile: string, depth: number, env: any): Promise<{
    code: number | null;
    duration: number;
    output: string;
    outputSize: number;
  }> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const child: ChildProcess = spawn('bun', [targetFile], {
        env: { ...env, BUN_CONSOLE_DEPTH: depth.toString() },
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });
      
      let output = '';
      let errorOutput = '';
      
      child.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        if (errorOutput && !output) {
          output = errorOutput;
        }
        
        resolve({
          code,
          duration,
          output,
          outputSize: output.length
        });
      });
      
      child.on('error', (error) => {
        console.error('Process error:', error);
        resolve({
          code: 1,
          duration: Date.now() - startTime,
          output: error.message,
          outputSize: error.message.length
        });
      });
    });
  }

  private static parseOptions(args: string[]): DebugOptions {
    const options: DebugOptions = { ...this.DEFAULT_OPTIONS };
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--no-progressive':
          options.progressive = false;
          break;
        case '--no-streaming':
          options.streaming = false;
          break;
        case '--no-circular':
          options.analyzeCircular = false;
          break;
        case '--verbose':
        case '-v':
          options.verbose = true;
          break;
        case '--depth':
          options.depth = parseInt(args[++i]);
          options.progressive = false; // Specific depth implies static mode
          break;
        case '--env':
          options.env = args[++i];
          break;
        case '--help':
        case '-h':
          this.showDetailedHelp();
          process.exit(0);
          break;
        default:
          if (arg.startsWith('--')) {
            console.warn(`⚠️  Unknown option: ${arg}`);
          }
      }
    }
    
    return options;
  }

  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  private static showHelp(): void {
    console.info('🐛 Progressive Debug - Smart debugging with automatic depth escalation');
    console.info('');
    console.info('Usage: bun progressive-debug <file.ts> [options]');
    console.info('');
    console.info('Options:');
    console.info('  --no-progressive    Disable progressive disclosure');
    console.info('  --no-streaming      Disable streaming for large objects');
    console.info('  --no-circular       Disable circular reference analysis');
    console.info('  --depth <n>         Use specific depth (implies static mode)');
    console.info('  --env <environment> Set environment (development, production, test)');
    console.info('  --verbose, -v       Enable verbose output');
    console.info('  --help, -h          Show this help message');
    console.info('');
    console.info('Examples:');
    console.info('  bun progressive-debug app.ts                    # Progressive debug');
    console.info('  bun progressive-debug app.ts --depth 4          # Static debug with depth 4');
    console.info('  bun progressive-debug app.ts --no-streaming     # Without streaming');
    console.info('  bun progressive-debug app.ts --verbose           # Verbose output');
    console.info('');
    console.info('Environment Variables:');
    console.info('  NODE_ENV           Environment (development, production, test)');
    console.info('  BUN_CONSOLE_DEPTH  Default console depth');
    console.info('');
    console.info('For more advanced options, use:');
    console.info('  bun depth-optimizer debug <file> --progressive');
  }

  private static showDetailedHelp(): void {
    console.info('🐛 Progressive Debug - Detailed Help');
    console.info('='.repeat(50));
    console.info('');
    console.info('Progressive Debug automatically finds the optimal console depth');
    console.info('by starting shallow and escalating when truncation is detected.');
    console.info('');
    console.info('🚀 Progressive Mode (default):');
    console.info('  - Starts at depth 1, escalates to 3, 6, then 8');
    console.info('  - Detects truncation, circular references, and large objects');
    console.info('  - Provides detailed analysis and recommendations');
    console.info('  - Best for: Complex debugging, unknown data structures');
    console.info('');
    console.info('⚡ Static Mode (--depth <n>):');
    console.info('  - Uses fixed depth for the entire session');
    console.info('  - Faster execution, less analysis overhead');
    console.info('  - Best for: Known data structures, quick checks');
    console.info('');
    console.info('📡 Streaming:');
    console.info('  - Automatically handles large outputs (>10MB)');
    console.info('  - Prevents memory issues with huge objects');
    console.info('  - Strategies: sample, json-truncate, file-stream');
    console.info('');
    console.info('🔄 Circular Reference Analysis:');
    console.info('  - Detects and counts circular references');
    console.info('  - Provides recommendations for handling');
    console.info('  - Essential for complex object graphs');
    console.info('');
    console.info('💡 Pro Tips:');
    console.info('  - Use --verbose for detailed debugging information');
    console.info('  - Set NODE_ENV=production for minimal output');
    console.info('  - Combine with --depth 1 for production debugging');
    console.info('  - Use --no-progressive for faster, predictable debugging');
  }
}

// Run the debugger
if (import.meta.main) {
  ProgressiveDebugger.main().catch(console.error);
}
