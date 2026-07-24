/**
 * TOC Ops portal fixture types (Pages-safe snapshot).
 * Theory SSOT lives in toc-ops-repo; this plane only mirrors edge surfaces.
 *
 * @see toc-ops-repo/docs/reference/TOC-Production-Reference.md
 * @see docs/harness/tenants/toc-ops.md
 */
import type { TocIdentityBridge } from './identity.ts';

export type TocGateId =
  | 'play_warmed'
  | 'play_limit'
  | 'confirmed_rail'
  | 'partner_ready'
  | 'gate12_wd_mode'
  | 'soft_posted'
  | 'screenshot_first'
  | 'limit_fresh_drum'
  | 'fund_rail_ready'
  | 'warm_sequential';

export type TocGateResult = {
  gateId: TocGateId;
  ok: boolean;
  severity: 'info' | 'warn' | 'critical';
  partnerCode: string;
  callSign?: string;
  taskId?: string; // brand-ok — fixture/enforcement DTO mirrors toc-ops-repo task id
  reason: string;
  tag?: '#HARDGATE-VIOLATION' | '#ROPE' | '#GATE12';
};

export type TocThroughputSlice = {
  T: number;
  I: number;
  OE: number;
  byPartner: Record<string, { T: number; I: number; OE: number }>;
};

export type TocConstraintDiagnosis = {
  order: Array<'rope' | 'drum' | 'buffer' | 'elevate'>;
  focus: 'rope' | 'drum' | 'buffer' | 'elevate';
  summary: string;
  ropeBroken: boolean;
  drumStarved: boolean;
  bufferWrongSized: boolean;
};

export type TocEnforcementSlice = {
  evaluatedAt: string;
  plane: 'operate-lite';
  note: string;
  warmupRequiredForPlay: 2;
  gates: TocGateResult[];
  passed: number;
  failed: number;
  criticalFailed: number;
  throughput: TocThroughputSlice;
  diagnosis: TocConstraintDiagnosis;
};

export type TocPartnerStatus = 'Ready' | 'Limited' | 'Inactive' | 'Onboarding';
export type TocAccountStatus = 'New' | 'Funded' | 'Warming' | 'WARMED' | 'Limited' | 'Inactive';
export type TocCapitalLocation =
  | 'HouseFloat'
  | 'WithPartner'
  | 'InSportsbook'
  | 'InRail'
  | 'Pending';
export type TocRailType = 'Venmo' | 'CashApp' | 'PayPal' | 'House' | 'Other';
export type TocTaskType = 'ONB' | 'FUND' | 'LIMIT' | 'WARM' | 'PLAY' | 'WD';
export type TocTaskStatus =
  | 'New'
  | 'GateCheck'
  | 'PendingPartner'
  | 'Processing'
  | 'Completed'
  | 'Stopped'
  | 'PendingRailReview';
export type TocBallInCourt = 'Partner' | 'Ops' | 'System' | 'Expert';
export type TocWdMode = 'warmup_capital_return' | 'principal_recovery' | 'profit_split';
export type TocSoftEntryType =
  | 'CapitalDeployment'
  | 'CapitalReturn'
  | 'ProfitSplit'
  | 'Loss'
  | 'CostOfPriming'
  | 'Adjustment';
export type TocBottleneckSeverity = 'info' | 'warn' | 'critical';
export type TocPlayStatus = 'instruction' | 'placed' | 'settled' | 'blocked';
export type TocPlayResult = 'pending' | 'win' | 'loss' | 'push' | 'void' | 'blocked';
export type TocExperimentStatus = 'draft' | 'active' | 'paused' | 'completed';
export type TocFlowStage = 'ONB' | 'FUND' | 'LIMIT' | 'WARM' | 'PLAY' | 'WD' | 'RECYCLE';

/** Return-efficiency catalog knobs (mirror toc-ops-repo ACCOUNTING; fixture defaults). */
export type TocReturnCatalog = {
  daysCover: number;
  staticFloatFloor: number;
  settlementThrottleRatio: number;
  tVelocityWindowDays: number;
  /** Expected ProfitSplit per settled win when upstream ΔT is projected. */
  defaultExpectedPlayT: number;
  processRank: TocTaskType[];
};

export type TocOpsCatalog = {
  taskTypes: TocTaskType[];
  accountStatuses: TocAccountStatus[];
  softBalanceEntryTypes: TocSoftEntryType[];
  bottleneckRuleKeys: string[];
  warmupRequiredForPlay: 2;
  defaultSplit: { partnerPct: number; expertPct: number; housePct: number };
  exceptionFamilies: Record<string, string>;
  flowOrder: TocFlowStage[];
  depositCorridor: { min: number; max: number; target: number };
  limitFreshnessDays: number;
  returnEfficiency?: TocReturnCatalog;
};

