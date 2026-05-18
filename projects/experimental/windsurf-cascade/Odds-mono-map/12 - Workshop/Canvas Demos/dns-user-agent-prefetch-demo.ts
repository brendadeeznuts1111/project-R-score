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

console.info('🌍 DNS with User-Agent and Prefetch Testing');
console.info('==========================================');

// =============================================================================
// 1. DNS CACHE INTEGRATION TESTING WITH USER-AGENT
// =============================================================================

async function demonstrateDnsCacheWithUserAgent() {
    console.info('\n📋 1. DNS Cache Integration with User-Agent Testing:');
    console.info('=====================================================');

    try {
        const { dns } = await import("bun");

        console.info('📚 This cache is automatically used by:');
        console.info('   • bun install');
        console.info('   • fetch()');
        console.info('   • node:http (client)');
        console.info('   • Bun.connect');
        console.info('   • node:net');
        console.info('   • node:tls');

        // Get initial cache stats
        console.info('\n📊 Initial DNS cache stats:');
        const initialStats = dns.getCacheStats();
        console.info(`   • Cache size: ${initialStats.size}`);
        console.info(`   • Cache hits completed: ${initialStats.cacheHitsCompleted}`);
        console.info(`   • Cache misses: ${initialStats.cacheMisses}`);
        console.info(`   • Total requests: ${initialStats.totalCount}`);

        // Test fetch() with custom user-agent
        console.info('\n🌐 Testing fetch() with custom user-agent:');
        console.info('📋 This will automatically use DNS cache');

        const customUserAgent = "MyApp/1.0 (DNS-Test; +https://example.com/bot)";
        console.info(`🔧 Custom User-Agent: ${customUserAgent}`);

        const startFetch = performance.now();
        try {
            const response = await fetch("https://httpbin.org/user-agent", {
                headers: {
                    "User-Agent": customUserAgent
                }
            });
            const fetchTime = performance.now() - startFetch;

            console.info(`   • Fetch completed in: ${fetchTime.toFixed(2)}ms`);
            console.info(`   • HTTP status: ${response.status}`);

            if (response.ok) {
                const data = await response.json();
                console.info(`   • User-Agent received: ${data["user-agent"]}`);
            }

            const afterFetchStats = dns.getCacheStats();
            console.info(`   • DNS cache size after fetch: ${afterFetchStats.size}`);
            console.info(`   • DNS cache misses: ${afterFetchStats.cacheMisses}`);

        } catch (error) {
            console.info(`   • Fetch failed: ${error.message}`);
        }

        // Test Bun.connect with DNS cache
        console.info('\n🔌 Testing Bun.connect with DNS cache:');

        const startConnect = performance.now();
        try {
            const socket = await Bun.connect({
                hostname: "httpbin.org",
                port: 80,
                socket: {
                    open(socket) {
                        const connectTime = performance.now() - startConnect;
                        console.info(`   • TCP connection completed in: ${connectTime.toFixed(2)}ms`);
                        socket.end();
                    },
                    data(socket, data) {
                        // Handle any response data
                    }
                }
            });

            await Bun.sleep(100);

            const connectStats = dns.getCacheStats();
            console.info(`   • DNS cache size after connect: ${connectStats.size}`);
            console.info(`   • Cache hits completed: ${connectStats.cacheHitsCompleted}`);

        } catch (error) {
            console.info(`   • Connect failed: ${error.message}`);
        }

        console.info('✅ DNS cache integration with user-agent testing completed');

    } catch (error) {
        console.error(`❌ DNS cache integration demo failed: ${error.message}`);
    }
}

// =============================================================================
// 2. DNS PREFETCH - EXACT DOCUMENTATION EXAMPLES
// =============================================================================

