---
type: configuration
title: 🔧 Type Heading Templates Configuration
version: "2.0"
category: configuration
priority: high
status: active
tags:
  - configuration
  - headings
  - templates
  - types
created: 2025-11-18T15:08:00Z
updated: 2025-11-18T15:08:00Z
author: system
---



# 🔧 Type Heading Templates Configuration

## Overview

Brief description of this content.


> **Complete configuration for type-specific heading structures and validation rules**

---

## 📝 Document Type → Heading Structure Mapping

```typescript
// src/config/heading-templates.ts
export const typeHeadingMap: Record<string, string[]> = {
  'note': [
    '# {title}',           // H1: Note title
    '## 🎯 Overview',      // Context and purpose
    '## 🔍 Key Details',   // Main content sections
    '## 💡 Implementation', // Implementation details
    '## 🔗 References',    // Related content
    '## 📊 Metadata'       // File metadata
  ],
  
  'dashboard': [
    '# 📊 {title}',        // H1: Dashboard
    '## 🎯 System Status', // Live metrics and status
    '## 📈 Current Focus', // Active priorities
    '## ⚡ Quick Actions', // Commands and shortcuts
    '## 📋 Metrics'        // Analytics and KPIs
  ],
  
  'api-doc': [
    '# {title}',           // H1: API Name
    '## 🎯 Overview',      // Purpose and description
    '## 🔐 Authentication', // Auth details and security
    '## 🛠️ Endpoints',     // API routes and methods
    '### {method} {path}', // Individual endpoint documentation
    '## ⚠️ Errors',        // Error codes and handling
    '## 💻 Examples'       // Code samples and usage
  ],
  
  'adr': [                 // Architecture Decision Record
    '# ADR-{number}: {title}',
    '## 📊 Status',        // proposed | accepted | deprecated
    '## 📝 Context',       // Problem statement
    '## ✅ Decision',      // The chosen solution
    '## 🎯 Consequences',  // Impact and effects
    '## 🔄 Alternatives'   // Options considered
  ],
  
  'template': [
    '# {title} Template',  // H1: Template name
    '## 🎯 Usage',         // How to use the template
    '## 📝 Variables',     // {placeholders} and customization
    '## 💡 Example'        // Filled example
  ],
  
  'project': [
    '# 🎯 {title}',
    '## 📋 Overview',      // Project description and goals
    '## 🎯 Objectives',     // Specific outcomes and deliverables
    '## 📅 Timeline',      // Project schedule and milestones
    '## 👥 Team',          // Team members and roles
    '## 💰 Budget',        // Resource allocation and costs
    '## ⚠️ Risks',         // Risk assessment and mitigation
    '## 📊 Progress',      // Current status and achievements
    '## 🔗 References'     // Related documents and resources
  ],
  
  'meeting': [
    '# 📅 {title}',
    '## 📋 Overview',      // Meeting purpose and objectives
    '## 👥 Attendees',     // Who was present
    '## 📝 Agenda',        // Discussion topics and schedule
    '## 💬 Discussion',    // Key points and decisions
    '## ✅ Decisions',     // Outcomes and agreements
    '## 📋 Action Items',  // Next steps and assignments
    '## 📅 Next Meeting'   // Follow-up and scheduling
  ],
  
  'research': [
    '# 🔬 {title}',
    '## 🎯 Overview',      // Research question and hypothesis
    '## 📚 Background',    // Context and literature review
    '## 🔬 Methodology',   // Research approach and methods
    '## 📊 Findings',      // Results and data
    '## 💡 Analysis',      // Interpretation and insights
    '## 🎯 Conclusions',   // Summary and implications
    '## 📚 References'     // Sources and citations
  ],
  
  'guide': [
    '# 📚 {title}',
    '## 🎯 Overview',      // Guide purpose and audience
    '## 📋 Prerequisites', // Requirements and setup
    '## 📝 Step-by-Step',  // Detailed instructions
    '## 💡 Tips & Tricks', // Best practices and shortcuts
    '## ⚠️ Troubleshooting', // Common issues and solutions
    '## 🔗 References'     // Additional resources
  ],
  
  'specification': [
    '# 📋 {title}',
    '## 🎯 Overview',      // Specification purpose and scope
    '## 📝 Requirements',  // Functional and non-functional requirements
    '## 🔧 Technical Details', // Implementation specifications
    '## 📊 Performance',   // Performance criteria and benchmarks
    '## ⚠️ Constraints',   // Limitations and restrictions
    '## 🔗 References'     // Related specifications
  ]
};
```

