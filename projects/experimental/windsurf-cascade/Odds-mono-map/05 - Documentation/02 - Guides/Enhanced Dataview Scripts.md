---
type: dataview-scripts
title: 📊 Enhanced Dataview Scripts
version: "2.0"
category: dataview
priority: high
status: active
tags:
  - dataview
  - scripts
  - analytics
  - automation
created: 2025-11-18T15:06:00Z
updated: 2025-11-18T15:06:00Z
author: system
---



# 📊 Enhanced Dataview Scripts

## Overview

Brief description of this content.


> **Advanced Dataview queries integrated with Odds Protocol style standards**

---

## 🔍 Orphaned Nodes Detection

### **Enhanced Orphaned Nodes Script**
```dataviewjs
// Enhanced orphaned nodes detection with style compliance
const orphans = dv.pages()
  .filter(p => dv.array(p.file.inlinks).length === 0)
  .filter(p => p.type !== 'dashboard' && p.type !== 'folder-index')
  .filter(p => !p.file.path.includes('06 - Templates'))
  .sort(p => p.file.mtime, 'asc');

// Group by section for better organization
const grouped = orphans.reduce((acc, page) => {
  const section = page.section || '00 - Uncategorized';
  if (!acc[section]) acc[section] = [];
  acc[section].push(page);
  return acc;
}, {});

// Display with enhanced styling
dv.header(3, '🔍 Orphaned Nodes by Section');

Object.entries(grouped).forEach(([section, pages]) => {
  dv.header(4, `📁 ${section}`);
  
  dv.table([
    '📄 File', 
    '📅 Modified', 
    '🏷️ Type', 
    '⚠️ Issues'
  ], 
  pages.map(p => [
    p.file.link,
    p.file.mtime.toFormat('yyyy-MM-dd'),
    dv.span(`[${p.type || 'unknown'}]`, { cls: 'badge badge-outline' }),
    p.status === 'active' ? '✅ Active' : '⚠️ Inactive'
  ]));
});

// Summary statistics
dv.header(3, '📊 Summary Statistics');
dv.paragraph(`Total orphaned files: ${dv.span(orphans.length, { cls: 'badge badge-warning' })}`);

// Quick action buttons
dv.paragraph('🔧 **Quick Actions**:');
dv.paragraph('- [[🎨 Style Enforcement Automation|Run Style Fix]]');
dv.paragraph('- [[📋 Comprehensive Template System|Apply Templates]]');
dv.paragraph('- [[🤖 Vault Automation System|Auto-Organize]]');
```

### **Advanced Orphaned Analysis**
```dataviewjs
// Comprehensive orphaned nodes analysis
const allPages = dv.pages();
const linkedPages = new Set();

// Collect all linked pages
allPages.forEach(p => {
  dv.array(p.file.outlinks).forEach(link => {
    if (link.path) linkedPages.add(link.path);
  });
});

// Find truly orphaned pages
const orphans = allPages
  .filter(p => !linkedPages.has(p.file.path))
  .filter(p => p.file.path !== dv.current().file.path)
  .filter(p => !p.file.path.includes('06 - Templates'))
  .filter(p => p.type !== 'dashboard');

// Create actionable recommendations
const recommendations = [];

if (orphans.length > 0) {
  recommendations.push(`🔗 **Link ${orphans.length} orphaned files** to relevant content`);
  
  // Check for potential linking opportunities
  orphans.forEach(orphan => {
    const potentialParents = allPages
      .filter(p => p.file.path !== orphan.file.path)
      .filter(p => p.category === orphan.category)
      .slice(0, 3);
    
    if (potentialParents.length > 0) {
      recommendations.push(`📎 Link [[${orphan.file.name}]] to: ${potentialParents.map(p => p.file.link).join(', ')}`);
    }
  });
}

// Display recommendations
if (recommendations.length > 0) {
  dv.header(3, '💡 Recommendations');
  recommendations.forEach(rec => dv.paragraph(rec));
}
```

---

## 🏷 ️ tag standardization

