// lib/docs/legacy-compat.ts — Legacy compatibility layer

import { docsURLBuilder } from '../../packages/docs-tools/src/builders/url-builder';
import {
  QUICK_REFERENCE_URLS,
  ENTERPRISE_DOCUMENTATION_BASE_URLS,
  DocumentationProvider,
} from './constants/domains';

// Derive BUN_DOCS from the canonical enterprise source
const _official = ENTERPRISE_DOCUMENTATION_BASE_URLS[DocumentationProvider.BUN_OFFICIAL];
export const BUN_DOCS = {
  BASE: _official.BASE,
  DOCS: _official.DOCS,
  API: _official.API,
  RUNTIME: _official.RUNTIME,
  CLI: _official.CLI,
  GUIDES: _official.GUIDES,
  EXAMPLES: _official.EXAMPLES,
  BLOG: _official.BLOG,
  SECURITY: _official.SECURITY,
  PERFORMANCE: _official.PERFORMANCE,
};

export const TYPED_ARRAY_URLS = {
  MAIN: docsURLBuilder.buildTypedArrayURL({ fragment: 'OVERVIEW' }),
  METHODS: docsURLBuilder.buildTypedArrayURL({ fragment: 'METHODS' }),
  CONVERSION: docsURLBuilder.buildTypedArrayURL({ fragment: 'CONVERSION' }),
  PERFORMANCE: docsURLBuilder.buildTypedArrayURL({ fragment: 'PERFORMANCE' }),
  EXAMPLES: docsURLBuilder.buildTypedArrayURL({ fragment: 'EXAMPLES' }),
  BUFFER: docsURLBuilder.buildTypedArrayURL({ fragment: 'BUFFER' }),
  DATA_VIEW: docsURLBuilder.buildTypedArrayURL({ fragment: 'DATA_VIEW' }),
  SHARED_ARRAY_BUFFER: docsURLBuilder.buildTypedArrayURL({ fragment: 'SHARED_ARRAY_BUFFER' }),
};

export const RSS_URLS = {
  MAIN: 'https://bun.com/rss.xml',
  TECHNICAL: 'https://bun.sh/rss.xml',
  BLOG: 'https://bun.com/blog/rss.xml',
  RELEASES: 'https://bun.com/releases/rss.xml',
  SECURITY: 'https://bun.com/security/rss.xml',
  COMMUNITY: 'https://bun.com/community/rss.xml',
  GUIDES: 'https://bun.com/guides/rss.xml',
};

export const FETCH_API_URLS = {
  OVERVIEW: docsURLBuilder.buildFetchAPIDocsURL(),
  REQUESTS: docsURLBuilder.buildFetchAPIDocsURL({ fragment: 'requests' }),
  RESPONSES: docsURLBuilder.buildFetchAPIDocsURL({ fragment: 'responses' }),
  HEADERS: docsURLBuilder.buildFetchAPIDocsURL({ fragment: 'headers' }),
  TIMEOUTS: docsURLBuilder.buildFetchAPIDocsURL({ fragment: 'timeouts' }),
  AUTHENTICATION: docsURLBuilder.buildFetchAPIDocsURL({ fragment: 'authentication' }),
  PROGRESS: docsURLBuilder.buildFetchAPIDocsURL({ fragment: 'progress' }),
  ABORT: docsURLBuilder.buildFetchAPIDocsURL({ fragment: 'abort' }),
};

// Legacy CLI documentation URLs
export const CLI_DOCS = {
  OVERVIEW: 'https://bun.sh/docs/cli',
  RUN: 'https://bun.sh/docs/cli/run',
  TEST: 'https://bun.sh/docs/cli/test',
  BUILD: 'https://bun.sh/docs/cli/build',
  INSTALL: 'https://bun.sh/docs/cli/install',
  ADD: 'https://bun.sh/docs/cli/add',
  REMOVE: 'https://bun.sh/docs/cli/remove',
  CREATE: 'https://bun.sh/docs/cli/create',
  UPGRADE: 'https://bun.sh/docs/cli/upgrade',
  INIT: 'https://bun.sh/docs/cli/init',
  DEVMODE: 'https://bun.sh/docs/cli/dev',
  PM: 'https://bun.sh/docs/cli/pm',
  X: 'https://bun.sh/docs/cli/x',
};

