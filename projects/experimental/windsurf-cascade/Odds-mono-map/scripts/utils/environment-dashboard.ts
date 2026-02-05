#!/usr/bin/env bun
/**
 * [DOMAIN][UTILITY][TYPE][HELPER][SCOPE][GENERAL][META][TOOL][#REF]environment-dashboard
 * 
 * Environment Dashboard
 * Specialized script for Odds-mono-map vault management
 * 
 * @fileoverview General utilities and helper functions
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category utils
 * @tags utils
 */

import chalk from 'chalk';

console.log(chalk.blue.bold('🌍 Enhanced Environment Variables Dashboard'));
console.log(chalk.gray('Real-time monitoring and optimization of Bun environment configuration'));
console.log(chalk.gray(`Last updated: ${new Date().toISOString()}\n`));

// Environment status monitoring
function getEnvironmentStatus() {
    return {
        colors: {
            enabled: !Bun.env.NO_COLOR,
            forced: !!Bun.env.FORCE_COLOR,
            status: Bun.env.NO_COLOR ? 'Disabled' : (Bun.env.FORCE_COLOR ? 'Forced' : 'Normal')
        },
        network: {
            maxRequests: Number(Bun.env.BUN_CONFIG_MAX_HTTP_REQUESTS) || 256,
            verboseFetch: Bun.env.BUN_CONFIG_VERBOSE_FETCH || 'Disabled',
            verboseFetchMode: getVerboseFetchMode(Bun.env.BUN_CONFIG_VERBOSE_FETCH),
            sslVerification: Bun.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' ? 'Disabled' : 'Enabled',
            httpProxy: Bun.env.HTTP_PROXY || Bun.env.HTTPS_PROXY || 'Not set',
            noProxy: Bun.env.NO_PROXY || 'Not set'
        },
        performance: {
            transpilerCache: Bun.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH || 'Default',
            transpilerCacheDisabled: Bun.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH === '0',
            tempDir: Bun.env.TMPDIR || 'System default',
            doNotTrack: !!Bun.env.DO_NOT_TRACK,
            clearTerminalOnReload: Bun.env.BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD !== 'true'
        },
        project: {
            name: Bun.env.PROJECT_NAME || 'Unknown',
            version: Bun.env.VERSION || '0.0.0',
            environment: Bun.env.NODE_ENV || 'development',
            debug: Bun.env.DEBUG === 'true',
            logLevel: Bun.env.LOG_LEVEL || 'info',
            port: Bun.env.PORT || '3000',
            host: Bun.env.HOST || 'localhost'
        },
        bun: {
            options: Bun.env.BUN_OPTIONS || 'None',
            version: process.version,
            platform: process.platform,
            arch: process.arch
        },
        security: {
            nodeTlsRejectUnauthorized: Bun.env.NODE_TLS_REJECT_UNAUTHORIZED || '1',
            contentSecurityPolicy: Bun.env.CSP_ENABLED || 'Not set',
            corsOrigins: Bun.env.CORS_ORIGINS || 'Not set'
        }
    };
}

// Helper function to determine verbose fetch mode
function getVerboseFetchMode(value: string | undefined): string {
    switch (value) {
        case 'curl': return 'Curl Commands';
        case 'true': return 'Request/Response Headers';
        case 'false': return 'Disabled';
        default: return 'Disabled';
    }
}

