#!/usr/bin/env bun
/**
 * Enhanced Nebula-Flow™ Dashboard Schema with Categories & Filtering
 * Adds category tags and advanced filtering capabilities to dashboard exports
 */

interface CategoryTag {
  primary: string;
  secondary?: string[];
  priority: 'critical' | 'high' | 'medium' | 'low' | 'info';
  domain: 'system' | 'network' | 'financial' | 'operational' | 'security' | 'performance';
  tags: string[];
}

interface FilterOptions {
  categories?: string[];
  priorities?: string[];
  domains?: string[];
  tags?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
}

interface EnhancedLogEntry {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  category: CategoryTag;
  metadata?: Record<string, any>;
}

interface EnhancedDashboardExport {
  timestamp: string;
  version: string;
  categories: {
    system: CategoryTag;
    network: CategoryTag;
    financial: CategoryTag;
    operational: CategoryTag;
    security: CategoryTag;
  };
  data: {
    system: {
      uptime: number;
      deviceCount: number;
      systemHealth: {
        cpu: number;
        memory: number;
        disk: number;
        network: number;
      };
      category: CategoryTag;
    };
    logs: EnhancedLogEntry[];
    config: Record<string, any> & { category: CategoryTag };
    atlasData?: any & { category: CategoryTag };
    metricsData?: any & { category: CategoryTag };
  };
  filters: {
    available: FilterOptions;
    active?: FilterOptions;
  };
  metadata: {
    exportType: string;
    exportedBy: string;
    exportDate: string;
    categories: string[];
    totalEntries: number;
    filteredEntries?: number;
  };
}

class EnhancedDashboardProcessor {
  private data: any;

  constructor(data: any) {
    this.data = data;
  }

  enhance(): EnhancedDashboardExport {
    const enhanced: EnhancedDashboardExport = {
      timestamp: this.data.timestamp,
      version: this.data.version,
      categories: this.defineCategories(),
      data: {
        system: {
          ...this.data.system,
          category: this.getCategoryTag('system')
        },
        logs: this.enhanceLogs(this.data.logs),
        config: {
          ...this.data.config,
          category: this.getCategoryTag('configuration')
        },
        atlasData: this.data.atlasData ? {
          ...this.data.atlasData,
          category: this.getCategoryTag('atlas')
        } : undefined,
        metricsData: this.data.metricsData ? {
          ...this.data.metricsData,
          category: this.getCategoryTag('metrics')
        } : undefined
      },
      filters: {
        available: this.getAvailableFilters(),
        active: undefined
      },
      metadata: {
        ...this.data.metadata,
        categories: ['system', 'network', 'financial', 'operational', 'security', 'configuration', 'atlas', 'metrics'],
        totalEntries: this.calculateTotalEntries(),
        enhanced: true,
        filteringEnabled: true
      }
    };

    return enhanced;
  }

  private defineCategories(): EnhancedDashboardExport['categories'] {
    return {
      system: {
        primary: 'system',
        secondary: ['infrastructure', 'health'],
        priority: 'critical',
        domain: 'system',
        tags: ['uptime', 'health', 'resources', 'monitoring']
      },
      network: {
        primary: 'network',
        secondary: ['connectivity', 'lightning'],
        priority: 'high',
        domain: 'network',
        tags: ['lightning', 'channels', 'balance', 'transactions']
      },
      financial: {
        primary: 'financial',
        secondary: ['revenue', 'yield'],
        priority: 'high',
        domain: 'financial',
        tags: ['profit', 'yield', 'revenue', 'earnings']
      },
      operational: {
        primary: 'operational',
        secondary: ['devices', 'fleet'],
        priority: 'medium',
        domain: 'operational',
        tags: ['devices', 'fleet', 'operations', 'management']
      },
      security: {
        primary: 'security',
        secondary: ['encryption', 'access'],
        priority: 'high',
        domain: 'security',
        tags: ['security', 'encryption', 'authentication', 'access']
      }
    };
  }

