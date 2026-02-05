// Unified API - Single Point of Entry for All Dashboard Systems
// Provides RESTful access to all dashboard functionality

import { dashboardOrchestrator, DashboardConfig } from './dashboard-orchestrator';
import { LatencyTracker } from '../metrics/latency-tracker';
import { ColorSchemeManager } from '../ui/color-schemes';

export interface APIResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: number;
}

export interface UnifiedAPIConfig {
    port: number;
    cors: boolean;
    rateLimit: {
        enabled: boolean;
        requests: number;
        window: number;
    };
    authentication: {
        enabled: boolean;
        token: string;
    };
}

class UnifiedAPI {
    private static instance: UnifiedAPI;
    private config: UnifiedAPIConfig;
    private server: any = null;
    private requestCount: number = 0;
    private requests: Map<string, number> = new Map();

    private constructor() {
        this.config = this.getDefaultConfig();
    }

    public static getInstance(): UnifiedAPI {
        if (!UnifiedAPI.instance) {
            UnifiedAPI.instance = new UnifiedAPI();
        }
        return UnifiedAPI.instance;
    }

    // Start the unified API server
    public async start(config?: Partial<UnifiedAPIConfig>): Promise<void> {
        if (config) {
            this.config = { ...this.config, ...config };
        }

        try {
            // Initialize dashboard orchestrator
            await dashboardOrchestrator.initialize();

            // Create HTTP server
            this.server = this.createServer();
            
            return new Promise((resolve, reject) => {
                this.server.listen(this.config.port, (err?: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log(`🚀 Unified API started on port ${this.config.port}`);
                        console.log(`📊 Dashboard available at: http://localhost:${this.config.port}`);
                        resolve();
                    }
                });
            });
        } catch (error) {
            throw new Error(`Failed to start Unified API: ${error}`);
        }
    }

    // Stop the API server
    public stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('🛑 Unified API stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    // Get API status
    public getStatus(): APIResponse<{
        running: boolean;
        port: number;
        uptime: number;
        requests: number;
        endpoints: string[];
    }> {
        return {
            success: true,
            data: {
                running: this.server !== null,
                port: this.config.port,
                uptime: process.uptime(),
                requests: this.requestCount,
                endpoints: this.getAvailableEndpoints()
            },
            timestamp: Date.now()
        };
    }

    private createServer(): any {
        // Simple HTTP server implementation
        const http = require('http');
        const url = require('url');

        return http.createServer(async (req: any, res: any) => {
            // Increment request counter
            this.requestCount++;

            // Parse URL
            const parsedUrl = url.parse(req.url, true);
            const path = parsedUrl.pathname;
            const method = req.method;

            // Set CORS headers
            if (this.config.cors) {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            }

            // Handle OPTIONS requests
            if (method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }

            // Rate limiting
            if (this.config.rateLimit.enabled && !this.checkRateLimit(req)) {
                this.sendResponse(res, 429, { error: 'Rate limit exceeded' });
                return;
            }

            // Authentication
            if (this.config.authentication.enabled && !this.authenticate(req)) {
                this.sendResponse(res, 401, { error: 'Unauthorized' });
                return;
            }

            try {
                // Route requests
                const response = await this.routeRequest(method, path, parsedUrl.query, req);
                this.sendResponse(res, 200, response);
            } catch (error) {
                console.error('API Error:', error);
                this.sendResponse(res, 500, { error: 'Internal server error' });
            }
        });
    }

    private async routeRequest(method: string, path: string, query: any, req: any): Promise<any> {
        // Remove leading slash
        const cleanPath = path.replace(/^\//, '');

        // Dashboard endpoints
        if (cleanPath === 'dashboard' || cleanPath === '') {
            return this.getDashboardData();
        }

        if (cleanPath === 'dashboard/metrics') {
            return dashboardOrchestrator.getDashboardData();
        }

        if (cleanPath.startsWith('dashboard/section/')) {
            const sectionId = cleanPath.split('/')[2];
            return dashboardOrchestrator.getSectionMetrics(sectionId);
        }

        // Configuration endpoints
        if (cleanPath === 'config') {
            if (method === 'GET') {
                return this.getConfig();
            } else if (method === 'POST') {
                return this.updateConfig(await this.parseBody(req));
            }
        }

        if (cleanPath === 'config/theme') {
            if (method === 'GET') {
                return this.getTheme();
            } else if (method === 'POST') {
                return this.setTheme(await this.parseBody(req));
            }
        }

        // Latency tracking endpoints
        if (cleanPath === 'latency') {
            return this.getLatencyData();
        }

        if (cleanPath === 'latency/record' && method === 'POST') {
            return this.recordLatency(await this.parseBody(req));
        }

        if (cleanPath === 'latency/export') {
            return this.exportLatencyData();
        }

        // Pattern analysis endpoints
        if (cleanPath === 'patterns') {
            return this.getPatternData();
        }

        if (cleanPath === 'patterns/analyze' && method === 'POST') {
            return this.analyzePattern(await this.parseBody(req));
        }

        // AI analysis endpoints
        if (cleanPath === 'ai') {
            return this.getAIData();
        }

        if (cleanPath === 'ai/ask' && method === 'POST') {
            return this.askAI(await this.parseBody(req));
        }

        // System endpoints
        if (cleanPath === 'system/status') {
            return this.getSystemStatus();
        }

        if (cleanPath === 'system/health') {
            return this.getHealthCheck();
        }

        if (cleanPath === 'system/export') {
            return this.exportSystemState();
        }

        if (cleanPath === 'system/import' && method === 'POST') {
            return this.importSystemState(await this.parseBody(req));
        }

        throw new Error(`Endpoint not found: ${method} ${path}`);
    }

    private async getDashboardData(): Promise<any> {
        return dashboardOrchestrator.getDashboardData();
    }

    private async getConfig(): Promise<any> {
        const dashboardData = dashboardOrchestrator.getDashboardData();
        return dashboardData.config;
    }

    private async updateConfig(configData: Partial<DashboardConfig>): Promise<any> {
        dashboardOrchestrator.updateConfig(configData);
        return { success: true, config: configData };
    }

    private async getTheme(): Promise<any> {
        return ColorSchemeManager.getCurrentScheme();
    }

    private async setTheme(themeData: { theme: string }): Promise<any> {
        const success = ColorSchemeManager.setScheme(themeData.theme);
        if (success) {
            dashboardOrchestrator.updateConfig({ theme: themeData.theme });
        }
        return { success, theme: themeData.theme };
    }

    private async getLatencyData(): Promise<any> {
        const latencyTracker = new LatencyTracker();
        return latencyTracker.getDashboardData();
    }

    private async recordLatency(data: any): Promise<any> {
        const latencyTracker = new LatencyTracker();
        latencyTracker.recordLatency(
            data.endpoint,
            data.integration,
            data.latency,
            data.statusCode,
            data.cacheHit,
            data.error
        );
        return { success: true };
    }

    private async exportLatencyData(): Promise<any> {
        const latencyTracker = new LatencyTracker();
        return {
            data: latencyTracker.exportMetrics(),
            timestamp: Date.now()
        };
    }

    private async getPatternData(): Promise<any> {
        return dashboardOrchestrator.getSectionMetrics('patterns');
    }

    private async analyzePattern(patternData: any): Promise<any> {
        // Simulate pattern analysis
        return {
            pattern: patternData,
            analysis: {
                type: 'spike',
                confidence: 0.85,
                severity: 'medium',
                recommendations: ['Monitor closely', 'Consider stabilization']
            },
            timestamp: Date.now()
        };
    }

    private async getAIData(): Promise<any> {
        return dashboardOrchestrator.getSectionMetrics('ai');
    }

    private async askAI(data: { question: string }): Promise<any> {
        // Simulate AI response
        return {
            question: data.question,
            answer: `Based on the current system state, I recommend monitoring the configuration patterns and implementing automated responses for detected anomalies.`,
            confidence: 0.75,
            timestamp: Date.now()
        };
    }

    private async getSystemStatus(): Promise<any> {
        return {
            status: 'healthy',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: '1.0.0',
            features: {
                latencyTracking: true,
                patternAnalysis: true,
                aiAnalysis: true,
                caching: true
            }
        };
    }

    private async getHealthCheck(): Promise<any> {
        return {
            healthy: true,
            checks: {
                api: 'ok',
                database: 'ok',
                cache: 'ok',
                ai: 'ok'
            },
            timestamp: Date.now()
        };
    }

    private async exportSystemState(): Promise<any> {
        return {
            state: dashboardOrchestrator.exportState(),
            timestamp: Date.now()
        };
    }

    private async importSystemState(data: { state: string }): Promise<any> {
        const success = dashboardOrchestrator.importState(data.state);
        return { success, timestamp: Date.now() };
    }

    private getAvailableEndpoints(): string[] {
        return [
            'GET /',
            'GET /dashboard',
            'GET /dashboard/metrics',
            'GET /dashboard/section/{id}',
            'GET /config',
            'POST /config',
            'GET /config/theme',
            'POST /config/theme',
            'GET /latency',
            'POST /latency/record',
            'GET /latency/export',
            'GET /patterns',
            'POST /patterns/analyze',
            'GET /ai',
            'POST /ai/ask',
            'GET /system/status',
            'GET /system/health',
            'GET /system/export',
            'POST /system/import'
        ];
    }

    private checkRateLimit(req: any): boolean {
        const clientIP = req.connection.remoteAddress || req.socket.remoteAddress;
        const now = Date.now();
        const windowStart = now - this.config.rateLimit.window;

        // Clean old requests
        for (const [ip, timestamp] of this.requests.entries()) {
            if (timestamp < windowStart) {
                this.requests.delete(ip);
            }
        }

        // Check current requests
        const clientRequests = Array.from(this.requests.entries())
            .filter(([ip, timestamp]) => ip === clientIP && timestamp > windowStart)
            .length;

        if (clientRequests >= this.config.rateLimit.requests) {
            return false;
        }

        // Record this request
        this.requests.set(clientIP, now);
        return true;
    }

    private authenticate(req: any): boolean {
        if (!this.config.authentication.enabled) {
            return true;
        }

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return false;
        }

        const token = authHeader.substring(7);
        return token === this.config.authentication.token;
    }

    private sendResponse(res: any, statusCode: number, data: any): void {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: statusCode < 400,
            data: statusCode < 400 ? data : undefined,
            error: statusCode >= 400 ? data.error || 'Request failed' : undefined,
            timestamp: Date.now()
        }));
    }

    private async parseBody(req: any): Promise<any> {
        return new Promise((resolve) => {
            let body = '';
            req.on('data', (chunk: any) => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch {
                    resolve({});
                }
            });
        });
    }

    private getDefaultConfig(): UnifiedAPIConfig {
        return {
            port: 3000,
            cors: true,
            rateLimit: {
                enabled: true,
                requests: 100,
                window: 60000 // 1 minute
            },
            authentication: {
                enabled: false,
                token: 'default-token'
            }
        };
    }
}

// Export singleton instance
export const unifiedAPI = UnifiedAPI.getInstance();
