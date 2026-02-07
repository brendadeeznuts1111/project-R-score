#!/usr/bin/env bun

/**
 * 📂 Enhanced Documentation Categories and Paths
 * 
 * Comprehensive path definitions for all documentation categories
 * across bun.sh and bun.com domains with intelligent routing.
 */

import { 
  DocumentationProvider, 
  DocumentationCategory,
  DocumentationDomain 
} from './domains';

// Structured path constants for each category
export const ENTERPRISE_DOCUMENTATION_PATHS = {
  // Bun-specific paths (aligned with actual Bun documentation structure)
  BUN_CORE: {
  [DocumentationProvider.BUN_OFFICIAL]: {
    [DocumentationCategory.INSTALLATION]: {
      MAIN: '/docs/installation',
      OVERVIEW: '/docs/installation',
      WINDOWS: '/docs/installation/windows',
      MACOS: '/docs/installation/macos',
      LINUX: '/docs/installation/linux',
      DOCKER: '/docs/installation/docker',
      CI_CD: '/docs/installation/ci-cd',
      PACKAGE_MANAGERS: '/docs/installation/package-managers',
      TROUBLESHOOTING: '/docs/installation/troubleshooting'
    },
    
    [DocumentationCategory.API_REFERENCE]: {
      OVERVIEW: '/docs/api',
      INTRODUCTION: '/docs/api/introduction',
      UTILS: '/docs/api/utils',
      HTTP: '/docs/api/http',
      WEBSOCKET: '/docs/api/websocket',
      STREAMS: '/docs/api/streams',
      SERVE: '/docs/api/serve',
      SQL: '/docs/api/sql',
      TEST: '/docs/api/test',
      BUILD: '/docs/api/build',
      PLUGINS: '/docs/api/plugins',
      TYPESCRIPT: '/docs/api/typescript',
      JAVASCRIPT: '/docs/api/javascript'
    },
    
    [DocumentationCategory.RUNTIME_FEATURES]: {
      OVERVIEW: '/docs/runtime',
      INTRODUCTION: '/docs/runtime/introduction',
      FILESYSTEM: '/docs/runtime/filesystem',
      PROCESS: '/docs/runtime/process',
      NETWORKING: '/docs/runtime/networking',
      BINARY_DATA: '/docs/runtime/binary-data',
      CONCURRENCY: '/docs/runtime/concurrency',
      MODULES: '/docs/runtime/modules',
      ENVIRONMENT: '/docs/runtime/environment',
      PERF_HOOKS: '/docs/runtime/perf-hooks',
      INSPECTOR: '/docs/runtime/inspector',
      V8_INTEGRATION: '/docs/runtime/v8-integration',
      NATIVE_MODULES: '/docs/runtime/native-modules'
    },
    
    [DocumentationCategory.CLI_REFERENCE]: {
      OVERVIEW: '/docs/cli',
      INTRODUCTION: '/docs/cli/introduction',
      COMMANDS: '/docs/cli/commands',
      OPTIONS: '/docs/cli/options',
      CONFIGURATION: '/docs/cli/configuration',
      SCRIPTS: '/docs/cli/scripts',
      ENVIRONMENT_VARIABLES: '/docs/cli/environment-variables',
      COMPLETIONS: '/docs/cli/completions',
      INTEGRATION: '/docs/cli/integration'
    },
    
    [DocumentationCategory.BENCHMARKS]: {
      OVERVIEW: '/docs/benchmarks',
      PERFORMANCE_COMPARISONS: '/docs/benchmarks/performance-comparisons',
      MEMORY_USAGE: '/docs/benchmarks/memory-usage',
      STARTUP_TIME: '/docs/benchmarks/startup-time',
      THROUGHPUT: '/docs/benchmarks/throughput',
 REAL_WORLD_TESTS: '/docs/benchmarks/real-world-tests'
    },
    
    [DocumentationCategory.WEBASSEMBLY]: {
      OVERVIEW: '/docs/api/wasm',
      TABLE: '/docs/api/wasm#table',
      MEMORY: '/docs/api/wasm#memory',
      MODULE: '/docs/api/wasm#module',
      INSTANCE: '/docs/api/wasm#instance',
      COMPILE: '/docs/api/wasm#compile',
      INSTANTIATE: '/docs/api/wasm#instantiate',
    },

    [DocumentationCategory.SECURITY]: {
      OVERVIEW: '/docs/security',
      VULNERABILITIES: '/docs/security/vulnerabilities',
      BEST_PRACTICES: '/docs/security/best-practices',
      AUDITING: '/docs/security/auditing',
      ENCRYPTION: '/docs/security/encryption',
      PERMISSIONS: '/docs/security/permissions'
    },
    
    [DocumentationCategory.PERFORMANCE]: {
      OVERVIEW: '/docs/performance',
      OPTIMIZATION_GUIDES: '/docs/performance/optimization-guides',
      PROFILING: '/docs/performance/profiling',
      MEMORY_MANAGEMENT: '/docs/performance/memory-management',
      CONCURRENCY: '/docs/performance/concurrency',
      TUNING: '/docs/performance/tuning'
    },
    
    [DocumentationCategory.MIGRATION]: {
      OVERVIEW: '/docs/migration',
      FROM_NODE: '/docs/migration/from-node',
      FROM_DENO: '/docs/migration/from-deno',
      FROM_WEBPACK: '/docs/migration/from-webpack',
      FROM_VITE: '/docs/migration/from-vite',
      FROM_ROLLUP: '/docs/migration/from-rollup',
      BREAKING_CHANGES: '/docs/migration/breaking-changes'
    }
  },
  
  // bun.com/reference paths (reference portal)
  [DocumentationProvider.BUN_REFERENCE]: {
    [DocumentationCategory.API_REFERENCE]: {
      OVERVIEW: '/reference',
      API_OVERVIEW: '/reference/api',
      UTILS: '/reference/api/utils',
      HTTP: '/reference/api/http',
      WEBSOCKET: '/reference/api/websocket',
      STREAMS: '/reference/api/streams',
      SERVE: '/reference/api/serve',
      SQL: '/reference/api/sql',
      TEST: '/reference/api/test',
      BUILD: '/reference/api/build',
      PLUGINS: '/reference/api/plugins',
      TYPESCRIPT: '/reference/api/typescript',
      INTERACTIVE_EXAMPLES: '/reference/api/interactive-examples'
    },
    
    [DocumentationCategory.CLI_REFERENCE]: {
      OVERVIEW: '/reference/cli',
      COMMANDS: '/reference/cli/commands',
      OPTIONS: '/reference/cli/options',
      CONFIGURATION: '/reference/cli/configuration',
      ENVIRONMENT: '/reference/cli/environment',
      PACKAGES: '/reference/cli/packages',
      TEMPLATES: '/reference/cli/templates',
      CHEATSHEET: '/reference/cli/cheatsheet'
    },
    
    [DocumentationCategory.EXAMPLES_TUTORIALS]: {
      TUTORIALS: '/reference/tutorials',
      COOKBOOK: '/reference/cookbook',
      SAMPLES: '/reference/samples',
      DEMOS: '/reference/demos',
      INTERACTIVE_EXAMPLES: '/reference/interactive-examples',
      CODE_PATTERNS: '/reference/code-patterns'
    },
    
    [DocumentationCategory.BEST_PRACTICES]: {
      OVERVIEW: '/reference/best-practices',
      CHEATSHEET: '/reference/cheatsheet',
      PATTERNS: '/reference/patterns',
      ANTI_PATTERNS: '/reference/anti-patterns',
      OPTIMIZATIONS: '/reference/optimizations',
      STYLE_GUIDE: '/reference/style-guide'
    },
    
    [DocumentationCategory.GETTING_STARTED]: {
      QUICKSTART: '/reference/getting-started',
      INSTALLATION: '/reference/getting-started/installation',
      FIRST_PROJECT: '/reference/getting-started/first-project',
      BASIC_CONCEPTS: '/reference/getting-started/basic-concepts',
      WORKFLOW: '/reference/getting-started/workflow'
    }
  },
  
  // bun.com/guides paths (guides portal)
  [DocumentationProvider.BUN_GUIDES]: {
    [DocumentationCategory.GETTING_STARTED]: {
      MAIN: '/guides',
      OVERVIEW: '/guides/getting-started',
      INTRODUCTION: '/guides/getting-started/introduction',
      INSTALLATION: '/guides/getting-started/installation',
      FIRST_APP: '/guides/getting-started/first-app',
      HELLO_WORLD: '/guides/getting-started/hello-world',
      BASIC_PROJECT_STRUCTURE: '/guides/getting-started/project-structure',
      DEVELOPMENT_WORKFLOW: '/guides/getting-started/development-workflow'
    },
    
    [DocumentationCategory.EXAMPLES_TUTORIALS]: {
      TUTORIALS: '/guides/tutorials',
      OVERVIEW: '/guides/tutorials/overview',
      STEP_BY_STEP: '/guides/tutorials/step-by-step',
      VIDEO_TUTORIALS: '/guides/tutorials/video-tutorials',
      INTERACTIVE: '/guides/tutorials/interactive',
      WORKSHOP: '/guides/tutorials/workshop',
      LEARNING_PATHS: '/guides/tutorials/learning-paths'
    },
    
    [DocumentationCategory.MIGRATION_GUIDES]: {
      OVERVIEW: '/guides/migration',
      FROM_NODE: '/guides/migration/from-node',
      FROM_DENO: '/guides/migration/from-deno',
      FROM_WEBPACK: '/guides/migration/from-webpack',
      FROM_VITE: '/guides/migration/from-vite',
    FROM_ROLLUP: '/guides/migration/from-rollup',
    FROM_PARCEL: '/guides/migration/from-parcel',
    COMMON_PATTERNS: '/guides/migration/common-patterns',
    TROUBLESHOOTING: '/guides/migration/troubleshooting'
    },
    
    [DocumentationCategory.TROUBLESHOOTING]: {
      OVERVIEW: '/guides/troubleshooting',
      COMMON_ISSUES: '/guides/troubleshooting/common-issues',
      DEBUGGING: '/guides/troubleshooting/debugging',
      PERFORMANCE: '/guides/troubleshooting/performance',
      ERRORS: '/guides/troubleshooting/errors',
      FAQ: '/guides/faq',
      GETTING_HELP: '/guides/troubleshooting/getting-help'
    },
    
    [DocumentationCategory.BEST_PRACTICES]: {
      OVERVIEW: '/guides/best-practices',
      PROJECT_STRUCTURE: '/guides/best-practices/project-structure',
      CODE_ORGANIZATION: '/guides/best-practices/code-organization',
      TESTING: '/guides/best-practices/testing',
      DEPLOYMENT: '/guides/best-practices/deployment',
      MONITORING: '/guides/best-practices/monitoring',
      SECURITY: '/guides/best-practices/security'
    },
    
    [DocumentationCategory.COMMUNITY_RESOURCES]: {
      OVERVIEW: '/guides/community',
      CONTRIBUTING: '/guides/community/contributing',
      DISCUSSIONS: '/guides/community/discussions',
    SHOWCASE: '/guides/community/showcase',
      ECOSYSTEM: '/guides/community/ecosystem',
    EVENTS: '/guides/community/events'
    }
  },
  
  // bun.com/tutorials paths (interactive tutorials)
  [DocumentationProvider.BUN_TUTORIALS]: {
    [DocumentationCategory.GETTING_STARTED]: {
      INTERACTIVE_INTRO: '/tutorials/interactive-introduction',
      HANDS_ON_SETUP: '/tutorials/hands-on-setup',
      FIRST_BUN_APP: '/tutorials/first-bun-app',
      DEVELOPMENT_ENVIRONMENT: '/tutorials/development-environment'
    },
    
    [DocumentationCategory.EXAMPLES_TUTORIALS]: {
      INTERACTIVE_API: '/tutorials/interactive-api',
      HANDS_ON_CLI: '/tutorials/hands-on-cli',
      LIVE_CODING: '/tutorials/live-coding',
      PRACTICAL_EXERCISES: '/tutorials/practical-exercises'
    }
  },
  
  // bun.com/examples paths (code examples)
  [DocumentationProvider.BUN_EXAMPLES]: {
    [DocumentationCategory.EXAMPLES_TUTORIALS]: {
      CODE_SAMPLES: '/examples/code-samples',
      PROJECT_TEMPLATES: '/examples/project-templates',
      DEMO_APPS: '/examples/demo-apps',
      PLAYGROUND: '/examples/playground',
      STARTER_KITS: '/examples/starter-kits'
    }
  },
  
  // RSS feed paths
  [DocumentationProvider.BUN_RSS]: {
    [DocumentationCategory.RSS_FEEDS]: {
      MAIN_RSS: '/rss.xml',
      BLOG_RSS: '/blog/rss.xml',
      RELEASES_RSS: '/releases/rss.xml',
      SECURITY_RSS: '/security/rss.xml',
      COMMUNITY_RSS: '/community/rss.xml',
      GUIDES_RSS: '/guides/rss.xml',
      TECHNICAL_RSS: '/rss.xml'  // This maps to bun.sh/rss.xml
    },
    
    [DocumentationCategory.BLOG_POSTS]: {
      BLOG_INDEX: '/blog',
      BLOG_ARCHIVE: '/blog/archive',
      BLOG_CATEGORIES: '/blog/categories'
    },
    
    [DocumentationCategory.RELEASE_ANNOUNCEMENTS]: {
      RELEASES_INDEX: '/releases',
      RELEASE_NOTES: '/releases/notes',
      CHANGELOG: '/changelog'
    }
  },
  
  // GitHub paths
  [DocumentationProvider.GITHUB_PUBLIC]: {
    [DocumentationCategory.API_REFERENCE]: {
      SOURCE_CODE: '/oven-sh/bun/tree/main/src',
      API_IMPLEMENTATION: '/oven-sh/bun/tree/main/src/js',
      BUILTIN_IMPLEMENTATION: '/oven-sh/bun/tree/main/src/js/builtins',
      TYPES_DEFINITION: '/oven-sh/bun/tree/main/packages/bun-types'
    },
    
    [DocumentationCategory.EXAMPLES_TUTORIALS]: {
      EXAMPLES: '/oven-sh/bun/tree/main/examples',
      TESTS: '/oven-sh/bun/tree/main/test',
      BENCHMARKS: '/oven-sh/bun/tree/main/benchmarks'
    }
  }
  }
} as const;

