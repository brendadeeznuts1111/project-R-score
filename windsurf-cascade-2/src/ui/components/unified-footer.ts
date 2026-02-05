// Unified Footer System for All Headers
// Provides consistent footer styling and functionality across H1, H2 elements
// With dashboard-specific enhancements and interactive features

export interface FooterConfig {
    showTimestamp: boolean;
    showSystemInfo: boolean;
    showQuickActions: boolean;
    showMetrics: boolean;
    theme: 'light' | 'dark' | 'auto';
    position: 'bottom' | 'fixed' | 'sticky';
    animation: 'none' | 'slide' | 'fade' | 'bounce';
}

export interface FooterMetrics {
    totalOperations: number;
    averageLatency: number;
    systemHealth: number;
    cacheEfficiency: number;
    uptime: number;
}

export interface QuickAction {
    id: string;
    label: string;
    icon: string;
    action: () => void;
    badge?: string;
    color?: string;
}

class UnifiedFooter {
    private static instance: UnifiedFooter;
    private config: FooterConfig;
    private metrics: FooterMetrics;
    private quickActions: QuickAction[] = [];
    private footerElements: Map<string, HTMLElement> = new Map();
    private updateInterval: NodeJS.Timeout | null = null;
    private isInitialized: boolean = false;

    private constructor() {
        this.config = this.getDefaultConfig();
        this.metrics = this.getInitialMetrics();
        this.setupQuickActions();
    }

    public static getInstance(): UnifiedFooter {
        if (!UnifiedFooter.instance) {
            UnifiedFooter.instance = new UnifiedFooter();
        }
        return UnifiedFooter.instance;
    }

    // Initialize the unified footer system
    public initialize(config?: Partial<FooterConfig>): void {
        if (this.isInitialized) {
            console.warn('UnifiedFooter already initialized');
            return;
        }

        if (config) {
            this.config = { ...this.config, ...config };
        }

        this.injectStyles();
        this.createFootersForHeaders();
        this.startRealTimeUpdates();
        this.attachEventListeners();

        this.isInitialized = true;
        console.log('🦶 Unified Footer system initialized');
    }

    // Add footer to a specific header element
    public addFooterToHeader(headerSelector: string, customConfig?: Partial<FooterConfig>): void {
        const header = document.querySelector(headerSelector) as HTMLElement;
        if (!header) {
            console.warn(`Header not found: ${headerSelector}`);
            return;
        }

        const footerId = `footer-${headerSelector.replace(/[^a-zA-Z0-9]/g, '-')}`;
        let footer = this.footerElements.get(footerId);

        if (!footer) {
            const config = { ...this.config, ...customConfig };
            footer = this.createFooter(footerId, config);
            this.footerElements.set(footerId, footer);
            
            // Insert footer after header
            header.parentNode?.insertBefore(footer, header.nextSibling);
        }

        const config = { ...this.config, ...customConfig };
        this.updateFooterContent(footer, config);
    }

    // Update footer configuration
    public updateConfig(updates: Partial<FooterConfig>): void {
        this.config = { ...this.config, ...updates };
        
        // Update all existing footers
        this.footerElements.forEach((footer, id) => {
            this.updateFooterContent(footer, this.config);
        });
    }

    // Update metrics displayed in footers
    public updateMetrics(metrics: Partial<FooterMetrics>): void {
        this.metrics = { ...this.metrics, ...metrics };
        this.refreshAllFooters();
    }

    // Add quick action to all footers
    public addQuickAction(action: QuickAction): void {
        this.quickActions.push(action);
        this.refreshAllFooters();
    }

    // Remove quick action from all footers
    public removeQuickAction(actionId: string): void {
        this.quickActions = this.quickActions.filter(action => action.id !== actionId);
        this.refreshAllFooters();
    }

    // Get current footer configuration
    public getConfig(): FooterConfig {
        return { ...this.config };
    }

    // Get current metrics
    public getMetrics(): FooterMetrics {
        return { ...this.metrics };
    }

