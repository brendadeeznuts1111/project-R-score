// tests/test-verbose.ts
// Simple test to demonstrate verbose logging with local server

async function testVerboseLocal() {
  console.log('🔍 Testing verbose logging with local server...\n');
  
  // Test JSON with verbose
  console.log('1. JSON request with verbose logging:');
  try {
    const response = await fetch('http://localhost:3001/api/content-type/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Verbose test', verbose: true }),
      verbose: true // Bun-specific: shows detailed HTTP headers
    });
    console.log(`   Status: ${response.status}`);
    const data = await response.json();
    console.log(`   Response: ${JSON.stringify(data.received.body)}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  // Test binary with verbose
  console.log('\n2. Binary request with verbose logging:');
  try {
    const binaryData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const response = await fetch('http://localhost:3001/api/typedarray/binary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Accept': 'application/json'
      },
      body: binaryData,
      verbose: true
    });
    console.log(`   Status: ${response.status}`);
    const data = await response.json();
    console.log(`   Binary method: ${data.method}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('\n✅ Local verbose test completed!');
}

if (import.meta.main) {
  testVerboseLocal().catch(console.error);
}
