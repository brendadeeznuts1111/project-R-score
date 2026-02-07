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
  // bun.sh CLI documentation
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
    PROFILE: '/docs/cli/profile',
    TRACE: '/docs/cli/trace',
  },
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
  },
} as const;
