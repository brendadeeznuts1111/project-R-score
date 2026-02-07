#!/usr/bin/env bun

/**
 * 🏗️ Unified Base Server for Bun Documentation System
 * 
 * Combines the best features from all existing servers:
 * - Uses enhanced documentation system (like CLI)
 * - Proper domain distinction (bun.sh vs bun.com)
 * - Content-type handling capabilities
 * - Advanced fetch demonstrations
 * - Caching and performance optimizations
 * - Chrome app integration
 * 
 * Port: 3000 (main unified server)
 */

import { 
  EnhancedEnterpriseDocumentationURLBuilder,
  docsURLBuilder,
  EnhancedDocumentationURLValidator,
  DocumentationProvider,
  DocumentationCategory,
  DocumentationDomain,
  ENTERPRISE_DOCUMENTATION_BASE_URLS,
  DOCUMENTATION_URL_MAPPINGS,
  ENTERPRISE_DOCUMENTATION_PATHS,
  QUICK_REFERENCE_URLS
} from '../lib/docs/documentation-index.ts';

import { 
  EnhancedDocsFetcher,
  BunApiIndex 
} from '../lib/docs/index-fetcher-enhanced.ts';

import { ChromeAppManager } from '../lib/cli/chrome-integration';

// Import RSS integration service
import { RSSIntegrationService, RSSFeedItem } from '../services/rss-integration';

// Import advanced cache management
import { CacheFactory, CacheMiddleware } from '../lib/performance/cache-management.ts';

// Import security middleware
import { 
  SecurityMiddleware, 
  SecurityPresets, 
  createCORSHeaders,
  createSecurityMiddleware 
} from '../lib/security/rate-limiting-security.ts';

// Initialize services
const docsFetcher = new EnhancedDocsFetcher({
  ttl: 6 * 60 * 60 * 1000, // 6 hours
  offlineMode: false
});

const chromeManager = new ChromeAppManager({
  appName: 'Bun Documentation Server',
  appUrl: 'https://bun.com/docs'
});

// Initialize RSS integration service
const rssService = new RSSIntegrationService();

// Advanced cache with eviction policies
const responseCache = CacheFactory.createApiCache();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Initialize security middleware with error handling
let securityMiddleware: SecurityMiddleware;
let corsHeaders: Record<string, string>;

try {
  securityMiddleware = createSecurityMiddleware(
    process.env.NODE_ENV === 'production' ? 'productionAPI' : 'development',
    {
      rateLimit: {
        maxRequests: process.env.NODE_ENV === 'production' ? 100 : 1000
      },
      securityHeaders: {
        customHeaders: {
          'X-Server-Version': '1.0.0',
          'X-Powered-By': 'Bun'
        }
      }
    }
  );
} catch (error) {
  console.error('❌ Failed to initialize security middleware:', error);
  console.warn('⚠️ Running without security middleware - NOT RECOMMENDED FOR PRODUCTION');
  // Create a no-op fallback middleware
  securityMiddleware = {
    apply: async (request: Request, handler: () => Promise<Response>) => {
      console.warn('Security middleware bypassed due to initialization failure');
      return await handler();
    }
  } as SecurityMiddleware;
}

// Initialize CORS headers with error handling
try {
  corsHeaders = createCORSHeaders(
    process.env.NODE_ENV === 'production' ? 
      ['https://bun.sh', 'https://bun.com'] : 
      ['*'],
    ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client-Version']
  );
} catch (error) {
  console.error('❌ Failed to initialize CORS headers:', error);
  console.warn('⚠️ Using default CORS headers');
  corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}

// Unified server configuration
const SERVER_PORT = parseInt(process.env.SERVER_PORT || '3000', 10);
const SERVER_HOST = process.env.SERVER_HOST || 'localhost';
const server = Bun.serve({
  port: SERVER_PORT,
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Handle OPTIONS requests for CORS
    if (request.method === 'OPTIONS') {
      const response = new Response(null, { status: 200 });
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }
    
    // Apply security middleware
    return await securityMiddleware.apply(request, async () => {
      try {
        // Route to appropriate handler
        const handler = getRouteHandler(path);
        if (handler) {
          const response = await handler(request, url);
          
          // Add CORS headers to all responses
          Object.entries(corsHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
          
          return response;
        }
        
        return handleNotFound(request, url);
      } catch (error) {
        console.error(`❌ Server error for ${path}:`, error instanceof Error ? error.message : String(error));
        return handleError(error, request, url);
      }
    });
  },
});

/**
 * Route handler lookup
 */
function getRouteHandler(path: string): ((request: Request, url: URL) => Promise<Response>) | null {
  const routes: Record<string, (request: Request, url: URL) => Promise<Response>> = {
    // Root and documentation
    '/': handleRoot,
    '/health': handleHealth,
    
    // Enhanced documentation endpoints (using CLI approach)
    '/docs/search': handleDocumentationSearch,
    '/docs/index': handleDocumentationIndex,
    // Documentation providers and external sources
    '/docs/providers': handleDocumentationProviders,
    '/docs/github': handleGitHubDocs,
    '/docs/mdn': handleMDNDocs,
    '/docs/performance': handlePerformanceGuides,
    '/docs/internal': handleInternalWiki,
    '/docs/paths': handleDocumentationPaths,
    '/docs/quick-ref': handleQuickReference,
    '/api/url-builder/demo': handleURLBuilderDemo,
    '/api/url-builder/stats': handleURLBuilderStats,
    '/api/validator/validate': handleURLValidation,
    '/api/validator/best-source': handleBestDocumentationSource,
    '/api/validator/normalize': handleURLNormalization,
    '/api/validator/migration': handleURLMigration,
    '/api/examples/usage': handleUsageExamples,
    
    // RSS integration endpoints
    '/api/rss/fetch': handleRSSFetch,
    '/api/rss/combined': handleCombinedRSS,
    '/api/rss/documentation': handleDocumentationRSS,
    '/api/rss/feed': handleGeneratedRSSFeed,
    '/api/sources/comparison': handleDocumentationSourcesComparison,
    
    // GitHub integration endpoints
    '/api/github/parse': handleGitHubURLParse,
    '/api/github/commit': handleGitHubCommitURL,
    '/api/github/bun-types': handleBunTypesURL,
    '/api/github/text-fragment': handleTextFragmentDemo,
    '/api/github/critical-urls': handleCriticalURLs,
    
    // CLI tooling demonstrations
    '/api/cli/cookie-scanner': handleCookieScannerDemo,
    '/api/cli/efficiency': handleCLIEfficiencyDemo,
    
    // Domain-specific endpoints
    '/docs/bun-sh': handleBunShDocs,
    '/docs/bun-com': handleBunComDocs,
    '/docs/reference': handleReferenceDocs,
    '/docs/guides': handleGuidesDocs,
    
    // API demonstrations
    '/api/fetch/demo': handleFetchDemo,
    '/api/fetch/advanced': handleAdvancedFetch,
    '/api/content-types': handleContentTypes,
    '/api/typed-arrays': handleTypedArrays,
    '/api/streaming': handleStreamingDemo,
    
    // RSS and feeds
    '/api/feeds': handleFeeds,
    '/api/feeds/rss': handleRSSFeed,
    '/api/feeds/json': handleJSONFeed,
    
    // CLI integration
    '/cli/search': handleCLISearch,
    '/cli/open': handleCLIOpen,
    '/cli/app': handleChromeApp,
    
    // Cache management
    '/cache/stats': handleCacheStats,
    '/cache/clear': handleCacheClear,
    
    // Testing endpoints
    '/test/all': handleTestAll,
    '/test/performance': handlePerformanceTest,
  };
  
  return routes[path] || null;
}

/**
 * Root endpoint - Server dashboard
 */
