/**
 * Bun Create Templates & Scoped Registries
 *
 * Reference: https://bun.sh/docs/bun/create
 */

// =============================================================================
// CLI Flags
// =============================================================================

export const CREATE_FLAGS = {
  /** Overwrite existing files */
  FORCE: '--force',

  /** Skip installing node_modules & tasks */
  NO_INSTALL: '--no-install',

  /** Don't initialize a git repository */
  NO_GIT: '--no-git',

  /** Start & open in-browser after finish */
  OPEN: '--open',
} as const;

// =============================================================================
// Environment Variables
// =============================================================================

export const CREATE_ENV = {
  /**
   * GitHub API domain for enterprise or proxy
   * Customize the GitHub domain Bun pings for downloads
   */
  GITHUB_API_DOMAIN: 'GITHUB_API_DOMAIN',

  /**
   * GitHub token for private repositories or rate-limit issues
   * GITHUB_TOKEN is chosen over GITHUB_ACCESS_TOKEN if both exist
   */
  GITHUB_TOKEN: 'GITHUB_TOKEN',

  /** Alternative to GITHUB_TOKEN */
  GITHUB_ACCESS_TOKEN: 'GITHUB_ACCESS_TOKEN',
} as const;

// =============================================================================
// Template Resolution
// =============================================================================

/**
 * How bun create works:
 *
 * 1. REMOTE TEMPLATE:
 *    - GET registry.npmjs.org/@bun-examples/${template}/latest
 *    - GET registry.npmjs.org/@bun-examples/${template}/-/${template}-${latestVersion}.tgz
 *    - Decompress & extract ${template}-${latestVersion}.tgz into ${destination}
 *    - Warn and exit if files would overwrite (unless --force)
 *
 * 2. GITHUB REPO:
 *    - Download tarball from GitHub's API
 *    - Decompress & extract into ${destination}
 *    - Warn and exit if files would overwrite (unless --force)
 *
 * 3. LOCAL TEMPLATE:
 *    - Open local template folder
 *    - Delete destination directory recursively
 *    - Copy files recursively using fastest system calls:
 *      - macOS: fcopyfile
 *      - Linux: copy_file_range
 *    - Skip node_modules folder (faster than cp)
 *
 * 4. POST-PROCESS:
 *    - Parse package.json, update name to basename(destination)
 *    - Remove "bun-create" section from package.json
 *    - Next.js: add bun-framework-next to dependencies
 *    - CRA: add entry point to public/index.html
 *    - Relay: add bun-macro-relay
 *
 * 5. INSTALL:
 *    - Auto-detect npm client: pnpm > yarn v1 > npm
 *    - Run "bun-create": { "preinstall" } tasks
 *    - Run ${npmClient} install (unless --no-install)
 *    - Run "bun-create": { "postinstall" } tasks
 *
 * 6. GIT:
 *    - Run git init; git add -A .; git commit -am "Initial Commit"
 *    - Rename gitignore to .gitignore
 *    - Runs in separate thread concurrently with node_modules install
 */
export const TEMPLATE_SOURCES = {
  /** NPM registry templates */
  NPM: '@bun-examples',

  /** GitHub repository templates */
  GITHUB: 'github.com',

  /** Local file system templates */
  LOCAL: './',
} as const;

// =============================================================================
// Template Detection & Framework Handlers
// =============================================================================

export const FRAMEWORK_HANDLERS = {
  /** Next.js detection handler */
  NEXT_JS: {
    detect: (pkg: any) => pkg?.dependencies?.next || pkg?.devDependencies?.next,
    action: 'add bun-framework-next to dependencies',
  },

  /** Create React App detection handler */
  CRA: {
    detect: (pkg: any) => pkg?.dependencies?.['react-scripts'],
    action: 'add entry point in /src/index.{js,jsx,ts,tsx} to public/index.html',
  },

  /** Relay detection handler */
  RELAY: {
    detect: (pkg: any) => pkg?.dependencies?.relay || pkg?.devDependencies?.relay,
    action: 'add bun-macro-relay so that Relay works',
  },
} as const;

// =============================================================================
// NPM Client Priority Order
// =============================================================================

