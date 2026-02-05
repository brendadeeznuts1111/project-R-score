---
type: documentation
title: Template System Types
section: Development
category: technical-documentation
priority: high
status: published
tags: [template, system, types, engine, generation]
created: 2025-11-18T18:25:00Z
modified: 2025-11-18T18:25:00Z
author: Odds Protocol Development Team
teamMember: Template System Architect
version: 1.0.0
---

# 🔧 Template System Types

## **Complete Template Engine**

---

## **🎯 Overview**

The Template System provides a comprehensive engine for creating, managing, and processing document templates with dynamic content generation, validation, and lifecycle management.

---

## **🏗️ Core Template Types**

### **Template Interface**

```typescript
export interface Template {
    // Template identification
    id: string;                      // 🏷️ Unique template identifier
    name: string;                    // 📝 Template name
    description: string;             // 📋 Template description
    version: SemanticVersion;        // 🏷️ Template version
    
    // Template classification
    category: TemplateCategory;      // 📂 Template category
    type: TemplateType;              // 📋 Template type
    tags: string[];                  // 🏷️ Template tags
    
    // Template content
    content: TemplateContent;        // 📄 Template content structure
    variables: TemplateVariable[];   // 🔧 Template variables
    sections: TemplateSection[];     // 📋 Template sections
    
    // Template configuration
    config: TemplateConfiguration;   // ⚙️ Template configuration
    validation: TemplateValidation;  // ✅ Validation rules
    
    // Processing
    processor: TemplateProcessor;    // 🤖 Template processor
    renderer: TemplateRenderer;      // 🎨 Template renderer
    
    // Lifecycle
    created: Date;                   // 📅 Creation timestamp
    modified: Date;                  // 🔄 Last modified timestamp
    author: string;                  // 👤 Template author
    status: TemplateStatus;          // 📊 Template status
}
```

### **TemplateContent Interface**

```typescript
export interface TemplateContent {
    // Content structure
    header: TemplateHeader;          // 📋 Template header
    body: TemplateBody;              // 📄 Template body
    footer: TemplateFooter;          // 🔻 Template footer
    
    // Content sections
    sections: ContentSection[];      // 📋 Content sections
    blocks: ContentBlock[];          // 🧩 Content blocks
    
    // Dynamic content
    placeholders: Placeholder[];     // 🔧 Dynamic placeholders
    conditionals: ConditionalBlock[]; // 🔄 Conditional blocks
    loops: LoopBlock[];              // 🔁 Loop blocks
    
    // Media and assets
    images: TemplateImage[];         // 🖼️ Template images
    attachments: TemplateAttachment[]; // 📎 Template attachments
    styles: TemplateStyle[];         // 🎨 Template styles
    scripts: TemplateScript[];       // 📜 Template scripts
}
```

### **TemplateVariable Interface**

```typescript
export interface TemplateVariable {
    // Variable identification
    id: string;                      // 🏷️ Variable identifier
    name: string;                    // 📝 Variable name
    description: string;             // 📋 Variable description
    
    // Variable type and validation
    type: VariableType;              // 📋 Variable type
    dataType: DataType;              // 🔤 Data type
    validation: VariableValidation;  // ✅ Validation rules
    
    // Variable configuration
    required: boolean;               // 📋 Is variable required
    defaultValue?: any;              // 🔧 Default value
    options?: VariableOption[];      // 📋 Variable options
    
    // Variable behavior
    computed: boolean;               // 🤖 Is computed variable
    computation?: VariableComputation; // 🧮 Computation logic
    dependencies: string[];          // 📦 Variable dependencies
    
    // UI configuration
    uiConfig: VariableUIConfig;      // 🎨 UI configuration
    helpText?: string;               // 💡 Help text
    examples: VariableExample[];     // 📝 Usage examples
}
```

---

## **🔧 Variable Type System**

### **Variable Types**

```typescript
export enum VariableType {
    // Basic types
    STRING = 'string',               // 🔤 Text input
    NUMBER = 'number',               // 🔢 Numeric input
    BOOLEAN = 'boolean',             // ☑️ True/false
    DATE = 'date',                   // 📅 Date picker
    TIME = 'time',                   // ⏰ Time picker
    
    // Selection types
    SELECT = 'select',               // 📋 Single selection
    MULTI_SELECT = 'multi-select',   // 📋 Multiple selection
    RADIO = 'radio',                 // 🔘 Radio buttons
    CHECKBOX = 'checkbox',           // ☑️ Checkboxes
    
    // Content types
    TEXTAREA = 'textarea',           // 📝 Multi-line text
    RICH_TEXT = 'rich-text',         // 🎨 Rich text editor
    MARKDOWN = 'markdown',           // 📄 Markdown editor
    CODE = 'code',                   // 💻 Code editor
    
    // Special types
    FILE = 'file',                   // 📎 File upload
    IMAGE = 'image',                 // 🖼️ Image upload
    URL = 'url',                     // 🔗 URL input
    EMAIL = 'email',                 // 📧 Email input
    COLOR = 'color',                 // 🎨 Color picker
    
    // Complex types
    ARRAY = 'array',                 // 📦 Array of items
    OBJECT = 'object',               // 📋 Object structure
    REFERENCE = 'reference',         // 🔗 Document reference
    COMPUTED = 'computed'            // 🧮 Computed value
}
```

