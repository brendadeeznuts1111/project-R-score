import "./types.d.ts";
// infrastructure/v1-3-3/git-dependency-security-layer.ts
// Component #60: Git Dependency Security Layer for Secure Custom Indicators


// Export interfaces for type safety
export interface GitDependency {
  url: string;
  isGitHub: boolean;
  owner?: string;
  repo?: string;
  ref?: string;
  path?: string;
}

export interface SecurityValidation {
  valid: boolean;
  reason: string;
  warnings: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface GitHubTarballResponse {
  tarball_url: string;
  zipball_url: string;
  commit: {
    sha: string;
    url: string;
  };
}

// Secure git dependency resolution for custom indicators
export class GitDependencySecurityLayer {
  private static readonly TRUSTED_GIT_HOSTS = new Set([
    "github.com",
    "gitlab.com",
    "bitbucket.org",
  ]);

  private static readonly BLOCKED_PROTOCOLS = new Set([
    "file:",
    "ftp:",
    "rsync:",
    "ssh:",
  ]);

  private static securityMetrics = {
    totalResolutions: 0,
    githubResolutions: 0,
    blockedResolutions: 0,
    warningsIssued: 0,
    riskAssessments: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
  };

  // Resolve git dependency with security validation
  static resolveGitDependency(spec: string): GitDependency {
    if (!process.env.FEATURE_GIT_DEPS_SECURE === "1") {
      // Legacy behavior - no security checks
      return { url: spec, isGitHub: false };
    }

    this.securityMetrics.totalResolutions++;

    // Parse the git specification
    const parsed = this.parseGitSpec(spec);

    // Security validation
    const validation = this.validateGitSpec(parsed);

    if (!validation.valid) {
      this.securityMetrics.blockedResolutions++;
      throw new Error(`Git dependency blocked: ${validation.reason}`);
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      this.securityMetrics.warningsIssues += validation.warnings.length;
      console.warn(`[GIT_SECURITY] Warnings for ${spec}:`, validation.warnings);
    }

    // Track risk assessment
    this.securityMetrics.riskAssessments[validation.riskLevel]++;

    if (parsed.isGitHub) {
      this.securityMetrics.githubResolutions++;
      console.log(`[GIT_SECURITY] Using GitHub tarball for: ${spec}`);
    }

    return parsed;
  }

  // Parse git specification
  private static parseGitSpec(spec: string): GitDependency {
    // Handle GitHub shorthand: owner/repo#ref
    const githubMatch = spec.match(
      /^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)(?:#(.+))?$/
    );
    if (githubMatch) {
      return {
        url: `https://api.github.com/repos/${githubMatch[1]}/${githubMatch[2]}/tarball/${githubMatch[3] || "main"}`,
        isGitHub: true,
        owner: githubMatch[1],
        repo: githubMatch[2],
        ref: githubMatch[3] || "main",
      };
    }

    // Handle full GitHub URLs
    const githubUrlMatch = spec.match(
      /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)(?:\/tree\/(.+))?$/
    );
    if (githubUrlMatch) {
      return {
        url: `https://api.github.com/repos/${githubUrlMatch[1]}/${githubUrlMatch[2]}/tarball/${githubUrlMatch[3] || "main"}`,
        isGitHub: true,
        owner: githubUrlMatch[1],
        repo: githubUrlMatch[2],
        ref: githubUrlMatch[3] || "main",
      };
    }

    // Handle other git URLs
    try {
      const url = new URL(spec);

      return {
        url: spec,
        isGitHub: url.hostname === "github.com",
        owner: this.extractOwnerFromUrl(url),
        repo: this.extractRepoFromUrl(url),
        ref: this.extractRefFromUrl(url),
      };
    } catch {
      // Invalid URL - treat as raw spec
      return { url: spec, isGitHub: false };
    }
  }