// Intelligent routing rules for different user types and contexts
export const INTELLIGENT_ROUTING_RULES = {
  // Topic-based routing
  topicRouting: {
    'typedarray': {
      developers: {
        primary: { provider: DocumentationProvider.BUN_OFFICIAL, category: DocumentationCategory.RUNTIME_FEATURES, path: 'BINARY_DATA' },
        secondary: { provider: DocumentationProvider.BUN_REFERENCE, category: DocumentationCategory.API_REFERENCE, path: 'API_OVERVIEW' },
        fallback: { provider: DocumentationProvider.BUN_GUIDES, category: DocumentationCategory.EXAMPLES_TUTORIALS, path: 'TUTORIALS' }
      },
      beginners: {
        primary: { provider: DocumentationProvider.BUN_GUIDES, category: DocumentationCategory.EXAMPLES_TUTORIALS, path: 'TUTORIALS' },
        secondary: { provider: DocumentationProvider.BUN_TUTORIALS, category: DocumentationCategory.EXAMPLES_TUTORIALS, path: 'INTERACTIVE_API' },
        fallback: { provider: DocumentationProvider.BUN_REFERENCE, category: DocumentationCategory.API_REFERENCE, path: 'INTERACTIVE_EXAMPLES' }
      },
      educators: {
        primary: { provider: DocumentationProvider.BUN_EXAMPLES, category: DocumentationCategory.EXAMPLES_TUTORIALS, path: 'CODE_SAMPLES' },
        secondary: { provider: DocumentationProvider.BUN_TUTORIALS, category: DocumentationCategory.EXAMPLES_TUTORIALS, path: 'PRACTICAL_EXERCISES' },
        fallback: { provider: DocumentationProvider.BUN_GUIDES, category: DocumentationCategory.EXAMPLES_TUTORIALS, path: 'WORKSHOP' }
      }
    },
    
    'fetch': {
      developers: {
        primary: { provider: DocumentationProvider.BUN_OFFICIAL, category: DocumentationCategory.RUNTIME_FEATURES, path: 'NETWORKING' },
        secondary: { provider: DocumentationProvider.BUN_REFERENCE, category: DocumentationCategory.API_REFERENCE, path: 'HTTP' },
        fallback: { provider: DocumentationProvider.BUN_GUIDES, category: DocumentationCategory.EXAMPLES_TUTORIALS, path: 'TUTORIALS' }
      },
      beginners: {
        primary: { provider: DocumentationProvider.BUN_GUIDES, category: DocumentationCategory.GETTING_STARTED, path: 'FIRST_APP' },
        secondary: { provider: DocumentationProvider.BUN_TUTORIALS, category: DocumentationCategory.GETTING_STARTED, path: 'INTERACTIVE_INTRO' },
        fallback: { provider: DocumentationProvider.BUN_EXAMPLES, category: DocumentationCategory.EXAMPLES_TUTORIALS, path: 'DEMO_APPS' }
      }
    },
    
    'getting-started': {
      developers: {
        primary: { provider: DocumentationProvider.BUN_OFFICIAL, category: DocumentationCategory.INSTALLATION, path: 'OVERVIEW' },
        secondary: { provider: DocumentationProvider.BUN_REFERENCE, category: DocumentationCategory.GETTING_STARTED, path: 'QUICKSTART' },
        fallback: { provider: DocumentationProvider.BUN_GUIDES, category: DocumentationCategory.GETTING_STARTED, path: 'OVERVIEW' }
      },
      beginners: {
        primary: { provider: DocumentationProvider.BUN_GUIDES, category: DocumentationCategory.GETTING_STARTED, path: 'OVERVIEW' },
        secondary: { provider: DocumentationProvider.BUN_TUTORIALS, category: DocumentationCategory.GETTING_STARTED, path: 'HANDS_ON_SETUP' },
        fallback: { provider: DocumentationProvider.BUN_REFERENCE, category: DocumentationCategory.GETTING_STARTED, path: 'INSTALLATION' }
      }
    },
    
    'cli': {
      developers: {
        primary: { provider: DocumentationProvider.BUN_OFFICIAL, category: DocumentationCategory.CLI_REFERENCE, path: 'OVERVIEW' },
        secondary: { provider: DocumentationProvider.BUN_REFERENCE, category: DocumentationCategory.CLI_REFERENCE, path: 'OVERVIEW' },
        fallback: { provider: DocumentationProvider.BUN_GUIDES, category: DocumentationCategory.BEST_PRACTICES, path: 'PROJECT_STRUCTURE' }
      },
      beginners: {
        primary: { provider: DocumentationProvider.BUN_GUIDES, category: DocumentationCategory.GETTING_STARTED, path: 'DEVELOPMENT_WORKFLOW' },
        secondary: { provider: DocumentationProvider.BUN_TUTORIALS, category: DocumentationCategory.GETTING_STARTED, path: 'HANDS_ON_CLI' },
        fallback: { provider: DocumentationProvider.BUN_REFERENCE, category: DocumentationCategory.CLI_REFERENCE, path: 'CHEATSHEET' }
      }
    },
    
    'rss': {
      all_users: {
        primary: { provider: DocumentationProvider.BUN_RSS, category: DocumentationCategory.RSS_FEEDS, path: 'MAIN_RSS' },
        secondary: { provider: DocumentationProvider.BUN_RSS, category: DocumentationCategory.BLOG_POSTS, path: 'BLOG_INDEX' },
        fallback: { provider: DocumentationProvider.BUN_RSS, category: DocumentationCategory.RELEASE_ANNOUNCEMENTS, path: 'RELEASES_INDEX' }
      },
      developers: {
        primary: { provider: DocumentationProvider.BUN_RSS, category: DocumentationCategory.RSS_FEEDS, path: 'TECHNICAL_RSS' },
        secondary: { provider: DocumentationProvider.BUN_RSS, category: DocumentationCategory.RSS_FEEDS, path: 'RELEASES_RSS' },
        fallback: { provider: DocumentationProvider.BUN_RSS, category: DocumentationCategory.RSS_FEEDS, path: 'SECURITY_RSS' }
      }
    }
  },
  
  // Context-based routing
  contextRouting: {
    'error-debugging': {
      primary: { provider: DocumentationProvider.BUN_GUIDES, category: DocumentationCategory.TROUBLESHOOTING, path: 'DEBUGGING' },
      secondary: { provider: DocumentationProvider.BUN_OFFICIAL, category: DocumentationCategory.TROUBLESHOOTING, path: 'OVERVIEW' },
      fallback: { provider: DocumentationProvider.BUN_GUIDES, category: DocumentationCategory.TROUBLESHOOTING, path: 'COMMON_ISSUES' }
    },
    
    'performance-optimization': {
      primary: { provider: DocumentationProvider.BUN_OFFICIAL, category: DocumentationCategory.PERFORMANCE, path: 'OPTIMIZATION_GUIDES' },
      secondary: { provider: DocumentationProvider.BUN_GUIDES, category: DocumentationCategory.BEST_PRACTICES, path: 'PERFORMANCE' },
      fallback: { provider: DocumentationProvider.BUN_OFFICIAL, category: DocumentationCategory.BENCHMARKS, path: 'OVERVIEW' }
    },
    
    'migration-project': {
      primary: { provider: DocumentationProvider.BUN_GUIDES, category: DocumentationCategory.MIGRATION_GUIDES, path: 'OVERVIEW' },
      secondary: { provider: DocumentationProvider.BUN_OFFICIAL, category: DocumentationCategory.MIGRATION, path: 'OVERVIEW' },
      fallback: { provider: DocumentationProvider.BUN_REFERENCE, category: DocumentationCategory.GETTING_STARTED, path: 'WORKFLOW' }
    },
    
    'learning-path': {
      beginners: {
        primary: { provider: DocumentationProvider.BUN_GUIDES, category: DocumentationCategory.EXAMPLES_TUTORIALS, path: 'LEARNING_PATHS' },
        secondary: { provider: DocumentationProvider.BUN_TUTORIALS, category: DocumentationCategory.GETTING_STARTED, path: 'INTERACTIVE_INTRO' },
        fallback: { provider: DocumentationProvider.BUN_EXAMPLES, category: DocumentationCategory.EXAMPLES_TUTORIALS, path: 'STARTER_KITS' }
      },
      developers: {
        primary: { provider: DocumentationProvider.BUN_REFERENCE, category: DocumentationCategory.EXAMPLES_TUTORIALS, path: 'CODE_PATTERNS' },
        secondary: { provider: DocumentationProvider.BUN_OFFICIAL, category: DocumentationCategory.API_REFERENCE, path: 'OVERVIEW' },
        fallback: { provider: DocumentationProvider.BUN_GUIDES, category: DocumentationCategory.BEST_PRACTICES, path: 'OVERVIEW' }
      }
    }
  },
  
  // Format preference routing
  formatRouting: {
    'interactive': {
      primary: { provider: DocumentationProvider.BUN_REFERENCE, category: DocumentationCategory.API_REFERENCE, path: 'INTERACTIVE_EXAMPLES' },
      secondary: { provider: DocumentationProvider.BUN_TUTORIALS, category: DocumentationCategory.EXAMPLES_TUTORIALS, path: 'INTERACTIVE_API' },
      fallback: { provider: DocumentationProvider.BUN_EXAMPLES, category: DocumentationCategory.EXAMPLES_TUTORIALS, path: 'PLAYGROUND' }
    },
    
    'video': {
      primary: { provider: DocumentationProvider.BUN_GUIDES, category: DocumentationCategory.EXAMPLES_TUTORIALS, path: 'VIDEO_TUTORIALS' },
      secondary: { provider: DocumentationProvider.BUN_TUTORIALS, category: DocumentationCategory.EXAMPLES_TUTORIALS, path: 'LIVE_CODING' },
      fallback: { provider: DocumentationProvider.BUN_GUIDES, category: DocumentationCategory.COMMUNITY_RESOURCES, path: 'EVENTS' }
    },
    
    'quick-reference': {
      primary: { provider: DocumentationProvider.BUN_REFERENCE, category: DocumentationCategory.BEST_PRACTICES, path: 'CHEATSHEET' },
      secondary: { provider: DocumentationProvider.BUN_REFERENCE, category: DocumentationCategory.CLI_REFERENCE, path: 'CHEATSHEET' },
      fallback: { provider: DocumentationProvider.BUN_GUIDES, category: DocumentationCategory.GETTING_STARTED, path: 'OVERVIEW' }
    },
    
    'source-code': {
      primary: { provider: DocumentationProvider.GITHUB_PUBLIC, category: DocumentationCategory.API_REFERENCE, path: 'SOURCE_CODE' },
      secondary: { provider: DocumentationProvider.GITHUB_PUBLIC, category: DocumentationCategory.EXAMPLES_TUTORIALS, path: 'EXAMPLES' },
      fallback: { provider: DocumentationProvider.BUN_OFFICIAL, category: DocumentationCategory.API_REFERENCE, path: 'OVERVIEW' }
    }
  }
} as const;

