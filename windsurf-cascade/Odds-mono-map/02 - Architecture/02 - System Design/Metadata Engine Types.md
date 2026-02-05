---
type: documentation
title: Metadata Engine Types
section: Development
category: technical-documentation
priority: high
status: published
tags: [metadata, engine, types, lifecycle, document]
created: 2025-11-18T18:25:00Z
modified: 2025-11-18T18:25:00Z
author: Odds Protocol Development Team
teamMember: Metadata Systems Architect
version: 1.0.0
---

# 📊 Metadata Engine Types

## **Document Lifecycle with [#META]**

---

## **🎯 Overview**

The Metadata Engine provides comprehensive document lifecycle management, enabling intelligent metadata processing, validation, and transformation throughout the document ecosystem.

---

## **🏗️ Core Metadata Types**

### **DocumentMetadata Interface**

```typescript
export interface DocumentMetadata {
  // Core identification
  id: string;                      // 🏷️ Unique document identifier
  title: string;                   // 📝 Document title
  description?: string;            // 📋 Document description
  
  // Classification
  type: VaultDocumentType;         // 📂 Document type
  category: string;                // 🗂️ Document category
  subcategory?: string;            // 📁 Sub-category
  
  // Lifecycle management
  status: DocumentStatus;          // 📊 Current status
  priority: Priority;              // 🎯 Priority level
  version: SemanticVersion;        // 🏷️ Version information
  
  // Temporal information
  created: Date;                   // 📅 Creation timestamp
  modified: Date;                  // 🔄 Last modified timestamp
  reviewed?: Date;                 // 👀 Last review timestamp
  expires?: Date;                  // ⏰ Expiration date
  
  // Ownership and responsibility
  author: string;                  // 👤 Original author
  contributors: string[];          // 👥 Additional contributors
  reviewer?: string;               // 👀 Assigned reviewer
  teamMember: string;              // 🏢 Team member responsible
  
  // Content metrics
  wordCount: number;               // 📝 Word count
  readingTime: number;             // ⏱️ Estimated reading time (minutes)
  complexity: ComplexityScore;     // 🧠 Content complexity score
  
  // Relationships and dependencies
  dependencies: DocumentReference[]; // 🔗 Document dependencies
  dependents: DocumentReference[];   // 🔗 Documents that depend on this
  related: DocumentReference[];      // 🔗 Related documents
  
  // Quality and validation
  qualityScore: number;            // 💯 Quality score (0-100)
  validationResults: ValidationRuleResult[]; // ✅ Validation results
  issues: DocumentIssue[];         // ⚠️ Known issues
  
  // Processing metadata
  processed: boolean;              // 🤖 Has been processed
  lastProcessed?: Date;            // 🔄 Last processing timestamp
  processingFlags: ProcessingFlag[]; // 🏷️ Processing flags
  
  // Custom fields
  customFields: Record<string, unknown>; // 🔧 Custom metadata fields
  tags: string[];                  // 🏷️ Document tags
  labels: MetadataLabel[];         // 🏷️ Structured labels
}
```

### **SemanticVersion Interface**

```typescript
export interface SemanticVersion {
  major: number;                   // 🏆 Major version
  minor: number;                   // 📈 Minor version
  patch: number;                   // 🔧 Patch version
  prerelease?: string;             // 🧪 Pre-release identifier
  build?: string;                  // 🏗️ Build metadata
  
  // Utility methods
  toString(): string;
  compare(other: SemanticVersion): number;
  isValid(): boolean;
}
```

### **DocumentReference Interface**

```typescript
export interface DocumentReference {
  id: string;                      // 🏷️ Reference identifier
  documentId: string;              // 📄 Target document ID
  type: ReferenceType;             // 🔗 Reference type
  strength: number;                // 💪 Relationship strength (0-1)
  context: string;                 // 📝 Reference context
  created: Date;                   // 📅 Creation timestamp
  verified: boolean;               // ✅ Verification status
}
```

---

## **🔄 Lifecycle Management Types**

### **DocumentLifecycle Interface**

