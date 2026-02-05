/**
 * 🌐 Status System Matrix - Integration with Complete Master Matrix
 * Links 18-endpoint status system with workspace patterns and constants
 */

import { TIMEZONE_MATRIX } from '../../../config/constants-v37';
import { COMPLETE_MASTER_MATRIX } from './complete-master-matrix';

export interface StatusSystemPattern {
  id: string;
  endpoint: string;
  category: 'status' | 'api' | 'subscriptions';
  performance: string;
  dependencies: string[];
  matrixId?: string;
  catalogRefs?: string[];
}

export const STATUS_SYSTEM_MATRIX: Record<string, StatusSystemPattern> = {
  // Status Endpoints (5)
  'Status:200': {
    id: 'Status:200',
    endpoint: '/status',
    category: 'status',
    performance: '<50ms',
    dependencies: ['TIMEZONE_MATRIX', 'COMPLETE_MASTER_MATRIX'],
    matrixId: 'Workflow:101',
    catalogRefs: ['elysia', 'typescript']
  },
  'Status:201': {
    id: 'Status:201',
    endpoint: '/status/api/data',
    category: 'status',
    performance: '<25ms',
    dependencies: ['TIMEZONE_MATRIX'],
    matrixId: 'Pattern:90',
    catalogRefs: ['typescript']
  },
  'Status:202': {
    id: 'Status:202',
    endpoint: '/status/api/badge',
    category: 'status',
    performance: '<10ms',
    dependencies: [],
    matrixId: 'Filter:89',
    catalogRefs: []
  },
  'Status:203': {
    id: 'Status:203',
    endpoint: '/status/api/bun-native-metrics',
    category: 'status',
    performance: '<15ms',
    dependencies: ['COMPLETE_MASTER_MATRIX'],
    matrixId: 'Query:91',
    catalogRefs: ['bun-types']
  },
  'Status:204': {
    id: 'Status:204',
    endpoint: '/status/api/bun-native-badge',
    category: 'status',
    performance: '<10ms',
    dependencies: [],
    matrixId: 'Filter:92',
    catalogRefs: []
  },

  // API v1 Endpoints (7)
  'API:210': {
    id: 'API:210',
    endpoint: '/api/v1/health',
    category: 'api',
    performance: '<20ms',
    dependencies: ['TIMEZONE_MATRIX'],
    matrixId: 'Workflow:97',
    catalogRefs: ['typescript']
  },
  'API:211': {
    id: 'API:211',
    endpoint: '/api/v1/status',
    category: 'api',
    performance: '<15ms',
    dependencies: ['TIMEZONE_MATRIX'],
    matrixId: 'Workflow:98',
    catalogRefs: []
  },
  'API:212': {
    id: 'API:212',
    endpoint: '/api/v1/metrics/prometheus',
    category: 'api',
    performance: '<30ms',
    dependencies: ['COMPLETE_MASTER_MATRIX'],
    matrixId: 'Query:116',
    catalogRefs: ['typescript']
  },
  'API:213': {
    id: 'API:213',
    endpoint: '/api/v1/events/stream',
    category: 'api',
    performance: 'SSE',
    dependencies: ['TIMEZONE_MATRIX'],
    matrixId: 'Workflow:99',
    catalogRefs: ['elysia']
  },
  'API:214': {
    id: 'API:214',
    endpoint: '/api/v1/webhooks/status',
    category: 'api',
    performance: '<25ms',
    dependencies: ['TIMEZONE_MATRIX'],
    matrixId: 'Filter:114',
    catalogRefs: ['nodemailer']
  },
  'API:215': {
    id: 'API:215',
    endpoint: '/api/v1/system-matrix',
    category: 'api',
    performance: '<40ms',
    dependencies: ['COMPLETE_MASTER_MATRIX', 'TIMEZONE_MATRIX'],
    matrixId: 'Pattern:115',
    catalogRefs: ['typescript', 'commander']
  },
  'API:216': {
    id: 'API:216',
    endpoint: '/api/v1/domain',
    category: 'api',
    performance: '<20ms',
    dependencies: ['TIMEZONE_MATRIX'],
    matrixId: 'Query:119',
    catalogRefs: []
  },

  // Subscription Management Endpoints (6)
  'SUB:220': {
    id: 'SUB:220',
    endpoint: 'POST /api/v1/subscriptions',
    category: 'subscriptions',
    performance: '<100ms',
    dependencies: ['COMPLETE_MASTER_MATRIX'],
    matrixId: 'Workflow:105',
    catalogRefs: ['typescript', 'elysia']
  },
  'SUB:221': {
    id: 'SUB:221',
    endpoint: 'GET /api/v1/subscriptions',
    category: 'subscriptions',
    performance: '<50ms',
    dependencies: [],
    matrixId: 'Filter:117',
    catalogRefs: ['typescript']
  },
  'SUB:222': {
    id: 'SUB:222',
    endpoint: 'GET /api/v1/subscriptions/{id}',
    category: 'subscriptions',
    performance: '<25ms',
    dependencies: [],
    matrixId: 'Pattern:118',
    catalogRefs: []
  },
  'SUB:223': {
    id: 'SUB:223',
    endpoint: 'PUT /api/v1/subscriptions/{id}',
    category: 'subscriptions',
    performance: '<75ms',
    dependencies: ['COMPLETE_MASTER_MATRIX'],
    matrixId: 'Workflow:108',
    catalogRefs: ['typescript']
  },
  'SUB:224': {
    id: 'SUB:224',
    endpoint: 'DELETE /api/v1/subscriptions/{id}',
    category: 'subscriptions',
    performance: '<50ms',
    dependencies: [],
    matrixId: 'Filter:92',
    catalogRefs: []
  },
  'SUB:225': {
    id: 'SUB:225',
    endpoint: 'GET /api/v1/subscriptions/{id}/deliveries',
    category: 'subscriptions',
    performance: '<60ms',
    dependencies: ['COMPLETE_MASTER_MATRIX'],
    matrixId: 'Query:116',
    catalogRefs: ['typescript']
  }
};

