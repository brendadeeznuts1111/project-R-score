/**
 * 🏭 FactoryWager Library Index
 * 
 * The heart of all projects - centralized constants, types, utilities, theming, documentation, and security
 * 
 * @version 5.1
 * @author FactoryWager Team
 */

// Core infrastructure
export * from './core-types';
export * from './core-errors';
export * from './core-validation';
export * from './core-documentation';

// Theme and styling
export * from './theme/colors';
export * from './terminal-color-256';

// Documentation
export * from './docs';

// Security (NEW v5.1)
export * from './security';

// Constants and configuration
export * from './constants';
export * from './config';
export * from './types';
export * from './utils';

// Re-export commonly used items
export { styled, log, FW_COLORS } from './theme/colors';
export { FACTORYWAGER_CONFIG, PERFORMANCE_THRESHOLDS } from './config';
export { Utils } from './utils';
export { DOC_PATTERNS, DocumentationUtils } from './docs';
export { VersionedSecretManager, SecurityUtils } from './security';

/**
 * FactoryWager Library Info
 */
export const LIB_INFO = {
  name: 'FactoryWager',
  version: '5.1',
  description: 'The heart of FactoryWager monorepo - centralized infrastructure with temporal security',
  author: 'FactoryWager Team',
  license: 'MIT',
} as const;

/**
 * Quick access to most used exports
 */
export const FW = {
  // Theme
  colors: FW_COLORS,
  styled,
  log,
  
  // Config
  config: FACTORYWAGER_CONFIG,
  
  // Utils
  utils: Utils,
  
  // Documentation
  docs: {
    patterns: DOC_PATTERNS,
    utils: DocumentationUtils,
  },
  
  // Security (v5.1)
  security: {
    versionedSecrets: VersionedSecretManager,
    utils: SecurityUtils,
  },
  
  // Types
  types: {
    Severity: {} as any, // Will be populated by actual types
    ProfileType: {} as any,
  },
} as const;
