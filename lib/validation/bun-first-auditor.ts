// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/file-io — Bun.write
// @see https://bun.com/docs/runtime/http/server — Bun.serve
// @see https://bun.com/docs/guides/http/fetch — Bun.fetch
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/utils#bun-main — Bun.main
// lib/validation/bun-first-auditor.ts — Bun-first policy and compliance auditor

if (import.meta.main) {
  main().catch(console.error);
} else {
  console.info('ℹ️  Bun-First Auditor imported, not executed directly');
}

import { write } from 'bun';

// ============================================================================
// BUN-FIRST POLICY DEFINITIONS
// ============================================================================

const BUN_FIRST_POLICY = {
  // File System Operations
  fileSystem: {
    bun: ['Bun.file()', 'Bun.write()', 'Bun.read()', 'await Bun.file().exists()'],
    node: ['fs.readFileSync', 'fs.writeFileSync', 'fs.existsSync', 'require("fs")'],
    priority: 'CRITICAL',
  },

  // HTTP Operations
  http: {
    bun: ['Bun.serve()', 'Bun.fetch()', 'fetch()', 'Response', 'Request'],
    node: ['http.createServer', 'https.createServer', 'require("http")'],
    priority: 'CRITICAL',
  },

  // Process Operations
  process: {
    bun: ['Bun.spawn()', 'Bun.spawnSync()', 'Bun.which()'],
    node: ['child_process.spawn', 'child_process.execSync', 'require("child_process")'],
    priority: 'HIGH',
  },

  // Path Operations
  path: {
    bun: ['import.meta.path', 'import.meta.dir', 'Bun.main'],
    node: ['path.join', 'path.resolve', 'require("path")'],
    priority: 'MEDIUM',
  },

  // Environment Variables
  env: {
    bun: ['process.env', 'import.meta.env'],
    node: ['process.env'],
    priority: 'LOW',
  },
};

// Node.js APIs that should be replaced with Bun equivalents
const NODE_API_VIOLATIONS = [
  'require("fs")',
  'require("http")',
  'require("https")',
  'require("child_process")',
  'require("path")',
  'fs.readFileSync',
  'fs.writeFileSync',
  'fs.existsSync',
  'http.createServer',
  'https.createServer',
  'child_process.spawn',
  'child_process.execSync',
  'path.join',
  'path.resolve',
];

// Bun-first best practices
const BUN_BEST_PRACTICES = [
  'Bun.file()',
  'Bun.write()',
  'Bun.serve()',
  'Bun.fetch()',
  'Bun.spawn()',
  'import.meta.path',
  'import.meta.dir',
  'import.meta.main',
];

class BunFirstAuditor {
  private static violations: Array<{
    file: string;
    line: number;
    violation: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    suggestion: string;
  }> = [];

