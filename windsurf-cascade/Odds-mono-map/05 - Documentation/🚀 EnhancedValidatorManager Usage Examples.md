---
type: usage-example
title: 🚀 EnhancedValidatorManager Usage Examples
section: "04"
category: documentation
priority: medium
status: active
tags:
  - usage-example
  - validator
  - typescript
  - integration
created: 2025-11-18T15:30:00Z
updated: 2025-11-18T15:30:00Z
author: system
review-cycle: 30
---


# 🚀 EnhancedValidatorManager Usage Examples

## Overview

Brief description of this content.


> **Practical examples for integrating the EnhancedValidatorManager into your Obsidian vault**

---

## 🎯 Basic Setup

### **1. Initialize the Validator Manager**

```typescript
import { EnhancedValidatorManager } from './src/obsidian/enhanced-validator-integration';

// Configuration for the validator
const validatorSettings = {
    autoOptimize: true,
    config: {
        confidenceThreshold: 0.7,
        maxSuggestions: 10,
        enableAutoOptimization: true,
        customRules: [
            {
                id: 'project-dependencies',
                name: 'Project Dependencies',
                description: 'Ensure project files link to required documentation',
                priority: 1,
                condition: (node) => node.type === 'project',
                weightModifier: 1.5,
                reasonTemplate: 'Project should link to {missingDoc}'
            }
        ],
        tagWeights: [
            { tag: 'documentation', weight: 1.2 },
            { tag: 'project', weight: 1.5 },
            { tag: 'architecture', weight: 1.3 }
        ]
    }
};

// Initialize with your Obsidian app instance
const validator = new EnhancedValidatorManager(app, validatorSettings);
```

---

## 📊 Validation operations

### **2 . validate the entire vault**

```typescript
async function runVaultValidation() {
    try {
        const report = await validator.validateVault();
        
        console.log('📊 Validation Results:');
        console.log(`Total Files: ${report.totalFiles}`);
        console.log(`Valid Files: ${report.validFiles}`);
        console.log(`Issues Found: ${report.issuesFound}`);
        console.log(`Average Health Score: ${report.averageHealthScore.toFixed(1)}%`);
        
        // Display top issues
        if (report.topIssues.length > 0) {
            console.log('\n🚨 Top Issues:');
            report.topIssues.forEach(issue => {
                console.log(`  ${issue.type} (${issue.count}): ${issue.description}`);
            });
        }
        
        // Show recommendations
        if (report.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            report.recommendations.forEach(rec => {
                console.log(`  • ${rec}`);
            });
        }
        
        return report;
    } catch (error) {
        console.error('❌ Validation failed:', error);
        throw error;
    }
}

// Run validation
runVaultValidation();
```

### **3 . generate suggestions for a specific file**

```typescript
async function getFileSuggestions(filePath: string) {
    try {
        const suggestions = await validator.generateSuggestions(filePath);
        
        console.log(`🔗 Suggestions for ${filePath}:`);
        suggestions.forEach((suggestion, index) => {
            console.log(`  ${index + 1}. ${suggestion}`);
        });
        
        return suggestions;
    } catch (error) {
        console.error(`❌ Failed to generate suggestions for ${filePath}:`, error);
        throw error;
    }
}

// Example usage
getFileSuggestions('02 - Architecture/System Design/API Gateway Architecture.md');
```

---

## ⚙️ Configuration Management

### **4. Update Validator Settings**

```typescript
// Update configuration at runtime
validator.updateSettings({
    autoOptimize: false, // Disable auto-optimization
    config: {
        confidenceThreshold: 0.8, // Increase threshold
        maxSuggestions: 15,        // More suggestions
        customRules: [
            // Add new rule for API documentation
            {
                id: 'api-docs-completeness',
                name: 'API Documentation Completeness',
                description: 'Ensure API docs have endpoints and examples',
                priority: 2,
                condition: (node) => node.type === 'documentation' && 
                                 node.path.includes('api'),
                weightModifier: 1.8,
                reasonTemplate: 'API documentation should include {missingSection}'
            }
        ]
    }
});
```

### **5. Custom Rule Examples**

```typescript
// Rule for ensuring meeting notes have action items
const meetingActionItemsRule = {
    id: 'meeting-action-items',
    name: 'Meeting Action Items',
    description: 'Meeting notes should have action items section',
    priority: 1,
    condition: (node) => node.type === 'note' && 
                     node.path.includes('meeting'),
    weightModifier: 1.4,
    reasonTemplate: 'Meeting notes should include action items ({missingActionItems})'
};

// Rule for architectural diagrams
const architectureDiagramRule = {
    id: 'architecture-diagrams',
    name: 'Architecture Diagrams',
    description: 'System design files should include diagrams',
    priority: 2,
    condition: (node) => node.type === 'system-design',
    weightModifier: 1.6,
    reasonTemplate: 'System design should include architecture diagrams'
};
```

---

## 🔄 Integration with obsidian events

### **6 . set up real-time validation**

```typescript
import { Plugin, TFile } from 'obsidian';

export default class VaultValidatorPlugin extends Plugin {
    private validator: EnhancedValidatorManager;

    async onload() {
        // Initialize validator
        this.validator = new EnhancedValidatorManager(this.app, {
            autoOptimize: true,
            config: {
                confidenceThreshold: 0.7,
                maxSuggestions: 10,
                enableAutoOptimization: true
            }
        });

        // Register file modification event
        this.registerEvent(
            this.app.vault.on('modify', async (file) => {
                if (file instanceof TFile && file.extension === 'md') {
                    await this.validateFile(file);
                }
            })
        );

        // Add validation command
        this.addCommand({
            id: 'validate-vault',
            name: 'Validate Entire Vault',
            callback: async () => {
                const report = await this.validator.validateVault();
                this.showValidationReport(report);
            }
        });

        // Add suggestions command
        this.addCommand({
            id: 'generate-suggestions',
            name: 'Generate Link Suggestions',
            editorCallback: async (editor, view) => {
                const file = view.file;
                if (file) {
                    const suggestions = await this.validator.generateSuggestions(file.path);
                    this.showSuggestions(suggestions);
                }
            }
        });
    }

    private async validateFile(file: TFile) {
        try {
            const suggestions = await this.validator.generateSuggestions(file.path);
            if (suggestions.length > 0) {
                new Notice(`Found ${suggestions.length} suggestions for ${file.name}`);
            }
        } catch (error) {
            console.error('File validation failed:', error);
        }
    }

    private showValidationReport(report: ValidationReport) {
        // Create a modal or notice to display results
        new Notice(`Validation complete: ${report.validFiles}/${report.totalFiles} files valid`);
    }

    private showSuggestions(suggestions: string[]) {
        // Display suggestions in a modal or notice
        suggestions.forEach(suggestion => {
            new Notice(suggestion, 8000); // Show for 8 seconds
        });
    }
}
```

---

## 📈 Analytics and Monitoring

### **7. Monitor Validation Performance**

```typescript
async function monitorValidationPerformance() {
    const report = await validator.validateVault();
    
    // Extract analytics
    const analytics = report.analytics;
    
    console.log('📈 Validation Analytics:');
    analytics.forEach(rule => {
        console.log(`  ${rule.ruleName}:`);
        console.log(`    Trigger Count: ${rule.triggerCount}`);
        console.log(`    Effectiveness: ${rule.effectiveness}%`);
        console.log(`    Last Optimized: ${rule.lastOptimized}`);
    });
    
    // Identify underperforming rules
    const underperforming = analytics.filter(rule => 
        rule.effectiveness < 50 && rule.triggerCount > 5
    );
    
    if (underperforming.length > 0) {
        console.log('\n⚠️ Underperforming Rules:');
        underperforming.forEach(rule => {
            console.log(`  • ${rule.ruleName} (${rule.effectiveness}% effectiveness)`);
        });
    }
    
    return analytics;
}
```

### **8. Health Score Tracking**

```typescript
class VaultHealthTracker {
    private validator: EnhancedValidatorManager;
    private healthHistory: Array<{ timestamp: Date; score: number }> = [];

    constructor(validator: EnhancedValidatorManager) {
        this.validator = validator;
    }

    async trackHealthScore() {
        const report = await this.validator.validateVault();
        
        this.healthHistory.push({
            timestamp: new Date(),
            score: report.averageHealthScore
        });

        // Keep only last 30 entries
        if (this.healthHistory.length > 30) {
            this.healthHistory.shift();
        }

        return this.getHealthTrend();
    }

    private getHealthTrend(): {
        current: number;
        trend: 'improving' | 'declining' | 'stable';
        change: number;
    } {
        const current = this.healthHistory[this.healthHistory.length - 1];
        const previous = this.healthHistory[this.healthHistory.length - 2];
        
        if (!previous) {
            return {
                current: current.score,
                trend: 'stable',
                change: 0
            };
        }

        const change = current.score - previous.score;
        let trend: 'improving' | 'declining' | 'stable';
        
        if (change > 2) trend = 'improving';
        else if (change < -2) trend = 'declining';
        else trend = 'stable';

        return { current: current.score, trend, change };
    }
}

// Usage
const healthTracker = new VaultHealthTracker(validator);
setInterval(async () => {
    const trend = await healthTracker.trackHealthScore();
    console.log(`🏥 Vault Health: ${trend.current.toFixed(1)}% (${trend.trend}, ${trend.change > 0 ? '+' : ''}${trend.change.toFixed(1)}%)`);
}, 60000); // Check every minute
```

---

## 🔧 Advanced integration

### **9 . custom validation pipeline**

```typescript
class CustomValidationPipeline {
    private validator: EnhancedValidatorManager;
    private preProcessors: Array<(content: string) => string> = [];
    private postProcessors: Array<(report: ValidationReport) => ValidationReport> = [];

    constructor(validator: EnhancedValidatorManager) {
        this.validator = validator;
    }

    addPreProcessor(processor: (content: string) => string) {
        this.preProcessors.push(processor);
    }

    addPostProcessor(processor: (report: ValidationReport) => ValidationReport) {
        this.postProcessors.push(processor);
    }

    async runValidation(): Promise<ValidationReport> {
        // Apply pre-processors
        console.log('🔧 Applying pre-processors...');
        
        // Run validation
        let report = await this.validator.validateVault();
        
        // Apply post-processors
        console.log('🔧 Applying post-processors...');
        for (const processor of this.postProcessors) {
            report = processor(report);
        }
        
        return report;
    }
}

// Example usage with custom processors
const pipeline = new CustomValidationPipeline(validator);

// Add post-processor to enhance recommendations
pipeline.addPostProcessor((report) => {
    // Add custom recommendation based on vault size
    if (report.totalFiles > 100) {
        report.recommendations.push('Consider organizing large vault into sub-folders');
    }
    
    return report;
});

// Run enhanced validation
const enhancedReport = await pipeline.runValidation();
```

### **10 . integration with external systems**

```typescript
class ExternalSystemIntegration {
    private validator: EnhancedValidatorManager;
    private webhookUrl: string;

    constructor(validator: EnhancedValidatorManager, webhookUrl: string) {
        this.validator = validator;
        this.webhookUrl = webhookUrl;
    }

    async validateAndNotify() {
        const report = await this.validator.validateVault();
        
        // Send report to external system
        await this.sendToWebhook(report);
        
        // Update dashboard
        await this.updateDashboard(report);
        
        return report;
    }

    private async sendToWebhook(report: ValidationReport) {
        const payload = {
            timestamp: new Date().toISOString(),
            vaultHealth: {
                totalFiles: report.totalFiles,
                validFiles: report.validFiles,
                healthScore: report.averageHealthScore,
                issuesCount: report.issuesFound
            },
            topIssues: report.topIssues.slice(0, 3),
            recommendations: report.recommendations
        };

        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`Webhook failed: ${response.statusText}`);
            }
            
            console.log('✅ Report sent to external system');
        } catch (error) {
            console.error('❌ Failed to send webhook:', error);
        }
    }

    private async updateDashboard(report: ValidationReport) {
        // Update external dashboard with validation results
        // Implementation depends on your dashboard system
        console.log('📊 Updating dashboard with validation results...');
    }
}
```

---

## 🎯 Best Practices

### **11. Performance Optimization**

```typescript
// Batch validation for large vaults
async function batchValidation(validator: EnhancedValidatorManager, batchSize: number = 50) {
    const files = validator.app.vault.getMarkdownFiles();
    const results: ValidationReport[] = [];
    
    for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(files.length / batchSize)}`);
        
        // Validate batch
        for (const file of batch) {
            const suggestions = await validator.generateSuggestions(file.path);
            if (suggestions.length > 0) {
                console.log(`  ${file.name}: ${suggestions.length} suggestions`);
            }
        }
        
        // Small delay to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
}
```

### **12. Error Handling and Recovery**

```typescript
async function robustValidation(validator: EnhancedValidatorManager, maxRetries: number = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Validation attempt ${attempt}/${maxRetries}`);
            const report = await validator.validateVault();
            
            if (report.averageHealthScore > 80) {
                console.log('✅ Validation successful with good health score');
                return report;
            }
            
            console.log(`⚠️ Validation completed with low health score: ${report.averageHealthScore.toFixed(1)}%`);
            return report;
            
        } catch (error) {
            console.error(`❌ Validation attempt ${attempt} failed:`, error);
            
            if (attempt === maxRetries) {
                throw new Error(`Validation failed after ${maxRetries} attempts: ${error.message}`);
            }
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
    }
    
    throw new Error('Unexpected error in validation');
}
```

---

## 🏆 Summary

The EnhancedValidatorManager provides a **powerful, flexible API** for vault validation with:

- **🎯 Simple Interface**: Easy to initialize and use
- **⚡ High Performance**: Optimized for large vaults
- **🔧 Extensible Configuration**: Custom rules and settings
- **📊 Rich Analytics**: Detailed validation reports
- **🔄 Real-time Updates**: Event-driven validation
- **🏥 Health Monitoring**: Continuous vault health tracking

**Key Benefits:**
1. **Improved Content Quality**: Automated validation catches issues early
2. **Better Connectivity**: Smart link suggestions improve vault navigation
3. **Performance Insights**: Analytics help optimize vault structure
4. **Customizable Rules**: Adapt validation to your specific needs
5. **Integration Ready**: Works seamlessly with Obsidian plugins

---

**🚀 Usage Examples Complete** • **EnhancedValidatorManager v2.0** • **Last Updated**: {{date:YYYY-MM-DDTHH:mm:ssZ}}

> *These examples demonstrate the flexibility and power of the EnhancedValidatorManager for building sophisticated vault validation systems.*
