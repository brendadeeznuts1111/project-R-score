// LeadSpecProfile Schema - Team Lead Contract
// Professional, typed, auditable metrics for Bun Markdown performance

/**
 * Lead-approved schema for Bun Markdown performance profiling
 * Enforced across all team levels: Junior → Senior → Lead → Enterprise
 */
export interface LeadSpecProfile {
  // Core performance metrics (Team Lead approved)
  core: {
    documentSize: number;      // Document size in bytes
    parseTime: number;         // Total parse time in milliseconds
    throughput: number;        // Characters per second processing rate
    memoryMB: number;          // Peak memory usage in megabytes
  };

  // Markdown-specific metrics
  markdown: {
    parseTimeMs: number;       // Bun.markdown parse time in milliseconds
    featureCounts: Record<string, number>;  // Feature breakdown: headings: 5, tables: 2...
    complexityTier: 'junior' | 'senior' | 'lead' | 'enterprise';  // Hierarchical complexity
    compliance: {
      gfm: number;            // GitHub Flavored Markdown compliance (0-100)
      commonmark: number;     // CommonMark specification compliance (0-100)
    };
    outputs: {
      htmlSize: number;       // HTML output size in bytes
      ansiSize: number;       // ANSI terminal output size in bytes
      reactEst: number;       // Estimated React component count
    };
  };

  // Security and integrity
  security: {
    etag: string;             // Cryptographic etag for content verification
    integrityHash: string;    // SHA-256 integrity hash
  };

  // Audit trail
  audit: {
    timestamp: string;        // ISO timestamp of profiling
    runner: 'junior' | 'senior' | 'lead' | 'enterprise';  // Who ran this profile
    environment: string;      // Runtime environment (bun version, etc.)
  };
}

/**
 * Configuration thresholds for complexity classification
 */
export interface ComplexityThresholds {
  junior: number;    // < 1KB documents
  senior: number;    // < 10KB documents  
  lead: number;      // < 100KB documents
  enterprise: number; // > 100KB documents
}

/**
 * Markdown feature enumeration for counting
 */
export interface MarkdownFeatures {
  headings: {
    h1: number;
    h2: number;
    h3: number;
    h4: number;
    h5: number;
    h6: number;
  };
  tables: number;
  taskLists: number;
  codeBlocks: number;
  links: number;
  images: number;
  mathExpressions: number;
  strikethrough: number;
  blockquotes: number;
  lists: {
    ordered: number;
    unordered: number;
  };
}

/**
 * Benchmark configuration for different team levels
 */
export interface BenchmarkConfig {
  iterations: number;
  warmupRuns: number;
  memoryTracking: boolean;
  gcBetweenRuns: boolean;
  timeoutMs: number;
}

/**
 * Predefined configurations for each hierarchy level
 */
export const HIERARCHY_CONFIGS: Record<string, BenchmarkConfig> = {
  junior: {
    iterations: 100,
    warmupRuns: 10,
    memoryTracking: true,
    gcBetweenRuns: false,
    timeoutMs: 5000
  },
  senior: {
    iterations: 500,
    warmupRuns: 50,
    memoryTracking: true,
    gcBetweenRuns: true,
    timeoutMs: 10000
  },
  lead: {
    iterations: 1000,
    warmupRuns: 100,
    memoryTracking: true,
    gcBetweenRuns: true,
    timeoutMs: 30000
  },
  enterprise: {
    iterations: 5000,
    warmupRuns: 500,
    memoryTracking: true,
    gcBetweenRuns: true,
    timeoutMs: 60000
  }
};

/**
 * Default complexity thresholds
 */
export const DEFAULT_THRESHOLDS: ComplexityThresholds = {
  junior: 1_000,      // 1KB
  senior: 10_000,     // 10KB
  lead: 100_000,      // 100KB
  enterprise: 100_001 // > 100KB
};

/**
 * Validate LeadSpecProfile structure
 */
export function validateLeadSpecProfile(profile: LeadSpecProfile): boolean {
  try {
    // Core metrics validation
    if (profile.core.documentSize < 0 || profile.core.parseTime < 0 || 
        profile.core.throughput < 0 || profile.core.memoryMB < 0) {
      return false;
    }

    // Markdown metrics validation
    if (profile.markdown.parseTimeMs < 0 || 
        !['junior', 'senior', 'lead', 'enterprise'].includes(profile.markdown.complexityTier) ||
        profile.markdown.compliance.gfm < 0 || profile.markdown.compliance.gfm > 100 ||
        profile.markdown.compliance.commonmark < 0 || profile.markdown.compliance.commonmark > 100) {
      return false;
    }

    // Security validation
    if (!profile.security.etag || !profile.security.integrityHash) {
      return false;
    }

    // Audit validation
    if (!profile.audit.timestamp || 
        !['junior', 'senior', 'lead', 'enterprise'].includes(profile.audit.runner)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Determine complexity tier based on document size
 */
export function determineComplexityTier(size: number, thresholds: ComplexityThresholds = DEFAULT_THRESHOLDS): LeadSpecProfile['markdown']['complexityTier'] {
  if (size < thresholds.junior) return 'junior';
  if (size < thresholds.senior) return 'senior';
  if (size < thresholds.lead) return 'lead';
  return 'enterprise';
}

/**
 * Generate cryptographic etag for content verification
 */
export function generateETag(content: string, secret: string = ''): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(content + secret);
  return hasher.digest("hex");
}

/**
 * Generate integrity hash for security
 */
export function generateIntegrityHash(content: string): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(content);
  return `sha256-${hasher.digest("base64")}`;
}
