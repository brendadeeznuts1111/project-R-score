// lib/docs/urls.ts - Extended for versioning and lifecycle management

export const BUN_DOCS = {
  // Core domains
  domains: {
    sh: 'https://bun.sh',
    com: 'https://bun.com',
  } as const,

  // Base runtime documentation
  runtime: (section: string, subsection?: string, domain: 'sh' | 'com' = 'sh') => {
    const base = `${BUN_DOCS.domains[domain]}/docs/runtime/${section}`;
    return subsection ? `${base}/${subsection}` : base;
  },

  // Build documentation
  build: (section: string, subsection?: string, domain: 'sh' | 'com' = 'sh') => {
    const base = `${BUN_DOCS.domains[domain]}/docs/bundler/${section}`;
    return subsection ? `${base}/${subsection}` : base;
  },

  // Package manager documentation
  packages: (section: string, subsection?: string, domain: 'sh' | 'com' = 'sh') => {
    const base = `${BUN_DOCS.domains[domain]}/docs/installer/${section}`;
    return subsection ? `${base}/${subsection}` : base;
  },

  // Testing documentation
  test: (section: string, subsection?: string, domain: 'sh' | 'com' = 'sh') => {
    const base = `${BUN_DOCS.domains[domain]}/docs/test/${section}`;
    return subsection ? `${base}/${subsection}` : base;
  },
} as const;

// Secrets management with versioning extensions (defined after BUN_DOCS base)
BUN_DOCS.secrets = {
  // Core secrets documentation
  overview: BUN_DOCS.runtime('secrets'),
  get: BUN_DOCS.runtime('secrets', 'get'),
  set: BUN_DOCS.runtime('secrets', 'set'),
  delete: BUN_DOCS.runtime('secrets', 'delete'),
  list: BUN_DOCS.runtime('secrets', 'list'),

  // Versioning extensions
  versioning: BUN_DOCS.runtime('secrets', 'versioning'),
  lifecycle: BUN_DOCS.runtime('secrets', 'lifecycle-management'),
  rollback: BUN_DOCS.runtime('secrets', 'rollback'),
  encryption: BUN_DOCS.runtime('secrets', 'encryption'),
  auditing: BUN_DOCS.runtime('secrets', 'auditing'),

  // Enterprise features
  enterprise: {
    overview: BUN_DOCS.runtime('secrets', 'enterprise'),
    r2Integration: BUN_DOCS.runtime('secrets', 'r2-integration'),
    teamManagement: BUN_DOCS.runtime('secrets', 'team-management'),
    compliance: BUN_DOCS.runtime('secrets', 'compliance'),
    sso: BUN_DOCS.runtime('secrets', 'sso'),
  },

  // .com domain (enterprise documentation)
  com: {
    overview: BUN_DOCS.runtime('secrets', undefined, 'com'),
    versioning: BUN_DOCS.runtime('secrets', 'versioning', 'com'),
    lifecycle: BUN_DOCS.runtime('secrets', 'lifecycle-management', 'com'),
    rollback: BUN_DOCS.runtime('secrets', 'rollback', 'com'),
    encryption: BUN_DOCS.runtime('secrets', 'encryption', 'com'),
    auditing: BUN_DOCS.runtime('secrets', 'auditing', 'com'),
    r2Integration: BUN_DOCS.runtime('secrets', 'r2-integration', 'com'),
    apiReference: BUN_DOCS.runtime('secrets', 'api-reference', 'com'),
    bestPractices: BUN_DOCS.runtime('secrets', 'best-practices', 'com'),
    troubleshooting: BUN_DOCS.runtime('secrets', 'troubleshooting', 'com'),
  },
} as const;

// Build system documentation (defined after BUN_DOCS base)
BUN_DOCS.buildSystem = {
  overview: BUN_DOCS.build(''),
  executablePath: BUN_DOCS.build('executable-path'),
  virtualFiles: BUN_DOCS.build('virtual-files'),
  plugins: BUN_DOCS.build('plugins'),
  targets: BUN_DOCS.build('targets'),
  optimization: BUN_DOCS.build('optimization'),

  // Advanced features
  advanced: {
    reactFastRefresh: BUN_DOCS.build('react-fast-refresh'),
    codeSplitting: BUN_DOCS.build('code-splitting'),
    treeShaking: BUN_DOCS.build('tree-shaking'),
    minification: BUN_DOCS.build('minification'),
    sourceMaps: BUN_DOCS.build('source-maps'),
  },

  com: {
    overview: BUN_DOCS.build('', undefined, 'com'),
    executablePath: BUN_DOCS.build('executable-path', undefined, 'com'),
    virtualFiles: BUN_DOCS.build('virtual-files', undefined, 'com'),
    enterprise: BUN_DOCS.build('enterprise', undefined, 'com'),
  },
} as const;

