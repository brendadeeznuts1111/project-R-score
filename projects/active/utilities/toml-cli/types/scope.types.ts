/**
 * Scope Context Types
 * Defines types for DuoPlus scoping system
 */

export interface ScopeContext {
  scopeId: string;
  domain: string;
  scope: 'ENTERPRISE' | 'DEVELOPMENT' | 'INTERNAL' | 'GITHUB' | 'GITLAB';
  tier?: 'premium' | 'standard' | 'basic';
  region?: string;
  metadata?: Record<string, unknown>;
}

export interface ScopeConfig {
  scopes: Record<string, ScopeContext>;
  default: string;
}

export interface ScopedRegistry {
  public: boolean;
  private: boolean;
  scope: string;
  priority: number;
}

export interface ScopeMatcher {
  domain: string;
  patterns: string[];
  scope: string;
  tier?: string;
}
