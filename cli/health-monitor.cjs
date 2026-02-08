#!/usr/bin/env node

/**
 * FactoryWager Health Monitor
 * Real-time health monitoring and alerting system
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class HealthMonitor {
    constructor() {
        this.config = {
            checkInterval: 30000, // 30 seconds
            timeout: 5000,        // 5 seconds per check
            retries: 3,           // 3 retries per check
            alertThreshold: 3,    // 3 consecutive failures before alert
            logFile: path.join(process.cwd(), 'logs', 'health-monitor.log'),
            reportFile: path.join(process.cwd(), 'reports', 'health-report.json')
        };
        
        this.status = {
            overall: 'unknown',
            services: {},
            lastCheck: null,
            consecutiveFailures: 0,
            uptime: 0
        };
        
        this.alerts = [];
        this.metrics = {
            totalChecks: 0,
            successfulChecks: 0,
            failedChecks: 0,
            averageResponseTime: 0,
            responseTimes: []
        };
        
        this.ensureDirectories();
        this.startTime = Date.now();
    }

    ensureDirectories() {
        const dirs = ['logs', 'reports', 'alerts'];
        dirs.forEach(dir => {
            const fullPath = path.join(process.cwd(), dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
        });
    }

    async checkDomainHealth(domain) {
        const startTime = Date.now();
        
        try {
            const response = await fetch(`https://${domain}`, {
                method: 'HEAD',
                signal: AbortSignal.timeout(this.config.timeout)
            });
            
            const responseTime = Date.now() - startTime;
            
            return {
                domain,
                status: response.ok ? 'healthy' : 'unhealthy',
                statusCode: response.status,
                responseTime,
                timestamp: new Date().toISOString(),
                error: null
            };
        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            return {
                domain,
                status: 'error',
                statusCode: null,
                responseTime,
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }

    async checkServiceHealth(service) {
        const { name, url, type, expectedStatus = 200 } = service;
        const startTime = Date.now();
        
        try {
            const response = await fetch(url, {
                method: type === 'api' ? 'GET' : 'HEAD',
                signal: AbortSignal.timeout(this.config.timeout)
            });
            
            const responseTime = Date.now() - startTime;
            const isHealthy = response.status === expectedStatus;
            
            return {
                name,
                url,
                type,
                status: isHealthy ? 'healthy' : 'unhealthy',
                statusCode: response.status,
                responseTime,
                timestamp: new Date().toISOString(),
                error: null
            };
        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            return {
                name,
                url,
                type,
                status: 'error',
                statusCode: null,
                responseTime,
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }

    async performHealthCheck() {
        console.log('🏥 Performing comprehensive health check...');
        
        const startTime = Date.now();
        this.metrics.totalChecks++;
        
        // Define critical domains to check
        const criticalDomains = [
            'wiki.factory-wager.com',
            'dashboard.factory-wager.com',
            'api.factory-wager.com',
            'registry.factory-wager.com',
            'registry.factory-wager.com'
        ];
        
        // Define services to check
        const services = [
            { name: 'Wiki', url: 'https://wiki.factory-wager.com', type: 'web' },
            { name: 'Dashboard', url: 'https://dashboard.factory-wager.com', type: 'web' },
            { name: 'API', url: 'https://api.factory-wager.com/health', type: 'api', expectedStatus: 200 },
            { name: 'Registry', url: 'https://registry.factory-wager.com', type: 'web' },
            { name: 'NPM Registry', url: 'https://registry.factory-wager.com', type: 'web' }
        ];
        
        // Check all domains
        const domainResults = await Promise.all(
            criticalDomains.map(domain => this.checkDomainHealth(domain))
        );
        
        // Check all services
        const serviceResults = await Promise.all(
            services.map(service => this.checkServiceHealth(service))
        );
        
        // Combine results
        const allResults = [...domainResults, ...serviceResults];
        
        // Calculate overall status
        const healthyCount = allResults.filter(r => r.status === 'healthy').length;
        const totalCount = allResults.length;
        const healthPercentage = (healthyCount / totalCount) * 100;
        
        // Update status
        this.status.lastCheck = new Date().toISOString();
        this.status.uptime = Date.now() - this.startTime;
        
        // Update service statuses
        serviceResults.forEach(result => {
            this.status.services[result.name] = result;
        });
        
        // Determine overall status
        if (healthPercentage >= 90) {
            this.status.overall = 'healthy';
            this.status.consecutiveFailures = 0;
        } else if (healthPercentage >= 70) {
            this.status.overall = 'degraded';
        } else {
            this.status.overall = 'unhealthy';
            this.status.consecutiveFailures++;
        }
        
        // Update metrics
        const responseTimes = allResults.map(r => r.responseTime).filter(t => t > 0);
        if (responseTimes.length > 0) {
            this.metrics.responseTimes.push(...responseTimes);
            this.metrics.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        }
        
        if (this.status.overall === 'healthy') {
            this.metrics.successfulChecks++;
        } else {
            this.metrics.failedChecks++;
        }
        
        // Generate alerts if needed
        await this.generateAlerts(allResults);
        
        // Log results
        await this.logResults(allResults);
        
        // Generate report
        await this.generateReport(allResults);
        
        const duration = Date.now() - startTime;
        console.log(`✅ Health check completed in ${duration}ms`);
        console.log(`📊 Overall Status: ${this.status.overall.toUpperCase()}`);
        console.log(`📈 Health: ${healthPercentage.toFixed(1)}% (${healthyCount}/${totalCount})`);
        
        return {
            status: this.status.overall,
            healthPercentage,
            results: allResults,
            metrics: this.metrics,
            duration
        };
    }

    async generateAlerts(results) {
        const newAlerts = [];
        
        // Check for service failures
        results.forEach(result => {
            if (result.status !== 'healthy') {
                const alert = {
                    id: `alert-${Date.now()}-${result.name || result.domain}`,
                    type: 'service_failure',
                    severity: result.status === 'error' ? 'critical' : 'warning',
                    service: result.name || result.domain,
                    message: `${result.name || result.domain} is ${result.status}`,
                    details: result,
                    timestamp: new Date().toISOString(),
                    acknowledged: false
                };
                
                newAlerts.push(alert);
            }
        });
        
        // Check for consecutive failures
        if (this.status.consecutiveFailures >= this.config.alertThreshold) {
            const alert = {
                id: `alert-${Date.now()}-consecutive-failures`,
                type: 'consecutive_failures',
                severity: 'critical',
                service: 'system',
                message: `${this.status.consecutiveFailures} consecutive health check failures`,
                details: { consecutiveFailures: this.status.consecutiveFailures },
                timestamp: new Date().toISOString(),
                acknowledged: false
            };
            
            newAlerts.push(alert);
        }
        
        // Save new alerts
        if (newAlerts.length > 0) {
            this.alerts.push(...newAlerts);
            await this.saveAlerts();
            
            console.log(`🚨 Generated ${newAlerts.length} new alert(s):`);
            newAlerts.forEach(alert => {
                console.log(`  ${alert.severity.toUpperCase()}: ${alert.message}`);
            });
        }
    }

    async saveAlerts() {
        const alertsFile = path.join(process.cwd(), 'alerts', 'alerts.json');
        fs.writeFileSync(alertsFile, JSON.stringify(this.alerts, null, 2));
    }

    async logResults(results) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            status: this.status.overall,
            consecutiveFailures: this.status.consecutiveFailures,
            results: results,
            metrics: this.metrics
        };
        
        const logLine = JSON.stringify(logEntry) + '\n';
        fs.appendFileSync(this.config.logFile, logLine);
    }

    async generateReport(results) {
        const report = {
            timestamp: new Date().toISOString(),
            status: this.status,
            metrics: this.metrics,
            summary: {
                total: results.length,
                healthy: results.filter(r => r.status === 'healthy').length,
                unhealthy: results.filter(r => r.status === 'unhealthy').length,
                errors: results.filter(r => r.status === 'error').length,
                averageResponseTime: this.metrics.averageResponseTime.toFixed(2) + 'ms',
                uptime: this.formatUptime(this.status.uptime)
            },
            alerts: {
                total: this.alerts.length,
                unacknowledged: this.alerts.filter(a => !a.acknowledged).length,
                critical: this.alerts.filter(a => a.severity === 'critical').length
            },
            details: results
        };
        
        fs.writeFileSync(this.config.reportFile, JSON.stringify(report, null, 2));
        
        // Also generate HTML report
        await this.generateHTMLReport(report);
    }

    async generateHTMLReport(report) {
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FactoryWager Health Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            background: #f8fafc;
        }
        .header {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            margin-bottom: 2rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .status-${report.status.overall} {
            color: ${report.status.overall === 'healthy' ? '#22c55e' : 
                     report.status.overall === 'degraded' ? '#f59e0b' : '#ef4444'};
        }
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .metric {
            background: white;
            padding: 1rem;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            text-align: center;
        }
        .metric-value {
            font-size: 2rem;
            font-weight: bold;
            color: #1e293b;
        }
        .metric-label {
            color: #64748b;
            font-size: 0.875rem;
            margin-top: 0.25rem;
        }
        .services {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .service {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem;
            border-bottom: 1px solid #e2e8f0;
        }
        .service:last-child {
            border-bottom: none;
        }
        .status-healthy { color: #22c55e; }
        .status-unhealthy { color: #f59e0b; }
        .status-error { color: #ef4444; }
        .timestamp {
            text-align: center;
            color: #64748b;
            font-size: 0.875rem;
            margin-top: 2rem;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏥 FactoryWager Health Report</h1>
        <p class="status-${report.status.overall}">Overall Status: ${report.status.overall.toUpperCase()}</p>
        <p>Last Check: ${new Date(report.timestamp).toLocaleString()}</p>
        <p>Uptime: ${report.summary.uptime}</p>
    </div>

    <div class="metrics">
        <div class="metric">
            <div class="metric-value">${report.summary.healthy}</div>
            <div class="metric-label">Healthy Services</div>
        </div>
        <div class="metric">
            <div class="metric-value">${report.summary.unhealthy}</div>
            <div class="metric-label">Unhealthy</div>
        </div>
        <div class="metric">
            <div class="metric-value">${report.summary.errors}</div>
            <div class="metric-label">Errors</div>
        </div>
        <div class="metric">
            <div class="metric-value">${report.summary.averageResponseTime}</div>
            <div class="metric-label">Avg Response</div>
        </div>
        <div class="metric">
            <div class="metric-value">${report.alerts.unacknowledged}</div>
            <div class="metric-label">Active Alerts</div>
        </div>
        <div class="metric">
            <div class="metric-value">${(report.metrics.successfulChecks / report.metrics.totalChecks * 100).toFixed(1)}%</div>
            <div class="metric-label">Success Rate</div>
        </div>
    </div>

    <div class="services">
        <h2>📊 Service Status</h2>
        ${report.details.map(service => `
            <div class="service">
                <div>
                    <strong>${service.name || service.domain}</strong>
                    <br>
                    <small>${service.url || service.domain}</small>
                </div>
                <div class="status-${service.status}">
                    ${service.status.toUpperCase()}
                    ${service.responseTime ? `(${service.responseTime}ms)` : ''}
                </div>
            </div>
        `).join('')}
    </div>

    <div class="timestamp">
        Generated on ${new Date().toLocaleString()} • Auto-updated every 30 seconds
    </div>
</body>
</html>`;

        const htmlFile = path.join(process.cwd(), 'reports', 'health-report.html');
        fs.writeFileSync(htmlFile, html);
    }

    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    async startMonitoring() {
        console.log('🚀 Starting FactoryWager Health Monitor...');
        console.log(`📊 Check interval: ${this.config.checkInterval / 1000}s`);
        console.log(`⏰ Timeout: ${this.config.timeout / 1000}s`);
        console.log(`🔄 Retries: ${this.config.retries}`);
        
        // Initial check
        await this.performHealthCheck();
        
        // Start continuous monitoring
        this.monitoringInterval = setInterval(async () => {
            try {
                await this.performHealthCheck();
            } catch (error) {
                console.error('❌ Health check failed:', error.message);
            }
        }, this.config.checkInterval);
        
        console.log('✅ Health monitor started successfully!');
        console.log('📁 Reports: ./reports/health-report.html');
        console.log('📝 Logs: ./logs/health-monitor.log');
        console.log('🚨 Alerts: ./alerts/alerts.json');
        
        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Stopping health monitor...');
            if (this.monitoringInterval) {
                clearInterval(this.monitoringInterval);
            }
            console.log('✅ Health monitor stopped');
            process.exit(0);
        });
    }

    async stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        console.log('✅ Health monitoring stopped');
    }

    getStatus() {
        return {
            status: this.status,
            metrics: this.metrics,
            alerts: this.alerts,
            uptime: this.formatUptime(Date.now() - this.startTime)
        };
    }
}

// CLI usage
if (require.main === module) {
    const monitor = new HealthMonitor();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'check':
            monitor.performHealthCheck()
                .then(result => {
                    console.log('\n📊 Health Check Results:');
                    console.log(`Status: ${result.status.toUpperCase()}`);
                    console.log(`Health: ${result.healthPercentage.toFixed(1)}%`);
                    console.log(`Duration: ${result.duration}ms`);
                })
                .catch(error => {
                    console.error('❌ Health check failed:', error.message);
                    process.exit(1);
                });
            break;
            
        case 'start':
            monitor.startMonitoring();
            break;
            
        case 'status':
            const status = monitor.getStatus();
            console.log('📊 Health Monitor Status:');
            console.log(`Overall: ${status.status.overall.toUpperCase()}`);
            console.log(`Uptime: ${status.uptime}`);
            console.log(`Total Checks: ${status.metrics.totalChecks}`);
            console.log(`Success Rate: ${(status.metrics.successfulChecks / status.metrics.totalChecks * 100).toFixed(1)}%`);
            console.log(`Active Alerts: ${status.alerts.filter(a => !a.acknowledged).length}`);
            break;
            
        case 'report':
            const reportFile = path.join(process.cwd(), 'reports', 'health-report.html');
            if (fs.existsSync(reportFile)) {
                console.log(`📊 Opening health report: ${reportFile}`);
                try {
                    execSync(`open ${reportFile}`, { stdio: 'inherit' });
                } catch (error) {
                    console.log(`📁 Open manually: ${reportFile}`);
                }
            } else {
                console.log('❌ No health report found. Run "check" first.');
            }
            break;
            
        case 'alerts':
            const alertsFile = path.join(process.cwd(), 'alerts', 'alerts.json');
            if (fs.existsSync(alertsFile)) {
                const alerts = JSON.parse(fs.readFileSync(alertsFile, 'utf8'));
                const unacknowledged = alerts.filter(a => !a.acknowledged);
                
                console.log(`🚨 Alerts (${unacknowledged.length} active):`);
                unacknowledged.forEach(alert => {
                    console.log(`  ${alert.severity.toUpperCase()}: ${alert.message}`);
                    console.log(`    ${alert.timestamp}`);
                });
            } else {
                console.log('✅ No alerts found');
            }
            break;
            
        default:
            console.log('FactoryWager Health Monitor');
            console.log('');
            console.log('Usage:');
            console.log('  node health-monitor.js check     - Perform one-time health check');
            console.log('  node health-monitor.js start     - Start continuous monitoring');
            console.log('  node health-monitor.js status    - Show monitor status');
            console.log('  node health-monitor.js report    - Open health report');
            console.log('  node health-monitor.js alerts    - Show active alerts');
            break;
    }
}

module.exports = HealthMonitor;
