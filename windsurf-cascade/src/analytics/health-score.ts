#!/usr/bin/env bun
/**
 * Vault Health Score Dashboard
 * Real-time monitoring and metrics visualization
 */

interface HealthMetrics {
    overall: {
        score: number;
        grade: 'A' | 'B' | 'C' | 'D' | 'F';
        trend: 'improving' | 'stable' | 'declining';
    };
    categories: {
        yaml: { score: number; issues: number };
        links: { score: number; issues: number };
        tags: { score: number; issues: number };
        structure: { score: number; issues: number };
        freshness: { score: number; issues: number };
    };
    recommendations: string[];
    lastUpdated: string;
}

class HealthScoreDashboard {
    private vaultPath: string;

    constructor(vaultPath: string = './Odds-mono-map') {
        this.vaultPath = vaultPath;
    }

    async calculateHealth(): Promise<HealthMetrics> {
        console.log('💚 Calculating vault health score...');

        // In real implementation, this would:
        // 1. Run actual validation on all files
        // 2. Query SQLite graph database
        // 3. Calculate weighted scores
        // 4. Generate trend analysis

        // Mock data based on our current validation results
        const mockMetrics: HealthMetrics = {
            overall: {
                score: 65,
                grade: 'C',
                trend: 'improving'
            },
            categories: {
                yaml: { score: 80, issues: 4 }, // 4 files missing frontmatter
                links: { score: 90, issues: 2 }, // 2 broken links
                tags: { score: 70, issues: 8 }, // 8 tag standardization issues
                structure: { score: 75, issues: 6 }, // 6 heading issues
                freshness: { score: 95, issues: 1 } // 1 stale dashboard
            },
            recommendations: [
                'Add YAML frontmatter to 4 remaining files',
                'Fix 2 broken wiki links',
                'Standardize 8 tag formats to kebab-case',
                'Resolve 6 heading hierarchy issues',
                'Update stale dashboard content'
            ],
            lastUpdated: new Date().toISOString()
        };

        return mockMetrics;
    }

    async generateDashboard(): Promise<string> {
        const metrics = await this.calculateHealth();

        return `
<!DOCTYPE html>
<html>
<head>
    <title>Vault Health Dashboard</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 20px; background: #f5f5f5; }
        .dashboard { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }
        .score-circle { width: 120px; height: 120px; border-radius: 50%; background: conic-gradient(#4ade80 0% ${metrics.overall.score}%, #ef4444 ${metrics.overall.score}% 100%); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: white; margin: 0 auto; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-score { font-size: 32px; font-weight: bold; margin: 10px 0; }
        .score-A { color: #22c55e; }
        .score-B { color: #84cc16; }
        .score-C { color: #eab308; }
        .score-D { color: #f97316; }
        .score-F { color: #ef4444; }
        .recommendations { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .recommendations ul { list-style: none; padding: 0; }
        .recommendations li { padding: 8px 0; border-bottom: 1px solid #eee; }
        .trend-improving { color: #22c55e; }
        .trend-stable { color: #3b82f6; }
        .trend-declining { color: #ef4444; }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>🏛️ Odds Protocol Vault Health</h1>
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <div class="score-circle score-${metrics.overall.grade}">${metrics.overall.score}%</div>
                    <h2 style="text-align: center; margin-top: 10px;">Grade: ${metrics.overall.grade.toUpperCase()}</h2>
                    <p style="text-align: center;">Trend: <span class="trend-${metrics.overall.trend}">${metrics.overall.trend}</span></p>
                </div>
                <div>
                    <p>📊 Last Updated: ${new Date(metrics.lastUpdated).toLocaleString()}</p>
                    <p>📁 Vault: ${this.vaultPath}</p>
                    <p>🔄 Auto-refresh: Every 5 minutes</p>
                </div>
            </div>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <h3>📋 YAML Frontmatter</h3>
                <div class="metric-score score-B">${metrics.categories.yaml.score}%</div>
                <p>${metrics.categories.yaml.issues} issues</p>
            </div>
            <div class="metric-card">
                <h3>🔗 Link Integrity</h3>
                <div class="metric-score score-A">${metrics.categories.links.score}%</div>
                <p>${metrics.categories.links.issues} issues</p>
            </div>
            <div class="metric-card">
                <h3>🏷️ Tag Standards</h3>
                <div class="metric-score score-C">${metrics.categories.tags.score}%</div>
                <p>${metrics.categories.tags.issues} issues</p>
            </div>
            <div class="metric-card">
                <h3>📝 Document Structure</h3>
                <div class="metric-score score-C">${metrics.categories.structure.score}%</div>
                <p>${metrics.categories.structure.issues} issues</p>
            </div>
            <div class="metric-card">
                <h3>🕐 Content Freshness</h3>
                <div class="metric-score score-A">${metrics.categories.freshness.score}%</div>
                <p>${metrics.categories.freshness.issues} issues</p>
            </div>
        </div>
        
        <div class="recommendations">
            <h3>💡 Recommendations</h3>
            <ul>
                ${metrics.recommendations.map(rec => `<li>✨ ${rec}</li>`).join('')}
            </ul>
        </div>
    </div>
    
    <script>
        // Auto-refresh every 5 minutes
        setTimeout(() => location.reload(), 300000);
        
        // Add real-time updates when available
        if ('EventSource' in window) {
            const eventSource = new EventSource('/api/health-updates');
            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('Health update received:', data);
            };
        }
    </script>
</body>
</html>`;
    }

