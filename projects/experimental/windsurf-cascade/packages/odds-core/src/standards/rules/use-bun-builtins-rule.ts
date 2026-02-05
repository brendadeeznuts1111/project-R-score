// packages/odds-core/src/standards/rules/use-bun-builtins-rule.ts
import type { RuleViolation } from '../rule-enforcement.js';
import { createViolation } from './rule-helper.js';

export class UseBunBuiltinsRule {
  name = 'Use Bun Builtins';
  description = 'Always use Bun builtin APIs instead of npm packages when available';

  private readonly bunAlternatives = {
    'from \'ws\'': 'Use Bun.serve() with websocket option',
    'from \'pg\'': 'Use Bun.SQL for PostgreSQL',
    'from \'mysql2\'': 'Use Bun.SQL for MySQL',
    'from \'ioredis\'': 'Use Bun.Redis',
    'from \'redis\'': 'Use Bun.Redis',
    'from \'js-yaml\'': 'Use Bun.YAML',
    'from \'yaml\'': 'Use Bun.YAML',
    'from \'node-zstd\'': 'Use Bun.zstdCompress/zstdDecompress',
    'from \'csurf\'': 'Use Bun.CSRF',
    'from \'cookie-parser\'': 'Use request.cookies API',
    'from \'express\'': 'Consider using Bun.serve() or Elysia',
    'require(\'ws\')': 'Use Bun.serve() with websocket option',
    'require(\'pg\')': 'Use Bun.SQL for PostgreSQL',
    'require(\'mysql2\')': 'Use Bun.SQL for MySQL',
    'require(\'redis\')': 'Use Bun.Redis'
  };

  async validate(file: string, content: string): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const [packagePattern, suggestion] of Object.entries(this.bunAlternatives)) {
        if (line.includes(packagePattern) && !line.includes('//')) {
          violations.push(createViolation(
            this.name,
            file,
            `Using npm package instead of Bun builtin: ${packagePattern}`,
            'warning',
            i + 1,
            suggestion
          ));
        }
      }
    }

    return violations;
  }

}
