#!/usr/bin/env bun

// [TOOL][PERFORMANCE][ENHANCEMENT][SOURCE-MAP-DISCOVERY-02][v1.0][ACTIVE]

import { SourceMapDiscovery } from './comprehensive-discovery';
import { setVerboseFetch } from '../src/lib/side-effect';
import { pushMaps, validatePushEndpoint } from '../src/lib/push-maps';

function printUsage() {
  console.log('🚀 Source Map Discovery v2.0 - Parallel Edition');
  console.log('');
  console.log('Usage:');
  console.log('  bun run scripts/source-map-discovery.ts [options]');
  console.log('');
  console.log('Options:');
  console.log('  --chunks-dir <path>    Directory containing JS chunks (default: dist/assets)');
  console.log('  --maps-dir <path>      Directory to store source maps (default: dist/sourcemaps)');
  console.log('  --base-url <url>       Base URL for downloading maps (default: http://localhost:3000)');
  console.log('  --parallel <number>    Number of parallel downloads (default: 20)');
  console.log('  --no-validate          Skip source map validation');
  console.log('  --dry-run             Show what would be done without downloading');
  console.log('  --enable-hashing      Enable content hashing and deduplication');
  console.log('  --hash-algorithm <alg> Hash algorithm: sha256 or md5 (default: sha256)');
  console.log('  --verify-checksums    Verify checksums from URL parameters');
  console.log('  --no-canonicalize     Disable JSON canonicalization for hashing');
  console.log('  --proxy <url>         Use HTTP proxy for downloads (e.g., http://proxy:8080)');
  console.log('  --push <url>          POST maps to crash reporting endpoint (multipart/form-data)');
  console.log('  --identifier <id>     Release identifier (version, environment) for grouping');
  console.log('  --build-id <id>       Build identifier (BUILD_ID env var fallback)');
  console.log('  --service <type>      Service type: sentry, datadog, backtrace, generic (default: generic)');
  console.log('  --max-retries <n>     Maximum retry attempts (default: 3)');
  console.log('  --timeout <ms>        Request timeout in milliseconds (default: 30000)');
  console.log('  --user-agent <str>    Custom User-Agent header for HTTP requests');
  console.log('  --trace               Enable network request tracing');
  console.log('  --trace-curl          Enable cURL command tracing');
  console.log('  --watch               Enable live watch mode');
  console.log('  --help, -h            Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  bun run scripts/source-map-discovery.ts');
  console.log('  bun run scripts/source-map-discovery.ts --chunks-dir ./build --maps-dir ./maps');
  console.log('  bun run scripts/source-map-discovery.ts --parallel 50 --watch');
  console.log('  bun run scripts/source-map-discovery.ts --base-url https://cdn.example.com --no-validate');
  console.log('  bun run scripts/source-map-discovery.ts --dry-run --parallel 100');
  console.log('  bun run scripts/source-map-discovery.ts --trace --dry-run');
  console.log('  bun run scripts/source-map-discovery.ts --trace-curl');
  console.log('  bun run scripts/source-map-discovery.ts --enable-hashing --verify-checksums');
  console.log('  bun run scripts/source-map-discovery.ts --enable-hashing --hash-algorithm md5');
  console.log('  bun run scripts/source-map-discovery.ts --push https://sentry.io/api/... --identifier "my-app@2.1.0" --service sentry');
  console.log('  bun run scripts/source-map-discovery.ts --push https://maps.example.com/upload --identifier staging-v1.2.3 --build-id build-123');
  console.log('  bun run scripts/source-map-discovery.ts --push https://maps.example.com/upload --user-agent "MyApp/1.0" --dry-run --service datadog');
  console.log('');
  console.log('Package.json shortcuts:');
  console.log('  bun run discover                    # Basic discovery');
  console.log('  bun run smd                         # Short alias for discover');
  console.log('  bun run discover:watch              # Live watch mode');
  console.log('  bun run discover:dry                # Dry-run simulation');
  console.log('  bun run discover:fast               # Fast mode (50 parallel, no validation)');
  console.log('  bun run discover:cdn                # CDN deployment mode');
  console.log('  bun run discover:build              # Custom build directories');
  console.log('  bun run discover:hash               # Content hashing enabled');
  console.log('  bun run discover:hash-verify        # Hashing with checksum verification');
  console.log('  bun run discover:proxy              # Proxy configuration');
  console.log('  bun run discover:push               # Push maps to endpoint');
  console.log('  bun run discover:push:staging       # Push with git-based staging identifier');
  console.log('  bun run discover:push:prod          # Push with version-based prod identifier');
  console.log('  bun run discover:push:ci            # Push with CI environment identifiers');
  console.log('  bun run discover:push:sentry        # Push to Sentry with version identifier');
  console.log('  bun run discover:trace              # Network request tracing');
  console.log('  bun run discover:trace-curl         # cURL command tracing');
  console.log('  bun run discover:comprehensive      # Full-featured version');
  console.log('  bun run discover:comprehensive:watch # Full-featured with watch');
}

