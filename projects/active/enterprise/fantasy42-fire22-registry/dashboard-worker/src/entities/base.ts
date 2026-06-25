/**
 * 🏗️ Fire22 Dashboard - Base Entity Classes
 * Foundation classes for all database entities with business logic
 */

import type { BaseEntity, AuditableEntity } from '../types/database/base';
import { VALIDATION, ERROR_MESSAGES } from '../constants';

// === VALIDATION UTILITIES ===
export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// === BASE ENTITY CLASS ===
export abstract class Entity implements BaseEntity {
  public id: string;
  public created_at: string;
  public updated_at: string;
  public version?: number;

  constructor(data: Partial<BaseEntity>) {
    this.id = data.id || this.generateId();
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
    this.version = data.version || 1;

    this.validate();
  }

  /**
   * Generate a unique ID for the entity
   */
  protected generateId(): string {
    return `${this.getEntityName()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get the entity name (to be implemented by subclasses)
   */
  protected abstract getEntityName(): string;

  /**
   * Get validation rules (to be implemented by subclasses)
   */
  protected abstract getValidationRules(): ValidationRule[];

  /**
   * Validate the entity data
   */
  public validate(): ValidationResult {
    const rules = this.getValidationRules();
    const errors: ValidationError[] = [];

    for (const rule of rules) {
      const value = (this as any)[rule.field];
      const fieldErrors = this.validateField(rule, value);
      errors.push(...fieldErrors);
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.map(e => e.message).join(', ')}`);
    }

    return { valid: true, errors: [] };
  }

  /**
   * Validate a single field
   */
  private validateField(rule: ValidationRule, value: any): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required check
    if (rule.required && (value === null || value === undefined || value === '')) {
      errors.push({
        field: rule.field,
        message: `${rule.field} is required`,
        code: 'REQUIRED_FIELD',
      });
      return errors;
    }

    // Skip further validation if value is empty and not required
    if (!rule.required && (value === null || value === undefined || value === '')) {
      return errors;
    }

    // Type check
    if (rule.type && typeof value !== rule.type) {
      errors.push({
        field: rule.field,
        message: `${rule.field} must be of type ${rule.type}`,
        code: 'INVALID_TYPE',
      });
    }

    // String validations
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push({
          field: rule.field,
          message: `${rule.field} must be at least ${rule.minLength} characters`,
          code: 'MIN_LENGTH',
        });
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push({
          field: rule.field,
          message: `${rule.field} must be no more than ${rule.maxLength} characters`,
          code: 'MAX_LENGTH',
        });
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push({
          field: rule.field,
          message: `${rule.field} format is invalid`,
          code: 'INVALID_FORMAT',
        });
      }
    }

    // Number validations
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push({
          field: rule.field,
          message: `${rule.field} must be at least ${rule.min}`,
          code: 'MIN_VALUE',
        });
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push({
          field: rule.field,
          message: `${rule.field} must be no more than ${rule.max}`,
          code: 'MAX_VALUE',
        });
      }
    }

    // Custom validation
    if (rule.custom) {
      const customResult = rule.custom(value);
      if (typeof customResult === 'string') {
        errors.push({
          field: rule.field,
          message: customResult,
          code: 'CUSTOM_VALIDATION',
        });
      } else if (!customResult) {
        errors.push({
          field: rule.field,
          message: `${rule.field} failed custom validation`,
          code: 'CUSTOM_VALIDATION',
        });
      }
    }

    return errors;
  }

  /**
   * Update the entity with new data
   */
  public update(data: Partial<this>): this {
    // Create a new instance with updated data
    const updatedData = { ...this.toJSON(), ...data };
    updatedData.updated_at = new Date().toISOString();
    updatedData.version = (this.version || 1) + 1;

    // Apply updates to current instance
    Object.assign(this, updatedData);

    // Validate after update
    this.validate();

    return this;
  }

  /**
   * Convert entity to JSON
   */
  public toJSON(): Record<string, any> {
    const result: Record<string, any> = {};

    for (const key in this) {
      const value = this[key];

      // Skip functions and private properties
      if (typeof value === 'function' || key.startsWith('_')) {
        continue;
      }

      // Handle nested entities
      if (value && typeof value === 'object' && 'toJSON' in value) {
        result[key] = value.toJSON();
      } else if (Array.isArray(value)) {
        result[key] = value.map(item =>
          item && typeof item === 'object' && 'toJSON' in item ? item.toJSON() : item
        );
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Create a copy of the entity
   */
  public clone(): this {
    const Constructor = this.constructor as new (data: any) => this;
    return new Constructor(this.toJSON());
  }

  /**
   * Check if the entity is equal to another entity
   */
  public equals(other: Entity): boolean {
    return this.id === other.id && this.constructor.name === other.constructor.name;
  }

  /**
   * Get a string representation of the entity
   */
  public toString(): string {
    return `${this.getEntityName()}(${this.id})`;
  }

  /**
   * Touch the entity (update the updated_at timestamp)
   */
  public touch(): this {
    this.updated_at = new Date().toISOString();
    this.version = (this.version || 1) + 1;
    return this;
  }

  /**
   * Check if entity is dirty (has been modified)
   */
  public isDirty(): boolean {
    return this.updated_at !== this.created_at;
  }

  /**
   * Get entity age in milliseconds
   */
  public getAge(): number {
    return Date.now() - new Date(this.created_at).getTime();
  }

  /**
   * Get last modification age in milliseconds
   */
  public getModificationAge(): number {
    return Date.now() - new Date(this.updated_at).getTime();
  }
}

// === AUDITABLE ENTITY CLASS ===
export abstract class AuditableEntityClass extends Entity implements AuditableEntity {
  public created_by?: string;
  public updated_by?: string;
  public deleted_at?: string;
  public deleted_by?: string;

  constructor(data: Partial<AuditableEntity>) {
    super(data);
    this.created_by = data.created_by;
    this.updated_by = data.updated_by;
    this.deleted_at = data.deleted_at;
    this.deleted_by = data.deleted_by;
  }

  /**
   * Soft delete the entity
   */
  public softDelete(deletedBy: string): this {
    this.deleted_at = new Date().toISOString();
    this.deleted_by = deletedBy;
    this.touch();
    return this;
  }

  /**
   * Restore a soft deleted entity
   */
  public restore(): this {
    this.deleted_at = undefined;
    this.deleted_by = undefined;
    this.touch();
    return this;
  }

  /**
   * Check if entity is soft deleted
   */
  public isDeleted(): boolean {
    return !!this.deleted_at;
  }

  /**
   * Check if entity is active (not deleted)
   */
  public isActive(): boolean {
    return !this.deleted_at;
  }

  /**
   * Update with audit trail
   */
  public updateWithAudit(data: Partial<this>, updatedBy: string): this {
    this.updated_by = updatedBy;
    return this.update(data);
  }

  /**
   * Get audit trail information
   */
  public getAuditTrail(): {
    created: { at: string; by?: string };
    updated: { at: string; by?: string };
    deleted?: { at: string; by?: string };
  } {
    const audit: any = {
      created: { at: this.created_at, by: this.created_by },
      updated: { at: this.updated_at, by: this.updated_by },
    };

    if (this.deleted_at) {
      audit.deleted = { at: this.deleted_at, by: this.deleted_by };
    }

    return audit;
  }
}

// === ENTITY COLLECTION CLASS ===
export class EntityCollection<T extends Entity> {
  private entities: T[];
  private indexMap: Map<string, T>;

  constructor(entities: T[] = []) {
    this.entities = [...entities];
    this.indexMap = new Map();
    this.rebuildIndex();
  }

  /**
   * Rebuild the index map
   */
  private rebuildIndex(): void {
    this.indexMap.clear();
    this.entities.forEach(entity => {
      this.indexMap.set(entity.id, entity);
    });
  }

  /**
   * Add an entity to the collection
   */
  public add(entity: T): this {
    if (!this.indexMap.has(entity.id)) {
      this.entities.push(entity);
      this.indexMap.set(entity.id, entity);
    }
    return this;
  }

  /**
   * Remove an entity from the collection
   */
  public remove(id: string): boolean {
    const index = this.entities.findIndex(e => e.id === id);
    if (index !== -1) {
      this.entities.splice(index, 1);
      this.indexMap.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Find an entity by ID
   */
  public findById(id: string): T | undefined {
    return this.indexMap.get(id);
  }

  /**
   * Filter entities by predicate
   */
  public filter(predicate: (entity: T) => boolean): T[] {
    return this.entities.filter(predicate);
  }

  /**
   * Find first entity matching predicate
   */
  public find(predicate: (entity: T) => boolean): T | undefined {
    return this.entities.find(predicate);
  }

  /**
   * Map entities to new values
   */
  public map<U>(mapper: (entity: T) => U): U[] {
    return this.entities.map(mapper);
  }

  /**
   * Get all entities
   */
  public getAll(): T[] {
    return [...this.entities];
  }

  /**
   * Get collection size
   */
  public size(): number {
    return this.entities.length;
  }

  /**
   * Check if collection is empty
   */
  public isEmpty(): boolean {
    return this.entities.length === 0;
  }

  /**
   * Clear all entities
   */
  public clear(): this {
    this.entities = [];
    this.indexMap.clear();
    return this;
  }

  /**
   * Sort entities by field
   */
  public sortBy(field: keyof T, direction: 'asc' | 'desc' = 'asc'): this {
    this.entities.sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return this;
  }

  /**
   * Group entities by field value
   */
  public groupBy<K extends keyof T>(field: K): Map<T[K], T[]> {
    const groups = new Map<T[K], T[]>();

    this.entities.forEach(entity => {
      const key = entity[field];
      const group = groups.get(key) || [];
      group.push(entity);
      groups.set(key, group);
    });

    return groups;
  }

  /**
   * Convert collection to JSON
   */
  public toJSON(): Record<string, any>[] {
    return this.entities.map(entity => entity.toJSON());
  }

  /**
   * Get iterator
   */
  public [Symbol.iterator](): Iterator<T> {
    return this.entities[Symbol.iterator]();
  }
}

// === ENTITY FACTORY ===
export abstract class EntityFactory<T extends Entity> {
  /**
   * Create a new entity instance
   */
  abstract create(data: any): T;

  /**
   * Create multiple entity instances
   */
  public createMany(dataArray: any[]): T[] {
    return dataArray.map(data => this.create(data));
  }

  /**
   * Create a collection of entities
   */
  public createCollection(dataArray: any[]): EntityCollection<T> {
    const entities = this.createMany(dataArray);
    return new EntityCollection(entities);
  }
}

// All classes are already exported above with the export keyword