// Create enhanced environment status table with topics and properties
function createEnvironmentTable() {
    const env = getEnvironmentStatus();

    const tableData = [
        // 🎨 Visual & Terminal Configuration
        { topic: '🎨 Visual & Terminal', category: 'Colors', property: 'Status', value: env.colors.status, impact: env.colors.enabled ? 'Full' : 'Plain', type: 'Display' },
        { topic: '🎨 Visual & Terminal', category: 'Colors', property: 'Forced', value: env.colors.forced ? 'Yes' : 'No', impact: env.colors.forced ? 'Override' : 'Auto', type: 'Display' },

        // 🌐 Network & HTTP Configuration  
        { topic: '🌐 Network & HTTP', category: 'Requests', property: 'Max Concurrent', value: env.network.maxRequests.toString(), impact: env.network.maxRequests > 200 ? 'High' : 'Limited', type: 'Performance' },
        { topic: '🌐 Network & HTTP', category: 'Debugging', property: 'Verbose Fetch', value: env.network.verboseFetchMode, impact: env.network.verboseFetch !== 'Disabled' ? 'Debug' : 'Normal', type: 'Debug' },
        { topic: '🌐 Network & HTTP', category: 'Security', property: 'SSL Verification', value: env.network.sslVerification, impact: env.network.sslVerification === 'Disabled' ? '⚠️  Risk' : 'Secure', type: 'Security' },
        { topic: '🌐 Network & HTTP', category: 'Proxy', property: 'HTTP Proxy', value: env.network.httpProxy, impact: env.network.httpProxy !== 'Not set' ? 'Configured' : 'Direct', type: 'Network' },
        { topic: '🌐 Network & HTTP', category: 'Proxy', property: 'No Proxy List', value: env.network.noProxy, impact: env.network.noProxy !== 'Not set' ? 'Bypass' : 'All', type: 'Network' },

        // 💾 Performance & Caching
        { topic: '💾 Performance & Caching', category: 'Transpiler', property: 'Cache Path', value: env.performance.transpilerCache, impact: env.performance.transpilerCacheDisabled ? 'Disabled' : 'Active', type: 'Performance' },
        { topic: '💾 Performance & Caching', category: 'Storage', property: 'Temp Directory', value: env.performance.tempDir, impact: 'Storage', type: 'System' },
        { topic: '💾 Performance & Caching', category: 'Terminal', property: 'Clear on Reload', value: env.performance.clearTerminalOnReload ? 'Enabled' : 'Disabled', impact: env.performance.clearTerminalOnReload ? 'Clean' : 'Preserved', type: 'UX' },
        { topic: '💾 Performance & Caching', category: 'Telemetry', property: 'Analytics Tracking', value: env.performance.doNotTrack ? 'Disabled' : 'Enabled', impact: env.performance.doNotTrack ? 'Private' : 'Analytics', type: 'Privacy' },

        // 📦 Application Configuration
        { topic: '📦 Application', category: 'Identity', property: 'Project Name', value: env.project.name, impact: 'Identity', type: 'Metadata' },
        { topic: '📦 Application', category: 'Identity', property: 'Version', value: env.project.version, impact: 'Release', type: 'Metadata' },
        { topic: '📦 Application', category: 'Environment', property: 'Node Environment', value: env.project.environment, impact: env.project.environment === 'production' ? 'Live' : 'Dev', type: 'Runtime' },
        { topic: '📦 Application', category: 'Debugging', property: 'Debug Mode', value: env.project.debug ? 'Enabled' : 'Disabled', impact: env.project.debug ? 'Verbose' : 'Silent', type: 'Debug' },
        { topic: '📦 Application', category: 'Logging', property: 'Log Level', value: env.project.logLevel, impact: env.project.logLevel === 'debug' ? 'Verbose' : 'Standard', type: 'Logging' },
        { topic: '📦 Application', category: 'Server', property: 'Port', value: env.project.port, impact: 'Network', type: 'Configuration' },
        { topic: '📦 Application', category: 'Server', property: 'Host Binding', value: env.project.host, impact: 'Binding', type: 'Configuration' },

        // 🔧 Bun Runtime Configuration
        { topic: '🔧 Bun Runtime', category: 'Options', property: 'Default Flags', value: env.bun.options, impact: env.bun.options !== 'None' ? 'Custom' : 'Default', type: 'Configuration' },
        { topic: '🔧 Bun Runtime', category: 'Version', property: 'Runtime Version', value: env.bun.version, impact: 'Runtime', type: 'System' },
        { topic: '🔧 Bun Runtime', category: 'Platform', property: 'Architecture', value: `${env.bun.platform}-${env.bun.arch}`, impact: 'Platform', type: 'System' },

        // 🔒 Security Configuration
        { topic: '🔒 Security', category: 'TLS/SSL', property: 'Certificate Verification', value: env.security.nodeTlsRejectUnauthorized === '0' ? 'Disabled' : 'Enabled', impact: env.security.nodeTlsRejectUnauthorized === '0' ? 'Risk' : 'Secure', type: 'Security' },
        { topic: '🔒 Security', category: 'Web Security', property: 'Content Security Policy', value: env.security.contentSecurityPolicy, impact: env.security.contentSecurityPolicy !== 'Not set' ? 'Protected' : 'Open', type: 'Security' },
        { topic: '🔒 Security', category: 'Web Security', property: 'CORS Origins', value: env.security.corsOrigins, impact: env.security.corsOrigins !== 'Not set' ? 'Restricted' : 'Open', type: 'Security' }
    ];

    return Bun.inspect.table(tableData, { colors: true });
}

