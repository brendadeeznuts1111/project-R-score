#!/usr/bin/env bun

/**
 * Ultra-Clean Environment Dashboard with Bun.inspect.table()
 * 
 * Beautiful, perfectly formatted dashboard using Bun's native table formatting
 * for professional, aligned output with optimal spacing and visual clarity.
 * 
 * @author Odds Protocol Development Team
 * @version 5.0.0
 * @since 2025-11-18
 */

import { CleanConsole } from './clean-console-integration';

// =============================================================================
// ULTRA-CLEAN ENVIRONMENT DASHBOARD
// =============================================================================

class UltraCleanEnvDashboard {
    private env: Record<string, string | undefined>;
    private secrets: Set<string> = new Set(['DB_PASSWORD', 'API_KEY', 'SECRET_KEY']);
    private startTime: number;
    private console: CleanConsole;

    constructor() {
        this.env = Bun.env;
        this.startTime = Bun.nanoseconds();
        this.console = CleanConsole.getInstance();
    }

    async displayDashboard(): Promise<void> {
        this.console.section('🌍 Ultra-Clean Environment Dashboard');

        const analysis = this.getEnvironmentAnalysis();
        this.console.info('Environment Analysis Complete', [
            `Environment: ${analysis}`,
            'Using Bun.inspect.table() for perfect formatting',
            'All variables analyzed and validated'
        ]);

        await this.displayAllSections();
        this.displayFooter();
    }

    private async displayAllSections(): Promise<void> {
        this.displayProjectConfig();
        this.displayDatabaseConfig();
        this.displayAPIConfig();
        this.displayFeatureFlags();
        this.displayBunConfig();
        this.displaySecurityAnalysis();
        this.displayTypeScriptExamples();
        this.displayUsagePatterns();
        this.displayValidationResults();
    }

    private displayProjectConfig(): void {
        this.console.subsection('📋 Project Configuration');

        const configData = [
            { key: "📦 Project Name", value: this.env.PROJECT_NAME || "Not set" },
            { key: "🏷️ Version", value: this.env.PROJECT_VERSION || "1.0.0" },
            { key: "🐛 Debug Mode", value: this.env.DEBUG === "true" ? "🟢 Enabled" : "🔴 Disabled" },
            { key: "🌍 Environment", value: this.env.NODE_ENV || "development" },
            { key: "📁 Root Directory", value: this.env.PROJECT_ROOT || process.cwd() },
            { key: "🆔 Project ID", value: this.env.PROJECT_ID || "Not set" }
        ];

        console.log(Bun.inspect.table(configData, {
            colors: true,
            compact: true,
            maxColumnWidth: 30,
            header: false
        }));
    }

    private displayDatabaseConfig(): void {
        this.console.subsection('🗄️ Database Configuration');

        const dbData = [
            { key: "🏠 Host", value: this.env.DB_HOST || "localhost" },
            { key: "🔌 Port", value: this.env.DB_PORT || "5432" },
            { key: "👤 User", value: this.env.DB_USER || "postgres" },
            { key: "🔐 Password", value: this.env.DB_PASSWORD ? "*** configured ***" : "❌ Not set" },
            { key: "📊 Database", value: this.env.DB_NAME || "odds_protocol_dev" },
            { key: "🔗 Connection URL", value: this.env.DB_URL || this.constructDBURL() },
            { key: "📈 Pool Size", value: this.env.DB_POOL_SIZE || "10" },
            { key: "⏱️ Timeout", value: `${this.env.DB_TIMEOUT || "30000"}ms` }
        ];

        console.log(Bun.inspect.table(dbData, {
            colors: true,
            compact: true,
            maxColumnWidth: 25,
            header: false
        }));

        this.displayDatabaseHealth();
    }

    private displayDatabaseHealth(): void {
        const hasFullConfig = this.env.DB_HOST && this.env.DB_NAME && this.env.DB_USER;

        if (!hasFullConfig) {
            this.console.warn('Database configuration incomplete', [
                'Some features may not work properly',
                'Check DB_HOST, DB_NAME, and DB_USER variables'
            ]);
        } else {
            this.console.success('Database configuration appears complete');
        }
    }

