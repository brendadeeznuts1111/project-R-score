#!/usr/bin/env bun
/**
 * BUN_CONFIG_VERBOSE_FETCH Demonstration
 * 
 * Comprehensive demonstration of Bun's verbose fetch logging capabilities:
 * - BUN_CONFIG_VERBOSE_FETCH=curl (curl-style output)
 * - BUN_CONFIG_VERBOSE_FETCH=1 (basic logging)
 * - Network request debugging with node:http
 * - Request/response header analysis
 * - Performance timing and status tracking
 * 
 * Usage:
 *   bun run verbose-fetch-demo.ts
 *   BUN_CONFIG_VERBOSE_FETCH=curl bun run verbose-fetch-demo.ts
 *   BUN_CONFIG_VERBOSE_FETCH=1 bun run verbose-fetch-demo.ts
 * 
 * @author Odds Protocol Development Team
 * @version 1.0.0
 * @since 2025-11-18
 */

console.info('🌐 BUN_CONFIG_VERBOSE_FETCH Demonstration');
console.info('===========================================');

// =============================================================================
// VERBOSE FETCH MODES DEMONSTRATION
// =============================================================================

console.info('\n📋 Verbose Fetch Configuration:');
console.info('================================');

// Show current verbose fetch setting
const currentMode = process.env.BUN_CONFIG_VERBOSE_FETCH;
console.info(`Current BUN_CONFIG_VERBOSE_FETCH: ${currentMode || 'undefined (no verbose logging)'}`);

console.info('\n🎯 Available Modes:');
console.info('• BUN_CONFIG_VERBOSE_FETCH=curl  - Full curl-style output');
console.info('• BUN_CONFIG_VERBOSE_FETCH=1    - Basic logging without curl format');
console.info('• undefined                    - No verbose logging');

// =============================================================================
// NETWORK REQUEST DEMONSTRATIONS
// =============================================================================

async function demonstrateVerboseFetch() {
    console.info('\n🚀 Network Request Demonstrations:');
    console.info('===================================');

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
        console.info(`\n📡 ${request.name}:`);
        console.info('─'.repeat(50));

        try {
            const startTime = performance.now();

            console.info(`Making request to: ${request.url}`);
            console.info(`Method: ${request.options.method || 'GET'}`);

            if (request.options.headers) {
                console.info('Headers:');
                Object.entries(request.options.headers).forEach(([key, value]) => {
                    console.info(`  ${key}: ${value}`);
                });
            }

            if (request.options.body) {
                console.info(`Body: ${request.options.body}`);
            }

            console.info('\n⬇️ Response:');

            // Make the request (verbose logging will show automatically)
            const response = await fetch(request.url, request.options);

            const endTime = performance.now();
            const duration = endTime - startTime;

            console.info(`\n✅ Request completed in ${duration.toFixed(2)}ms`);
            console.info(`Status: ${response.status} ${response.statusText}`);

            // Show response headers
            console.info('\n📋 Response Headers:');
            response.headers.forEach((value, key) => {
                console.info(`  ${key}: ${value}`);
            });

            // Try to get response body
            try {
                const contentType = response.headers.get('content-type');
                console.info(`\n📄 Content-Type: ${contentType}`);

                if (contentType?.includes('application/json')) {
                    const data = await response.json();
                    console.info('📊 JSON Response (truncated):');
                    console.info(JSON.stringify(data, null, 2).substring(0, 500) + '...');
                } else {
                    const text = await response.text();
                    console.info(`📄 Response Body (${text.length} chars):`);
                    console.info(text.substring(0, 200) + '...');
                }
            } catch (bodyError) {
                console.info('⚠️ Could not read response body');
            }

        } catch (error) {
            console.error(`❌ Request failed: ${error.message}`);
        }

        console.info('\n' + '='.repeat(60));
    }
}

// =============================================================================
// NODE:HTTP VERbose FETCH DEMONSTRATION
// =============================================================================