    // Destroy the unified footer system
    public destroy(): void {
        this.stopRealTimeUpdates();
        
        // Remove all footer elements
        this.footerElements.forEach(footer => {
            footer.remove();
        });
        this.footerElements.clear();
        
        // Remove injected styles
        const styleElement = document.getElementById('unified-footer-styles');
        if (styleElement) {
            styleElement.remove();
        }
        
        this.isInitialized = false;
        console.log('🦶 Unified Footer system destroyed');
    }

    private getDefaultConfig(): FooterConfig {
        return {
            showTimestamp: true,
            showSystemInfo: true,
            showQuickActions: true,
            showMetrics: true,
            theme: 'auto',
            position: 'bottom',
            animation: 'slide'
        };
    }

    private getInitialMetrics(): FooterMetrics {
        return {
            totalOperations: 0,
            averageLatency: 0,
            systemHealth: 100,
            cacheEfficiency: 0,
            uptime: 0
        };
    }

    private setupQuickActions(): void {
        this.quickActions = [
            {
                id: 'refresh',
                label: 'Refresh',
                icon: '🔄',
                action: () => this.refreshAllFooters(),
                color: '#3b82f6'
            },
            {
                id: 'settings',
                label: 'Settings',
                icon: '⚙️',
                action: () => this.openSettings(),
                color: '#6b7280'
            },
            {
                id: 'export',
                label: 'Export',
                icon: '📊',
                action: () => this.exportData(),
                color: '#10b981'
            },
            {
                id: 'help',
                label: 'Help',
                icon: '❓',
                action: () => this.openHelp(),
                color: '#f59e0b'
            }
        ];
    }

    private injectStyles(): void {
        const styleId = 'unified-footer-styles';
        if (document.getElementById(styleId)) {
            return; // Already injected
        }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .unified-footer {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
                color: #f3f4f6;
                border-radius: 8px;
                margin: 1rem 0;
                padding: 1rem;
                border: 1px solid #374151;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                backdrop-filter: blur(10px);
                transition: all 0.3s ease;
            }

            .unified-footer:hover {
                box-shadow: 0 8px 12px rgba(0, 0, 0, 0.2);
                transform: translateY(-2px);
            }

            .unified-footer.light-theme {
                background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
                color: #1f2937;
                border-color: #e5e7eb;
            }

            .unified-footer.fixed {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                z-index: 1000;
                border-radius: 0;
                margin: 0;
            }

            .unified-footer.sticky {
                position: sticky;
                bottom: 0;
                z-index: 100;
            }

            .unified-footer-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 1rem;
            }

            .unified-footer-section {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .unified-footer-metric {
                display: flex;
                align-items: center;
                gap: 0.25rem;
                padding: 0.25rem 0.5rem;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
                font-size: 0.875rem;
                font-weight: 500;
            }

            .unified-footer.light-theme .unified-footer-metric {
                background: rgba(0, 0, 0, 0.05);
            }

            .unified-footer-metric-value {
                color: #10b981;
                font-weight: 600;
            }

            .unified-footer-metric.warning .unified-footer-metric-value {
                color: #f59e0b;
            }

            .unified-footer-metric.critical .unified-footer-metric-value {
                color: #ef4444;
            }

            .unified-footer-timestamp {
                font-size: 0.75rem;
                color: #9ca3af;
                font-family: 'Courier New', monospace;
            }

            .unified-footer.light-theme .unified-footer-timestamp {
                color: #6b7280;
            }

            .unified-footer-quick-actions {
                display: flex;
                gap: 0.5rem;
            }

            .unified-footer-action {
                display: flex;
                align-items: center;
                gap: 0.25rem;
                padding: 0.375rem 0.75rem;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 6px;
                color: #f3f4f6;
            font-size: 0.875rem;
                cursor: pointer;
                transition: all 0.2s ease;
                text-decoration: none;
            }

            .unified-footer.light-theme .unified-footer-action {
                background: rgba(0, 0, 0, 0.05);
                border-color: rgba(0, 0, 0, 0.1);
                color: #1f2937;
            }

            .unified-footer-action:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: translateY(-1px);
            }

