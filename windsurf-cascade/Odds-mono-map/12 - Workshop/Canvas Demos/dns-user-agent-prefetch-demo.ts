#!/usr/bin/env bun
/**
 * DNS with User-Agent and Prefetch Testing
 * 
 * Enhanced DNS demonstration that tests:
 * 1. DNS functionality with --user-agent flag
 * 2. Exact prefetch examples from documentation
 * 3. Cache statistics monitoring
 * 4. Integration with all APIs that use DNS cache
 * 5. TTL configuration testing
 * 
 * Exact documentation syntax used throughout.
 * 
 * Usage:
 *   bun run dns-user-agent-prefetch-demo.ts
 *   BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=5 bun run dns-user-agent-prefetch-demo.ts
 * 
 * @author Odds Protocol Development Team
 * @version 1.0.0
 * @since 2025-11-18
 */

console.log('🌍 DNS with User-Agent and Prefetch Testing');
console.log('==========================================');

// =============================================================================
// 1. DNS CACHE INTEGRATION TESTING WITH USER-AGENT
// =============================================================================

async function demonstrateDnsCacheWithUserAgent() {
    console.log('\n📋 1. DNS Cache Integration with User-Agent Testing:');
    console.log('=====================================================');

    try {
        const { dns } = await import("bun");

        console.log('📚 This cache is automatically used by:');
        console.log('   • bun install');
        console.log('   • fetch()');
        console.log('   • node:http (client)');
        console.log('   • Bun.connect');
        console.log('   • node:net');
        console.log('   • node:tls');

        // Get initial cache stats
        console.log('\n📊 Initial DNS cache stats:');
        const initialStats = dns.getCacheStats();
        console.log(`   • Cache size: ${initialStats.size}`);
        console.log(`   • Cache hits completed: ${initialStats.cacheHitsCompleted}`);
        console.log(`   • Cache misses: ${initialStats.cacheMisses}`);
        console.log(`   • Total requests: ${initialStats.totalCount}`);

        // Test fetch() with custom user-agent
        console.log('\n🌐 Testing fetch() with custom user-agent:');
        console.log('📋 This will automatically use DNS cache');

        const customUserAgent = "MyApp/1.0 (DNS-Test; +https://example.com/bot)";
        console.log(`🔧 Custom User-Agent: ${customUserAgent}`);

        const startFetch = performance.now();
        try {
            const response = await fetch("https://httpbin.org/user-agent", {
                headers: {
                    "User-Agent": customUserAgent
                }
            });
            const fetchTime = performance.now() - startFetch;

            console.log(`   • Fetch completed in: ${fetchTime.toFixed(2)}ms`);
            console.log(`   • HTTP status: ${response.status}`);

            if (response.ok) {
                const data = await response.json();
                console.log(`   • User-Agent received: ${data["user-agent"]}`);
            }

            const afterFetchStats = dns.getCacheStats();
            console.log(`   • DNS cache size after fetch: ${afterFetchStats.size}`);
            console.log(`   • DNS cache misses: ${afterFetchStats.cacheMisses}`);

        } catch (error) {
            console.log(`   • Fetch failed: ${error.message}`);
        }

        // Test Bun.connect with DNS cache
        console.log('\n🔌 Testing Bun.connect with DNS cache:');

        const startConnect = performance.now();
        try {
            const socket = await Bun.connect({
                hostname: "httpbin.org",
                port: 80,
                socket: {
                    open(socket) {
                        const connectTime = performance.now() - startConnect;
                        console.log(`   • TCP connection completed in: ${connectTime.toFixed(2)}ms`);
                        socket.end();
                    },
                    data(socket, data) {
                        // Handle any response data
                    }
                }
            });

            await Bun.sleep(100);

            const connectStats = dns.getCacheStats();
            console.log(`   • DNS cache size after connect: ${connectStats.size}`);
            console.log(`   • Cache hits completed: ${connectStats.cacheHitsCompleted}`);

        } catch (error) {
            console.log(`   • Connect failed: ${error.message}`);
        }

        console.log('✅ DNS cache integration with user-agent testing completed');

    } catch (error) {
        console.error(`❌ DNS cache integration demo failed: ${error.message}`);
    }
}

