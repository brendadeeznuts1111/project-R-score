/**
 * Fire22 Dashboard Team Consultation Service
 * Coordinates multi-team consultations for R2 Error Monitoring + Customer Modal Integration
 * Integrates with Design Team, Cloudflare Team, and Special Operations
 */

import { SQL } from 'bun';
import { DesignTeamIntegrationService, DesignReviewRequest } from './design-team-integration';
import { TaskService } from './tasks-enhanced';
import { TaskEventService } from './task-events';

export interface ConsultationRequest {
  projectId: string;
  projectName: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requesterId: string;
  requiredTeams: ConsultationTeam[];
  deadline?: string;
  attachments?: ConsultationAttachment[];
  securityLevel?: 'PUBLIC' | 'CONFIDENTIAL' | 'TOP_SECRET';
}

export interface ConsultationTeam {
  team: 'design' | 'cloudflare' | 'special-ops' | 'infrastructure' | 'ci';
  reviewType: string;
  specificMembers?: string[];
  requirements: string[];
  deliverables: string[];
}

export interface ConsultationAttachment {
  type: 'design_mockup' | 'architecture_diagram' | 'security_doc' | 'api_spec' | 'error_flow';
  title: string;
  url?: string;
  content?: string;
  securityLevel?: 'PUBLIC' | 'CONFIDENTIAL' | 'TOP_SECRET';
}

export interface ConsultationStatus {
  projectId: string;
  overallStatus: 'pending' | 'in_progress' | 'partial_approval' | 'approved' | 'rejected';
  teamStatuses: Map<string, TeamConsultationStatus>;
  createdAt: string;
  updatedAt: string;
  approvalCount: number;
  totalTeams: number;
}

export interface TeamConsultationStatus {
  team: string;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'needs_clarification';
  reviewer?: string;
  comments?: string[];
  approvedAt?: string;
  requirements: string[];
  deliverables: string[];
}

export class TeamConsultationService {
  private db: SQL;
  private designService: DesignTeamIntegrationService;
  private taskService: TaskService;
  private eventService: TaskEventService;

  // Team contact information
  private readonly TEAM_CONTACTS = {
    design: {
      name: 'Design Team',
      lead: 'isabella-martinez',
      members: ['isabella-martinez', 'ethan-cooper'],
      emails: ['design@fire22.com'],
      slack: '#design-team',
      officeHours: 'Tuesdays & Thursdays 2-4 PM',
    },
    cloudflare: {
      name: 'Cloudflare Team',
      lead: 'cloudflare-team',
      emails: [
        'cloudflare-team@fire22.ag',
        'cloudflare-workers@fire22.ag',
        'cloudflare-r2@fire22.ag',
        'wrangler-support@fire22.ag',
        'edge-team@fire22.ag',
      ],
    },
    'special-ops': {
      name: 'Special Operations',
      lead: 'special-ops-team',
      department: 'technology',
      accessLevel: 'TOP_SECRET',
      permissions: ['read', 'write', 'delete', 'audit', 'backup'],
    },
    infrastructure: {
      name: 'Infrastructure Team',
      emails: ['infrastructure@fire22.ag', 'platform-team@fire22.ag', 'head@technology.fire22'],
    },
    ci: {
      name: 'CI Team',
      emails: [
        'ci@fire22.ag',
        'ci-cd@fire22.ag',
        'github-actions@fire22.ag',
        'build-team@fire22.ag',
        'release-automation@fire22.ag',
      ],
    },
  };

  constructor(db: SQL) {
    this.db = db;
    this.designService = new DesignTeamIntegrationService(db);
    this.taskService = new TaskService(db);
    this.eventService = new TaskEventService(db);
    this.initializeDatabase();
  }

