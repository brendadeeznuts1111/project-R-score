import React, { useState, useEffect, useCallback } from 'react';
import {
  DashboardLayout,
  MetricCard,
  DisputeMatrix,
  AIInsightsPanel,
  TransactionList,
  AnalyticsChart,
  AlertFeed,
  QuickActionBar
} from './DashboardComponents';
import {
  MerchantDashboard,
  Dispute,
  AIInsights,
  Timeframe,
  Alert,
  RealtimeUpdate
} from '../../merchant/dashboard/dashboard-manager';

interface MerchantDashboardProps {
  merchantId: string;
}

const MerchantDashboard: React.FC<MerchantDashboardProps> = ({ merchantId }) => {
  const [dashboard, setDashboard] = useState<MerchantDashboard | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');
  const [selectedView, setSelectedView] = useState<'overview' | 'disputes' | 'ai' | 'analytics'>('overview');
  const [realTimeUpdates, setRealTimeUpdates] = useState<WebSocket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load dashboard data
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/merchant/dashboard/${merchantId}?timeframe=${timeframe}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setDashboard(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [merchantId, timeframe]);

  // Setup real-time updates
  const setupRealTimeUpdates = useCallback(() => {
    const ws = new WebSocket(`wss://factory-wager.com/ws/merchant/${merchantId}`);
    
    ws.onopen = () => {
      console.log('🔌 WebSocket connected for merchant updates');
    };
    
    ws.onmessage = (event) => {
      try {
        const update: RealtimeUpdate = JSON.parse(event.data);
        handleRealtimeUpdate(update);
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        setupRealTimeUpdates();
      }, 5000);
    };
    
    setRealTimeUpdates(ws);
  }, [merchantId]);

  // Handle real-time updates
  const handleRealtimeUpdate = useCallback((update: RealtimeUpdate) => {
    console.log('📡 Real-time update received:', update.type);
    
    switch (update.type) {
      case 'NEW_DISPUTE':
        showNotification(`New dispute: ${update.data.disputeId}`, 'info');
        refreshDisputes();
        break;
      case 'DISPUTE_UPDATED':
        updateDisputeInView(update.data.dispute);
        break;
      case 'AI_ANALYSIS_READY':
        updateAIAnalysis(update.data.analysis);
        break;
      case 'VENMO_DECISION':
        handleVenmoDecision(update.data.decision);
        break;
    }
  }, []);

  // Refresh specific data
  const refreshDisputes = useCallback(() => {
    if (dashboard) {
      loadDashboard();
    }
  }, [dashboard, loadDashboard]);

  const updateDisputeInView = useCallback((dispute: Dispute) => {
    if (dashboard) {
      const updatedDisputes = dashboard.disputes.all.map(d => 
        d.id === dispute.id ? dispute : d
      );
      
      setDashboard({
        ...dashboard,
        disputes: {
          ...dashboard.disputes,
          all: updatedDisputes
        }
      });
    }
  }, [dashboard]);

  const updateAIAnalysis = useCallback((analysis: any) => {
    if (dashboard) {
      const updatedInsights = {
        ...dashboard.aiInsights,
        analyses: [...dashboard.aiInsights.analyses, analysis]
      };
      
      setDashboard({
        ...dashboard,
        aiInsights: updatedInsights
      });
    }
  }, [dashboard]);

  const handleVenmoDecision = useCallback((decision: any) => {
    showNotification(`Venmo decision received: ${decision.outcome}`, 'success');
    refreshDisputes();
  }, [refreshDisputes]);

  // Show notification (toast)
  const showNotification = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    // This would integrate with your toast/notification system
    console.log(`🔔 Notification [${type}]: ${message}`);
    
    // For now, just use browser notification if available
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('FactoryWager Dashboard', {
        body: message,
        icon: '/favicon.ico'
      });
    }
  }, []);

  // Handle dispute actions
  const openDisputeDetail = useCallback((dispute: Dispute) => {
    // Navigate to dispute detail page or open modal
    window.location.href = `/disputes/${dispute.id}`;
  }, []);

  const handleBulkAction = useCallback(async (action: string, disputeIds: string[]) => {
    try {
      const response = await fetch('/api/merchant/disputes/bulk-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          disputeIds,
          merchantId
        })
      });
      
      if (!response.ok) {
        throw new Error(`Bulk action failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      showNotification(`Bulk ${action} completed: ${result.affected} disputes affected`, 'success');
      refreshDisputes();
    } catch (err) {
      console.error('Bulk action failed:', err);
      showNotification('Bulk action failed', 'error');
    }
  }, [merchantId, refreshDisputes, showNotification]);

  const generateReport = useCallback(async () => {
    try {
      const response = await fetch(`/api/merchant/reports/${merchantId}?timeframe=${timeframe}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Report generation failed: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `merchant-report-${merchantId}-${timeframe}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showNotification('Report generated successfully', 'success');
    } catch (err) {
      console.error('Report generation failed:', err);
      showNotification('Failed to generate report', 'error');
    }
  }, [merchantId, timeframe, showNotification]);

  const showVenmoCases = useCallback(() => {
    setSelectedView('disputes');
    // Filter to show only escalated cases
    // This would typically update a filter state
  }, []);

  const applyAIRecommendation = useCallback(async (recommendation: any) => {
    try {
      const response = await fetch('/api/merchant/ai/recommendations/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recommendation,
          merchantId
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to apply recommendation: ${response.statusText}`);
      }
      
      showNotification('AI recommendation applied successfully', 'success');
      refreshDisputes();
    } catch (err) {
      console.error('Failed to apply AI recommendation:', err);
      showNotification('Failed to apply AI recommendation', 'error');
    }
  }, [merchantId, refreshDisputes, showNotification]);

  const investigatePattern = useCallback((pattern: any) => {
    // Navigate to pattern investigation view
    window.location.href = `/patterns/investigate?type=${pattern.type}`;
  }, []);

  // Initialize dashboard
  useEffect(() => {
    loadDashboard();
    setupRealTimeUpdates();
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    return () => {
      realTimeUpdates?.close();
    };
  }, [loadDashboard, setupRealTimeUpdates, realTimeUpdates]);

  // Auto-refresh dashboard every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboard();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [loadDashboard]);

  // Loading state
  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-message">
          <h2>❌ Dashboard Error</h2>
          <p>{error}</p>
          <button onClick={loadDashboard} className="retry-button">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  // No dashboard data
  if (!dashboard) {
    return (
      <div className="dashboard-empty">
        <div className="empty-message">
          <h2>📊 No Dashboard Data</h2>
          <p>Unable to load dashboard information</p>
          <button onClick={loadDashboard} className="retry-button">
            🔄 Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      merchantId={merchantId}
      onTimeframeChange={setTimeframe}
      onViewChange={setSelectedView}
    >
      {/* Overview View */}
      {selectedView === 'overview' && (
        <div className="overview-grid">
          <div className="metrics-row">
            <MetricCard
              title="Total Volume"
              value={`$${dashboard.overview.totalVolume.toLocaleString()}`}
              trend={12.5}
              icon="💰"
              color="success"
            />
            <MetricCard
              title="Active Disputes"
              value={dashboard.overview.activeDisputes}
              trend={-3.2}
              icon="⚖️"
              color={dashboard.overview.activeDisputes > 5 ? 'warning' : 'info'}
              onClick={() => setSelectedView('disputes')}
            />
            <MetricCard
              title="Win Rate"
              value={`${dashboard.overview.winRate.toFixed(1)}%`}
              trend={5.1}
              icon="📈"
              color="success"
            />
            <MetricCard
              title="Avg Resolution"
              value={`${dashboard.overview.avgResolutionDays.toFixed(1)} days`}
              trend={-1.2}
              icon="⏱️"
              color="info"
            />
          </div>
          
          <div className="charts-row">
            <AnalyticsChart
              title="Disputes Over Time"
              data={dashboard.analytics.disputeTrend}
              type="line"
              height={300}
            />
            <AnalyticsChart
              title="Dispute Reasons"
              data={dashboard.disputes.reasons}
              type="donut"
              height={300}
            />
          </div>
          
          <div className="actions-row">
            <QuickActionBar
              actions={[
                {
                  label: "Respond to Disputes",
                  icon: "💬",
                  count: dashboard.disputes.requiringAction.length,
                  onClick: () => setSelectedView('disputes'),
                  color: "primary"
                },
                {
                  label: "Review AI Insights",
                  icon: "🤖",
                  count: dashboard.aiInsights.summary.highRiskCount,
                  onClick: () => setSelectedView('ai'),
                  color: "warning"
                },
                {
                  label: "Generate Report",
                  icon: "📊",
                  onClick: generateReport,
                  color: "info"
                },
                {
                  label: "Venmo Cases",
                  icon: "🔗",
                  count: dashboard.disputes.counts.escalated,
                  onClick: showVenmoCases,
                  color: "secondary"
                }
              ]}
            />
          </div>
          
          <AlertFeed alerts={dashboard.alerts} />
        </div>
      )}
      
      {/* Disputes View */}
      {selectedView === 'disputes' && (
        <DisputeManagementView
          disputes={dashboard.disputes}
          onDisputeSelect={openDisputeDetail}
          onBulkAction={handleBulkAction}
          timeframe={timeframe}
        />
      )}
      
      {/* AI Insights View */}
      {selectedView === 'ai' && (
        <AIInsightsView
          insights={dashboard.aiInsights}
          onRecommendationApply={applyAIRecommendation}
          onPatternInvestigate={investigatePattern}
        />
      )}
      
      {/* Analytics View */}
      {selectedView === 'analytics' && (
        <AnalyticsView
          analytics={dashboard.analytics}
          transactions={dashboard.transactions}
          timeframe={timeframe}
        />
      )}
    </DashboardLayout>
  );
};