export type TocProcessReturn = {
  process: TocTaskType;
  callSign: string; // brand-ok
  partnerCode: string; // brand-ok
  deltaT: number;
  iPeak: number;
  tauDays: number;
  oe: number;
  rP: number;
};

export type TocAssetEfficiency = {
  callSign: string; // brand-ok
  partnerCode: string; // brand-ok
  profitSplitTotal: number;
  peakCapital: number;
  capitalDaysInI: number;
  ce: number;
};

export type TocLimitEnhancement = {
  callSign: string; // brand-ok
  partnerCode: string; // brand-ok
  deltaL: number;
  cAsset: number;
  daysToUsableLimit: number;
  le: number;
};

export type TocRankedAction = {
  rank: number;
  process: TocTaskType;
  callSign: string; // brand-ok
  partnerCode: string; // brand-ok
  rP: number;
  weightedScore?: number;
  reason: string;
  ropeSafe: boolean;
};

export type TocReturnEfficiencySlice = {
  computedAt: string;
  byProcess: TocProcessReturn[];
  byAsset: TocAssetEfficiency[];
  byLimit: TocLimitEnhancement[];
  avgRP: number;
  processTypeAvgRP: Partial<Record<TocTaskType, number>>;
};

/** Unified T/I/OE + return metrics + dynamic buffer (getTioeSnapshot output). */
export type TocTioeSnapshot = {
  throughput: TocThroughputSlice;
  buffer: TocOpsBuffer;
  returnEfficiency: TocReturnEfficiencySlice;
  rankedActions: TocRankedAction[];
  partners: TocPartner[];
};

export type TocOpsBuffer = {
  floatTarget: number;
  floatTargetSource: 'static' | 't_velocity';
  houseFloatHard: number;
  floatRatio: number;
  throttleOnboarding: boolean;
  settlementFloatRatio: number;
  primedDrums: number;
  playableDrums: number;
  principalOutstandingTotal: number;
};

export type TocRail = {
  id: string; // brand-ok — fixture rail id
  railType: TocRailType;
  label: string;
  confirmed: boolean;
  profileScreenshotRef?: string;
  destinationHint?: string;
  dailyLimit?: number;
  monthlyLimit?: number;
};

export type TocAccountLimits = {
  dailyMax: number | null;
  weeklyMax: number | null;
  rawText?: string;
  checkedAt: string | null;
  screenshotRef?: string;
  freshness: 'fresh' | 'stale' | 'unknown';
};

export type TocAccount = {
  callSign: string; // brand-ok — TOC call sign string in fixture plane
  status: TocAccountStatus;
  warmupCount: number;
  warmupProgress: { completed: number; required: 2; tags: string[] };
  capitalLocation: TocCapitalLocation;
  hardBalance: number;
  primaryRailId: string; // brand-ok
  gate12: {
    housePrincipalOutstanding: number;
    withdrawalMode: TocWdMode;
  };
  sportsbook?: string;
  limits: TocAccountLimits;
  expertId?: string; // brand-ok
  flowStage: TocFlowStage;
};

export type TocOpenTask = {
  taskId: string; // brand-ok — fixture task id
  taskType: TocTaskType;
  callSign: string; // brand-ok
  status: TocTaskStatus;
  ballInCourt: TocBallInCourt;
  nextAction: string;
  linkedExceptionId?: string; // brand-ok — e.g. WARM-EX-01
  proofRefs?: string[];
  createdAt?: string;
};

export type TocSoftEntry = {
  entryType: TocSoftEntryType;
  stakeholder: 'Partner' | 'Expert' | 'House';
  amount: number;
  callSign: string; // brand-ok
  taskId: string; // brand-ok
  timestamp: string;
};

export type TocSoftBalance = {
  byStakeholder: { Partner: number; Expert: number; House: number };
  recentEntries: TocSoftEntry[];
  pendingDeployments: { count: number; totalAmount: number };
};

export type TocBottleneck = {
  ruleKey: string;
  severity: TocBottleneckSeverity;
  metric: string;
  threshold: number;
  observed: number;
  callSign?: string; // brand-ok
  taskId?: string; // brand-ok
  resolvedAt: string | null;
  nextAction: string;
};

export type TocPlay = {
  playId: string; // brand-ok
  taskId?: string; // brand-ok
  callSign: string; // brand-ok
  partnerCode: string; // brand-ok
  expertId: string; // brand-ok
  market: string;
  event: string;
  selection: string;
  odds: number;
  stake: number;
  confidence?: number;
  status: TocPlayStatus;
  result: TocPlayResult;
  pnl: number | null;
  blockedReason?: string;
  experimentId?: string; // brand-ok
  variantKey?: string;
  placedAt: string;
  settledAt?: string;
};

export type TocExperimentVariant = {
  key: string;
  name: string;
  config: Record<string, string | number | boolean>;
};

