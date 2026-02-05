// packages/odds-core/src/standards/rules/performance-testing-rule.ts
import type { RuleViolation } from '../rule-enforcement.js';
import { createViolation } from './rule-helper.js';

export class PerformanceTestingRule {
  name = 'Performance Testing';
  description = 'Test performance boundaries for critical operations';

  async validate(file: string, content: string): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = [];
    
    // Check for performance-critical files
    const isPerformanceCritical = file.includes('websocket') || 
                                 file.includes('arbitrage') || 
                                 file.includes('sharp-detection') ||
                                 file.includes('processor') ||
                                 file.includes('market') ||
                                 file.includes('trading');

    if (isPerformanceCritical) {
      const hasPerformanceTest = content.includes('performance.now') || 
                                content.includes('PerformanceMonitor') ||
                                content.includes('assertPerformance') ||
                                content.includes('expect().toBeLessThan') ||
                                content.includes('benchmark');

      if (!hasPerformanceTest) {
        violations.push(createViolation(
          this.name,
          file,
          'Performance-critical code without performance testing',
          'warning',
          undefined,
          'Add performance boundaries with BunCodeStandards.createTestContext()'
        ));
      }
    }

    return violations;
  }
}
