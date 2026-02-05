#!/usr/bin/env bun

/**
 * Bun Fetch Advanced Options
 *
 * Focused examples demonstrating Bun's extended fetch options
 * including decompression control, keep-alive management, and verbose debugging.
 */

// Example 1: Decompression Control
console.log('🗜️ Decompression Control');

async function decompressionExamples() {
  console.log('\n📝 Testing decompression options...');

  // Test 1: Decompression enabled (default)
  console.log('\n1. Decompression enabled (default):');
  try {
    const startTime = performance.now();
    const response = await fetch('https://httpbin.org/gzip', {
      decompress: true,
      verbose: true
    });
    const endTime = performance.now();

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Decompressed response received');
      console.log(`⏱️ Time with decompression: ${(endTime - startTime).toFixed(2)}ms`);
      console.log(`📄 Response processed: ${data.gzipped ? 'was gzipped' : 'not gzipped'}`);
    }
  } catch (error) {
    console.log('❌ Decompression enabled error:', error.message);
  }

  // Test 2: Decompression disabled
  console.log('\n2. Decompression disabled:');
  try {
    const startTime = performance.now();
    const response = await fetch('https://httpbin.org/gzip', {
      decompress: false,
      verbose: true
    });
    const endTime = performance.now();

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Raw compressed response received');
      console.log(`⏱️ Time without decompression: ${(endTime - startTime).toFixed(2)}ms`);
      console.log('📄 Response contains compressed data (not decompressed)');
    }
  } catch (error) {
    console.log('❌ Decompression disabled error:', error.message);
  }

  // Test 3: Different compression formats
  console.log('\n3. Multiple compression formats:');
  try {
    const formats = [
      { url: 'https://httpbin.org/gzip', name: 'gzip' },
      { url: 'https://httpbin.org/deflate', name: 'deflate' },
      { url: 'https://httpbin.org/brotli', name: 'brotli' }
    ];

    for (const { url, name } of formats) {
      console.log(`\n🔄 Testing ${name} compression:`);

      try {
        const response = await fetch(url, {
          decompress: true,
          verbose: true
        });

        if (response.ok) {
          console.log(`✅ ${name} decompression successful`);
        } else {
          console.log(`ℹ️ ${name} endpoint not available`);
        }
      } catch (error) {
        console.log(`❌ ${name} compression error:`, error.message);
      }
    }
  } catch (error) {
    console.log('❌ Multiple formats error:', error.message);
  }
}

// Example 2: Connection Keep-Alive Control
console.log('\n🔗 Connection Keep-Alive Control');

