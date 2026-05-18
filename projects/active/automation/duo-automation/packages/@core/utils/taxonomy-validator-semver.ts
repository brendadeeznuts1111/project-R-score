// utils/taxonomy-validator-semver.ts - Bun-native semver taxonomy validator with singleton pattern
import { VersionedTaxonomyValidator } from './versioned-taxonomy-validator';

/**
 * BunSemverTaxonomyValidator - Singleton wrapper around VersionedTaxonomyValidator
 * Provides backward compatibility and singleton pattern for health endpoints
 */
export class BunSemverTaxonomyValidator extends VersionedTaxonomyValidator {
  private static instance: BunSemverTaxonomyValidator;

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): BunSemverTaxonomyValidator {
    if (!BunSemverTaxonomyValidator.instance) {
      BunSemverTaxonomyValidator.instance = new BunSemverTaxonomyValidator();
    }
    return BunSemverTaxonomyValidator.instance;
  }

  /**
   * Generate comprehensive health report
   */
  public async generateReport(): Promise<{
    timestamp: string;
    healthy: boolean;
    validationResults: Array<{
      nodeId: string;
      status: 'valid' | 'error' | 'warning';
      message: string;
    }>;
    statistics: {
      totalNodes: number;
      validNodes: number;
      errorNodes: number;
      warningNodes: number;
    };
  }> {
    const timestamp = new Date().toISOString();
    const validation = await this.validateVersionConstraints();
    const nodes = this.getAllVersionedNodes();

    const validationResults = Array.from(nodes.entries()).map(([id, node]) => {
      const violation = validation.violations.find(v => v.nodeId === id);
      
      if (violation) {
        return {
          nodeId: id,
          status: 'error' as const,
          message: violation.reason
        };
      }

      // Check for additional warnings
      const warnings: string[] = [];
      if (node.dependencies && node.dependencies.length > 5) {
        warnings.push('High dependency count');
      }
      if (node.version && node.version.includes('alpha')) {
        warnings.push('Using alpha version');
      }

      if (warnings.length > 0) {
        return {
          nodeId: id,
          status: 'warning' as const,
          message: warnings.join('; ')
        };
      }

      return {
        nodeId: id,
        status: 'valid' as const,
        message: 'All checks passed'
      };
    });

    const statistics = {
      totalNodes: validationResults.length,
      validNodes: validationResults.filter(r => r.status === 'valid').length,
      errorNodes: validationResults.filter(r => r.status === 'error').length,
      warningNodes: validationResults.filter(r => r.status === 'warning').length
    };

    return {
      timestamp,
      healthy: validation.valid && statistics.errorNodes === 0,
      validationResults,
      statistics
    };
  }
}