---

## 📋 Heading validation rules

```typescript
// src/config/heading-rules.ts
export const headingRules = {
  'api-doc': {
    required: ['Overview', 'Authentication', 'Endpoints', 'Examples'],
    forbidden: ['Implementation', 'Usage', 'Notes'],
    case: 'sentence',
    emoji: 'tech',
    minSections: 6,
    maxSections: 10
  },
  'adr': {
    required: ['Status', 'Context', 'Decision', 'Consequences'],
    forbidden: ['Usage', 'Notes', 'Examples'],
    case: 'sentence',
    emoji: 'decision',
    minSections: 5,
    maxSections: 7
  },
  'dashboard': {
    required: ['System Status', 'Current Focus'],
    optional: ['Metrics', 'Quick Actions'],
    case: 'title',
    emoji: 'metrics',
    minSections: 3,
    maxSections: 6
  },
  'project': {
    required: ['Overview', 'Objectives', 'Timeline'],
    optional: ['Budget', 'Risks', 'Team'],
    forbidden: ['Implementation'],
    case: 'title',
    emoji: 'project',
    minSections: 5,
    maxSections: 9
  },
  'meeting': {
    required: ['Overview', 'Attendees', 'Action Items'],
    optional: ['Next Meeting', 'Agenda'],
    forbidden: ['Technical Details'],
    case: 'title',
    emoji: 'meeting',
    minSections: 4,
    maxSections: 8
  },
  'research': {
    required: ['Overview', 'Methodology', 'Findings'],
    optional: ['Background', 'Analysis'],
    forbidden: ['Action Items'],
    case: 'title',
    emoji: 'research',
    minSections: 5,
    maxSections: 8
  },
  'guide': {
    required: ['Overview', 'Step-by-Step'],
    optional: ['Tips & Tricks', 'Troubleshooting'],
    forbidden: ['Technical Specifications'],
    case: 'title',
    emoji: 'guide',
    minSections: 4,
    maxSections: 7
  },
  'template': {
    required: ['Usage', 'Variables', 'Example'],
    forbidden: ['Implementation', 'Technical Details'],
    case: 'title',
    emoji: 'template',
    minSections: 3,
    maxSections: 5
  },
  'specification': {
    required: ['Overview', 'Requirements', 'Technical Details'],
    optional: ['Performance', 'Constraints'],
    forbidden: ['Tips & Tricks'],
    case: 'title',
    emoji: 'tech',
    minSections: 4,
    maxSections: 7
  },
  'note': {
    required: ['Overview'],
    optional: ['Key Details', 'Implementation', 'References'],
    forbidden: [], // Notes are flexible
    case: 'title',
    emoji: 'general',
    minSections: 2,
    maxSections: 8
  }
};
```

---

## 🎨 Emoji Mapping for Heading Types

```typescript
// src/config/heading-emojis.ts
export const headingEmojis = {
  // Standard sections
  'overview': '🎯',
  'details': '🔍',
  'implementation': '💡',
  'references': '🔗',
  'metadata': '📊',
  'status': '📊',
  'focus': '📈',
  'actions': '⚡',
  'metrics': '📋',
  'examples': '💻',
  
  // API documentation
  'authentication': '🔐',
  'endpoints': '🛠️',
  'errors': '⚠️',
  'technical details': '🔧',
  'performance': '📊',
  'constraints': '⚠️',
  
  // Project management
  'objectives': '🎯',
  'timeline': '📅',
  'team': '👥',
  'budget': '💰',
  'risks': '⚠️',
  'progress': '📊',
  
  // Meeting documentation
  'attendees': '👥',
  'agenda': '📋',
  'discussion': '💬',
  'decisions': '✅',
  'action items': '📋',
  'next meeting': '📅',
  
  // Research documentation
  'background': '📚',
  'methodology': '🔬',
  'findings': '📊',
  'analysis': '💡',
  'conclusions': '🎯',
  
  // Guide documentation
  'prerequisites': '📋',
  'step-by-step': '📝',
  'tips & tricks': '💡',
  'troubleshooting': '⚠️',
  
  // Template documentation
  'usage': '🎯',
  'variables': '📝',
  'example': '💡',
  
  // Architecture Decision Records
  'context': '📝',
  'decision': '✅',
  'consequences': '🎯',
  'alternatives': '🔄',
  
  // Dashboard specific
  'system status': '🎯',
  'current focus': '📈',
  'quick actions': '⚡'
};

// Emoji categories for validation
export const emojiCategories = {
  'tech': ['🛠️', '🔐', '⚠️', '💻', '🔗', '📊', '🔧'],
  'decision': ['📊', '📝', '✅', '🎯', '🔄'],
  'metrics': ['📊', '📈', '📋', '⚡'],
  'project': ['🎯', '📋', '📅', '👥', '💰', '⚠️', '📊'],
  'meeting': ['📅', '📋', '👥', '📝', '💬', '✅', '📋'],
  'research': ['🔬', '🎯', '📚', '📊', '💡', '🎯'],
  'guide': ['📚', '🎯', '📋', '📝', '💡', '⚠️'],
  'template': ['🎯', '📝', '💡'],
  'general': ['🎯', '🔍', '💡', '🔗', '📊']
};
```

