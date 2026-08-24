// @see https://bun.com/docs/project/benchmarking#cpu-profiling — --cpu-prof
// @see https://bun.com/docs/project/benchmarking#markdown-output — --cpu-prof-md
// @see https://bun.com/docs/project/benchmarking#heap-profiling — --heap-prof
// @see https://bun.com/docs/project/benchmarking#markdown-output-1 — --heap-prof-md
// @see https://bun.com/blog/bun-v1.3.2#cpu-profiling-with-cpu-prof — shipped Bun 1.3.2
// @see https://bun.com/blog/bun-v1.4#cpu-prof-md — shipped Bun 1.4.0 Observability
// @see https://bun.com/blog/bun-v1.4#heap-prof-md — shipped Bun 1.4.0 Observability
// @see https://bun.com/blog/bun-v1.4#process-on-memorypressure — shipped Bun 1.4.0 Observability
// lib/docs/constants/cli.ts — CLI documentation categories and URLs

export enum CLICategory {
  INSTALLATION = 'installation',
  CONFIGURATION = 'configuration',
  COMMANDS = 'commands',
  OPTIONS = 'options',
  SCRIPTS = 'scripts',
  ENVIRONMENT = 'environment',
  DEBUGGING = 'debugging',
  INTEGRATION = 'integration',
}

export const CLI_DOCUMENTATION_URLS = {
  // bun.com docs how-to (unversioned). Ship versions: CLI_PROFILE_ANNOUNCEMENT_URLS + bun-docs-changelog.
  [CLICategory.INSTALLATION]: {
    MAIN: '/docs/cli/install',
    WINDOWS: '/docs/cli/install/windows',
    MACOS: '/docs/cli/install/macos',
    LINUX: '/docs/cli/install/linux',
    DOCKER: '/docs/cli/install/docker',
    CI_CD: '/docs/cli/install/ci-cd',
  },

  [CLICategory.COMMANDS]: {
    MAIN: '/docs/cli',
    RUN: '/docs/cli/run',
    TEST: '/docs/cli/test',
    BUILD: '/docs/cli/build',
    INSTALL: '/docs/cli/install-command',
    ADD: '/docs/cli/add',
    REMOVE: '/docs/cli/remove',
    LINK: '/docs/cli/link',
    UNLINK: '/docs/cli/unlink',
    CREATE: '/docs/cli/create',
    UPGRADE: '/docs/cli/upgrade',
    COMPLETIONS: '/docs/cli/completions',
    INIT: '/docs/cli/init',
    DEV: '/docs/cli/dev',
    PM: '/docs/cli/pm',
    X: '/docs/cli/x',
  },

  [CLICategory.OPTIONS]: {
    FLAGS: '/docs/cli/flags',
    ENVIRONMENT_VARIABLES: '/docs/cli/env',
    CONFIG_FILE: '/docs/cli/config',
    TS_CONFIG: '/docs/cli/tsconfig',
    PACKAGE_JSON: '/docs/cli/package-json',
  },

  [CLICategory.DEBUGGING]: {
    LOGGING: '/docs/cli/logging',
    VERBOSE: '/docs/cli/verbose',
    DEBUGGER: '/docs/cli/debugger',
    INSPECTOR: '/docs/cli/inspector',
    PROFILE: '/docs/project/benchmarking',
    /** How-to · ship https://bun.com/blog/bun-v1.3.2 */
    CPU_PROF: '/docs/project/benchmarking#cpu-profiling',
    /** How-to · ship https://bun.com/blog/bun-v1.4#cpu-prof-md */
    CPU_PROF_MD: '/docs/project/benchmarking#markdown-output',
    /** How-to · ship https://bun.com/blog/bun-v1.4#heap-prof */
    HEAP_PROF: '/docs/project/benchmarking#heap-profiling',
    /** How-to · ship https://bun.com/blog/bun-v1.4#heap-prof-md */
    HEAP_PROF_MD: '/docs/project/benchmarking#markdown-output-1',
    TRACE: '/docs/cli/trace',
  },
} as const;

/** Versioned announcement URLs (release evidence — not unversioned docs). */
export const CLI_PROFILE_ANNOUNCEMENT_URLS = {
  /** Bun 1.3.2 — Chrome DevTools .cpuprofile (+ name/dir/interval companions). */
  CPU_PROF: 'https://bun.com/blog/bun-v1.3.2#cpu-profiling-with-cpu-prof',
  CPU_PROF_NAME: 'https://bun.com/blog/bun-v1.3.2#cpu-profiling-with-cpu-prof',
  CPU_PROF_DIR: 'https://bun.com/blog/bun-v1.3.2#cpu-profiling-with-cpu-prof',
  CPU_PROF_INTERVAL: 'https://bun.com/blog/bun-v1.3.2#cpu-profiling-with-cpu-prof',
  /** Bun 1.4.0 Observability — markdown + heap + process hooks. */
  CPU_PROF_MD: 'https://bun.com/blog/bun-v1.4#cpu-prof-md',
  HEAP_PROF: 'https://bun.com/blog/bun-v1.4#heap-prof',
  HEAP_PROF_NAME: 'https://bun.com/blog/bun-v1.4#heap-prof',
  HEAP_PROF_DIR: 'https://bun.com/blog/bun-v1.4#heap-prof',
  HEAP_PROF_INTERVAL: 'https://bun.com/blog/bun-v1.4#heap-prof',
  HEAP_PROF_MD: 'https://bun.com/blog/bun-v1.4#heap-prof-md',
  MEMORY_PRESSURE: 'https://bun.com/blog/bun-v1.4#process-on-memorypressure',
  METAFILE_MD: 'https://bun.com/blog/bun-v1.4#metafile-md',
  OBSERVABILITY: 'https://bun.com/blog/bun-v1.4#observability',
} as const;

// Common CLI command examples
export const CLI_COMMAND_EXAMPLES = {
  BASIC: {
    RUN_SCRIPT: 'bun run dev',
    TEST: 'bun test',
    BUILD: 'bun build ./src/index.ts --outdir ./dist',
    INSTALL: 'bun install',
    ADD_PACKAGE: 'bun add zod',
    REMOVE_PACKAGE: 'bun remove lodash',
  },

  ADVANCED: {
    CREATE_REACT_APP: 'bun create react-app my-app',
    CREATE_NEXT_APP: 'bun create next-app',
    UPGRADE_BUN: 'bun upgrade',
    GENERATE_COMPLETIONS: 'bun completions',
    INIT_PROJECT: 'bun init',
    EXECUTE_PACKAGE: 'bunx cowsay "Hello from Bun!"',
  },

  DEVELOPMENT: {
    DEV_SERVER: 'bun dev',
    HOT_RELOAD: 'bun --hot server.ts',
    WATCH_MODE: 'bun --watch test',
    DEBUG_MODE: 'bun --inspect server.ts',
    PROFILE_MODE: 'bun --profile heavy-computation.js',
    CPU_PROF_MD: 'bun --cpu-prof-md server.ts',
    HEAP_PROF_MD: 'bun --heap-prof-md server.ts',
    CPU_PROF_DIR: 'bun --cpu-prof-md --cpu-prof-dir=./profiles server.ts',
    HEAP_PROF_DIR: 'bun --heap-prof-md --heap-prof-dir=./profiles server.ts',
  },
} as const;
