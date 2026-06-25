/**
 * ScopeContext - Per-Scope Layer
 * 
 * Represents the scope level in the hierarchical inspection system.
 * Implements [Symbol.for("Bun.inspect.custom")] for rich, nested output.
 */

import { BUN_INSPECT_CUSTOM } from "../symbols.js";
import { TypeContext } from "./TypeContext.js";
import * as config from "../config/scope.config.js";

export class ScopeContext {
  constructor(public scope: string, public domain: string) {}

  /**
   * Get available types for this scope
   */
  get types() {
    return {
      STORAGE: new TypeContext("STORAGE", this.scope, this.domain),
      SECRETS: new TypeContext("SECRETS", this.scope, this.domain),
      SERVICE: new TypeContext("SERVICE", this.scope, this.domain),
    };
  }

  /**
   * Get scope-level metadata
   */
  get metadata() {
    return {
      platform: config.PLATFORM,
      serviceName: config.SERVICE_NAME,
      storagePrefix: config.STORAGE_PREFIX,
      secretsBackend: config.SECRETS_BACKEND,
      totalTypes: Object.keys(this.types).length,
      inspectable: true
    };
  }

  /**
   * Custom inspection implementation
   * Returns structured object following [DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][#REF:*] schema
   */
  [BUN_INSPECT_CUSTOM]() {
    return {
      [`[SCOPE]`]: this.scope,
      [`[PLATFORM]`]: config.PLATFORM,
      [`[METADATA]`]: this.metadata,
      ...this.types,
    };
  }

  /**
   * Get type by name
   */
  getType(typeName: "STORAGE" | "SECRETS" | "SERVICE"): TypeContext | null {
    return this.types[typeName] || null;
  }

  /**
   * Check if type exists
   */
  hasType(typeName: string): boolean {
    return typeName in this.types;
  }

  /**
   * Get all type names
   */
  getTypeNames(): string[] {
    return Object.keys(this.types);
  }

  /**
   * Get scope configuration summary
   */
  getConfiguration() {
    return {
      scope: this.scope,
      domain: this.domain,
      platform: config.PLATFORM,
      serviceName: config.SERVICE_NAME,
      storagePrefix: config.STORAGE_PREFIX,
      secretsBackend: config.SECRETS_BACKEND
    };
  }
}
