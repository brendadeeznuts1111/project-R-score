/**
 * Partner Profile OS — In-Memory Service
 *
 * Singleton service managing all partner gateways:
 *   - Map<partnerId, PartnerGateway> — in-memory gateway cache
 *   - SQLite persistence for durable state
 *   - refreshBookIndex() — O(1) book-to-partners lookup
 *   - routeSignal(signal) — O(m) where m = partners with this book
 *   - Full CRUD: createPartner, getPartner, updatePartner, deletePartner, listPartners
 *   - Lifecycle: transitionState(partnerId, newState, triggeredBy, reason)
 */

import { type Database } from "bun:sqlite";
import {
  type PartnerProfile,
  type PartnerRuntimeState,
  type ProfileTemplate,
  type GateResult,
  type SignalContext,
  type LifecycleState,
  PartnerProfileSchema,
  PartnerRuntimeStateSchema,
} from "./partner-profile-schema";
import { PartnerGateway } from "./partner-gateway";
import { materializeProfile, transitionProfile } from "./partner-profile-materializer";
import { loadAndCacheTemplates, getTemplate } from "./partner-profile-loader";

export class PartnerProfileService {
  /** In-memory gateway cache: partnerId -> PartnerGateway */
  private gateways: Map<string, PartnerGateway> = new Map();

  /** Book index: bookId -> Set<partnerId> for O(1) signal routing */
  private bookIndex: Map<string, Set<string>> = new Map();

  /** SQLite database reference (set from outside) */
  public db: Database | null = null;

  // ── Boot ──

  /**
   * Load all templates from disk, cache them, and (optionally) restore partners from DB.
   */
  async loadFromTemplates(templateDir: string = "./profiles"): Promise<void> {
    await loadAndCacheTemplates(templateDir);
    console.log(`[SERVICE] Templates loaded, ready for partner creation`);
  }

  // ── Partner CRUD ──

  /**
   * Create a new partner from a template.
   *
   * @param partnerId  Unique partner identifier
   * @param templateId Template ID (must be loaded)
   * @param overrides  Optional profile/runtime overrides
   * @returns PartnerGateway for the new partner
   */
  createPartner(
    partnerId: string,
    templateId: string,
    overrides?: {
      profile?: Partial<Omit<PartnerProfile, "partner_id" | "template_id">>;
      runtime?: Partial<PartnerRuntimeState>;
    }
  ): PartnerGateway {
    // Duplicate check
    if (this.gateways.has(partnerId)) {
      throw new Error(`Partner '${partnerId}' already exists`);
    }

    const template = getTemplate(templateId);
    if (!template) {
      const available = Array.from((getTemplate as any).templates?.keys?.() ?? []);
      throw new Error(
        `Template '${templateId}' not found. Available templates must be loaded first.`
      );
    }

    const { profile, runtime } = materializeProfile(partnerId, template, overrides);
    const gateway = new PartnerGateway(profile, runtime);
    this.gateways.set(partnerId, gateway);

    console.log(`[SERVICE] Partner ${partnerId} created from template ${templateId}`);
    return gateway;
  }

  /** Get a partner gateway by ID. O(1) */
  getGateway(partnerId: string): PartnerGateway | undefined {
    return this.gateways.get(partnerId);
  }

  /** Get a partner profile by ID. O(1) */
  getProfile(partnerId: string): PartnerProfile | undefined {
    return this.gateways.get(partnerId)?.profile;
  }

  /** Get a partner runtime by ID. O(1) */
  getRuntime(partnerId: string): PartnerRuntimeState | undefined {
    return this.gateways.get(partnerId)?.runtime;
  }

  /**
   * Update a partner's runtime state (partial merge).
   */
  updateRuntime(partnerId: string, update: Partial<PartnerRuntimeState>): void {
    const gateway = this.gateways.get(partnerId);
    if (!gateway) throw new Error(`Partner '${partnerId}' not found`);
    Object.assign(gateway.runtime, update);
  }

  /**
   * Update a partner's profile fields (partial merge).
   */
  updateProfile(partnerId: string, update: Partial<PartnerProfile>): void {
    const gateway = this.gateways.get(partnerId);
    if (!gateway) throw new Error(`Partner '${partnerId}' not found`);
    Object.assign(gateway.profile, update);
  }