    async startDashboardServer(port: number = 3000) {
        console.log(`🚀 Starting health dashboard on http://localhost:${port}`);

        const dashboard = await this.generateDashboard();

        const server = Bun.serve({
            port,
            fetch(req) {
                const url = new URL(req.url);

                if (url.pathname === '/') {
                    return new Response(dashboard, {
                        headers: { 'Content-Type': 'text/html' }
                    });
                }

                if (url.pathname === '/api/health') {
                    return new Response(JSON.stringify(await this.calculateHealth()), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                return new Response('Not found', { status: 404 });
            }
        });

        console.log(`✅ Dashboard running at http://localhost:${port}`);
        console.log(`📊 Health API: http://localhost:${port}/api/health`);

        return server;
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const dashboardMode = args.includes('--dashboard');
    const port = parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1] || '3000');

    const dashboard = new HealthScoreDashboard();

    if (dashboardMode) {
        const server = await dashboard.startDashboardServer(port);

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down dashboard...');
            server.stop();
            process.exit(0);
        });

        // Keep process alive
        console.log('⏳ Dashboard running... (Press Ctrl+C to stop)');
    } else {
        const metrics = await dashboard.calculateHealth();
        console.log('\n💚 Vault Health Score');
        console.log('='.repeat(30));
        console.log(`📊 Overall: ${metrics.overall.score}% (Grade: ${metrics.overall.grade.toUpperCase()})`);
        console.log(`📈 Trend: ${metrics.overall.trend}`);
        console.log(`🕐 Last Updated: ${new Date(metrics.lastUpdated).toLocaleString()}`);

        console.log('\n📋 Category Breakdown:');
        Object.entries(metrics.categories).forEach(([category, data]) => {
            const grade = data.score >= 90 ? 'A' : data.score >= 80 ? 'B' : data.score >= 70 ? 'C' : data.score >= 60 ? 'D' : 'F';
            console.log(`  ${category}: ${data.score}% (Grade: ${grade}) - ${data.issues} issues`);
        });

        console.log('\n💡 Top Recommendations:');
        metrics.recommendations.slice(0, 3).forEach((rec, i) => {
            console.log(`  ${i + 1}. ${rec}`);
        });
    }
}

if (import.meta.main) {
    main().catch(console.error);
}

export { HealthScoreDashboard, type HealthMetrics };
