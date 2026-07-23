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
export { ensureMonitoringSchema } from './schema.ts';
export { renderMonitoringHtml } from './page.ts';
