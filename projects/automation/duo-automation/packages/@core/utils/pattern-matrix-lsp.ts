/**
 * §Pattern:130 - LSP Matrix Integration with URLPattern API
 * @pattern Pattern:130
 * @perf <50ms indexing
 * @roi ∞ (IDE autocomplete + URLPattern routing)
 * @section §IDE
 */

import { PatternMatrix, type PatternRow } from './pattern-matrix';
import type { LSPPatternInfo } from '../src/types/pattern-definitions';

// URLPattern routing definitions for IDE support
interface URLPatternRoute {
  name: string;
  pattern: string;
  description: string;
  parameters: string[];
  example: string;
  category: 'analysis' | 'platform' | 'batch' | 'admin' | 'monitoring';
}

const URL_PATTERN_ROUTES: URLPatternRoute[] = [
  // Phone Analysis Routes
  {
    name: 'phoneAnalysis',
    pattern: '/api/analyze/phone/:phone',
    description: 'Analyze phone number for synthetic identity detection',
    parameters: ['phone'],
    example: '/api/analyze/phone/+15551234567',
    category: 'analysis'
  },
  {
    name: 'phoneHistory',
    pattern: '/api/analyze/phone/:phone/history',
    description: 'Get historical analysis for a phone number',
    parameters: ['phone'],
    example: '/api/analyze/phone/+15551234567/history',
    category: 'analysis'
  },
  {
    name: 'phonePatterns',
    pattern: '/api/analyze/phone/:phone/patterns',
    description: 'Get cross-platform patterns for phone number',
    parameters: ['phone'],
    example: '/api/analyze/phone/+15551234567/patterns',
    category: 'analysis'
  },
  
  // Platform Analysis Routes
  {
    name: 'platformAnalysis',
    pattern: '/api/platform/:platform/users/:userId',
    description: 'Analyze user on specific platform',
    parameters: ['platform', 'userId'],
    example: '/api/platform/cashapp/users/johnsmith',
    category: 'platform'
  },
  {
    name: 'platformValidation',
    pattern: '/api/platform/:platform/validate',
    description: 'Validate platform-specific data',
    parameters: ['platform'],
    example: '/api/platform/cashapp/validate',
    category: 'platform'
  },
  
  // Cross-Platform Routes
  {
    name: 'crossPlatformAnalysis',
    pattern: '/api/cross-platform/analyze/:phone',
    description: 'Multi-platform identity analysis',
    parameters: ['phone'],
    example: '/api/cross-platform/analyze/+15551234567',
    category: 'analysis'
  },
  {
    name: 'crossPlatformPatterns',
    pattern: '/api/cross-platform/patterns/:type?',
    description: 'Get cross-platform patterns by type',
    parameters: ['type'],
    example: '/api/cross-platform/patterns/critical',
    category: 'analysis'
  },
  
  // Batch Processing Routes
  {
    name: 'submitBatch',
    pattern: '/api/batch/submit',
    description: 'Submit new batch processing job',
    parameters: [],
    example: '/api/batch/submit',
    category: 'batch'
  },
  {
    name: 'batchStatus',
    pattern: '/api/batch/:jobId/status',
    description: 'Get batch job status',
    parameters: ['jobId'],
    example: '/api/batch/batch_12345/status',
    category: 'batch'
  },
  {
    name: 'batchResults',
    pattern: '/api/batch/:jobId/results',
    description: 'Get batch processing results',
    parameters: ['jobId'],
    example: '/api/batch/batch_12345/results',
    category: 'batch'
  },
  {
    name: 'uploadInput',
    pattern: '/api/batch/upload/:format',
    description: 'Upload file for batch processing',
    parameters: ['format'],
    example: '/api/batch/upload/csv',
    category: 'batch'
  },
  {
    name: 'downloadResults',
    pattern: '/api/batch/:jobId/download/:format',
    description: 'Download batch results in specified format',
    parameters: ['jobId', 'format'],
    example: '/api/batch/batch_12345/download/csv',
    category: 'batch'
  },
  
  // File Operations (Wildcard)
  {
    name: 'fileUpload',
    pattern: '/api/files/upload/*',
    description: 'Upload files with wildcard path support',
    parameters: ['*'],
    example: '/api/files/upload/reports/q1-2024.pdf',
    category: 'admin'
  },
  {
    name: 'reportDownload',
    pattern: '/api/reports/:type/:date/:format',
    description: 'Download reports by type, date, and format',
    parameters: ['type', 'date', 'format'],
    example: '/api/reports/fraud/2024-01-15/csv',
    category: 'admin'
  },
  
  // Dashboard & Monitoring
  {
    name: 'dashboardMetrics',
    pattern: '/api/dashboard/metrics/:timeframe?',
    description: 'Get dashboard metrics with optional timeframe',
    parameters: ['timeframe'],
    example: '/api/dashboard/metrics/24h',
    category: 'monitoring'
  },
  {
    name: 'systemHealth',
    pattern: '/api/health/:component?',
    description: 'Get system health status for component',
    parameters: ['component'],
    example: '/api/health/database',
    category: 'monitoring'
  },
  
  // Admin & Configuration
  {
    name: 'adminConfig',
    pattern: '/api/admin/config/:section/:key?',
    description: 'Get/set admin configuration',
    parameters: ['section', 'key'],
    example: '/api/admin/config/security/api_key',
    category: 'admin'
  },
  {
    name: 'adminUsers',
    pattern: '/api/admin/users/:userId/:action?',
    description: 'Manage user accounts',
    parameters: ['userId', 'action'],
    example: '/api/admin/users/john123/suspend',
    category: 'admin'
  }
];

