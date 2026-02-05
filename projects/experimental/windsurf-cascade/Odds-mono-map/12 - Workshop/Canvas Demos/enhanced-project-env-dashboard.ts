#!/usr/bin/env bun

/**
 * Enhanced Project Environment Dashboard with Clean Console Output
 * 
 * Beautiful, organized dashboard for environment variable analysis with
 * clean formatting, structured output, and user-friendly display.
 * 
 * @author Odds Protocol Development Team
 * @version 4.0.0
 * @since 2025-11-18
 */

import { CleanConsole } from './clean-console-integration';

// =============================================================================
// ENHANCED ENVIRONMENT DASHBOARD
// =============================================================================

class EnhancedProjectEnvDashboard {
    private env: Record<string, string | undefined>;
    private secrets: Set<string> = new Set(['DB_PASSWORD', 'API_KEY', 'SECRET_KEY']);
    private startTime: number;
    private console: CleanConsole;

    constructor() {
        this.env = Bun.env;
        this.startTime = Bun.nanoseconds();
        this.console = CleanConsole.getInstance();
    }

    [Bun.inspect.custom]() {
        return this.renderFullDashboard();
    }

    async displayDashboard(): Promise<void> {
        this.console.section('🌍 Enhanced Project Environment Dashboard');

        const analysis = this.getEnvironmentAnalysis();
        this.console.info('Environment Analysis Complete', [
            `Environment: ${analysis}`,
            'Variables loaded and validated',
            'Security analysis performed'
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

        const config = {
            "Project Name": this.env.PROJECT_NAME || "Not set",
            "Version": this.env.PROJECT_VERSION || "1.0.0",
            "Debug Mode": this.env.DEBUG === "true" ? "🟢 Enabled" : "🔴 Disabled",
            "Environment": this.env.NODE_ENV || "development",
            "Root Directory": this.env.PROJECT_ROOT || process.cwd(),
            "Project ID": this.env.PROJECT_ID || "Not set"
        };

        this.console.table(config, 'Project Settings');
    }

    private displayDatabaseConfig(): void {
        this.console.subsection('🗄️ Database Configuration');

        const dbConfig = {
            "Host": this.env.DB_HOST || "localhost",
            "Port": this.env.DB_PORT || "5432",
            "User": this.env.DB_USER || "postgres",
            "Password": this.env.DB_PASSWORD ? "*** configured ***" : "❌ Not set",
            "Database": this.env.DB_NAME || "odds_protocol_dev",
            "Connection URL": this.env.DB_URL || this.constructDBURL(),
            "Pool Size": this.env.DB_POOL_SIZE || "10",
            "Connection Timeout": this.env.DB_TIMEOUT || "30000ms"
        };

        this.console.table(dbConfig, 'Database Settings');
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

        const apiConfig = {
            "Base URL": this.env.API_BASE_URL || "https://api.example.com",
            "Version": this.env.API_VERSION || "v1",
            "Endpoint": this.constructAPIEndpoint(),
            "Timeout": `${this.env.API_TIMEOUT || "5000"}ms`,
            "Retry Attempts": this.env.API_RETRY_ATTEMPTS || "3",
            "Auth Type": this.env.API_AUTH_TYPE || "Bearer Token",
            "Log Level": this.env.API_LOG_LEVEL || "info"
        };

        this.console.table(apiConfig, 'API Settings');
    }

    private displayFeatureFlags(): void {
        this.console.subsection('🚀 Feature Flags');

        const features = {
            "Cache Enabled": this.getFeatureFlag('ENABLE_CACHE'),
            "Logging Enabled": this.getFeatureFlag('ENABLE_LOGGING'),
            "Metrics Enabled": this.getFeatureFlag('ENABLE_METRICS'),
            "Debug Mode": this.getFeatureFlag('DEBUG'),
            "Experimental Features": this.getFeatureFlag('EXPERIMENTAL_FEATURES'),
            "Development Tools": this.getFeatureFlag('DEV_TOOLS')
        };

        this.console.table(features, 'Feature Status');
    }

    private displayBunConfig(): void {
        this.console.subsection('⚙️ Bun Configuration');

        const bunConfig = {
            "Max HTTP Requests": this.env.BUN_MAX_REQUESTS || "100",
            "Colors": this.env.BUN_COLORS !== "false" ? "🟢 Enabled" : "🔴 Disabled",
            "Transpiler Cache": this.env.BUN_CACHE_DIR || "Default location",
            "Hot Reload": this.env.BUN_HOT_RELOAD === "true" ? "🟢 Enabled" : "🔴 Disabled",
            "Build Mode": this.env.BUN_BUILD_MODE || "development",
            "Package Manager": "bun"
        };

        this.console.table(bunConfig, 'Bun Settings');
    }

    private displaySecurityAnalysis(): void {
        this.console.subsection('🛡️ Security Analysis');

        const security = {
            "SSL Enabled": this.env.ENABLE_SSL === "true" ? "🟢 Yes" : "🔴 No",
            "API Key Set": this.env.API_KEY ? "🟢 Configured" : "🔴 Missing",
            "Secret Key Set": this.env.SECRET_KEY ? "🟢 Configured" : "🔴 Missing",
            "CORS Origins": this.env.CORS_ORIGIN || "Not configured",
            "JWT Expiry": this.env.JWT_EXPIRY || "Not configured",
            "Security Headers": this.env.SECURITY_HEADERS === "true" ? "🟢 Enabled" : "🔴 Disabled"
        };

        this.console.table(security, 'Security Settings');
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
            '// Environment variable access patterns:',
            'const projectName = Bun.env.PROJECT_NAME; // string | undefined',
            'const debugMode = Bun.env.DEBUG === "true"; // boolean conversion',
            'const timeout = parseInt(Bun.env.API_TIMEOUT || "5000"); // number conversion',
            '',
            '// Type-safe environment variable access:',
            'interface EnvConfig {',
            '  PROJECT_NAME: string;',
            '  DEBUG: boolean;',
            '  API_TIMEOUT: number;',
            '  DB_URL: string;',
            '}',
            '',
            'const config: EnvConfig = {',
            '  PROJECT_NAME: Bun.env.PROJECT_NAME || "default-project",',
            '  DEBUG: Bun.env.DEBUG === "true",',
            '  API_TIMEOUT: parseInt(Bun.env.API_TIMEOUT || "5000"),',
            '  DB_URL: Bun.env.DB_URL || "postgres://localhost:5432/default"',
            '};',
            '',
            '// Runtime validation:',
            'function validateEnv(): void {',
            '  const required = ["DB_URL", "API_KEY"];',
            '  const missing = required.filter(key => !Bun.env[key]);',
            '  if (missing.length > 0) {',
            '    throw new Error(`Missing required env vars: ${missing.join(", ")}`);',
            '  }',
            '}'
        ];

        this.console.list(examples, 'Code Examples');
    }

    private displayUsagePatterns(): void {
        this.console.subsection('💡 Practical Usage in Application');

        const patterns = [
            '// Database connection with connection pooling',
            'const dbConfig = {',
            '  url: Bun.env.DB_URL,',
            '  host: Bun.env.DB_HOST || "localhost",',
            '  port: Number(Bun.env.DB_PORT) || 5432,',
            '  user: Bun.env.DB_USER,',
            '  password: Bun.env.DB_PASSWORD,',
            '  database: Bun.env.DB_NAME,',
            '  ssl: Bun.env.DB_SSL === "true",',
            '  pool: {',
            '    max: Number(Bun.env.DB_POOL_SIZE) || 10,',
            '    idleTimeout: Number(Bun.env.DB_IDLE_TIMEOUT) || 30000',
            '  }',
            '};',
            '',
            '// API client configuration with retry logic',
            'const apiConfig = {',
            '  baseURL: Bun.env.API_BASE_URL,',
            '  version: Bun.env.API_VERSION,',
            '  timeout: Number(Bun.env.API_TIMEOUT) || 5000,',
            '  retry: {',
            '    attempts: Number(Bun.env.API_RETRY_ATTEMPTS) || 3,',
            '    backoff: (retryCount: number) => Math.exp(retryCount) * 1000',
            '  },',
            '  headers: {',
            '    "Authorization": `Bearer ${Bun.env.API_KEY}`,',
            '    "User-Agent": `${Bun.env.PROJECT_NAME}/${Bun.env.PROJECT_VERSION}`',
            '  }',
            '};',
            '',
            '// Feature flags with type safety',
            'const features = {',
            '  cache: Bun.env.ENABLE_CACHE === "true",',
            '  logging: Bun.env.ENABLE_LOGGING === "true",',
            '  metrics: Bun.env.ENABLE_METRICS === "true",',
            '  experimental: Bun.env.EXPERIMENTAL_FEATURES === "true",',
            '  devTools: Bun.env.DEV_TOOLS === "true"',
            '};'
        ];

        this.console.list(patterns, 'Usage Patterns');
    }

    private displayValidationResults(): void {
        this.console.subsection('✅ Environment Validation Results');

        const validation = this.validateEnvironment();
        const status = validation.isValid ? "🟢 VALID" : "🔴 INVALID";

        this.console.info(`Validation Status: ${status}`, [
            `Required Variables: ${validation.requiredVars.length}`,
            `Missing Variables: ${validation.missingVars.length}`,
            `Warnings: ${validation.warnings.length}`
        ]);

        if (validation.missingVars.length > 0) {
            this.console.error('Missing Required Variables', validation.missingVars);
        }

        if (validation.warnings.length > 0) {
            this.console.warn('Configuration Warnings', validation.warnings);
        }

        if (validation.recommendations.length > 0) {
            this.console.info('Recommendations', validation.recommendations);
        }
    }

    private displayFooter(): void {
        const duration = (Bun.nanoseconds() - this.startTime) / 1e6;
        const totalVars = Object.keys(this.env).length;
        const sensitiveVars = Object.keys(this.env).filter(k =>
            this.secrets.has(k) && this.env[k]
        ).length;

        this.console.section('📊 Dashboard Summary');

        this.console.table({
            "Environment Variables": totalVars,
            "Sensitive Variables": sensitiveVars,
            "Validation Duration": `${duration.toFixed(2)}ms`,
            "Bun Version": Bun.version,
            "Platform": process.platform
        }, 'Metrics');

        const nextSteps = this.getNextSteps();
        if (nextSteps.length > 0) {
            this.console.info('Next Steps', nextSteps);
        } else {
            this.console.success('All basic configuration complete!');
        }

        this.console.success('Project environment analysis completed!');
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

    private renderFullDashboard(): string {
        // This method is kept for compatibility with Bun.inspect.custom
        return `
🌍 Enhanced Project Environment Dashboard
════════════════════════════════════════════════════════════════════════════════
🔍 Environment: ${this.getEnvironmentAnalysis()}
📊 Variables Loaded: ${Object.keys(this.env).length}
⏱️ Generated: ${new Date().toLocaleString()}

Use displayDashboard() method for clean, formatted output.
    `.trim();
    }
}

// =============================================================================
// ADVANCED ENVIRONMENT VARIABLE MANAGER
// =============================================================================

class EnvManager {
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
        this.console.section('🔍 Environment Validation');

        const required = ['DB_HOST', 'DB_NAME', 'DB_USER'];
        const missing = required.filter(key => !Bun.env[key]);

        if (missing.length > 0) {
            this.console.error('Environment validation failed', missing);
        } else {
            this.console.success('Environment validation passed');
        }
    }

    static displayUsage(): void {
        this.console.section('🛠️ EnvManager Utility Examples');

        const examples = [
            `Project Name: ${this.getOptional('PROJECT_NAME', 'default-project')}`,
            `Debug Mode: ${this.getBoolean('DEBUG', false)}`,
            `API Timeout: ${this.getNumber('API_TIMEOUT', 5000)}`,
            `Feature Flags: ${this.getArray('FEATURE_FLAGS').join(', ') || 'None'}`
        ];

        this.console.list(examples, 'Current Values');
    }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
    const dashboard = new EnhancedProjectEnvDashboard();

    // Display the clean, formatted dashboard
    await dashboard.displayDashboard();

    // Demonstrate the EnvManager utility
    EnvManager.validateAndReport();
    EnvManager.displayUsage();
}

// Run the enhanced dashboard
if (import.meta.main) {
    main().catch(console.error);
}

export { EnhancedProjectEnvDashboard, EnvManager };
