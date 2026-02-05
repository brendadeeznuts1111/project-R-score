// packages/odds-core/src/standards/rules/stay-updated-rule.ts
import type { RuleViolation } from '../rule-enforcement.js';
import { createViolation } from './rule-helper.js';

export class StayUpdatedRule {
  name = 'Stay Updated';
  description = 'Stay updated with Bun releases and new features';

  async validate(file: string, content: string): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = [];
    
    // This rule is more about process than code, but we can check for deprecated patterns
    const deprecatedPatterns = {
      'Bun.serve({ fetch': 'Consider using newer Bun.serve() options with proper typing',
      'require(': 'Use ES6 imports for better compatibility',
      'module.exports': 'Use ES6 exports for better compatibility',
      '__dirname': 'Use import.meta.url for ES modules',
      '__filename': 'Use import.meta.url for ES modules',
      'process.cwd()': 'Consider using import.meta.dir for better ES module support'
    };

    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const [pattern, suggestion] of Object.entries(deprecatedPatterns)) {
        if (line.includes(pattern) && !line.includes('//')) {
          violations.push(createViolation(
            this.name,
            file,
            `Using potentially outdated pattern: ${pattern}`,
            'warning',
            i + 1,
            suggestion
          ));
        }
      }
    }

    // Check package.json for Bun version
    if (file.includes('package.json')) {
      const hasBunType = content.includes('"type": "module"');
      const hasModernScripts = content.includes('bun test') || content.includes('bun run');
      
      if (!hasBunType) {
        violations.push(createViolation(
          this.name,
          file,
          'Package.json missing ES module type',
          'warning',
          undefined,
          'Add "type": "module" to package.json for modern ES module support'
        ));
      }
    }

    return violations;
  }
}