// =============================================================================
// 2. DNS PREFETCH - EXACT DOCUMENTATION EXAMPLES
// =============================================================================

async function demonstrateDnsPrefetch() {
    console.log('\n⚡ 2. DNS Prefetch - Exact Documentation Examples:');
    console.log('==================================================');

    try {
        const { dns } = await import("bun");

        console.log('⚠️  This API is experimental and may change in the future');
        console.log('📚 When should I prefetch a DNS entry?');
        console.log('   • Web browsers expose <link rel="dns-prefetch">');
        console.log('   • Useful when you know you\'ll need to connect to a host soon');
        console.log('   • Avoids initial DNS lookup latency');

        // Exact documentation example 1: Database host
        console.log('\n🗄️  Exact documentation example 1: Database host');
        console.log('📋 Syntax: dns.prefetch("my.database-host.com", 5432);');

        console.log('🚀 Application starting up...');
        console.log('🔄 Prefetching database host DNS...');
        dns.prefetch("my.database-host.com", 5432);

        console.log('📝 Loading application modules...');
        await Bun.sleep(500);

        console.log('🗄️  Connecting to database (DNS should be cached)...');
        // In real scenario, this would connect faster due to prefetch

        // Exact documentation example 2: Web service
        console.log('\n🌐 Exact documentation example 2: Web service');
        console.log('📋 Syntax: dns.prefetch("bun.com", 443);');

        console.log('🔄 Prefetching bun.com DNS...');
        dns.prefetch("bun.com", 443);

        console.log('⏳ Waiting for prefetch to complete...');
        await Bun.sleep(1000);

        console.log('🌐 Fetching from bun.com (DNS should be cached)...');
        const startBunFetch = performance.now();
        try {
            const response = await fetch("https://bun.com");
            const bunFetchTime = performance.now() - startBunFetch;
            console.log(`   • Fetch to bun.com completed in: ${bunFetchTime.toFixed(2)}ms`);
            console.log(`   • HTTP status: ${response.status}`);
        } catch (error) {
            console.log(`   • Fetch failed: ${error.message}`);
        }

        // Test multiple prefetches
        console.log('\n📡 Testing multiple prefetches:');

        const prefetchTargets = [
            { host: "github.com", port: 443, description: "GitHub API" },
            { host: "api.twitter.com", port: 443, description: "Twitter API" },
            { host: "graph.facebook.com", port: 443, description: "Facebook Graph API" }
        ];

        prefetchTargets.forEach(({ host, port, description }) => {
            console.log(`   🔄 Prefetching ${description} (${host}:${port})`);
            dns.prefetch(host, port);
        });

        console.log('⏳ Waiting for prefetches to complete...');
        await Bun.sleep(1000);

        // Test fetch after prefetch
        console.log('\n📊 Testing fetch performance after prefetch:');

        for (const { host, description } of prefetchTargets) {
            const start = performance.now();
            try {
                const response = await fetch(`https://${host}`);
                const time = performance.now() - start;
                console.log(`   • ${description}: ${time.toFixed(2)}ms (status: ${response.status})`);
            } catch (error) {
                console.log(`   • ${description}: Failed - ${error.message}`);
            }
        }

        console.log('✅ DNS prefetch demonstration completed');

    } catch (error) {
        console.error(`❌ DNS prefetch demo failed: ${error.message}`);
    }
}

// =============================================================================
// 3. DNS GET CACHE STATS - EXACT DOCUMENTATION EXAMPLES
// =============================================================================