            .unified-footer.light-theme .unified-footer-action:hover {
                background: rgba(0, 0, 0, 0.1);
            }

            .unified-footer-action-badge {
                background: #ef4444;
                color: white;
                font-size: 0.625rem;
                padding: 0.125rem 0.25rem;
                border-radius: 10px;
                font-weight: 600;
            }

            /* Animations */
            .unified-footer.slide-animation {
                animation: slideInUp 0.3s ease-out;
            }

            @keyframes slideInUp {
                from {
                    transform: translateY(100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            .unified-footer.fade-animation {
                animation: fadeIn 0.3s ease-out;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .unified-footer.bounce-animation {
                animation: bounceIn 0.5s ease-out;
            }

            @keyframes bounceIn {
                0% {
                    transform: scale(0.3);
                    opacity: 0;
                }
                50% {
                    transform: scale(1.05);
                }
                70% {
                    transform: scale(0.9);
                }
                100% {
                    transform: scale(1);
                    opacity: 1;
                }
            }

            /* Dashboard specific styles */
            .unified-footer.dashboard-enhanced {
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                border-color: #334155;
            }

            .unified-footer.dashboard-enhanced .unified-footer-metric {
                background: rgba(59, 130, 246, 0.1);
                border: 1px solid rgba(59, 130, 246, 0.2);
            }

            .unified-footer.dashboard-enhanced .unified-footer-action {
                background: rgba(59, 130, 246, 0.1);
                border-color: rgba(59, 130, 246, 0.3);
            }

            .unified-footer.dashboard-enhanced .unified-footer-action:hover {
                background: rgba(59, 130, 246, 0.2);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            }

            /* Responsive design */
            @media (max-width: 768px) {
                .unified-footer-content {
                    flex-direction: column;
                    align-items: flex-start;
                }

                .unified-footer-quick-actions {
                    flex-wrap: wrap;
                }

                .unified-footer-metric {
                    font-size: 0.75rem;
                }
            }
        `;
        document.head.appendChild(style);
    }

    private createFootersForHeaders(): void {
        // Find all H1 and H2 elements
        const headers = document.querySelectorAll('h1, h2');
        
        headers.forEach((header, index) => {
            const headerId = header.id || `header-${index}`;
            const footerId = `footer-${headerId}`;
            
            // Check if footer already exists
            if (!this.footerElements.has(footerId)) {
                const footer = this.createFooter(footerId, this.config);
                
                // Determine if this is a dashboard context
                const isDashboard = this.isDashboardContext(header as HTMLElement);
                if (isDashboard) {
                    footer.classList.add('dashboard-enhanced');
                }
                
                // Insert footer after header
                header.parentNode?.insertBefore(footer, header.nextSibling);
                this.footerElements.set(footerId, footer);
            }
        });
    }

    private createFooter(footerId: string, config: FooterConfig): HTMLElement {
        const footer = document.createElement('div');
        footer.id = footerId;
        footer.className = `unified-footer ${config.position}-position ${config.animation}-animation`;
        
        if (config.theme === 'light') {
            footer.classList.add('light-theme');
        }

        this.updateFooterContent(footer, config);
        return footer;
    }

    private updateFooterContent(footer: HTMLElement, config: FooterConfig): void {
        const content = document.createElement('div');
        content.className = 'unified-footer-content';

        // Left section: System info and metrics
        const leftSection = document.createElement('div');
        leftSection.className = 'unified-footer-section';

        if (config.showSystemInfo) {
            const systemInfo = document.createElement('div');
            systemInfo.innerHTML = '🚀 Origin System';
            leftSection.appendChild(systemInfo);
        }

        if (config.showMetrics) {
            const metricsContainer = document.createElement('div');
            metricsContainer.className = 'unified-footer-metrics';
            
            const metrics = [
                { label: 'Ops', value: this.metrics.totalOperations, key: 'totalOperations' },
                { label: 'Latency', value: `${this.metrics.averageLatency}ms`, key: 'averageLatency' },
                { label: 'Health', value: `${this.metrics.systemHealth}%`, key: 'systemHealth' },
                { label: 'Cache', value: `${this.metrics.cacheEfficiency}%`, key: 'cacheEfficiency' }
            ];

            metrics.forEach(metric => {
                const metricElement = document.createElement('div');
                metricElement.className = `unified-footer-metric ${this.getMetricClass(metric.key)}`;
                metricElement.innerHTML = `
                    <span>${metric.label}:</span>
                    <span class="unified-footer-metric-value">${metric.value}</span>
                `;
                metricsContainer.appendChild(metricElement);
            });

            leftSection.appendChild(metricsContainer);
        }

        // Center section: Timestamp
        if (config.showTimestamp) {
            const timestamp = document.createElement('div');
            timestamp.className = 'unified-footer-timestamp';
            timestamp.textContent = new Date().toISOString();
            content.appendChild(timestamp);
        }

        // Right section: Quick actions
        if (config.showQuickActions) {
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'unified-footer-quick-actions';

            this.quickActions.forEach(action => {
                const actionButton = document.createElement('button');
                actionButton.className = 'unified-footer-action';
                actionButton.innerHTML = `
                    ${action.icon}
                    <span>${action.label}</span>
                    ${action.badge ? `<span class="unified-footer-action-badge">${action.badge}</span>` : ''}
                `;
                actionButton.style.color = action.color || '#f3f4f6';
                actionButton.addEventListener('click', action.action);
                actionsContainer.appendChild(actionButton);
            });

            content.appendChild(actionsContainer);
        }

        content.appendChild(leftSection);
        footer.innerHTML = '';
        footer.appendChild(content);
    }

    private getMetricClass(metricKey: string): string {
        switch (metricKey) {
            case 'systemHealth':
                if (this.metrics.systemHealth < 50) return 'critical';
                if (this.metrics.systemHealth < 80) return 'warning';
                return '';
            case 'averageLatency':
                if (this.metrics.averageLatency > 1000) return 'critical';
                if (this.metrics.averageLatency > 500) return 'warning';
                return '';
            case 'cacheEfficiency':
                if (this.metrics.cacheEfficiency < 50) return 'critical';
                if (this.metrics.cacheEfficiency < 80) return 'warning';
                return '';
            default:
                return '';
        }
    }

    private isDashboardContext(header: HTMLElement): boolean {
        // Check if header is within dashboard context
        const parent = header.closest('.origin-dashboard, .dashboard, .metrics-dashboard, .performance-dashboard');
        return parent !== null;
    }

    private startRealTimeUpdates(): void {
        this.updateInterval = setInterval(() => {
            this.updateMetrics({
                totalOperations: this.metrics.totalOperations + Math.floor(Math.random() * 5),
                averageLatency: Math.floor(Math.random() * 100) + 50,
                systemHealth: Math.floor(Math.random() * 20) + 80,
                cacheEfficiency: Math.floor(Math.random() * 30) + 70,
                uptime: this.metrics.uptime + 2
            });
        }, 2000);
    }

    private stopRealTimeUpdates(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    private refreshAllFooters(): void {
        this.footerElements.forEach((footer, id) => {
            this.updateFooterContent(footer, this.config);
        });
    }

    private attachEventListeners(): void {
        // Listen for new headers being added to the DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node as Element;
                        if (element.tagName === 'H1' || element.tagName === 'H2') {
                            this.addFooterToHeader(`#${element.id || element.tagName.toLowerCase()}`);
                        }
                        
                        // Check for headers within added elements
                        const headers = element.querySelectorAll('h1, h2');
                        headers.forEach(header => {
                            this.addFooterToHeader(`#${header.id || header.tagName.toLowerCase()}`);
                        });
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    private openSettings(): void {
        alert('Settings panel would open here - configure footer appearance and metrics');
    }

    private exportData(): void {
        const data = {
            metrics: this.metrics,
            config: this.config,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'footer-data.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    private openHelp(): void {
        alert('Help: Unified Footer provides consistent system information and quick actions across all headers. Click metrics to see details, use quick actions for common tasks.');
    }
}

// Export singleton instance
export const unifiedFooter = UnifiedFooter.getInstance();
