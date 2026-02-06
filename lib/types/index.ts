/**
 * 🏷️ FactoryWager Type Definitions
 * 
 * Central type definitions for the monorepo
 * 
 * @version 1.0.0
 */

// Re-export core types
export * from '../core/core-types';

// FactoryWager specific types
export type Severity = 'success' | 'warning' | 'error' | 'muted';
export type ProfileType = 'cpu' | 'heap' | 'diagnostic' | 'dual-cpu-heap';
export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'ansi256' | 'number';

// Project categories
export type ProjectCategory = 
  | 'games'
  | 'automation' 
  | 'analysis'
  | 'utilities'
  | 'enterprise'
  | 'apps'
  | 'dashboards'
  | 'development'
  | 'experimental'
  | 'experiments'
  | 'tools';

// R2 metadata types
export interface R2Metadata {
  'factorywager:version': string;
  'profile:type': ProfileType;
  'profile:timestamp': string;
  'profile:severity': Severity;
  'visual:theme': string;
  'visual:color-hex': string;
  'visual:color-rgb': string;
  'visual:color-hsl': string;
  'visual:ansi-sample': string;
  'system:compression': string;
  'system:compression-ratio': string;
  'system:runtime': string;
  'audit:git-commit'?: string;
  'audit:ci-run'?: string;
}

// Performance metrics
export interface PerformanceMetrics {
  cpu: {
    usage: number;
    threshold: number;
    severity: Severity;
  };
  memory: {
    usage: number;
    threshold: number;
    severity: Severity;
  };
  network: {
    latency: number;
    threshold: number;
    severity: Severity;
  };
}

// Project configuration
export interface ProjectConfig {
  name: string;
  category: ProjectCategory;
  description: string;
  version: string;
  dependencies?: string[];
  scripts?: Record<string, string>;
}

// FactoryWager theme configuration
export interface ThemeConfig {
  colors: Record<string, string>;
  severity: Record<Severity, string>;
  animations: {
    enabled: boolean;
    speed: number;
  };
}