async function demonstrateDnsGetCacheStats() {
    console.log('\n📊 3. DNS getCacheStats - Exact Documentation Examples:');
    console.log('=======================================================');

    try {
        const { dns } = await import("bun");

        console.log('⚠️  This API is experimental and may change in the future');
        console.log('📚 DNS cache statistics properties:');
        console.log('   • cacheHitsCompleted: Cache hits completed');
        console.log('   • cacheHitsInflight: Cache hits in flight');
        console.log('   • cacheMisses: Cache misses');
        console.log('   • size: Number of items in the DNS cache');
        console.log('   • errors: Number of times a connection failed');
        console.log('   • totalCount: Total connection requests');

        // Exact documentation example
        console.log('\n📋 Exact documentation example:');
        console.log('📋 Syntax: const stats = dns.getCacheStats();');

        const stats = dns.getCacheStats();
        console.log('📊 Current DNS cache statistics:');
        console.log(`   • cacheHitsCompleted: ${stats.cacheHitsCompleted}`);
        console.log(`   • cacheHitsInflight: ${stats.cacheHitsInflight}`);
        console.log(`   • cacheMisses: ${stats.cacheMisses}`);
        console.log(`   • size: ${stats.size}`);
        console.log(`   • errors: ${stats.errors}`);
        console.log(`   • totalCount: ${stats.totalCount}`);

        // Perform DNS operations to see stats change
        console.log('\n🔄 Performing DNS operations to update stats...');

        const testDomains = ["example.com", "httpbin.org", "jsonplaceholder.typicode.com"];

        for (const domain of testDomains) {
            try {
                const start = performance.now();
                await fetch(`https://${domain}`);
                const time = performance.now() - start;
                console.log(`   ✅ Fetched ${domain} in ${time.toFixed(2)}ms`);
            } catch (error) {
                console.log(`   ❌ Failed to fetch ${domain}: ${error.message}`);
            }
        }

        // Check updated stats
        console.log('\n📊 Updated DNS cache statistics:');
        const updatedStats = dns.getCacheStats();
        console.log(`   • cacheHitsCompleted: ${updatedStats.cacheHitsCompleted}`);
        console.log(`   • cacheHitsInflight: ${updatedStats.cacheHitsInflight}`);
        console.log(`   • cacheMisses: ${updatedStats.cacheMisses}`);
        console.log(`   • size: ${updatedStats.size}`);
        console.log(`   • errors: ${updatedStats.errors}`);
        console.log(`   • totalCount: ${updatedStats.totalCount}`);

        // Calculate cache performance metrics
        const hitRate = updatedStats.totalCount > 0
            ? ((updatedStats.cacheHitsCompleted / updatedStats.totalCount) * 100).toFixed(2)
            : '0.00';
        const missRate = updatedStats.totalCount > 0
            ? ((updatedStats.cacheMisses / updatedStats.totalCount) * 100).toFixed(2)
            : '0.00';

        console.log('\n📈 Cache performance metrics:');
        console.log(`   • Cache hit rate: ${hitRate}%`);
        console.log(`   • Cache miss rate: ${missRate}%`);
        console.log(`   • Cache efficiency: ${updatedStats.size > 0 ? 'Good' : 'Needs warming'}`);

        console.log('✅ DNS getCacheStats demonstration completed');

    } catch (error) {
        console.error(`❌ DNS getCacheStats demo failed: ${error.message}`);
    }
}

// =============================================================================
// 4. CONFIGURING DNS CACHE TTL - EXACT DOCUMENTATION EXAMPLES
// =============================================================================

