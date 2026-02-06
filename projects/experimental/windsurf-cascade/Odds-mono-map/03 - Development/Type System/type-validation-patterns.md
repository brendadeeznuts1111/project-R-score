---
type: style-guide
title: Type Validation Patterns
section: Development
category: technical-documentation
priority: "{ priority:medium }"
status: published
tags:
  - validation
  - types
  - patterns
  - framework
  - quality
created: 2025-11-18T18:21:00Z
modified: 2025-11-18T18:21:00Z
author: Odds Protocol Development Team
teamMember: Validation Framework Architect
version: 1.0.0
implementation-status:
---

# 🔍 Type Validation Patterns

## **Comprehensive Guide to Type Validation in the Odds Protocol System**

---

## **🎯 Overview**

Type validation ensures data integrity, type safety, and system reliability throughout the vault and canvas integration. This guide covers validation patterns, best practices, and implementation strategies.

---

## **🏗️ Validation Architecture**

### **Core Validation Components**

```text
🔍 Validation Framework
├── 📋 Validation Rules Engine
├── 🧪 Type Checkers
├── 📊 Score Calculators
├── 🚨 Error Handlers
└── 📈 Reporting System
```

### **Validation Pipeline**

```typescript
// 1. Input Validation
const rawInput = validateRawInput(data);

// 2. Type Checking
const typedData = validateTypes(rawInput);

// 3. Business Rules
const businessValidated = validateBusinessRules(typedData);

// 4. Quality Scoring
const qualityScore = calculateQualityScore(businessValidated);

// 5. Final Report
const report = generateValidationReport(qualityScore);
```

---

## **🧪 Type Checker Patterns**

### **1. Primitive Type Validation**

```typescript
// String validation with constraints
export function validateString(
    value: unknown,
    options: {
        minLength?: number;
        maxLength?: number;
        pattern?: RegExp;
        required?: boolean;
    } = {}
): ValidationResult<string> {
    const { minLength, maxLength, pattern, required = false } = options;
    
    // Check if required and missing
    if (required && (value === undefined || value === null)) {
        return {
            valid: false,
            errors: ['Value is required'],
            data: null
        };
    }
    
    // Allow null/undefined if not required
    if (!required && (value === undefined || value === null)) {
        return { valid: true, errors: [], data: null };
    }
    
    // Check type
    if (typeof value !== 'string') {
        return {
            valid: false,
            errors: [`Expected string, got ${typeof value}`],
            data: null
        };
    }
    
    const errors: string[] = [];
    const stringValue = value as string;
    
    // Check length constraints
    if (minLength && stringValue.length < minLength) {
        errors.push(`String too short: minimum ${minLength} characters`);
    }
    
    if (maxLength && stringValue.length > maxLength) {
        errors.push(`String too long: maximum ${maxLength} characters`);
    }
    
    // Check pattern
    if (pattern && !pattern.test(stringValue)) {
        errors.push('String does not match required pattern');
    }
    
    return {
        valid: errors.length === 0,
        errors,
        data: errors.length === 0 ? stringValue : null
    };
}

// Number validation with range checking
export function validateNumber(
    value: unknown,
    options: {
        min?: number;
        max?: number;
        integer?: boolean;
        required?: boolean;
    } = {}
): ValidationResult<number> {
    const { min, max, integer = false, required = false } = options;
    
    if (required && (value === undefined || value === null)) {
        return {
            valid: false,
            errors: ['Value is required'],
            data: null
        };
    }
    
    if (!required && (value === undefined || value === null)) {
        return { valid: true, errors: [], data: null };
    }
    
    if (typeof value !== 'number' || isNaN(value)) {
        return {
            valid: false,
            errors: [`Expected number, got ${typeof value}`],
            data: null
        };
    }
    
    const errors: string[] = [];
    const numberValue = value as number;
    
    if (integer && !Number.isInteger(numberValue)) {
        errors.push('Number must be integer');
    }
    
    if (min !== undefined && numberValue < min) {
        errors.push(`Number too small: minimum ${min}`);
    }
    
    if (max !== undefined && numberValue > max) {
        errors.push(`Number too large: maximum ${max}`);
    }
    
    return {
        valid: errors.length === 0,
        errors,
        data: errors.length === 0 ? numberValue : null
    };
}
```

### **2. Enum Validation Patterns**

