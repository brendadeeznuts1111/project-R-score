import { apiTracker } from '../packages/odds-core/src/monitoring/api-tracker.js';
#!/usr/bin/env bun

import { $ } from 'bun';
import { join } from 'path';

interface BuildResult {
  success: boolean;
  package: string;
  duration: number;
  error?: string;
}

class Builder {
  private packages: string[] = [
    'packages/odds-core',
    'packages/odds-websocket',
    'packages/odds-arbitrage',
    'packages/odds-ml',
    'packages/odds-temporal',
    'packages/odds-validation',
    'property-tests',
    'apps/dashboard',
    'apps/api-gateway',
    'apps/stream-processor'
  ];

  async buildAll(): Promise<void> {
    console.log('🚀 Building all packages with Bun optimization...\n');
    
    const results: BuildResult[] = [];
    const startTime = Date.now();

    for (const pkg of this.packages) {
      const result = await this.buildPackage(pkg);
      results.push(result);
      
      if (result.success) {
        console.log(`✅ ${pkg} - ${result.duration}ms`);
      } else {
        console.log(`❌ ${pkg} - ${result.error}`);
      }
    }

    // Run Bun's optimized bundling
    await this.runBunBundling();

    const totalTime = Date.now() - startTime;
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n📊 Build Summary:`);
    console.log(`   Total: ${results.length} packages`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total time: ${totalTime}ms`);

    if (failed > 0) {
      console.log('\n❌ Build failed for some packages');
      process.exit(1);
    } else {
      console.log('\n✅ All packages built successfully');
    }
  }

  async runBunBundling(): Promise<void> {
    console.log('\n🔨 Optimizing bundles with Bun...');

    const targets = [
      {
        name: 'odds-core',
        entry: './packages/odds-core/src/index.ts',
        outdir: './dist/core',
        platform: 'node' as const
      },
      {
        name: 'odds-websocket',
        entry: './packages/odds-websocket/src/server.ts', 
        outdir: './dist/websocket',
        platform: 'node' as const
      },
      {
        name: 'api-gateway',
        entry: './apps/api-gateway/src/index.ts',
        outdir: './dist/api',
        platform: 'browser' as const
      }
    ];

    for (const target of targets) {
      try {
        const result = await Bun.build({
          entrypoints: [target.entry],
          outdir: target.outdir,
          target: target.platform,
          minify: true,
          splitting: true,
          sourcemap: 'external',
          external: ['@tensorflow/tfjs', 'uWebSockets.js'] // External heavy deps
        });
        
        if (!result.success) {
          console.error(`Failed to build ${target.name}:`, result.logs);
        } else {
          console.log(`✅ Bundled ${target.name} (${result.outputs.length} files)`);
        }
      } catch (error) {
        console.error(`Bundle error for ${target.name}:`, error);
      }
    }

    // Generate type declarations
    console.log('📝 Generating type declarations...');
    await $`bun run typecheck`.quiet();
  }

  async buildPackage(packagePath: string): Promise<BuildResult> {
    const startTime = Date.now();

    try {
      // Use Bun shell for cross-platform compatibility
      const result = await $`cd ${packagePath} && bun run build`.nothrow();
      
      if (result.success) {
        return {
          success: true,
          package: packagePath,
          duration: Date.now() - startTime
        };
      } else {
        return {
          success: false,
          package: packagePath,
          duration: Date.now() - startTime,
          error: result.stderr?.toString() || 'Build command failed'
        };
      }

    } catch (error) {
      return {
        success: false,
        package: packagePath,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async clean(): Promise<void> {
    console.log('🧹 Cleaning build artifacts...\n');
    
    // Use Bun shell for cleaning
    await $`rm -rf packages/*/dist apps/*/dist dist/*`.nothrow();
    await $`find . -name "*.tsbuildinfo" -delete`.nothrow();
    
    console.log('\n✅ Clean completed');
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const builder = new Builder();

  switch (command) {
    case 'clean':
      await builder.clean();
      break;
    case 'all':
    default:
      await builder.buildAll();
      break;
  }
}

if (import.meta.main) {
  main().catch(error => {
    console.error('Build script failed:', error);
    process.exit(1);
  });
}

export { Builder };