// Helper functions for intelligent routing
export class IntelligentRouting {
  /**
   * Get the best documentation route for a topic and user type
   */
  static getBestRoute(
    topic: string,
    userType: 'developers' | 'beginners' | 'educators' | 'all_users' = 'developers',
    context?: string,
    format?: string
  ): {
    provider: DocumentationProvider;
    category: DocumentationCategory;
    path: string;
    reasoning: string;
  } {
    // Normalize inputs
    const normalizedTopic = topic.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const normalizedContext = context?.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const normalizedFormat = format?.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    // Check format preference first
    if (normalizedFormat && INTELLIGENT_ROUTING_RULES.formatRouting[normalizedFormat]) {
      const formatRoute = INTELLIGENT_ROUTING_RULES.formatRouting[normalizedFormat];
      const userRoute = formatRoute[userType] || formatRoute.primary;
      return {
        ...userRoute.primary,
        reasoning: `Selected based on format preference: ${format}`
      };
    }
    
    // Check context preference
    if (normalizedContext && INTELLIGENT_ROUTING_RULES.contextRouting[normalizedContext]) {
      const contextRoute = INTELLIGENT_ROUTING_RULES.contextRouting[normalizedContext];
      const userRoute = contextRoute[userType] || contextRoute.primary;
      return {
        ...userRoute.primary,
        reasoning: `Selected based on context: ${context}`
      };
    }
    
    // Check topic routing
    if (INTELLIGENT_ROUTING_RULES.topicRouting[normalizedTopic]) {
      const topicRoute = INTELLIGENT_ROUTING_RULES.topicRouting[normalizedTopic];
      const userRoute = topicRoute[userType] || topicRoute.developers;
      return {
        ...userRoute.primary,
        reasoning: `Selected based on topic: ${topic} for user type: ${userType}`
      };
    }
    
    // Fallback to default routing
    return {
      provider: DocumentationProvider.BUN_OFFICIAL,
      category: DocumentationCategory.API_REFERENCE,
      path: 'OVERVIEW',
      reasoning: 'Default fallback - no specific routing rule found'
    };
  }
  
