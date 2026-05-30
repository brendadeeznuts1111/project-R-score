/**
 * Partner Profile OS — React Component: PartnerProfile
 *
 * Displays full partner profile card with:
 *   - Identity (partner ID, template, display name, email)
 *   - Runtime state (balance, daily used, limits, KYC, risk)
 *   - SOR config (eligible tiers, exposure limits, allowed types)
 *   - Sources table (books, APIs, wallets)
 *   - Settlement terms (commission tiers, payout, makeup)
 *   - Telegram groups
 *   - Lifecycle state badge
 */

import { useState } from "react";

// ---------------------------------------------------------------------------
// Types (mirroring backend schemas)
// ---------------------------------------------------------------------------

interface PartnerProfileData {
  partnerId: string;
  templateId: string;
  displayName: string;
  email: string;
  phone?: string;
  status: string;
  kycStatus: string;
  riskLevel: string;
  opsecScore: number;
  currentBalance: number;
  dailyUsed: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalSettledPnl: number;
  currentLimit: number;
  currentLimits: Record<string, number>;
  jurisdiction: {
    type: string;
    allowed_states?: string[];
    kyc_tier: string;
    tax_form: string;
  };
  sources: {
    defaults: Array<{
      id: string;
      type: string;
      book_id?: string;
      endpoint?: string;
      active: boolean;
      priority: number;
      max_stake: number;
      daily_limit: number;
    }>;
    maxSources: number;
    apiAccess: boolean;
  };
  cultivation: {
    initial_deposit_target: number;
    initial_limit: number;
    limit_raise_target: number;
  };
  settlement: {
    commission_structure: string;
    commission_tiers: Array<{ threshold: number; rate: number }>;
    makeup_enabled: boolean;
    makeup_balance: number;
    payout_cadence: string;
    payout_method: string;
    currency: string;
  };
  sor: {
    eligible_tiers: string[];
    max_exposure_per_signal: number;
    max_daily_exposure: number;
    max_single_bet: number;
    book_whitelist: string[];
    book_blacklist: string[];
    steam_allowed: boolean;
    arb_allowed: boolean;
    clv_allowed: boolean;
    manual_allowed: boolean;
    predictive_allowed: boolean;
  };
  telegram: {
    groups: Array<{ type: string; name: string; auto_create: boolean }>;
    alert_types: string[];
    alert_stake_minimum: number;
  };
  createdAt: number;
  materializedAt?: number;
  activatedAt?: number;
  graduatedAt?: number;
  frozenAt?: number;
  frozenReason?: string;
  terminatedAt?: number;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PartnerProfileProps {
  partner: PartnerProfileData;
  onTransition?: (partnerId: string, event: string, reason: string) => void;
  onDeposit?: (partnerId: string, amount: number) => void;
  onSetLimit?: (partnerId: string, market: string, limit: number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PartnerProfile({
  partner,
  onTransition,
  onDeposit,
  onSetLimit,
}: PartnerProfileProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "sor" | "sources" | "settlement" | "telegram">("overview");
  const [depositAmount, setDepositAmount] = useState("");
  const [limitMarket, setLimitMarket] = useState("");
  const [limitValue, setLimitValue] = useState("");
  const [transitionReason, setTransitionReason] = useState("");

  const statusColor = getStatusColor(partner.status);
  const kycColor = partner.kycStatus === "verified" ? "#22c55e" : partner.kycStatus === "rejected" ? "#ef4444" : "#f59e0b";
  const riskColor = partner.riskLevel === "green" ? "#22c55e" : partner.riskLevel === "yellow" ? "#eab308" : partner.riskLevel === "orange" ? "#f97316" : "#ef4444";

  const remainingDaily = partner.sor.max_daily_exposure - partner.dailyUsed;
  const utilizationPct = partner.sor.max_daily_exposure > 0
    ? (partner.dailyUsed / partner.sor.max_daily_exposure) * 100
    : 0;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 0", borderBottom: "2px solid #e5e7eb" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
            {partner.displayName}
          </h2>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
            {partner.partnerId} | Template: {partner.templateId}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <span style={{
            padding: "4px 12px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            background: statusColor + "20",
            color: statusColor,
          }}>
            {partner.status}
          </span>
          <span style={{
            padding: "4px 12px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            background: kycColor + "20",
            color: kycColor,
          }}>
            KYC: {partner.kycStatus}
          </span>
          <span style={{
            padding: "4px 12px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            background: riskColor + "20",
            color: riskColor,
          }}>
            Risk: {partner.riskLevel}
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, padding: "16px 0" }}>
        <StatCard label="Balance" value={`$${partner.currentBalance.toLocaleString()}`} color="#22c55e" />
        <StatCard label="Daily Used" value={`$${partner.dailyUsed.toLocaleString()}`} color="#3b82f6" />
        <StatCard label="Current Limit" value={`$${partner.currentLimit.toLocaleString()}`} color="#8b5cf6" />
        <StatCard label="OpSec Score" value={`${partner.opsecScore}/100`} color={partner.opsecScore > 50 ? "#ef4444" : "#22c55e"} />
      </div>

      {/* Daily Utilization Bar */}
      <div style={{ padding: "8px 0 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
          <span>Daily Exposure Utilization</span>
          <span>{utilizationPct.toFixed(1)}% (${partner.dailyUsed.toLocaleString()} / ${partner.sor.max_daily_exposure.toLocaleString()})</span>
        </div>
        <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${Math.min(utilizationPct, 100)}%`,
            background: utilizationPct > 90 ? "#ef4444" : utilizationPct > 70 ? "#f59e0b" : "#22c55e",
            borderRadius: 4,
            transition: "width 0.3s ease",
          }} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid #e5e7eb", marginBottom: 16 }}>
        {(["overview", "sor", "sources", "settlement", "telegram"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 20px",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid #3b82f6" : "2px solid transparent",
              background: "transparent",
              color: activeTab === tab ? "#3b82f6" : "#6b7280",
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: "pointer",
              fontSize: 13,
              textTransform: "capitalize",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div>
          {/* Identity */}
          <Section title="Identity">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px 24px", fontSize: 13 }}>
              <Field label="Partner ID" value={partner.partnerId} />
              <Field label="Template" value={partner.templateId} />
              <Field label="Display Name" value={partner.displayName} />
              <Field label="Email" value={partner.email} />
              {partner.phone && <Field label="Phone" value={partner.phone} />}
              <Field label="Created" value={formatDate(partner.createdAt)} />
              {partner.materializedAt && <Field label="Materialized" value={formatDate(partner.materializedAt)} />}
              {partner.activatedAt && <Field label="Activated" value={formatDate(partner.activatedAt)} />}
              {partner.graduatedAt && <Field label="Graduated" value={formatDate(partner.graduatedAt)} />}
              {partner.frozenAt && <Field label="Frozen" value={formatDate(partner.frozenAt)} />}
              {partner.frozenReason && <Field label="Frozen Reason" value={partner.frozenReason} />}
              {partner.terminatedAt && <Field label="Terminated" value={formatDate(partner.terminatedAt)} />}
            </div>
          </Section>

          {/* Financial */}
          <Section title="Financial Summary">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <StatCard label="Total Deposited" value={`$${partner.totalDeposited.toLocaleString()}`} color="#22c55e" />
              <StatCard label="Total Withdrawn" value={`$${partner.totalWithdrawn.toLocaleString()}`} color="#ef4444" />
              <StatCard label="Settled P&L" value={`$${partner.totalSettledPnl.toLocaleString()}`} color={partner.totalSettledPnl >= 0 ? "#22c55e" : "#ef4444"} />
            </div>
          </Section>

          {/* Jurisdiction */}
          <Section title="Jurisdiction">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px 24px", fontSize: 13 }}>
              <Field label="Type" value={partner.jurisdiction.type} />
              <Field label="KYC Tier" value={partner.jurisdiction.kyc_tier} />
              <Field label="Tax Form" value={partner.jurisdiction.tax_form} />
              {partner.jurisdiction.allowed_states && (
                <Field label="Allowed States" value={partner.jurisdiction.allowed_states.join(", ")} />
              )}
            </div>
          </Section>

          {/* Actions */}
          <Section title="Actions">
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <ActionButton label="Approve" onClick={() => onTransition?.(partner.partnerId, "approve", transitionReason)} color="#22c55e" />
              <ActionButton label="Freeze" onClick={() => onTransition?.(partner.partnerId, "freeze", transitionReason)} color="#f59e0b" />
              <ActionButton label="Reactivate" onClick={() => onTransition?.(partner.partnerId, "reactivate", transitionReason)} color="#3b82f6" />
              <ActionButton label="Graduate" onClick={() => onTransition?.(partner.partnerId, "graduate", transitionReason)} color="#8b5cf6" />
            </div>
            <input
              type="text"
              placeholder="Transition reason (optional)"
              value={transitionReason}
              onChange={(e) => setTransitionReason(e.target.value)}
              style={{ marginTop: 8, padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, width: "100%", maxWidth: 400 }}
            />
          </Section>

          <Section title="Quick Deposit">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="number"
                placeholder="Amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, width: 140 }}
              />
              <ActionButton
                label="Deposit"
                onClick={() => {
                  if (depositAmount) onDeposit?.(partner.partnerId, parseFloat(depositAmount));
                  setDepositAmount("");
                }}
                color="#22c55e"
              />
            </div>
          </Section>

          <Section title="Set Market Limit">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                placeholder="Market (e.g. NBA)"
                value={limitMarket}
                onChange={(e) => setLimitMarket(e.target.value)}
                style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, width: 140 }}
              />
              <input
                type="number"
                placeholder="Limit"
                value={limitValue}
                onChange={(e) => setLimitValue(e.target.value)}
                style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, width: 100 }}
              />
              <ActionButton
                label="Set Limit"
                onClick={() => {
                  if (limitMarket && limitValue) onSetLimit?.(partner.partnerId, limitMarket, parseFloat(limitValue));
                  setLimitMarket("");
                  setLimitValue("");
                }}
                color="#3b82f6"
              />
            </div>
            {Object.entries(partner.currentLimits).length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                Current limits: {Object.entries(partner.currentLimits).map(([m, l]) => `${m}: $${l}`).join(", ")}
              </div>
            )}
          </Section>
        </div>
      )}

      {activeTab === "sor" && (
        <div>
          <Section title="SOR Configuration">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px 24px", fontSize: 13 }}>
              <Field label="Eligible Tiers" value={partner.sor.eligible_tiers.join(", ")} />
              <Field label="Max Exposure / Signal" value={`$${partner.sor.max_exposure_per_signal.toLocaleString()}`} />
              <Field label="Max Daily Exposure" value={`$${partner.sor.max_daily_exposure.toLocaleString()}`} />
              <Field label="Max Single Bet" value={`$${partner.sor.max_single_bet.toLocaleString()}`} />
            </div>
          </Section>

          <Section title="Allowed Signal Types">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["steam", "arb", "clv", "manual", "predictive"] as const).map((type) => (
                <TypeBadge key={type} type={type} enabled={partner.sor[`${type}_allowed` as keyof typeof partner.sor] as boolean} />
              ))}
            </div>
          </Section>

          <Section title="Book Lists">
            {partner.sor.book_whitelist.length > 0 && (
              <Field label="Whitelist" value={partner.sor.book_whitelist.join(", ")} />
            )}
            {partner.sor.book_blacklist.length > 0 && (
              <Field label="Blacklist" value={partner.sor.book_blacklist.join(", ")} />
            )}
            {partner.sor.book_whitelist.length === 0 && partner.sor.book_blacklist.length === 0 && (
              <div style={{ fontSize: 13, color: "#6b7280" }}>No book restrictions configured</div>
            )}
          </Section>
        </div>
      )}

      {activeTab === "sources" && (
        <div>
          <Section title={`Sources (${partner.sources.defaults.length} / ${partner.sources.maxSources})`}>
            <div style={{ fontSize: 13, marginBottom: 8 }}>
              <strong>API Access:</strong> {partner.sources.apiAccess ? "Enabled" : "Disabled"}
            </div>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                  <th style={{ padding: "8px 4px" }}>ID</th>
                  <th style={{ padding: "8px 4px" }}>Type</th>
                  <th style={{ padding: "8px 4px" }}>Book</th>
                  <th style={{ padding: "8px 4px" }}>Status</th>
                  <th style={{ padding: "8px 4px" }}>Priority</th>
                  <th style={{ padding: "8px 4px" }}>Max Stake</th>
                  <th style={{ padding: "8px 4px" }}>Daily Limit</th>
                </tr>
              </thead>
              <tbody>
                {partner.sources.defaults.map((src) => (
                  <tr key={src.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "8px 4px", fontFamily: "monospace", fontSize: 12 }}>{src.id}</td>
                    <td style={{ padding: "8px 4px" }}>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                        background: src.type === "book_api" ? "#dbeafe" : src.type === "exchange" ? "#fef3c7" : "#f3e8ff",
                        color: src.type === "book_api" ? "#1e40af" : src.type === "exchange" ? "#92400e" : "#6b21a8",
                      }}>
                        {src.type}
                      </span>
                    </td>
                    <td style={{ padding: "8px 4px" }}>{src.book_id ?? "-"}</td>
                    <td style={{ padding: "8px 4px" }}>
                      <span style={{ color: src.active ? "#22c55e" : "#9ca3af", fontWeight: 600 }}>
                        {src.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "8px 4px" }}>{src.priority}</td>
                    <td style={{ padding: "8px 4px" }}>${src.max_stake.toLocaleString()}</td>
                    <td style={{ padding: "8px 4px" }}>${src.daily_limit.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </div>
      )}

      {activeTab === "settlement" && (
        <div>
          <Section title="Commission Terms">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px 24px", fontSize: 13 }}>
              <Field label="Structure" value={partner.settlement.commission_structure} />
              <Field label="Payout Cadence" value={partner.settlement.payout_cadence} />
              <Field label="Payout Method" value={partner.settlement.payout_method} />
              <Field label="Currency" value={partner.settlement.currency} />
              <Field label="Makeup Enabled" value={partner.settlement.makeup_enabled ? "Yes" : "No"} />
              {partner.settlement.makeup_enabled && (
                <Field label="Makeup Balance" value={`$${partner.settlement.makeup_balance.toLocaleString()}`} />
              )}
            </div>
          </Section>

          <Section title="Commission Tiers">
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                  <th style={{ padding: "8px 4px" }}>Threshold</th>
                  <th style={{ padding: "8px 4px" }}>Rate</th>
                </tr>
              </thead>
              <tbody>
                {partner.settlement.commission_tiers.map((tier, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "8px 4px" }}>${tier.threshold.toLocaleString()}</td>
                    <td style={{ padding: "8px 4px" }}>{(tier.rate * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </div>
      )}

      {activeTab === "telegram" && (
        <div>
          <Section title="Telegram Groups">
            <div style={{ fontSize: 13, marginBottom: 8 }}>
              <strong>Alert Stake Minimum:</strong> ${partner.telegram.alert_stake_minimum.toLocaleString()}
            </div>
            <div style={{ fontSize: 13, marginBottom: 12 }}>
              <strong>Alert Types:</strong> {partner.telegram.alert_types.join(", ")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {partner.telegram.groups.map((g) => (
                <div key={g.type} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "#f9fafb",
                  borderRadius: 8,
                  fontSize: 13,
                }}>
                  <div>
                    <strong style={{ textTransform: "capitalize" }}>{g.type}</strong>
                    <div style={{ color: "#6b7280", fontSize: 12 }}>{g.name}</div>
                  </div>
                  {g.auto_create && (
                    <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>Auto-create</span>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {title}
      </h3>
      <div>{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ color: "#6b7280" }}>{label}: </span>
      <strong>{value}</strong>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: 14,
      borderRadius: 8,
      background: color + "08",
      border: `1px solid ${color}20`,
    }}>
      <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>
        {value}
      </div>
    </div>
  );
}

function TypeBadge({ type, enabled }: { type: string; enabled: boolean }) {
  return (
    <span style={{
      padding: "4px 12px",
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 600,
      background: enabled ? "#dcfce7" : "#f3f4f6",
      color: enabled ? "#166534" : "#9ca3af",
    }}>
      {type.toUpperCase()}
    </span>
  );
}

function ActionButton({ label, onClick, color }: { label: string; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: 6,
        border: `1px solid ${color}`,
        background: color + "15",
        color,
        fontWeight: 600,
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: "#22c55e",
    cultivating: "#3b82f6",
    graduated: "#8b5cf6",
    materialized: "#f59e0b",
    kyc_pending: "#f97316",
    frozen: "#06b6d4",
    suspended: "#ef4444",
    terminated: "#6b7280",
    signup: "#9ca3af",
  };
  return colors[status] ?? "#6b7280";
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
