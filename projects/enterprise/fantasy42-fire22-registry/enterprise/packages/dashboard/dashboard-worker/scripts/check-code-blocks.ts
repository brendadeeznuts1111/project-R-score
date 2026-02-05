#!/usr/bin/env bun

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface CodeBlockIssue {
  file: string;
  line: number;
  content: string;
}

function checkCodeBlocks(filePath: string): CodeBlockIssue[] {
  if (!existsSync(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const issues: CodeBlockIssue[] = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (line.trim().startsWith('```')) {
      if (lineNumber % 2 !== 0) {
        issues.push({
          file: filePath,
          line: lineNumber,
          content: line.trim(),
        });
      }
    }
  });

  return issues;
}

// Key files to check
const keyFiles = [
  'CONTRIBUTING.md',
  'REPOSITORY_INDEX.md',
  'README.md',
  'SECURITY-INTEGRATION-GUIDE.md',
  'REGISTRY.md',
  'wiki/Getting-Started.md',
  'wiki/Home.md',
];

console.log('🔍 Checking for code blocks starting at odd line numbers...\n');

let totalIssues = 0;

keyFiles.forEach(file => {
  const issues = checkCodeBlocks(file);
  if (issues.length > 0) {
    console.log(`📄 ${file}:`);
    issues.slice(0, 10).forEach(issue => {
      console.log(`   Line ${issue.line}: ${issue.content}`);
    });
    if (issues.length > 10) {
      console.log(`   ... and ${issues.length - 10} more issues`);
    }
    console.log();
    totalIssues += issues.length;
  }
});

if (totalIssues === 0) {
  console.log('✅ All code blocks start at even line numbers!');
} else {
  console.log(`❌ Found ${totalIssues} code blocks starting at odd line numbers`);
}
