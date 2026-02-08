/**
 * Final Documentation CLI - The Ultimate "Bun Zen" Architecture
 * Implements File Descriptor telemetry and ESM URL portability
 */

import { EnhancedZenStreamSearcher } from './enhanced-stream-search';

// Official Bun interfaces with proper typing
interface BunFile {
  readonly name: string;
  readonly size: number;
  readonly type: string;
  readonly lastModified: number;
  
  exists(): Promise<boolean>;
  text(): Promise<string>;
  json<T = any>(): Promise<T>;
  stream(): ReadableStream<Uint8Array>;
  arrayBuffer(): Promise<ArrayBuffer>;
  bytes(): Promise<Uint8Array>;
}

interface Bun {
  file(path: string | number | URL, options?: { 
    type?: string;
    hash?: boolean;
    encoding?: string;
  }): BunFile;
  
  write(path: string | URL | BunFile, data: string | Uint8Array | ReadableStream): Promise<number>;
  
  // Enhanced monitoring
  pid: number;
  version: string;
  platform: string;
  arch: string;
  
  // Performance APIs (using process APIs)
  gc(): void;
  memoryUsage(): {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
}

// Ultimate Bun interfaces with FD and URL support
interface ZenBunFile extends BunFile {
  fd?: number; // File descriptor for "Silent Pipe" pattern
}

interface ZenBun {
  file(path: string | number | URL, options?: { 
    type?: string;
    hash?: boolean;
    encoding?: string;
  }): ZenBunFile;
  
  write(path: string | URL | ZenBunFile, data: string | Uint8Array | ReadableStream): Promise<number>;
}

/**
 * Final Documentation CLI with Enterprise Features
 */
export class FinalDocumentationCLI {
  private bun: ZenBun;
  private searcher: EnhancedZenStreamSearcher;
  private telemetryPipe: ZenBunFile;
  private configRoot: URL;

  constructor() {
    this.bun = (globalThis as any).Bun as ZenBun;
    this.searcher = new EnhancedZenStreamSearcher();
    
    // Pattern 1: File Descriptor for "Silent Pipe" telemetry
    this.telemetryPipe = this.bun.file(3); // FD 3 for data output
    
    // Pattern 2: ESM URL for absolute portability
    this.configRoot = new URL('../..', import.meta.url); // Monorepo root
    
    console.log('🏁 Final Documentation CLI - Ultimate "Bun Zen" Architecture');
    console.log('=' .repeat(70));
    console.log(`📁 Config Root: ${this.configRoot.href}`);
    console.log(`🔌 Telemetry FD: ${this.telemetryPipe.fd || 'N/A (not redirected)'}`);
    console.log('=' .repeat(70));
  }

  /**
   * Pattern 1: Silent Pipe Telemetry using File Descriptors
   * Separates user output (stdout) from data output (FD 3)
   */
  async logTelemetry(data: object): Promise<void> {
    if (this.telemetryPipe.fd !== undefined) {
      try {
        await this.bun.write(this.telemetryPipe, JSON.stringify(data) + '\n');
        console.log('📊 Telemetry logged to silent pipe (FD 3)');
      } catch (error) {
        console.warn('⚠️  Failed to write telemetry:', error.message);
      }
    } else {
      // Fallback: no telemetry pipe available
      console.log('📊 Telemetry (no pipe):', JSON.stringify(data));
    }
  }

