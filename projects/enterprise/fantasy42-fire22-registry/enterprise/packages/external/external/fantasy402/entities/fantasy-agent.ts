/**
 * Fantasy Agent Entity
 * Domain-Driven Design Implementation
 *
 * Represents an agent from the external Fantasy402 system
 * in our internal domain format.
 */

import { DomainEntity, DomainError } from '/Users/nolarose/ff/src/domains/shared/domain-entity';
import type { ExternalAgent } from '../adapters/fantasy402-adapter';
import { v5 as uuidv5 } from 'uuid';

export type AgentType = 'master' | 'sub_agent' | 'retail';
export type AgentStatus = 'active' | 'inactive' | 'suspended';

export class FantasyAgent extends DomainEntity {
  private constructor(
    id: string,
    createdAt: Date,
    updatedAt: Date,
    private readonly externalId: string,
    private readonly customerId: string,
    private readonly office: string,
    private readonly store: string,
    private agentType: AgentType,
    private status: AgentStatus,
    private permissions: {
      canManageLines: boolean;
      canAddAccounts: boolean;
      canDeleteBets: boolean;
      canViewReports: boolean;
      canAccessBilling: boolean;
    },
    private readonly masterAgentId?: string,
    private metadata: Record<string, any> = {}
  ) {
    super(id, createdAt, updatedAt);
  }

  static fromExternalData(data: ExternalAgent): FantasyAgent {
    const now = new Date();

    // Generate deterministic ID based on external ID for idempotent imports
    const id = uuidv5(data.agentID, uuidv5.URL);

    return new FantasyAgent(
      id,
      now,
      now,
      data.agentID,
      data.customerID,
      data.office,
      data.store,
      this.mapExternalAgentType(data.agentType),
      data.active ? 'active' : 'inactive',
      data.permissions,
      data.masterAgentID || undefined,
      data.metadata || {}
    );
  }

  private static generateDeterministicId(externalId: string): string {
    // Use SHA-256 hash of external ID + namespace for deterministic UUID-like ID
    const namespace = 'fantasy-agent';
    const input = `${namespace}:${externalId}`;
    const hash = new Bun.CryptoHasher('sha256');
    hash.update(input);
    const hashBytes = hash.digest();

    // Convert first 16 bytes to UUID format
    const bytes = new Uint8Array(hashBytes.slice(0, 16));
    // Set version (4) and variant bits for UUID v4 format
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

    // Format as UUID string
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
  }

  private static mapExternalAgentType(externalType: string): AgentType {
    const typeMap: Record<string, AgentType> = {
      master: 'master',
      sub: 'sub_agent',
      retail: 'retail',
      agent: 'sub_agent',
    };

    const normalizedType = externalType.toLowerCase();
    const mappedType = typeMap[normalizedType];

    // Always return a valid AgentType
    return mappedType || 'sub_agent';
  }

  // Business methods
  updateStatus(newStatus: AgentStatus): void {
    if (this.status === 'suspended' && newStatus === 'active') {
      // Log reactivation
      this.addMetadata('reactivated_at', new Date().toISOString());
    }

    this.status = newStatus;
    this.markAsModified();
  }

  updatePermissions(permissions: Partial<FantasyAgent['permissions']>): void {
    this.permissions = { ...this.permissions, ...permissions };
    this.markAsModified();
  }

  addMetadata(key: string, value: any): void {
    this.metadata[key] = value;
    this.markAsModified();
  }

  // Getters
  getExternalId(): string {
    return this.externalId;
  }
  getCustomerId(): string {
    return this.customerId;
  }
  getMasterAgentId(): string | undefined {
    return this.masterAgentId;
  }
  getOffice(): string {
    return this.office;
  }
  getStore(): string {
    return this.store;
  }
  getAgentType(): AgentType {
    return this.agentType;
  }
  getStatus(): AgentStatus {
    return this.status;
  }
  getPermissions(): FantasyAgent['permissions'] {
    return { ...this.permissions };
  }
  getMetadata(): Record<string, any> {
    return { ...this.metadata };
  }

  // Business rules
  isActive(): boolean {
    return this.status === 'active';
  }

  isSuspended(): boolean {
    return this.status === 'suspended';
  }

  isMasterAgent(): boolean {
    return this.agentType === 'master';
  }

  isSubAgent(): boolean {
    return this.agentType === 'sub_agent';
  }

  canManageLines(): boolean {
    return this.permissions.canManageLines && this.isActive();
  }

  canAddAccounts(): boolean {
    return this.permissions.canAddAccounts && this.isActive();
  }

  canDeleteBets(): boolean {
    return this.permissions.canDeleteBets && this.isActive();
  }

  canViewReports(): boolean {
    return this.permissions.canViewReports && this.isActive();
  }

  canAccessBilling(): boolean {
    return this.permissions.canAccessBilling && this.isActive();
  }

  hasPermission(permission: keyof FantasyAgent['permissions']): boolean {
    return this.permissions[permission] && this.isActive();
  }

  getFullName(): string {
    return `${this.office} - ${this.store}`;
  }

  getHierarchyLevel(): number {
    if (this.isMasterAgent()) return 1;
    if (this.isSubAgent()) return 2;
    return 3; // Retail
  }

  canManageAgent(otherAgent: FantasyAgent): boolean {
    if (!this.canManageLines()) return false;
    if (this.isMasterAgent()) return true;
    if (this.isSubAgent() && otherAgent.getAgentType() === 'retail') return true;
    return false;
  }

  toJSON(): any {
    return {
      id: this.getId(),
      externalId: this.externalId,
      customerId: this.customerId,
      masterAgentId: this.masterAgentId,
      office: this.office,
      store: this.store,
      agentType: this.agentType,
      status: this.status,
      permissions: this.permissions,
      metadata: this.metadata,
      createdAt: this.getCreatedAt().toISOString(),
      updatedAt: this.getUpdatedAt().toISOString(),
    };
  }
}