```typescript
export interface DocumentLifecycle {
  // Current state
  currentPhase: LifecyclePhase;    // 📊 Current lifecycle phase
  currentStatus: DocumentStatus;   // 📈 Current status
  
  // Phase history
  phaseHistory: LifecyclePhaseTransition[]; // 📜 Phase transitions
  statusHistory: StatusTransition[];        // 📜 Status changes
  
  // Automated transitions
  transitionRules: LifecycleTransitionRule[]; // 🤖 Transition rules
  scheduledTransitions: ScheduledTransition[]; // ⏰ Scheduled changes
  
  // Lifecycle configuration
  lifecycleConfig: LifecycleConfiguration;   // ⚙️ Configuration
  metadataRequirements: PhaseRequirement[];  // 📋 Required metadata per phase
}
```

### **LifecyclePhase Enum**

```typescript
export enum LifecyclePhase {
  CREATION = 'creation',           // 📝 Document being created
  DRAFT = 'draft',                 // 📄 Draft phase
  REVIEW = 'review',               // 👀 Under review
  APPROVAL = 'approval',           // ✅ Approval process
  PUBLICATION = 'publication',     // 🌐 Being published
  ACTIVE = 'active',               // ✅ Active and live
  MAINTENANCE = 'maintenance',     // 🔧 Under maintenance
  UPDATE = 'update',               // 🔄 Being updated
  DEPRECATION = 'deprecation',     // ⚠️ Being deprecated
  ARCHIVAL = 'archival',           // 📦 Being archived
  RETIREMENT = 'retirement'        // 🗑️ Being retired
}
```

### **LifecycleTransitionRule Interface**

```typescript
export interface LifecycleTransitionRule {
  id: string;                      // 🏷️ Rule identifier
  name: string;                    // 📝 Rule name
  description: string;             // 📋 Rule description
  
  // Transition conditions
  fromPhase: LifecyclePhase;       // 📤 Source phase
  toPhase: LifecyclePhase;         // 📥 Target phase
  conditions: TransitionCondition[]; // 🎯 Transition conditions
  
  // Automation
  automated: boolean;              // 🤖 Is automatic transition
  trigger?: LifecycleTrigger;      // ⚡ Transition trigger
  actions: TransitionAction[];     // 🎬 Actions to execute
  
  // Validation
  validator?: TransitionValidator; // ✅ Custom validator
  requirements: PhaseRequirement[]; // 📋 Phase requirements
  
  // Metadata
  created: Date;                   // 📅 Creation timestamp
  createdBy: string;               // 👤 Rule creator
  enabled: boolean;                // 🔘 Is rule enabled
}
```

---

## **🤖 Processing Engine Types**

### **MetadataProcessor Interface**

```typescript
export interface MetadataProcessor {
  // Processor identification
  id: string;                      // 🏷️ Processor identifier
  name: string;                    // 📝 Processor name
  version: string;                 // 🏷️ Processor version
  
  // Processing configuration
  config: ProcessorConfiguration;  // ⚙️ Configuration
  supportedTypes: VaultDocumentType[]; // 📂 Supported document types
  
  // Processing methods
  process(document: VaultFile): Promise<ProcessingResult>; // 🔄 Main processing
  validate(metadata: DocumentMetadata): ValidationResult;   // ✅ Validation
  transform(metadata: DocumentMetadata): DocumentMetadata;  // 🔄 Transformation
  
  // Event handling
  onProcessStart?: (document: VaultFile) => void;   // 🚀 Start event
  onProcessComplete?: (result: ProcessingResult) => void; // ✅ Complete event
  onError?: (error: ProcessingError) => void;       // ❌ Error event
}
```

### **ProcessingResult Interface**

```typescript
export interface ProcessingResult {
  // Result information
  success: boolean;                // ✅ Processing success
  processorId: string;             // 🏷️ Processor ID
  documentId: string;              // 📄 Document ID
  
  // Timing and performance
  startTime: Date;                 // ⏰ Start time
  endTime: Date;                   // ⏰ End time
  duration: number;                // ⏱️ Duration in milliseconds
  
  // Processing details
  metadata: DocumentMetadata;      // 📊 Processed metadata
  transformations: Transformation[]; // 🔄 Applied transformations
  validations: ValidationRuleResult[]; // ✅ Validation results
  
  // Issues and warnings
  errors: ProcessingError[];       // ❌ Processing errors
  warnings: ProcessingWarning[];   // ⚠️ Processing warnings
  suggestions: ProcessingSuggestion[]; // 💡 Improvement suggestions
  
  // Metrics
  metrics: ProcessingMetrics;      // 📈 Processing metrics
  qualityImprovement: number;      // 📈 Quality score improvement
}
```

