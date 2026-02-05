#!/usr/bin/env bun

/**
 * 📚 FactoryWager Reference Manager v5.1
 *
 * Centralized reference management for documentation URLs,
 * secrets, and system resources
 */

import { BUN_DOCS_EXTENDED } from './docs/urls.ts';

interface ReferenceItem {
  url: string;
  title?: string;
  category?: string;
  domain?: 'sh' | 'com';
}

class ReferenceManager {
  private references: Map<string, ReferenceItem> = new Map();

  constructor() {
    this.initializeReferences();
  }

  private initializeReferences() {
    // Initialize with documentation URLs
    this.references.set('secrets-versioning', {
      url: BUN_DOCS_EXTENDED.runtime.secrets.versioning.com,
      title: 'Secrets Versioning',
      category: 'runtime',
      domain: 'com'
    });

    this.references.set('secrets-lifecycle', {
      url: BUN_DOCS_EXTENDED.runtime.secrets.lifecycle.com,
      title: 'Secrets Lifecycle Management',
      category: 'runtime',
      domain: 'com'
    });

    this.references.set('secrets-rollback', {
      url: BUN_DOCS_EXTENDED.runtime.secrets.rollback.com,
      title: 'Secrets Rollback',
      category: 'runtime',
      domain: 'com'
    });

    this.references.set('factorywager-secrets', {
      url: 'https://factorywager.com/docs/secrets',
      title: 'FactoryWager Secrets',
      category: 'enterprise',
      domain: 'com'
    });
  }

  get(key: string, domain?: 'sh' | 'com'): ReferenceItem | undefined {
    const ref = this.references.get(key);
    if (!ref) return undefined;

    // Return domain-specific URL if requested
    if (domain && ref.domain !== domain) {
      const altKey = `${key}-${domain}`;
      return this.references.get(altKey) || ref;
    }

    return ref;
  }

  getUrl(key: string, domain?: 'sh' | 'com'): string | undefined {
    return this.get(key, domain)?.url;
  }

  add(key: string, reference: ReferenceItem) {
    this.references.set(key, reference);
  }

  list(category?: string): ReferenceItem[] {
    const refs = Array.from(this.references.values());
    return category ? refs.filter(ref => ref.category === category) : refs;
  }
}

// Export singleton instance
export const refs = new ReferenceManager();
export { ReferenceManager };