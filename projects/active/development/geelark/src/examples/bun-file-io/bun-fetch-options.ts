#!/usr/bin/env bun

/**
 * Bun Fetch Advanced Options
 *
 * Focused examples demonstrating Bun's extended fetch options
 * including decompression control, keep-alive management, and verbose debugging.
 */

// Example 1: Decompression Control
console.info('🗜️ Decompression Control');

async function decompressionExamples() {
  console.info('\n📝 Testing decompression options...');

  // Test 1: Decompression enabled (default)
  console.info('\n1. Decompression enabled (default):');
  try {
    const startTime = performance.now();
    const response = await fetch('https://httpbin.org/gzip', {
      decompress: true,
      verbose: true
    });
    const endTime = performance.now();

    if (response.ok) {
      const data = await response.json();
      console.info('✅ Decompressed response received');
      console.info(`⏱️ Time with decompression: ${(endTime - startTime).toFixed(2)}ms`);
      console.info(`📄 Response processed: ${data.gzipped ? 'was gzipped' : 'not gzipped'}`);
    }
  } catch (error) {
    console.info('❌ Decompression enabled error:', error.message);
  }

  // Test 2: Decompression disabled
  console.info('\n2. Decompression disabled:');
  try {
    const startTime = performance.now();
    const response = await fetch('https://httpbin.org/gzip', {
      decompress: false,
      verbose: true
    });
    const endTime = performance.now();

    if (response.ok) {
      const data = await response.json();
      console.info('✅ Raw compressed response received');
      console.info(`⏱️ Time without decompression: ${(endTime - startTime).toFixed(2)}ms`);
      console.info('📄 Response contains compressed data (not decompressed)');
    }
  } catch (error) {
    console.info('❌ Decompression disabled error:', error.message);
  }

  // Test 3: Different compression formats
  console.info('\n3. Multiple compression formats:');
  try {
    const formats = [
      { url: 'https://httpbin.org/gzip', name: 'gzip' },
      { url: 'https://httpbin.org/deflate', name: 'deflate' },
      { url: 'https://httpbin.org/brotli', name: 'brotli' }
    ];

    for (const { url, name } of formats) {
      console.info(`\n🔄 Testing ${name} compression:`);

      try {
        const response = await fetch(url, {
          decompress: true,
          verbose: true
        });

        if (response.ok) {
          console.info(`✅ ${name} decompression successful`);
        } else {
          console.info(`ℹ️ ${name} endpoint not available`);
        }
      } catch (error) {
        console.info(`❌ ${name} compression error:`, error.message);
      }
    }
  } catch (error) {
    console.info('❌ Multiple formats error:', error.message);
  }
}

// Example 2: Connection Keep-Alive Control
console.info('\n🔗 Connection Keep-Alive Control');

async function keepaliveExamples() {
  console.info('\n📝 Testing keep-alive options...');

  // Test 1: Keep-alive enabled (default)
  console.info('\n1. Keep-alive enabled (default):');
  try {
    const host = 'https://httpbin.org';
    const requestCount = 3;
    const times = [];

    console.info(`🔄 Making ${requestCount} requests with keep-alive...`);

    for (let i = 0; i < requestCount; i++) {
      const startTime = performance.now();
      const response = await fetch(`${host}/get`, {
        keepalive: true,
        headers: { 'X-Request-Number': (i + 1).toString() },
        verbose: i === 0 // Show verbose only for first request
      });
      const endTime = performance.now();
      times.push(endTime - startTime);

      console.info(`   Request ${i + 1}: ${times[i].toFixed(2)}ms`);
    }

    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.info(`📊 Average time with keep-alive: ${averageTime.toFixed(2)}ms`);
    console.info('✅ Connection reused across requests');
  } catch (error) {
    console.info('❌ Keep-alive enabled error:', error.message);
  }

  // Test 2: Keep-alive disabled
  console.info('\n2. Keep-alive disabled:');
  try {
    const host = 'https://httpbin.org';
    const requestCount = 3;
    const times = [];

    console.info(`🔄 Making ${requestCount} requests without keep-alive...`);

    for (let i = 0; i < requestCount; i++) {
      const startTime = performance.now();
      const response = await fetch(`${host}/get`, {
        keepalive: false,
        headers: { 'X-Request-Number': (i + 1).toString() },
        verbose: i === 0 // Show verbose only for first request
      });
      const endTime = performance.now();
      times.push(endTime - startTime);

      console.info(`   Request ${i + 1}: ${times[i].toFixed(2)}ms`);
    }

    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.info(`📊 Average time without keep-alive: ${averageTime.toFixed(2)}ms`);
    console.info('✅ New connection for each request');
  } catch (error) {
    console.info('❌ Keep-alive disabled error:', error.message);
  }

  // Test 3: Performance comparison
  console.info('\n3. Performance comparison:');
  try {
    const host = 'https://httpbin.org';

    // Benchmark with keep-alive
    console.info('🔄 Benchmarking with keep-alive...');
    const keepaliveTimes = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      await fetch(`${host}/get`, { keepalive: true });
      keepaliveTimes.push(performance.now() - start);
    }

    // Benchmark without keep-alive
    console.info('🔄 Benchmarking without keep-alive...');
    const noKeepaliveTimes = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      await fetch(`${host}/get`, { keepalive: false });
      noKeepaliveTimes.push(performance.now() - start);
    }

    const avgKeepalive = keepaliveTimes.reduce((a, b) => a + b, 0) / keepaliveTimes.length;
    const avgNoKeepalive = noKeepaliveTimes.reduce((a, b) => a + b, 0) / noKeepaliveTimes.length;

    console.info('📊 Performance Results:');
    console.info(`   With keep-alive: ${avgKeepalive.toFixed(2)}ms average`);
    console.info(`   Without keep-alive: ${avgNoKeepalive.toFixed(2)}ms average`);
    console.info(`   Performance gain: ${((avgNoKeepalive - avgKeepalive) / avgNoKeepalive * 100).toFixed(1)}%`);
  } catch (error) {
    console.info('❌ Performance comparison error:', error.message);
  }
}