  private getCategoryTag(type: string): CategoryTag {
    const categoryMap: Record<string, CategoryTag> = {
      'system': {
        primary: 'system',
        secondary: ['infrastructure'],
        priority: 'critical',
        domain: 'system',
        tags: ['health', 'uptime', 'resources']
      },
      'network': {
        primary: 'network',
        secondary: ['lightning', 'connectivity'],
        priority: 'high',
        domain: 'network',
        tags: ['lightning', 'channels', 'balance']
      },
      'financial': {
        primary: 'financial',
        secondary: ['yield', 'profit'],
        priority: 'high',
        domain: 'financial',
        tags: ['yield', 'profit', 'earnings']
      },
      'operational': {
        primary: 'operational',
        secondary: ['devices', 'fleet'],
        priority: 'medium',
        domain: 'operational',
        tags: ['devices', 'fleet', 'management']
      },
      'security': {
        primary: 'security',
        secondary: ['configuration'],
        priority: 'medium',
        domain: 'security',
        tags: ['config', 'settings', 'security']
      },
      'configuration': {
        primary: 'configuration',
        secondary: ['settings'],
        priority: 'low',
        domain: 'system',
        tags: ['config', 'settings', 'preferences']
      },
      'atlas': {
        primary: 'atlas',
        secondary: ['inventory', 'lifecycle'],
        priority: 'medium',
        domain: 'operational',
        tags: ['atlas', 'inventory', 'devices', 'snapshots']
      },
      'metrics': {
        primary: 'metrics',
        secondary: ['performance', 'analytics'],
        priority: 'medium',
        domain: 'performance',
        tags: ['metrics', 'performance', 'analytics', 'kpi']
      }
    };

    return categoryMap[type] || {
      primary: 'unknown',
      priority: 'low',
      domain: 'system',
      tags: ['unknown']
    };
  }

  private enhanceLogs(logs: any[]): EnhancedLogEntry[] {
    if (!logs || !Array.isArray(logs)) return [];
    return logs.map((log, index) => ({
      id: `log-${index}`,
      timestamp: log.timestamp,
      type: log.type,
      message: log.message,
      category: this.getLogCategory(log),
      metadata: {
        severity: this.getLogSeverity(log),
        impact: this.getLogImpact(log),
        actionable: this.isLogActionable(log)
      }
    }));
  }

  private getLogCategory(log: any): CategoryTag {
    const type = log.type;
    const message = log.message.toLowerCase();

    if (type === 'system' || message.includes('initialized') || message.includes('connected')) {
      return this.getCategoryTag('system');
    }
    if (type === 'lightning' || message.includes('lightning') || message.includes('channel')) {
      return this.getCategoryTag('network');
    }
    if (type === 'device' || message.includes('device') || message.includes('fleet')) {
      return this.getCategoryTag('operational');
    }
    if (type === 'atlas' || message.includes('atlas') || message.includes('inventory')) {
      return this.getCategoryTag('atlas');
    }
    if (type === 'metrics' || message.includes('metrics') || message.includes('performance')) {
      return this.getCategoryTag('metrics');
    }
    if (type === 'error' || type === 'warning') {
      return {
        primary: 'alert',
        secondary: [type],
        priority: type === 'error' ? 'critical' : 'high',
        domain: 'system',
        tags: [type, 'alert', 'monitoring']
      };
    }

    return this.getCategoryTag('system');
  }

  private getLogSeverity(log: any): string {
    const type = log.type;
    const message = log.message.toLowerCase();

    if (type === 'error') return 'high';
    if (type === 'warning') return 'medium';
    if (message.includes('failed') || message.includes('error')) return 'high';
    if (message.includes('warning') || message.includes('unavailable')) return 'medium';
    if (message.includes('success') || message.includes('completed')) return 'low';
    return 'info';
  }

