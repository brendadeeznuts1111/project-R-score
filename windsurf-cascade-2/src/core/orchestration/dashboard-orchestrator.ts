// Dashboard Orchestrator - Single Point of Entry
// Coordinates all dashboard systems and provides unified access

import { LatencyTracker } from '../metrics/latency-tracker';
import { ColorSchemeManager } from '../ui/color-schemes';
import { EnhancedHeaderManager } from '../api/enhanced-headers';

export interface DashboardConfig {
    theme: string;
    refreshInterval: number;
    enableAI: boolean;
    enableLatencyTracking: boolean;
    enablePatternAnalysis: boolean;
    enableCaching: boolean;
}

export interface DashboardMetrics {
    totalOperations: number;
    averageLatency: number;
    cacheEfficiency: number;
    systemHealth: number;
    activeEndpoints: number;
    detectedPatterns: number;
}

export interface DashboardSection {
    id: string;
    name: string;
    icon: string;
    active: boolean;
    metrics: any;
    lastUpdated: number;
}

class DashboardOrchestrator {
    private static instance: DashboardOrchestrator;
    private latencyTracker: LatencyTracker;
    private headerManager: EnhancedHeaderManager;
    private config: DashboardConfig;
    private sections: Map<string, DashboardSection> = new Map();
    private metrics: DashboardMetrics;
    private updateInterval: NodeJS.Timeout | null = null;

    private constructor() {
        this.latencyTracker = new LatencyTracker();
        this.headerManager = new EnhancedHeaderManager();
        this.config = this.getDefaultConfig();
        this.metrics = this.getInitialMetrics();
        this.initializeSections();
    }

    public static getInstance(): DashboardOrchestrator {
        if (!DashboardOrchestrator.instance) {
            DashboardOrchestrator.instance = new DashboardOrchestrator();
        }
        return DashboardOrchestrator.instance;
    }

    // Initialize the orchestrator
    public async initialize(config?: Partial<DashboardConfig>): Promise<void> {
        if (config) {
            this.config = { ...this.config, ...config };
        }

        // Apply theme
        ColorSchemeManager.setScheme(this.config.theme);
        ColorSchemeManager.applyTheme();

        // Register endpoints for latency tracking
        this.registerEndpoints();

        // Start real-time updates
        this.startRealTimeUpdates();

        // Initialize all sections
        await this.initializeAllSections();
    }

    // Get unified dashboard data
    public getDashboardData(): {
        sections: Array<DashboardSection>;
        metrics: DashboardMetrics;
        config: DashboardConfig;
        theme: any;
    } {
        return {
            sections: Array.from(this.sections.values()),
            metrics: this.metrics,
            config: this.config,
            theme: ColorSchemeManager.getCurrentScheme()
        };
    }

    // Switch between dashboard sections
    public switchSection(sectionId: string): boolean {
        const section = this.sections.get(sectionId);
        if (!section) {
            return false;
        }

        // Deactivate all sections
        this.sections.forEach(s => s.active = false);

        // Activate requested section
        section.active = true;
        section.lastUpdated = Date.now();

        // Update section-specific data
        this.updateSectionData(sectionId);

        return true;
    }

    // Get metrics for specific section
    public getSectionMetrics(sectionId: string): any {
        const section = this.sections.get(sectionId);
        if (!section) {
            return null;
        }

        switch (sectionId) {
            case 'overview':
                return this.getOverviewMetrics();
            case 'config':
                return this.getConfigMetrics();
            case 'latency':
                return this.getLatencyMetrics();
            case 'patterns':
                return this.getPatternMetrics();
            case 'ai':
                return this.getAIMetrics();
            default:
                return section.metrics;
        }
    }

