#!/usr/bin/env bun
/**
 * BUN_CONFIG_VERBOSE_FETCH Demonstration - Fixed Version
 * 
 * Comprehensive demonstration of Bun's verbose fetch logging capabilities:
 * - BUN_CONFIG_VERBOSE_FETCH=curl (curl-style output)
 * - BUN_CONFIG_VERBOSE_FETCH=1 (basic logging)
 * - Network request debugging with node:http
 * - Request/response header analysis
 * - Performance timing and status tracking
 * 
 * Usage:
 *   bun run verbose-fetch-demo-fixed.ts
 *   BUN_CONFIG_VERBOSE_FETCH=curl bun run verbose-fetch-demo-fixed.ts
 *   BUN_CONFIG_VERBOSE_FETCH=1 bun run verbose-fetch-demo-fixed.ts
 * 
 * @author Odds Protocol Development Team
 * @version 1.0.1
 * @since 2025-11-18
 */

console.log('🌐 BUN_CONFIG_VERBOSE_FETCH Demonstration - Fixed');
console.log('==================================================');

// =============================================================================
// VERBOSE FETCH MODES DEMONSTRATION
// =============================================================================

console.log('\n📋 Verbose Fetch Configuration:');
console.log('================================');

// Show current verbose fetch setting
const currentMode = process.env.BUN_CONFIG_VERBOSE_FETCH;
console.log(`Current BUN_CONFIG_VERBOSE_FETCH: ${currentMode || 'undefined (no verbose logging)'}`);

console.log('\n🎯 Available Modes:');
console.log('• BUN_CONFIG_VERBOSE_FETCH=curl  - Full curl-style output');
console.log('• BUN_CONFIG_VERBOSE_FETCH=1    - Basic logging without curl format');
console.log('• undefined                    - No verbose logging');

// =============================================================================
// NETWORK REQUEST DEMONSTRATIONS
// =============================================================================

async function demonstrateVerboseFetch() {
    console.log('\n🚀 Network Request Demonstrations:');
    console.log('===================================');

    // Test URLs for different scenarios
    const testRequests = [
        {
            name: 'Simple GET Request',
            url: 'https://httpbin.org/get',
            options: {
                headers: {
                    'User-Agent': 'Bun-Verbose-Fetch-Demo/1.0',
                    'X-Demo-Mode': 'verbose-fetch'
                }
            }
        },
        {
            name: 'POST Request with JSON',
            url: 'https://httpbin.org/post',
            options: {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Bun-Verbose-Fetch-Demo/1.0'
                },
                body: JSON.stringify({
                    message: 'Hello from Bun verbose fetch demo',
                    timestamp: new Date().toISOString(),
                    metadata: {
                        version: '1.0.0',
                        mode: process.env.BUN_CONFIG_VERBOSE_FETCH || 'none'
                    }
                })
            }
        },
        {
            name: 'PUT Request with Form Data',
            url: 'https://httpbin.org/put',
            options: {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Bun-Verbose-Fetch-Demo/1.0'
                },
                body: new URLSearchParams({
                    name: 'Bun Demo',
                    action: 'verbose-fetch-test',
                    data: 'form-data-encoding'
                }).toString()
            }
        },
        {
            name: 'Request with Custom Headers',
            url: 'https://httpbin.org/headers',
            options: {
                headers: {
                    'Authorization': 'Bearer demo-token-12345',
                    'X-API-Key': 'demo-api-key-67890',
                    'X-Request-ID': `req-${Date.now()}`,
                    'X-Debug-Mode': 'true',
                    'User-Agent': 'Bun-Verbose-Fetch-Demo/1.0'
                }
            }
        },
        {
            name: 'User-Agent Testing',
            url: 'https://httpbin.org/user-agent',
            options: {
                headers: {
                    'User-Agent': 'Bun-Verbose-Fetch-Demo/1.0 (Feature-Testing)'
                }
            }
        }
    ];

    // Execute each test request
    for (const request of testRequests) {
        console.log(`\n📡 ${request.name}:`);
        console.log('─'.repeat(50));

        try {
            const startTime = performance.now();

            console.log(`Making request to: ${request.url}`);
            console.log(`Method: ${request.options.method || 'GET'}`);

            if (request.options.headers) {
                console.log('Headers:');
                Object.entries(request.options.headers).forEach(([key, value]) => {
                    console.log(`  ${key}: ${value}`);
                });
            }

            if (request.options.body) {
                console.log(`Body: ${request.options.body}`);
            }

            console.log('\n⬇️ Response:');

            // Make the request (verbose logging will show automatically)
            const response = await fetch(request.url, request.options);

            const endTime = performance.now();
            const duration = endTime - startTime;

            console.log(`\n✅ Request completed in ${duration.toFixed(2)}ms`);
            console.log(`Status: ${response.status} ${response.statusText}`);

            // Show response headers
            console.log('\n📋 Response Headers:');
            response.headers.forEach((value, key) => {
                console.log(`  ${key}: ${value}`);
            });

            // Try to get response body
            try {
                const contentType = response.headers.get('content-type');
                console.log(`\n📄 Content-Type: ${contentType}`);

                if (contentType?.includes('application/json')) {
                    const data = await response.json();
                    console.log('📊 JSON Response (truncated):');
                    console.log(JSON.stringify(data, null, 2).substring(0, 500) + '...');
                } else {
                    const text = await response.text();
                    console.log(`📄 Response Body (${text.length} chars):`);
                    console.log(text.substring(0, 200) + '...');
                }
            } catch (bodyError) {
                console.log('⚠️ Could not read response body');
            }

        } catch (error) {
            console.error(`❌ Request failed: ${error.message}`);
        }

        console.log('\n' + '='.repeat(60));
    }
}

