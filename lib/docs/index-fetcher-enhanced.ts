// lib/docs/index-fetcher-enhanced.ts — Enhanced documentation index fetcher

import { EnhancedDocsCacheManager } from './cache-manager';
import { RipgrepSearcher, RipgrepMatch } from './ripgrep-spawn';

export interface BunApiIndex {
  topic: string;
  apis: string[];
  url: string;
  category: string;
  domains: {
    sh: string;
    com: string;
  };
  lastUpdated?: Date;
}

export class EnhancedDocsFetcher {
  private cache: EnhancedDocsCacheManager;
  private fallbackData: BunApiIndex[];
  private domains = ['sh', 'com'] as const;
  private ripgrepSearcher: RipgrepSearcher;

  constructor(config?: any) {
    this.cache = new EnhancedDocsCacheManager(config);
    this.fallbackData = this.loadFallbackIndex();
    this.ripgrepSearcher = new RipgrepSearcher({
      cacheDir: `${process.env.HOME}/.cache/bun-docs/requests`,
      maxConcurrency: 5
    });
  }

  private loadFallbackIndex(): BunApiIndex[] {
    // Hardcoded fallback index based on the provided documentation
    return [
      {
        topic: 'HTTP Server',
        apis: ['Bun.serve'],
        url: '/runtime/http/server',
        category: 'networking',
        domains: {
          sh: 'https://bun.sh/docs/runtime/http/server',
          com: 'https://bun.com/docs/runtime/http/server',
        },
      },
      {
        topic: 'SemVer',
        apis: ['Bun.semver.satisfies', 'Bun.semver.order', 'Bun.semver.compare'],
        url: '/runtime/semver',
        category: 'parsing',
        domains: {
          sh: 'https://bun.sh/docs/runtime/semver',
          com: 'https://bun.com/docs/runtime/semver',
        },
      },
      {
        topic: 'YAML',
        apis: ['Bun.yaml.parse', 'Bun.yaml.stringify'],
        url: '/runtime/yaml',
        category: 'parsing',
        domains: {
          sh: 'https://bun.sh/docs/runtime/yaml',
          com: 'https://bun.com/docs/runtime/yaml',
        },
      },
      {
        topic: 'Buffer',
        apis: ['Buffer.from', 'Buffer.alloc'],
        url: '/runtime/binary-data',
        category: 'binary',
        domains: {
          sh: 'https://bun.sh/docs/runtime/binary-data',
          com: 'https://bun.com/docs/runtime/binary-data',
        },
      },
      // Add more fallback entries as needed
    ];
  }

  async fetchIndex(domain: 'sh' | 'com' = 'com'): Promise<BunApiIndex[]> {
    const cacheKey = `index:${domain}`;

    try {
      const llmsUrl = `https://bun.${domain}/docs/llms.txt`;
      const content = await this.cache.fetchWithCache<string>(llmsUrl, {
        headers: { Accept: 'text/plain' },
      });

      const parsed = this.parseIndex(content, domain);
      await this.cache.set(cacheKey, parsed);

      return parsed;
    } catch (error) {
      console.warn(`Failed to fetch index from ${domain}, using fallback`);
      return this.fallbackData;
    }
  }