    private displayAPIConfig(): void {
        this.console.subsection('🌐 API Configuration');

        const apiData = [
            { key: "🏢 Base URL", value: this.env.API_BASE_URL || "https://api.example.com" },
            { key: "📈 Version", value: this.env.API_VERSION || "v1" },
            { key: "🎯 Endpoint", value: this.constructAPIEndpoint() },
            { key: "⏱️ Timeout", value: `${this.env.API_TIMEOUT || "5000"}ms` },
            { key: "🔄 Retry Attempts", value: this.env.API_RETRY_ATTEMPTS || "3" },
            { key: "🔑 Auth Type", value: this.env.API_AUTH_TYPE || "Bearer Token" },
            { key: "📝 Log Level", value: this.env.API_LOG_LEVEL || "info" }
        ];

        console.log(Bun.inspect.table(apiData, {
            colors: true,
            compact: true,
            maxColumnWidth: 20,
            header: false
        }));
    }

    private displayFeatureFlags(): void {
        this.console.subsection('🚀 Feature Flags');

        const featureData = [
            { key: "💾 Cache Enabled", value: this.getFeatureFlag('ENABLE_CACHE') },
            { key: "📝 Logging Enabled", value: this.getFeatureFlag('ENABLE_LOGGING') },
            { key: "📊 Metrics Enabled", value: this.getFeatureFlag('ENABLE_METRICS') },
            { key: "🔍 Debug Mode", value: this.getFeatureFlag('DEBUG') },
            { key: "🚀 Experimental", value: this.getFeatureFlag('EXPERIMENTAL_FEATURES') },
            { key: "🐛 Dev Tools", value: this.getFeatureFlag('DEV_TOOLS') }
        ];

        console.log(Bun.inspect.table(featureData, {
            colors: true,
            compact: true,
            maxColumnWidth: 20,
            header: false
        }));
    }

    private displayBunConfig(): void {
        this.console.subsection('⚙️ Bun Configuration');

        const bunData = [
            { key: "🌐 Max HTTP Requests", value: this.env.BUN_MAX_REQUESTS || "100" },
            { key: "🎨 Colors", value: this.env.BUN_COLORS !== "false" ? "🟢 Enabled" : "🔴 Disabled" },
            { key: "💾 Transpiler Cache", value: this.env.BUN_CACHE_DIR || "Default location" },
            { key: "⚡ Hot Reload", value: this.env.BUN_HOT_RELOAD === "true" ? "🟢 Enabled" : "🔴 Disabled" },
            { key: "🔧 Build Mode", value: this.env.BUN_BUILD_MODE || "development" },
            { key: "📦 Package Manager", value: "bun" }
        ];

        console.log(Bun.inspect.table(bunData, {
            colors: true,
            compact: true,
            maxColumnWidth: 20,
            header: false
        }));
    }

    private displaySecurityAnalysis(): void {
        this.console.subsection('🛡️ Security Analysis');

        const securityData = [
            { key: "🔒 SSL Enabled", value: this.env.ENABLE_SSL === "true" ? "🟢 Yes" : "🔴 No" },
            { key: "🔑 API Key Set", value: this.env.API_KEY ? "🟢 Configured" : "🔴 Missing" },
            { key: "🔐 Secret Key Set", value: this.env.SECRET_KEY ? "🟢 Configured" : "🔴 Missing" },
            { key: "🌐 CORS Origins", value: this.env.CORS_ORIGIN || "Not configured" },
            { key: "📝 JWT Expiry", value: this.env.JWT_EXPIRY || "Not configured" },
            { key: "🛡️ Security Headers", value: this.env.SECURITY_HEADERS === "true" ? "🟢 Enabled" : "🔴 Disabled" }
        ];

        console.log(Bun.inspect.table(securityData, {
            colors: true,
            compact: true,
            maxColumnWidth: 20,
            header: false
        }));

        this.displaySecurityRecommendations();
    }