// =============================================================================
// NODE:HTTP VERBOSE FETCH DEMONSTRATION
// =============================================================================

async function demonstrateNodeHttpVerbose() {
    console.log('\n🔧 node:http with Verbose Fetch:');
    console.log('=================================');

    try {
        // Import node:http for demonstration
        const { default: http } = await import('node:http');

        console.log('Making request with node:http module...');

        // Create a simple HTTP request
        const options = {
            hostname: 'httpbin.org',
            port: 80,
            path: '/get',
            method: 'GET',
            headers: {
                'User-Agent': 'Bun-Node-HTTP-Demo/1.0',
                'X-Source': 'node-http-module'
            }
        };

        const req = http.request(options, (res) => {
            console.log(`\n✅ node:http Response: ${res.statusCode} ${res.statusMessage}`);
            console.log('📋 Response Headers:');
            Object.entries(res.headers).forEach(([key, value]) => {
                console.log(`  ${key}: ${value}`);
            });

            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`\n📄 Response Body (${data.length} chars):`);
                console.log(data.substring(0, 300) + '...');
            });
        });

        req.on('error', (error) => {
            console.error(`❌ node:http request failed: ${error.message}`);
        });

        req.end();

        // Wait a bit for the request to complete
        await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
        console.log('⚠️ node:http module not available or failed:', error.message);
    }
}

// =============================================================================
// PERFORMANCE ANALYSIS
// =============================================================================

async function demonstratePerformanceAnalysis() {
    console.log('\n📊 Performance Analysis with Verbose Fetch:');
    console.log('============================================');

    const testUrls = [
        'https://httpbin.org/delay/1',
        'https://httpbin.org/delay/2',
        'https://httpbin.org/status/200'
    ];

    console.log('Testing request performance with verbose logging enabled...\n');

    for (let i = 0; i < testUrls.length; i++) {
        const url = testUrls[i];
        console.log(`📡 Test ${i + 1}: ${url}`);

        try {
            const startTime = performance.now();

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Bun-Performance-Test/1.0',
                    'X-Test-Number': (i + 1).toString()
                }
            });

            const endTime = performance.now();
            const duration = endTime - startTime;

            console.log(`⏱️ Request completed in ${duration.toFixed(2)}ms`);
            console.log(`📊 Status: ${response.status} ${response.statusText}`);

            // Calculate performance metrics
            const throughput = 1000 / duration; // requests per second
            console.log(`📈 Throughput: ${throughput.toFixed(2)} requests/second`);

        } catch (error) {
            console.error(`❌ Performance test failed: ${error.message}`);
        }

        console.log('');
    }
}

