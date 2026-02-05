#!/usr/bin/env bun
// Family Controls Component - Guardian-Powered Teen Onboarding UI
// Part of FAMILY SPONSORSHIP CONTROLS EXPANDED detonation

import { feature } from 'bun:bundle';
import * as React from 'react';
import { familyControlsManager, notificationManager } from './family-controls-manager';

// Family Controls Component
export const FamilySponsorshipPanel = feature("PREMIUM") ? function() {
    const [selectedTeen, setSelectedTeen] = React.useState<string | null>(null);
    const [teenProfile, setTeenProfile] = React.useState<any>(null);
    const [spendLimits, setSpendLimits] = React.useState({
      daily: 20,
      weekly: 100,
      monthly: 300,
      perTransaction: 50,
    });
    const [activityLogs, setActivityLogs] = React.useState<any[]>([]);
    const [pendingApprovals, setPendingApprovals] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [notification, setNotification] = React.useState<string | null>(null);

    // Load teen profile when selected
    React.useEffect(() => {
      if (selectedTeen && familyControlsManager) {
        loadTeenProfile(selectedTeen);
        loadActivityLogs(selectedTeen);
      }
    }, [selectedTeen]);

    // Setup notifications
    React.useEffect(() => {
      if (notificationManager) {
        notificationManager.connect('guardian@example.com');
        notificationManager.subscribe('spend_alert', (data) => {
          setNotification(`💰 Spend Alert: ${data.teenName} spent $${data.amount}`);
        });
        notificationManager.subscribe('approval_request', (data) => {
          setNotification(`📋 Approval Request: ${data.teenName} needs approval for ${data.requestType}`);
        });
        notificationManager.subscribe('limit_exceeded', (data) => {
          setNotification(`⚠️ Limit Exceeded: ${data.teenName} exceeded ${data.limitType} limit`);
        });

        return () => {
          if (notificationManager) {
            notificationManager.disconnect();
          }
        };
      }
    }, []);

    const loadTeenProfile = async (teenId: string) => {
      try {
        setLoading(true);
        const profile = await familyControlsManager!.getTeenProfile(teenId);
        setTeenProfile(profile);
        setSpendLimits((profile as any).spendLimits || spendLimits);
      } catch (error) {
        console.error('Failed to load teen profile:', error);
        setNotification('❌ Failed to load teen profile');
      } finally {
        setLoading(false);
      }
    };

    const loadActivityLogs = async (teenId: string) => {
      try {
        const logs = await familyControlsManager!.getActivityLogs(teenId);
        setActivityLogs(logs);
      } catch (error) {
        console.error('Failed to load activity logs:', error);
      }
    };

    const updateSpendLimits = async () => {
      if (!selectedTeen || !familyControlsManager) return;

      try {
        setLoading(true);
        const result = await familyControlsManager.updateSpendLimits(selectedTeen, spendLimits);
        setNotification('✅ Spend limits updated successfully');
        console.log('Previous limits:', result.previousLimits);
        console.log('New limits:', result.newLimits);
      } catch (error) {
        console.error('Failed to update spend limits:', error);
        setNotification('❌ Failed to update spend limits');
      } finally {
        setLoading(false);
      }
    };

    const processApproval = async (requestId: string, action: 'approve' | 'decline') => {
      if (!familyControlsManager) return;

      try {
        setLoading(true);
        const result = await familyControlsManager.processApproval(requestId, action);
        setNotification(`✅ Request ${action}d successfully`);
        
        // Refresh pending approvals
        const approvals = await familyControlsManager.getPendingApprovals('guardian@example.com');
        setPendingApprovals(approvals);
      } catch (error) {
        console.error(`Failed to ${action} request:`, error);
        setNotification(`❌ Failed to ${action} request`);
      } finally {
        setLoading(false);
      }
    };

    const setupAutoAllowance = async () => {
      if (!selectedTeen || !teenProfile || !familyControlsManager) return;

      try {
        setLoading(true);
        const result = await familyControlsManager.setupAutoAllowance(
          selectedTeen,
          teenProfile.allowanceAmount,
          teenProfile.allowanceFrequency
        );
        setNotification('✅ Auto-allowance setup successful');
        console.log('Next transfer:', result.nextTransfer);
      } catch (error) {
        console.error('Failed to setup auto-allowance:', error);
        setNotification('❌ Failed to setup auto-allowance');
      } finally {
        setLoading(false);
      }
    };

    const toggleTeenAccess = async (paused: boolean) => {
      if (!selectedTeen || !familyControlsManager) return;

      try {
        setLoading(true);
        const result = await familyControlsManager.toggleTeenAccess(selectedTeen, paused);
        setNotification(`✅ Teen access ${paused ? 'paused' : 'resumed'} successfully`);
        
        // Update profile
        if (teenProfile) {
          setTeenProfile({ ...teenProfile, status: result.status });
        }
      } catch (error) {
        console.error('Failed to toggle teen access:', error);
        setNotification('❌ Failed to toggle teen access');
      } finally {
        setLoading(false);
      }
    };

    // Mock teens data
    const teens = [
      { id: 'teen-001', name: 'Alex', email: 'alex@example.com', age: 15 },
      { id: 'teen-002', name: 'Jordan', email: 'jordan@example.com', age: 16 },
      { id: 'teen-003', name: 'Taylor', email: 'taylor@example.com', age: 14 },
    ];

    return React.createElement('div', { className: 'family-controls-panel' },
      // Header
      React.createElement('div', { className: 'panel-header' },
        React.createElement('h2', null, '👨‍👩‍👧‍👦 Family Sponsorship Controls'),
        React.createElement('p', null, 'Guardian-powered teen onboarding with granular oversight')
      ),

      // Notification Banner
      notification && React.createElement('div', { className: 'notification-banner' },
        React.createElement('span', null, notification),
        React.createElement('button', { 
          onClick: () => setNotification(null),
          className: 'close-notification'
        }, '×')
      ),

      // Teen Selection
      React.createElement('div', { className: 'teen-selection' },
        React.createElement('h3', null, 'Select Teen Account'),
        React.createElement('div', { className: 'teen-cards' },
          teens.map(teen =>
            React.createElement('div', {
              key: teen.id,
              className: `teen-card ${selectedTeen === teen.id ? 'selected' : ''}`,
              onClick: () => setSelectedTeen(teen.id)
            },
              React.createElement('div', { className: 'teen-avatar' }, teen.name[0]),
              React.createElement('div', { className: 'teen-info' },
                React.createElement('h4', null, teen.name),
                React.createElement('p', null, `${teen.email} • Age ${teen.age}`)
              )
            )
          )
        )
      ),

      // Controls Panel (show when teen is selected)
      selectedTeen && teenProfile && React.createElement('div', { className: 'controls-panel' },
        // Spend Limits Section
        React.createElement('div', { className: 'control-section' },
          React.createElement('h3', null, '💰 Spend Limits'),
          React.createElement('div', { className: 'limit-controls' },
            React.createElement('div', { className: 'limit-input' },
              React.createElement('label', null, 'Daily Limit'),
              React.createElement('input', {
                type: 'number',
                value: spendLimits.daily,
                onChange: (e: any) => setSpendLimits({ ...spendLimits, daily: parseInt(e.target.value) || 0 }),
                min: '0',
                max: '1000'
              }),
              React.createElement('span', { className: 'currency' }, '$')
            ),
            React.createElement('div', { className: 'limit-input' },
              React.createElement('label', null, 'Weekly Limit'),
              React.createElement('input', {
                type: 'number',
                value: spendLimits.weekly,
                onChange: (e: any) => setSpendLimits({ ...spendLimits, weekly: parseInt(e.target.value) || 0 }),
                min: '0',
                max: '5000'
              }),
              React.createElement('span', { className: 'currency' }, '$')
            ),
            React.createElement('div', { className: 'limit-input' },
              React.createElement('label', null, 'Monthly Limit'),
              React.createElement('input', {
                type: 'number',
                value: spendLimits.monthly,
                onChange: (e: any) => setSpendLimits({ ...spendLimits, monthly: parseInt(e.target.value) || 0 }),
                min: '0',
                max: '10000'
              }),
              React.createElement('span', { className: 'currency' }, '$')
            ),
            React.createElement('div', { className: 'limit-input' },
              React.createElement('label', null, 'Per Transaction'),
              React.createElement('input', {
                type: 'number',
                value: spendLimits.perTransaction,
                onChange: (e: any) => setSpendLimits({ ...spendLimits, perTransaction: parseInt(e.target.value) || 0 }),
                min: '0',
                max: '500'
              }),
              React.createElement('span', { className: 'currency' }, '$')
            )
          ),
          React.createElement('button', {
            className: 'apply-limits-btn',
            onClick: updateSpendLimits,
            disabled: loading
          }, loading ? 'Applying...' : 'Apply Limits')
        ),

        // Auto-Allowance Section
        React.createElement('div', { className: 'control-section' },
          React.createElement('h3', null, '🔄 Auto-Allowance'),
          React.createElement('div', { className: 'allowance-controls' },
            React.createElement('div', { className: 'allowance-input' },
              React.createElement('label', null, 'Allowance Amount'),
              React.createElement('input', {
                type: 'number',
                value: teenProfile.allowanceAmount || 20,
                onChange: (e: any) => setTeenProfile({ ...teenProfile, allowanceAmount: parseInt(e.target.value) || 0 }),
                min: '0',
                max: '1000'
              }),
              React.createElement('span', { className: 'currency' }, '$')
            ),
            React.createElement('div', { className: 'allowance-input' },
              React.createElement('label', null, 'Frequency'),
              React.createElement('select', {
                value: teenProfile.allowanceFrequency || 'weekly',
                onChange: (e: any) => setTeenProfile({ ...teenProfile, allowanceFrequency: e.target.value })
              },
                React.createElement('option', { value: 'daily' }, 'Daily'),
                React.createElement('option', { value: 'weekly' }, 'Weekly'),
                React.createElement('option', { value: 'monthly' }, 'Monthly')
              )
            )
          ),
          React.createElement('button', {
            className: 'setup-allowance-btn',
            onClick: setupAutoAllowance,
            disabled: loading || !teenProfile.allowanceEnabled
          }, loading ? 'Setting up...' : 'Setup Auto-Allowance')
        ),

        // Access Control Section
        React.createElement('div', { className: 'control-section' },
          React.createElement('h3', null, '🔒 Access Control'),
          React.createElement('div', { className: 'access-controls' },
            React.createElement('div', { className: 'status-indicator' },
              React.createElement('span', { className: `status ${teenProfile.status || 'active'}` },
                teenProfile.status === 'active' ? '✅ Active' : '⏸️ Paused'
              ),
              React.createElement('p', null, teenProfile.status === 'active' 
                ? 'Teen has full access to dashboard features'
                : 'Teen access is temporarily paused'
              )
            ),
            React.createElement('button', {
              className: `toggle-access-btn ${teenProfile.status === 'active' ? 'pause' : 'resume'}`,
              onClick: () => toggleTeenAccess(teenProfile.status !== 'active'),
              disabled: loading
            }, loading ? 'Updating...' : (teenProfile.status === 'active' ? 'Pause Access' : 'Resume Access'))
          )
        ),

        // Activity Logs Section
        React.createElement('div', { className: 'control-section' },
          React.createElement('h3', null, '📊 Recent Activity'),
          React.createElement('div', { className: 'activity-logs' },
            activityLogs.length > 0 ? activityLogs.slice(0, 10).map(log =>
              React.createElement('div', { key: log.id, className: 'activity-log' },
                React.createElement('div', { className: 'log-time' }, log.timestamp),
                React.createElement('div', { className: 'log-action' }, log.action),
                React.createElement('div', { className: 'log-amount' }, log.amount ? `$${log.amount}` : ''),
                React.createElement('div', { className: `log-status ${log.status}` }, log.status)
              )
            ) : React.createElement('p', { className: 'no-activity' }, 'No recent activity')
          )
        )
      )
    );
  } : undefined as any;
