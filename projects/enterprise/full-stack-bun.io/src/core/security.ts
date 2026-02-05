/**
 * Core Security Domain Model
 * Business logic for security policies and access control
 */

import { z } from "zod";

// Security Level Enum
export enum SecurityLevel {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted'
}

// Permission Type Enum
export enum PermissionType {
  READ = 'read',
  WRITE = 'write',
  EXECUTE = 'execute',
  DELETE = 'delete',
  ADMIN = 'admin'
}

// Resource Type Enum
export enum ResourceType {
  AGENT = 'agent',
  WORKFLOW = 'workflow',
  COMMAND = 'command',
  FILE = 'file',
  DATABASE = 'database',
  NETWORK = 'network',
  SYSTEM = 'system'
}

// Security Policy Schema
export const SecurityPolicySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  level: z.nativeEnum(SecurityLevel),
  resources: z.array(z.object({
    type: z.nativeEnum(ResourceType),
    pattern: z.string(), // Resource identifier pattern (e.g., "agent:*", "workflow:deploy-*")
    permissions: z.array(z.nativeEnum(PermissionType))
  })),
  conditions: z.array(z.object({
    type: z.enum(['time', 'location', 'role', 'group', 'custom']),
    operator: z.enum(['equals', 'contains', 'matches', 'in', 'not_in']),
    value: z.any(),
    negate: z.boolean().default(false)
  })).default([]),
  ipWhitelist: z.array(z.string()).default([]), // CIDR notation
  timeRestrictions: z.object({
    allowedDays: z.array(z.number().min(0).max(6)).default([]), // 0=Sunday, 6=Saturday
    allowedHours: z.object({
      start: z.number().min(0).max(23),
      end: z.number().min(0).max(23)
    }).optional()
  }).optional(),
  riskThreshold: z.number().min(0).max(100).default(50),
  requiresApproval: z.boolean().default(false),
  approvalRoles: z.array(z.string()).default([]),
  auditEnabled: z.boolean().default(true),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
  active: z.boolean().default(true)
});

export type SecurityPolicy = z.infer<typeof SecurityPolicySchema>;

// Access Request Schema
export const AccessRequestSchema = z.object({
  id: z.string(),
  resource: z.object({
    type: z.nativeEnum(ResourceType),
    identifier: z.string(),
    action: z.nativeEnum(PermissionType)
  }),
  requester: z.object({
    id: z.string(),
    roles: z.array(z.string()),
    groups: z.array(z.string()),
    attributes: z.record(z.any())
  }),
  context: z.object({
    ipAddress: z.string(),
    userAgent: z.string().optional(),
    timestamp: z.date(),
    sessionId: z.string().optional(),
    location: z.object({
      country: z.string().optional(),
      region: z.string().optional(),
      city: z.string().optional()
    }).optional()
  }),
  riskScore: z.number().min(0).max(100).default(0),
  approved: z.boolean().optional(),
  approver: z.string().optional(),
  approvalTimestamp: z.date().optional(),
  expiresAt: z.date().optional(),
  auditLog: z.array(z.object({
    timestamp: z.date(),
    action: z.string(),
    details: z.any(),
    actor: z.string()
  })).default([])
});

export type AccessRequest = z.infer<typeof AccessRequestSchema>;

// Security Context
export interface SecurityContext {
  userId: string;
  roles: string[];
  groups: string[];
  permissions: PermissionType[];
  attributes: Record<string, any>;
  sessionId: string;
  ipAddress: string;
  riskScore: number;
}

// Access Decision
export interface AccessDecision {
  allowed: boolean;
  reason?: string;
  riskScore: number;
  requiredApproval: boolean;
  policiesApplied: string[];
  recommendations?: string[];
}

