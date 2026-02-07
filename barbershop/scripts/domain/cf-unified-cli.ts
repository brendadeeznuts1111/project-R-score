#!/usr/bin/env bun
/**
 * Unified Cloudflare CLI
 *
 * Demonstrates Bun v1.3.7+ features integrated with Cloudflare services:
 * - S3 client (alpha) for R2
 * - Worker API (alpha) for edge computing
 * - Profile capture for performance
 * - Presigned URLs for secure sharing
 * - Header case preservation
 * - Domain management
 */

import { unifiedCloudflare } from '../../lib/cloudflare/unified-client';
import { themes, domainConfig, type ThemeName } from '../../themes/config';
import { ThemedConsole, getDomainTheme, themedSeparator } from '../../themes/config/domain-theme';
import { FACTORY_WAGER_BRAND } from '../../src/config/domain';
import { nanoseconds } from '../../src/utils/bun-enhanced';

// Parse args
const args = process.argv.slice(2);
const themeArg = args[0] as ThemeName;
const hasThemeArg = themeArg in themes;
const activeTheme: ThemeName = hasThemeArg ? themeArg : 'professional';
const commandArgs = hasThemeArg ? args.slice(1) : args;

// Initialize themed console
const t = new ThemedConsole(activeTheme);
const theme = getDomainTheme(activeTheme);
const config = domainConfig;

// Header
function printHeader(): void {
  const { icon, name } = FACTORY_WAGER_BRAND;
  const separator = themedSeparator(activeTheme, 60);

  t.log();
  t.log(separator);
  t.log(`${icon} ${name} Unified Cloudflare CLI`);
  t.log(`   Theme: ${activeTheme} | Bun v${Bun.version}`);
  t.log(`   Features: S3 α | Workers α | Profile | Presign`);
  t.log(separator);
  t.log();
}

// ==================== Commands ====================

async function cmdStatus(): Promise<void> {
  t.header('🔍 Unified Cloudflare Status');
  t.log();

  // Check Bun version
  const version = Bun.version;
  const [major, minor, patch] = version.split('.').map(Number);
  const hasS3 = 'S3' in Bun;
  const hasWorker = 'Worker' in Bun && typeof Bun.Worker !== 'undefined';
  const hasProfile = 'profile' in Bun;

  t.info(`Bun Version: ${version}`);
  t.log(`   S3 Client (α): ${hasS3 ? '✓ Available' : '✗ Not available'}`);
  t.log(`   Worker API (α): ${hasWorker ? '✓ Available' : '✗ Not available'}`);
  t.log(`   Profile API: ${hasProfile ? '✓ Available' : '✗ Not available'}`);
  t.log(`   Header Case: ✓ Preserved (v1.3.7+)`);
  t.log();

  // Check credentials
  try {
    const zones = await unifiedCloudflare.listZones();
    t.success(`Cloudflare API: Connected (${zones.length} zones)`);
  } catch (error) {
    t.error(`Cloudflare API: ${(error as Error).message}`);
  }

  // R2 Status
  try {
    const bucket = await unifiedCloudflare.getR2Bucket();
    t.success(`R2 Storage: Connected (${config.defaults.primary_domain})`);
  } catch (error) {
    t.warning(`R2 Storage: ${(error as Error).message}`);
  }

  t.log();
}

async function cmdR2Upload(): Promise<void> {
  const [filePath, key] = commandArgs.slice(1);

  if (!filePath) {
    t.error('Usage: r2-upload <file-path> [key]');
    return;
  }

  const uploadKey = key || filePath.split('/').pop() || 'unnamed';

  t.header(`${theme.icons.zone} R2 Upload: ${uploadKey}`);
  t.log();

  try {
    // Start profiling
    unifiedCloudflare.startProfiling('r2-upload');
    const startTime = nanoseconds();

    // Read file
    const file = Bun.file(filePath);
    const data = await file.arrayBuffer();

    t.info(`File size: ${(data.byteLength / 1024).toFixed(2)} KB`);

    // Upload with content type
    await unifiedCloudflare.uploadToR2(uploadKey, data, {
      contentType: file.type || 'application/octet-stream',
      metadata: {
        uploadedBy: 'cf-unified-cli',
        uploadedAt: new Date().toISOString(),
      },
    });

    // Generate presigned URL
    const presignedUrl = await unifiedCloudflare.presignR2Url(uploadKey, {
      expiresIn: 3600,
    });

    // Stop profiling
    const profile = await unifiedCloudflare.stopProfiling('r2-upload');
    const elapsedMs = Number(nanoseconds() - startTime) / 1_000_000;

    t.success(`Upload complete in ${elapsedMs.toFixed(2)}ms`);
    t.log(`   Key: ${uploadKey}`);
    t.log(`   Presigned URL: ${presignedUrl.slice(0, 60)}...`);

    if (profile) {
      t.log(`   Peak Memory: ${(profile.summary.peakMemory / 1024 / 1024).toFixed(1)}MB`);
    }
  } catch (error) {
    t.error(`Upload failed: ${(error as Error).message}`);
  }
}

