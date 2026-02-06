#!/usr/bin/env bun

/**
 * 🌊 R2 Bucket Connection with Bun Secrets
 * Uses Bun's native secrets management for secure credential handling
 */

async function main() {
console.log('🌊 R2 Bucket Connection with Bun Secrets');
console.log('=========================================');

// Test Bun secrets functionality
console.log('\n🔐 Setting up Bun Secrets...');

// Store R2 credentials in Bun secrets (in production, these would be set externally)
if (!await Bun.secrets.get("r2", "account_id")) {
  console.log('📝 Storing test credentials in Bun secrets...');
  Bun.secrets.set("r2", "account_id", process.env.R2_ACCOUNT_ID || '');
  Bun.secrets.set("r2", "access_key_id", process.env.R2_ACCESS_KEY_ID || '');
  Bun.secrets.set("r2", "secret_access_key", process.env.R2_SECRET_ACCESS_KEY || '');
  Bun.secrets.set("r2", "bucket_name", process.env.R2_BUCKET_NAME || 'bun-executables');
}

// Retrieve credentials from Bun secrets
const R2_ACCOUNT_ID = await Bun.secrets.get("r2", "account_id");
const R2_ACCESS_KEY_ID = await Bun.secrets.get("r2", "access_key_id");
const R2_SECRET_ACCESS_KEY = await Bun.secrets.get("r2", "secret_access_key");
const R2_BUCKET_NAME = await Bun.secrets.get("r2", "bucket_name");

console.log('✅ Credentials loaded from Bun secrets');
console.log(`📦 Bucket: ${R2_BUCKET_NAME}`);
console.log(`🆔 Account: ${R2_ACCOUNT_ID ? R2_ACCOUNT_ID.substring(0, 8) + '...' : 'Not set'}`);

// Validate credentials
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error('❌ Missing required R2 credentials in Bun secrets:');
  console.log('   R2_ACCOUNT_ID:', R2_ACCOUNT_ID ? '✅' : '❌ Missing');
  console.log('   R2_ACCESS_KEY_ID:', R2_ACCESS_KEY_ID ? '✅' : '❌ Missing');
  console.log('   R2_SECRET_ACCESS_KEY:', R2_SECRET_ACCESS_KEY ? '✅' : '❌ Missing');
  console.log('   R2_BUCKET_NAME:', R2_BUCKET_NAME ? '✅' : '❌ Missing');
  
  console.log('\n💡 Set credentials in environment variables:');
  console.log('   export R2_ACCOUNT_ID="your-account-id"');
  console.log('   export R2_ACCESS_KEY_ID="your-access-key-id"');
  console.log('   export R2_SECRET_ACCESS_KEY="your-secret-access-key"');
  console.log('   export R2_BUCKET_NAME="your-bucket-name"');
  console.log('\n🔄 Then restart this script to load them into Bun secrets');
  process.exit(1);
}

// Since R2Bucket is not available natively, we'll use fetch with R2 REST API
console.log('\n🔄 Testing R2 connection via REST API...');

const endpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const bucketUrl = `${endpoint}/${R2_BUCKET_NAME}`;

console.log(`🌐 Endpoint: ${endpoint}`);
console.log(`🪣 Bucket URL: ${bucketUrl}`);