// Security Audit Event
export interface SecurityAuditEvent {
  id: string;
  timestamp: Date;
  eventType: 'access_granted' | 'access_denied' | 'policy_violation' | 'suspicious_activity' | 'approval_required';
  severity: 'low' | 'medium' | 'high' | 'critical';
  resource: {
    type: ResourceType;
    identifier: string;
    action: PermissionType;
  };
  actor: {
    id: string;
    roles: string[];
    ipAddress: string;
  };
  context: Record<string, any>;
  riskScore: number;
  policiesTriggered: string[];
  response: {
    allowed: boolean;
    reason?: string;
  };
}

// Security Engine Interface
export interface SecurityEngine {
  evaluateAccess(request: AccessRequest): Promise<AccessDecision>;
  validatePolicy(policy: SecurityPolicy): { valid: boolean; errors: string[] };
  calculateRiskScore(context: SecurityContext, resource: AccessRequest['resource']): number;
  logAuditEvent(event: SecurityAuditEvent): Promise<void>;
  getActivePolicies(): SecurityPolicy[];
}

// Security Engine Implementation
export class SecurityEngineImpl implements SecurityEngine {
  private policies: Map<string, SecurityPolicy> = new Map();
  private auditLog: SecurityAuditEvent[] = [];

  registerPolicy(policy: SecurityPolicy): void {
    // Validate policy
    SecurityPolicySchema.parse(policy);

    // Validate policy logic
    const validation = this.validatePolicy(policy);
    if (!validation.valid) {
      throw new Error(`Invalid policy: ${validation.errors.join(', ')}`);
    }

    this.policies.set(policy.id, policy);
  }

  async evaluateAccess(request: AccessRequest): Promise<AccessDecision> {
    const applicablePolicies = this.getApplicablePolicies(request);
    const riskScore = this.calculateRiskScoreFromRequest(request);

    let allowed = false;
    let reason = 'No applicable policies';
    const policiesApplied: string[] = [];
    const recommendations: string[] = [];

    for (const policy of applicablePolicies) {
      policiesApplied.push(policy.id);

      // Check resource permissions
      const resourcePermission = policy.resources.find(r =>
        this.matchesResourcePattern(request.resource.identifier, r.pattern)
      );

      if (resourcePermission && resourcePermission.permissions.includes(request.resource.action)) {
        // Check conditions
        const conditionsMet = this.evaluateConditions(policy.conditions, request);

        if (conditionsMet) {
          // Check IP whitelist
          const ipAllowed = policy.ipWhitelist.length === 0 ||
                           policy.ipWhitelist.some(cidr => this.isIpInCidr(request.context.ipAddress, cidr));

          if (ipAllowed) {
            // Check time restrictions
            const timeAllowed = !policy.timeRestrictions ||
                               this.checkTimeRestrictions(policy.timeRestrictions, request.context.timestamp);

            if (timeAllowed) {
              allowed = true;
              reason = `Access granted by policy: ${policy.name}`;

              // Check if approval is required
              if (policy.requiresApproval && riskScore > policy.riskThreshold) {
                request.approved = false;
                reason += ' (approval required)';
                recommendations.push('Request approval from authorized personnel');
              }

              break;
            } else {
              reason = 'Access denied: time restrictions';
            }
          } else {
            reason = 'Access denied: IP not in whitelist';
          }
        } else {
          reason = 'Access denied: conditions not met';
        }
      }
    }

    // Create audit event
    const auditEvent: SecurityAuditEvent = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      eventType: allowed ? 'access_granted' : 'access_denied',
      severity: riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low',
      resource: request.resource,
      actor: {
        id: request.requester.id,
        roles: request.requester.roles,
        ipAddress: request.context.ipAddress
      },
      context: {
        sessionId: request.context.sessionId,
        userAgent: request.context.userAgent,
        location: request.context.location
      },
      riskScore,
      policiesTriggered: policiesApplied,
      response: { allowed, reason }
    };

    await this.logAuditEvent(auditEvent);

