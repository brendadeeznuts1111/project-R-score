#!/usr/bin/env bun
// Guardian Portal - Real-Time Activity Visibility & Oversight
// Part of FAMILY SPONSORSHIP CONTROLS EXPANDED detonation

import { feature } from 'bun:bundle';
import * as React from 'react';
import { familyControlsManager, notificationManager } from './family-controls-manager';

// Guardian Portal Component
export const GuardianPortal = feature("PREMIUM") ? function() {
    const [activeTab, setActiveTab] = React.useState<'overview' | 'activity' | 'approvals' | 'compliance'>('overview');
    const [familyOverview, setFamilyOverview] = React.useState<any>(null);
    const [realTimeActivity, setRealTimeActivity] = React.useState<any[]>([]);
    const [pendingApprovals, setPendingApprovals] = React.useState<any[]>([]);
    const [complianceStatus, setComplianceStatus] = React.useState<any>(null);
    const [notifications, setNotifications] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);

    // Load initial data
    React.useEffect(() => {
      loadFamilyOverview();
      loadPendingApprovals();
      loadComplianceStatus();
    }, []);

    // Setup real-time notifications
    React.useEffect(() => {
      if (notificationManager) {
        notificationManager.connect('guardian@example.com');
        
        notificationManager.subscribe('real_time_activity', (data) => {
          setRealTimeActivity(prev => [data, ...prev.slice(0, 49)]);
        });
        
        notificationManager.subscribe('spend_threshold', (data) => {
          setNotifications(prev => [{
            id: Date.now(),
            type: 'warning',
            message: `💰 ${data.teenName} reached ${data.threshold}% of ${data.period} limit`,
            timestamp: new Date().toISOString(),
            priority: 'high'
          }, ...prev.slice(0, 9)]);
        });
        
        notificationManager.subscribe('approval_request', (data) => {
          setPendingApprovals(prev => [data, ...prev]);
          setNotifications(prev => [{
            id: Date.now(),
            type: 'info',
            message: `📋 ${data.teenName} requests approval for ${data.requestType}`,
            timestamp: new Date().toISOString(),
            priority: 'medium'
          }, ...prev.slice(0, 9)]);
        });

        return () => {
          if (notificationManager) {
            notificationManager.disconnect();
          }
        };
      }
    }, []);

    const loadFamilyOverview = async () => {
      try {
        setLoading(true);
        // Mock family overview data
        const overview = {
          totalTeens: 3,
          activeTeens: 2,
          totalSpendThisMonth: 245.50,
          monthlyBudget: 900,
          allowanceActive: true,
          lastActivity: '2 minutes ago',
          complianceScore: 98,
          pendingApprovals: 2,
          alerts: 1
        };
        setFamilyOverview(overview);
      } catch (error) {
        console.error('Failed to load family overview:', error);
      } finally {
        setLoading(false);
      }
    };

    const loadPendingApprovals = async () => {
      try {
        if (familyControlsManager) {
          const approvals = await familyControlsManager.getPendingApprovals('guardian@example.com');
          setPendingApprovals(approvals);
        }
      } catch (error) {
        console.error('Failed to load pending approvals:', error);
      }
    };

    const loadComplianceStatus = async () => {
      try {
        // Mock compliance data
        const compliance = {
          coppaCompliant: true,
          consentForms: [
            { teenId: 'teen-001', signedAt: '2024-01-15', expiresAt: '2025-01-15' },
            { teenId: 'teen-002', signedAt: '2024-02-20', expiresAt: '2025-02-20' }
          ],
          lastAudit: '2024-01-10',
          nextAudit: '2024-04-10',
          dataRetentionDays: 365,
          encryptionEnabled: true,
          gdprCompliant: true
        };
        setComplianceStatus(compliance);
      } catch (error) {
        console.error('Failed to load compliance status:', error);
      }
    };

    const handleApproval = async (requestId: string, action: 'approve' | 'decline') => {
      try {
        setLoading(true);
        if (familyControlsManager) {
          await familyControlsManager.processApproval(requestId, action);
          await loadPendingApprovals();
        }
      } catch (error) {
        console.error(`Failed to ${action} request:`, error);
      } finally {
        setLoading(false);
      }
    };

    const exportActivityLog = async () => {
      try {
        // Generate CSV export
        const csvContent = "Timestamp,Teen,Action,Amount,Status\n" +
          realTimeActivity.map(log => 
            `${log.timestamp},${log.teenName},${log.action},${log.amount || ''},${log.status}`
          ).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = typeof globalThis !== 'undefined' && (globalThis as any).URL ? (globalThis as any).URL.createObjectURL(blob) : null;
        if (url) {
          const a = typeof globalThis !== 'undefined' && (globalThis as any).document ? (globalThis as any).document.createElement('a') : null;
          if (a) {
            a.href = url;
            a.download = `family-activity-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
          }
        }
        if (url && typeof globalThis !== 'undefined' && (globalThis as any).URL) {
          (globalThis as any).URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error('Failed to export activity log:', error);
      }
    };

    return React.createElement('div', { className: 'guardian-portal' },
      // Header
      React.createElement('div', { className: 'portal-header' },
        React.createElement('h1', null, '🛡️ Guardian Portal'),
        React.createElement('p', null, 'Real-time family oversight and compliance management'),
        React.createElement('div', { className: 'header-stats' },
          familyOverview && React.createElement('div', { className: 'stat-cards' },
            React.createElement('div', { className: 'stat-card' },
              React.createElement('span', { className: 'stat-value' }, familyOverview.totalTeens),
              React.createElement('span', { className: 'stat-label' }, 'Total Teens')
            ),
            React.createElement('div', { className: 'stat-card' },
              React.createElement('span', { className: 'stat-value' }, `$${familyOverview.totalSpendThisMonth}`),
              React.createElement('span', { className: 'stat-label' }, 'This Month')
            ),
            React.createElement('div', { className: 'stat-card' },
              React.createElement('span', { className: 'stat-value' }, `${familyOverview.complianceScore}%`),
              React.createElement('span', { className: 'stat-label' }, 'Compliance')
            ),
            React.createElement('div', { className: 'stat-card alerts' },
              React.createElement('span', { className: 'stat-value' }, familyOverview.pendingApprovals),
              React.createElement('span', { className: 'stat-label' }, 'Pending')
            )
          )
        )
      ),

      // Notifications Panel
      notifications.length > 0 && React.createElement('div', { className: 'notifications-panel' },
        React.createElement('h3', null, '🔔 Recent Notifications'),
        React.createElement('div', { className: 'notifications-list' },
          notifications.map(notif =>
            React.createElement('div', { key: notif.id, className: `notification ${notif.type} ${notif.priority}` },
              React.createElement('span', { className: 'notification-message' }, notif.message),
              React.createElement('span', { className: 'notification-time' }, 
                new Date(notif.timestamp).toLocaleTimeString()
              )
            )
          )
        )
      ),

      // Tab Navigation
      React.createElement('div', { className: 'tab-navigation' },
        ['overview', 'activity', 'approvals', 'compliance'].map(tab =>
          React.createElement('button', {
            key: tab,
            className: `tab-btn ${activeTab === tab ? 'active' : ''}`,
            onClick: () => setActiveTab(tab as any)
          }, tab.charAt(0).toUpperCase() + tab.slice(1))
        )
      ),

      // Tab Content
      React.createElement('div', { className: 'tab-content' },
        // Overview Tab
        activeTab === 'overview' && React.createElement('div', { className: 'overview-tab' },
          React.createElement('h2', null, 'Family Overview'),
          familyOverview && React.createElement('div', { className: 'overview-grid' },
            React.createElement('div', { className: 'overview-card' },
              React.createElement('h3', null, '📊 Spending Summary'),
              React.createElement('div', { className: 'spending-chart' },
                React.createElement('div', { className: 'progress-bar' },
                  React.createElement('div', {
                    className: 'progress-fill',
                    style: { width: `${(familyOverview.totalSpendThisMonth / familyOverview.monthlyBudget) * 100}%` }
                  })
                ),
                React.createElement('p', null, 
                  `$${familyOverview.totalSpendThisMonth} of $${familyOverview.monthlyBudget} budget used`
                )
              )
            ),
            React.createElement('div', { className: 'overview-card' },
              React.createElement('h3', null, '👥 Active Teens'),
              React.createElement('div', { className: 'teen-status' },
                React.createElement('div', { className: 'status-item' },
                  React.createElement('span', { className: 'status-dot active' }),
                  React.createElement('span', null, `${familyOverview.activeTeens} Active`)
                ),
                React.createElement('div', { className: 'status-item' },
                  React.createElement('span', { className: 'status-dot inactive' }),
                  React.createElement('span', null, `${familyOverview.totalTeens - familyOverview.activeTeens} Inactive`)
                )
              )
            ),
            React.createElement('div', { className: 'overview-card' },
              React.createElement('h3', null, '🔄 Auto-Allowance'),
              React.createElement('div', { className: 'allowance-status' },
                React.createElement('span', { 
                  className: `allowance-badge ${familyOverview.allowanceActive ? 'active' : 'inactive'}` 
                }, familyOverview.allowanceActive ? '✅ Active' : '⏸️ Inactive'),
                React.createElement('p', null, `Last activity: ${familyOverview.lastActivity}`)
              )
            ),
            React.createElement('div', { className: 'overview-card' },
              React.createElement('h3', null, '⚠️ Alerts'),
              React.createElement('div', { className: 'alerts-summary' },
                React.createElement('span', { className: 'alert-count' }, familyOverview.alerts),
                React.createElement('span', null, 'alerts require attention')
              )
            )
          )
        ),

        // Activity Tab
        activeTab === 'activity' && React.createElement('div', { className: 'activity-tab' },
          React.createElement('div', { className: 'activity-header' },
            React.createElement('h2', null, '📊 Real-Time Activity'),
            React.createElement('button', { 
              className: 'export-btn',
              onClick: exportActivityLog
            }, '📥 Export CSV')
          ),
          React.createElement('div', { className: 'activity-filters' },
            React.createElement('select', { className: 'filter-select' },
              React.createElement('option', null, 'All Teens'),
              React.createElement('option', null, 'Alex'),
              React.createElement('option', null, 'Jordan'),
              React.createElement('option', null, 'Taylor')
            ),
            React.createElement('select', { className: 'filter-select' },
              React.createElement('option', null, 'All Activities'),
              React.createElement('option', null, 'Spending'),
              React.createElement('option', null, 'Approvals'),
              React.createElement('option', null, 'Logins')
            ),
            React.createElement('input', { 
              type: 'date', 
              className: 'filter-date',
              defaultValue: new Date().toISOString().split('T')[0]
            })
          ),
          React.createElement('div', { className: 'activity-timeline' },
            realTimeActivity.length > 0 ? realTimeActivity.map(activity =>
              React.createElement('div', { key: activity.id, className: 'activity-item' },
                React.createElement('div', { className: 'activity-time' }, activity.timestamp),
                React.createElement('div', { className: 'activity-icon' }, 
                  activity.type === 'spend' ? '💰' : 
                  activity.type === 'approval' ? '📋' : '🔐'
                ),
                React.createElement('div', { className: 'activity-details' },
                  React.createElement('div', { className: 'activity-title' }, activity.title),
                  React.createElement('div', { className: 'activity-description' }, activity.description),
                  activity.amount && React.createElement('div', { className: 'activity-amount' }, `$${activity.amount}`)
                ),
                React.createElement('div', { className: `activity-status ${activity.status}` }, activity.status)
              )
            ) : React.createElement('div', { className: 'no-activity' },
              React.createElement('p', null, 'No recent activity to display'),
              React.createElement('span', { className: 'loading-dots' })
            )
          )
        ),

        // Approvals Tab
        activeTab === 'approvals' && React.createElement('div', { className: 'approvals-tab' },
          React.createElement('h2', null, '📋 Pending Approvals'),
          React.createElement('div', { className: 'approvals-list' },
            pendingApprovals.length > 0 ? pendingApprovals.map(approval =>
              React.createElement('div', { key: approval.id, className: 'approval-card' },
                React.createElement('div', { className: 'approval-header' },
                  React.createElement('h3', null, approval.requestType.replace('_', ' ').toUpperCase()),
                  React.createElement('span', { className: 'approval-time' }, 
                    new Date(approval.requestedAt).toLocaleDateString()
                  )
                ),
                React.createElement('div', { className: 'approval-details' },
                  React.createElement('p', null, `${approval.teenName} requests ${approval.description}`),
                  React.createElement('div', { className: 'approval-amount' }, 
                    approval.amount > 0 ? `$${approval.amount}` : 'No cost'
                  )
                ),
                React.createElement('div', { className: 'approval-actions' },
                  React.createElement('button', {
                    className: 'approve-btn',
                    onClick: () => handleApproval(approval.id, 'approve'),
                    disabled: loading
                  }, '✅ Approve'),
                  React.createElement('button', {
                    className: 'decline-btn',
                    onClick: () => handleApproval(approval.id, 'decline'),
                    disabled: loading
                  }, '❌ Decline'),
                  React.createElement('button', { className: 'details-btn' }, '📄 Details')
                )
              )
            ) : React.createElement('div', { className: 'no-approvals' },
              React.createElement('p', null, 'No pending approvals'),
              React.createElement('span', null, 'All caught up! 🎉')
            )
          )
        ),

        // Compliance Tab
        activeTab === 'compliance' && React.createElement('div', { className: 'compliance-tab' },
          React.createElement('h2', null, '🛡️ Compliance Status'),
          complianceStatus && React.createElement('div', { className: 'compliance-grid' },
            React.createElement('div', { className: 'compliance-card' },
              React.createElement('h3', null, '🔒 Data Protection'),
              React.createElement('div', { className: 'compliance-item' },
                React.createElement('span', { className: `status ${complianceStatus.encryptionEnabled ? 'compliant' : 'non-compliant'}` },
                  complianceStatus.encryptionEnabled ? '✅' : '❌'
                ),
                React.createElement('span', null, 'Encryption Enabled')
              ),
              React.createElement('div', { className: 'compliance-item' },
                React.createElement('span', { className: 'status compliant' }, '✅'),
                React.createElement('span', null, `Data Retention: ${complianceStatus.dataRetentionDays} days`)
              )
            ),
            React.createElement('div', { className: 'compliance-card' },
              React.createElement('h3', null, '👶 COPPA Compliance'),
              React.createElement('div', { className: 'compliance-item' },
                React.createElement('span', { className: `status ${complianceStatus.coppaCompliant ? 'compliant' : 'non-compliant'}` },
                  complianceStatus.coppaCompliant ? '✅' : '❌'
                ),
                React.createElement('span', null, 'COPPA Compliant')
              ),
              React.createElement('div', { className: 'consent-forms' },
                React.createElement('h4', null, 'Consent Forms'),
                complianceStatus.consentForms.map((form: any, index: number) =>
                  React.createElement('div', { key: index, className: 'consent-item' },
                    React.createElement('span', null, `Teen ${index + 1}`),
                    React.createElement('span', null, `Signed: ${form.signedAt}`),
                    React.createElement('span', null, `Expires: ${form.expiresAt}`)
                  )
                )
              )
            ),
            React.createElement('div', { className: 'compliance-card' },
              React.createElement('h3', null, '📋 Audit Information'),
              React.createElement('div', { className: 'audit-info' },
                React.createElement('div', { className: 'audit-item' },
                  React.createElement('span', null, 'Last Audit:'),
                  React.createElement('span', null, complianceStatus.lastAudit)
                ),
                React.createElement('div', { className: 'audit-item' },
                  React.createElement('span', null, 'Next Audit:'),
                  React.createElement('span', null, complianceStatus.nextAudit)
                )
              )
            ),
            React.createElement('div', { className: 'compliance-card' },
              React.createElement('h3', null, '🌍 Global Compliance'),
              React.createElement('div', { className: 'compliance-item' },
                React.createElement('span', { className: `status ${complianceStatus.gdprCompliant ? 'compliant' : 'non-compliant'}` },
                  complianceStatus.gdprCompliant ? '✅' : '❌'
                ),
                React.createElement('span', null, 'GDPR Compliant')
              )
            )
          )
        )
      )
    );
  } : undefined as any;