### **Variable Validation**

```typescript
export interface VariableValidation {
    // Basic validation
    required?: boolean;              // 📋 Required field
    minLength?: number;              // 📏 Minimum length
    maxLength?: number;              // 📏 Maximum length
    min?: number;                    // 🔢 Minimum value
    max?: number;                    // 🔢 Maximum value
    
    // Pattern validation
    pattern?: string;                // 🔤 Regex pattern
    format?: string;                 // 📋 Format (email, url, etc.)
    
    // Custom validation
    custom?: CustomValidationRule[]; // 🔧 Custom rules
    async?: AsyncValidationRule[];   // 🔄 Async validation
    
    // Conditional validation
    conditional?: ConditionalValidation[]; // 🔄 Conditional rules
    
    // Validation messages
    messages: ValidationMessages;    // 💬 Error messages
}

export interface CustomValidationRule {
    name: string;                    // 📝 Rule name
    validator: (value: any) => boolean; // ✅ Validator function
    message: string;                 // 💬 Error message
    priority: number;                // 🎯 Rule priority
}
```

---

## **🎨 Template Processing Engine**

### **TemplateProcessor Interface**

```typescript
export interface TemplateProcessor {
    // Processor identification
    id: string;                      // 🏷️ Processor identifier
    name: string;                    // 📝 Processor name
    version: string;                 // 🏷️ Processor version
    
    // Processing methods
    process(template: Template, context: ProcessingContext): Promise<ProcessedTemplate>;
    validate(template: Template, data: TemplateData): ValidationResult;
    render(template: Template, data: TemplateData): Promise<RenderedTemplate>;
    
    // Variable processing
    processVariables(variables: TemplateVariable[], data: TemplateData): ProcessedVariables;
    validateVariables(variables: TemplateVariable[], data: TemplateData): ValidationResult;
    
    // Content processing
    processContent(content: TemplateContent, data: TemplateData): Promise<ProcessedContent>;
    processPlaceholders(placeholders: Placeholder[], data: TemplateData): ProcessedPlaceholders;
    
    // Event handling
    onProcessStart?: (template: Template) => void;
    onProcessComplete?: (result: ProcessedTemplate) => void;
    onError?: (error: ProcessingError) => void;
}
```

### **TemplateRenderer Interface**

```typescript
export interface TemplateRenderer {
    // Renderer identification
    id: string;                      // 🏷️ Renderer identifier
    name: string;                    // 📝 Renderer name
    format: OutputFormat;            // 📄 Output format
    
    // Rendering methods
    render(template: ProcessedTemplate, options: RenderOptions): Promise<RenderedTemplate>;
    renderToHTML(template: ProcessedTemplate): Promise<string>;
    renderToMarkdown(template: ProcessedTemplate): Promise<string>;
    renderToPDF(template: ProcessedTemplate): Promise<Buffer>;
    
    // Style processing
    applyStyles(template: ProcessedTemplate, styles: TemplateStyle[]): StyledTemplate;
    optimizeForOutput(template: ProcessedTemplate, format: OutputFormat): OptimizedTemplate;
    
    // Asset handling
    processAssets(template: ProcessedTemplate): ProcessedAssets;
    optimizeImages(images: TemplateImage[]): OptimizedImages;
}
```

---

## **📊 Template Categories and Types**

### **Template Categories**

```typescript
export enum TemplateCategory {
    // Document templates
    DOCUMENT = 'document',           // 📄 General documents
    NOTE = 'note',                   // 📝 Note templates
    REPORT = 'report',               // 📊 Report templates
    SPECIFICATION = 'specification', // 📐 Specification templates
    
    // Project templates
    PROJECT = 'project',             // 🎯 Project templates
    TASK = 'task',                   // ✅ Task templates
    MEETING = 'meeting',             // 🤝 Meeting templates
    
    // Development templates
    CODE = 'code',                   // 💻 Code templates
    API = 'api',                     // 🔌 API templates
    TEST = 'test',                   // 🧪 Test templates
    
    // Design templates
    UI = 'ui',                       // 🎨 UI templates
    COMPONENT = 'component',         // 🧩 Component templates
    LAYOUT = 'layout',               // 📐 Layout templates
    
    // Content templates
    TUTORIAL = 'tutorial',           // 🎓 Tutorial templates
    GUIDE = 'guide',                 // 📚 Guide templates
    REFERENCE = 'reference'          // 📋 Reference templates
}
```

