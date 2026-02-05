#!/usr/bin/env bun
/**
 * 🤖 Automated Documentation Generator for Fire22 Error System
 * Generates comprehensive documentation directly from error-codes.json
 * Ensures consistency and reduces manual maintenance
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ErrorCode {
  code: string;
  name: string;
  message: string;
  severity: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';
  category: string;
  httpStatusCode: number;
  description: string;
  causes: string[];
  solutions: string[];
  documentation: Array<{
    title: string;
    url: string;
    type: 'guide' | 'reference' | 'troubleshooting' | 'specification';
  }>;
  relatedCodes: string[];
  tags: string[];
  introduced: string;
  deprecated: boolean;
}

interface ErrorRegistry {
  errorCategories: Record<
    string,
    {
      prefix: string;
      name: string;
      description: string;
      range: string;
      severity: string;
      color: string;
    }
  >;
  errorCodes: Record<string, ErrorCode>;
  metadata: {
    totalErrorCodes: number;
    categoryCounts: Record<string, number>;
    severityCounts: Record<string, number>;
    httpStatusCodes: number[];
    tags: string[];
  };
}

class AutomatedDocGenerator {
  private registry: ErrorRegistry;
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
    this.loadRegistry();
  }

  private loadRegistry(): void {
    const registryPath = join(this.projectRoot, 'docs', 'error-codes.json');

    if (!existsSync(registryPath)) {
      throw new Error(`Error registry not found at: ${registryPath}`);
    }

    try {
      const content = readFileSync(registryPath, 'utf-8');
      this.registry = JSON.parse(content);
      console.log(
        `✅ Loaded error registry with ${this.registry.metadata.totalErrorCodes} error codes`
      );
    } catch (error) {
      throw new Error(`Failed to parse error registry: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive markdown documentation
   */
  generateMarkdownDocumentation(): string {
    const { errorCategories, errorCodes, metadata } = this.registry;

    let markdown = `# Fire22 Dashboard - Automated Error Code Documentation

*🤖 This documentation is automatically generated from \`docs/error-codes.json\`*  
*Last Generated: ${new Date().toISOString()}*  
*Total Error Codes: ${metadata.totalErrorCodes}*

## 📊 Error System Overview

### Error Categories (${Object.keys(errorCategories).length} total)

| Category | Prefix | Range | Severity | Description |
|----------|--------|-------|----------|-------------|
`;

    // Generate category table
    Object.entries(errorCategories).forEach(([key, category]) => {
      markdown += `| ${category.name} | ${category.prefix}xxx | ${category.range} | ${category.severity} | ${category.description} |\n`;
    });

    markdown += `\n### Error Distribution

- **Critical**: ${metadata.severityCounts.CRITICAL || 0} errors
- **Error**: ${metadata.severityCounts.ERROR || 0} errors  
- **Warning**: ${metadata.severityCounts.WARNING || 0} errors
- **Info**: ${metadata.severityCounts.INFO || 0} errors

### HTTP Status Codes Used
${metadata.httpStatusCodes.sort((a, b) => a - b).join(', ')}

### Common Tags
${metadata.tags.sort().join(', ')}

---

## 📚 Complete Error Code Reference

`;

    // Generate detailed error documentation by category
    Object.entries(errorCategories).forEach(([categoryKey, category]) => {
      const categoryErrors = Object.values(errorCodes).filter(
        error => error.category === categoryKey
      );

      if (categoryErrors.length === 0) return;

      markdown += `### ${category.name} (${category.prefix}xxx - ${category.range})

${category.description}

`;

      categoryErrors.forEach(error => {
        markdown += `#### ${error.code} - ${error.name}

**Message**: ${error.message}  
**Severity**: ${error.severity}  
**HTTP Status**: ${error.httpStatusCode}  
**Introduced**: v${error.introduced}

**Description**:  
${error.description}

**Common Causes**:
${error.causes.map(cause => `- ${cause}`).join('\n')}

**Solutions**:
${error.solutions.map(solution => `- ${solution}`).join('\n')}

**Documentation Links**:
${error.documentation.map(doc => `- [${doc.title}](${doc.url}) (${doc.type})`).join('\n')}

**Related Error Codes**: ${error.relatedCodes.join(', ') || 'None'}  
**Tags**: ${error.tags.join(', ')}

---

`;
      });
    });

    // Generate usage examples
    markdown += `## 🔧 Implementation Examples

### Using Error Codes in Application Code

\`\`\`typescript
import { ERROR_MESSAGES } from '../constants';
import { errorTracker } from '../scripts/error-system/error-tracker';

// Example: Database connection error
try {
  await databaseService.connect();
} catch (error) {
  const errorDetails = ERROR_MESSAGES.DATABASE.CONNECTION_FAILED;
  
  // Track occurrence
  errorTracker.trackError(errorDetails.code);
  
  // Log with structured data
  logger.error('Database connection failed', {
    errorCode: errorDetails.code,
    documentation: errorDetails.docs,
    error: error.message,
    timestamp: new Date().toISOString(),
    severity: 'CRITICAL'
  });
  
  // Throw with error code
  throw new Error(\`[\${errorDetails.code}] \${errorDetails.message}\`);
}
\`\`\`

### API Error Response Format

\`\`\`json
{
  "success": false,
  "error": {
    "code": "E3001",
    "message": "Unauthorized API request",
    "severity": "WARNING",
    "category": "API",
    "httpStatusCode": 401,
    "documentation": "/docs/api/authentication",
    "solutions": [
      "Provide valid API key or token",
      "Check authentication header format", 
      "Verify token expiration"
    ],
    "timestamp": "2025-01-28T10:30:00Z"
  }
}
\`\`\`

### Monitoring & Alerting Integration

\`\`\`typescript
// Configure alerts based on error codes
const alertRules = [
  {
    errorCode: 'E2001',
    name: 'Database Connection Critical',
    threshold: 5,
    timeWindow: '5m',
    severity: 'CRITICAL',
    actions: ['page-oncall', 'slack-alert'],
    documentation: '/docs/database/setup'
  },
  {
    errorCode: 'E3002',
    name: 'API Rate Limit Warning', 
    threshold: 100,
    timeWindow: '1m',
    severity: 'WARNING',
    actions: ['slack-notification'],
    documentation: '/docs/api/rate-limits'
  }
];
\`\`\`

## 🎯 Quick Reference Commands

### Generate Documentation
\`\`\`bash
# Regenerate this documentation
bun run scripts/error-system/automated-doc-generator.ts

# Validate error code registry
bun run scripts/error-system/doc-validator.ts

# Check documentation link health
bun run scripts/error-system/link-health-checker.ts
\`\`\`

### Debug Specific Error
\`\`\`bash
# Get detailed error information
bun run scripts/error-system/error-debug-cli.ts E2001

# View error occurrence statistics
bun run scripts/error-system/error-analytics.ts --code E2001 --timerange 24h
\`\`\`

### Error System Health
\`\`\`bash
# Check error system status
curl http://localhost:3001/api/system/error-health

# Get error occurrence report
curl http://localhost:3001/api/system/error-report

# View real-time error dashboard
curl http://localhost:3001/dashboard/errors
\`\`\`

---

## 🔄 Maintenance

This documentation is automatically generated from \`docs/error-codes.json\`.  

**To add new error codes**:
1. Add entry to \`docs/error-codes.json\`
2. Run \`bun run scripts/error-system/automated-doc-generator.ts\`
3. Update \`src/constants/index.ts\` if needed
4. Run validation: \`bun run scripts/error-system/doc-validator.ts\`

**To modify existing errors**:
1. Edit \`docs/error-codes.json\` 
2. Regenerate documentation
3. Update any related code references
4. Test with \`bun run scripts/error-system/error-debug-cli.ts [CODE]\`

---

*Generated by Fire22 Automated Documentation System v1.0.0*  
*Registry Version: ${this.registry.version || '1.0.0'}*  
*Generation Time: ${new Date().toLocaleString()}*
`;

    return markdown;
  }

  /**
   * Generate TypeScript type definitions
   */
  generateTypeDefinitions(): string {
    const { errorCategories, errorCodes } = this.registry;

    let types = `/**
 * 🤖 Auto-generated TypeScript definitions for Fire22 Error System
 * Generated from docs/error-codes.json
 * Last Updated: ${new Date().toISOString()}
 */

// Error Categories
export type ErrorCategory = ${Object.keys(errorCategories)
      .map(cat => `'${cat}'`)
      .join(' | ')};

// Error Codes  
export type ErrorCode = ${Object.keys(errorCodes)
      .map(code => `'${code}'`)
      .join(' | ')};

// Error Severities
export type ErrorSeverity = 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';

// HTTP Status Codes used
export type ErrorHttpStatusCode = ${this.registry.metadata.httpStatusCodes.join(' | ')};

// Error Code Details Interface
export interface ErrorCodeDetails {
  code: ErrorCode;
  name: string;
  message: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  httpStatusCode: ErrorHttpStatusCode;
  description: string;
  causes: string[];
  solutions: string[];
  documentation: Array<{
    title: string;
    url: string;
    type: 'guide' | 'reference' | 'troubleshooting' | 'specification';
  }>;
  relatedCodes: ErrorCode[];
  tags: string[];
  introduced: string;
  deprecated: boolean;
}

// Category Details Interface
export interface ErrorCategoryDetails {
  prefix: string;
  name: string;
  description: string;
  range: string;
  severity: string;
  color: string;
}

// Complete Error Registry Interface
export interface ErrorRegistry {
  errorCategories: Record<ErrorCategory, ErrorCategoryDetails>;
  errorCodes: Record<ErrorCode, ErrorCodeDetails>;
  metadata: {
    totalErrorCodes: number;
    categoryCounts: Record<ErrorCategory, number>;
    severityCounts: Record<ErrorSeverity, number>;
    httpStatusCodes: ErrorHttpStatusCode[];
    tags: string[];
  };
}

// Error Response Interface for APIs
export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    severity: ErrorSeverity;
    category: ErrorCategory;
    httpStatusCode: ErrorHttpStatusCode;
    documentation?: string;
    solutions?: string[];
    timestamp: string;
    requestId?: string;
    context?: Record<string, unknown>;
  };
}

// Error Tracking Interface
export interface ErrorOccurrence {
  code: ErrorCode;
  timestamp: Date;
  context?: Record<string, unknown>;
  resolved?: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

// Alert Rule Interface
export interface ErrorAlertRule {
  errorCode: ErrorCode;
  name: string;
  threshold: number;
  timeWindow: string;
  severity: ErrorSeverity;
  actions: string[];
  documentation: string;
  enabled: boolean;
}
`;

    return types;
  }

  /**
   * Generate constants file
   */
  generateConstants(): string {
    const { errorCodes } = this.registry;

    let constants = `/**
 * 🤖 Auto-generated Error Constants for Fire22 Dashboard
 * Generated from docs/error-codes.json  
 * Last Updated: ${new Date().toISOString()}
 */

export const ERROR_CODE_REGISTRY = {
`;

    Object.entries(errorCodes).forEach(([code, details]) => {
      constants += `  ${code}: {
    code: '${code}',
    name: '${details.name}',
    message: '${details.message}',
    severity: '${details.severity}',
    category: '${details.category}',
    httpStatusCode: ${details.httpStatusCode},
    documentation: '${details.documentation[0]?.url || '/docs'}',
    solutions: ${JSON.stringify(details.solutions, null, 6)},
    tags: ${JSON.stringify(details.tags)}
  },
`;
    });

    constants += `} as const;

// HTTP Status Code Mapping
export const ERROR_HTTP_CODES = {
`;

    const httpCodeMap = new Map<number, string[]>();
    Object.values(errorCodes).forEach(error => {
      if (!httpCodeMap.has(error.httpStatusCode)) {
        httpCodeMap.set(error.httpStatusCode, []);
      }
      httpCodeMap.get(error.httpStatusCode)!.push(error.code);
    });

    httpCodeMap.forEach((codes, httpCode) => {
      constants += `  ${httpCode}: [${codes.map(c => `'${c}'`).join(', ')}],\n`;
    });

    constants += `} as const;
`;

    return constants;
  }

  /**
   * Run the documentation generation
   */
  async generate(): Promise<void> {
    console.log('🤖 Starting automated documentation generation...\n');

    try {
      // Generate markdown documentation
      console.log('📝 Generating markdown documentation...');
      const markdown = this.generateMarkdownDocumentation();
      const markdownPath = join(this.projectRoot, 'docs', 'error-codes-auto.md');
      writeFileSync(markdownPath, markdown, 'utf-8');
      console.log(`✅ Generated: ${markdownPath}`);

      // Generate TypeScript types
      console.log('🔧 Generating TypeScript definitions...');
      const types = this.generateTypeDefinitions();
      const typesPath = join(this.projectRoot, 'src', 'types', 'error-system.ts');
      writeFileSync(typesPath, types, 'utf-8');
      console.log(`✅ Generated: ${typesPath}`);

      // Generate constants
      console.log('📋 Generating constants...');
      const constants = this.generateConstants();
      const constantsPath = join(this.projectRoot, 'src', 'constants', 'error-registry.ts');
      writeFileSync(constantsPath, constants, 'utf-8');
      console.log(`✅ Generated: ${constantsPath}`);

      console.log('\n🎉 Documentation generation completed successfully!');
      console.log('\n📊 Generation Summary:');
      console.log(`   • Error Codes: ${this.registry.metadata.totalErrorCodes}`);
      console.log(`   • Categories: ${Object.keys(this.registry.errorCategories).length}`);
      console.log(`   • Generated Files: 3`);
      console.log(`   • Generated At: ${new Date().toLocaleString()}`);
    } catch (error) {
      console.error('❌ Documentation generation failed:', error);
      throw error;
    }
  }
}

// CLI execution
if (import.meta.main) {
  const generator = new AutomatedDocGenerator();

  try {
    await generator.generate();
  } catch (error) {
    console.error('❌ Generation failed:', error.message);
    process.exit(1);
  }
}
