#!/usr/bin/env bun

/**
 * Enhanced Progressive Disclosure CLI for Bun Benchmarking
 * Intelligent depth escalation with circular reference detection and streaming support
 */

import { spawn, ChildProcess } from 'node:child_process';

interface RunResult {
  success: boolean;
  depthUsed: number;
  output?: string;
  duration?: number;
  error?: string;
  truncated?: boolean;
  circularRefs?: number;
  estimatedSize?: number;
  streamingUsed?: boolean;
}

interface LargeObjectOptions {
  strategy?: 'json-truncate' | 'file-stream' | 'sample';
  sampleSize?: number;
  streamingThreshold?: number;
}

interface CircularAnalysis {
  totalCircularReferences: number;
  circularPaths: string[];
  depthLimited: boolean;
  recommendation: string;
}

export class ProgressiveDisclosureCLI {
  private static readonly STREAMING_THRESHOLD = 10 * 1024 * 1024; // 10MB
  private static readonly PHASES = [
    { depth: 1, name: 'Surface Scan', timeout: 2000 },
    { depth: 3, name: 'Standard Debug', timeout: 5000 },
    { depth: 6, name: 'Deep Analysis', timeout: 10000 },
    { depth: 8, name: 'Full Inspection', timeout: 30000 }
  ];

  static async runWithProgressiveDisclosure(
    command: string,
    args: string[] = [],
    options: { enableStreaming?: boolean; analyzeCircular?: boolean; streamingOptions?: LargeObjectOptions } = {}
  ): Promise<RunResult> {
    console.log('🎯 Enhanced Progressive Disclosure Mode');
    console.log('='.repeat(60));
    
    if (options.enableStreaming) {
      console.log('📡 Streaming enabled for large objects');
      if (options.streamingOptions) {
        console.log(`   Strategy: ${options.streamingOptions.strategy || 'default'}`);
        console.log(`   Threshold: ${ProgressiveDisclosureCLI.formatBytes(options.streamingOptions.streamingThreshold || this.STREAMING_THRESHOLD)}`);
      }
    }
    
    if (options.analyzeCircular) {
      console.log('🔄 Circular reference analysis enabled');
    }
    
    for (const phase of this.PHASES) {
      console.log(`\n🔍 Phase: ${phase.name} (depth=${phase.depth})`);
      
      try {
        const result = await this.runWithDepth(
          command,
          args,
          phase.depth,
          phase.timeout,
          options
        );
        
        console.log(`   Output length: ${result.output?.length || 0} chars`);
        console.log(`   Estimated size: ${this.formatBytes(result.estimatedSize || 0)}`);
        
        if (result.circularRefs !== undefined) {
          console.log(`   Circular refs: ${result.circularRefs}`);
        }
        
        if (result.truncated) {
          console.log(`   ⚠️ Output appears truncated`);
        }
        
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
        
        if (result.success) {
          console.log(`✅ ${phase.name} completed successfully`);
          
          // Enhanced analysis for escalation decision
          if (this.shouldGoDeeper(result, phase.depth)) {
            const reason = this.getEscalationReason(result);
            console.log(`⚠️ ${reason}, continuing to next phase...`);
            continue;
          }
          
          console.log(`🎯 Optimal depth found: ${phase.depth}`);
          return result;
        }
      } catch (error) {
        console.log(`⚠️ ${phase.name} failed, escalating depth...`);
        console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    console.error('❌ All disclosure phases failed');
    return { success: false, depthUsed: 8 };
  }
  
  private static shouldGoDeeper(result: RunResult, currentDepth: number): boolean {
    const output = result.output || '';
    
    const indicators = [
      output.includes('[Object]'),
      output.includes('[Array]'),
      output.includes('[Circular]'),
      output.includes('...'),
      output.includes('[Object ...]'),
      output.includes('[Array ...]'),
      output.includes('[Circular ...]'),
      output.match(/depth limit|truncated|omitted/i),
      result.truncated,
      (result.circularRefs || 0) > 0 && currentDepth < 6
    ];
    
    const hasIndicators = indicators.some(ind => ind);
    const shouldEscalate = hasIndicators && currentDepth < 8;
    
    if (hasIndicators) {
      const activeIndicators = indicators.map((ind, idx) => {
        const names = ['[Object]', '[Array]', '[Circular]', '...', '[Object ...]', '[Array ...]', '[Circular ...]', 'regex', 'truncated', 'circular refs'];
        return ind ? names[idx] : null;
      }).filter(Boolean);
      
      console.log(`   🔍 Detected: ${activeIndicators.join(', ')}`);
    }
    
    return shouldEscalate;
  }
  
  private static getEscalationReason(result: RunResult): string {
    const output = result.output || '';
    
    if (result.truncated) return 'Output truncated';
    if (output.includes('[Circular]')) return 'Circular references detected';
    if (output.includes('[Object ...]')) return 'Nested objects hidden';
    if (output.includes('...')) return 'Content abbreviated';
    if ((result.circularRefs || 0) > 0) return `${result.circularRefs} circular references`;
    
    return 'Issues detected';
  }
  
  private static async runWithDepth(
    command: string,
    args: string[],
    depth: number,
    timeout: number,
    options: { enableStreaming?: boolean; analyzeCircular?: boolean; streamingOptions?: LargeObjectOptions } = {}
  ): Promise<RunResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      // Set environment variable for depth
      const env = { 
        ...process.env, 
        BUN_CONSOLE_DEPTH: depth.toString(),
        ...(options.enableStreaming && { 
          BUN_STREAMING_THRESHOLD: (options.streamingOptions?.streamingThreshold || this.STREAMING_THRESHOLD).toString(),
          BUN_STREAMING_STRATEGY: options.streamingOptions?.strategy || 'sample'
        }),
        ...(options.analyzeCircular && { BUN_ANALYZE_CIRCULAR: 'true' })
      };
      
      // Prepend 'bun' if the command is a TypeScript file
      const fullCommand = command.endsWith('.ts') ? `bun ${command}` : command;
      const fullArgs = command.endsWith('.ts') ? args : [...args];
      
      const child: ChildProcess = spawn(fullCommand, fullArgs, {
        env,
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
      
      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          success: false,
          depthUsed: depth,
          error: `Timeout after ${timeout}ms`,
          duration: Date.now() - startTime,
          estimatedSize: output.length
        });
      }, timeout);
      
