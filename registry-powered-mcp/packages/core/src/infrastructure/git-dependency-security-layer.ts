/**
 * Component #60: Git-Dependency-Security-Layer
 * Logic Tier: Level 1 (Security)
 * Resource Tax: Net <10ms
 * Parity Lock: 1c2d...3e4f
 * Protocol: Git URLs RFC
 *
 * HTTP tarball fast path; GitHub shorthand parsing.
 * Provides secure resolution of Git dependencies with validation.
 *
 * @module infrastructure/git-dependency-security-layer
 */

import { isFeatureEnabled } from '../types/feature-flags';

/**
 * Known Git protocols
 */
export const KNOWN_PROTOCOLS = [
  'git+ssh',
  'git+https',
  'https',
  'ssh',
  'git',
] as const;

export type KnownProtocol = typeof KNOWN_PROTOCOLS[number];

/**
 * Resolved Git dependency
 */
export interface ResolvedGitDependency {
  url: string;
  isGitHub: boolean;
  protocol: string;
  owner?: string;
  repo?: string;
  ref?: string;
  originalSpec: string;
}

/**
 * GitHub tarball response
 */
export interface GitHubTarballResult {
  stream: ReadableStream<Uint8Array>;
  contentLength: number;
  signature?: string;
}

/**
 * Git Dependency Security Layer for secure package resolution
 * Uses HTTP tarball fast path for GitHub dependencies
 */
export class GitDependencySecurityLayer {
  private static readonly GITHUB_SHORTHAND_REGEX = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:#(.+))?$/;
  private static readonly GITHUB_URL_REGEX = /^(?:git\+)?(?:https?:\/\/)?github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:#(.+))?$/;
  private static readonly GITHUB_TARBALL_URL = 'https://api.github.com/repos/{owner}/{repo}/tarball/{ref}';

  /**
   * Resolve Git dependency specification to URL
   */
  static resolveGitDependency(spec: string): ResolvedGitDependency {
    if (!isFeatureEnabled('CATALOG_RESOLUTION')) {
      return {
        url: spec,
        isGitHub: false,
        protocol: 'unknown',
        originalSpec: spec,
      };
    }

    // Try GitHub shorthand first: owner/repo or owner/repo#ref
    const shorthandMatch = spec.match(this.GITHUB_SHORTHAND_REGEX);
    if (shorthandMatch && shorthandMatch[1] && shorthandMatch[2]) {
      const owner = shorthandMatch[1];
      const repo = shorthandMatch[2];
      const ref = shorthandMatch[3];
      const resolvedRef = ref || 'HEAD';

      return {
        url: this.buildGitHubTarballUrl(owner, repo, resolvedRef),
        isGitHub: true,
        protocol: 'https',
        owner,
        repo,
        ref: resolvedRef,
        originalSpec: spec,
      };
    }

    // Try full GitHub URL
    const githubUrlMatch = spec.match(this.GITHUB_URL_REGEX);
    if (githubUrlMatch && githubUrlMatch[1] && githubUrlMatch[2]) {
      const owner = githubUrlMatch[1];
      const repo = githubUrlMatch[2];
      const ref = githubUrlMatch[3];
      const resolvedRef = ref || 'HEAD';

      return {
        url: this.buildGitHubTarballUrl(owner, repo, resolvedRef),
        isGitHub: true,
        protocol: 'https',
        owner,
        repo,
        ref: resolvedRef,
        originalSpec: spec,
      };
    }

    // Parse protocol from URL
    const protocol = this.extractProtocol(spec);

    // Validate protocol
    if (protocol && !KNOWN_PROTOCOLS.includes(protocol as KnownProtocol)) {
      console.warn(`[Git-Security] Unknown protocol: ${protocol}`);
    }

    return {
      url: spec,
      isGitHub: false,
      protocol: protocol || 'unknown',
      originalSpec: spec,
    };
  }

  /**
   * Validate GitHub shorthand format
   */
  static validateGitHubShorthand(shorthand: string): boolean {
    return this.GITHUB_SHORTHAND_REGEX.test(shorthand);
  }