async function handleRoot(request: Request, url: URL): Promise<Response> {
  const html = generateDashboardHTML();
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

/**
 * Health check endpoint
 */
async function handleHealth(request: Request, url: URL): Promise<Response> {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    server: 'base-server',
    port: 3000,
    services: {
      docsFetcher: 'connected',
      chromeManager: 'ready',
      cache: responseCache.size + ' entries'
    },
    domains: Object.values(DocumentationDomain),
    providers: Object.values(DocumentationProvider)
  };
  
  return new Response(JSON.stringify(health, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Documentation search (CLI-style)
 */
async function handleDocumentationSearch(request: Request, url: URL): Promise<Response> {
  const query = url.searchParams.get('q') || '';
  const domain = url.searchParams.get('domain') as 'sh' | 'com' || 'sh';
  
  if (!query) {
    return new Response(JSON.stringify({ error: 'Query parameter required' }), { status: 400 });
  }
  
  try {
    const results = await docsFetcher.search(query, domain);
    
    const response = {
      query,
      domain,
      results: results.map(r => ({
        topic: r.topic,
        apis: r.apis,
        category: r.category,
        urls: {
          sh: r.domains.sh,
          com: r.domains.com
        },
        enhancedUrls: {
          typedArray: docsURLBuilder.buildTypedArrayURL({ fragment: 'OVERVIEW' }),
          fetchAPI: docsURLBuilder.buildFetchAPIDocsURL(),
          enterprise: docsURLBuilder.buildEnterpriseAPIURL({ version: 'v1', endpoint: 'demo' })
        }
      })),
      timestamp: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(response, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

/**
 * Documentation index
 */
async function handleDocumentationIndex(request: Request, url: URL): Promise<Response> {
  try {
    await docsFetcher.updateFallbackData();
    
    const response = {
      message: 'Documentation index updated',
      timestamp: new Date().toISOString(),
      cacheStats: (docsFetcher as any).cache.getStats()
    };
    
    return new Response(JSON.stringify(response, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

/**
 * Documentation providers overview
 */
async function handleDocumentationProviders(request: Request, url: URL): Promise<Response> {
  const providers = Object.entries(ENTERPRISE_DOCUMENTATION_BASE_URLS).map(([key, urls]) => ({
    provider: key,
    type: DOCUMENTATION_URL_MAPPINGS[urls.BASE]?.type || 'unknown',
    audience: DOCUMENTATION_URL_MAPPINGS[urls.BASE]?.audience || 'all_users',
    urls: urls
  }));
  
  return new Response(JSON.stringify({ providers }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * bun.sh specific documentation
 */
async function handleBunShDocs(request: Request, url: URL): Promise<Response> {
  const section = url.searchParams.get('section') || 'api';
  
  const urls = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_OFFICIAL];
  const targetUrl = urls[section.toUpperCase() as keyof typeof urls] || urls.DOCS;
  
  try {
    const response = await fetch(targetUrl);
    const content = await response.text();
    
    return new Response(content, {
      headers: { 
        'Content-Type': 'text/html',
        'X-Source-URL': targetUrl,
        'X-Provider': DocumentationProvider.BUN_OFFICIAL
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Failed to fetch from ${targetUrl}` }), { status: 500 });
  }
}

/**
 * bun.com specific documentation
 */
async function handleBunComDocs(request: Request, url: URL): Promise<Response> {
  const section = url.searchParams.get('section') || 'guides';
  
  const urls = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_GUIDES];
  const targetUrl = urls[section.toUpperCase() as keyof typeof urls] || urls.GUIDES;
  
  try {
    const response = await fetch(targetUrl);
    const content = await response.text();
    
    return new Response(content, {
      headers: { 
        'Content-Type': 'text/html',
        'X-Source-URL': targetUrl,
        'X-Provider': DocumentationProvider.BUN_GUIDES
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Failed to fetch from ${targetUrl}` }), { status: 500 });
  }
}

/**
 * Reference documentation
 */
async function handleReferenceDocs(request: Request, url: URL): Promise<Response> {
  const urls = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_REFERENCE];
  const section = url.searchParams.get('section') || 'REFERENCE';
  
  // If a specific section is requested, proxy that content
  if (section && section !== 'overview' && urls[section.toUpperCase() as keyof typeof urls]) {
    const targetUrl = urls[section.toUpperCase() as keyof typeof urls] as string;
    
    try {
      const response = await fetch(targetUrl);
      const content = await response.text();
      
      return new Response(content, {
        headers: { 
          'Content-Type': 'text/html',
          'X-Source-URL': targetUrl,
          'X-Provider': DocumentationProvider.BUN_REFERENCE,
          'X-Section': section
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: `Failed to fetch from ${targetUrl}` }), { status: 500 });
    }
  }
  
  // Return overview of all reference sections
  const response = {
    provider: DocumentationProvider.BUN_REFERENCE,
    description: 'Interactive API Reference Portal',
    baseUrl: urls.BASE,
    sections: {
      main: urls.REFERENCE,
      api: urls.API_REFERENCE,
      cli: urls.CLI_REFERENCE,
      config: urls.CONFIG_REFERENCE,
      environment: urls.ENVIRONMENT_REFERENCE,
      packages: urls.PACKAGES_REFERENCE,
      templates: urls.TEMPLATES_REFERENCE,
      tutorials: urls.TUTORIALS,
      cookbook: urls.COOKBOOK,
      cheatsheet: urls.CHEATSHEET,
      glossary: urls.GLOSSARY
    },
    textFragments: urls.TEXT_FRAGMENT_EXAMPLES,
    enhancedUrls: {
      typedArrayMethods: docsURLBuilder.buildTypedArrayURL({ fragment: 'METHODS' }),
      typedArrayPerformance: docsURLBuilder.buildTypedArrayURL({ fragment: 'PERFORMANCE' }),
      syscallOptimization: docsURLBuilder.buildSyscallOptimizationURL({ 
        operation: 'copy_file_range', 
        platform: 'linux' 
      }),
      enterpriseAPI: docsURLBuilder.buildEnterpriseAPIURL({ version: 'v1', endpoint: 'reference' })
    },
    usage: {
      browseSections: '/docs/reference?section=api',
      directAccess: urls.REFERENCE,
      textFragmentExample: urls.TEXT_FRAGMENT_EXAMPLES.NODE_ZLIB
    }
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * GitHub Enterprise documentation
 */
async function handleGitHubDocs(request: Request, url: URL): Promise<Response> {
  const urls = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.GITHUB_ENTERPRISE];
  const section = url.searchParams.get('section') || 'BASE';
  
  const response = {
    provider: DocumentationProvider.GITHUB_ENTERPRISE,
    description: 'GitHub Enterprise and API Documentation',
    urls: urls,
    sections: {
      main: urls.BASE,
      enterprise: urls.ENTERPRISE,
      apiV3: urls.API_V3,
      apiV4: urls.API_V4,
      rawContent: urls.RAW_CONTENT,
      gist: urls.GIST
    },
    usage: {
      apiAccess: urls.API_V3,
      graphql: urls.API_V4,
      rawFiles: urls.RAW_CONTENT + '/oven-sh/bun/main/README.md'
    }
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * MDN Web Docs integration
 */
async function handleMDNDocs(request: Request, url: URL): Promise<Response> {
  const urls = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.MDN_WEB_DOCS];
  const search = url.searchParams.get('search') || '';
  
  const response = {
    provider: DocumentationProvider.MDN_WEB_DOCS,
    description: 'Mozilla Developer Network Documentation',
    urls: urls,
    sections: {
      main: urls.BASE,
      english: urls.EN_US,
      api: urls.API,
      search: urls.SEARCH
    },
    currentSearch: search,
    searchUrl: search ? `${urls.SEARCH}?q=${encodeURIComponent(search)}` : urls.SEARCH,
    commonTopics: [
      'JavaScript', 'TypeScript', 'Web APIs', 'HTTP', 'CSS', 'HTML',
      'Fetch API', 'Typed Arrays', 'Streams', 'Web Workers'
    ]
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Performance Guides integration
 */
async function handlePerformanceGuides(request: Request, url: URL): Promise<Response> {
  const urls = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.PERFORMANCE_GUIDES];
  
  const response = {
    provider: DocumentationProvider.PERFORMANCE_GUIDES,
    description: 'Web Performance Optimization Guides',
    urls: urls,
    sections: {
      main: urls.BASE,
      metrics: urls.METRICS,
      optimization: urls.OPTIMIZATION,
      tools: urls.TOOLS
    },
    bunOptimization: {
      typedArrays: docsURLBuilder.buildTypedArrayURL({ fragment: 'PERFORMANCE' }),
      syscalls: docsURLBuilder.buildSyscallOptimizationURL({ 
        operation: 'read', 
        platform: 'linux' 
      }),
      benchmarks: 'https://bun.sh/docs/benchmarks'
    }
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Internal Wiki integration
 */
async function handleInternalWiki(request: Request, url: URL): Promise<Response> {
  const urls = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.INTERNAL_WIKI];
  
  const response = {
    provider: DocumentationProvider.INTERNAL_WIKI,
    description: 'Internal Documentation Wiki',
    urls: urls,
    sections: {
      main: urls.BASE,
      api: urls.API,
      search: urls.SEARCH,
      categories: urls.CATEGORIES
    },
    note: 'This provider is configured for internal enterprise use',
    environment: process.env.INTERNAL_WIKI_URL ? 'custom' : 'default'
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Documentation paths showcase
 */
async function handleDocumentationPaths(request: Request, url: URL): Promise<Response> {
  const provider = url.searchParams.get('provider') as DocumentationProvider;
  const category = url.searchParams.get('category') as DocumentationCategory;
  
  let response: any = {
    description: 'Enhanced Documentation Path Constants',
    totalProviders: Object.keys(ENTERPRISE_DOCUMENTATION_PATHS).length,
    providers: {}
  };
  
  // If specific provider requested
  if (provider && ENTERPRISE_DOCUMENTATION_PATHS[provider]) {
    response.providers[provider] = ENTERPRISE_DOCUMENTATION_PATHS[provider];
    
    // If specific category requested
    if (category && ENTERPRISE_DOCUMENTATION_PATHS[provider][category]) {
      response.providers[provider] = {
        [category]: ENTERPRISE_DOCUMENTATION_PATHS[provider][category]
      };
    }
  } else {
    // Show all providers
    response.providers = ENTERPRISE_DOCUMENTATION_PATHS;
  }
  
  // Add usage examples
  response.usage = {
    getAllPaths: '/docs/paths',
    getProvider: '/docs/paths?provider=BUN_OFFICIAL',
    getCategory: '/docs/paths?provider=BUN_OFFICIAL&category=API_REFERENCE',
    examplePath: ENTERPRISE_DOCUMENTATION_PATHS[DocumentationProvider.BUN_OFFICIAL]?.[DocumentationCategory.API_REFERENCE]?.OVERVIEW
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Quick reference URLs
 */
async function handleQuickReference(request: Request, url: URL): Promise<Response> {
  const section = url.searchParams.get('section') || 'all';
  
  let response: any = {
    description: 'Quick Reference URLs for Common Documentation',
    sections: {}
  };
  
  if (section === 'all') {
    response.sections = QUICK_REFERENCE_URLS;
  } else if (QUICK_REFERENCE_URLS[section.toUpperCase() as keyof typeof QUICK_REFERENCE_URLS]) {
    response.sections = {
      [section.toUpperCase()]: QUICK_REFERENCE_URLS[section.toUpperCase() as keyof typeof QUICK_REFERENCE_URLS]
    };
  } else {
    return new Response(JSON.stringify({ 
      error: 'Invalid section',
      availableSections: Object.keys(QUICK_REFERENCE_URLS)
    }), { status: 400 });
  }
  
  // Add enhanced URL builder examples
  response.enhancedExamples = {
    typedArrayOverview: docsURLBuilder.buildTypedArrayURL({ fragment: 'OVERVIEW' }),
    fetchAPIDocs: docsURLBuilder.buildFetchAPIDocsURL(),
    enterpriseAPI: docsURLBuilder.buildEnterpriseAPIURL({ version: 'v1', endpoint: 'demo' }),
    syscallOptimization: docsURLBuilder.buildSyscallOptimizationURL({ 
      operation: 'read', 
      platform: 'linux' 
    })
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Enhanced URL Builder Demo
 */
async function handleURLBuilderDemo(request: Request, url: URL): Promise<Response> {
  const demo = url.searchParams.get('demo') || 'all';
  
  let response: any = {
    title: 'Enhanced Enterprise Documentation URL Builder Demo',
    description: 'Demonstrates advanced URL building capabilities with caching and analytics'
  };
  
  switch (demo) {
    case 'typed-arrays':
      response.examples = {
        technical: docsURLBuilder.buildTypedArrayURL('OVERVIEW'),
        interactive: docsURLBuilder.buildTypedArrayURL('METHODS', { preferInteractive: true }),
        withExamples: docsURLBuilder.buildTypedArrayURL('EXAMPLES', { includeExamples: true })
      };
      break;
      
    case 'reference-portal':
      response.examples = {
        api: docsURLBuilder.buildReferencePortalURL('API', 'overview'),
        cli: docsURLBuilder.buildReferencePortalURL('CLI', 'installation'),
        config: docsURLBuilder.buildReferencePortalURL('CONFIG', undefined, { language: 'en' })
      };
      break;
      
    case 'guides':
      response.examples = {
        gettingStarted: docsURLBuilder.buildGuideURL('getting-started'),
        tutorial: docsURLBuilder.buildGuideURL('tutorials', 'step-1', { step: 1 }),
        interactive: docsURLBuilder.buildGuideURL('interactive', undefined, { interactive: true })
      };
      break;
      
    case 'rss-feeds':
      response.examples = {
        main: docsURLBuilder.buildRSSFeedURL('main'),
        technical: docsURLBuilder.buildRSSFeedURL('technical'),
        blog: docsURLBuilder.buildRSSFeedURL('blog'),
        releases: docsURLBuilder.buildRSSFeedURL('releases')
      };
      break;
      
    case 'advanced':
      response.examples = {
        customURL: docsURLBuilder.buildURL(
          DocumentationProvider.BUN_OFFICIAL,
          DocumentationCategory.API_REFERENCE,
          'HTTP',
          'authentication',
          { version: 'latest', format: 'json' },
          { includeTracking: true, language: 'en' }
        ),
        enterpriseAPI: docsURLBuilder.buildURL(
          DocumentationProvider.BUN_REFERENCE,
          DocumentationCategory.API_REFERENCE,
          'API',
          'enterprise',
          { tier: 'enterprise' },
          { preferInteractive: true, includeTracking: true }
        )
      };
      break;
      
    default: // all
      response.examples = {
        typedArrays: {
          technical: docsURLBuilder.buildTypedArrayURL('OVERVIEW'),
          interactive: docsURLBuilder.buildTypedArrayURL('METHODS', { preferInteractive: true })
        },
        referencePortal: {
          api: docsURLBuilder.buildReferencePortalURL('API'),
          cli: docsURLBuilder.buildReferencePortalURL('CLI')
        },
        guides: {
          gettingStarted: docsURLBuilder.buildGuideURL('getting-started'),
          tutorial: docsURLBuilder.buildGuideURL('tutorials', 'step-1', { step: 1 })
        },
        rssFeeds: {
          main: docsURLBuilder.buildRSSFeedURL('main'),
          technical: docsURLBuilder.buildRSSFeedURL('technical')
        },
        quickReference: docsURLBuilder.getQuickReferenceURLs()
      };
  }
  
  response.usage = {
    allDemos: '/api/url-builder/demo',
    specificDemo: '/api/url-builder/demo?demo=typed-arrays',
    availableDemos: ['typed-arrays', 'reference-portal', 'guides', 'rss-feeds', 'advanced', 'all']
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * URL Builder Statistics
 */
async function handleURLBuilderStats(request: Request, url: URL): Promise<Response> {
  const stats = docsURLBuilder.getAccessStats();
  
  const response = {
    title: 'URL Builder Analytics & Statistics',
    timestamp: new Date().toISOString(),
    statistics: stats,
    features: {
      caching: 'Enabled',
      analytics: 'Enabled',
      accessLog: stats.totalAccesses + ' entries',
      providers: Object.keys(stats.byProvider)
    },
    performance: {
      cacheHits: 'Available via getInstance()',
      memoryUsage: 'Minimal with Map-based caching'
    }
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * URL Validation Handler
 */
async function handleURLValidation(request: Request, url: URL): Promise<Response> {
  const targetURL = url.searchParams.get('url');
  
  if (!targetURL) {
    return new Response(JSON.stringify({ 
      error: 'URL parameter required',
      usage: '/api/validator/validate?url=https://bun.sh/docs/api/fetch'
    }), { status: 400 });
  }
  
  const validation = EnhancedDocumentationURLValidator.validateBunDocumentationURL(targetURL);
  
  const response = {
    url: targetURL,
    validation,
    timestamp: new Date().toISOString(),
    examples: {
      valid: [
        'https://bun.sh/docs/api/fetch',
        'https://bun.com/reference/api',
        'https://bun.com/guides/getting-started',
        'https://bun.com/rss.xml'
      ],
      invalid: [
        'https://example.com/not-bun-docs',
        'not-a-url',
        'https://bun.sh/unknown-path'
      ]
    }
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Best Documentation Source Handler
 */
async function handleBestDocumentationSource(request: Request, url: URL): Promise<Response> {
  const topic = url.searchParams.get('topic') || 'getting started';
  const audience = url.searchParams.get('audience') as 'developers' | 'beginners' | 'all' || 'developers';
  
  const bestSource = EnhancedDocumentationURLValidator.getBestDocumentationSource(topic, audience);
  
  const response = {
    topic,
    audience,
    recommendation: bestSource,
    alternatives: {
      technical: EnhancedDocumentationURLValidator.getBestDocumentationSource(topic, 'developers'),
      beginner: EnhancedDocumentationURLValidator.getBestDocumentationSource(topic, 'beginners')
    },
    availableTopics: [
      'typedarray', 'fetch', 'getting started', 'api', 'rss',
      'runtime', 'filesystem', 'websocket', 'sql', 'testing'
    ],
    usage: '/api/validator/best-source?topic=fetch&audience=developers'
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * URL Normalization Handler
 */
async function handleURLNormalization(request: Request, url: URL): Promise<Response> {
  const targetURL = url.searchParams.get('url');
  const preferredDomain = url.searchParams.get('domain') as 'bun.sh' | 'bun.com';
  const language = url.searchParams.get('language');
  
  if (!targetURL) {
    return new Response(JSON.stringify({ 
      error: 'URL parameter required',
      usage: '/api/validator/normalize?url=https://bun.sh/docs/api&domain=bun.com&language=en'
    }), { status: 400 });
  }
  
  const preferences = {
    preferredDomain: preferredDomain || undefined,
    language: language || undefined
  };
  
  const normalizedURL = EnhancedDocumentationURLValidator.normalizeDocumentationURL(targetURL, preferences);
  const validation = EnhancedDocumentationURLValidator.validateBunDocumentationURL(targetURL);
  
  const response = {
    original: targetURL,
    normalized: normalizedURL,
    preferences,
    validation,
    changed: targetURL !== normalizedURL,
    timestamp: new Date().toISOString()
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * URL Migration Handler
 */
async function handleURLMigration(request: Request, url: URL): Promise<Response> {
  const targetURL = url.searchParams.get('url');
  
  if (!targetURL) {
    return new Response(JSON.stringify({ 
      error: 'URL parameter required',
      usage: '/api/validator/migration?url=https://bun.sh/docs/api/fetch'
    }), { status: 400 });
  }
  
  const migration = EnhancedDocumentationURLValidator.needsMigration(targetURL);
  
  const response = {
    url: targetURL,
    migration,
    validation: EnhancedDocumentationURLValidator.validateBunDocumentationURL(targetURL),
    recommendations: {
      keepAsIs: !migration.needsUpdate,
      migrateNow: migration.needsUpdate ? migration.migrationPath : null,
      reviewManual: migration.needsUpdate ? 'Review migration path carefully' : null
    },
    timestamp: new Date().toISOString()
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Usage Examples Handler
 */
async function handleUsageExamples(request: Request, url: URL): Promise<Response> {
  const example = url.searchParams.get('example') || 'all';
  
  let response: any = {
    title: 'Enhanced Documentation System - Usage Examples',
    description: 'Practical examples of using the URL builder and validator',
    timestamp: new Date().toISOString()
  };
  
  switch (example) {
    case 'reference-portal':
      response.example = {
        title: 'Example 1: Access bun.com/reference portal',
        code: `const referencePortal = docsURLBuilder.buildReferencePortalURL('api');`,
        result: docsURLBuilder.buildReferencePortalURL('api'),
        explanation: 'Builds a URL to the API reference section with tracking'
      };
      break;
      
    case 'guides':
      response.example = {
        title: 'Example 2: Access bun.com/guides',
        code: `const gettingStartedGuide = docsURLBuilder.buildGuideURL('getting-started');`,
        result: docsURLBuilder.buildGuideURL('getting-started'),
        explanation: 'Creates a URL to the getting started guide with analytics'
      };
      break;
      
    case 'rss':
      response.example = {
        title: 'Example 3: Access bun.com/rss.xml',
        code: `const mainRSS = docsURLBuilder.buildRSSFeedURL('main');`,
        result: docsURLBuilder.buildRSSFeedURL('main'),
        explanation: 'Generates RSS feed URL with format parameter'
      };
      break;
      
    case 'typed-arrays':
      response.example = {
        title: 'Example 4: Get all typed array documentation URLs',
        code: `const typedArrayURLs = docsURLBuilder.getQuickReferenceURLs().TYPED_ARRAY;`,
        result: docsURLBuilder.getQuickReferenceURLs().TYPED_ARRAY,
        explanation: 'Returns all typed array URLs across different domains'
      };
      break;
      
    case 'validation':
      response.example = {
        title: 'Example 5: Validate and categorize a URL',
        code: `const validation = EnhancedDocumentationURLValidator.validateBunDocumentationURL(
  'https://bun.com/reference/api/fetch#timeout'
);`,
        result: EnhancedDocumentationURLValidator.validateBunDocumentationURL(
          'https://bun.com/reference/api/fetch#timeout'
        ),
        explanation: 'Validates URL and extracts metadata including provider, type, and audience'
      };
      break;
      
    case 'best-source':
      response.example = {
        title: 'Example 6: Get best documentation source for a topic',
        code: `const bestSource = EnhancedDocumentationURLValidator.getBestDocumentationSource(
  'fetch api',
  'beginners'
);`,
        result: EnhancedDocumentationURLValidator.getBestDocumentationSource(
          'fetch api',
          'beginners'
        ),
        explanation: 'Recommends optimal documentation source based on topic and audience'
      };
      break;
      
    case 'topic-urls':
      response.example = {
        title: 'Example 7: Get all documentation for RSS',
        code: `const allRSSURLs = docsURLBuilder.getAllDocumentationForTopic('rss');`,
        result: docsURLBuilder.getAllDocumentationForTopic('rss'),
        explanation: 'Returns all available URLs for a specific topic across providers'
      };
      break;
      
    case 'migration':
      response.example = {
        title: 'Example 8: Check if URL needs migration',
        code: `const migrationCheck = EnhancedDocumentationURLValidator.needsMigration(
  'https://bun.sh/docs/api/utils'
);`,
        result: EnhancedDocumentationURLValidator.needsMigration(
          'https://bun.sh/docs/api/utils'
        ),
        explanation: 'Detects URLs that should be migrated to newer formats'
      };
      break;
      
    default: // all
      response.examples = [
        {
          title: 'Example 1: Access bun.com/reference portal',
          code: `const referencePortal = docsURLBuilder.buildReferencePortalURL('api');`,
          result: docsURLBuilder.buildReferencePortalURL('api'),
          explanation: 'Builds a URL to the API reference section with tracking'
        },
        {
          title: 'Example 2: Access bun.com/guides',
          code: `const gettingStartedGuide = docsURLBuilder.buildGuideURL('getting-started');`,
          result: docsURLBuilder.buildGuideURL('getting-started'),
          explanation: 'Creates a URL to the getting started guide with analytics'
        },
        {
          title: 'Example 3: Access bun.com/rss.xml',
          code: `const mainRSS = docsURLBuilder.buildRSSFeedURL('main');`,
          result: docsURLBuilder.buildRSSFeedURL('main'),
          explanation: 'Generates RSS feed URL with format parameter'
        },
        {
          title: 'Example 4: Get all typed array documentation URLs',
          code: `const typedArrayURLs = docsURLBuilder.getQuickReferenceURLs().TYPED_ARRAY;`,
          result: docsURLBuilder.getQuickReferenceURLs().TYPED_ARRAY,
          explanation: 'Returns all typed array URLs across different domains'
        },
        {
          title: 'Example 5: Validate and categorize a URL',
          code: `const validation = EnhancedDocumentationURLValidator.validateBunDocumentationURL(
  'https://bun.com/reference/api/fetch#timeout'
);`,
          result: EnhancedDocumentationURLValidator.validateBunDocumentationURL(
            'https://bun.com/reference/api/fetch#timeout'
          ),
          explanation: 'Validates URL and extracts metadata including provider, type, and audience'
        },
        {
          title: 'Example 6: Get best documentation source for a topic',
          code: `const bestSource = EnhancedDocumentationURLValidator.getBestDocumentationSource(
  'fetch api',
  'beginners'
);`,
          result: EnhancedDocumentationURLValidator.getBestDocumentationSource(
            'fetch api',
            'beginners'
          ),
          explanation: 'Recommends optimal documentation source based on topic and audience'
        },
        {
          title: 'Example 7: Get all documentation for RSS',
          code: `const allRSSURLs = docsURLBuilder.getAllDocumentationForTopic('rss');`,
          result: docsURLBuilder.getAllDocumentationForTopic('rss'),
          explanation: 'Returns all available URLs for a specific topic across providers'
        },
        {
          title: 'Example 8: Check if URL needs migration',
          code: `const migrationCheck = EnhancedDocumentationURLValidator.needsMigration(
  'https://bun.sh/docs/api/utils'
);`,
          result: EnhancedDocumentationURLValidator.needsMigration(
            'https://bun.sh/docs/api/utils'
          ),
          explanation: 'Detects URLs that should be migrated to newer formats'
        }
      ];
  }
  
  response.usage = {
    allExamples: '/api/examples/usage',
    specificExample: '/api/examples/usage?example=typed-arrays',
    availableExamples: [
      'reference-portal', 'guides', 'rss', 'typed-arrays',
      'validation', 'best-source', 'topic-urls', 'migration', 'all'
    ]
  };
  
  response.imports = {
    urlBuilder: "import { docsURLBuilder } from 'lib/docs/documentation-index';",
    validator: "import { EnhancedDocumentationURLValidator } from 'lib/docs/documentation-index';",
    both: "import { docsURLBuilder, EnhancedDocumentationURLValidator } from 'lib/docs/documentation-index';"
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * RSS Feed Fetch Handler
 */
async function handleRSSFetch(request: Request, url: URL): Promise<Response> {
  const feedType = url.searchParams.get('type') as 'main' | 'blog' | 'releases' || 'main';
  
  try {
    const items = await rssService.fetchBunComRSS(feedType);
    
    const response = {
      feedType,
      itemCount: items.length,
      items: items.slice(0, 10), // Show first 10 items
      timestamp: new Date().toISOString(),
      cacheInfo: {
        ttl: '5 minutes',
        cached: items.length > 0
      }
    };
    
    return new Response(JSON.stringify(response, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch RSS feed',
      message: error.message,
      feedType
    }), { status: 500 });
  }
}

/**
 * Combined RSS Feed Handler
 */
async function handleCombinedRSS(request: Request, url: URL): Promise<Response> {
  const limit = parseInt(url.searchParams.get('limit') || '20');
  
  try {
    const items = await rssService.getCombinedRSSFeed(limit);
    
    const response = {
      description: `Combined RSS feed from all Bun sources (${limit} items)`,
      itemCount: items.length,
      items,
      timestamp: new Date().toISOString(),
      sources: ['main', 'blog', 'releases']
    };
    
    return new Response(JSON.stringify(response, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch combined RSS feed',
      message: error.message
    }), { status: 500 });
  }
}

/**
 * Documentation RSS Feed Handler
 */
async function handleDocumentationRSS(request: Request, url: URL): Promise<Response> {
  try {
    const rssXML = await rssService.generateDocumentationRSSFeed();
    
    return new Response(rssXML, {
      headers: { 
        'Content-Type': 'application/rss+xml',
        'Cache-Control': 'public, max-age=300' // 5 minutes
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Failed to generate documentation RSS feed',
      message: error.message
    }), { status: 500 });
  }
}

/**
 * Generated RSS Feed Handler (JSON format)
 */
async function handleGeneratedRSSFeed(request: Request, url: URL): Promise<Response> {
  const format = url.searchParams.get('format') || 'json';
  
  try {
    if (format === 'xml') {
      const rssXML = await rssService.generateDocumentationRSSFeed();
      return new Response(rssXML, {
        headers: { 'Content-Type': 'application/rss+xml' }
      });
    }
    
    // Default: JSON format
    const items = await rssService.getCombinedRSSFeed(15);
    const typedArrayURLs = docsURLBuilder.getQuickReferenceURLs().TYPED_ARRAY;
    
    const response = {
      title: 'Bun Documentation Updates',
      description: 'Latest updates from all Bun documentation sources',
      link: 'https://bun.com/reference',
      language: 'en-us',
      lastBuildDate: new Date().toISOString(),
      items: [
        {
          title: 'TypedArray Documentation',
          link: typedArrayURLs.TECHNICAL,
          description: 'Complete TypedArray reference with examples',
          pubDate: new Date().toISOString(),
          guid: typedArrayURLs.TECHNICAL,
          category: ['Documentation', 'API']
        },
        ...items.map(item => ({
          title: item.title,
          link: item.link,
          description: item.description,
          pubDate: item.pubDate.toISOString(),
          guid: item.guid,
          category: item.category || []
        }))
      ]
    };
    
    return new Response(JSON.stringify(response, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Failed to generate RSS feed',
      message: error.message
    }), { status: 500 });
  }
}

/**
 * Documentation Sources Comparison Handler
 */
async function handleDocumentationSourcesComparison(request: Request, url: URL): Promise<Response> {
  const topic = url.searchParams.get('topic') || 'binary-data';
  
  // Direct URL examples
  const directURLs = {
    technicalDocs: 'https://bun.sh/docs/runtime/binary-data#typedarray',
    referencePortal: 'https://bun.com/reference/api/binary-data',
    gettingStarted: 'https://bun.com/guides/getting-started',
    rssFeed: 'https://bun.com/rss.xml'
  };
  
  // Builder examples
  const builder = docsURLBuilder;
  const builderURLs = {
    technicalDocs: builder.buildTypedArrayURL('METHODS'),
    referencePortal: builder.buildReferencePortalURL('api/binary-data'),
    gettingStarted: builder.buildGuideURL('working-with-binary-data'),
    rssFeed: builder.buildRSSFeedURL('main')
  };
  
  // Quick reference URLs
  const quickRefURLs = builder.getQuickReferenceURLs();
  
  // Validation results
  const validationResults = Object.entries(directURLs).map(([key, url]) => ({
    source: key,
    url,
    validation: EnhancedDocumentationURLValidator.validateBunDocumentationURL(url)
  }));
  
  // Best source recommendations
  const bestSources = {
    developers: EnhancedDocumentationURLValidator.getBestDocumentationSource('typedarray', 'developers'),
    beginners: EnhancedDocumentationURLValidator.getBestDocumentationSource('typedarray', 'beginners'),
    all: EnhancedDocumentationURLValidator.getBestDocumentationSource('typedarray', 'all')
  };
  
  const response = {
    title: 'Documentation Sources Comparison',
    topic,
    timestamp: new Date().toISOString(),
    
    // Direct URL access
    directURLs: {
      description: 'Access documentation using direct URLs',
      examples: directURLs,
      usage: 'const technicalDocs = "https://bun.sh/docs/runtime/binary-data#typedarray";'
    },
    
    // URL builder access
    builderURLs: {
      description: 'Access documentation using the enhanced URL builder',
      examples: builderURLs,
      usage: 'const builder = docsURLBuilder; builder.buildTypedArrayURL("METHODS");',
      benefits: [
        'Type-safe URL construction',
        'Automatic tracking parameters',
        'Cache optimization',
        'Analytics integration'
      ]
    },
    
    // Quick reference access
    quickReference: {
      description: 'Predefined URL collections for common topics',
      typedArray: quickRefURLs.TYPED_ARRAY,
      fetchAPI: quickRefURLs.FETCH_API,
      rssFeeds: quickRefURLs.RSS_FEEDS,
      gettingStarted: quickRefURLs.GETTING_STARTED,
      usage: 'const urls = docsURLBuilder.getQuickReferenceURLs().TYPED_ARRAY;'
    },
    
    // Validation results
    validation: {
      description: 'URL validation and categorization results',
      results: validationResults,
      validProviders: validationResults.filter(r => r.validation.isValid).length,
      totalProviders: validationResults.length
    },
    
    // Best source recommendations
    recommendations: {
      description: 'Optimal documentation source by audience',
      bestSources,
      explanation: {
        technical: 'bun.sh for in-depth technical documentation',
        reference: 'bun.com/reference for interactive API reference',
        guides: 'bun.com/guides for step-by-step tutorials'
      }
    },
    
    // Usage patterns
    usagePatterns: {
      directAccess: {
        pattern: 'Direct URL strings',
        pros: ['Simple', 'No dependencies', 'Immediate'],
        cons: ['Hard to maintain', 'No validation', 'No analytics']
      },
      builderPattern: {
        pattern: 'URL Builder pattern',
        pros: ['Type-safe', 'Validated', 'Analytics', 'Caching'],
        cons: ['Requires import', 'Slight overhead']
      },
      quickReference: {
        pattern: 'Quick reference collections',
        pros: ['Predefined', 'Topic-based', 'Multiple sources'],
        cons: ['Limited topics', 'Static structure']
      }
    },
    
    // Recommendation
    recommendation: {
      forProduction: 'Use URL Builder for type safety and analytics',
      forDevelopment: 'Use Quick Reference for rapid prototyping',
      forExamples: 'Use Direct URLs in documentation examples'
    }
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * GitHub URL Parse Handler
 */
async function handleGitHubURLParse(request: Request, url: URL): Promise<Response> {
  const targetURL = url.searchParams.get('url');
  
  if (!targetURL) {
    return new Response(JSON.stringify({ 
      error: 'URL parameter required',
      usage: '/api/github/parse?url=https://github.com/oven-sh/bun/tree/main/packages/bun-types'
    }), { status: 400 });
  }
  
  // Use the enhanced validator to parse GitHub URL
  const parsed = EnhancedDocumentationURLValidator.parseGitHubURL(targetURL);
  const textFragment = EnhancedDocumentationURLValidator.extractTextFragment(targetURL);
  
  const response = {
    originalURL: targetURL,
    parsed,
    textFragment,
    validation: {
      isValid: parsed.isValid,
      isSpecificCommit: EnhancedDocumentationURLValidator.isSpecificCommitURL(targetURL),
      isBunTypes: EnhancedDocumentationURLValidator.isBunTypesURL(targetURL),
      commitHash: EnhancedDocumentationURLValidator.extractCommitHash(targetURL)
    },
    examples: {
      commitURL: 'https://github.com/oven-sh/bun/tree/main/packages/bun-types',
      blobURL: 'https://github.com/oven-sh/bun/blob/main/packages/bun-types/index.d.ts',
      issueURL: 'https://github.com/oven-sh/bun/issues/1234',
      pullURL: 'https://github.com/oven-sh/bun/pull/5678'
    }
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * GitHub Commit URL Handler
 */
async function handleGitHubCommitURL(request: Request, url: URL): Promise<Response> {
  const commitHash = url.searchParams.get('commit') || 'main';
  const path = url.searchParams.get('path') || 'packages/bun-types';
  const viewType = url.searchParams.get('view') as 'tree' | 'blob' || 'tree';
  
  // Build GitHub commit URL using enhanced builder
  const commitURL = docsURLBuilder.buildGitHubCommitURL('oven-sh', 'bun', commitHash, path, viewType);
  const rawURL = docsURLBuilder.buildGitHubRawURL(commitHash, path);
  
  const response = {
    commitHash,
    path,
    viewType,
    urls: {
      tree: docsURLBuilder.buildGitHubCommitURL('oven-sh', 'bun', commitHash, path, 'tree'),
      blob: docsURLBuilder.buildGitHubCommitURL('oven-sh', 'bun', commitHash, path, 'blob'),
      raw: rawURL
    },
    exampleCommit: {
      hash: 'main',
      short: 'af76296',
      url: docsURLBuilder.getExampleCommitURL()
    },
    packageURLs: docsURLBuilder.getGitHubPackageURLs('bun-types', commitHash),
    timestamp: new Date().toISOString()
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Bun Types URL Handler
 */
async function handleBunTypesURL(request: Request, url: URL): Promise<Response> {
  const commitHash = url.searchParams.get('commit') || 'main';
  
  const typeDefURLs = docsURLBuilder.getTypeDefinitionURLs();
  const packageURLs = docsURLBuilder.getGitHubPackageURLs('bun-types', commitHash);
  
  const response = {
    description: 'Bun TypeScript Definitions - Complete URL Collection',
    commitHash,
    typeDefinitions: typeDefURLs,
    packageStructure: packageURLs,
    keyFiles: {
      index: docsURLBuilder.buildBunTypesURL(commitHash, '/index.d.ts'),
      bunTypes: docsURLBuilder.buildBunTypesURL(commitHash, '/bun.d.ts'),
      globals: docsURLBuilder.buildBunTypesURL(commitHash, '/globals.d.ts'),
      packageJson: docsURLBuilder.buildBunTypesURL(commitHash, '/package.json')
    },
    npmIntegration: {
      packageName: 'bun-types',
      npmURL: typeDefURLs.npmPackage,
      installCommand: 'npm install --save-dev bun-types',
      typescriptConfig: '"types": ["bun-types"]'
    },
    usage: {
      import: "import { Bun } from 'bun-types';",
      global: 'declare global { const Bun: typeof Bun; }',
      tsconfig: '{ "compilerOptions": { "types": ["bun-types"] } }'
    }
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Text Fragment Demo Handler
 */
async function handleTextFragmentDemo(request: Request, url: URL): Promise<Response> {
  const text = url.searchParams.get('text') || 'node:zlib';
  const baseURL = url.searchParams.get('base') || 'https://bun.com/reference';
  
  // Build text fragment URL
  const textFragmentURL = docsURLBuilder.buildURLWithTextFragment(baseURL, text);
  const commonFragments = docsURLBuilder.getCommonTextFragmentURLs();
  
  // Parse text fragment from URL
  const parsedFragment = EnhancedDocumentationURLValidator.extractTextFragment(textFragmentURL);
  
  const response = {
    description: 'Text Fragment URL Generation and Parsing',
    baseURL,
    text,
    generatedURL: textFragmentURL,
    parsedFragment,
    commonFragments,
    examples: [
      {
        name: 'node:zlib',
        url: docsURLBuilder.buildBunReferenceWithTextFragment('node:zlib'),
        description: 'Direct link to node:zlib compatibility section'
      },
      {
        name: 'Bun API Reference',
        url: docsURLBuilder.buildBunReferenceWithTextFragment('Bun API Reference'),
        description: 'Link to main API reference section'
      },
      {
        name: 'TypedArray methods',
        url: docsURLBuilder.buildBunReferenceWithTextFragment('TypedArray methods'),
        description: 'Link to TypedArray methods documentation'
      }
    ],
    advanced: {
      withPrefix: docsURLBuilder.buildURLWithTextFragment(baseURL, 'API Reference', { 
        prefix: 'Bun', 
        suffix: 'documentation' 
      }),
      withRange: docsURLBuilder.buildURLWithTextFragment(baseURL, 'start', { 
        textEnd: 'end' 
      }),
      encoded: encodeURIComponent('Special characters & symbols')
    },
    browserSupport: {
      chrome: '✅ Supported (Chrome 89+)',
      firefox: '✅ Supported (Firefox 90+)',
      safari: '✅ Supported (Safari 14+)',
      edge: '✅ Supported (Edge 89+)'
    }
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Critical URLs Handler
 */
async function handleCriticalURLs(request: Request, url: URL): Promise<Response> {
  const allURLs = {
    // Primary documentation portals
    referencePortal: {
      main: 'https://bun.com/reference',
      api: 'https://bun.com/reference/api',
      cli: 'https://bun.com/reference/cli',
      textFragments: docsURLBuilder.getCommonTextFragmentURLs()
    },
    
    guidesPortal: {
      main: 'https://bun.com/guides',
      gettingStarted: 'https://bun.com/guides/getting-started'
    },
    
    rssFeeds: {
      main: 'https://bun.com/rss.xml',
      blog: 'https://bun.com/blog/rss.xml',
      technical: 'https://bun.sh/rss.xml'
    },
    
    // GitHub resources
    github: {
      repository: 'https://github.com/oven-sh/bun',
      bunTypes: {
        latest: docsURLBuilder.buildBunTypesURL(),
        specificCommit: docsURLBuilder.getExampleCommitURL(),
        npm: 'https://www.npmjs.com/package/bun-types'
      },
      packages: docsURLBuilder.getGitHubPackageURLs('bun-types')
    },
    
    // Technical documentation
    technicalDocs: {
      typedArray: docsURLBuilder.buildTypedArrayURL('OVERVIEW'),
      fetchAPI: docsURLBuilder.buildFetchAPIDocsURL(),
      binaryData: 'https://bun.sh/docs/runtime/binary-data'
    }
  };
  
  const response = {
    title: 'Critical Documentation URLs - Complete Collection',
    timestamp: new Date().toISOString(),
    urls: allURLs,
    quickAccess: {
      reference: 'https://bun.com/reference',
      guides: 'https://bun.com/guides',
      rss: 'https://bun.com/rss.xml',
      github: 'https://github.com/oven-sh/bun',
      bunTypes: 'https://github.com/oven-sh/bun/tree/main/packages/bun-types'
    },
    textFragments: {
      nodeZlib: 'https://bun.com/reference#:~:text=node%3Azlib',
      bunAPI: 'https://bun.com/reference#:~:text=Bun%20API%20Reference'
    },
    exampleCommit: {
      hash: 'main',
      short: 'af76296',
      url: docsURLBuilder.getExampleCommitURL(),
      description: 'Example commit showing bun-types package structure'
    },
    usage: {
      direct: 'Use URLs directly for simple access',
      builder: 'Use docsURLBuilder for type-safe construction',
      validation: 'Use EnhancedDocumentationURLValidator for analysis'
    }
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Cookie Scanner Demo Handler
 */
async function handleCookieScannerDemo(request: Request, url: URL): Promise<Response> {
  const projectId = url.searchParams.get('projectId') || 'demo-project';
  const sessionId = url.searchParams.get('sessionId') || crypto.randomUUID();
  const r2Bucket = url.searchParams.get('bucket') || process.env.R2_BUCKET || 'scanner-cookies';
  
  // Simulate the cookie scanner logic
  const cookies = { projectId, sessionId };
  const jsonString = JSON.stringify(cookies);
  const compressed = Bun.zstdCompressSync(jsonString);
  const prefixed = Buffer.concat([Buffer.from([0x01]), compressed]);
  
  // Simulate the wrapped output
  const wrap = Bun.wrapAnsi;
  const msg = `🆔 ${projectId} 📊 ${sessionId} 📦 ${prefixed.length}B R2: ${r2Bucket}`;
  const wrappedOutput = wrap(msg, 80);
  
  const response = {
    title: 'Cookie Scanner CLI Tool Demonstration',
    description: 'Efficient CLI tool for cookie data compression and R2 storage',
    inputs: {
      projectId,
      sessionId,
      r2Bucket
    },
    processing: {
      originalData: cookies,
      jsonString,
      jsonSize: `${jsonString.length}B`,
      compressedSize: `${compressed.length}B`,
      finalSize: `${prefixed.length}B`,
      compressionRatio: `${((1 - compressed.length / jsonString.length) * 100).toFixed(1)}%`
    },
    output: {
      wrappedMessage: wrappedOutput,
      summary: {
        projectId,
        sessionId,
        bundle: `${prefixed.length}B`,
        bucket: r2Bucket,
        status: '✅ READY'
      }
    },
    cliUsage: {
      command: `R2_BUCKET=${r2Bucket} PROJECT_ID=${projectId} bun tools/cookie-scanner.ts ${sessionId}`,
      oneLiner: `bun -e 'const a=process.argv.slice(2);const p=a[0]||"demo";const s=a[1]||crypto.randomUUID();const c={p,s};const z=Bun.zstdCompressSync(JSON.stringify(c));const b=Buffer.concat([Buffer.from([0x01]),z]);console.log({p,s,bundle:b.length+"B",bucket:process.env.R2_BUCKET||"scanner-cookies",status:"✅"})' ${projectId} ${sessionId}`
    },
    benefits: [
      'Efficient ZSTD compression',
      'Binary prefix for type identification',
      'UUID-based session tracking',
      'Environment variable configuration',
      'Minimal dependencies'
    ],
    extensions: [
      'Add encryption before compression',
      'Include timestamp metadata',
      'Batch processing support',
      'Streaming for large datasets'
    ]
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * CLI Efficiency Demo Handler
 */
async function handleCLIEfficiencyDemo(request: Request, url: URL): Promise<Response> {
  const demo = url.searchParams.get('demo') || 'all';
  
  let response: any = {
    title: 'CLI Tooling Efficiency Patterns',
    description: 'Demonstrations of efficient CLI tooling with Bun',
    timestamp: new Date().toISOString()
  };
  
  switch (demo) {
    case 'args':
      response.example = {
        title: 'Efficient Argument Parsing',
        code: `const args = process.argv.slice(2)
const getPos = (i, fallback = '') => args[i] ?? fallback
const projectId = getPos(0, process.env.PROJECT_ID || 'default')
const sessionId = getPos(1, crypto.randomUUID())`,
        explanation: 'Clean argument handling with fallbacks and environment support',
        benefits: ['Type-safe fallbacks', 'Environment integration', 'Minimal code']
      };
      break;
      
    case 'compression':
      response.example = {
        title: 'Native Compression',
        code: `const data = { projectId, sessionId }
const compressed = Bun.zstdCompressSync(JSON.stringify(data))
const prefixed = Buffer.concat([Buffer.from([0x01]), compressed])`,
        explanation: 'Using Bun\'s native ZSTD compression for efficient storage',
        benefits: ['Native performance', 'Binary prefixes', 'Buffer operations']
      };
      break;
      
    case 'output':
      response.example = {
        title: 'Formatted Output',
        code: `const wrap = Bun.wrapAnsi
const msg = \`🆔 \${projectId} 📊 \${sessionId} 📦 \${prefixed.length}B R2: \${bucket}\`
console.log(wrap(msg, 80))`,
        explanation: 'Clean, wrapped output with emoji indicators',
        benefits: ['Readability', 'Terminal wrapping', 'Visual indicators']
      };
      break;
      
    case 'one-liner':
      response.example = {
        title: 'One-Liner CLI',
        code: `bun -e 'const a=process.argv.slice(2);const p=a[0]||"demo";const s=a[1]||crypto.randomUUID();const c={p,s};const z=Bun.zstdCompressSync(JSON.stringify(c));console.log({p,s,size:z.length+"B",status:"✅"})'`,
        explanation: 'Complete functionality in a single command',
        benefits: ['Portability', 'No files needed', 'Quick deployment']
      };
      break;
      
    default: // all
      response.examples = [
        {
          title: 'Efficient Argument Parsing',
          code: `const args = process.argv.slice(2)
const getPos = (i, fallback = '') => args[i] ?? fallback
const projectId = getPos(0, process.env.PROJECT_ID || 'default')
const sessionId = getPos(1, crypto.randomUUID())`,
          explanation: 'Clean argument handling with fallbacks',
          benefits: ['Type-safe fallbacks', 'Environment integration']
        },
        {
          title: 'Native Compression',
          code: `const data = { projectId, sessionId }
const compressed = Bun.zstdCompressSync(JSON.stringify(data))
const prefixed = Buffer.concat([Buffer.from([0x01]), compressed])`,
          explanation: 'Using Bun\'s native ZSTD compression',
          benefits: ['Native performance', 'Binary prefixes']
        },
        {
          title: 'Formatted Output',
          code: `const wrap = Bun.wrapAnsi
const msg = \`🆔 \${projectId} 📊 \${sessionId} 📦 \${prefixed.length}B\`
console.log(wrap(msg, 80))`,
          explanation: 'Clean, wrapped output with indicators',
          benefits: ['Readability', 'Terminal wrapping']
        },
        {
          title: 'One-Liner CLI',
          code: `bun -e 'const a=process.argv.slice(2);const p=a[0]||"demo";const c={p};console.log({p,size:JSON.stringify(c).length+"B"})'`,
          explanation: 'Complete functionality in one command',
          benefits: ['Portability', 'No files needed']
        }
      ];
  }
  
  response.patterns = {
    argumentHandling: {
      description: 'Clean argument parsing with fallbacks',
      pattern: 'const getPos = (i, fallback) => args[i] ?? fallback',
      useCase: 'CLI tools with optional parameters'
    },
    compression: {
      description: 'Native compression for data storage',
      pattern: 'Bun.zstdCompressSync(JSON.stringify(data))',
      useCase: 'Efficient data storage and transmission'
    },
    output: {
      description: 'Formatted terminal output',
      pattern: 'Bun.wrapAnsi(message, width)',
      useCase: 'Readable CLI output with wrapping'
    },
    oneLiner: {
      description: 'Complete functionality in single command',
      pattern: 'bun -e "..." args',
      useCase: 'Quick scripts and portable tools'
    }
  };
  
  response.bunAdvantages = [
    'Native ZSTD compression',
    'Built-in UUID generation',
    'ANSI text wrapping',
    'Buffer operations',
    'JSON utilities',
    'Environment variable access',
    'One-liner execution'
  ];
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Guides documentation
 */
async function handleGuidesDocs(request: Request, url: URL): Promise<Response> {
  const urls = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_GUIDES];
  
  const response = {
    provider: DocumentationProvider.BUN_GUIDES,
    description: 'Tutorials & Guides Portal',
    urls: urls,
    categories: [
      'getting-started',
      'tutorials', 
      'how-to',
      'best-practices',
      'migration',
      'troubleshooting'
    ]
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Fetch demonstration
 */
async function handleFetchDemo(request: Request, url: URL): Promise<Response> {
  const demo = {
    title: 'Bun Fetch API Demonstration',
    description: 'Comprehensive fetch examples using enhanced documentation system',
    examples: {
      basic: {
        code: `const response = await fetch('${docsURLBuilder.buildTypedArrayURL({ fragment: 'OVERVIEW' })}');
console.log(response.status);`,
        description: 'Basic fetch with enhanced URL builder'
      },
      advanced: {
        code: `const response = await fetch('${docsURLBuilder.buildEnterpriseAPIURL({ 
          version: 'v1', 
          endpoint: 'users' 
        })}', {
  headers: { 'Content-Type': 'application/json' },
  method: 'POST',
  body: JSON.stringify({ name: 'Bun User' })
});`,
        description: 'Advanced fetch with enterprise API'
      },
      typedArrays: {
        code: `const uint8Array = new Uint8Array([1, 2, 3, 4, 5]);
const response = await fetch('/api/content-types', {
  method: 'POST',
  body: uint8Array,
  headers: { 'Content-Type': 'application/octet-stream' }
});`,
        description: 'Typed array handling'
      }
    },
    documentation: {
      official: 'https://bun.sh/docs/runtime/networking/fetch',
      typedArrays: docsURLBuilder.buildTypedArrayURL({ fragment: 'OVERVIEW' }),
      enterprise: docsURLBuilder.buildEnterpriseAPIURL({ version: 'v1', endpoint: 'overview' })
    }
  };
  
  return new Response(JSON.stringify(demo, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Advanced fetch features
 */
async function handleAdvancedFetch(request: Request, url: URL): Promise<Response> {
  const features = {
    timeout: {
      description: 'Request timeout with AbortSignal.timeout()',
      example: `const response = await fetch(url, {
  signal: AbortSignal.timeout(5000) // 5 second timeout
});`
    },
    streaming: {
      description: 'Request/response streaming',
      example: `const stream = new ReadableStream({
  start(controller) {
    controller.enqueue(new Uint8Array([72, 101, 108, 108, 111]));
    controller.close();
  }
});

await fetch(url, { body: stream, method: 'POST' });`
    },
    tls: {
      description: 'TLS configuration',
      example: `await fetch(url, {
  tls: {
    key: Bun.file('/path/to/key.pem'),
    cert: Bun.file('/path/to/cert.pem')
  }
});`
    },
    unix: {
      description: 'Unix domain sockets',
      example: `await fetch(url, {
  unix: '/path/to/socket.sock'
});`
    }
  };
  
  return new Response(JSON.stringify({ features }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Content types demonstration
 */
async function handleContentTypes(request: Request, url: URL): Promise<Response> {
  if (request.method === 'POST') {
    const contentType = request.headers.get('content-type') || 'unknown';
    const body = await request.arrayBuffer();
    
    const response = {
      received: {
        contentType,
        size: body.byteLength,
        timestamp: new Date().toISOString()
      },
      supportedTypes: [
        'application/json',
        'text/plain',
        'application/octet-stream',
        'multipart/form-data',
        'application/x-www-form-urlencoded'
      ]
    };
    
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const types = {
    json: { endpoint: '/api/content-types', method: 'POST', body: '{"message": "Hello"}' },
    binary: { endpoint: '/api/content-types', method: 'POST', body: 'Uint8Array data' },
    text: { endpoint: '/api/content-types', method: 'POST', body: 'Plain text' }
  };
  
  return new Response(JSON.stringify({ types }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Typed arrays demonstration
 */
async function handleTypedArrays(request: Request, url: URL): Promise<Response> {
  const fragment = url.searchParams.get('fragment') || 'OVERVIEW';
  
  const response = {
    description: 'Typed Array Integration with Enhanced Documentation',
    urls: {
      overview: docsURLBuilder.buildTypedArrayURL({ fragment: 'OVERVIEW' }),
      methods: docsURLBuilder.buildTypedArrayURL({ fragment: 'METHODS' }),
      conversion: docsURLBuilder.buildTypedArrayURL({ fragment: 'CONVERSION' }),
      performance: docsURLBuilder.buildTypedArrayURL({ fragment: 'PERFORMANCE' }),
      examples: docsURLBuilder.buildTypedArrayURL({ fragment: 'EXAMPLES' })
    },
    current: docsURLBuilder.buildTypedArrayURL({ fragment: fragment as any }),
    examples: {
      create: `const uint8Array = new Uint8Array([1, 2, 3, 4, 5]);`,
      fetch: `const response = await fetch('${docsURLBuilder.buildTypedArrayURL({ fragment: 'OVERVIEW' })}');`,
      stream: `for await (const chunk of response.body) {
  console.log(chunk); // Uint8Array
}`
    }
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Streaming demonstration
 */
async function handleStreamingDemo(request: Request, url: URL): Promise<Response> {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const messages = [
        'Stream started',
        'Processing data...',
        'Almost done...',
        'Stream completed'
      ];
      
      for (const message of messages) {
        controller.enqueue(encoder.encode(message + '\n'));
        await Bun.sleep(500);
      }
      
      controller.close();
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain',
      'X-Streaming-Demo': 'true'
    }
  });
}

/**
 * RSS feeds handler
 */
async function handleFeeds(request: Request, url: URL): Promise<Response> {
  const urls = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_RSS];
  const feedsUrls = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_FEEDS];
  
  const feeds = {
    // bun.com feeds
    main: urls.MAIN_RSS,
    blog: urls.BLOG_RSS,
    releases: urls.RELEASES_RSS,
    security: urls.SECURITY_RSS,
    community: urls.COMMUNITY_RSS,
    guides: urls.GUIDES_RSS,
    
    // bun.sh technical feeds
    technical: urls.TECHNICAL_RSS,
    
    // Unified feeds from BUN_FEEDS provider
    unified: {
      main: feedsUrls.MAIN_FEED,
      technical: feedsUrls.TECHNICAL_FEED,
      blog: feedsUrls.BLOG_FEED,
      releases: feedsUrls.RELEASES_FEED,
      security: feedsUrls.SECURITY_FEED,
      community: feedsUrls.COMMUNITY_FEED
    }
  };
  
  return new Response(JSON.stringify({ feeds }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * RSS feed proxy
 */
async function handleRSSFeed(request: Request, url: URL): Promise<Response> {
  const feedUrl = url.searchParams.get('url') || 'https://bun.com/rss.xml';
  
  try {
    const response = await fetch(feedUrl);
    const content = await response.text();
    
    return new Response(content, {
      headers: {
        'Content-Type': 'application/rss+xml',
        'X-Source-URL': feedUrl
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: `Failed to fetch RSS feed: ${error.message}` }), { 
      status: 500 
    });
  }
}

/**
 * JSON feed handler
 */
async function handleJSONFeed(request: Request, url: URL): Promise<Response> {
  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'Bun Documentation Feed',
    home_page_url: 'https://bun.com',
    feed_url: `${url.origin}/api/feeds/json`,
    items: [
      {
        id: '1',
        title: 'Enhanced Documentation System',
        url: docsURLBuilder.buildTypedArrayURL({ fragment: 'OVERVIEW' }),
        content_text: 'New unified documentation system with enhanced URL building',
        date_published: new Date().toISOString()
      }
    ]
  };
  
  return new Response(JSON.stringify(feed), {
    headers: { 'Content-Type': 'application/feed+json' }
  });
}

/**
 * CLI search integration
 */
async function handleCLISearch(request: Request, url: URL): Promise<Response> {
  const query = url.searchParams.get('q') || '';
  const domain = url.searchParams.get('domain') as 'sh' | 'com' || 'sh';
  
  if (!query) {
    return new Response(JSON.stringify({ error: 'Query parameter required' }), { status: 400 });
  }
  
  try {
    const results = await docsFetcher.search(query, domain);
    
    return new Response(JSON.stringify({ results }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

/**
 * CLI open integration
 */
async function handleCLIOpen(request: Request, url: URL): Promise<Response> {
  const query = url.searchParams.get('q') || '';
  const domain = url.searchParams.get('domain') as 'sh' | 'com' || 'sh';
  const appMode = url.searchParams.get('app') === 'true';
  
  try {
    await chromeManager.openDocs(query, domain, appMode);
    
    return new Response(JSON.stringify({ 
      message: `Opened docs for "${query}" in ${domain} domain${appMode ? ' (app mode)' : ''}` 
    }));
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

/**
 * Chrome app creation
 */
async function handleChromeApp(request: Request, url: URL): Promise<Response> {
  const domain = url.searchParams.get('domain') as 'sh' | 'com' || 'com';
  
  try {
    const result = await chromeManager.createApp(domain);
    return new Response(JSON.stringify(result));
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

/**
 * Cache statistics
 */
async function handleCacheStats(request: Request, url: URL): Promise<Response> {
  const serverCache = responseCache.getStats();
  const docsCache = (docsFetcher as any).cache.getStats();
  
  return new Response(JSON.stringify({
    server: {
      ...serverCache,
      ttl: CACHE_TTL / 1000 / 60 + ' minutes'
    },
    documentation: docsCache
  }, null, 2));
}

/**
 * Clear cache
 */
async function handleCacheClear(request: Request, url: URL): Promise<Response> {
  responseCache.clear();
  await docsFetcher.updateFallbackData();
  
  return new Response(JSON.stringify({ 
    message: 'Cache cleared successfully',
    timestamp: new Date().toISOString()
  }));
}

/**
 * Test all endpoints
 */
async function handleTestAll(request: Request, url: URL): Promise<Response> {
  const tests = [];
  const baseUrl = url.origin;
  
  // Test basic endpoints
  const endpoints = [
    '/health',
    '/docs/providers',
    '/api/fetch/demo',
    '/docs/search?q=fetch',
    '/cache/stats'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(baseUrl + endpoint);
      tests.push({
        endpoint,
        status: response.status,
        success: response.ok
      });
    } catch (error) {
      tests.push({
        endpoint,
        error: error.message,
        success: false
      });
    }
  }
  
  const summary = {
    timestamp: new Date().toISOString(),
    totalTests: tests.length,
    passed: tests.filter(t => t.success).length,
    failed: tests.filter(t => !t.success).length,
    tests
  };
  
  return new Response(JSON.stringify(summary, null, 2));
}

/**
 * Performance test
 */
async function handlePerformanceTest(request: Request, url: URL): Promise<Response> {
  const start = performance.now();
  
  // Test URL builder performance
  const urlBuilderStart = performance.now();
  for (let i = 0; i < 1000; i++) {
    docsURLBuilder.buildTypedArrayURL({ fragment: 'OVERVIEW' });
  }
  const urlBuilderTime = performance.now() - urlBuilderStart;
  
  // Test validator performance
  const validatorStart = performance.now();
  for (let i = 0; i < 1000; i++) {
    DocumentationURLValidator.validateURL('https://bun.sh/docs/api');
  }
  const validatorTime = performance.now() - validatorStart;
  
  const totalTime = performance.now() - start;
  
  const results = {
    urlBuilder: {
      operations: 1000,
      time: urlBuilderTime.toFixed(2) + 'ms',
      avgTime: (urlBuilderTime / 1000).toFixed(4) + 'ms'
    },
    validator: {
      operations: 1000,
      time: validatorTime.toFixed(2) + 'ms',
      avgTime: (validatorTime / 1000).toFixed(4) + 'ms'
    },
    total: totalTime.toFixed(2) + 'ms'
  };
  
  return new Response(JSON.stringify(results, null, 2));
}

/**
 * Error handler
 */
function handleError(error: Error, request: Request, url: URL): Response {
  console.error(`❌ Error handling ${url.pathname}:`, error instanceof Error ? error.message : String(error));
  
  return new Response(JSON.stringify({
    error: 'Internal server error',
    message: error.message,
    path: url.pathname,
    timestamp: new Date().toISOString()
  }), { 
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * 404 handler
 */
function handleNotFound(request: Request, url: URL): Response {
  return new Response(JSON.stringify({
    error: 'Endpoint not found',
    path: url.pathname,
    availableEndpoints: [
      '/', '/health', '/docs/search', '/docs/providers',
      '/docs/github', '/docs/mdn', '/docs/performance', '/docs/internal',
      '/docs/paths', '/docs/quick-ref',
      '/docs/reference', '/docs/guides',
      '/api/fetch/demo', '/api/content-types', '/api/typed-arrays',
      '/api/url-builder/demo', '/api/url-builder/stats',
      '/api/validator/validate', '/api/validator/best-source',
      '/api/validator/normalize', '/api/validator/migration',
      '/api/examples/usage', '/api/sources/comparison',
      '/api/github/parse', '/api/github/commit', '/api/github/bun-types', 
      '/api/github/text-fragment', '/api/github/critical-urls',
      '/api/cli/cookie-scanner', '/api/cli/efficiency',
      '/api/rss/fetch', '/api/rss/combined', '/api/rss/documentation', '/api/rss/feed',
      '/cli/search', '/cache/stats', '/test/all'
    ],
    timestamp: new Date().toISOString()
  }), { 
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Generate dashboard HTML
 */
function generateDashboardHTML(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>🏗️ Unified Base Server - Bun Documentation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; }
    h1 { margin-bottom: 0.5rem; }
    .grid { display: grid; gap: 1.5rem; margin: 2rem 0; }
    .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; background: #f7fafc; }
    h2 { color: #2d3748; margin-bottom: 1rem; border-bottom: 2px solid #4299e1; padding-bottom: 0.5rem; }
    pre { background: #1a202c; color: #e2e8f0; padding: 1rem; border-radius: 6px; overflow-x: auto; font-size: 0.9rem; margin: 0.5rem 0; }
    code { background: #edf2f7; padding: 0.2rem 0.4rem; border-radius: 4px; font-family: 'SFMono-Regular', monospace; }
    ul { list-style: none; padding-left: 0; }
    li { padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0; }
    li:last-child { border-bottom: none; }
    a { color: #4299e1; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .endpoint { display: flex; justify-content: space-between; align-items: center; }
    .badge { background: #4299e1; color: white; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: bold; }
    .test-btn { background: #48bb78; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: bold; }
    .test-btn:hover { background: #38a169; }
    .response { margin-top: 1rem; padding: 1rem; background: #e6fffa; border-radius: 6px; display: none; }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <h1>🏗️ Unified Base Server</h1>
      <p>Comprehensive Bun Documentation System with Enhanced Features</p>
      <p style="margin-top: 1rem; font-size: 0.9rem;">
        Port: 3000 | Domains: bun.sh (technical) + bun.com (guides) | CLI Integration
      </p>
    </div>
  </header>
  
  <div class="container">
    <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
      
      <!-- Documentation Endpoints -->
      <div class="card">
        <h2>📚 Documentation</h2>
        <ul>
          <li class="endpoint">
            <a href="/docs/search?q=fetch">Search Documentation</a>
            <span class="badge">CLI</span>
          </li>
          <li class="endpoint">
            <a href="/docs/providers">Documentation Providers</a>
            <span class="badge">JSON</span>
          </li>
          <li class="endpoint">
            <a href="/docs/bun-sh">bun.sh Technical Docs</a>
            <span class="badge">API</span>
          </li>
          <li class="endpoint">
            <a href="/docs/bun-com">bun.com Guides</a>
            <span class="badge">Portal</span>
          </li>
          <li class="endpoint">
            <a href="/docs/reference">Reference Portal</a>
            <span class="badge">Interactive</span>
          </li>
          <li class="endpoint">
            <a href="/docs/reference?section=api">API Reference</a>
            <span class="badge">Detailed</span>
          </li>
          <li class="endpoint">
            <a href="/docs/reference?section=cli">CLI Reference</a>
            <span class="badge">Commands</span>
          </li>
          <li class="endpoint">
            <a href="/docs/reference?section=cheatsheet">Cheatsheet</a>
            <span class="badge">Quick</span>
          </li>
        </ul>
      </div>
      
      <!-- External Documentation -->
      <div class="card">
        <h2>🌐 External Docs</h2>
        <ul>
          <li class="endpoint">
            <a href="/docs/github">GitHub Enterprise</a>
            <span class="badge">API</span>
          </li>
          <li class="endpoint">
            <a href="/docs/mdn?search=fetch">MDN Web Docs</a>
            <span class="badge">Reference</span>
          </li>
          <li class="endpoint">
            <a href="/docs/performance">Performance Guides</a>
            <span class="badge">Optimization</span>
          </li>
          <li class="endpoint">
            <a href="/docs/internal">Internal Wiki</a>
            <span class="badge">Enterprise</span>
          </li>
          <li class="endpoint">
            <a href="/docs/paths">Path Constants</a>
            <span class="badge">Structure</span>
          </li>
          <li class="endpoint">
            <a href="/docs/quick-ref">Quick Reference</a>
            <span class="badge">Common</span>
          </li>
        </ul>
      </div>
      
      <!-- API Demonstrations -->
      <div class="card">
        <h2>🚀 API Demos</h2>
        <ul>
          <li class="endpoint">
            <a href="/api/fetch/demo">Fetch Demo</a>
            <span class="badge">GET</span>
          </li>
          <li class="endpoint">
            <a href="/api/fetch/advanced">Advanced Fetch</a>
            <span class="badge">Features</span>
          </li>
          <li class="endpoint">
            <a href="/api/content-types">Content Types</a>
            <span class="badge">POST</span>
          </li>
          <li class="endpoint">
            <a href="/api/typed-arrays">Typed Arrays</a>
            <span class="badge">Integration</span>
          </li>
          <li class="endpoint">
            <a href="/api/streaming">Streaming Demo</a>
            <span class="badge">Live</span>
          </li>
          <li class="endpoint">
            <a href="/api/url-builder/demo">URL Builder Demo</a>
            <span class="badge">Enhanced</span>
          </li>
          <li class="endpoint">
            <a href="/api/url-builder/stats">URL Builder Stats</a>
            <span class="badge">Analytics</span>
          </li>
          <li class="endpoint">
            <a href="/api/validator/validate?url=https://bun.sh/docs/api/fetch">Validate URL</a>
            <span class="badge">Validation</span>
          </li>
          <li class="endpoint">
            <a href="/api/validator/best-source?topic=fetch">Best Source</a>
            <span class="badge">Recommendation</span>
          </li>
          <li class="endpoint">
            <a href="/api/examples/usage">Usage Examples</a>
            <span class="badge">Practical</span>
          </li>
          <li class="endpoint">
            <a href="/api/sources/comparison">Sources Comparison</a>
            <span class="badge">Analysis</span>
          </li>
        </ul>
      </div>
      
      <!-- GitHub Integration -->
      <div class="card">
        <h2>🐙 GitHub Integration</h2>
        <ul>
          <li class="endpoint">
            <a href="/api/github/parse?url=https://github.com/oven-sh/bun/tree/main/packages/bun-types">Parse GitHub URL</a>
            <span class="badge">Analysis</span>
          </li>
          <li class="endpoint">
            <a href="/api/github/commit">GitHub Commit</a>
            <span class="badge">Specific</span>
          </li>
          <li class="endpoint">
            <a href="/api/github/bun-types">Bun Types</a>
            <span class="badge">TypeScript</span>
          </li>
          <li class="endpoint">
            <a href="/api/github/text-fragment?text=node:zlib">Text Fragment</a>
            <span class="badge">Deep Link</span>
          </li>
          <li class="endpoint">
            <a href="/api/github/critical-urls">Critical URLs</a>
            <span class="badge">Collection</span>
          </li>
        </ul>
      </div>
      
      <!-- CLI Tooling -->
      <div class="card">
        <h2>⚡ CLI Tooling</h2>
        <ul>
          <li class="endpoint">
            <a href="/api/cli/cookie-scanner">Cookie Scanner</a>
            <span class="badge">Demo</span>
          </li>
          <li class="endpoint">
            <a href="/api/cli/efficiency">CLI Efficiency</a>
            <span class="badge">Patterns</span>
          </li>
        </ul>
      </div>
      
      <!-- CLI Integration -->
      <div class="card">
        <h2>💻 CLI Integration</h2>
        <ul>
          <li class="endpoint">
            <a href="/cli/search?q=http%20server">CLI Search</a>
            <span class="badge">Search</span>
          </li>
          <li class="endpoint">
            <a href="/cli/open?q=fetch&domain=sh">CLI Open</a>
            <span class="badge">Chrome</span>
          </li>
          <li class="endpoint">
            <a href="/cli/app?domain=com">Chrome App</a>
            <span class="badge">PWA</span>
          </li>
        </ul>
        <pre><code># CLI Commands
bun docs search "http server"
bun docs open fetch --sh --app
bun docs index</code></pre>
      </div>
      
      <!-- System Management -->
      <div class="card">
        <h2>⚙️ System</h2>
        <ul>
          <li class="endpoint">
            <a href="/health">Health Check</a>
            <span class="badge">Status</span>
          </li>
          <li class="endpoint">
            <a href="/cache/stats">Cache Statistics</a>
            <span class="badge">Performance</span>
          </li>
          <li class="endpoint">
            <a href="/cache/clear">Clear Cache</a>
            <span class="badge">Maintenance</span>
          </li>
          <li class="endpoint">
            <a href="/test/all">Test All Endpoints</a>
            <span class="badge">Diagnostics</span>
          </li>
          <li class="endpoint">
            <a href="/test/performance">Performance Test</a>
            <span class="badge">Benchmark</span>
          </li>
        </ul>
      </div>
      
      <!-- RSS Feeds -->
      <div class="card">
        <h2>📡 RSS Feeds</h2>
        <ul>
          <li class="endpoint">
            <a href="/api/feeds">All Feeds</a>
            <span class="badge">JSON</span>
          </li>
          <li class="endpoint">
            <a href="/api/feeds/rss">RSS Feed</a>
            <span class="badge">XML</span>
          </li>
          <li class="endpoint">
            <a href="/api/rss/fetch">Fetch RSS</a>
            <span class="badge">JSON</span>
          </li>
          <li class="endpoint">
            <a href="/api/rss/combined">Combined RSS</a>
            <span class="badge">Merged</span>
          </li>
          <li class="endpoint">
            <a href="/api/rss/documentation">Documentation RSS</a>
            <span class="badge">Generated</span>
          </li>
          <li class="endpoint">
            <a href="/api/feeds/json">JSON Feed</a>
            <span class="badge">JSON</span>
          </li>
        </ul>
        <pre><code>// Enhanced Feed URLs
bun.com Main: https://bun.com/rss.xml
bun.sh Technical: https://bun.sh/rss.xml
Blog: https://bun.com/blog/rss.xml
Releases: https://bun.com/releases/rss.xml
Security: https://bun.com/security/rss.xml</code></pre>
      </div>
      
    </div>
    
    <!-- Quick Test Section -->
    <div style="text-align: center; margin: 2rem 0;">
      <button class="test-btn" onclick="testAllEndpoints()">
        🧪 Test All Endpoints
      </button>
      <div id="testResults" class="response"></div>
    </div>
    
    <!-- Enhanced Features -->
    <div class="card">
      <h2>✨ Enhanced Features</h2>
      <ul>
        <li><strong>Domain Distinction:</strong> bun.sh (technical) vs bun.com (guides)</li>
        <li><strong>CLI Integration:</strong> Search, open, and Chrome app creation</li>
        <li><strong>Enhanced URL Builder:</strong> Advanced URL construction with caching and analytics</li>
        <li><strong>URL Validation:</strong> Comprehensive URL validation and categorization</li>
        <li><strong>Smart Recommendations:</strong> Best documentation source suggestions by topic</li>
        <li><strong>URL Normalization:</strong> Automatic URL format standardization</li>
        <li><strong>Migration Detection:</strong> Identify URLs that need updating</li>
        <li><strong>Content-Type Handling:</strong> Comprehensive media type support</li>
        <li><strong>Performance Optimization:</strong> Caching and benchmarking</li>
        <li><strong>Typed Array Integration:</strong> Binary data handling</li>
        <li><strong>Streaming Support:</strong> Real-time data streams</li>
        <li><strong>CORS Support:</strong> Cross-origin requests enabled</li>
        <li><strong>Analytics & Monitoring:</strong> URL usage tracking and statistics</li>
        <li><strong>Enterprise Features:</strong> Multi-provider documentation system</li>
      </ul>
    </div>
  </div>
  
  <script>
    async function testAllEndpoints() {
      const results = document.getElementById('testResults');
      results.style.display = 'block';
      results.innerHTML = '<p>🧪 Testing all endpoints...</p>';
      
      try {
        const response = await fetch('/test/all');
        const data = await response.json();
        
        results.innerHTML = \`
          <h3>✅ Test Results</h3>
          <p>Total Tests: \${data.totalTests}</p>
          <p>Passed: \${data.passed}</p>
          <p>Failed: \${data.failed}</p>
          <div style="margin-top: 1rem;">
            \${data.tests.map(test => 
              \`<div style="padding: 0.25rem 0;">
                \${test.success ? '✅' : '❌'} \${test.endpoint}
                \${test.error ? ' - ' + test.error : ''}
              </div>\`
            ).join('')}
          </div>
        \`;
      } catch (error) {
        results.innerHTML = \`<p style="color: #c53030;">❌ Test failed: \${error.message}</p>\`;
      }
    }
  </script>
</body>
</html>`;
}

console.log(`🏗️ Unified Base Server running on http://${SERVER_HOST}:${SERVER_PORT}`);
console.log(`📚 Documentation: https://bun.sh/docs | https://bun.com/guides`);
console.log(`💻 CLI Integration: Available via /cli/* endpoints`);
console.log(`⚡ Enhanced Features: Domain distinction, caching, Chrome apps`);
