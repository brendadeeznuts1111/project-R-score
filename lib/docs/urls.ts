#!/usr/bin/env bun

/**
 * 📚 FactoryWager Documentation URLs v5.1
 *
 * Extended documentation URL management for Bun runtime,
 * secrets API, and versioning features
 *
 * @version 5.1
 */

import { BUN_DOCS } from './constants/domains';

// Base domain configuration
export const DOC_DOMAINS = {
  bun_sh: 'https://bun.sh',
  bun_com: 'https://bun.com',
  bun_dev: 'https://bun.dev',
  bun_io: 'https://bun.io'
} as const;

// Helper function to build runtime documentation URLs
export const runtimeDoc = (
  section: string,
  subsection?: string,
  domain: 'sh' | 'com' = 'sh'
): string => {
  const base = DOC_DOMAINS[`bun_${domain}`];
  const path = subsection
    ? `/docs/runtime/${section}/${subsection}`
    : `/docs/runtime/${section}`;
  return `${base}${path}`;
};

// Extended Bun documentation URLs with versioning support
export const BUN_DOCS_EXTENDED = {
  // Core domains
  domains: DOC_DOMAINS,

  // Runtime documentation
  runtime: {
    overview: runtimeDoc('overview'),
    installation: runtimeDoc('installation'),
    configuration: runtimeDoc('configuration'),
    api: runtimeDoc('api'),

    // Secrets API with versioning extensions
    secrets: {
      overview: runtimeDoc('secrets', 'overview'),
      basic: runtimeDoc('secrets', 'basic-usage'),
      advanced: runtimeDoc('secrets', 'advanced-features'),

      // Versioning extensions (v5.1)
      versioning: runtimeDoc('secrets', 'versioning'),
      lifecycle: runtimeDoc('secrets', 'lifecycle-management'),
      rollback: runtimeDoc('secrets', 'rollback'),
      visualization: runtimeDoc('secrets', 'version-visualization'),

      // Com domain references
      com: {
        overview: runtimeDoc('secrets', 'overview', 'com'),
        basic: runtimeDoc('secrets', 'basic-usage', 'com'),
        advanced: runtimeDoc('secrets', 'advanced-features', 'com'),
        versioning: runtimeDoc('secrets', 'versioning', 'com'),
        lifecycle: runtimeDoc('secrets', 'lifecycle-management', 'com'),
        rollback: runtimeDoc('secrets', 'rollback', 'com'),
        visualization: runtimeDoc('secrets', 'version-visualization', 'com')
      }
    },

    // Other runtime features
    filesystem: runtimeDoc('filesystem'),
    networking: runtimeDoc('networking'),
    concurrency: runtimeDoc('concurrency'),
    testing: runtimeDoc('testing'),
    bundling: runtimeDoc('bundling'),
    plugins: runtimeDoc('plugins')
  },

  // Guides and tutorials
  guides: {
    gettingStarted: `${DOC_DOMAINS.bun_com}/guides/getting-started`,
    tutorials: `${DOC_DOMAINS.bun_com}/guides/tutorials`,
    examples: `${DOC_DOMAINS.bun_com}/guides/examples`,
    troubleshooting: `${DOC_DOMAINS.bun_com}/guides/troubleshooting`,

    // Secrets-specific guides
    secrets: {
      basic: `${DOC_DOMAINS.bun_com}/guides/secrets-basic`,
      versioning: `${DOC_DOMAINS.bun_com}/guides/secrets-versioning`,
      production: `${DOC_DOMAINS.bun_com}/guides/secrets-production`
    }
  },

  // Reference documentation
  reference: {
    api: `${DOC_DOMAINS.bun_com}/reference/api`,
    cli: `${DOC_DOMAINS.bun_com}/reference/cli`,
    config: `${DOC_DOMAINS.bun_com}/reference/config`,
    runtime: `${DOC_DOMAINS.bun_com}/reference/runtime`,

    // Secrets reference with versioning
    secrets: {
      api: `${DOC_DOMAINS.bun_com}/reference/secrets/api`,
      versioning: `${DOC_DOMAINS.bun_com}/reference/secrets/versioning`,
      lifecycle: `${DOC_DOMAINS.bun_com}/reference/secrets/lifecycle`,
      rollback: `${DOC_DOMAINS.bun_com}/reference/secrets/rollback`
    }
  },

  // Helper for version-specific docs
  versionRef: (version: string, domain: 'sh' | 'com' = 'sh'): string =>
    `${DOC_DOMAINS[`bun_${domain}`]}/docs/runtime/secrets#version-${version}`,

  // Community and external resources
  community: {
    discord: 'https://bun.com/discord',
    github: 'https://github.com/oven-sh/bun',
    issues: 'https://github.com/oven-sh/bun/issues',
    discussions: 'https://github.com/oven-sh/bun/discussions',
    stackoverflow: 'https://stackoverflow.com/questions/tagged/bun'
  },

  // FactoryWager specific extensions
  factorywager: {
    secrets: {
      versioning: 'https://factorywager.com/docs/secrets/versioning',
      lifecycle: 'https://factorywager.com/docs/secrets/lifecycle',
      rollback: 'https://factorywager.com/docs/secrets/rollback',
      visualization: 'https://factorywager.com/docs/secrets/visualization'
    }
  }
} as const;

// Quick access functions for common documentation URLs
export const getSecretsDocs = (feature?: string, domain: 'sh' | 'com' = 'sh'): string => {
  if (!feature) return BUN_DOCS_EXTENDED.runtime.secrets.overview;

  const docs = BUN_DOCS_EXTENDED.runtime.secrets[domain === 'com' ? 'com' : 'overview'];
  return typeof docs === 'string' ? docs : docs[feature] || docs.overview;
};

export const getVersioningDocs = (domain: 'sh' | 'com' = 'com'): string => {
  return BUN_DOCS_EXTENDED.runtime.secrets[domain === 'com' ? 'com' : 'overview'].versioning;
};

export const getLifecycleDocs = (domain: 'sh' | 'com' = 'com'): string => {
  return BUN_DOCS_EXTENDED.runtime.secrets[domain === 'com' ? 'com' : 'overview'].lifecycle;
};

export const getRollbackDocs = (domain: 'sh' | 'com' = 'com'): string => {
  return BUN_DOCS_EXTENDED.runtime.secrets[domain === 'com' ? 'com' : 'overview'].rollback;
};

// Export for backward compatibility
export { BUN_DOCS_EXTENDED as BUN_DOCS };