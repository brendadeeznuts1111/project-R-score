/**
 * TypeContext - Storage / Secrets / Service Layer
 * 
 * Represents the type level in the hierarchical inspection system.
 * Implements [Symbol.for("Bun.inspect.custom")] for rich, nested output.
 */

import { BUN_INSPECT_CUSTOM } from "../symbols.js";
import { MetaProperty } from "./MetaProperty.js";
import * as config from "../config/scope.config.js";
import { getBackendForType, getPrefixForType } from "../utils/paths.js";

export class TypeContext {
  constructor(
    public type: "STORAGE" | "SECRETS" | "SERVICE",
    public scope: string,
    public domain: string
  ) {}

  /**
   * Get meta properties for this type
   */
  get meta(): Record<string, MetaProperty> {
    const typeConfig = config.TYPE_CONFIG[this.type];
    
    if (this.type === "STORAGE") {
      return {
        "{PROPERTY}": new MetaProperty("accounts/user123.json", this.type, this.scope, this.domain),
        "{CONFIG}": new MetaProperty("config/settings.json", this.type, this.scope, this.domain),
        "{CACHE}": new MetaProperty("cache/data.bin", this.type, this.scope, this.domain),
      };
    }
    
    if (this.type === "SECRETS") {
      return {
        "{PROPERTY}": new MetaProperty("service-credentials", this.type, this.scope, this.domain),
        "{API_KEYS}": new MetaProperty("api-keys", this.type, this.scope, this.domain),
        "{CERTS}": new MetaProperty("certificates", this.type, this.scope, this.domain),
      };
    }
    
    // SERVICE
    return {
      "{PROPERTY}": new MetaProperty("launcher-config", this.type, this.scope, this.domain),
      "{DASHBOARD}": new MetaProperty("dashboard-config", this.type, this.scope, this.domain),
      "{WORKER}": new MetaProperty("worker-settings", this.type, this.scope, this.domain),
    };
  }

  /**
   * Get type-level metadata
   */
  get metadata() {
    return {
      backend: this.getBackend(),
      prefix: this.getPrefix(),
      totalProperties: Object.keys(this.meta).length,
      inspectable: true,
      supportedProperties: config.TYPE_CONFIG[this.type].properties
    };
  }

  /**
   * Custom inspection implementation
   * Returns structured object following [DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][#REF:*] schema
   */
  [BUN_INSPECT_CUSTOM]() {
    const label = `[TYPE:${this.type}]`;
    return {
      [label]: {
        backend: this.getBackend(),
        prefix: this.getPrefix(),
        metadata: this.metadata,
        meta: this.meta,
      },
    };
  }

  /**
   * Get backend for this type
   */
  private getBackend(): string {
    return getBackendForType(this.type);
  }

  /**
   * Get prefix for this type and scope
   */
  private getPrefix(): string {
    return getPrefixForType(this.type, this.scope);
  }

  /**
   * Get meta property by name
   */
  getMetaProperty(propertyName: string): MetaProperty | null {
    return this.meta[propertyName] || null;
  }

  /**
   * Check if meta property exists
   */
  hasMetaProperty(propertyName: string): boolean {
    return propertyName in this.meta;
  }

  /**
   * Get all meta property names
   */
  getMetaPropertyNames(): string[] {
    return Object.keys(this.meta);
  }

  /**
   * Get type configuration
   */
  getConfiguration() {
    return {
      type: this.type,
      scope: this.scope,
      domain: this.domain,
      backend: this.getBackend(),
      prefix: this.getPrefix(),
      properties: this.getMetaPropertyNames()
    };
  }
}
