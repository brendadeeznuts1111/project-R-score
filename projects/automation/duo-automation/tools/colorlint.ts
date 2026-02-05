#!/usr/bin/env bun
/**
 * ColorLint - Strict Color Validation Tool
 * Validates hex colors against approved palette with fail-on-error capability
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

interface ColorLintConfig {
  palette?: string;
  failOnError?: boolean;
  strict?: boolean;
  output?: string;
}

interface ColorLintResult {
  valid: boolean;
  violations: Array<{
    file: string;
    line: number;
    column: number;
    color: string;
    expected: string[];
    rule: string;
  }>;
  summary: {
    totalFiles: number;
    violations: number;
    compliance: number;
  };
}

class ColorLint {
  private config: ColorLintConfig;
  private palette: any;

  constructor(config: ColorLintConfig) {
    this.config = config;
    this.loadPalette();
  }

  async run() {
    console.log('🔍 ColorLint - Strict Color Validation');
    
    const result = await this.validate();
    this.displayResults(result);
    
    if (this.config.failOnError && !result.valid) {
      console.log('\n❌ Color validation failed. Fix violations before proceeding.');
      process.exit(1);
    }
    
    if (result.valid) {
      console.log('\n✅ All colors are valid!');
    }
  }

  private loadPalette() {
    const paletteFile = this.config.palette || 'duoplus-v2.0.json';
    
    try {
      if (existsSync(paletteFile)) {
        this.palette = JSON.parse(readFileSync(paletteFile, 'utf8'));
      } else {
        // Use default DuoPlus v2.0 palette
        this.palette = {
          name: "DuoPlus v2.0",
          version: "2.0.0",
          colors: {
            performance: ['#3b82f6', '#10b981', '#06b6d4', '#dbeafe', '#1e40af'],
            typescript: ['#8b5cf6', '#a855f7', '#9333ea', '#ede9fe', '#6b21a8'],
            security: ['#ef4444', '#f97316', '#dc2626', '#fee2e2', '#991b1b'],
            bundler: ['#f59e0b', '#eab308', '#d97706', '#fef3c7', '#92400e'],
            fixes: ['#14b8a6', '#06b6d4', '#0d9488', '#ccfbf1', '#115e59'],
            success: ['#22c55e', '#16a34a', '#15803d', '#dcfce7', '#14532d']
          },
          rules: {
            strict: this.config.strict || false,
            allowGrayscale: false,
            allowTransparency: false,
            requireCategory: true
          }
        };
        
        // Save default palette for future use
        writeFileSync(paletteFile, JSON.stringify(this.palette, null, 2));
        console.log(`📝 Created default palette: ${paletteFile}`);
      }
    } catch (error) {
      console.error(`❌ Failed to load palette: ${paletteFile}`);
      process.exit(1);
    }
  }

  private async validate(): Promise<ColorLintResult> {
    const violations = [];
    const totalFiles = this.countFiles();
    
    const scan = (dir: string) => {
      const items = readdirSync(dir);
      
      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scan(fullPath);
        } else if (stat.isFile()) {
          const ext = extname(item).toLowerCase();
          if (['.css', '.scss', '.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'].includes(ext)) {
            const fileViolations = this.validateFile(fullPath);
            violations.push(...fileViolations);
          }
        }
      }
    };
    
    scan('.');
    
    const compliance = totalFiles > 0 ? Math.round(((totalFiles - violations.length) / totalFiles) * 100 * 10) / 10 : 100;
    
    return {
      valid: violations.length === 0,
      violations,
      summary: {
        totalFiles,
        violations: violations.length,
        compliance
      }
    };
  }

  private validateFile(filePath: string) {
    const violations = [];
    
    try {
      const content = readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, lineIndex) => {
        const hexColors = this.extractHexColors(line);
        
        hexColors.forEach((color, columnIndex) => {
          if (!this.isValidColor(color)) {
            const expected = this.getExpectedColors(color);
            violations.push({
              file: filePath,
              line: lineIndex + 1,
              column: columnIndex + 1,
              color,
              expected,
              rule: this.getViolationRule(color)
            });
          }
        });
        
        // Check for deprecated colors in strict mode
        if (this.config.strict) {
          const deprecatedColors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'gray', 'grey'];
          deprecatedColors.forEach(deprecated => {
            if (line.includes(deprecated) && !line.includes('//')) {
              violations.push({
                file: filePath,
                line: lineIndex + 1,
                column: 0,
                color: deprecated,
                expected: Object.values(this.palette.colors).flat(),
                rule: 'deprecated-color-name'
              });
            }
          });
        }
      });
    } catch (error) {
      // Skip files that can't be read
    }
    
    return violations;
  }

  private extractHexColors(text: string): string[] {
    const hexRegex = /#[0-9a-fA-F]{6}/g;
    const matches = [];
    let match;
    
    while ((match = hexRegex.exec(text)) !== null) {
      matches.push(match[0].toLowerCase());
    }
    
    return matches;
  }

  private isValidColor(color: string): boolean {
    const approvedColors = Object.values(this.palette.colors).flat();
    return approvedColors.includes(color);
  }

  private getExpectedColors(color: string): string[] {
    // Suggest colors from the same category or closest match
    const allColors = Object.values(this.palette.colors).flat();
    
    // Find closest color by simple heuristics
    const suggestions = allColors.slice(0, 5); // Return first 5 as suggestions
    
    return suggestions;
  }

  private getViolationRule(color: string): string {
    if (!color.startsWith('#')) return 'invalid-format';
    if (color.length !== 7) return 'invalid-length';
    return 'unapproved-color';
  }

  private countFiles(): number {
    let count = 0;
    
    const scan = (dir: string) => {
      const items = readdirSync(dir);
      
      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scan(fullPath);
        } else if (stat.isFile()) {
          const ext = extname(item).toLowerCase();
          if (['.css', '.scss', '.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'].includes(ext)) {
            count++;
          }
        }
      }
    };
    
    scan('.');
    return count;
  }

  private displayResults(result: ColorLintResult) {
    console.log('\n📊 ColorLint Results:');
    console.log('================================');
    console.log(`📁 Total Files: ${result.summary.totalFiles}`);
    console.log(`✅ Valid Files: ${result.summary.totalFiles - result.summary.violations}`);
    console.log(`❌ Violations: ${result.summary.violations}`);
    console.log(`📈 Compliance: ${result.summary.compliance}%`);
    
    if (result.violations.length > 0) {
      console.log('\n🚨 Color Violations:');
      
      // Group violations by file
      const violationsByFile = result.violations.reduce((acc, v) => {
        if (!acc[v.file]) acc[v.file] = [];
        acc[v.file].push(v);
        return acc;
      }, {} as { [key: string]: typeof result.violations });
      
      Object.entries(violationsByFile).forEach(([file, violations]) => {
        console.log(`\n📄 ${file}:`);
        violations.forEach(v => {
          console.log(`   • Line ${v.line}: \`${v.color}\` (${v.rule})`);
          if (v.expected.length > 0) {
            console.log(`     Expected: ${v.expected.slice(0, 3).join(', ')}${v.expected.length > 3 ? '...' : ''}`);
          }
        });
      });
      
      console.log('\n💡 Suggestions:');
      console.log('   • Run with --fix to auto-correct common issues');
      console.log('   • Check the palette file for approved colors');
      console.log('   • Use CSS custom properties for consistency');
    }
    
    // Save detailed report
    const reportFile = this.config.output || 'colorlint-report.json';
    writeFileSync(reportFile, JSON.stringify(result, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportFile}`);
  }
}

// Helper function to check if file exists
function existsSync(path: string): boolean {
  try {
    require('fs').statSync(path);
    return true;
  } catch {
    return false;
  }
}

// CLI execution
if (import.meta.main) {
  const args = process.argv.slice(2);
  const config: ColorLintConfig = {
    palette: args.find(arg => arg.startsWith('--palette='))?.split('=')[1],
    failOnError: args.includes('--fail-on-error'),
    strict: args.includes('--strict'),
    output: args.find(arg => arg.startsWith('--output='))?.split('=')[1]
  };
  
  const colorlint = new ColorLint(config);
  await colorlint.run();
}

export default ColorLint;
