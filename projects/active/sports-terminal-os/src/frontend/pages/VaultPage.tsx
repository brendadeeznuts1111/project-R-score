/**
 * VaultPage — Secrets Vault UI
 *
 * - List of stored secrets (names only, values masked)
 * - Add secret: name + value form
 * - Delete secret
 * - Secret categories: API keys, tokens, passwords
 * - Access audit: who accessed what when
 */

import React, { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SecretCategory = "api_key" | "token" | "password" | "webhook" | "other";

interface Secret {
  id: string;
  name: string;
  category: SecretCategory;
  createdAt: string;
  updatedAt: string;
  accessCount: number;
}

interface AccessAuditEntry {
  id: string;
  timestamp: number;
  actor: string;
  action: "view" | "create" | "update" | "delete";
  secretName: string;
  ip?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<SecretCategory, string> = {
  api_key: "API Key",
  token: "Token",
  password: "Password",
  webhook: "Webhook",
  other: "Other",
};

const CATEGORY_COLORS: Record<SecretCategory, string> = {
  api_key: "#4a9eff",
  token: "#9c27b0",
  password: "#ff9800",
  webhook: "#4caf50",
  other: "#6a6a80",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const VaultPage: React.FC = () => {
  const [secrets, setSecrets] = useState<Secret[]>([
    { id: "s1", name: "KIMI_API_KEY", category: "api_key", createdAt: "2026-01-01", updatedAt: "2026-01-10", accessCount: 245 },
    { id: "s2", name: "PROXY_AUTH_TOKEN", category: "token", createdAt: "2026-01-02", updatedAt: "2026-01-11", accessCount: 1892 },
    { id: "s3", name: "DATABASE_PASSWORD", category: "password", createdAt: "2026-01-01", updatedAt: "2026-01-01", accessCount: 12 },
    { id: "s4", name: "TELEGRAM_BOT_TOKEN", category: "token", createdAt: "2026-01-03", updatedAt: "2026-01-09", accessCount: 567 },
    { id: "s5", name: "JWT_SECRET", category: "other", createdAt: "2026-01-01", updatedAt: "2026-01-01", accessCount: 3 },
    { id: "s6", name: "WEBHOOK_SECRET", category: "webhook", createdAt: "2026-01-05", updatedAt: "2026-01-08", accessCount: 89 },
    { id: "s7", name: "REDIS_PASSWORD", category: "password", createdAt: "2026-01-01", updatedAt: "2026-01-01", accessCount: 8 },
    { id: "s8", name: "THIRD_PARTY_API_KEY", category: "api_key", createdAt: "2026-01-06", updatedAt: "2026-01-12", accessCount: 156 },
  ]);

  const [audit] = useState<AccessAuditEntry[]>([
    { id: "a1", timestamp: Date.now() - 300000, actor: "admin", action: "view", secretName: "KIMI_API_KEY", ip: "192.168.1.10" },
    { id: "a2", timestamp: Date.now() - 600000, actor: "system", action: "view", secretName: "PROXY_AUTH_TOKEN", ip: "127.0.0.1" },
    { id: "a3", timestamp: Date.now() - 1800000, actor: "admin", action: "update", secretName: "WEBHOOK_SECRET", ip: "192.168.1.10" },
    { id: "a4", timestamp: Date.now() - 3600000, actor: "api_user", action: "view", secretName: "THIRD_PARTY_API_KEY", ip: "192.168.1.25" },
    { id: "a5", timestamp: Date.now() - 7200000, actor: "admin", action: "create", secretName: "NEW_INTEGRATION_KEY", ip: "192.168.1.10" },
    { id: "a6", timestamp: Date.now() - 86400000, actor: "system", action: "view", secretName: "DATABASE_PASSWORD", ip: "127.0.0.1" },
    { id: "a7", timestamp: Date.now() - 172800000, actor: "admin", action: "delete", secretName: "OLD_API_KEY", ip: "192.168.1.10" },
  ]);

  const [activeTab, setActiveTab] = useState<"secrets" | "audit">("secrets");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newCategory, setNewCategory] = useState<SecretCategory>("other");
  const [filterCategory, setFilterCategory] = useState<SecretCategory | "all">("all");
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newName.trim() || !newValue.trim()) return;
    const secret: Secret = {
      id: `s_${Date.now()}`,
      name: newName.trim(),
      category: newCategory,
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
      accessCount: 0,
    };
    setSecrets((prev) => [secret, ...prev]);
    setNewName("");
    setNewValue("");
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this secret? This action cannot be undone.")) {
      setSecrets((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const filteredSecrets = filterCategory === "all"
    ? secrets
    : secrets.filter((s) => s.category === filterCategory);

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const getActionIcon = (action: AccessAuditEntry["action"]) => {
    switch (action) {
      case "view": return "👁";
      case "create": return "+";
      case "update": return "✎";
      case "delete": return "🗑";
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 1000 }}>
      <h1>Secrets Vault</h1>
      <p className="page-description">Securely manage API keys, tokens, and passwords. Values are encrypted at rest.</p>

      {/* Tabs */}
      <div className="vault-tabs">
        <button
          className={`vault-tab ${activeTab === "secrets" ? "active" : ""}`}
          onClick={() => setActiveTab("secrets")}
        >
          Secrets ({secrets.length})
        </button>
        <button
          className={`vault-tab ${activeTab === "audit" ? "active" : ""}`}
          onClick={() => setActiveTab("audit")}
        >
          Access Audit ({audit.length})
        </button>
      </div>

      {activeTab === "secrets" && (
        <>
          {/* Toolbar */}
          <div className="vault-toolbar">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as SecretCategory | "all")}
              className="filter-select"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? "Cancel" : "+ Add Secret"}
            </button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <div className="vault-add-form">
              <h3>Add New Secret</h3>
              <div className="form-row">
                <label>Name</label>
                <input
                  type="text"
                  placeholder="e.g., STRIPE_API_KEY"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-row">
                <label>Value</label>
                <input
                  type="password"
                  placeholder="Secret value"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                />
              </div>
              <div className="form-row">
                <label>Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as SecretCategory)}
                >
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary" onClick={handleAdd} disabled={!newName.trim() || !newValue.trim()}>
                Save Secret
              </button>
            </div>
          )}

          {/* Secrets list */}
          <div className="secrets-list">
            {filteredSecrets.map((secret) => (
              <div key={secret.id} className="secret-card">
                <div className="secret-main">
                  <div className="secret-header">
                    <span
                      className="secret-category-badge"
                      style={{ background: CATEGORY_COLORS[secret.category] + "20", color: CATEGORY_COLORS[secret.category] }}
                    >
                      {CATEGORY_LABELS[secret.category]}
                    </span>
                    <span className="secret-name">{secret.name}</span>
                  </div>
                  <div className="secret-value-row">
                    <code className="secret-value">
                      {revealedSecret === secret.id ? "sk-xxxxxxxxxxxx (revealed)" : "••••••••••••••••••••"}
                    </code>
                    <button
                      className="btn btn-sm"
                      onClick={() => setRevealedSecret(revealedSecret === secret.id ? null : secret.id)}
                    >
                      {revealedSecret === secret.id ? "🙈 Hide" : "👁 Reveal"}
                    </button>
                  </div>
                  <div className="secret-meta">
                    <span>Created: {secret.createdAt}</span>
                    <span>Updated: {secret.updatedAt}</span>
                    <span>Accessed: {secret.accessCount} times</span>
                  </div>
                </div>
                <div className="secret-actions">
                  <button className="btn btn-sm" title="Edit">✎</button>
                  <button className="btn btn-sm btn-danger" title="Delete" onClick={() => handleDelete(secret.id)}>🗑</button>
                </div>
              </div>
            ))}
            {filteredSecrets.length === 0 && (
              <div className="vault-empty">No secrets in this category</div>
            )}
          </div>
        </>
      )}

      {activeTab === "audit" && (
        <div className="audit-list">
          {audit.map((entry) => (
            <div key={entry.id} className="audit-entry">
              <div className="audit-icon">{getActionIcon(entry.action)}</div>
              <div className="audit-info">
                <div className="audit-header">
                  <code className="audit-actor">{entry.actor}</code>
                  <span className="audit-action">{entry.action}d</span>
                  <code className="audit-secret">{entry.secretName}</code>
                </div>
                <div className="audit-meta">
                  <span>{formatTime(entry.timestamp)}</span>
                  {entry.ip && <span>from {entry.ip}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VaultPage;
