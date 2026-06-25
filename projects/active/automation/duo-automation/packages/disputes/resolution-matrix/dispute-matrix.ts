// src/disputes/dispute-matrix.ts
import { Dispute, DisputeStatus } from '../deeplinks/deeplink-generator';

export interface DisputeMatrixRow {
  status: DisputeStatus;
  icon: string;
  color: string;
  customerActions: string[];
  merchantActions: string[];
  systemActions: string[];
  timeline: string;
  deepLink: string;
  description: string;
  nextSteps: string[];
}

export interface DisputeAction {
  id: string;
  title: string;
  description: string;
  deepLink: string;
  icon: string;
  requiresAuth: boolean;
  priority: 'high' | 'medium' | 'low';
}

export class DisputeMatrix {
  
  static getMatrixData(disputeId: string): DisputeMatrixRow[] {
    return [
      {
        status: DisputeStatus.SUBMITTED,
        icon: '🔴',
        color: '#FF4444',
        description: 'Dispute received and initial validation completed',
        customerActions: [
          'Upload evidence (photos, receipts)',
          'Describe the issue in detail',
          'Choose preferred resolution type',
          'Set communication preferences'
        ],
        merchantActions: [
          'Notified via email and app',
          '48 hours to respond',
          'Review dispute details',
          'Prepare initial response'
        ],
        systemActions: [
          'Verify dispute eligibility',
          'Freeze disputed funds',
          'Create secure chat channel',
          'Generate tracking number',
          'Send notifications to all parties'
        ],
        timeline: '0-2 hours',
        deepLink: `duoplus://dispute/${disputeId}/submitted`,
        nextSteps: [
          'Customer uploads evidence',
          'Merchant receives notification',
          'System monitors for response'
        ]
      },
      {
        status: DisputeStatus.MERCHANT_REVIEW,
        icon: '🟡',
        color: '#FFAA44',
        description: 'Merchant is reviewing and responding to the dispute',
        customerActions: [
          'Add more evidence if needed',
          'Send messages to merchant',
          'Request escalation if needed',
          'Review merchant responses'
        ],
        merchantActions: [
          'Accept or deny fault',
          'Upload counter-evidence',
          'Propose solution (refund, replacement)',
          'Respond to customer messages'
        ],
        systemActions: [
          'Moderate chat communications',
          'Track response deadlines',
          'Escalate if no response within 48h',
          'Log all communications',
          'Send reminder notifications'
        ],
        timeline: '2-48 hours',
        deepLink: `duoplus://dispute/${disputeId}/merchant-review`,
        nextSteps: [
          'Merchant responds within 48 hours',
          'Customer and merchant negotiate',
          'System monitors for resolution'
        ]
      },
      {
        status: DisputeStatus.UNDER_INVESTIGATION,
        icon: '🔵',
        color: '#4444FF',
        description: 'DuoPlus team is investigating with AI assistance',
        customerActions: [
          'Cooperate with investigation requests',
          'Respond to additional questions',
          'Provide requested documentation',
          'Check status updates regularly'
        ],
        merchantActions: [
          'Provide transaction logs',
          'Submit proof of delivery/service',
          'Respond to investigator questions',
          'Maintain professional communication'
        ],
        systemActions: [
          'AI-powered evidence analysis',
          'Manual review by dispute specialists',
          'Risk assessment and fraud detection',
          'External verification (bank, etc.)',
          'Prepare recommendation report'
        ],
        timeline: '1-5 days',
        deepLink: `duoplus://dispute/${disputeId}/investigation`,
        nextSteps: [
          'Evidence analysis completed',
          'Risk assessment performed',
          'Recommendation prepared'
        ]
      },
      {
        status: DisputeStatus.VENMO_ESCALATION,
        icon: '🟣',
        color: '#AA44FF',
        description: 'Dispute escalated to Venmo for final resolution',
        customerActions: [
          'Wait for Venmo decision',
          'Check Venmo case status',
          'Provide additional info if requested',
          'Follow Venmo\'s communication'
        ],
        merchantActions: [
          'Cooperate with Venmo investigation',
          'Submit evidence to Venmo portal',
          'Respond to Venmo requests promptly',
          'Follow Venmo\'s guidelines'
        ],
        systemActions: [
          'Forward all evidence to Venmo',
          'Monitor Venmo case status',
          'Sync Venmo decisions with system',
          'Handle communications bridge',
          'Update all parties on progress'
        ],
        timeline: '5-10 days',
        deepLink: `duoplus://dispute/${disputeId}/venmo-case`,
        nextSteps: [
          'Venmo reviews all evidence',
          'Final decision made by Venmo',
          'Resolution implemented'
        ]
      },
      {
        status: DisputeStatus.RESOLVED_REFUND,
        icon: '✅',
        color: '#44FF44',
        description: 'Dispute resolved in customer\'s favor with refund',
        customerActions: [
          'Receive refund to original payment method',
          'Rate resolution experience',
          'Download receipt for records',
          'Close dispute or leave feedback'
        ],
        merchantActions: [
          'Accept decision',
          'Pay refund processing fee',
          'Update internal processes',
          'Review what went wrong'
        ],
        systemActions: [
          'Process refund immediately',
          'Update financial ledgers',
          'Generate completion report',
          'Update merchant reputation',
          'Send satisfaction survey'
        ],
        timeline: 'Instant',
        deepLink: `duoplus://dispute/${disputeId}/resolved/refund`,
        nextSteps: [
          'Refund processed',
          'Case closed',
          'Feedback collected'
        ]
      },
      {
        status: DisputeStatus.RESOLVED_DENIED,
        icon: '❌',
        color: '#FF4444',
        description: 'Dispute resolved in merchant\'s favor',
        customerActions: [
          'Review decision explanation',
          'File appeal if eligible',
          'Leave constructive feedback',
          'Contact support with questions'
        ],
        merchantActions: [
          'Business as usual',
          'No penalty applied',
          'Funds released from hold',
          'Consider customer feedback'
        ],
        systemActions: [
          'Close dispute case',
          'Release held funds to merchant',
          'Log decision for compliance',
          'Update dispute statistics',
          'Send final notifications'
        ],
        timeline: 'Instant',
        deepLink: `duoplus://dispute/${disputeId}/resolved/denied`,
        nextSteps: [
          'Case closed',
          'Funds released',
          'Records updated'
        ]
      },
      {
        status: DisputeStatus.SUSPENDED_FRAUD,
        icon: '⚠️',
        color: '#FF8800',
        description: 'Dispute suspended due to suspected fraud',
        customerActions: [
          'Verify identity with documentation',
          'Submit additional proof',
          'Cooperate with investigation',
          'Contact support for guidance'
        ],
        merchantActions: [
          'Not applicable',
          'System handles investigation'
        ],
        systemActions: [
          'Freeze all related accounts',
          'Notify law enforcement if needed',
          'Conduct full fraud investigation',
          'Preserve all evidence',
          'Legal review initiated'
        ],
        timeline: '14-30 days',
        deepLink: `duoplus://dispute/${disputeId}/suspected-fraud`,
        nextSteps: [
          'Identity verification required',
          'Full investigation conducted',
          'Legal review completed'
        ]
      }
    ];
  }
  
