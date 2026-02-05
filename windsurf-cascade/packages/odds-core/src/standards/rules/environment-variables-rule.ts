import { RuleViolation } from '../rule-enforcement.js';

export class EnvironmentVariablesRule {
  name = 'Environment Variables';
  description = 'Use environment variables for configuration with proper validation';

  async validate(file: string, content: string): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = [];
    const lines = content.split('\n');

    // Check for hardcoded configuration values
    const hardcodedPatterns = [
      /localhost:\d+/,
      /127\.0\.0\.1:\d+/,
      /password\s*=\s*['"][^'"]+['"]/,
      /api[_-]?key\s*=\s*['"][^'"]+['"]/,
      /secret[_-]?key\s*=\s*['"][^'"]+['"]/
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip comments and imports
      if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('import')) {
        continue;
      }

      for (const pattern of hardcodedPatterns) {
        if (pattern.test(line) && !line.includes('process.env')) {
          violations.push({
            rule: this.name,
            file,
            line: i + 1,
            message: 'Hardcoded configuration value detected',
            severity: 'warning',
            suggestion: 'Move to environment variable using process.env.VARIABLE_NAME'
          });
        }
      }

      // Check for process.env usage without validation
      if (line.includes('process.env.') && !line.includes('?.') && !content.includes('zod')) {
        violations.push({
          rule: this.name,
          file,
          line: i + 1,
          message: 'Environment variable used without validation',
          severity: 'warning',
          suggestion: 'Add validation using zod or environment variable schema'
        });
      }
    }

    return violations;
  }
}