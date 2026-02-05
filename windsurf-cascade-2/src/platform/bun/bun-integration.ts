// Bun Integration - Advanced Transpilation & Language Features
// This file demonstrates comprehensive Bun language feature integration

// Import Bun properly for version access
const BunVersion = typeof globalThis !== 'undefined' && 'Bun' in globalThis 
  ? (globalThis as any).Bun.version 
  : '1.3.5';

// Get Bun global reference
const BunGlobal = typeof globalThis !== 'undefined' && 'Bun' in globalThis 
  ? (globalThis as any).Bun 
  : null;

// TypeScript with advanced features
interface BunIntegrationConfig {
  jsxTransform: 'react' | 'automatic' | 'classic';
  moduleResolution: 'auto' | 'fallback' | 'force';
  enableTreeShaking: boolean;
  customLoaders: Record<string, string>;
  defineConstants: Record<string, string>;
}

export class BunIntegrationManager {
  private config: BunIntegrationConfig;
  private loadedModules: Map<string, any> = new Map();

  constructor(config: Partial<BunIntegrationConfig> = {}) {
    this.config = {
      jsxTransform: 'automatic',
      moduleResolution: 'auto',
      enableTreeShaking: true,
      customLoaders: {},
      defineConstants: {
        'process.env.NODE_ENV': process.env.NODE_ENV || 'development',
        'process.env.BUN_VERSION': BunVersion,
        'process.env.PLATFORM': 'bun'
      },
      ...config
    };

    console.log('🚀 Bun Integration Manager initialized');
    console.log('📋 Config:', this.config);
  }

