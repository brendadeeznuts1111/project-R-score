/**
 * Partner Profile OS — Barrel Export
 *
 * Public API surface for the Partner Profile OS module.
 * All external consumption goes through this barrel.
 *
 * Zones that import from here:
 *   - Core Terminal: processSignal(), partnerProfileService
 *   - Telegram Hub: dispatchBySignalType(), autoCreateTelegramGroups()
 *   - Settlement: processSettlement(), getCommissionTiers()
 *   - Source Router: authorizeSource(), healthCheckSources()
 *   - Dashboard: renderDashboard()
 *   - Hot Reload: startTemplateWatcher()
 */

// ── Schemas & Types ──
export {
  PartnerProfileSchema,
  PartnerRuntimeStateSchema,
  ProfileTemplateSchema,
  ProfileSourceSchema,
  ProfileJurisdictionSchema,
  ProfileCultivationSchema,
  ProfileSettlementSchema,
  ProfileSORGateSchema,
  ProfileTelegramSchema,
  ProfileBalanceSchema,
  GateResultSchema,
  SignalContextSchema,
  CommissionTierSchema,
} from "./partner-profile-schema";

export type {
  PartnerProfile,
  PartnerRuntimeState,
  ProfileTemplate,
  ProfileSource,
  ProfileJurisdiction,
  ProfileCultivation,
  ProfileSettlement,
  ProfileSORGate,
  ProfileTelegram,
  ProfileBalance,
  GateResult,
  SignalContext,
  GateAction,
  LifecycleState,
  KycStatus,
  RiskLevel,
  CommissionTier,
} from "./partner-profile-schema";

// ── Loader ──
export {
  loadProfileTemplate,
  discoverTemplates,
  loadAndCacheTemplates,
  getTemplate,
  cacheTemplate,
  clearTemplateCache,
  listTemplateIds,
} from "./partner-profile-loader";

// ── Materializer ──
export {
  materializeProfile,
  transitionProfile,
  transitionByEvent,
  DEFAULT_RUNTIME,
} from "./partner-profile-materializer";
export type { TransitionResult } from "./partner-profile-materializer";

// ── THE KERNEL ──
export { PartnerGateway } from "./partner-gateway";

// ── Service ──
export {
  PartnerProfileService,
  partnerProfileService,
} from "./partner-profile-service";

// ── Source Router ──
export {
  refreshBookIndex,
  routeSignal,
  getPartnersForBook,
  getIndexedBooks,
} from "./partner-source-router";

// ── Cascade Engine ──
export {
  processSignal,
  processSignalRoute,
  releaseSignalExposure,
  processSignalBatch,
} from "./cascade-engine-integration";

// ── Telegram Integration ──
export {
  autoCreateTelegramGroups,
  createMemoryPartnerTopicMappingStore,
  createPartnerTelegramIntegration,
  dispatchBySignalType,
  getTopicMapping,
  telegramBotApiTransport,
} from "./telegram-integration";
export type {
  PartnerTelegramGateway,
  PartnerTelegramIntegration,
  PartnerTelegramIntegrationDependencies,
  PartnerTelegramTransport,
  PartnerTopicMappingStore,
  TelegramDispatchResult,
  TopicConfig,
  TopicStatus,
} from "./telegram-integration";

// ── Source Integration ──
export {
  authorizeSource,
  healthCheckSources,
  getSourceStatus,
} from "./source-integration";
export type { SourceHealthResult } from "./source-integration";

// ── Settlement Integration ──
export {
  processSettlement,
  getCommissionTiers,
  getCommissionRate,
  adjustMakeupBalance,
} from "./settlement-integration";
export type { BetResult, SettlementResult } from "./settlement-integration";

// ── Hot Reload ──
export {
  startTemplateWatcher,
  stopTemplateWatcher,
  isWatcherActive,
  reloadTemplates,
} from "./hot-reload";
