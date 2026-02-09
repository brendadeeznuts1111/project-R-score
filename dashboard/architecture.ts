#!/usr/bin/env bun

/**
 * 🏗️ Dashboard Architecture - Enterprise Bun Documentation System
 *
 * Comprehensive module and section definitions for the integrated dashboard
 */

export enum DashboardModule {
  CORE_RUNTIME = 'core_runtime',
  FILE_SYSTEM = 'file_system',
  HTTP_SERVER = 'http_server',
  NETWORKING = 'networking',
  DATA_STORAGE = 'data_storage',
  CONCURRENCY = 'concurrency',
  PROCESS_SYSTEM = 'process_system',
  INTEROP_TOOLING = 'interop_tooling',
  UTILITIES = 'utilities'
}

export interface DashboardSection {
  id: string;
  title: string;
  description: string;
  category: DashboardModule;
  documentation: {
    technical: string;      // bun.sh/docs
    reference: string;      // bun.com/reference
    guides: string;         // bun.com/guides
    examples: string;       // Code examples
    github?: string;        // GitHub source
  };
  endpoints: string[];      // API endpoints
  relatedSections: string[]; // Related section IDs
  status: 'stable' | 'beta' | 'experimental' | 'deprecated';
  version: string;
  lastUpdated: Date;
}

export interface DashboardModuleConfig {
  module: DashboardModule;
  title: string;
  description: string;
  icon: string;
  color: string;
  sections: DashboardSection[];
  metrics?: {
    endpointCount: number;
    exampleCount: number;
    documentationPages: number;
    lastUpdate: Date;
  };
}