  /**
   * Get alternative routes for a topic
   */
  static getAlternativeRoutes(
    topic: string,
    userType: 'developers' | 'beginners' | 'educators' | 'all_users' = 'developers'
  ): Array<{
    provider: DocumentationProvider;
    category: DocumentationCategory;
    path: string;
    type: 'secondary' | 'fallback';
    reasoning: string;
  }> {
    const normalizedTopic = topic.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const alternatives: Array<{
      provider: DocumentationProvider;
      category: DocumentationCategory;
      path: string;
      type: 'secondary' | 'fallback';
      reasoning: string;
    }> = [];
    
    if (INTELLIGENT_ROUTING_RULES.topicRouting[normalizedTopic]) {
      const topicRoute = INTELLIGENT_ROUTING_RULES.topicRouting[normalizedTopic];
      const userRoute = topicRoute[userType] || topicRoute.developers;
      
      if (userRoute.secondary) {
        alternatives.push({
          ...userRoute.secondary,
          type: 'secondary',
          reasoning: `Secondary route for ${topic} and ${userType}`
        });
      }
      
      if (userRoute.fallback) {
        alternatives.push({
          ...userRoute.fallback,
          type: 'fallback',
          reasoning: `Fallback route for ${topic} and ${userType}`
        });
      }
    }
    
    return alternatives;
  }
  
