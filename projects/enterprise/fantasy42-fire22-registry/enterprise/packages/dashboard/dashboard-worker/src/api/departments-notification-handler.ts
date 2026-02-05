/**
 * Fire22 Department Heads Notification Handler
 * Ensures department heads receive and acknowledge critical updates
 */

export interface DepartmentHeadNotification {
  id: string;
  timestamp: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: 'assignment' | 'approval_required' | 'deadline' | 'status_change';
  department?: string;
  recipients: string[];
  subject: string;
  message: string;
  acknowledgments: Record<string, boolean>;
  deadline?: string;
  actions_required: string[];
}

export interface DepartmentStatus {
  department: string;
  head: string;
  head_email: string;
  comms_lead: string | null;
  task_coordinator: string | null;
  status: 'ready_for_review' | 'approved' | 'needs_revision' | 'blocked';
  specialist_count: number;
  l_keys: string[];
  last_updated: string;
}

export class DepartmentNotificationHandler {
  private static readonly DEPARTMENT_HEADS = {
    sportsbook_operations: {
      head: 'Marcus Rodriguez',
      email: 'marcus.rodriguez@sportsbook.fire22',
      comms_lead: 'Linda Chen',
      task_coordinator: 'Robert Taylor',
    },
    live_casino_operations: {
      head: 'Jennifer Wilson',
      email: 'jennifer.wilson@casino.fire22',
      comms_lead: null,
      task_coordinator: null,
    },
    technology_enhancement: {
      head: 'Mike Hunt',
      email: 'mike.hunt@technology.fire22',
      comms_lead: null,
      task_coordinator: null,
    },
    finance_cashier_operations: {
      head: 'Michael Chen',
      email: 'michael.chen@finance.fire22',
      comms_lead: 'Emily Rodriguez',
      task_coordinator: null,
    },
  };

  /**
   * Get current Mike Hunt assignment notification
   */
  static getMikeHuntAssignmentNotification(): DepartmentHeadNotification {
    const notification: DepartmentHeadNotification = {
      id: 'mike-hunt-tech-head-2025-08-28',
      timestamp: '2025-08-28T20:30:00Z',
      priority: 'CRITICAL',
      type: 'assignment',
      department: 'technology_enhancement',
      recipients: Object.values(this.DEPARTMENT_HEADS).map(dept => dept.email),
      subject: '🚨 URGENT: Mike Hunt Assigned Technology Head - Action Required by Tuesday',
      message: `
CRITICAL ASSIGNMENT NOTIFICATION

Mike Hunt has been assigned as Head of Technology Department, unblocking the critical path for all 65 specialists across 4 departments.

REQUIRED ACTIONS THIS WEEK:
1. ALL DEPARTMENT HEADS: Review your definition documents by Tuesday EOD
2. APPROVE your specialist team structures and L-key assignments  
3. IDENTIFY remaining TBD positions (5 total needed)
4. RESPOND with approval status by Tuesday 5:00 PM

FAILURE TO RESPOND = IMPLEMENTATION DELAY

Access your documents:
- RSS Feed: GET /api/departments/stream
- Changelog: ./CHANGELOG-DEPARTMENTS.md
- Definitions: ./wiki/departments/[your-department].md

Critical Timeline: Day 1-2 approvals → Day 3-4 TBD filling → Day 5 implementation kickoff
      `.trim(),
      acknowledgments: {
        'marcus.rodriguez@sportsbook.fire22': false,
        'jennifer.wilson@casino.fire22': false,
        'mike.hunt@technology.fire22': false,
        'michael.chen@finance.fire22': false,
      },
      deadline: '2025-08-30T17:00:00Z',
      actions_required: [
        'Review department definition document',
        'Approve specialist team structure',
        'Identify remaining TBD positions',
        'Submit approval response by Tuesday EOD',
      ],
    };

    return notification;
  }

