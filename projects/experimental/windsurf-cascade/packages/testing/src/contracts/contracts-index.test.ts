// Test the contracts index file exports and functionality

import { describe, test, expect } from 'bun:test';
import {
    ContractTestConfig,
    ContractTestUtils,
    ContractTestExports
} from './index';

describe('Contracts Index', () => {
    test('should export configuration', () => {
        expect(ContractTestConfig).toBeDefined();
        expect(ContractTestConfig.performance).toBeDefined();
        expect(ContractTestConfig.validation).toBeDefined();
        expect(ContractTestConfig.dataGeneration).toBeDefined();
        expect(ContractTestConfig.network).toBeDefined();
        expect(ContractTestConfig.rotationNumbers).toBeDefined();
    });

    test('should export utilities', () => {
        expect(ContractTestUtils).toBeDefined();
        expect(ContractTestUtils.createSuite).toBeDefined();
        expect(ContractTestUtils.generateViolationReport).toBeDefined();
        expect(ContractTestUtils.runRotationNumberTests).toBeDefined();
    });

    test('should create test suite', () => {
        const suite = ContractTestUtils.createSuite('Test Suite');
        expect(suite.name).toBe('Test Suite');
        expect(suite.config).toBeDefined();
        expect(suite.tests).toBeDefined();
        expect(Array.isArray(suite.tests)).toBe(true);
        expect(suite.addTest).toBeDefined();
        expect(suite.run).toBeDefined();
    });

    test('should add and run tests', async () => {
        const suite = ContractTestUtils.createSuite('Test Suite');

        suite.addTest('Test 1', () => {
            expect(true).toBe(true);
        });

        suite.addTest('Test 2', () => {
            expect(1 + 1).toBe(2);
        });

        const results = await suite.run();
        expect(results).toHaveLength(2);
        expect(results[0].status).toBe('passed');
        expect(results[1].status).toBe('passed');
    });

    test('should generate violation report', () => {
        const failures = [
            { name: 'Test 1', status: 'passed' },
            { name: 'Test 2', status: 'failed', error: new Error('Test failed') },
            { name: 'Test 3', status: 'passed' }
        ];

        const report = ContractTestUtils.generateViolationReport(failures);

        expect(report.summary.totalTests).toBe(3);
        expect(report.summary.failedTests).toBe(1);
        expect(report.summary.passedTests).toBe(2);
        expect(report.summary.timestamp).toBeDefined();
        expect(report.violations).toHaveLength(1);
        expect(Array.isArray(report.recommendations)).toBe(true);
    });

    test('should run rotation number tests', async () => {
        const result = await ContractTestUtils.runRotationNumberTests();

        expect(result.status).toBe('completed');
        expect(result.testsRun).toBeGreaterThan(0);
        expect(result.timestamp).toBeDefined();
    });

    test('should export ContractTestExports', () => {
        expect(ContractTestExports).toBeDefined();
        expect(ContractTestExports.ContractTestConfig).toBe(ContractTestConfig);
        expect(ContractTestExports.ContractTestUtils).toBe(ContractTestUtils);
    });

    test('should have correct rotation number configuration', () => {
        expect(ContractTestConfig.rotationNumbers.validRangeTests).toBe(1000);
        expect(ContractTestConfig.rotationNumbers.invalidRangeTests).toBe(500);
        expect(ContractTestConfig.rotationNumbers.sportsbookMappingTests).toBe(2000);
        expect(ContractTestConfig.rotationNumbers.consistencyTests).toBe(500);
    });
});
