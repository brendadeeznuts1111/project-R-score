/**
 * TOC Ops portal fixture types (Pages-safe snapshot).
 * Theory SSOT lives in toc-ops-repo; this plane only mirrors edge surfaces.
 *
 * @see toc-ops-repo/docs/reference/TOC-Production-Reference.md
 * @see docs/harness/tenants/toc-ops.md
 */
import type { TocIdentityBridge } from './identity.ts';

/** Registry path for the baked TOC Ops snapshot — shared leaf constant
 *  (lives here, not export-snapshot.ts, to keep bake-proof ↔ export-snapshot acyclic). */
export const TOC_OPS_REGISTRY_PATH = '/registry/toc-ops.json' as const;

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

/** Where / how a Drum places risk. */
export type TocVenueKind =
  | 'sportsbook'
  | 'exchange'
  | 'prediction_market'
  | 'crypto'
  | 'pph'
  | 'postup_credit'
  | 'casino'
  | 'kiosk'
  | 'in_person';

export type TocSportMarket =
  | 'NFL'
  | 'NBA'
  | 'MLB'
  | 'NHL'
  | 'NCAAF'
  | 'NCAAB'
  | 'Soccer'
  | 'Tennis'
  | 'Golf'
  | 'MMA'
  | 'Boxing'
  | 'Politics'
  | 'Economics'
  | 'Crypto'
  | 'Other';

export type TocLegalStatus = 'legal' | 'restricted' | 'prohibited' | 'grey' | 'unknown';

export type TocVenueAccess = 'online' | 'in_person' | 'kiosk' | 'hybrid';

export type TocStateLegal = {
  state: string; // brand-ok — USPS / region code
  status: TocLegalStatus;
  notes?: string;
  licenseRef?: string;
};

export type TocCreditTerms = {
  mode: 'cash' | 'postup' | 'pph' | 'mixed';
  creditLimit?: number;
  postedBalance?: number;
  settlementDays?: number;
  currency?: string; // brand-ok — USD / USDC / USDT
};

/** Per-account venue / channel profile. */
export type TocAccountVenue = {
  kind: TocVenueKind;
  venueId: string; // brand-ok — slug e.g. hardrock, kalshi, polymarket
  displayName: string;
  access: TocVenueAccess;
  sports: TocSportMarket[];
  primaryState: string; // brand-ok
  legalByState: TocStateLegal[];
  credit?: TocCreditTerms;
  crypto?: {
    networks: string[]; // brand-ok
    assets: string[]; // brand-ok
    walletHint?: string;
  };
  exchange?: {
    clearing: 'cftc' | 'offshore' | 'p2p' | 'unknown';
    markets: string[];
  };
  pph?: {
    shopName: string;
    agentRef?: string;
  };
  casino?: {
    property: string;
    floor?: string;
  };
  kiosk?: {
    locationLabel: string;
    deviceId?: string; // brand-ok
  };
};

export type TocVenueCatalog = {
  kinds: TocVenueKind[];
  venueIds: string[];
  sports: TocSportMarket[];
  legalStatuses: TocLegalStatus[];
  accessModes: TocVenueAccess[];
};

