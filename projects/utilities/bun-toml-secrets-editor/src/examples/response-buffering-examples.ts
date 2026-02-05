import { optimizedFetch, streamingFetch, parallelFetch, CachedFetcher, downloadWithProgress, preconnectHosts } from '../utils/response-buffering';

/**
 * Example usage of response buffering strategies in bun-toml-secrets-editor
 */

// Example 1: Basic optimized fetch
export async function fetchConfig(url: string) {
  try {
    const result = await optimizedFetch<any>(url, {
      timeout: 10000,
      maxRetries: 2
    });
    
    console.log(`Config fetched: ${result.size} bytes, status: ${result.status}`);
    return result.data;
  } catch (error) {
    console.error('Failed to fetch config:', error);
    throw error;
  }
}

// Example 2: Streaming large TOML files
export async function processLargeToml(url: string, processor: (chunk: string) => void) {
  let buffer = '';
  
  await streamingFetch(url, (chunk) => {
    buffer += new TextDecoder().decode(chunk);
    
    // Process complete lines
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer
    
    lines.forEach(processor);
  });
  
  // Process remaining buffer
  if (buffer.trim()) {
    processor(buffer);
  }
}

// Example 3: Parallel API calls for dashboard data
export async function fetchDashboardData(apis: { name: string; url: string }[]) {
  const urls = apis.map(api => api.url);
  
  try {
    const results = await parallelFetch(urls, {
      timeout: 15000,
      maxRetries: 1
    }, 5); // Limit to 5 concurrent requests
    
    return apis.map((api, index) => ({
      name: api.name,
      data: results[index].data,
      cached: results[index].cached,
      size: results[index].size
    }));
  } catch (error) {
    console.error('Dashboard data fetch failed:', error);
    throw error;
  }
}

// Example 4: Cached configuration fetcher
const configCache = new CachedFetcher(600000); // 10 minutes TTL

export async function getCachedConfig(url: string) {
  const result = await configCache.fetch(url, {
    ttl: 600000 // 10 minutes
  });
  
  console.log(`Config ${result.cached ? 'from cache' : 'fetched fresh'}`);
  return result.data;
}

// Example 5: Download and process secrets file
export async function downloadSecretsFile(url: string, filename: string) {
  try {
    await downloadWithProgress(url, filename, (loaded, total) => {
      const progress = total > 0 ? (loaded / total * 100).toFixed(1) : '0.0';
      console.log(`Download progress: ${progress}% (${loaded}/${total} bytes)`);
    });
    
    console.log(`Secrets file downloaded to: ${filename}`);
    return filename;
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
}

// Example 6: Initialize networking optimizations
export function initializeNetworking() {
  // Preconnect to frequently used hosts
  const frequentHosts = [
    'https://api.duoplus.com',
    'https://config.factory-wager.com',
    'https://secrets.bun.sh'
  ];
  
  preconnectHosts(frequentHosts);
  console.log('Network optimizations initialized');
}

// Example 7: Error handling with fallback
export async function fetchWithFallback(primaryUrl: string, fallbackUrl: string) {
  try {
    return await optimizedFetch(primaryUrl, {
      timeout: 5000,
      maxRetries: 1
    });
  } catch (primaryError) {
    console.warn('Primary URL failed, trying fallback:', primaryError);
    
    try {
      return await optimizedFetch(fallbackUrl, {
        timeout: 10000,
        maxRetries: 2
      });
    } catch (fallbackError) {
      console.error('Both primary and fallback URLs failed');
      const primaryMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);
      const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      throw new Error(`Primary: ${primaryMsg}, Fallback: ${fallbackMsg}`);
    }
  }
}

// Example 8: Batch processing for multiple secrets
export async function processSecretsBatch(secrets: Array<{ id: string; url: string }>) {
  const results = new Map();
  
  // Process in batches to avoid overwhelming the network
  for (let i = 0; i < secrets.length; i += 10) {
    const batch = secrets.slice(i, i + 10);
    const urls = batch.map(secret => secret.url);
    
    try {
      const batchResults = await parallelFetch(urls, {
        timeout: 20000,
        maxRetries: 2
      }, 5);
      
      batchResults.forEach((result, index) => {
        results.set(batch[index].id, {
          data: result.data,
          success: true,
          size: result.size
        });
      });
    } catch (error) {
      console.error(`Batch ${i}-${i + 10} failed:`, error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Mark failed items
      batch.forEach(secret => {
        results.set(secret.id, {
          data: null,
          success: false,
          error: errorMsg
        });
      });
    }
  }
  
  return results;
}
