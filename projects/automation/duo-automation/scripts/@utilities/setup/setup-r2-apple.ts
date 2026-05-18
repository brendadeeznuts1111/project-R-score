#!/usr/bin/env bun
// scripts/setup-r2-apple.ts - Bun Native S3 Setup + Test + DuoPlus Hook
import { BunR2AppleManager, R2_DIRS } from '../src/storage/r2-apple-manager';
import { S3Client } from 'bun';

async function setup() {
  console.info('🚀 Starting R2 Apple Manager Setup (Native Bun S3)...');

  const bucketName = Bun.env.S3_BUCKET || 'factory-wager-packages';

  // 1. Check environment configuration
  const hasS3Creds = Bun.env.S3_ACCESS_KEY_ID && Bun.env.S3_SECRET_ACCESS_KEY && Bun.env.S3_ENDPOINT;
  
  if (!hasS3Creds) {
    console.info('⚠️  S3 credentials not found in environment.');
    console.info('📝 Required environment variables:');
    console.info('   - S3_ACCESS_KEY_ID');
    console.info('   - S3_SECRET_ACCESS_KEY');
    console.info('   - S3_ENDPOINT');
    console.info('   - S3_BUCKET (optional, defaults to factory-wager-packages)');
    console.info('\n💡 Running in simulation mode...\n');
  } else {
    console.info(`✅ S3 credentials configured for bucket: ${bucketName}`);
  }

  // 2. Initialize manager (uses Bun native S3Client internally)
  const manager = new BunR2AppleManager({}, bucketName);

  // 3. Test Local Fallback
  const testApple = { 
    email: 'test@apple.com', 
    success: true, 
    country: 'US', 
    city: 'NY',
    id: 'test-123'
  };
  console.info('📦 Testing local fallback...');
  manager.saveLocal(testApple, 'test-apple.json');

  // 4. Test R2 Upload
  if (hasS3Creds) {
    console.info('☁️ Testing R2 Upload...');
    try {
      const result = await manager.uploadAppleID(testApple, 'test-success.json');
      console.info(`✅ R2 Upload success: ${result.key} (${result.size} bytes, ${result.savings}% saved)`);
    } catch (e: any) {
      console.info(`❌ R2 Upload failed: ${e.message}`);
    }

    // 5. Run Lifecycle Audit
    console.info('🧪 Running Lifecycle Audit...');
    const auditResult = await manager.performLifecycleAudit();
    console.info(auditResult ? '✅ Lifecycle Audit passed' : '⚠️ Lifecycle Audit had issues');
  } else {
    console.info('☁️ Skipping R2 upload test (no credentials)');
  }

  // 6. Analytics/Stats Test
  await manager.getStorageStats();

  console.info('\n✅ Setup process complete!');
  console.info('Summary:');
  console.info('- Zero dependencies (native Bun)');
  console.info('- Zstd compression enabled');
  console.info('- DuoPlus RPA compatible');
}

setup().catch(console.error);