  /**
   * Soft-delete (terminate) a partner.
   */
  deletePartner(partnerId: string, reason?: string): void {
    const gateway = this.gateways.get(partnerId);
    if (!gateway) throw new Error(`Partner '${partnerId}' not found`);

    gateway.profile.state = "terminated";
    gateway.profile.terminated_at = Math.floor(Date.now() / 1000);

    // Remove from book index
    this.refreshBookIndex();

    console.log(`[SERVICE] Partner ${partnerId} terminated: ${reason ?? "no reason"}`);
  }

  /**
   * List all partners with optional filtering.
   */
  listPartners(options?: {
    status?: LifecycleState;
    templateId?: string;
    kycStatus?: "pending" | "verified" | "rejected";
    limit?: number;
    offset?: number;
  }): Array<{
    partnerId: string;
    templateId: string;
    displayName: string;
    email: string;
    status: LifecycleState;
    kycStatus: string;
    currentBalance: number;
    dailyUsed: number;
    currentLimit: number;
    opsecScore: number;
    riskLevel: string;
    createdAt: number;
  }> {
    const results: ReturnType<PartnerProfileService["listPartners"]> = [];

    for (const [partnerId, gw] of this.gateways) {
      const p = gw.profile;
      const r = gw.runtime;

      if (options?.status && p.state !== options.status) continue;
      if (options?.templateId && p.template_id !== options.templateId) continue;
      if (options?.kycStatus && r.kycStatus !== options.kycStatus) continue;

      results.push({
        partnerId,
        templateId: p.template_id,
        displayName: p.display_name,
        email: p.email,
        status: p.state,
        kycStatus: r.kycStatus,
        currentBalance: r.currentBalance,
        dailyUsed: r.dailyUsed,
        currentLimit: r.currentLimit,
        opsecScore: r.opsecScore,
        riskLevel: r.riskLevel,
        createdAt: p.created_at,
      });
    }

    // Sort by createdAt desc
    results.sort((a, b) => b.createdAt - a.createdAt);

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    return results.slice(offset, offset + limit);
  }

  // ── Lifecycle ──

  /**
   * Transition a partner's lifecycle state with guard checks.
   */
  transitionState(
    partnerId: string,
    newState: LifecycleState,
    triggeredBy: string = "system",
    reason?: string
  ): PartnerGateway {
    const gateway = this.gateways.get(partnerId);
    if (!gateway) throw new Error(`Partner '${partnerId}' not found`);

    transitionProfile(gateway.profile, gateway.runtime, newState, triggeredBy, reason);
    return gateway;
  }

  /**
   * Reset daily exposure for all partners. Typically called by cron at midnight.
   */
  resetAllDailyExposure(): void {
    for (const gw of this.gateways.values()) {
      gw.resetDaily();
    }
    console.log(`[SERVICE] Daily exposure reset for ${this.gateways.size} partners`);
  }

  // ── Book Index & Signal Routing ──

  /**
   * Build O(1) book-to-partners lookup index.
   * Call once at boot and after hot-reload.
   */
  refreshBookIndex(): void {
    this.bookIndex.clear();
    for (const [partnerId, gateway] of this.gateways) {
      for (const source of gateway.profile.sources.defaults) {
        if (source.book_id && source.active) {
          if (!this.bookIndex.has(source.book_id)) {
            this.bookIndex.set(source.book_id, new Set());
          }
          this.bookIndex.get(source.book_id)!.add(partnerId);
        }
      }
    }
    console.log(
      `[INDEX] ${this.bookIndex.size} books indexed across ${this.gateways.size} partners`
    );
  }

