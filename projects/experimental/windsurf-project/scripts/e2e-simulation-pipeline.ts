#!/usr/bin/env bun
// scripts/e2e-simulation-pipeline.ts - High-Scale Automation Pipeline Simulation

import { BunR2AppleManager, R2_DIRS } from '../src/storage/r2-apple-manager';
import { DuoPlusSDK } from '../sdk/duoplus-sdk';
import { config } from 'dotenv';

// Initialize context
config({ path: '.env' });
const manager = new BunR2AppleManager();
await manager.initialize();

const sdk = new DuoPlusSDK('https://api.duoplus.com', Bun.env.DUOPLUS_API_KEY || 'demo-key');

/**
 * 1. Stream simulated IDs to R2 Storage with massive scale
 */
async function streamAppleIDsToR2(count: number) {
  console.log(`🚀 **Phase 1: Streaming ${count} Simulated IDs to R2...**`);
  const { mockAppleData } = await import('../utils/urlpattern-r2');
  
  const start = Date.now();
  const ids: unknown[] = [];
  const batchSize = 100;
  
  for (let i = 0; i < count; i += batchSize) {
    const batch = Array.from({ length: Math.min(batchSize, count - i) }, (_, idx) => {
      const index = i + idx;
      const data = mockAppleData(index);
      const filename = `sim-batch-${index}`;
      return { data, filename };
    });

    const uploads = batch.map(item => manager.uploadAppleID(item.data, item.filename));
    const results = await Promise.all(uploads);
    
    // Collect successful record metadata
    results.forEach((r, idx) => {
      if (r.success) {
        ids.push({
          email: batch[idx].data.email,
          success: batch[idx].data.success,
          filename: `${batch[idx].filename}.json`,
          key: r.key
        });
      }
    });

    if (i % 500 === 0) {
      process.stdout.write(`\r📦 Progress: ${i}/${count} uploaded...`);
    }
  }
  
  const duration = (Date.now() - start) / 1000;
  console.log(`\n✅ Phase 1 Complete: ${ids.length} objects stored in ${duration.toFixed(1)}s`);
  return { ids, total: ids.length };
}

/**
 * 2. Simulation: Generate Mock Screenshots
 */
async function generatePipelineScreenshots(batch: { ids: any[], total: number }) {
  console.log(`🚀 **Phase 2: Generating Simulation Screenshots for ${batch.total} IDs...**`);
  
  const start = Date.now();
  const screenshotUrls: string[] = [];
  const batchSize = 50;

  // Use a minimal valid PNG 1x1 buffer for throughput simulation
  const mockPngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');

  for (let i = 0; i < batch.ids.length; i += batchSize) {
    const chunk = batch.ids.slice(i, i + batchSize);
    
    const uploads = chunk.map(async (id: any) => {
      const screenshotKey = `${R2_DIRS.SCREENSHOTS}${id.filename.replace('.json', '.png')}`;
      // In a real scenario, you'd use a canvas lib here to draw id.email
      // But for high-speed simulation, we push optimized buffers
      if (manager.getS3Client()) {
        await manager.getS3Client()!.file(screenshotKey).write(mockPngBuffer, { type: 'image/png' });
        return `r2://${screenshotKey}`;
      }
      return `r2://mock/${screenshotKey}`;
    });

    const urls = await Promise.all(uploads);
    screenshotUrls.push(...urls);
    
    if (i % 500 === 0) {
      process.stdout.write(`\r📸 Rendering: ${i}/${batch.total} screenshots...`);
    }
  }

  const duration = (Date.now() - start) / 1000;
  console.log(`\n✅ Phase 2 Complete: ${screenshotUrls.length} screenshots mirrored in ${duration.toFixed(1)}s`);
  return screenshotUrls;
}

/**
 * Main Pipeline Execution
 */
async function runPipeline() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔥 **E2E AUTOMATION PIPELINE STARTING**`);
  console.log(`${'═'.repeat(60)}`);

  try {
    // Stage 1: Massive Data Feed
    const scale = parseInt(process.argv[2]) || 1000; // Default to 1k for safety, usage mentioned 5k
    const batch = await streamAppleIDsToR2(scale);

    // Stage 2: Visual Simulation
    const screenshotUrls = await generatePipelineScreenshots(batch);

    // Stage 3: RPA Orchestration via DuoPlus
    console.log(`🚀 **Phase 3: Dispatching to Phone Pools...**`);
    await sdk.batchPushToPhones(
      screenshotUrls,
      Array(batch.total).fill('sim-phone-pool')
    );

    console.log(`\n✨ **E2E Simulation Pipeline Successfully Executed** ✨`);
    console.log(`📊 Summary: ${batch.total} IDs processed | ${screenshotUrls.length} Media assets generated`);
    console.log(`${'═'.repeat(60)}\n`);

  } catch (error) {
    console.error(`❌ Pipeline failed:`, error);
    process.exit(1);
  }
}

await runPipeline();
