/**
 * Ops monitoring — collect metrics + Bun.inspect.table HTML page.
 */
export {
  collectMonitoring,
  countPackages,
  formatUptime,
  getLastIntegrity,
  loadRegistryIndex,
  mergeIntegritySnapshots,
  readRegistryIntegrityFile,
  recordIntegrityCheck,
  type IntegritySnapshot,
  type MonitoringPayload,
  type RegistryIndex,
} from './collect.ts';
export {
  loadComplianceMonitoringSlice,
  loadComplianceSummarySliceSync,
  projectComplianceHealthArtifact,
  isComplianceBoardOk,
  COMPLIANCE_BOARD_PATH,
  COMPLIANCE_PORTAL_PATH,
  type ComplianceMonitoringSlice,
  type ComplianceSummarySlice,
  type ComplianceHealthArtifact,
} from './compliance-slice.ts';
export {
  loadLimitRaisesMonitoringSlice,
  loadLimitRaisesSummarySliceSync,
  projectLimitRaisesHealthArtifact,
  LIMIT_RAISES_BOARD_PATH,
  LIMIT_RAISES_PORTAL_PATH,
  type LimitRaisesMonitoringSlice,
  type LimitRaisesSummarySlice,
  type LimitRaisesHealthArtifact,
} from './limit-slice.ts';
export {
  loadMonorepoHealthSummarySliceSync,
  loadMonorepoHealthBake,
  projectMonorepoHealthBake,
  projectMonorepoHealthHealthArtifact,
  bakeMonorepoHealthRegistry,
  reportToRegistryBake,
  MONOREPO_HEALTH_REGISTRY_PATH,
  MONOREPO_HEALTH_REGISTRY_REL,
  MONOREPO_HEALTH_PORTAL_PACKAGES,
  MONOREPO_HEALTH_CLAIM,
  type MonorepoHealthSummarySlice,
  type MonorepoHealthRegistryBake,
  type MonorepoHealthHealthArtifact,
} from './monorepo-health-slice.ts';
export {
  collectInstallCacheMonitoringSlice,
  type InstallCacheMonitoringSlice,
} from './install-cache-slice.ts';
export {
  loadInstallHygieneMonitoringSlice,
  loadInstallHygieneSummarySliceSync,
  parseInstallHygieneReport,
  projectInstallHygieneReport,
  toInstallHygieneOpsSlice,
  INSTALL_HYGIENE_BOARD_PATH,
  INSTALL_HYGIENE_PORTAL_PATH,
  INSTALL_HYGIENE_REGISTRY_REL,
  INSTALL_HYGIENE_STALE_AFTER_MS,
  type InstallHygieneMonitoringSlice,
  type InstallHygieneOpsSlice,
} from './install-hygiene-slice.ts';
export { ensureMonitoringSchema } from './schema.ts';
export { renderMonitoringHtml } from './page.ts';
export { enrichMonitoringForSnapshot, type MonitoringSnapshotExtras } from './enrich-snapshot.ts';
export { bakeMonitoringPage, bakeMonitoringPageDefault } from './bake-page.ts';