  /**
   * Get current department status for all departments
   */
  static getDepartmentStatusAll(): DepartmentStatus[] {
    return [
      {
        department: 'sportsbook_operations',
        head: 'Marcus Rodriguez',
        head_email: 'marcus.rodriguez@sportsbook.fire22',
        comms_lead: 'Linda Chen',
        task_coordinator: 'Robert Taylor',
        status: 'ready_for_review',
        specialist_count: 18,
        l_keys: ['L-12', 'L-15', 'L-16', 'L-85', 'L-1390'],
        last_updated: '2025-08-28T20:00:00Z',
      },
      {
        department: 'live_casino_operations',
        head: 'Jennifer Wilson',
        head_email: 'jennifer.wilson@casino.fire22',
        comms_lead: null,
        task_coordinator: null,
        status: 'ready_for_review',
        specialist_count: 15,
        l_keys: ['NEW-L-KEYS-NEEDED'],
        last_updated: '2025-08-28T20:00:00Z',
      },
      {
        department: 'technology_enhancement',
        head: 'Mike Hunt',
        head_email: 'mike.hunt@technology.fire22',
        comms_lead: null,
        task_coordinator: null,
        status: 'ready_for_review',
        specialist_count: 16,
        l_keys: ['L-407', 'L-449', 'L-792', 'L-880', 'L-1351'],
        last_updated: '2025-08-28T20:30:00Z',
      },
      {
        department: 'finance_cashier_operations',
        head: 'Michael Chen',
        head_email: 'michael.chen@finance.fire22',
        comms_lead: 'Emily Rodriguez',
        task_coordinator: null,
        status: 'ready_for_review',
        specialist_count: 16,
        l_keys: ['L-69', 'L-187', 'L-202', 'L-206', 'L-627', 'L-628'],
        last_updated: '2025-08-28T20:00:00Z',
      },
    ];
  }

  /**
   * Generate SSE data for department stream
   */
  static generateSSEUpdate(): string {
    const notification = this.getMikeHuntAssignmentNotification();
    const departments = this.getDepartmentStatusAll();

    const update = {
      type: 'critical_notification',
      timestamp: new Date().toISOString(),
      notification,
      departments,
      metrics: {
        department_heads_assigned: '4/4 (100%)',
        communications_leads_assigned: '2/4 (50%)',
        task_coordinators_assigned: '1/4 (25%)',
        approvals_pending: '4/4 (ALL)',
        critical_path_status: 'ON_TRACK',
        implementation_ready: 'PENDING_APPROVALS',
      },
      next_deadline: '2025-08-30T17:00:00Z',
      rss_feeds: {
        changelog: './CHANGELOG-DEPARTMENTS.md',
        notifications: './src/notifications/department-updates.json',
        live_stream: '/api/departments/stream',
      },
    };

    return `data: ${JSON.stringify(update)}\n\n`;
  }

  /**
   * Check if all department heads have acknowledged
   */
  static getAllAcknowledgmentStatus(): { complete: boolean; pending: string[] } {
    const notification = this.getMikeHuntAssignmentNotification();
    const pending = Object.entries(notification.acknowledgments)
      .filter(([email, acked]) => !acked)
      .map(([email]) => email);

    return {
      complete: pending.length === 0,
      pending,
    };
  }
}

/**
 * RSS Feed configuration for department heads
 */
export const DEPARTMENT_RSS_CONFIG = {
  title: 'Fire22 Department Updates',
  description: 'Real-time updates for department heads and leadership team',
  feed_url: '/api/departments/stream',
  site_url: 'https://fire22.workers.dev',
  language: 'en',
  categories: ['departments', 'management', 'implementation'],
  managingEditor: 'platform.development@fire22.ag',
  webMaster: 'technical@fire22.ag',
  ttl: 5, // 5 minutes
  custom_namespaces: {
    fire22: 'https://fire22.ag/xmlns/departments',
  },
} as const;