    // Update configuration
    public updateConfig(updates: Partial<DashboardConfig>): void {
        this.config = { ...this.config, ...updates };

        // Apply theme if changed
        if (updates.theme) {
            ColorSchemeManager.setScheme(updates.theme);
            ColorSchemeManager.applyTheme();
        }

        // Restart real-time updates if interval changed
        if (updates.refreshInterval) {
            this.stopRealTimeUpdates();
            this.startRealTimeUpdates();
        }
    }

    // Export dashboard state
    public exportState(): string {
        const state = {
            config: this.config,
            metrics: this.metrics,
            sections: Array.from(this.sections.entries()),
            theme: ColorSchemeManager.getCurrentScheme(),
            latencyData: this.latencyTracker.exportMetrics(),
            timestamp: Date.now()
        };

        return JSON.stringify(state, null, 2);
    }

    // Import dashboard state
    public importState(stateJson: string): boolean {
        try {
            const state = JSON.parse(stateJson);

            if (state.config) {
                this.updateConfig(state.config);
            }

            if (state.theme) {
                ColorSchemeManager.setScheme(state.theme.name);
                ColorSchemeManager.applyTheme();
            }

            if (state.latencyData) {
                this.latencyTracker.importMetrics(state.latencyData);
            }

            return true;
        } catch (error) {
            console.error('Failed to import dashboard state:', error);
            return false;
        }
    }

    // Cleanup resources
    public cleanup(): void {
        this.stopRealTimeUpdates();
        this.latencyTracker.clearAllCache();
    }

    private getDefaultConfig(): DashboardConfig {
        return {
            theme: 'origin',
            refreshInterval: 2000,
            enableAI: true,
            enableLatencyTracking: true,
            enablePatternAnalysis: true,
            enableCaching: true
        };
    }

    private getInitialMetrics(): DashboardMetrics {
        return {
            totalOperations: 0,
            averageLatency: 0,
            cacheEfficiency: 0,
            systemHealth: 100,
            activeEndpoints: 0,
            detectedPatterns: 0
        };
    }

    private initializeSections(): void {
        const sections = [
            { id: 'overview', name: 'Overview', icon: 'dashboard' },
            { id: 'config', name: 'Configuration', icon: 'settings' },
            { id: 'latency', name: 'Latency', icon: 'clock' },
            { id: 'patterns', name: 'Patterns', icon: 'analytics' },
            { id: 'ai', name: 'AI Analysis', icon: 'psychology' }
        ];

        sections.forEach((section, index) => {
            this.sections.set(section.id, {
                ...section,
                active: index === 0, // First section is active
                metrics: {},
                lastUpdated: Date.now()
            });
        });
    }

    private registerEndpoints(): void {
        if (!this.config.enableLatencyTracking) return;

        // Register common endpoints for monitoring
        const endpoints = [
            {
                key: 'config-api',
                url: 'https://api.example.com/config',
                integration: 'config-service',
                method: 'GET',
                cacheable: true,
                cacheTTL: 300000,
                timeout: 5000,
                retries: 3,
                headers: {}
            },
            {
                key: 'user-api',
                url: 'https://api.example.com/users',
                integration: 'user-service',
                method: 'GET',
                cacheable: true,
                cacheTTL: 600000,
                timeout: 3000,
                retries: 3,
                headers: {}
            },
            {
                key: 'analytics-api',
                url: 'https://api.example.com/analytics',
                integration: 'analytics-service',
                method: 'POST',
                cacheable: false,
                timeout: 10000,
                retries: 2,
                headers: {}
            }
        ];

        endpoints.forEach(endpoint => {
            this.headerManager.registerEndpoint(endpoint.key, endpoint);
        });
    }

    private startRealTimeUpdates(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(() => {
            this.updateMetrics();
            this.updateActiveSection();
        }, this.config.refreshInterval);
    }

