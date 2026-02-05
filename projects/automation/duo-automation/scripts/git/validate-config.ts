#!/usr/bin/env bun
/**
 * [DUOPLUS][GIT][VALIDATE][META:{onboarding}][DEVEX][#REF:CONFIG][BUN:4.2]
 * Git configuration validation and onboarding script
 * 
 * Usage: bun run scripts/git/validate-config.ts [--fix] [--team]
 */

import { $ } from "bun";

interface GitConfig {
  [key: string]: string;
}

interface ConfigRule {
  key: string;
  expected: string | RegExp;
  description: string;
  required: boolean;
  fix?: string;
}

const CONFIG_RULES: ConfigRule[] = [
  {
    key: 'user.name',
    expected: /.+/, // Any non-empty value
    description: 'User name for commits',
    required: true,
    fix: 'git config user.name "Your Name"'
  },
  {
    key: 'user.email',
    expected: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Valid email
    description: 'User email for commits',
    required: true,
    fix: 'git config user.email "your.email@example.com"'
  },
  {
    key: 'commit.gpgsign',
    expected: 'true',
    description: 'GPG signing enabled',
    required: false,
    fix: 'git config commit.gpgsign true'
  },
  {
    key: 'pull.rebase',
    expected: 'true',
    description: 'Use rebase instead of merge on pull',
    required: false,
    fix: 'git config pull.rebase true'
  },
  {
    key: 'core.autocrlf',
    expected: 'input',
    description: 'Line ending handling for cross-platform',
    required: false,
    fix: 'git config core.autocrlf input'
  },
  {
    key: 'core.excludesfile',
    expected: /\.gitignore_global$/,
    description: 'Global gitignore file configured',
    required: false,
    fix: 'git config core.excludesfile ~/.gitignore_global'
  },
  {
    key: 'init.defaultBranch',
    expected: 'main',
    description: 'Default branch name',
    required: false,
    fix: 'git config init.defaultBranch main'
  }
];

async function getGitConfig(): Promise<GitConfig> {
  const output = await $`git config --list`.text();
  const config: GitConfig = {};
  
  for (const line of output.trim().split('\n')) {
    const [key, value] = line.split('=', 2);
    if (key && value) {
      config[key] = value;
    }
  }
  
  return config;
}

function validateConfig(config: GitConfig): string[] {
  const issues: string[] = [];
  
  for (const rule of CONFIG_RULES) {
    const value = config[rule.key];
    
    if (!value && rule.required) {
      issues.push(`Missing required config: ${rule.key} (${rule.description})`);
      continue;
    }
    
    if (value) {
      const expected = rule.expected;
      let isValid = false;
      
      if (typeof expected === 'string') {
        isValid = value === expected;
      } else {
        isValid = expected.test(value);
      }
      
      if (!isValid) {
        issues.push(`Invalid ${rule.key}: ${value} (${rule.description})`);
      }
    }
  }
  
  return issues;
}

async function fixConfigIssues(issues: string[]): Promise<void> {
  for (const issue of issues) {
    const rule = CONFIG_RULES.find(r => issue.includes(r.key));
    if (rule?.fix) {
      console.log(`Fixing: ${rule.key}`);
      await $`git config ${rule.key} ${rule.expected}`.quiet();
    }
  }
}

async function main() {
  try {
    console.log('🔧 Validating git configuration...');
    
    const config = await getGitConfig();
    const issues = validateConfig(config);
    
    if (issues.length > 0) {
      console.error('❌ Git configuration issues found:');
      issues.forEach(issue => console.error(`  ${issue}`));
      
      if (process.argv.includes('--fix')) {
        console.log('\n🛠️  Attempting to fix issues...');
        await fixConfigIssues(issues);
      } else {
        console.log('\n💡 Run with --fix to auto-correct issues');
        process.exit(1);
      }
    } else {
      console.log('✅ Git configuration is valid');
    }
    
  } catch (error) {
    console.error('Error validating git config:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}