export type TocExperimentAssignment = {
  partnerCode: string; // brand-ok
  variantKey: string;
  metricValue?: number;
  assignedAt: string;
};

export type TocExperiment = {
  id: string; // brand-ok
  name: string;
  status: TocExperimentStatus;
  phase: 1 | 2 | 3 | 4;
  designMethod: 'full' | 'switchback' | 'cluster' | 'factorial';
  metricName: 'win_rate' | 'placement_rate' | 'throughput_t';
  hypothesis: string;
  factors: Array<{ name: string; levels: string[] }>;
  variants: TocExperimentVariant[];
  assignments: TocExperimentAssignment[];
  clusterBy?: 'package_id' | 'partner_code';
};

export type TocExpert = {
  expertId: string; // brand-ok
  displayName: string;
  markets: string[];
  weight: number;
};

export type TocPartner = {
  partnerCode: string; // brand-ok — 3–6 letter TOC partner code
  status: TocPartnerStatus;
  telegramRef?: string;
  package: {
    id: string; // brand-ok
    partnerPct: number;
    expertPct: number;
    housePct: number;
  };
  readiness: {
    score: number;
    playableAccountCount: number;
    accountScores: Array<{
      callSign: string; // brand-ok
      score: number;
      playable: boolean;
      factors: string[];
      weightedScore?: number;
    }>;
  };
  /** Furthest healthy stage in ONB→…→WD for this partner */
  flowStage: TocFlowStage;
  rails: TocRail[];
  accounts: TocAccount[];
  openTasks: TocOpenTask[];
  softBalance: TocSoftBalance;
  bottlenecks: TocBottleneck[];
  recentPlays: TocPlay[];
  experimentAssignment?: {
    experimentId: string; // brand-ok
    variantKey: string;
    metricName: string;
    metricValue: number;
  };
  knownExceptions: Array<{
    id: string; // brand-ok — FUND-EX-01 …
    trigger: string;
    action: string;
  }>;
};

export type TocOpsSnapshot = {
  schema: 'factorywager.toc-ops.portal-fixture.v2';
  source: 'snapshot' | 'demo';
  readOnly: true;
  /** Pages surface is always demo-readonly (no Soft mutations). */
  plane: 'demo-readonly';
  identity?: TocIdentityBridge;
  /** Baked operate-lite Rope/Hard Gate evaluation (read-only on Pages). */
  enforcement?: TocEnforcementSlice;
  /** Baked R_P / CE / LE + ranked next actions. */
  returnEfficiency?: TocReturnEfficiencySlice;
  rankedActions?: TocRankedAction[];
  generatedAt: string;
  ssot: {
    theory: 'toc-ops-repo/docs/reference/TOC-Production-Reference.md';
    accounting: 'toc-ops-repo/docs/system/ACCOUNTING.md';
    domain: 'toc-ops-repo/docs/DOMAIN_CONSTANTS.md';
  };
  catalog: TocOpsCatalog;
  buffer: TocOpsBuffer;
  experts: TocExpert[];
  experiments: TocExperiment[];
  partners: TocPartner[];
  /** Rollups for ops-summary.toc + portal cards */
  summary: {
    partners: number;
    accounts: number;
    warmed: number;
    warming: number;
    onboarding: number;
    confirmedRails: number;
    unconfirmedRails: number;
    openTasks: number;
    openOnb: number;
    openLimit: number;
    openWarm: number;
    openPlay: number;
    openBottlenecks: number;
    criticalBottlenecks: number;
    principalOutstandingTotal: number;
    playsPending: number;
    playsSettled: number;
    playsBlocked: number;
    activeExperiments: number;
    byTaskType: Record<string, number>;
    byBallInCourt: Record<string, number>;
    byFlowStage: Record<string, number>;
  };
};

/** Compact slice embedded in ops-summary.json */
export type TocOpsSummarySlice = {
  available: boolean;
  path: '/registry/toc-ops.json';
  generatedAt: string | null;
  partners: number;
  warmed: number;
  warming: number;
  onboarding: number;
  confirmedRails: number;
  openTasks: number;
  openOnb: number;
  openLimit: number;
  openBottlenecks: number;
  criticalBottlenecks: number;
  principalOutstandingTotal: number;
  throttleOnboarding: boolean;
  primedDrums: number;
  playableDrums: number;
  playsPending: number;
  playsSettled: number;
  activeExperiments: number;
  plane: 'demo-readonly';
  identityLinked: boolean;
  identityPartners: number;
  enforcementFocus: 'rope' | 'drum' | 'buffer' | 'elevate' | null;
  enforcementFailed: number;
  enforcementCritical: number;
  throughputT: number | null;
  throughputI: number | null;
  throughputOE: number | null;
  topRankedProcess: TocTaskType | null;
  avgRP: number | null;
  settlementFloatRatio: number | null;
};
