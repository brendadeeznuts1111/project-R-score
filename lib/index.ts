/**
 * 🏭 FactoryWager Library Index
 * 
 * The heart of all projects - centralized constants, types, utilities, and theming
 * 
 * @version 4.0
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

// Constants and configuration
export * from './constants';
export * from './config';
export * from './types';
export * from './utils';

// Re-export commonly used items
export { styled, log, FW_COLORS } from './theme/colors';
export { FACTORYWAGER_CONFIG, PERFORMANCE_THRESHOLDS } from './config';
export { Utils } from './utils';

/**
 * FactoryWager Library Info
 */
export const LIB_INFO = {
  name: 'FactoryWager',
  version: '4.0',
  description: 'The heart of FactoryWager monorepo - centralized infrastructure',
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
  
  // Types
  types: {
    Severity: {} as any, // Will be populated by actual types
    ProfileType: {} as any,
  },
} as const;