  // Validate git specification for security
  private static validateGitSpec(parsed: GitDependency): SecurityValidation {
    const warnings: string[] = [];
    let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";

    // Check for blocked protocols
    try {
      const url = new URL(parsed.url);
      const protocol = url.protocol.toLowerCase();

      if (this.BLOCKED_PROTOCOLS.has(protocol)) {
        return {
          valid: false,
          reason: `Blocked protocol: ${protocol}`,
          warnings: [],
          riskLevel: "CRITICAL",
        };
      }
    } catch {
      return {
        valid: false,
        reason: "Invalid URL format",
        warnings: [],
        riskLevel: "CRITICAL",
      };
    }

    // Check for trusted hosts
    try {
      const url = new URL(parsed.url);
      if (!this.TRUSTED_GIT_HOSTS.has(url.hostname)) {
        warnings.push(`Untrusted host: ${url.hostname}`);
        riskLevel = "MEDIUM";
      }
    } catch {
      warnings.push("Cannot parse hostname");
      riskLevel = "HIGH";
    }

    // Check for suspicious paths
    if (parsed.url.includes("..") || parsed.url.includes("%2e%2e")) {
      return {
        valid: false,
        reason: "Path traversal attempt detected",
        warnings: [],
        riskLevel: "CRITICAL",
      };
    }

    // Check for GitHub-specific security
    if (parsed.isGitHub) {
      if (!parsed.owner || !parsed.repo) {
        warnings.push("Incomplete GitHub repository specification");
        riskLevel = "MEDIUM";
      }

      // Check for common malicious patterns
      if (
        parsed.owner?.includes("malware") ||
        parsed.repo?.includes("malware")
      ) {
        warnings.push("Potentially malicious repository name");
        riskLevel = "HIGH";
      }
    }

    return {
      valid: true,
      reason: "Security validation passed",
      warnings,
      riskLevel,
    };
  }

  // Extract owner from URL
  private static extractOwnerFromUrl(url: URL): string | undefined {
    const pathParts = url.pathname.split("/").filter((part) => part.length > 0);
    return pathParts[0];
  }

  // Extract repo from URL
  private static extractRepoFromUrl(url: URL): string | undefined {
    const pathParts = url.pathname.split("/").filter((part) => part.length > 0);
    return pathParts[1]?.replace(".git", "");
  }

  // Extract ref from URL
  private static extractRefFromUrl(url: URL): string | undefined {
    const pathParts = url.pathname.split("/").filter((part) => part.length > 0);
    const treeIndex = pathParts.indexOf("tree");
    return treeIndex !== -1 ? pathParts[treeIndex + 1] : undefined;
  }

  // Fetch GitHub tarball
  static async fetchGitHubTarball(url: string): Promise<Response> {
    if (!process.env.FEATURE_GIT_DEPS_SECURE === "1") {
      throw new Error("Git dependency security is disabled");
    }

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Kalman-Arbitrage-System/1.3.3",
          Accept: "application/octet-stream",
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(
          `GitHub API error: ${response.status} ${response.statusText}`
        );
      }

