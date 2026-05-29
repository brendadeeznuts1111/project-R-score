#!/usr/bin/env bun

/**
 * 🌊 R2 Bucket Connection Test
 * Basic connectivity test for Cloudflare R2 bucket
 */

// Load environment variables
const R2_ACCOUNT_ID = Bun.env.R2_ACCOUNT_ID || Bun.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = Bun.env.R2_ACCESS_KEY_ID || Bun.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = Bun.env.R2_SECRET_ACCESS_KEY || Bun.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = Bun.env.R2_BUCKET_NAME || Bun.env.R2_BUCKET_NAME;

console.info('🌊 Testing R2 Bucket Connection...');
console.info('=====================================');

// Check if required credentials are available
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error('❌ Missing required R2 credentials:');
  console.info('   R2_ACCOUNT_ID:', R2_ACCOUNT_ID ? '✅' : '❌ Missing');
  console.info('   R2_ACCESS_KEY_ID:', R2_ACCESS_KEY_ID ? '✅' : '❌ Missing');
  console.info('   R2_SECRET_ACCESS_KEY:', R2_SECRET_ACCESS_KEY ? '✅' : '❌ Missing');
  console.info('   R2_BUCKET_NAME:', R2_BUCKET_NAME ? '✅' : '❌ Missing');

  console.info('\n💡 Set these environment variables:');
  console.info('   export R2_ACCOUNT_ID="your-account-id"');
  console.info('   export R2_ACCESS_KEY_ID="your-access-key-id"');
  console.info('   export R2_SECRET_ACCESS_KEY="your-secret-access-key"');
  console.info('   export R2_BUCKET_NAME="your-bucket-name"');
  process.exit(1);
}

console.info('✅ All required credentials found');
console.info(`📦 Bucket: ${R2_BUCKET_NAME}`);
console.info(`🆔 Account: ${R2_ACCOUNT_ID}`);

try {
  // Import R2Bucket (this will work if Bun has R2 support)
  console.info('\n🔄 Initializing R2 client...');

  const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  console.info(`🌐 Endpoint: ${endpoint}`);

  // Create R2 bucket client
  const bucket = new R2Bucket({
    endpoint: endpoint,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: R2_BUCKET_NAME,
  });

  console.info('✅ R2 client initialized successfully');

  // Test connection by listing bucket contents
  console.info('\n📋 Testing bucket access...');
  const { objects, truncated } = await bucket.list({
    maxKeys: 10,
  });

  console.info(`✅ Bucket access successful!`);
  console.info(`📊 Found ${objects.length} objects`);
  console.info(`📄 Truncated: ${truncated}`);

  if (objects.length > 0) {
    console.info('\n📁 First few objects:');
    objects.slice(0, 5).forEach((obj, index) => {
      console.info(`   ${index + 1}. ${obj.key} (${obj.size} bytes)`);
    });
  } else {
    console.info('📁 Bucket is empty - ready for uploads!');
  }

  // Test upload capability
  console.info('\n📤 Testing upload capability...');
  const testContent = `R2 Connection Test - ${new Date().toISOString()}`;
  const testKey = `test/connection-test-${Date.now()}.txt`;

  await bucket.put(testKey, testContent, {
    contentType: 'text/plain',
    metadata: {
      uploadedBy: 'bun-r2-test',
      timestamp: new Date().toISOString(),
    },
  });

  console.info(`✅ Upload successful: ${testKey}`);

  // Test download capability
  console.info('\n📥 Testing download capability...');
  const downloaded = await bucket.get(testKey);

  if (downloaded) {
    const content = await downloaded.text();
    console.info(`✅ Download successful: ${content}`);

    // Clean up test file
    await bucket.delete(testKey);
    console.info('🧹 Test file cleaned up');
  }

  console.info('\n🎉 R2 bucket connection test completed successfully!');
  console.info('✅ Your R2 bucket is ready for executable storage!');
} catch (error) {
  console.error('\n❌ R2 connection test failed:');
  console.error(`Error: ${error.message}`);

  if (error.message.includes('R2Bucket')) {
    console.info('\n💡 R2Bucket might not be available in this Bun version');
    console.info('   Try using AWS S3 SDK as fallback or update Bun');
  } else if (error.message.includes('credentials')) {
    console.info('\n💡 Check your R2 credentials and permissions');
    console.info('   Ensure the API token has R2 read/write permissions');
  } else if (error.message.includes('bucket')) {
    console.info('\n💡 Bucket access issue');
    console.info('   Verify bucket name exists and you have permissions');
  }

  process.exit(1);
}

console.info('\n🚀 Ready to configure for tarball/Linux executables!');