```typescript
// Generic enum validator
export function validateEnum<T extends string>(
    value: unknown,
    enumValues: readonly T[],
    enumName: string,
    required: boolean = false
): ValidationResult<T> {
    if (required && (value === undefined || value === null)) {
        return {
            valid: false,
            errors: [`${enumName} is required`],
            data: null
        };
    }
    
    if (!required && (value === undefined || value === null)) {
        return { valid: true, errors: [], data: null };
    }
    
    if (typeof value !== 'string') {
        return {
            valid: false,
            errors: [`Expected ${enumName} string, got ${typeof value}`],
            data: null
        };
    }
    
    if (!enumValues.includes(value as T)) {
        return {
            valid: false,
            errors: [`Invalid ${enumName}: ${value}. Valid values: ${enumValues.join(', ')}`],
            data: null
        };
    }
    
    return {
        valid: true,
        errors: [],
        data: value as T
    };
}

// Specific enum validators
export const validateVaultDocumentType = (value: unknown, required = false) =>
    validateEnum(value, Object.values(VaultDocumentType), 'VaultDocumentType', required);

export const validatePriority = (value: unknown, required = false) =>
    validateEnum(value, Object.values(Priority), 'Priority', required);

export const validateDocumentStatus = (value: unknown, required = false) =>
    validateEnum(value, Object.values(DocumentStatus), 'DocumentStatus', required);
```

### **3. Array Validation Patterns**

```typescript
// Array validation with item validation
export function validateArray<T>(
    value: unknown,
    itemValidator: (item: unknown) => ValidationResult<T>,
    options: {
        minLength?: number;
        maxLength?: number;
        required?: boolean;
    } = {}
): ValidationResult<T[]> {
    const { minLength, maxLength, required = false } = options;
    
    if (required && (value === undefined || value === null)) {
        return {
            valid: false,
            errors: ['Array is required'],
            data: null
        };
    }
    
    if (!required && (value === undefined || value === null)) {
        return { valid: true, errors: [], data: null };
    }
    
    if (!Array.isArray(value)) {
        return {
            valid: false,
            errors: [`Expected array, got ${typeof value}`],
            data: null
        };
    }
    
    const errors: string[] = [];
    const validItems: T[] = [];
    
    // Check length constraints
    if (minLength && value.length < minLength) {
        errors.push(`Array too short: minimum ${minLength} items`);
    }
    
    if (maxLength && value.length > maxLength) {
        errors.push(`Array too long: maximum ${maxLength} items`);
    }
    
    // Validate each item
    value.forEach((item, index) => {
        const itemResult = itemValidator(item);
        if (itemResult.valid && itemResult.data !== null) {
            validItems.push(itemResult.data);
        } else {
            errors.push(`Item ${index}: ${itemResult.errors.join(', ')}`);
        }
    });
    
    return {
        valid: errors.length === 0,
        errors,
        data: errors.length === 0 ? validItems : null
    };
}

// String array validator (common for tags)
export const validateStringArray = (value: unknown, required = false) =>
    validateArray(value, validateString, { required });
```

### **4. Object Validation Patterns**

```typescript
// Object validation with schema
export function validateObject<T extends Record<string, any>>(
    value: unknown,
    schema: ValidationSchema<T>,
    options: {
        strict?: boolean;  // Reject unknown properties
        required?: boolean;
    } = {}
): ValidationResult<T> {
    const { strict = false, required = false } = options;
    
    if (required && (value === undefined || value === null)) {
        return {
            valid: false,
            errors: ['Object is required'],
            data: null
        };
    }
    
    if (!required && (value === undefined || value === null)) {
        return { valid: true, errors: [], data: null };
    }
    
    if (typeof value !== 'object' || Array.isArray(value)) {
        return {
            valid: false,
            errors: [`Expected object, got ${typeof value}`],
            data: null
        };
    }
    
    const errors: string[] = [];
    const validatedObject: Partial<T> = {};
    const obj = value as Record<string, unknown>;
    
    // Check for unknown properties (strict mode)
    if (strict) {
        const unknownKeys = Object.keys(obj).filter(key => !(key in schema));
        if (unknownKeys.length > 0) {
            errors.push(`Unknown properties: ${unknownKeys.join(', ')}`);
        }
    }
    
    // Validate each property
    Object.entries(schema).forEach(([key, validator]) => {
        const result = validator(obj[key]);
        if (result.valid && result.data !== null) {
            (validatedObject as any)[key] = result.data;
        } else {
            errors.push(`${key}: ${result.errors.join(', ')}`);
        }
    });
    
    return {
        valid: errors.length === 0,
        errors,
        data: errors.length === 0 ? validatedObject as T : null
    };
}

// Validation schema type
export type ValidationSchema<T extends Record<string, any>> = {
    [K in keyof T]: (value: unknown) => ValidationResult<T[K]>;
};
```

