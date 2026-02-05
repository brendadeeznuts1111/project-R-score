#!/usr/bin/env bun
/**
 * [DOMAIN][VAULT][TYPE][MAINTENANCE][SCOPE][OPTIMIZATION][META][CARE][#REF]template-wizard
 * 
 * Template Wizard
 * Template management script
 * 
 * @fileoverview Ongoing maintenance and optimization tools
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category maintenance
 * @tags maintenance,template,structure
 */

#!/usr/bin/env bun

/**
 * Template Creation Wizard
 * Interactive wizard for creating consistent templates with proper structure
 * 
 * @fileoverview Automated template creation with validation and standards
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';

interface TemplateConfig {
    name: string;
    type: VaultDocumentType;
    category: string;
    section: string;
    priority: 'low' | 'medium' | 'high';
    description: string;
    tags: string[];
    includeExamples: boolean;
    includeSections: string[];
}

interface VaultDocumentType {
    NOTE: 'note';
    API_DOC: 'api-doc';
    DOCUMENTATION: 'documentation';
    PROJECT_PLAN: 'project-plan';
    MEETING_NOTES: 'meeting-notes';
    RESEARCH: 'research';
    TEMPLATE: 'template';
    SPECIFICATION: 'specification';
    GUIDE: 'guide';
    DASHBOARD: 'dashboard';
}

class TemplateCreationWizard {
    private vaultPath: string;
    private templatesDir: string;
    private config: TemplateConfig;

    constructor(vaultPath: string) {
        this.vaultPath = vaultPath;
        this.templatesDir = join(vaultPath, '06 - Templates');
        this.config = this.getDefaultConfig();
    }

    /**
     * Run the interactive template creation wizard
     */
    async runWizard(): Promise<void> {
        console.log(chalk.blue.bold('🧙‍♂️ Template Creation Wizard'));
        console.log(chalk.gray('Create consistent, standards-compliant templates\n'));

        try {
            await this.collectUserInput();
            await this.validateConfig();
            const template = await this.generateTemplate();
            await this.saveTemplate(template);

            console.log(chalk.green.bold('\n🎉 Template created successfully!'));
            console.log(chalk.cyan(`📍 Location: ${this.getTemplatePath()}`));

        } catch (error) {
            console.error(chalk.red(`❌ Error: ${error.message}`));
            process.exit(1);
        }
    }

    /**
     * Get default configuration
     */
    private getDefaultConfig(): TemplateConfig {
        return {
            name: '',
            type: 'template' as VaultDocumentType,
            category: 'general',
            section: '06',
            priority: 'medium',
            description: '',
            tags: ['template', 'documentation'],
            includeExamples: true,
            includeSections: ['Overview', 'Usage', 'Examples']
        };
    }

    /**
     * Collect user input interactively
     */
    private async collectUserInput(): Promise<void> {
        // Template name
        this.config.name = await this.promptInput('📝 Template name (without spaces): ');

        // Template type
        const types = ['template', 'documentation', 'guide', 'note', 'api-doc', 'project-plan', 'meeting-notes', 'research', 'specification', 'dashboard'];
        const typeIndex = await this.promptSelect('📋 Template type:', types);
        this.config.type = types[typeIndex] as VaultDocumentType;

        // Category
        this.config.category = await this.promptInput('🏷️  Category (e.g., development, design, system): ');

        // Section (auto-detect or manual)
        const sections = ['01', '02', '03', '04', '05', '06', '10'];
        const sectionIndex = await this.promptSelect('📁 Section:', [...sections, 'auto-detect']);
        this.config.section = sectionIndex === sections.length ? this.detectSection() : sections[sectionIndex];

        // Priority
        const priorities = ['low', 'medium', 'high'];
        const priorityIndex = await this.promptSelect('⚡ Priority:', priorities);
        this.config.priority = priorities[priorityIndex] as 'low' | 'medium' | 'high';

        // Description
        this.config.description = await this.promptInput('📄 Short description: ');

        // Tags
        const tagInput = await this.promptInput('🏷️  Tags (comma-separated): ');
        this.config.tags = ['template', ...tagInput.split(',').map(t => t.trim()).filter(t => t)];

        // Include examples
        this.config.includeExamples = await this.promptConfirm('💡 Include usage examples?');

        // Additional sections
        const availableSections = ['Overview', 'Usage', 'Examples', 'Configuration', 'Troubleshooting', 'FAQ', 'References'];
        const selectedSections = await this.promptMultiSelect('📑 Include sections:', availableSections);
        this.config.includeSections = selectedSections;
    }

    /**
     * Validate the configuration
     */
    private async validateConfig(): Promise<void> {
        if (!this.config.name.trim()) {
            throw new Error('Template name is required');
        }

        if (this.config.name.includes(' ')) {
            throw new Error('Template name cannot contain spaces');
        }

        if (!this.config.category.trim()) {
            throw new Error('Category is required');
        }

        if (this.config.tags.length < 2) {
            throw new Error('At least 2 tags are required');
        }

        // Check if template already exists
        const templatePath = this.getTemplatePath();
        try {
            await readFile(templatePath, 'utf-8');
            throw new Error(`Template already exists: ${templatePath}`);
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }

    /**
     * Generate the template content
     */
    private async generateTemplate(): Promise<string> {
        const frontmatter = this.generateFrontmatter();
        const content = this.generateContent();

        return frontmatter + '\n' + content;
    }

    /**
     * Generate YAML frontmatter
     */
    private generateFrontmatter(): string {
        const now = new Date();
        const isoDate = now.toISOString().split('T')[0] + 'T' + now.toTimeString().split(' ')[0] + 'Z';
        const reviewDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T' + new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toTimeString().split(' ')[0] + 'Z';

        let frontmatter = `---
type: ${this.config.type}
title: ${this.generateTitle()}
section: "${this.config.section}"
category: ${this.config.category}
priority: ${this.config.priority}
status: active
tags:
${this.config.tags.map(tag => `  - ${tag}`).join('\n')}
created: ${isoDate}
updated: ${isoDate}
author: system
review-date: ${reviewDate}
---`;

        return frontmatter;
    }

    /**
     * Generate template content
     */
    private generateContent(): string {
        let content = '';

        for (const section of this.config.includeSections) {
            content += this.generateSection(section) + '\n\n';
        }

        return content;
    }

    /**
     * Generate a specific section
     */
    private generateSection(sectionName: string): string {
        switch (sectionName) {
            case 'Overview':
                return `## 📋 Overview

> **📝 Purpose**: ${this.config.description}
> **🎯 Objectives**: Key goals and outcomes for this template
> **👥 Audience**: Who this template is designed for
> **📊 Complexity**: Medium | **⏱️  Setup Time**: 5-10 minutes

### **Key Features**
- ✅ Feature 1: Description of key capability
- ✅ Feature 2: Description of key capability  
- ✅ Feature 3: Description of key capability`;

            case 'Usage':
                return `## 🚀 Usage

### **Quick Start**
\`\`\`bash
# Basic usage example
${this.config.name.toLowerCase()} --init
\`\`\`

### **Configuration**
\`\`\`yaml
# Configuration example
setting: value
option: enabled
\`\`\`

### **Common Commands**
| Command | Description | Example |
|---------|-------------|---------|
| \`init\` | Initialize template | \`${this.config.name.toLowerCase()} --init\` |
| \`validate\` | Validate configuration | \`${this.config.name.toLowerCase()} --validate\` |
| \`deploy\` | Deploy template | \`${this.config.name.toLowerCase()} --deploy\` |`;

            case 'Examples':
                if (!this.config.includeExamples) return '';
                return `## 💡 Examples

### **Basic Example**
\`\`\`typescript
// Basic implementation
const template = new ${this.capitalizeFirst(this.config.name)}();
template.configure({
  option: 'value'
});
\`\`\`

### **Advanced Example**
\`\`\`typescript
// Advanced implementation with all options
const template = new ${this.capitalizeFirst(this.config.name)}({
  autoOptimize: true,
  validation: 'strict',
  performance: 'high'
});
\`\`\`

### **Real-world Usage**
- **Use Case 1**: Description of real-world application
- **Use Case 2**: Description of real-world application
- **Use Case 3**: Description of real-world application`;

            case 'Configuration':
                return `## ⚙️ Configuration

### **Required Settings**
\`\`\`json
{
  "name": "${this.config.name}",
  "type": "${this.config.type}",
  "version": "1.0.0"
}
\`\`\`

### **Optional Settings**
\`\`\`json
{
  "optimization": {
    "enabled": true,
    "level": "medium"
  },
  "validation": {
    "strict": false,
    "warnings": true
  }
}
\`\`\`

### **Environment Variables**
\`\`\`bash
export ${this.config.name.toUpperCase()}_CONFIG_PATH="./config"
export ${this.config.name.toUpperCase()}_DEBUG=false
\`\`\``;

            case 'Troubleshooting':
                return `## 🔧 Troubleshooting

### **Common Issues**

#### **Issue: Template not found**
**Solution**: Ensure the template is in the correct directory
\`\`\`bash
# Check template location
ls -la 06 - Templates/
\`\`\`

#### **Issue: Configuration validation failed**
**Solution**: Verify YAML syntax and required fields
\`\`\`bash
# Validate configuration
bun scripts/validate-template.ts ${this.config.name}.md
\`\`\`

### **Error Codes**
| Code | Description | Solution |
|------|-------------|----------|
| 001 | Template not found | Check file path |
| 002 | Invalid configuration | Validate YAML syntax |
| 003 | Missing dependencies | Install required packages |`;

            case 'FAQ':
                return `## ❓ FAQ

### **General Questions**

**Q: How do I customize this template?**
A: Modify the configuration file and update the frontmatter as needed.

**Q: Can I use this template for other projects?**
A: Yes, this template is designed to be reusable across different projects.

**Q: What are the system requirements?**
A: This template requires Bun runtime and Node.js 18+.

### **Technical Questions**

**Q: How do I optimize performance?**
A: Use the built-in optimization flags and monitor with the performance dashboard.

**Q: Can I extend this template?**
A: Yes, you can add custom sections and modify the existing structure.`;

            case 'References':
                return `## 📚 References

### **Documentation**
- [Template System Guide](./Template-System-Guide.md)
- [Configuration Reference](./Configuration-Reference.md)
- [Best Practices](./Best-Practices.md)

### **API Documentation**
- [Template API](./API/Template-API.md)
- [Configuration API](./API/Configuration-API.md)

### **Related Templates**
- [[${this.config.name}-Advanced]] - Advanced version with additional features
- [[${this.config.name}-Simple]] - Simplified version for basic use cases

### **External Resources**
- [Official Documentation](https://docs.example.com)
- [Community Forum](https://community.example.com)
- [GitHub Repository](https://github.com/example/template)`;

            default:
                return `## ${sectionName}

Content for ${sectionName} section.`;
        }
    }

    /**
     * Get the template file path
     */
    private getTemplatePath(): string {
        const fileName = `${this.config.name}-Template.md`;
        return join(this.templatesDir, fileName);
    }

    /**
     * Save the template to file
     */
    private async saveTemplate(content: string): Promise<void> {
        const templatePath = this.getTemplatePath();
        await writeFile(templatePath, content, 'utf-8');
    }

    /**
     * Generate title from config
     */
    private generateTitle(): string {
        return `${this.capitalizeFirst(this.config.name)} Template`;
    }

    /**
     * Capitalize first letter
     */
    private capitalizeFirst(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Detect section from template type and category
     */
    private detectSection(): string {
        if (this.config.type === 'note' || this.config.type === 'meeting-notes') return '01';
        if (this.config.type === 'api-doc' || this.config.type === 'specification') return '02';
        if (this.config.category.includes('development') || this.config.category.includes('code')) return '03';
        if (this.config.type === 'documentation' || this.config.type === 'guide') return '04';
        if (this.config.category.includes('asset') || this.config.category.includes('resource')) return '05';
        return '06'; // Default to templates
    }

    // =============================================================================
    // PROMPT HELPERS
    // =============================================================================

    private async promptInput(message: string): Promise<string> {
        console.log(chalk.cyan(message));
        process.stdout.write('> ');

        return new Promise((resolve) => {
            process.stdin.once('data', (data) => {
                resolve(data.toString().trim());
            });
        });
    }

    private async promptSelect(message: string, options: string[]): Promise<number> {
        console.log(chalk.cyan(message));
        options.forEach((option, index) => {
            console.log(chalk.gray(`  ${index + 1}. ${option}`));
        });

        process.stdout.write('> ');

        return new Promise((resolve) => {
            process.stdin.once('data', (data) => {
                const choice = parseInt(data.toString().trim());
                resolve(Math.max(0, Math.min(options.length - 1, choice - 1)));
            });
        });
    }

    private async promptConfirm(message: string): Promise<boolean> {
        console.log(chalk.cyan(`${message} (y/n)`));
        process.stdout.write('> ');

        return new Promise((resolve) => {
            process.stdin.once('data', (data) => {
                const answer = data.toString().trim().toLowerCase();
                resolve(answer === 'y' || answer === 'yes');
            });
        });
    }

    private async promptMultiSelect(message: string, options: string[]): Promise<string[]> {
        console.log(chalk.cyan(`${message} (comma-separated numbers)`));
        options.forEach((option, index) => {
            console.log(chalk.gray(`  ${index + 1}. ${option}`));
        });

        process.stdout.write('> ');

        return new Promise((resolve) => {
            process.stdin.once('data', (data) => {
                const selected = data.toString().trim();
                if (selected === 'all') {
                    resolve(options);
                } else {
                    const indices = selected.split(',').map(i => parseInt(i.trim()) - 1);
                    resolve(indices.filter(i => i >= 0 && i < options.length).map(i => options[i]));
                }
            });
        });
    }
}

// =============================================================================
// CLI INTERFACE
// =============================================================================

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const vaultPath = process.cwd();

    if (args.includes('--help') || args.includes('-h')) {
        console.log(chalk.blue.bold('🧙‍♂️ Template Creation Wizard'));
        console.log(chalk.gray('Usage: bun template-wizard.ts [options]'));
        console.log(chalk.gray('\nOptions:'));
        console.log(chalk.gray('  --help, -h   Show this help message'));
        console.log(chalk.gray('\nInteractive wizard for creating standards-compliant templates'));
        process.exit(0);
    }

    // Enable stdin for interactive input
    process.stdin.setEncoding('utf8');
    process.stdin.resume();

    try {
        const wizard = new TemplateCreationWizard(vaultPath);
        await wizard.runWizard();

    } catch (error) {
        console.error(chalk.red(`❌ Error: ${error.message}`));
        process.exit(1);
    } finally {
        process.stdin.pause();
    }
}

// =============================================================================
// EXECUTION
// =============================================================================

if (import.meta.main) {
    main().catch(console.error);
}

export { TemplateCreationWizard, type TemplateConfig, type VaultDocumentType };
