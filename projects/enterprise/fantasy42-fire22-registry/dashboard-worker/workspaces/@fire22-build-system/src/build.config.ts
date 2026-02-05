/**
 * Fire22 Dashboard Worker - Build Configuration
 *
 * Defines different build profiles and configurations
 */

export interface BuildProfile {
  name: string;
  description: string;
  version: {
    autoIncrement: boolean;
    type: 'patch' | 'minor' | 'major' | 'prerelease';
    prereleaseId?: string;
  };
  documentation: {
    generate: boolean;
    embed: boolean;
    formats: ('html' | 'md' | 'json')[];
  };
  dependencies: {
    analyze: boolean;
    update: boolean;
    audit: boolean;
  };
  metadata: {
    generate: boolean;
    update: boolean;
    validate: boolean;
  };
  packaging: {
    embed: boolean;
    bundle: boolean;
    optimize: boolean;
  };
  quality: {
    lint: boolean;
    test: boolean;
    coverage: boolean;
  };
  optimization: {
    minify: boolean;
    sourcemap: boolean;
    analyze: boolean;
    treeShaking: boolean;
  };
}

// Development build profile
export const developmentProfile: BuildProfile = {
  name: 'development',
  description: 'Fast build for development with minimal overhead',
  version: {
    autoIncrement: false,
    type: 'patch',
  },
  documentation: {
    generate: false,
    embed: false,
    formats: [],
  },
  dependencies: {
    analyze: false,
    update: false,
    audit: false,
  },
  metadata: {
    generate: false,
    update: false,
    validate: false,
  },
  packaging: {
    embed: false,
    bundle: true,
    optimize: false,
  },
  quality: {
    lint: false,
    test: false,
    coverage: false,
  },
  optimization: {
    minify: false,
    sourcemap: true,
    analyze: false,
    treeShaking: false,
  },
};

// Quick build profile
export const quickProfile: BuildProfile = {
  name: 'quick',
  description: 'Fast build with package building only',
  version: {
    autoIncrement: false,
    type: 'patch',
  },
  documentation: {
    generate: false,
    embed: false,
    formats: [],
  },
  dependencies: {
    analyze: false,
    update: false,
    audit: false,
  },
  metadata: {
    generate: false,
    update: false,
    validate: false,
  },
  packaging: {
    embed: false,
    bundle: true,
    optimize: false,
  },
  quality: {
    lint: false,
    test: false,
    coverage: false,
  },
  optimization: {
    minify: false,
    sourcemap: true,
    analyze: false,
    treeShaking: false,
  },
};

// Standard build profile
export const standardProfile: BuildProfile = {
  name: 'standard',
  description: 'Standard build with documentation and metadata',
  version: {
    autoIncrement: true,
    type: 'patch',
  },
  documentation: {
    generate: true,
    embed: true,
    formats: ['html', 'md', 'json'],
  },
  dependencies: {
    analyze: true,
    update: false,
    audit: true,
  },
  metadata: {
    generate: true,
    update: true,
    validate: true,
  },
  packaging: {
    embed: true,
    bundle: true,
    optimize: true,
  },
  quality: {
    lint: true,
    test: true,
    coverage: false,
  },
  optimization: {
    minify: false,
    sourcemap: true,
    analyze: false,
    treeShaking: true,
  },
};

// Production build profile
export const productionProfile: BuildProfile = {
  name: 'production',
  description: 'Production build with full optimization and quality checks',
  version: {
    autoIncrement: true,
    type: 'minor',
  },
  documentation: {
    generate: true,
    embed: true,
    formats: ['html', 'md', 'json'],
  },
  dependencies: {
    analyze: true,
    update: true,
    audit: true,
  },
  metadata: {
    generate: true,
    update: true,
    validate: true,
  },
  packaging: {
    embed: true,
    bundle: true,
    optimize: true,
  },
  quality: {
    lint: true,
    test: true,
    coverage: true,
  },
  optimization: {
    minify: true,
    sourcemap: false,
    analyze: true,
    treeShaking: true,
  },
};

