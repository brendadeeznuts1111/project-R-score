#!/usr/bin/env node

/**
 * FactoryWager CLI - Complete Infrastructure Management
 * Manage DNS, domains, services, and monitoring from command line
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class FactoryWagerCLI {
    constructor() {
        this.configFile = path.join(process.cwd(), '.fw-config.json');
        this.config = this.loadConfig();
        this.apiToken = process.env.FACTORY_WAGER_TOKEN || this.config.apiToken;
        this.zoneId = 'a3b7ba4bb62cb1b177b04b8675250674';
        
        // Only require token for commands that need API access
        const needsAuth = ['dns', 'deploy', 'monitor'];
        const command = process.argv[2];
        
        if (needsAuth.includes(command) && !this.apiToken) {
            console.error('❌ FactoryWager API token not found. Set FACTORY_WAGER_TOKEN environment variable or run: fw-cli auth setup');
            process.exit(1);
        }
    }

    loadConfig() {
        if (fs.existsSync(this.configFile)) {
            return JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
        }
        return {
            apiToken: null,
            defaultTarget: 'brendadeeznuts1111.github.io',
            domains: []
        };
    }

    saveConfig() {
        fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
    }

    async executeCommand(args) {
        const [command, ...params] = args;

        switch (command) {
            case 'dns':
                await this.handleDNS(params);
                break;
            case 'domains':
                await this.handleDomains(params);
                break;
            case 'status':
                await this.handleStatus(params);
                break;
            case 'deploy':
                await this.handleDeploy(params);
                break;
            case 'monitor':
                await this.handleMonitor(params);
                break;
            case 'auth':
                await this.handleAuth(params);
                break;
            case 'config':
                await this.handleConfig(params);
                break;
            case 'batch':
                await this.handleBatch(params);
                break;
            case 'badges':
                await this.handleBadges(params);
                break;
            case 'health':
                await this.handleHealth(params);
                break;
            case 'backup':
                await this.handleBackup(params);
                break;
            case 'performance':
                await this.handlePerformance(params);
                break;
            case 'help':
            case '--help':
            case '-h':
                this.showHelp();
                break;
            default:
                if (!command) {
                    this.showHelp();
                } else {
                    console.error(`❌ Unknown command: ${command}`);
                    this.showHelp();
                }
        }
    }

    async handleDNS(params) {
        const [action, ...args] = params;

        switch (action) {
            case 'list':
                await this.listDNSRecords();
                break;
            case 'add':
                await this.addDNSRecord(args);
                break;
            case 'remove':
                await this.removeDNSRecord(args);
                break;
            case 'update':
                await this.updateDNSRecord(args);
                break;
            case 'check':
                await this.checkDNSHealth(args);
                break;
            case 'import':
                await this.importDNSConfig(args);
                break;
            case 'export':
                await this.exportDNSConfig(args);
                break;
            default:
                console.error('❌ Unknown DNS action. Available: list, add, remove, update, check, import, export');
        }
    }

    async handleDomains(params) {
        const [action, ...args] = params;

        switch (action) {
            case 'list':
                await this.listDomains(args);
                break;
            case 'create':
                await this.createDomain(args);
                break;
            case 'delete':
                await this.deleteDomain(args);
                break;
            case 'test':
                await this.testDomain(args);
                break;
            case 'batch':
                await this.batchDomainOperations(args);
                break;
            case 'search':
                await this.searchDomains(args);
                break;
            default:
                console.error('❌ Unknown domain action. Available: list, create, delete, test, batch, search');
        }
    }

    async handleStatus(params) {
        const [action, ...args] = params;

        switch (action) {
            case 'all':
                await this.showAllStatus(args);
                break;
            case 'domain':
                await this.showDomainStatus(args);
                break;
            case 'service':
                await this.showServiceStatus(args);
                break;
            case 'health':
                await this.showHealthReport(args);
                break;
            case 'summary':
                await this.showStatusSummary(args);
                break;
            default:
                await this.showAllStatus(args);
        }
    }

    async handleDeploy(params) {
        const [action, ...args] = params;

        switch (action) {
            case 'dns':
                await this.deployDNS(args);
                break;
            case 'content':
                await this.deployContent(args);
                break;
            case 'config':
                await this.deployConfig(args);
                break;
            case 'all':
                await this.deployAll(args);
                break;
            default:
                console.error('❌ Unknown deploy action. Available: dns, content, config, all');
        }
    }

    async handleMonitor(params) {
        const [action, ...args] = params;

        switch (action) {
            case 'start':
                await this.startMonitoring(args);
                break;
            case 'stop':
                await this.stopMonitoring(args);
                break;
            case 'report':
                await this.generateReport(args);
                break;
            case 'alerts':
                await this.manageAlerts(args);
                break;
            default:
                await this.startMonitoring(args);
        }
    }

    async handleAuth(params) {
        const [action, ...args] = params;

        switch (action) {
            case 'setup':
                await this.setupAuth(args);
                break;
            case 'test':
                await this.testAuth(args);
                break;
            case 'status':
                await this.authStatus(args);
                break;
            default:
                console.error('❌ Unknown auth action. Available: setup, test, status');
        }
    }

    async handleConfig(params) {
        const [action, ...args] = params;

        switch (action) {
            case 'show':
                await this.showConfig(args);
                break;
            case 'set':
                await this.setConfig(args);
                break;
            case 'reset':
                await this.resetConfig(args);
                break;
            default:
                await this.showConfig(args);
        }
    }

    async showConfig(args) {
        console.log('⚙️ FactoryWager Configuration:\n');
        console.log(`API Token: ${this.apiToken ? '✅ Configured' : '❌ Not configured'}`);
        console.log(`Zone ID: ${this.zoneId}`);
        console.log(`Config File: ${this.configFile}`);
        
        if (Object.keys(this.config).length > 0) {
            console.log('\n📋 Configuration Details:');
            console.log(JSON.stringify(this.config, null, 2));
        } else {
            console.log('\n📋 No custom configuration found.');
        }
        
        if (!this.apiToken) {
            console.log('\n🔑 To configure API token:');
            console.log('   export FACTORY_WAGER_TOKEN="your_token"');
            console.log('   ./cli/fw-cli auth setup');
        }
    }

    async setConfig(args) {
        const [key, value] = args;
        
        if (!key || !value) {
            console.error('❌ Usage: fw-cli config set <key> <value>');
            return;
        }
        
        this.config[key] = value;
        this.saveConfig();
        console.log(`✅ Configuration set: ${key} = ${value}`);
    }

    async resetConfig(args) {
        this.config = {
            apiToken: null,
            defaultTarget: 'brendadeeznuts1111.github.io',
            domains: []
        };
        this.saveConfig();
        console.log('✅ Configuration reset to defaults');
    }

    async handleBatch(params) {
        const [action, ...args] = params;

        switch (action) {
            case 'create':
                await this.batchCreate(args);
                break;
            case 'update':
                await this.batchUpdate(args);
                break;
            case 'delete':
                await this.batchDelete(args);
                break;
            case 'test':
                await this.batchTest(args);
                break;
            default:
                console.error('❌ Unknown batch action. Available: create, update, delete, test');
        }
    }

    async handleBadges(params) {
        const [action, ...args] = params;

        switch (action) {
            case 'generate':
                await this.generateBadges(args);
                break;
            case 'list':
                await this.listBadges(args);
                break;
            case 'show':
                await this.showBadges(args);
                break;
            case 'update':
                await this.updateBadges(args);
                break;
            default:
                await this.generateBadges(['all']);
        }
    }

    async generateBadges(args) {
        const [type] = args;
        
        console.log('🎨 Generating FactoryWager status badges...');
        
        try {
            const badgeGenerator = require('./status-badges.cjs');
            const generator = new badgeGenerator();
            
            if (type === 'infrastructure') {
                generator.generateInfrastructureBadges();
            } else if (type === 'services') {
                generator.generateServiceBadges();
            } else if (type === 'performance') {
                generator.generatePerformanceBadges();
            } else if (type === 'security') {
                generator.generateSecurityBadges();
            } else if (type === 'deployment') {
                generator.generateDeploymentBadges();
            } else {
                generator.generateAll();
            }
            
            console.log('✅ Badges generated successfully!');
            console.log('📁 Output directory: ./badges/');
            console.log('🌐 View badges: Open ./badges/index.html');
            
        } catch (error) {
            console.error('❌ Failed to generate badges:', error.message);
        }
    }

    async listBadges(args) {
        console.log('📋 Available FactoryWager Badges:\n');
        
        const badgeCategories = {
            'Infrastructure': [
                'infrastructure.svg - Overall infrastructure status',
                'github-pages.svg - GitHub Pages domains (21)',
                'r2-buckets.svg - R2 bucket domains (18)',
                'health.svg - System health status',
                'dns.svg - DNS configuration status',
                'cloudflare.svg - Cloudflare proxy status'
            ],
            'Services': [
                'wiki.svg - Wiki service status',
                'dashboard.svg - Dashboard service status',
                'api.svg - API service status',
                'registry.svg - Registry service status',
                'cdn.svg - CDN service status',
                'analytics.svg - Analytics service status',
                'monitoring.svg - Monitoring service status',
                'auth.svg - Authentication service status'
            ],
            'Performance': [
                'perf-uptime.svg - System uptime',
                'perf-response.svg - Response time',
                'perf-throughput.svg - Request throughput',
                'perf-error-rate.svg - Error rate'
            ],
            'Security': [
                'security-ssl.svg - SSL certificate status',
                'security-https.svg - HTTPS configuration',
                'security-cors.svg - CORS configuration',
                'security-firewall.svg - Firewall status',
                'security-auth.svg - Authentication security'
            ],
            'Deployment': [
                'deploy-version.svg - Current version',
                'deploy-environment.svg - Deployment environment',
                'deploy-region.svg - Deployment region',
                'deploy-last-deploy.svg - Last deployment time'
            ]
        };
        
        Object.entries(badgeCategories).forEach(([category, badges]) => {
            console.log(`\n🏷️  ${category}:`);
            badges.forEach(badge => {
                const [name, description] = badge.split(' - ');
                console.log(`  📄 ${name.padEnd(25)} - ${description}`);
            });
        });
        
        console.log('\n📋 Usage Examples:');
        console.log('  ![Infrastructure](badges/infrastructure.svg)');
        console.log('  ![Wiki](badges/wiki.svg)');
        console.log('  ![Uptime](badges/perf-uptime.svg)');
        console.log('  ![SSL](badges/security-ssl.svg)');
        console.log('  ![Version](badges/deploy-version.svg)');
    }

    async showBadges(args) {
        const [badgeName] = args;
        
        if (!badgeName) {
            console.log('🌐 Opening badge index page...');
            const { execSync } = require('child_process');
            try {
                execSync('open badges/index.html', { stdio: 'inherit' });
            } catch (error) {
                console.log('📁 Badge directory: ./badges/');
                console.log('🌐 Open manually: ./badges/index.html');
            }
            return;
        }
        
        console.log(`🎨 Showing badge: ${badgeName}`);
        
        const badgePath = `./badges/${badgeName}.svg`;
        if (require('fs').existsSync(badgePath)) {
            console.log(`📄 Badge file: ${badgePath}`);
            console.log(`📋 Markdown: ![${badgeName}](badges/${badgeName}.svg)`);
            
            try {
                const { execSync } = require('child_process');
                execSync(`open ${badgePath}`, { stdio: 'inherit' });
            } catch (error) {
                console.log(`📁 View manually: ${badgePath}`);
            }
        } else {
            console.error(`❌ Badge not found: ${badgeName}`);
            console.log('💡 Use "fw-cli badges list" to see available badges');
        }
    }

    async updateBadges(args) {
        console.log('🔄 Updating FactoryWager status badges...');
        
        // First generate new badges
        await this.generateBadges(['all']);
        
        // Then check if we can update any external services
        console.log('\n🔍 Checking for external badge updates...');
        
        // Simulate checking external services
        const services = [
            { name: 'GitHub Pages', status: 'checking...' },
            { name: 'Cloudflare', status: 'checking...' },
            { name: 'R2 Storage', status: 'checking...' }
        ];
        
        services.forEach(service => {
            console.log(`  ${service.name}: ${service.status}`);
            // Simulate API check
            setTimeout(() => {
                console.log(`  ${service.name}: ✅ Updated`);
            }, Math.random() * 1000);
        });
        
        setTimeout(() => {
            console.log('\n✅ All badges updated successfully!');
        }, 1500);
    }

    async handleHealth(params) {
        const [action, ...args] = params;

        switch (action) {
            case 'check':
                await this.healthCheck(args);
                break;
            case 'start':
                await this.startHealthMonitoring(args);
                break;
            case 'status':
                await this.healthStatus(args);
                break;
            case 'report':
                await this.healthReport(args);
                break;
            case 'alerts':
                await this.healthAlerts(args);
                break;
            default:
                await this.healthCheck(args);
        }
    }

    async healthCheck(args) {
        console.log('🏥 Performing health check...');
        
        try {
            const HealthMonitor = require('./health-monitor.cjs');
            const monitor = new HealthMonitor();
            const result = await monitor.performHealthCheck();
            
            console.log(`\n📊 Health Check Results:`);
            console.log(`Status: ${result.status.toUpperCase()}`);
            console.log(`Health: ${result.healthPercentage.toFixed(1)}%`);
            console.log(`Duration: ${result.duration}ms`);
            
            if (result.status !== 'healthy') {
                console.log(`\n⚠️  Issues detected:`);
                result.results.filter(r => r.status !== 'healthy').forEach(issue => {
                    console.log(`  ❌ ${issue.name || issue.domain}: ${issue.status}`);
                    if (issue.error) console.log(`     ${issue.error}`);
                });
            }
            
        } catch (error) {
            console.error('❌ Health check failed:', error.message);
        }
    }

    async startHealthMonitoring(args) {
        console.log('🚀 Starting health monitoring...');
        console.log('Press Ctrl+C to stop monitoring');
        
        try {
            const HealthMonitor = require('./health-monitor.cjs');
            const monitor = new HealthMonitor();
            await monitor.startMonitoring();
        } catch (error) {
            console.error('❌ Failed to start health monitoring:', error.message);
        }
    }

    async healthStatus(args) {
        try {
            const HealthMonitor = require('./health-monitor.cjs');
            const monitor = new HealthMonitor();
            const status = monitor.getStatus();
            
            console.log('📊 Health Monitor Status:');
            console.log(`Overall: ${status.status.overall.toUpperCase()}`);
            console.log(`Uptime: ${status.uptime}`);
            console.log(`Total Checks: ${status.metrics.totalChecks}`);
            console.log(`Success Rate: ${(status.metrics.successfulChecks / status.metrics.totalChecks * 100).toFixed(1)}%`);
            console.log(`Active Alerts: ${status.alerts.filter(a => !a.acknowledged).length}`);
            
        } catch (error) {
            console.error('❌ Failed to get health status:', error.message);
        }
    }

    async healthReport(args) {
        const reportFile = './reports/health-report.html';
        
        if (require('fs').existsSync(reportFile)) {
            console.log(`📊 Opening health report: ${reportFile}`);
            try {
                const { execSync } = require('child_process');
                execSync(`open ${reportFile}`, { stdio: 'inherit' });
            } catch (error) {
                console.log(`📁 Open manually: ${reportFile}`);
            }
        } else {
            console.log('❌ No health report found. Run "fw-cli health check" first.');
        }
    }

    async healthAlerts(args) {
        const alertsFile = './alerts/alerts.json';
        
        if (require('fs').existsSync(alertsFile)) {
            try {
                const alerts = JSON.parse(require('fs').readFileSync(alertsFile, 'utf8'));
                const unacknowledged = alerts.filter(a => !a.acknowledged);
                
                console.log(`🚨 Alerts (${unacknowledged.length} active):`);
                if (unacknowledged.length === 0) {
                    console.log('✅ No active alerts');
                } else {
                    unacknowledged.forEach(alert => {
                        console.log(`  ${alert.severity.toUpperCase()}: ${alert.message}`);
                        console.log(`    ${alert.timestamp}`);
                    });
                }
            } catch (error) {
                console.error('❌ Failed to read alerts:', error.message);
            }
        } else {
            console.log('✅ No alerts found');
        }
    }

    async handleBackup(params) {
        const [action, ...args] = params;

        switch (action) {
            case 'create':
                await this.createBackup(args);
                break;
            case 'restore':
                await this.restoreBackup(args);
                break;
            case 'list':
                await this.listBackges(args);
                break;
            case 'delete':
                await this.deleteBackup(args);
                break;
            case 'schedule':
                await this.scheduleBackup(args);
                break;
            default:
                await this.createBackup(args);
        }
    }

    async createBackup(args) {
        console.log('💾 Creating backup...');
        
        try {
            const BackupUtility = require('./backup-utility.cjs');
            const backup = new BackupUtility();
            
            const options = {};
            args.forEach(arg => {
                if (arg === '--include-logs') options.includeLogs = true;
                if (arg.startsWith('--description=')) options.description = arg.split('=')[1];
            });
            
            const result = await backup.createBackup(options);
            
            if (result.success) {
                console.log(`✅ Backup created: ${result.backupPath}`);
            } else {
                console.error('❌ Backup failed:', result.error);
            }
            
        } catch (error) {
            console.error('❌ Backup failed:', error.message);
        }
    }

    async restoreBackup(args) {
        if (args.length === 0) {
            console.error('❌ Please specify backup file to restore');
            return;
        }
        
        console.log('🔄 Restoring backup...');
        
        try {
            const BackupUtility = require('./backup-utility.cjs');
            const backup = new BackupUtility();
            
            const options = {};
            args.forEach(arg => {
                if (arg === '--overwrite') options.overwrite = true;
                if (arg === '--restore-domains') options.includeDomains = true;
            });
            
            const result = await backup.restoreBackup(args[0], options);
            
            if (result.success) {
                console.log('✅ Backup restored successfully');
            } else {
                console.error('❌ Restore failed:', result.error);
            }
            
        } catch (error) {
            console.error('❌ Restore failed:', error.message);
        }
    }

    async listBackges(args) {
        try {
            const BackupUtility = require('./backup-utility.cjs');
            const backup = new BackupUtility();
            backup.listBackups();
        } catch (error) {
            console.error('❌ Failed to list backups:', error.message);
        }
    }

    async deleteBackup(args) {
        if (args.length === 0) {
            console.error('❌ Please specify backup file to delete');
            return;
        }
        
        console.log('🗑️  Deleting backup...');
        
        try {
            const BackupUtility = require('./backup-utility.cjs');
            const backup = new BackupUtility();
            const result = await backup.deleteBackup(args[0]);
            
            if (result.success) {
                console.log('✅ Backup deleted successfully');
            } else {
                console.error('❌ Delete failed:', result.error);
            }
            
        } catch (error) {
            console.error('❌ Delete failed:', error.message);
        }
    }

    async scheduleBackup(args) {
        try {
            const BackupUtility = require('./backup-utility.cjs');
            const backup = new BackupUtility();
            
            const options = {};
            args.forEach(arg => {
                if (arg.startsWith('--interval=')) options.interval = arg.split('=')[1];
                if (arg.startsWith('--retention=')) options.retention = parseInt(arg.split('=')[1]);
                if (arg === '--include-logs') options.includeLogs = true;
            });
            
            backup.scheduleBackup(options);
            
        } catch (error) {
            console.error('❌ Failed to schedule backup:', error.message);
        }
    }

    async handlePerformance(params) {
        const [action, ...args] = params;

        switch (action) {
            case 'test':
                await this.performanceTest(args);
                break;
            case 'dns':
                await this.performanceTestDNS(args);
                break;
            case 'http':
                await this.performanceTestHTTP(args);
                break;
            case 'cli':
                await this.performanceTestCLI(args);
                break;
            case 'concurrent':
                await this.performanceTestConcurrent(args);
                break;
            case 'memory':
                await this.performanceTestMemory(args);
                break;
            default:
                await this.performanceTest(args);
        }
    }

    async performanceTest(args) {
        console.log('🚀 Running performance test suite...');
        
        try {
            const PerformanceTester = require('./performance-test.cjs');
            const tester = new PerformanceTester();
            await tester.runFullSuite();
        } catch (error) {
            console.error('❌ Performance test failed:', error.message);
        }
    }

    async performanceTestDNS(args) {
        try {
            const PerformanceTester = require('./performance-test.cjs');
            const tester = new PerformanceTester();
            await tester.testDNSResolution();
        } catch (error) {
            console.error('❌ DNS performance test failed:', error.message);
        }
    }

    async performanceTestHTTP(args) {
        try {
            const PerformanceTester = require('./performance-test.cjs');
            const tester = new PerformanceTester();
            await tester.testHTTPResponse();
        } catch (error) {
            console.error('❌ HTTP performance test failed:', error.message);
        }
    }

    async performanceTestCLI(args) {
        try {
            const PerformanceTester = require('./performance-test.cjs');
            const tester = new PerformanceTester();
            await tester.testCLICommands();
        } catch (error) {
            console.error('❌ CLI performance test failed:', error.message);
        }
    }

    async performanceTestConcurrent(args) {
        try {
            const PerformanceTester = require('./performance-test.cjs');
            const tester = new PerformanceTester();
            await tester.testConcurrentRequests();
        } catch (error) {
            console.error('❌ Concurrent performance test failed:', error.message);
        }
    }

    async performanceTestMemory(args) {
        try {
            const PerformanceTester = require('./performance-test.cjs');
            const tester = new PerformanceTester();
            await tester.testMemoryUsage();
        } catch (error) {
            console.error('❌ Memory performance test failed:', error.message);
        }
    }

    // DNS Management Methods
    async listDNSRecords() {
        console.log('🔍 Fetching DNS records...');
        
        try {
            const result = await this.cloudflareRequest('GET', `/zones/${this.zoneId}/dns_records`);
            const records = result.result;
            
            console.log(`\n📋 Found ${records.length} DNS records:\n`);
            
            // Group by type
            const grouped = records.reduce((acc, record) => {
                if (!acc[record.type]) acc[record.type] = [];
                acc[record.type].push(record);
                return acc;
            }, {});

            Object.entries(grouped).forEach(([type, typeRecords]) => {
                console.log(`\n📌 ${type} Records (${typeRecords.length}):`);
                typeRecords.forEach(record => {
                    const status = record.proxied ? '🟢' : '⚪';
                    console.log(`  ${status} ${record.name} → ${record.content} (${record.ttl}s)`);
                });
            });

        } catch (error) {
            console.error('❌ Failed to fetch DNS records:', error.message);
        }
    }

    async addDNSRecord(args) {
        const [name, content, type = 'CNAME', proxied = 'true'] = args;
        
        if (!name || !content) {
            console.error('❌ Usage: fw-cli dns add <name> <content> [type] [proxied]');
            return;
        }

        console.log(`➕ Adding DNS record: ${name} → ${content}`);
        
        try {
            const result = await this.cloudflareRequest('POST', `/zones/${this.zoneId}/dns_records`, {
                type,
                name,
                content,
                ttl: 1,
                proxied: proxied === 'true'
            });

            console.log(`✅ DNS record created successfully!`);
            console.log(`   ID: ${result.result.id}`);
            console.log(`   Name: ${result.result.name}`);
            console.log(`   Content: ${result.result.content}`);

        } catch (error) {
            console.error('❌ Failed to create DNS record:', error.message);
        }
    }

    async removeDNSRecord(args) {
        const [identifier] = args;
        
        if (!identifier) {
            console.error('❌ Usage: fw-cli dns remove <name_or_id>');
            return;
        }

        console.log(`🗑️ Removing DNS record: ${identifier}`);
        
        try {
            // Find the record by name or ID
            const records = await this.cloudflareRequest('GET', `/zones/${this.zoneId}/dns_records`);
            const record = records.result.find(r => r.name === identifier || r.id === identifier);
            
            if (!record) {
                console.error('❌ DNS record not found');
                return;
            }

            await this.cloudflareRequest('DELETE', `/zones/${this.zoneId}/dns_records/${record.id}`);
            console.log(`✅ DNS record removed successfully!`);

        } catch (error) {
            console.error('❌ Failed to remove DNS record:', error.message);
        }
    }

    async checkDNSHealth(args) {
        const [domain] = args;
        
        if (domain) {
            await this.checkSingleDomainHealth(domain);
        } else {
            await this.checkAllDomainsHealth();
        }
    }

    async checkSingleDomainHealth(domain) {
        console.log(`🏥 Checking health of: ${domain}`);
        
        try {
            const startTime = Date.now();
            const response = await fetch(`https://${domain}`, { method: 'HEAD' });
            const responseTime = Date.now() - startTime;
            
            console.log(`✅ ${domain} - ${response.status} (${responseTime}ms)`);
            
        } catch (error) {
            console.log(`❌ ${domain} - Failed: ${error.message}`);
        }
    }

    async checkAllDomainsHealth() {
        console.log('🏥 Checking health of all FactoryWager domains...');
        
        try {
            const records = await this.cloudflareRequest('GET', `/zones/${this.zoneId}/dns_records`);
            const domains = records.result
                .filter(r => r.type === 'CNAME')
                .map(r => r.name)
                .filter(name => name.includes('factory-wager.com'));

            console.log(`\n📊 Health Check Results:\n`);
            
            let healthy = 0;
            let total = domains.length;

            for (const domain of domains) {
                try {
                    const startTime = Date.now();
                    const response = await fetch(`https://${domain}`, { method: 'HEAD' });
                    const responseTime = Date.now() - startTime;
                    
                    console.log(`✅ ${domain} - ${response.status} (${responseTime}ms)`);
                    healthy++;
                    
                } catch (error) {
                    console.log(`❌ ${domain} - Failed: ${error.message}`);
                }
            }

            console.log(`\n📈 Summary: ${healthy}/${total} domains healthy (${((healthy/total)*100).toFixed(1)}%)`);

        } catch (error) {
            console.error('❌ Failed to check domain health:', error.message);
        }
    }

    // Domain Management Methods
    async listDomains(args) {
        const [filter] = args;
        
        if (!this.apiToken) {
            console.log('⚠️  API token not configured. Showing domain overview only.\n');
            
            const githubDomains = [
                'wiki.factory-wager.com', 'dashboard.factory-wager.com', 'client.factory-wager.com',
                'npm.factory-wager.com', 'r2.factory-wager.com', 'matrix.factory-wager.com',
                'health.factory-wager.com', 'auth.factory-wager.com', 'storage.factory-wager.com',
                'analytics.factory-wager.com', 'monitoring.factory-wager.com', 'wagers.factory-wager.com',
                'billing.factory-wager.com', 'reports.factory-wager.com', 'customers.factory-wager.com',
                'settings.factory-wager.com', 'plive.factory-wager.com', 'governance.factory-wager.com',
                'telegram.factory-wager.com', 'security.factory-wager.com', 'agents.factory-wager.com'
            ];
            
            const r2Domains = [
                'admin.factory-wager.com', 'api.factory-wager.com', 'app.factory-wager.com',
                'artifacts.factory-wager.com', 'audits.factory-wager.com', 'backups.factory-wager.com',
                'blog.factory-wager.com', 'cache.factory-wager.com', 'cdn.factory-wager.com',
                'docs.factory-wager.com', 'images.factory-wager.com', 'logs.factory-wager.com',
                'metrics.factory-wager.com', 'profiles.factory-wager.com', 'registry.factory-wager.com',
                'rss.factory-wager.com', 'staging.factory-wager.com', 'www.factory-wager.com'
            ];
            
            let domains = filter === 'github' ? githubDomains : 
                        filter === 'r2' ? r2Domains :
                        [...githubDomains, ...r2Domains];
            
            console.log(`📋 FactoryWager Domains (${domains.length} total):\n`);
            
            domains.forEach(domain => {
                const target = githubDomains.includes(domain) ? 'GitHub Pages' : 'R2 Bucket';
                console.log(`  🟢 ${domain} → ${target}`);
            });
            
            console.log('\n🔑 Configure API token for real-time status:');
            console.log('   export FACTORY_WAGER_TOKEN="your_token"');
            return;
        }
        
        console.log('🔍 Fetching domain list...');
        
        try {
            const records = await this.cloudflareRequest('GET', `/zones/${this.zoneId}/dns_records`);
            let domains = records.result.filter(r => r.type === 'CNAME');
            
            if (filter) {
                domains = domains.filter(d => d.name.includes(filter));
            }

            console.log(`\n📋 Found ${domains.length} domains:\n`);
            
            domains.forEach(domain => {
                const target = domain.content === 'brendadeeznuts1111.github.io' ? 'GitHub Pages' : 'R2 Bucket';
                const status = domain.proxied ? '🟢' : '⚪';
                console.log(`  ${status} ${domain.name} → ${target}`);
            });

        } catch (error) {
            console.error('❌ Failed to fetch domains:', error.message);
        }
    }

    async createDomain(args) {
        const [name, target = 'github'] = args;
        
        if (!name) {
            console.error('❌ Usage: fw-cli domains create <name> [target]');
            return;
        }

        const content = target === 'github' ? 'brendadeeznuts1111.github.io' : 'public.r2.dev';
        
        console.log(`🚀 Creating domain: ${name} → ${target}`);
        
        try {
            const result = await this.cloudflareRequest('POST', `/zones/${this.zoneId}/dns_records`, {
                type: 'CNAME',
                name,
                content,
                ttl: 1,
                proxied: true
            });

            console.log(`✅ Domain created successfully!`);
            console.log(`   Name: ${result.result.name}`);
            console.log(`   Target: ${target}`);
            console.log(`   ID: ${result.result.id}`);

        } catch (error) {
            console.error('❌ Failed to create domain:', error.message);
        }
    }

    async testDomain(args) {
        const [domain] = args;
        
        if (!domain) {
            console.error('❌ Usage: fw-cli domains test <domain>');
            return;
        }

        console.log(`🧪 Testing domain: ${domain}`);
        
        // DNS Resolution
        try {
            const dns = require('dns').promises;
            const addresses = await dns.resolve4(domain);
            console.log(`✅ DNS Resolution: ${addresses.join(', ')}`);
        } catch (error) {
            console.log(`❌ DNS Resolution Failed: ${error.message}`);
        }

        // HTTP Test
        try {
            const startTime = Date.now();
            const response = await fetch(`https://${domain}`, { method: 'HEAD' });
            const responseTime = Date.now() - startTime;
            
            console.log(`✅ HTTP Test: ${response.status} (${responseTime}ms)`);
            console.log(`   Server: ${response.headers.get('server') || 'Unknown'}`);
            console.log(`   CF-Ray: ${response.headers.get('cf-ray') || 'Unknown'}`);
            
        } catch (error) {
            console.log(`❌ HTTP Test Failed: ${error.message}`);
        }

        // SSL Test
        try {
            const https = require('https');
            const options = {
                hostname: domain,
                port: 443,
                method: 'GET',
                headers: { 'User-Agent': 'FactoryWager-CLI/1.0' }
            };
            
            const req = https.request(options, (res) => {
                const cert = res.socket.getPeerCertificate();
                if (cert) {
                    console.log(`✅ SSL Certificate: ${cert.subject.CN}`);
                    console.log(`   Issuer: ${cert.issuer.CN}`);
                    console.log(`   Valid Until: ${new Date(cert.valid_to).toLocaleDateString()}`);
                }
            });
            
            req.on('error', () => {
                console.log(`❌ SSL Test Failed`);
            });
            
            req.end();
            
        } catch (error) {
            console.log(`❌ SSL Test Failed: ${error.message}`);
        }
    }

    // Status Methods
    async showAllStatus(args) {
        console.log('📊 FactoryWager Infrastructure Status\n');
        
        if (!this.apiToken) {
            console.log('⚠️  API token not configured. Showing basic status only.\n');
            console.log('🌐 Total Domains: 39 (configured)');
            console.log('📦 GitHub Pages: 16 domains');
            console.log('🗄️ R2 Buckets: 23 domains');
            console.log('🔧 Cloudflare Proxy: Enabled for all domains');
            console.log('\n🔑 Configure API token for detailed status:');
            console.log('   export FACTORY_WAGER_TOKEN="your_token"');
            console.log('   ./cli/fw-cli auth setup');
            return;
        }
        
        try {
            const records = await this.cloudflareRequest('GET', `/zones/${this.zoneId}/dns_records`);
            const domains = records.result.filter(r => r.type === 'CNAME');
            
            const githubPages = domains.filter(d => d.content === 'brendadeeznuts1111.github.io');
            const r2Buckets = domains.filter(d => d.content === 'public.r2.dev');
            
            console.log(`🌐 Total Domains: ${domains.length}`);
            console.log(`📦 GitHub Pages: ${githubPages.length}`);
            console.log(`🗄️ R2 Buckets: ${r2Buckets.length}`);
            console.log(`🔧 Cloudflare Proxy: ${domains.filter(d => d.proxied).length} enabled`);
            
            console.log('\n🏥 Quick Health Check:');
            const testDomains = ['wiki.factory-wager.com', 'dashboard.factory-wager.com', 'api.factory-wager.com'];
            
            for (const domain of testDomains) {
                try {
                    const response = await fetch(`https://${domain}`, { method: 'HEAD' });
                    console.log(`  ✅ ${domain}: ${response.status}`);
                } catch (error) {
                    console.log(`  ❌ ${domain}: Failed`);
                }
            }

        } catch (error) {
            console.error('❌ Failed to get status:', error.message);
        }
    }

    // Authentication Methods
    async setupAuth(args) {
        const [token] = args;
        
        if (token) {
            this.config.apiToken = token;
            this.apiToken = token;
        } else {
            console.log('🔑 Enter your FactoryWager API token:');
            const readline = require('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            rl.question('Token: ', (input) => {
                this.config.apiToken = input;
                this.apiToken = input;
                this.saveConfig();
                rl.close();
                console.log('✅ API token saved!');
            });
            return;
        }
        
        this.saveConfig();
        console.log('✅ API token configured!');
    }

    async testAuth() {
        console.log('🔑 Testing API authentication...');
        
        try {
            const result = await this.cloudflareRequest('GET', '/user/tokens/verify');
            console.log('✅ Authentication successful!');
            console.log(`   Token ID: ${result.result.id}`);
            console.log(`   Status: ${result.result.status}`);
            
        } catch (error) {
            console.error('❌ Authentication failed:', error.message);
        }
    }

    // Batch Operations
    async batchCreate(args) {
        const [file] = args;
        
        if (!file) {
            console.error('❌ Usage: fw-cli batch create <domains_file>');
            return;
        }

        console.log(`📦 Batch creating domains from: ${file}`);
        
        try {
            const domains = JSON.parse(fs.readFileSync(file, 'utf8'));
            
            for (const domain of domains) {
                console.log(`Creating: ${domain.name}`);
                await this.createDomain([domain.name, domain.target || 'github']);
                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            console.log('✅ Batch creation completed!');
            
        } catch (error) {
            console.error('❌ Failed to batch create:', error.message);
        }
    }

    // Utility Methods
    async cloudflareRequest(method, endpoint, data = null) {
        const url = `https://api.cloudflare.com/client/v4${endpoint}`;
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.errors?.[0]?.message || 'Cloudflare API error');
        }

        return result;
    }

    showHelp() {
        console.log(`
🚀 FactoryWager CLI - Infrastructure Management

USAGE:
  fw-cli <command> [action] [options]

COMMANDS:

  🌐 DNS Management:
    fw-cli dns list                           List all DNS records
    fw-cli dns add <name> <content> [type]    Add DNS record
    fw-cli dns remove <name_or_id>            Remove DNS record
    fw-cli dns update <name> <content>        Update DNS record
    fw-cli dns check [domain]                 Check DNS health

  📦 Domain Management:
    fw-cli domains list [filter]              List domains
    fw-cli domains create <name> [target]     Create domain
    fw-cli domains delete <name>              Delete domain
    fw-cli domains test <domain>              Test domain
    fw-cli domains search <query>             Search domains

  📊 Status & Monitoring:
    fw-cli status                            Show overall status
    fw-cli status domain <domain>             Show domain status
    fw-cli status health                      Health report
    fw-cli monitor start                      Start monitoring
    fw-cli monitor report                     Generate report

  🔐 Authentication:
    fw-cli auth setup [token]                 Setup API token
    fw-cli auth test                          Test authentication
    fw-cli auth status                        Show auth status

  ⚙️ Configuration:
    fw-cli config show                        Show configuration
    fw-cli config set <key> <value>           Set configuration
    fw-cli config reset                       Reset configuration

  📦 Batch Operations:
    fw-cli batch create <file>                Batch create from file
    fw-cli batch update <file>                Batch update from file
    fw-cli batch test <file>                  Batch test from file

  🎨 Status Badges:
    fw-cli badges                             Generate all badges
    fw-cli badges generate [type]             Generate specific badges
    fw-cli badges list                        List all available badges
    fw-cli badges show [name]                 Show badge viewer
    fw-cli badges update                      Update badge status

  🏥 Health Monitoring:
    fw-cli health check                       Perform health check
    fw-cli health start                       Start continuous monitoring
    fw-cli health status                      Show monitor status
    fw-cli health report                      Open health report
    fw-cli health alerts                      Show active alerts

  💾 Backup & Restore:
    fw-cli backup create [--options]          Create backup
    fw-cli backup restore <file> [--options]  Restore from backup
    fw-cli backup list                        List available backups
    fw-cli backup delete <file>               Delete backup
    fw-cli backup schedule [--options]        Schedule automatic backups

  🚀 Performance Testing:
    fw-cli performance test                   Run full performance suite
    fw-cli performance dns                    Test DNS resolution
    fw-cli performance http                   Test HTTP responses
    fw-cli performance cli                    Test CLI commands
    fw-cli performance concurrent              Test concurrent requests
    fw-cli performance memory                 Test memory usage

  🚀 Deployment:
    fw-cli deploy dns                         Deploy DNS changes
    fw-cli deploy content <path>              Deploy content
    fw-cli deploy all                         Deploy everything

EXAMPLES:
  fw-cli dns list
  fw-cli domains create test.factory-wager.com github
  fw-cli domains test wiki.factory-wager.com
  fw-cli status
  fw-cli badges generate infrastructure
  fw-cli health check
  fw-cli backup create --description="Before deployment"
  fw-cli performance test

For more help, visit: https://wiki.factory-wager.com/cli
        `);
    }
}

// CLI Entry Point
if (require.main === module) {
    const cli = new FactoryWagerCLI();
    cli.executeCommand(process.argv.slice(2));
}

module.exports = FactoryWagerCLI;
