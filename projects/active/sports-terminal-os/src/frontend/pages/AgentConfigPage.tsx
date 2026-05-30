/**
 * AgentConfigPage — Agent Configuration
 *
 * - Agent settings form
 * - Telegram bot configuration
 * - Webhook URLs
 * - API keys management (masked)
 * - Feature toggles
 * - Save/reset buttons
 */

import React, { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentSettings {
  agentName: string;
  commissionRate: number;
  maxPlayers: number;
  autoApprove: boolean;
  riskThreshold: number;
  alertChannel: string;
  language: string;
}

interface TelegramConfig {
  botToken: string;
  chatId: string;
  alertEnabled: boolean;
  reportEnabled: boolean;
  dailySummary: boolean;
}

interface WebhookConfig {
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AgentConfigPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"settings" | "telegram" | "webhooks" | "keys">("settings");
  const [saved, setSaved] = useState(false);

  const [settings, setSettings] = useState<AgentSettings>({
    agentName: "Main Agent",
    commissionRate: 25,
    maxPlayers: 100,
    autoApprove: false,
    riskThreshold: 70,
    alertChannel: "telegram",
    language: "en",
  });

  const [telegram, setTelegram] = useState<TelegramConfig>({
    botToken: "",
    chatId: "",
    alertEnabled: true,
    reportEnabled: true,
    dailySummary: false,
  });

  const [webhook, setWebhook] = useState<WebhookConfig>({
    url: "",
    secret: "",
    events: ["risk_alert", "wager_event"],
    enabled: false,
  });

  const [apiKeys] = useState<ApiKey[]>([
    { id: "key1", name: "Production API Key", key: "sk_prod_xxxxxxxxxxxx", createdAt: "2026-01-01", lastUsed: "2026-01-12" },
    { id: "key2", name: "Staging API Key", key: "sk_staging_xxxxxxxx", createdAt: "2026-01-05", lastUsed: "2026-01-11" },
  ]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setSettings({
      agentName: "Main Agent",
      commissionRate: 25,
      maxPlayers: 100,
      autoApprove: false,
      riskThreshold: 70,
      alertChannel: "telegram",
      language: "en",
    });
    setTelegram({
      botToken: "",
      chatId: "",
      alertEnabled: true,
      reportEnabled: true,
      dailySummary: false,
    });
    setWebhook({
      url: "",
      secret: "",
      events: ["risk_alert", "wager_event"],
      enabled: false,
    });
  };

  const toggleWebhookEvent = (event: string) => {
    setWebhook((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  const TABS = [
    { id: "settings" as const, label: "Settings" },
    { id: "telegram" as const, label: "Telegram" },
    { id: "webhooks" as const, label: "Webhooks" },
    { id: "keys" as const, label: "API Keys" },
  ];

  return (
    <div className="page-container" style={{ maxWidth: 900 }}>
      <h1>Agent Configuration</h1>
      <p className="page-description">Configure agent settings, integrations, and API keys.</p>

      {/* Tabs */}
      <div className="config-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`config-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="config-panel">
          <div className="config-form">
            <div className="form-row">
              <label>Agent Name</label>
              <input
                type="text"
                value={settings.agentName}
                onChange={(e) => setSettings((s) => ({ ...s, agentName: e.target.value }))}
              />
            </div>
            <div className="form-row">
              <label>Commission Rate (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.commissionRate}
                onChange={(e) => setSettings((s) => ({ ...s, commissionRate: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="form-row">
              <label>Max Players</label>
              <input
                type="number"
                min={1}
                max={10000}
                value={settings.maxPlayers}
                onChange={(e) => setSettings((s) => ({ ...s, maxPlayers: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="form-row">
              <label>Risk Threshold (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.riskThreshold}
                onChange={(e) => setSettings((s) => ({ ...s, riskThreshold: parseInt(e.target.value) || 0 }))}
              />
              <small>Alert when risk score exceeds this threshold</small>
            </div>
            <div className="form-row">
              <label>Alert Channel</label>
              <select
                value={settings.alertChannel}
                onChange={(e) => setSettings((s) => ({ ...s, alertChannel: e.target.value }))}
              >
                <option value="telegram">Telegram</option>
                <option value="webhook">Webhook</option>
                <option value="both">Both</option>
                <option value="none">None</option>
              </select>
            </div>
            <div className="form-row">
              <label>Language</label>
              <select
                value={settings.language}
                onChange={(e) => setSettings((s) => ({ ...s, language: e.target.value }))}
              >
                <option value="en">English</option>
                <option value="zh">Chinese</option>
                <option value="es">Spanish</option>
              </select>
            </div>
            <div className="form-row checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={settings.autoApprove}
                  onChange={(e) => setSettings((s) => ({ ...s, autoApprove: e.target.checked }))}
                />
                Auto-approve player registrations
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Telegram Tab */}
      {activeTab === "telegram" && (
        <div className="config-panel">
          <div className="config-form">
            <div className="form-row">
              <label>Bot Token</label>
              <input
                type="password"
                placeholder="Enter Telegram bot token"
                value={telegram.botToken}
                onChange={(e) => setTelegram((t) => ({ ...t, botToken: e.target.value }))}
              />
            </div>
            <div className="form-row">
              <label>Chat ID</label>
              <input
                type="text"
                placeholder="Enter chat ID or channel"
                value={telegram.chatId}
                onChange={(e) => setTelegram((t) => ({ ...t, chatId: e.target.value }))}
              />
            </div>
            <div className="form-row checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={telegram.alertEnabled}
                  onChange={(e) => setTelegram((t) => ({ ...t, alertEnabled: e.target.checked }))}
                />
                Enable risk alerts
              </label>
            </div>
            <div className="form-row checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={telegram.reportEnabled}
                  onChange={(e) => setTelegram((t) => ({ ...t, reportEnabled: e.target.checked }))}
                />
                Enable periodic reports
              </label>
            </div>
            <div className="form-row checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={telegram.dailySummary}
                  onChange={(e) => setTelegram((t) => ({ ...t, dailySummary: e.target.checked }))}
                />
                Send daily summary
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === "webhooks" && (
        <div className="config-panel">
          <div className="config-form">
            <div className="form-row checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={webhook.enabled}
                  onChange={(e) => setWebhook((w) => ({ ...w, enabled: e.target.checked }))}
                />
                Enable webhook delivery
              </label>
            </div>
            <div className="form-row">
              <label>Webhook URL</label>
              <input
                type="url"
                placeholder="https://your-endpoint.com/webhook"
                value={webhook.url}
                onChange={(e) => setWebhook((w) => ({ ...w, url: e.target.value }))}
              />
            </div>
            <div className="form-row">
              <label>Webhook Secret</label>
              <input
                type="password"
                placeholder="Shared secret for HMAC verification"
                value={webhook.secret}
                onChange={(e) => setWebhook((w) => ({ ...w, secret: e.target.value }))}
              />
            </div>
            <div className="form-row">
              <label>Event Subscriptions</label>
              <div className="webhook-events">
                {["risk_alert", "wager_event", "player_signup", "enforcement_action", "system_alert"].map((event) => (
                  <label key={event} className="webhook-event-checkbox">
                    <input
                      type="checkbox"
                      checked={webhook.events.includes(event)}
                      onChange={() => toggleWebhookEvent(event)}
                    />
                    {event.replace("_", " ")}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === "keys" && (
        <div className="config-panel">
          <div className="api-keys-list">
            {apiKeys.map((k) => (
              <div key={k.id} className="api-key-card">
                <div className="api-key-info">
                  <div className="api-key-name">{k.name}</div>
                  <code className="api-key-value">{k.key}</code>
                  <div className="api-key-meta">
                    Created: {k.createdAt} | Last used: {k.lastUsed}
                  </div>
                </div>
                <div className="api-key-actions">
                  <button className="btn btn-sm">Regenerate</button>
                  <button className="btn btn-sm btn-danger">Revoke</button>
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary">+ Add API Key</button>
        </div>
      )}

      {/* Action bar */}
      <div className="config-actions">
        <button className="btn btn-primary" onClick={handleSave}>
          {saved ? "✓ Saved!" : "Save Changes"}
        </button>
        <button className="btn" onClick={handleReset}>Reset to Defaults</button>
      </div>
    </div>
  );
};

export default AgentConfigPage;
