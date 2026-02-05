#!/usr/bin/env bun
/**
 * Environment Variables Health Check Script
 * 
 * Validates that all constants environment variables are properly single-sourced
 * and ensures there are no overlapping or missing configurations.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

interface EnvVarDefinition {
  name: string;
  source: string;
  defaultValue?: string;
  required?: boolean;
  description?: string;
}

interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  duplicates: string[];
  missing: string[];
  summary: {
    totalVars: number;
    uniqueVars: number;
    sources: string[];
  };
}

class EnvironmentHealthChecker {
  private envVars: Map<string, EnvVarDefinition[]> = new Map();
  private sources: Set<string> = new Set();

  async analyze(): Promise<ValidationResult> {
    console.log('🔍 Analyzing environment variables...\n');

    // Analyze all configuration sources
    await this.analyzeConstantsFiles();
    await this.analyzeEnvExamples();
    await this.analyzeConfigFiles();
    await this.analyzeDocumentation();

    return this.generateReport();
  }

  private async analyzeConstantsFiles(): Promise<void> {
    const constantsFiles = [
      'config/constants-v37.ts',
      'config/application/constants.ts',
      'config/storage/r2-constants.ts'
    ];

    for (const file of constantsFiles) {
      const filePath = join(PROJECT_ROOT, file);
      if (!existsSync(filePath)) continue;

      const content = readFileSync(filePath, 'utf-8');
      this.extractEnvVars(content, file);
      this.sources.add(file);
    }
  }

  private async analyzeEnvExamples(): Promise<void> {
    const envFiles = [
      'config/environment/.env.example',
      'config/environment/.env.development',
      'config/environment/.env.production',
      '.env.sample',
      '.env.registry.template'
    ];

    for (const file of envFiles) {
      const filePath = join(PROJECT_ROOT, file);
      if (!existsSync(filePath)) continue;

      const content = readFileSync(filePath, 'utf-8');
      this.extractEnvVarsFromEnvFile(content, file);
      this.sources.add(file);
    }
  }

  private async analyzeConfigFiles(): Promise<void> {
    const configFiles = [
      'src/config/ports.ts',
      'src/config/index.ts',
      'src/types/env.d.ts',
      'src/env.d.ts'
    ];

    for (const file of configFiles) {
      const filePath = join(PROJECT_ROOT, file);
      if (!existsSync(filePath)) continue;

      const content = readFileSync(filePath, 'utf-8');
      this.extractEnvVars(content, file);
      this.sources.add(file);
    }
  }

  private async analyzeDocumentation(): Promise<void> {
    const docFiles = [
      'docs/deployment/ENVIRONMENT_SETUP.md',
      'docs/DEPLOYMENT.md',
      'docs/README.md'
    ];

    for (const file of docFiles) {
      const filePath = join(PROJECT_ROOT, file);
      if (!existsSync(filePath)) continue;

      const content = readFileSync(filePath, 'utf-8');
      this.extractEnvVarsFromDocumentation(content, file);
      this.sources.add(file);
    }
  }

  private extractEnvVars(content: string, source: string): void {
    // Extract process.env.VARIABLE patterns
    const processEnvRegex = /process\.env\.([A-Z_][A-Z0-9_]*)/g;
    let match;

    while ((match = processEnvRegex.exec(content)) !== null) {
      const varName = match[1];
      this.addEnvVar(varName, source);
    }

    // Extract const VARIABLE = process.env patterns
    const constRegex = /const\s+([A-Z_][A-Z0-9_]*)\s*=\s*process\.env\.([A-Z_][A-Z0-9_]*)/g;
    while ((match = constRegex.exec(content)) !== null) {
      const constName = match[1];
      const envName = match[2];
      this.addEnvVar(envName, source, `Constant: ${constName}`);
    }
  }

  private extractEnvVarsFromEnvFile(content: string, source: string): void {
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;

      const varName = trimmed.substring(0, eqIndex).trim();
      if (/^[A-Z_][A-Z0-9_]*$/.test(varName)) {
        const defaultValue = trimmed.substring(eqIndex + 1).trim();
        this.addEnvVar(varName, source, defaultValue);
      }
    }
  }

  private extractEnvVarsFromDocumentation(content: string, source: string): void {
    // Extract table rows with environment variables
    const tableRowRegex = /\|\s*([A-Z_][A-Z0-9_]*)\s*\|/g;
    let match;

    while ((match = tableRowRegex.exec(content)) !== null) {
      const varName = match[1];
      this.addEnvVar(varName, source, 'Documented');
    }

    // Extract code blocks with env vars
    const codeBlockRegex = /```[^`]*process\.env\.([A-Z_][A-Z0-9_]*)[^`]*```/g;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const varName = match[1];
      this.addEnvVar(varName, source, 'In documentation');
    }
  }

  private addEnvVar(name: string, source: string, defaultValue?: string): void {
    if (!this.envVars.has(name)) {
      this.envVars.set(name, []);
    }
    
    this.envVars.get(name)!.push({
      name,
      source,
      defaultValue,
      required: !defaultValue || defaultValue.includes('your-') || defaultValue.includes('change-in-production')
    });
  }

  private generateReport(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const duplicates: string[] = [];
    const missing: string[] = [];

    // Check for duplicates
    for (const [varName, definitions] of this.envVars) {
      if (definitions.length > 1) {
        duplicates.push(`${varName}: found in ${definitions.map(d => d.source).join(', ')}`);
      }
    }

    // Check for missing required variables in .env.example
    const envExamplePath = join(PROJECT_ROOT, 'config/environment/.env.example');
    if (existsSync(envExamplePath)) {
      const envExampleContent = readFileSync(envExamplePath, 'utf-8');
      const exampleVars = new Set<string>();
      
      const lines = envExampleContent.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
        
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;
        
        const varName = trimmed.substring(0, eqIndex).trim();
        if (/^[A-Z_][A-Z0-9_]*$/.test(varName)) {
          exampleVars.add(varName);
        }
      }

      // Find required vars used in code but not in .env.example
      for (const [varName, definitions] of this.envVars) {
        const isRequired = definitions.some(d => d.required);
        const inCode = definitions.some(d => d.source.includes('.ts') || d.source.includes('.js'));
        
        if (isRequired && inCode && !exampleVars.has(varName)) {
          missing.push(varName);
        }
      }
    }

    // Check for potential conflicts
    const portVars = Array.from(this.envVars.keys()).filter(name => name.includes('PORT'));
    if (portVars.length > 10) {
      warnings.push(`High number of PORT variables (${portVars.length}). Consider port configuration consolidation.`);
    }

    // Check for timezone variables consistency
    const timezoneVars = Array.from(this.envVars.keys()).filter(name => 
      name.includes('TIMEZONE') || name.includes('TZ') || name.includes('SCOPE')
    );
    
    if (timezoneVars.length > 0) {
      const hasTimezoneMatrix = this.sources.has('config/constants-v37.ts');
      if (!hasTimezoneMatrix) {
        warnings.push('Timezone variables found but TIMEZONE_MATRIX not detected in constants-v37.ts');
      }
    }

    const totalVars = this.envVars.size;
    const uniqueVars = totalVars;
    const sources = Array.from(this.sources);

    return {
      success: errors.length === 0,
      errors,
      warnings,
      duplicates,
      missing,
      summary: {
        totalVars,
        uniqueVars,
        sources
      }
    };
  }
}

// CLI execution
async function main() {
  console.log('🏥 Environment Variables Health Check');
  console.log('=====================================\n');

  const checker = new EnvironmentHealthChecker();
  const result = await checker.analyze();

  console.log('📊 SUMMARY');
  console.log('----------');
  console.log(`Total environment variables: ${result.summary.totalVars}`);
  console.log(`Unique variables: ${result.summary.uniqueVars}`);
  console.log(`Sources analyzed: ${result.summary.sources.length}`);
  console.log(`Sources: ${result.summary.sources.map(s => s.replace(/^.*\//, '')).join(', ')}\n`);

  if (result.duplicates.length > 0) {
    console.log('🔄 DUPLICATES');
    console.log('-----------');
    result.duplicates.forEach(duplicate => console.log(`⚠️  ${duplicate}`));
    console.log();
  }

  if (result.missing.length > 0) {
    console.log('❌ MISSING FROM .env.example');
    console.log('--------------------------');
    result.missing.forEach(missing => console.log(`❌ ${missing} (used in code but not documented)`));
    console.log();
  }

  if (result.warnings.length > 0) {
    console.log('⚠️  WARNINGS');
    console.log('-----------');
    result.warnings.forEach(warning => console.log(`⚠️  ${warning}`));
    console.log();
  }

  if (result.errors.length > 0) {
    console.log('💥 ERRORS');
    console.log('---------');
    result.errors.forEach(error => console.log(`❌ ${error}`));
    console.log();
  }

  // Health check status
  if (result.success && result.duplicates.length === 0 && result.missing.length === 0) {
    console.log('✅ HEALTH CHECK PASSED');
    console.log('All environment variables are properly single-sourced and documented.');
    process.exit(0);
  } else {
    console.log('🚨 HEALTH CHECK FAILED');
    console.log('Please address the issues above before proceeding.');
    process.exit(1);
  }
}

// Export for testing
export { EnvironmentHealthChecker };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
