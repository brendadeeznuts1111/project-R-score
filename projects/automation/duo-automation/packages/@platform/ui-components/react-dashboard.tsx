/**
 * 🎛️ React Dashboard Components for Status System
 * Full-featured dashboard with real-time updates and comprehensive UI
 */

import React, { useState, useEffect, useCallback } from 'react';
import { StatusSystemAPI, useStatusAPI, Subscription, SystemHealth, SystemMetrics } from './status-api';

// Dashboard Components
export function StatusDashboard({ config }: { config?: any }) {
  const { api, getSystemOverview, getSystemHealth, getEndpoints, getMetrics, getSubscriptions } = useStatusAPI(config);
  
  const [data, setData] = useState({
    overview: null,
    health: null,
    endpoints: [],
    metrics: null,
    subscriptions: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [overview, health, endpoints, metrics, subscriptions] = await Promise.all([
        getSystemOverview(),
        getSystemHealth(),
        getEndpoints(),
        getMetrics(),
        getSubscriptions(),
      ]);

      setData({
        overview,
        health,
        endpoints,
        metrics,
        subscriptions,
      });
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [refreshData]);

  if (loading && !data.overview) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={refreshData} />;
  }

  return (
    <div className="status-dashboard">
      <DashboardHeader 
        health={data.health} 
        lastUpdate={lastUpdate}
        onRefresh={refreshData}
        loading={loading}
      />
      
      <div className="dashboard-grid">
        <SystemOverview overview={data.overview} metrics={data.metrics} />
        <EndpointsPanel endpoints={data.endpoints} />
        <SubscriptionsPanel 
          subscriptions={data.subscriptions} 
          onUpdate={refreshData}
        />
      </div>
    </div>
  );
}

function DashboardHeader({ 
  health, 
  lastUpdate, 
  onRefresh, 
  loading 
}: { 
  health: SystemHealth | null;
  lastUpdate: Date;
  onRefresh: () => void;
  loading: boolean;
}) {
  return (
    <header className="dashboard-header">
      <div className="header-title">
        <h1>🎛️ Empire Pro Status Dashboard</h1>
        <div className="last-update">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>
      
      <div className="header-status">
        <HealthIndicator health={health} />
        <button 
          className={`refresh-btn ${loading ? 'loading' : ''}`}
          onClick={onRefresh}
          disabled={loading}
        >
          🔄 {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </header>
  );
}

function HealthIndicator({ health }: { health: SystemHealth | null }) {
  if (!health) {
    return <div className="health-indicator unknown">UNKNOWN</div>;
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'healthy': return 'healthy';
      case 'degraded': return 'degraded';
      case 'down': return 'down';
      default: return 'unknown';
    }
  };

  return (
    <div className="health-status">
      <div className={`health-indicator ${getStatusClass(health.overall)}`}>
        {health.overall.toUpperCase()}
      </div>
      <div className="uptime-display">
        {health.uptime.toFixed(2)}% uptime
      </div>
    </div>
  );
}

function SystemOverview({ overview, metrics }: { 
  overview: any; 
  metrics: SystemMetrics | null; 
}) {
  return (
    <div className="card system-overview">
      <h2>📊 System Overview</h2>
      
      <div className="metrics-grid">
        <MetricCard
          label="Total Requests"
          value={metrics?.totalRequests || 0}
          format="number"
        />
        <MetricCard
          label="Error Rate"
          value={metrics?.errorRate || 0}
          format="percentage"
        />
        <MetricCard
          label="Avg Response Time"
          value={metrics?.avgResponseTime || 0}
          format="duration"
        />
        <MetricCard
          label="Requests/sec"
          value={metrics?.requestsPerSecond || 0}
          format="number"
        />
      </div>

      {overview && (
        <div className="system-info">
          <h3>Service Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Service:</span>
              <span className="info-value">{overview.service}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Version:</span>
              <span className="info-value">{overview.version}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Endpoints:</span>
              <span className="info-value">{overview.endpointsSummary?.total || 0}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Subscriptions:</span>
              <span className="info-value">{overview.subscriptionStats?.total || 0}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  format 
}: { 
  label: string; 
  value: number; 
  format: 'number' | 'percentage' | 'duration';
}) {
  const formatValue = (val: number, fmt: string) => {
    switch (fmt) {
      case 'number':
        return val.toLocaleString();
      case 'percentage':
        return `${(val * 100).toFixed(2)}%`;
      case 'duration':
        return `${val.toFixed(0)}ms`;
      default:
        return val.toString();
    }
  };

  return (
    <div className="metric-card">
      <div className="metric-value">
        {formatValue(value, format)}
      </div>
      <div className="metric-label">
        {label}
      </div>
    </div>
  );
}

function EndpointsPanel({ endpoints }: { endpoints: any[] }) {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEndpoints = endpoints.filter(endpoint => {
    const matchesFilter = filter === 'all' || endpoint.category === filter;
    const matchesSearch = searchTerm === '' || 
      endpoint.endpoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
      endpoint.method.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'status', label: 'Status' },
    { value: 'api', label: 'API' },
    { value: 'subscription', label: 'Subscription' },
  ];

  return (
    <div className="card endpoints-panel">
      <h2>🔗 Endpoints ({filteredEndpoints.length})</h2>
      
      <div className="panel-controls">
        <input
          type="text"
          placeholder="Search endpoints..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="filter-select"
        >
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div className="endpoints-list">
        {filteredEndpoints.map(endpoint => (
          <EndpointCard key={endpoint.id} endpoint={endpoint} />
        ))}
      </div>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: any }) {
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'active': return 'active';
      case 'inactive': return 'inactive';
      case 'error': return 'error';
      default: return 'unknown';
    }
  };

  return (
    <div className="endpoint-card">
      <div className="endpoint-header">
        <span className="method-badge">{endpoint.method}</span>
        <span className="endpoint-path">{endpoint.endpoint}</span>
        <span className={`status-badge ${getStatusClass(endpoint.status)}`}>
          {endpoint.status}
        </span>
      </div>
      
      <div className="endpoint-metrics">
        <span>{endpoint.responseTime || 0}ms</span>
        <span>{(endpoint.uptime || 100).toFixed(1)}% uptime</span>
        <span>Category: {endpoint.category}</span>
      </div>
    </div>
  );
}