  /**
   * Route a signal to all candidate partners with the book.
   * O(m) where m = partners with this book (typically < 50).
   */
  routeSignal(signal: SignalContext): Array<{ partnerId: string; result: GateResult }> {
    const candidates = this.bookIndex.get(signal.bookId);
    if (!candidates || candidates.size === 0) {
      return [];
    }

    const results: Array<{ partnerId: string; result: GateResult }> = [];
    for (const partnerId of candidates) {
      const gateway = this.gateways.get(partnerId);
      if (!gateway) continue;

      // Fast pre-filter: state must be active/graduated
      if (gateway.profile.state !== "active" && gateway.profile.state !== "graduated") {
        continue;
      }

      const result = gateway.evaluate(signal);
      results.push({ partnerId, result });

      if (result.allowed) {
        const stake = result.adjustedStake ?? signal.suggestedStake;
        gateway.recordExposure(stake);
      }
    }

    return results;
  }

  // ── SOR Query Shortcuts ──

  isSOREligible(partnerId: string, tier: string): boolean {
    const gateway = this.gateways.get(partnerId);
    if (!gateway) return false;
    return gateway.profile.sor.eligible_tiers.includes(tier as any);
  }

  isBookAllowed(partnerId: string, book: string): boolean {
    const gateway = this.gateways.get(partnerId);
    if (!gateway) return false;
    const { book_whitelist, book_blacklist } = gateway.profile.sor;
    if (book_blacklist.includes(book)) return false;
    if (book_whitelist.length > 0 && !book_whitelist.includes(book)) return false;
    return true;
  }

  isSteamAllowed(partnerId: string): boolean {
    return this.gateways.get(partnerId)?.profile.sor.steam_allowed ?? false;
  }

  isArbAllowed(partnerId: string): boolean {
    return this.gateways.get(partnerId)?.profile.sor.arb_allowed ?? false;
  }

  isCLVAllowed(partnerId: string): boolean {
    return this.gateways.get(partnerId)?.profile.sor.clv_allowed ?? false;
  }

  getMaxExposurePerSignal(partnerId: string): number {
    return this.gateways.get(partnerId)?.profile.sor.max_exposure_per_signal ?? 0;
  }

  getMaxDailyExposure(partnerId: string): number {
    return this.gateways.get(partnerId)?.profile.sor.max_daily_exposure ?? 0;
  }

  // ── Settlement Queries ──

  getCommissionRate(partnerId: string, volume: number): number {
    const gateway = this.gateways.get(partnerId);
    if (!gateway) return 0;
    return gateway.getCommissionRate(volume);
  }

  getPayoutCadence(partnerId: string): string {
    return this.gateways.get(partnerId)?.profile.settlement.payout_cadence ?? "monthly";
  }

  // ── Dashboard ──

  /** Render ANSI dashboard of partner activity. */
  renderDashboard(termWidth: number = 120): string {
    const lines: string[] = [];
    lines.push("═".repeat(termWidth));
    lines.push("  PARTNER PROFILE OS — DASHBOARD".padEnd(termWidth));
    lines.push("═".repeat(termWidth));
    lines.push(`  Total Partners: ${this.gateways.size} | Books Indexed: ${this.bookIndex.size}`);
    lines.push("─".repeat(termWidth));

    // Status breakdown
    const byStatus: Record<string, number> = {};
    for (const gw of this.gateways.values()) {
      byStatus[gw.profile.state] = (byStatus[gw.profile.state] ?? 0) + 1;
    }
    lines.push(`  By Status: ${Object.entries(byStatus).map(([s, c]) => `${s}=${c}`).join(" | ")}`);
    lines.push("─".repeat(termWidth));

    // Recent partner list
    for (const [pid, gw] of this.gateways) {
      const r = gw.runtime;
      const line = `  ${pid.padEnd(16)} | ${gw.profile.state.padEnd(12)} | balance=${r.currentBalance.toFixed(2).padStart(10)} | daily=${r.dailyUsed.toFixed(2).padStart(10)} | kyc=${r.kycStatus} | risk=${r.riskLevel}`;
      lines.push(line);
    }
    lines.push("═".repeat(termWidth));
    return lines.join("\n");
  }

  // ── Internal ──

  getAllGateways(): ReadonlyMap<string, PartnerGateway> {
    return this.gateways;
  }

  getBookIndex(): ReadonlyMap<string, ReadonlySet<string>> {
    return this.bookIndex;
  }
}

/** Singleton instance */
export const partnerProfileService = new PartnerProfileService();