### **ProcessorConfiguration Interface**

```typescript
export interface ProcessorConfiguration {
  // Processing options
  strictMode: boolean;             // 📏 Strict validation mode
  autoFix: boolean;                // 🔧 Automatic fixes
  maxRetries: number;              // 🔄 Maximum retry attempts
  
  // Validation rules
  validationRules: string[];       // ✅ Enabled validation rules
  customValidators: CustomValidator[]; // 🔧 Custom validators
  
  // Transformation rules
  transformationRules: TransformationRule[]; // 🔄 Transformation rules
  enrichmentEnabled: boolean;      // 📈 Metadata enrichment
  
  // Performance settings
  timeout: number;                 // ⏰ Processing timeout (ms)
  batchSize: number;               // 📦 Batch processing size
  parallelProcessing: boolean;     // 🚀 Parallel processing enabled
  
  // Output settings
  outputFormat: MetadataFormat;    // 📄 Output format
  compressionEnabled: boolean;     // 📦 Output compression
  includeMetrics: boolean;         // 📈 Include processing metrics
}
```

---

## **📈 Analytics and Metrics Types**

### **MetadataAnalytics Interface**

```typescript
export interface MetadataAnalytics {
  // Analytics identification
  id: string;                      // 🏷️ Analytics ID
  timestamp: Date;                 // ⏰ Analytics timestamp
  scope: AnalyticsScope;           // 📊 Analytics scope
  
  // Document metrics
  documentMetrics: DocumentMetrics; // 📄 Document statistics
  qualityMetrics: QualityMetrics;   // 💯 Quality statistics
  lifecycleMetrics: LifecycleMetrics; // 🔄 Lifecycle statistics
  
  // Processing metrics
  processingMetrics: ProcessingMetrics; // 🤖 Processing statistics
  performanceMetrics: PerformanceMetrics; // ⚡ Performance statistics
  
  // Relationship metrics
  relationshipMetrics: RelationshipMetrics; // 🔗 Relationship statistics
  dependencyMetrics: DependencyMetrics;     // 📦 Dependency statistics
  
  // Trends and predictions
  trends: AnalyticsTrend[];        // 📈 Historical trends
  predictions: AnalyticsPrediction[]; // 🔮 Future predictions
  recommendations: AnalyticsRecommendation[]; // 💡 Recommendations
}
```

### **DocumentMetrics Interface**

```typescript
export interface DocumentMetrics {
  // Count statistics
  totalDocuments: number;          // 📊 Total document count
  activeDocuments: number;         // ✅ Active documents
  archivedDocuments: number;       // 📦 Archived documents
  
  // Type distribution
  typeDistribution: Record<VaultDocumentType, number>; // 📂 Type counts
  categoryDistribution: Record<string, number>;       // 🗂️ Category counts
  
  // Quality metrics
  averageQualityScore: number;     // 💯 Average quality score
  qualityDistribution: QualityDistribution; // 📊 Quality ranges
  
  // Lifecycle metrics
  phaseDistribution: Record<LifecyclePhase, number>; // 🔄 Phase counts
  averageDocumentAge: number;      // 📅 Average document age
  documentsNeedingReview: number;  // 👀 Documents needing review
  
  // Content metrics
  totalWordCount: number;          // 📝 Total word count
  averageWordCount: number;        // 📊 Average words per document
  totalReadingTime: number;        // ⏱️ Total reading time
  
  // Growth metrics
  documentsCreatedToday: number;   // 📅 Today's creations
  documentsUpdatedToday: number;   // 🔄 Today's updates
  growthRate: number;              // 📈 Growth rate (percentage)
}
```

---

## **🔧 Utility Types**

### **MetadataLabel Interface**

```typescript
export interface MetadataLabel {
  key: string;                     // 🏷️ Label key
  value: string;                   // 📝 Label value
  type: LabelType;                 // 📋 Label type
  color?: string;                  // 🎨 Label color
  icon?: string;                   // 🎭 Label icon
  created: Date;                   // 📅 Creation timestamp
  createdBy: string;               // 👤 Label creator
}
```

