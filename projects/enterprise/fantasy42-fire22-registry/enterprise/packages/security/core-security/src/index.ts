/**
 * Fantasy42-Fire22 Core Security Package
 * Main entry point for security functionality
 */

// Export user agent management
export * from './user-agents';

// Export secure HTTP client
export * from './secure-client';

// Re-export types for convenience
export type { EmployeeData } from '../../../src/types/employee';

// Package metadata
export const PACKAGE_INFO = {
  name: '@fire22-registry/core-security',
  version: '3.1.0',
  description: 'Core security package for Fantasy42-Fire22 Registry',
  features: ['User Agent Management', 'Secure HTTP Client', 'Fraud Detection', 'Compliance Tools'],
};

console.log(`🚀 ${PACKAGE_INFO.name} v${PACKAGE_INFO.version} loaded`);
console.log(`   Features: ${PACKAGE_INFO.features.join(', ')}`);