  /**
   * Initialize database tables for team consultations
   */
  private async initializeDatabase() {
    try {
      // Consultations table
      await this.db`
        CREATE TABLE IF NOT EXISTS consultations (
          id TEXT PRIMARY KEY,
          project_id TEXT UNIQUE NOT NULL,
          project_name TEXT NOT NULL,
          description TEXT NOT NULL,
          priority TEXT NOT NULL,
          requester_id TEXT NOT NULL,
          security_level TEXT DEFAULT 'PUBLIC',
          status TEXT DEFAULT 'pending',
          deadline TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Team consultation statuses table
      await this.db`
        CREATE TABLE IF NOT EXISTS team_consultation_statuses (
          id TEXT PRIMARY KEY,
          consultation_id TEXT NOT NULL,
          team TEXT NOT NULL,
          review_type TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          reviewer TEXT,
          comments TEXT,
          approved_at TEXT,
          requirements TEXT,
          deliverables TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (consultation_id) REFERENCES consultations(id)
        )
      `;

      // Consultation attachments table
      await this.db`
        CREATE TABLE IF NOT EXISTS consultation_attachments (
          id TEXT PRIMARY KEY,
          consultation_id TEXT NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          url TEXT,
          content TEXT,
          security_level TEXT DEFAULT 'PUBLIC',
          uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (consultation_id) REFERENCES consultations(id)
        )
      `;

      console.log('✅ Team consultation database tables initialized');
    } catch (error) {
      console.error('❌ Failed to initialize consultation database:', error);
      throw error;
    }
  }

  /**
   * Create a new team consultation request
   */
  async createConsultation(
    request: ConsultationRequest
  ): Promise<{ success: boolean; data?: ConsultationStatus; error?: string }> {
    try {
      const consultationId = `consultation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log(`🤝 Creating team consultation: ${request.projectName}`);

      // Insert main consultation record
      await this.db`
        INSERT INTO consultations (id, project_id, project_name, description, priority, requester_id, security_level, deadline)
        VALUES (${consultationId}, ${request.projectId}, ${request.projectName}, ${request.description}, 
                ${request.priority}, ${request.requesterId}, ${request.securityLevel || 'PUBLIC'}, ${request.deadline})
      `;

      // Insert team consultation statuses
      for (const team of request.requiredTeams) {
        const teamStatusId = `team_${consultationId}_${team.team}`;
        await this.db`
          INSERT INTO team_consultation_statuses (id, consultation_id, team, review_type, requirements, deliverables)
          VALUES (${teamStatusId}, ${consultationId}, ${team.team}, ${team.reviewType}, 
                  ${JSON.stringify(team.requirements)}, ${JSON.stringify(team.deliverables)})
        `;
      }

      // Insert attachments if provided
      if (request.attachments) {
        for (let i = 0; i < request.attachments.length; i++) {
          const attachment = request.attachments[i];
          const attachmentId = `attachment_${consultationId}_${Date.now()}_${i}`;
          await this.db`
            INSERT INTO consultation_attachments (id, consultation_id, type, title, url, content, security_level)
            VALUES (${attachmentId}, ${consultationId}, ${attachment.type}, ${attachment.title}, 
                    ${attachment.url}, ${attachment.content}, ${attachment.securityLevel || 'PUBLIC'})
          `;
        }
      }

      // Create tasks for each team
      await this.createTeamConsultationTasks(consultationId, request);

      // Send notifications to teams
      await this.notifyTeams(consultationId, request);

      // Get consultation status
      const status = await this.getConsultationStatus(request.projectId);

      console.log(`✅ Team consultation created: ${consultationId}`);
      return { success: true, data: status };
    } catch (error) {
      console.error(`❌ Failed to create consultation for ${request.projectName}:`, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Create tasks for each team involved in the consultation
   */
  private async createTeamConsultationTasks(consultationId: string, request: ConsultationRequest) {
    for (const team of request.requiredTeams) {
      const teamInfo = this.TEAM_CONTACTS[team.team];
      if (!teamInfo) continue;

      let assigneeId = teamInfo.lead;
      if (team.specificMembers && team.specificMembers.length > 0) {
        assigneeId = team.specificMembers[0];
      }

      const taskTitle = `${teamInfo.name} Consultation: ${request.projectName}`;
      const taskDescription = `
${request.description}

**Review Type**: ${team.reviewType}
**Priority**: ${request.priority}
**Security Level**: ${request.securityLevel || 'PUBLIC'}

**Requirements**:
${team.requirements.map(req => `- ${req}`).join('\n')}

**Expected Deliverables**:
${team.deliverables.map(del => `- ${del}`).join('\n')}

**Project ID**: ${request.projectId}
**Consultation ID**: ${consultationId}
      `.trim();

      await this.taskService.createTask({
        title: taskTitle,
        description: taskDescription,
        priority: request.priority,
        status: 'planning',
        progress: 0,
        departmentId: team.team,
        assigneeId,
        reporterId: request.requesterId,
        dueDate: request.deadline,
        tags: ['consultation', 'team-coordination', team.reviewType, request.projectId],
      });
    }
  }

  /**
   * Send notifications to all required teams
   */
  private async notifyTeams(consultationId: string, request: ConsultationRequest) {
    for (const team of request.requiredTeams) {
      const teamInfo = this.TEAM_CONTACTS[team.team];
      if (!teamInfo) continue;

      const notification = {
        consultationId,
        projectId: request.projectId,
        projectName: request.projectName,
        team: team.team,
        reviewType: team.reviewType,
        priority: request.priority,
        securityLevel: request.securityLevel,
        deadline: request.deadline,
        requirements: team.requirements,
        deliverables: team.deliverables,
        teamContacts: teamInfo,
      };

      // Log for team notification system pickup
      console.log(
        `TEAM_CONSULTATION_REQUEST:${team.team.toUpperCase()}:`,
        JSON.stringify(notification)
      );
    }
  }

  /**
   * Get consultation status
   */
  async getConsultationStatus(projectId: string): Promise<ConsultationStatus | null> {
    try {
      // Get main consultation
      const consultationResult = await this.db`
        SELECT * FROM consultations WHERE project_id = ${projectId}
      `;

      const consultation = consultationResult[0] as any;

      if (!consultation) {
        return null;
      }

      // Get team statuses
      const teamStatuses = (await this.db`
        SELECT * FROM team_consultation_statuses WHERE consultation_id = ${consultation.id}
      `) as any[];

      const statusMap = new Map<string, TeamConsultationStatus>();
      let approvalCount = 0;

      for (const teamStatus of teamStatuses) {
        const status: TeamConsultationStatus = {
          team: teamStatus.team,
          status: teamStatus.status,
          reviewer: teamStatus.reviewer,
          comments: teamStatus.comments ? JSON.parse(teamStatus.comments) : [],
          approvedAt: teamStatus.approved_at,
          requirements: JSON.parse(teamStatus.requirements || '[]'),
          deliverables: JSON.parse(teamStatus.deliverables || '[]'),
        };

        statusMap.set(teamStatus.team, status);

        if (status.status === 'approved') {
          approvalCount++;
        }
      }

      // Determine overall status
      let overallStatus: ConsultationStatus['overallStatus'] = 'pending';
      const totalTeams = teamStatuses.length;

      if (approvalCount === totalTeams) {
        overallStatus = 'approved';
      } else if (approvalCount > 0) {
        overallStatus = 'partial_approval';
      } else if (teamStatuses.some(ts => ts.status === 'reviewing')) {
        overallStatus = 'in_progress';
      } else if (teamStatuses.some(ts => ts.status === 'rejected')) {
        overallStatus = 'rejected';
      }

      return {
        projectId: consultation.project_id,
        overallStatus,
        teamStatuses: statusMap,
        createdAt: consultation.created_at,
        updatedAt: consultation.updated_at,
        approvalCount,
        totalTeams,
      };
    } catch (error) {
      console.error(`❌ Failed to get consultation status for ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Update team consultation status
   */
  async updateTeamStatus(
    projectId: string,
    team: string,
    status: TeamConsultationStatus['status'],
    reviewer?: string,
    comments?: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const approvedAt = status === 'approved' ? new Date().toISOString() : null;
      const commentsJson = comments ? JSON.stringify(comments) : null;

      await this.db`
        UPDATE team_consultation_statuses 
        SET status = ${status}, reviewer = ${reviewer}, comments = ${commentsJson}, 
            approved_at = ${approvedAt}, updated_at = CURRENT_TIMESTAMP
        WHERE consultation_id IN (SELECT id FROM consultations WHERE project_id = ${projectId}) AND team = ${team}
      `;

      // Update overall consultation timestamp
      await this.db`
        UPDATE consultations SET updated_at = CURRENT_TIMESTAMP WHERE project_id = ${projectId}
      `;

      console.log(`✅ Updated consultation status for ${team} on project ${projectId}: ${status}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to update team status for ${projectId}:`, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Get all pending consultations
   */
  async getPendingConsultations(): Promise<ConsultationStatus[]> {
    try {
      const consultations = (await this.db`
        SELECT project_id FROM consultations WHERE status IN ('pending', 'in_progress')
      `) as any[];

      const results: ConsultationStatus[] = [];
      for (const consultation of consultations) {
        const status = await this.getConsultationStatus(consultation.project_id);
        if (status) {
          results.push(status);
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Failed to get pending consultations:', error);
      return [];
    }
  }
}
