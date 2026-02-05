// packages/odds-core/src/standards/rules/resource-management-rule.ts
import type { RuleViolation } from '../rule-enforcement.js';
import { createViolation } from './rule-helper.js';

export class ResourceManagementRule {
  name = 'Resource Management';
  description = 'Use resource management patterns like DisposableStack';

  async validate(file: string, content: string): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = [];
    const lines = content.split('\n');

    let hasResourceCleanup = false;
    let hasDisposableStack = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('DisposableStack') || line.includes('AsyncDisposableStack')) {
        hasDisposableStack = true;
      }

      if (line.includes('[Symbol.dispose]') || line.includes('[Symbol.asyncDispose]')) {
        hasResourceCleanup = true;
      }

      // Check for file operations without cleanup
      if ((line.includes('Bun.file') || line.includes('readFile') || line.includes('writeFile') || 
           line.includes('createReadStream') || line.includes('createWriteStream')) && 
          !hasResourceCleanup && !hasDisposableStack && !line.includes('//')) {
        violations.push(createViolation(
          this.name,
          file,
          'File operation without resource cleanup',
          'warning',
          i + 1,
          'Use DisposableStack for automatic resource cleanup'
        ));
      }

      // Check for database connections without cleanup
      if ((line.includes('new SQL') || line.includes('Bun.SQL') || line.includes('Database(')) && 
          !content.includes('close') && !content.includes('dispose') && !line.includes('//')) {
        violations.push(createViolation(
          this.name,
          file,
          'Database connection without cleanup strategy',
          'warning',
          i + 1,
          'Implement connection cleanup with DisposableStack or explicit close'
        ));
      }
    }

    return violations;
  }
}
