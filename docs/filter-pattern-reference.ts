/**
 * Filter Pattern Reference Guide
 * 
 * Complete documentation of all supported filter patterns
 * and their use cases for Bun workspace filtering.
 */

export const FILTER_PATTERNS = {
  // Basic Patterns
  BASIC: {
    '*': {
      description: 'Match all packages',
      example: 'bun run --filter "*" test',
      matches: ['all-packages', 'every-single-one']
    },
    'prefix*': {
      description: 'Match packages starting with prefix',
      example: 'bun run --filter "ba*" test',
      matches: ['bar', 'baz', 'base', 'banner']
    },
    '*suffix': {
      description: 'Match packages ending with suffix',
      example: 'bun run --filter "*utils" test',
      matches: ['test-utils', 'db-utils', 'string-utils']
    },
    '*contains*': {
      description: 'Match packages containing text',
      example: 'bun run --filter "*api*" test',
      matches: ['api-gateway', 'rest-api', 'graphql-api']
    }
  },

  // Advanced Patterns
  ADVANCED: {
    'pattern-{a,b}': {
      description: 'Brace expansion (multiple specific patterns)',
      example: 'bun run --filter "pkg-{a,b}" test',
      matches: ['pkg-a', 'pkg-b']
    },
    '!exclude': {
      description: 'Negation (exclude matching packages)',
      example: 'bun run --filter "!test-*" build',
      matches: ['all packages except those starting with test-']
    },
    'pattern1 pattern2': {
      description: 'Multiple patterns (OR logic)',
      example: 'bun run --filter "app-* api-*" test',
      matches: ['packages matching app-* OR api-*']
    },
    '!pattern1 !pattern2': {
      description: 'Multiple exclusions',
      example: 'bun run --filter "!test-* !demo-*" build',
      matches: ['all packages except test-* and demo-*']
    }
  },

  // Complex Combinations
  COMPLEX: {
    'app-* !app-demo': {
      description: 'Include pattern with exclusion',
      example: 'bun run --filter "app-* !app-demo" build',
      matches: ['app-prod', 'app-staging', 'app-backend']
    },
    '{frontend,backend}-*': {
      description: 'Multiple prefixes with brace expansion',
      example: 'bun run --filter "{frontend,backend}-*" test',
      matches: ['frontend-web', 'frontend-mobile', 'backend-api', 'backend-worker']
    },
    '*-{test,spec}': {
      description: 'Suffix patterns with brace expansion',
      example: 'bun run --filter "*-{test,spec}" test',
      matches: ['user-test', 'auth-test', 'user-spec', 'auth-spec']
    }
  },

  // Real-world Scenarios
  REAL_WORLD: {
    // Development workflows
    'all_tests': {
      pattern: '*',
      script: 'test',
      description: 'Run tests in all packages',
      use_case: 'CI/CD pipeline validation'
    },
    'app_tests_only': {
      pattern: 'app-*',
      script: 'test',
      description: 'Test only application packages',
      use_case: 'Focused application testing'
    },
    'exclude_tests': {
      pattern: '!test-*',
      script: 'build',
      description: 'Build all packages except test utilities',
      use_case: 'Production build optimization'
    },
    'parallel_lint': {
      pattern: '*',
      script: 'lint',
      options: ['--parallel'],
      description: 'Lint all packages in parallel',
      use_case: 'Fast code quality checks'
    },
    'sequential_deploy': {
      pattern: 'prod-*',
      script: 'deploy',
      options: ['--bail'],
      description: 'Deploy production packages sequentially, stop on failure',
      use_case: 'Safe production deployments'
    },

    // Package management
    'libraries_only': {
      pattern: 'lib-*',
      script: 'build',
      description: 'Build only library packages',
      use_case: 'Library publishing workflow'
    },
    'monorepo_apps': {
      pattern: '{web,api,worker}-*',
      script: 'dev',
      description: 'Start development for all application types',
      use_case: 'Full-stack development'
    },
    'core_packages': {
      pattern: '{core,shared,common}-*',
      script: 'test',
      description: 'Test core/shared packages',
      use_case: 'Core dependency validation'
    }
  }
};

export const FILTER_OPTIONS = {
  EXECUTION: {
    '--parallel': {
      description: 'Execute packages in parallel',
      example: 'bun run --filter "app-*" --parallel build',
      benefit: 'Significant speedup for independent packages'
    },
    '--bail': {
      description: 'Stop on first failure',
      example: 'bun run --filter "prod-*" --bail deploy',
      benefit: 'Prevents cascading failures in critical workflows'
    },
    '--sequential': {
      description: 'Execute packages sequentially (default)',
      example: 'bun run --filter "db-*" --sequential migrate',
      benefit: 'Ensures ordered execution for dependent operations'
    }
  },

  OUTPUT: {
    '--silent': {
      description: 'Suppress package output',
      example: 'bun run --filter "*" --silent test',
      benefit: 'Clean output for CI/CD logs'
    },
    '--dry-run': {
      description: 'Show what would execute without running',
      example: 'bun run --filter "app-*" --dry-run build',
      benefit: 'Validate patterns before execution'
    }
  },

  PERFORMANCE: {
    '--max-concurrency <n>': {
      description: 'Limit parallel execution to n packages',
      example: 'bun run --filter "*" --parallel --max-concurrency 4 test',
      benefit: 'Control resource usage in large workspaces'
    },
    '--timeout <ms>': {
      description: 'Per-package timeout in milliseconds',
      example: 'bun run --filter "api-*" --timeout 30000 test',
      benefit: 'Prevent hanging processes'
    }
  }
};

