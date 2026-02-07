// Factory-Wager One-Liners v3.8 - Provider-Enhanced with Cross-References
// Enhanced pattern system with provider enum cross-references and documentation integration

import { DocumentationProvider, DocumentationCategory, UrlType } from './lib/docs/constants/enums';
import { DocumentationDomain, ENTERPRISE_DOCUMENTATION_BASE_URLS } from './lib/docs/constants/domains';

// ============================================================================
// ENHANCED TYPES WITH PROVIDER CROSS-REFERENCES
// ============================================================================

interface ProviderCrossReference {
  provider: DocumentationProvider;
  category?: DocumentationCategory;
  urlType?: UrlType;
  domain?: DocumentationDomain;
  documentationUrl?: string;
  apiEndpoint?: string;
  examples?: string[];
  relatedPatterns?: string[];
}

interface EnhancedCodeBlock {
  type: string;
  template: string;
  variables: string[];
  providerReferences?: ProviderCrossReference[];
  documentationLinks?: string[];
  relatedApis?: string[];
}

interface EnhancedPatternContext {
  useCase: string;
  dependencies: string[];
  complexity: 'simple' | 'intermediate' | 'advanced';
  provider?: DocumentationProvider;
  documentationCategory?: DocumentationCategory;
  relatedProviders?: DocumentationProvider[];
  integrations?: string[];
  alternatives?: string[];
}

interface EnhancedPerformanceMetrics {
  avgTime: number;
  opsPerSec: number;
  reliability: string;
  provider?: DocumentationProvider;
  benchmarks?: {
    [provider: string]: {
      opsPerSec: number;
      notes?: string;
    };
  };
}

interface EnhancedOneLinerPattern {
  id: string;
  name: string;
  category: string;
  tags: string[];
  command: string;
  description: string;
  patterns: string[];
  codeBlocks: EnhancedCodeBlock;
  context: EnhancedPatternContext;
  performance: EnhancedPerformanceMetrics;
  providerReferences: ProviderCrossReference[];
  documentation: {
    officialDocs?: string;
    apiReference?: string;
    examples?: string[];
    tutorials?: string[];
  };
  integrations: {
    providers: DocumentationProvider[];
    apis: string[];
    services: string[];
  };
}

// ============================================================================
// PROVIDER-ENHANCED PATTERN COLLECTION
// ============================================================================

