#!/usr/bin/env bun
/**
 * Color System Enforcement Hooks
 * Repository-wide color consistency enforcement
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ColorEnforcementConfig {
  repoWide: boolean;
  hooks: boolean;
  domains?: string[];
  coverage?: number;
}

class ColorEnforcement {
  private config: ColorEnforcementConfig;

  constructor(config: ColorEnforcementConfig) {
    this.config = config;
  }

  async installEnforcementHooks() {
    console.log('🔧 Installing Color Enforcement Hooks...');
    
    if (this.config.hooks) {
      await this.installGitHooks();
    }
    
    if (this.config.repoWide) {
      await this.setupRepoWideEnforcement();
    }
    
    await this.setupColorValidation();
    
    console.log('✅ Color enforcement hooks installed successfully!');
  }

  private async installGitHooks() {
    console.log('🎣 Setting up Git hooks for color enforcement...');
    
    const hooksDir = join(process.cwd(), '.git', 'hooks');
    const preCommitHook = `#!/bin/bash
echo "🎨 Running Color System Enforcement..."
bun run colors:validate

if [ $? -ne 0 ]; then
  echo "❌ Color system validation failed. Please fix color issues before committing."
  exit 1
fi

echo "✅ Color system validation passed."
`;

    writeFileSync(join(hooksDir, 'pre-commit'), preCommitHook);
    execSync('chmod +x .git/hooks/pre-commit');
    
    console.log('✅ Pre-commit color validation hook installed.');
  }

  private async setupRepoWideEnforcement() {
    console.log('🌐 Setting up repository-wide color enforcement...');
    
    const colorConfig = {
      enforcedColors: {
        performance: ['#3b82f6', '#10b981', '#06b6d4'],
        typescript: ['#8b5cf6', '#a855f7', '#9333ea'],
        security: ['#ef4444', '#f97316', '#dc2626'],
        bundler: ['#f59e0b', '#eab308', '#d97706'],
        fixes: ['#14b8a6', '#06b6d4', '#0d9488'],
        success: ['#22c55e', '#16a34a', '#15803d']
      },
      validation: {
        strict: true,
        coverage: this.config.coverage || 98.7,
        autoFix: true
      }
    };
    
    writeFileSync('color-enforcement.json', JSON.stringify(colorConfig, null, 2));
    console.log('✅ Repository-wide color configuration created.');
  }

  private async setupColorValidation() {
    console.log('🔍 Setting up color validation system...');
    
    const validateScript = `#!/usr/bin/env bun
/**
 * Color System Validation Script
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const enforcedColors = {
  performance: ['#3b82f6', '#10b981', '#06b6d4'],
  typescript: ['#8b5cf6', '#a855f7', '#9333ea'],
  security: ['#ef4444', '#f97316', '#dc2626'],
  bundler: ['#f59e0b', '#eab308', '#d97706'],
  fixes: ['#14b8a6', '#06b6d4', '#0d9488'],
  success: ['#22c55e', '#16a34a', '#15803d']
};

function validateColors(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const allColors = Object.values(enforcedColors).flat();
  
  let violations = [];
  
  // Check for non-enforced hex colors
  const hexRegex = /#[0-9a-fA-F]{6}/g;
  const foundColors = content.match(hexRegex) || [];
  
  foundColors.forEach(color => {
    if (!allColors.includes(color.toLowerCase())) {
      violations.push(color);
    }
  });
  
  return violations;
}

function scanDirectory(dir) {
  const files = readdirSync(dir, { recursive: true });
  let totalViolations = 0;
  
  files.forEach(file => {
    if (file.endsWith('.css') || file.endsWith('.scss') || file.endsWith('.ts') || file.endsWith('.js')) {
      const violations = validateColors(join(dir, file));
      if (violations.length > 0) {
        console.log(\`❌ Color violations in \${file}:\`, violations);
        totalViolations += violations.length;
      }
    }
  });
  
  return totalViolations;
}

const violations = scanDirectory('.');
if (violations > 0) {
  console.log(\`❌ Found \${violations} color system violations.\`);
  process.exit(1);
} else {
  console.log('✅ All colors comply with the enforced system.');
}
`;

    writeFileSync('scripts/colors-validate.ts', validateScript);
    execSync('chmod +x scripts/colors-validate.ts');
    
    // Update package.json with color scripts
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    packageJson.scripts = {
      ...packageJson.scripts,
      'colors:enforce': 'bun run scripts/colors-enforce.ts',
      'colors:validate': 'bun run scripts/colors-validate.ts',
      'colors:audit': 'bun run scripts/colors-audit.ts'
    };
    writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    
    console.log('✅ Color validation system configured.');
  }
}

// CLI execution
if (import.meta.main) {
  const args = process.argv.slice(2);
  const config: ColorEnforcementConfig = {
    repoWide: args.includes('--repo-wide'),
    hooks: args.includes('--hooks=true')
  };
  
  const enforcement = new ColorEnforcement(config);
  await enforcement.installEnforcementHooks();
}

export default ColorEnforcement;