async function cmdR2List(): Promise<void> {
  const prefix = commandArgs[1] || '';

  t.header(`${theme.icons.zone} R2 Objects${prefix ? `: ${prefix}` : ''}`);
  t.log();

  try {
    const result = await unifiedCloudflare.listR2Objects({
      prefix,
      maxKeys: 50,
    });

    if (result.objects.length === 0) {
      t.warning('No objects found');
      return;
    }

    result.objects.forEach(obj => {
      const size = (obj.size / 1024).toFixed(1);
      const date = obj.lastModified.toLocaleDateString();
      t.log(`  📄 ${obj.key}`);
      t.log(`     ${size} KB | ${date}`);
    });

    t.log();
    t.success(`${result.objects.length} object(s)`);

    if (result.isTruncated) {
      t.info('More objects available...');
    }
  } catch (error) {
    t.error(`List failed: ${(error as Error).message}`);
  }
}

async function cmdR2Presign(): Promise<void> {
  const [key, expires] = commandArgs.slice(1);

  if (!key) {
    t.error('Usage: r2-presign <key> [expires-seconds]');
    return;
  }

  const expiresIn = parseInt(expires) || 3600;

  t.header(`${theme.icons.ssl} Presigned URL: ${key}`);
  t.log();

  try {
    const url = await unifiedCloudflare.presignR2Url(key, { expiresIn });

    t.success(`Generated (expires in ${expiresIn}s):`);
    t.log();
    t.log(url);
    t.log();
    t.muted('Use this URL to share or access the object without credentials');
  } catch (error) {
    t.error(`Presign failed: ${(error as Error).message}`);
  }
}

async function cmdWorkerDeploy(): Promise<void> {
  const [scriptPath, name] = commandArgs.slice(1);

  if (!scriptPath) {
    t.error('Usage: worker-deploy <script-path> [name]');
    return;
  }

  const workerName = name || 'default-worker';

  t.header(`⚡ Deploy Worker: ${workerName}`);
  t.log();

  try {
    const script = await Bun.file(scriptPath).text();

    unifiedCloudflare.startProfiling('worker-deploy');
    const startTime = nanoseconds();

    const worker = await unifiedCloudflare.deployWorker(workerName, script, {
      R2_BUCKET: config.defaults.primary_domain,
    });

    const profile = await unifiedCloudflare.stopProfiling('worker-deploy');
    const elapsedMs = Number(nanoseconds() - startTime) / 1_000_000;

    t.success(`Deployed in ${elapsedMs.toFixed(2)}ms`);

    // Test invocation
    const testResponse = await worker.fetch(new Request('https://example.com/'));
    t.info(`Test response: ${testResponse.status}`);

    if (profile) {
      t.log(`   Operations: ${profile.summary.totalOperations}`);
    }
  } catch (error) {
    t.error(`Deploy failed: ${(error as Error).message}`);
    t.muted('Note: Bun.Worker API requires v1.3.7+');
  }
}

async function cmdProfileCapture(): Promise<void> {
  const duration = parseInt(commandArgs[1]) || 5000;

  t.header('📊 Profile Capture');
  t.log();

  t.info(`Capturing for ${duration}ms...`);
  unifiedCloudflare.startProfiling('manual-capture');

  // Perform some operations to profile
  await new Promise(r => setTimeout(r, duration));

  const profile = await unifiedCloudflare.stopProfiling('manual-capture');

  if (profile) {
    t.success('Profile captured:');
    t.log(`   CPU samples: ${profile.cpu.length}`);
    t.log(`   Memory samples: ${profile.memory.length}`);
    t.log(`   Peak CPU: ${profile.summary.peakCpu.toFixed(1)}%`);
    t.log(`   Peak Memory: ${(profile.summary.peakMemory / 1024 / 1024).toFixed(1)}MB`);
  } else {
    t.warning('Profile API not available');
  }
}