// R2 integration documentation (defined after BUN_DOCS base)
BUN_DOCS.r2 = {
  overview: BUN_DOCS.runtime('r2'),
  quickstart: BUN_DOCS.runtime('r2', 'quickstart'),
  authentication: BUN_DOCS.runtime('r2', 'authentication'),
  buckets: BUN_DOCS.runtime('r2', 'buckets'),
  objects: BUN_DOCS.runtime('r2', 'objects'),

  // Advanced R2 features
  advanced: {
    multipartUploads: BUN_DOCS.runtime('r2', 'multipart-uploads'),
    versioning: BUN_DOCS.runtime('r2', 'versioning'),
    encryption: BUN_DOCS.runtime('r2', 'encryption'),
    lifecycle: BUN_DOCS.runtime('r2', 'lifecycle'),
    analytics: BUN_DOCS.runtime('r2', 'analytics'),
  },

  // Integration guides
  integrations: {
    bunBuild: BUN_DOCS.runtime('r2', 'bun-build-integration'),
    executablePath: BUN_DOCS.runtime('r2', 'executable-path'),
    secrets: BUN_DOCS.runtime('r2', 'secrets-integration'),
    ciCd: BUN_DOCS.runtime('r2', 'cicd-integration'),
  },

  com: {
    overview: BUN_DOCS.runtime('r2', undefined, 'com'),
    enterprise: BUN_DOCS.runtime('r2', 'enterprise', 'com'),
    apiReference: BUN_DOCS.runtime('r2', 'api-reference', 'com'),
    pricing: BUN_DOCS.runtime('r2', 'pricing', 'com'),
  },
} as const;

// Import centralized domain configuration
import { FACTORY_WAGER_DOMAIN, buildDocsUrl, buildApiUrl } from '../../../src/config/domain';

// FactoryWager specific documentation
BUN_DOCS.factorywager = {
  overview: buildDocsUrl(),
  secrets: buildDocsUrl('/secrets'),
  versioning: buildDocsUrl('/secrets/versioning'),
  lifecycle: buildDocsUrl('/secrets/lifecycle'),
  r2Integration: buildDocsUrl('/integrations/r2'),

  // API documentation
  api: {
    secrets: buildApiUrl('/docs/secrets'),
    versioning: buildApiUrl('/docs/secrets/versioning'),
    lifecycle: buildApiUrl('/docs/secrets/lifecycle'),
    r2: buildApiUrl('/docs/r2'),
  },

  // Guides and tutorials
  guides: {
    quickstart: buildDocsUrl('/guides/quickstart'),
    migrations: buildDocsUrl('/guides/migrations'),
    bestPractices: buildDocsUrl('/guides/best-practices'),
    troubleshooting: buildDocsUrl('/guides/troubleshooting'),
  },
} as const;

// Helper functions for specific use cases
BUN_DOCS.versionRef = (version: string, domain: 'sh' | 'com' = 'sh') =>
  `${BUN_DOCS.domains[domain]}/docs/runtime/secrets#version-${version}`;

// Generate links for specific secret operations
BUN_DOCS.secretOp = (
  operation: 'get' | 'set' | 'delete' | 'versioning' | 'rollback' | 'lifecycle',
  domain: 'sh' | 'com' = 'sh'
) => {
  const base = BUN_DOCS.secrets[operation] || BUN_DOCS.secrets.versioning;
  return typeof base === 'string' ? base : BUN_DOCS.runtime('secrets', operation, domain);
};

// Generate links for R2 operations
BUN_DOCS.r2Op = (
  operation: 'buckets' | 'objects' | 'authentication' | 'integrations',
  domain: 'sh' | 'com' = 'sh'
) => {
  return BUN_DOCS.runtime('r2', operation, domain);
};

// Generate links for build operations
BUN_DOCS.buildOp = (
  operation: 'executable-path' | 'virtual-files' | 'plugins',
  domain: 'sh' | 'com' = 'sh'
) => {
  return BUN_DOCS.build(operation, undefined, domain);
};

// Quick reference helpers
BUN_DOCS.quickRefs = {
  secrets: {
    basic: BUN_DOCS.secrets.overview,
    versioning: BUN_DOCS.secrets.versioning,
    lifecycle: BUN_DOCS.secrets.lifecycle,
    enterprise: BUN_DOCS.secrets.com.versioning,
  },
  r2: {
    quickstart: BUN_DOCS.r2.quickstart,
    authentication: BUN_DOCS.r2.authentication,
    bunIntegration: BUN_DOCS.r2.integrations.bunBuild,
  },
  build: {
    executablePath: BUN_DOCS.buildSystem.executablePath,
    virtualFiles: BUN_DOCS.buildSystem.virtualFiles,
    enterprise: BUN_DOCS.buildSystem.com.enterprise,
  },
} as const;

