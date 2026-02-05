#!/usr/bin/env bun
/**
 * [DUOPLUS][GIT][AUTO][META:{pre-commit}][SECURITY][#REF:GITHOOK][BUN:4.2-NATIVE]
 * Pre-commit hook that auto-tags commits based on changed files
 * 
 * Usage: bun run scripts/git/tag-commits.ts "commit message"
 */

import { $ } from "bun";
import { existsSync } from "fs";

interface GitTags {
  security: string[];
  deps: string[];
  code: string[];
  docs: string[];
  config: string[];
  tests: string[];
  ci: string[];
}

const TAG_RULES = {
  security: [
    '.gitignore', '.gitattributes', '.env*', 'secrets/', 'config/secrets/',
    '*.key', '*.pem', '*.p12', '*.pfx', 'security/', 'audit/'
  ],
  deps: [
    'package.json', 'package-lock.json', 'yarn.lock', 'bun.lockb',
    'requirements.txt', 'Cargo.toml', 'go.mod'
  ],
  code: [
    '*.ts', '*.tsx', '*.js', '*.jsx', '*.py', '*.go', '*.rs', '*.java',
    'src/', 'lib/', 'app/', 'components/', 'services/'
  ],
  docs: [
    '*.md', '*.rst', '*.txt', 'docs/', 'README*', 'CHANGELOG*',
    'guides/', 'tutorials/', 'spec/'
  ],
  config: [
    '*.json', '*.yml', '*.yaml', '*.toml', '*.ini', '*.conf',
    '.vscode/', '.idea/', 'config/', 'configs/', 'settings/'
  ],
  tests: [
    '*.test.*', '*.spec.*', 'tests/', 'test/', '__tests__/', 'e2e/',
    'cypress/', 'playwright/', 'jest.config.*'
  ],
  ci: [
    '.github/', '.gitlab-ci.yml', 'Jenkinsfile', '.circleci/',
    'azure-pipelines.yml', 'buildkite.yml', '.travis.yml'
  ]
};

async function getChangedFiles(): Promise<string[]> {
  const output = await $`git diff --cached --name-only`.text();
  return output.trim().split('\n').filter(Boolean);
}

function determineTags(changedFiles: string[]): string[] {
  const tags = new Set<string>();
  
  for (const file of changedFiles) {
    for (const [tag, patterns] of Object.entries(TAG_RULES)) {
      for (const pattern of patterns) {
        if (file.includes(pattern) || file.endsWith(pattern)) {
          tags.add(`[${tag.toUpperCase()}]`);
          break;
        }
      }
    }
  }
  
  // Add security tags for sensitive changes
  if (changedFiles.some(f => f.includes('.env') || f.includes('secret'))) {
    tags.add('[SECURITY]');
  }
  
  // Add performance tags for build/config changes
  if (changedFiles.some(f => f.includes('webpack') || f.includes('vite'))) {
    tags.add('[PERFORMANCE]');
  }
  
  return Array.from(tags);
}

function formatCommitMessage(tags: string[], originalMessage: string): string {
  const tagString = tags.join('');
  const cleanMessage = originalMessage.replace(/^\[.*?\]/, '').trim();
  return `${tagString} ${cleanMessage}`.trim();
}

async function main() {
  const args = process.argv.slice(2);
  const message = args.join(' ');
  
  if (!message) {
    console.error('Usage: bun run scripts/git/tag-commits.ts "commit message"');
    process.exit(1);
  }
  
  try {
    const changedFiles = await getChangedFiles();
    if (changedFiles.length === 0) {
      console.log('No changes to commit');
      process.exit(0);
    }
    
    const tags = determineTags(changedFiles);
    const formattedMessage = formatCommitMessage(tags, message);
    
    console.log('Generated commit message:', formattedMessage);
    console.log('Changed files:', changedFiles);
    console.log('Applied tags:', tags);
    
    // Write to temp file for pre-commit hook
    await Bun.write('.git/COMMIT_EDITMSG', formattedMessage);
    
  } catch (error) {
    console.error('Error generating commit tags:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}