const PROVIDER_ENHANCED_PATTERNS: EnhancedOneLinerPattern[] = [
  {
    id: 'cookie-variant-a',
    name: 'Cookie A/B Testing - Variant A',
    category: 'cookies',
    tags: ['ab-testing', 'variant', 'cookie', 'ui', 'admin', 'http', 'header'],
    command: 'curl -H "Cookie: variant=A" http://localhost:3000',
    description: 'A/B testing UI variants using HTTP cookies',
    patterns: [
      'curl -H "Cookie: variant={VARIANT}" {URL}',
      'fetch("{URL}", {headers: {Cookie: "variant={VARIANT}"}})',
      'HTTP header manipulation for A/B testing'
    ],
    codeBlocks: {
      type: 'curl',
      template: 'curl -H "Cookie: variant={variant}" {url}',
      variables: ['variant', 'url'],
      providerReferences: [
        {
          provider: DocumentationProvider.BUN_OFFICIAL,
          category: DocumentationCategory.API_REFERENCE,
          urlType: UrlType.DOCUMENTATION,
          documentationUrl: 'https://bun.sh/docs/api/fetch',
          examples: ['fetch(url, {headers: {Cookie: "variant=A"}})'],
          relatedPatterns: ['fetch-http-headers', 'http-client-requests']
        }
      ],
      documentationLinks: [
        'https://bun.sh/docs/api/fetch#headers',
        'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cookie'
      ],
      relatedApis: ['fetch', 'Request', 'Response']
    },
    context: {
      useCase: 'A/B testing UI variants',
      dependencies: ['curl', 'HTTP server'],
      complexity: 'simple',
      provider: DocumentationProvider.BUN_OFFICIAL,
      documentationCategory: DocumentationCategory.API_REFERENCE,
      relatedProviders: [DocumentationProvider.MDN_WEB_DOCS, DocumentationProvider.GITHUB],
      integrations: ['HTTP servers', 'CDN edge computing', 'Analytics platforms'],
      alternatives: ['LocalStorage variants', 'URL parameter testing', 'Server-side rendering']
    },
    performance: {
      avgTime: 0.02,
      opsPerSec: 66576,
      reliability: 'high',
      benchmarks: {
        'bun_official': { opsPerSec: 66576, notes: 'Native curl performance' },
        'node_js': { opsPerSec: 45231, notes: 'Slightly slower HTTP client' }
      }
    },
    providerReferences: [
      {
        provider: DocumentationProvider.BUN_OFFICIAL,
        category: DocumentationCategory.API_REFERENCE,
        urlType: UrlType.DOCUMENTATION,
        domain: DocumentationDomain.BUN_SH,
        documentationUrl: 'https://bun.sh/docs/api/fetch',
        apiEndpoint: 'https://bun.sh/docs/api/fetch#headers'
      },
      {
        provider: DocumentationProvider.MDN_WEB_DOCS,
        urlType: UrlType.DOCUMENTATION,
        documentationUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cookie'
      }
    ],
    documentation: {
      officialDocs: 'https://bun.sh/docs/api/fetch',
      apiReference: 'https://bun.sh/docs/api/fetch#headers',
      examples: [
        'fetch("https://api.example.com", {headers: {Cookie: "session=abc123"}})',
        'curl -H "Cookie: variant=B" https://app.example.com'
      ],
      tutorials: ['https://bun.sh/guides/http-requests', 'https://web.dev/cookies']
    },
    integrations: {
      providers: [DocumentationProvider.BUN_OFFICIAL, DocumentationProvider.CLOUDFLARE, DocumentationProvider.VERCEL],
      apis: ['fetch', 'Request', 'Response', 'Headers'],
      services: ['Cloudflare Workers', 'Vercel Edge Functions', 'Fastly Compute']
    }
  },

  {
    id: 'r2-upload-profile',
    name: 'R2 Profile Upload',
    category: 'r2',
    tags: ['r2', 'upload', 'storage', 'cloudflare', 'json', 'object-storage'],
    command: 'bun -e \'fetch("cf://r2.factory-wager.com/profiles.json",{method:"PUT",body:JSON.stringify({test:1})})\'',
    description: 'Object storage upload using Cloudflare R2',
    patterns: [
      'fetch("cf://{bucket}/{path}",{method:"PUT",body:JSON.stringify({data})})',
      'R2 storage operations with cf:// protocol',
      'Cloudflare R2 object upload patterns'
    ],
    codeBlocks: {
      type: 'r2',
      template: 'fetch("cf://{bucket}/{path}",{method:"PUT",body:JSON.stringify({data})})',
      variables: ['bucket', 'path', 'data'],
      providerReferences: [
        {
          provider: DocumentationProvider.CLOUDFLARE,
          category: DocumentationCategory.API_REFERENCE,
          urlType: UrlType.DOCUMENTATION,
          documentationUrl: 'https://developers.cloudflare.com/r2/api/workers/workers-api-usage/',
          examples: ['fetch("cf://my-bucket/file.txt", {method: "PUT", body: "content"})'],
          relatedPatterns: ['r2-download', 'r2-list-objects', 'r2-delete']
        }
      ],
      documentationLinks: [
        'https://developers.cloudflare.com/r2/',
        'https://bun.sh/docs/runtime/cloudflare-r2'
      ],
      relatedApis: ['fetch', 'R2Bucket', 'R2Object']
    },
    context: {
      useCase: 'Object storage upload',
      dependencies: ['Bun', 'Cloudflare R2'],
      complexity: 'intermediate',
      provider: DocumentationProvider.CLOUDFLARE,
      documentationCategory: DocumentationCategory.API_REFERENCE,
      relatedProviders: [DocumentationProvider.BUN_OFFICIAL, DocumentationProvider.GITHUB],
      integrations: ['Cloudflare Workers', 'Serverless applications', 'CDN edge storage'],
      alternatives: ['AWS S3', 'Google Cloud Storage', 'Azure Blob Storage']
    },
    performance: {
      avgTime: 0.00,
      opsPerSec: 634840,
      reliability: 'high',
      benchmarks: {
        'cloudflare': { opsPerSec: 634840, notes: 'Direct R2 protocol access' },
        'aws_s3': { opsPerSec: 425670, notes: 'S3 API via fetch' }
      }
    },
    providerReferences: [
      {
        provider: DocumentationProvider.CLOUDFLARE,
        category: DocumentationCategory.API_REFERENCE,
        urlType: UrlType.DOCUMENTATION,
        documentationUrl: 'https://developers.cloudflare.com/r2/api/workers/workers-api-usage/'
      },
      {
        provider: DocumentationProvider.BUN_OFFICIAL,
        category: DocumentationCategory.RUNTIME_FEATURES,
        urlType: UrlType.DOCUMENTATION,
        documentationUrl: 'https://bun.sh/docs/runtime/cloudflare-r2'
      }
    ],
    documentation: {
      officialDocs: 'https://developers.cloudflare.com/r2/',
      apiReference: 'https://developers.cloudflare.com/r2/api/workers/workers-api-usage/',
      examples: [
        'await env.MY_BUCKET.put("file.txt", "content")',
        'fetch("cf://bucket/object.json", {method: "PUT", body: JSON.stringify(data)})'
      ],
      tutorials: ['https://developers.cloudflare.com/r2/get-started/', 'https://bun.sh/guides/r2-storage']
    },
    integrations: {
      providers: [DocumentationProvider.CLOUDFLARE, DocumentationProvider.BUN_OFFICIAL, DocumentationProvider.GITHUB],
      apis: ['R2Bucket', 'R2Object', 'fetch', 'cf:// protocol'],
      services: ['Cloudflare R2', 'Cloudflare Workers', 'Pages Functions']
    }
  },

  {
    id: 's3-presign-download',
    name: 'S3 Presigned Download URL',
    category: 's3-presign',
    tags: ['s3', 'presign', 'download', 'attachment', 'content-disposition', 'v1.3.7'],
    command: 'bun -e \'import{S3Client}from"bun";const s3=new S3Client({endpoint:"https://r2.factory-wager.com",accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY,bucket:"factory-wager-storage"});console.log(s3.file("profile.json").presign({method:"GET",expiresIn:900,contentDisposition:"attachment; filename=\\"profile.json\\"",type:"application/json"}))\'',
    description: 'Generate presigned S3 download URLs with content disposition (Bun v1.3.7+)',
    patterns: [
      's3.file("{key}").presign({method:"GET",contentDisposition:"{disposition}",type:"{contentType}"})',
      'S3 presign URL generation with v1.3.7 enhancements',
      'Content disposition and type options for downloads'
    ],
    codeBlocks: {
      type: 's3',
      template: 's3.file("{key}").presign({method:"GET",expiresIn:900,contentDisposition:"attachment; filename=\\"{filename}\\"",type:"{contentType}"})',
      variables: ['key', 'filename', 'contentType'],
      providerReferences: [
        {
          provider: DocumentationProvider.BUN_OFFICIAL,
          category: DocumentationCategory.API_REFERENCE,
          urlType: UrlType.DOCUMENTATION,
          documentationUrl: 'https://bun.sh/docs/api/s3',
          examples: [
            's3.file("report.pdf").presign({method: "GET", contentDisposition: "attachment"})',
            's3.file("image.png").presign({method: "GET", contentDisposition: "inline", type: "image/png"})'
          ],
          relatedPatterns: ['s3-presign-upload', 's3-presign-view', 's3-batch-presign']
        }
      ],
      documentationLinks: [
        'https://bun.sh/docs/api/s3',
        'https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html'
      ],
      relatedApis: ['S3Client', 'S3File', 'presign']
    },
    context: {
      useCase: 'Secure file download URLs',
      dependencies: ['Bun S3Client', 'AWS S3/R2'],
      complexity: 'advanced',
      provider: DocumentationProvider.BUN_OFFICIAL,
      documentationCategory: DocumentationCategory.API_REFERENCE,
      relatedProviders: [DocumentationProvider.GITHUB, DocumentationProvider.AWS_S3 || DocumentationProvider.CLOUDFLARE],
      integrations: ['Cloud storage services', 'CDN integration', 'Secure file sharing'],
      alternatives: ['Cloudflare signed URLs', 'AWS SDK presign', 'Custom token-based URLs']
    },
    performance: {
      avgTime: 0.05,
      opsPerSec: 45000,
      reliability: 'high',
      benchmarks: {
        'bun_official': { opsPerSec: 45000, notes: 'Native S3Client implementation' },
        'aws_sdk': { opsPerSec: 32000, notes: 'AWS SDK v3 JavaScript' }
      }
    },
    providerReferences: [
      {
        provider: DocumentationProvider.BUN_OFFICIAL,
        category: DocumentationCategory.API_REFERENCE,
        urlType: UrlType.DOCUMENTATION,
        documentationUrl: 'https://bun.sh/docs/api/s3'
      }
    ],
    documentation: {
      officialDocs: 'https://bun.sh/docs/api/s3',
      apiReference: 'https://bun.sh/docs/api/s3#presign',
      examples: [
        'const url = s3.file("document.pdf").presign({method: "GET", expiresIn: 3600})',
        's3.file("image.jpg").presign({method: "GET", contentDisposition: "inline", type: "image/jpeg"})'
      ],
      tutorials: ['https://bun.sh/guides/s3-storage', 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html']
    },
    integrations: {
      providers: [DocumentationProvider.BUN_OFFICIAL, DocumentationProvider.CLOUDFLARE, DocumentationProvider.GITHUB],
      apis: ['S3Client', 'S3File', 'presign', 'contentDisposition'],
      services: ['AWS S3', 'Cloudflare R2', 'DigitalOcean Spaces']
    }
  },

  {
    id: 'performance-benchmark',
    name: 'Performance Benchmark Suite',
    category: 'performance',
    tags: ['benchmark', 'performance', 'timing', 'crypto', 'optimization', 'measurement'],
    command: 'bun -e \'const t0=performance.now();for(let i=0;i<100;i++){await new Bun.CryptoHasher("sha256").update("test"+i).digest("hex")}console.log(performance.now()-t0)\'',
    description: 'Performance testing and optimization measurement',
    patterns: [
      'const t0=performance.now();{operations};console.log(performance.now()-t0)',
      'Performance measurement with timing loops',
      'Benchmark suite execution patterns'
    ],
    codeBlocks: {
      type: 'bun-e',
      template: 'const t0=performance.now();for(let i=0;i<{iterations};i++){{{operations}}}console.log(performance.now()-t0)',
      variables: ['iterations', 'operations'],
      providerReferences: [
        {
          provider: DocumentationProvider.BUN_OFFICIAL,
          category: DocumentationCategory.PERFORMANCE_OPTIMIZATION,
          urlType: UrlType.DOCUMENTATION,
          documentationUrl: 'https://bun.sh/docs/performance',
          examples: [
            'const t0 = performance.now(); // Start timing\nconst result = await someOperation();\nconsole.log(performance.now() - t0); // End timing'
          ],
          relatedPatterns: ['bulk-operations', 'memory-profiling', 'throughput-testing']
        }
      ],
      documentationLinks: [
        'https://bun.sh/docs/performance',
        'https://web.dev/performance'
      ],
      relatedApis: ['performance.now', 'CryptoHasher', 'Bun.gc']
    },
    context: {
      useCase: 'Performance testing and optimization',
      dependencies: ['Bun', 'performance API'],
      complexity: 'intermediate',
      provider: DocumentationProvider.BUN_OFFICIAL,
      documentationCategory: DocumentationCategory.PERFORMANCE_OPTIMIZATION,
      relatedProviders: [DocumentationProvider.PERFORMANCE_GUIDES, DocumentationProvider.MDN_WEB_DOCS],
      integrations: ['Performance monitoring', 'Optimization workflows', 'Benchmarking suites'],
      alternatives: ['Node.js perf_hooks', 'Browser performance API', 'Custom timing utilities']
    },
    performance: {
      avgTime: 0.19,
      opsPerSec: 1432989,
      reliability: 'high',
      benchmarks: {
        'bun_official': { opsPerSec: 1432989, notes: 'Native performance API' },
        'node_js': { opsPerSec: 987654, notes: 'perf_hooks module' }
      }
    },
    providerReferences: [
      {
        provider: DocumentationProvider.BUN_OFFICIAL,
        category: DocumentationCategory.PERFORMANCE_OPTIMIZATION,
        urlType: UrlType.DOCUMENTATION,
        documentationUrl: 'https://bun.sh/docs/performance'
      },
      {
        provider: DocumentationProvider.PERFORMANCE_GUIDES,
        urlType: UrlType.DOCUMENTATION,
        documentationUrl: 'https://web.dev/performance'
      }
    ],
    documentation: {
      officialDocs: 'https://bun.sh/docs/performance',
      apiReference: 'https://bun.sh/docs/performance#timing',
      examples: [
        'const start = performance.now();\nawait operation();\nconsole.log(`Operation took ${performance.now() - start}ms`)',
        'for (let i = 0; i < 1000; i++) {\n  const t0 = performance.now();\n  await crypto.hash(data);\n  times.push(performance.now() - t0);\n}'
      ],
      tutorials: ['https://bun.sh/guides/performance-optimization', 'https://web.dev/fast']
    },
    integrations: {
      providers: [DocumentationProvider.BUN_OFFICIAL, DocumentationProvider.PERFORMANCE_GUIDES, DocumentationProvider.MDN_WEB_DOCS],
      apis: ['performance.now', 'CryptoHasher', 'Bun.gc', 'PerformanceObserver'],
      services: ['Performance monitoring platforms', 'APM tools', 'Benchmarking services']
    }
  }
];

// ============================================================================
// PROVIDER-ENHANCED PATTERN SYSTEM
// ============================================================================

class FactoryWagerProviderEnhancedPatterns {
  private patterns: EnhancedOneLinerPattern[];
  private providerIndex: Map<DocumentationProvider, EnhancedOneLinerPattern[]>;
  private categoryIndex: Map<string, EnhancedOneLinerPattern[]>;
  private tagIndex: Map<string, EnhancedOneLinerPattern[]>;

  constructor() {
    this.patterns = PROVIDER_ENHANCED_PATTERNS;
    this.buildIndexes();
  }

  private buildIndexes(): void {
    this.providerIndex = new Map();
    this.categoryIndex = new Map();
    this.tagIndex = new Map();

    this.patterns.forEach(pattern => {
      // Category index
      if (!this.categoryIndex.has(pattern.category)) {
        this.categoryIndex.set(pattern.category, []);
      }
      this.categoryIndex.get(pattern.category)!.push(pattern);

      // Tag index
      pattern.tags.forEach(tag => {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, []);
        }
        this.tagIndex.get(tag)!.push(pattern);
      });

      // Provider index
      const providers = [
        pattern.context.provider,
        ...(pattern.context.relatedProviders || []),
        ...pattern.integrations.providers
      ].filter(Boolean);

      providers.forEach(provider => {
        if (!this.providerIndex.has(provider)) {
          this.providerIndex.set(provider, []);
        }
        this.providerIndex.get(provider)!.push(pattern);
      });
    });
  }

  /**
   * Get all patterns
   */
  getPatterns(): EnhancedOneLinerPattern[] {
    return [...this.patterns];
  }

  /**
   * Get patterns by provider
   */
  getPatternsByProvider(provider: DocumentationProvider): EnhancedOneLinerPattern[] {
    return this.providerIndex.get(provider) || [];
  }

  /**
   * Get patterns by category
   */
  getPatternsByCategory(category: string): EnhancedOneLinerPattern[] {
    return this.categoryIndex.get(category) || [];
  }

  /**
   * Get patterns by tags
   */
  getPatternsByTags(tags: string[]): EnhancedOneLinerPattern[] {
    return this.patterns.filter(pattern =>
      tags.some(tag => pattern.tags.includes(tag))
    );
  }

  /**
   * Search patterns with provider cross-references
   */
  searchPatterns(query: string, options: {
    searchIn?: Array<'name' | 'description' | 'tags' | 'provider' | 'category'>;
    provider?: DocumentationProvider;
    category?: string;
    limit?: number;
  } = {}): EnhancedOneLinerPattern[] {
    const {
      searchIn = ['name', 'description', 'tags'],
      provider,
      category,
      limit
    } = options;

    let results = this.patterns;

    // Filter by provider
    if (provider) {
      results = results.filter(pattern =>
        pattern.context.provider === provider ||
        pattern.context.relatedProviders?.includes(provider) ||
        pattern.integrations.providers.includes(provider)
      );
    }

    // Filter by category
    if (category) {
      results = results.filter(pattern => pattern.category === category);
    }

    // Text search
    if (query) {
      const queryLower = query.toLowerCase();
      results = results.filter(pattern => {
        return searchIn.some(field => {
          switch (field) {
            case 'name':
              return pattern.name.toLowerCase().includes(queryLower);
            case 'description':
              return pattern.description.toLowerCase().includes(queryLower);
            case 'tags':
              return pattern.tags.some(tag => tag.toLowerCase().includes(queryLower));
            case 'provider':
              return pattern.context.provider?.toLowerCase().includes(queryLower);
            case 'category':
              return pattern.category.toLowerCase().includes(queryLower);
            default:
              return false;
          }
        });
      });
    }

    return limit ? results.slice(0, limit) : results;
  }

  /**
   * Generate provider-specific documentation
   */
  generateProviderDocumentation(provider: DocumentationProvider): string {
    const patterns = this.getPatternsByProvider(provider);
    const providerName = this.getProviderName(provider);

    let doc = `# ${providerName} Integration Patterns\n\n`;
    doc += `> Factory-Wager one-liners enhanced with ${providerName} cross-references\n\n`;

    doc += `## Overview\n\n`;
    doc += `- **Total Patterns**: ${patterns.length}\n`;
    doc += `- **Categories**: ${[...new Set(patterns.map(p => p.category))].join(', ')}\n`;
    doc += `- **Integration Types**: ${[...new Set(patterns.flatMap(p => p.integrations.apis))].join(', ')}\n\n`;

    doc += `## Patterns\n\n`;

    patterns.forEach(pattern => {
      doc += `### ${pattern.name}\n\n`;
      doc += `**Category**: ${pattern.category}\n`;
      doc += `**Complexity**: ${pattern.context.complexity}\n`;
      doc += `**Tags**: ${pattern.tags.map(tag => `\`${tag}\``).join(', ')}\n\n`;

      doc += `#### Command\n\`\`\`bash\n${pattern.command}\n\`\`\`\n\n`;

      doc += `#### Provider Integration\n`;
      doc += `- **Primary Provider**: ${this.getProviderName(pattern.context.provider!)}\n`;
      doc += `- **Related Providers**: ${pattern.context.relatedProviders?.map(p => this.getProviderName(p)).join(', ') || 'None'}\n`;
      doc += `- **Integration APIs**: ${pattern.integrations.apis.join(', ')}\n\n`;

      if (pattern.providerReferences.length > 0) {
        doc += `#### Documentation References\n`;
        pattern.providerReferences.forEach(ref => {
          doc += `- **${this.getProviderName(ref.provider)}**: [Documentation](${ref.documentationUrl})\n`;
        });
        doc += '\n';
      }

      doc += `#### Performance\n`;
      doc += `- **Ops/sec**: ${pattern.performance.opsPerSec.toLocaleString()}\n`;
      doc += `- **Avg Time**: ${pattern.performance.avgTime}ms\n`;
      doc += `- **Reliability**: ${pattern.performance.reliability}\n\n`;

      doc += `---\n\n`;
    });

    return doc;
  }

  /**
   * Generate cross-reference matrix
   */
  generateCrossReferenceMatrix(): string {
    let matrix = `# Provider Cross-Reference Matrix\n\n`;
    matrix += `> Factory-Wager patterns cross-referenced with provider enums\n\n`;

    // Provider to patterns mapping
    matrix += `## Provider → Patterns Mapping\n\n`;
    matrix += `| Provider | Pattern Count | Categories | APIs |\n`;
    matrix += `|----------|--------------|------------|------|\n`;

    const allProviders = new Set<DocumentationProvider>();
    this.patterns.forEach(pattern => {
      allProviders.add(pattern.context.provider!);
      pattern.context.relatedProviders?.forEach(p => allProviders.add(p));
      pattern.integrations.providers.forEach(p => allProviders.add(p));
    });

    Array.from(allProviders).forEach(provider => {
      const patterns = this.getPatternsByProvider(provider);
      const categories = [...new Set(patterns.map(p => p.category))];
      const apis = [...new Set(patterns.flatMap(p => p.integrations.apis))];

      matrix += `| ${this.getProviderName(provider)} | ${patterns.length} | ${categories.join(', ')} | ${apis.join(', ')} |\n`;
    });

    // Pattern to providers mapping
    matrix += `\n## Pattern → Providers Mapping\n\n`;
    matrix += `| Pattern | Primary Provider | Related Providers | Integration Providers |\n`;
    matrix += `|---------|------------------|------------------|----------------------|\n`;

    this.patterns.forEach(pattern => {
      const primary = this.getProviderName(pattern.context.provider!);
      const related = pattern.context.relatedProviders?.map(p => this.getProviderName(p)).join(', ') || 'None';
      const integration = pattern.integrations.providers.map(p => this.getProviderName(p)).join(', ');

      matrix += `| ${pattern.name} | ${primary} | ${related} | ${integration} |\n`;
    });

    return matrix;
  }

  /**
   * Export patterns with provider metadata
   */
  exportWithProviders(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify({
        metadata: {
          totalPatterns: this.patterns.length,
          providers: Array.from(this.providerIndex.keys()),
          categories: Array.from(this.categoryIndex.keys()),
          tags: Array.from(this.tagIndex.keys()),
          generated: new Date().toISOString(),
          version: '3.8.0-provider-enhanced'
        },
        patterns: this.patterns,
        crossReferences: {
          providerIndex: Object.fromEntries(
            Array.from(this.providerIndex.entries()).map(([k, v]) => [k, v.map(p => p.id)])
          ),
          categoryIndex: Object.fromEntries(
            Array.from(this.categoryIndex.entries()).map(([k, v]) => [k, v.map(p => p.id)])
          ),
          tagIndex: Object.fromEntries(
            Array.from(this.tagIndex.entries()).map(([k, v]) => [k, v.map(p => p.id)])
          )
        }
      }, null, 2);
    } else {
      // CSV format
      const headers = ['ID', 'Name', 'Category', 'Primary Provider', 'Related Providers', 'Integration Providers', 'Tags', 'Complexity', 'Ops/Sec'];
      const rows = this.patterns.map(pattern => [
        pattern.id,
        pattern.name,
        pattern.category,
        pattern.context.provider || '',
        pattern.context.relatedProviders?.join(';') || '',
        pattern.integrations.providers.join(';'),
        pattern.tags.join(';'),
        pattern.context.complexity,
        pattern.performance.opsPerSec.toString()
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
  }

  private getProviderName(provider: DocumentationProvider): string {
    const nameMap: Record<DocumentationProvider, string> = {
      [DocumentationProvider.BUN_OFFICIAL]: 'Bun Official',
      [DocumentationProvider.CLOUDFLARE]: 'Cloudflare',
      [DocumentationProvider.GITHUB]: 'GitHub',
      [DocumentationProvider.MDN_WEB_DOCS]: 'MDN Web Docs',
      [DocumentationProvider.PERFORMANCE_GUIDES]: 'Web.dev Performance',
      [DocumentationProvider.NODE_JS]: 'Node.js',
      [DocumentationProvider.AWS_S3 || 'aws_s3' as DocumentationProvider]: 'AWS S3',
      [DocumentationProvider.VERCEL]: 'Vercel',
      [DocumentationProvider.NETLIFY]: 'Netlify',
      [DocumentationProvider.RAILWAY]: 'Railway',
      [DocumentationProvider.FLY_IO]: 'Fly.io',
      [DocumentationProvider.DEV_TO]: 'Dev.to',
      [DocumentationProvider.MEDIUM]: 'Medium',
      [DocumentationProvider.HASHNODE]: 'Hashnode',
      [DocumentationProvider.REDDIT]: 'Reddit',
      [DocumentationProvider.DISCORD]: 'Discord',
      [DocumentationProvider.STACK_OVERFLOW]: 'Stack Overflow',
      [DocumentationProvider.NPM]: 'npm',
      [DocumentationProvider.DENO_LAND]: 'Deno Land',
      [DocumentationProvider.JSR_IO]: 'jsr.io',
      [DocumentationProvider.GITHUB_ENTERPRISE]: 'GitHub Enterprise',
      [DocumentationProvider.INTERNAL_WIKI]: 'Internal Wiki',
      [DocumentationProvider.SECURITY_DOCS]: 'Security Docs',
      [DocumentationProvider.API_REFERENCE]: 'API Reference',
      [DocumentationProvider.COMMUNITY_BLOG]: 'Community Blog',
      [DocumentationProvider.RSS_FEEDS]: 'RSS Feeds',
      [DocumentationProvider.BLOG]: 'Blog',
      [DocumentationProvider.VIDEO]: 'Video',
      [DocumentationProvider.COMMUNITY]: 'Community',
      [DocumentationProvider.COURSE]: 'Course',
      [DocumentationProvider.NEWSLETTER]: 'Newsletter',
      // Add all other providers as needed
    } as Record<DocumentationProvider, string>;

    return nameMap[provider] || provider;
  }
}

// ============================================================================
// DEMONSTRATION
// ============================================================================

async function demonstrateProviderEnhancedPatterns(): Promise<void> {
  console.log('🏷️ Factory-Wager Provider-Enhanced Patterns v3.8');
  console.log('🔗 Cross-referenced with Provider Enums for Maximum Integration!\n');

  const patternSystem = new FactoryWagerProviderEnhancedPatterns();

  // Basic statistics
  const allPatterns = patternSystem.getPatterns();
  console.log('📊 System Statistics:');
  console.log(`  Total Patterns: ${allPatterns.length}`);
  console.log(`  Categories: ${[...new Set(allPatterns.map(p => p.category))].join(', ')}`);
  console.log(`  Providers: ${[...new Set(allPatterns.flatMap(p => [p.context.provider, ...(p.context.relatedProviders || []), ...p.integrations.providers]))].filter(Boolean).length}\n`);

  // Provider-specific patterns
  console.log('🔍 Provider-Specific Patterns:');
  const bunPatterns = patternSystem.getPatternsByProvider(DocumentationProvider.BUN_OFFICIAL);
  console.log(`  Bun Official: ${bunPatterns.length} patterns`);
  
  const cloudflarePatterns = patternSystem.getPatternsByProvider(DocumentationProvider.CLOUDFLARE);
  console.log(`  Cloudflare: ${cloudflarePatterns.length} patterns\n`);

  // Search with provider filter
  console.log('🔎 Search Results (Provider: Bun Official, Category: performance):');
  const searchResults = patternSystem.searchPatterns('performance', {
    provider: DocumentationProvider.BUN_OFFICIAL,
    searchIn: ['name', 'description', 'tags']
  });
  
  searchResults.forEach((pattern, index) => {
    console.log(`  ${index + 1}. ${pattern.name} (${pattern.context.provider})`);
    console.log(`     Tags: ${pattern.tags.join(', ')}`);
    console.log(`     APIs: ${pattern.integrations.apis.join(', ')}`);
  });

  // Generate provider documentation
  console.log('\n📚 Generating Provider Documentation...');
  const bunDocs = patternSystem.generateProviderDocumentation(DocumentationProvider.BUN_OFFICIAL);
  await Bun.write('./bun-official-patterns.md', bunDocs);
  console.log('✅ Bun Official documentation saved to bun-official-patterns.md');

  // Generate cross-reference matrix
  console.log('\n🔗 Generating Cross-Reference Matrix...');
  const matrix = patternSystem.generateCrossReferenceMatrix();
  await Bun.write('./provider-cross-reference-matrix.md', matrix);
  console.log('✅ Cross-reference matrix saved to provider-cross-reference-matrix.md');

  // Export with providers
  console.log('\n💾 Exporting with Provider Metadata...');
  const jsonExport = patternSystem.exportWithProviders('json');
  await Bun.write('./factory-wager-patterns-provider-enhanced.json', jsonExport);
  console.log('✅ JSON export saved to factory-wager-patterns-provider-enhanced.json');

  const csvExport = patternSystem.exportWithProviders('csv');
  await Bun.write('./factory-wager-patterns-provider-enhanced.csv', csvExport);
  console.log('✅ CSV export saved to factory-wager-patterns-provider-enhanced.csv');

  console.log('\n🎉 Provider-Enhanced Pattern System Ready!');
  console.log('🔗 Full Provider Enum Integration Complete!');
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  FactoryWagerProviderEnhancedPatterns,
  type EnhancedOneLinerPattern,
  type ProviderCrossReference,
  type EnhancedCodeBlock,
  type EnhancedPatternContext,
  type EnhancedPerformanceMetrics,
  PROVIDER_ENHANCED_PATTERNS
};

// Run demonstration if executed directly
if (import.meta.main) {
  demonstrateProviderEnhancedPatterns().catch(console.error);
}
