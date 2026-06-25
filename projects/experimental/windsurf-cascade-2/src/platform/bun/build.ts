// Bun Build Script - Advanced Transpilation and Bundling
// This script demonstrates Bun's build capabilities with custom configuration

// Remove the import since Bun is global
import { bunIntegration } from './bun-integration';

interface BuildConfig {
  entrypoint: string;
  outfile: string;
  target: 'browser' | 'bun' | 'node';
  minify: boolean;
  sourcemap: boolean;
  dropConsole: boolean;
  defineConstants: Record<string, string>;
  customLoaders: Record<string, string>;
  splitting: boolean;
  external: string[];
}

class BunBuildManager {
  private configs: Map<string, BuildConfig> = new Map();

  constructor() {
    this.setupDefaultConfigs();
  }

  private setupDefaultConfigs(): void {
    // Development build configuration
    this.configs.set('development', {
      entrypoint: './src/platform/bun/demo.tsx',
      outfile: './dist/demo.dev.js',
      target: 'browser',
      minify: false,
      sourcemap: true,
      dropConsole: false,
      defineConstants: {
        'process.env.NODE_ENV': '"development"',
        'process.env.DEBUG': 'true'
      },
      customLoaders: {
        '.custom': 'js'
      },
      splitting: false,
      external: []
    });

    // Production build configuration
    this.configs.set('production', {
      entrypoint: './src/platform/bun/demo.tsx',
      outfile: './dist/demo.prod.js',
      target: 'browser',
      minify: true,
      sourcemap: false,
      dropConsole: true,
      defineConstants: {
        'process.env.NODE_ENV': '"production"',
        'process.env.DEBUG': 'false'
      },
      customLoaders: {},
      splitting: true,
      external: []
    });

    // Node.js build configuration
    this.configs.set('node', {
      entrypoint: './src/platform/bun/bun-integration.ts',
      outfile: './dist/bun-integration.cjs',
      target: 'node',
      minify: false,
      sourcemap: true,
      dropConsole: false,
      defineConstants: {
        'process.env.NODE_ENV': '"development"',
        'process.env.PLATFORM': '"node"'
      },
      customLoaders: {},
      splitting: false,
      external: ['bun-types']
    });
  }

  /**
   * Build with specified configuration
   */
  async build(configName: string): Promise<void> {
    const config = this.configs.get(configName);
    if (!config) {
      throw new Error(`Build configuration '${configName}' not found`);
    }

    console.info(`🔨 Building ${configName}...`);
    console.info(`📁 Entry: ${config.entrypoint}`);
    console.info(`📦 Output: ${config.outfile}`);

    try {
      const buildOptions = {
        entrypoint: config.entrypoint,
        outfile: config.outfile,
        target: config.target,
        minify: config.minify,
        sourcemap: config.sourcemap,
        define: config.defineConstants,
        splitting: config.splitting,
        external: config.external
      };

      // Add drop console option if specified
      if (config.dropConsole) {
        (buildOptions as any).drop = ['console', 'debugger'];
      }

      // Add custom loaders if specified
      if (Object.keys(config.customLoaders).length > 0) {
        (buildOptions as any).loader = config.customLoaders;
      }

      const result = await Bun.build(buildOptions);

      console.info(`✅ Build completed successfully!`);
      console.info(`📊 Output size: ${result.outputs.length} files`);
      
      for (const output of result.outputs) {
        const stats = await Bun.file(output.path).stat();
        console.info(`   📄 ${output.path} (${this.formatBytes(stats.size)})`);
      }

    } catch (error) {
      console.error(`❌ Build failed:`, error);
      throw error;
    }
  }

  /**
   * Build all configurations
   */
  async buildAll(): Promise<void> {
    console.info('🚀 Building all configurations...\n');

    for (const [configName] of this.configs) {
      try {
        await this.build(configName);
        console.info(''); // Add spacing between builds
      } catch (error) {
        console.error(`❌ Failed to build ${configName}:`, error);
      }
    }
  }

  /**
   * Watch mode for development
   */
  async watch(configName: string = 'development'): Promise<void> {
    const config = this.configs.get(configName);
    if (!config) {
      throw new Error(`Build configuration '${configName}' not found`);
    }

    console.info(`👀 Watching ${configName} for changes...`);
    console.info(`📁 Entry: ${config.entrypoint}`);

    // Create a watcher for the entrypoint and its dependencies
    const watcher = Bun.watch([
      config.entrypoint,
      './src/platform/bun/**/*.ts',
      './src/platform/bun/**/*.tsx',
      './src/core/config/**/*.ts'
    ]);

    // Initial build
    await this.build(configName);

    // Watch for changes
    for await (const event of watcher) {
      if (event.type === 'change' || event.type === 'create') {
        console.info(`📝 File changed: ${event.path}`);
        console.info('🔄 Rebuilding...');
        
        try {
          await this.build(configName);
          console.info('✅ Rebuild completed!\n');
        } catch (error) {
          console.error('❌ Rebuild failed:', error);
        }
      }
    }
  }

