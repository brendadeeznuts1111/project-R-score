---
type: reference
title: Document Types
section: Development
category: technical-documentation
priority: high
status: published
tags: [document, types, vault, enum, classification]
created: 2025-11-18T18:25:00Z
modified: 2025-11-18T18:25:00Z
author: Odds Protocol Development Team
teamMember: Type System Specialist
version: 1.0.0
---

# 📊 Document Types

## **VaultDocumentType Enum with 12 Types**

---

## **🎯 Overview**

The VaultDocumentType enum provides a comprehensive classification system for all documents within the Odds Protocol vault, enabling intelligent organization, validation, and processing based on document purpose and structure.

---

## **📋 Complete Type Classification**

### **Core Document Types**

```typescript
export enum VaultDocumentType {
    // 📝 Content Creation Types
    NOTE = 'note',                    // General notes and thoughts
    RESEARCH_NOTES = 'research-notes',// Research findings and analysis
    MEETING_NOTES = 'meeting-notes',  // Meeting records and summaries
    DAILY_NOTE = 'daily-note',        // Daily planning and notes
    WEEKLY_REVIEW = 'weekly-review',  // Weekly reviews and summaries
    
    // 📚 Documentation Types
    DOCUMENTATION = 'documentation',  // Technical documentation
    API_DOC = 'api-doc',              // API documentation
    SPECIFICATION = 'specification',  // Technical specifications
    TUTORIAL = 'tutorial',            // Learning and tutorial content
    
    // 📋 Management Types
    PROJECT_PLAN = 'project-plan',    // Project planning documents
    PROJECT_STATUS = 'project-status', // Project status updates
    TEMPLATE = 'template'             // Reusable templates
}
```

---

## **🏷️ Type Definitions and Usage**

### **1. NOTE - General Notes**

```typescript
// Purpose: General knowledge capture and informal documentation
// Structure: Flexible, markdown-based
// Validation: Basic content requirements
// Processing: Full-text indexing and tagging

interface NoteDocument {
    type: 'note';
    content: string;
    tags: string[];
    created: Date;
    modified: Date;
    author: string;
}

// Example usage
const note: NoteDocument = {
    type: 'note',
    content: '# Quick Note\n\nImportant information to remember...',
    tags: ['important', 'reference'],
    created: new Date(),
    modified: new Date(),
    author: 'Team Member'
};
```

### **2. RESEARCH_NOTES - Research Documentation**

```typescript
// Purpose: Structured research findings and analysis
// Structure: Formal with sections, citations, and conclusions
// Validation: Research methodology compliance
// Processing: Citation extraction and topic analysis

interface ResearchDocument {
    type: 'research-notes';
    title: string;
    abstract: string;
    methodology: string;
    findings: string[];
    conclusions: string;
    citations: Citation[];
    sources: Source[];
}

// Example usage
const research: ResearchDocument = {
    type: 'research-notes',
    title: 'Performance Analysis of Type System',
    abstract: 'Analysis of type system performance characteristics...',
    methodology: 'Benchmark testing and profiling...',
    findings: [
        'Type validation adds 5ms overhead',
        'Memory usage optimized by 15%',
        'Processing speed improved by 25%'
    ],
    conclusions: 'Type system provides excellent performance with minimal overhead',
    citations: [],
    sources: []
};
```

### **3. MEETING_NOTES - Meeting Records**

