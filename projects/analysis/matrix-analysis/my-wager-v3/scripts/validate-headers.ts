#!/usr/bin/env bun
// Header Validation Script
import { join } from 'node:path';
import { EXIT_CODES } from "../../.claude/lib/exit-codes.ts";

interface HeaderRule {
  pattern: RegExp;
  required: boolean;
  description: string;
}

const TENSION_HEADERS: HeaderRule[] = [
  { pattern: /\[TENSION-VOLUME-\d+\]/, required: true, description: 'Volume tension field' },
  { pattern: /\[TENSION-LINK-\d+\]/, required: true, description: 'Link tension field' },
  { pattern: /\[TENSION-PROFILE-\d+\]/, required: true, description: 'Profile tension field' },
];

const GOV_HEADERS: HeaderRule[] = [
  { pattern: /\[GOV-SECURITY-\d+\]/, required: true, description: 'Security governance' },
  { pattern: /\[GOV-COMPLIANCE-\d+\]/, required: true, description: 'Compliance governance' },
];

async function validateFile(filePath: string): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const content = await Bun.file(filePath).text();

    // Check TENSION headers
    TENSION_HEADERS.forEach(header => {
      if (!content.match(header.pattern)) {
        const msg = `Missing ${header.description}: ${header.pattern}`;
        if (header.required) {
          errors.push(msg);
        } else {
          warnings.push(msg);
        }
      }
    });

    // Check GOV headers
    GOV_HEADERS.forEach(header => {
      if (!content.match(header.pattern)) {
        const msg = `Missing ${header.description}: ${header.pattern}`;
        if (header.required) {
          errors.push(msg);
        } else {
          warnings.push(msg);
        }
      }
    });

  } catch (err) {
    errors.push(`Failed to read ${filePath}: ${err}`);
  }

  return { errors, warnings };
}

async function findTsFiles(dir: string): Promise<string[]> {
  const glob = new Bun.Glob("**/*.ts");
  const files: string[] = [];
  for await (const path of glob.scan({ cwd: dir, onlyFiles: true })) {
    files.push(join(dir, path));
  }
  return files;
}

// Main validation
console.info('🔍 Validating TENSION and GOV headers...');

const srcDir = './src';
const files = await findTsFiles(srcDir);

if (files.length === 0) {
  console.info('⚠️  No TypeScript files found in src/');
  process.exit(EXIT_CODES.GENERIC_ERROR);
}

let totalErrors = 0;
let totalWarnings = 0;

for (const file of files) {
  const { errors, warnings } = await validateFile(file);

  if (errors.length > 0 || warnings.length > 0) {
    console.info(`\n📄 ${file}`);
    errors.forEach(err => console.info(`  ❌ ${err}`));
    warnings.forEach(warn => console.info(`  ⚠️  ${warn}`));
  }

  totalErrors += errors.length;
  totalWarnings += warnings.length;
}

console.info(`\n📊 Validation Complete`);
console.info(`Files checked: ${files.length}`);
console.info(`Errors: ${totalErrors}`);
console.info(`Warnings: ${totalWarnings}`);

if (totalErrors > 0) {
  console.info('\n❌ Validation FAILED');
  process.exit(EXIT_CODES.GENERIC_ERROR);
} else {
  console.info('\n✅ Validation PASSED');
}