// Full build profile
export const fullProfile: BuildProfile = {
  name: 'full',
  description: 'Complete build with all features and optimizations',
  version: {
    autoIncrement: true,
    type: 'patch',
  },
  documentation: {
    generate: true,
    embed: true,
    formats: ['html', 'md', 'json'],
  },
  dependencies: {
    analyze: true,
    update: true,
    audit: true,
  },
  metadata: {
    generate: true,
    update: true,
    validate: true,
  },
  packaging: {
    embed: true,
    bundle: true,
    optimize: true,
  },
  quality: {
    lint: true,
    test: true,
    coverage: true,
  },
  optimization: {
    minify: true,
    sourcemap: true,
    analyze: true,
    treeShaking: true,
  },
};

// Package-only build profile
export const packagesOnlyProfile: BuildProfile = {
  name: 'packages-only',
  description: 'Build only the modular packages',
  version: {
    autoIncrement: false,
    type: 'patch',
  },
  documentation: {
    generate: false,
    embed: false,
    formats: [],
  },
  dependencies: {
    analyze: false,
    update: false,
    audit: false,
  },
  metadata: {
    generate: false,
    update: false,
    validate: false,
  },
  packaging: {
    embed: false,
    bundle: true,
    optimize: false,
  },
  quality: {
    lint: false,
    test: false,
    coverage: false,
  },
  optimization: {
    minify: false,
    sourcemap: false,
    analyze: false,
    treeShaking: false,
  },
};

// Documentation-only build profile
export const docsOnlyProfile: BuildProfile = {
  name: 'docs-only',
  description: 'Generate documentation only',
  version: {
    autoIncrement: false,
    type: 'patch',
  },
  documentation: {
    generate: true,
    embed: false,
    formats: ['html', 'md', 'json'],
  },
  dependencies: {
    analyze: false,
    update: false,
    audit: false,
  },
  metadata: {
    generate: true,
    update: true,
    validate: false,
  },
  packaging: {
    embed: false,
    bundle: false,
    optimize: false,
  },
  quality: {
    lint: false,
    test: false,
    coverage: false,
  },
  optimization: {
    minify: false,
    sourcemap: false,
    analyze: false,
    treeShaking: false,
  },
};

// Cloudflare build profile
export const cloudflareProfile: BuildProfile = {
  name: 'cloudflare',
  description: 'Build and deploy to Cloudflare Workers',
  version: {
    autoIncrement: true,
    type: 'patch',
  },
  documentation: {
    generate: false,
    embed: false,
    formats: [],
  },
  dependencies: {
    analyze: false,
    update: false,
    audit: true,
  },
  metadata: {
    generate: true,
    update: true,
    validate: true,
  },
  packaging: {
    embed: false,
    bundle: true,
    optimize: true,
  },
  quality: {
    lint: true,
    test: false,
    coverage: false,
  },
  optimization: {
    minify: true,
    sourcemap: false,
    analyze: false,
    treeShaking: true,
  },
};

// Version-only build profile
export const versionOnlyProfile: BuildProfile = {
  name: 'version-only',
  description: 'Update version only',
  version: {
    autoIncrement: true,
    type: 'patch',
  },
  documentation: {
    generate: false,
    embed: false,
    formats: [],
  },
  dependencies: {
    analyze: false,
    update: false,
    audit: false,
  },
  metadata: {
    generate: false,
    update: true,
    validate: false,
  },
  packaging: {
    embed: false,
    bundle: false,
    optimize: false,
  },
  quality: {
    lint: false,
    test: false,
    coverage: false,
  },
  optimization: {
    minify: false,
    sourcemap: false,
    analyze: false,
    treeShaking: false,
  },
};

// Profile registry
export const buildProfiles: Record<string, BuildProfile> = {
  development: developmentProfile,
  quick: quickProfile,
  standard: standardProfile,
  production: productionProfile,
  full: fullProfile,
  'packages-only': packagesOnlyProfile,
  'docs-only': docsOnlyProfile,
  'version-only': versionOnlyProfile,
  cloudflare: cloudflareProfile,
};

// Default profile
export const defaultProfile = standardProfile;

// Get profile by name
export function getBuildProfile(name: string): BuildProfile {
  return buildProfiles[name] || defaultProfile;
}

// List all available profiles
export function listBuildProfiles(): string[] {
  return Object.keys(buildProfiles);
}

// Validate profile
export function validateProfile(profile: BuildProfile): boolean {
  return !!(
    profile.name &&
    profile.description &&
    profile.version &&
    profile.documentation &&
    profile.dependencies &&
    profile.metadata &&
    profile.packaging &&
    profile.quality &&
    profile.optimization
  );
}