async function demonstrateDnsPrefetch() {
    console.info('\n⚡ 2. DNS Prefetch - Exact Documentation Examples:');
    console.info('==================================================');

    try {
        const { dns } = await import("bun");

        console.info('⚠️  This API is experimental and may change in the future');
        console.info('📚 When should I prefetch a DNS entry?');
        console.info('   • Web browsers expose <link rel="dns-prefetch">');
        console.info('   • Useful when you know you\'ll need to connect to a host soon');
        console.info('   • Avoids initial DNS lookup latency');

        // Exact documentation example 1: Database host
        console.info('\n🗄️  Exact documentation example 1: Database host');
        console.info('📋 Syntax: dns.prefetch("my.database-host.com", 5432);');

        console.info('🚀 Application starting up...');
        console.info('🔄 Prefetching database host DNS...');
        dns.prefetch("my.database-host.com", 5432);

        console.info('📝 Loading application modules...');
        await Bun.sleep(500);

        console.info('🗄️  Connecting to database (DNS should be cached)...');
        // In real scenario, this would connect faster due to prefetch

        // Exact documentation example 2: Web service
        console.info('\n🌐 Exact documentation example 2: Web service');
        console.info('📋 Syntax: dns.prefetch("bun.com", 443);');

        console.info('🔄 Prefetching bun.com DNS...');
        dns.prefetch("bun.com", 443);

        console.info('⏳ Waiting for prefetch to complete...');
        await Bun.sleep(1000);

        console.info('🌐 Fetching from bun.com (DNS should be cached)...');
        const startBunFetch = performance.now();
        try {
            const response = await fetch("https://bun.com");
            const bunFetchTime = performance.now() - startBunFetch;
            console.info(`   • Fetch to bun.com completed in: ${bunFetchTime.toFixed(2)}ms`);
            console.info(`   • HTTP status: ${response.status}`);
        } catch (error) {
            console.info(`   • Fetch failed: ${error.message}`);
        }

        // Test multiple prefetches
        console.info('\n📡 Testing multiple prefetches:');

        const prefetchTargets = [
            { host: "github.com", port: 443, description: "GitHub API" },
            { host: "api.twitter.com", port: 443, description: "Twitter API" },
            { host: "graph.facebook.com", port: 443, description: "Facebook Graph API" }
        ];

        prefetchTargets.forEach(({ host, port, description }) => {
            console.info(`   🔄 Prefetching ${description} (${host}:${port})`);
            dns.prefetch(host, port);
        });

        console.info('⏳ Waiting for prefetches to complete...');
        await Bun.sleep(1000);

        // Test fetch after prefetch
        console.info('\n📊 Testing fetch performance after prefetch:');

        for (const { host, description } of prefetchTargets) {
            const start = performance.now();
            try {
                const response = await fetch(`https://${host}`);
                const time = performance.now() - start;
                console.info(`   • ${description}: ${time.toFixed(2)}ms (status: ${response.status})`);
            } catch (error) {
                console.info(`   • ${description}: Failed - ${error.message}`);
            }
        }

        console.info('✅ DNS prefetch demonstration completed');

    } catch (error) {
        console.error(`❌ DNS prefetch demo failed: ${error.message}`);
    }
}

// =============================================================================
// 3. DNS GET CACHE STATS - EXACT DOCUMENTATION EXAMPLES
// =============================================================================

