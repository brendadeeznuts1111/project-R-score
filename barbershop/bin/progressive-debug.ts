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
    
    console.log('🐛 Progressive Debug Mode');
    console.log('='.repeat(50));
    console.log(`Target: ${targetFile}`);
    console.log(`Mode: ${parsedOptions.progressive ? 'Progressive' : 'Static'}`);
    
    if (parsedOptions.verbose) {
      console.log(`Options: ${JSON.stringify(parsedOptions, null, 2)}`);
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
      console.log('\n🔧 Environment Setup:');
      console.log(`   NODE_ENV: ${env.NODE_ENV}`);
      console.log(`   DEBUG_PROGRESSIVE: ${env.DEBUG_PROGRESSIVE}`);
      console.log(`   DEBUG_STREAMING: ${env.DEBUG_STREAMING}`);
      console.log(`   DEBUG_CIRCULAR: ${env.DEBUG_CIRCULAR}`);
    }

    // Choose debugging strategy
    if (options.progressive) {
      await this.runProgressiveDebug(targetFile, options, env);
    } else {
      await this.runStaticDebug(targetFile, options, env);
    }
  }

  private static async runProgressiveDebug(targetFile: string, options: DebugOptions, env: any): Promise<void> {
    console.log('\n🚀 Starting Progressive Debug...');
    
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

    console.log('\n🎯 Debug Session Summary:');
    console.log(`   Success: ${result.success ? '✅' : '❌'}`);
    console.log(`   Optimal Depth: ${result.depthUsed}`);
    console.log(`   Duration: ${result.duration}ms`);
    console.log(`   Output Size: ${this.formatBytes(result.estimatedSize || 0)}`);
    
    if (result.circularRefs !== undefined && result.circularRefs > 0) {
      console.log(`   Circular References: ${result.circularRefs}`);
      console.log('   💡 Consider using --analyze-circular for detailed analysis');
    }
    
    if (result.truncated) {
      console.log('   ⚠️  Output was truncated - deeper inspection may be needed');
    }
    
    if (result.streamingUsed) {
      console.log('   📡 Streaming was used for large output');
    }

    // Provide next steps
    console.log('\n📋 Next Steps:');
    if (result.success) {
      console.log('   ✅ Debugging completed successfully');
      if (result.depthUsed >= 6) {
        console.log('   💡 Consider optimizing data structures to reduce depth requirements');
      }
    } else {
      console.log('   ❌ Issues detected - try the following:');
      console.log('      1. Run with higher depth: --depth 8');
      console.log('      2. Enable circular analysis: --analyze-circular');
      console.log('      3. Try static mode: --no-progressive');
    }
  }

  private static async runStaticDebug(targetFile: string, options: DebugOptions, env: any): Promise<void> {
    const depth = options.depth || 3;
    console.log(`\n⚡ Starting Static Debug (depth=${depth})...`);
    
    const result = await this.runCommand(targetFile, depth, env);
    
    console.log('\n📊 Static Debug Results:');
    console.log(`   Exit Code: ${result.code}`);
    console.log(`   Duration: ${result.duration}ms`);
    console.log(`   Output Size: ${this.formatBytes(result.outputSize)}`);
    
    if (result.output.includes('[Circular]')) {
      console.log('   🔄 Circular references detected');
    }
    
    if (result.output.includes('...') || result.output.includes('[Object ...]')) {
      console.log('   ⚠️  Output appears truncated');
      console.log('   💡 Try progressive mode: --progressive');
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
    console.log('🐛 Progressive Debug - Smart debugging with automatic depth escalation');
    console.log('');
    console.log('Usage: bun progressive-debug <file.ts> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --no-progressive    Disable progressive disclosure');
    console.log('  --no-streaming      Disable streaming for large objects');
    console.log('  --no-circular       Disable circular reference analysis');
    console.log('  --depth <n>         Use specific depth (implies static mode)');
    console.log('  --env <environment> Set environment (development, production, test)');
    console.log('  --verbose, -v       Enable verbose output');
    console.log('  --help, -h          Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  bun progressive-debug app.ts                    # Progressive debug');
    console.log('  bun progressive-debug app.ts --depth 4          # Static debug with depth 4');
    console.log('  bun progressive-debug app.ts --no-streaming     # Without streaming');
    console.log('  bun progressive-debug app.ts --verbose           # Verbose output');
    console.log('');
    console.log('Environment Variables:');
    console.log('  NODE_ENV           Environment (development, production, test)');
    console.log('  BUN_CONSOLE_DEPTH  Default console depth');
    console.log('');
    console.log('For more advanced options, use:');
    console.log('  bun depth-optimizer debug <file> --progressive');
  }

  private static showDetailedHelp(): void {
    console.log('🐛 Progressive Debug - Detailed Help');
    console.log('='.repeat(50));
    console.log('');
    console.log('Progressive Debug automatically finds the optimal console depth');
    console.log('by starting shallow and escalating when truncation is detected.');
    console.log('');
    console.log('🚀 Progressive Mode (default):');
    console.log('  - Starts at depth 1, escalates to 3, 6, then 8');
    console.log('  - Detects truncation, circular references, and large objects');
    console.log('  - Provides detailed analysis and recommendations');
    console.log('  - Best for: Complex debugging, unknown data structures');
    console.log('');
    console.log('⚡ Static Mode (--depth <n>):');
    console.log('  - Uses fixed depth for the entire session');
    console.log('  - Faster execution, less analysis overhead');
    console.log('  - Best for: Known data structures, quick checks');
    console.log('');
    console.log('📡 Streaming:');
    console.log('  - Automatically handles large outputs (>10MB)');
    console.log('  - Prevents memory issues with huge objects');
    console.log('  - Strategies: sample, json-truncate, file-stream');
    console.log('');
    console.log('🔄 Circular Reference Analysis:');
    console.log('  - Detects and counts circular references');
    console.log('  - Provides recommendations for handling');
    console.log('  - Essential for complex object graphs');
    console.log('');
    console.log('💡 Pro Tips:');
    console.log('  - Use --verbose for detailed debugging information');
    console.log('  - Set NODE_ENV=production for minimal output');
    console.log('  - Combine with --depth 1 for production debugging');
    console.log('  - Use --no-progressive for faster, predictable debugging');
  }
}

// Run the debugger
if (import.meta.main) {
  ProgressiveDebugger.main().catch(console.error);
}
