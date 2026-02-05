/**
 * Twitter Compliance Integration
 * Connects Twitter operations with DuoPlus scoping matrix
 */

import type { ComplianceCheck, DeploymentScope, ResourceLimits } from '../types/twitter.types';
import { getScopeContext } from '../config/scope.config.ts';
import { validateMatrixCompliance } from '../utils/matrixValidator.ts';

/**
 * Twitter compliance checker for scoping matrix integration
 */
export class TwitterComplianceChecker {
  /**
   * Check if Twitter operations are allowed for current scope
   */
  checkTwitterCompliance(feature: string = 'twitter'): ComplianceCheck {
    const scopeContext = getScopeContext();
    const matrixValidation = validateMatrixCompliance();

    const twitterAllowed = scopeContext.integrations.twitter;
    const featureAllowed = scopeContext.features[feature as keyof typeof scopeContext.features] !== false;

    // Build restrictions list
    const restrictions: string[] = [];
    if (!twitterAllowed) restrictions.push('Twitter integration disabled');
    if (!featureAllowed) restrictions.push(`${feature} feature disabled`);
    if (!matrixValidation.valid) restrictions.push(...matrixValidation.issues);

    // Get limits for current scope
    const limits = this.getScopeLimits(scopeContext.detectedScope);

    return {
      scope: scopeContext.detectedScope,
      feature: 'twitter',
      allowed: twitterAllowed && featureAllowed && matrixValidation.valid,
      limits,
      restrictions,
    };
  }

  /**
   * Validate operation against resource limits
   */
  validateResourceLimits(
    operation: string,
    currentUsage: number,
    compliance: ComplianceCheck
  ): { allowed: boolean; reason?: string } {
    const limits = compliance.limits;

    switch (operation) {
      case 'tweet':
        if (currentUsage >= limits.apiRateLimit) {
          return { allowed: false, reason: 'API rate limit exceeded' };
        }
        break;

      case 'media_upload':
        if (currentUsage >= limits.apiRateLimit) {
          return { allowed: false, reason: 'Media upload rate limit exceeded' };
        }
        break;

      case 'follow':
      case 'unfollow':
        if (currentUsage >= limits.maxDevices) {
          return { allowed: false, reason: 'Follow/unfollow limit exceeded' };
        }
        break;
    }

    return { allowed: true };
  }

  /**
   * Get resource limits for scope
   */
  private getScopeLimits(scope: DeploymentScope): ResourceLimits {
    const scopeContext = getScopeContext();

    // Return limits based on current scope
    return {
      maxDevices: scopeContext.limits.maxDevices,
      maxIntegrations: scopeContext.limits.maxIntegrations,
      apiRateLimit: scopeContext.limits.apiRateLimit,
      storageQuota: scopeContext.limits.storageQuota,
    };
  }

  /**
   * Check if advanced features are allowed
   */
  checkAdvancedFeatures(): {
    analytics: boolean;
    scheduling: boolean;
    webhooks: boolean;
    bulkOperations: boolean;
  } {
    const scopeContext = getScopeContext();

    return {
      analytics: scopeContext.features.advancedAnalytics !== false,
      scheduling: scopeContext.features.customIntegrations !== false,
      webhooks: scopeContext.features.customIntegrations !== false,
      bulkOperations: scopeContext.features.multiTenant !== false,
    };
  }

  /**
   * Get compliance report for Twitter operations
   */
  getComplianceReport(): {
    scope: DeploymentScope;
    allowed: boolean;
    features: Record<string, boolean>;
    limits: ResourceLimits;
    restrictions: string[];
    recommendations: string[];
  } {
    const compliance = this.checkTwitterCompliance();
    const advancedFeatures = this.checkAdvancedFeatures();
    const matrixValidation = validateMatrixCompliance();

    const recommendations: string[] = [];

    if (!compliance.allowed) {
      recommendations.push('Enable Twitter integration in scope configuration');
    }

    if (!advancedFeatures.analytics) {
      recommendations.push('Upgrade to Enterprise scope for advanced analytics');
    }

    if (!advancedFeatures.scheduling) {
      recommendations.push('Upgrade to Enterprise scope for tweet scheduling');
    }

    if (matrixValidation.issues.length > 0) {
      recommendations.push('Address scoping matrix validation issues');
    }

    return {
      scope: compliance.scope,
      allowed: compliance.allowed,
      features: advancedFeatures,
      limits: compliance.limits,
      restrictions: compliance.restrictions,
      recommendations,
    };
  }
}

/**
 * Compliance middleware for Twitter operations
 */
export function createTwitterComplianceMiddleware() {
  const checker = new TwitterComplianceChecker();

  return async (request: Request): Promise<Request | Response> => {
    // Check if request is for Twitter endpoints
    if (!request.url.includes('/api/twitter')) {
      return request;
    }

    const compliance = checker.checkTwitterCompliance();

    if (!compliance.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Twitter integration not allowed',
          restrictions: compliance.restrictions,
          scope: compliance.scope,
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Add compliance info to request
    (request as any).compliance = compliance;
    return request;
  };
}

/**
 * Rate limit compliance checker
 */
export class TwitterRateLimitCompliance {
  private readonly checker: TwitterComplianceChecker;
  private usage: Map<string, number> = new Map();

  constructor() {
    this.checker = new TwitterComplianceChecker();
  }

  /**
   * Check if operation can proceed within compliance limits
   */
  canProceed(operation: string): { allowed: boolean; reason?: string } {
    const compliance = this.checker.checkTwitterCompliance();

    if (!compliance.allowed) {
      return { allowed: false, reason: 'Twitter integration not compliant' };
    }

    const currentUsage = this.usage.get(operation) || 0;
    return this.checker.validateResourceLimits(operation, currentUsage, compliance);
  }

  /**
   * Record operation usage
   */
  recordUsage(operation: string): void {
    const current = this.usage.get(operation) || 0;
    this.usage.set(operation, current + 1);
  }

  /**
   * Reset usage counters (call periodically)
   */
  resetUsage(): void {
    this.usage.clear();
  }

  /**
   * Get current usage statistics
   */
  getUsageStats(): Record<string, number> {
    return Object.fromEntries(this.usage);
  }
}

/**
 * Singleton instances for global use
 */
export const twitterCompliance = new TwitterComplianceChecker();
export const twitterRateLimitCompliance = new TwitterRateLimitCompliance();