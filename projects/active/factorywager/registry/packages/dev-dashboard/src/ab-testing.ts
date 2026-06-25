/**
 * A/B testing with agent (client) tracking.
 * Experiments in memory; assignments in cookie dw_exp_${experimentId}.
 * AgentId: cookie dw_agent_id or ws.data.clientId.
 */

const COOKIE_PREFIX = 'dw_exp_';
const AGENT_COOKIE = 'dw_agent_id';

export interface ExperimentVariant {
  id: string;
  name: string;
  weight: number; // 0-1, relative
}

export interface Experiment {
  id: string;
  name: string;
  variants: ExperimentVariant[];
  startAt: number;
  endAt: number;
  status: 'draft' | 'running' | 'paused' | 'ended';
  createdAt: number;
}

export interface InteractionRecord {
  agentId: string;
  experimentId: string;
  variantId: string;
  action: string;
  target?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface VariantMetrics {
  variantId: string;
  variantName: string;
  assignments: number;
  interactions: number;
  conversions: number;
  engagement: number;
  timeSpentMs: number;
}

function generateId(): string {
  return `exp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeWeights(variants: ExperimentVariant[]): ExperimentVariant[] {
  const total = variants.reduce((s, v) => s + (v.weight || 0), 0);
  if (total <= 0) {
    return variants.map((v, i) => ({ ...v, weight: 1 / variants.length }));
  }
  return variants.map((v) => ({ ...v, weight: (v.weight || 0) / total }));
}

export class ABTestingFramework {
  private experiments = new Map<string, Experiment>();
  private assignments = new Map<string, string>(); // agentId -> variantId (in-memory cache; cookie is source of truth)
  private interactions: InteractionRecord[] = [];
  private readonly maxInteractions = 10_000;

  createExperiment(
    name: string,
    variants: ExperimentVariant[],
    options?: { startAt?: number; endAt?: number }
  ): Experiment {
    if (variants.length < 2) {
      throw new Error('At least 2 variants required');
    }
    const id = generateId();
    const normalized = normalizeWeights(variants);
    const now = Date.now();
    const experiment: Experiment = {
      id,
      name,
      variants: normalized,
      startAt: options?.startAt ?? now,
      endAt: options?.endAt ?? now + 7 * 24 * 60 * 60 * 1000, // 7 days default
      status: 'running',
      createdAt: now,
    };
    this.experiments.set(id, experiment);
    return experiment;
  }

  getExperiment(experimentId: string): Experiment | null {
    return this.experiments.get(experimentId) ?? null;
  }

  listExperiments(): Experiment[] {
    return Array.from(this.experiments.values());
  }

  /**
   * Assign variant for agent (weighted random). Persist in cookie; return variantId.
   */
  assignVariant(
    experimentId: string,
    agentId: string,
    cookieHeader: string | null
  ): { variantId: string; variantName: string; setCookieHeader?: string } | null {
    const exp = this.experiments.get(experimentId);
    if (!exp || exp.status !== 'running') return null;
    const now = Date.now();
    if (now < exp.startAt || now > exp.endAt) return null;

    const cookies = new Bun.CookieMap(cookieHeader || '');
    const cookieKey = COOKIE_PREFIX + experimentId;
    const existing = cookies.get(cookieKey);
    if (existing) {
      const parsed = existing.split(':');
      const variantId = parsed[0];
      const v = exp.variants.find((x) => x.id === variantId);
      if (v) return { variantId, variantName: v.name };
    }

    let r = Math.random();
    let variantId = exp.variants[0].id;
    let variantName = exp.variants[0].name;
    for (const v of exp.variants) {
      r -= v.weight;
      if (r <= 0) {
        variantId = v.id;
        variantName = v.name;
        break;
      }
    }

    const cookieValue = `${variantId}:${now}`;
    const setCookie = `${cookieKey}=${encodeURIComponent(cookieValue)}; Path=/; Max-Age=${365 * 24 * 60 * 60}; SameSite=Lax`;
    return { variantId, variantName, setCookieHeader: setCookie };
  }

  recordInteraction(
    agentId: string,
    experimentId: string,
    variantId: string,
    action: string,
    options?: { target?: string; metadata?: Record<string, unknown> }
  ): void {
    const exp = this.experiments.get(experimentId);
    if (!exp) return;
    this.interactions.push({
      agentId,
      experimentId,
      variantId,
      action,
      target: options?.target,
      metadata: options?.metadata,
      timestamp: Date.now(),
    });
    if (this.interactions.length > this.maxInteractions) {
      this.interactions.shift();
    }
  }

  getInteractionsForAgent(agentId: string): { action: string; timestamp: number }[] {
    return this.interactions
      .filter((r) => r.agentId === agentId)
      .map((r) => ({ action: r.action, timestamp: r.timestamp }));
  }

  getResults(experimentId: string): { experiment: Experiment; metrics: VariantMetrics[] } | null {
    const exp = this.experiments.get(experimentId);
    if (!exp) return null;
    const byVariant = new Map<string, { assignments: Set<string>; interactions: number; conversions: number; engagement: number; timeSpentMs: number }>();
    for (const v of exp.variants) {
      byVariant.set(v.id, {
        assignments: new Set(),
        interactions: 0,
        conversions: 0,
        engagement: 0,
        timeSpentMs: 0,
      });
    }
    for (const rec of this.interactions) {
      if (rec.experimentId !== experimentId) continue;
      const m = byVariant.get(rec.variantId);
      if (!m) continue;
      m.assignments.add(rec.agentId);
      m.interactions++;
      if (rec.action === 'convert' || rec.action?.toLowerCase().includes('conversion')) m.conversions++;
      if (rec.action === 'engage' || rec.action?.toLowerCase().includes('engagement')) m.engagement++;
      const ms = (rec.metadata?.timeSpentMs as number) ?? 0;
      m.timeSpentMs += ms;
    }
    const metrics: VariantMetrics[] = exp.variants.map((v) => {
      const m = byVariant.get(v.id)!;
      return {
        variantId: v.id,
        variantName: v.name,
        assignments: m.assignments.size,
        interactions: m.interactions,
        conversions: m.conversions,
        engagement: m.engagement,
        timeSpentMs: m.timeSpentMs,
      };
    });
    return { experiment: exp, metrics };
  }
}

export function getOrSetAgentId(cookieHeader: string | null): { agentId: string; setCookieHeader?: string } {
  const cookies = new Bun.CookieMap(cookieHeader || '');
  const existing = cookies.get(AGENT_COOKIE);
  if (existing) return { agentId: existing };
  const agentId = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const setCookie = `${AGENT_COOKIE}=${encodeURIComponent(agentId)}; Path=/; Max-Age=${365 * 24 * 60 * 60}; SameSite=Lax`;
  return { agentId, setCookieHeader: setCookie };
}
