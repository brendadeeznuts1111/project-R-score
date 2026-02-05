#!/usr/bin/env bun
/**
 * [DOMAIN][DEMO][TYPE][DEMONSTRATION][SCOPE][FEATURE][META][EXAMPLE][#REF]quick-template-demo
 * 
 * Quick Template Demo
 * Demonstration script for feature showcase
 * 
 * @fileoverview Feature demonstration and reference implementation
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category demos
 * @tags demos,demonstration,example,template,structure
 */

#!/usr/bin/env bun

/**
 * Quick Template Creator
 * Non-interactive template creation for demonstration
 * 
 * @fileoverview Quick template creation with predefined config
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-18
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';

interface QuickTemplateConfig {
    name: string;
    type: string;
    category: string;
    description: string;
    tags: string[];
}

class QuickTemplateCreator {
    private vaultPath: string;
    private templatesDir: string;

    constructor(vaultPath: string) {
        this.vaultPath = vaultPath;
        this.templatesDir = join(vaultPath, '06 - Templates');
    }

    /**
     * Create a template quickly with predefined config
     */
    async createTemplate(config: QuickTemplateConfig): Promise<void> {
        console.log(chalk.blue.bold('⚡ Quick Template Creator'));
        console.log(chalk.cyan(`Creating: ${config.name} Template\n`));

        try {
            const template = this.generateTemplate(config);
            const templatePath = this.getTemplatePath(config.name);

            // Check if template already exists
            try {
                await readFile(templatePath, 'utf-8');
                console.log(chalk.yellow(`⚠️  Template already exists: ${config.name}-Template.md`));
                return;
            } catch (error: any) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }

            await writeFile(templatePath, template, 'utf-8');

            console.log(chalk.green.bold('✅ Template created successfully!'));
            console.log(chalk.cyan(`📍 Location: ${templatePath}`));
            console.log(chalk.gray(`📊 Type: ${config.type} | 🏷️  Category: ${config.category}`));

        } catch (error) {
            console.error(chalk.red(`❌ Error: ${error.message}`));
            throw error;
        }
    }

    /**
     * Generate template content
     */
    private generateTemplate(config: QuickTemplateConfig): string {
        const now = new Date();
        const isoDate = now.toISOString().split('T')[0] + 'T' + now.toTimeString().split(' ')[0] + 'Z';
        const reviewDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T' + new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toTimeString().split(' ')[0] + 'Z';

        const frontmatter = `---
type: ${config.type}
title: ${this.capitalizeFirst(config.name)} Template
section: "06"
category: ${config.category}
priority: medium
status: active
tags:
${config.tags.map(tag => `  - ${tag}`).join('\n')}
created: ${isoDate}
updated: ${isoDate}
author: system
review-date: ${reviewDate}
---

## 📋 Overview

> **📝 Purpose**: ${config.description}
> **🎯 Objectives**: Key goals and outcomes for this template
> **👥 Audience**: Who this template is designed for
> **📊 Complexity**: Medium | **⏱️  Setup Time**: 5-10 minutes

### **Key Features**
- ✅ **Standardized Structure**: Follows vault template standards
- ✅ **Type Safety**: Compatible with VaultDocumentType system
- ✅ **Performance Optimized**: Efficient rendering and processing
- ✅ **Extensible**: Easy to customize and extend

## 🚀 Usage

### **Quick Start**
\`\`\`bash
# Basic usage example
${config.name.toLowerCase()} --init
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
| \`init\` | Initialize template | \`${config.name.toLowerCase()} --init\` |
| \`validate\` | Validate configuration | \`${config.name.toLowerCase()} --validate\` |
| \`deploy\` | Deploy template | \`${config.name.toLowerCase()} --deploy\` |

## 💡 Examples

### **Basic Example**
\`\`\`typescript
// Basic implementation
const template = new ${this.capitalizeFirst(config.name)}();
template.configure({
  option: 'value'
});
\`\`\`

### **Advanced Example**
\`\`\`typescript
// Advanced implementation with all options
const template = new ${this.capitalizeFirst(config.name)}({
  autoOptimize: true,
  validation: 'strict',
  performance: 'high'
});
\`\`\`

### **Real-world Usage**
- **Use Case 1**: ${config.description} for development workflows
- **Use Case 2**: ${config.description} for production environments
- **Use Case 3**: ${config.description} for testing and validation

## ⚙️ Configuration

### **Required Settings**
\`\`\`json
{
  "name": "${config.name}",
  "type": "${config.type}",
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

## 🔧 Troubleshooting

### **Common Issues**

#### **Issue: Template not found**
**Solution**: Ensure the template is in the correct directory
\`\`\`bash
# Check template location
ls -la "06 - Templates/"
\`\`\`

#### **Issue: Configuration validation failed**
**Solution**: Verify YAML syntax and required fields
\`\`\`bash
# Validate configuration
bun run vault:validate
\`\`\`

## 📚 References

### **Documentation**
- [Template System Guide](./Template-System-Guide.md)
- [Configuration Reference](./Configuration-Reference.md)
- [Best Practices](./Best-Practices.md)

### **Related Templates**
- [[${config.name}-Advanced]] - Advanced version with additional features
- [[${config.name}-Simple]] - Simplified version for basic use cases

---

## 🏷️ Tags

\`${config.tags.join('` `')}\`

---

**📊 Document Status**: Active | **🔄 Last Updated**: {{date:YYYY-MM-DD}} | **⏭️ Next Review**: {{date:YYYY-MM-DD}}`;

        return frontmatter;
    }

    /**
     * Get the template file path
     */
    private getTemplatePath(name: string): string {
        const fileName = `${name}-Template.md`;
        return join(this.templatesDir, fileName);
    }

    /**
     * Capitalize first letter
     */
    private capitalizeFirst(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// =============================================================================
// DEMO EXECUTION
// =============================================================================

async function runDemo(): Promise<void> {
    const vaultPath = process.cwd();
    const creator = new QuickTemplateCreator(vaultPath);

    // Demo template configurations
    const demoTemplates: QuickTemplateConfig[] = [
        {
            name: 'Analytics-Dashboard',
            type: 'dashboard',
            category: 'analytics',
            description: 'Comprehensive analytics dashboard template with real-time metrics and data visualization',
            tags: ['dashboard', 'analytics', 'metrics', 'visualization', 'template']
        },
        {
            name: 'API-Integration',
            type: 'api-doc',
            category: 'development',
            description: 'API integration template with authentication, error handling, and response validation',
            tags: ['api', 'integration', 'development', 'authentication', 'template']
        },
        {
            name: 'Research-Notebook',
            type: 'research',
            category: 'research',
            description: 'Structured research notebook template for experiments, findings, and documentation',
            tags: ['research', 'notebook', 'experiments', 'findings', 'template']
        }
    ];

    console.log(chalk.blue.bold('🎭 Template Creation Demo'));
    console.log(chalk.gray('Creating 3 demo templates with the wizard system\n'));

    for (const templateConfig of demoTemplates) {
        await creator.createTemplate(templateConfig);
        console.log(''); // Add spacing between templates
    }

    console.log(chalk.green.bold('🎉 Demo completed!'));
    console.log(chalk.cyan('All templates created with consistent structure and standards'));
}

if (import.meta.main) {
    runDemo().catch(console.error);
}

export { QuickTemplateCreator, type QuickTemplateConfig };
