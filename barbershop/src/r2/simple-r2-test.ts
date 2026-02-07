#!/usr/bin/env bun

/**
 * 🌊 Simple R2 Bucket Test
 * Basic connection test without complex AWS signatures
 */

async function main() {
  console.log('🌊 Simple R2 Bucket Connection Test');
  console.log('===================================');

  // Load credentials from environment
  const R2_ACCOUNT_ID = Bun.env.R2_ACCOUNT_ID;
  const R2_ACCESS_KEY_ID = Bun.env.R2_ACCESS_KEY_ID;
  const R2_SECRET_ACCESS_KEY = Bun.env.R2_SECRET_ACCESS_KEY;
  const R2_BUCKET_NAME = Bun.env.R2_BUCKET_NAME;

  console.log('✅ Credentials loaded');
  console.log(`📦 Bucket: ${R2_BUCKET_NAME}`);
  console.log(`🆔 Account: ${R2_ACCOUNT_ID?.substring(0, 8)}...`);

  // Test basic connectivity to R2 endpoint
  console.log('\n🌐 Testing basic connectivity...');

  try {
    const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'User-Agent': 'Bun-R2-Test/1.0',
      },
    });

    console.log(`✅ Endpoint reachable: ${response.status}`);

    // Test bucket existence with simple HEAD request
    console.log('\n🪣 Testing bucket access...');

    const bucketUrl = `${endpoint}/${R2_BUCKET_NAME}`;
    const bucketResponse = await fetch(bucketUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Bun-R2-Test/1.0',
      },
    });

    console.log(`📊 Bucket response: ${bucketResponse.status}`);

    if (bucketResponse.status === 200 || bucketResponse.status === 404) {
      console.log('✅ R2 bucket connection is working!');
      console.log('🎯 Ready for executablePath configuration');

      // Show how to use in your demo
      console.log('\n💡 Configure executablePath in your demo:');
      console.log('```typescript');
      console.log('await Bun.build({');
      console.log('  entrypoints: ["./src/index.ts"],');
      console.log('  compile: true,');
      console.log('  target: "bun-linux-x64",');
      console.log(`  executablePath: "r2://${R2_BUCKET_NAME}/bun-linux-x64-v1.3.9",`);
      console.log('  // ... other config');
      console.log('});');
      console.log('```');

      console.log('\n🚀 Next steps:');
      console.log('1. Upload your Bun Linux executable to the R2 bucket');
      console.log(
        '2. Test with the validation demo using: r2://' + R2_BUCKET_NAME + '/your-executable'
      );
      console.log('3. Configure your build pipeline to use R2 storage');
    } else {
      console.log('❌ Unexpected bucket response');
    }
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

main().catch(console.error);