---

## **📊 Complex Validation Patterns**

### **1. Vault File Validation**

```typescript
// Complete vault file validator
export function validateVaultFile(value: unknown): ValidationResult<VaultFile> {
    return validateObject(value, {
        path: (v) => validateString(v, { required: true, minLength: 1 }),
        name: (v) => validateString(v, { required: true, minLength: 1 }),
        content: (v) => validateString(v, { required: true }),
        frontmatter: (v) => validateObject(v, {
            type: (v) => validateVaultDocumentType(v, true),
            title: (v) => validateString(v, { required: true }),
            description: (v) => validateString(v, { maxLength: 500 }),
            priority: (v) => validatePriority(v),
            status: (v) => validateDocumentStatus(v),
            author: (v) => validateString(v, { required: true }),
            teamMember: (v) => validateString(v),
            version: (v) => validateString(v, { pattern: /^\d+\.\d+\.\d+$/ }),
            created: (v) => validateDate(v, { required: true }),
            modified: (v) => validateDate(v, { required: true })
        }, { required: true }),
        tags: (v) => validateStringArray(v),
        links: (v) => validateStringArray(v),
        backlinks: (v) => validateStringArray(v),
        created: (v) => validateDate(v, { required: true }),
        modified: (v) => validateDate(v, { required: true }),
        size: (v) => validateNumber(v, { min: 0, required: true })
    }, { strict: true, required: true });
}

// Date validator helper
export function validateDate(
    value: unknown,
    options: { required?: boolean } = {}
): ValidationResult<Date> {
    const { required = false } = options;
    
    if (required && (value === undefined || value === null)) {
        return {
            valid: false,
            errors: ['Date is required'],
            data: null
        };
    }
    
    if (!required && (value === undefined || value === null)) {
        return { valid: true, errors: [], data: null };
    }
    
    if (!(value instanceof Date) && typeof value !== 'string') {
        return {
            valid: false,
            errors: [`Expected Date or date string, got ${typeof value}`],
            data: null
        };
    }
    
    try {
        const date = value instanceof Date ? value : new Date(value as string);
        if (isNaN(date.getTime())) {
            return {
                valid: false,
                errors: ['Invalid date format'],
                data: null
            };
        }
        
        return {
            valid: true,
            errors: [],
            data: date
        };
    } catch (error) {
        return {
            valid: false,
            errors: [`Date parsing error: ${error}`],
            data: null
        };
    }
}
```

### **2. Canvas Node Validation**