### ** Enhanced tag analysis**
```dataviewjs
// Advanced tag standardization with style compliance
const allTags = dv.pages()
  .flatMap(p => p.file.tags)
  .filter(t => t && t.length > 0);

// Problematic tags
const problematicTags = allTags.filter(t => 
  /[A-Z_]/.test(t) || 
  t.includes(' ') || 
  t.length > 20 ||
  !/^[a-z0-9-]+$/.test(t)
);

// Tag usage statistics
const tagStats = allTags.reduce((acc, tag) => {
  acc[tag] = (acc[tag] || 0) + 1;
  return acc;
}, {});

// Standard tag categories
const standardCategories = {
  'section': ['daily-notes', 'architecture', 'development', 'documentation', 'projects', 'templates'],
  'type': ['note', 'canvas', 'base', 'dashboard', 'template'],
  'status': ['active', 'inactive', 'completed', 'archived'],
  'priority': ['low', 'medium', 'high', 'critical'],
  'category': ['api', 'design', 'testing', 'deployment', 'research']
};

// Display analysis
dv.header(3, '🏷️ Tag Standardization Analysis');

// Problematic tags
if (problematicTags.length > 0) {
  dv.header(4, '⚠️ Tags Needing Standardization');
  dv.table([
    'Tag', 
    'Usage Count', 
    'Issues', 
    'Suggested Fix'
  ], 
  problematicTags.distinct().map(tag => [
    dv.span(`#${tag}`, { cls: 'badge badge-error' }),
    tagStats[tag] || 0,
    [
      /[A-Z_]/.test(tag) ? 'Contains uppercase/underscore' : '',
      tag.includes(' ') ? 'Contains spaces' : '',
      tag.length > 20 ? 'Too long' : '',
      !/^[a-z0-9-]+$/.test(tag) ? 'Invalid characters' : ''
    ].filter(Boolean).join(', '),
    tag.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
  ]));
}

// Standard compliance
dv.header(4, '✅ Standard Tag Categories');
Object.entries(standardCategories).forEach(([category, tags]) => {
  dv.paragraph(`**${category.charAt(0).toUpperCase() + category.slice(1)}**: ${tags.map(t => `#${t}`).join(', ')}`);
});

// Usage statistics
dv.header(4, '📊 Tag Usage Statistics');
const topTags = Object.entries(tagStats)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10);

dv.table([
  'Tag', 
  'Usage Count', 
  'Percentage'
], 
topTags.map(([tag, count]) => [
  dv.span(`#${tag}`, { cls: 'badge badge-primary' }),
  count,
  `${((count / allTags.length) * 100).toFixed(1)}%`
]));
```

### ** Tag auto-correction script**
```dataviewjs
// Generate tag correction suggestions
const problematicTags = dv.pages()
  .flatMap(p => p.file.tags)
  .filter(t => /[A-Z_]/.test(t) || t.includes(' '));

const corrections = problematicTags.distinct().map(tag => {
  const corrected = tag.toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  return {
    original: tag,
    corrected: corrected,
    affectedFiles: dv.pages().filter(p => p.file.tags.includes(tag)).length
  };
});

dv.header(3, '🔧 Tag Correction Suggestions');
dv.table([
  'Original Tag', 
  'Corrected Tag', 
  'Files Affected',
  'Action'
], 
corrections.map(c => [
  dv.span(`#${c.original}`, { cls: 'badge badge-error' }),
  dv.span(`#${c.corrected}`, { cls: 'badge badge-success' }),
  c.affectedFiles,
  c.affectedFiles > 0 ? `Fix ${c.affectedFiles} files` : 'No usage'
]));
```

---

## 🚀 Bun API Integration

### **Enhanced API Endpoint**
```typescript
// .obsidian/plugins/vault-standards/enhanced-api.ts
import { calculateHealthScore } from './health-calculator';
import { autoFixFile } from './auto-fixer';
import { validateStyle } from './style-validator';
import { getTemplateSuggestions } from './template-engine';

interface StyleRequest {
  file: string;
  type: 'note' | 'canvas' | 'base';
  options?: {
    autoFix?: boolean;
    template?: string;
    severity?: 'error' | 'warning' | 'all';
  };
}

interface StyleResponse {
  success: boolean;
  data?: {
    health: number;
    violations: Array<{
      type: string;
      severity: 'error' | 'warning';
      message: string;
      line?: number;
      fixable: boolean;
    }>;
    suggestions?: string[];
    template?: string;
  };
  error?: string;
}

