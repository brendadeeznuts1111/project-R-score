/**
 * Process-wide, reversible offline guard for Bun's userland network entrypoints.
 *
 * The only network destinations admitted are loopback test fixtures. Unix-domain
 * sockets are local IPC and are admitted as well. Everything else fails before
 * the captured runtime function is invoked.
 */
export { installOfflineSocketSentinel } from './offline-socket-sentinel-adapters.ts';
export {
  isOfflineLoopbackHost,
  OfflineSocketDeniedError,
  type OfflineSocketApi,
} from './offline-socket-sentinel-policy.ts';
