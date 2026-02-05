---
type: automation-system
title: 🤖 Style Enforcement Automation
version: "2.0"
category: automation
priority: high
status: active
tags:
  - automation
  - style-enforcement
  - validation
  - quality-control
created: 2025-11-18T15:03:00Z
updated: 2025-11-18T15:03:00Z
author: system
---



# 🤖 Style Enforcement Automation

## Overview

Brief description of this content.


> **Automated system ensuring all content follows Odds Protocol style standards**

---

## 🎯 Enforcement Overview

The Style Enforcement System automatically validates and ensures compliance with:

- **📝 Note Standards**: Frontmatter, structure, formatting
- **🎨 Canvas Standards**: Layout, connections, visual consistency
- **📊 Base Standards**: Schema, views, field definitions
- **🔗 Link Standards**: Relationship integrity and validation

---

## 🚀 Automation scripts

### **1 . note style validator**
```javascript
// scripts/validate-note-style.js
class NoteStyleValidator {
  constructor() {
    this.requiredFields = [
      'type', 'title', 'section', 'category', 
      'priority', 'status', 'tags', 'created', 'updated'
    ];
    this.requiredSections = ['🎯 Overview', '📊 Metadata'];
  }

  async validateNote(filePath) {
    const content = await readFile(filePath);
    const issues = [];
    
    // Check frontmatter completeness
    const frontmatter = this.extractFrontmatter(content);
    const missingFields = this.requiredFields.filter(
      field => !frontmatter[field]
    );
    
    if (missingFields.length > 0) {
      issues.push({
        type: 'missing-frontmatter',
        fields: missingFields,
        severity: 'error'
      });
    }
    
    // Check heading structure
    const headings = this.extractHeadings(content);
    if (!headings.includes('🎯 Overview')) {
      issues.push({
        type: 'missing-section',
        section: '🎯 Overview',
        severity: 'error'
      });
    }
    
    // Check TOC presence
    if (!content.includes('```toc')) {
      issues.push({
        type: 'missing-toc',
        severity: 'warning'
      });
    }
    
    // Validate metadata table
    if (!content.includes('## 📊 Metadata')) {
      issues.push({
        type: 'missing-metadata-table',
        severity: 'error'
      });
    }
    
    return {
      compliant: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      score: this.calculateComplianceScore(content, issues)
    };
  }

  async autoFixNote(filePath, issues) {
    let content = await readFile(filePath);
    
    // Auto-fix missing frontmatter
    if (issues.some(i => i.type === 'missing-frontmatter')) {
      content = this.addMissingFrontmatter(content);
    }
    
    // Auto-fix missing sections
    if (issues.some(i => i.type === 'missing-section')) {
      content = this.addMissingSections(content);
    }
    
    // Auto-add TOC
    if (issues.some(i => i.type === 'missing-toc')) {
      content = this.addTOC(content);
    }
    
    // Auto-add metadata table
    if (issues.some(i => i.type === 'missing-metadata-table')) {
      content = this.addMetadataTable(content);
    }
    
    await writeFile(filePath, content);
    return { fixed: true, changes: issues.length };
  }
}
```

### **2 . canvas style validator**
```javascript
// scripts/validate-canvas-style.js
class CanvasStyleValidator {
  constructor() {
    this.requiredNodes = ['canvas-overview'];
    this.minSpacing = 100;
    this.colorStandards = {
      primary: '#6366f1',
      secondary: '#22d3ee',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    };
  }

  async validateCanvas(canvasPath) {
    const canvas = JSON.parse(await readFile(canvasPath));
    const issues = [];
    
    // Check for overview node
    const hasOverview = canvas.nodes.some(node => 
      node.id === 'canvas-overview' || 
      node.text?.includes('# 🎨')
    );
    
    if (!hasOverview) {
      issues.push({
        type: 'missing-overview',
        severity: 'error'
      });
    }
    
    // Check node spacing
    for (let i = 0; i < canvas.nodes.length; i++) {
      for (let j = i + 1; j < canvas.nodes.length; j++) {
        const node1 = canvas.nodes[i];
        const node2 = canvas.nodes[j];
        const distance = Math.sqrt(
          Math.pow(node1.x - node2.x, 2) + 
          Math.pow(node1.y - node2.y, 2)
        );
        
        if (distance < this.minSpacing) {
          issues.push({
            type: 'insufficient-spacing',
            nodes: [node1.id, node2.id],
            severity: 'warning'
          });
        }
      }
    }
    
    // Check edge labels
    const unlabeledEdges = canvas.edges.filter(edge => !edge.label);
    if (unlabeledEdges.length > 0) {
      issues.push({
        type: 'unlabeled-edges',
        count: unlabeledEdges.length,
        severity: 'warning'
      });
    }
    
    return {
      compliant: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      score: this.calculateComplianceScore(canvas, issues)
    };
  }