export type TocVenueSummary = {
  accountsWithVenue: number;
  byVenueKind: Record<string, number>;
  byVenueId: Record<string, number>;
  byAccess: Record<string, number>;
  byPrimaryState: Record<string, number>;
  byLegalStatus: Record<string, number>;
  bySport: Record<string, number>;
  legalStatesCovered: number;
  creditLines: number;
  cryptoAccounts: number;
  exchangeAccounts: number;
  kioskAccounts: number;
  inPersonAccounts: number;
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
  venues?: TocVenueCatalog;
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

export type TocBufferHistoryPoint = {
  day: string;
  houseFloatHard: number;
  floatRatio: number;
  settlementFloatRatio: number;
  principalOutstanding: number;
  throttleOnboarding: boolean;
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
  /** Daily float / principal pulse (demo). */
  history?: TocBufferHistoryPoint[];
};

/** Capital location transition on a Drum. */
export type TocCapitalMove = {
  at: string;
  from: TocCapitalLocation;
  to: TocCapitalLocation;
  amount: number;
  taskId?: string; // brand-ok
  note?: string;
};

/** Warm cycle 1/2 ledger for FUND→WARM→WD. */
export type TocWarmCycle = {
  cycle: 1 | 2;
  startedAt: string;
  completedAt: string | null;
  tags: string[];
  wdTaskId?: string; // brand-ok
  returnedAmount?: number;
  status: 'open' | 'completed' | 'aborted';
};

/** Gate 12 principal waterfall event. */
export type TocGate12Event = {
  at: string;
  kind: 'deploy' | 'return' | 'mode_change' | 'disclosure';
  amount: number;
  remainingAfter: number;
  mode: TocWdMode;
  taskId?: string; // brand-ok
  note?: string;
};

/** WGS84 point — fixture/demo plane (not live GeoIP). */
export type TocGeoPoint = {
  lat: number;
  lon: number;
  accuracyM?: number;
  source: 'profile' | 'ip' | 'manual' | 'demo';
  observedAt?: string;
};

/** Postal / administrative place. */
export type TocPostal = {
  country: string; // brand-ok — ISO 3166-1 alpha-2
  region?: string; // brand-ok — state/province
  city?: string;
  zip: string; // brand-ok — postal / ZIP
  timezone?: string; // brand-ok — IANA tz
};

/** Resolved DNS snapshot for a partner/account hostname. */
export type TocDnsRecord = {
  hostname: string; // brand-ok
  resolvedAt: string;
  a?: string[]; // brand-ok — A (IPv4)
  aaaa?: string[]; // brand-ok — AAAA (IPv6)
  cname?: string[];
  mx?: string[];
  ttlSec?: number;
  resolver?: string; // brand-ok — e.g. 1.1.1.1
};

/** Network endpoint / last-seen egress. */
export type TocNetworkEndpoint = {
  ipv4?: string; // brand-ok
  ipv6?: string; // brand-ok
  asn?: number;
  asOrg?: string;
  isp?: string;
  reverseDns?: string; // brand-ok — PTR
  dns?: TocDnsRecord;
  lastSeenAt?: string;
  vpnSuspected?: boolean;
  /** Connected interface hint for desk triage */
  connectionType?: 'residential' | 'mobile' | 'datacenter' | 'unknown';
};

/** Geo + network presence for partner HQ, drum, or house desk. */
export type TocPresence = {
  geo: TocGeoPoint;
  postal: TocPostal;
  network: TocNetworkEndpoint;
  metrics?: {
    distanceKmFromHouse?: number;
    sameMetroAsHouse?: boolean;
  };
};

/** Placement-time geo/IP context on a play (subset of presence). */
export type TocPlacementContext = {
  geo?: TocGeoPoint;
  postal?: Pick<TocPostal, 'country' | 'region' | 'city' | 'zip'>;
  ipv4?: string; // brand-ok
  ipv6?: string; // brand-ok
  asn?: number;
  dnsHostname?: string; // brand-ok
};

/** Rollup metrics for presence coverage on the board / ops card. */
export type TocPresenceSummary = {
  partnersWithGeo: number;
  accountsWithGeo: number;
  playsWithPlacement: number;
  uniqueZips: number;
  uniqueCities: number;
  uniqueAsns: number;
  ipv4Count: number;
  ipv6Count: number;
  dnsResolved: number;
  vpnSuspected: number;
  byCountry: Record<string, number>;
  byTimezone: Record<string, number>;
  byAsn: Record<string, number>;
  byConnectionType: Record<string, number>;
  avgDistanceKmFromHouse: number | null;
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
  /** Confirm / reject lifecycle (demo). */
  confirmHistory?: TocRailConfirmEvent[];
  /** Daily / monthly utilization vs limits (demo). */
  utilization?: TocRailUtilization;
};

/** Rail volume vs daily/monthly caps (demo). */
export type TocRailUtilization = {
  usedDaily: number;
  usedMonthly: number;
  pctDaily: number;
  pctMonthly: number;
  asOf: string;
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
  /** @deprecated Prefer `venue.displayName` — kept for older portal readers. */
  sportsbook?: string;
  /** Venue / channel profile (book · exchange · crypto · PPH · …). */
  venue?: TocAccountVenue;
  limits: TocAccountLimits;
  expertId?: string; // brand-ok
  flowStage: TocFlowStage;
  /** Last-seen device / session geo+IP for this Drum. */
  presence?: TocPresence;
  /** Capital location moves (demo ledger). */
  capitalLedger?: TocCapitalMove[];
  /** Warm cycle 1/2 progress ledger. */
  warmCycles?: TocWarmCycle[];
  /** Gate 12 principal waterfall events. */
  gate12Ledger?: TocGate12Event[];
  /** Limit refresh history (oldest→newest). */
  limitHistory?: TocLimitRefresh[];
  /** Open expert stake not yet settled (demo). */
  pendingExposure?: number;
  /** Hard journal of +/− stake exposure events. */
  exposureJournal?: TocExposureEvent[];
  /** Recycle / redeploy cycles after WARMED. */
  recycleCycles?: TocRecycleCycle[];
  /** Compliance / risk flags on the Drum. */
  complianceFlags?: TocComplianceFlag[];
  /** Exposure aging buckets for open stake. */
  exposureAging?: TocExposureAging;
  /** Drum constraint focus (Rope · Drum · Buffer · Elevate). */
  constraint?: TocAccountConstraint;
  /** WARM SOP checklist (fund → limits → warm 1/2 → refresh). */
  warmPlaybook?: TocWarmPlaybookStep[];
  /** Capital location drift (oldest→newest). */
  capitalLocationSeries?: TocCapitalLocationPoint[];
  /** Per-drum Hard Gate snapshot (operate-lite mirror). */
  gateSnapshot?: TocAccountGateSnapshot;
};

/** Capital location time sample on a Drum. */
export type TocCapitalLocationPoint = {
  at: string;
  location: TocCapitalLocation;
  hardBalance: number;
  note?: string;
};

/** Compact gate eval on a single Drum (demo bake). */
export type TocAccountGateSnapshot = {
  evaluatedAt: string;
  passed: number;
  failed: number;
  gates: Array<{ gateId: TocGateId; ok: boolean; reason: string }>;
};

/** Pending-exposure journal row (placement → settle/expire). */
export type TocExposureEvent = {
  at: string;
  kind: 'reserve' | 'place' | 'settle' | 'expire' | 'release';
  amount: number;
  pendingAfter: number;
  playId?: string; // brand-ok
  expertId?: string; // brand-ok
  note?: string;
};

/** Post-WARMED recycle / redeploy cycle. */
export type TocRecycleCycle = {
  cycleId: string; // brand-ok
  startedAt: string;
  completedAt: string | null;
  redeployAmount: number;
  status: 'open' | 'completed' | 'blocked';
  blockReason?: string;
};

/** Compliance / risk flag on partner or account. */
export type TocComplianceFlag = {
  id: string; // brand-ok
  severity: 'info' | 'warn' | 'critical';
  code: string;
  summary: string;
  at: string;
  clearedAt: string | null;
};

/** Compact Soft/Hard audit trail row (demo). */
export type TocAuditTrailRow = {
  at: string;
  kind: string;
  callSign?: string; // brand-ok
  amount?: number;
  summary: string;
};

/** Partner SLA board (open BIC ages + breaches). */
export type TocSlaBoard = {
  openPartnerTasks: number;
  openOpsTasks: number;
  oldestOpenAgeMin: number;
  breachCount7d: number;
  onTimePct7d: number;
  nextDueTaskId?: string; // brand-ok
};

/** Soft flow capital position (not A=L+E stock). */
export type TocNetCapitalPosition = {
  deposits: number;
  withdrawals: number;
  expenses: number;
  railFees: number;
  losses: number;
  priming: number;
  net: number;
  asOf: string;
};

/** Pending-exposure aging buckets (demo). */
export type TocExposureAging = {
  bucket0_24h: number;
  bucket24_72h: number;
  bucket72hPlus: number;
};

/** WD queue item (Gate 12 · rail · partner ack). */
export type TocWdPipelineItem = {
  wdId: string; // brand-ok
  callSign: string; // brand-ok
  amount: number;
  mode: TocWdMode;
  status: 'queued' | 'gate_check' | 'pending_rail' | 'processing' | 'completed' | 'blocked';
  requestedAt: string;
  slaDueAt?: string;
  blockReason?: string;
};

/** ONB checklist step (NOV narrative). */
export type TocOnbChecklistItem = {
  stepId: string; // brand-ok
  label: string;
  status: 'done' | 'pending' | 'blocked';
  completedAt?: string;
  blockReason?: string;
};

/** Upcoming settlement slot for open exposure / WD. */
export type TocSettlementSlot = {
  at: string;
  kind: 'exposure' | 'wd' | 'rail';
  callSign?: string; // brand-ok
  amount: number;
  note: string;
};

/** Per-Drum constraint focus (operate-lite mirror). */
export type TocAccountConstraint = {
  focus: 'rope' | 'drum' | 'buffer' | 'elevate';
  ropeBroken: boolean;
  drumStarved: boolean;
  bufferWrongSized: boolean;
  summary: string;
};

/** Exception resolution desk row (owner · due · status). */
export type TocExceptionResolution = {
  exceptionId: string; // brand-ok
  family: string;
  status: 'open' | 'assigned' | 'resolved';
  owner: TocBallInCourt;
  dueAt: string;
  callSign?: string; // brand-ok
  summary: string;
  resolvedAt?: string;
};

/** Pending play awaiting settlement window. */
export type TocPlaySettlementSlot = {
  playId: string; // brand-ok
  callSign: string; // brand-ok
  stake: number;
  status: TocPlayStatus;
  expectedSettleAt: string;
  market: string;
};

/** Package bot command audit row (demo). */
export type TocBotCommandEntry = {
  at: string;
  command: string;
  actor: string;
  outcome: 'ok' | 'deferred' | 'denied';
  note?: string;
};

/** Ball-in-Court handoff on an open task (demo MessageLog mirror). */
export type TocBicHandoff = {
  at: string;
  taskId: string; // brand-ok
  taskType: TocTaskType;
  from: TocBallInCourt;
  to: TocBallInCourt;
  reason: string;
};

/** WARM SOP checklist step on a Drum (mirrors toc-ops-repo warm playbook). */
export type TocWarmPlaybookStep = {
  stepId: string; // brand-ok
  label: string;
  status: 'pending' | 'in_progress' | 'done' | 'blocked';
  requiredForPlay: boolean;
  completedAt?: string;
};

/** Phone / SIM logistics event (data · assign · renew). */
export type TocPhoneLogEntry = {
  at: string;
  phoneId: string; // brand-ok
  event: 'sim_swap' | 'data_threshold' | 'hotspot_on' | 'suspend' | 'assign' | 'renew';
  summary: string;
};

/** Daily expert liquidity utilization sample (oldest→newest). */
export type TocLiquidityUtilPoint = {
  day: string;
  utilPct: number;
  allocated: number;
  inUse: number;
};

/** FUND corridor progress (target · rail · block reason). */
export type TocFundCorridor = {
  targetAmount: number;
  fundedAmount: number;
  railId: string; // brand-ok
  status: 'open' | 'partial' | 'funded' | 'blocked';
  blockReason?: string;
  taskId?: string; // brand-ok
  updatedAt: string;
};

/** Open-task lifecycle events (created → ack → SLA). */
export type TocTaskTimelineEntry = {
  at: string;
  taskId: string; // brand-ok
  taskType: TocTaskType;
  event: 'created' | 'assigned' | 'ack' | 'blocked' | 'completed' | 'sla_breach';
  ballInCourt: TocBallInCourt;
  summary: string;
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
  /** Age minutes for open BIC (demo). */
  ageMin?: number;
  /** SLA due-at for open partner tasks. */
  slaDueAt?: string;
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
  /** Itemized Soft I deployment queue (demo). */
  pendingDeploymentItems?: TocPendingDeploymentItem[];
  /** Stock identity A = L + E (demo balance-sheet view). */
  balanceSheet?: TocSoftBalanceSheet;
};

/** Queued capital deployment awaiting gate / rail (Soft I). */
export type TocPendingDeploymentItem = {
  id: string; // brand-ok
  callSign: string; // brand-ok
  amount: number;
  taskId?: string; // brand-ok
  queuedAt: string;
  status: 'queued' | 'gate_check' | 'blocked';
  blockReason?: string;
};

/** Soft balance-sheet stock (mirrors toc-ops-repo `balance-sheet`). */
export type TocSoftBalanceSheet = {
  assets: number;
  liabilities: number;
  equity: number;
  identityOk: boolean;
  delta: number;
  asOf: string;
  drill: Array<{ entryType: TocSoftEntryType; amount: number; note: string }>;
};

/** Limit screenshot / refresh history on a Drum. */
export type TocLimitRefresh = {
  at: string;
  dailyMax: number | null;
  weeklyMax: number | null;
  freshness: 'fresh' | 'stale' | 'unknown';
  screenshotRef?: string;
  source: 'partner' | 'ops' | 'bot';
};

/** Rail confirm lifecycle event. */
export type TocRailConfirmEvent = {
  at: string;
  railId: string; // brand-ok
  action: 'submitted' | 'confirmed' | 'rejected' | 'expired';
  screenshotRef?: string;
  note?: string;
};

/** Switchback / cluster window for an experiment. */
export type TocSwitchbackWindow = {
  windowId: string; // brand-ok
  startAt: string;
  endAt: string;
  variantKey: string;
  partnerCode: string; // brand-ok
  metricValue?: number;
};

/** Expert PLAY release / reservation card. */
export type TocReleaseCard = {
  releaseId: string; // brand-ok
  at: string;
  callSign: string; // brand-ok
  partnerCode: string; // brand-ok
  stake: number;
  market: string;
  status: 'reserved' | 'placed' | 'expired' | 'settled' | 'deferred';
  deferredReason?: string;
  playId?: string; // brand-ok
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
  /** Minutes since instruction when status is instruction (demo SLA). */
  instructionAgeMin?: number;
  /** Partner ack due-at for open instructions. */
  ackDueAt?: string;
  /** Egress / place context when the slip was posted. */
  placement?: TocPlacementContext;
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

export type TocExperimentOutcome = {
  sampleN: number;
  controlMetric: number;
  treatmentMetric: number;
  /** Relative lift vs control (e.g. 0.12 = +12%). */
  liftPct: number;
  ci95?: [number, number];
  decidedAt?: string;
  decision: 'keep' | 'kill' | 'iterate' | 'pending';
  byVariant: Array<{ variantKey: string; n: number; metric: number }>;
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
  /** Desk readout after sample window (demo). */
  outcome?: TocExperimentOutcome;
  /** Switchback / cluster windows (demo calendar). */
  switchbackWindows?: TocSwitchbackWindow[];
};

/** MessageLog / Ball-in-Court handoff (demo mirror of toc-ops-repo MessageLog). */
export type TocMessageLogEntry = {
  id: string; // brand-ok — message log row id
  at: string;
  channel: 'telegram' | 'sms' | 'voice' | 'system' | 'portal';
  direction: 'in' | 'out' | 'internal';
  from: TocBallInCourt | 'Bot';
  to: TocBallInCourt | 'Bot';
  taskId?: string; // brand-ok
  callSign?: string; // brand-ok
  summary: string;
  slaBreached?: boolean;
};

/** Rotor / limit-drift sample for a Drum. */
export type TocRotorPoint = {
  at: string;
  callSign: string; // brand-ok
  driftBps: number;
  limitFreshHours: number;
  action?: string;
};

/** Known-exception lifecycle event. */
export type TocExceptionEvent = {
  id: string; // brand-ok — FUND-EX-01 …
  at: string;
  family: string;
  status: 'open' | 'mitigated' | 'closed';
  callSign?: string; // brand-ok
  summary: string;
};

/** Phone / SIM asset on a partner or agent. */
export type TocPhoneAsset = {
  id: string; // brand-ok
  label: string;
  e164?: string; // brand-ok — +1…
  carrier?: string;
  dataPlan?: {
    name: string;
    gbMonth: number;
    usedGb: number;
    hotspot: boolean;
    renewsAt?: string;
  };
  status: 'active' | 'warming' | 'suspended' | 'retired';
  assignedCallSign?: string; // brand-ok
};

export type TocPartnerAsset = {
  id: string; // brand-ok
  kind: 'phone' | 'device' | 'wallet' | 'document' | 'rail' | 'other';
  label: string;
  ref?: string;
  status: 'active' | 'pending' | 'retired';
  meta?: Record<string, string | number | boolean>;
};

export type TocTelegramLane = {
  chatId?: string; // brand-ok
  groupId?: string; // brand-ok
  channelId?: string; // brand-ok — plays channel
  botUsername?: string; // brand-ok — @TOC_…
  dmRef?: string;
  topics?: Array<{ name: string; threadId?: number }>;
};

export type TocPlayChannel = {
  kind: 'telegram' | 'bot' | 'portal' | 'sms' | 'voice';
  ref: string; // brand-ok
  primary: boolean;
  status: 'live' | 'paused' | 'setup';
};

export type TocPaymentRecord = {
  id: string; // brand-ok
  method: 'venmo' | 'cashapp' | 'paypal' | 'ach' | 'wire' | 'crypto' | 'cash' | 'other';
  direction: 'in' | 'out';
  amount: number;
  currency: string; // brand-ok
  status: 'posted' | 'pending' | 'failed';
  at: string;
  railId?: string; // brand-ok
  note?: string;
};

export type TocAccountingBalance = {
  softPartner: number;
  softExpert: number;
  softHouse: number;
  hardInBook: number;
  hardFloat: number;
  pendingDeploy: number;
  pendingPayout: number;
  currency: string; // brand-ok
};

export type TocDealTerms = {
  dealId: string; // brand-ok
  name: string;
  partnerPct: number;
  expertPct: number;
  housePct: number;
  payoutCadence: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  payoutMethod: 'rail' | 'ach' | 'crypto' | 'mixed';
  termMonths?: number;
  effectiveAt: string;
  notes?: string;
};

export type TocHistoryEvent = {
  at: string;
  kind: string;
  summary: string;
  callSign?: string; // brand-ok
  amount?: number;
};

export type TocClvStats = {
  sampleN: number;
  avgClvBps: number;
  winRateWhenPositiveClv: number;
  last30dAvgClvBps: number;
  beatsClosePct: number;
  /** Optional per-market CLV breakdown. */
  byMarket?: Array<{ market: string; sampleN: number; avgClvBps: number }>;
  /** Optional weekly avg CLV (bps) oldest→newest. */
  weeklySeriesBps?: number[];
};

export type TocAgentStyle = {
  aggression: 'conservative' | 'balanced' | 'aggressive';
  stakeBand: { min: number; max: number; typical: number };
  marketFocus: string[];
  holdTimeHint: 'same_game' | 'early' | 'mixed';
  notes?: string;
};

/** Expert / agent liquidity pool (allocated capacity by market). */
export type TocLiquidityPool = {
  allocated: number;
  available: number;
  reserved: number;
  currency: string; // brand-ok
  byMarket: Array<{
    market: string;
    allocated: number;
    available: number;
    reserved?: number;
    openPlays?: number;
  }>;
  lastReconciledAt?: string;
  /** Open reservations (demo desk view). */
  openReservations?: Array<{
    reservationId: string; // brand-ok
    callSign: string; // brand-ok
    market: string;
    stake: number;
    at: string;
  }>;
};

export type TocLimitProfile = {
  dailyMax: number | null;
  weeklyMax: number | null;
  perPlayMax?: number | null;
  exposureCap?: number | null;
  notes?: string;
};

/** Rich partner operating profile (demo plane). */
export type TocPartnerProfile = {
  displayName: string;
  tier: 'T1' | 'T2' | 'T3' | 'T4';
  risk: 'green' | 'yellow' | 'orange' | 'red';
  phones: TocPhoneAsset[];
  assets: TocPartnerAsset[];
  telegram: TocTelegramLane;
  playChannels: TocPlayChannel[];
  payments: TocPaymentRecord[];
  accounting: TocAccountingBalance;
  deals: TocDealTerms[];
  history: TocHistoryEvent[];
  limits: TocLimitProfile;
  wagerPlaces: Array<{ venueId: string; label: string; kind: string }>; // brand-ok venueId
  preferredMarkets: string[];
  bot?: { username: string; status: 'live' | 'paused' | 'setup'; commands?: string[] };
  /** SMS / voice ops log (demo). */
  commsLog?: Array<{
    at: string;
    channel: 'sms' | 'voice' | 'telegram';
    direction: 'in' | 'out';
    summary: string;
  }>;
  /** Rolling 7d Soft / play velocity (demo desk). */
  velocity?: {
    t7d: number;
    plays7d: number;
    settles7d: number;
    avgStake7d: number;
  };
  /** Ops desk scorecard (SLA · trust · proof). */
  deskScorecard?: {
    trustScore: number;
    slaOnTimePct: number;
    proofCompletenessPct: number;
    avgPartnerResponseMin: number;
    openExceptions: number;
    lastReviewAt: string;
  };
  /** Rail health for confirmed payout paths. */
  railHealth?: Array<{
    railId: string; // brand-ok
    successRate: number;
    avgSettleMin: number;
    lastFailureAt: string | null;
    volume30d: number;
  }>;
  /** Screenshot / proof vault refs. */
  proofVault?: Array<{
    ref: string;
    kind: 'limits' | 'rail' | 'kyc' | 'slip' | 'receipt' | 'other';
    callSign?: string; // brand-ok
    at: string;
  }>;
  /** Daily Soft T series (oldest→newest, demo). */
  softDailyT?: Array<{ day: string; t: number; oe: number }>;
  /** Package bot command audit (demo). */
  botCommandLog?: TocBotCommandEntry[];
  /** Phone / SIM logistics (data · assign · renew). */
  phoneLog?: TocPhoneLogEntry[];
};

/** Rich expert / agent profile + liquidity. */
export type TocAgentProfile = {
  handle: string;
  style: TocAgentStyle;
  clv: TocClvStats;
  liquidity: TocLiquidityPool;
  telegram: TocTelegramLane;
  playChannels: TocPlayChannel[];
  payments: TocPaymentRecord[];
  accounting: { pendingCut: number; paidYtd: number; currency: string };
  deals: TocDealTerms[];
  history: TocHistoryEvent[];
  limits: TocLimitProfile;
  phones: TocPhoneAsset[];
  markets: string[];
  wagerPlaces: Array<{ venueId: string; label: string }>; // brand-ok — venue catalog slug
  bot?: { username: string; status: 'live' | 'paused' | 'setup' };
  /** Release / hit-rate desk metrics. */
  releaseStats?: {
    releases30d: number;
    placed30d: number;
    blocked30d: number;
    placementRate: number;
    avgStake: number;
  };
  /** Per-book / venue permission matrix. */
  bookPermissions?: Array<{
    venueId: string; // brand-ok
    allowed: boolean;
    maxStake: number;
    markets: string[];
    note?: string;
  }>;
  /** Exposure ladder by stake band. */
  exposureLadder?: Array<{
    band: string;
    openStake: number;
    reserved: number;
    cap: number;
  }>;
  /** Daily CLV samples (bps) oldest→newest. */
  clvDailyBps?: number[];
  /** Daily liquidity utilization (allocated vs in-use). */
  liquidityUtilSeries?: TocLiquidityUtilPoint[];
  /** Expert ROI + seat eligibility (demo). */
  roi?: {
    t30d: number;
    plays30d: number;
    winRate: number;
    avgStake: number;
    byCallSign: Array<{
      callSign: string; // brand-ok
      partnerCode: string; // brand-ok
      t: number;
      n: number;
    }>;
    eligibility: Array<{
      callSign: string; // brand-ok
      partnerCode: string; // brand-ok
      eligible: boolean;
      reason: string;
    }>;
  };
  /** Active / recent PLAY release cards (demo). */
  releaseCards?: TocReleaseCard[];
};

export type TocProfilesSummary = {
  partnersWithProfile: number;
  agentsWithProfile: number;
  phonesActive: number;
  telegramLanes: number;
  playChannelsLive: number;
  expertLiquidityAllocated: number;
  expertLiquidityAvailable: number;
  avgAgentClvBps: number | null;
  openDeals: number;
  pendingPayouts: number;
};

export type TocExpert = {
  expertId: string; // brand-ok
  displayName: string;
  markets: string[];
  weight: number;
  /** Enriched agent profile (style · CLV · liquidity · telegram · deals). */
  profile?: TocAgentProfile;
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
  /** Partner HQ / onboarding geo + egress network. */
  presence?: TocPresence;
  /** Operating profile: phones · assets · telegram · deals · accounting. */
  profile?: TocPartnerProfile;
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
  /** Channel MessageLog with Ball-in-Court handoffs (demo). */
  messageLog?: TocMessageLogEntry[];
  /** Rotor drift series (oldest→newest). */
  rotorSeries?: TocRotorPoint[];
  /** Exception family timeline beyond static knownExceptions. */
  exceptionTimeline?: TocExceptionEvent[];
  /** Daily partner health pulse (readiness · BIC · Soft T). */
  healthPulse?: Array<{
    day: string;
    readiness: number;
    openBic: number;
    slaBreaches: number;
    softT: number;
  }>;
  /** Open-task SLA board. */
  slaBoard?: TocSlaBoard;
  /** Compact Soft/Hard audit trail. */
  auditTrail?: TocAuditTrailRow[];
  /** Package compliance flags (KYC · geo · rail). */
  complianceFlags?: TocComplianceFlag[];
  /** Soft flow net capital position. */
  netCapital?: TocNetCapitalPosition;
  /** WD queue (Gate 12 · rail · partner ack). */
  wdPipeline?: TocWdPipelineItem[];
  /** Partner-level exposure aging rollup. */
  exposureAging?: TocExposureAging;
  /** ONB checklist (onboarding partners). */
  onbChecklist?: TocOnbChecklistItem[];
  /** Upcoming settlement / exposure release slots. */
  settlementCalendar?: TocSettlementSlot[];
  /** Exception resolution desk (owner · due · status). */
  exceptionResolution?: TocExceptionResolution[];
  /** Pending plays awaiting settlement window. */
  playSettlementQueue?: TocPlaySettlementSlot[];
  /** Ball-in-Court handoff timeline (open tasks). */
  bicHandoffs?: TocBicHandoff[];
  /** FUND corridor target vs funded (ONB/FUND partners). */
  fundCorridor?: TocFundCorridor;
  /** Open-task lifecycle timeline. */
  taskTimeline?: TocTaskTimelineEntry[];
  /** Readiness score trend (oldest→newest). */
  readinessTrend?: TocReadinessTrendPoint[];
  /** 70/20/10 split audit on recent ProfitSplit rows. */
  dealSplitAudit?: TocDealSplitAudit;
};

/** Daily partner readiness samples. */
export type TocReadinessTrendPoint = {
  day: string;
  score: number;
  playableAccounts: number;
  openBic: number;
};

/** Package split verification against recent Soft ProfitSplit. */
export type TocDealSplitAudit = {
  asOf: string;
  packagePct: { partner: number; expert: number; house: number };
  rows: TocDealSplitAuditRow[];
  driftCount: number;
};

export type TocDealSplitAuditRow = {
  playId?: string; // brand-ok
  taskId?: string; // brand-ok
  at: string;
  expected: { partner: number; expert: number; house: number };
  actual: { partner: number; expert: number; house: number };
  ok: boolean;
  deltaTotal: number;
};

export type TocOpsLoopCrosslink = {
  gatedDefer: number;
  gatedDeny: number;
  dispatched: number;
  loopCompletionRate: number;
  loopCompletionRateByPlay: number;
  capitalEfficiencyProxy?: number | null;
  limitEfficiencyProxy?: number | null;
  processReturnProxy?: number | null;
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
  /** Ops closed-loop slice baked from live DB at seed time (Pages cross-link). */
  opsLoop?: TocOpsLoopCrosslink;
  generatedAt: string;
  ssot: {
    theory: 'toc-ops-repo/docs/reference/TOC-Production-Reference.md';
    accounting: 'toc-ops-repo/docs/system/ACCOUNTING.md';
    domain: 'toc-ops-repo/docs/DOMAIN_CONSTANTS.md';
  };
  catalog: TocOpsCatalog;
  buffer: TocOpsBuffer;
  /** Ops desk / house float geo+network (demo). */
  housePresence?: TocPresence;
  experts: TocExpert[];
  experiments: TocExperiment[];
  partners: TocPartner[];
  /** Geo / IP / DNS coverage rollup. */
  presence?: TocPresenceSummary;
  /** Venue / channel rollup (books · exchanges · crypto · PPH · …). */
  venues?: TocVenueSummary;
  /** Partner + agent profile rollup. */
  profiles?: TocProfilesSummary;
  /** Rollups for ops-summary.toc + portal cards */
  summary: {
    partners: number;
    accounts: number;
    warmed: number;
    warming: number;
    onboarding: number;
    confirmedRails: number;
    unconfirmedRails: number;
    /** Rails overlaid from Factory seat-intake (`seat-*` ids) — subset of confirmedRails+unconfirmedRails. */
    seatSourcedRails?: number;
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
    /** Compact presence counts mirrored from `presence` for ops cards. */
    presencePartners?: number;
    presenceIpv6?: number;
    presenceUniqueZips?: number;
    presenceUniqueAsns?: number;
    presenceDnsResolved?: number;
    /** Compact venue counts */
    venueKinds?: number;
    venueExchanges?: number;
    venueCrypto?: number;
    venueCreditLines?: number;
    venueLegalStates?: number;
    profilePhones?: number;
    profileTelegramLanes?: number;
    expertLiquidityAvailable?: number;
    avgAgentClvBps?: number | null;
    openDeals?: number;
    /** MessageLog / experiment / rotor densification rollups. */
    messageLogEntries?: number;
    messageLogSlaBreaches?: number;
    experimentOutcomes?: number;
    avgExperimentLiftPct?: number | null;
    rotorSamples?: number;
    capitalMoves?: number;
    warmCyclesOpen?: number;
    gate12Events?: number;
    bufferHistoryDays?: number;
    balanceSheetsOk?: number;
    limitRefreshes?: number;
    railConfirmEvents?: number;
    switchbackWindows?: number;
    releaseCards?: number;
    deferredPlays?: number;
    pendingExposureTotal?: number;
    recycleCyclesOpen?: number;
    complianceOpen?: number;
    auditTrailRows?: number;
    slaBreaches7d?: number;
    wdQueuedTotal?: number;
    wdBlockedTotal?: number;
    exposureAging72hPlus?: number;
    onbChecklistPending?: number;
    settlementSlots7d?: number;
    constraintRopeCount?: number;
    playSettlementPending?: number;
    exceptionResolutionOpen?: number;
    botCommands24h?: number;
    bicHandoffsTotal?: number;
    warmPlaybookPending?: number;
    phoneLogEvents?: number;
    avgLiquidityUtilPct?: number | null;
    fundCorridorsBlocked?: number;
    railUtilHighCount?: number;
    accountGatesFailed?: number;
    capitalLocationMoves?: number;
    pendingDeployItems?: number;
    playInstructionsStale?: number;
    dealSplitDrift?: number;
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
  /** Rails overlaid from Factory seat-intake (`seat-*` ids) — see [`seat-desk-rails-bridge.ts`](./seat-desk-rails-bridge.ts). */
  seatSourcedRails?: number;
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
  /** Presence / geo-network rollups (optional until fixture baked). */
  presencePartners?: number;
  presenceIpv6?: number;
  presenceUniqueZips?: number;
  presenceUniqueAsns?: number;
  presenceDnsResolved?: number;
  presenceAvgDistanceKm?: number | null;
  venueKinds?: number;
  venueExchanges?: number;
  venueCrypto?: number;
  venueCreditLines?: number;
  venueLegalStates?: number;
  profilePhones?: number;
  profileTelegramLanes?: number;
  expertLiquidityAvailable?: number;
  avgAgentClvBps?: number | null;
  openDeals?: number;
  messageLogEntries?: number;
  messageLogSlaBreaches?: number;
  experimentOutcomes?: number;
  avgExperimentLiftPct?: number | null;
  rotorSamples?: number;
  capitalMoves?: number;
  warmCyclesOpen?: number;
  gate12Events?: number;
  bufferHistoryDays?: number;
  balanceSheetsOk?: number;
  limitRefreshes?: number;
  railConfirmEvents?: number;
  switchbackWindows?: number;
  releaseCards?: number;
  deferredPlays?: number;
  pendingExposureTotal?: number;
  recycleCyclesOpen?: number;
  complianceOpen?: number;
  auditTrailRows?: number;
  slaBreaches7d?: number;
  wdQueuedTotal?: number;
  wdBlockedTotal?: number;
  exposureAging72hPlus?: number;
  onbChecklistPending?: number;
  settlementSlots7d?: number;
  constraintRopeCount?: number;
  playSettlementPending?: number;
  exceptionResolutionOpen?: number;
  botCommands24h?: number;
  bicHandoffsTotal?: number;
  warmPlaybookPending?: number;
  phoneLogEvents?: number;
  avgLiquidityUtilPct?: number | null;
  fundCorridorsBlocked?: number;
  railUtilHighCount?: number;
  accountGatesFailed?: number;
  capitalLocationMoves?: number;
  pendingDeployItems?: number;
  playInstructionsStale?: number;
  dealSplitDrift?: number;
};
