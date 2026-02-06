import { EnhancedDocsCacheManager } from './cache-manager';

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
  private cache: DocsCacheManager;
  private fallbackData: BunApiIndex[];
  private domains = ['sh', 'com'] as const;

  constructor(config?: any) {
    this.cache = new EnhancedDocsCacheManager(config);
    this.fallbackData = this.loadFallbackIndex();
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
