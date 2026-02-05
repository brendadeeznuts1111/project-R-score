/**
 * @duoplus/status-system
 * 18-endpoint status system with subscription management
 * Version: 3.7.0
 */

// Core exports
export { default as StatusWorker } from '../../deployment/workers/status-worker-18-endpoints.ts';
export { SubscriptionManagerDO } from '../../deployment/workers/subscription-manager.ts';

// Matrix integration
export { 
  STATUS_SYSTEM_MATRIX, 
  StatusSystemMatrixIntegration 
} from '../../src/utils/status-system-matrix.ts';

// Constants and types
export { 
  TIMEZONE_MATRIX,
  getStatusSystemVersion,
  getStatusSystemEndpoints,
  getDeploymentUrl,
  isStatusSystemIntegrated,
  isWorkspaceFullyIntegrated,
  type ValidTimezone,
  type ValidScope,
  type StatusCategory
} from '../../config/constants-v37.ts';

// Master matrix
export { COMPLETE_MASTER_MATRIX } from '../../src/utils/complete-master-matrix.ts';

// Utility functions
export function createStatusSystemConfig() {
  return {
    version: getStatusSystemVersion(),
    endpoints: getStatusSystemEndpoints(),
    deploymentUrl: getDeploymentUrl(),
    integrated: isStatusSystemIntegrated(),
    workspaceIntegrated: isWorkspaceFullyIntegrated()
  };
}

export function getStatusSystemSummary() {
  return StatusSystemMatrixIntegration.generateIntegrationReport();
}

// Default export
export default {
  version: '3.7.0',
  worker: StatusWorker,
  subscriptionManager: SubscriptionManagerDO,
  matrix: StatusSystemMatrixIntegration,
  constants: TIMEZONE_MATRIX,
  config: createStatusSystemConfig,
  summary: getStatusSystemSummary
};
