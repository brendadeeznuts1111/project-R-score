---
type: api-reference
title: Vault Types Reference
section: Development
category: technical-documentation
priority: high
status: published
tags: [types, vault, api, reference, documentation]
created: 2025-11-18T18:21:00Z
modified: 2025-11-18T18:21:00Z
author: Odds Protocol Development Team
teamMember: Type System Architect
version: 1.0.0
---

# 📋 Vault Types Reference

## **Complete API Documentation for Vault Type System**

---

## **🎯 VaultDocumentType Enum**

### **Document Type Classifications**

```typescript
export enum VaultDocumentType {
    NOTE = 'note',                    // 📝 General notes and thoughts
    API_DOC = 'api-doc',              // 🔌 API documentation
    PROJECT_PLAN = 'project-plan',    // 📋 Project planning documents
    MEETING_NOTES = 'meeting-notes',  // 🤝 Meeting records and summaries
    RESEARCH_NOTES = 'research-notes',// 🔬 Research findings and analysis
    DOCUMENTATION = 'documentation',  // 📚 Technical documentation
    SPECIFICATION = 'specification',  // 📐 Technical specifications
    TUTORIAL = 'tutorial',            // 🎓 Learning and tutorial content
    TEMPLATE = 'template',            // 📄 Reusable templates
    DAILY_NOTE = 'daily-note',        // 📅 Daily planning and notes
    WEEKLY_REVIEW = 'weekly-review',  // 📊 Weekly reviews and summaries
    PROJECT_STATUS = 'project-status' // 📈 Project status updates
}
```

### **Type Heading Mapping**

```typescript
export const typeHeadingMap: Record<VaultDocumentType, string> = {
    [VaultDocumentType.NOTE]: 'Note',
    [VaultDocumentType.API_DOC]: 'API Documentation',
    [VaultDocumentType.PROJECT_PLAN]: 'Project Plan',
    [VaultDocumentType.MEETING_NOTES]: 'Meeting Notes',
    [VaultDocumentType.RESEARCH_NOTES]: 'Research Notes',
    [VaultDocumentType.DOCUMENTATION]: 'Documentation',
    [VaultDocumentType.SPECIFICATION]: 'Specification',
    [VaultDocumentType.TUTORIAL]: 'Tutorial',
    [VaultDocumentType.TEMPLATE]: 'Template',
    [VaultDocumentType.DAILY_NOTE]: 'Daily Note',
    [VaultDocumentType.WEEKLY_REVIEW]: 'Weekly Review',
    [VaultDocumentType.PROJECT_STATUS]: 'Project Status'
} as const;
```

---

## **🎯 Priority Enum**

### **Priority Level Classifications**

```typescript
export enum Priority {
    LOW = 'low',           // 🔵 Low priority tasks
    MEDIUM = 'medium',     // 🟡 Medium priority tasks
    HIGH = 'high',         // 🟠 High priority tasks
    CRITICAL = 'critical', // 🔴 Critical priority tasks
    URGENT = 'urgent'      // ⚡ Urgent - immediate attention
}
```

### **Priority Color Mapping**

```typescript
export const priorityColorMap: Record<Priority, string> = {
    [Priority.LOW]: '1',      // Blue
    [Priority.MEDIUM]: '3',   // Yellow
    [Priority.HIGH]: '5',     // Red
    [Priority.CRITICAL]: '5', // Red
    [Priority.URGENT]: '5'    // Red
};
```

---

## **🎯 DocumentStatus Enum**

### **Status Lifecycle Management**

```typescript
export enum DocumentStatus {
    DRAFT = 'draft',           // 📝 Work in progress
    IN_PROGRESS = 'in-progress', // 🔄 Currently being developed
    REVIEW = 'review',         // 👀 Under review
    APPROVED = 'approved',     // ✅ Approved for publication
    PUBLISHED = 'published',   // 🌐 Published and live
    ARCHIVED = 'archived',     // 📦 Archived but preserved
    DEPRECATED = 'deprecated'  // ⚠️ Deprecated - replaced
}
```

### **Status Color Mapping**