  /**
   * Analyze bundle size and dependencies
   */
  async analyze(configName: string): Promise<void> {
    const config = this.configs.get(configName);
    if (!config) {
      throw new Error(`Build configuration '${configName}' not found`);
    }

    console.info(`🔍 Analyzing ${configName}...`);

    try {
      // Build with analysis
      const result = await Bun.build({
        entrypoint: config.entrypoint,
        target: config.target,
        minify: false,
        sourcemap: true,
        define: config.defineConstants
      });

      console.info(`📊 Bundle Analysis:`);
      console.info(`   Files: ${result.outputs.length}`);
      
      let totalSize = 0;
      for (const output of result.outputs) {
        const stats = await Bun.file(output.path).stat();
        const size = stats.size;
        totalSize += size;
        console.info(`   📄 ${output.path}: ${this.formatBytes(size)}`);
      }
      
      console.info(`   📦 Total: ${this.formatBytes(totalSize)}`);
      console.info(`   🎯 Target: ${config.target}`);

    } catch (error) {
      console.error(`❌ Analysis failed:`, error);
    }
  }

  /**
   * Create production-optimized build
   */
  async buildProduction(): Promise<void> {
    console.info('🏭 Creating production build...\n');

    // Build main application
    await this.build('production');

    // Create additional assets
    await this.createAssets();

    // Generate build report
    await this.generateBuildReport();

    console.info('🎉 Production build completed!');
  }

  /**
   * Create additional assets for production
   */
  private async createAssets(): Promise<void> {
    console.info('📦 Creating additional assets...');

    // Create HTML file
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bun Integration Demo</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
               max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        .header { text-align: center; color: #333; margin-bottom: 2rem; }
        .feature { background: #f8f9fa; padding: 1rem; margin: 0.5rem 0; border-radius: 8px; 
                  border-left: 4px solid #007acc; }
        .performance { background: #e8f5e8; padding: 1rem; margin: 1rem 0; border-radius: 8px; }
    </style>
</head>
<body>
    <h1 class="header">🚀 Bun Integration Demo</h1>
    <div id="app">
        <div class="performance">
            <h3>⚡ Performance</h3>
            <p>Built with Bun's ultra-fast bundler</p>
        </div>
        <div id="features"></div>
    </div>
    <script src="./demo.prod.js"></script>
</body>
</html>`;

    await Bun.write('./dist/index.html', html);
    console.info('✅ HTML asset created');

    // Create manifest file
    const manifest = {
      name: 'Bun Integration Demo',
      version: '1.0.0',
      buildTime: new Date().toISOString(),
      files: [
        'demo.prod.js',
        'index.html'
      ],
      bun: {
        version: Bun.version,
        features: [
          'TypeScript transpilation',
          'JSX support',
          'Fast bundling',
          'Tree shaking',
          'Minification'
        ]
      }
    };

    await Bun.write('./dist/manifest.json', JSON.stringify(manifest, null, 2));
    console.info('✅ Manifest created');
  }

  /**
   * Generate build report
   */
  private async generateBuildReport(): Promise<void> {
    const report: {
      timestamp: string;
      bunVersion: any;
      configs: string[];
      files: Array<{path: string; size: number; sizeFormatted: string}>;
      totalSize: number;
      totalSizeFormatted: string;
    } = {
      timestamp: new Date().toISOString(),
      bunVersion: Bun.version,
      configs: Array.from(this.configs.keys()),
      files: [],
      totalSize: 0,
      totalSizeFormatted: ''
    };

    // Analyze built files
    const distFiles = await Array.fromAsync(Bun.glob('./dist/*'));
    const fileArray: Array<{path: string; size: number; sizeFormatted: string}> = [];
    
    for (const file of distFiles) {
      const stats = await Bun.file(file).stat();
      fileArray.push({
        path: file,
        size: stats.size,
        sizeFormatted: this.formatBytes(stats.size)
      });
      report.totalSize += stats.size;
    }

    report.files = fileArray;

    report.totalSizeFormatted = this.formatBytes(report.totalSize);

    await Bun.write('./dist/build-report.json', JSON.stringify(report, null, 2));
    console.info('📊 Build report generated');
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * List available configurations
   */
  listConfigs(): void {
    console.info('📋 Available build configurations:');
    for (const [name, config] of this.configs) {
      console.info(`   ${name}:`);
      console.info(`     Entry: ${config.entrypoint}`);
      console.info(`     Output: ${config.outfile}`);
      console.info(`     Target: ${config.target}`);
      console.info(`     Minify: ${config.minify}`);
    }
  }
}

// Export build manager
export const buildManager = new BunBuildManager();

// CLI interface
async function main(): Promise<void> {
  const command = process.argv[2];
  const configName = process.argv[3];

  switch (command) {
    case 'build':
      if (configName) {
        await buildManager.build(configName);
      } else {
        console.info('Please specify a configuration: build <config>');
        buildManager.listConfigs();
      }
      break;
    
    case 'build-all':
      await buildManager.buildAll();
      break;
    
    case 'watch':
      await buildManager.watch(configName || 'development');
      break;
    
    case 'analyze':
      if (configName) {
        await buildManager.analyze(configName);
      } else {
        console.info('Please specify a configuration: analyze <config>');
        buildManager.listConfigs();
      }
      break;
    
    case 'production':
      await buildManager.buildProduction();
      break;
    
    case 'list':
      buildManager.listConfigs();
      break;
    
    default:
      console.info('Usage:');
      console.info('  bun run build.ts build <config>     - Build specific configuration');
      console.info('  bun run build.ts build-all         - Build all configurations');
      console.info('  bun run build.ts watch [config]    - Watch for changes');
      console.info('  bun run build.ts analyze <config>  - Analyze bundle size');
      console.info('  bun run build.ts production        - Create production build');
      console.info('  bun run build.ts list              - List configurations');
      break;
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}