// Enhanced API server with style enforcement
const server = Bun.serve({
  port: 3999,
  async fetch(req): Promise<Response> {
    const url = new URL(req.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check endpoint
      if (url.pathname === '/api/health') {
        const file = url.searchParams.get('file');
        const type = (url.searchParams.get('type') || 'note') as 'note' | 'canvas' | 'base';
        
        if (!file) {
          return Response.json(
            { error: 'File parameter required' }, 
            { status: 400, headers: corsHeaders }
          );
        }

        const health = await calculateHealthScore(file, type);
        const violations = await validateStyle(file, type);
        
        const response: StyleResponse = {
          success: true,
          data: {
            health: health.score,
            violations: violations.issues,
            suggestions: violations.suggestions
          }
        };

        return Response.json(response, { headers: corsHeaders });
      }

      // Auto-fix endpoint
      if (url.pathname === '/api/fix') {
        const body: StyleRequest = await req.json();
        const { file, type, options = {} } = body;

        if (!file) {
          return Response.json(
            { error: 'File parameter required' }, 
            { status: 400, headers: corsHeaders }
          );
        }

        const fixes = await autoFixFile(file, type, options);
        const newHealth = await calculateHealthScore(file, type);
        
        return Response.json({
          success: true,
          data: {
            applied: fixes.applied,
            health: newHealth.score,
            violations: fixes.remainingViolations
          }
        }, { headers: corsHeaders });
      }

      // Template suggestion endpoint
      if (url.pathname === '/api/template-suggest') {
        const file = url.searchParams.get('file');
        const type = (url.searchParams.get('type') || 'note') as 'note' | 'canvas' | 'base';
        
        if (!file) {
          return Response.json(
            { error: 'File parameter required' }, 
            { status: 400, headers: corsHeaders }
          );
        }

        const suggestions = await getTemplateSuggestions(file, type);
        
        return Response.json({
          success: true,
          data: { suggestions }
        }, { headers: corsHeaders });
      }

      // Batch validation endpoint
      if (url.pathname === '/api/validate-batch') {
        const body = { files: [] as string[] };
        try {
          Object.assign(body, await req.json());
        } catch {
          body.files = [];
        }

        const results = await Promise.all(
          body.files.map(async (file: string) => {
            const type = file.endsWith('.canvas') ? 'canvas' : 
                        file.endsWith('.base') ? 'base' : 'note';
            const health = await calculateHealthScore(file, type);
            const violations = await validateStyle(file, type);
            
            return { file, type, health: health.score, violations: violations.issues };
          })
        );

        return Response.json({
          success: true,
          data: { results }
        }, { headers: corsHeaders });
      }

      // Style metrics endpoint
      if (url.pathname === '/api/metrics') {
        const timeframe = url.searchParams.get('timeframe') || '7d';
        const metrics = await getStyleMetrics(timeframe);
        
        return Response.json({
          success: true,
          data: { metrics }
        }, { headers: corsHeaders });
      }

      // Default response
      return Response.json(
        { 
          error: 'Endpoint not found',
          available: ['/api/health', '/api/fix', '/api/template-suggest', '/api/validate-batch', '/api/metrics']
        }, 
        { status: 404, headers: corsHeaders }
      );

    } catch (error) {
      console.error('API Error:', error);
      return Response.json(
        { error: 'Internal server error', details: error.message }, 
        { status: 500, headers: corsHeaders }
      );
    }
  }
});

console.log(`🚀 Enhanced Style API running on http://localhost:${server.port}`);

// Health calculation function
async function calculateHealthScore(filePath: string, type: 'note' | 'canvas' | 'base') {
  // Implementation would check file content against style rules
  return {
    score: 85,
    issues: [],
    suggestions: []
  };
}

// Style validation function
async function validateStyle(filePath: string, type: 'note' | 'canvas' | 'base') {
  // Implementation would validate against comprehensive style rules
  return {
    issues: [],
    suggestions: []
  };
}

// Auto-fix function
async function autoFixFile(filePath: string, type: 'note' | 'canvas' | 'base', options: any) {
  // Implementation would auto-fix style violations
  return {
    applied: 0,
    remainingViolations: []
  };
}

// Template suggestions function
async function getTemplateSuggestions(filePath: string, type: 'note' | 'canvas' | 'base') {
  // Implementation would suggest appropriate templates
  return [
    'enhanced-note-template',
    'project-template',
    'api-documentation-template'
  ];
}

// Style metrics function
async function getStyleMetrics(timeframe: string) {
  // Implementation would return style compliance metrics
  return {
    complianceRate: 92,
    totalFiles: 150,
    violationsFixed: 23,
    averageScore: 87
  };
}

export default server;
```

### **API Usage Examples**
```javascript
// Client-side API usage for Obsidian plugins
class StyleAPI {
  private baseUrl = 'http://localhost:3999';