  static getCurrentStatusRow(dispute: Dispute): DisputeMatrixRow | null {
    const matrix = this.getMatrixData(dispute.id);
    return matrix.find(row => row.status === dispute.status) || null;
  }
  
  static getNextStatusRow(dispute: Dispute): DisputeMatrixRow | null {
    const matrix = this.getMatrixData(dispute.id);
    const currentIndex = matrix.findIndex(row => row.status === dispute.status);
    return currentIndex < matrix.length - 1 ? matrix[currentIndex + 1] : null;
  }
  
  static getQuickActions(dispute: Dispute): DisputeAction[] {
    const baseActions: DisputeAction[] = [
      {
        id: 'upload-evidence',
        title: 'Upload Evidence',
        description: 'Add photos, receipts, or documents',
        deepLink: `duoplus://dispute/${dispute.id}/upload-evidence`,
        icon: '📎',
        requiresAuth: true,
        priority: 'high'
      },
      {
        id: 'message-merchant',
        title: 'Message Merchant',
        description: 'Secure chat with the merchant',
        deepLink: `duoplus://dispute/${dispute.id}/chat`,
        icon: '💬',
        requiresAuth: true,
        priority: 'medium'
      },
      {
        id: 'view-details',
        title: 'View Full Details',
        description: 'Complete dispute information',
        deepLink: `duoplus://dispute/${dispute.id}/details`,
        icon: '📋',
        requiresAuth: true,
        priority: 'low'
      },
      {
        id: 'download-report',
        title: 'Download Report',
        description: 'PDF with all dispute details',
        deepLink: `duoplus://dispute/${dispute.id}/report`,
        icon: '📄',
        requiresAuth: true,
        priority: 'low'
      }
    ];
    
    // Add status-specific actions
    switch (dispute.status) {
      case DisputeStatus.SUBMITTED:
        baseActions.unshift({
          id: 'escalate',
          title: 'Request Escalation',
          description: 'Escalate to investigation team',
          deepLink: `duoplus://dispute/${dispute.id}/escalate`,
          icon: '⚠️',
          requiresAuth: true,
          priority: 'medium'
        });
        break;
        
      case DisputeStatus.MERCHANT_REVIEW:
        baseActions.unshift({
          id: 'add-evidence',
          title: 'Add More Evidence',
          description: 'Support your claim with more proof',
          deepLink: `duoplus://dispute/${dispute.id}/add-evidence`,
          icon: '📸',
          requiresAuth: true,
          priority: 'high'
        });
        break;
        
      case DisputeStatus.UNDER_INVESTIGATION:
        baseActions.unshift({
          id: 'check-status',
          title: 'Check Investigation Status',
          description: 'Latest updates from investigation team',
          deepLink: `duoplus://dispute/${dispute.id}/status`,
          icon: '🔍',
          requiresAuth: true,
          priority: 'medium'
        });
        break;
        
      case DisputeStatus.VENMO_ESCALATION:
        baseActions.unshift({
          id: 'venmo-status',
          title: 'Check Venmo Case',
          description: 'View Venmo dispute status',
          deepLink: `duoplus://dispute/${dispute.id}/venmo-status`,
          icon: '⚖️',
          requiresAuth: true,
          priority: 'high'
        });
        break;
        
      case DisputeStatus.RESOLVED_DENIED:
        baseActions.unshift({
          id: 'appeal',
          title: 'File Appeal',
          description: 'Appeal the decision if eligible',
          deepLink: `duoplus://dispute/${dispute.id}/appeal`,
          icon: '📤',
          requiresAuth: true,
          priority: 'high'
        });
        break;
    }
    
    return baseActions;
  }
  