    private displaySecurityRecommendations(): void {
        const recommendations = this.getSecurityRecommendations();

        if (recommendations.length > 0) {
            this.console.warn('Security Recommendations', recommendations);
        } else {
            this.console.success('Security configuration appears adequate');
        }
    }

    private displayTypeScriptExamples(): void {
        this.console.subsection('🔧 TypeScript Type Examples');

        const examples = [
            { code: 'const projectName = Bun.env.PROJECT_NAME;', description: 'string | undefined' },
            { code: 'const debugMode = Bun.env.DEBUG === "true";', description: 'boolean conversion' },
            { code: 'const timeout = parseInt(Bun.env.API_TIMEOUT || "5000");', description: 'number conversion' },
            { code: 'const dbUrl = Bun.env.DB_URL || "default";', description: 'with fallback' },
            { code: 'const required = Bun.env.REQUIRED_VAR!;', description: 'non-null assertion' }
        ];

        console.log(Bun.inspect.table(examples, {
            colors: true,
            compact: true,
            maxColumnWidth: 50,
            header: false
        }));

        // Interface example
        console.log('\n📝 Type-Safe Interface:');
        const interfaceExample = `
interface EnvConfig {
  PROJECT_NAME: string;
  DEBUG: boolean;
  API_TIMEOUT: number;
  DB_URL: string;
}

const config: EnvConfig = {
  PROJECT_NAME: Bun.env.PROJECT_NAME || "default-project",
  DEBUG: Bun.env.DEBUG === "true",
  API_TIMEOUT: parseInt(Bun.env.API_TIMEOUT || "5000"),
  DB_URL: Bun.env.DB_URL || "postgres://localhost:5432/default"
};`;
        console.log(interfaceExample);
    }

    private displayUsagePatterns(): void {
        this.console.subsection('💡 Practical Usage Patterns');

        const patterns = [
            { pattern: 'Database Config', example: 'const dbConfig = { host: Bun.env.DB_HOST || "localhost" }' },
            { pattern: 'API Client', example: 'const api = { baseURL: Bun.env.API_BASE_URL, timeout: Number(Bun.env.API_TIMEOUT) }' },
            { pattern: 'Feature Flags', example: 'const features = { cache: Bun.env.ENABLE_CACHE === "true" }' },
            { pattern: 'Environment Check', example: 'const isProd = Bun.env.NODE_ENV === "production"' },
            { pattern: 'Required Vars', example: 'const required = ["DB_URL", "API_KEY"].filter(key => !Bun.env[key])' }
        ];

        console.log(Bun.inspect.table(patterns, {
            colors: true,
            compact: true,
            maxColumnWidth: 25,
            header: false
        }));
    }

    private displayValidationResults(): void {
        this.console.subsection('✅ Environment Validation Results');

        const validation = this.validateEnvironment();
        const status = validation.isValid ? "🟢 VALID" : "🔴 INVALID";

        const validationData = [
            { key: "📊 Status", value: status },
            { key: "📋 Required Variables", value: validation.requiredVars.length.toString() },
            { key: "❌ Missing Variables", value: validation.missingVars.length.toString() },
            { key: "⚠️ Warnings", value: validation.warnings.length.toString() },
            { key: "💡 Recommendations", value: validation.recommendations.length.toString() }
        ];

        console.log(Bun.inspect.table(validationData, {
            colors: true,
            compact: true,
            maxColumnWidth: 20,
            header: false
        }));

        if (validation.missingVars.length > 0) {
            console.log('\n❌ Missing Required Variables:');
            const missingData = validation.missingVars.map((varName, index) => ({
                '#': (index + 1).toString(),
                'Variable': varName,
                'Type': 'Required'
            }));

            console.log(Bun.inspect.table(missingData, {
                colors: true,
                compact: true,
                maxColumnWidth: 15,
                header: false
            }));
        }

        if (validation.warnings.length > 0) {
            console.log('\n⚠️ Configuration Warnings:');
            const warningData = validation.warnings.map((warning, index) => ({
                '#': (index + 1).toString(),
                'Warning': warning
            }));

            console.log(Bun.inspect.table(warningData, {
                colors: true,
                compact: true,
                maxColumnWidth: 50,
                header: false
            }));
        }

        if (validation.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            const recommendationData = validation.recommendations.map((rec, index) => ({
                '#': (index + 1).toString(),
                'Recommendation': rec
            }));

            console.log(Bun.inspect.table(recommendationData, {
                colors: true,
                compact: true,
                maxColumnWidth: 50,
                header: false
            }));
        }
    }