    return {
      allowed,
      reason,
      riskScore,
      requiredApproval: !allowed && applicablePolicies.some(p => p.requiresApproval),
      policiesApplied,
      recommendations
    };
  }

  validatePolicy(policy: SecurityPolicy): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check resource patterns are valid regex
    for (const resource of policy.resources) {
      try {
        new RegExp(resource.pattern.replace(/\*/g, '.*'));
      } catch {
        errors.push(`Invalid resource pattern: ${resource.pattern}`);
      }
    }

    // Check IP whitelist format
    for (const cidr of policy.ipWhitelist) {
      if (!this.isValidCidr(cidr)) {
        errors.push(`Invalid CIDR notation: ${cidr}`);
      }
    }

    // Check time restrictions
    if (policy.timeRestrictions) {
      const { allowedHours } = policy.timeRestrictions;
      if (allowedHours && allowedHours.start >= allowedHours.end) {
        errors.push('Time restriction end hour must be after start hour');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  calculateRiskScore(context: SecurityContext, resource: AccessRequest['resource']): number {
    let score = 0;

    // Base risk by resource type
    switch (resource.type) {
      case ResourceType.SYSTEM:
        score += 80;
        break;
      case ResourceType.DATABASE:
        score += 70;
        break;
      case ResourceType.AGENT:
      case ResourceType.WORKFLOW:
        score += 50;
        break;
      case ResourceType.COMMAND:
        score += 40;
        break;
      case ResourceType.FILE:
      case ResourceType.NETWORK:
        score += 30;
        break;
    }

    // Risk by permission type
    switch (resource.action) {
      case PermissionType.ADMIN:
        score += 50;
        break;
      case PermissionType.DELETE:
        score += 40;
        break;
      case PermissionType.WRITE:
        score += 30;
        break;
      case PermissionType.EXECUTE:
        score += 20;
        break;
      case PermissionType.READ:
        score += 10;
        break;
    }

    // Risk by user roles
    if (context.roles.includes('admin')) {
      score -= 20; // Admins have more trust
    }

    // Time-based risk (higher risk during off-hours)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      score += 15;
    }

    // Clamp between 0-100
    return Math.max(0, Math.min(100, score));
  }

  async logAuditEvent(event: SecurityAuditEvent): Promise<void> {
    this.auditLog.push(event);

    // In a real implementation, this would write to a secure audit log
    console.log(`SECURITY AUDIT: ${event.eventType} - ${event.resource.type}:${event.resource.action} by ${event.actor.id} (${event.severity})`);

    // Keep only last 1000 events in memory
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }

  getActivePolicies(): SecurityPolicy[] {
    return Array.from(this.policies.values()).filter(p => p.active);
  }

  getAuditLog(filters?: {
    eventType?: SecurityAuditEvent['eventType'];
    severity?: SecurityAuditEvent['severity'];
    actorId?: string;
    limit?: number;
  }): SecurityAuditEvent[] {
    let events = [...this.auditLog];

    if (filters) {
      if (filters.eventType) {
        events = events.filter(e => e.eventType === filters.eventType);
      }

      if (filters.severity) {
        events = events.filter(e => e.severity === filters.severity);
      }

      if (filters.actorId) {
        events = events.filter(e => e.actor.id === filters.actorId);
      }

      if (filters.limit) {
        events = events.slice(-filters.limit);
      }
    }

    return events;
  }

  private getApplicablePolicies(request: AccessRequest): SecurityPolicy[] {
    return this.getActivePolicies().filter(policy => {
      // Check if policy applies to resource type
      const hasResourceType = policy.resources.some(r => r.type === request.resource.type);
      if (!hasResourceType) return false;

      // Check security level compatibility
      // Higher security levels can access lower levels
      const levelHierarchy = {
        [SecurityLevel.PUBLIC]: 0,
        [SecurityLevel.INTERNAL]: 1,
        [SecurityLevel.CONFIDENTIAL]: 2,
        [SecurityLevel.RESTRICTED]: 3
      };

      // For now, assume request has a security level (would be determined by authentication)
      const requestLevel = SecurityLevel.INTERNAL; // Placeholder
      return levelHierarchy[policy.level] >= levelHierarchy[requestLevel];
    });
  }

  private calculateRiskScoreFromRequest(request: AccessRequest): number {
    const context: SecurityContext = {
      userId: request.requester.id,
      roles: request.requester.roles,
      groups: request.requester.groups,
      permissions: [], // Would be populated from roles
      attributes: request.requester.attributes,
      sessionId: request.context.sessionId || '',
      ipAddress: request.context.ipAddress,
      riskScore: request.riskScore
    };

    return this.calculateRiskScore(context, request.resource);
  }

  private matchesResourcePattern(identifier: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(identifier);
  }

  private evaluateConditions(conditions: SecurityPolicy['conditions'], request: AccessRequest): boolean {
    for (const condition of conditions) {
      let value: any;

      switch (condition.type) {
        case 'time':
          value = request.context.timestamp.getHours();
          break;
        case 'location':
          value = request.context.location?.country;
          break;
        case 'role':
          value = request.requester.roles;
          break;
        case 'group':
          value = request.requester.groups;
          break;
        case 'custom':
          // Custom condition evaluation (placeholder)
          value = request.requester.attributes[condition.value];
          break;
        default:
          continue;
      }

      if (!this.evaluateConditionValue(value, condition.operator, condition.value, condition.negate)) {
        return false;
      }
    }

    return true;
  }

  private evaluateConditionValue(value: any, operator: string, expected: any, negate: boolean): boolean {
    let result: boolean;

    switch (operator) {
      case 'equals':
        result = value === expected;
        break;
      case 'contains':
        result = Array.isArray(value) ? value.includes(expected) : String(value).includes(String(expected));
        break;
      case 'matches':
        const regex = new RegExp(expected);
        result = regex.test(String(value));
        break;
      case 'in':
        result = Array.isArray(expected) ? expected.includes(value) : false;
        break;
      case 'not_in':
        result = Array.isArray(expected) ? !expected.includes(value) : true;
        break;
      default:
        result = false;
    }

    return negate ? !result : result;
  }

  private isIpInCidr(ip: string, cidr: string): boolean {
    // Simple CIDR check implementation (placeholder)
    // In production, use a proper IP address library
    return ip.startsWith(cidr.split('/')[0]);
  }

  private isValidCidr(cidr: string): boolean {
    // Basic CIDR validation (placeholder)
    const parts = cidr.split('/');
    return parts.length === 2 && /^\d+\.\d+\.\d+\.\d+$/.test(parts[0]);
  }

  private checkTimeRestrictions(restrictions: NonNullable<SecurityPolicy['timeRestrictions']>, timestamp: Date): boolean {
    const day = timestamp.getDay(); // 0 = Sunday
    const hour = timestamp.getHours();

    // Check allowed days
    if (restrictions.allowedDays.length > 0 && !restrictions.allowedDays.includes(day)) {
      return false;
    }

    // Check allowed hours
    if (restrictions.allowedHours) {
      const { start, end } = restrictions.allowedHours;
      if (hour < start || hour >= end) {
        return false;
      }
    }

    return true;
  }
}

// Factory function for creating security engine
export function createSecurityEngine(): SecurityEngine {
  return new SecurityEngineImpl();
}

// Helper function to create access request
export function createAccessRequest(
  resource: AccessRequest['resource'],
  requester: AccessRequest['requester'],
  context: Partial<AccessRequest['context']> = {}
): AccessRequest {
  return {
    id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    resource,
    requester,
    context: {
      ipAddress: context.ipAddress || '127.0.0.1',
      userAgent: context.userAgent || 'unknown',
      timestamp: context.timestamp || new Date(),
      sessionId: context.sessionId,
      location: context.location
    },
    auditLog: []
  };
}
