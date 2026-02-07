#!/usr/bin/env bun
/**
 * Migration Script: Convert Node.js APIs to Bun-native APIs
 * 
 * This script analyzes and helps migrate:
 * - fs/promises → Bun.file() / Bun.write()
 * - crypto → Bun.CryptoHasher / Bun.hash()
 * - console.log → logger
 * - Bun.env → Bun.env
 * - Buffer → Uint8Array
 * - setTimeout → Bun.sleep()
 */

import { Glob } from 'bun';
import { logger } from '../src/utils/logger';

interface MigrationIssue {
  file: string;
  line: number;
  type: 'fs' | 'crypto' | 'console' | 'process-env' | 'buffer' | 'timeout';
  current: string;
  suggested: string;
}

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

// Patterns to detect
const PATTERNS = {
  fs: [
    /from ['"]fs['"]/,
    /from ['"]fs\/promises['"]/,
    /require\(['"]fs/,
    /readFile\(/,
    /writeFile\(/,
    /readFileSync\(/,
    /writeFileSync\(/,
  ],
  crypto: [
    /from ['"]crypto['"]/,
    /require\(['"]crypto/,
    /createHash\(/,
    /createHmac\(/,
    /createCipher/,
    /randomBytes\(/,
    /pbkdf2/,
  ],
  console: [
    /console\.log\(/,
    /console\.error\(/,
    /console\.warn\(/,
    /console\.info\(/,
    /console\.debug\(/,
  ],
  'process-env': [
    /process\.env/,
  ],
  buffer: [
    /Buffer\.alloc/,
    /Buffer\.from/,
    /Buffer\.concat/,
    /new Buffer\(/,
  ],
  timeout: [
    /setTimeout\(/,
    /setInterval\(/,
    /new Promise.*setTimeout/,
  ],
};

// Migration suggestions
const SUGGESTIONS: Record<string, string> = {
  // FS
  "from 'fs'": "Use Bun.file() or Bun.write()",
  "from 'fs/promises'": "Use Bun.file() or Bun.write()",
  "readFile(": "Use Bun.file(path).text() or .json()",
  "writeFile(": "Use Bun.write(path, data)",
  "readFileSync(": "Use Bun.file(path).text()",
  "writeFileSync(": "Use Bun.write(path, data)",
  
  // Crypto
  "from 'crypto'": "Use Bun.hash(), Bun.CryptoHasher, or Bun.password",
  "createHash(": "Use Bun.hash() for fast hashing or new Bun.CryptoHasher() for streaming",
  "createHmac(": "Use new Bun.CryptoHasher('sha256') with key",
  "randomBytes(": "Use crypto.getRandomValues() or Bun.password for passwords",
  
  // Console
  "console.log(": "Use logger.info() or logger.debug()",
  "console.error(": "Use logger.error()",
  "console.warn(": "Use logger.warn()",
  
  // Process.env
  "Bun.env": "Use Bun.env (slightly faster, same API)",
  
  // Buffer
  "Buffer.alloc": "Use new Uint8Array(size)",
  "Buffer.from": "Use new TextEncoder().encode() for strings",
  "Buffer.concat": "Use new Blob(buffers).arrayBuffer()",
  
  // Timeout
  "setTimeout(": "Use Bun.sleep(ms) for simple delays",
  "setInterval(": "Consider using a loop with Bun.sleep()",
};

async function scanFile(filePath: string): Promise<MigrationIssue[]> {
  const issues: MigrationIssue[] = [];
  const content = await Bun.file(filePath).text();
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
    
    for (const [type, patterns] of Object.entries(PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(line)) {
          const match = line.match(pattern);
          if (match) {
            const current = match[0];
            const suggested = SUGGESTIONS[current] || `Consider Bun-native alternative for ${current}`;
            
            issues.push({
              file: filePath,
              line: lineNum,
              type: type as MigrationIssue['type'],
              current,
              suggested,
            });
          }
        }
      }
    }
  }
  
  return issues;
}

async function scanDirectory(dir: string): Promise<MigrationIssue[]> {
  const allIssues: MigrationIssue[] = [];
  const glob = new Glob("**/*.ts");
  
  for await (const file of glob.scan(dir)) {
    // Skip node_modules and dist
    if (file.includes('node_modules') || file.includes('dist/')) continue;
    
    const filePath = `${dir}/${file}`;
    const issues = await scanFile(filePath);
    allIssues.push(...issues);
  }
  
  return allIssues;
}

function printReport(issues: MigrationIssue[]) {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    BUN API MIGRATION REPORT                                ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
  
  if (issues.length === 0) {
    console.log(`${ANSI.green}✅ No migration issues found!${ANSI.reset}\n`);
    return;
  }
  
  // Group by type
  const byType: Record<string, MigrationIssue[]> = {};
  for (const issue of issues) {
    if (!byType[issue.type]) byType[issue.type] = [];
    byType[issue.type].push(issue);
  }
  
  // Summary
  console.log(`${ANSI.bold}Summary:${ANSI.reset}\n`);
  for (const [type, typeIssues] of Object.entries(byType)) {
    const color = type === 'console' ? ANSI.yellow : type === 'fs' || type === 'crypto' ? ANSI.cyan : ANSI.dim;
    console.log(`  ${color}${type.padEnd(15)}${ANSI.reset}: ${typeIssues.length} occurrences`);
  }
  console.log(`\n  ${ANSI.bold}Total:${ANSI.reset} ${issues.length} issues\n`);
  
  // Detailed report
  console.log(`${ANSI.bold}Details:${ANSI.reset}\n`);
  
  let currentFile = '';
  for (const issue of issues.slice(0, 50)) { // Show first 50
    if (issue.file !== currentFile) {
      currentFile = issue.file;
      console.log(`\n${ANSI.bold}${currentFile}${ANSI.reset}`);
    }
    
    const typeColor = issue.type === 'console' ? ANSI.yellow : issue.type === 'fs' ? ANSI.cyan : issue.type === 'crypto' ? ANSI.blue : ANSI.dim;
    console.log(`  ${typeColor}[${issue.type}]${ANSI.reset} Line ${issue.line}: ${issue.current}`);
    console.log(`    ${ANSI.dim}→ ${issue.suggested}${ANSI.reset}`);
  }
  
  if (issues.length > 50) {
    console.log(`\n${ANSI.dim}... and ${issues.length - 50} more issues${ANSI.reset}`);
  }
  
  console.log('\n');
}

// Auto-fix functions
async function autoFixFile(filePath: string, dryRun = true): Promise<number> {
  let content = await Bun.file(filePath).text();
  let fixes = 0;
  
  // Fix 1: Replace Bun.env with Bun.env
  if (content.includes('Bun.env')) {
    const newContent = content.replace(/process\.env(?!\w)/g, 'Bun.env');
    if (newContent !== content) {
      fixes++;
      if (!dryRun) {
        await Bun.write(filePath, newContent);
      }
      content = newContent;
    }
  }
  
  // Fix 2: Replace simple setTimeout with Bun.sleep
  // Only for patterns like: await new Promise(r => setTimeout(r, ms))
  const sleepPattern = /await new Promise\(resolve => setTimeout\(resolve, (\d+)\)\)/g;
  if (sleepPattern.test(content)) {
    const newContent = content.replace(sleepPattern, 'await Bun.sleep($1)');
    if (newContent !== content) {
      fixes++;
      if (!dryRun) {
        await Bun.write(filePath, newContent);
      }
      content = newContent;
    }
  }
  
  // Fix 3: Add logger import if console statements exist
  if (content.match(/console\.(log|error|warn)\(/) && !content.includes('from \'./logger\'') && !content.includes('from \'../logger\'')) {
    // This requires manual fix - can't auto-import reliably
  }
  
  return fixes;
}

async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');
  const dryRun = !shouldFix;
  
  console.log(`\n${ANSI.bold}🔍 Scanning for Bun migration opportunities...${ANSI.reset}\n`);
  
  const dirs = ['src', 'lib', 'scripts'];
  let allIssues: MigrationIssue[] = [];
  
  for (const dir of dirs) {
    try {
      const issues = await scanDirectory(dir);
      allIssues.push(...issues);
    } catch (e) {
      // Directory might not exist
    }
  }
  
  printReport(allIssues);
  
  // Auto-fix
  if (shouldFix) {
    console.log(`${ANSI.bold}🔧 Applying auto-fixes...${ANSI.reset}\n`);
    
    const filesToFix = [...new Set(allIssues.map(i => i.file))];
    let totalFixes = 0;
    
    for (const file of filesToFix) {
      const fixes = await autoFixFile(file, false);
      if (fixes > 0) {
        console.log(`  ${ANSI.green}✓${ANSI.reset} ${file}: ${fixes} fixes`);
        totalFixes += fixes;
      }
    }
    
    console.log(`\n${ANSI.green}✅${ANSI.reset} Applied ${totalFixes} auto-fixes\n`);
    console.log(`${ANSI.yellow}⚠️${ANSI.reset} Note: Some changes require manual review (fs, crypto, console)\n`);
  } else {
    console.log(`${ANSI.dim}Run with --fix to apply safe auto-fixes${ANSI.reset}\n`);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