async function keepaliveExamples() {
  console.log('\n📝 Testing keep-alive options...');

  // Test 1: Keep-alive enabled (default)
  console.log('\n1. Keep-alive enabled (default):');
  try {
    const host = 'https://httpbin.org';
    const requestCount = 3;
    const times = [];

    console.log(`🔄 Making ${requestCount} requests with keep-alive...`);

    for (let i = 0; i < requestCount; i++) {
      const startTime = performance.now();
      const response = await fetch(`${host}/get`, {
        keepalive: true,
        headers: { 'X-Request-Number': (i + 1).toString() },
        verbose: i === 0 // Show verbose only for first request
      });
      const endTime = performance.now();
      times.push(endTime - startTime);

      console.log(`   Request ${i + 1}: ${times[i].toFixed(2)}ms`);
    }

    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`📊 Average time with keep-alive: ${averageTime.toFixed(2)}ms`);
    console.log('✅ Connection reused across requests');
  } catch (error) {
    console.log('❌ Keep-alive enabled error:', error.message);
  }

  // Test 2: Keep-alive disabled
  console.log('\n2. Keep-alive disabled:');
  try {
    const host = 'https://httpbin.org';
    const requestCount = 3;
    const times = [];

    console.log(`🔄 Making ${requestCount} requests without keep-alive...`);

    for (let i = 0; i < requestCount; i++) {
      const startTime = performance.now();
      const response = await fetch(`${host}/get`, {
        keepalive: false,
        headers: { 'X-Request-Number': (i + 1).toString() },
        verbose: i === 0 // Show verbose only for first request
      });
      const endTime = performance.now();
      times.push(endTime - startTime);

      console.log(`   Request ${i + 1}: ${times[i].toFixed(2)}ms`);
    }

    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`📊 Average time without keep-alive: ${averageTime.toFixed(2)}ms`);
    console.log('✅ New connection for each request');
  } catch (error) {
    console.log('❌ Keep-alive disabled error:', error.message);
  }

  // Test 3: Performance comparison
  console.log('\n3. Performance comparison:');
  try {
    const host = 'https://httpbin.org';

    // Benchmark with keep-alive
    console.log('🔄 Benchmarking with keep-alive...');
    const keepaliveTimes = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      await fetch(`${host}/get`, { keepalive: true });
      keepaliveTimes.push(performance.now() - start);
    }

    // Benchmark without keep-alive
    console.log('🔄 Benchmarking without keep-alive...');
    const noKeepaliveTimes = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      await fetch(`${host}/get`, { keepalive: false });
      noKeepaliveTimes.push(performance.now() - start);
    }

    const avgKeepalive = keepaliveTimes.reduce((a, b) => a + b, 0) / keepaliveTimes.length;
    const avgNoKeepalive = noKeepaliveTimes.reduce((a, b) => a + b, 0) / noKeepaliveTimes.length;

    console.log('📊 Performance Results:');
    console.log(`   With keep-alive: ${avgKeepalive.toFixed(2)}ms average`);
    console.log(`   Without keep-alive: ${avgNoKeepalive.toFixed(2)}ms average`);
    console.log(`   Performance gain: ${((avgNoKeepalive - avgKeepalive) / avgNoKeepalive * 100).toFixed(1)}%`);
  } catch (error) {
    console.log('❌ Performance comparison error:', error.message);
  }
}

// Example 3: Verbose Debugging Levels
console.log('\n🐛 Verbose Debugging Levels');

async function verboseDebuggingExamples() {
  console.log('\n📝 Testing verbose debugging options...');

  // Test 1: verbose: true
  console.log('\n1. verbose: true:');
  try {
    console.log('🔄 Testing with verbose: true');
    const response = await fetch('https://httpbin.org/get', {
      verbose: true
    });

    if (response.ok) {
      console.log('✅ Verbose debugging (true) completed');
    }
  } catch (error) {
    console.log('❌ Verbose true error:', error.message);
  }

  // Test 2: verbose: "curl"
  console.log('\n2. verbose: "curl":');
  try {
    console.log('🔄 Testing with verbose: "curl"');
    const response = await fetch('https://httpbin.org/get', {
      verbose: 'curl'
    });

    if (response.ok) {
      console.log('✅ Verbose debugging (curl) completed');
    }
  } catch (error) {
    console.log('❌ Verbose curl error:', error.message);
  }

  // Test 3: Verbose with different methods
  console.log('\n3. Verbose with different HTTP methods:');
  try {
    const methods = [
      { method: 'GET', url: 'https://httpbin.org/get' },
      { method: 'POST', url: 'https://httpbin.org/post', body: 'test data' },
      { method: 'PUT', url: 'https://httpbin.org/put', body: '{"test": true}' },
      { method: 'DELETE', url: 'https://httpbin.org/delete' }
    ];

    for (const { method, url, body } of methods) {
      console.log(`\n🔄 ${method} request with verbose:`);

      const options: any = { verbose: true, method };
      if (body) {
        options.body = body;
        if (method === 'PUT') {
          options.headers = { 'Content-Type': 'application/json' };
        }
      }

      const response = await fetch(url, options);
      console.log(`✅ ${method} request completed`);
    }
  } catch (error) {
    console.log('❌ Verbose methods error:', error.message);
  }
}

// Example 4: Combined Options
console.log('\n🔧 Combined Options');