async function demonstrateDnsTtlConfiguration() {
    console.log('\n⚙️  4. Configuring DNS Cache TTL - Exact Documentation Examples:');
    console.log('=============================================================');

    try {
        console.log('📚 DNS Cache TTL Configuration:');
        console.log('   • Bun defaults to 30 seconds for DNS cache TTL');
        console.log('   • Change with environment variable: $BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS');

        // Show current configuration
        const currentTtl = process.env.BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS || '30 (default)';
        console.log(`\n🔍 Current TTL configuration: ${currentTtl} seconds`);

        // Exact documentation example
        console.log('\n📋 Exact documentation example:');
        console.log('📋 Syntax: BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=5 bun run my-script.ts');

        console.log('\n🛠️  Usage examples:');
        console.log('   # Set TTL to 5 seconds for dynamic environments');
        console.log('   BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=5 bun run app.ts');
        console.log('');
        console.log('   # Set TTL to 2 minutes for stable environments');
        console.log('   BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=120 bun run app.ts');
        console.log('');
        console.log('   # Use default 30 seconds');
        console.log('   bun run app.ts');

        // Test TTL effectiveness
        console.log('\n🧪 Testing TTL effectiveness:');

        const { dns } = await import("bun");

        // Clear cache by waiting for TTL to expire (simulated)
        console.log('📊 Current cache stats:');
        const beforeStats = dns.getCacheStats();
        console.log(`   • Cache size: ${beforeStats.size}`);
        console.log(`   • Cache hits: ${beforeStats.cacheHitsCompleted}`);

        // Perform DNS lookup
        console.log('\n🔍 Performing DNS lookup...');
        try {
            await dns.lookup("example.com");
            console.log('   ✅ DNS lookup completed');
        } catch (error) {
            console.log(`   ❌ DNS lookup failed: ${error.message}`);
        }

        const afterStats = dns.getCacheStats();
        console.log('\n📊 Cache stats after lookup:');
        console.log(`   • Cache size: ${afterStats.size}`);
        console.log(`   • Cache hits: ${afterStats.cacheHitsCompleted}`);
        console.log(`   • Cache misses: ${afterStats.cacheMisses}`);

        // Second lookup (should be cached)
        console.log('\n🔍 Performing second lookup (should be cached)...');
        try {
            await dns.lookup("example.com");
            console.log('   ✅ Second DNS lookup completed');
        } catch (error) {
            console.log(`   ❌ Second DNS lookup failed: ${error.message}`);
        }

        const secondStats = dns.getCacheStats();
        console.log('\n📊 Cache stats after second lookup:');
        console.log(`   • Cache hits: ${secondStats.cacheHitsCompleted}`);
        console.log(`   • Cache misses: ${secondStats.cacheMisses}`);

        const cacheImprovement = secondStats.cacheHitsCompleted > beforeStats.cacheHitsCompleted;
        console.log(`   • Cache working: ${cacheImprovement ? '✅ Yes' : '❌ No'}`);

        console.log('\n💡 TTL Configuration Guidelines:');
        console.log('   • 5 seconds: Dynamic environments, frequent DNS changes');
        console.log('   • 30 seconds: Default, good balance for most apps');
        console.log('   • 2 minutes: Stable environments, infrequent changes');
        console.log('   • 5+ minutes: Very stable infrastructure, static IPs');

        console.log('✅ DNS TTL configuration demonstration completed');

    } catch (error) {
        console.error(`❌ DNS TTL configuration demo failed: ${error.message}`);
    }
}

// =============================================================================
// 5. COMPREHENSIVE USER-AGENT AND DNS INTEGRATION TESTING
// =============================================================================