  async checkFileHealth(filePath: string, type: 'note' | 'canvas' | 'base') {
    const response = await fetch(`${this.baseUrl}/api/health?file=${encodeURIComponent(filePath)}&type=${type}`);
    return response.json();
  }

  async fixFile(filePath: string, type: 'note' | 'canvas' | 'base', options = {}) {
    const response = await fetch(`${this.baseUrl}/api/fix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: filePath, type, options })
    });
    return response.json();
  }

  async getTemplateSuggestions(filePath: string, type: 'note' | 'canvas' | 'base') {
    const response = await fetch(`${this.baseUrl}/api/template-suggest?file=${encodeURIComponent(filePath)}&type=${type}`);
    return response.json();
  }

  async validateBatch(files: string[]) {
    const response = await fetch(`${this.baseUrl}/api/validate-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files })
    });
    return response.json();
  }

  async getMetrics(timeframe = '7d') {
    const response = await fetch(`${this.baseUrl}/api/metrics?timeframe=${timeframe}`);
    return response.json();
  }
}

// Usage in Obsidian plugin
const styleAPI = new StyleAPI();

// Check current file health
const health = await styleAPI.checkFileHealth(activeFilePath, 'note');
console.log('File health score:', health.data.health);

// Auto-fix current file
const fixResult = await styleAPI.fixFile(activeFilePath, 'note', { autoFix: true });
console.log('Applied fixes:', fixResult.data.applied);

// Get template suggestions
const suggestions = await styleAPI.getTemplateSuggestions(activeFilePath, 'note');
console.log('Template suggestions:', suggestions.data.suggestions);
```

---

## 📊 Integration with enhanced dashboard

### ** Real-time style dashboard**
```dataviewjs
// Real-time style compliance dashboard
const api = new StyleAPI(); // Assuming API is available

// Get current vault metrics
const metrics = await api.getMetrics('7d');

dv.header(2, '📊 Style Compliance Dashboard');

// Metric cards
dv.paragraph('### 🎯 Overall Compliance');
const complianceRate = metrics.data.metrics.complianceRate;
const complianceColor = complianceRate > 90 ? 'success' : complianceRate > 75 ? 'warning' : 'error';

dv.paragraph(`
<div class="metric-card">
  <div class="metric-value">${complianceRate}%</div>
  <div class="metric-label">Style Compliance</div>
  <div class="metric-change ${complianceColor}">${complianceRate > 85 ? '↑ Excellent' : '↑ Needs Improvement'}</div>
</div>
`);

// Recent violations
dv.paragraph('### ⚠️ Recent Style Violations');
const recentViolations = await api.getMetrics('1d');

if (recentViolations.data.metrics.violationsFixed > 0) {
  dv.paragraph(`✅ Fixed ${recentViolations.data.metrics.violationsFixed} violations today`);
} else {
  dv.paragraph('🎉 No style violations detected today!');
}

// Quick actions
dv.paragraph('### 🚀 Quick Actions');
dv.paragraph('- [[🔧 Run Style Validation|Validate All Files]]');
dv.paragraph('- [[🎨 Apply Templates|Auto-fix Issues]]');
dv.paragraph('- [[📊 View Detailed Metrics|Full Analytics]]');
```

---

## 🔄 Automated Style Enforcement

### **Background Style Monitor**
```typescript
// Background monitoring service
class StyleMonitor {
  private api: StyleAPI;
  private interval: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.api = new StyleAPI();
    this.startMonitoring();
  }

  private async startMonitoring() {
    setInterval(async () => {
      try {
        // Check all modified files
        const modifiedFiles = await this.getModifiedFiles();
        
        for (const file of modifiedFiles) {
          const health = await this.api.checkFileHealth(file.path, file.type);
          
          if (health.data.health < 80) {
            // Auto-fix if below threshold
            await this.api.fixFile(file.path, file.type, { autoFix: true });
            
            // Notify user
            this.notifyUser(file.path, health.data.violations);
          }
        }
      } catch (error) {
        console.error('Style monitoring error:', error);
      }
    }, this.interval);
  }

  private async getModifiedFiles() {
    // Get files modified in the last hour
    // Implementation depends on your file system
    return [];
  }

  private notifyUser(filePath: string, violations: any[]) {
    // Send notification to Obsidian
    console.log(`Style issues fixed in ${filePath}: ${violations.length} violations`);
  }
}

// Start monitoring
const monitor = new StyleMonitor();
```

---

*Enhanced Dataview Scripts v2.0 • Advanced analytics and automation for style compliance*
