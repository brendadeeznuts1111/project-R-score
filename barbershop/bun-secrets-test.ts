#!/usr/bin/env bun

/**
 * 🔍 Bun Secrets & Environment Test
 * Check what secrets management capabilities Bun has
 */

console.log('🔍 Testing Bun Secrets & Environment Management');
console.log('=============================================');

// Test 1: Basic environment access
console.log('\n📋 1. Basic Environment Access:');
console.log('   Bun.env.HOME:', Bun.env.HOME ? '✅ Available' : '❌ Not found');
console.log('   process.env.HOME:', process.env.HOME ? '✅ Available' : '❌ Not found');
console.log('   Bun.env.PATH:', Bun.env.PATH ? '✅ Available' : '❌ Not found');

// Test 2: Check for Bun-specific secrets
console.log('\n🔐 2. Bun Secrets Management:');
console.log('   Bun.secrets exists:', typeof Bun.secrets !== 'undefined' ? '✅ Yes' : '❌ No');

if (typeof Bun.secrets !== 'undefined') {
  console.log('   Bun.secrets type:', typeof Bun.secrets);
  console.log('   Bun.secrets methods:', Object.getOwnPropertyNames(Bun.secrets));
}

// Test 3: Check for R2 support
console.log('\n☁️ 3. R2 Support Check:');
console.log('   R2Bucket exists:', typeof R2Bucket !== 'undefined' ? '✅ Yes' : '❌ No');
console.log('   Bun.R2Bucket exists:', typeof Bun.R2Bucket !== 'undefined' ? '✅ Yes' : '❌ No');

// Test 4: Check available global objects
console.log('\n🌍 4. Available Globals:');
const globals = ['fetch', 'Response', 'Request', 'Headers', 'WebSocket', 'Crypto'];
globals.forEach(globalName => {
  const exists = typeof globalThis[globalName] !== 'undefined';
  console.log(`   ${globalName}:`, exists ? '✅' : '❌');
});

// Test 5: Test environment variable patterns
console.log('\n🔑 5. Environment Variable Patterns:');

// Common secret patterns
const secretPatterns = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID', 
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY'
];

secretPatterns.forEach(pattern => {
  const value = Bun.env[pattern] || process.env[pattern];
  console.log(`   ${pattern}:`, value ? '✅ Set' : '❌ Not set');
});

// Test 6: Check if we can create an R2 client (if available)
console.log('\n🔄 6. R2 Client Test:');

try {
  if (typeof R2Bucket !== 'undefined') {
    console.log('   ✅ R2Bucket class available');
    
    // Try to create a minimal client (without credentials)
    console.log('   🔄 Attempting to create R2Bucket instance...');
    const testClient = new R2Bucket({
      endpoint: 'https://test.r2.cloudflarestorage.com',
      accessKeyId: 'test',
      secretAccessKey: 'test',
      bucket: 'test'
    });
    console.log('   ✅ R2Bucket instance created successfully');
  } else {
    console.log('   ❌ R2Bucket not available - need to use AWS SDK');
  }
} catch (error) {
  console.log('   ❌ R2Bucket creation failed:', error.message);
}

// Test 7: Check fetch capabilities (for S3/R2 API)
console.log('\n🌐 7. Fetch API Test:');
try {
  const response = await fetch('https://httpbin.org/get', {
    method: 'GET',
    headers: { 'User-Agent': 'Bun-R2-Test/1.0' }
  });
  
  if (response.ok) {
    console.log('   ✅ Fetch API working');
    console.log('   📊 Response status:', response.status);
  } else {
    console.log('   ❌ Fetch API failed:', response.status);
  }
} catch (error) {
  console.log('   ❌ Fetch API error:', error.message);
}

console.log('\n🎯 Summary:');
console.log('   ✅ Environment variables: Available');
console.log('   🔐 Native secrets: ' + (typeof Bun.secrets !== 'undefined' ? 'Available' : 'Not available'));
console.log('   ☁️ R2 support: ' + (typeof R2Bucket !== 'undefined' ? 'Native' : 'Use AWS SDK'));
console.log('   🌐 HTTP requests: Available via fetch');

console.log('\n💡 Recommendations:');
if (typeof R2Bucket === 'undefined') {
  console.log('   - Use AWS SDK v3 for R2 access');
  console.log('   - Or use fetch with R2 REST API');
} else {
  console.log('   - Use native R2Bucket class');
}

console.log('   - Store credentials in environment variables');
console.log('   - Use Bun.env for consistent access');