```typescript
// Canvas node validator with metadata
export function validateCanvasNode(value: unknown): ValidationResult<CanvasNodeWithMetadata> {
    return validateObject(value, {
        id: (v) => validateString(v, { 
            required: true, 
            pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/ 
        }),
        x: (v) => validateNumber(v, { required: true }),
        y: (v) => validateNumber(v, { required: true }),
        width: (v) => validateNumber(v, { min: 50, max: 1000, required: true }),
        height: (v) => validateNumber(v, { min: 50, max: 1000, required: true }),
        type: (v) => validateEnum(v, ['text', 'file'] as const, 'Node Type', true),
        text: (v) => validateString(v, { required: true, maxLength: 10000 }),
        color: (v) => validateString(v, { 
            required: true, 
            pattern: /^[1-9]$/ 
        }),
        metadata: (v) => validateObject(v, {
            documentType: (v) => validateVaultDocumentType(v, true),
            relatedFile: (v) => validateString(v, { required: true }),
            tags: (v) => validateStringArray(v),
            priority: (v) => validatePriority(v, true),
            status: (v) => validateDocumentStatus(v, true),
            version: (v) => validateString(v, { required: true }),
            healthScore: (v) => validateNumber(v, { min: 0, max: 100, required: true }),
            created: (v) => validateDate(v, { required: true }),
            modified: (v) => validateDate(v, { required: true }),
            author: (v) => validateString(v, { required: true }),
            teamMember: (v) => validateString(v, { required: true })
        }, { required: true }),
        style: (v) => validateCanvasNodeStyle(v),
        group: (v) => validateString(v),
        zIndex: (v) => validateNumber(v, { min: 0, integer: true })
    }, { strict: false, required: true });
}

// Canvas node style validator
export function validateCanvasNodeStyle(value: unknown): ValidationResult<CanvasNodeStyle> {
    return validateObject(value, {
        backgroundColor: (v) => validateString(v, { pattern: /^#[0-9a-fA-F]{6}$/ }),
        borderColor: (v) => validateString(v, { pattern: /^#[0-9a-fA-F]{6}$/ }),
        borderWidth: (v) => validateNumber(v, { min: 0, max: 10 }),
        borderStyle: (v) => validateEnum(v, ['solid', 'dashed', 'dotted'] as const, 'Border Style'),
        borderRadius: (v) => validateNumber(v, { min: 0, max: 50 }),
        fontSize: (v) => validateNumber(v, { min: 8, max: 72 }),
        fontFamily: (v) => validateString(v, { minLength: 1 }),
        fontWeight: (v) => validateEnum(v, ['normal', 'bold'] as const, 'Font Weight'),
        textAlign: (v) => validateEnum(v, ['left', 'center', 'right'] as const, 'Text Align'),
        padding: (v) => validateNumber(v, { min: 0, max: 100 }),
        margin: (v) => validateNumber(v, { min: 0, max: 100 }),
        shadow: (v) => validateBoolean(v),
        opacity: (v) => validateNumber(v, { min: 0, max: 1 })
    }, { strict: false });
}
```

### **3. Business Rule Validation**

```typescript
// Business rule validator for canvas integrity
export function validateCanvasIntegrity(canvas: CanvasWithMetadata): ValidationResult<CanvasWithMetadata> {
    const errors: string[] = [];
    
    // Check node ID uniqueness
    const nodeIds = canvas.nodes.map(n => n.id);
    const duplicateIds = nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
        errors.push(`Duplicate node IDs: ${duplicateIds.join(', ')}`);
    }
    
    // Check edge references
    const nodeIdsSet = new Set(nodeIds);
    canvas.edges.forEach(edge => {
        if (!nodeIdsSet.has(edge.fromNode)) {
            errors.push(`Edge references non-existent node: ${edge.fromNode}`);
        }
        if (!nodeIdsSet.has(edge.toNode)) {
            errors.push(`Edge references non-existent node: ${edge.toNode}`);
        }
    });
    
    // Check metadata consistency
    canvas.nodes.forEach(node => {
        if (node.metadata.healthScore < 0 || node.metadata.healthScore > 100) {
            errors.push(`Invalid health score for node ${node.id}: ${node.metadata.healthScore}`);
        }
    });
    
    return {
        valid: errors.length === 0,
        errors,
        data: errors.length === 0 ? canvas : null
    };
}

// Boolean validator helper
export function validateBoolean(value: unknown): ValidationResult<boolean> {
    if (typeof value !== 'boolean') {
        return {
            valid: false,
            errors: [`Expected boolean, got ${typeof value}`],
            data: null
        };
    }
    
    return {
        valid: true,
        errors: [],
        data: value
    };
}
```

---

## **🎯 Validation Result Types**

### **Result Interface**

```typescript
export interface ValidationResult<T = any> {
    valid: boolean;                  // ✅ Overall validation status
    data: T | null;                  // 📊 Validated data (null if invalid)
    errors: string[];                // ❌ Validation errors
    warnings?: string[];             // ⚠️ Validation warnings
    score?: number;                  // 📈 Quality score (0-100)
    metadata?: ValidationMetadata;   // 📋 Additional metadata
}

export interface ValidationMetadata {
    timestamp: Date;                 // ⏰ Validation timestamp
    validator: string;               // 🔍 Validator name
    version: string;                 // 🏷️ Validator version
    duration: number;                // ⏱️ Validation duration (ms)
    rulesApplied: string[];          // 📋 Applied rules
}
```

### **Result Builder**