### **Built-in Template Types**

```typescript
export class BuiltinTemplates {
    // Daily note template
    static dailyNote(): Template {
        return {
            id: 'daily-note',
            name: 'Daily Note',
            category: TemplateCategory.NOTE,
            type: TemplateType.DAILY,
            content: {
                header: {
                    title: '{{date | format("YYYY-MM-DD")}}',
                    metadata: {
                        type: 'daily-note',
                        date: '{{date}}',
                        mood: '{{mood}}',
                        priority: '{{priority}}'
                    }
                },
                body: {
                    sections: [
                        {
                            id: 'morning-reflection',
                            title: 'Morning Reflection',
                            content: '{{morningReflection}}'
                        },
                        {
                            id: 'daily-goals',
                            title: 'Daily Goals',
                            content: '{{#each dailyGoals}}\n- {{this}}\n{{/each}}'
                        },
                        {
                            id: 'evening-review',
                            title: 'Evening Review',
                            content: '{{eveningReview}}'
                        }
                    ]
                }
            },
            variables: [
                {
                    id: 'date',
                    name: 'Date',
                    type: VariableType.DATE,
                    required: true,
                    defaultValue: new Date()
                },
                {
                    id: 'mood',
                    name: 'Mood',
                    type: VariableType.SELECT,
                    options: [
                        { value: 'great', label: '😊 Great' },
                        { value: 'good', label: '🙂 Good' },
                        { value: 'okay', label: '😐 Okay' },
                        { value: 'bad', label: '😔 Bad' }
                    ]
                }
            ],
            config: {
                autoSave: true,
                validation: 'strict'
            }
        };
    }
    
    // Project template
    static project(): Template {
        return {
            id: 'project',
            name: 'Project Plan',
            category: TemplateCategory.PROJECT,
            type: TemplateType.PROJECT_PLAN,
            content: {
                header: {
                    title: '{{projectName}}',
                    metadata: {
                        type: 'project-plan',
                        status: '{{status}}',
                        priority: '{{priority}}',
                        startDate: '{{startDate}}',
                        endDate: '{{endDate}}'
                    }
                },
                body: {
                    sections: [
                        {
                            id: 'overview',
                            title: 'Project Overview',
                            content: '{{overview}}'
                        },
                        {
                            id: 'objectives',
                            title: 'Objectives',
                            content: '{{#each objectives}}\n- {{this}}\n{{/each}}'
                        },
                        {
                            id: 'timeline',
                            title: 'Timeline',
                            content: '{{timeline}}'
                        }
                    ]
                }
            },
            variables: [
                {
                    id: 'projectName',
                    name: 'Project Name',
                    type: VariableType.STRING,
                    required: true,
                    validation: {
                        minLength: 3,
                        maxLength: 100
                    }
                },
                {
                    id: 'objectives',
                    name: 'Objectives',
                    type: VariableType.ARRAY,
                    required: true,
                    validation: {
                        minItems: 1,
                        maxItems: 10
                    }
                }
            ],
            config: {
                autoSave: true,
                validation: 'strict'
            }
        };
    }
}
```

---

## **🔄 Template Lifecycle Management**

### **Template Lifecycle**

```typescript
export interface TemplateLifecycle {
    // Current state
    currentPhase: TemplatePhase;     // 📊 Current phase
    currentStatus: TemplateStatus;   // 📈 Current status
    
    // Phase history
    phaseHistory: TemplatePhaseTransition[]; // 📜 Phase transitions
    statusHistory: TemplateStatusTransition[]; // 📜 Status changes
    
    // Automation
    autoPromotion: boolean;          // 🤖 Auto promotion enabled
    promotionRules: TemplatePromotionRule[]; // 📋 Promotion rules
    
    // Notifications
    notifications: TemplateNotification[]; // 📬 Notifications
    subscribers: string[];           // 👥 Subscribers
}

export enum TemplatePhase {
    DRAFT = 'draft',                 // 📝 Draft phase
    REVIEW = 'review',               // 👀 Review phase
    APPROVAL = 'approval',           // ✅ Approval phase
    PUBLISHED = 'published',         // 🌐 Published phase
    DEPRECATED = 'deprecated',       // ⚠️ Deprecated phase
    ARCHIVED = 'archived'            // 📦 Archived phase
}
```

