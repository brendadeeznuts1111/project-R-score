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

console.log('🌊 Testing R2 Bucket Connection...');
console.log('=====================================');

// Check if required credentials are available
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error('❌ Missing required R2 credentials:');
  console.log('   R2_ACCOUNT_ID:', R2_ACCOUNT_ID ? '✅' : '❌ Missing');
  console.log('   R2_ACCESS_KEY_ID:', R2_ACCESS_KEY_ID ? '✅' : '❌ Missing');
  console.log('   R2_SECRET_ACCESS_KEY:', R2_SECRET_ACCESS_KEY ? '✅' : '❌ Missing');
  console.log('   R2_BUCKET_NAME:', R2_BUCKET_NAME ? '✅' : '❌ Missing');
  
  console.log('\n💡 Set these environment variables:');
  console.log('   export R2_ACCOUNT_ID="your-account-id"');
  console.log('   export R2_ACCESS_KEY_ID="your-access-key-id"');
  console.log('   export R2_SECRET_ACCESS_KEY="your-secret-access-key"');
  console.log('   export R2_BUCKET_NAME="your-bucket-name"');
  process.exit(1);
}

console.log('✅ All required credentials found');
console.log(`📦 Bucket: ${R2_BUCKET_NAME}`);
console.log(`🆔 Account: ${R2_ACCOUNT_ID}`);

try {
  // Import R2Bucket (this will work if Bun has R2 support)
  console.log('\n🔄 Initializing R2 client...');
  
  const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  console.log(`🌐 Endpoint: ${endpoint}`);
  
  // Create R2 bucket client
  const bucket = new R2Bucket({
    endpoint: endpoint,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: R2_BUCKET_NAME
  });
  
  console.log('✅ R2 client initialized successfully');
  
  // Test connection by listing bucket contents
  console.log('\n📋 Testing bucket access...');
  const { objects, truncated } = await bucket.list({
    maxKeys: 10
  });
  
  console.log(`✅ Bucket access successful!`);
  console.log(`📊 Found ${objects.length} objects`);
  console.log(`📄 Truncated: ${truncated}`);
  
  if (objects.length > 0) {
    console.log('\n📁 First few objects:');
    objects.slice(0, 5).forEach((obj, index) => {
      console.log(`   ${index + 1}. ${obj.key} (${obj.size} bytes)`);
    });
  } else {
    console.log('📁 Bucket is empty - ready for uploads!');
  }
  
  // Test upload capability
  console.log('\n📤 Testing upload capability...');
  const testContent = `R2 Connection Test - ${new Date().toISOString()}`;
  const testKey = `test/connection-test-${Date.now()}.txt`;
  
  await bucket.put(testKey, testContent, {
    contentType: 'text/plain',
    metadata: {
      uploadedBy: 'bun-r2-test',
      timestamp: new Date().toISOString()
    }
  });
  
  console.log(`✅ Upload successful: ${testKey}`);
  
  // Test download capability
  console.log('\n📥 Testing download capability...');
  const downloaded = await bucket.get(testKey);
  
  if (downloaded) {
    const content = await downloaded.text();
    console.log(`✅ Download successful: ${content}`);
    
    // Clean up test file
    await bucket.delete(testKey);
    console.log('🧹 Test file cleaned up');
  }
  
  console.log('\n🎉 R2 bucket connection test completed successfully!');
  console.log('✅ Your R2 bucket is ready for executable storage!');
  
} catch (error) {
  console.error('\n❌ R2 connection test failed:');
  console.error(`Error: ${error.message}`);
  
  if (error.message.includes('R2Bucket')) {
    console.log('\n💡 R2Bucket might not be available in this Bun version');
    console.log('   Try using AWS S3 SDK as fallback or update Bun');
  } else if (error.message.includes('credentials')) {
    console.log('\n💡 Check your R2 credentials and permissions');
    console.log('   Ensure the API token has R2 read/write permissions');
  } else if (error.message.includes('bucket')) {
    console.log('\n💡 Bucket access issue');
    console.log('   Verify bucket name exists and you have permissions');
  }
  
  process.exit(1);
}

console.log('\n🚀 Ready to configure for tarball/Linux executables!');