      return response;
    } catch (error) {
      console.error(`[GIT_SECURITY] Failed to fetch GitHub tarball: ${error}`);
      throw error;
    }
  }

  // Validate repository metadata
  static async validateRepository(
    owner: string,
    repo: string,
    ref?: string
  ): Promise<SecurityValidation> {
    if (!process.env.FEATURE_GIT_DEPS_SECURE === "1") {
      return {
        valid: true,
        reason: "Security disabled",
        warnings: [],
        riskLevel: "LOW",
      };
    }

    try {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
      const response = await fetch(apiUrl, {
        headers: {
          "User-Agent": "Kalman-Arbitrage-System/1.3.3",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return {
          valid: false,
          reason: `Repository not found or inaccessible: ${response.status}`,
          warnings: [],
          riskLevel: "HIGH",
        };
      }

      const repoData = await response.json();
      const warnings: string[] = [];
      let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";

      // Check repository age
      const createdAt = new Date(repoData.created_at);
      const ageInDays =
        (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      if (ageInDays < 7) {
        warnings.push("Repository is very new (less than 7 days)");
        riskLevel = "MEDIUM";
      }

      // Check for suspicious activity
      if (repoData.fork && repoData.stargazers_count < 5) {
        warnings.push("Fork with few stars - potentially suspicious");
        riskLevel = "MEDIUM";
      }

      // Check for archived status
      if (repoData.archived) {
        warnings.push("Repository is archived - may not receive updates");
        riskLevel = "MEDIUM";
      }

      // Check for default branch
      const defaultBranch = repoData.default_branch || "main";
      if (ref && ref !== defaultBranch) {
        warnings.push(
          `Using non-default branch: ${ref} (default: ${defaultBranch})`
        );
        riskLevel = "LOW";
      }

      return {
        valid: true,
        reason: "Repository validation passed",
        warnings,
        riskLevel,
      };
    } catch (error) {
      return {
        valid: false,
        reason: `Failed to validate repository: ${error}`,
        warnings: [],
        riskLevel: "HIGH",
      };
    }
  }

  // Get security metrics
  static getSecurityMetrics(): typeof GitDependencySecurityLayer.securityMetrics {
    return { ...this.securityMetrics };
  }

  // Reset security metrics
  static resetSecurityMetrics(): void {
    this.securityMetrics = {
      totalResolutions: 0,
      githubResolutions: 0,
      blockedResolutions: 0,
      warningsIssued: 0,
      riskAssessments: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
    };
  }

  // Create security report
  static createSecurityReport(): {
    timestamp: number;
    metrics: typeof GitDependencySecurityLayer.securityMetrics;
    recommendations: string[];
  } {
    const recommendations: string[] = [];

    const blockRate =
      this.securityMetrics.totalResolutions > 0
        ? (this.securityMetrics.blockedResolutions /
            this.securityMetrics.totalResolutions) *
          100
        : 0;

    if (blockRate > 10) {
      recommendations.push(
        "High block rate detected - review dependency sources"
      );
    }

    if (
      this.securityMetrics.warningsIssued >
      this.securityMetrics.totalResolutions * 0.5
    ) {
      recommendations.push(
        "Many warnings issued - consider tightening security policies"
      );
    }

    if (this.securityMetrics.riskAssessments.CRITICAL > 0) {
      recommendations.push(
        "Critical risk assessments detected - immediate review required"
      );
    }

    if (
      this.securityMetrics.riskAssessments.HIGH >
      this.securityMetrics.totalResolutions * 0.2
    ) {
      recommendations.push(
        "High number of high-risk dependencies - review security posture"
      );
    }

    return {
      timestamp: Date.now(),
      metrics: { ...this.securityMetrics },
      recommendations,
    };
  }
}

// Zero-cost export
export const {
  resolveGitDependency,
  fetchGitHubTarball,
  validateRepository,
  getSecurityMetrics,
  resetSecurityMetrics,
  createSecurityReport,
} = process.env.FEATURE_GIT_DEPS_SECURE === "1"
  ? GitDependencySecurityLayer
  : {
      resolveGitDependency: (spec: string) => ({ url: spec, isGitHub: false }),
      fetchGitHubTarball: async (url: string) => {
        throw new Error("Git dependency security is disabled");
      },
      validateRepository: async () => ({
        valid: true,
        reason: "Security disabled",
        warnings: [],
        riskLevel: "LOW",
      }),
      getSecurityMetrics: () => ({
        totalResolutions: 0,
        githubResolutions: 0,
        blockedResolutions: 0,
        warningsIssued: 0,
        riskAssessments: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
      }),
      resetSecurityMetrics: () => {},
      createSecurityReport: () => ({
        timestamp: Date.now(),
        metrics: {
          totalResolutions: 0,
          githubResolutions: 0,
          blockedResolutions: 0,
          warningsIssued: 0,
          riskAssessments: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
        },
        recommendations: [],
      }),
    };

export default GitDependencySecurityLayer;
