/**
 * FactoryWager System Integration
 * Headers, Cookies, Prefetching, and Variant Testing
 */

// Import all modules
import CookieManager from './lib/cookie-manager.js';
import PrefetchManager from './lib/prefetch-manager.js';
import VariantTesting from './lib/variant-testing.js';

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
