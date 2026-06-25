#!/usr/bin/env bun
/**
 * 📦 Private NPM Registry Types
 * 
 * Type definitions for the R2-backed private registry
 */

export interface PackageVersion {
  name: string;
  version: string;
  description?: string;
  main?: string;
  module?: string;
  types?: string;
  files?: string[];
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  engines?: {
    node?: string;
    bun?: string;
  };
  os?: string[];
  cpu?: string[];
  keywords?: string[];
  author?: string | { name: string; email?: string; url?: string };
  license?: string;
  repository?: {
    type: string;
    url: string;
    directory?: string;
  };
  bugs?: {
    url: string;
    email?: string;
  };
  homepage?: string;
  dist: {
    tarball: string;
    shasum: string;
    integrity: string;
    fileCount?: number;
    unpackedSize?: number;
  };
  deprecated?: string;
  publishConfig?: {
    registry?: string;
    access?: 'public' | 'restricted';
  };
  _id: string;
  _nodeVersion?: string;
  _npmVersion?: string;
  _npmUser?: {
    name: string;
    email: string;
  };
  maintainers?: Array<{ name: string; email: string }>;
  contributors?: Array<{ name: string; email?: string; url?: string }>;
  gitHead?: string;
  readme?: string;
  readmeFilename?: string;
  created: string;
  modified: string;
}

export interface PackageManifest {
  name: string;
  'dist-tags': Record<string, string>;
  versions: Record<string, PackageVersion>;
  time?: {
    created: string;
    modified: string;
    [version: string]: string;
  };
  users?: Record<string, boolean>;
  readme?: string;
  readmeFilename?: string;
  description?: string;
  homepage?: string;
  keywords?: string[];
  repository?: {
    type: string;
    url: string;
    directory?: string;
  };
  author?: string | { name: string; email?: string; url?: string };
  license?: string;
  bugs?: {
    url: string;
  };
  maintainers?: Array<{ name: string; email: string }>;
  contributors?: Array<{ name: string; email?: string; url?: string }>;
  _id: string;
  _rev?: string;
  _attachments?: Record<string, {
    content_type: string;
    data: string;
    length: number;
  }>;
}

export interface SearchResult {
  objects: Array<{
    package: PackageManifest;
    flags?: {
      unstable?: boolean;
      deprecated?: boolean;
    };
    score?: {
      final: number;
      detail: {
        quality: number;
        popularity: number;
        maintenance: number;
      };
    };
    searchScore?: number;
  }>;
  total: number;
  time: string;
}

export interface RegistryUser {
  name: string;
  email?: string;
  passwordHash?: string;
  salt?: string;
  fullname?: string;
  twitter?: string;
  github?: string;
  roles?: string[];
  date: string;
  updated: string;
  packages?: string[];
}

export interface AuthToken {
  token: string;
  user: string;
  readonly: boolean;
  created: string;
  expires?: string;
  cidr_whitelist?: string[];
}

export interface RegistryConfig {
  name: string;
  url: string;
  storage: {
    type: 'r2' | 'local' | 's3';
    bucket: string;
    prefix?: string;
    region?: string;
    endpoint?: string;
  };
  cdn?: {
    enabled: boolean;
    url: string;
    signedUrls: boolean;
    expirySeconds: number;
  };
  auth: {
    type: 'none' | 'basic' | 'token' | 'jwt';
    jwtSecret?: string;
    tokenExpiry?: string;
  };
  uplinks?: Array<{
    name: string;
    url: string;
    cache?: boolean;
    cacheMaxAge?: number;
  }>;  
  packages: Array<{
    pattern: string;
    access: 'all' | 'authenticated' | 'restricted';
    publish?: string[];
    proxy?: string[];
    storage?: string;
  }>;
  publish?: {
    allowOffline?: boolean;
    checkScope?: boolean;
    access?: 'public' | 'restricted';
  };
  middlewares?: {
    audit?: boolean;
    rateLimit?: {
      windowMs: number;
      maxRequests: number;
    };
  };
}

export interface PublishRequest {
  _id: string;
  name: string;
  version: string;
  description?: string;
  main?: string;
  dist: {
    tarball?: string;
    shasum: string;
    integrity: string;
  };
  attachments?: Record<string, {
    content_type: string;
    data: string;
  }>;
  'dist-tags'?: Record<string, string>;
  maintainers?: Array<{ name: string; email: string }>;
  readme?: string;
  readmeFilename?: string;
}

export interface PackageStats {
  name: string;
  versionCount: number;
  totalDownloads: number;
  lastPublished: string;
  size: number;
}

export interface RegistryStats {
  packages: number;
  versions: number;
  totalSize: number;
  downloads24h: number;
  downloads30d: number;
}
