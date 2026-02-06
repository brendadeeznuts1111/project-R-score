/**
 * Enhanced RSC Handler with Official Bun Performance Features
 *
 * Incorporates DNS prefetching, preconnect, and other official Bun
 * optimizations validated by the official documentation.
 *
 * @see {@link https://bun.sh/docs/runtime/networking/fetch} Official fetch documentation
 */

import { dns, fetch } from 'bun';

import { ProductionRSCRequest, ProductionRSCResponse } from './rsc-production';

export interface EnhancedRSCRequest extends ProductionRSCRequest {
  prefetch?: boolean;
  preconnect?: boolean;
  dnsPrefetch?: boolean;
}

export interface EnhancedRSCResponse extends ProductionRSCResponse {
  dnsPrefetched?: boolean;
  preconnected?: boolean;
  optimization?: string[];
}

/**
 * Enhanced RSC handler with official Bun performance optimizations
 */
export class EnhancedRSCHandler {
  private prefetchedHosts = new Set<string>();
  private preconnectedHosts = new Set<string>();
  private dnsCache = new Map<string, number>();
  private dnsCacheExpiry = 5 * 60 * 1000; // 5 minutes

  /**
   * Prefetch DNS for multiple hosts
   */
  async prefetchDNS(hosts: string[]): Promise<void> {
    console.log(`🌐 Prefetching DNS for ${hosts.length} hosts...`);

    const startTime = performance.now();

    try {
      await Promise.all(
        hosts.map(host => {
          if (!this.prefetchedHosts.has(host)) {
            this.prefetchedHosts.add(host);
            return dns.prefetch(host);
          }
        })
      );

      const endTime = performance.now();
      console.log(`✅ DNS prefetch completed in ${(endTime - startTime).toFixed(2)}ms`);

      // Update cache timestamps
      hosts.forEach(host => {
        this.dnsCache.set(host, Date.now());
      });
    } catch (error) {
      console.warn('⚠️ DNS prefetch failed:', error);
    }
  }

  /**
   * Preconnect to hosts for faster TCP connection establishment
   */
  async preconnectHosts(hosts: string[]): Promise<void> {
    console.log(`🔗 Preconnecting to ${hosts.length} hosts...`);

    const startTime = performance.now();

    try {
      await Promise.all(
        hosts.map(host => {
          if (!this.preconnectedHosts.has(host)) {
            this.preconnectedHosts.add(host);
            // Ensure host has protocol for preconnect
            const preconnectUrl = host.startsWith('http') ? host : `https://${host}`;
            return fetch.preconnect(preconnectUrl);
          }
        })
      );

      const endTime = performance.now();
      console.log(`✅ Preconnect completed in ${(endTime - startTime).toFixed(2)}ms`);
    } catch (error) {
      console.warn('⚠️ Preconnect failed:', error);
    }
  }

  /**
   * Extract unique hosts from URLs
   */
  private extractHosts(urls: string[]): string[] {
    const hosts = new Set<string>();

    urls.forEach(url => {
      try {
        const hostname = new URL(url.startsWith('http') ? url : `https://bun.sh${url}`).hostname;
        hosts.add(hostname);
      } catch {
        // Invalid URL, skip
      }
    });

    return Array.from(hosts);
  }

  /**
   * Check if DNS cache is fresh
   */
  private isDNSCacheFresh(host: string): boolean {
    const timestamp = this.dnsCache.get(host);
    return timestamp ? Date.now() - timestamp < this.dnsCacheExpiry : false;
  }

  /**
   * Enhanced fetch with optimizations
   */
  async fetchRSC(request: EnhancedRSCRequest): Promise<EnhancedRSCResponse> {
    const startTime = performance.now();
    const optimizations: string[] = [];

    // Build URL
    const fullUrl = request.url.startsWith('http') ? request.url : `https://bun.sh${request.url}`;
    const url = new URL(fullUrl);

    // Add query parameters
    if (request.rscKey) {
      url.searchParams.set('_rsc', request.rscKey);
    }

    // DNS prefetch if requested
    if (request.dnsPrefetch && !this.isDNSCacheFresh(url.hostname)) {
      await this.prefetchDNS([url.hostname]);
      optimizations.push('dns-prefetch');
    }

    // Preconnect if requested
    if (request.preconnect && !this.preconnectedHosts.has(url.hostname)) {
      await this.preconnectHosts([url.hostname]);
      optimizations.push('preconnect');
    }

    // Build headers
    const headers = {
      accept: '*/*',
      'content-type': 'text/x-component',
      rsc: '1',
      ...request.headers,
    };

    // Add prefetch header if requested
    if (request.prefetch) {
      headers['next-router-prefetch'] = '1';
      optimizations.push('prefetch-header');
    }

    try {
      const response = await fetch(url.toString(), { headers });
      const endTime = performance.now();

      return {
        url: url.toString(),
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: response.body,
        ok: response.ok,
        rscKey: request.rscKey,
        latency: endTime - startTime,
        dnsPrefetched: this.prefetchedHosts.has(url.hostname),
        preconnected: this.preconnectedHosts.has(url.hostname),
        optimization: optimizations,
      };
    } catch (error) {
      const endTime = performance.now();

      return {
        url: url.toString(),
        status: 0,
        headers: {},
        body: null,
        ok: false,
        rscKey: request.rscKey,
        latency: endTime - startTime,
        optimization: optimizations,
        error: error instanceof Error ? error.message : String(error),
      } as EnhancedRSCResponse & { error: string };
    }
  }

