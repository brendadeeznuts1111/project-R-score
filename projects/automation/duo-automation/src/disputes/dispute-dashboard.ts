// src/dashboard/dispute-dashboard.ts
import { DisputeSystem, DisputeMatrixRow, DisputeStatus } from '../disputes/dispute-system';
import { DeepLinkGenerator, Dispute } from '../deeplinks/deeplink-generator';

export interface QuickAction {
  title: string;
  description: string;
  deepLink: string;
  icon: string;
  category: 'customer' | 'merchant' | 'admin';
}

export interface DisputeDashboardData {
  matrix: DisputeMatrixRow[];
  quickActions: QuickAction[];
  systemStats: {
    totalDisputes: number;
    activeDisputes: number;
    resolvedToday: number;
    avgResolutionTime: string;
    refundRate: string;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: Date;
    deepLink: string;
  }>;
}

export class DisputeDashboard {
  private disputeSystem = new DisputeSystem();
  private deepLinkGenerator = new DeepLinkGenerator();
  
  /**
   * Get complete dashboard data
   */
  getDashboardData(): DisputeDashboardData {
    return {
      matrix: this.disputeSystem.getDisputeMatrix(),
      quickActions: this.getQuickActions(),
      systemStats: this.getSystemStats(),
      recentActivity: this.getRecentActivity()
    };
  }
  
  /**
   * Get quick actions for common dispute operations
   */
  private getQuickActions(): QuickAction[] {
    return [
      {
        title: 'Submit New Dispute',
        description: 'For recent transaction',
        deepLink: 'factory-wager://dispute/new?type=qr',
        icon: '➕',
        category: 'customer'
      },
      {
        title: 'Upload Evidence',
        description: 'Add photos/documents',
        deepLink: 'factory-wager://dispute/upload',
        icon: '📤',
        category: 'customer'
      },
      {
        title: 'Message Merchant',
        description: 'Secure chat channel',
        deepLink: 'factory-wager://dispute/chat',
        icon: '💬',
        category: 'customer'
      },
      {
        title: 'Respond to Dispute',
        description: 'Merchant response required',
        deepLink: 'factory-wager://dispute/respond',
        icon: '📝',
        category: 'merchant'
      },
      {
        title: 'Upload Counter-Evidence',
        description: 'Provide proof of service',
        deepLink: 'factory-wager://dispute/counter-evidence',
        icon: '📋',
        category: 'merchant'
      },
      {
        title: 'Check Venmo Status',
        description: 'View Venmo case',
        deepLink: 'factory-wager://dispute/venmo-status',
        icon: '🔍',
        category: 'admin'
      },
      {
        title: 'Download Report',
        description: 'PDF with all details',
        deepLink: 'factory-wager://dispute/report',
        icon: '📊',
        category: 'admin'
      },
      {
        title: 'Escalate to Review',
        description: 'Senior review required',
        deepLink: 'factory-wager://dispute/escalate',
        icon: '⚠️',
        category: 'admin'
      }
    ];
  }
  
  /**
   * Get system statistics
   */
  private getSystemStats() {
    // Mock data - in real implementation, this would come from database
    return {
      totalDisputes: 1247,
      activeDisputes: 89,
      resolvedToday: 23,
      avgResolutionTime: '2.4 days',
      refundRate: '67%'
    };
  }
  
  /**
   * Get recent activity
   */
  private getRecentActivity() {
    // Mock data - in real implementation, this would come from database
    return [
      {
        id: 'DSP-12345',
        type: 'dispute_submitted',
        description: 'New dispute against @coffee-shop',
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        deepLink: 'factory-wager://dispute/DSP-12345'
      },
      {
        id: 'DSP-12344',
        type: 'merchant_responded',
        description: '@pizza-place responded to dispute',
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        deepLink: 'factory-wager://dispute/DSP-12344'
      },
      {
        id: 'DSP-12343',
        type: 'refund_issued',
        description: 'Refund processed for $45.00',
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        deepLink: 'factory-wager://dispute/DSP-12343'
      },
      {
        id: 'DSP-12342',
        type: 'evidence_uploaded',
        description: 'Customer uploaded 3 photos',
        timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        deepLink: 'factory-wager://dispute/DSP-12342'
      },
      {
        id: 'DSP-12341',
        type: 'venmo_escalated',
        description: 'Case escalated to Venmo',
        timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        deepLink: 'factory-wager://dispute/DSP-12341'
      }
    ];
  }
  
  /**
   * Generate dispute status timeline
   */
  generateStatusTimeline(currentStatus: DisputeStatus): Array<{
    step: number;
    status: string;
    title: string;
    description: string;
    completed: boolean;
    active: boolean;
    deepLink: string;
  }> {
    const statusOrder: DisputeStatus[] = [
      'DISPUTE_SUBMITTED',
      'MERCHANT_REVIEW', 
      'UNDER_INVESTIGATION',
      'VENMO_ESCALATION',
      'RESOLVED_REFUND',
      'RESOLVED_DENIED'
    ];
    
    const currentIndex = statusOrder.indexOf(currentStatus);
    
    return statusOrder.map((status, index) => {
      const details = this.disputeSystem.getStatusDetails(status);
      return {
        step: index + 1,
        status,
        title: status.replace(/_/g, ' '),
        description: details?.timeline || 'Unknown',
        completed: index <= currentIndex,
        active: index === currentIndex,
        deepLink: details?.deepLink || `factory-wager://dispute/status/${status.toLowerCase()}`
      };
    });
  }
  
  /**
   * Generate shareable dispute links
   */
  generateShareableLinks(dispute: Dispute): Record<string, string> {
    const content = this.disputeSystem.generateShareableContent(dispute);
    const deepLinks = this.disputeSystem.generateDisputeDeepLinks(dispute);
    
    return {
      ...content,
      qr: this.generateQRCode(deepLinks.primary),
      short: this.generateShortLink(deepLinks.primary)
    };
  }
  
  /**
   * Handle deep link click
   */
  handleDeepLinkClick(deepLink: string): boolean {
    try {
      // Validate the deep link
      if (!this.disputeSystem.validateDisputeLink(deepLink)) {
        console.error('Invalid dispute deep link:', deepLink);
        return false;
      }
      
      // Parse the deep link
      const parsed = this.disputeSystem.parseDisputeDeepLink(deepLink);
      
      // Handle different types of deep links
      switch (parsed.type) {
        case 'dispute':
          return this.handleDisputeDeepLink(parsed);
        case 'qr-dispute':
          return this.handleQRDisputeDeepLink(parsed);
        default:
          console.error('Unknown deep link type:', parsed.type);
          return false;
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
      return false;
    }
  }
  
  // Private helper methods
  private handleDisputeDeepLink(parsed: any): boolean {
    // In a real app, this would navigate to the appropriate screen
    console.log('Navigating to dispute:', parsed.disputeId);
    console.log('Action:', parsed.action);
    console.log('Status:', parsed.status);
    return true;
  }
  
  private handleQRDisputeDeepLink(parsed: any): boolean {
    // In a real app, this would open the QR dispute creation flow
    console.log('Opening QR dispute flow with data:', parsed.data);
    return true;
  }
  
  private generateQRCode(deepLink: string): string {
    // In a real implementation, this would generate an actual QR code
    // For now, return a placeholder URL
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(deepLink)}`;
  }
  
  private generateShortLink(deepLink: string): string {
    // In a real implementation, this would use a URL shortening service
    // For now, return a mock short link
    return `https://duopl.us/d/${Math.random().toString(36).substring(7)}`;
  }
}

export const disputeDashboard = new DisputeDashboard();