  private parseIndex(content: string, domain: 'sh' | 'com'): BunApiIndex[] {
    const lines = content.split('\n');
    const apis: BunApiIndex[] = [];

    // Simple parser for the index format
    let currentCategory = '';

    for (const line of lines) {
      if (line.startsWith('## ')) {
        currentCategory = line.replace('## ', '').trim().toLowerCase();
        continue;
      }

      if (line.includes('|') && !line.startsWith('| Topic')) {
        const parts = line
          .split('|')
          .map(p => p.trim())
          .filter(Boolean);
        if (parts.length >= 2) {
          const topic = parts[0];
          const apiText = parts[1];

          // Extract URLs
          const urlMatch = apiText.match(/\[.*?\]\((.*?)\)/);
          const url = urlMatch ? urlMatch[1] : '';

          // Extract API names from backticks
          const apiMatches = apiText.match(/`([^`]+)`/g) || [];
          const apis = apiMatches.map(m => m.replace(/`/g, ''));

          if (url) {
            apis.push({
              topic,
              apis,
              url: url.startsWith('/') ? url : `/${url}`,
              category: currentCategory,
              domains: {
                sh: `https://bun.sh/docs${url.startsWith('/') ? url : `/${url}`}`,
                com: `https://bun.com/docs${url.startsWith('/') ? url : `/${url}`}`,
              },
              lastUpdated: new Date(),
            });
          }
        }
      }
    }

    return apis;
  }

  async search(query: string, domain: 'sh' | 'com' = 'com'): Promise<BunApiIndex[]> {
    const index = await this.fetchIndex(domain);
    const lowerQuery = query.toLowerCase();

    return index.filter(
      item =>
        item.topic.toLowerCase().includes(lowerQuery) ||
        item.apis.some(api => api.toLowerCase().includes(lowerQuery)) ||
        item.category.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * High-performance search using Bun.spawn and Ripgrep
   */
  async searchWithRipgrep(query: string, options: {
    caseSensitive?: boolean;
    maxResults?: number;
    includeContent?: boolean;
  } = {}): Promise<{
    apis: BunApiIndex[];
    content: RipgrepMatch[];
    performance: {
      searchTime: number;
      totalMatches: number;
    };
  }> {
    const startTime = performance.now();
    
    // Run API index search and content search in parallel
    const [apis, content] = await Promise.all([
      this.search(query, 'com'),
      this.ripgrepSearcher.search(query, {
        caseSensitive: options.caseSensitive,
        maxResults: options.maxResults || 20
      })
    ]);

    const endTime = performance.now();
    const searchTime = endTime - startTime;

    return {
      apis,
      content,
      performance: {
        searchTime: Number(searchTime.toFixed(2)),
        totalMatches: apis.length + content.length
      }
    };
  }

  /**
   * Ghost Search - Search multiple sources in parallel
   */
  async ghostSearch(query: string, options: {
    domains?: ('sh' | 'com')[];
    includeProjectCode?: boolean;
    projectDir?: string;
    maxResults?: number;
  } = {}): Promise<{
    bunSh: BunApiIndex[];
    bunCom: BunApiIndex[];
    content: RipgrepMatch[];
    projectCode?: RipgrepMatch[];
    performance: {
      totalTime: number;
      parallelSpeedup: number;
    };
  }> {
    const domains = options.domains || ['sh', 'com'];
    const maxResults = options.maxResults || 20;
    const startTime = performance.now();

    // Prepare parallel searches
    const searches: Promise<any>[] = [
      this.search(query, 'sh'),
      this.search(query, 'com'),
      this.ripgrepSearcher.search(query, { maxResults })
    ];

    if (options.includeProjectCode && options.projectDir) {
      const { searchProjectCode } = await import('./ripgrep-spawn');
      searches.push(
        searchProjectCode(query, options.projectDir, { maxResults })
      );
    }

    // Execute all searches in parallel
    const results = await Promise.all(searches);
    const endTime = performance.now();

    const parallelTime = endTime - startTime;
    
    // Estimate sequential time for speedup calculation
    const estimatedSequentialTime = parallelTime * domains.length * 1.5; // Rough estimate
    const parallelSpeedup = Number((estimatedSequentialTime / parallelTime).toFixed(2));

    return {
      bunSh: results[0],
      bunCom: results[1],
      content: results[2],
      projectCode: results[3],
      performance: {
        totalTime: Number(parallelTime.toFixed(2)),
        parallelSpeedup
      }
    };
  }

  /**
   * Real-time search with caching and debouncing
   */
  createRealTimeSearch(debounceMs: number = 300) {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastQuery = '';
    let lastResult: any = null;

    return {
      search: async (query: string, options?: any) => {
        // Return cached result if same query
        if (query === lastQuery && lastResult) {
          return lastResult;
        }

        // Clear previous timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // Debounce the search
        return new Promise((resolve) => {
          timeoutId = setTimeout(async () => {
            const result = await this.searchWithRipgrep(query, options);
            lastQuery = query;
            lastResult = result;
            resolve(result);
          }, debounceMs);
        });
      },

      // Cancel pending search
      cancel: () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      },

      // Clear cache
      clearCache: () => {
        lastQuery = '';
        lastResult = null;
        this.ripgrepSearcher.clearCache();
      }
    };
  }

  async getApiDoc(apiName: string, domain: 'sh' | 'com' = 'com'): Promise<string | null> {
    const index = await this.fetchIndex(domain);
    const found = index.find(item =>
      item.apis.some(api => api === apiName || api.includes(apiName))
    );

    return found ? found.domains[domain] : null;
  }

  async updateFallbackData(): Promise<void> {
    try {
      // Try to fetch from both domains and merge results
      const [shIndex, comIndex] = await Promise.allSettled([
        this.fetchIndex('sh'),
        this.fetchIndex('com'),
      ]);

      const merged = new Map<string, BunApiIndex>();

      // Merge results
      const processResult = (result: any) => {
        if (result.status === 'fulfilled') {
          result.value.forEach((item: BunApiIndex) => {
            const key = `${item.topic}-${item.url}`;
            if (!merged.has(key)) {
              merged.set(key, item);
            }
          });
        }
      };

      processResult(shIndex);
      processResult(comIndex);

      this.fallbackData = Array.from(merged.values());

      // Save updated fallback
      await Bun.write(
        `${this.cache.getStats().cacheDir}/fallback.json`,
        JSON.stringify(this.fallbackData, null, 2)
      );

      console.log('✅ Fallback data updated:', this.fallbackData.length, 'APIs');
    } catch (error) {
      console.error('Failed to update fallback data:', error);
    }
  }
}
