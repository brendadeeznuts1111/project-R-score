// duoplus/team-manager.ts
import { DUOPLUS_CONFIG, TeamMember } from './config.js';
import axios from 'axios';

export class DuoPlusTeamManager {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Create Team Invitation Link
   * From Update Log: "Team invitation link mechanism"
   */
  async inviteTeamMember(email: string, role: 'admin' | 'member' | 'viewer', options?: {
    autoJoin?: boolean; // From Update Log: "Automatically added to team"
    expiresAt?: Date;
    permissions?: string[];
  }): Promise<{
    invitationLink: string;
    invitationId: string;
    expiresAt: Date;
  }> {
    try {
      const response = await axios.post(
        `${DUOPLUS_CONFIG.baseUrl}${DUOPLUS_CONFIG.endpoints.teams}/invitations`,
        {
          email,
          role,
          auto_join: options?.autoJoin ?? true,
          expires_at: options?.expiresAt?.toISOString(),
          permissions: options?.permissions || []
        },
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      return {
        invitationLink: response.data.invitation_link,
        invitationId: response.data.invitation_id,
        expiresAt: new Date(response.data.expires_at)
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DuoPlus API Error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error(`Team operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List Team Members
   */
  async listTeamMembers(filters?: {
    role?: 'admin' | 'member' | 'viewer';
    status?: 'active' | 'inactive' | 'pending';
    limit?: number;
  }): Promise<TeamMember[]> {
    try {
      const response = await axios.get(
        `${DUOPLUS_CONFIG.baseUrl}${DUOPLUS_CONFIG.endpoints.teams}/members`,
        {
          params: filters,
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      return response.data.members.map((member: any) => ({
        id: member.member_id,
        email: member.email,
        role: member.role,
        joinedAt: new Date(member.joined_at)
      }));
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DuoPlus API Error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error(`Team operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Assign Phone to Team Member
   */
  async assignPhone(phoneId: string, memberId: string): Promise<void> {
    try {
      await axios.post(
        `${DUOPLUS_CONFIG.baseUrl}/phones/${phoneId}/assign`,
        { member_id: memberId },
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DuoPlus API Error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error(`Team operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Unassign Phone from Team Member
   */
  async unassignPhone(phoneId: string): Promise<void> {
    try {
      await axios.post(
        `${DUOPLUS_CONFIG.baseUrl}/phones/${phoneId}/unassign`,
        {},
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DuoPlus API Error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error(`Team operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update Team Member Role
   */
  async updateMemberRole(memberId: string, newRole: 'admin' | 'member' | 'viewer'): Promise<void> {
    try {
      await axios.put(
        `${DUOPLUS_CONFIG.baseUrl}${DUOPLUS_CONFIG.endpoints.teams}/members/${memberId}/role`,
        { role: newRole },
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DuoPlus API Error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error(`Team operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Remove Team Member
   */
  async removeTeamMember(memberId: string): Promise<void> {
    try {
      await axios.delete(
        `${DUOPLUS_CONFIG.baseUrl}${DUOPLUS_CONFIG.endpoints.teams}/members/${memberId}`,
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DuoPlus API Error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error(`Team operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get Team Statistics
   */
  async getTeamStats(): Promise<{
    totalMembers: number;
    activeMembers: number;
    totalPhones: number;
    assignedPhones: number;
    activeWorkflows: number;
    monthlyCost: number;
  }> {
    try {
      const response = await axios.get(
        `${DUOPLUS_CONFIG.baseUrl}${DUOPLUS_CONFIG.endpoints.teams}/stats`,
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      return {
        totalMembers: response.data.total_members,
        activeMembers: response.data.active_members,
        totalPhones: response.data.total_phones,
        assignedPhones: response.data.assigned_phones,
        activeWorkflows: response.data.active_workflows,
        monthlyCost: response.data.monthly_cost
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DuoPlus API Error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error(`Team operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get Team Activity Log
   */
  async getTeamActivity(filters?: {
    memberId?: string;
    action?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  }): Promise<Array<{
    id: string;
    memberId: string;
    memberEmail: string;
    action: string;
    resource: string;
    timestamp: Date;
    details?: any;
  }>> {
    try {
      const response = await axios.get(
        `${DUOPLUS_CONFIG.baseUrl}${DUOPLUS_CONFIG.endpoints.teams}/activity`,
        {
          params: {
            member_id: filters?.memberId,
            action: filters?.action,
            from: filters?.fromDate?.toISOString(),
            to: filters?.toDate?.toISOString(),
            limit: filters?.limit || 100
          },
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      return response.data.activities.map((activity: any) => ({
        id: activity.activity_id,
        memberId: activity.member_id,
        memberEmail: activity.member_email,
        action: activity.action,
        resource: activity.resource,
        timestamp: new Date(activity.timestamp),
        details: activity.details
      }));
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DuoPlus API Error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error(`Team operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Set Team Permissions
   */
  async setTeamPermissions(permissions: {
    canCreatePhones: boolean;
    canManageBilling: boolean;
    canInviteMembers: boolean;
    canViewReports: boolean;
    canExecuteRPA: boolean;
    canManageFiles: boolean;
  }): Promise<void> {
    try {
      await axios.put(
        `${DUOPLUS_CONFIG.baseUrl}${DUOPLUS_CONFIG.endpoints.teams}/permissions`,
        permissions,
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DuoPlus API Error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error(`Team operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get Team Billing Information
   */
  async getTeamBilling(): Promise<{
    plan: 'basic' | 'professional' | 'enterprise';
    monthlyCost: number;
    nextBillingDate: Date;
    usage: {
      phones: number;
      numbers: number;
      storage: number; // GB
      rpaTasks: number;
    };
    limits: {
      maxPhones: number;
      maxNumbers: number;
      maxStorage: number;
      maxRpaTasks: number;
    };
  }> {
    try {
      const response = await axios.get(
        `${DUOPLUS_CONFIG.baseUrl}${DUOPLUS_CONFIG.endpoints.teams}/billing`,
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      return {
        plan: response.data.plan,
        monthlyCost: response.data.monthly_cost,
        nextBillingDate: new Date(response.data.next_billing_date),
        usage: response.data.usage,
        limits: response.data.limits
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DuoPlus API Error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error(`Team operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Cancel Team Invitation
   */
  async cancelInvitation(invitationId: string): Promise<void> {
    try {
      await axios.delete(
        `${DUOPLUS_CONFIG.baseUrl}${DUOPLUS_CONFIG.endpoints.teams}/invitations/${invitationId}`,
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DuoPlus API Error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error(`Team operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List Pending Invitations
   */
  async listPendingInvitations(): Promise<Array<{
    invitationId: string;
    email: string;
    role: string;
    createdAt: Date;
    expiresAt: Date;
  }>> {
    try {
      const response = await axios.get(
        `${DUOPLUS_CONFIG.baseUrl}${DUOPLUS_CONFIG.endpoints.teams}/invitations`,
        { 
          headers: { 
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      return response.data.invitations.map((inv: any) => ({
        invitationId: inv.invitation_id,
        email: inv.email,
        role: inv.role,
        createdAt: new Date(inv.created_at),
        expiresAt: new Date(inv.expires_at)
      }));
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DuoPlus API Error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error(`Team operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