  /**
   * Pattern 2: ESM URL for Absolute Portability
   * Finds config files relative to code, not working directory
   */
  async loadSharedConfig(): Promise<any> {
    try {
      // Find shared config relative to THIS file, not process.cwd()
      const configFile = this.bun.file(new URL('../../.env', this.configRoot));
      
      if (await configFile.exists()) {
        console.log(`🔧 Loading shared config from: ${configFile.name}`);
        
        const configContent = await configFile.text();
        const config = this.parseConfig(configContent);
        
        // Log telemetry about config loading
        await this.logTelemetry({
          event: 'config_loaded',
          file: configFile.name,
          size: configFile.size,
          timestamp: new Date().toISOString()
        });
        
        return config;
      } else {
        console.log('⚠️  No shared config found, using defaults');
        
        // Log telemetry about missing config
        await this.logTelemetry({
          event: 'config_missing',
          searchedPath: configFile.name,
          timestamp: new Date().toISOString()
        });
        
        return this.getDefaultConfig();
      }
    } catch (error) {
      console.error('❌ Failed to load shared config:', error);
      
      // Log telemetry about config error
      await this.logTelemetry({
        event: 'config_error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return this.getDefaultConfig();
    }
  }

  private parseConfig(content: string): any {
    const config: any = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          config[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
    
    return config;
  }

  private getDefaultConfig(): any {
    return {
      CACHE_PATH: '/Users/nolarose/Projects/.cache',
      SEARCH_TIMEOUT: '30000',
      MAX_RESULTS: '1000',
      ENABLE_TELEMETRY: 'true',
      LOG_LEVEL: 'info'
    };
  }

  /**
   * Ultimate Documentation Search with Both Patterns
   */
  async performZenSearch(query: string, options: {
    useTelemetry?: boolean;
    validateConfig?: boolean;
  } = {}): Promise<any> {
    const startTime = performance.now();
    
    console.log(`🔍 Performing Zen Search: "${query}"`);
    
    // Load config using ESM URL pattern
    const config = await this.loadSharedConfig();
    
    // Validate configuration if requested
    if (options.validateConfig) {
      await this.validateConfiguration(config);
    }
    
    try {
      // Perform enhanced search
      const results = await this.searcher.streamSearch({
        query,
        cachePath: config.CACHE_PATH || '/Users/nolarose/Projects/.cache',
        enableCache: true,
        maxResults: parseInt(config.MAX_RESULTS) || 1000,
        filePatterns: ['*.ts', '*.js', '*.md', '*.json'],
        excludePatterns: ['node_modules/*', '*.min.js', 'dist/*'],
        caseSensitive: false,
        priority: 'high',
        onProgress: (stats) => {
          if (stats.matchesFound % 50 === 0) {
            console.log(`   📊 Progress: ${stats.matchesFound} matches at ${stats.throughput.toFixed(0)} matches/sec`);
            
            // Log progress telemetry
            if (options.useTelemetry) {
              this.logTelemetry({
                event: 'search_progress',
                query,
                matches: stats.matchesFound,
                throughput: stats.throughput,
                timestamp: new Date().toISOString()
              });
            }
          }
        }
      });
      
      const searchTime = performance.now() - startTime;
      
      const searchResults = {
        query,
        matches: results.matchesFound || 0,
        time: searchTime,
        filesWithMatches: results.filesWithMatches || 0,
        throughput: results.throughput || 0,
        cacheHitRate: results.cacheHitRate || 0,
        timestamp: new Date().toISOString(),
        config: {
          loaded: true,
          source: 'shared_config',
          cachePath: config.CACHE_PATH
        }
      };
      
      console.log(`✅ Zen Search Complete: ${results.matchesFound} matches in ${searchTime.toFixed(2)}ms`);
      console.log(`   🚀 Throughput: ${results.throughput?.toFixed(0) || 'N/A'} matches/sec`);
      console.log(`   💾 Cache Hit Rate: ${((results.cacheHitRate || 0) * 100).toFixed(1)}%`);
      
      // Log completion telemetry
      if (options.useTelemetry) {
        await this.logTelemetry({
          event: 'search_complete',
          query,
          results: searchResults,
          timestamp: new Date().toISOString()
        });
      }
      
      return searchResults;
      
    } catch (error) {
      const searchTime = performance.now() - startTime;
      
      console.error(`❌ Zen Search Failed: ${error.message}`);
      
      // Log error telemetry
      if (options.useTelemetry) {
        await this.logTelemetry({
          event: 'search_error',
          query,
          error: error.message,
          duration: searchTime,
          timestamp: new Date().toISOString()
        });
      }
      
      throw error;
    }
  }

  /**
   * Configuration Validation with ESM URL Pattern
   */
  async validateConfiguration(config: any): Promise<void> {
    console.log('🔍 Validating Configuration...');
    
    const validations = [
      {
        name: 'Cache Path',
        check: async () => {
          const cachePath = config.CACHE_PATH;
          const cacheDir = this.bun.file(new URL(cachePath.replace(/^.*\//, ''), this.configRoot));
          return await cacheDir.exists() || cachePath.startsWith('/'); // Allow absolute paths
        }
      },
      {
        name: 'Search Timeout',
        check: async () => {
          const timeout = parseInt(config.SEARCH_TIMEOUT);
          return timeout > 0 && timeout <= 300000; // Max 5 minutes
        }
      },
      {
        name: 'Max Results',
        check: async () => {
          const maxResults = parseInt(config.MAX_RESULTS);
          return maxResults > 0 && maxResults <= 10000;
        }
      },
      {
        name: 'Log Level',
        check: async () => {
          const validLevels = ['debug', 'info', 'warn', 'error'];
          return validLevels.includes(config.LOG_LEVEL?.toLowerCase());
        }
      }
    ];
    
    let passedValidations = 0;
    
    for (const { name, check } of validations) {
      try {
        const result = await check();
        if (result) {
          console.log(`   ✅ ${name}: VALID`);
          passedValidations++;
        } else {
          console.log(`   ❌ ${name}: INVALID`);
        }
      } catch (error) {
        console.log(`   ⚠️  ${name}: ERROR - ${error.message}`);
      }
    }
    
    const successRate = (passedValidations / validations.length) * 100;
    console.log(`📊 Configuration Validation: ${passedValidations}/${validations.length} passed (${successRate.toFixed(1)}%)`);
    
    // Log validation telemetry
    await this.logTelemetry({
      event: 'config_validation',
      passed: passedValidations,
      total: validations.length,
      successRate,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Demonstrate both patterns working together
   */
  async demonstrateZenArchitecture(): Promise<void> {
    console.log('🎯 Demonstrating Ultimate "Bun Zen" Architecture');
    console.log('=' .repeat(70));
    
    // Pattern 1: ESM URL Portability
    console.log('\n📍 Pattern 1: ESM URL Portability');
    console.log('-'.repeat(40));
    
    const currentFile = this.bun.file(new URL(import.meta.url));
    console.log(`📁 Current File: ${currentFile.name}`);
    console.log(`📏 Size: ${currentFile.size} bytes`);
    console.log(`🗂️  Type: ${currentFile.type}`);
    
    // Find monorepo root using ESM URL
    const monorepoRoot = this.bun.file(new URL('../../package.json', import.meta.url));
    if (await monorepoRoot.exists()) {
      console.log(`📦 Monorepo Root: ${monorepoRoot.name}`);
      console.log(`✅ ESM URL pattern working - config follows code!`);
    }
    
    // Pattern 2: File Descriptor Telemetry
    console.log('\n🔌 Pattern 2: File Descriptor Telemetry');
    console.log('-'.repeat(40));
    
    if (this.telemetryPipe.fd !== undefined) {
      console.log(`✅ FD 3 is open - Silent pipe available!`);
      console.log(`💡 Run with: bun run script 3> telemetry.log`);
      
      // Test telemetry
      await this.logTelemetry({
        event: 'architecture_demo',
        patterns: ['ESM_URL', 'FILE_DESCRIPTOR'],
        status: 'working',
        timestamp: new Date().toISOString()
      });
      
      console.log('📊 Test telemetry sent to FD 3');
    } else {
      console.log(`⚠️  FD 3 not open - Run with: bun run script 3> telemetry.log`);
      console.log(`📊 Telemetry will appear in console instead`);
    }
    
    // Combined demonstration
    console.log('\n🚀 Combined: Zen Search with Both Patterns');
    console.log('-'.repeat(40));
    
    const results = await this.performZenSearch('Bun.file', {
      useTelemetry: true,
      validateConfig: true
    });
    
    console.log('\n🎉 Ultimate "Bun Zen" Architecture Demo Complete!');
    console.log('=' .repeat(70));
    console.log('✅ ESM URL Pattern: Config follows code, not shell');
    console.log('✅ File Descriptor Pattern: Clean separation of data and UI');
    console.log('✅ Combined: Robust, portable, high-performance CLI');
    console.log('=' .repeat(70));
  }

  /**
   * CLI Command Handler
   */
  async runCommand(command: string, args: string[]): Promise<void> {
    switch (command) {
      case 'search':
        const query = args[0] || 'Bun.file';
        await this.performZenSearch(query, { useTelemetry: true });
        break;
        
      case 'validate':
        const config = await this.loadSharedConfig();
        await this.validateConfiguration(config);
        break;
        
      case 'demo':
        await this.demonstrateZenArchitecture();
        break;
        
      case 'doctor':
        console.log('🏥 Running Documentation CLI Doctor...');
        await this.demonstrateZenArchitecture();
        break;
        
      default:
        console.log('📖 Available Commands:');
        console.log('  search [query]     - Perform zen search');
        console.log('  validate           - Validate configuration');
        console.log('  demo               - Demonstrate patterns');
        console.log('  doctor             - Run full diagnostics');
        break;
    }
  }
}

/**
 * CLI Entry Point
 */
export async function runDocumentationCLI(args: string[] = process.argv.slice(2)): Promise<void> {
  const cli = new FinalDocumentationCLI();
  
  if (args.length === 0) {
    await cli.runCommand('demo');
  } else {
    const [command, ...commandArgs] = args;
    await cli.runCommand(command, commandArgs);
  }
}

// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDocumentationCLI().catch(console.error);
}