```typescript
export const statusColorMap: Record<DocumentStatus, string> = {
    [DocumentStatus.DRAFT]: '1',        // Blue
    [DocumentStatus.IN_PROGRESS]: '3',  // Yellow
    [DocumentStatus.REVIEW]: '3',       // Yellow
    [DocumentStatus.APPROVED]: '2',     // Green
    [DocumentStatus.PUBLISHED]: '2',    // Green
    [DocumentStatus.ARCHIVED]: '4',     // Orange
    [DocumentStatus.DEPRECATED]: '5'    // Red
};
```

---

## **🏗️ Core Interfaces**

### **VaultFile Interface**

```typescript
export interface VaultFile {
    path: string;                    // 📁 File path in vault
    name: string;                    // 📄 File name without extension
    content: string;                 // 📝 File content
    frontmatter: Record<string, unknown>; // 📋 YAML frontmatter
    tags: string[];                  // 🏷️ File tags
    links: string[];                 // 🔗 Outgoing links
    backlinks: string[];             // 🔗 Incoming links
    created: Date;                   // 📅 Creation date
    modified: Date;                  // 🔄 Last modified date
    size: number;                    // 📊 File size in bytes
}
```

### **VaultMetadata Interface**

```typescript
export interface VaultMetadata {
    type: VaultDocumentType;         // 📋 Document type
    priority: Priority;              // 🎯 Priority level
    status: DocumentStatus;          // 📊 Current status
    author: string;                  // 👤 Document author
    teamMember: string;              // 👥 Team member responsible
    version: string;                 // 🏷️ Document version
    reviewDate: Date;                // 👀 Next review date
    tags: string[];                  // 🏷️ Additional tags
    customFields: Record<string, unknown>; // 🔧 Custom metadata
}
```

### **VaultRelationship Interface**

```typescript
export interface VaultRelationship {
    source: string;                  // 📤 Source file path
    target: string;                  // 📥 Target file path
    type: 'link' | 'tag' | 'reference'; // 🔗 Relationship type
    strength: number;                // 💪 Relationship strength (0-1)
    context: string;                 // 📝 Context description
    created: Date;                   // 📅 Relationship creation date
}
```

---

## **🎨 Color Mapping System**

### **Document Type Colors**

```typescript
export const documentTypeColorMap: Record<VaultDocumentType, string> = {
    [VaultDocumentType.NOTE]: '1',              // Blue
    [VaultDocumentType.API_DOC]: '2',           // Green
    [VaultDocumentType.PROJECT_PLAN]: '3',      // Yellow
    [VaultDocumentType.MEETING_NOTES]: '4',     // Orange
    [VaultDocumentType.RESEARCH_NOTES]: '5',    // Red
    [VaultDocumentType.DOCUMENTATION]: '6',     // Purple
    [VaultDocumentType.SPECIFICATION]: '7',     // Pink
    [VaultDocumentType.TUTORIAL]: '8',          // Teal
    [VaultDocumentType.TEMPLATE]: '9',          // Cyan
    [VaultDocumentType.DAILY_NOTE]: '1',        // Blue
    [VaultDocumentType.WEEKLY_REVIEW]: '3',     // Yellow
    [VaultDocumentType.PROJECT_STATUS]: '2'     // Green
};
```

### **Color Utility Functions**

```typescript
// Get color for document type
export function getColorForDocumentType(type: VaultDocumentType): string {
    return documentTypeColorMap[type];
}

// Get color for priority
export function getColorForPriority(priority: Priority): string {
    return priorityColorMap[priority];
}

// Get color for status
export function getColorForStatus(status: DocumentStatus): string {
    return statusColorMap[status];
}
```

---

## **🔍 Validation Types**

### **ValidationRule Interface**

```typescript
export interface ValidationRule {
    id: string;                      // 🏷️ Rule identifier
    name: string;                    // 📝 Rule name
    description: string;             // 📋 Rule description
    priority: Priority;              // 🎯 Rule priority
    condition: (file: VaultFile) => boolean; // 🔍 Validation condition
    weight: number;                  // ⚖️ Rule weight
    reasonTemplate: string;          // 💬 Reason template
}
```