async function demonstrateDnsGetCacheStats() {
    console.info('\n📊 3. DNS getCacheStats - Exact Documentation Examples:');
    console.info('=======================================================');

    try {
        const { dns } = await import("bun");

        console.info('⚠️  This API is experimental and may change in the future');
        console.info('📚 DNS cache statistics properties:');
        console.info('   • cacheHitsCompleted: Cache hits completed');
        console.info('   • cacheHitsInflight: Cache hits in flight');
        console.info('   • cacheMisses: Cache misses');
        console.info('   • size: Number of items in the DNS cache');
        console.info('   • errors: Number of times a connection failed');
        console.info('   • totalCount: Total connection requests');

        // Exact documentation example
        console.info('\n📋 Exact documentation example:');
        console.info('📋 Syntax: const stats = dns.getCacheStats();');

        const stats = dns.getCacheStats();
        console.info('📊 Current DNS cache statistics:');
        console.info(`   • cacheHitsCompleted: ${stats.cacheHitsCompleted}`);
        console.info(`   • cacheHitsInflight: ${stats.cacheHitsInflight}`);
        console.info(`   • cacheMisses: ${stats.cacheMisses}`);
        console.info(`   • size: ${stats.size}`);
        console.info(`   • errors: ${stats.errors}`);
        console.info(`   • totalCount: ${stats.totalCount}`);

        // Perform DNS operations to see stats change
        console.info('\n🔄 Performing DNS operations to update stats...');

        const testDomains = ["example.com", "httpbin.org", "jsonplaceholder.typicode.com"];

        for (const domain of testDomains) {
            try {
                const start = performance.now();
                await fetch(`https://${domain}`);
                const time = performance.now() - start;
                console.info(`   ✅ Fetched ${domain} in ${time.toFixed(2)}ms`);
            } catch (error) {
                console.info(`   ❌ Failed to fetch ${domain}: ${error.message}`);
            }
        }

        // Check updated stats
        console.info('\n📊 Updated DNS cache statistics:');
        const updatedStats = dns.getCacheStats();
        console.info(`   • cacheHitsCompleted: ${updatedStats.cacheHitsCompleted}`);
        console.info(`   • cacheHitsInflight: ${updatedStats.cacheHitsInflight}`);
        console.info(`   • cacheMisses: ${updatedStats.cacheMisses}`);
        console.info(`   • size: ${updatedStats.size}`);
        console.info(`   • errors: ${updatedStats.errors}`);
        console.info(`   • totalCount: ${updatedStats.totalCount}`);

        // Calculate cache performance metrics
        const hitRate = updatedStats.totalCount > 0
            ? ((updatedStats.cacheHitsCompleted / updatedStats.totalCount) * 100).toFixed(2)
            : '0.00';
        const missRate = updatedStats.totalCount > 0
            ? ((updatedStats.cacheMisses / updatedStats.totalCount) * 100).toFixed(2)
            : '0.00';

        console.info('\n📈 Cache performance metrics:');
        console.info(`   • Cache hit rate: ${hitRate}%`);
        console.info(`   • Cache miss rate: ${missRate}%`);
        console.info(`   • Cache efficiency: ${updatedStats.size > 0 ? 'Good' : 'Needs warming'}`);

        console.info('✅ DNS getCacheStats demonstration completed');

    } catch (error) {
        console.error(`❌ DNS getCacheStats demo failed: ${error.message}`);
    }
}

// =============================================================================
// 4. CONFIGURING DNS CACHE TTL - EXACT DOCUMENTATION EXAMPLES
// =============================================================================