function SubscriptionsPanel({ 
  subscriptions, 
  onUpdate 
}: { 
  subscriptions: Subscription[]; 
  onUpdate: () => void;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <div className="card subscriptions-panel">
      <div className="panel-header">
        <h2>📧 Subscriptions ({subscriptions.length})</h2>
        <button 
          className="create-btn"
          onClick={() => setShowCreateForm(true)}
        >
          + Create Subscription
        </button>
      </div>

      {showCreateForm && (
        <CreateSubscriptionForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            onUpdate();
          }}
        />
      )}

      <div className="subscriptions-list">
        {subscriptions.length === 0 ? (
          <div className="empty-state">
            <p>No subscriptions configured</p>
            <button 
              className="create-btn"
              onClick={() => setShowCreateForm(true)}
            >
              Create your first subscription
            </button>
          </div>
        ) : (
          subscriptions.map(subscription => (
            <SubscriptionCard
              key={subscription.id}
              subscription={subscription}
              onUpdate={onUpdate}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SubscriptionCard({ 
  subscription, 
  onUpdate 
}: { 
  subscription: Subscription;
  onUpdate: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleStatusToggle = async () => {
    setIsLoading(true);
    try {
      const api = new StatusSystemAPI();
      const newStatus = subscription.status === 'active' ? 'paused' : 'active';
      await api.updateSubscription(subscription.id, { status: newStatus });
      onUpdate();
    } catch (error) {
      console.error('Failed to update subscription:', error);
      alert('Failed to update subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;
    
    setIsLoading(true);
    try {
      const api = new StatusSystemAPI();
      await api.deleteSubscription(subscription.id);
      onUpdate();
    } catch (error) {
      console.error('Failed to delete subscription:', error);
      alert('Failed to delete subscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`subscription-card ${subscription.status}`}>
      <div className="subscription-header">
        <span className="subscription-type">{subscription.type.toUpperCase()}</span>
        <span className="subscription-target" title={subscription.target}>
          {subscription.target}
        </span>
        <span className={`status-badge ${subscription.status}`}>
          {subscription.status}
        </span>
      </div>

      <div className="subscription-events">
        {subscription.events.map(event => (
          <span key={event} className="event-tag">{event}</span>
        ))}
      </div>

      <div className="subscription-metrics">
        <span>{subscription.deliveryStats.totalSent} sent</span>
        <span>{(subscription.deliveryStats.successRate * 100).toFixed(1)}% success</span>
        <span>
          Last: {subscription.deliveryStats.lastDelivery 
            ? new Date(subscription.deliveryStats.lastDelivery).toLocaleDateString()
            : 'Never'
          }
        </span>
      </div>

      <div className="subscription-actions">
        <button
          className={`action-btn ${isLoading ? 'loading' : ''}`}
          onClick={handleStatusToggle}
          disabled={isLoading}
        >
          {subscription.status === 'active' ? 'Pause' : 'Activate'}
        </button>
        <button
          className={`action-btn danger ${isLoading ? 'loading' : ''}`}
          onClick={handleDelete}
          disabled={isLoading}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function CreateSubscriptionForm({ 
  onClose, 
  onSuccess 
}: { 
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    type: 'webhook' as const,
    target: '',
    events: ['endpoint_status_changed'],
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const api = new StatusSystemAPI();
      await api.createSubscription(formData);
      onSuccess();
    } catch (error) {
      console.error('Failed to create subscription:', error);
      alert('Failed to create subscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Create New Subscription</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Type:</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value as any})}
            >
              <option value="webhook">Webhook</option>
              <option value="email">Email</option>
              <option value="slack">Slack</option>
            </select>
          </div>

          <div className="form-group">
            <label>Target:</label>
            <input
              type="text"
              value={formData.target}
              onChange={(e) => setFormData({...formData, target: e.target.value})}
              placeholder="https://example.com/webhook"
              required
            />
          </div>

          <div className="form-group">
            <label>Events:</label>
            <select
              multiple
              value={formData.events}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setFormData({...formData, events: selected});
              }}
            >
              <option value="endpoint_status_changed">Endpoint Status Changed</option>
              <option value="subscription_created">Subscription Created</option>
              <option value="system_alert">System Alert</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Utility Components
function LoadingSpinner() {
  return (
    <div className="loading-container">
      <div className="spinner">🔄</div>
      <p>Loading dashboard...</p>
    </div>
  );
}

function ErrorDisplay({ 
  error, 
  onRetry 
}: { 
  error: string; 
  onRetry: () => void;
}) {
  return (
    <div className="error-container">
      <div className="error-icon">❌</div>
      <h3>Failed to load dashboard</h3>
      <p>{error}</p>
      <button onClick={onRetry} className="retry-btn">
        Try Again
      </button>
    </div>
  );
}

export default StatusDashboard;
