import config from '../src/config/config-loader';
#!/usr/bin/env bun
// scripts/setup-r2-apple.ts - Bun Native S3 Setup + Test + DuoPlus Hook
import { BunR2AppleManager, R2_DIRS } from '../src/storage/r2-apple-manager';
import { S3Client } from 'bun';

async function setup() {
  console.log('🚀 Starting R2 Apple Manager Setup (Native Bun S3)...');

  const bucketName = Bun.env.S3_BUCKET || 'apple-ids-bucket';

  // 1. Check environment configuration
  const hasS3Creds = Bun.env.S3_ACCESS_KEY_ID && config.getSecret('s3').secretAccessKey && Bun.env.S3_ENDPOINT;
  
  if (!hasS3Creds) {
    console.log('⚠️  S3 credentials not found in environment.');
    console.log('📝 Required environment variables:');
    console.log('   - S3_ACCESS_KEY_ID');
    console.log('   - S3_SECRET_ACCESS_KEY');
    console.log('   - S3_ENDPOINT');
    console.log('   - S3_BUCKET (optional, defaults to apple-ids-bucket)');
    console.log('\n💡 Running in simulation mode...\n');
  } else {
    console.log(`✅ S3 credentials configured for bucket: ${bucketName}`);
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
  console.log('📦 Testing local fallback...');
  manager.saveLocal(testApple, 'test-apple.json');

  // 4. Test R2 Upload
  if (hasS3Creds) {
    console.log('☁️ Testing R2 Upload...');
    try {
      const result = await manager.uploadAppleID(testApple, 'test-success.json');
      console.log(`✅ R2 Upload success: ${result.key} (${result.size} bytes, ${result.savings}% saved)`);
    } catch (e: any) {
      console.log(`❌ R2 Upload failed: ${e.message}`);
    }

    // 5. Run Lifecycle Audit
    console.log('🧪 Running Lifecycle Audit...');
    const auditResult = await manager.performLifecycleAudit();
    console.log(auditResult ? '✅ Lifecycle Audit passed' : '⚠️ Lifecycle Audit had issues');
  } else {
    console.log('☁️ Skipping R2 upload test (no credentials)');
  }

  // 6. Analytics/Stats Test
  await manager.getStorageStats();

  console.log('\n✅ Setup process complete!');
  console.log('Summary:');
  console.log('- Zero dependencies (native Bun)');
  console.log('- Zstd compression enabled');
  console.log('- DuoPlus RPA compatible');
}

setup().catch(console.error);