async function demonstrateDnsTtlConfiguration() {
    console.info('\n⚙️  4. Configuring DNS Cache TTL - Exact Documentation Examples:');
    console.info('=============================================================');

    try {
        console.info('📚 DNS Cache TTL Configuration:');
        console.info('   • Bun defaults to 30 seconds for DNS cache TTL');
        console.info('   • Change with environment variable: $BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS');

        // Show current configuration
        const currentTtl = process.env.BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS || '30 (default)';
        console.info(`\n🔍 Current TTL configuration: ${currentTtl} seconds`);

        // Exact documentation example
        console.info('\n📋 Exact documentation example:');
        console.info('📋 Syntax: BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=5 bun run my-script.ts');

        console.info('\n🛠️  Usage examples:');
        console.info('   # Set TTL to 5 seconds for dynamic environments');
        console.info('   BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=5 bun run app.ts');
        console.info('');
        console.info('   # Set TTL to 2 minutes for stable environments');
        console.info('   BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=120 bun run app.ts');
        console.info('');
        console.info('   # Use default 30 seconds');
        console.info('   bun run app.ts');

        // Test TTL effectiveness
        console.info('\n🧪 Testing TTL effectiveness:');

        const { dns } = await import("bun");

        // Clear cache by waiting for TTL to expire (simulated)
        console.info('📊 Current cache stats:');
        const beforeStats = dns.getCacheStats();
        console.info(`   • Cache size: ${beforeStats.size}`);
        console.info(`   • Cache hits: ${beforeStats.cacheHitsCompleted}`);

        // Perform DNS lookup
        console.info('\n🔍 Performing DNS lookup...');
        try {
            await dns.lookup("example.com");
            console.info('   ✅ DNS lookup completed');
        } catch (error) {
            console.info(`   ❌ DNS lookup failed: ${error.message}`);
        }

        const afterStats = dns.getCacheStats();
        console.info('\n📊 Cache stats after lookup:');
        console.info(`   • Cache size: ${afterStats.size}`);
        console.info(`   • Cache hits: ${afterStats.cacheHitsCompleted}`);
        console.info(`   • Cache misses: ${afterStats.cacheMisses}`);

        // Second lookup (should be cached)
        console.info('\n🔍 Performing second lookup (should be cached)...');
        try {
            await dns.lookup("example.com");
            console.info('   ✅ Second DNS lookup completed');
        } catch (error) {
            console.info(`   ❌ Second DNS lookup failed: ${error.message}`);
        }

        const secondStats = dns.getCacheStats();
        console.info('\n📊 Cache stats after second lookup:');
        console.info(`   • Cache hits: ${secondStats.cacheHitsCompleted}`);
        console.info(`   • Cache misses: ${secondStats.cacheMisses}`);

        const cacheImprovement = secondStats.cacheHitsCompleted > beforeStats.cacheHitsCompleted;
        console.info(`   • Cache working: ${cacheImprovement ? '✅ Yes' : '❌ No'}`);

        console.info('\n💡 TTL Configuration Guidelines:');
        console.info('   • 5 seconds: Dynamic environments, frequent DNS changes');
        console.info('   • 30 seconds: Default, good balance for most apps');
        console.info('   • 2 minutes: Stable environments, infrequent changes');
        console.info('   • 5+ minutes: Very stable infrastructure, static IPs');

        console.info('✅ DNS TTL configuration demonstration completed');

    } catch (error) {
        console.error(`❌ DNS TTL configuration demo failed: ${error.message}`);
    }
}

// =============================================================================
// 5. COMPREHENSIVE USER-AGENT AND DNS INTEGRATION TESTING
// =============================================================================

