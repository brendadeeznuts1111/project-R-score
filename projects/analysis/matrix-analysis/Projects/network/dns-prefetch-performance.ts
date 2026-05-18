/**
 * DNS Prefetch Performance Tracking
 * Measures the performance benefit of DNS prefetching in Bun
 * 
 * DNS Configuration:
 * - Set DNS cache TTL via: BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS
 * - Default: 30 seconds (Bun's default)
 * - Example: BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS=5 bun dns-prefetch-performance.ts
 * - Note: getaddrinfo doesn't provide TTL, so Bun uses a configurable cache duration
 */

import { dns } from "bun";

/**
 * DNS Cache Statistics from Bun
 */
interface DNSCacheStats {
  cacheHitsCompleted: number; // Cache hits completed
  cacheHitsInflight: number; // Cache hits in flight
  cacheMisses: number; // Cache misses
  size: number; // Number of items in the DNS cache
  errors: number; // Number of times a connection failed
  totalCount: number; // Number of times a connection was requested at all (including cache hits and misses)
}

// Simple metrics collector (Bun doesn't have built-in metrics API)
class MetricsCollector {
  private gauges = new Map<string, number>();
  private counters = new Map<string, number>();

  gauge(name: string, value: number): void {
    this.gauges.set(name, value);
    console.info(`📊 [METRIC] ${name} = ${value.toFixed(2)}`);
  }

  counter(name: string, value: number = 1): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
    console.info(`📈 [COUNTER] ${name} = ${this.counters.get(name)}`);
  }

  getGauge(name: string): number | undefined {
    return this.gauges.get(name);
  }

  getCounter(name: string): number | undefined {
    return this.counters.get(name);
  }

  getAllMetrics(): { gauges: Record<string, number>; counters: Record<string, number> } {
    return {
      gauges: Object.fromEntries(this.gauges),
      counters: Object.fromEntries(this.counters),
    };
  }
}

// Create metrics instance
const metrics = new MetricsCollector();

/**
 * Track DNS prefetch performance
 * Measures the improvement from prefetching DNS before making requests
 */
