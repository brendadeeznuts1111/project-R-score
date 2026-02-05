// src/rbac/auth-context.ts
/**
 * §Types:139 - Auth & Scope Context
 * @pattern Pattern:139
 * @perf <0.1ms context switch
 * @roi ∞
 * @section §Auth
 */

import { PERMISSIONS } from './permissions';

export type UserScope = 'ENTERPRISE' | 'DEVELOPMENT' | 'LOCAL-SANDBOX';

export interface UserContext {
  id: string;
  name: string;
  scope: UserScope;
  permissions: string[];
  preferences: {
    pinnedMetrics: string[];
    theme: 'glass' | 'dark' | 'light';
    lang: string;
  };
}

export class AuthManager {
  private static currentUser: UserContext | null = null;

  static setUser(user: UserContext) {
    this.currentUser = user;
  }

  static getUser(): UserContext | null {
    return this.currentUser;
  }

  static hasPermission(permission: string): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.permissions.includes(permission);
  }

  static isScoped(requiredScope: UserScope): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.scope === requiredScope;
  }

  /**
   * Derive scope from environment/domain
   */
  static deriveScope(host: string): UserScope {
    if (host.includes('dev.apple')) return 'DEVELOPMENT';
    if (host.includes('apple.factory-wager')) return 'ENTERPRISE';
    return 'LOCAL-SANDBOX';
  }

  /**
   * Update user preferences (Pinned Metrics, etc.)
   */
  static async updatePreferences(prefs: Partial<UserContext['preferences']>): Promise<void> {
    if (!this.currentUser) return;
    this.currentUser.preferences = { ...this.currentUser.preferences, ...prefs };
    // In production, this would persist to a database or KV store
    console.log(`[AUTH] Updated preferences for ${this.currentUser.id}`);
  }
}

// Default Admin for CLI operations if not specified
export const DEFAULT_CLI_ADMIN: UserContext = {
  id: 'admin-001',
  name: 'Empire Admin',
  scope: 'ENTERPRISE',
  permissions: Object.values(PERMISSIONS).flatMap(group => Object.values(group)),
  preferences: {
    pinnedMetrics: ['§Workflow:100', '§Workflow:133'],
    theme: 'glass',
    lang: 'en-US'
  }
};