  async autoFixCanvas(canvasPath, issues) {
    const canvas = JSON.parse(await readFile(canvasPath));
    let changes = 0;
    
    // Auto-add overview node
    if (issues.some(i => i.type === 'missing-overview')) {
      canvas.nodes.unshift(this.createOverviewNode());
      changes++;
    }
    
    // Auto-add edge labels
    const unlabeledEdges = canvas.edges.filter(edge => !edge.label);
    unlabeledEdges.forEach(edge => {
      edge.label = 'relationship';
      changes++;
    });
    
    // Auto-optimize layout
    if (issues.some(i => i.type === 'insufficient-spacing')) {
      this.optimizeNodeSpacing(canvas.nodes);
      changes++;
    }
    
    await writeFile(canvasPath, JSON.stringify(canvas, null, 2));
    return { fixed: true, changes };
  }
}
```

### **3 . base style validator**
```javascript
// scripts/validate-base-style.js
class BaseStyleValidator {
  constructor() {
    this.requiredViews = ['table', 'board', 'gallery'];
    this.requiredFields = ['title', 'status', 'priority', 'created', 'updated'];
  }

  async validateBase(basePath) {
    const content = await readFile(basePath);
    const base = this.parseBaseContent(content);
    const issues = [];
    
    // Check view completeness
    const viewTypes = base.views?.map(view => view.type) || [];
    const missingViews = this.requiredViews.filter(
      view => !viewTypes.includes(view)
    );
    
    if (missingViews.length > 0) {
      issues.push({
        type: 'missing-views',
        views: missingViews,
        severity: 'error'
      });
    }
    
    // Check field definitions
    const fieldNames = base.fields?.map(field => field.name) || [];
    const missingFields = this.requiredFields.filter(
      field => !fieldNames.includes(field)
    );
    
    if (missingFields.length > 0) {
      issues.push({
        type: 'missing-fields',
        fields: missingFields,
        severity: 'error'
      });
    }
    
    // Validate view configurations
    base.views?.forEach((view, index) => {
      if (!view.config) {
        issues.push({
          type: 'missing-view-config',
          view: view.name || index,
          severity: 'warning'
        });
      }
    });
    
    return {
      compliant: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      score: this.calculateComplianceScore(base, issues)
    };
  }

  async autoFixBase(basePath, issues) {
    let content = await readFile(basePath);
    let changes = 0;
    
    // Auto-add missing views
    if (issues.some(i => i.type === 'missing-views')) {
      content = this.addMissingViews(content);
      changes++;
    }
    
    // Auto-add missing fields
    if (issues.some(i => i.type === 'missing-fields')) {
      content = this.addMissingFields(content);
      changes++;
    }
    
    // Auto-add view configurations
    if (issues.some(i => i.type === 'missing-view-config')) {
      content = this.addViewConfigs(content);
      changes++;
    }
    
    await writeFile(basePath, content);
    return { fixed: true, changes };
  }
}
```

---

## 📋 Command Line Interface

### **Validation Commands**
```bash
# Validate all content
bun run style:validate --all

# Validate specific content types
bun run style:validate --notes
bun run style:validate --canvases
bun run style:validate --bases

# Validate specific files
bun run style:validate --file="path/to/file.md"
bun run style:validate --folder="02 - Architecture"
```

### **Auto-Fix Commands**
```bash
# Auto-fix all issues
bun run style:fix --all

# Auto-fix specific issues
bun run style:fix --notes --severity=error
bun run style:fix --canvases --auto-layout
bun run style:fix --bases --add-views

# Dry run (preview changes)
bun run style:fix --dry-run --verbose
```

### **Reporting Commands**
```bash
# Generate compliance report
bun run style:report --format=html
bun run style:report --format=csv --output="style-compliance.csv"

