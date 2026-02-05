/**
 * Enhanced Domain Context with User Context Support
 * 
 * Extends the original DomainContext to support user context injection
 * for enhanced inspection capabilities.
 */

import { BUN_INSPECT_CUSTOM } from "../symbols.js";
import { ScopeContext } from "./ScopeContext.js";
import * as config from "../config/scope.config.js";

export interface UserContext {
  userId: string;
  email: string;
  username: string;
  phoneNumber: string;
  lastActive: Date;
  accountType: "developer" | "admin" | "user" | "guest";
  familyId: string;
  paymentApps: {
    venmo: string;
    cashapp: string;
    crypto: string;
  };
  preferences?: {
    theme: "light" | "dark" | "auto";
    notifications: boolean;
    privacy: "public" | "private" | "family";
  };
  permissions?: string[];
  metadata?: Record<string, any>;
}

export class EnhancedDomainContext {
  public domain: string;
  private userContext: UserContext | null = null;
  private debugMode: boolean = false;

  constructor(domain: string) {
    this.domain = domain;
    this.debugMode = import.meta.env.DEBUG === "true";
  }

  /**
   * Set user context for inspection
   */
  setUserContext(userContext: UserContext): void {
    this.userContext = userContext;
  }

  /**
   * Get user context
   */
  getUserContext(): UserContext | null {
    return this.userContext;
  }

  /**
   * Clear user context
   */
  clearUserContext(): void {
    this.userContext = null;
  }

  /**
   * Get available scopes
   */
  get scopes(): Record<string, ScopeContext> {
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
      inspectable: true,
      debugMode: this.debugMode,
      hasUserContext: !!this.userContext
    };
  }

  /**
   * Custom inspection implementation with user context
   */
  [BUN_INSPECT_CUSTOM]() {
    const baseOutput = {
      "[DOMAIN]": this.domain,
      "[METADATA]": this.metadata,
      "[SCOPES]": this.scopes,
    };

    // Add user context if available
    if (this.userContext) {
      return {
        ...baseOutput,
        "[USER_CONTEXT]": this.formatUserContext(),
      };
    }

    return baseOutput;
  }

  /**
   * Format user context for inspection
   */
  private formatUserContext() {
    if (!this.userContext) return null;

    return {
      userId: this.userContext.userId,
      username: this.userContext.username,
      email: this.userContext.email,
      accountType: this.userContext.accountType,
      familyId: this.userContext.familyId,
      lastActive: this.userContext.lastActive.toISOString(),
      paymentApps: this.userContext.paymentApps,
      preferences: this.userContext.preferences,
      permissions: this.userContext.permissions || [],
      metadata: this.userContext.metadata || {}
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

  /**
   * Get inspection summary
   */
  getInspectionSummary() {
    return {
      domain: this.domain,
      scope: config.SCOPE,
      platform: config.PLATFORM,
      hasUserContext: !!this.userContext,
      debugMode: this.debugMode,
      totalScopes: this.getScopeNames().length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Export context as JSON (with depth control)
   */
  exportAsJSON(depth: number = 6, filter?: string): any {
    const customOutput = this[BUN_INSPECT_CUSTOM]();
    
    if (!filter) {
      return customOutput;
    }

    // Apply filter
    return this.filterObject(customOutput, filter.toLowerCase(), depth);
  }

  /**
   * Filter object based on pattern and depth
   */
  private filterObject(obj: any, pattern: string, depth: number, currentDepth: number = 0): any {
    if (currentDepth >= depth) {
      return typeof obj === 'object' ? `[truncated at depth ${currentDepth}]` : obj;
    }

    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj
        .map(item => this.filterObject(item, pattern, depth, currentDepth + 1))
        .filter(item => item !== null && item !== undefined);
    }

    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const keyMatches = key.toLowerCase().includes(pattern);
      
      if (keyMatches) {
        result[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        const filtered = this.filterObject(value, pattern, depth, currentDepth + 1);
        if (Object.keys(filtered).length > 0) {
          result[key] = filtered;
        }
      }
    }

    return result;
  }

  /**
   * Get environment variables for shell export
   */
  getShellVariables(depth: number = 3): Record<string, string> {
    const variables: Record<string, string> = {};
    
    // Basic domain info
    variables["FACTORY_WAGER_DOMAIN"] = this.domain;
    variables["FACTORY_WAGER_SCOPE"] = config.SCOPE;
    variables["FACTORY_WAGER_PLATFORM"] = config.PLATFORM;
    
    // User context variables
    if (this.userContext && depth >= 2) {
      variables["FACTORY_WAGER_USER_ID"] = this.userContext.userId;
      variables["FACTORY_WAGER_USERNAME"] = this.userContext.username;
      variables["FACTORY_WAGER_EMAIL"] = this.userContext.email;
      variables["FACTORY_WAGER_FAMILY_ID"] = this.userContext.familyId;
      variables["FACTORY_WAGER_ACCOUNT_TYPE"] = this.userContext.accountType;
      
      if (depth >= 3) {
        variables["FACTORY_WAGER_PHONE"] = this.userContext.phoneNumber;
        variables["FACTORY_WAGER_VENMO"] = this.userContext.paymentApps.venmo;
        variables["FACTORY_WAGER_CASHAPP"] = this.userContext.paymentApps.cashapp;
        variables["FACTORY_WAGER_CRYPTO"] = this.userContext.paymentApps.crypto;
      }
    }
    
    return variables;
  }

  /**
   * Validate context integrity
   */
  validate(): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate domain
    if (!this.domain || typeof this.domain !== 'string') {
      errors.push("Invalid domain");
    }

    // Validate user context if present
    if (this.userContext) {
      if (!this.userContext.userId) {
        errors.push("User context missing userId");
      }
      
      if (!this.userContext.familyId) {
        warnings.push("User context missing familyId");
      }
      
      if (!this.userContext.email || !this.userContext.email.includes("@")) {
        warnings.push("User context has invalid email");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create debug user context
   */
  createDebugUserContext(): UserContext {
    return {
      userId: "usr_debug",
      email: "debug@factory-wager.local",
      username: "debug_user",
      phoneNumber: "+1-555-DEBUG",
      lastActive: new Date(),
      accountType: "developer",
      familyId: "FAM_DEBUG",
      paymentApps: {
        venmo: "venmo://pay?recipients=@debug&amount=0",
        cashapp: "cashapp://pay?cashtag=$debug&amount=0",
        crypto: "bitcoin:bc1q...?amount=0"
      },
      preferences: {
        theme: "dark",
        notifications: true,
        privacy: "private"
      },
      permissions: ["debug", "inspect", "admin"],
      metadata: {
        debugMode: true,
        sessionId: "debug_session_" + Date.now()
      }
    };
  }

  /**
   * Enable debug mode with user context
   */
  enableDebugMode(): void {
    this.debugMode = true;
    this.setUserContext(this.createDebugUserContext());
  }

  /**
   * Disable debug mode
   */
  disableDebugMode(): void {
    this.debugMode = false;
    this.clearUserContext();
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugMode(): boolean {
    return this.debugMode;
  }
}

// Export the enhanced class as DomainContext for backward compatibility
export const DomainContext = EnhancedDomainContext;
export default EnhancedDomainContext;