export class PatternMatrixLSP {
  /**
   * Get pattern info for IDE hover
   */
  static getPatternInfo(id: string): string | null {
    const matrix = PatternMatrix.getInstance();
    const row = matrix.getRows().find((r: PatternRow) => r.section === id);
    if (!row) return null;
    
    return this.formatHoverInfo(row);
  }

  /**
   * Get autocomplete suggestions for pattern IDs
   */
  static getAutocompleteSuggestions(prefix: string): string[] {
    const matrix = PatternMatrix.getInstance();
    const rows = matrix.getRows();
    return rows
      .filter((r: PatternRow) => r.section.startsWith(prefix))
      .map((r: PatternRow) => r.section)
      .slice(0, 10); 
  }

  /**
   * Get URLPattern route suggestions for IDE autocomplete
   */
  static getURLPatternSuggestions(prefix: string): URLPatternRoute[] {
    return URL_PATTERN_ROUTES
      .filter(route => 
        route.name.toLowerCase().includes(prefix.toLowerCase()) ||
        route.pattern.includes(prefix) ||
        route.description.toLowerCase().includes(prefix.toLowerCase())
      )
      .slice(0, 15);
  }

  /**
   * Get URLPattern info for IDE hover
   */
  static getURLPatternInfo(patternName: string): string | null {
    const route = URL_PATTERN_ROUTES.find(r => r.name === patternName);
    if (!route) return null;
    
    return this.formatURLPatternHoverInfo(route);
  }

  /**
   * Validate URLPattern syntax for IDE diagnostics
   */
  static validateURLPattern(pattern: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      new URLPattern({ pathname: pattern });
    } catch (error: any) {
      errors.push(`Invalid URLPattern syntax: ${error.message}`);
      return { valid: false, errors };
    }
    
    // Check for common issues
    if (pattern.includes('//')) {
      errors.push('Double slashes detected - use single slashes');
    }
    