  private getLogImpact(log: any): string {
    const type = log.type;
    const message = log.message.toLowerCase();

    if (type === 'error' || message.includes('failed')) return 'high';
    if (type === 'warning') return 'medium';
    if (message.includes('connected') || message.includes('initialized')) return 'low';
    if (message.includes('refreshed') || message.includes('updated')) return 'low';
    return 'medium';
  }

  private isLogActionable(log: any): boolean {
    const type = log.type;
    const message = log.message.toLowerCase();

    return type === 'error' ||
           type === 'warning' ||
           message.includes('failed') ||
           message.includes('error') ||
           message.includes('warning') ||
           message.includes('unavailable');
  }

  private getAvailableFilters(): FilterOptions {
    const logs = this.data.logs || [];
    const categories = new Set<string>();
    const priorities = new Set<string>();
    const domains = new Set<string>();
    const tags = new Set<string>();

    // Analyze logs for filter options
    logs.forEach((log: any) => {
      const category = this.getLogCategory(log);
      categories.add(category.primary);
      priorities.add(category.priority);
      domains.add(category.domain);
      category.tags.forEach(tag => tags.add(tag));
    });

    // Add data section categories
    ['system', 'configuration', 'atlas', 'metrics'].forEach(cat => {
      const category = this.getCategoryTag(cat);
      categories.add(category.primary);
      priorities.add(category.priority);
      domains.add(category.domain);
      category.tags.forEach(tag => tags.add(tag));
    });

    return {
      categories: Array.from(categories),
      priorities: Array.from(priorities),
      domains: Array.from(domains),
      tags: Array.from(tags),
      timeRange: {
        start: new Date(Math.min(...logs.map((l: any) => new Date(l.timestamp).getTime()))),
        end: new Date(Math.max(...logs.map((l: any) => new Date(l.timestamp).getTime())))
      }
    };
  }

  private calculateTotalEntries(): number {
    let count = 0;
    count += this.data.logs ? this.data.logs.length : 0;
    count += this.data.atlasData ? 1 : 0;
    count += this.data.metricsData ? 1 : 0;
    count += 1; // system
    count += 1; // config
    return count;
  }

  // Filtering methods
  filter(options: FilterOptions): EnhancedDashboardExport {
    const enhanced = this.enhance();

    if (!options || Object.keys(options).length === 0) {
      return enhanced;
    }

    // Filter logs based on criteria
    if (options.categories || options.priorities || options.domains || options.tags || options.search) {
      enhanced.data.logs = enhanced.data.logs.filter(log => {
        // Category filter
        if (options.categories && !options.categories.includes(log.category.primary)) {
          return false;
        }

        // Priority filter
        if (options.priorities && !options.priorities.includes(log.category.priority)) {
          return false;
        }

        // Domain filter
        if (options.domains && !options.domains.includes(log.category.domain)) {
          return false;
        }

        // Tags filter
        if (options.tags && !log.category.tags.some(tag => options.tags!.includes(tag))) {
          return false;
        }

        // Search filter
        if (options.search) {
          const search = options.search.toLowerCase();
          const searchable = `${log.type} ${log.message} ${log.category.primary} ${log.category.tags.join(' ')}`.toLowerCase();
          if (!searchable.includes(search)) {
            return false;
          }
        }

        // Time range filter
        if (options.timeRange) {
          const logTime = new Date(log.timestamp).getTime();
          if (logTime < options.timeRange.start.getTime() || logTime > options.timeRange.end.getTime()) {
            return false;
          }
        }

        return true;
      });
    }

    // Update metadata
    enhanced.filters.active = options;
    enhanced.metadata.filteredEntries = this.calculateTotalEntries(enhanced);

    return enhanced;
  }

  // Export methods
  exportJson(): string {
    return JSON.stringify(this.enhance(), null, 2);
  }

  exportFiltered(options: FilterOptions): string {
    return JSON.stringify(this.filter(options), null, 2);
  }

