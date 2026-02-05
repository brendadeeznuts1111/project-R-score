// packages/odds-core/src/standards/rules/error-handling-rule.ts
import type { RuleViolation } from '../rule-enforcement.js';
import { createViolation } from './rule-helper.js';

export class ErrorHandlingRule {
  name = 'Error Handling';
  description = 'Implement proper error handling with retry logic for all external operations';

  async validate(file: string, content: string): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = [];
    const lines = content.split('\n');

    let hasTryCatch = false;
    let hasRetryLogic = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('try {')) {
        hasTryCatch = true;
      }
      
      if (line.includes('withRetry') || line.includes('retry') || line.includes('BunCodeStandards.withRetry')) {
        hasRetryLogic = true;
      }

      // Check for database operations without error handling
      if ((line.includes('await sql`') || line.includes('await db.') || (line.includes('Bun.SQL') && !line.includes("'"))) && 
          !hasTryCatch && !hasRetryLogic && !line.includes('//')) {
        violations.push(createViolation(
          this.name,
          file,
          'Database operation without error handling',
          'error',
          i + 1,
          'Wrap in try-catch or use withRetry utility'
        ));
      }

      // Check for external API calls without retry logic
      if ((line.includes('fetch(') || line.includes('await fetch')) && 
          !hasRetryLogic && !line.includes('withRetry') && !line.includes('//')) {
        violations.push(createViolation(
          this.name,
          file,
          'External API call without retry logic',
          'warning',
          i + 1,
          'Use BunCodeStandards.withRetry() for external calls'
        ));
      }
    }

    return violations;
  }
}