  /**
   * Get all routes for a topic across user types
   */
  static getAllRoutesForTopic(topic: string): Record<string, {
    primary: any;
    alternatives: any[];
  }> {
    const normalizedTopic = topic.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const result: Record<string, any> = {};
    
    if (INTELLIGENT_ROUTING_RULES.topicRouting[normalizedTopic]) {
      const topicRoute = INTELLIGENT_ROUTING_RULES.topicRouting[normalizedTopic];
      
      Object.keys(topicRoute).forEach(userType => {
        const userRoute = topicRoute[userType as keyof typeof topicRoute];
        const alternatives: any[] = [];
        
        if (userRoute.secondary) {
          alternatives.push({
            ...userRoute.secondary,
            type: 'secondary'
          });
        }
        
        if (userRoute.fallback) {
          alternatives.push({
            ...userRoute.fallback,
            type: 'fallback'
          });
        }
        
        result[userType] = {
          primary: userRoute.primary,
          alternatives
        };
      });
    }
    
    return result;
  }
  
  /**
   * Check if a topic has specialized routing
   */
  static hasSpecializedRouting(topic: string): boolean {
    const normalizedTopic = topic.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return INTELLIGENT_ROUTING_RULES.topicRouting.hasOwnProperty(normalizedTopic);
  }
  