  // Statistics methods
  getStatistics(): any {
    const enhanced = this.enhance();

    const stats = {
      totalEntries: enhanced.metadata.totalEntries,
      categories: {} as Record<string, number>,
      priorities: {} as Record<string, number>,
      domains: {} as Record<string, number>,
      timeRange: {
        start: enhanced.filters.available.timeRange?.start,
        end: enhanced.filters.available.timeRange?.end,
        duration: enhanced.filters.available.timeRange ?
          enhanced.filters.available.timeRange.end.getTime() - enhanced.filters.available.timeRange.start.getTime() : 0
      }
    };

    // Count by categories
    enhanced.data.logs.forEach(log => {
      stats.categories[log.category.primary] = (stats.categories[log.category.primary] || 0) + 1;
      stats.priorities[log.category.priority] = (stats.priorities[log.category.priority] || 0) + 1;
      stats.domains[log.category.domain] = (stats.domains[log.category.domain] || 0) + 1;
    });

    return stats;
  }
}

// Export the class for external use
export { EnhancedDashboardProcessor };

// Usage example and file processing
async function processDashboardExport(filename: string) {
  try {
    const data = JSON.parse(await Bun.file(filename).text());
    const processor = new EnhancedDashboardProcessor(data);

    console.log('🧬 Nebula-Flow™ Enhanced Dashboard Processor');
    console.log('==========================================\n');

    // Show original data
    console.log('📊 Original Data:');
    console.log(`  • Logs: ${data.logs?.length || 0} entries`);
    console.log(`  • System: ${Object.keys(data.system || {}).length} metrics`);
    console.log(`  • Atlas: ${data.atlasData ? 'Present' : 'Not present'}`);
    console.log(`  • Metrics: ${data.metricsData ? 'Present' : 'Not present'}\n`);

    // Enhance the data
    const enhanced = processor.enhance();

    console.log('🔧 Enhanced Data:');
    console.log(`  • Categories: ${Object.keys(enhanced.categories).length}`);
    console.log(`  • Enhanced Logs: ${enhanced.data.logs.length} entries`);
    console.log(`  • Available Filters: ${enhanced.filters.available.categories?.length} categories`);
    console.log(`  • Time Range: ${enhanced.filters.available.timeRange?.start.toLocaleString()} - ${enhanced.filters.available.timeRange?.end.toLocaleString()}\n`);

    // Show statistics
    const stats = processor.getStatistics();
    console.log('📈 Statistics:');
    console.log(`  • Total Entries: ${stats.totalEntries}`);
    console.log(`  • Time Span: ${Math.round(stats.timeRange.duration / 1000)} seconds`);
    console.log('  • By Category:', stats.categories);
    console.log('  • By Priority:', stats.priorities);
    console.log('  • By Domain:', stats.domains);
    console.log('');

    // Example filtering
    console.log('🎯 Example Filtering:');

    // Filter for errors only
    const errorFilter = { categories: ['alert'] };
    const errorResults = processor.filter(errorFilter);
    console.log(`  • Error logs: ${errorResults.data.logs.length} entries`);

    // Filter for system events
    const systemFilter = { domains: ['system'] };
    const systemResults = processor.filter(systemFilter);
    console.log(`  • System events: ${systemResults.data.logs.length} entries`);

    // Filter by time range (last 30 seconds)
    const now = new Date();
    const thirtySecondsAgo = new Date(now.getTime() - 30000);
    const timeFilter = {
      timeRange: { start: thirtySecondsAgo, end: now }
    };
    const timeResults = processor.filter(timeFilter);
    console.log(`  • Last 30 seconds: ${timeResults.data.logs.length} entries`);

    // Export enhanced version
    const outputFile = filename.replace('.json', '-enhanced.json');
    await Bun.write(outputFile, processor.exportJson());

    console.log(`\n💾 Enhanced export saved to: ${outputFile}`);
    console.log('\n✅ Dashboard enhancement complete!');

  } catch (error) {
    console.error('❌ Error processing dashboard export:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  const filename = process.argv[2] || 'nebula-dashboard-2026-01-21.json';
  await processDashboardExport(filename);
}