    private stopRealTimeUpdates(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    private updateMetrics(): void {
        // Simulate real-time metric updates
        this.metrics.totalOperations += Math.floor(Math.random() * 10);
        this.metrics.averageLatency = Math.floor(Math.random() * 100) + 50;
        this.metrics.cacheEfficiency = Math.floor(Math.random() * 30) + 70;
        this.metrics.systemHealth = Math.floor(Math.random() * 20) + 80;
        this.metrics.activeEndpoints = this.headerManager.getEndpointSummary().length;
        this.metrics.detectedPatterns = Math.floor(Math.random() * 5);

        // Record some sample latency data
        if (this.config.enableLatencyTracking) {
            this.recordSampleLatency();
        }
    }

    private recordSampleLatency(): void {
        const endpoints = ['config-api', 'user-api', 'analytics-api'];
        const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        
        this.latencyTracker.recordLatency(
            `https://api.example.com/${randomEndpoint}`,
            `${randomEndpoint}-service`,
            Math.random() * 1000,
            Math.random() > 0.9 ? 500 : 200,
            Math.random() > 0.7,
            Math.random() > 0.95 ? 'Sample error' : undefined
        );
    }

    private updateActiveSection(): void {
        const activeSection = Array.from(this.sections.values()).find(s => s.active);
        if (activeSection) {
            this.updateSectionData(activeSection.id);
        }
    }

    private updateSectionData(sectionId: string): void {
        const section = this.sections.get(sectionId);
        if (!section) return;

        switch (sectionId) {
            case 'overview':
                section.metrics = this.getOverviewMetrics();
                break;
            case 'config':
                section.metrics = this.getConfigMetrics();
                break;
            case 'latency':
                section.metrics = this.getLatencyMetrics();
                break;
            case 'patterns':
                section.metrics = this.getPatternMetrics();
                break;
            case 'ai':
                section.metrics = this.getAIMetrics();
                break;
        }

        section.lastUpdated = Date.now();
    }

    private async initializeAllSections(): Promise<void> {
        for (const sectionId of this.sections.keys()) {
            this.updateSectionData(sectionId);
        }
    }

    private getOverviewMetrics(): any {
        return {
            totalOperations: this.metrics.totalOperations,
            averageLatency: this.metrics.averageLatency,
            cacheEfficiency: this.metrics.cacheEfficiency,
            systemHealth: this.metrics.systemHealth,
            activeEndpoints: this.metrics.activeEndpoints,
            detectedPatterns: this.metrics.detectedPatterns
        };
    }

    private getConfigMetrics(): any {
        return {
            configSize: 13,
            configHash: this.generateConfigHash(),
            lastUpdate: Date.now(),
            updateCount: Math.floor(Math.random() * 100),
            historySize: Math.floor(Math.random() * 1000)
        };
    }

    private getLatencyMetrics(): any {
        const dashboardData = this.latencyTracker.getDashboardData();
        return {
            endpoints: dashboardData.endpoints,
            summary: dashboardData.summary,
            topSlowEndpoints: this.latencyTracker.getPerformanceSummary().topSlowEndpoints,
            topErrorEndpoints: this.latencyTracker.getPerformanceSummary().topErrorEndpoints
        };
    }

    private getPatternMetrics(): any {
        return {
            spikes: Math.floor(Math.random() * 10),
            gradualChanges: Math.floor(Math.random() * 5),
            oscillations: Math.floor(Math.random() * 3),
            mostActiveLine: Math.floor(Math.random() * 13),
            peakVelocity: (Math.random() * 1000).toFixed(2),
            totalMovements: Math.floor(Math.random() * 10000)
        };
    }

    private getAIMetrics(): any {
        return {
            configured: this.config.enableAI,
            model: 'gpt-3.5-turbo',
            analyses: Math.floor(Math.random() * 50),
            insights: Math.floor(Math.random() * 20),
            questions: Math.floor(Math.random() * 100)
        };
    }

    private generateConfigHash(): string {
        return Math.random().toString(36).substring(2, 15);
    }
}

// Export singleton instance
export const dashboardOrchestrator = DashboardOrchestrator.getInstance();