// Legacy utility function URLs
export const UTILS_URLS = {
  OVERVIEW: 'https://bun.sh/docs/api/utils',
  READ_FILE: 'https://bun.sh/docs/api/utils#readfile',
  WRITE_FILE: 'https://bun.sh/docs/api/utils#writefile',
  EXISTS: 'https://bun.sh/docs/api/utils#exists',
  FILE: 'https://bun.sh/docs/api/utils#file',
  IS_TYPE_ARRAY: 'https://bun.sh/docs/api/utils#istypedarray',
  TO_BUFFER: 'https://bun.sh/docs/api/utils#tobuffer',
  ESCAPE_HTML: 'https://bun.sh/docs/api/utils#escapehtml',
  PASSWORD: 'https://bun.sh/docs/api/utils#password',
  HASH: 'https://bun.sh/docs/api/utils#hash',
  UUID: 'https://bun.sh/docs/api/utils#uuid',
};

// Legacy GitHub URLs
export const GITHUB_URLS = {
  REPOSITORY: 'https://github.com/oven-sh/bun',
  RELEASES: 'https://github.com/oven-sh/bun/releases',
  ISSUES: 'https://github.com/oven-sh/bun/issues',
  PULL_REQUESTS: 'https://github.com/oven-sh/bun/pulls',
  DISCUSSIONS: 'https://github.com/oven-sh/bun/discussions',
  WIKI: 'https://github.com/oven-sh/bun/wiki',
  BUN_TYPES: 'https://github.com/oven-sh/bun/tree/main/packages/bun-types',
  BUN_TEST: 'https://github.com/oven-sh/bun/tree/main/packages/bun-test',
  BUN_FFI: 'https://github.com/oven-sh/bun/tree/main/packages/bun-ffi',
  BUN_PM: 'https://github.com/oven-sh/bun/tree/main/packages/bun-pm',
};

// Legacy migration helpers
export const LEGACY_HELPERS = {
  /**
   * Get URL for a specific utility function
   */
  getUtilURL: (utilName: string): string => {
    const utilKey = utilName.toUpperCase() as keyof typeof UTILS_URLS;
    return UTILS_URLS[utilKey] || UTILS_URLS.OVERVIEW;
  },

  /**
   * Get URL for a specific CLI command
   */
  getCLIURL: (command: string): string => {
    const cmdKey = command.toUpperCase() as keyof typeof CLI_DOCS;
    return CLI_DOCS[cmdKey] || CLI_DOCS.OVERVIEW;
  },

  /**
   * Get URL for a specific typed array method
   */
  getTypedArrayURL: (method: string): string => {
    const methodKey = method.toUpperCase() as keyof typeof TYPED_ARRAY_URLS;
    return TYPED_ARRAY_URLS[methodKey] || TYPED_ARRAY_URLS.MAIN;
  },

  /**
   * Get URL for fetch API specific section
   */
  getFetchURL: (section: string): string => {
    const sectionKey = section.toUpperCase() as keyof typeof FETCH_API_URLS;
    return FETCH_API_URLS[sectionKey] || FETCH_API_URLS.OVERVIEW;
  },

  /**
   * Build GitHub URL for specific commit and path
   */
  getGitHubURL: (commitHash: string, path: string = ''): string => {
    return `https://github.com/oven-sh/bun/tree/${commitHash}${path ? `/${path}` : ''}`;
  },

  /**
   * Get raw GitHub content URL
   */
  getGitHubRawURL: (commitHash: string, path: string): string => {
    return `https://raw.githubusercontent.com/oven-sh/bun/${commitHash}/${path}`;
  },
};

// Legacy constants that might be used in existing code
export const LEGACY_CONSTANTS = {
  // Base URLs
  BUN_BASE_URL: 'https://bun.sh',
  BUN_COM_URL: 'https://bun.com',
  GITHUB_BASE_URL: 'https://github.com',

  // Documentation paths
  DOCS_PATH: '/docs',
  API_PATH: '/docs/api',
  RUNTIME_PATH: '/docs/runtime',
  CLI_PATH: '/docs/cli',

  // File extensions
  TYPESCRIPT_EXT: '.ts',
  JAVASCRIPT_EXT: '.js',

  // Common commit hashes
  MAIN_COMMIT: 'main',
  CANARY_COMMIT: 'canary',

  // Example commit from existing code
  EXAMPLE_COMMIT: 'main',
};

// Legacy export for backward compatibility
export const QUICK_REFERENCE = QUICK_REFERENCE_URLS;

// Default export combining all legacy exports
export default {
  BUN_DOCS,
  TYPED_ARRAY_URLS,
  RSS_URLS,
  FETCH_API_URLS,
  CLI_DOCS,
  UTILS_URLS,
  GITHUB_URLS,
  LEGACY_HELPERS,
  LEGACY_CONSTANTS,
  QUICK_REFERENCE: QUICK_REFERENCE_URLS,
};