```typescript
// Purpose: Structured meeting documentation
// Structure: Agenda, attendees, decisions, action items
// Validation: Required fields for meeting tracking
// Processing: Action item extraction and follow-up

interface MeetingDocument {
    type: 'meeting-notes';
    title: string;
    date: Date;
    attendees: string[];
    agenda: AgendaItem[];
    discussions: DiscussionItem[];
    decisions: Decision[];
    actionItems: ActionItem[];
    nextMeeting?: Date;
}

// Example usage
const meeting: MeetingDocument = {
    type: 'meeting-notes',
    title: 'Type System Architecture Review',
    date: new Date('2025-11-18T10:00:00Z'),
    attendees: ['Alice', 'Bob', 'Charlie'],
    agenda: [
        { topic: 'Review current type system', duration: 30 },
        { topic: 'Discuss enhancements', duration: 45 }
    ],
    discussions: [
        { topic: 'Type validation performance', summary: 'Discussed optimization strategies' }
    ],
    decisions: [
        { decision: 'Implement enhanced validation', owner: 'Alice', due: new Date() }
    ],
    actionItems: [
        { action: 'Create validation patterns document', owner: 'Bob', due: new Date() }
    ]
};
```

### **4. DOCUMENTATION - Technical Documentation**

```typescript
// Purpose: Formal technical documentation
// Structure: Hierarchical with TOC, sections, and subsections
// Validation: Content structure and completeness
// Processing: TOC generation and cross-linking

interface DocumentationDocument {
    type: 'documentation';
    title: string;
    category: string;
    sections: DocumentationSection[];
    toc: TableOfContents;
    references: Reference[];
    appendices: Appendix[];
}

// Example usage
const documentation: DocumentationDocument = {
    type: 'documentation',
    title: 'Type System Architecture Guide',
    category: 'technical',
    sections: [
        {
            id: 'overview',
            title: 'Overview',
            content: 'Comprehensive overview of the type system...',
            subsections: [
                { id: 'goals', title: 'Goals', content: 'System design goals...' }
            ]
        }
    ],
    toc: [
        { id: 'overview', title: 'Overview', level: 1, page: 1 },
        { id: 'goals', title: 'Goals', level: 2, page: 2 }
    ],
    references: [],
    appendices: []
};
```

### **5. API_DOC - API Documentation**

```typescript
// Purpose: API interface documentation
// Structure: Endpoints, parameters, responses, examples
// Validation: API specification compliance
// Processing: Schema validation and example generation

interface ApiDocument {
    type: 'api-doc';
    apiName: string;
    version: string;
    baseUrl: string;
    endpoints: ApiEndpoint[];
    schemas: ApiSchema[];
    authentication: AuthenticationScheme;
    examples: ApiExample[];
}

// Example usage
const apiDoc: ApiDocument = {
    type: 'api-doc',
    apiName: 'Type System API',
    version: '1.0.0',
    baseUrl: 'https://api.oddsprotocol.com/v1',
    endpoints: [
        {
            path: '/types',
            method: 'GET',
            description: 'Get all document types',
            parameters: [],
            responses: [
                { code: 200, description: 'Success', schema: 'TypeList' }
            ]
        }
    ],
    schemas: [
        {
            name: 'TypeList',
            type: 'array',
            items: { type: 'string', enum: Object.values(VaultDocumentType) }
        }
    ],
    authentication: {
        type: 'bearer',
        tokenUrl: '/auth/token'
    },
    examples: []
};
```

---

## **🎨 Type Color Mapping**

### **Visual Classification System**

```typescript
export const documentTypeColorMap: Record<VaultDocumentType, string> = {
    // 📝 Content Creation (Blue tones)
    [VaultDocumentType.NOTE]: '1',              // Light blue
    [VaultDocumentType.RESEARCH_NOTES]: '2',     // Medium blue
    [VaultDocumentType.MEETING_NOTES]: '3',     // Dark blue
    [VaultDocumentType.DAILY_NOTE]: '4',        // Navy blue
    [VaultDocumentType.WEEKLY_REVIEW]: '5',     // Royal blue
    
    // 📚 Documentation (Green tones)
    [VaultDocumentType.DOCUMENTATION]: '2',     // Light green
    [VaultDocumentType.API_DOC]: '3',           // Medium green
    [VaultDocumentType.SPECIFICATION]: '4',     // Dark green
    [VaultDocumentType.TUTORIAL]: '5',          // Forest green
    
    // 📋 Management (Orange/Yellow tones)
    [VaultDocumentType.PROJECT_PLAN]: '3',      // Light orange
    [VaultDocumentType.PROJECT_STATUS]: '4',    // Dark orange
    [VaultDocumentType.TEMPLATE]: '5'           // Gold
};
```