// =============================================================================
// ERROR HANDLING DEMONSTRATION
// =============================================================================

async function demonstrateErrorHandling() {
    console.log('\n❌ Error Handling with Verbose Fetch:');
    console.log('======================================');

    const errorScenarios = [
        {
            name: 'Invalid Domain',
            url: 'https://nonexistent-domain-for-testing.local',
            description: 'Should show DNS resolution failure'
        },
        {
            name: 'Invalid Port',
            url: 'https://httpbin.org:9999/get',
            description: 'Should show connection refused'
        },
        {
            name: 'Timeout Scenario',
            url: 'https://httpbin.org/delay/10',
            description: 'May show timeout (depending on network)'
        },
        {
            name: '404 Not Found',
            url: 'https://httpbin.org/status/404',
            description: 'Should show 404 response'
        },
        {
            name: '500 Server Error',
            url: 'https://httpbin.org/status/500',
            description: 'Should show 500 server error'
        }
    ];

    for (const scenario of errorScenarios) {
        console.log(`\n🧪 ${scenario.name}:`);
        console.log(`URL: ${scenario.url}`);
        console.log(`Expected: ${scenario.description}`);
        console.log('─'.repeat(40));

        try {
            const startTime = performance.now();

            // Set a timeout for the request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

            const response = await fetch(scenario.url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Bun-Error-Test/1.0',
                    'X-Test-Scenario': scenario.name
                }
            });

            clearTimeout(timeoutId);
            const endTime = performance.now();
            const duration = endTime - startTime;

            console.log(`✅ Response received in ${duration.toFixed(2)}ms`);
            console.log(`📊 Status: ${response.status} ${response.statusText}`);

            if (response.status >= 400) {
                console.log('⚠️ This is an expected error response');
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('⏰ Request timed out (5 seconds)');
            } else {
                console.log(`❌ Error: ${error.message}`);
            }
        }

        console.log('');
    }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
    console.log(`🔧 Running with BUN_CONFIG_VERBOSE_FETCH: ${process.env.BUN_CONFIG_VERBOSE_FETCH || 'undefined'}`);
    console.log('📝 This demo shows how verbose fetch logging works in Bun');
    console.log('');

    console.log('💡 Tips for using this demo:');
    console.log('• Run without env var to see normal fetch behavior');
    console.log('• Run with BUN_CONFIG_VERBOSE_FETCH=1 for basic logging');
    console.log('• Run with BUN_CONFIG_VERBOSE_FETCH=curl for curl-style output');
    console.log('');

    // Run all demonstrations
    await demonstrateVerboseFetch();
    await demonstrateNodeHttpVerbose();
    await demonstratePerformanceAnalysis();
    await demonstrateErrorHandling();

    console.log('\n🎉 Verbose Fetch Demonstration Complete!');
    console.log('========================================');
    console.log('📚 Summary of BUN_CONFIG_VERBOSE_FETCH:');
    console.log('• curl mode: Shows full curl-style command output');
    console.log('• 1 mode: Shows basic request/response logging');
    console.log('• undefined: Normal fetch behavior (no verbose logging)');
    console.log('');
    console.log('🔍 Use verbose fetch for:');
    console.log('• Debugging API requests and responses');
    console.log('• Analyzing HTTP headers and timing');
    console.log('• Troubleshooting network issues');
    console.log('• Understanding request/response flow');
}

// Run the demonstration
main().catch(console.error);