  /**
   * Audit @[lib] directory for Bun-first compliance
   */
  static async auditLibDirectory(): Promise<{
    totalFiles: number;
    violations: number;
    compliance: number;
    bySeverity: Record<string, number>;
  }> {
    console.info('🦌 AUDITING @[lib] DIRECTORY FOR BUN-FIRST COMPLIANCE...');

    const libFiles = [
      'performance-optimizer.ts',
      'optimized-server.ts',
      'port-management-system.ts',
      'bun-implementation-details.ts',
      'response-buffering-tests.ts',
      'bun-write-tests.ts',
      'url-pattern-fixer.ts',
      'url-discovery-validator.ts',
      'docs-reference.ts',
      'core-documentation.ts',
      'hardened-fetch.ts',
      'rsc-enhanced.ts',
      'memory-pool.ts',
      'http2-multiplexer.ts',
    ];

    let totalFiles = 0;

    for (const fileName of libFiles) {
      const filePath = `./lib/${fileName}`;

      try {
        const fileExists = await Bun.file(filePath).exists();
        if (!fileExists) continue;

        const content = await Bun.file(filePath).text();
        const lines = content.split('\n');

        totalFiles++;
        console.info(`   📁 Auditing ${fileName}...`);

        // Check for Node.js API violations
        lines.forEach((line, index) => {
          this.checkLineForViolations(line, fileName, index + 1);
        });
      } catch (error) {
        console.info(`   ⚠️  Could not audit ${fileName}: ${error.message}`);
      }
    }

    const bySeverity = this.violations.reduce(
      (acc, v) => {
        acc[v.severity] = (acc[v.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const compliance =
      totalFiles > 0 ? ((totalFiles - this.violations.length) / totalFiles) * 100 : 100;

    console.info(`   📊 Results: ${totalFiles} files, ${this.violations.length} violations`);
    console.info(`   ✅ Compliance: ${compliance.toFixed(1)}%`);

    return { totalFiles, violations: this.violations.length, compliance, bySeverity };
  }

  /**
   * Check individual line for violations
   */
  private static checkLineForViolations(line: string, fileName: string, lineNumber: number): void {
    const trimmedLine = line.trim();

    // Check for Node.js require statements
    if (trimmedLine.includes('require(')) {
      const match = trimmedLine.match(/require\(["']([^"']+)["']\)/);
      if (match) {
        const module = match[1];
        if (
          module.startsWith('fs') ||
          module.startsWith('http') ||
          module.startsWith('child_process') ||
          module.startsWith('path')
        ) {
          this.addViolation(
            fileName,
            lineNumber,
            `require("${module}")`,
            'CRITICAL',
            this.getBunAlternative(module)
          );
        }
      }
    }

    // Check for Node.js API usage
    NODE_API_VIOLATIONS.forEach(violation => {
      if (trimmedLine.includes(violation)) {
        const severity = this.getViolationSeverity(violation);
        this.addViolation(
          fileName,
          lineNumber,
          violation,
          severity,
          this.getBunAlternative(violation)
        );
      }
    });

    // Check for missing Bun optimizations
    if (trimmedLine.includes('fetch(') && !trimmedLine.includes('Bun.fetch')) {
      this.addViolation(
        fileName,
        lineNumber,
        'Generic fetch()',
        'MEDIUM',
        'Use Bun.fetch() for better performance'
      );
    }
  }

  /**
   * Add violation to the list
   */
  private static addViolation(
    file: string,
    line: number,
    violation: string,
    severity: string,
    suggestion: string
  ): void {
    this.violations.push({
      file,
      line,
      violation,
      severity: severity as any,
      suggestion,
    });
  }

  /**
   * Get violation severity
   */
  private static getViolationSeverity(violation: string): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    if (violation.includes('fs.') || violation.includes('require("fs")')) return 'CRITICAL';
    if (violation.includes('http.') || violation.includes('require("http")')) return 'CRITICAL';
    if (violation.includes('child_process.') || violation.includes('require("child_process")'))
      return 'HIGH';
    if (violation.includes('path.') || violation.includes('require("path")')) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Get Bun alternative for Node.js API
   */
  private static getBunAlternative(nodeApi: string): string {
    const alternatives: Record<string, string> = {
      'require("fs")': 'Use Bun.file() and Bun.write()',
      'fs.readFileSync': 'Use await Bun.file().text()',
      'fs.writeFileSync': 'Use await Bun.write()',
      'fs.existsSync': 'Use await Bun.file().exists()',
      'require("http")': 'Use Bun.serve()',
      'http.createServer': 'Use Bun.serve()',
      'require("https")': 'Use Bun.serve() with HTTPS',
      'https.createServer': 'Use Bun.serve() with HTTPS',
      'require("child_process")': 'Use Bun.spawn()',
      'child_process.spawn': 'Use Bun.spawn()',
      'child_process.execSync': 'Use Bun.spawnSync()',
      'require("path")': 'Use import.meta.path and import.meta.dir',
      'path.join': 'Use template literals with import.meta.path',
      'path.resolve': 'Use new URL() with import.meta.path',
      'Generic fetch()': 'Use Bun.fetch() for better performance',
    };

    return alternatives[nodeApi] || 'Use Bun equivalent API';
  }

  /**
   * Generate Bun-first compliance report
   */
  static generateReport(auditResults: any): void {
    console.info('\n🦌 BUN-FIRST COMPLIANCE REPORT');
    console.info('='.repeat(60));

    console.info('\n📊 AUDIT SUMMARY:');
    console.info(`   Files Audited: ${auditResults.totalFiles}`);
    console.info(`   Violations Found: ${auditResults.violations}`);
    console.info(`   Compliance Rate: ${auditResults.compliance.toFixed(1)}%`);

    console.info('\n🚨 VIOLATIONS BY SEVERITY:');
    Object.entries(auditResults.bySeverity).forEach(([severity, count]) => {
      const icon =
        severity === 'CRITICAL'
          ? '🔴'
          : severity === 'HIGH'
            ? '🟡'
            : severity === 'MEDIUM'
              ? '🟠'
              : '🔵';
      console.info(`   ${icon} ${severity}: ${count}`);
    });

    if (this.violations.length > 0) {
      console.info('\n📋 DETAILED VIOLATIONS:');

      const criticalViolations = this.violations.filter(v => v.severity === 'CRITICAL');
      const highViolations = this.violations.filter(v => v.severity === 'HIGH');
      const mediumViolations = this.violations.filter(v => v.severity === 'MEDIUM');
      const lowViolations = this.violations.filter(v => v.severity === 'LOW');

      if (criticalViolations.length > 0) {
        console.info('\n   🔴 CRITICAL VIOLATIONS:');
        criticalViolations.forEach(v => {
          console.info(`      ${v.file}:${v.line} - ${v.violation}`);
          console.info(`         💡 ${v.suggestion}`);
        });
      }

      if (highViolations.length > 0) {
        console.info('\n   🟡 HIGH VIOLATIONS:');
        highViolations.forEach(v => {
          console.info(`      ${v.file}:${v.line} - ${v.violation}`);
          console.info(`         💡 ${v.suggestion}`);
        });
      }
    }

    console.info('\n🦌 BUN-FIRST BEST PRACTICES:');
    console.info('   ✅ Use Bun.file() instead of fs APIs');
    console.info('   ✅ Use Bun.serve() instead of http.createServer');
    console.info('   ✅ Use Bun.spawn() instead of child_process');
    console.info('   ✅ Use import.meta.path instead of path.join');
    console.info('   ✅ Use Bun.fetch() for better HTTP performance');
    console.info('   ✅ Use await Bun.write() for file operations');
    console.info('   ✅ Use import.meta.main for entry detection');

    console.info('\n💡 RECOMMENDATIONS:');
    if (auditResults.compliance < 80) {
      console.info('   🚨 URGENT: Low compliance rate! Fix violations immediately.');
    } else if (auditResults.compliance < 95) {
      console.info('   ⚠️  IMPROVEMENT NEEDED: Address violations for better performance.');
    } else {
      console.info('   ✅ GOOD: High compliance rate! Continue following Bun-first principles.');
    }

    console.info('   📚 Add Bun-first validation to CI/CD pipeline');
    console.info('   🔧 Create Bun API migration guide for team');
    console.info('   📊 Monitor compliance regularly');

    console.info('\n' + '='.repeat(60));
    console.info('🦌 BUN-FIRST AUDIT COMPLETE!');
  }

  /**
   * Create Bun-first migration guide
   */
  static createMigrationGuide(): void {
    console.info('\n📚 CREATING BUN-FIRST MIGRATION GUIDE...');

    const guide = `# 🦌 Bun-First Migration Guide

## 🎯 Policy: Always Use Bun First

### 🚨 Critical Replacements

| Node.js API | Bun Equivalent | Why |
|-------------|---------------|-----|
| \`require("fs")\` | \`Bun.file()\`, \`Bun.write()\` | 3x faster, built-in |
| \`fs.readFileSync()\` | \`await Bun.file().text()\` | Async, non-blocking |
| \`fs.writeFileSync()\` | \`await Bun.write()\` | 2x faster writes |
| \`fs.existsSync()\` | \`await Bun.file().exists()\` | Async, reliable |
| \`http.createServer()\` | \`Bun.serve()\` | 2x faster server |
| \`child_process.spawn()\` | \`Bun.spawn()\` | Native performance |
| \`path.join()\` | \`import.meta.path\` | Built-in path handling |
| \`require("path")\` | \`import.meta.dir\` | Native directory detection |

### 🚀 Performance Optimizations

#### File Operations
\`\`\`typescript
// ❌ Node.js way
const fs = require('fs');
const content = fs.readFileSync('file.txt', 'utf8');
fs.writeFileSync('output.txt', content);

// ✅ Bun-first way
const content = await Bun.file('file.txt').text();
await Bun.write('output.txt', content);
\`\`\`

#### HTTP Server
\`\`\`typescript
// ❌ Node.js way
const http = require('http');
const server = http.createServer((req, res) => {
  res.end('Hello');
});

// ✅ Bun-first way
const server = Bun.serve({
  fetch() {
    return new Response('Hello');
  }
});
\`\`\`

#### Process Spawning
\`\`\`typescript
// ❌ Node.js way
const { spawn } = require('child_process');
const child = spawn('echo', ['hello']);

// ✅ Bun-first way
const child = Bun.spawn(['echo', 'hello']);
\`\`\`

### 📋 Migration Checklist

- [ ] Replace all \`require("fs")\` with Bun file APIs
- [ ] Replace \`fs.readFileSync\` with \`await Bun.file().text()\`
- [ ] Replace \`fs.writeFileSync\` with \`await Bun.write()\`
- [ ] Replace \`http.createServer\` with \`Bun.serve()\`
- [ ] Replace \`child_process.spawn\` with \`Bun.spawn()\`
- [ ] Replace \`path.join\` with \`import.meta.path\`
- [ ] Use \`Bun.fetch()\` instead of global fetch
- [ ] Use \`import.meta.main\` for entry detection

### 🛡️ Safety Rules

1. **Never use Node.js APIs when Bun equivalent exists**
2. **Always prefer async Bun APIs over sync operations**
3. **Use built-in Bun features over external packages**
4. **Leverage Bun's performance optimizations**

### 📊 Benefits

- 🚀 **3x faster** file operations
- 🌐 **2x faster** HTTP serving
- ⚡ **Native** process spawning
- 🔧 **Built-in** path handling
- 📦 **Zero dependencies** for core operations

---

*Generated by Bun-First Compliance Auditor*`;

    try {
      write('./BUN_FIRST_MIGRATION_GUIDE.md', guide);
      console.info('   ✅ Migration guide created: BUN_FIRST_MIGRATION_GUIDE.md');
    } catch (error) {
      console.info(`   ❌ Failed to create guide: ${error.message}`);
    }
  }

  /**
   * Run complete Bun-first audit
   */
  static async runCompleteAudit(): Promise<void> {
    console.info('🦌 BUN-FIRST POLICY & COMPLIANCE AUDITOR');
    console.info('Ensuring all code follows Bun-first principles');
    console.info('='.repeat(60));

    // Audit @[lib] directory
    const auditResults = await this.auditLibDirectory();

    // Generate report
    this.generateReport(auditResults);

    // Create migration guide
    this.createMigrationGuide();

    // Final assessment
    console.info('\n🎯 FINAL ASSESSMENT:');
    if (auditResults.compliance >= 95) {
      console.info('🟢 EXCELLENT: High Bun-first compliance!');
    } else if (auditResults.compliance >= 80) {
      console.info('🟡 GOOD: Decent compliance, but room for improvement');
    } else {
      console.info('🔴 NEEDS WORK: Low compliance, immediate action required');
    }

    console.info('\n🦌 Remember: ALWAYS USE BUN FIRST! 🦌');
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main(): Promise<void> {
  try {
    await BunFirstAuditor.runCompleteAudit();
  } catch (error) {
    console.error('\n❌ Bun-first audit failed:', error);
    process.exit(1);
  }
}

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */
