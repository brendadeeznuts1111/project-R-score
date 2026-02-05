// packages/odds-core/src/standards/rule-helper.ts
import { RuleViolation } from './rule-enforcement.js';

export class RuleComplianceHelper {
  /**
   * Generate code snippets that follow golden rules
   */
  static generateCompliantCode(rule: string, context: any): string {
    const generators: Record<string, (ctx: any) => string> = {
      'Use Bun Builtins': (ctx) => this.generateBunBuiltinCode(ctx),
      'Track API Usage': (ctx) => this.generateTrackedAPICode(ctx),
      'Error Handling': (ctx) => this.generateErrorHandlingCode(ctx),
      'Resource Management': (ctx) => this.generateResourceManagementCode(ctx)
    };

    return generators[rule]?.(context) || '// No template available for this rule';
  }

  private static generateBunBuiltinCode(context: any): string {
    if (context.package === 'ws') {
      return `// ✅ Using Bun builtin WebSocket server
import { serve } from 'bun';

const server = serve({
  port: 3000,
  websocket: {
    message(ws, message) {
      // Handle WebSocket messages
      ws.send('Response');
    }
  },
  fetch(req, server) {
    if (server.upgrade(req)) return;
    return new Response('Hello World');
  }
});`;
    }

    if (context.package === 'pg' || context.package === 'mysql2') {
      return `// ✅ Using Bun builtin SQL
import { sql } from 'bun';

const results = await sql\`
  SELECT * FROM users 
  WHERE age > \${context.minAge}
\`;

// For multiple databases
const postgres = new SQL('postgres://localhost/mydb');
const mysql = new SQL('mysql://localhost/mydb');`;
    }

    return '// Replace with appropriate Bun builtin API';
  }

  private static generateTrackedAPICode(context: any): string {
    return `// ✅ Tracking Bun API usage
import { apiTracker } from '../monitoring/api-tracker.js';

const result = await apiTracker.track(
  '${context.api || 'Bun.API'}',
  () => ${context.operation || 'yourOperation()'},
  ${context.metadata ? JSON.stringify(context.metadata) : '{}'}
);`;
  }

  private static generateErrorHandlingCode(context: any): string {
    return `// ✅ Proper error handling with retry logic
import { BunCodeStandards } from '../standards/bun-code-standards.js';

const result = await BunCodeStandards.withRetry(
  () => ${context.operation || 'yourExternalCall()'},
  {
    maxRetries: 3,
    delayMs: 100,
    backoffMultiplier: 2,
    shouldRetry: (error) => !error.message.includes('PERMANENT_FAILURE')
  }
);

if (result.isSuccess()) {
  return result.data;
} else {
  console.error('Operation failed:', result.error);
  throw result.error;
}`;
  }

  private static generateResourceManagementCode(context: any): string {
    return `// ✅ Resource management with DisposableStack
await using stack = new AsyncDisposableStack();

const resource1 = stack.use(acquireResource1());
const resource2 = stack.use(acquireResource2());

// Use resources...
const result = await processWithResources(resource1, resource2);

// Resources automatically disposed when block exits
return result;`;
  }

  /**
   * Quick fix suggestions for common violations
   */
  static getQuickFixes(violation: RuleViolation): string[] {
    const fixes: Record<string, string[]> = {
      'Use Bun Builtins': [
        'Replace npm package import with Bun builtin',
        'Update package.json to remove unnecessary dependency',
        'Run: bun remove <package-name>'
      ],
      'Track API Usage': [
        'Import apiTracker from ../monitoring/api-tracker',
        'Wrap API call with apiTracker.track()',
        'Add appropriate metadata for monitoring'
      ],
      'Error Handling': [
        'Wrap operation in try-catch block',
        'Use BunCodeStandards.withRetry() for external calls',
        'Implement proper error logging'
      ],
      'Type Safety': [
        'Replace "any" with specific type or interface',
        'Add type annotations to function parameters',
        'Create proper TypeScript interfaces'
      ]
    };

    return fixes[violation.rule] || ['Review the golden rule guidelines'];
  }

  /**
   * Get compliance score for a file
   */
  static getComplianceScore(violations: RuleViolation[]): number {
    if (violations.length === 0) return 100;
    
    const errorWeight = 10;
    const warningWeight = 5;
    
    const deduction = violations.reduce((total, violation) => {
      return total + (violation.severity === 'error' ? errorWeight : warningWeight);
    }, 0);
    
    return Math.max(0, 100 - deduction);
  }

  /**
   * Generate improvement suggestions
   */
  static generateImprovementSuggestions(violations: RuleViolation[]): string[] {
    const suggestions: string[] = [];
    const ruleCounts = violations.reduce((counts, violation) => {
      counts[violation.rule] = (counts[violation.rule] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    for (const [rule, count] of Object.entries(ruleCounts)) {
      if (count > 2) {
        suggestions.push(`Focus on ${rule}: ${count} violations found`);
      }
    }

    const errors = violations.filter(v => v.severity === 'error').length;
    if (errors > 0) {
      suggestions.push(`Address ${errors} error-level violations immediately`);
    }

    return suggestions;
  }
}