async function trackDNSPerformance(host: string = "api.example.com", port: number = 443) {
  console.info(`\n🔍 DNS Performance Tracking for ${host}:${port}`);
  console.info("=".repeat(60));

  // Check if dns API is available
  if (!dns) {
    console.error("❌ Bun dns API not available");
    return;
  }

  // Display DNS configuration
  const configuredTtl = process.env.BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS
    ? parseInt(process.env.BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS, 10)
    : null;
  const ttlDisplay = configuredTtl 
    ? `${configuredTtl}s (configured via BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS)` 
    : `30s (default - set BUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS to customize)`;
  console.info(`\n⚙️  DNS Cache TTL: ${ttlDisplay}`);

  // Get initial DNS cache stats
  const initialStats = dns.getCacheStats?.() as DNSCacheStats | null;
  
  if (initialStats) {
    console.info(`\n📊 Initial DNS Cache Stats:`);
    console.info(`   Cache Size: ${initialStats.size} entries`);
    console.info(`   Total Requests: ${initialStats.totalCount}`);
    console.info(`   Cache Hits: ${initialStats.cacheHitsCompleted}`);
    console.info(`   Cache Misses: ${initialStats.cacheMisses}`);
  }

  // Test 1: Measure without prefetch
  console.info(`\n1️⃣  Testing WITHOUT DNS prefetch...`);
  const start1 = performance.now();
  
  try {
    const response1 = await fetch(`https://${host}/test`, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    await response1.text(); // Consume response
  } catch (error: any) {
    // Expected if endpoint doesn't exist - we're just measuring DNS time
    if (error.name !== "AbortError") {
      console.info(`   ⚠️  Request failed (expected): ${error.message}`);
    }
  }
  
  const withoutPrefetch = performance.now() - start1;
  console.info(`   ⏱️  Time: ${withoutPrefetch.toFixed(2)}ms`);

  // Small delay to ensure DNS cache is ready
  await new Promise(resolve => setTimeout(resolve, 100));

  // Test 2: Prefetch DNS, then measure
  console.info(`\n2️⃣  Prefetching DNS for ${host}:${port}...`);
  
  try {
      // Use dns.prefetch() - the correct API
      dns.prefetch(host, port);
      console.info(`   ✅ DNS prefetch initiated`);
      
      // Wait a bit for prefetch to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Check cache stats after prefetch
      const afterPrefetchStats = dns.getCacheStats?.() as {
        cacheHitsCompleted: number;
        cacheHitsInflight: number;
        cacheMisses: number;
        size: number;
        errors: number;
        totalCount: number;
      } | null;
      
      if (afterPrefetchStats) {
        console.info(`   📊 DNS Cache Stats after prefetch:`);
        console.info(`      Cache Size: ${afterPrefetchStats.size} entries`);
        console.info(`      Total Requests: ${afterPrefetchStats.totalCount}`);
      }
  } catch (error: any) {
    console.info(`   ⚠️  Prefetch failed: ${error.message}`);
  }

  // Test 3: Measure with prefetch
  console.info(`\n3️⃣  Testing WITH DNS prefetch...`);
  const start2 = performance.now();
  
  try {
    const response2 = await fetch(`https://${host}/test`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    await response2.text();
  } catch (error: any) {
    if (error.name !== "AbortError") {
      console.info(`   ⚠️  Request failed (expected): ${error.message}`);
    }
  }
  
  const withPrefetch = performance.now() - start2;
  console.info(`   ⏱️  Time: ${withPrefetch.toFixed(2)}ms`);

  // Calculate improvement
  const improvement = withoutPrefetch - withPrefetch;
  const improvementPercent = withoutPrefetch > 0 
    ? ((improvement / withoutPrefetch) * 100).toFixed(1)
    : "0.0";

  console.info(`\n📈 Results:`);
  console.info(`   Without prefetch: ${withoutPrefetch.toFixed(2)}ms`);
  console.info(`   With prefetch:    ${withPrefetch.toFixed(2)}ms`);
  console.info(`   Improvement:     ${improvement.toFixed(2)}ms (${improvementPercent}% faster)`);

  // Send to metrics system
  metrics.gauge("dns.prefetch.benefit_ms", improvement);
  metrics.gauge("dns.prefetch.time_without_ms", withoutPrefetch);
  metrics.gauge("dns.prefetch.time_with_ms", withPrefetch);
  metrics.counter("dns.prefetch.tests_run");

  // Additional DNS cache statistics
  const finalStats = dns.getCacheStats?.() as DNSCacheStats | null;
  
  if (finalStats) {
    console.info(`\n📊 Final DNS Cache Stats:`);
    console.info(`   Cache Hits (Completed): ${finalStats.cacheHitsCompleted}`);
    console.info(`   Cache Hits (In Flight): ${finalStats.cacheHitsInflight}`);
    console.info(`   Cache Misses: ${finalStats.cacheMisses}`);
    console.info(`   Cache Size: ${finalStats.size} entries`);
    console.info(`   Errors: ${finalStats.errors}`);
    console.info(`   Total Requests: ${finalStats.totalCount}`);
    
    // Calculate hit rate
    const totalHits = finalStats.cacheHitsCompleted + finalStats.cacheHitsInflight;
    const totalRequests = finalStats.totalCount;
    
    if (totalRequests > 0) {
      const hitRate = ((totalHits / totalRequests) * 100).toFixed(1);
      console.info(`   Cache Hit Rate: ${hitRate}%`);
      metrics.gauge("dns.cache.hit_rate_percent", parseFloat(hitRate));
    }
    
    // Send individual metrics
    metrics.gauge("dns.cache.hits_completed", finalStats.cacheHitsCompleted);
    metrics.gauge("dns.cache.hits_inflight", finalStats.cacheHitsInflight);
    metrics.gauge("dns.cache.misses", finalStats.cacheMisses);
    metrics.gauge("dns.cache.size", finalStats.size);
    metrics.gauge("dns.cache.errors", finalStats.errors);
    metrics.gauge("dns.cache.total_count", finalStats.totalCount);
  }

  return {
    withoutPrefetch,
    withPrefetch,
    improvement,
    improvementPercent: parseFloat(improvementPercent),
  };
}

/**
 * Advanced: Test multiple hosts in parallel
 */
async function trackMultipleHosts(hosts: string[] = [
  "api.github.com",
  "registry.npmjs.org",
  "bun.sh",
]) {
  console.info(`\n🌐 Testing DNS Prefetch for Multiple Hosts`);
  console.info("=".repeat(60));

  const results: Array<{ host: string; improvement: number }> = [];

  for (const host of hosts) {
    console.info(`\n📡 Testing ${host}...`);
    
    try {
      // Prefetch all hosts in parallel
      dns.prefetch(host, 443);
    } catch (error: any) {
      console.info(`   ⚠️  Prefetch failed: ${error.message}`);
    }
  }

  // Wait for all prefetches to complete
  await new Promise(resolve => setTimeout(resolve, 200));

  // Measure fetch times
  const fetchPromises = hosts.map(async (host) => {
    const start = performance.now();
    try {
      await fetch(`https://${host}`, {
        method: "HEAD",
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      // Ignore errors - we're just measuring DNS
    }
    return { host, time: performance.now() - start };
  });

  const fetchResults = await Promise.all(fetchPromises);
  
  console.info(`\n📊 Results:`);
  fetchResults.forEach(({ host, time }) => {
    console.info(`   ${host}: ${time.toFixed(2)}ms`);
    results.push({ host, improvement: time });
  });

  // Calculate average improvement
  const avgTime = fetchResults.reduce((sum, r) => sum + r.time, 0) / fetchResults.length;
  metrics.gauge("dns.prefetch.avg_time_ms", avgTime);
  metrics.counter("dns.prefetch.multi_host_tests", hosts.length);

  return results;
}

/**
 * Clear DNS cache (workaround since Bun doesn't expose this directly)
 * Note: This is a workaround - Bun's DNS cache is internal
 */
async function clearDNSCacheWorkaround() {
  console.info(`\n🧹 Attempting to clear DNS cache...`);
  
  // Bun doesn't expose DNS cache clearing directly
  // The cache has a TTL and will expire naturally
  // For testing, we can wait or use different hosts
  
  console.info(`   ℹ️  Bun's DNS cache uses TTL-based expiration`);
  console.info(`   ℹ️  Cache will clear automatically after TTL expires`);
  console.info(`   ℹ️  For accurate tests, use different hostnames or wait for TTL`);
  
  // Alternative: Use a unique subdomain to bypass cache
  const uniqueHost = `test-${Date.now()}.example.com`;
  console.info(`   💡 Tip: Use unique hostnames like: ${uniqueHost}`);
}

// Main execution
if (import.meta.main) {
  console.info("🚀 DNS Prefetch Performance Tracker\n");

  // Test single host
  await trackDNSPerformance("api.example.com", 443);

  // Test multiple hosts
  await trackMultipleHosts();

  // Show all metrics
  console.info(`\n📊 All Metrics:`);
  console.info(JSON.stringify(metrics.getAllMetrics(), null, 2));

  // Cache clearing info
  await clearDNSCacheWorkaround();
}

export { trackDNSPerformance, trackMultipleHosts, metrics, MetricsCollector };