```typescript
// Result builder for complex validations
export class ValidationResultBuilder<T> {
    private result: Partial<ValidationResult<T>> = {
        valid: true,
        errors: [],
        warnings: [],
        data: null,
        metadata: {
            timestamp: new Date(),
            validator: 'Unknown',
            version: '1.0.0',
            duration: 0,
            rulesApplied: []
        }
    };
    
    addError(error: string): this {
        this.result.errors!.push(error);
        this.result.valid = false;
        return this;
    }
    
    addWarning(warning: string): this {
        this.result.warnings!.push(warning);
        return this;
    }
    
    setData(data: T): this {
        this.result.data = data;
        return this;
    }
    
    setScore(score: number): this {
        this.result.score = score;
        return this;
    }
    
    setValidator(name: string, version: string = '1.0.0'): this {
        if (this.result.metadata) {
            this.result.metadata.validator = name;
            this.result.metadata.version = version;
        }
        return this;
    }
    
    addRule(rule: string): this {
        if (this.result.metadata) {
            this.result.metadata.rulesApplied!.push(rule);
        }
        return this;
    }
    
    build(): ValidationResult<T> {
        return {
            valid: this.result.valid || false,
            data: this.result.data,
            errors: this.result.errors || [],
            warnings: this.result.warnings,
            score: this.result.score,
            metadata: this.result.metadata
        } as ValidationResult<T>;
    }
}
```

---

## **🚀 Performance Patterns**

### **1. Caching Strategy**

```typescript
// Validation result cache
export class ValidationCache {
    private cache = new Map<string, { result: ValidationResult; timestamp: number }>();
    private readonly ttl = 60000; // 1 minute
    
    get(key: string): ValidationResult | null {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.result;
    }
    
    set(key: string, result: ValidationResult): void {
        this.cache.set(key, { result, timestamp: Date.now() });
    }
    
    clear(): void {
        this.cache.clear();
    }
}

// Cached validator decorator
export function cachedValidator<T>(
    validator: (value: unknown) => ValidationResult<T>,
    keyGenerator: (value: unknown) => string
): (value: unknown) => ValidationResult<T> {
    const cache = new ValidationCache();
    
    return (value: unknown) => {
        const key = keyGenerator(value);
        const cached = cache.get(key);
        
        if (cached) {
            return cached;
        }
        
        const result = validator(value);
        cache.set(key, result);
        return result;
    };
}
```

### **2. Batch Validation**

```typescript
// Batch validator for multiple items
export function validateBatch<T>(
    items: unknown[],
    validator: (item: unknown) => ValidationResult<T>,
    options: {
        parallel?: boolean;
        maxConcurrency?: number;
    } = {}
): ValidationResult<T[]> {
    const { parallel = false, maxConcurrency = 10 } = options;
    
    if (!parallel) {
        // Sequential validation
        const results: ValidationResult<T>[] = [];
        const allErrors: string[] = [];
        const validItems: T[] = [];
        
        for (const item of items) {
            const result = validator(item);
            results.push(result);
            
            if (result.valid && result.data !== null) {
                validItems.push(result.data);
            } else {
                allErrors.push(...result.errors);
            }
        }
        
        return {
            valid: allErrors.length === 0,
            data: allErrors.length === 0 ? validItems : null,
            errors: allErrors
        };
    } else {
        // Parallel validation
        return validateBatchParallel(items, validator, maxConcurrency);
    }
}

// Parallel batch validation implementation
async function validateBatchParallel<T>(
    items: unknown[],
    validator: (item: unknown) => ValidationResult<T>,
    maxConcurrency: number
): Promise<ValidationResult<T[]>> {
    const chunks = chunkArray(items, maxConcurrency);
    const allResults: ValidationResult<T>[] = [];
    const allErrors: string[] = [];
    const validItems: T[] = [];
    
    for (const chunk of chunks) {
        const chunkPromises = chunk.map(item => 
            Promise.resolve(validator(item))
        );
        
        const chunkResults = await Promise.all(chunkPromises);
        allResults.push(...chunkResults);
        
        chunkResults.forEach(result => {
            if (result.valid && result.data !== null) {
                validItems.push(result.data);
            } else {
                allErrors.push(...result.errors);
            }
        });
    }
    
    return {
        valid: allErrors.length === 0,
        data: allErrors.length === 0 ? validItems : null,
        errors: allErrors
    };
}

// Array chunking helper
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}
```

---

## **📈 Quality Scoring Patterns**

### **1. Composite Score Calculation**

