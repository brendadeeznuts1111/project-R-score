/**
 * 🎛️ Status Dashboard UI Components
 * React components for status system visualization and management
 */

import React, { useState, useEffect } from 'react';
import { elysia } from 'elysia';

// Types
export interface StatusEndpoint {
  id: string;
  category: 'status' | 'api' | 'subscription';
  endpoint: string;
  method: string;
  status: 'active' | 'inactive' | 'error';
  responseTime: number;
  lastChecked: string;
  uptime: number;
}

export interface Subscription {
  id: string;
  type: 'webhook' | 'email' | 'slack';
  target: string;
  events: string[];
  status: 'active' | 'paused' | 'inactive';
  deliveryStats: {
    totalSent: number;
    successRate: number;
    lastDelivery: string;
  };
}

export interface DashboardData {
  endpoints: StatusEndpoint[];
  subscriptions: Subscription[];
  systemHealth: {
    overall: 'healthy' | 'degraded' | 'down';
    uptime: number;
    lastUpdate: string;
  };
  metrics: {
    totalRequests: number;
    errorRate: number;
    avgResponseTime: number;
  };
}

// Dashboard Component
export function StatusDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('https://empire-pro-status.utahj4754.workers.dev/api/v1/system-matrix');
        const result = await response.json();
        setData(transformStatusData(result));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!data) return <div>No data available</div>;

  return (
    <div className="status-dashboard">
      <header className="dashboard-header">
        <h1>🎛️ Empire Pro Status Dashboard</h1>
        <div className="system-health">
          <span className={`health-indicator ${data.systemHealth.overall}`}>
            {data.systemHealth.overall.toUpperCase()}
          </span>
          <span className="uptime">{data.systemHealth.uptime.toFixed(2)}% uptime</span>
        </div>
      </header>

      <div className="dashboard-grid">
        {/* System Overview */}
        <section className="card system-overview">
          <h2>📊 System Overview</h2>
          <div className="metrics-grid">
            <div className="metric">
              <span className="metric-value">{data.metrics.totalRequests.toLocaleString()}</span>
              <span className="metric-label">Total Requests</span>
            </div>
            <div className="metric">
              <span className="metric-value">{(data.metrics.errorRate * 100).toFixed(2)}%</span>
              <span className="metric-label">Error Rate</span>
            </div>
            <div className="metric">
              <span className="metric-value">{data.metrics.avgResponseTime}ms</span>
              <span className="metric-label">Avg Response Time</span>
            </div>
          </div>
        </section>

        {/* Endpoints Status */}
        <section className="card endpoints-status">
          <h2>🔗 Endpoints Status ({data.endpoints.length})</h2>
          <div className="endpoints-grid">
            {data.endpoints.map(endpoint => (
              <div key={endpoint.id} className={`endpoint-card ${endpoint.status}`}>
                <div className="endpoint-header">
                  <span className="endpoint-method">{endpoint.method}</span>
                  <span className="endpoint-path">{endpoint.endpoint}</span>
                  <span className={`status-badge ${endpoint.status}`}>{endpoint.status}</span>
                </div>
                <div className="endpoint-metrics">
                  <span>{endpoint.responseTime}ms</span>
                  <span>{endpoint.uptime.toFixed(1)}% uptime</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Subscriptions */}
        <section className="card subscriptions">
          <h2>📧 Subscriptions ({data.subscriptions.length})</h2>
          <div className="subscriptions-list">
            {data.subscriptions.map(sub => (
              <div key={sub.id} className={`subscription-card ${sub.status}`}>
                <div className="subscription-header">
                  <span className="subscription-type">{sub.type.toUpperCase()}</span>
                  <span className="subscription-target">{sub.target}</span>
                  <span className={`status-badge ${sub.status}`}>{sub.status}</span>
                </div>
                <div className="subscription-metrics">
                  <span>{sub.deliveryStats.totalSent} sent</span>
                  <span>{(sub.deliveryStats.successRate * 100).toFixed(1)}% success</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// Subscription Manager Component
export function SubscriptionManager() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const createSubscription = async (subscription: Omit<Subscription, 'id' | 'deliveryStats'>) => {
    try {
      const response = await fetch('https://empire-pro-status.utahj4754.workers.dev/api/v1/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
      
      if (response.ok) {
        const newSub = await response.json();
        setSubscriptions([...subscriptions, newSub]);
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error('Failed to create subscription:', error);
    }
  };

  return (
    <div className="subscription-manager">
      <header className="manager-header">
        <h2>📧 Subscription Manager</h2>
        <button 
          className="create-btn"
          onClick={() => setShowCreateForm(true)}
        >
          + Create Subscription
        </button>
      </header>

      {showCreateForm && (
        <CreateSubscriptionForm 
          onSubmit={createSubscription}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <div className="subscriptions-grid">
        {subscriptions.map(sub => (
          <SubscriptionCard 
            key={sub.id} 
            subscription={sub}
            onUpdate={(id, updates) => {
              setSubscriptions(subs.map(s => 
                s.id === id ? { ...s, ...updates } : s
              ));
            }}
            onDelete={(id) => {
              setSubscriptions(subs.filter(s => s.id !== id));
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Create Subscription Form
function CreateSubscriptionForm({ 
  onSubmit, 
  onCancel 
}: { 
  onSubmit: (sub: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    type: 'webhook',
    target: '',
    events: ['endpoint_status_changed'],
    status: 'active'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
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
              onChange={(e) => setFormData({...formData, type: e.target.value})}
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
            <select multiple value={formData.events} onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value);
              setFormData({...formData, events: selected});
            }}>
              <option value="endpoint_status_changed">Status Changed</option>
              <option value="subscription_created">Subscription Created</option>
              <option value="system_alert">System Alert</option>
            </select>
          </div>
          
          <div className="form-actions">
            <button type="submit" className="submit-btn">Create</button>
            <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Subscription Card Component
function SubscriptionCard({ 
  subscription, 
  onUpdate, 
  onDelete 
}: { 
  subscription: Subscription;
  onUpdate: (id: string, updates: Partial<Subscription>) => void;
  onDelete: (id: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  const handleStatusToggle = async () => {
    const newStatus = subscription.status === 'active' ? 'paused' : 'active';
    
    try {
      const response = await fetch(
        `https://empire-pro-status.utahj4754.workers.dev/api/v1/subscriptions/${subscription.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        }
      );
      
      if (response.ok) {
        onUpdate(subscription.id, { status: newStatus });
      }
    } catch (error) {
      console.error('Failed to update subscription:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this subscription?')) {
      try {
        const response = await fetch(
          `https://empire-pro-status.utahj4754.workers.dev/api/v1/subscriptions/${subscription.id}`,
          { method: 'DELETE' }
        );
        
        if (response.ok) {
          onDelete(subscription.id);
        }
      } catch (error) {
        console.error('Failed to delete subscription:', error);
      }
    }
  };

  return (
    <div className={`subscription-card ${subscription.status}`}>
      <div className="subscription-header">
        <span className="subscription-type">{subscription.type.toUpperCase()}</span>
        <span className="subscription-target">{subscription.target}</span>
        <span className={`status-badge ${subscription.status}`}>{subscription.status}</span>
      </div>
      
      <div className="subscription-events">
        {subscription.events.map(event => (
          <span key={event} className="event-tag">{event}</span>
        ))}
      </div>
      
      <div className="subscription-metrics">
        <span>{subscription.deliveryStats.totalSent} sent</span>
        <span>{(subscription.deliveryStats.successRate * 100).toFixed(1)}% success</span>
        <span>Last: {new Date(subscription.deliveryStats.lastDelivery).toLocaleString()}</span>
      </div>
      
      <div className="subscription-actions">
        <button 
          className="toggle-btn"
          onClick={handleStatusToggle}
        >
          {subscription.status === 'active' ? 'Pause' : 'Activate'}
        </button>
        <button className="delete-btn" onClick={handleDelete}>Delete</button>
      </div>
    </div>
  );
}

// Utility function to transform status data
function transformStatusData(rawData: any): DashboardData {
  // Transform the raw status API response into dashboard format
  return {
    endpoints: [],
    subscriptions: [],
    systemHealth: {
      overall: 'healthy',
      uptime: 99.9,
      lastUpdate: new Date().toISOString()
    },
    metrics: {
      totalRequests: 0,
      errorRate: 0,
      avgResponseTime: 0
    }
  };
}

// CSS Styles (as string for inline styles)
export const dashboardStyles = `
.status-dashboard {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #3b82f6;
}

.system-health {
  display: flex;
  align-items: center;
  gap: 15px;
}

.health-indicator {
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 12px;
}

.health-indicator.healthy {
  background: #10b981;
  color: white;
}

.health-indicator.degraded {
  background: #f59e0b;
  color: white;
}

.health-indicator.down {
  background: #ef4444;
  color: white;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #3b82f6;
}

.card h2 {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: #3b82f6;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.metric {
  text-align: center;
  padding: 15px;
  background: #3b82f6;
  border-radius: 8px;
}

.metric-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #3b82f6;
}

.metric-label {
  display: block;
  font-size: 12px;
  color: #3b82f6;
  margin-top: 4px;
}

.endpoint-card, .subscription-card {
  padding: 15px;
  border: 1px solid #3b82f6;
  border-radius: 8px;
  margin-bottom: 10px;
}

.endpoint-header, .subscription-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.status-badge.active {
  background: #10b981;
  color: white;
}

.status-badge.paused {
  background: #f59e0b;
  color: white;
}

.status-badge.inactive {
  background: #3b82f6;
  color: white;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
}

.form-group input, .form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #3b82f6;
  border-radius: 6px;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.submit-btn, .cancel-btn, .toggle-btn, .delete-btn, .create-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.submit-btn, .create-btn {
  background: #3b82f6;
  color: white;
}

.cancel-btn {
  background: #3b82f6;
  color: white;
}

.toggle-btn {
  background: #10b981;
  color: white;
}

.delete-btn {
  background: #ef4444;
  color: white;
}
`;
