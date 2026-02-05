// packages/odds-core/src/standards/rules/type-safety-rule.ts
import type { RuleViolation } from '../rule-enforcement.js';
import { createViolation } from './rule-helper.js';

export class TypeSafetyRule {
  name = 'Type Safety';
  description = 'Use TypeScript for type safety with strict typing';

  async validate(file: string, content: string): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for any type usage
      if (line.includes(': any') && !line.includes('// eslint-disable') && !line.includes('// @ts-ignore')) {
        violations.push(createViolation(
          this.name,
          file,
          'Use of "any" type reduces type safety',
          'warning',
          i + 1,
          'Replace with specific interface or type'
        ));
      }

      // Check for implicit any in function parameters
      if (line.includes('function(') && !line.includes('function(') && 
          !line.match(/function\s+\w+\([^)]*:\s*\w/) && !line.includes('//')) {
        violations.push(createViolation(
          this.name,
          file,
          'Function parameter without type annotation',
          'warning',
          i + 1,
          'Add type annotations to all function parameters'
        ));
      }

      // Check for arrow functions without types
      if (line.includes('= (') && !line.includes(': ') && 
          !line.match(/=\s*\([^)]*:\s*\w/) && !line.includes('//')) {
        violations.push(createViolation(
          this.name,
          file,
          'Arrow function parameter without type annotation',
          'warning',
          i + 1,
          'Add type annotations to arrow function parameters'
        ));
      }
    }

    return violations;
  }
}