  /**
   * Enhanced batch fetch with full optimization pipeline
   */
  async fetchBatch(requests: EnhancedRSCRequest[]): Promise<EnhancedRSCResponse[]> {
    if (requests.length === 0) return [];

    console.log(`🚀 Enhanced RSC Batch: ${requests.length} requests with optimizations`);

    const startTime = performance.now();

    // Extract hosts for optimization
    const urls = requests.map(req =>
      req.url.startsWith('http') ? req.url : `https://bun.sh${req.url}`
    );
    const hosts = this.extractHosts(urls);

    // Apply optimizations based on request settings
    const shouldPrefetchDNS = requests.some(req => req.dnsPrefetch);
    const shouldPreconnect = requests.some(req => req.preconnect);

    if (shouldPrefetchDNS) {
      const freshHosts = hosts.filter(host => !this.isDNSCacheFresh(host));
      if (freshHosts.length > 0) {
        await this.prefetchDNS(freshHosts);
      }
    }

    if (shouldPreconnect) {
      const unconnectedHosts = hosts.filter(host => !this.preconnectedHosts.has(host));
      if (unconnectedHosts.length > 0) {
        await this.preconnectHosts(unconnectedHosts);
      }
    }

    // Execute all requests in parallel
    const promises = requests.map(request => this.fetchRSC(request));
    const responses = await Promise.all(promises);

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Log results
    const successful = responses.filter(r => r.ok);
    const optimized = responses.filter(r => r.optimization && r.optimization.length > 0);

    console.log(`📊 Enhanced Batch Results:`);
    console.log(`  Total: ${responses.length}`);
    console.log(`  Successful: ${successful.length}`);
    console.log(`  Optimized: ${optimized.length}`);
    console.log(`  Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`  Avg Latency: ${(totalTime / responses.length).toFixed(2)}ms`);

    // Show optimization breakdown
    const optimizationStats = new Map<string, number>();
    responses.forEach(response => {
      if (response.optimization) {
        response.optimization.forEach(opt => {
          optimizationStats.set(opt, (optimizationStats.get(opt) || 0) + 1);
        });
      }
    });

    if (optimizationStats.size > 0) {
      console.log(`  Optimizations:`);
      optimizationStats.forEach((count, opt) => {
        console.log(`    ${opt}: ${count} requests`);
      });
    }

    return responses;
  }

  /**
   * Smart optimization - automatically applies best optimizations
   */
  async smartFetchBatch(requests: EnhancedRSCRequest[]): Promise<EnhancedRSCResponse[]> {
    // Auto-enable optimizations based on request count and patterns
    const enhancedRequests = requests.map((req, index) => ({
      ...req,
      // DNS prefetch for first few requests to warm up
      dnsPrefetch: index < 3,
      // Preconnect for larger batches
      preconnect: requests.length > 5,
      // Always add prefetch header for RSC
      prefetch: true,
    }));

    return await this.fetchBatch(enhancedRequests);
  }

  /**
   * Get optimization statistics
   */
  getOptimizationStats() {
    return {
      dnsPrefetchedHosts: this.prefetchedHosts.size,
      preconnectedHosts: this.preconnectedHosts.size,
      dnsCacheSize: this.dnsCache.size,
      freshDNSCache: Array.from(this.dnsCache.entries()).filter(
        ([, timestamp]) => Date.now() - timestamp < this.dnsCacheExpiry
      ).length,
      optimizations: {
        dnsPrefetch: this.prefetchedHosts.size,
        preconnect: this.preconnectedHosts.size,
        prefetchHeader: 'Available for all RSC requests',
      },
    };
  }

  /**
   * Clear optimization caches
   */
  clearCaches(): void {
    this.prefetchedHosts.clear();
    this.preconnectedHosts.clear();
    this.dnsCache.clear();
    console.log('🧹 Optimization caches cleared');
  }
}

// Singleton instance
export const enhancedRSC = new EnhancedRSCHandler();

// Convenience functions
export async function fetchEnhancedRSC(request: EnhancedRSCRequest): Promise<EnhancedRSCResponse> {
  return await enhancedRSC.fetchRSC(request);
}

export async function fetchEnhancedBatch(
  requests: EnhancedRSCRequest[]
): Promise<EnhancedRSCResponse[]> {
  return await enhancedRSC.fetchBatch(requests);
}

export async function fetchSmartBatch(
  requests: EnhancedRSCRequest[]
): Promise<EnhancedRSCResponse[]> {
  return await enhancedRSC.smartFetchBatch(requests);
}

// Quick enhanced fetch with auto-optimizations
export async function quickEnhancedFetch(urls: string[]): Promise<EnhancedRSCResponse[]> {
  const requests = urls.map((url, index) => ({
    url,
    rscKey: 'enhanced',
    dnsPrefetch: index < 3, // First 3 get DNS prefetch
    preconnect: urls.length > 5, // Preconnect for larger batches
    prefetch: true,
  }));

  return await enhancedRSC.smartFetchBatch(requests);
}

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */
