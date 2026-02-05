// packages/odds-core/src/standards/rules/memory-monitoring-rule.ts
import type { RuleViolation } from '../rule-enforcement.js';
import { createViolation } from './rule-helper.js';

export class MemoryMonitoringRule {
  name = 'Memory Monitoring';
  description = 'Monitor memory usage in long-running processes';

  async validate(file: string, content: string): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = [];
    
    // Check if this is a long-running process file
    const isLongRunning = file.includes('server') || 
                         file.includes('worker') || 
                         file.includes('processor') ||
                         file.includes('service') ||
                         file.includes('daemon');

    if (isLongRunning && !content.includes('memoryUsage') && 
        !content.includes('Bun.memoryUsage') && !content.includes('process.memoryUsage')) {
      violations.push(createViolation(
        this.name,
        file,
        'Long-running process without memory monitoring',
        'warning',
        undefined,
        'Add periodic memory usage monitoring with Bun.memoryUsage()'
      ));
    }

    return violations;
  }
}
