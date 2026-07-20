// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/file-io — Bun.write
// @see https://bun.com/docs/runtime/http/server — Bun.serve
// @see https://bun.com/docs/guides/http/fetch — Bun.fetch
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// lib/validation/bun-first-compliance.ts — Bun-first policy and compliance enforcement

import { write } from 'bun';

console.info('🦌 BUN-FIRST POLICY & COMPLIANCE AUDITOR');
console.info('Ensuring all code follows Bun-first principles');
console.info('='.repeat(60));

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

const violations: Array<{
  file: string;
  line: number;
  violation: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  suggestion: string;
}> = [];

async function auditLibDirectory() {
  console.info('\n📁 AUDITING @[lib] DIRECTORY FOR BUN-FIRST COMPLIANCE...');

  const libFiles = [
    'performance-optimizer.ts',
    'optimized-server.ts',
    'port-management-system.ts',
    'bun-implementation-details.ts',
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
        checkLineForViolations(line, fileName, index + 1);
      });
    } catch (error) {
      console.info(`   ⚠️  Could not audit ${fileName}: ${error.message}`);
    }
  }

  return totalFiles;
}

function checkLineForViolations(line: string, fileName: string, lineNumber: number): void {
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
        addViolation(
          fileName,
          lineNumber,
          `require("${module}")`,
          'CRITICAL',
          getBunAlternative(module)
        );
      }
    }
  }

  // Check for Node.js API usage
  NODE_API_VIOLATIONS.forEach(violation => {
    if (trimmedLine.includes(violation)) {
      const severity = getViolationSeverity(violation);
      addViolation(fileName, lineNumber, violation, severity, getBunAlternative(violation));
    }
  });

  // Check for missing Bun optimizations
  if (trimmedLine.includes('fetch(') && !trimmedLine.includes('Bun.fetch')) {
    addViolation(
      fileName,
      lineNumber,
      'Generic fetch()',
      'MEDIUM',
      'Use Bun.fetch() for better performance'
    );
  }
}

function addViolation(
  file: string,
  line: number,
  violation: string,
  severity: string,
  suggestion: string
): void {
  violations.push({
    file,
    line,
    violation,
    severity: severity as any,
    suggestion,
  });
}

function getViolationSeverity(violation: string): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  if (violation.includes('fs.') || violation.includes('require("fs")')) return 'CRITICAL';
  if (violation.includes('http.') || violation.includes('require("http")')) return 'CRITICAL';
  if (violation.includes('child_process.') || violation.includes('require("child_process")'))
    return 'HIGH';
  if (violation.includes('path.') || violation.includes('require("path")')) return 'MEDIUM';
  return 'LOW';
}

function getBunAlternative(nodeApi: string): string {
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

function generateReport(totalFiles: number): void {
  console.info('\n🦌 BUN-FIRST COMPLIANCE REPORT');
  console.info('='.repeat(60));

  const compliance = totalFiles > 0 ? ((totalFiles - violations.length) / totalFiles) * 100 : 100;

  console.info('\n📊 AUDIT SUMMARY:');
  console.info(`   Files Audited: ${totalFiles}`);
  console.info(`   Violations Found: ${violations.length}`);
  console.info(`   Compliance Rate: ${compliance.toFixed(1)}%`);

  const bySeverity = violations.reduce(
    (acc, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.info('\n🚨 VIOLATIONS BY SEVERITY:');
  Object.entries(bySeverity).forEach(([severity, count]) => {
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

  if (violations.length > 0) {
    console.info('\n📋 DETAILED VIOLATIONS:');

    const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
    const highViolations = violations.filter(v => v.severity === 'HIGH');
    const mediumViolations = violations.filter(v => v.severity === 'MEDIUM');

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
  if (compliance < 80) {
    console.info('   🚨 URGENT: Low compliance rate! Fix violations immediately.');
  } else if (compliance < 95) {
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

async function createMigrationGuide(): Promise<void> {
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
    await write('./BUN_FIRST_MIGRATION_GUIDE.md', guide);
    console.info('   ✅ Migration guide created: BUN_FIRST_MIGRATION_GUIDE.md');
  } catch (error) {
    console.info(`   ❌ Failed to create guide: ${error.message}`);
  }
}

// Main execution
async function main(): Promise<void> {
  try {
    // Audit @[lib] directory
    const totalFiles = await auditLibDirectory();

    // Generate report
    generateReport(totalFiles);

    // Create migration guide
    await createMigrationGuide();

    // Final assessment
    const compliance = totalFiles > 0 ? ((totalFiles - violations.length) / totalFiles) * 100 : 100;

    console.info('\n🎯 FINAL ASSESSMENT:');
    if (compliance >= 95) {
      console.info('🟢 EXCELLENT: High Bun-first compliance!');
    } else if (compliance >= 80) {
      console.info('🟡 GOOD: Decent compliance, but room for improvement');
    } else {
      console.info('🔴 NEEDS WORK: Low compliance, immediate action required');
    }

    console.info('\n🦌 Remember: ALWAYS USE BUN FIRST! 🦌');
  } catch (error) {
    console.error('\n❌ Bun-first audit failed:', error);
    process.exit(1);
  }
}

// Safe execution
if (import.meta.main) {
  main().catch(console.error);
}

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */
