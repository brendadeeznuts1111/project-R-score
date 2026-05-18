/**
 * DomainContext - Top-Level Inspector
 * 
 * The root of the hierarchical inspection system representing the domain level.
 * Implements [Symbol.for("Bun.inspect.custom")] for rich, nested output.
 */

import { BUN_INSPECT_CUSTOM } from "../symbols.js";
import { ScopeContext } from "./ScopeContext.js";
import * as config from "../config/scope.config.js";

export class DomainContext {
  constructor(public domain: string) {}

  /**
   * Get available scopes for this domain
   */
  get scopes(): Record<string, ScopeContext> {
    // In real application: dynamic scope discovery
    // For demo: return current scope
    return {
      [config.SCOPE]: new ScopeContext(config.SCOPE, this.domain),
    };
  }

  /**
   * Get domain-level metadata
   */
  get metadata() {
    return {
      platform: config.PLATFORM,
      secretsBackend: config.SECRETS_BACKEND,
      totalScopes: Object.keys(this.scopes).length,
      inspectable: true
    };
  }

  /**
   * Custom inspection implementation
   * Returns structured object following [DOMAIN][SCOPE][TYPE][META:{PROPERTY}][CLASS][#REF:*] schema
   */
  [BUN_INSPECT_CUSTOM]() {
    return {
      "[DOMAIN]": this.domain,
      "[METADATA]": this.metadata,
      "[SCOPES]": this.scopes,
    };
  }

  /**
   * Get scope by name
   */
  getScope(scopeName: string): ScopeContext | null {
    return this.scopes[scopeName] || null;
  }

  /**
   * Check if scope exists
   */
  hasScope(scopeName: string): boolean {
    return scopeName in this.scopes;
  }

  /**
   * Get all scope names
   */
  getScopeNames(): string[] {
    return Object.keys(this.scopes);
  }
}