    private displayFooter(): void {
        const duration = (Bun.nanoseconds() - this.startTime) / 1e6;
        const totalVars = Object.keys(this.env).length;
        const sensitiveVars = Object.keys(this.env).filter(k =>
            this.secrets.has(k) && this.env[k]
        ).length;

        this.console.section('📊 Dashboard Summary');

        const metricsData = [
            { key: "📊 Environment Variables", value: totalVars.toString() },
            { key: "🔐 Sensitive Variables", value: sensitiveVars.toString() },
            { key: "⏱️ Validation Duration", value: `${duration.toFixed(2)}ms` },
            { key: "🦊 Bun Version", value: Bun.version },
            { key: "💻 Platform", value: process.platform }
        ];

        console.log(Bun.inspect.table(metricsData, {
            colors: true,
            compact: true,
            maxColumnWidth: 20,
            header: false
        }));

        const nextSteps = this.getNextSteps();
        if (nextSteps.length > 0) {
            console.log('\n🎯 Next Steps:');
            const stepsData = nextSteps.map((step, index) => ({
                '#': (index + 1).toString(),
                'Action': step
            }));

            console.log(Bun.inspect.table(stepsData, {
                colors: true,
                compact: true,
                maxColumnWidth: 50,
                header: false
            }));
        } else {
            this.console.success('All basic configuration complete!');
        }

        this.console.success('Ultra-clean environment analysis completed!');
    }

    // Helper Methods
    private getFeatureFlag(flag: string): string {
        return this.env[flag] === "true" ? "🟢 Enabled" : "🔴 Disabled";
    }

    private constructDBURL(): string {
        const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = this.env;
        if (DB_USER && DB_PASSWORD && DB_HOST && DB_NAME) {
            return `postgres://${DB_USER}:***@${DB_HOST}:${DB_PORT || 5432}/${DB_NAME}`;
        }
        return "Not configured";
    }

    private constructAPIEndpoint(): string {
        const base = this.env.API_BASE_URL;
        const version = this.env.API_VERSION;
        return base && version ? `${base}/${version}` : "Not configured";
    }

    private getEnvironmentAnalysis(): string {
        const env = this.env.NODE_ENV || 'development';
        const isProd = env === 'production';
        const isDev = env === 'development';

        if (isProd) return "Production (strict validation enabled)";
        if (isDev) return "Development (debug features available)";
        return `${env} environment`;
    }

    private getSecurityRecommendations(): string[] {
        const recommendations: string[] = [];

        if (!this.env.API_KEY) {
            recommendations.push("Consider adding API_KEY for external services");
        }

        if (this.env.NODE_ENV === 'production' && !this.env.SECRET_KEY) {
            recommendations.push("SECRET_KEY is recommended for production");
        }

        if (this.env.CORS_ORIGIN === '*') {
            recommendations.push("Consider restricting CORS_ORIGIN in production");
        }

        return recommendations;
    }