### **Icon Mapping**

```typescript
export const documentTypeIconMap: Record<VaultDocumentType, string> = {
    [VaultDocumentType.NOTE]: '📝',
    [VaultDocumentType.RESEARCH_NOTES]: '🔬',
    [VaultDocumentType.MEETING_NOTES]: '🤝',
    [VaultDocumentType.DAILY_NOTE]: '📅',
    [VaultDocumentType.WEEKLY_REVIEW]: '📊',
    [VaultDocumentType.DOCUMENTATION]: '📚',
    [VaultDocumentType.API_DOC]: '🔌',
    [VaultDocumentType.SPECIFICATION]: '📐',
    [VaultDocumentType.TUTORIAL]: '🎓',
    [VaultDocumentType.PROJECT_PLAN]: '📋',
    [VaultDocumentType.PROJECT_STATUS]: '📈',
    [VaultDocumentType.TEMPLATE]: '📄'
};
```

---

## **🔧 Type Validation and Processing**

### **Type Validation Rules**

```typescript
export class DocumentTypeValidator {
    // Validate document structure based on type
    static validate(document: any): ValidationResult {
        const type = document.type;
        
        switch (type) {
            case VaultDocumentType.NOTE:
                return this.validateNote(document);
            case VaultDocumentType.RESEARCH_NOTES:
                return this.validateResearchNotes(document);
            case VaultDocumentType.MEETING_NOTES:
                return this.validateMeetingNotes(document);
            case VaultDocumentType.DOCUMENTATION:
                return this.validateDocumentation(document);
            case VaultDocumentType.API_DOC:
                return this.validateApiDoc(document);
            // ... other types
            default:
                return { valid: false, errors: ['Unknown document type'] };
        }
    }
    
    private static validateNote(note: any): ValidationResult {
        const errors: string[] = [];
        
        if (!note.content) errors.push('Note content is required');
        if (!Array.isArray(note.tags)) errors.push('Tags must be an array');
        if (!note.created) errors.push('Created date is required');
        
        return {
            valid: errors.length === 0,
            errors,
            warnings: []
        };
    }
    
    private static validateResearchNotes(research: any): ValidationResult {
        const errors: string[] = [];
        
        if (!research.title) errors.push('Research title is required');
        if (!research.abstract) errors.push('Abstract is required');
        if (!Array.isArray(research.findings)) errors.push('Findings must be an array');
        if (!research.conclusions) errors.push('Conclusions are required');
        
        return {
            valid: errors.length === 0,
            errors,
            warnings: []
        };
    }
}
```

### **Type Processing Pipeline**

```typescript
export class DocumentTypeProcessor {
    // Process document based on type
    static async process(document: any): Promise<ProcessedDocument> {
        const type = document.type;
        
        switch (type) {
            case VaultDocumentType.NOTE:
                return this.processNote(document);
            case VaultDocumentType.RESEARCH_NOTES:
                return this.processResearchNotes(document);
            case VaultDocumentType.MEETING_NOTES:
                return this.processMeetingNotes(document);
            case VaultDocumentType.DOCUMENTATION:
                return this.processDocumentation(document);
            case VaultDocumentType.API_DOC:
                return this.processApiDoc(document);
            // ... other types
            default:
                throw new Error(`Unknown document type: ${type}`);
        }
    }
    
    private static async processNote(note: any): Promise<ProcessedDocument> {
        return {
            ...note,
            processed: true,
            wordCount: this.countWords(note.content),
            readingTime: this.estimateReadingTime(note.content),
            extractedTags: this.extractTags(note.content),
            links: this.extractLinks(note.content)
        };
    }
    
    private static async processResearchNotes(research: any): Promise<ProcessedDocument> {
        return {
            ...research,
            processed: true,
            citations: this.extractCitations(research.content),
            topics: this.extractTopics(research.content),
            methodologyScore: this.scoreMethodology(research.methodology),
            evidenceStrength: this.assessEvidence(research.findings)
        };
    }
}
```