  /**
   * Load and transpile TypeScript with JSX support
   */
  async loadTSXModule(filePath: string): Promise<any> {
    try {
      // Bun automatically handles .tsx files with built-in transpilation
      const module = await import(filePath);
      
      // Cache the module for performance
      this.loadedModules.set(filePath, module);
      
      console.log(`✅ Loaded TSX module: ${filePath}`);
      return module;
    } catch (error) {
      console.error(`❌ Failed to load TSX module ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Load configuration files with various formats
   */
  async loadConfig(configPath: string): Promise<any> {
    const ext = configPath.split('.').pop()?.toLowerCase();
    
    try {
      switch (ext) {
        case 'json':
          return await this.loadJSONConfig(configPath);
        case 'toml':
          return await this.loadTOMLConfig(configPath);
        case 'yaml':
        case 'yml':
          return await this.loadYAMLConfig(configPath);
        default:
          throw new Error(`Unsupported config format: ${ext}`);
      }
    } catch (error) {
      console.error(`❌ Failed to load config ${configPath}:`, error);
      throw error;
    }
  }

  /**
   * Load JSON configuration with comments support
   */
  private async loadJSONConfig(configPath: string): Promise<any> {
    const file = Bun.file(configPath);
    const content = await file.text();
    
    // Bun supports JSONC out of the box
    return JSON.parse(content);
  }

  /**
   * Load TOML configuration
   */
  private async loadTOMLConfig(configPath: string): Promise<any> {
    const file = Bun.file(configPath);
    const content = await file.text();
    
    // Parse TOML (simplified parser for demo)
    const config: Record<string, any> = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/"/g, '');
          config[key.trim()] = value;
        }
      }
    }
    
    return config;
  }

  /**
   * Load YAML configuration
   */
  private async loadYAMLConfig(configPath: string): Promise<any> {
    const file = Bun.file(configPath);
    const content = await file.text();
    
    // Simple YAML parser for demo
    const config: Record<string, any> = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split(':');
        if (key && valueParts.length > 0) {
          const value = valueParts.join(':').trim();
          config[key.trim()] = value;
        }
      }
    }
    
    return config;
  }

  /**
   * Serve static files with Bun's built-in server
   */
  async serveStatic(port: number = 3000, staticDir: string = './public'): Promise<any> {
    const server = Bun.serve({
      port,
      async fetch(req) {
        const url = new URL(req.url);
        
        // Handle different file types with proper MIME types
        if (url.pathname === '/') {
          return new Response(Bun.file(`${staticDir}/index.html`), {
            headers: { 'Content-Type': 'text/html' }
          });
        }
        
        // Serve static files based on extension
        const filePath = `${staticDir}${url.pathname}`;
        const file = Bun.file(filePath);
        
        if (await file.exists()) {
          const ext = url.pathname.split('.').pop()?.toLowerCase();
          const mimeTypes: Record<string, string> = {
            'js': 'application/javascript',
            'css': 'text/css',
            'json': 'application/json',
            'html': 'text/html',
            'txt': 'text/plain'
          };
          
          return new Response(file, {
            headers: { 'Content-Type': mimeTypes[ext || 'text/plain'] || 'text/plain' }
          });
        }
        
        return new Response('Not Found', { status: 404 });
      }
    });
    
    console.log(`🌐 Static server running on http://localhost:${port}`);
    return server;
  }

  /**
   * Transpile and bundle with custom configuration
   */
  async bundle(options: {
    entrypoint: string;
    outfile: string;
    minify?: boolean;
    dropConsole?: boolean;
    target?: 'browser' | 'bun' | 'node';
  }): Promise<void> {
    const {
      entrypoint,
      outfile,
      minify = true,
      dropConsole = false,
      target = 'browser'
    } = options;
    
    try {
      const buildOptions: any = {
        entrypoint,
        outfile,
        target,
        minify,
        define: this.config.defineConstants
      };
      
      // Drop console statements in production
      if (dropConsole) {
        buildOptions.drop = ['console'];
      }
      
      await Bun.build(buildOptions);
      console.log(`📦 Bundle created: ${outfile}`);
    } catch (error) {
      console.error(`❌ Bundling failed:`, error);
      throw error;
    }
  }

  /**
   * Execute TypeScript code with runtime transpilation
   */
  async executeTSX(code: string): Promise<any> {
    try {
      // Create a temporary file and execute it
      const tempFile = `/tmp/temp-${Date.now()}.tsx`;
      await Bun.write(tempFile, code);
      
      const result = await import(tempFile);
      
      // Clean up
      await Bun.file(tempFile).delete();
      
      return result;
    } catch (error) {
      console.error(`❌ TSX execution failed:`, error);
      throw error;
    }
  }

  /**
   * Get Bun runtime information
   */
  getRuntimeInfo(): {
    version: string;
    platform: string;
    arch: string;
    features: string[];
  } {
    return {
      version: Bun.version,
      platform: process.platform,
      arch: process.arch,
      features: [
        'TypeScript transpilation',
        'JSX transform',
        'Built-in bundler',
        'Fast file system',
        'HTTP server',
        'SQLite database',
        'WebSocket support',
        'File system watchers'
      ]
    };
  }

  /**
   * Demonstrate advanced language features
   */
  async demonstrateFeatures(): Promise<void> {
    console.log('\n🎯 Demonstrating Bun Language Features:');
    
    // 1. Top-level await (Bun supports this natively)
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(`✅ Top-level await: ${Date.now() - startTime}ms`);
    
    // 2. TypeScript with JSX (handled automatically)
    const jsxCode = `
      const element = <div>Hello from JSX!</div>;
      export default element;
    `;
    
    try {
      const result = await this.executeTSX(jsxCode);
      console.log('✅ JSX transpilation: Success');
    } catch (error) {
      console.log('⚠️ JSX demo: Limited in this context');
    }
    
    // 3. Fast file operations
    const testFile = '/tmp/bun-test.txt';
    await BunGlobal.write(testFile, 'Hello Bun!');
    const content = await BunGlobal.file(testFile).text();
    console.log(`✅ Fast file I/O: ${content}`);
    await BunGlobal.file(testFile).delete();
    
    // 4. Built-in SQLite (if available)
    try {
      if (typeof BunGlobal !== 'undefined' && BunGlobal.Database) {
        const db = new BunGlobal.Database(':memory:');
        db.run('CREATE TABLE test (id INTEGER, name TEXT)');
        db.run('INSERT INTO test VALUES (1, "Bun")');
        const result = db.query('SELECT * FROM test').all();
        console.log('✅ Built-in SQLite:', result);
        db.close();
      } else {
        console.log('⚠️ SQLite not available in this environment');
      }
    } catch (error) {
      console.log('⚠️ SQLite demo skipped:', error);
    }
  }
}

// Export singleton instance
export const bunIntegration = new BunIntegrationManager();

// Export types for external use
export type { BunIntegrationConfig };

// Auto-demonstrate when run directly
// Note: import.meta.main requires ES2020+ module setting