    private validateEnvironment() {
        const required = ['DB_HOST', 'DB_NAME', 'DB_USER'];
        const missing = required.filter(key => !this.env[key]);
        const warnings: string[] = [];
        const recommendations: string[] = [];

        // Check for common configuration issues
        if (this.env.NODE_ENV === 'production') {
            if (!this.env.API_KEY) {
                warnings.push("API_KEY not set in production environment");
            }
            if (this.env.DEBUG === 'true') {
                warnings.push("Debug mode enabled in production");
            }
        }

        if (this.env.DB_PASSWORD && this.env.DB_PASSWORD.length < 8) {
            warnings.push("Database password may be too weak");
        }

        if (!this.env.API_BASE_URL) {
            recommendations.push("Set API_BASE_URL for external API calls");
        }

        return {
            isValid: missing.length === 0,
            requiredVars: required,
            missingVars: missing,
            warnings,
            recommendations
        };
    }

    private getNextSteps(): string[] {
        const steps: string[] = [];

        if (Object.keys(this.env).length === 0) {
            steps.push("Create a .env file in your project root");
        }

        if (!this.env.PROJECT_NAME) {
            steps.push("Set PROJECT_NAME for better identification");
        }

        if (this.env.NODE_ENV === 'development' && !this.env.DEBUG) {
            steps.push("Set DEBUG=true for development logging");
        }

        return steps;
    }
}

// =============================================================================
// ADVANCED ENVIRONMENT MANAGER WITH BUN TABLES
// =============================================================================

class UltraCleanEnvManager {
    private static console = CleanConsole.getInstance();

    static getRequired(key: string): string {
        const value = Bun.env[key];
        if (!value) {
            throw new Error(`Required environment variable ${key} is not set`);
        }
        return value;
    }

    static getOptional(key: string, defaultValue: string = ''): string {
        return Bun.env[key] || defaultValue;
    }

    static getBoolean(key: string, defaultValue: boolean = false): boolean {
        const value = Bun.env[key];
        if (!value) return defaultValue;
        return value.toLowerCase() === 'true';
    }

    static getNumber(key: string, defaultValue: number = 0): number {
        const value = Bun.env[key];
        if (!value) return defaultValue;
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
    }

    static getArray(key: string, separator: string = ','): string[] {
        const value = Bun.env[key];
        if (!value) return [];
        return value.split(separator).map(item => item.trim());
    }

    static validateAndReport(): void {
        this.console.section('🔍 Ultra-Clean Environment Validation');

        const required = ['DB_HOST', 'DB_NAME', 'DB_USER'];
        const missing = required.filter(key => !Bun.env[key]);

        if (missing.length > 0) {
            const missingData = missing.map((varName, index) => ({
                '#': (index + 1).toString(),
                'Missing Variable': varName,
                'Required': 'Yes'
            }));

            console.log('❌ Environment validation failed:');
            console.log(Bun.inspect.table(missingData, {
                colors: true,
                compact: true,
                maxColumnWidth: 20,
                header: false
            }));
        } else {
            this.console.success('Environment validation passed');
        }
    }

    static displayUsage(): void {
        this.console.section('🛠️ Ultra-Clean EnvManager Examples');

        const usageData = [
            { key: "📦 Project Name", value: this.getOptional('PROJECT_NAME', 'default-project') },
            { key: "🐛 Debug Mode", value: this.getBoolean('DEBUG', false).toString() },
            { key: "⏱️ API Timeout", value: this.getNumber('API_TIMEOUT', 5000).toString() },
            { key: "🚀 Feature Flags", value: this.getArray('FEATURE_FLAGS').join(', ') || 'None' }
        ];

        console.log(Bun.inspect.table(usageData, {
            colors: true,
            compact: true,
            maxColumnWidth: 20,
            header: false
        }));
    }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
    const dashboard = new UltraCleanEnvDashboard();

    // Display the ultra-clean, formatted dashboard
    await dashboard.displayDashboard();

    // Demonstrate the ultra-clean EnvManager utility
    UltraCleanEnvManager.validateAndReport();
    UltraCleanEnvManager.displayUsage();
}

// Run the ultra-clean dashboard
if (import.meta.main) {
    main().catch(console.error);
}

export { UltraCleanEnvDashboard, UltraCleanEnvManager };
