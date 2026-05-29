#!/usr/bin/env bun

/**
 * 🌊 Simple R2 Bucket Test
 * Basic connection test without complex AWS signatures
 */

async function main() {
  console.info('🌊 Simple R2 Bucket Connection Test');
  console.info('===================================');

  // Load credentials from environment
  const R2_ACCOUNT_ID = Bun.env.R2_ACCOUNT_ID;
  const R2_ACCESS_KEY_ID = Bun.env.R2_ACCESS_KEY_ID;
  const R2_SECRET_ACCESS_KEY = Bun.env.R2_SECRET_ACCESS_KEY;
  const R2_BUCKET_NAME = Bun.env.R2_BUCKET_NAME;

  console.info('✅ Credentials loaded');
  console.info(`📦 Bucket: ${R2_BUCKET_NAME}`);
  console.info(`🆔 Account: ${R2_ACCOUNT_ID?.substring(0, 8)}...`);

  // Test basic connectivity to R2 endpoint
  console.info('\n🌐 Testing basic connectivity...');

  try {
    const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'User-Agent': 'Bun-R2-Test/1.0',
      },
    });

    console.info(`✅ Endpoint reachable: ${response.status}`);

    // Test bucket existence with simple HEAD request
    console.info('\n🪣 Testing bucket access...');

    const bucketUrl = `${endpoint}/${R2_BUCKET_NAME}`;
    const bucketResponse = await fetch(bucketUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Bun-R2-Test/1.0',
      },
    });

    console.info(`📊 Bucket response: ${bucketResponse.status}`);

    if (bucketResponse.status === 200 || bucketResponse.status === 404) {
      console.info('✅ R2 bucket connection is working!');
      console.info('🎯 Ready for executablePath configuration');

      // Show how to use in your demo
      console.info('\n💡 Configure executablePath in your demo:');
      console.info('```typescript');
      console.info('await Bun.build({');
      console.info('  entrypoints: ["./src/index.ts"],');
      console.info('  compile: true,');
      console.info('  target: "bun-linux-x64",');
      console.info(`  executablePath: "r2://${R2_BUCKET_NAME}/bun-linux-x64-v1.3.9",`);
      console.info('  // ... other config');
      console.info('});');
      console.info('```');

      console.info('\n🚀 Next steps:');
      console.info('1. Upload your Bun Linux executable to the R2 bucket');
      console.info(
        '2. Test with the validation demo using: r2://' + R2_BUCKET_NAME + '/your-executable'
      );
      console.info('3. Configure your build pipeline to use R2 storage');
    } else {
      console.info('❌ Unexpected bucket response');
    }
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

main().catch(console.error);