---

## **📈 Type Analytics and Metrics**

### **Type Distribution Analysis**

```typescript
export class DocumentTypeAnalytics {
    // Analyze document type distribution
    static analyzeDistribution(documents: any[]): TypeDistribution {
        const distribution: Record<VaultDocumentType, number> = {} as any;
        
        // Initialize counts
        for (const type of Object.values(VaultDocumentType)) {
            distribution[type] = 0;
        }
        
        // Count documents by type
        for (const doc of documents) {
            distribution[doc.type]++;
        }
        
        return {
            distribution,
            total: documents.length,
            percentages: this.calculatePercentages(distribution, documents.length),
            recommendations: this.generateRecommendations(distribution)
        };
    }
    
    // Calculate type health metrics
    static calculateTypeHealth(documents: any[]): TypeHealthMetrics {
        const metrics: Record<VaultDocumentType, TypeHealth> = {} as any;
        
        for (const type of Object.values(VaultDocumentType)) {
            const typeDocs = documents.filter(doc => doc.type === type);
            
            metrics[type] = {
                count: typeDocs.length,
                averageQuality: this.calculateAverageQuality(typeDocs),
                completeness: this.calculateCompleteness(typeDocs),
                lastUpdated: this.getLatestUpdate(typeDocs),
                issues: this.identifyIssues(typeDocs)
            };
        }
        
        return metrics;
    }
}
```

---

## **🎯 Best Practices**

### **1. Type Selection Guidelines**

- **NOTE**: Use for informal knowledge capture and quick documentation
- **RESEARCH_NOTES**: Use for structured research with methodology and findings
- **MEETING_NOTES**: Use for formal meeting documentation with action items
- **DOCUMENTATION**: Use for comprehensive technical documentation
- **API_DOC**: Use for API interface specifications and examples
- **SPECIFICATION**: Use for detailed technical specifications
- **TUTORIAL**: Use for step-by-step learning content
- **PROJECT_PLAN**: Use for project planning and milestone tracking
- **PROJECT_STATUS**: Use for project progress updates
- **TEMPLATE**: Use for reusable document templates
- **DAILY_NOTE**: Use for daily planning and reflection
- **WEEKLY_REVIEW**: Use for weekly progress reviews

### **2. Type Consistency Rules**

1. **Always specify type** in document frontmatter
2. **Follow type-specific structure** requirements
3. **Use appropriate metadata** for each type
4. **Maintain type consistency** across related documents
5. **Update type when document purpose changes**

### **3. Type Migration Guidelines**

```typescript
// Example: Migrate document to new type
export function migrateDocumentType(
    document: any, 
    newType: VaultDocumentType
): any {
    const migrated = { ...document, type: newType };
    
    // Add required fields for new type
    switch (newType) {
        case VaultDocumentType.MEETING_NOTES:
            if (!migrated.attendees) migrated.attendees = [];
            if (!migrated.actionItems) migrated.actionItems = [];
            break;
        case VaultDocumentType.RESEARCH_NOTES:
            if (!migrated.findings) migrated.findings = [];
            if (!migrated.conclusions) migrated.conclusions = '';
            break;
        // ... other type migrations
    }
    
    return migrated;
}
```

---

## **📚 Related Documentation**

- **[[04 - Development/Type System/type-system-overview.md]]** - Core type system
- **[[04 - Development/Type System/tick-processor-types-reference.md]]** - Complete type reference
- **[[src/types/tick-processor-types.ts]]** - Technical implementation
- **[[🔗 Reference System Types]]** - Cross-link management

---

**🏆 This comprehensive document type system provides intelligent classification and processing for all vault content.**