### **ValidationResult Interface**

```typescript
export interface ValidationResult {
    valid: boolean;                  // ✅ Validation status
    score: number;                   // 📊 Validation score (0-100)
    violations: ValidationViolation[]; // ❌ Found violations
    suggestions: ValidationSuggestion[]; // 💡 Improvement suggestions
    timestamp: Date;                 // ⏰ Validation timestamp
}
```

### **ValidationViolation Interface**

```typescript
export interface ValidationViolation {
    ruleId: string;                  // 🏷️ Violated rule ID
    severity: 'error' | 'warning' | 'info'; // 🚨 Violation severity
    message: string;                 // 💬 Violation message
    line?: number;                   // 📍 Line number (if applicable)
    column?: number;                 // 📍 Column number (if applicable)
    suggestion?: string;             // 💡 Fix suggestion
}
```

---

## **🛠️ Utility Functions**

### **Type Checking Functions**

```typescript
// Check if string is valid document type
export function isValidDocumentType(type: string): type is VaultDocumentType {
    return Object.values(VaultDocumentType).includes(type as VaultDocumentType);
}

// Check if string is valid priority
export function isValidPriority(priority: string): priority is Priority {
    return Object.values(Priority).includes(priority as Priority);
}

// Check if string is valid status
export function isValidStatus(status: string): status is DocumentStatus {
    return Object.values(DocumentStatus).includes(status as DocumentStatus);
}
```

### **Conversion Functions**

```typescript
// Parse document type from string
export function parseDocumentType(type: string): VaultDocumentType | null {
    return isValidDocumentType(type) ? type : null;
}

// Parse priority from string
export function parsePriority(priority: string): Priority | null {
    return isValidPriority(priority) ? priority : null;
}

// Parse status from string
export function parseStatus(status: string): DocumentStatus | null {
    return isValidStatus(status) ? status : null;
}
```

---

## **📊 Usage Examples**

### **Creating a Vault File**

```typescript
const vaultFile: VaultFile = {
    path: 'docs/api-reference.md',
    name: 'api-reference',
    content: '# API Reference\n\n...',
    frontmatter: {
        type: 'api-doc',
        priority: 'high',
        status: 'published'
    },
    tags: ['api', 'documentation', 'reference'],
    links: ['docs/quick-start.md', 'docs/examples.md'],
    backlinks: ['README.md'],
    created: new Date(),
    modified: new Date(),
    size: 1024
};
```

### **Validating Document Types**

```typescript
const docType = parseDocumentType('documentation');
if (docType) {
    const color = getColorForDocumentType(docType);
    const heading = typeHeadingMap[docType];
    console.log(`Type: ${docType}, Color: ${color}, Heading: ${heading}`);
}
```

### **Creating Validation Rules**

```typescript
const validationRule: ValidationRule = {
    id: 'has-valid-document-type',
    name: 'Valid Document Type',
    description: 'Document must have a valid type',
    priority: Priority.HIGH,
    condition: (file) => {
        const type = file.frontmatter.type as string;
        return isValidDocumentType(type);
    },
    weight: 10,
    reasonTemplate: 'Document type "{{type}}" is not valid'
};
```

---

## **🎯 Best Practices**

### **1. Type Safety**
- Always use enum values instead of strings
- Leverage type guards for runtime validation
- Use proper TypeScript typing throughout

### **2. Consistency**
- Follow naming conventions (kebab-case for IDs)
- Maintain consistent metadata structure
- Use standard color mappings

### **3. Validation**
- Validate all external inputs
- Use proper error handling
- Provide clear error messages

### **4. Performance**
- Cache validation results
- Use efficient type checking
- Minimize object creation

---

## **📚 Related Documentation**

- **Type System Overview** - High-level architecture
- **Canvas Types Guide** - Canvas integration specifics
- **Validation Patterns** - Validation framework usage
- **Workshop Examples** - Practical implementation examples

---

**🏆 This reference provides the complete API for the Odds Protocol vault type system.**