  static getTimelineProgress(dispute: Dispute): {
    currentStep: number;
    totalSteps: number;
    progressPercentage: number;
    steps: Array<{
      title: string;
      description: string;
      completed: boolean;
      active: boolean;
      icon: string;
    }>;
  } {
    const matrix = this.getMatrixData(dispute.id);
    const statusOrder = [
      DisputeStatus.SUBMITTED,
      DisputeStatus.MERCHANT_REVIEW,
      DisputeStatus.UNDER_INVESTIGATION,
      DisputeStatus.VENMO_ESCALATION,
      DisputeStatus.RESOLVED_REFUND,
      DisputeStatus.RESOLVED_DENIED
    ];
    
    const currentIndex = statusOrder.indexOf(dispute.status);
    const totalSteps = statusOrder.length;
    
    const steps = statusOrder.map((status, index) => {
      const row = matrix.find(r => r.status === status);
      return {
        title: status.replace(/_/g, ' '),
        description: row?.description || '',
        completed: index < currentIndex,
        active: index === currentIndex,
        icon: row?.icon || '📋'
      };
    });
    
    return {
      currentStep: currentIndex + 1,
      totalSteps,
      progressPercentage: Math.round(((currentIndex + 1) / totalSteps) * 100),
      steps
    };
  }
  
  static generateStatusEmail(dispute: Dispute, recipient: 'customer' | 'merchant'): string {
    const row = this.getCurrentStatusRow(dispute);
    if (!row) return '';
    
    const isCustomer = recipient === 'customer';
    const actions = isCustomer ? row.customerActions : row.merchantActions;
    
    return `
      <h2>Dispute Status Update</h2>
      <p><strong>Dispute ID:</strong> ${dispute.id}</p>
      <p><strong>Status:</strong> ${row.icon} ${dispute.status.replace(/_/g, ' ')}</p>
      <p><strong>Timeline:</strong> ${row.timeline}</p>
      
      <h3>What's Happening:</h3>
      <p>${row.description}</p>
      
      <h3>Available Actions:</h3>
      <ul>
        ${actions.map(action => `<li>${action}</li>`).join('')}
      </ul>
      
      <h3>System Actions:</h3>
      <ul>
        ${row.systemActions.map(action => `<li>${action}</li>`).join('')}
      </ul>
      
      <p><a href="${row.deepLink}">View in DuoPlus App</a></p>
    `;
  }
  
  static validateStatusTransition(currentStatus: DisputeStatus, newStatus: DisputeStatus): boolean {
    const validTransitions: Record<DisputeStatus, DisputeStatus[]> = {
      [DisputeStatus.SUBMITTED]: [
        DisputeStatus.MERCHANT_REVIEW,
        DisputeStatus.UNDER_INVESTIGATION,
        DisputeStatus.SUSPENDED_FRAUD
      ],
      [DisputeStatus.MERCHANT_REVIEW]: [
        DisputeStatus.UNDER_INVESTIGATION,
        DisputeStatus.RESOLVED_REFUND,
        DisputeStatus.RESOLVED_DENIED,
        DisputeStatus.SUSPENDED_FRAUD
      ],
      [DisputeStatus.UNDER_INVESTIGATION]: [
        DisputeStatus.VENMO_ESCALATION,
        DisputeStatus.RESOLVED_REFUND,
        DisputeStatus.RESOLVED_DENIED,
        DisputeStatus.SUSPENDED_FRAUD
      ],
      [DisputeStatus.VENMO_ESCALATION]: [
        DisputeStatus.RESOLVED_REFUND,
        DisputeStatus.RESOLVED_DENIED,
        DisputeStatus.SUSPENDED_FRAUD
      ],
      [DisputeStatus.RESOLVED_REFUND]: [], // Terminal state
      [DisputeStatus.RESOLVED_DENIED]: [], // Terminal state
      [DisputeStatus.SUSPENDED_FRAUD]: [
        DisputeStatus.RESOLVED_REFUND,
        DisputeStatus.RESOLVED_DENIED
      ]
    };
    
    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }
}

export default DisputeMatrix;