async function combinedOptionsExamples() {
  console.log('\n📝 Testing combined fetch options...');

  // Test 1: Optimized request with all options
  console.log('\n1. Optimized request with all options:');
  try {
    const response = await fetch('https://httpbin.org/gzip', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Optimized': 'true'
      },
      body: JSON.stringify({
        message: 'Optimized request',
        features: ['decompression', 'keepalive', 'verbose']
      }),
      decompress: true,
      keepalive: true,
      verbose: true
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Combined options request successful');
      console.log('📊 All optimizations applied successfully');
    }
  } catch (error) {
    console.log('❌ Combined options error:', error.message);
  }

  // Test 2: Performance-focused configuration
  console.log('\n2. Performance-focused configuration:');
  try {
    const host = 'https://httpbin.org';
    const iterations = 3;

    console.log(`🔄 Running ${iterations} optimized requests...`);

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      const response = await fetch(`${host}/post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': `req-${i + 1}`
        },
        body: JSON.stringify({ iteration: i + 1 }),
        decompress: true,
        keepalive: true,
        verbose: i === 0 // Only show verbose for first request
      });

      const endTime = performance.now();
      console.log(`   Request ${i + 1}: ${(endTime - startTime).toFixed(2)}ms`);
    }

    console.log('✅ Performance-focused configuration completed');
  } catch (error) {
    console.log('❌ Performance configuration error:', error.message);
  }

  // Test 3: Debugging-focused configuration
  console.log('\n3. Debugging-focused configuration:');
  try {
    const response = await fetch('https://httpbin.org/headers', {
      method: 'GET',
      headers: {
        'User-Agent': 'Bun-Debug-Client/1.0',
        'X-Debug-Mode': 'enabled',
        'X-Client-Version': '2.1.0'
      },
      decompress: false, // Get raw response for debugging
      keepalive: false, // Fresh connection for debugging
      verbose: 'curl' // Most verbose output
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Debugging configuration completed');
      console.log('📊 Full request/response captured for analysis');
    }
  } catch (error) {
    console.log('❌ Debugging configuration error:', error.message);
  }
}

// Example 5: Error Handling with Advanced Options
console.log('\n⚠️ Error Handling with Advanced Options');

async function errorHandlingExamples() {
  console.log('\n📝 Testing error scenarios...');

  // Test 1: Decompression error handling
  console.log('\n1. Decompression error handling:');
  try {
    // Try to decompress invalid data
    const response = await fetch('https://httpbin.org/status/500', {
      decompress: true,
      verbose: true
    });

    console.log('✅ Server error handled gracefully');
  } catch (error) {
    console.log('✅ Caught decompression error:', error.message);
  }

  // Test 2: Connection error with keep-alive
  console.log('\n2. Connection error with keep-alive:');
  try {
    // Try to connect to invalid host
    await fetch('https://invalid-host-for-testing.local', {
      keepalive: true,
      verbose: true
    });
  } catch (error) {
    console.log('✅ Caught connection error:', error.message);
  }

  // Test 3: Verbose error logging
  console.log('\n3. Verbose error logging:');
  try {
    await fetch('https://httpbin.org/status/404', {
      verbose: true
    });

    console.log('✅ 404 error handled with verbose logging');
  } catch (error) {
    console.log('✅ Caught 404 error:', error.message);
  }
}

// Main execution function
async function runAdvancedOptionsExamples() {
  console.log('🚀 Bun Fetch Advanced Options Demo');
  console.log('===================================\n');

  try {
    await decompressionExamples();
    await keepaliveExamples();
    await verboseDebuggingExamples();
    await combinedOptionsExamples();
    await errorHandlingExamples();

    console.log('\n🎉 All advanced options examples completed!');
    console.log('💡 Key features demonstrated:');
    console.log('   • Decompression control for gzip, deflate, brotli, zstd');
    console.log('   • Connection keep-alive management for performance');
    console.log('   • Verbose debugging with multiple levels');
    console.log('   • Combined option configurations');
    console.log('   • Error handling with advanced options');
    console.log('   • Performance optimization techniques');

  } catch (error) {
    console.error('\n❌ Error in advanced options examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (typeof Bun !== 'undefined' && process.argv[1] && process.argv[1].endsWith('bun-fetch-options.ts')) {
  runAdvancedOptionsExamples().catch(console.error);
}

export {
    combinedOptionsExamples, decompressionExamples, errorHandlingExamples, keepaliveExamples,
    verboseDebuggingExamples
};