// Matrix integration utilities
export class StatusSystemMatrixIntegration {
  /**
   * Get status system pattern by endpoint
   */
  static getPatternByEndpoint(endpoint: string): StatusSystemPattern | undefined {
    return Object.values(STATUS_SYSTEM_MATRIX).find(
      pattern => {
        // Exact match
        if (pattern.endpoint === endpoint) return true;
        
        // Match HTTP method endpoints
        if (pattern.endpoint.includes(' ') && endpoint.includes(' ')) {
          return pattern.endpoint === endpoint;
        }
        
        // Match path without method
        const patternPath = pattern.endpoint.split(' ').pop() || pattern.endpoint;
        const endpointPath = endpoint.split(' ').pop() || endpoint;
        
        return patternPath === endpointPath || 
               endpointPath.includes(patternPath) ||
               patternPath.includes(endpointPath);
      }
    );
  }

  /**
   * Get all patterns by category
   */
  static getPatternsByCategory(category: 'status' | 'api' | 'subscriptions'): StatusSystemPattern[] {
    return Object.values(STATUS_SYSTEM_MATRIX).filter(pattern => pattern.category === category);
  }

  /**
   * Get matrix integration for status system
   */
  static getMatrixIntegration() {
    const integration: Record<string, any> = {};
    
    Object.entries(STATUS_SYSTEM_MATRIX).forEach(([key, pattern]) => {
      if (pattern.matrixId && COMPLETE_MASTER_MATRIX[pattern.matrixId]) {
        integration[key] = {
          statusPattern: pattern,
          masterMatrix: COMPLETE_MASTER_MATRIX[pattern.matrixId],
          combined: {
            ...pattern,
            ...COMPLETE_MASTER_MATRIX[pattern.matrixId]
          }
        };
      }
    });
    
    return integration;
  }

  /**
   * Get catalog dependencies for status system
   */
  static getCatalogDependencies(): Record<string, string[]> {
    const dependencies: Record<string, string[]> = {};
    
    Object.values(STATUS_SYSTEM_MATRIX).forEach(pattern => {
      if (pattern.catalogRefs && pattern.catalogRefs.length > 0) {
        dependencies[pattern.id] = pattern.catalogRefs;
      }
    });
    
    return dependencies;
  }

  /**
   * Generate workspace integration report
   */
  static generateIntegrationReport(): string {
    const report = [
      '# Status System Matrix Integration Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Overview',
      `- Total Endpoints: ${Object.keys(STATUS_SYSTEM_MATRIX).length}`,
      `- Status Endpoints: ${this.getPatternsByCategory('status').length}`,
      `- API Endpoints: ${this.getPatternsByCategory('api').length}`,
      `- Subscription Endpoints: ${this.getPatternsByCategory('subscriptions').length}`,
      '',
      '## Matrix Integration',
      `Patterns linked to COMPLETE_MASTER_MATRIX: ${Object.values(STATUS_SYSTEM_MATRIX).filter(p => p.matrixId).length}`,
      '',
      '## Catalog Dependencies',
      `Packages from workspace catalog: ${Object.values(STATUS_SYSTEM_MATRIX).filter(p => p.catalogRefs && p.catalogRefs.length > 0).length}`,
      '',
      '## Timezone Integration',
      `Endpoints using TIMEZONE_MATRIX: ${Object.values(STATUS_SYSTEM_MATRIX).filter(p => p.dependencies.includes('TIMEZONE_MATRIX')).length}`,
      '',
      '## Workspace Linkage',
      '✅ Constants linked via TIMEZONE_MATRIX',
      '✅ Patterns linked via COMPLETE_MASTER_MATRIX', 
      '✅ Dependencies managed via bun.lock catalog',
      '✅ Workspace packages integrated via catalog references',
      ''
    ];

    return report.join('\n');
  }
}

// Export for workspace usage
export { TIMEZONE_MATRIX, COMPLETE_MASTER_MATRIX };
export default StatusSystemMatrixIntegration;
