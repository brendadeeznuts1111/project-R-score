#!/usr/bin/env bun
/**
 * [DUOPLUS][GIT][HOOK][META:{secrets}][SECURITY][#REF:PRE-COMMIT][BUN:4.2]
 * Pre-commit hook that scans for secrets in staged files
 * 
 * Usage: bun run scripts/security/scan-secrets.ts
 */

import { $, file } from "bun";

interface SecretPattern {
  name: string;
  pattern: RegExp;
  description: string;
}

interface SecretFinding {
  type: string;
  match: string;
  line: number;
  file: string;
}

const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: 'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/,
    description: 'AWS access key ID'
  },
  {
    name: 'AWS Secret Key',
    pattern: /[0-9a-zA-Z/+]{40}/,
    description: 'AWS secret access key'
  },
  {
    name: 'GitHub Token',
    pattern: /ghp_[a-zA-Z0-9]{36}/,
    description: 'GitHub personal access token'
  },
  {
    name: 'GitHub OAuth',
    pattern: /gho_[a-zA-Z0-9]{36}/,
    description: 'GitHub OAuth token'
  },
  {
    name: 'Stripe Secret Key',
    pattern: /sk_live_[a-zA-Z0-9]{24}/,
    description: 'Stripe live secret key'
  },
  {
    name: 'Stripe Publishable Key',
    pattern: /pk_live_[a-zA-Z0-9]{24}/,
    description: 'Stripe live publishable key'
  },
  {
    name: 'OpenAI API Key',
    pattern: /sk-[a-zA-Z0-9]{48}/,
    description: 'OpenAI API key'
  },
  {
    name: 'Private Key',
    pattern: /-----BEGIN (RSA |DSA |EC )?PRIVATE KEY-----/,
    description: 'Private key in PEM format'
  },
  {
    name: 'JWT Token',
    pattern: /eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/,
    description: 'JSON Web Token'
  },
  {
    name: 'Database URL',
    pattern: /(postgres|mysql|mongodb):\/\/[^\s"']+:[^\s"']+@[^\s"']+/,
    description: 'Database connection string with credentials'
  }
];

async function getStagedFiles(): Promise<string[]> {
  const output = await $`git diff --cached --name-only`.text();
  return output.trim().split('\n').filter(Boolean);
}

function scanForSecrets(content: string, filename: string): SecretFinding[] {
  const findings: SecretFinding[] = [];
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    for (const { name, pattern } of SECRET_PATTERNS) {
      const matches = line.match(pattern);
      if (matches) {
        findings.push({
          type: name,
          match: matches[0],
          line: i + 1,
          file: filename
        });
      }
    }
  }
  
  return findings;
}

async function main() {
  try {
    console.log('🔍 Scanning for secrets...');
    
    const stagedFiles = await getStagedFiles();
    let secretsFound = false;
    
    for (const filename of stagedFiles) {
      const f = file(filename);
      if (!(await f.exists())) continue;
      
      const content = await f.text();
      const findings = scanForSecrets(content, filename);

      if (findings.length > 0) {
        secretsFound = true;
        console.error(`🚨 Secrets detected in ${filename}:`);
        findings.forEach(finding => console.error(`  ${finding.type}: ${finding.match}`));
      }
    }
    
    if (secretsFound) {
      console.error('\n❌ Commit blocked: Remove secrets before committing');
      console.error('Use: git reset HEAD <file> to unstage');
      process.exit(1);
    }
    
    console.log('✅ No secrets detected');
    
  } catch (error) {
    console.error('Error scanning secrets:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}