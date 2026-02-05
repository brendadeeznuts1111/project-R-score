/**
 * 📚 Documentation Patterns and Relationships
 * 
 * Centralized documentation URL management and pattern matching
 * 
 * @version 1.0.0
 */

import { BUN_DOCS } from '../core-documentation';

export const DOC_PATTERNS = {
  // URL pattern matching
  patterns: {
    // Runtime patterns
    '/runtime/secrets': 'secrets',
    '/runtime/color': 'color',
    '/runtime/file-system': 'filesystem',
    '/runtime/network': 'network',
    '/runtime/process': 'process',
    '/runtime/hashing': 'hashing',
    
    // API patterns
    '/api/bun': 'bun-api',
    '/api/bun-serve': 'serve-api',
    '/api/bun-write': 'write-api',
    '/api/bun-spawn': 'spawn-api',
    
    // Guide patterns
    '/guides/getting-started': 'getting-started',
    '/guides/deployment': 'deployment',
    '/guides/testing': 'testing',
  },

  // Get related documentation
  getRelatedDocs: (url: string): string[] => {
    if (url.includes('/runtime/secrets')) {
      const related = [
        BUN_DOCS.secrets.overview,
        BUN_DOCS.secrets.api,
        BUN_DOCS.secrets.getOptions,
        BUN_DOCS.secrets.versioning,
        BUN_DOCS.secrets.rollback,
        BUN_DOCS.runtime('binary-data'),
        BUN_DOCS.runtime('typescript'),
        BUN_DOCS.runtime('hashing') // Added hashing docs
      ];
      return related;
    }
    
    if (url.includes('/runtime/hashing')) {
      const related = [
        BUN_DOCS.runtime('hashing'),
        BUN_DOCS.runtime('secrets'),
        BUN_DOCS.runtime('binary-data'),
        BUN_DOCS.runtime('crypto')
      ];
      return related;
    }
    
    if (url.includes('/runtime/color')) {
      const related = [
        BUN_DOCS.color.main,
        BUN_DOCS.color.flexibleInput,
        BUN_DOCS.color.formatANSI,
        BUN_DOCS.color.formatNumbers,
        BUN_DOCS.color.formatHex,
        BUN_DOCS.color.getChannels,
        BUN_DOCS.color.bundleTime
      ];
      return related;
    }
    
    if (url.includes('/runtime/file-system')) {
      const related = [
        BUN_DOCS.runtime('file-io'),
        BUN_DOCS.runtime('binary-data'),
        BUN_DOCS.runtime('watcher'),
        BUN_DOCS.runtime('path')
      ];
      return related;
    }
    
    if (url.includes('/runtime/network')) {
      const related = [
        BUN_DOCS.runtime('fetch'),
        BUN_DOCS.runtime('websocket'),
        BUN_DOCS.runtime('proxy'),
        BUN_DOCS.runtime('tls')
      ];
      return related;
    }
    
    if (url.includes('/api/bun-serve')) {
      const related = [
        BUN_DOCS.bundler.main,
        BUN_DOCS.bundler.server,
        BUN_DOCS.bundler.static,
        BUN_DOCS.bundler.plugins
      ];
      return related;
    }
    
    if (url.includes('/guides/deployment')) {
      const related = [
        BUN_DOCS.deployment.docker,
        BUN_DOCS.deployment.aws,
        BUN_DOCS.deployment.vercel,
        BUN_DOCS.deployment.railway
      ];
      return related;
    }
    
    return [];
  },

  // Get documentation category
  getCategory: (url: string): string => {
    if (url.includes('/runtime/')) return 'Runtime';
    if (url.includes('/api/')) return 'API';
    if (url.includes('/guides/')) return 'Guides';
    if (url.includes('/bundler/')) return 'Bundler';
    if (url.includes('/tester/')) return 'Tester';
    return 'Other';
  },

  // Get documentation priority
  getPriority: (url: string): 'high' | 'medium' | 'low' => {
    const highPriority = [
      '/runtime/secrets',
      '/runtime/color',
      '/api/bun',
      '/guides/getting-started'
    ];
    
    const mediumPriority = [
      '/runtime/file-system',
      '/runtime/network',
      '/api/bun-serve',
      '/guides/deployment'
    ];
    
    if (highPriority.some(pattern => url.includes(pattern))) return 'high';
    if (mediumPriority.some(pattern => url.includes(pattern))) return 'medium';
    return 'low';
  },

  // Generate breadcrumb navigation
  generateBreadcrumbs: (url: string): string[] => {
    const parts = url.split('/').filter(Boolean);
    const breadcrumbs = ['Home'];
    
    let currentPath = '';
    for (const part of parts) {
      currentPath += '/' + part;
      const name = part
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      breadcrumbs.push(name);
    }
    
    return breadcrumbs;
  },

  // Search documentation
  search: (query: string): string[] => {
    const allDocs = [
      ...Object.values(BUN_DOCS.secrets),
      ...Object.values(BUN_DOCS.color),
      ...Object.values(BUN_DOCS.runtime),
      ...Object.values(BUN_DOCS.api),
      ...Object.values(BUN_DOCS.guides)
    ];
    
    return allDocs.filter(doc => 
      doc.toLowerCase().includes(query.toLowerCase())
    );
  },

  // Validate documentation URL
  isValidURL: (url: string): boolean => {
    try {
      new URL(url, 'https://bun.sh');
      return true;
    } catch {
      return false;
    }
  },

  // Get documentation metadata
  getMetadata: (url: string) => {
    return {
      url,
      category: DOC_PATTERNS.getCategory(url),
      priority: DOC_PATTERNS.getPriority(url),
      related: DOC_PATTERNS.getRelatedDocs(url),
      breadcrumbs: DOC_PATTERNS.generateBreadcrumbs(url),
      isValid: DOC_PATTERNS.isValidURL(url)
    };
  }
} as const;

export default DOC_PATTERNS;