### **DocumentIssue Interface**

```typescript
export interface DocumentIssue {
  id: string;                      // 🏷️ Issue identifier
  type: IssueType;                 // 📋 Issue type
  severity: IssueSeverity;         // 🚨 Issue severity
  description: string;             // 📝 Issue description
  location?: IssueLocation;        // 📍 Issue location
  suggestedFix?: string;           // 💡 Suggested fix
  created: Date;                   // 📅 Issue creation
  resolved?: Date;                 // ✅ Resolution timestamp
}
```

### **ProcessingFlag Interface**

```typescript
export interface ProcessingFlag {
  key: string;                     // 🏷️ Flag key
  value: boolean;                  // 🔘 Flag value
  reason?: string;                 // 📝 Flag reason
  setBy: string;                   // 👤 Set by
  setAt: Date;                     // ⏰ Set timestamp
  expires?: Date;                  // ⏰ Expiration timestamp
}
```

---

## **🎯 Usage Examples**

### **Metadata Processing**

```typescript
import { MetadataProcessor, DocumentMetadata } from "./metadata-engine";

// Create metadata processor
const processor: MetadataProcessor = {
  id: 'document-processor',
  name: 'Document Metadata Processor',
  version: '1.0.0',
  
  async process(document: VaultFile): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Extract and process metadata
      const metadata = await this.extractMetadata(document);
      const validated = await this.validate(metadata);
      const enriched = await this.enrich(validated);
      
      return {
        success: true,
        processorId: this.id,
        documentId: document.path,
        startTime: new Date(startTime),
        endTime: new Date(),
        duration: Date.now() - startTime,
        metadata: enriched,
        transformations: [],
        validations: [],
        errors: [],
        warnings: [],
        suggestions: [],
        metrics: this.calculateMetrics(enriched),
        qualityImprovement: enriched.qualityScore - 50
      };
    } catch (error) {
      return {
        success: false,
        processorId: this.id,
        documentId: document.path,
        startTime: new Date(startTime),
        endTime: new Date(),
        duration: Date.now() - startTime,
        metadata: {} as DocumentMetadata,
        transformations: [],
        validations: [],
        errors: [{ type: 'processing', message: error.message }],
        warnings: [],
        suggestions: [],
        metrics: {},
        qualityImprovement: 0
      };
    }
  },
  
  // ... other methods
};
```

### **Lifecycle Management**

```typescript
import { DocumentLifecycle, LifecyclePhase } from "./metadata-engine";

// Create lifecycle manager
const lifecycle: DocumentLifecycle = {
  currentPhase: LifecyclePhase.DRAFT,
  currentStatus: DocumentStatus.DRAFT,
  
  phaseHistory: [
    {
      fromPhase: LifecyclePhase.CREATION,
      toPhase: LifecyclePhase.DRAFT,
      timestamp: new Date(),
      reason: 'Initial draft created',
      automated: true
    }
  ],
  
  statusHistory: [],
  
  transitionRules: [
    {
      id: 'draft-to-review',
      name: 'Draft to Review',
      fromPhase: LifecyclePhase.DRAFT,
      toPhase: LifecyclePhase.REVIEW,
      conditions: [
        {
          type: 'quality-score',
          operator: '>=',
          value: 70
        },
        {
          type: 'word-count',
          operator: '>=',
          value: 100
        }
      ],
      automated: true,
      actions: [
        {
          type: 'notify-reviewer',
          parameters: { template: 'review-request' }
        }
      ]
    }
  ],
  
  scheduledTransitions: [],
  lifecycleConfig: {
    autoTransition: true,
    requireApproval: true,
    maxPhaseDuration: 30 * 24 * 60 * 60 * 1000 // 30 days
  },
  
  metadataRequirements: []
};
```

---

## **📚 Related Documentation**

- **[[04 - Development/Type System/type-system-overview.md]]** - Core type system
- **[[04 - Development/Type System/tick-processor-types-reference.md]]** - Vault type reference
- **[[🔗 Reference System Types]]** - Cross-link management
- **[[src/types/tick-processor-types.ts]]** - Technical implementation

---

**🏆 This metadata engine provides comprehensive document lifecycle management with intelligent processing capabilities.**