/**
 * Auto-detect the npm client, preferring:
 * 1. pnpm
 * 2. yarn (v1)
 * 3. npm
 */
export const NPM_CLIENT_PRIORITY = ['pnpm', 'yarn', 'npm'] as const;

// =============================================================================
// Package.json Hooks
// =============================================================================

export const PACKAGE_HOOKS = {
  /** Runs before installation */
  PRE_INSTALL: 'preinstall',

  /** Runs after installation */
  POST_INSTALL: 'postinstall',

  /** Hooks namespace in package.json */
  NAMESPACE: 'bun-create',
} as const;

// =============================================================================
// File Operations Constants
// =============================================================================

export const FILE_OPS = {
  /** macOS fast copy system call */
  MACOS_COPY: 'fcopyfile',

  /** Linux fast copy system call */
  LINUX_COPY: 'copy_file_range',

  /** Directory to always skip during template copy */
  SKIP_DIR: 'node_modules',

  /** Gitignore rename source */
  GITIGNORE_SOURCE: 'gitignore',

  /** Gitignore rename destination */
  GITIGNORE_DEST: '.gitignore',
} as const;

// =============================================================================
// Template Metadata Structure
// =============================================================================

export interface TemplateMetadata {
  /** Template name or identifier */
  name: string;

  /** Template description */
  description: string;

  /** Template version */
  version: string;

  /** Template source (npm, github, local) */
  source: 'npm' | 'github' | 'local';

  /** Template URL or path */
  url: string;

  /** Framework detection results */
  frameworks: {
    nextJs?: boolean;
    cra?: boolean;
    relay?: boolean;
  };

  /** Dependencies count */
  dependencies: number;

  /** Estimated install time (ms) */
  estimatedInstallTime: number;
}

// =============================================================================
// Scoped Registry Configuration
// =============================================================================

export interface ScopedRegistryConfig {
  /** Scope name (e.g., @your-org) */
  scope: string;

  /** Registry URL */
  url: string;

  /** Authentication token */
  token?: string;

  /** Environment variable for token */
  tokenEnv?: string;
}

export const COMMON_SCOPED_REGISTRIES: Record<string, ScopedRegistryConfig> = {
  /** GitHub Packages */
  '@your-org': {
    scope: '@your-org',
    url: 'https://npm.pkg.github.com',
    tokenEnv: 'GITHUB_TOKEN',
  },

  /** Private npm registry */
  '@private': {
    scope: '@private',
    url: 'https://registry.example.com',
    tokenEnv: 'NPM_TOKEN',
  },

  /** Verdaccio local registry */
  '@local': {
    scope: '@local',
    url: 'http://localhost:4873',
  },
} as const;

// =============================================================================
// bunfig.toml Scoped Registry Template
// =============================================================================

export const BUNFIG_SCOPED_TEMPLATE = `
# Scoped Package Registries
# Configure authentication for private packages

[install.scopes]
# GitHub Packages example
"@your-org" = { token = "$GITHUB_TOKEN", url = "https://npm.pkg.github.com" }

# Private registry example
"@private" = { token = "$NPM_TOKEN", url = "https://registry.example.com" }

# Verdaccio local registry
"@local" = { token = "$VERDACCIO_TOKEN", url = "http://localhost:4873" }
`;

// =============================================================================
// Export Types
// =============================================================================

export type CreateFlag = typeof CREATE_FLAGS[keyof typeof CREATE_FLAGS];
export type CreateEnv = typeof CREATE_ENV[keyof typeof CREATE_ENV];
export type TemplateSource = typeof TEMPLATE_SOURCES[keyof typeof TEMPLATE_SOURCES];
export type NpmClient = typeof NPM_CLIENT_PRIORITY[number];

// =============================================================================
// Default Export
// =============================================================================

export default {
  CREATE_FLAGS,
  CREATE_ENV,
  TEMPLATE_SOURCES,
  FRAMEWORK_HANDLERS,
  NPM_CLIENT_PRIORITY,
  PACKAGE_HOOKS,
  FILE_OPS,
  COMMON_SCOPED_REGISTRIES,
  BUNFIG_SCOPED_TEMPLATE,
} as const;