      child.on('close', (code) => {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        
        // Analyze output
        const analysis = this.analyzeOutput(output);
        
        if (code === 0) {
          resolve({
            success: true,
            depthUsed: depth,
            output,
            duration,
            truncated: analysis.truncated,
            circularRefs: analysis.circularRefs,
            estimatedSize: analysis.estimatedSize,
            streamingUsed: options.enableStreaming || false
          });
        } else {
          resolve({
            success: false,
            depthUsed: depth,
            error: errorOutput || `Process exited with code ${code}`,
            duration,
            truncated: analysis.truncated,
            circularRefs: analysis.circularRefs,
            estimatedSize: analysis.estimatedSize,
            streamingUsed: options.enableStreaming || false
          });
        }
      });
      
      child.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          depthUsed: depth,
          error: error.message,
          duration: Date.now() - startTime,
          estimatedSize: output.length
        });
      });
    });
  }
  
  private static analyzeOutput(output: string): {
    truncated: boolean;
    circularRefs: number;
    estimatedSize: number;
  } {
    // Count circular references
    const circularMatches = output.match(/\[Circular\]/g) || [];
    const circularRefs = circularMatches.length;
    
    // Detect truncation
    const truncated = output.includes('...') || 
                     output.includes('[Object ...]') || 
                     output.includes('[Array ...]') ||
                     output.includes('truncated') ||
                     output.includes('omitted');
    
    // Estimate size (rough calculation)
    const estimatedSize = output.length * 2; // Assume 2 bytes per char average
    
    return {
      truncated,
      circularRefs,
      estimatedSize
    };
  }
  
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
  
  // Advanced circular reference analysis
  static analyzeCircularReferences(obj: any, maxDepth: number = 8): CircularAnalysis {
    const visited = new WeakSet();
    const circularPaths: string[] = [];
    
    const traverse = (current: any, path: string, depth: number): void => {
      if (depth > maxDepth) {
        return; // Depth limit hit before circular detection
      }
      
      if (visited.has(current)) {
        circularPaths.push(`${path} -> [Circular at depth ${depth}]`);
        return;
      }
      
      if (current && typeof current === 'object') {
        visited.add(current);
        
        for (const [key, value] of Object.entries(current)) {
          const newPath = path ? `${path}.${key}` : key;
          traverse(value, newPath, depth + 1);
        }
        
        visited.delete(current);
      }
    };
    
    traverse(obj, '', 0);
    
    const deepest = Math.max(...circularPaths.map(p => {
      const match = p.match(/depth (\d+)/);
      return match ? parseInt(match[1]) : 0;
    }), 0);
    
    const recommendation = circularPaths.length === 0 
      ? "No circular references found"
      : deepest >= maxDepth
        ? `⚠️ Increase depth beyond ${maxDepth} to see full circular structure`
        : `✅ Circular references visible at current depth`;
    
    return {
      totalCircularReferences: circularPaths.length,
      circularPaths,
      depthLimited: deepest >= maxDepth,
      recommendation
    };
  }
  
  // Generate environment-specific recommendations
  static generateEnvironmentGuide(env: string): void {
    const configs = {
      development: {
        depth: 5,
        flags: ['--console-depth=5', '--hot'],
        tips: ['Use depth 5 for comprehensive debugging', 'Combine with --hot for development']
      },
      production: {
        depth: 1,
        flags: ['--console-depth=1', '--silent-errors'],
        tips: ['Use minimal depth for production', 'Focus on essential errors only']
      },
      profiling: {
        depth: 3,
        flags: ['--console-depth=3', '--cpu-prof', '--memory-prof'],
        tips: ['Balanced depth for profiling', 'Enable CPU and memory profiling']
      }
    };
    
    const config = configs[env as keyof typeof configs] || configs.development;
    
    console.log(`\n🔧 ${env.toUpperCase()} Environment Guide:`);
    console.log(`   Recommended depth: ${config.depth}`);
    console.log(`   Flags: ${config.flags.join(' ')}`);
    console.log(`   Tips:`);
    config.tips.forEach(tip => console.log(`     - ${tip}`));
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: bun benchmark-recovery.ts run <command> [args...] [--progressive] [--streaming] [--streaming-strategy=<strategy>] [--streaming-threshold=<size>] [--analyze-circular] [--env-guide]');
    console.log('');
    console.log('Examples:');
    console.log('  bun benchmark-recovery.ts run bench.ts --progressive');
    console.log('  bun benchmark-recovery.ts run bench.ts --progressive --streaming');
    console.log('  bun benchmark-recovery.ts run bench.ts --progressive --streaming --streaming-strategy=file-stream --streaming-threshold=5MB');
    console.log('  bun benchmark-recovery.ts run bench.ts --progressive --analyze-circular');
    console.log('  bun benchmark-recovery.ts --env-guide development');
    console.log('');
    console.log('Streaming strategies: json-truncate, file-stream, sample');
    console.log('Threshold format: <number><unit> (e.g., 5MB, 1024KB, 1GB)');
    process.exit(1);
  }
  
  const [action, command, ...commandArgs] = args;
  
  // Handle environment guide
  if (action === '--env-guide' && command) {
    ProgressiveDisclosureCLI.generateEnvironmentGuide(command);
    return;
  }
  
  if (action !== 'run') {
    console.error('❌ Only "run" action is supported');
    process.exit(1);
  }
  
  const isProgressive = commandArgs.includes('--progressive');
  const enableStreaming = commandArgs.includes('--streaming');
  const analyzeCircular = commandArgs.includes('--analyze-circular');
  
  if (isProgressive) {
    // Remove progressive flags from args passed to the command
    const filteredArgs = commandArgs.filter(arg => 
      !arg.startsWith('--progressive') && 
      !arg.startsWith('--streaming') && 
      !arg.startsWith('--analyze-circular') &&
      !arg.startsWith('--streaming-strategy=') &&
      !arg.startsWith('--streaming-threshold=')
    );
    
    // Parse streaming options from args
    const streamingOptions: LargeObjectOptions = {};
    const strategyIndex = commandArgs.findIndex(arg => arg.startsWith('--streaming-strategy='));
    if (strategyIndex !== -1) {
      streamingOptions.strategy = commandArgs[strategyIndex].split('=')[1] as any;
    }
    
    const thresholdIndex = commandArgs.findIndex(arg => arg.startsWith('--streaming-threshold='));
    if (thresholdIndex !== -1) {
      const thresholdStr = commandArgs[thresholdIndex].split('=')[1];
      // Parse size string like "5MB", "1024KB", "1GB"
      const sizeMatch = thresholdStr.match(/^(\d+(?:\.\d+)?)(B|KB|MB|GB)$/i);
      if (sizeMatch) {
        const [, size, unit] = sizeMatch;
        const multiplier = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 }[unit.toUpperCase()];
        streamingOptions.streamingThreshold = parseInt(size) * multiplier;
      } else {
        // Fallback to parsing as bytes
        streamingOptions.streamingThreshold = parseInt(thresholdStr);
      }
    }
    
    try {
      const result = await ProgressiveDisclosureCLI.runWithProgressiveDisclosure(
        command,
        filteredArgs,
        {
          enableStreaming,
          analyzeCircular,
          streamingOptions: enableStreaming ? streamingOptions : undefined
        }
      );
      
      console.log('\n🎯 Enhanced Progressive Disclosure Results:');
      console.log(`   Success: ${result.success ? '✅' : '❌'}`);
      console.log(`   Final Depth: ${result.depthUsed}`);
      console.log(`   Duration: ${result.duration}ms`);
      console.log(`   Output Size: ${ProgressiveDisclosureCLI.formatBytes(result.estimatedSize || 0)}`);
      
      if (result.circularRefs !== undefined) {
        console.log(`   Circular References: ${result.circularRefs}`);
      }
      
      if (result.truncated) {
        console.log(`   Output Truncated: Yes`);
      }
      
      if (result.streamingUsed) {
        console.log(`   Streaming Used: Yes`);
      }
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('❌ Progressive disclosure failed:', error);
      process.exit(1);
    }
  } else {
    console.log('🔧 Running without progressive disclosure...');
    
    // Create a simple runWithDepth call for non-progressive mode
    const result = await new Promise<RunResult>((resolve) => {
      const startTime = Date.now();
      const env = { ...process.env, BUN_CONSOLE_DEPTH: '2' };
      const fullCommand = command.endsWith('.ts') ? `bun ${command}` : command;
      const fullArgs = command.endsWith('.ts') ? commandArgs : [...commandArgs];
      
      const child: ChildProcess = spawn(fullCommand, fullArgs, {
        env,
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
      
      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        resolve({
          success: false,
          depthUsed: 2,
          error: `Timeout after 5000ms`,
          duration: Date.now() - startTime
        });
      }, 5000);
      
      child.on('close', (code) => {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        
        if (code === 0) {
          resolve({
            success: true,
            depthUsed: 2,
            output,
            duration
          });
        } else {
          resolve({
            success: false,
            depthUsed: 2,
            error: errorOutput || `Process exited with code ${code}`,
            duration
          });
        }
      });
      
      child.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          depthUsed: 2,
          error: error.message,
          duration: Date.now() - startTime
        });
      });
    });
    
    if (result) {
      console.log(`Result: ${result.success ? '✅ Success' : '❌ Failed'}`);
      process.exit(result.success ? 0 : 1);
    } else {
      console.log('❌ Failed to run command');
      process.exit(1);
    }
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
