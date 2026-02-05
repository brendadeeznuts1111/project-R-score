// =============================================================================
// VAULT ANALYTICS TYPES - ODDS PROTOCOL - 2025-11-19
// =============================================================================
// AUTHOR: Odds Protocol Team
// VERSION: 1.0.0
// LAST_UPDATED: 2025-11-19T02:16:00Z
// DESCRIPTION: Analytics type definitions extracted from monolithic file
// =============================================================================

// =============================================================================
// [ANALYTICS_TYPES] - 2025-11-19
// =============================================================================

export interface VaultAnalytics {
    overview: AnalyticsOverview;
    content: ContentAnalytics;
    usage: UsageAnalytics;
    performance: PerformanceAnalytics;
}

export interface AnalyticsOverview {
    totalDocuments: number;
    totalWords: number;
    averageDocumentLength: number;
    mostActiveDay: string;
    growthRate: number;
}

export interface ContentAnalytics {
    documentsByType: Record<string, number>;
    documentsByFolder: Record<string, number>;
    tagFrequency: Record<string, number>;
    linkDensity: number;
    orphanedDocuments: number;
}

export interface UsageAnalytics {
    dailyActivity: DailyActivity[];
    topDocuments: TopDocument[];
    searchQueries: SearchQuery[];
    templateUsage: Record<string, number>;
}

export interface DailyActivity {
    date: string;
    documentsCreated: number;
    documentsModified: number;
    documentsDeleted: number;
    activeTime: number; // minutes
}

export interface TopDocument {
    path: string;
    views: number;
    edits: number;
    lastAccessed: Date;
}

export interface SearchQuery {
    query: string;
    frequency: number;
    resultsCount: number;
    timestamp: Date;
}

export interface PerformanceAnalytics {
    loadTimes: LoadTimeMetrics;
    searchPerformance: SearchPerformanceMetrics;
    resourceUsage: ResourceUsageMetrics;
}

export interface LoadTimeMetrics {
    averageLoadTime: number;
    slowestLoadTime: number;
    fastestLoadTime: number;
    loadTimeHistory: number[];
}

export interface SearchPerformanceMetrics {
    averageSearchTime: number;
    searchTimeHistory: number[];
    queryComplexity: Record<string, number>;
}

export interface ResourceUsageMetrics {
    memoryUsage: MemoryUsage;
    diskUsage: DiskUsage;
    cpuUsage: CpuUsage;
}

export interface MemoryUsage {
    current: number;
    peak: number;
    average: number;
    history: number[];
}

export interface DiskUsage {
    totalSize: number;
    usedSpace: number;
    freeSpace: number;
    largestFiles: FileSizeInfo[];
}

export interface FileSizeInfo {
    path: string;
    size: number;
    percentage: number;
}

export interface CpuUsage {
    current: number;
    peak: number;
    average: number;
    history: number[];
}

// =============================================================================
// [METRICS_TYPES] - 2025-11-19
// =============================================================================

export interface VaultMetrics {
    health: HealthMetrics;
    quality: QualityMetrics;
    engagement: EngagementMetrics;
}

export interface HealthMetrics {
    overallScore: number;
    brokenLinks: number;
    orphanedFiles: number;
    duplicateContent: number;
    validationErrors: number;
}

export interface QualityMetrics {
    completenessScore: number;
    consistencyScore: number;
    accuracyScore: number;
    timelinessScore: number;
}

export interface EngagementMetrics {
    dailyActiveUsers: number;
    sessionDuration: number;
    bounceRate: number;
    retentionRate: number;
}

// =============================================================================
// [REPORTING_TYPES] - 2025-11-19
// =============================================================================

export interface AnalyticsReport {
    id: string;
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    generatedAt: Date;
    period: {
        start: Date;
        end: Date;
    };
    data: VaultAnalytics;
    insights: AnalyticsInsight[];
    recommendations: Recommendation[];
}

export interface AnalyticsInsight {
    type: 'trend' | 'anomaly' | 'opportunity' | 'warning';
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    data: Record<string, unknown>;
}

export interface Recommendation {
    priority: 'low' | 'medium' | 'high';
    category: 'organization' | 'content' | 'performance' | 'usage';
    title: string;
    description: string;
    actionItems: string[];
    estimatedImpact: string;
}