// Dispute Management Component
interface DisputeManagementViewProps {
  disputes: any;
  onDisputeSelect: (dispute: Dispute) => void;
  onBulkAction: (action: string, disputeIds: string[]) => void;
  timeframe: Timeframe;
}

const DisputeManagementView: React.FC<DisputeManagementViewProps> = ({
  disputes,
  onDisputeSelect,
  onBulkAction,
  timeframe
}) => {
  const [selectedDisputes, setSelectedDisputes] = useState<string[]>([]);
  const [filteredDisputes, setFilteredDisputes] = useState(disputes.all);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Apply filters
  useEffect(() => {
    let filtered = disputes.all;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status === statusFilter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(d => 
        d.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.reason.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredDisputes(filtered);
  }, [disputes.all, statusFilter, searchTerm]);

  return (
    <div className="dispute-management-view">
      <div className="dispute-stats-bar">
        <div className="stat-badge submitted">
          <span className="count">{disputes.counts.submitted}</span>
          <span className="label">New</span>
        </div>
        <div className="stat-badge under-review">
          <span className="count">{disputes.counts.under_review}</span>
          <span className="label">In Progress</span>
        </div>
        <div className="stat-badge escalated">
          <span className="count">{disputes.counts.escalated}</span>
          <span className="label">Venmo</span>
        </div>
        <div className="stat-badge resolved">
          <span className="count">{disputes.counts.resolved}</span>
          <span className="label">Resolved</span>
        </div>
      </div>
      
      <div className="dispute-filters">
        <div className="filter-group">
          <label>Status:</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="ESCALATED_TO_VENMO">Escalated to Venmo</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Search:</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search disputes..."
            className="search-input"
          />
        </div>
        
        <div className="filter-info">
          Showing {filteredDisputes.length} of {disputes.all.length} disputes
        </div>
      </div>
      
      <DisputeMatrix
        disputes={filteredDisputes}
        columns={[
          { key: 'id', label: 'ID', width: 100 },
          { key: 'customer_email', label: 'Customer', width: 150 },
          { key: 'amount', label: 'Amount', width: 100, format: 'currency' },
          { key: 'reason', label: 'Reason', width: 150 },
          { key: 'status', label: 'Status', width: 120, format: 'badge' },
          { key: 'created_at', label: 'Submitted', width: 120, format: 'timeAgo' },
          { key: 'risk_score', label: 'Risk', width: 100, format: 'progress' },
          { key: 'recommendation', label: 'AI Suggestion', width: 200, format: 'chip' }
        ]}
        onRowClick={onDisputeSelect}
        onSelectionChange={setSelectedDisputes}
        selectable={true}
      />
      
      {selectedDisputes.length > 0 && (
        <BulkActionBar
          selectedCount={selectedDisputes.length}
          actions={[
            {
              label: "Upload Evidence",
              icon: "📎",
              onClick: () => onBulkAction('upload_evidence', selectedDisputes)
            },
            {
              label: "Send Message",
              icon: "💬",
              onClick: () => onBulkAction('send_message', selectedDisputes)
            },
            {
              label: "Accept & Refund",
              icon: "✅",
              variant: "success",
              onClick: () => onBulkAction('accept_refund', selectedDisputes)
            },
            {
              label: "Deny",
              icon: "❌",
              variant: "error",
              onClick: () => onBulkAction('deny', selectedDisputes)
            },
            {
              label: "Escalate to Venmo",
              icon: "🚨",
              variant: "warning",
              onClick: () => onBulkAction('escalate', selectedDisputes)
            }
          ]}
        />
      )}
      
      <DisputeReasonBreakdown reasons={disputes.reasons} />
    </div>
  );
};

// AI Insights Component
interface AIInsightsViewProps {
  insights: AIInsights;
  onRecommendationApply: (recommendation: any) => void;
  onPatternInvestigate: (pattern: any) => void;
}

const AIInsightsView: React.FC<AIInsightsViewProps> = ({
  insights,
  onRecommendationApply,
  onPatternInvestigate
}) => {
  return (
    <div className="ai-insights-view">
      <div className="ai-summary-cards">
        <div className="summary-card high-risk">
          <div className="value">{insights.summary.highRiskCount}</div>
          <div className="label">High-Risk Disputes</div>
          <div className="trend">↑ 12% this month</div>
        </div>
        <div className="summary-card ai-confidence">
          <div className="value">{insights.summary.avgConfidence.toFixed(1)}%</div>
          <div className="label">AI Confidence</div>
          <div className="trend">↑ 3.2%</div>
        </div>
        <div className="summary-card time-saved">
          <div className="value">42h</div>
          <div className="label">Time Saved</div>
          <div className="trend">Estimated this month</div>
        </div>
      </div>
      
      <div className="ai-panels-grid">
        <AIInsightsPanel
          title="📊 Dispute Patterns Detected"
          insights={insights.patterns}
          type="patterns"
          onInvestigate={onPatternInvestigate}
        />
        
        <AIInsightsPanel
          title="🎯 AI Recommendations"
          insights={insights.recommendations}
          type="recommendations"
          onApply={onRecommendationApply}
        />
        
        <AIInsightsPanel
          title="⚠️ Fraud Predictions"
          insights={insights.fraudPredictions}
          type="predictions"
          onInvestigate={onPatternInvestigate}
        />
        
        <AIInsightsPanel
          title="📈 Risk Analysis"
          insights={insights.analyses}
          type="risk"
          onInvestigate={onPatternInvestigate}
        />
      </div>
      
      <div className="ai-explainability">
        <h3>🤔 How AI Makes Decisions</h3>
        <div className="explanation-grid">
          <div className="explanation-card">
            <h4>Evidence Analysis</h4>
            <p>AI examines uploaded photos, receipts, and messages for inconsistencies</p>
            <div className="confidence-meter">
              <div className="confidence-fill" style={{ width: '87%' }} />
              <span>87% confidence</span>
            </div>
          </div>
          <div className="explanation-card">
            <h4>Pattern Recognition</h4>
            <p>Compares against 10,000+ historical disputes to detect patterns</p>
            <div className="confidence-meter">
              <div className="confidence-fill" style={{ width: '92%' }} />
              <span>92% confidence</span>
            </div>
          </div>
          <div className="explanation-card">
            <h4>Customer Behavior</h4>
            <p>Analyzes customer's dispute history and transaction patterns</p>
            <div className="confidence-meter">
              <div className="confidence-fill" style={{ width: '78%' }} />
              <span>78% confidence</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Analytics View Component
interface AnalyticsViewProps {
  analytics: any;
  transactions: any;
  timeframe: Timeframe;
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  analytics,
  transactions,
  timeframe
}) => {
  return (
    <div className="analytics-view">
      <div className="analytics-header">
        <h2>📊 Analytics Dashboard</h2>
        <div className="timeframe-selector">
          <span>Timeframe: {timeframe}</span>
        </div>
      </div>
      
      <div className="analytics-grid">
        <div className="chart-container large">
          <AnalyticsChart
            title="Dispute Trend"
            data={analytics.disputeTrend}
            type="line"
            height={400}
          />
        </div>
        
        <div className="chart-container medium">
          <AnalyticsChart
            title="Win Rate Trend"
            data={analytics.winRateTrend}
            type="line"
            height={300}
          />
        </div>
        
        <div className="chart-container medium">
          <AnalyticsChart
            title="Volume Trend"
            data={analytics.volumeTrend}
            type="area"
            height={300}
          />
        </div>
        
        <div className="chart-container small">
          <AnalyticsChart
            title="Reason Breakdown"
            data={analytics.reasonBreakdown}
            type="pie"
            height={250}
          />
        </div>
        
        <div className="chart-container small">
          <AnalyticsChart
            title="Risk Distribution"
            data={analytics.riskDistribution}
            type="donut"
            height={250}
          />
        </div>
      </div>
      
      <div className="analytics-summary">
        <h3>📈 Key Insights</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <h4>Dispute Rate</h4>
            <p className="insight-value">2.3%</p>
            <p className="insight-change negative">↑ 0.4% from last month</p>
          </div>
          <div className="insight-card">
            <h4>Average Resolution Time</h4>
            <p className="insight-value">3.2 days</p>
            <p className="insight-change positive">↓ 1.1 days from last month</p>
          </div>
          <div className="insight-card">
            <h4>Customer Satisfaction</h4>
            <p className="insight-value">87%</p>
            <p className="insight-change positive">↑ 5% from last month</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const DisputeReasonBreakdown: React.FC<{ reasons: any[] }> = ({ reasons }) => {
  return (
    <div className="dispute-reason-breakdown">
      <h3>📋 Dispute Reasons</h3>
      <div className="reason-list">
        {reasons.map((reason, index) => (
          <div key={index} className="reason-item">
            <span className="reason-name">{reason.reason}</span>
            <span className="reason-count">{reason.count}</span>
            <span className="reason-percentage">{reason.percentage.toFixed(1)}%</span>
            <div className="reason-bar">
              <div 
                className="reason-fill" 
                style={{ width: `${reason.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BulkActionBar: React.FC<{
  selectedCount: number;
  actions: Array<{
    label: string;
    icon: string;
    onClick: () => void;
    variant?: string;
  }>;
}> = ({ selectedCount, actions }) => {
  return (
    <div className="bulk-action-bar">
      <div className="selection-info">
        <span className="selected-count">{selectedCount}</span>
        <span className="selected-text">disputes selected</span>
      </div>
      
      <div className="action-buttons">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`action-button ${action.variant || 'default'}`}
          >
            <span className="action-icon">{action.icon}</span>
            <span className="action-label">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MerchantDashboard;