// Environment health score
function calculateEnvironmentHealth() {
    const env = getEnvironmentStatus();
    let score = 100;
    const issues = [];
    const warnings = [];

    // Check for critical issues
    if (env.network.sslVerification === 'Disabled') {
        score -= 25;
        issues.push('SSL verification disabled - security risk');
    }

    if (env.network.maxRequests < 50) {
        score -= 15;
        issues.push('Very low HTTP request limit may affect performance');
    }

    if (env.project.environment === 'production' && env.project.debug) {
        score -= 20;
        issues.push('Debug mode enabled in production - security risk');
    }

    if (env.security.nodeTlsRejectUnauthorized === '0') {
        score -= 25;
        issues.push('TLS verification disabled - man-in-the-middle risk');
    }

    // Check for warnings
    if (!env.colors.enabled && !env.colors.forced) {
        score -= 5;
        warnings.push('Colors disabled - reduced readability');
    }

    if (env.performance.transpilerCacheDisabled) {
        score -= 10;
        warnings.push('Transpiler cache disabled - slower startup');
    }

    if (!env.project.name || env.project.name === 'Unknown') {
        score -= 10;
        warnings.push('No project name configured');
    }

    if (env.network.verboseFetch === 'Disabled' && env.project.debug) {
        score -= 5;
        warnings.push('Verbose fetch disabled in debug mode');
    }

    if (env.project.logLevel === 'debug' && env.project.environment === 'production') {
        score -= 10;
        warnings.push('Debug logging in production - performance impact');
    }

    if (!env.performance.doNotTrack && env.project.environment === 'production') {
        score -= 5;
        warnings.push('Telemetry enabled in production - privacy consideration');
    }

    return { score, issues, warnings };
}

// Environment recommendations
function getRecommendations() {
    const env = getEnvironmentStatus();
    const recommendations = [];

    // Production recommendations
    if (env.project.environment === 'production') {
        recommendations.push('🚀 Set DO_NOT_TRACK=1 for production privacy');
        if (env.project.debug) {
            recommendations.push('🔧 Disable DEBUG mode in production');
        }
        recommendations.push('🔒 Ensure NODE_TLS_REJECT_UNAUTHORIZED is not set to 0');
        recommendations.push('📊 Set LOG_LEVEL=error or warn for production');
        if (env.network.verboseFetch !== 'Disabled') {
            recommendations.push('🔇 Disable verbose fetch in production');
        }
    }

    // Development recommendations
    if (env.project.environment === 'development') {
        if (env.network.verboseFetch === 'Disabled') {
            recommendations.push('🌐 Enable BUN_CONFIG_VERBOSE_FETCH=curl for API debugging');
        }
        if (!env.project.debug) {
            recommendations.push('🐛 Enable DEBUG=true for development insights');
        }
        if (env.performance.transpilerCache === 'Default') {
            recommendations.push('💾 Consider custom transpiler cache: BUN_RUNTIME_TRANSPILER_CACHE_PATH=./cache');
        }
        if (env.project.logLevel === 'info') {
            recommendations.push('📝 Set LOG_LEVEL=debug for detailed development logs');
        }
    }

    // Performance recommendations
    if (env.network.maxRequests === 256) {
        recommendations.push('⚙️  Tune BUN_CONFIG_MAX_HTTP_REQUESTS based on your API limits');
    }

    if (env.performance.transpilerCacheDisabled && env.project.environment === 'development') {
        recommendations.push('⚡ Re-enable transpiler cache for faster development restarts');
    }

    // Security recommendations
    if (env.security.nodeTlsRejectUnauthorized === '0') {
        recommendations.push('🔒 Re-enable TLS verification for security');
    }

    if (env.security.corsOrigins === 'Not set' && env.project.environment === 'production') {
        recommendations.push('🌐 Configure CORS_ORIGINS for API security');
    }

    // Network recommendations
    if (env.network.httpProxy === 'Not set' && env.project.environment === 'production') {
        recommendations.push('🔗 Consider HTTP_PROXY for corporate networks');
    }

    // Bun optimization recommendations
    if (env.bun.options === 'None' && env.project.environment === 'development') {
        recommendations.push('⚡ Set BUN_OPTIONS="--hot" for hot reloading');
    }

    return recommendations;
}

