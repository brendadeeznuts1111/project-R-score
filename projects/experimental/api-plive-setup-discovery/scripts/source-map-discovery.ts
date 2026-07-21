#!/usr/bin/env bun

// [TOOL][PERFORMANCE][ENHANCEMENT][SOURCE-MAP-DISCOVERY-02][v1.0][ACTIVE]

import { SourceMapDiscovery } from './comprehensive-discovery';
import { setVerboseFetch } from '../src/lib/side-effect';
import { pushMaps, validatePushEndpoint } from '../src/lib/push-maps';

function printUsage() {
  console.info('🚀 Source Map Discovery v2.0 - Parallel Edition');
  console.info('');
  console.info('Usage:');
  console.info('  bun run scripts/source-map-discovery.ts [options]');
  console.info('');
  console.info('Options:');
  console.info('  --chunks-dir <path>    Directory containing JS chunks (default: dist/assets)');
  console.info('  --maps-dir <path>      Directory to store source maps (default: dist/sourcemaps)');
  console.info('  --base-url <url>       Base URL for downloading maps (default: http://localhost:3000)');
  console.info('  --parallel <number>    Number of parallel downloads (default: 20)');
  console.info('  --no-validate          Skip source map validation');
  console.info('  --dry-run             Show what would be done without downloading');
  console.info('  --enable-hashing      Enable content hashing and deduplication');
  console.info('  --hash-algorithm <alg> Hash algorithm: sha256 or md5 (default: sha256)');
  console.info('  --verify-checksums    Verify checksums from URL parameters');
  console.info('  --no-canonicalize     Disable JSON canonicalization for hashing');
  console.info('  --proxy <url>         Use HTTP proxy for downloads (e.g., http://proxy:8080)');
  console.info('  --push <url>          POST maps to crash reporting endpoint (multipart/form-data)');
  console.info('  --identifier <id>     Release identifier (version, environment) for grouping');
  console.info('  --build-id <id>       Build identifier (BUILD_ID env var fallback)');
  console.info('  --service <type>      Service type: sentry, datadog, backtrace, generic (default: generic)');
  console.info('  --max-retries <n>     Maximum retry attempts (default: 3)');
  console.info('  --timeout <ms>        Request timeout in milliseconds (default: 30000)');
  console.info('  --user-agent <str>    Custom User-Agent header for HTTP requests');
  console.info('  --trace               Enable network request tracing');
  console.info('  --trace-curl          Enable cURL command tracing');
  console.info('  --watch               Enable live watch mode');
  console.info('  --help, -h            Show this help message');
  console.info('');
  console.info('Examples:');
  console.info('  bun run scripts/source-map-discovery.ts');
  console.info('  bun run scripts/source-map-discovery.ts --chunks-dir ./build --maps-dir ./maps');
  console.info('  bun run scripts/source-map-discovery.ts --parallel 50 --watch');
  console.info('  bun run scripts/source-map-discovery.ts --base-url https://cdn.example.com --no-validate');
  console.info('  bun run scripts/source-map-discovery.ts --dry-run --parallel 100');
  console.info('  bun run scripts/source-map-discovery.ts --trace --dry-run');
  console.info('  bun run scripts/source-map-discovery.ts --trace-curl');
  console.info('  bun run scripts/source-map-discovery.ts --enable-hashing --verify-checksums');
  console.info('  bun run scripts/source-map-discovery.ts --enable-hashing --hash-algorithm md5');
  console.info('  bun run scripts/source-map-discovery.ts --push https://sentry.io/api/... --identifier "my-app@2.1.0" --service sentry');
  console.info('  bun run scripts/source-map-discovery.ts --push https://maps.example.com/upload --identifier staging-v1.2.3 --build-id build-123');
  console.info('  bun run scripts/source-map-discovery.ts --push https://maps.example.com/upload --user-agent "MyApp/1.0" --dry-run --service datadog');
  console.info('');
  console.info('Package.json shortcuts:');
  console.info('  bun run discover                    # Basic discovery');
  console.info('  bun run smd                         # Short alias for discover');
  console.info('  bun run discover:watch              # Live watch mode');
  console.info('  bun run discover:dry                # Dry-run simulation');
  console.info('  bun run discover:fast               # Fast mode (50 parallel, no validation)');
  console.info('  bun run discover:cdn                # CDN deployment mode');
  console.info('  bun run discover:build              # Custom build directories');
  console.info('  bun run discover:hash               # Content hashing enabled');
  console.info('  bun run discover:hash-verify        # Hashing with checksum verification');
  console.info('  bun run discover:proxy              # Proxy configuration');
  console.info('  bun run discover:push               # Push maps to endpoint');
  console.info('  bun run discover:push:staging       # Push with git-based staging identifier');
  console.info('  bun run discover:push:prod          # Push with version-based prod identifier');
  console.info('  bun run discover:push:ci            # Push with CI environment identifiers');
  console.info('  bun run discover:push:sentry        # Push to Sentry with version identifier');
  console.info('  bun run discover:trace              # Network request tracing');
  console.info('  bun run discover:trace-curl         # cURL command tracing');
  console.info('  bun run discover:comprehensive      # Full-featured version');
  console.info('  bun run discover:comprehensive:watch # Full-featured with watch');
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

  console.info('🚀 Source Map Discovery v2.0 - Parallel Edition');
  console.info('Features: Promise.all downloads (~3× faster), auto-validation, live watch');
  console.info(`📁 Chunks: ${config.chunksDir}`);
  console.info(`🗺️  Maps: ${config.mapsDir}`);
  console.info(`🌐 Base URL: ${config.baseUrl}`);
  console.info(`⚡ Parallel: ${config.parallelDownloads}`);
  console.info(`✅ Validation: ${config.validateMaps ? 'enabled' : 'disabled'}`);
  console.info(`👀 Watch: ${config.watchMode ? 'enabled' : 'disabled'}`);
  console.info(`🧪 Dry run: ${config.dryRun ? 'enabled' : 'disabled'}`);
  console.info(`🔍 Trace: ${traceMode ? traceMode : 'disabled'}`);
  console.info(`🔐 Hashing: ${config.enableHashing ? `${config.hashAlgorithm} (${config.canonicalizeJson ? 'canonical' : 'raw'})` : 'disabled'}`);
  console.info(`🔍 Checksum verification: ${config.verifyChecksums ? 'enabled' : 'disabled'}`);
  console.info(`🌐 Proxy: ${config.proxy ? config.proxy : 'disabled'}`);
  console.info(`📤 Push: ${pushUrl ? pushUrl : 'disabled'}`);
  console.info('');

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
    console.info('\n👀 Watch mode enabled - monitoring for new chunks...');
    discovery.startWatchMode();

    process.on('SIGINT', async () => {
      console.info('\nShutting down watch mode...');
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
