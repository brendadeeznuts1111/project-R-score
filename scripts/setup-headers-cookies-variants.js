#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class HeadersCookiesVariantsSetup {
    constructor() {
        this.projectRoot = process.cwd();
        this.configDir = path.join(this.projectRoot, 'config');
        this.libDir = path.join(this.projectRoot, 'lib');
    }

    async setup() {
        console.log('🚀 Setting up Headers, Cookies, and Variants System...\n');

        try {
            await this.createDirectories();
            await this.setupHeaders();
            await this.setupCookies();
            await this.setupVariants();
            await this.createIntegrationScript();
            await this.createExamples();
            await this.updatePackageJson();
            
            console.log('✅ Headers, Cookies, and Variants setup complete!');
            console.log('\n📋 Next Steps:');
            console.log('1. Import the integration script in your main application');
            console.log('2. Initialize the system: initializeFactoryWagerSystem()');
            console.log('3. Use the APIs for headers, cookies, and variants');
            console.log('4. Check examples in the examples/ directory');
            
        } catch (error) {
            console.error('❌ Setup failed:', error.message);
            process.exit(1);
        }
    }

    async createDirectories() {
        console.log('📁 Creating directories...');
        
        const dirs = [
            this.configDir,
            this.libDir,
            path.join(this.projectRoot, 'examples'),
            path.join(this.projectRoot, 'middleware'),
            path.join(this.projectRoot, 'components')
        ];

        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`   ✓ Created ${dir}`);
            }
        });

        console.log('');
    }

    async setupHeaders() {
        console.log('🔧 Setting up headers configuration...');

        const headersConfig = {
            security: {
                headers: {
                    "X-Frame-Options": "DENY",
                    "X-Content-Type-Options": "nosniff",
                    "X-XSS-Protection": "1; mode=block",
                    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
                    "Referrer-Policy": "strict-origin-when-cross-origin",
                    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
                    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://registry.factory-wager.com https://npm.factory-wager.com https://cache.factory-wager.com https://metrics.factory-wager.com"
                }
            },
            performance: {
                headers: {
                    "Cache-Control": "public, max-age=31536000, immutable",
                    "ETag": "W/\"v1.0.0\"",
                    "Last-Modified": "Sat, 08 Feb 2026 02:07:00 GMT",
                    "Vary": "Accept-Encoding, Cookie, User-Agent",
                    "X-DNS-Prefetch-Control": "on"
                }
            },
            registry: {
                headers: {
                    "X-Registry-Version": "1.0.0",
                    "X-Registry-Provider": "FactoryWager",
                    "Access-Control-Allow-Origin": "https://factory-wager.com https://wiki.factory-wager.com https://dashboard.factory-wager.com",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
                    "Access-Control-Max-Age": "86400"
                }
            },
            analytics: {
                headers: {
                    "X-Analytics-Enabled": "true",
                    "X-Metrics-Endpoint": "https://metrics.factory-wager.com/events",
                    "X-Session-ID": "${SESSION_ID}",
                    "X-Request-ID": "${REQUEST_ID}"
                }
            },
            variants: {
                headers: {
                    "X-Variant": "${VARIANT_ID}",
                    "X-Experiment": "${EXPERIMENT_ID}",
                    "X-Variant-Weight": "${VARIANT_WEIGHT}",
                    "X-Test-Group": "${TEST_GROUP}"
                }
            }
        };

        fs.writeFileSync(
            path.join(this.configDir, 'headers-config.json'),
            JSON.stringify(headersConfig, null, 2)
        );

        console.log('   ✓ Created headers configuration');
        console.log('');
    }

    async setupCookies() {
        console.log('🍪 Setting up cookie management...');

        const cookieConfig = {
            session: {
                name: 'fw_session',
                duration: 3600,
                domain: '.factory-wager.com',
                secure: true,
                httpOnly: true,
                sameSite: 'strict'
            },
            analytics: {
                name: 'fw_analytics',
                duration: 2592000,
                domain: '.factory-wager.com',
                secure: true,
                sameSite: 'lax'
            },
            variants: {
                name: 'fw_variant',
                duration: 86400,
                domain: '.factory-wager.com',
                secure: true,
                sameSite: 'lax'
            },
            preferences: {
                name: 'fw_preferences',
                duration: 31536000,
                domain: '.factory-wager.com',
                secure: true,
                sameSite: 'lax'
            }
        };

        fs.writeFileSync(
            path.join(this.configDir, 'cookie-config.json'),
            JSON.stringify(cookieConfig, null, 2)
        );

        console.log('   ✓ Created cookie configuration');
        console.log('');
    }

    async setupVariants() {
        console.log('🧪 Setting up variant testing...');

        const variantConfig = {
            experiments: [
                {
                    id: 'ui_variant_2024',
                    name: 'UI Design Variants 2024',
                    trafficAllocation: 1.0,
                    variants: [
                        { id: 'control', weight: 0.5, features: ['standard-ui'] },
                        { id: 'enhanced', weight: 0.3, features: ['enhanced-ui', 'animations'] },
                        { id: 'minimal', weight: 0.2, features: ['minimal-ui'] }
                    ]
                },
                {
                    id: 'performance_test',
                    name: 'Performance Optimization Test',
                    trafficAllocation: 0.5,
                    variants: [
                        { id: 'standard', weight: 0.5, features: ['standard-performance'] },
                        { id: 'optimized', weight: 0.5, features: ['optimized-performance', 'prefetch'] }
                    ]
                }
            ],
            featureFlags: [
                { id: 'enhanced_ui', name: 'Enhanced UI', enabled: false },
                { id: 'smart_prefetch', name: 'Smart Prefetching', enabled: true },
                { id: 'advanced_analytics', name: 'Advanced Analytics', enabled: true },
                { id: 'beta_features', name: 'Beta Features', enabled: false }
            ]
        };

        fs.writeFileSync(
            path.join(this.configDir, 'variant-config.json'),
            JSON.stringify(variantConfig, null, 2)
        );

        console.log('   ✓ Created variant configuration');
        console.log('');
    }

    async createIntegrationScript() {
        console.log('🔗 Creating integration script...');

        const integrationScript = `/**
 * FactoryWager System Integration
 * Headers, Cookies, Prefetching, and Variant Testing
 */

// Import all modules
// TODO: cookie-manager.js not found at ./lib/ — exists at scripts/lib/cookie-manager.ts or lib/cookie-manager.ts
// import CookieManager from './lib/cookie-manager.js';
// TODO: prefetch-manager.js not found at ./lib/ — exists at lib/prefetch-manager.ts
// import PrefetchManager from './lib/prefetch-manager.js';
// TODO: variant-testing.js not found at ./lib/ — exists at lib/variant-testing.ts
// import VariantTesting from './lib/variant-testing.js';

class FactoryWagerSystem {
    constructor() {
        this.cookieManager = CookieManager.getInstance();
        this.prefetchManager = PrefetchManager.getInstance();
        this.variantTesting = VariantTesting.getInstance();
        this.isInitialized = false;
    }

    async initialize(options = {}) {
        if (this.isInitialized) return;

        console.log('🚀 Initializing FactoryWager System...');

        try {
            // Initialize cookie management
            await this.initializeCookies();

            // Initialize variant testing
            await this.variantTesting.initialize();

            // Setup prefetching
            await this.initializePrefetching();

            // Setup headers
            this.setupHeaders();

            // Track initialization
            this.trackEvent('system_initialized', {
                timestamp: new Date().toISOString(),
                variant: this.variantTesting.getCurrentVariant()?.id,
                features: this.variantTesting.getVariantFeatures()
            });

            this.isInitialized = true;
            console.log('✅ FactoryWager System initialized successfully!');

        } catch (error) {
            console.error('❌ Failed to initialize FactoryWager System:', error);
            throw error;
        }
    }

    async initializeCookies() {
        console.log('🍪 Initializing cookie management...');
        
        // Set essential cookies
        this.cookieManager.setCookie({
            name: 'fw_session',
            value: this.generateSessionId(),
            domain: '.factory-wager.com',
            path: '/',
            maxAge: 3600,
            secure: true,
            httpOnly: true,
            sameSite: 'strict'
        });

        // Check analytics consent
        const consent = this.cookieManager.getCookie('fw_analytics_consent');
        if (consent === 'granted') {
            this.cookieManager.grantAnalyticsConsent();
        }
    }

    async initializePrefetching() {
        console.log('⚡ Initializing prefetching...');
        
        // Adaptive prefetching based on variant
        this.prefetchManager.adaptivePrefetch();

        // Execute variant-specific prefetching
        const variant = this.variantTesting.getCurrentVariant();
        if (variant?.features.includes('smart-prefetch')) {
            this.prefetchManager.executeStrategy('navigation_prefetch');
        }
    }

    setupHeaders() {
        console.log('🔧 Setting up headers...');
        
        const variant = this.variantTesting.getCurrentVariant();
        const sessionId = this.cookieManager.getCookie('fw_session');

        // Add variant-specific headers
        if (variant) {
            this.addHeader('X-Variant', variant.id);
            this.addHeader('X-Experiment', 'ui_variant_2024');
            this.addHeader('X-Test-Group', variant.features.join(','));
        }

        // Add session headers
        if (sessionId) {
            this.addHeader('X-Session-ID', sessionId);
        }

        // Add security headers
        this.addHeader('X-Content-Type-Options', 'nosniff');
        this.addHeader('X-Frame-Options', 'DENY');
        this.addHeader('X-XSS-Protection', '1; mode=block');
    }

    // Public API methods
    isFeatureEnabled(featureId) {
        return this.variantTesting.isFeatureEnabled(featureId);
    }

    getCurrentVariant(testId) {
        return this.variantTesting.getCurrentVariant(testId);
    }

    trackEvent(eventType, data) {
        this.variantTesting.trackEvent(eventType, data);
    }

    prefetchResource(url, type = 'prefetch') {
        this.prefetchManager.addResource({ type, url });
    }

    observeElement(element, url, type = 'prefetch') {
        this.prefetchManager.observeElement(element, url, type);
    }

    withTracking(element, testId) {
        this.variantTesting.withVariantTracking(element, testId);
    }

    // Utility methods
    generateSessionId() {
        return 'sess_' + Math.random().toString(36).substr(2, 16) + Date.now().toString(36);
    }

    addHeader(name, value) {
        if (typeof document !== 'undefined') {
            const meta = document.createElement('meta');
            meta.setAttribute('http-equiv', name);
            meta.setAttribute('content', value);
            document.head.appendChild(meta);
        }
    }

    // Analytics methods
    trackConversion(testId, value) {
        this.variantTesting.trackConversion(testId, value);
    }

    trackImpression(element, testId) {
        this.variantTesting.trackImpression(element, testId);
    }

    trackClick(element, testId) {
        this.variantTesting.trackClick(element, testId);
    }

    // Feature flag methods
    enableFeature(featureId) {
        this.variantTesting.enableFeature(featureId);
    }

    disableFeature(featureId) {
        this.variantTesting.disableFeature(featureId);
    }

    getVariantContent(contentKey, testId) {
        return this.variantTesting.getVariantContent(contentKey, testId);
    }
}

// Global instance
let factoryWagerSystem = null;

// Initialize function
export async function initializeFactoryWagerSystem(options = {}) {
    if (!factoryWagerSystem) {
        factoryWagerSystem = new FactoryWagerSystem();
    }
    await factoryWagerSystem.initialize(options);
    return factoryWagerSystem;
}

// Get instance function
export function getFactoryWagerSystem() {
    return factoryWagerSystem;
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
    window.initializeFactoryWagerSystem = initializeFactoryWagerSystem;
    window.getFactoryWagerSystem = getFactoryWagerSystem;
}

export default FactoryWagerSystem;
`;

        fs.writeFileSync(
            path.join(this.projectRoot, 'factory-wager-system.js'),
            integrationScript
        );

        console.log('   ✓ Created integration script');
        console.log('');
    }

    async createExamples() {
        console.log('📚 Creating examples...');

        // Basic usage example
        const basicExample = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FactoryWager System Example</title>
</head>
<body>
    <div id="app">
        <h1>FactoryWager System Demo</h1>
        <div id="variant-info"></div>
        <div id="feature-flags"></div>
        <button id="track-button">Track Event</button>
    </div>

    <script type="module">
        // TODO: factory-wager-system.js only found in archive/ — fix import path
        // import { initializeFactoryWagerSystem } from '../factory-wager-system.js';

        async function init() {
            // Initialize the system
            const system = await initializeFactoryWagerSystem();

            // Display current variant
            const variant = system.getCurrentVariant();
            document.getElementById('variant-info').innerHTML = 
                \`<h2>Current Variant: \${variant?.name || 'Control'}</h2>\`;

            // Display feature flags
            const features = ['enhanced_ui', 'smart_prefetch', 'advanced_analytics'];
            const featureHtml = features.map(feature => 
                \`<div>\${feature}: \${system.isFeatureEnabled(feature) ? '✅' : '❌'}</div>\`
            ).join('');
            document.getElementById('feature-flags').innerHTML = 
                \`<h2>Feature Flags:</h2>\${featureHtml}\`;

            // Add tracking to button
            const button = document.getElementById('track-button');
            system.withTracking(button, 'ui_variant_2024');
            
            button.addEventListener('click', () => {
                system.trackEvent('button_click', {
                    button_id: 'track_button',
                    variant: variant?.id
                });
            });

            // Prefetch some resources
            system.prefetchResource('https://dashboard.factory-wager.com', 'prefetch');
        }

        init();
    </script>
</body>
</html>`;

        fs.writeFileSync(
            path.join(this.projectRoot, 'examples', 'basic-usage.html'),
            basicExample
        );

        // Advanced example
        const advancedExample = `// TODO: factory-wager-system.js only found in archive/ — fix import path
// import { initializeFactoryWagerSystem } from '../factory-wager-system.js';

class AdvancedExample {
    constructor() {
        this.system = null;
    }

    async init() {
        this.system = await initializeFactoryWagerSystem({
            analytics: true,
            prefetching: true,
            variantTesting: true
        });

        this.setupAdvancedFeatures();
        this.setupPerformanceMonitoring();
        this.setupVariantSpecificContent();
    }

    setupAdvancedFeatures() {
        // Enable features based on conditions
        if (this.system.isFeatureEnabled('enhanced_ui')) {
            this.loadEnhancedUI();
        }

        if (this.system.isFeatureEnabled('smart_prefetch')) {
            this.setupSmartPrefetching();
        }
    }

    setupPerformanceMonitoring() {
        // Track performance metrics
        if ('performance' in window) {
            window.addEventListener('load', () => {
                const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
                this.system.trackEvent('page_load_time', { 
                    value: loadTime,
                    variant: this.system.getCurrentVariant()?.id 
                });
            });
        }
    }

    setupVariantSpecificContent() {
        const variant = this.system.getCurrentVariant();
        const content = this.system.getVariantContent('theme', 'ui_variant_2024');
        
        if (content) {
            this.applyTheme(content);
        }
    }

    loadEnhancedUI() {
        // Load enhanced UI components
        console.log('Loading enhanced UI...');
    }

    setupSmartPrefetching() {
        // Observe links for prefetching
        const links = document.querySelectorAll('a[href]');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('https://')) {
                this.system.observeElement(link, href, 'prefetch');
            }
        });
    }

    applyTheme(theme) {
        // Apply variant-specific theme
        document.documentElement.style.setProperty('--primary-color', theme.colors[0]);
        document.documentElement.style.setProperty('--secondary-color', theme.colors[1]);
    }
}

// Initialize advanced example
const example = new AdvancedExample();
example.init();
`;

        fs.writeFileSync(
            path.join(this.projectRoot, 'examples', 'advanced-usage.js'),
            advancedExample
        );

        console.log('   ✓ Created examples');
        console.log('');
    }

    async updatePackageJson() {
        console.log('📦 Updating package.json...');

        const packageJsonPath = path.join(this.projectRoot, 'package.json');
        
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            // Add scripts
            if (!packageJson.scripts) {
                packageJson.scripts = {};
            }
            
            packageJson.scripts['setup:system'] = 'node scripts/setup-headers-cookies-variants.js';
            packageJson.scripts['test:variants'] = 'node scripts/test-variants.js';
            packageJson.scripts['test:cookies'] = 'node scripts/test-cookies.js';
            packageJson.scripts['test:headers'] = 'node scripts/test-headers.js';

            // Add dependencies if not present
            if (!packageJson.dependencies) {
                packageJson.dependencies = {};
            }

            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
            console.log('   ✓ Updated package.json');
        }

        console.log('');
    }
}

// CLI usage
if (require.main === module) {
    const setup = new HeadersCookiesVariantsSetup();
    setup.setup();
}

module.exports = HeadersCookiesVariantsSetup;