// Generate topic summary statistics
function generateTopicSummary() {
    const env = getEnvironmentStatus();

    const topics = [
        {
            topic: ' Visual & Terminal',
            count: 2,
            health: env.colors.enabled ? 100 : 90,
            description: 'Terminal colors and display settings'
        },
        {
            topic: ' Network & HTTP',
            count: 6,
            health: env.network.sslVerification === 'Enabled' && env.network.maxRequests >= 50 ? 100 : 75,
            description: 'HTTP requests, debugging, and proxy configuration'
        },
        {
            topic: ' Performance & Caching',
            count: 4,
            health: env.performance.transpilerCacheDisabled ? 85 : 100,
            description: 'Transpiler cache, storage, and performance settings'
        },
        {
            topic: ' Application',
            count: 7,
            health: env.project.environment === 'production' && env.project.debug ? 70 : 95,
            description: 'Application identity, environment, and server configuration'
        },
        {
            topic: ' Bun Runtime',
            count: 3,
            health: 100,
            description: 'Bun version, platform, and runtime options'
        },
        {
            topic: ' Security',
            count: 3,
            health: env.security.nodeTlsRejectUnauthorized === '0' ? 50 : 100,
            description: 'TLS/SSL, CSP, and CORS security settings'
        }
    ];

    return topics;
}

// Generate environment optimization commands
function generateOptimizationCommands() {
    const env = getEnvironmentStatus();
    const commands = [];

    if (env.project.environment === 'development') {
        commands.push({
            category: ' Development Debugging',
            command: 'DEBUG=true LOG_LEVEL=debug BUN_CONFIG_VERBOSE_FETCH=curl bun run dev',
            description: 'Enable comprehensive debugging'
        });
    }

    if (env.project.environment === 'production') {
        commands.push({
            category: ' Production Optimization',
            command: 'NODE_ENV=production DO_NOT_TRACK=1 LOG_LEVEL=error bun run start',
            description: 'Optimized production configuration'
        });
    }

    if (env.performance.transpilerCacheDisabled) {
        commands.push({
            category: ' Performance Boost',
            command: 'BUN_RUNTIME_TRANSPILER_CACHE_PATH=./cache bun run dev',
            description: 'Enable persistent transpiler cache'
        });
    }

    commands.push({
        category: ' Custom Configuration',
        command: `PORT=${env.project.port} HOST=${env.project.host} bun run dev`,
        description: 'Custom server binding'
    });

    return commands;
}

// Display dashboard
console.log(chalk.yellow('📊 Environment Configuration Status'));
console.log(createEnvironmentTable());

// Topic summary
console.log(chalk.blue.bold('\n📋 Topic Summary'));
const topics = generateTopicSummary();
const topicTable = topics.map(topic => ({
    topic: topic.topic,
    settings: topic.count.toString(),
    health: topic.health >= 90 ? chalk.green(topic.health + '%') : topic.health >= 70 ? chalk.yellow(topic.health + '%') : chalk.red(topic.health + '%'),
    description: topic.description
}));
console.log(Bun.inspect.table(topicTable, { colors: true }));

// Health assessment
const health = calculateEnvironmentHealth();
console.log(chalk.blue.bold('\n🏥 Environment Health Assessment'));
console.log(chalk.gray(`   Overall Score: ${health.score >= 80 ? chalk.green(health.score) : health.score >= 60 ? chalk.yellow(health.score) : chalk.red(health.score)}/100`));

