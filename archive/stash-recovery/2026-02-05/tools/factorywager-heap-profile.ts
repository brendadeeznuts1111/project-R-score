#!/usr/bin/env bun
/**
 * 🧠 FactoryWager Heap Profiler
 * 
 * Heap profiling with visual metadata tagging
 * 
 * @version 4.0
 */

import { styled, log, FW_COLORS, generateVisualMetadata } from '../lib/theme/colors.ts';

/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */
import { Utils } from '../lib/utils/index.ts';
import type { R2Metadata } from '../lib/core/fw-types';

// Simulate heap profile markdown
function generateHeapProfile(): string {
  const heapSize = 50 + Math.random() * 200; // 50-250MB
  const leakSize = Math.random() * 50; // 0-50MB potential leak
  
  return `# Heap Profile Report

## Memory Analysis
- Heap size: ${heapSize.toFixed(2)}MB
- Potential leak: ${leakSize.toFixed(2)}MB
- Total allocations: 15,847
- Garbage collections: 23

### Memory Breakdown
\`\`\`
┌─────────────────┬─────────────┬──────────┐
│ Category        │ Size (MB)   │ % Total  │
├─────────────────┼─────────────┼──────────┤
│ Objects         │ ${(heapSize * 0.4).toFixed(2)} │ 40%      │
│ Arrays          │ ${(heapSize * 0.3).toFixed(2)} │ 30%      │
│ Strings         │ ${(heapSize * 0.2).toFixed(2)} │ 20%      │
│ Other           │ ${(heapSize * 0.1).toFixed(2)} │ 10%      │
└─────────────────┴─────────────┴──────────┘
\`\`\`

### Leak Detection
${leakSize > 10 ? '⚠️ Potential memory leak detected in event listeners' : '✅ No significant leaks detected'}

## Recommendations
${leakSize > 10 ? '- Review event listener cleanup\n- Check for circular references' : '- Memory usage is within normal range'}`;
}

// Simulate R2 upload
async function simulateR2Upload(key: string, data: Uint8Array, metadata: R2Metadata): Promise<string> {
  // In real implementation, this would upload to R2
  // For demo, we'll just return a mock URL
  return `https://r2.scanner-cookies.com/${key}`;
}

// Main heap profiling function
async function runHeapProfile() {
  log.section('FactoryWager Heap Profiler v4.0', 'accent');
  
  // Generate profile
  log.info('Analyzing heap memory...');
  const md = generateHeapProfile();
  
  // Extract heap size for severity analysis
  const heapSizeMatch = md.match(/Heap size: (\d+\.?\d*)MB/i);
  const severity = heapSizeMatch ? 
    (parseFloat(heapSizeMatch[1]) > 100 ? "error" : 
     parseFloat(heapSizeMatch[1]) > 50 ? "warning" : "success") : "muted";
  
  const dominantColor = FW_COLORS[severity];
  const themeTag = `factorywager-${severity}`;
  
  // Compress profile
  log.info('Compressing heap profile...');
  const zst = Bun.zstdCompressSync(md);
  
  // Generate timestamp and key
  const timestamp = Date.now();
  const key = `profiles/heap-${timestamp}.md.zst`;
  
  // Create visual metadata
  const visualMetadata = generateVisualMetadata(severity);
  
  // Full R2 metadata
  const r2Metadata: R2Metadata = {
    ...visualMetadata,
    'factorywager:version': '4.0',
    'profile:type': 'heap',
    'profile:timestamp': timestamp.toString(),
    'system:compression': 'zstd',
    'system:compression-ratio': `${(md.length / zst.length).toFixed(1)}x`,
    'system:runtime': 'bun-1.4',
  };
  
  // Simulate R2 upload
  log.info('Uploading to R2...');
  const signed = await simulateR2Upload(key, zst, r2Metadata);
  
  // Color-coded output based on severity
  const emoji = severity === "error" ? "🚨" : severity === "warning" ? "⚠️" : "✅";
  console.log(styled(`${emoji} Heap profile uploaded`, severity));
  console.log(styled("   🔗 URL: ", "muted") + styled(signed, "primary"));
  console.log(styled("   🎨 Visual tag: ", "muted") + styled(themeTag, severity));
  console.log(styled("   📊 Metadata: ", "muted") + styled(Bun.color(dominantColor, "hex"), "accent"));
  
  // Display compression info
  log.metric('Original size', Utils.Performance.formatBytes(md.length), 'muted');
  log.metric('Compressed size', Utils.Performance.formatBytes(zst.length), 'success');
  log.metric('Compression ratio', r2Metadata['system:compression-ratio'], 'primary');
  
  // Save local copy
  const profileFile = `heap-profile-${timestamp}.md`;
  await Bun.write(profileFile, md);
  log.metric('Local copy', profileFile, 'muted');
  
  console.log('\n' + styled('✅ Heap profiling complete!', severity));
}

// Run if called directly
if (import.meta.main) {
  await runHeapProfile();
}
