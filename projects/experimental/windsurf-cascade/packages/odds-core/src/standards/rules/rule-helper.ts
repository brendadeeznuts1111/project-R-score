// packages/odds-core/src/standards/rules/rule-helper.ts
import type { RuleViolation } from '../rule-enforcement.js';

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
}

export function createViolation(
  rule: string,
  file: string,
  message: string,
  severity: 'error' | 'warning' = 'error',
  line?: number,
  suggestion?: string
): RuleViolation {
  return {
    rule,
    file,
    line,
    message,
    severity,
    suggestion: suggestion || getDefaultSuggestion(rule)
  };
}

function getDefaultSuggestion(rule: string): string {
  const suggestions: Record<string, string> = {
    'Use Bun Builtins': 'Replace with Bun builtin API',
    'Track API Usage': 'Wrap with apiTracker.track()',
    'Error Handling': 'Implement try-catch with retry logic',
    'Type Safety': 'Add proper TypeScript types',
    'Memory Monitoring': 'Add memory usage tracking',
    'Performance Testing': 'Add performance boundaries',
    'Resource Management': 'Use DisposableStack for cleanup',
    'Bun Optimizations': 'Apply Bun-specific optimizations',
    'Logging & Monitoring': 'Add comprehensive logging',
    'Stay Updated': 'Update to latest Bun version',
    'Environment Variables': 'Use environment variables with validation'
  };

  return suggestions[rule] || 'Follow the golden rule guidelines';
}