---

## 🔧 Template application functions

```typescript
// src/utils/template-application.ts
import { typeHeadingMap, headingRules, headingEmojis } from '../config/heading-templates';

export class TemplateApplication {
  
  /**
   * Apply the appropriate template based on document type
   */
  applyTemplate(content: string, type: string): string {
    const template = typeHeadingMap[type];
    if (!template) {
      console.warn(`No template found for type: ${type}`);
      return content;
    }

    // Extract frontmatter and body
    const parts = content.split('---');
    const frontmatter = parts[1] ? `---${parts[1]}---\n\n` : '';
    const body = parts[2] || content;

    // Extract title from frontmatter or first H1
    const title = this.extractTitle(content) || 'Untitled';

    // Remove existing headings (preserve content after headings)
    const cleanBody = this.removeExistingHeadings(body);

    // Apply template with title substitution and proper formatting
    const headings = template.map(h => 
      this.formatHeading(h, title)
    ).join('\n\n');

    return frontmatter + headings + '\n\n' + cleanBody;
  }

  /**
   * Format a heading with title substitution and emoji validation
   */
  private formatHeading(template: string, title: string): string {
    let formatted = template.replace('{title}', title);
    
    // Add emojis if missing based on heading text
    const headingText = formatted.replace(/^#+\s*/, '');
    const cleanText = headingText.replace(/^[\p{Emoji}\s]+/u, '');
    
    if (!formatted.match(/^#+\s*[\p{Emoji}]/u)) {
      const suggestedEmoji = this.getSuggestedEmoji(cleanText.toLowerCase());
      if (suggestedEmoji) {
        formatted = formatted.replace(/^(#+\s*)/, `$1${suggestedEmoji} `);
      }
    }
    
    return formatted;
  }

  /**
   * Get suggested emoji based on heading text
   */
  private getSuggestedEmoji(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Direct matches
    for (const [key, emoji] of Object.entries(headingEmojis)) {
      if (lowerText.includes(key)) {
        return emoji;
      }
    }
    
    // Contextual suggestions
    if (lowerText.includes('over')) return '🎯';
    if (lowerText.includes('detail')) return '🔍';
    if (lowerText.includes('implement')) return '💡';
    if (lowerText.includes('refer')) return '🔗';
    if (lowerText.includes('meta')) return '📊';
    if (lowerText.includes('status')) return '📊';
    if (lowerText.includes('action')) return '⚡';
    if (lowerText.includes('metric')) return '📋';
    if (lowerText.includes('example')) return '💻';
    
    return '📋'; // Default emoji
  }

  /**
   * Remove existing headings while preserving non-heading content
   */
  private removeExistingHeadings(content: string): string {
    const lines = content.split('\n');
    const nonHeadingLines = lines.filter(line => !line.trim().startsWith('#'));
    return nonHeadingLines.join('\n').trim();
  }

  /**
   * Extract title from content
   */
  private extractTitle(content: string): string | null {
    // Try frontmatter first
    const frontmatterMatch = content.match(/^---\n.*?\ntitle:\s*"([^"]+)"\n.*?---/ms);
    if (frontmatterMatch) return frontmatterMatch[1];
    
    // Try title: without quotes
    const titleMatch = content.match(/^---\n.*?\ntitle:\s*([^\n]+)\n.*?---/ms);
    if (titleMatch) return titleMatch[1].trim();
    
    // Try first H1
    const h1Match = content.match(/^#\s+(.+)$/m);
    return h1Match ? h1Match[1] : null;
  }

  /**
   * Generate template suggestions based on content analysis
   */
  suggestTemplate(content: string): Array<{type: string, confidence: number}> {
    const suggestions: Array<{type: string, confidence: number}> = [];
    const lowerContent = content.toLowerCase();
    
    // Analyze content for type indicators
    const indicators = {
      'api-doc': ['api', 'endpoint', 'authentication', 'request', 'response'],
      'project': ['project', 'timeline', 'objectives', 'budget', 'team'],
      'meeting': ['meeting', 'attendees', 'agenda', 'action items', 'decisions'],
      'research': ['research', 'methodology', 'findings', 'analysis', 'hypothesis'],
      'guide': ['guide', 'tutorial', 'step', 'instructions', 'how to'],
      'adr': ['decision', 'context', 'consequences', 'alternatives', 'adr'],
      'dashboard': ['dashboard', 'metrics', 'status', 'kpi', 'analytics'],
      'template': ['template', 'usage', 'variables', 'example', 'customization'],
      'specification': ['specification', 'requirements', 'technical', 'performance']
    };
    
    // Calculate confidence scores
    for (const [type, keywords] of Object.entries(indicators)) {
      const matches = keywords.filter(keyword => lowerContent.includes(keyword)).length;
      const confidence = (matches / keywords.length) * 100;
      
      if (confidence > 30) {
        suggestions.push({ type, confidence });
      }
    }
    
    // Sort by confidence and return top 3
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  /**
   * Validate template application
   */
  validateTemplate(content: string, type: string): TemplateValidationResult {
    const rules = headingRules[type];
    if (!rules) {
      return { valid: false, errors: [`No rules defined for type: ${type}`] };
    }

    const lines = content.split('\n');
    const headings = lines
      .filter(line => line.trim().startsWith('#'))
      .map(line => line.replace(/^#+\s*/, '').replace(/^[\p{Emoji}\s]+/u, ''));

    const errors: string[] = = [];
    const warnings: string[] = [];

    // Check required headings
    rules.required.forEach(required => {
      const exists = headings.some(h => 
        h.toLowerCase().includes(required.toLowerCase())
      );
      if (!exists) {
        errors.push(`Missing required heading: "${required}"`);
      }
    });

    // Check forbidden headings
    if (rules.forbidden) {
      headings.forEach(heading => {
        if (rules.forbidden!.includes(heading)) {
          warnings.push(`Forbidden heading: "${heading}"`);
        }
      });
    }

    // Check section count
    if (headings.length < rules.minSections) {
      errors.push(`Too few sections (${headings.length}), minimum: ${rules.minSections}`);
    }
    if (headings.length > rules.maxSections) {
      warnings.push(`Too many sections (${headings.length}), maximum: ${rules.maxSections}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sectionCount: headings.length,
      required: rules.required.length,
      satisfied: rules.required.filter(req => 
        headings.some(h => h.toLowerCase().includes(req.toLowerCase()))
      ).length
    };
  }
}

interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sectionCount?: number;
  required?: number;
  satisfied?: number;
}

export { TemplateValidationResult };
```

---

## 📋 Usage Examples

### **Applying Templates Programmatically**

```typescript
// Example usage in a script or plugin
import { TemplateApplication } from './src/utils/template-application';

const templateApp = new TemplateApplication();

// Apply template to content
const content = `
---
title: "My API Documentation"
type: "api-doc"
---

## My API Documentation

This is the content...
`;

const enhanced = templateApp.applyTemplate(content, 'api-doc');
console.log(enhanced);

// Get template suggestions
const suggestions = templateApp.suggestTemplate(content);
console.log('Suggested templates:', suggestions);

// Validate template application
const validation = templateApp.validateTemplate(enhanced, 'api-doc');
console.log('Template validation:', validation);
```

### **Command Line Usage**

```bash
## Apply template to a file
bun scripts/apply-template.ts --file="api-doc.md" --type="api-doc"

## Get template suggestions
bun scripts/suggest-template.ts --file="untitled.md"

## Validate template compliance
bun scripts/validate-template.ts --file="project.md" --type="project"
```

---

## 🎯 Integration points

### ** Obsidian plugin integration**
- Template application commands
- Auto-suggestion on file creation
- Real-time validation feedback
- Quick template switching

### ** Cli tool integration**
- Batch template application
- Validation and reporting
- Template generation from existing content
- Compliance checking

### ** Api integration**
- Template suggestions via REST API
- Validation endpoints
- Template customization
- Bulk operations

---

*Type Heading Templates Configuration v2.0 • Complete heading structure standards and validation
rules*