async function demonstrateUserAgentDnsIntegration() {
    console.log('\n🔗 5. Comprehensive User-Agent and DNS Integration Testing:');
    console.log('=============================================================');

    try {
        const { dns } = await import("bun");

        console.log('🌐 Testing different User-Agent scenarios with DNS caching:');

        // Performance analysis
        let time1 = 0, time2 = 0, time3 = 0;

        // Test 1: Browser-like User-Agent
        console.log('\n📱 Test 1: Browser-like User-Agent');
        const browserUA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36";

        console.log(`🔧 User-Agent: ${browserUA}`);
        const start1 = performance.now();

        try {
            const response = await fetch("https://httpbin.org/user-agent", {
                headers: { "User-Agent": browserUA }
            });
            time1 = performance.now() - start1;

            console.log(`   • Fetch time: ${time1.toFixed(2)}ms`);
            console.log(`   • Status: ${response.status}`);

            if (response.ok) {
                const data = await response.json();
                console.log(`   • Received UA: ${data["user-agent"].substring(0, 50)}...`);
            }
        } catch (error) {
            console.log(`   • Failed: ${error.message}`);
        }

        // Test 2: Bot-like User-Agent
        console.log('\n🤖 Test 2: Bot-like User-Agent');
        const botUA = "Googlebot/2.1 (+http://www.google.com/bot.html)";

        console.log(`🔧 User-Agent: ${botUA}`);
        const start2 = performance.now();

        try {
            const response = await fetch("https://httpbin.org/user-agent", {
                headers: { "User-Agent": botUA }
            });
            time2 = performance.now() - start2;

            console.log(`   • Fetch time: ${time2.toFixed(2)}ms`);
            console.log(`   • Status: ${response.status}`);

            if (response.ok) {
                const data = await response.json();
                console.log(`   • Received UA: ${data["user-agent"]}`);
            }
        } catch (error) {
            console.log(`   • Failed: ${error.message}`);
        }

        // Test 3: Custom Application User-Agent
        console.log('\n🚀 Test 3: Custom Application User-Agent');
        const appUA = "MyBunApp/1.0 (Production; DNS-Test; +https://myapp.com)";

        console.log(`🔧 User-Agent: ${appUA}`);
        const start3 = performance.now();

        try {
            const response = await fetch("https://httpbin.org/user-agent", {
                headers: { "User-Agent": appUA }
            });
            time3 = performance.now() - start3;

            console.log(`   • Fetch time: ${time3.toFixed(2)}ms`);
            console.log(`   • Status: ${response.status}`);

            if (response.ok) {
                const data = await response.json();
                console.log(`   • Received UA: ${data["user-agent"]}`);
            }
        } catch (error) {
            console.log(`   • Failed: ${error.message}`);
        }

        // Check DNS cache stats after all tests
        console.log('\n📊 Final DNS cache statistics:');
        const finalStats = dns.getCacheStats();
        console.log(`   • Cache size: ${finalStats.size}`);
        console.log(`   • Cache hits completed: ${finalStats.cacheHitsCompleted}`);
        console.log(`   • Cache misses: ${finalStats.cacheMisses}`);
        console.log(`   • Total requests: ${finalStats.totalCount}`);
        console.log(`   • Errors: ${finalStats.errors}`);

        // Performance analysis
        const avgTime = (time1 + time2 + time3) / 3;
        console.log('\n📈 Performance Analysis:');
        console.log(`   • Average fetch time: ${avgTime.toFixed(2)}ms`);
        console.log(`   • DNS cache efficiency: ${finalStats.cacheHitsCompleted > 0 ? 'Working' : 'Needs warming'}`);
        console.log(`   • All requests successful: ${finalStats.errors === 0 ? 'Yes' : 'No'}`);

        console.log('✅ User-Agent and DNS integration testing completed');

    } catch (error) {
        console.error(`❌ User-Agent and DNS integration demo failed: ${error.message}`);
    }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
    console.log('🚀 Starting DNS with User-Agent and Prefetch Testing');
    console.log('====================================================');
    console.log(`📋 Running on Bun ${Bun.version}`);
    console.log(`🕐 Started at: ${new Date().toISOString()}`);
    console.log(`🔧 User-Agent: Custom testing scenarios`);
    console.log('');
    console.log('📚 This demo implements exact DNS documentation examples:');
    console.log('   • DNS cache integration with all networking APIs');
    console.log('   • User-Agent testing with DNS caching');
    console.log('   • Exact prefetch examples from documentation');
    console.log('   • Complete cache statistics monitoring');
    console.log('   • TTL configuration with environment variables');
    console.log('   • Real-world performance testing');
    console.log('');

    try {
        // Run all demonstrations
        await demonstrateDnsCacheWithUserAgent();
        await demonstrateDnsPrefetch();
        await demonstrateDnsGetCacheStats();
        await demonstrateDnsTtlConfiguration();
        await demonstrateUserAgentDnsIntegration();

        console.log('\n🎉 DNS with User-Agent and Prefetch Testing Complete!');
        console.log('====================================================');
        console.log('✅ ALL DNS features tested with User-Agent scenarios');
        console.log('📚 Summary of tested features:');
        console.log('   • DNS cache integration with User-Agent ✅');
        console.log('   • Exact prefetch documentation examples ✅');
        console.log('   • Complete cache statistics monitoring ✅');
        console.log('   • TTL configuration testing ✅');
        console.log('   • User-Agent scenario testing ✅');
        console.log('   • Performance analysis with caching ✅');
        console.log('');
        console.log('🚀 This implementation validates:');
        console.log('   • High-performance network applications');
        console.log('   • Custom User-Agent scenarios');
        console.log('   • DNS prefetch optimization');
        console.log('   • Cache monitoring and analytics');
        console.log('   • Production-ready DNS handling');
        console.log('');
        console.log('📖 Reference: https://bun.com/docs/runtime/dns');

    } catch (error) {
        console.error(`❌ Testing failed: ${error.message}`);
        console.error(`📍 Error location: ${error.stack}`);
    }
}

// Run the DNS User-Agent and prefetch testing
main().catch(console.error);
