/**
 * Bun Macro: Extract meta tags from HTML at bundle-time
 * 
 * This macro demonstrates using fetch() and HTMLRewriter in macros to make
 * HTTP requests and parse HTML during bundling. The response is inlined into
 * your bundle.
 * 
 * This is similar to the example in Bun's documentation showing how to
 * extract meta tags from a webpage at build-time.
 * 
 * @example
 * ```ts
 * import { extractMetaTags } from './macros/extractMetaTags.ts' with { type: 'macro' };
 * 
 * // This fetch and parsing happens at build-time, not runtime
 * const meta = await extractMetaTags('https://example.com');
 * console.log(`Title: ${meta.title}`);
 * ```
 */

export interface MetaTags {
  title: string;
  description?: string;
  keywords?: string;
  author?: string;
  viewport?: string;
  [key: string]: string | undefined;
}

/**
 * Extract meta tags from a webpage at bundle-time
 * 
 * Uses fetch() to get the HTML and HTMLRewriter to parse it.
 * The URL must be statically known (a string literal or result of another macro).
 * 
 * @param url - URL to fetch (must be statically known)
 * @returns Object containing extracted meta tags
 */
export async function extractMetaTags(url: string): Promise<MetaTags> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const meta: MetaTags = {
      title: '',
    };
    
    // Use HTMLRewriter to parse the HTML response
    await new HTMLRewriter()
      .on('title', {
        text(element) {
          meta.title += element.text;
        },
      })
      .on('meta', {
        element(element) {
          const name =
            element.getAttribute('name') ||
            element.getAttribute('property') ||
            element.getAttribute('itemprop');
          
          if (name) {
            const content = element.getAttribute('content');
            if (content) {
              meta[name] = content;
            }
          }
        },
      })
      .transform(response)
      .text();
    
    return meta;
  } catch (error) {
    // If fetch fails at build-time, return empty meta tags
    // This allows the build to continue even if URL is not available
    console.warn(`Failed to extract meta tags from ${url}:`, error);
    return {
      title: '',
    };
  }
}

/**
 * Extract Open Graph meta tags at bundle-time
 * 
 * Specifically extracts Open Graph properties (og:title, og:description, etc.)
 */
export async function extractOpenGraphTags(url: string): Promise<Record<string, string>> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const ogTags: Record<string, string> = {};
    
    await new HTMLRewriter()
      .on('meta[property^="og:"]', {
        element(element) {
          const property = element.getAttribute('property');
          const content = element.getAttribute('content');
          
          if (property && content) {
            // Remove 'og:' prefix
            const key = property.replace('og:', '');
            ogTags[key] = content;
          }
        },
      })
      .transform(response)
      .text();
    
    return ogTags;
  } catch (error) {
    console.warn(`Failed to extract Open Graph tags from ${url}:`, error);
    return {};
  }
}

/**
 * Extract structured data (JSON-LD) from a webpage at bundle-time
 */
export async function extractStructuredData(url: string): Promise<any[]> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    const structuredData: any[] = [];
    
    // Extract JSON-LD scripts
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis;
    let match;
    
    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const json = JSON.parse(match[1]);
        structuredData.push(json);
      } catch {
        // Skip invalid JSON
      }
    }
    
    return structuredData;
  } catch (error) {
    console.warn(`Failed to extract structured data from ${url}:`, error);
    return [];
  }
}