async function cmdDeployStack(): Promise<void> {
  t.header('🚀 Deploy Full Stack');
  t.log();

  const domain = config.defaults.primary_domain;

  // Sample worker script
  const workerScript = `
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Hello from ${domain}!', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};
`;

  try {
    unifiedCloudflare.startProfiling('full-deploy');
    const startTime = nanoseconds();

    const result = await unifiedCloudflare.deployStack({
      domain,
      workerScript,
      r2Assets: [{ key: 'config.json', data: JSON.stringify({ version: '1.0.0' }) }],
    });

    const profile = await unifiedCloudflare.stopProfiling('full-deploy');
    const elapsedMs = Number(nanoseconds() - startTime) / 1_000_000;

    t.success(`Stack deployed in ${elapsedMs.toFixed(2)}ms`);
    t.log(`   Zone: ${result.zone.name} (${result.zone.status})`);
    t.log(`   Presigned URLs: ${result.presignedUrls.length}`);

    if (profile) {
      t.log(`   Peak Memory: ${(profile.summary.peakMemory / 1024 / 1024).toFixed(1)}MB`);
    }
  } catch (error) {
    t.error(`Deploy failed: ${(error as Error).message}`);
  }
}

async function cmdStats(): Promise<void> {
  t.header('📈 Operation Statistics');
  t.log();

  const stats = unifiedCloudflare.getOperationStats();

  t.info(`Total Operations: ${stats.total}`);
  t.info(`Average Duration: ${stats.averageDuration.toFixed(2)}ms`);
  t.log();

  t.header('By Type:');
  Object.entries(stats.byType).forEach(([type, data]) => {
    t.log(`  ${type}: ${data.count} ops, ${data.avgDuration.toFixed(2)}ms avg`);
  });
}

async function cmdHelp(): Promise<void> {
  printHeader();

  t.header('Usage:');
  t.log('  bun run cf-unified.ts [theme] <command> [options]');
  t.log();

  t.header('Bun v1.3.7+ Features:');
  t.log('  🪣 S3 Client (α)    - R2 storage operations');
  t.log('  ⚡ Worker API (α)   - Edge computing');
  t.log('  📊 Profile Capture  - Performance analysis');
  t.log('  🔗 Presigned URLs   - Secure sharing');
  t.log('  📝 Header Case      - Preserved in fetch()');
  t.log();

  t.header('Commands:');
  t.log('  status                  Check all service status');
  t.log('  r2-upload <file> [key]  Upload file to R2');
  t.log('  r2-list [prefix]        List R2 objects');
  t.log('  r2-presign <key> [exp]  Generate presigned URL');
  t.log('  worker-deploy <path>    Deploy Worker script');
  t.log('  profile [duration]      Capture performance profile');
  t.log('  deploy-stack            Deploy domain + R2 + Worker');
  t.log('  stats                   Show operation statistics');
  t.log('  help                    Show this help');
  t.log();

  t.header('Examples:');
  t.log('  bun run cf-unified.ts status');
  t.log('  bun run cf-unified.ts dark r2-upload ./file.txt');
  t.log('  bun run cf-unified.ts r2-presign assets/file.txt 86400');
  t.log('  bun run cf-unified.ts deploy-stack');
  t.log();

  t.header('Configuration:');
  t.log(`  Domain: ${config.defaults.primary_domain}`);
  t.log(`  Bucket: ${config.defaults.primary_domain}`);
  t.log(`  SSL: ${config.defaults.ssl_mode}`);
  t.log();
}

// ==================== Main ====================

async function main() {
  const command = commandArgs[0] || 'help';

  if (!hasThemeArg && !['help', '--help', '-h'].includes(command)) {
    printHeader();
  }

  switch (command) {
    case 'status':
      await cmdStatus();
      break;
    case 'r2-upload':
      await cmdR2Upload();
      break;
    case 'r2-list':
      await cmdR2List();
      break;
    case 'r2-presign':
      await cmdR2Presign();
      break;
    case 'worker-deploy':
      await cmdWorkerDeploy();
      break;
    case 'profile':
      await cmdProfileCapture();
      break;
    case 'deploy-stack':
      await cmdDeployStack();
      break;
    case 'stats':
      await cmdStats();
      break;
    case 'help':
    case '--help':
    case '-h':
    default:
      await cmdHelp();
      break;
  }
}

main().catch(console.error);