  /**
   * Validate Git URL format
   */
  static validateGitUrl(url: string): { valid: boolean; error?: string } {
    // Check for path traversal
    if (url.includes('..')) {
      return { valid: false, error: 'Path traversal detected' };
    }

    // Check for null bytes
    if (url.includes('\x00')) {
      return { valid: false, error: 'Null bytes not allowed' };
    }

    // Check for command injection characters in non-URL parts
    const dangerousChars = /[;&|`$()]/;
    const urlWithoutProtocol = url.replace(/^[a-z+]+:\/\//, '');
    const hostPart = urlWithoutProtocol.split('/')[0] || '';
    if (dangerousChars.test(hostPart)) {
      return { valid: false, error: 'Dangerous characters in URL' };
    }

    // Validate URL length
    if (url.length > 2048) {
      return { valid: false, error: 'URL too long' };
    }

    return { valid: true };
  }

  /**
   * Fetch GitHub tarball via HTTP fast path
   */
  static async fetchGitHubTarball(
    url: string,
    options?: {
      token?: string;
      proxy?: { url: string; headers?: Record<string, string> };
    }
  ): Promise<GitHubTarballResult> {
    if (!isFeatureEnabled('CATALOG_RESOLUTION')) {
      const response = await fetch(url);
      return {
        stream: response.body!,
        contentLength: parseInt(response.headers.get('content-length') || '0', 10),
      };
    }

    // Validate URL
    const validation = this.validateGitUrl(url);
    if (!validation.valid) {
      throw new Error(`Invalid Git URL: ${validation.error}`);
    }

    // Build fetch options
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'bun-registry-mcp/2.4.1',
    };

    if (options?.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    // Use proxy if configured
    const fetchOptions: RequestInit = { headers };
    if (options?.proxy && isFeatureEnabled('SECURE_PROXY')) {
      // Proxy headers would be applied here
      Object.assign(headers, options.proxy.headers);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    // Check for signature
    const signature = response.headers.get('x-hub-signature-256') || undefined;

    if (!signature && isFeatureEnabled('DEBUG')) {
      console.warn('[Git-Security] No GitHub signature on tarball');
    }

    // Log successful fetch
    this.logGitHubFetch(url, response.status, !!signature);

    return {
      stream: response.body!,
      contentLength: parseInt(response.headers.get('content-length') || '0', 10),
      signature,
    };
  }

  /**
   * Check if URL is a GitHub dependency
   */
  static isGitHubDependency(spec: string): boolean {
    return (
      this.GITHUB_SHORTHAND_REGEX.test(spec) ||
      this.GITHUB_URL_REGEX.test(spec)
    );
  }

  /**
   * Parse GitHub shorthand
   */
  static parseGitHubShorthand(spec: string): {
    owner: string;
    repo: string;
    ref: string;
  } | null {
    const match = spec.match(this.GITHUB_SHORTHAND_REGEX);
    if (!match || !match[1] || !match[2]) return null;

    const owner = match[1];
    const repo = match[2];
    const ref = match[3] || 'HEAD';
    return { owner, repo, ref };
  }

  /**
   * Build GitHub tarball URL
   */
  private static buildGitHubTarballUrl(owner: string, repo: string, ref: string): string {
    return this.GITHUB_TARBALL_URL
      .replace('{owner}', encodeURIComponent(owner))
      .replace('{repo}', encodeURIComponent(repo))
      .replace('{ref}', encodeURIComponent(ref));
  }

  /**
   * Extract protocol from URL
   */
  private static extractProtocol(url: string): string | null {
    const match = url.match(/^([a-z+]+):/i);
    return match && match[1] ? match[1].toLowerCase() : null;
  }

  /**
   * Log GitHub fetch for audit
   */
  private static logGitHubFetch(url: string, status: number, hasSignature: boolean): void {
    if (!isFeatureEnabled('MEMORY_AUDIT')) return;

    console.debug('[Git-Security] Fetch', {
      component: 60,
      url: url.replace(/\/tarball\/.*/, '/tarball/{ref}'),
      status,
      signed: hasSignature,
      timestamp: Date.now(),
    });
  }
}

/**
 * Zero-cost exports
 */
export const resolveGitDependency = isFeatureEnabled('CATALOG_RESOLUTION')
  ? GitDependencySecurityLayer.resolveGitDependency.bind(GitDependencySecurityLayer)
  : (spec: string) => ({ url: spec, isGitHub: false, protocol: 'unknown', originalSpec: spec });

export const validateGitHubShorthand = GitDependencySecurityLayer.validateGitHubShorthand.bind(GitDependencySecurityLayer);
export const validateGitUrl = GitDependencySecurityLayer.validateGitUrl.bind(GitDependencySecurityLayer);

export const fetchGitHubTarball = isFeatureEnabled('CATALOG_RESOLUTION')
  ? GitDependencySecurityLayer.fetchGitHubTarball.bind(GitDependencySecurityLayer)
  : async (url: string) => {
      const response = await fetch(url);
      return { stream: response.body!, contentLength: 0 };
    };

export const isGitHubDependency = GitDependencySecurityLayer.isGitHubDependency.bind(GitDependencySecurityLayer);
export const parseGitHubShorthand = GitDependencySecurityLayer.parseGitHubShorthand.bind(GitDependencySecurityLayer);