# Score breakdown
bun run style:score --by-type
bun run style:score --by-folder
bun run style:score --timeline=30d
```

---

## 📊 Compliance scoring

### ** Scoring algorithm**
```javascript
class ComplianceScorer {
  calculateNoteScore(content, issues) {
    let score = 100;
    
    // Frontmatter completeness (30 points)
    const frontmatterIssues = issues.filter(i => 
      i.type.startsWith('missing-frontmatter')
    );
    score -= frontmatterIssues.length * 10;
    
    // Structure compliance (40 points)
    const structureIssues = issues.filter(i => 
      i.type.startsWith('missing-section') || 
      i.type === 'missing-toc'
    );
    score -= structureIssues.length * 8;
    
    // Metadata quality (20 points)
    const metadataIssues = issues.filter(i => 
      i.type.startsWith('missing-metadata')
    );
    score -= metadataIssues.length * 5;
    
    // Formatting consistency (10 points)
    const formatIssues = issues.filter(i => 
      i.type.startsWith('formatting')
    );
    score -= formatIssues.length * 2;
    
    return Math.max(0, score);
  }

  calculateCanvasScore(canvas, issues) {
    let score = 100;
    
    // Node structure (40 points)
    score -= issues.filter(i => i.type.startsWith('missing-')).length * 10;
    
    // Layout quality (30 points)
    score -= issues.filter(i => i.type.includes('spacing')).length * 5;
    
    // Connection clarity (20 points)
    score -= issues.filter(i => i.type.includes('edge')).length * 4;
    
    // Visual consistency (10 points)
    score -= issues.filter(i => i.type.includes('color')).length * 2;
    
    return Math.max(0, score);
  }

  calculateBaseScore(base, issues) {
    let score = 100;
    
    // Schema completeness (40 points)
    score -= issues.filter(i => i.type.includes('field')).length * 8;
    
    // View configuration (30 points)
    score -= issues.filter(i => i.type.includes('view')).length * 6;
    
    // Data integrity (20 points)
    score -= issues.filter(i => i.type.includes('data')).length * 4;
    
    // Configuration quality (10 points)
    score -= issues.filter(i => i.type.includes('config')).length * 2;
    
    return Math.max(0, score);
  }
}
```

---

## 🔄 Continuous Monitoring

### **Real-time Validation**
```javascript
class StyleMonitor {
  constructor() {
    this.watchers = new Map();
    this.validationQueue = [];
    this.isProcessing = false;
  }

  startWatching(vaultPath) {
    const watcher = fs.watch(vaultPath, { recursive: true }, 
      (eventType, filename) => {
        if (this.shouldValidate(filename)) {
          this.queueValidation(filename);
        }
      }
    );
    
    this.watchers.set(vaultPath, watcher);
  }

  async queueValidation(filePath) {
    this.validationQueue.push({
      path: filePath,
      timestamp: Date.now(),
      retryCount: 0
    });
    
    if (!this.isProcessing) {
      this.processValidationQueue();
    }
  }

  async processValidationQueue() {
    this.isProcessing = true;
    
    while (this.validationQueue.length > 0) {
      const item = this.validationQueue.shift();
      
      try {
        await this.validateAndNotify(item);
      } catch (error) {
        if (item.retryCount < 3) {
          item.retryCount++;
          this.validationQueue.push(item);
        }
      }
    }
    
    this.isProcessing = false;
  }

  async validateAndNotify(item) {
    const result = await this.validateFile(item.path);
    
    if (!result.compliant) {
      this.notifyUser(item.path, result.issues);
      this.logViolation(item.path, result.issues);
    }
    
    this.updateMetrics(item.path, result);
  }
}
```

---

## 📈 Quality metrics dashboard

### ** Metrics collection**
```javascript
class StyleMetrics {
  constructor() {
    this.metrics = {
      totalFiles: 0,
      compliantFiles: 0,
      averageScore: 0,
      issuesByType: {},
      trends: []
    };
  }

  async collectMetrics() {
    const allFiles = await this.getAllContentFiles();
    this.metrics.totalFiles = allFiles.length;
    
    let totalScore = 0;
    let compliantCount = 0;
    
    for (const file of allFiles) {
      const result = await this.validateFile(file.path);
      totalScore += result.score;
      
      if (result.compliant) {
        compliantCount++;
      }
      
      result.issues.forEach(issue => {
        this.metrics.issuesByType[issue.type] = 
          (this.metrics.issuesByType[issue.type] || 0) + 1;
      });
    }
    
    this.metrics.compliantFiles = compliantCount;
    this.metrics.averageScore = totalScore / allFiles.length;
    
    return this.metrics;
  }

