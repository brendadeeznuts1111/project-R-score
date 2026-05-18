/**
 * MetaProperty - {PROPERTY} Layer
 * 
 * Represents the meta property level in the hierarchical inspection system.
 * Implements [Symbol.for("Bun.inspect.custom")] for rich, nested output.
 */

import { BUN_INSPECT_CUSTOM } from "../symbols.js";
import { ClassRef } from "./ClassRef.js";
import { resolvePropertyPath, generateRefId } from "../utils/paths.js";

export class MetaProperty {
  constructor(
    public property: string,
    public type: string,
    public scope: string,
    public domain: string
  ) {}

  /**
   * Get class references for this meta property
   */
  get classes(): Record<string, ClassRef> {
    if (this.type === "STORAGE") {
      return {
        "R2AppleManager": new ClassRef("R2AppleManager", this.property, this.scope),
        "LocalMirrorManager": new ClassRef("LocalMirrorManager", this.property, this.scope),
        "CacheManager": new ClassRef("CacheManager", this.property, this.scope),
      };
    }
    
    if (this.type === "SECRETS") {
      return {
        "UnifiedDashboardLauncher": new ClassRef("UnifiedDashboardLauncher", this.property, this.scope),
        "CredentialManager": new ClassRef("CredentialManager", this.property, this.scope),
        "KeychainManager": new ClassRef("KeychainManager", this.property, this.scope),
      };
    }
    
    // SERVICE
    return {
      "UnifiedDashboardLauncher": new ClassRef("UnifiedDashboardLauncher", this.property, this.scope),
      "ServiceManager": new ClassRef("ServiceManager", this.property, this.scope),
      "WorkerManager": new ClassRef("WorkerManager", this.property, this.scope),
    };
  }

  /**
   * Get meta property metadata
   */
  get metadata() {
    return {
      resolvedPath: this.getResolvedPath(),
      fullPath: this.getFullPath(),
      totalClasses: Object.keys(this.classes).length,
      inspectable: true,
      type: this.type,
      scope: this.scope
    };
  }

  /**
   * Custom inspection implementation
   * Returns structured object following [DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][#REF:*] schema
   */
  [BUN_INSPECT_CUSTOM]() {
    return {
      [`[META:{${this.property}}]`]: {
        resolvedPath: this.getResolvedPath(),
        fullPath: this.getFullPath(),
        metadata: this.metadata,
        classes: this.classes,
      },
    };
  }

  /**
   * Get resolved path for this property
   */
  private getResolvedPath(): string {
    return resolvePropertyPath(this.property, this.type, this.scope, this.domain);
  }

  /**
   * Get full path including domain
   */
  private getFullPath(): string {
    return `${this.domain}/${this.getResolvedPath()}`;
  }

  /**
   * Get class reference by name
   */
  getClass(className: string): ClassRef | null {
    return this.classes[className] || null;
  }

  /**
   * Check if class exists
   */
  hasClass(className: string): boolean {
    return className in this.classes;
  }

  /**
   * Get all class names
   */
  getClassNames(): string[] {
    return Object.keys(this.classes);
  }

  /**
   * Get property configuration
   */
  getConfiguration() {
    return {
      property: this.property,
      type: this.type,
      scope: this.scope,
      domain: this.domain,
      resolvedPath: this.getResolvedPath(),
      fullPath: this.getFullPath(),
      classes: this.getClassNames()
    };
  }

  /**
   * Check if property exists physically
   */
  async exists(): Promise<boolean> {
    // In real implementation, check file system or storage
    // For demo, return true for common properties
    const commonProperties = [
      'accounts/user123.json',
      'config/settings.json',
      'service-credentials',
      'launcher-config'
    ];
    return commonProperties.includes(this.property);
  }

  /**
   * Get property size (if applicable)
   */
  async getSize(): Promise<number> {
    // In real implementation, get file size or storage size
    // For demo, return estimated size
    if (this.property.includes('.json')) {
      return 1024; // 1KB for JSON files
    }
    return 512; // 512B for other properties
  }
}
