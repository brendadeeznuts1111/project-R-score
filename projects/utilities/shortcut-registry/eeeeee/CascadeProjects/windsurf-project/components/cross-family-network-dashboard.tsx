#!/usr/bin/env bun
// Cross-Family Network Dashboard - Graph Visualization & Shared Oversight
// Part of CROSS-FAMILY GUARDIAN NETWORKS detonation

import { feature } from 'bun:bundle';
import * as React from 'react';
import { guardianNetwork, NetworkVisualizationHelper } from './guardian-network-engine';

// Cross-Family Network Dashboard Component
export const CrossFamilyNetworkDashboard = feature("PREMIUM") ? function() {
  const [selectedTeen, setSelectedTeen] = React.useState('teen-001');
  const [networkData, setNetworkData] = React.useState<any>(null);
  const [dashboardData, setDashboardData] = React.useState<any>(null);
  const [analytics, setAnalytics] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [showAddGuardian, setShowAddGuardian] = React.useState(false);
  const [networkAlerts, setNetworkAlerts] = React.useState<any[]>([]);

  // Load network data
  React.useEffect(() => {
    loadNetworkData();
    const interval = setInterval(loadNetworkData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [selectedTeen]);

  const loadNetworkData = async () => {
    try {
      setLoading(true);
      
      // Get network visualization
      const networkViz = guardianNetwork.getNetworkVisualization(selectedTeen);
      setNetworkData(networkViz);

      // Get shared dashboard
      const dashboard = guardianNetwork.getSharedDashboard(selectedTeen);
      setDashboardData(dashboard);

      // Get network analytics
      const networkAnalytics = guardianNetwork.getNetworkAnalytics(selectedTeen);
      setAnalytics(networkAnalytics);

    } catch (error) {
      console.error('Failed to load network data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGuardian = async (guardianData: any) => {
    try {
      setLoading(true);
      
      const newGuardian = {
        id: `guardian-${Date.now()}`,
        name: guardianData.name,
        email: guardianData.email,
        household: guardianData.household,
        role: guardianData.role,
        status: 'PENDING' as const,
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        permissions: {
          canSpend: guardianData.permissions.canSpend,
          canViewTransactions: true,
          canSetLimits: guardianData.permissions.canSetLimits,
          canApprove: guardianData.permissions.canApprove,
          canReceiveAlerts: true
        }
      };

      await guardianNetwork.addCrossFamilyLink(
        selectedTeen,
        newGuardian,
        'guardian-001', // Current user as approver
        'EXTENDED_FAMILY'
      );

      setShowAddGuardian(false);
      await loadNetworkData();
      
      // Add success alert
      setNetworkAlerts(prev => [{
        id: Date.now(),
        type: 'success',
        message: `Successfully added ${guardianData.name} to the network`,
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 4)]);

    } catch (error) {
      console.error('Failed to add guardian:', error);
      setNetworkAlerts(prev => [{
        id: Date.now(),
        type: 'error',
        message: 'Failed to add guardian to network',
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 4)]);
    } finally {
      setLoading(false);
    }
  };

  const handleFailoverTest = async () => {
    try {
      setLoading(true);
      
      // Simulate guardian failure and test failover
      const backupGuardians = await guardianNetwork.activateDistributedFailover(
        selectedTeen,
        'guardian-001'
      );

      setNetworkAlerts(prev => [{
        id: Date.now(),
        type: 'warning',
        message: `Failover test completed. ${backupGuardians.length} backup guardians activated`,
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 4)]);

      await loadNetworkData();
      
    } catch (error) {
      console.error('Failover test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNetworkHealthColor = (health: number) => {
    if (health >= 0.8) return '#22c55e';
    if (health >= 0.6) return '#f59e0b';
    if (health >= 0.4) return '#f97316';
    return '#ef4444';
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'PRIMARY': return '⭐';
      case 'SECONDARY': return '👥';
      case 'GRANDPARENT': return '👴';
      case 'AUNT_UNCLE': return '👨‍👩‍👧‍👦';
      case 'STEPPARENT': return '🏠';
      default: return '👤';
    }
  };

  return React.createElement('div', { className: 'cross-family-network-dashboard' },
    // Header
    React.createElement('div', { className: 'network-header' },
      React.createElement('h1', null, '🕸️ Cross-Family Guardian Network'),
      React.createElement('p', null, 'Inter-household sponsorship webs with distributed failover'),
      React.createElement('div', { className: 'teen-selector' },
        React.createElement('label', null, 'Teen:'),
        React.createElement('select', {
          value: selectedTeen,
          onChange: (e: any) => setSelectedTeen(e.target.value)
        },
          React.createElement('option', { value: 'teen-001' }, 'Alex (15)'),
          React.createElement('option', { value: 'teen-002' }, 'Jordan (13)'),
          React.createElement('option', { value: 'teen-003' }, 'Taylor (16)')
        ),
        React.createElement('button', {
          onClick: () => setShowAddGuardian(true),
          className: 'add-guardian-btn'
        }, '+ Add Guardian'),
        React.createElement('button', {
          onClick: handleFailoverTest,
          className: 'failover-test-btn'
        }, '🛡️ Test Failover')
      )
    ),

    // Network Alerts
    React.createElement('div', { className: 'network-alerts' },
      networkAlerts.map(alert =>
        React.createElement('div', {
          key: alert.id,
          className: `network-alert ${alert.type}`
        },
          React.createElement('span', { className: 'alert-time' }, 
            new Date(alert.timestamp).toLocaleTimeString()
          ),
          React.createElement('span', { className: 'alert-message' }, alert.message)
        )
      )
    ),

    // Network Overview
    dashboardData && React.createElement('div', { className: 'network-overview' },
      React.createElement('div', { className: 'overview-card' },
        React.createElement('h3', null, '📊 Network Health'),
        React.createElement('div', { className: 'health-score' },
          React.createElement('div', {
            className: 'health-circle',
            style: { borderColor: getNetworkHealthColor(dashboardData.collectiveMetrics.networkHealth) }
          },
            React.createElement('span', { 
              style: { color: getNetworkHealthColor(dashboardData.collectiveMetrics.networkHealth) }
            }, `${(dashboardData.collectiveMetrics.networkHealth * 100).toFixed(0)}%`)
          ),
          React.createElement('span', { className: 'health-label' }, 'Network Health')
        )
      ),
      React.createElement('div', { className: 'overview-card' },
        React.createElement('h3', null, '👥 Guardians'),
        React.createElement('div', { className: 'guardian-stats' },
          React.createElement('div', { className: 'stat-item' },
            React.createElement('span', { className: 'stat-value' }, dashboardData.collectiveMetrics.totalGuardians),
            React.createElement('span', { className: 'stat-label' }, 'Total')
          ),
          React.createElement('div', { className: 'stat-item' },
            React.createElement('span', { className: 'stat-value' }, dashboardData.collectiveMetrics.activeGuardians),
            React.createElement('span', { className: 'stat-label' }, 'Active')
          ),
          React.createElement('div', { className: 'stat-item' },
            React.createElement('span', { className: 'stat-value' }, dashboardData.collectiveMetrics.crossHouseholdLinks),
            React.createElement('span', { className: 'stat-label' }, 'Cross-Household')
          )
        )
      ),
      React.createElement('div', { className: 'overview-card' },
        React.createElement('h3', null, '🔗 Network Strength'),
        React.createElement('div', { className: 'strength-metrics' },
          analytics && React.createElement('div', { className: 'metric-item' },
            React.createElement('span', { className: 'metric-label' }, 'Redundancy'),
            React.createElement('div', { className: 'metric-bar' },
              React.createElement('div', {
                className: 'metric-fill',
                style: { width: `${analytics.redundancyScore * 100}%` }
              })
            ),
            React.createElement('span', { className: 'metric-value' }, `${(analytics.redundancyScore * 100).toFixed(0)}%`)
          ),
          analytics && React.createElement('div', { className: 'metric-item' },
            React.createElement('span', { className: 'metric-label' }, 'Connectivity'),
            React.createElement('div', { className: 'metric-bar' },
              React.createElement('div', {
                className: 'metric-fill',
                style: { width: `${analytics.crossHouseholdConnectivity * 100}%` }
              })
            ),
            React.createElement('span', { className: 'metric-value' }, `${(analytics.crossHouseholdConnectivity * 100).toFixed(0)}%`)
          )
        )
      )
    ),

    // Network Visualization
    networkData && React.createElement('div', { className: 'network-visualization' },
      React.createElement('h2', null, '🕸️ Network Graph'),
      React.createElement('div', { className: 'graph-container' },
        React.createElement('div', { className: 'network-graph' },
          // Nodes
          networkData.nodes.map((node: any) =>
            React.createElement('div', {
              key: node.id,
              className: 'network-node',
              style: {
                left: `${20 + Math.random() * 60}%`,
                top: `${20 + Math.random() * 60}%`,
                backgroundColor: node.color,
                width: node.role === 'PRIMARY' ? '80px' : '60px',
                height: node.role === 'PRIMARY' ? '80px' : '60px'
              }
            },
              React.createElement('div', { className: 'node-icon' }, getRoleIcon(node.role)),
              React.createElement('div', { className: 'node-label' }, node.name),
              React.createElement('div', { className: 'node-household' }, node.household)
            )
          ),
          // Edges (simplified lines)
          networkData.edges.map((edge: any, index: number) =>
            React.createElement('div', {
              key: index,
              className: 'network-edge',
              style: {
                position: 'absolute',
                width: '2px',
                backgroundColor: edge.householdLink ? '#8b5cf6' : '#3b82f6',
                height: edge.strength * 100 + 'px',
                transform: `rotate(${Math.random() * 360}deg)`,
                left: '50%',
                top: '50%',
                opacity: 0.6
              }
            })
          )
        )
      )
    ),

    // Guardian List
    dashboardData && React.createElement('div', { className: 'guardian-list' },
      React.createElement('h2', null, '👥 Network Guardians'),
      React.createElement('div', { className: 'guardians-grid' },
        Array.from(dashboardData.network.guardians.values()).map((guardian: any) =>
          React.createElement('div', {
            key: guardian.id,
            className: 'guardian-card'
          },
            React.createElement('div', { className: 'guardian-header' },
              React.createElement('span', { className: 'guardian-role' }, getRoleIcon(guardian.role)),
              React.createElement('span', { className: 'guardian-name' }, guardian.name),
              React.createElement('span', { 
                className: `guardian-status ${guardian.status.toLowerCase()}`
              }, guardian.status)
            ),
            React.createElement('div', { className: 'guardian-details' },
              React.createElement('div', { className: 'detail-item' },
                React.createElement('span', { className: 'detail-label' }, 'Household:'),
                React.createElement('span', { className: 'detail-value' }, guardian.household)
              ),
              React.createElement('div', { className: 'detail-item' },
                React.createElement('span', { className: 'detail-label' }, 'Role:'),
                React.createElement('span', { className: 'detail-value' }, guardian.role)
              ),
              React.createElement('div', { className: 'detail-item' },
                React.createElement('span', { className: 'detail-label' }, 'Joined:'),
                React.createElement('span', { className: 'detail-value' }, 
                  new Date(guardian.joinedAt).toLocaleDateString()
                )
              )
            ),
            React.createElement('div', { className: 'guardian-permissions' },
              React.createElement('h4', null, 'Permissions:'),
              React.createElement('div', { className: 'permissions-grid' },
                Object.entries(guardian.permissions).map(([key, value]) =>
                  React.createElement('div', {
                    key: key,
                    className: `permission ${value ? 'granted' : 'denied'}`
                  },
                    value ? '✅' : '❌',
                    ' ',
                    key.replace(/([A-Z])/g, ' $1').toLowerCase()
                  )
                )
              )
            )
          )
        )
      )
    ),

    // Activity Feed
    dashboardData && React.createElement('div', { className: 'activity-feed' },
      React.createElement('h2', null, '📋 Network Activity'),
      React.createElement('div', { className: 'feed-container' },
        dashboardData.activityFeed.map((activity: any) =>
          React.createElement('div', {
            key: activity.id,
            className: 'activity-item'
          },
            React.createElement('div', { className: 'activity-header' },
              React.createElement('span', { className: 'activity-type' }, activity.type),
              React.createElement('span', { className: 'activity-time' }, 
                new Date(activity.timestamp).toLocaleTimeString()
              )
            ),
            React.createElement('div', { className: 'activity-content' },
              React.createElement('span', { className: 'activity-guardian' }, activity.guardian),
              React.createElement('span', { className: 'activity-message' }, activity.message)
            )
          )
        )
      )
    ),

    // Recommendations
    analytics && analytics.recommendations.length > 0 && React.createElement('div', { className: 'recommendations' },
      React.createElement('h2', null, '💡 Network Recommendations'),
      React.createElement('div', { className: 'recommendations-list' },
        analytics.recommendations.map((rec: string, index: number) =>
          React.createElement('div', {
            key: index,
            className: 'recommendation-item'
          },
            React.createElement('span', { className: 'rec-icon' }, '💡'),
            React.createElement('span', { className: 'rec-text' }, rec)
          )
        )
      )
    ),

    // Add Guardian Modal
    showAddGuardian && React.createElement('div', { className: 'modal-overlay' },
      React.createElement('div', { className: 'modal-content' },
        React.createElement('h3', null, 'Add Guardian to Network'),
        React.createElement('form', {
          onSubmit: (e: any) => {
            e.preventDefault();
            const form = e.target;
            const formData = new FormData(form);
            handleAddGuardian({
              name: formData.get('name'),
              email: formData.get('email'),
              household: formData.get('household'),
              role: formData.get('role'),
              permissions: {
                canSpend: formData.get('canSpend') === 'on',
                canSetLimits: formData.get('canSetLimits') === 'on',
                canApprove: formData.get('canApprove') === 'on'
              }
            });
          }
        },
          React.createElement('div', { className: 'form-group' },
            React.createElement('label', null, 'Name:'),
            React.createElement('input', { name: 'name', required: true })
          ),
          React.createElement('div', { className: 'form-group' },
            React.createElement('label', null, 'Email:'),
            React.createElement('input', { name: 'email', type: 'email', required: true })
          ),
          React.createElement('div', { className: 'form-group' },
            React.createElement('label', null, 'Household:'),
            React.createElement('input', { name: 'household', required: true })
          ),
          React.createElement('div', { className: 'form-group' },
            React.createElement('label', null, 'Role:'),
            React.createElement('select', { name: 'role' },
              React.createElement('option', { value: 'SECONDARY' }, 'Secondary Guardian'),
              React.createElement('option', { value: 'GRANDPARENT' }, 'Grandparent'),
              React.createElement('option', { value: 'AUNT_UNCLE' }, 'Aunt/Uncle'),
              React.createElement('option', { value: 'STEPPARENT' }, 'Stepparent')
            )
          ),
          React.createElement('div', { className: 'form-group' },
            React.createElement('label', null, 'Permissions:'),
            React.createElement('div', { className: 'checkbox-group' },
              React.createElement('label', null,
                React.createElement('input', { name: 'canSpend', type: 'checkbox' }),
                ' Can Spend'
              ),
              React.createElement('label', null,
                React.createElement('input', { name: 'canSetLimits', type: 'checkbox' }),
                ' Can Set Limits'
              ),
              React.createElement('label', null,
                React.createElement('input', { name: 'canApprove', type: 'checkbox' }),
                ' Can Approve'
              )
            )
          ),
          React.createElement('div', { className: 'form-actions' },
            React.createElement('button', { type: 'button', onClick: () => setShowAddGuardian(false) }, 'Cancel'),
            React.createElement('button', { type: 'submit', disabled: loading }, 
              loading ? 'Adding...' : 'Add Guardian'
            )
          )
        )
      )
    )
  );
} : undefined as any;