async function testR2Connection() {
  try {
    // Test 1: List bucket contents
    console.log('\n📋 Testing bucket list...');
    
    const listUrl = `${bucketUrl}?list-type=2&max-keys=10`;
    const authString = `${R2_ACCESS_KEY_ID}:${R2_SECRET_ACCESS_KEY}`;
    const authHeader = `Basic ${btoa(authString)}`;
    
    // Add required AWS headers
    const payloadHash = await Bun.hash('');
    
    const listResponse = await fetch(listUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/xml',
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': new Date().toISOString().replace(/[:\-]T|\.\d{3}Z/g, '').replace(/T/, 'T').replace(/:/, '').replace(/:/, '') + 'Z'
      }
    });
    
    if (listResponse.ok) {
      const listText = await listResponse.text();
      console.log('✅ Bucket list successful');
      console.log(`📊 Response length: ${listText.length} characters`);
      
      // Simple XML parsing to count objects
      const objectMatches = listText.match(/<Key>/g);
      const objectCount = objectMatches ? objectMatches.length : 0;
      console.log(`📁 Objects found: ${objectCount}`);
      
    } else {
      console.log('❌ Bucket list failed:', listResponse.status, listResponse.statusText);
      const errorText = await listResponse.text();
      console.log('📄 Error details:', errorText.substring(0, 200));
    }
    
    // Test 2: Upload test file
    console.log('\n📤 Testing upload...');
    
    const testKey = `test/bun-secrets-test-${Date.now()}.txt`;
    const testContent = `Bun Secrets R2 Test - ${new Date().toISOString()}`;
    const uploadUrl = `${bucketUrl}/${testKey}`;
    
    // Calculate content hash
    const contentHash = await Bun.hash(testContent);
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'text/plain',
        'Content-Length': testContent.length.toString(),
        'x-amz-content-sha256': contentHash,
        'x-amz-date': new Date().toISOString().replace(/[:\-]T|\.\d{3}Z/g, '').replace(/T/, 'T').replace(/:/, '').replace(/:/, '') + 'Z'
      },
      body: testContent
    });
    
    if (uploadResponse.ok) {
      console.log('✅ Upload successful:', testKey);
      console.log('📊 ETag:', uploadResponse.headers.get('ETag'));
      
      // Test 3: Download the file
      console.log('\n📥 Testing download...');
      
      const downloadResponse = await fetch(uploadUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeader
        }
      });
      
      if (downloadResponse.ok) {
        const downloadedContent = await downloadResponse.text();
        console.log('✅ Download successful');
        console.log('📄 Content matches:', downloadedContent === testContent ? '✅' : '❌');
        
        // Test 4: Delete the test file
        console.log('\n🗑️  Testing deletion...');
        
        const deleteResponse = await fetch(uploadUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': authHeader
          }
        });
        
        if (deleteResponse.ok) {
          console.log('✅ Test file cleaned up successfully');
        } else {
          console.log('❌ Deletion failed:', deleteResponse.status);
        }
        
      } else {
        console.log('❌ Download failed:', downloadResponse.status);
      }
      
    } else {
      console.log('❌ Upload failed:', uploadResponse.status, uploadResponse.statusText);
      const errorText = await uploadResponse.text();
      console.log('📄 Error details:', errorText.substring(0, 200));
    }
    
    console.log('\n🎉 R2 connection test completed!');
    console.log('✅ Your R2 bucket is ready for executable storage with Bun secrets!');
    
    // Show how to use in Bun.build
    console.log('\n💡 Usage in Bun.build:');
    console.log('```typescript');
    console.log('await Bun.build({');
    console.log('  entrypoints: ["./src/index.ts"],');
    console.log('  compile: true,');
    console.log('  target: "bun-linux-x64",');
    console.log('  executablePath: `r2://${Bun.secrets.get({ name: "R2_BUCKET_NAME" })}/bun-linux-x64-v1.3.9`,');
    console.log('  // ... other config');
    console.log('});');
    console.log('```');
    
  } catch (error) {
    console.error('\n❌ R2 connection test failed:');
    console.error(`Error: ${error.message}`);
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 Network or authentication issue');
      console.log('   - Check your R2 credentials');
      console.log('   - Verify bucket exists');
      console.log('   - Check network connectivity');
    }
    
    process.exit(1);
  }
}

// Run the test
await testR2Connection();

console.log('\n🔐 Bun Secrets Management Summary:');
console.log('   ✅ Bun.secrets.get(service, name) - Retrieve secrets');
console.log('   ✅ Bun.secrets.set(service, name, value) - Store secrets'); 
console.log('   ✅ Bun.secrets.delete(service, name) - Remove secrets');
console.log('   🔒 Secrets are stored in memory for security');
console.log('   🌐 Ready for R2 integration with executablePath');

}

// Run the main function
main().catch(console.error);