if (health.issues.length > 0) {
    console.log(chalk.red('\n❌ Critical Issues:'));
    health.issues.forEach(issue => {
        console.log(chalk.red(`   • ${issue}`));
    });
}

if (health.warnings.length > 0) {
    console.log(chalk.yellow('\n⚠️  Warnings:'));
    health.warnings.forEach(warning => {
        console.log(chalk.yellow(`   • ${warning}`));
    });
}

// Recommendations
const recommendations = getRecommendations();
if (recommendations.length > 0) {
    console.log(chalk.blue('\n💡 Recommendations:'));
    recommendations.forEach(rec => {
        console.log(chalk.cyan(`   ${rec}`));
    });
}

// Environment file status
console.log(chalk.blue.bold('\n📁 Environment Files Status'));
const envFiles = ['.env', '.env.local', '.env.development', '.env.production', '.env.test'];
envFiles.forEach(file => {
    const exists = require('fs').existsSync(file);
    console.log(chalk.gray(`   ${exists ? '✅' : '⚪'} ${file}`));
});

// Optimization commands
console.log(chalk.blue.bold('\n⚡ Environment Optimization Commands'));
const commands = generateOptimizationCommands();
commands.forEach(cmd => {
    console.log(chalk.gray(`\n   ${cmd.category}:`));
    console.log(chalk.cyan(`   ${cmd.command}`));
    console.log(chalk.gray(`   # ${cmd.description}`));
});

// Enhanced environment variable reference
console.log(chalk.blue.bold('\n📚 Enhanced Environment Variable Reference'));
const referenceTable = [
    { topic: '🌐 Network', variable: 'BUN_CONFIG_VERBOSE_FETCH', values: 'curl, true, false', description: 'Network request debugging', type: 'Debug' },
    { topic: '🌐 Network', variable: 'BUN_CONFIG_MAX_HTTP_REQUESTS', values: 'number (default: 256)', description: 'HTTP request concurrency limit', type: 'Performance' },
    { topic: '💾 Performance', variable: 'BUN_RUNTIME_TRANSPILER_CACHE_PATH', values: 'path or "0"', description: 'Transpiler cache location', type: 'Performance' },
    { topic: '📦 Application', variable: 'NODE_ENV', values: 'development, production, test', description: 'Application environment', type: 'Runtime' },
    { topic: '📦 Application', variable: 'DEBUG', values: 'true, false', description: 'Enable debug logging', type: 'Debug' },
    { topic: '📦 Application', variable: 'LOG_LEVEL', values: 'debug, info, warn, error', description: 'Logging verbosity', type: 'Logging' },
    { topic: '💾 Performance', variable: 'DO_NOT_TRACK', values: '1, 0', description: 'Disable telemetry', type: 'Privacy' },
    { topic: '🎨 Visual', variable: 'NO_COLOR', values: '1, 0', description: 'Disable colored output', type: 'Display' },
    { topic: '🎨 Visual', variable: 'FORCE_COLOR', values: '1, 0', description: 'Force colored output', type: 'Display' },
    { topic: '🔧 Bun Runtime', variable: 'BUN_OPTIONS', values: 'command-line flags', description: 'Default Bun options', type: 'Configuration' },
    { topic: '🌐 Network', variable: 'HTTP_PROXY', values: 'URL', description: 'HTTP proxy server', type: 'Network' },
    { topic: '🌐 Network', variable: 'HTTPS_PROXY', values: 'URL', description: 'HTTPS proxy server', type: 'Network' },
    { topic: '🌐 Network', variable: 'NO_PROXY', values: 'comma-separated domains', description: 'Proxy bypass list', type: 'Network' },
    { topic: '🔒 Security', variable: 'NODE_TLS_REJECT_UNAUTHORIZED', values: '0, 1', description: 'TLS certificate verification', type: 'Security' },
    { topic: '📦 Application', variable: 'PORT', values: 'port number', description: 'Server port', type: 'Configuration' },
    { topic: '📦 Application', variable: 'HOST', values: 'hostname', description: 'Server binding host', type: 'Configuration' }
];

console.log(Bun.inspect.table(referenceTable, { colors: true }));

console.log(chalk.green('\n✅ Enhanced environment dashboard with topics and properties updated successfully!'));