  /**
   * Get path from provider and category
   */
  static getPath(
    provider: DocumentationProvider,
    category: DocumentationCategory,
    pathKey: string
  ): string {
    const paths = ENTERPRISE_DOCUMENTATION_PATHS[provider];
    if (paths && paths[category] && paths[category][pathKey]) {
      return paths[category][pathKey];
    }
    return `/${pathKey.toLowerCase().replace(/_/g, '-')}`;
  }
}

// Additional structured path constants for enhanced organization
export const ENHANCED_DOCUMENTATION_PATHS = {
  // Bun-specific paths (aligned with actual Bun documentation structure)
  BUN_CORE: {
    [DocumentationCategory.INSTALLATION]: {
      MAIN: '/docs/install',
      WINDOWS: '/docs/install/windows',
      MACOS: '/docs/install/macos',
      LINUX: '/docs/install/linux',
      DOCKER: '/docs/install/docker',
      CI_CD: '/docs/install/ci-cd'
    },
    
    [DocumentationCategory.QUICKSTART]: {
      MAIN: '/docs/quickstart',
      TYPESCRIPT: '/docs/quickstart/typescript',
      JAVASCRIPT: '/docs/quickstart/javascript',
      REACT: '/docs/quickstart/react',
      NEXT_JS: '/docs/quickstart/nextjs',
      API_SERVER: '/docs/quickstart/api'
    },
    
    [DocumentationCategory.API_REFERENCE]: {
      OVERVIEW: '/docs/api',
      UTILS: '/docs/api/utils',
      HTTP: '/docs/api/http',
      WEBSOCKET: '/docs/api/websocket',
      STREAMS: '/docs/api/streams',
      SERVE: '/docs/api/serve',
      SQL: '/docs/api/sql',
      TEST: '/docs/api/test',
      BUILD: '/docs/api/build',
      PLUGINS: '/docs/api/plugins'
    },
    
    [DocumentationCategory.RUNTIME_FEATURES]: {
      OVERVIEW: '/docs/runtime',
      FILESYSTEM: '/docs/runtime/filesystem',
      PROCESS: '/docs/runtime/process',
      NETWORKING: '/docs/runtime/networking',
      BINARY_DATA: '/docs/runtime/binary-data',
      CONCURRENCY: '/docs/runtime/concurrency',
      MODULES: '/docs/runtime/modules',
      ENVIRONMENT: '/docs/runtime/environment',
      PERF_HOOKS: '/docs/runtime/perf-hooks',
      INSPECTOR: '/docs/runtime/inspector'
    }
  },
  
  // Guides and tutorials
  GUIDES: {
    [DocumentationCategory.TUTORIALS]: {
      READ_FILE: '/guides/read-file',
      WRITE_FILE: '/guides/write-file',
      HTTP_SERVER: '/guides/http-server',
      WEBSOCKET_SERVER: '/guides/websocket-server',
      DATABASE: '/guides/database',
      AUTHENTICATION: '/guides/authentication',
      DEPLOYMENT: '/guides/deployment',
      TESTING: '/guides/testing',
      DEBUGGING: '/guides/debugging'
    },
    
    [DocumentationCategory.BEST_PRACTICES]: {
      PERFORMANCE: '/guides/performance',
      SECURITY: '/guides/security',
      ERROR_HANDLING: '/guides/error-handling',
      LOGGING: '/guides/logging',
      MONITORING: '/guides/monitoring',
      SCALING: '/guides/scaling'
    },
    
    [DocumentationCategory.MIGRATION_GUIDES]: {
      FROM_NODE: '/guides/migrate-from-node',
      FROM_DENO: '/guides/migrate-from-deno',
      FROM_WEBPACK: '/guides/migrate-from-webpack',
      FROM_VITE: '/guides/migrate-from-vite',
      VERSION_UPGRADE: '/guides/version-upgrade'
    }
  },
  
  // Internal enterprise paths
  ENTERPRISE: {
    [DocumentationCategory.SECURITY_GUIDELINES]: {
      OVERVIEW: '/security',
      AUTHENTICATION: '/security/authentication',
      AUTHORIZATION: '/security/authorization',
      ENCRYPTION: '/security/encryption',
      AUDITING: '/security/auditing',
      COMPLIANCE: '/security/compliance'
    },
    
    [DocumentationCategory.DEPLOYMENT_GUIDES]: {
      DOCKER: '/deployment/docker',
      KUBERNETES: '/deployment/kubernetes',
      AWS: '/deployment/aws',
      AZURE: '/deployment/azure',
      GCP: '/deployment/gcp',
      CI_CD: '/deployment/ci-cd'
    }
  }
} as const;

// Utility type for path access
export type EnhancedDocumentationPaths = typeof ENHANCED_DOCUMENTATION_PATHS;
export type CategoryPaths<C extends DocumentationCategory> = {
  [K in keyof EnhancedDocumentationPaths]: EnhancedDocumentationPaths[K][C] extends object 
    ? EnhancedDocumentationPaths[K][C] 
    : never;
};
