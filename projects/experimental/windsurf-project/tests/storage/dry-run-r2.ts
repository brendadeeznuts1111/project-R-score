#!/usr/bin/env bun
// tests/dry-run-r2.ts - AUDIT CONNECTION via Native S3Client
import { BunR2AppleManager } from '../src/storage/r2-apple-manager';

async function dryRun() {
  console.info('\n🛡️  COMPREHENSIVE R2 STORAGE DRY RUN (Enhanced)');
  console.info('============================================');

  // Load Presigns (if any)
  let presigns = {};
  try {
    presigns = await Bun.file('presigns.json').json();
  } catch (e) {}

  const manager = new BunR2AppleManager(presigns, Bun.env._BUCKET!);

  // 1. Initialize & Preconnect
  console.info('Step 1: Initialization & Connectivity');
  try {
    await manager.initialize();
  } catch (e: any) {
    console.error(`❌ Initialization FAILED: ${e.message}`);
    process.exit(1);
  }

  // 2. Worker Path Probe
  console.info('\nStep 2: Worker Fast-Path Probe');
  const workerOk = await manager.validateBucketConnection();
  if (workerOk) {
    console.info('✅ Worker -> R2 Routing: Verified');
  } else {
    console.warn('⚠️ Worker Routing: Degraded');
  }

  // 3. Native Lifecycle Audit (Write/Read/Delete)
  console.info('\nStep 3: Direct S3 Lifecycle Audit');
  const lifecycleOk = await manager.performLifecycleAudit();
  if (lifecycleOk) {
    console.info('✅ Native S3 Protocol: Fully functional');
  } else {
    console.error('❌ Native S3 Protocol: FAILED (Check credentials/endpoint)');
  }

  // 4. Presigning Proof
  console.info('\nStep 4: Authenticated Link Engine');
  try {
    const sampleLink = await manager.getPresignedUrl('dry-run-sample.json', 'GET');
    console.info(`✅ Dynamic Link Generated: ${sampleLink.split('?')[0]}...`);
  } catch (e: any) {
    console.error(`❌ Link Engine FAILED: ${e.message}`);
  }

  console.info('\n============================================');
  if (workerOk && lifecycleOk) {
    console.info('✨ SYSTEM HEALTH: 100% - READY FOR SCALING');
  } else if (workerOk) {
    console.info('✨ SYSTEM HEALTH: PROXY-ONLY - Proceed with caution (Direct S3 degraded)');
  } else {
    console.info('🛑 SYSTEM HEALTH: CRITICAL - DO NOT SCALE');
  }
  console.info('============================================\n');
}

dryRun().catch(console.error);
