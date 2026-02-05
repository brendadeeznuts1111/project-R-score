---
type: style-guide
title: 🎨 Comprehensive Style Guide
version: "2.0"
category: standards
priority: high
status: active
tags:
  - style-guide
  - standards
  - consistency
  - rules
created: 2025-11-18T15:03:00Z
updated: 2025-11-18T15:03:00Z
author: system
review-frequency: monthly
---



# 🎨 Comprehensive Style Guide

## Overview

*Consolidated from: Brief description of this content.*


> **Unified standards for all content types in the Odds Protocol vault**

---

## 🎯 Core Principles

*Consolidated from: ### **Consistency First***
- Every content type follows the same structural rules
- Unified visual language across all formats
- Standardized metadata and formatting

### **Professional Standards**
- Enterprise-grade appearance and organization
- Clear information hierarchy
- Accessibility and readability focus

### **Scalable Design**
- Templates that grow with content needs
- Flexible structure for various content types
- Future-proof organization systems

---

## 📝 Note standards

*Consolidated from: ### ** Required frontmatter***
```yaml
---
type: {content-type}
title: "{descriptive-title}"
section: "{section-number}"
category: "{content-category}"
priority: "{priority-level}"
status: "{status-level}"
tags:
  - {section-tag}
  - {category-tag}
  - {additional-tags}
created: "{date:YYYY-MM-DDTHH:mm:ssZ}"
updated: "{date:YYYY-MM-DDTHH:mm:ssZ}"
author: "{author-name}"
review-date: "{date:+30d}"
---
```

### ** Content structure rules**
1. **H1 Title**: Must include relevant emoji and be descriptive
2. **Overview Section**: Brief description with metadata badge
3. **Table of Contents**: Auto-generated with proper anchors
4. **Main Content**: Organized with H2/H3 headings
5. **Related Content**: Links and references section
6. **Metadata Table**: Summary of key information