```typescript
// Quality score calculator
export class QualityScoreCalculator {
    private weights: Record<string, number> = {
        completeness: 0.3,
        consistency: 0.25,
        accuracy: 0.25,
        performance: 0.2
    };
    
    calculateScore(metrics: QualityMetrics): number {
        const completeness = this.calculateCompleteness(metrics);
        const consistency = this.calculateConsistency(metrics);
        const accuracy = this.calculateAccuracy(metrics);
        const performance = this.calculatePerformance(metrics);
        
        return Math.round(
            completeness * this.weights.completeness +
            consistency * this.weights.consistency +
            accuracy * this.weights.accuracy +
            performance * this.weights.performance
        );
    }
    
    private calculateCompleteness(metrics: QualityMetrics): number {
        let score = 0;
        let total = 0;
        
        // Required fields presence
        if (metrics.hasRequiredFields) { score += 50; }
        total += 50;
        
        // Optional fields coverage
        score += Math.min(30, metrics.optionalFieldsCount * 5);
        total += 30;
        
        // Metadata richness
        score += Math.min(20, metrics.metadataFieldsCount * 2);
        total += 20;
        
        return total > 0 ? (score / total) * 100 : 0;
    }
    
    private calculateConsistency(metrics: QualityMetrics): number {
        let score = 100;
        
        // Deductions for inconsistencies
        if (metrics.hasInconsistentNaming) score -= 20;
        if (metrics.hasInconsistentFormatting) score -= 15;
        if (metrics.hasDuplicateContent) score -= 25;
        if (metrics.hasBrokenReferences) score -= 30;
        
        return Math.max(0, score);
    }
    
    private calculateAccuracy(metrics: QualityMetrics): number {
        let score = 100;
        
        // Deductions for accuracy issues
        score -= metrics.validationErrors * 5;
        score -= metrics.syntaxErrors * 3;
        score -= metrics.logicalErrors * 10;
        
        return Math.max(0, score);
    }
    
    private calculatePerformance(metrics: QualityMetrics): number {
        let score = 100;
        
        // Performance deductions
        if (metrics.size > 1024 * 1024) score -= 20; // > 1MB
        if (metrics.processingTime > 1000) score -= 15; // > 1s
        if (metrics.memoryUsage > 100 * 1024 * 1024) score -= 10; // > 100MB
        
        return Math.max(0, score);
    }
}

// Quality metrics interface
export interface QualityMetrics {
    hasRequiredFields: boolean;
    optionalFieldsCount: number;
    metadataFieldsCount: number;
    hasInconsistentNaming: boolean;
    hasInconsistentFormatting: boolean;
    hasDuplicateContent: boolean;
    hasBrokenReferences: boolean;
    validationErrors: number;
    syntaxErrors: number;
    logicalErrors: number;
    size: number;
    processingTime: number;
    memoryUsage: number;
}
```

---

## **🎯 Best Practices**

### **1. Validation Design Principles**

- **Fail Fast**: Validate early and fail immediately
- **Be Specific**: Provide clear error messages
- **Be Consistent**: Use consistent validation patterns
- **Be Performant**: Cache results and avoid redundant checks
- **Be Extensible**: Design for future requirements

### **2. Error Handling Patterns**

```typescript
// Graceful degradation
export function validateWithFallback<T>(
    value: unknown,
    validator: (v: unknown) => ValidationResult<T>,
    fallback: T
): T {
    const result = validator(value);
    return result.valid && result.data !== null ? result.data : fallback;
}

// Progressive validation
export function validateProgressively<T>(
    value: unknown,
    validators: Array<(v: unknown) => ValidationResult<T>>
): ValidationResult<T> {
    for (const validator of validators) {
        const result = validator(value);
        if (!result.valid) {
            return result;
        }
    }
    
    return validators[validators.length - 1](value);
}
```

### **3. Testing Validation**

```typescript
// Validation test utilities
export function expectValid<T>(result: ValidationResult<T>): asserts result is ValidationResult<T> & { data: T } {
    if (!result.valid || result.data === null) {
        throw new Error(`Expected valid result, got errors: ${result.errors.join(', ')}`);
    }
}

export function expectInvalid(result: ValidationResult): asserts result is ValidationResult & { valid: false } {
    if (result.valid) {
        throw new Error('Expected invalid result, got valid');
    }
}
```

---

## **📚 Related Documentation**

- **Type System Overview** - High-level architecture
- **Vault Types Reference** - Complete type API
- **Canvas Types Guide** - Canvas integration specifics
- **Workshop Examples** - Practical implementation

---

**🏆 This guide provides comprehensive patterns for building robust, scalable validation system<span style="background:#d3f8b6">s.**</span>