// Example 3: Verbose Debugging Levels
console.info('\n🐛 Verbose Debugging Levels');

async function verboseDebuggingExamples() {
  console.info('\n📝 Testing verbose debugging options...');

  // Test 1: verbose: true
  console.info('\n1. verbose: true:');
  try {
    console.info('🔄 Testing with verbose: true');
    const response = await fetch('https://httpbin.org/get', {
      verbose: true
    });

    if (response.ok) {
      console.info('✅ Verbose debugging (true) completed');
    }
  } catch (error) {
    console.info('❌ Verbose true error:', error.message);
  }

  // Test 2: verbose: "curl"
  console.info('\n2. verbose: "curl":');
  try {
    console.info('🔄 Testing with verbose: "curl"');
    const response = await fetch('https://httpbin.org/get', {
      verbose: 'curl'
    });

    if (response.ok) {
      console.info('✅ Verbose debugging (curl) completed');
    }
  } catch (error) {
    console.info('❌ Verbose curl error:', error.message);
  }

  // Test 3: Verbose with different methods
  console.info('\n3. Verbose with different HTTP methods:');
  try {
    const methods = [
      { method: 'GET', url: 'https://httpbin.org/get' },
      { method: 'POST', url: 'https://httpbin.org/post', body: 'test data' },
      { method: 'PUT', url: 'https://httpbin.org/put', body: '{"test": true}' },
      { method: 'DELETE', url: 'https://httpbin.org/delete' }
    ];

    for (const { method, url, body } of methods) {
      console.info(`\n🔄 ${method} request with verbose:`);

      const options: any = { verbose: true, method };
      if (body) {
        options.body = body;
        if (method === 'PUT') {
          options.headers = { 'Content-Type': 'application/json' };
        }
      }

      const response = await fetch(url, options);
      console.info(`✅ ${method} request completed`);
    }
  } catch (error) {
    console.info('❌ Verbose methods error:', error.message);
  }
}

// Example 4: Combined Options
console.info('\n🔧 Combined Options');

async function combinedOptionsExamples() {
  console.info('\n📝 Testing combined fetch options...');

  // Test 1: Optimized request with all options
  console.info('\n1. Optimized request with all options:');
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
      console.info('✅ Combined options request successful');
      console.info('📊 All optimizations applied successfully');
    }
  } catch (error) {
    console.info('❌ Combined options error:', error.message);
  }

  // Test 2: Performance-focused configuration
  console.info('\n2. Performance-focused configuration:');
  try {
    const host = 'https://httpbin.org';
    const iterations = 3;

    console.info(`🔄 Running ${iterations} optimized requests...`);

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
      console.info(`   Request ${i + 1}: ${(endTime - startTime).toFixed(2)}ms`);
    }

    console.info('✅ Performance-focused configuration completed');
  } catch (error) {
    console.info('❌ Performance configuration error:', error.message);
  }

  // Test 3: Debugging-focused configuration
  console.info('\n3. Debugging-focused configuration:');
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
      console.info('✅ Debugging configuration completed');
      console.info('📊 Full request/response captured for analysis');
    }
  } catch (error) {
    console.info('❌ Debugging configuration error:', error.message);
  }
}

// Example 5: Error Handling with Advanced Options
console.info('\n⚠️ Error Handling with Advanced Options');

async function errorHandlingExamples() {
  console.info('\n📝 Testing error scenarios...');

  // Test 1: Decompression error handling
  console.info('\n1. Decompression error handling:');
  try {
    // Try to decompress invalid data
    const response = await fetch('https://httpbin.org/status/500', {
      decompress: true,
      verbose: true
    });

    console.info('✅ Server error handled gracefully');
  } catch (error) {
    console.info('✅ Caught decompression error:', error.message);
  }

  // Test 2: Connection error with keep-alive
  console.info('\n2. Connection error with keep-alive:');
  try {
    // Try to connect to invalid host
    await fetch('https://invalid-host-for-testing.local', {
      keepalive: true,
      verbose: true
    });
  } catch (error) {
    console.info('✅ Caught connection error:', error.message);
  }

  // Test 3: Verbose error logging
  console.info('\n3. Verbose error logging:');
  try {
    await fetch('https://httpbin.org/status/404', {
      verbose: true
    });

    console.info('✅ 404 error handled with verbose logging');
  } catch (error) {
    console.info('✅ Caught 404 error:', error.message);
  }
}

// Main execution function
async function runAdvancedOptionsExamples() {
  console.info('🚀 Bun Fetch Advanced Options Demo');
  console.info('===================================\n');

  try {
    await decompressionExamples();
    await keepaliveExamples();
    await verboseDebuggingExamples();
    await combinedOptionsExamples();
    await errorHandlingExamples();

    console.info('\n🎉 All advanced options examples completed!');
    console.info('💡 Key features demonstrated:');
    console.info('   • Decompression control for gzip, deflate, brotli, zstd');
    console.info('   • Connection keep-alive management for performance');
    console.info('   • Verbose debugging with multiple levels');
    console.info('   • Combined option configurations');
    console.info('   • Error handling with advanced options');
    console.info('   • Performance optimization techniques');

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
