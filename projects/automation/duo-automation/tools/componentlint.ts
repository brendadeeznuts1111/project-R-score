#!/usr/bin/env bun
/**
 * ComponentLint - Component Color Props Validator
 * Validates color props in React/Vue/Svelte components
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

interface ComponentLintConfig {
  colorsOnly?: boolean;
  strict?: boolean;
  frameworks?: string[];
  output?: string;
}

interface ComponentViolation {
  file: string;
  line: number;
  component: string;
  prop: string;
  value: string;
  issue: string;
  suggestion?: string;
}

interface ComponentLintResult {
  valid: boolean;
  violations: ComponentViolation[];
  summary: {
    totalComponents: number;
    violations: number;
    frameworks: { [key: string]: number };
  };
}

class ComponentLint {
  private config: ComponentLintConfig;
  private approvedColors = [
    '#3b82f6', '#10b981', '#06b6d4', '#dbeafe', '#1e40af', // performance
    '#8b5cf6', '#a855f7', '#9333ea', '#ede9fe', '#6b21a8', // typescript
    '#ef4444', '#f97316', '#dc2626', '#fee2e2', '#991b1b', // security
    '#f59e0b', '#eab308', '#d97706', '#fef3c7', '#92400e', // bundler
    '#14b8a6', '#06b6d4', '#0d9488', '#ccfbf1', '#115e59', // fixes
    '#22c55e', '#16a34a', '#15803d', '#dcfce7', '#14532d'  // success
  ];

  constructor(config: ComponentLintConfig = {}) {
    this.config = {
      colorsOnly: config.colorsOnly || false,
      strict: config.strict || false,
      frameworks: config.frameworks || ['react', 'vue', 'svelte'],
      output: config.output
    };
  }

  async run() {
    console.log('🔍 ComponentLint - Component Color Props Validator');
    
    const result = await this.validate();
    this.displayResults(result);
    
    if (this.config.strict && !result.valid) {
      console.log('\n❌ Component validation failed in strict mode.');
      process.exit(1);
    }
  }

  private async validate(): Promise<ComponentLintResult> {
    const violations = [];
    const components = this.findComponents();
    
    for (const component of components) {
      const componentViolations = this.validateComponent(component);
      violations.push(...componentViolations);
    }
    
    const frameworkCounts = violations.reduce((acc, v) => {
      const framework = this.detectFramework(v.file);
      acc[framework] = (acc[framework] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    return {
      valid: violations.length === 0,
      violations,
      summary: {
        totalComponents: components.length,
        violations: violations.length,
        frameworks: frameworkCounts
      }
    };
  }

  private findComponents(): string[] {
    const components = [];
    
    const scan = (dir: string) => {
      const items = readdirSync(dir);
      
      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scan(fullPath);
        } else if (stat.isFile()) {
          const ext = extname(item).toLowerCase();
          if (['.tsx', '.jsx', '.vue', '.svelte'].includes(ext)) {
            components.push(fullPath);
          }
        }
      }
    };
    
    scan('.');
    return components;
  }

  private validateComponent(filePath: string): ComponentViolation[] {
    const violations = [];
    
    try {
      const content = readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const framework = this.detectFramework(filePath);
      
      lines.forEach((line, index) => {
        const componentViolations = this.validateLine(line, index + 1, filePath, framework);
        violations.push(...componentViolations);
      });
    } catch (error) {
      // Skip files that can't be read
    }
    
    return violations;
  }

  private validateLine(line: string, lineNum: number, filePath: string, framework: string): ComponentViolation[] {
    const violations = [];
    
    if (this.config.colorsOnly) {
      // Only validate color-related props
      const colorProps = this.extractColorProps(line, framework);
      
      colorProps.forEach(prop => {
        if (!this.isValidColorValue(prop.value)) {
          violations.push({
            file: filePath,
            line: lineNum,
            component: this.extractComponentName(line, framework),
            prop: prop.name,
            value: prop.value,
            issue: 'Invalid color value',
            suggestion: this.suggestColorValue(prop.value)
          });
        }
      });
    } else {
      // Validate all props but focus on colors
      const allProps = this.extractAllProps(line, framework);
      
      allProps.forEach(prop => {
        if (this.isColorProp(prop.name)) {
          if (!this.isValidColorValue(prop.value)) {
            violations.push({
              file: filePath,
              line: lineNum,
              component: this.extractComponentName(line, framework),
              prop: prop.name,
              value: prop.value,
              issue: 'Invalid color value',
              suggestion: this.suggestColorValue(prop.value)
            });
          }
        }
      });
    }
    
    return violations;
  }

  private detectFramework(filePath: string): string {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) return 'react';
    if (filePath.endsWith('.vue')) return 'vue';
    if (filePath.endsWith('.svelte')) return 'svelte';
    return 'unknown';
  }

  private extractColorProps(line: string, framework: string): Array<{ name: string; value: string }> {
    const colorProps = [];
    
    switch (framework) {
      case 'react':
        const reactColorMatch = line.match(/(color|backgroundColor|borderColor|textColor|bg|text)=["']([^"']+)["']/);
        if (reactColorMatch) {
          colorProps.push({
            name: reactColorMatch[1],
            value: reactColorMatch[2]
          });
        }
        break;
        
      case 'vue':
        const vueColorMatch = line.match(/:(color|background-color|border-color|text-color)=["']([^"']+)["']/);
        if (vueColorMatch) {
          colorProps.push({
            name: vueColorMatch[1],
            value: vueColorMatch[2]
          });
        }
        break;
        
      case 'svelte':
        const svelteColorMatch = line.match(/(color|background-color|border-color|text-color):\s*([^;]+)/);
        if (svelteColorMatch) {
          colorProps.push({
            name: svelteColorMatch[1],
            value: svelteColorMatch[2].trim()
          });
        }
        break;
    }
    
    return colorProps;
  }

  private extractAllProps(line: string, framework: string): Array<{ name: string; value: string }> {
    const props = [];
    
    switch (framework) {
      case 'react':
        const reactMatches = line.matchAll(/(\w+)=["']([^"']+)["']/g);
        for (const match of reactMatches) {
          props.push({
            name: match[1],
            value: match[2]
          });
        }
        break;
        
      case 'vue':
        const vueMatches = line.matchAll(/(\w+)=["']([^"']+)["']/g);
        for (const match of vueMatches) {
          props.push({
            name: match[1],
            value: match[2]
          });
        }
        break;
        
      case 'svelte':
        const svelteMatches = line.matchAll(/(\w+):\s*([^;]+)/g);
        for (const match of svelteMatches) {
          props.push({
            name: match[1],
            value: match[2].trim()
          });
        }
        break;
    }
    
    return props;
  }

  private isColorProp(propName: string): boolean {
    const colorPropNames = [
      'color', 'backgroundColor', 'borderColor', 'textColor', 'bg', 'text',
      'background-color', 'border-color', 'text-color', 'fill', 'stroke'
    ];
    
    return colorPropNames.some(name => 
      propName.toLowerCase().includes(name.toLowerCase())
    );
  }

  private isValidColorValue(value: string): boolean {
    // Check if it's an approved hex color
    if (value.startsWith('#') && value.length === 7) {
      return this.approvedColors.includes(value.toLowerCase());
    }
    
    // Check if it's a CSS custom property (allowed)
    if (value.startsWith('var(--')) {
      return true;
    }
    
    // Check if it's an approved color name
    const approvedNames = [
      'blue', 'green', 'red', 'yellow', 'purple', 'orange', 'cyan', 'teal',
      'amber', 'emerald', 'rose', 'pink', 'violet', 'indigo'
    ];
    
    return approvedNames.includes(value.toLowerCase());
  }

  private suggestColorValue(invalidValue: string): string {
    // Simple suggestion logic
    if (invalidValue.startsWith('#')) {
      // Suggest closest approved color
      return this.approvedColors[0]; // Default to first approved color
    }
    
    // Suggest CSS custom property
    return 'var(--color-primary)';
  }

  private extractComponentName(line: string, framework: string): string {
    switch (framework) {
      case 'react':
        const reactMatch = line.match(/const\s+(\w+)|function\s+(\w+)|class\s+(\w+)/);
        return reactMatch ? (reactMatch[1] || reactMatch[2] || reactMatch[3] || 'Unknown') : 'Unknown';
        
      case 'vue':
        const vueMatch = line.match(/<(\w+)/);
        return vueMatch ? vueMatch[1] : 'Unknown';
        
      case 'svelte':
        const svelteMatch = line.match(/<(\w+)|<script>\s*(\w+)/);
        return svelteMatch ? (svelteMatch[1] || svelteMatch[2] || 'Unknown') : 'Unknown';
        
      default:
        return 'Unknown';
    }
  }

  private displayResults(result: ComponentLintResult) {
    console.log('\n📊 ComponentLint Results:');
    console.log('==================================');
    console.log(`🧩 Total Components: ${result.summary.totalComponents}`);
    console.log(`✅ Valid Components: ${result.summary.totalComponents - result.summary.violations}`);
    console.log(`❌ Violations: ${result.summary.violations}`);
    
    if (Object.keys(result.summary.frameworks).length > 0) {
      console.log('\n📱 Frameworks:');
      Object.entries(result.summary.frameworks).forEach(([framework, count]) => {
        console.log(`   • ${framework.charAt(0).toUpperCase() + framework.slice(1)}: ${count} violations`);
      });
    }
    
    if (result.violations.length > 0) {
      console.log('\n🚨 Component Violations:');
      
      // Group violations by file
      const violationsByFile = result.violations.reduce((acc, v) => {
        if (!acc[v.file]) acc[v.file] = [];
        acc[v.file].push(v);
        return acc;
      }, {} as { [key: string]: ComponentViolation[] });
      
      Object.entries(violationsByFile).forEach(([file, violations]) => {
        console.log(`\n📄 ${file}:`);
        violations.forEach(v => {
          console.log(`   • ${v.component} - ${v.prop}="${v.value}" (${v.issue})`);
          if (v.suggestion) {
            console.log(`     Suggestion: ${v.suggestion}`);
          }
        });
      });
      
      console.log('\n💡 Recommendations:');
      console.log('   • Use approved hex colors from the DuoPlus palette');
      console.log('   • Prefer CSS custom properties for consistency');
      console.log('   • Define color tokens in your theme system');
      console.log('   • Run with --fix to auto-correct common issues');
    }
    
    // Save detailed report
    const reportFile = this.config.output || 'componentlint-report.json';
    writeFileSync(reportFile, JSON.stringify(result, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportFile}`);
  }
}

// CLI execution
if (import.meta.main) {
  const args = process.argv.slice(2);
  const config: ComponentLintConfig = {
    colorsOnly: args.includes('--colors-only'),
    strict: args.includes('--strict'),
    frameworks: args.find(arg => arg.startsWith('--frameworks='))?.split('=')[1]?.split(','),
    output: args.find(arg => arg.startsWith('--output='))?.split('=')[1]
  };
  
  const componentlint = new ComponentLint(config);
  await componentlint.run();
}

export default ComponentLint;