  generateDashboard() {
    return {
      overview: {
        complianceRate: (this.metrics.compliantFiles / this.metrics.totalFiles) * 100,
        averageScore: this.metrics.averageScore,
        totalIssues: Object.values(this.metrics.issuesByType).reduce((a, b) => a + b, 0)
      },
      breakdown: {
        byType: this.metrics.issuesByType,
        bySeverity: this.groupBySeverity(),
        byFolder: this.groupByFolder()
      },
      trends: this.metrics.trends
    };
  }
}
```

---

## 🛠️ Configuration & Customization

### **Rule Configuration**
```json
{
  "styleEnforcement": {
    "enabled": true,
    "autoFix": {
      "enabled": true,
      "severity": "warning",
      "backupOriginal": true
    },
    "validation": {
      "interval": "5m",
      "onSave": true,
      "onCreate": true
    },
    "rules": {
      "notes": {
        "requireFrontmatter": true,
        "requireTOC": true,
        "requireMetadata": true,
        "headingStyle": "emoji"
      },
      "canvases": {
        "requireOverview": true,
        "minNodeSpacing": 100,
        "requireEdgeLabels": true,
        "colorStandards": true
      },
      "bases": {
        "requireTableView": true,
        "requireBoardView": true,
        "requireGalleryView": true,
        "standardFields": true
      }
    },
    "notifications": {
      "slack": false,
      "email": false,
      "inApp": true,
      "severity": "error"
    }
  }
}
```

### **Custom Rules**
```javascript
class CustomRuleEngine {
  constructor() {
    this.customRules = new Map();
  }

  addRule(name, rule) {
    this.customRules.set(name, {
      validate: rule.validate,
      fix: rule.fix,
      severity: rule.severity || 'warning',
      description: rule.description
    });
  }

  async applyCustomRules(content, contentType) {
    const applicableRules = Array.from(this.customRules.values())
      .filter(rule => rule.contentType === contentType || !rule.contentType);
    
    const issues = [];
    for (const rule of applicableRules) {
      try {
        const result = await rule.validate(content);
        if (!result.compliant) {
          issues.push({
            type: 'custom-rule',
            rule: rule.name,
            message: result.message,
            severity: rule.severity
          });
        }
      } catch (error) {
        console.error(`Custom rule ${rule.name} failed:`, error);
      }
    }
    
    return issues;
  }
}
```

---

## 📚 Integration points

### ** Obsidian plugin integration**
```javascript
class StyleEnforcementPlugin extends Plugin {
  async onload() {
    // Register validation commands
    this.addCommand({
      id: 'validate-current-file',
      name: 'Validate Current File',
      callback: () => this.validateCurrentFile()
    });
    
    // Add style indicator to status bar
    this.addStatusBarItem().setText('Style: Enforced');
    
    // Hook into file save events
    this.registerEvent(
      this.app.workspace.on('file-save', this.handleFileSave.bind(this))
    );
  }

  async handleFileSave(file) {
    const validator = this.getValidator(file.extension);
    const result = await validator.validate(file.path);
    
    if (!result.compliant) {
      this.showValidationNotice(file, result);
    }
  }
}
```

### ** Bridge service integration**
```javascript
// Integration with bridge service for real-time updates
class BridgeStyleIntegration {
  constructor(bridgeService) {
    this.bridge = bridgeService;
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.bridge.on('style-violation', this.handleViolation.bind(this));
    this.bridge.on('style-fixed', this.handleFix.bind(this));
  }

  async handleViolation(data) {
    // Send notification to Obsidian
    await this.bridge.sendNotice({
      type: 'warning',
      message: `Style violation in ${data.file}: ${data.issues.length} issues found`
    });
    
    // Update dashboard metrics
    await this.updateDashboardMetrics(data);
  }
}
```

---

## 🎯 Best Practices

### **Rule Development**
- **Specific**: Rules should target specific issues
- **Actionable**: Provide clear fix recommendations
- **Performance**: Optimize for fast validation
- **User-friendly**: Clear error messages and guidance

### **Automation Guidelines**
- **Non-destructive**: Always backup before auto-fixing
- **Transparent**: Log all changes and actions
- **Configurable**: Allow users to customize rules
- **Respectful**: Don't override user intent unnecessarily

---

*Style Enforcement Automation v2.0 • Ensuring consistent quality across all Odds Protocol content*