### **Template Versioning**

```typescript
export interface TemplateVersioning {
    // Version information
    currentVersion: SemanticVersion; // 🏷️ Current version
    versionHistory: TemplateVersion[]; // 📜 Version history
    
    // Version control
    versioningEnabled: boolean;      // 🔧 Versioning enabled
    autoIncrement: boolean;          // 🤖 Auto increment
    versionScheme: VersionScheme;    // 📋 Version scheme
    
    // Change tracking
    changeLog: TemplateChangeLog[];  // 📋 Change log
    diffEnabled: boolean;            // 🔍 Diff enabled
}

export interface TemplateVersion {
    version: SemanticVersion;        // 🏷️ Version number
    template: Template;              // 📄 Template content
    changes: TemplateChange[];       // 🔄 Changes
    author: string;                  // 👤 Version author
    timestamp: Date;                 // ⏰ Version timestamp
    notes: string;                   // 📝 Version notes
}
```

---

## **🎯 Usage Examples**

### **Creating a Custom Template**

```typescript
// Create custom meeting template
const meetingTemplate: Template = {
    id: 'custom-meeting',
    name: 'Team Meeting Template',
    category: TemplateCategory.MEETING,
    type: TemplateType.MEETING,
    content: {
        header: {
            title: '{{meetingTitle}}',
            metadata: {
                type: 'meeting-notes',
                date: '{{date}}',
                attendees: '{{attendees}}',
                duration: '{{duration}}'
            }
        },
        body: {
            sections: [
                {
                    id: 'agenda',
                    title: 'Agenda',
                    content: '{{#each agendaItems}}\n{{@index}}. {{this.title}} - {{this.duration}}min\n{{/each}}'
                },
                {
                    id: 'decisions',
                    title: 'Decisions',
                    content: '{{#each decisions}}\n- {{this}}\n{{/each}}'
                },
                {
                    id: 'action-items',
                    title: 'Action Items',
                    content: '{{#each actionItems}}\n- [ ] {{this.task}} ({{this.owner}}) - Due: {{this.due}}\n{{/each}}'
                }
            ]
        }
    },
    variables: [
        {
            id: 'meetingTitle',
            name: 'Meeting Title',
            type: VariableType.STRING,
            required: true
        },
        {
            id: 'attendees',
            name: 'Attendees',
            type: VariableType.MULTI_SELECT,
            options: [
                { value: 'alice', label: 'Alice' },
                { value: 'bob', label: 'Bob' },
                { value: 'charlie', label: 'Charlie' }
            ]
        }
    ],
    config: {
        autoSave: true,
        validation: 'strict'
    },
    processor: new DefaultTemplateProcessor(),
    renderer: new MarkdownTemplateRenderer(),
    created: new Date(),
    modified: new Date(),
    author: 'Team Lead',
    status: TemplateStatus.ACTIVE
};
```

### **Processing Template with Data**

```typescript
// Process template with data
async function processTemplate(template: Template, data: any): Promise<string> {
    const processor = new DefaultTemplateProcessor();
    
    // Validate data
    const validation = processor.validate(template, data);
    if (!validation.valid) {
        throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Process template
    const processed = await processor.process(template, {
        variables: data,
        metadata: {
            processedAt: new Date(),
            processor: processor.id
        }
    });
    
    // Render to markdown
    const rendered = await processor.render(processed, {
        format: 'markdown',
        includeMetadata: true
    });
    
    return rendered.content;
}

// Usage example
const meetingData = {
    meetingTitle: 'Weekly Team Sync',
    date: new Date(),
    attendees: ['alice', 'bob'],
    agendaItems: [
        { title: 'Review progress', duration: 15 },
        { title: 'Discuss blockers', duration: 10 }
    ],
    decisions: [
        'Move to weekly deployments',
        'Add code review requirements'
    ],
    actionItems: [
        { task: 'Update deployment pipeline', owner: 'alice', due: new Date() }
    ]
};

const result = await processTemplate(meetingTemplate, meetingData);
console.log(result);
```

---

## **📚 Related Documentation**

- **[[04 - Development/Type System/type-system-overview.md]]** - Core type system
- **[[04 - Development/Type System/tick-processor-types-reference.md]]** - Vault type reference
- **[[📊 Metadata Engine Types]]** - Document lifecycle management
- **[[src/types/tick-processor-types.ts]]** - Technical implementation

---

**🏆 This comprehensive template system provides powerful content generation with flexible variable management and processing capabilities.**