### ** Formatting standards**
```markdown
## 🎯 Descriptive Title

> **📍 Section**: [02] | **🏷️ Category**: [Development] | **⚡ Priority**: [High] | **📊 Status**:
[Active]

---

## 🎯 Overview

*Consolidated from: [Brief, clear description of content purpose]*

---

## 📑 Table of contents

*Consolidated from: ```toc*
## Table Of Contents
- [🎯 Overview](#-overview)
- [🔍 Key Details](#-key-details)
- [💡 Implementation](#-implementation)
- [📊 Analysis](#-analysis)
- [🔗 References](#-references)
```

---

## 🔍 Key Details

*Consolidated from: [Main content with proper heading hierarchy]*

---

## 🔗 References

*Consolidated from: ### Related notes*
```dataview
LIST
FROM ""
WHERE contains(this.file.links, file.path) OR contains(file.links, this.file.path)
LIMIT 5
```

---

## 📊 Metadata

*Consolidated from: | Property | Value |*
|----------|-------|
| **Created** | { date:YYYY-MM-DDTHH:mm:ssZ } |
| **Section** | [{ section }] |
| **Category** | [{ category }] |
| **Priority** | [{ priority }] |
| **Status** | [{ status }] |

---

*Note follows enhanced Odds Protocol documentation standards*
```

---

## 🎨 Canvas Standards

*Consolidated from: ### **Canvas Structure Rules***
```json
{
  "nodes": [
    {
      "id": "canvas-overview",
      "x": -400,
      "y": -300,
      "width": 320,
      "height": 200,
      "type": "text",
      "text": "# 🎨 Canvas Title\n\n## Purpose\n[Clear description of canvas
      purpose]\n\n---\n*Canvas v{version}*"
    },
    {
      "id": "key-components",
      "x": -800,
      "y": 0,
      "width": 300,
      "height": 180,
      "type": "text",
      "text": "## 🔑 Key Components\n\n- **Component 1**: Description\n- **Component 2**:
      Description\n- **Component 3**: Description"
    }
  ],
  "edges": [
    {
      "id": "connection-1",
      "fromNode": "canvas-overview",
      "fromSide": "left",
      "toNode": "key-components",
      "toSide": "right",
      "color": "1",
      "label": "Relationship"
    }
  ]
}
```

### **Canvas Node Types**
1. **Overview Node**: Main canvas description and purpose
2. **Component Nodes**: Individual elements or concepts
3. **Process Nodes**: Workflow or step-by-step elements
4. **Data Nodes**: Information and metrics
5. **Connection Nodes**: Relationships and integrations

### **Visual Standards**
- **Color Coding**: Use consistent colors for node types
- **Spacing**: Maintain 100px minimum spacing between nodes
- **Hierarchy**: Larger nodes for important concepts
- **Connections**: Use color-coded edges for relationship types

---

## 📊 Base (database) standards

*Consolidated from: ### ** Base structure template***
```yaml
---
type: base-database
title: "📊 {Database Name}"
version: "2.0"
category: "database"
priority: "high"
status: "active"
tags:
  - database
  - {category-tag}
  - structured-data
created: "{date:YYYY-MM-DDTHH:mm:ssZ}"
updated: "{date:YYYY-MM-DDTHH:mm:ssZ}"
author: system
---

views:
  - type: table
    name: Overview
    config:
      columns:
        - name: Title
          key: title
        - name: Status
          key: status
        - name: Priority
          key: priority
        - name: Updated
          key: updated
  - type: gallery
    name: Visual View
    config:
      cover:
        field: image
      size: medium
  - type: board
    name: Kanban View
    config:
      columns:
        - name: To Do
          key: status
          value: todo
        - name: In Progress
          key: status
          value: in-progress
        - name: Done
          key: status
          value: done
```

### ** Required fields**
```yaml
## Standard Fields For All Databases
fields:
  - name: title
    type: text
    required: true
  - name: description
    type: text
    required: true
  - name: status
    type: select
    options: [todo, in-progress, done, blocked]
    default: todo
  - name: priority
    type: select
    options: [low, medium, high, critical]
    default: medium
  - name: created
    type: date
    required: true
  - name: updated
    type: date
    required: true
  - name: tags
    type: tags
    required: true
  - name: assignee
    type: text
  - name: due_date
    type: date
```

---

## 🔧 Implementation Rules

*Consolidated from: ### **New Note Creation***
1. **Always Use Templates**: Never create blank notes
2. **Complete Frontmatter**: Fill all required metadata
3. **Follow Structure**: Use standard heading hierarchy
4. **Add Relationships**: Link to related content
5. **Include TOC**: Auto-generate table of contents

### **New Canvas Creation**
1. **Start with Template**: Use canvas template structure
2. **Define Purpose**: Clear overview node with description
3. **Logical Layout**: Organize nodes by relationship and importance
4. **Color Consistency**: Use standard color scheme
5. **Connection Clarity**: Label all edges with relationship types

### **New Base Creation**
1. **Define Schema**: Complete field definitions with types
2. **Multiple Views**: Include table, gallery, and board views
3. **Standard Fields**: Use required field set
4. **Validation Rules**: Set up field constraints
5. **Relationship Fields**: Include links to related content

---

## 📋 Quality checklist

*Consolidated from: ### ** Note quality checklist***
- [ ] **Complete Frontmatter**: All required fields filled
- [ ] **Proper Title**: Descriptive with relevant emoji
- [ ] **Overview Section**: Clear purpose description
- [ ] **TOC Included**: Auto-generated table of contents
- [ ] **Heading Hierarchy**: Proper H1 → H2 → H3 structure
- [ ] **Metadata Table**: Summary of key information
- [ ] **Related Links**: Connected to relevant content
- [ ] **Tags Applied**: Proper categorization tags

### ** Canvas quality checklist**
- [ ] **Overview Node**: Clear purpose and description
- [ ] **Logical Layout**: Nodes organized by relationship
- [ ] **Consistent Spacing**: Proper spacing between elements
- [ ] **Color Coding**: Standard colors for node types
- [ ] **Labeled Edges**: All connections have descriptions
- [ ] **Readable Text**: All text nodes are legible
- [ ] **Version Info**: Canvas version and date included

### ** Base quality checklist**
- [ ] **Complete Schema**: All fields properly defined
- [ ] **Multiple Views**: Table, gallery, and board views
- [ ] **Required Fields**: Standard field set included
- [ ] **Validation Rules**: Field constraints configured
- [ ] **Relationship Fields**: Links to related databases
- [ ] **Default Values**: Sensible defaults set
- [ ] **View Configuration**: Proper column and filter setup

---

## 🎨 Visual Standards

*Consolidated from: ### **Color Usage***
```css
/* Standard color assignments */
--primary: #6366f1;    /* Main actions and importance */
--secondary: #22d3ee;  /* Secondary information */
--success: #10b981;    /* Completed states */
--warning: #f59e0b;    /* Attention needed */
--error: #ef4444;      /* Critical issues */
--info: #3b82f6;       /* Information and help */
```

### **Typography Standards**
- **H1**: 48px, Bold, with emoji
- **H2**: 36px, Semibold, with emoji
- **H3**: 24px, Semibold, optional emoji
- **Body**: 16px, Regular, Inter font
- **Code**: 14px, JetBrains Mono

### **Spacing Standards**
- **Section Margins**: 2rem between major sections
- **Component Padding**: 1rem internal padding
- **List Spacing**: 0.5rem between list items
- **Table Padding**: 0.75rem cell padding

---

## 🔄 Template system

*Consolidated from: ### ** Template hierarchy***
```
06 - Templates/
├── 📝 Note Templates/
│   ├── Enhanced Note Template.md
│   ├── Project Template.md
│   ├── Meeting Template.md
│   └── Research Template.md
├── 🎨 Canvas Templates/
│   ├── System Design Canvas.canvas
│   ├── Project Planning Canvas.canvas
│   ├── Workflow Canvas.canvas
│   └── Integration Canvas.canvas
├── 📊 Base Templates/
│   ├── Project Management.base
│   ├── Task Tracking.base
│   ├── Resource Library.base
│   └── Knowledge Base.base
└── 🔧 Utility Templates/
    ├── Folder Structure Template.md
    ├── Design System Guide.md
    └── Style Guide Template.md
```

### ** Template usage rules**
1. **Always Start from Template**: Never create blank content
2. **Customize Appropriately**: Adapt template to specific needs
3. **Maintain Structure**: Keep core template elements
4. **Update Metadata**: Fill all template variables
5. **Follow Standards**: Adhere to style guide rules

---

## 🚀 Automation Enforcement

*Consolidated from: ### **Automated Rules***
```javascript
// Style enforcement automation
const StyleEnforcer = {
  validateNote: (note) => {
    // Check frontmatter completeness
    // Validate heading structure
    // Verify metadata consistency
    // Ensure proper formatting
  },
  
  validateCanvas: (canvas) => {
    // Check node structure
    // Verify connection logic
    // Validate color usage
    // Ensure readability
  },
  
  validateBase: (base) => {
    // Check schema completeness
    // Validate field types
    // Verify view configuration
    // Ensure relationship integrity
  }
};
```

### **Quality Gates**
- **Creation Gate**: Templates must be used for new content
- **Update Gate**: Changes must maintain style compliance
- **Link Gate**: All content must have proper relationships
- **Metadata Gate**: Required fields must be complete

---

## 📈 Metrics & monitoring

*Consolidated from: ### ** Compliance metrics***
- **Frontmatter Completion**: 100% required
- **Template Usage**: 95%+ compliance
- **Link Coverage**: 80%+ content linked
- **Style Consistency**: 90%+ compliance

### ** Quality indicators**
- **Readability Score**: 8.0+ average
- **Accessibility Score**: WCAG AA compliance
- **Mobile Optimization**: 100% responsive
- **Performance**: <2s load time

---

## 🛠️ Tools & Resources

*Consolidated from: ### **Validation Tools***
- **Style Checker**: Automated validation script
- **Template Validator**: Template compliance checker
- **Link Analyzer**: Relationship verification tool
- **Quality Auditor**: Comprehensive quality assessment

### **Helper Resources**
- **Quick Reference**: Style cheat sheet
- **Template Gallery**: Visual template examples
- **Best Practices**: Usage guidelines and tips
- **Troubleshooting**: Common issues and solutions

---

## 📚 Training & documentation

*Consolidated from: ### ** User guides***

### ** Advanced topics**

---

## 🔄 Continuous Improvement

*Consolidated from: ### **Regular Reviews***
- **Monthly**: Style guide updates and improvements
- **Quarterly**: Template optimization and expansion
- **Annually**: Comprehensive system evaluation

### **Community Input**
- **Feedback Collection**: User suggestions and requests
- **Usage Analytics**: Template and style adoption rates
- **Quality Metrics**: System health and compliance tracking

---

*Comprehensive Style Guide v2.0 • Ensuring consistency and quality across all Odds Protocol content*