// Version-specific documentation
BUN_DOCS.versions = {
  '1.3': {
    secrets: BUN_DOCS.versionRef('1.3'),
    r2: `${BUN_DOCS.domains.sh}/docs/runtime/r2#version-1.3`,
    build: `${BUN_DOCS.domains.sh}/docs/bundler#version-1.3`,
  },
  '1.4': {
    secrets: BUN_DOCS.versionRef('1.4'),
    r2: `${BUN_DOCS.domains.sh}/docs/runtime/r2#version-1.4`,
    build: `${BUN_DOCS.domains.sh}/docs/bundler#version-1.4`,
  },
} as const;

// Community and support links
BUN_DOCS.community = {
  discord: 'https://bun.sh/discord',
  github: 'https://github.com/oven-sh/bun',
  issues: 'https://github.com/oven-sh/bun/issues',
  discussions: 'https://github.com/oven-sh/bun/discussions',
  twitter: 'https://twitter.com/bunjavascript',
} as const;

// Enterprise support
BUN_DOCS.enterprise = {
  overview: BUN_DOCS.secrets.enterprise.overview,
  support: 'https://bun.com/support',
  pricing: 'https://bun.com/pricing',
  contact: 'https://bun.com/contact',
  security: 'https://bun.com/security',
} as const;

// Type helpers for better TypeScript support
export type DocumentationDomain = 'sh' | 'com';
export type SecretOperation = 'get' | 'set' | 'delete' | 'versioning' | 'rollback' | 'lifecycle';
export type R2Operation = 'buckets' | 'objects' | 'authentication' | 'integrations';
export type BuildOperation = 'executable-path' | 'virtual-files' | 'plugins';

// Helper function to get the appropriate documentation URL
export function getDocUrl(
  category: 'secrets' | 'r2' | 'build' | 'factorywager',
  operation?: string,
  domain: DocumentationDomain = 'sh'
): string {
  switch (category) {
    case 'secrets':
      return operation
        ? BUN_DOCS.secretOp(operation as SecretOperation, domain)
        : BUN_DOCS.secrets.overview;
    case 'r2':
      return operation ? BUN_DOCS.r2Op(operation as R2Operation, domain) : BUN_DOCS.r2.overview;
    case 'build':
      return operation
        ? BUN_DOCS.buildOp(operation as BuildOperation, domain)
        : BUN_DOCS.buildSystem.overview;
    case 'factorywager':
      return operation
        ? (BUN_DOCS.factorywager as any)[operation] || BUN_DOCS.factorywager.overview
        : BUN_DOCS.factorywager.overview;
    default:
      return BUN_DOCS.runtime('');
  }
}

// Helper function for version-specific documentation
export function getVersionedDocUrl(
  version: string,
  category: 'secrets' | 'r2' | 'build',
  domain: DocumentationDomain = 'sh'
): string {
  return (
    BUN_DOCS.versions[version as keyof typeof BUN_DOCS.versions]?.[category] ||
    getDocUrl(category, undefined, domain)
  );
}

// Helper function to generate documentation links with anchors
export function createDocLink(
  url: string,
  anchor?: string,
  params?: Record<string, string>
): string {
  let finalUrl = url;
  if (anchor) {
    finalUrl += `#${anchor}`;
  }
  if (params) {
    const searchParams = new URLSearchParams(params);
    finalUrl += `?${searchParams.toString()}`;
  }
  return finalUrl;
}

// Export commonly used documentation collections
export const SECRET_DOCS = {
  BASIC: BUN_DOCS.secrets.overview,
  VERSIONING: BUN_DOCS.secrets.versioning,
  LIFECYCLE: BUN_DOCS.secrets.lifecycle,
  ROLLBACK: BUN_DOCS.secrets.rollback,
  ENTERPRISE: BUN_DOCS.secrets.com.versioning,
  FACTORYWAGER: BUN_DOCS.factorywager.secrets,
} as const;

export const R2_DOCS = {
  OVERVIEW: BUN_DOCS.r2.overview,
  QUICKSTART: BUN_DOCS.r2.quickstart,
  AUTH: BUN_DOCS.r2.authentication,
  BUN_INTEGRATION: BUN_DOCS.r2.integrations.bunBuild,
  SECRETS_INTEGRATION: BUN_DOCS.r2.integrations.secrets,
  ENTERPRISE: BUN_DOCS.r2.com.enterprise,
} as const;

export const BUILD_DOCS = {
  OVERVIEW: BUN_DOCS.buildSystem.overview,
  EXECUTABLE_PATH: BUN_DOCS.buildSystem.executablePath,
  VIRTUAL_FILES: BUN_DOCS.buildSystem.virtualFiles,
  ENTERPRISE: BUN_DOCS.buildSystem.com.enterprise,
} as const;