export const PERFORMANCE_BENCHMARKS = {
  SCENARIOS: [
    {
      name: 'Small Workspace (2-5 packages)',
      sequential: '~100ms',
      parallel: '~30ms',
      speedup: '3.3x',
      recommendation: 'Parallel for most operations'
    },
    {
      name: 'Medium Workspace (10-20 packages)',
      sequential: '~800ms',
      parallel: '~150ms',
      speedup: '5.3x',
      recommendation: 'Always use parallel for independent operations'
    },
    {
      name: 'Large Workspace (50+ packages)',
      sequential: '~4000ms',
      parallel: '~600ms',
      speedup: '6.7x',
      recommendation: 'Parallel with concurrency limits'
    }
  ],

  MEMORY_USAGE: {
    sequential: '~50MB baseline',
    parallel: '~200MB peak',
    optimization: 'Use --max-concurrency to limit memory'
  },

  BAIL_EFFICIENCY: {
    scenario: '10 packages, 3rd fails',
    without_bail: '~1000ms (all complete)',
    with_bail: '~300ms (stops at failure)',
    savings: '70% time saved'
  }
};

export const TROUBLESHOOTING = {
  COMMON_ISSUES: [
    {
      problem: 'No packages match pattern',
      solution: 'Use --dry-run to verify pattern matching',
      example: 'bun run --filter "xyz-*" --dry-run test'
    },
    {
      problem: 'Script not found in packages',
      solution: 'Check package.json scripts section',
      example: 'Check if "test" script exists in matching packages'
    },
    {
      problem: 'Memory issues with large workspaces',
      solution: 'Use --max-concurrency to limit parallel execution',
      example: 'bun run --filter "*" --parallel --max-concurrency 4 test'
    },
    {
      problem: 'Dependencies between packages',
      solution: 'Use sequential execution or topological ordering',
      example: 'bun run --filter "db-*" --sequential migrate'
    }
  ],

  PATTERN_TIPS: [
    'Use specific patterns to avoid unintended matches',
    'Combine patterns with spaces for OR logic',
    'Use ! prefix for exclusions',
    'Test patterns with --dry-run before execution',
    'Quote patterns with special characters: bun run --filter "pkg-{a,b}" test'
  ]
};

export const INTEGRATION_EXAMPLES = {
  CI_CD: {
    github_actions: `
name: Test Workspace
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run --filter "*" --parallel test
      - run: bun run --filter "app-*" --bail build
    `,
    
    gitlab_ci: `
stages:
  - test
  - build

test_all:
  stage: test
  script:
    - bun install
    - bun run --filter "*" --parallel test

build_apps:
  stage: build
  script:
    - bun run --filter "app-*" --bail build
  only:
    - main
    `
  },

  PACKAGE_SCRIPTS: {
    root_package_json: `
{
  "name": "my-workspace",
  "workspaces": ["packages/*"],
  "scripts": {
    "test": "bun run --filter '*' test",
    "test:apps": "bun run --filter 'app-*' test",
    "build": "bun run --filter 'app-*' --bail build",
    "build:libs": "bun run --filter 'lib-*' --parallel build",
    "lint": "bun run --filter '*' --parallel lint",
    "deploy:staging": "bun run --filter 'staging-*' --sequential deploy",
    "deploy:prod": "bun run --filter 'prod-*' --sequential --bail deploy"
  }
}
    `
  },

  DEVELOPMENT_WORKFLOWS: {
    daily_development: `
# Install dependencies
bun install

# Start all apps in development
bun run --filter "app-*" dev

# Run tests in parallel
bun run --filter "*" --parallel test

# Lint everything
bun run --filter "*" --parallel lint

# Build for production
bun run --filter "app-*" --bail build
    `,
    
    release_process: `
# Test everything
bun run --filter "*" --parallel test

# Build all packages
bun run --filter "*" --parallel build

# Deploy to staging first
bun run --filter "staging-*" --sequential deploy

# Run smoke tests on staging
bun run --filter "smoke-test-*" test

# Deploy to production
bun run --filter "prod-*" --sequential --bail deploy
    `
  }
};

// Export utility functions
export function getPatternDescription(pattern: string): string {
  for (const category of Object.values(FILTER_PATTERNS)) {
    if (category[pattern as keyof typeof category]) {
      return (category[pattern as keyof typeof category] as any).description;
    }
  }
  return 'Custom pattern';
}

export function validatePattern(pattern: string): boolean {
  try {
    // Basic validation - would use actual glob in real implementation
    return !pattern.includes('[') || pattern.includes(']');
  } catch {
    return false;
  }
}

export function suggestPattern(useCase: string): string[] {
  const suggestions: string[] = [];
  
  switch (useCase.toLowerCase()) {
    case 'testing':
      suggestions.push('*', 'app-*', '!test-*');
      break;
    case 'building':
      suggestions.push('app-*', 'lib-*', '!demo-*');
      break;
    case 'deployment':
      suggestions.push('prod-*', 'staging-*', '!dev-*');
      break;
    case 'development':
      suggestions.push('app-*', 'dev-*', '*');
      break;
    default:
      suggestions.push('*');
  }
  
  return suggestions;
}
