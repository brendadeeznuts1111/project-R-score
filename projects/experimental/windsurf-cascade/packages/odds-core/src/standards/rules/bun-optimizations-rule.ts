// packages/odds-core/src/standards/rules/bun-optimizations-rule.ts
import type { RuleViolation } from '../rule-enforcement.js';
import { createViolation } from './rule-helper.js';

export class BunOptimizationsRule {
  name = 'Bun Optimizations';
  description = 'Follow Bun-specific optimizations like smol workers and SQL preconnection';

  async validate(file: string, content: string): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for Worker creation without smol option
      if (line.includes('new Worker') && !line.includes('smol: true') && !line.includes('//')) {
        violations.push(createViolation(
          this.name,
          file,
          'Worker created without smol optimization',
          'warning',
          i + 1,
          'Add { smol: true } to Worker constructor for memory efficiency'
        ));
      }

      // Check for SQL usage without preconnection
      if ((line.includes('new SQL') || line.includes('Bun.SQL')) && 
          file.includes('server') && !content.includes('--sql-preconnect') && !line.includes('//')) {
        violations.push(createViolation(
          this.name,
          file,
          'SQL usage without preconnection optimization',
          'warning',
          i + 1,
          'Use --sql-preconnect flag or preload script for faster database access'
        ));
      }

      // Check for missing --smol flag in scripts
      if (file.includes('package.json') && 
          (line.includes('bun run') || line.includes('bun test')) && 
          !line.includes('--smol') && !line.includes('--hot') && !line.includes('//')) {
        violations.push(createViolation(
          this.name,
          file,
          'Bun script without optimization flags',
          'warning',
          i + 1,
          'Consider adding --smol for memory efficiency or --hot for development'
        ));
      }
    }

    return violations;
  }
}
