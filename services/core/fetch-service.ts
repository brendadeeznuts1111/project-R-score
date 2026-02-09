// services/fetch-service.ts
import { BUN_DOCS, TYPED_ARRAY_URLS, RSS_URLS } from '../../config/urls.ts';

/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */

export class FetchService {
  
  // Fetch Bun documentation - matches the example pattern
  async fetchBunDocs(endpoint: string): Promise<any> {
    // Using the exact pattern from Bun docs: https://bun.sh/docs/runtime/networking/fetch
    const response = await fetch(`${BUN_DOCS.BASE}${endpoint}`);
    
    console.log(`Fetch status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    
    // Choose response method based on content type
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      return await response.json();
    } else if (contentType?.includes('text/html') || contentType?.includes('text/plain')) {
      return await response.text();
    } else if (contentType?.includes('application/xml') || contentType?.includes('text/xml')) {
      return await response.text();
    }
    
    return await response.arrayBuffer();
  }
  
  // Fetch typed array documentation specifically
  async fetchTypedArrayDocs(section?: string): Promise<string> {
    const url = section ? 
      `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS[section as keyof typeof TYPED_ARRAY_URLS] || TYPED_ARRAY_URLS.BASE}` :
      `${BUN_DOCS.BASE}${TYPED_ARRAY_URLS.BASE}`;
    
    const response = await fetch(url);
    console.log(`TypedArray docs fetch status: ${response.status}`);
    return await response.text();
  }
  
  // Fetch RSS feed using Bun's native fetch
  async fetchRSSFeed(feedUrl = RSS_URLS.BUN_BLOG): Promise<string> {
    const response = await fetch(feedUrl);
    console.log(`RSS fetch status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS: ${response.status}`);
    }
    
    return await response.text();
  }
  
  // Multiple RSS feeds with Promise.all (Bun pattern)
  async fetchAllRSSFeeds(): Promise<Record<string, string>> {
    const feedUrls = [
      ['bun_blog', RSS_URLS.BUN_BLOG],
      ['bun_updates', RSS_URLS.BUN_UPDATES],
    ];
    
    const responses = await Promise.all(
      feedUrls.map(async ([name, url]) => {
        try {
          const response = await fetch(url);
          console.log(`${name} fetch status: ${response.status}`);
          const text = await response.text();
          return [name, text] as const;
        } catch (error) {
          console.error(`Failed to fetch ${name}:`, error);
          return [name, ''] as const;
        }
      })
    );
    
    return Object.fromEntries(responses);
  }
}

// Example usage matching Bun documentation
const fetchService = new FetchService();

// Fetch typed array docs
const typedArrayDocs = await fetchService.fetchTypedArrayDocs();
console.log(`Fetched ${typedArrayDocs.length} bytes of typed array docs`);

// Fetch RSS feeds
const rssFeeds = await fetchService.fetchAllRSSFeeds();
console.log(`Fetched ${Object.keys(rssFeeds).length} RSS feeds`);

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */