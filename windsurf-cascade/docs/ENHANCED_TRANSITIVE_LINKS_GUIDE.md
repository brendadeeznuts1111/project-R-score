# Enhanced Transitive Link Validator Guide

## Overview

The Enhanced Transitive Link Validator extends the original validator with support for **custom rules** and **dynamic tag weighting**, enabling domain-specific validation and intelligent confidence scoring.

## Key Enhancements

### 1. Dynamic Tag Weighting
Instead of treating all tags equally, you can assign weights based on importance:

```typescript
const tagWeights = [
    { tag: 'architecture', weight: 2.0, category: 'technical' },
    { tag: 'system', weight: 1.8, category: 'technical' },
    { tag: 'api', weight: 1.5, category: 'technical' },
    { tag: 'documentation', weight: 1.2, category: 'content' },
    { tag: 'guide', weight: 1.1, category: 'content' }
];
```

### 2. Custom Rule System
Define domain-specific validation rules with conditions and confidence modifiers:

```typescript
const customRule = {
    id: 'technical-boost',
    name: 'Technical Content Boost',
    description: 'Extra boost for technical documentation',
    priority: 5,
    condition: (source, target, via, sharedTags) => 
        sharedTags.some(tag => ['architecture', 'system', 'api'].includes(tag)),
    weightModifier: (base) => Math.min(1.0, base + 0.3),
    reasonTemplate: (source, target, via, sharedTags) => 
        `technical content: ${sharedTags.filter(t => ['architecture', 'system', 'api'].includes(t)).join(', ')}`
};
```

### 3. Configurable Thresholds
Set custom confidence thresholds for warnings and errors:

```typescript
const config = {
    ruleThresholds: {
        warning: 0.7,  // 70% confidence triggers warning
        error: 0.9     // 90% confidence triggers error
    }
};
```

## Usage Examples

### Basic Enhanced Setup

```typescript
import { EnhancedTransitiveLinkValidator } from './src/validators/transitive-links-enhanced';

const validator = new EnhancedTransitiveLinkValidator({
    minSharedTags: 2,
    maxDepth: 2,
    enableDynamicWeighting: true,
    tagWeights: [
        { tag: 'architecture', weight: 2.0 },
        { tag: 'system', weight: 1.8 }
    ]
});

const result = await validator.validate(node, graph);
console.log(`Found ${result.suggestions.length} enhanced suggestions`);
```

### Adding Custom Rules

```typescript
// Add a rule for project-specific patterns
validator.addCustomRule({
    id: 'project-series',
    name: 'Project Series Detection',
    description: 'Boost confidence for files in the same project series',
    priority: 10,
    condition: (source, target) => {
        const sourceProject = extractProjectName(source.path);
        const targetProject = extractProjectName(target.path);
        return sourceProject === targetProject && sourceProject !== null;
    },
    weightModifier: (base) => Math.min(1.0, base + 0.4),
    reasonTemplate: (source, target) => {
        const project = extractProjectName(source.path);
        return `same project series: ${project}`;
    }
});

function extractProjectName(path: string): string | null {
    const match = path.match(/^(\d{2} -[^\/]+)/);
    return match ? match[1] : null;
}
```

### Domain-Specific Configuration

```typescript
// For software documentation vaults
const softwareConfig = {
    tagWeights: [
        { tag: 'api', weight: 2.5, category: 'technical' },
        { tag: 'architecture', weight: 2.0, category: 'technical' },
        { tag: 'implementation', weight: 1.8, category: 'technical' },
        { tag: 'tutorial', weight: 1.5, category: 'learning' },
        { tag: 'example', weight: 1.3, category: 'learning' }
    ],
    customRules: [
        {
            id: 'api-series',
            name: 'API Documentation Series',
            priority: 8,
            condition: (source, target) => 
                source.path.includes('/API/') && target.path.includes('/API/'),
            weightModifier: (base) => Math.min(1.0, base + 0.35),
            reasonTemplate: () => 'API documentation series'
        }
    ]
};

const softwareValidator = new EnhancedTransitiveLinkValidator(softwareConfig);
```

### Research Vault Configuration

```typescript
// For academic/research vaults
const researchConfig = {
    tagWeights: [
        { tag: 'research', weight: 2.5, category: 'academic' },
        { tag: 'paper', weight: 2.0, category: 'academic' },
        { tag: 'methodology', weight: 1.8, category: 'academic' },
        { tag: 'theory', weight: 1.6, category: 'academic' },
        { tag: 'experiment', weight: 1.5, category: 'academic' }
    ],
    customRules: [
        {
            id: 'research-methodology',
            name: 'Research Methodology Link',
            priority: 9,
            condition: (source, target, via, sharedTags) => 
                sharedTags.includes('research') && 
                (source.path.includes('/Methodology/') || target.path.includes('/Methodology/')),
            weightModifier: (base) => Math.min(1.0, base + 0.4),
            reasonTemplate: () => 'research methodology connection'
        }
    ]
};
```

## Advanced Features

### Rule Effectiveness Analysis

```typescript
// Analyze which rules are most effective
const analysis = validator.analyzeVaultTransitivity(graph);

console.log('Rule Effectiveness:');
analysis.ruleEffectiveness.forEach(rule => {
    console.log(`${rule.ruleName}:`);
    console.log(`  - Triggered ${rule.triggerCount} times`);
    console.log(`  - Average confidence boost: ${(rule.averageConfidenceBoost * 100).toFixed(1)}%`);
    
    if (rule.triggerCount === 0) {
        console.log('  ⚠️  This rule never triggered - consider revising or removing');
    }
});
```

### Dynamic Configuration Updates

```typescript
// Update tag weights based on usage patterns
const updatedWeights = [
    { tag: 'architecture', weight: 2.2 }, // Increased importance
    { tag: 'system', weight: 1.8 },
    { tag: 'new-tag', weight: 1.5 }        // Newly added
];

validator.updateTagWeights(updatedWeights);

// Remove underperforming rules
const ruleStats = validator.analyzeRuleEffectiveness(graph);
ruleStats.forEach(stat => {
    if (stat.triggerCount < 3) { // Rules triggered less than 3 times
        validator.removeCustomRule(stat.ruleId);
        console.log(`Removed underperforming rule: ${stat.ruleName}`);
    }
});
```

### Confidence Threshold Tuning

```typescript
// Adjust thresholds based on vault characteristics
const vaultAnalysis = validator.analyzeVaultTransitivity(graph);
const avgConfidence = vaultAnalysis.averageConfidence;

if (avgConfidence > 0.8) {
    // High-quality vault, raise standards
    validator.setConfig({
        ruleThresholds: { warning: 0.8, error: 0.95 }
    });
} else if (avgConfidence < 0.6) {
    // Developing vault, lower standards
    validator.setConfig({
        ruleThresholds: { warning: 0.5, error: 0.7 }
    });
}
```

## Integration with Obsidian Plugin

```typescript
// In your Obsidian plugin main.ts
class VaultStandardsPlugin extends Plugin {
    private enhancedValidator: EnhancedTransitiveLinkValidator;

    async onload() {
        // Initialize with user settings
        const settings = await this.loadSettings();
        
        this.enhancedValidator = new EnhancedTransitiveLinkValidator({
            minSharedTags: settings.minSharedTags,
            maxDepth: settings.maxDepth,
            tagWeights: settings.tagWeights,
            customRules: settings.customRules,
            enableDynamicWeighting: settings.enableDynamicWeighting
        });

        // Add command for rule management
        this.addCommand({
            id: 'manage-validation-rules',
            name: 'Manage Validation Rules',
            callback: () => this.showRuleManagementModal()
        });
    }

    private showRuleManagementModal() {
        // Create UI for:
        // - Adding/removing custom rules
        // - Adjusting tag weights
        // - Configuring thresholds
        // - Viewing rule effectiveness
    }
}
```

## Best Practices

### 1. Tag Weight Design
- **Core concepts**: Weight 2.0+ (architecture, system, api)
- **Important topics**: Weight 1.5-1.9 (documentation, guide, tutorial)
- **General tags**: Weight 1.0-1.4 (note, draft, review)

### 2. Rule Priority System
- **Critical**: Priority 8-10 (domain-specific patterns)
- **Important**: Priority 5-7 (structural relationships)
- **Helpful**: Priority 1-4 (general improvements)

### 3. Condition Design
```typescript
// Good: Specific and meaningful
condition: (source, target) => 
    source.path.includes('/API/') && target.path.includes('/API/')

// Avoid: Too generic
condition: (source, target) => 
    source.path.length > 0 && target.path.length > 0
```

### 4. Confidence Modifiers
- **Conservative**: +0.1 to +0.2 (minor improvements)
- **Moderate**: +0.2 to +0.4 (significant relationships)
- **Aggressive**: +0.4 to +0.6 (strong domain signals)

## Performance Considerations

### Tag Weight Caching
The validator automatically caches tag weights for performance:
```typescript
// Weights are pre-calculated on initialization
validator.updateTagWeights(newWeights); // Recalculates cache
```

### Rule Optimization
```typescript
// Rules are sorted by priority automatically
validator.addCustomRule(lowPriorityRule);  // Added at end
validator.addCustomRule(highPriorityRule); // Automatically sorted to top
```

### Analysis Scoping
```typescript
// Limit analysis depth for large vaults
const validator = new EnhancedTransitiveLinkValidator({
    maxDepth: 1, // Reduce from default 2 for better performance
    minSharedTags: 3 // Higher threshold reduces false positives
});
```

## Migration from Original Validator

```typescript
// Original
const original = new TransitiveLinkValidator(2, 2);

// Enhanced (equivalent configuration)
const enhanced = new EnhancedTransitiveLinkValidator({
    minSharedTags: 2,
    maxDepth: 2,
    enableDynamicWeighting: false,
    customRules: [] // Use built-in rules only
});
```

The enhanced validator is **backward compatible** - it will work with the same parameters as the original while providing additional capabilities when configured.

## Troubleshooting

### Low Rule Trigger Rates
```typescript
// Debug rule conditions
const debugRule = {
    ...customRule,
    condition: (source, target, via, sharedTags) => {
        const result = originalCondition(source, target, via, sharedTags);
        if (!result) {
            console.log(`Rule ${ruleId} failed:`, {
                source: source.path,
                target: target.path,
                sharedTags
            });
        }
        return result;
    }
};
```

### Confidence Score Issues
```typescript
// Analyze confidence components
const suggestions = validator.findMissingTransitiveLinks(node, graph);
suggestions.forEach(suggestion => {
    console.log(`Suggestion: ${suggestion.to}`);
    console.log(`  Confidence: ${suggestion.confidence}`);
    console.log(`  Matched rules: ${suggestion.ruleMatches.join(', ')}`);
    console.log(`  Reason: ${suggestion.reason}`);
});
```

## Conclusion

The Enhanced Transitive Link Validator provides a powerful, extensible framework for intelligent vault validation. By combining dynamic tag weighting with custom rule systems, you can create domain-specific validation that adapts to your unique knowledge management needs.

The modular design ensures that the validator remains performant while offering sophisticated analysis capabilities that can evolve with your vault's requirements.