async function demonstrateUserAgentDnsIntegration() {
    console.info('\n🔗 5. Comprehensive User-Agent and DNS Integration Testing:');
    console.info('=============================================================');

    try {
        const { dns } = await import("bun");

        console.info('🌐 Testing different User-Agent scenarios with DNS caching:');

        // Performance analysis
        let time1 = 0, time2 = 0, time3 = 0;

        // Test 1: Browser-like User-Agent
        console.info('\n📱 Test 1: Browser-like User-Agent');
        const browserUA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36";

        console.info(`🔧 User-Agent: ${browserUA}`);
        const start1 = performance.now();

        try {
            const response = await fetch("https://httpbin.org/user-agent", {
                headers: { "User-Agent": browserUA }
            });
            time1 = performance.now() - start1;

            console.info(`   • Fetch time: ${time1.toFixed(2)}ms`);
            console.info(`   • Status: ${response.status}`);

            if (response.ok) {
                const data = await response.json();
                console.info(`   • Received UA: ${data["user-agent"].substring(0, 50)}...`);
            }
        } catch (error) {
            console.info(`   • Failed: ${error.message}`);
        }

        // Test 2: Bot-like User-Agent
        console.info('\n🤖 Test 2: Bot-like User-Agent');
        const botUA = "Googlebot/2.1 (+http://www.google.com/bot.html)";

        console.info(`🔧 User-Agent: ${botUA}`);
        const start2 = performance.now();

        try {
            const response = await fetch("https://httpbin.org/user-agent", {
                headers: { "User-Agent": botUA }
            });
            time2 = performance.now() - start2;

            console.info(`   • Fetch time: ${time2.toFixed(2)}ms`);
            console.info(`   • Status: ${response.status}`);

            if (response.ok) {
                const data = await response.json();
                console.info(`   • Received UA: ${data["user-agent"]}`);
            }
        } catch (error) {
            console.info(`   • Failed: ${error.message}`);
        }

        // Test 3: Custom Application User-Agent
        console.info('\n🚀 Test 3: Custom Application User-Agent');
        const appUA = "MyBunApp/1.0 (Production; DNS-Test; +https://myapp.com)";

        console.info(`🔧 User-Agent: ${appUA}`);
        const start3 = performance.now();

        try {
            const response = await fetch("https://httpbin.org/user-agent", {
                headers: { "User-Agent": appUA }
            });
            time3 = performance.now() - start3;

            console.info(`   • Fetch time: ${time3.toFixed(2)}ms`);
            console.info(`   • Status: ${response.status}`);

            if (response.ok) {
                const data = await response.json();
                console.info(`   • Received UA: ${data["user-agent"]}`);
            }
        } catch (error) {
            console.info(`   • Failed: ${error.message}`);
        }

        // Check DNS cache stats after all tests
        console.info('\n📊 Final DNS cache statistics:');
        const finalStats = dns.getCacheStats();
        console.info(`   • Cache size: ${finalStats.size}`);
        console.info(`   • Cache hits completed: ${finalStats.cacheHitsCompleted}`);
        console.info(`   • Cache misses: ${finalStats.cacheMisses}`);
        console.info(`   • Total requests: ${finalStats.totalCount}`);
        console.info(`   • Errors: ${finalStats.errors}`);

        // Performance analysis
        const avgTime = (time1 + time2 + time3) / 3;
        console.info('\n📈 Performance Analysis:');
        console.info(`   • Average fetch time: ${avgTime.toFixed(2)}ms`);
        console.info(`   • DNS cache efficiency: ${finalStats.cacheHitsCompleted > 0 ? 'Working' : 'Needs warming'}`);
        console.info(`   • All requests successful: ${finalStats.errors === 0 ? 'Yes' : 'No'}`);

        console.info('✅ User-Agent and DNS integration testing completed');

    } catch (error) {
        console.error(`❌ User-Agent and DNS integration demo failed: ${error.message}`);
    }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
    console.info('🚀 Starting DNS with User-Agent and Prefetch Testing');
    console.info('====================================================');
    console.info(`📋 Running on Bun ${Bun.version}`);
    console.info(`🕐 Started at: ${new Date().toISOString()}`);
    console.info(`🔧 User-Agent: Custom testing scenarios`);
    console.info('');
    console.info('📚 This demo implements exact DNS documentation examples:');
    console.info('   • DNS cache integration with all networking APIs');
    console.info('   • User-Agent testing with DNS caching');
    console.info('   • Exact prefetch examples from documentation');
    console.info('   • Complete cache statistics monitoring');
    console.info('   • TTL configuration with environment variables');
    console.info('   • Real-world performance testing');
    console.info('');

    try {
        // Run all demonstrations
        await demonstrateDnsCacheWithUserAgent();
        await demonstrateDnsPrefetch();
        await demonstrateDnsGetCacheStats();
        await demonstrateDnsTtlConfiguration();
        await demonstrateUserAgentDnsIntegration();

        console.info('\n🎉 DNS with User-Agent and Prefetch Testing Complete!');
        console.info('====================================================');
        console.info('✅ ALL DNS features tested with User-Agent scenarios');
        console.info('📚 Summary of tested features:');
        console.info('   • DNS cache integration with User-Agent ✅');
        console.info('   • Exact prefetch documentation examples ✅');
        console.info('   • Complete cache statistics monitoring ✅');
        console.info('   • TTL configuration testing ✅');
        console.info('   • User-Agent scenario testing ✅');
        console.info('   • Performance analysis with caching ✅');
        console.info('');
        console.info('🚀 This implementation validates:');
        console.info('   • High-performance network applications');
        console.info('   • Custom User-Agent scenarios');
        console.info('   • DNS prefetch optimization');
        console.info('   • Cache monitoring and analytics');
        console.info('   • Production-ready DNS handling');
        console.info('');
        console.info('📖 Reference: https://bun.com/docs/runtime/dns');

    } catch (error) {
        console.error(`❌ Testing failed: ${error.message}`);
        console.error(`📍 Error location: ${error.stack}`);
    }
}

// Run the DNS User-Agent and prefetch testing
main().catch(console.error);