async function demonstrateNodeHttpVerbose() {
    console.info('\n🔧 node:http with Verbose Fetch:');
    console.info('=================================');

    try {
        // Import node:http for demonstration
        const { default: http } = await import('node:http');

        console.info('Making request with node:http module...');

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
            console.info(`\n✅ node:http Response: ${res.statusCode} ${res.statusMessage}`);
            console.info('📋 Response Headers:');
            Object.entries(res.headers).forEach(([key, value]) => {
                console.info(`  ${key}: ${value}`);
            });

            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.info(`\n📄 Response Body (${data.length} chars):`);
                console.info(data.substring(0, 300) + '...');
            });
        });

        req.on('error', (error) => {
            console.error(`❌ node:http request failed: ${error.message}`);
        });

        req.end();

        // Wait a bit for the request to complete
        await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
        console.info('⚠️ node:http module not available or failed:', error.message);
    }
}

// =============================================================================
// PERFORMANCE ANALYSIS
// =============================================================================

async function demonstratePerformanceAnalysis() {
    console.info('\n📊 Performance Analysis with Verbose Fetch:');
    console.info('============================================');

    const testUrls = [
        'https://httpbin.org/delay/1',
        'https://httpbin.org/delay/2',
        'https://httpbin.org/status/200'
    ];

    console.info('Testing request performance with verbose logging enabled...\n');

    for (let i = 0; i < testUrls.length; i++) {
        const url = testUrls[i];
        console.info(`📡 Test ${i + 1}: ${url}`);

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

            console.info(`⏱️ Request completed in ${duration.toFixed(2)}ms`);
            console.info(`📊 Status: ${response.status} ${response.statusText}`);

            // Calculate performance metrics
            const throughput = 1000 / duration; // requests per second
            console.info(`📈 Throughput: ${throughput.toFixed(2)} requests/second`);

        } catch (error) {
            console.error(`❌ Performance test failed: ${error.message}`);
        }

        console.info('');
    }
}

// =============================================================================
// ERROR HANDLING DEMONSTRATION
// =============================================================================

async function demonstrateErrorHandling() {
    console.info('\n❌ Error Handling with Verbose Fetch:');
    console.info('======================================');

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
        console.info(`\n🧪 ${scenario.name}:`);
        console.info(`URL: ${scenario.url}`);
        console.info(`Expected: ${scenario.description}`);
        console.info('─'.repeat(40));

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

            console.info(`✅ Response received in ${duration.toFixed(2)}ms`);
            console.info(`📊 Status: ${response.status} ${response.statusText}`);

            if (response.status >= 400) {
                console.info('⚠️ This is an expected error response');
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                console.info('⏰ Request timed out (5 seconds)');
            } else {
                console.info(`❌ Error: ${error.message}`);
            }
        }

        console.info('');
    }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
    console.info(`🔧 Running with BUN_CONFIG_VERBOSE_FETCH: ${process.env.BUN_CONFIG_VERBOSE_FETCH || 'undefined'}`);
    console.info('📝 This demo shows how verbose fetch logging works in Bun');
    console.info('');

    console.info('💡 Tips for using this demo:');
    console.info('• Run without env var to see normal fetch behavior');
    console.info('• Run with BUN_CONFIG_VERBOSE_FETCH=1 for basic logging');
    console.info('• Run with BUN_CONFIG_VERBOSE_FETCH=curl for curl-style output');
    console.info('');

    // Run all demonstrations
    await demonstrateVerboseFetch();
    await demonstrateNodeHttpVerbose();
    await demonstratePerformanceAnalysis();
    await demonstrateErrorHandling();

    console.info('\n🎉 Verbose Fetch Demonstration Complete!');
    console.info('========================================');
    console.info('📚 Summary of BUN_CONFIG_VERBOSE_FETCH:');
    console.info('• curl mode: Shows full curl-style command output');
    console.info('• 1 mode: Shows basic request/response logging');
    console.info('• undefined: Normal fetch behavior (no verbose logging)');
    console.info('');
    console.info('🔍 Use verbose fetch for:');
    console.info('• Debugging API requests and responses');
    console.info('• Analyzing HTTP headers and timing');
    console.info('• Troubleshooting network issues');
    console.info('• Understanding request/response flow');
}

// Run the demonstration
main().catch(console.error);
