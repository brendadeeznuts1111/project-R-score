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
export { ensureMonitoringSchema } from './schema.ts';
export { renderMonitoringHtml } from './page.ts';
export { enrichMonitoringForSnapshot, type MonitoringSnapshotExtras } from './enrich-snapshot.ts';
export { bakeMonitoringPage, bakeMonitoringPageDefault } from './bake-page.ts';
