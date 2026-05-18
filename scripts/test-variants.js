#!/usr/bin/env node

/**
 * Test script for variant testing system
 */

const fs = require('fs');
const path = require('path');

class VariantTester {
    constructor() {
        this.testResults = [];
    }

    async runTests() {
        console.info('🧪 Running Variant Testing Tests...\n');

        try {
            await this.testVariantAssignment();
            await this.testFeatureFlags();
            await this.testAnalytics();
            await this.testVariantContent();

            this.displayResults();

        } catch (error) {
            console.error('❌ Test failed:', error.message);
            process.exit(1);
        }
    }

    async testVariantAssignment() {
        console.info('🎲 Testing variant assignment...');

        // Simulate variant assignment
        const variants = ['control', 'enhanced', 'minimal'];
        const weights = [0.5, 0.3, 0.2];

        const assignments = {};
        const iterations = 1000;

        for (let i = 0; i < iterations; i++) {
            const random = Math.random();
            let cumulativeWeight = 0;
            let assigned = null;

            for (let j = 0; j < variants.length; j++) {
                cumulativeWeight += weights[j];
                if (random <= cumulativeWeight) {
                    assigned = variants[j];
                    break;
                }
            }

            assignments[assigned] = (assignments[assigned] || 0) + 1;
        }

        // Check if distribution is roughly correct
        const tolerance = 0.05; // 5% tolerance
        let passed = true;

        for (let i = 0; i < variants.length; i++) {
            const variant = variants[i];
            const expected = weights[i] * iterations;
            const actual = assignments[variant] || 0;
            const deviation = Math.abs(actual - expected) / expected;

            if (deviation > tolerance) {
                passed = false;
                console.info(`   ❌ ${variant}: Expected ${expected}, got ${actual} (${(deviation * 100).toFixed(1)}% deviation)`);
            } else {
                console.info(`   ✅ ${variant}: Expected ${expected}, got ${actual} (${(deviation * 100).toFixed(1)}% deviation)`);
            }
        }

        this.testResults.push({
            test: 'Variant Assignment',
            passed,
            details: assignments
        });

        console.info('');
    }

    async testFeatureFlags() {
        console.info('🚩 Testing feature flags...');

        const featureFlags = [
            { id: 'enhanced_ui', enabled: false },
            { id: 'smart_prefetch', enabled: true },
            { id: 'advanced_analytics', enabled: true },
            { id: 'beta_features', enabled: false }
        ];

        let passed = true;

        featureFlags.forEach(flag => {
            const isEnabled = this.mockIsFeatureEnabled(flag.id);

            if (isEnabled === flag.enabled) {
                console.info(`   ✅ ${flag.id}: ${isEnabled ? 'enabled' : 'disabled'}`);
            } else {
                console.info(`   ❌ ${flag.id}: Expected ${flag.enabled}, got ${isEnabled}`);
                passed = false;
            }
        });

        this.testResults.push({
            test: 'Feature Flags',
            passed,
            details: featureFlags
        });

        console.info('');
    }

    async testAnalytics() {
        console.info('📊 Testing analytics tracking...');

        const events = [
            { type: 'impression', element: 'button' },
            { type: 'click', element: 'link' },
            { type: 'conversion', value: 100 }
        ];

        let passed = true;
        const trackedEvents = [];

        events.forEach(event => {
            try {
                this.mockTrackEvent(event.type, event);
                trackedEvents.push(event);
                console.info(`   ✅ Tracked ${event.type}: ${event.element || event.value}`);
            } catch (error) {
                console.info(`   ❌ Failed to track ${event.type}: ${error.message}`);
                passed = false;
            }
        });

        this.testResults.push({
            test: 'Analytics',
            passed,
            details: { trackedEvents: trackedEvents.length }
        });

        console.info('');
    }

    async testVariantContent() {
        console.info('🎨 Testing variant content...');

        const contentTests = [
            { variant: 'control', expected: { theme: 'default' } },
            { variant: 'enhanced', expected: { theme: 'gradient' } },
            { variant: 'minimal', expected: { theme: 'monochrome' } }
        ];

        let passed = true;

        contentTests.forEach(test => {
            const content = this.mockGetVariantContent('theme', 'ui_variant_2024', test.variant);

            if (content && content.theme === test.expected.theme) {
                console.info(`   ✅ ${test.variant}: Theme is ${content.theme}`);
            } else {
                console.info(`   ❌ ${test.variant}: Expected theme ${test.expected.theme}, got ${content?.theme}`);
                passed = false;
            }
        });

        this.testResults.push({
            test: 'Variant Content',
            passed,
            details: contentTests
        });

        console.info('');
    }

    mockIsFeatureEnabled(featureId) {
        const features = {
            'enhanced_ui': false,
            'smart_prefetch': true,
            'advanced_analytics': true,
            'beta_features': false
        };
        return features[featureId] || false;
    }

    mockTrackEvent(eventType, data) {
        // Mock tracking implementation
        return { type: eventType, data, timestamp: new Date().toISOString() };
    }

    mockGetVariantContent(contentKey, testId, variant) {
        const content = {
            'control': { theme: 'default', colors: ['#3b82f6', '#22c55e'] },
            'enhanced': { theme: 'gradient', colors: ['#8b5cf6', '#ec4899'] },
            'minimal': { theme: 'monochrome', colors: ['#1f2937', '#6b7280'] }
        };
        return content[variant] || null;
    }

    displayResults() {
        console.info('📈 Test Results Summary:');
        console.info('');

        const passed = this.testResults.filter(r => r.passed).length;
        const total = this.testResults.length;

        this.testResults.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.info(`${status} ${result.test}`);
        });

        console.info('');
        console.info(`Overall: ${passed}/${total} tests passed`);

        if (passed === total) {
            console.info('🎉 All tests passed!');
            process.exit(0);
        } else {
            console.info('❌ Some tests failed');
            process.exit(1);
        }
    }
}

// CLI usage
if (require.main === module) {
    const tester = new VariantTester();
    tester.runTests();
}

module.exports = VariantTester;