async function main() {
  const args = process.argv.slice(2);

  // Default configuration optimized for performance
  const config = {
    chunksDir: 'dist/assets',
    mapsDir: 'dist/sourcemaps',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    parallelDownloads: 20, // Increased for better performance on 100+ chunks
    validateMaps: true,
    watchMode: false,
    dryRun: false,
    enableHashing: false,
    hashAlgorithm: 'sha256' as const,
    verifyChecksums: false,
    canonicalizeJson: true,
    proxy: undefined,
  };

  let traceMode: 'true' | 'curl' | null = null;
  let pushUrl: string | null = null;
  let pushIdentifier: string | null = null;
  let pushBuildId: string | null = null;
  let pushService: string = 'generic';
  let maxRetries: number = 3;
  let timeout: number = 30000;
  let userAgent: string | null = null;

  // Note: BUN_OPTIONS applies to bun command itself, not individual scripts

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--chunks-dir':
        config.chunksDir = args[i + 1];
        i++; // Skip next arg
        break;
      case '--maps-dir':
        config.mapsDir = args[i + 1];
        i++; // Skip next arg
        break;
      case '--parallel':
        config.parallelDownloads = parseInt(args[i + 1]);
        i++; // Skip next arg
        break;
      case '--base-url':
        config.baseUrl = args[i + 1];
        i++; // Skip next arg
        break;
      case '--no-validate':
        config.validateMaps = false;
        break;
      case '--watch':
        config.watchMode = true;
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--trace':
        traceMode = 'true';
        break;
      case '--trace-curl':
        traceMode = 'curl';
        break;
      case '--enable-hashing':
        config.enableHashing = true;
        break;
      case '--hash-algorithm':
        config.hashAlgorithm = args[i + 1] as 'sha256' | 'md5';
        i++; // Skip next arg
        break;
      case '--verify-checksums':
        config.verifyChecksums = true;
        break;
      case '--no-canonicalize':
        config.canonicalizeJson = false;
        break;
      case '--proxy':
        config.proxy = args[i + 1];
        i++; // Skip next arg
        break;
      case '--push':
        pushUrl = args[i + 1];
        i++; // Skip next arg
        break;
      case '--identifier':
        pushIdentifier = args[i + 1];
        i++; // Skip next arg
        break;
      case '--build-id':
        pushBuildId = args[i + 1];
        i++; // Skip next arg
        break;
      case '--service':
        pushService = args[i + 1];
        i++; // Skip next arg
        break;
      case '--max-retries':
        maxRetries = parseInt(args[i + 1]) || 3;
        i++; // Skip next arg
        break;
      case '--timeout':
        timeout = parseInt(args[i + 1]) || 30000;
        i++; // Skip next arg
        break;
      case '--user-agent':
        userAgent = args[i + 1];
        i++; // Skip next arg
        break;
      case '--help':
      case '-h':
        printUsage();
        return;
      default:
        if (args[i].startsWith('-')) {
          console.error(`❌ Unknown option: ${args[i]}`);
          printUsage();
          process.exit(1);
        }
    }
  }

  console.log('🚀 Source Map Discovery v2.0 - Parallel Edition');
  console.log('Features: Promise.all downloads (~3× faster), auto-validation, live watch');
  console.log(`📁 Chunks: ${config.chunksDir}`);
  console.log(`🗺️  Maps: ${config.mapsDir}`);
  console.log(`🌐 Base URL: ${config.baseUrl}`);
  console.log(`⚡ Parallel: ${config.parallelDownloads}`);
  console.log(`✅ Validation: ${config.validateMaps ? 'enabled' : 'disabled'}`);
  console.log(`👀 Watch: ${config.watchMode ? 'enabled' : 'disabled'}`);
  console.log(`🧪 Dry run: ${config.dryRun ? 'enabled' : 'disabled'}`);
  console.log(`🔍 Trace: ${traceMode ? traceMode : 'disabled'}`);
  console.log(`🔐 Hashing: ${config.enableHashing ? `${config.hashAlgorithm} (${config.canonicalizeJson ? 'canonical' : 'raw'})` : 'disabled'}`);
  console.log(`🔍 Checksum verification: ${config.verifyChecksums ? 'enabled' : 'disabled'}`);
  console.log(`🌐 Proxy: ${config.proxy ? config.proxy : 'disabled'}`);
  console.log(`📤 Push: ${pushUrl ? pushUrl : 'disabled'}`);
  console.log('');

  // Set verbose fetch mode if trace options were used
  if (traceMode) {
    setVerboseFetch(traceMode);
  }

  const discovery = new SourceMapDiscovery(config);
  await discovery.discoverAndDownload();

  // Push maps to endpoint if requested
  if (pushUrl) {
    if (!validatePushEndpoint(pushUrl)) {
      console.error(`❌ Invalid push endpoint URL: ${pushUrl}`);
      process.exit(1);
    }

    try {
      const pushResults = await pushMaps({
        mapsDir: config.mapsDir,
        endpoint: pushUrl,
        identifier: pushIdentifier,
        buildId: pushBuildId,
        dryRun: config.dryRun,
        maxRetries,
        timeout,
        service: pushService as any,
        userAgent
      });

      if (!config.dryRun) {
        const failedCount = pushResults.filter(r => !r.success).length;
        if (failedCount > 0) {
          console.error(`❌ Push failed: ${failedCount} files failed to upload`);
          process.exit(1);
        }
      }
    } catch (error) {
      console.error(`❌ Push failed: ${error.message}`);
      process.exit(1);
    }
  }

  if (config.watchMode) {
    console.log('\n👀 Watch mode enabled - monitoring for new chunks...');
    discovery.startWatchMode();

    process.on('SIGINT', async () => {
      console.log('\nShutting down watch mode...');
      await discovery.stopWatchMode();
      process.exit(0);
    });

    await new Promise(() => {});
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}