    if (pattern.startsWith('/')) {
      // Check parameter naming
      const paramMatches = pattern.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
      if (paramMatches) {
        paramMatches.forEach(param => {
          const name = param.slice(1);
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
            errors.push(`Invalid parameter name: ${name} - must start with letter or underscore`);
          }
        });
      }
    }
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * Extract parameters from URLPattern for IDE code completion
   */
  static extractPatternParameters(pattern: string): string[] {
    try {
      const urlPattern = new URLPattern({ pathname: pattern });
      // Test with a dummy URL to extract parameter structure
      const testUrl = pattern.replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, 'test');
      const result = urlPattern.exec(`https://example.com${testUrl}`);
      
      if (result) {
        return Object.keys(result.pathname.groups);
      }
    } catch (error) {
      // Fallback to regex extraction
      const matches = pattern.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
      return matches ? matches.map(m => m.slice(1)) : [];
    }
    
    return [];
  }

  /**
   * Generate TypeScript definitions for URLPattern routes
   */
  static generateURLPatternTypes(): string {
    let output = `// Auto-generated URLPattern API Types\n`;
    output += `// Generated: ${new Date().toISOString()}\n\n`;
    
    // Route interface
    output += `export interface APIRoute {\n`;
    output += `  name: string;\n`;
    output += `  pattern: string;\n`;
    output += `  description: string;\n`;
    output += `  parameters: string[];\n`;
    output += `  example: string;\n`;
    output += `  category: RouteCategory;\n`;
    output += `}\n\n`;
    
    // Route category type
    output += `export type RouteCategory = 'analysis' | 'platform' | 'batch' | 'admin' | 'monitoring';\n\n`;
    
    // Route constants
    output += `export const API_ROUTES: Record<string, APIRoute> = {\n`;
    URL_PATTERN_ROUTES.forEach(route => {
      output += `  '${route.name}': {\n`;
      output += `    name: '${route.name}',\n`;
      output += `    pattern: '${route.pattern}',\n`;
      output += `    description: '${route.description}',\n`;
      output += `    parameters: [${route.parameters.map(p => `'${p}'`).join(', ')}],\n`;
      output += `    example: '${route.example}',\n`;
      output += `    category: '${route.category}' as RouteCategory,\n`;
      output += `  },\n`;
    });
    output += `} as const;\n\n`;
    
    // URLPattern instances
    output += `export const URL_PATTERNS: Record<string, URLPattern> = {\n`;
    URL_PATTERN_ROUTES.forEach(route => {
      output += `  '${route.name}': new URLPattern({ pathname: '${route.pattern}' }),\n`;
    });
    output += `};\n\n`;
    
    // Helper functions
    output += `export function getRouteByName(name: keyof typeof API_ROUTES): APIRoute {\n`;
    output += `  return API_ROUTES[name];\n`;
    output += `}\n\n`;
    
    output += `export function getPatternByName(name: keyof typeof URL_PATTERNS): URLPattern {\n`;
    output += `  return URL_PATTERNS[name];\n`;
    output += `}\n\n`;
    
    output += `export function matchRoute(path: string): { route: APIRoute; params: Record<string, string> } | null {\n`;
    output += `  for (const [name, pattern] of Object.entries(URL_PATTERNS)) {\n`;
    output += `    const match = pattern.exec(path);\n`;
    output += `    if (match) {\n`;
    output += `      return { route: API_ROUTES[name], params: match.pathname.groups };\n`;
    output += `    }\n`;
    output += `  }\n`;
    output += `  return null;\n`;
    output += `}\n`;
    
    return output;
  }

  /**
   * Generate comprehensive TypeScript definitions file for IDE
   */
  static generatePatternTypes(): string {
    const matrix = PatternMatrix.getInstance();
    const rows = matrix.getRows();
    
    let output = `// Auto-generated by Empire Pro Pattern Matrix\n`;
    output += `// Generated: ${new Date().toISOString()}\n\n`;
    
    // Export pattern IDs as const
    output += `export const PATTERN_IDS = {\n`;
    rows.forEach((row: PatternRow) => {
      const safeName = row.name.replace(/[^a-zA-Z0-9]/g, '');
      output += `  /** ${row.name} - ${row.perf} - ROI: ${row.roi} */\n`;
      output += `  ${safeName}: '${row.section}',\n`;
    });
    output += `} as const;\n\n`;
    
    // Export pattern info map
    output += `export const PATTERN_INFO: Record<string, any> = {\n`;
    rows.forEach((row: PatternRow) => {
      output += `  '${row.section}': {\n`;
      output += `    name: '${row.name}',\n`;
      output += `    category: '${row.category}',\n`;
      output += `    perf: '${row.perf}',\n`;
      output += `    roi: '${row.roi}',\n`;
      output += `    semantics: [${row.semantics.map((s: string) => `'${s}'`).join(', ')}],\n`;
      output += `  },\n`;
    });
    output += `};\n\n`;
    
    // Add URLPattern types
    output += this.generateURLPatternTypes();
    
    return output;
  }

  private static formatHoverInfo(row: PatternRow): string {
    return `
**Empire Pro Pattern: ${row.name}**
- ID: ${row.section}
- Category: ${row.category}
- Performance: ${row.perf}
- ROI: ${row.roi}
- Semantics: ${row.semantics.join(', ')}
- Dependencies: ${row.deps?.join(', ') || 'none'}

Example:
\`\`\`typescript
// Pattern ${row.section} is registered in the Master Matrix.
// Verified: ${row.verified}
\`\`\`
    `.trim();
  }

  private static formatURLPatternHoverInfo(route: URLPatternRoute): string {
    return `
**URLPattern Route: ${route.name}**
- Pattern: \`${route.pattern}\`
- Category: ${route.category}
- Parameters: ${route.parameters.join(', ') || 'none'}
- Example: \`${route.example}\`

${route.description}

Usage:
\`\`\`typescript
const pattern = new URLPattern({ pathname: '${route.pattern}' });
const match = pattern.exec('${route.example}');
console.log(match.pathname.groups); // { ${route.parameters.map(p => `${p}: 'value'`).join(', ')} }
\`\`\`
    `.trim();
  }
}
