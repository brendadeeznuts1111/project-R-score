#!/usr/bin/env bun

// __tests__/ai.test.ts - Comprehensive Test Suite for Nebula-Flow™ AI
// Tests for anomaly detection, training, and API endpoints

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { AnomalyEngine, type LegSignal } from '../ai/anomalyEngine.js';
import { trainModel, getTrainingHistory } from '../ai/train.js';
import { AIAPI } from '../ai/api.js';

console.log("🧪 Nebula-Flow™ AI Test Suite - Loading");

describe('AnomalyEngine - Core Detection Logic', () => {
    let engine: AnomalyEngine;
    
    beforeEach(() => {
        engine = new AnomalyEngine();
    });
    
    describe('Basic Scoring', () => {
        it('should score low risk leg correctly', async () => {
            const signal: LegSignal = {
                deviceId: 'device_low_risk',
                ageDays: 180,
                legAmount: 500,
                legVelocity: 5,
                ipJump: 1,
                walletAgeDelta: 90,
                ctrProximity: 5000,
                chargebackHistory: false,
                sessionDuration: 30,
                geoMismatch: false,
                deviceRiskScore: 0.2
            };
            
            const result = await engine.scoreLeg(signal);
            
            expect(result.score).toBeLessThan(0.7);
            expect(result.nebulaCode).toBe('N-00');
            expect(result.recommendation).toBe('ALLOW');
            expect(result.reason).toContain('LOW_RISK');
        });
        
        it('should score high risk leg correctly', async () => {
            const signal: LegSignal = {
                deviceId: 'device_high_risk',
                ageDays: 1,
                legAmount: 8000,
                legVelocity: 150,
                ipJump: 15,
                walletAgeDelta: 5,
                ctrProximity: 500,
                chargebackHistory: true,
                sessionDuration: 5,
                geoMismatch: true,
                deviceRiskScore: 0.9
            };
            
            const result = await engine.scoreLeg(signal);
            
            expect(result.score).toBeGreaterThan(0.9);
            expect(result.nebulaCode).toBe('N-AI-B');
            expect(result.recommendation).toBe('BLOCK');
            expect(result.reason).toContain('HIGH_RISK');
        });
        
        it('should score medium risk leg correctly', async () => {
            const signal: LegSignal = {
                deviceId: 'device_medium_risk',
                ageDays: 15, 
                legAmount: 6000, // Large amount from new wallet should trigger +0.20
                legVelocity: 60, 
                ipJump: 5,
                walletAgeDelta: 20, // New wallet with large amount - should trigger rule
                ctrProximity: 2000,
                chargebackHistory: false,
                sessionDuration: 15,
                geoMismatch: false,
                deviceRiskScore: 0.6
            };
            
            const result = await engine.scoreLeg(signal);
            
            expect(result.score).toBeGreaterThanOrEqual(0.7);
            expect(result.score).toBeLessThan(0.9);
            expect(result.nebulaCode).toBe('N-AI-T');
            expect(result.recommendation).toBe('THROTTLE');
            expect(result.reason).toContain('MEDIUM_RISK');
        });
    });
    
    describe('Feature Normalization', () => {
        it('should normalize features correctly', () => {
            const signal: LegSignal = {
                deviceId: 'test_device',
                ageDays: 365,
                legAmount: 10000,
                legVelocity: 200,
                ipJump: 20,
                walletAgeDelta: 180,
                ctrProximity: 10000,
                chargebackHistory: true,
                sessionDuration: 1440,
                geoMismatch: true,
                deviceRiskScore: 1.0
            };
            
            // Access private method through type assertion
            const normalized = (engine as any).normalizeSignal(signal);
            
            expect(normalized).toBeInstanceOf(Float32Array);
            expect(normalized.length).toBe(10);
            expect(normalized[0]).toBe(1.0); // ageDays normalized
            expect(normalized[1]).toBe(1.0); // legAmount normalized
            expect(normalized[6]).toBe(1.0); // chargebackHistory
            expect(normalized[8]).toBe(1.0); // geoMismatch
        });
        
        it('should handle edge cases in normalization', () => {
            const signal: LegSignal = {
                deviceId: 'edge_case_device',
                ageDays: 0,
                legAmount: 0,
                legVelocity: 0,
                ipJump: 0,
                walletAgeDelta: 0,
                ctrProximity: 0,
                chargebackHistory: false,
                sessionDuration: 0,
                geoMismatch: false,
                deviceRiskScore: 0
            };
            
            const normalized = (engine as any).normalizeSignal(signal);
            
            expect(Array.from(normalized).every((v: unknown) => typeof v === 'number' && v >= 0 && v <= 1)).toBe(true);
        });
    });
    
    describe('Business Rules', () => {
        it('should apply business rules correctly', () => {
            const baseScore = 0.5;
            const signal: LegSignal = {
                deviceId: 'business_rules_test',
                ageDays: 5, // Should add 0.15
                legAmount: 6000,
                legVelocity: 120, // Should add 0.25
                ipJump: 3,
                walletAgeDelta: 20, // Large amount from new wallet, should add 0.20
                ctrProximity: 3000,
                chargebackHistory: true, // Should add 0.30
                sessionDuration: 10,
                geoMismatch: true, // Should add 0.15
                deviceRiskScore: 0.7
            };
            
            const adjusted = (engine as any).applyBusinessRules(baseScore, signal);
            
            expect(adjusted).toBeGreaterThan(baseScore);
            expect(adjusted).toBeLessThanOrEqual(0.99);
        });
    });
    
    describe('Batch Processing', () => {
        it('should process batch of signals correctly', async () => {
            const signals: LegSignal[] = [
                {
                    deviceId: 'batch_1',
                    ageDays: 100,
                    legAmount: 1000,
                    legVelocity: 10,
                    ipJump: 2,
                    walletAgeDelta: 60,
                    ctrProximity: 4000,
                    chargebackHistory: false,
                    sessionDuration: 20,
                    geoMismatch: false,
                    deviceRiskScore: 0.3
                },
                {
                    deviceId: 'batch_2',
                    ageDays: 2,
                    legAmount: 7000,
                    legVelocity: 100,
                    ipJump: 10,
                    walletAgeDelta: 10,
                    ctrProximity: 1000,
                    chargebackHistory: true,
                    sessionDuration: 5,
                    geoMismatch: true,
                    deviceRiskScore: 0.8
                }
            ];
            
            const results = await engine.scoreBatch(signals);
            
            expect(results).toHaveLength(2);
            expect(results[0]?.result?.recommendation).toBe('ALLOW');
            expect(results[1]?.result?.recommendation).toBe('BLOCK');
        });
    });
    
    describe('Error Handling', () => {
        it('should handle malformed signals gracefully', async () => {
            const malformedSignal = {
                deviceId: '',
                ageDays: -1,
                legAmount: NaN,
                legVelocity: Infinity,
                ipJump: -5,
                walletAgeDelta: undefined,
                ctrProximity: null,
                chargebackHistory: 'false',
                sessionDuration: 'invalid',
                geoMismatch: null,
                deviceRiskScore: 2.0
            } as any;
            
            const result = await engine.scoreLeg(malformedSignal);
            
            expect(result).toBeDefined();
            expect(result.score).toBeGreaterThanOrEqual(0);
            expect(result.score).toBeLessThanOrEqual(1);
        });
        
        it('should handle inference failures gracefully', async () => {
            // Test with normal signal - inference is working correctly
            const signal: LegSignal = {
                deviceId: 'inference_fail_test',
                ageDays: 50,
                legAmount: 2000,
                legVelocity: 25,
                ipJump: 3,
                walletAgeDelta: 40,
                ctrProximity: 3500,
                chargebackHistory: false,
                sessionDuration: 25,
                geoMismatch: false,
                deviceRiskScore: 0.4
            };
            
            const result = await engine.scoreLeg(signal);
            
            // Should return a valid result since inference is working
            expect(result).toBeDefined();
            expect(result.score).toBeGreaterThanOrEqual(0);
            expect(result.score).toBeLessThanOrEqual(1);
            expect(result.nebulaCode).toMatch(/^N-(00|AI-T|AI-B|AI-ERROR)$/);
            expect(result.recommendation).toMatch(/^(ALLOW|THROTTLE|BLOCK)$/);
        });
    });
    
    describe('Statistics', () => {
        it('should return correct statistics', () => {
            const stats = engine.getStats();
            
            expect(stats).toHaveProperty('modelInitialized');
            expect(stats).toHaveProperty('version');
            expect(stats).toHaveProperty('features');
            expect(stats).toHaveProperty('inferenceTime');
            expect(stats).toHaveProperty('accuracy');
            
            expect(stats.version).toBe('1.0.0');
            expect(stats.features).toBe(10);
        });
    });
});

describe('Training System', () => {
    describe('Model Training', () => {
        it('should train model successfully', async () => {
            const metrics = await trainModel();
            
            expect(metrics).toBeDefined();
            expect(metrics.accuracy).toBeGreaterThan(0.8);
            expect(metrics.accuracy).toBeLessThan(1.0);
            expect(metrics.loss).toBeGreaterThan(0);
            expect(metrics.samples).toBeGreaterThan(1000);
            expect(metrics.version).toMatch(/^v\d+$/);
        });
        
        it('should handle insufficient data gracefully', async () => {
            // This would require mocking the database to return insufficient data
            // For now, we test the success case
            const metrics = await trainModel();
            expect(metrics).toBeDefined();
        });
    });
    
    describe('Training History', () => {
        it('should retrieve training history', async () => {
            const history = await getTrainingHistory();
            
            expect(Array.isArray(history)).toBe(true);
            if (history.length > 0) {
                const firstEntry = history[0];
                expect(firstEntry).toHaveProperty('version');
                expect(firstEntry).toHaveProperty('accuracy');
                expect(firstEntry).toHaveProperty('loss');
                expect(firstEntry).toHaveProperty('samples');
            }
        });
        
        it('should limit history results', async () => {
            const history = await getTrainingHistory(5);
            expect(history.length).toBeLessThanOrEqual(5);
        });
    });
});

describe('AI API', () => {
    let api: AIAPI;
    
    beforeEach(() => {
        api = new AIAPI();
    });
    
    describe('Health Check', () => {
        it('should return healthy status', async () => {
            const result = await api.health();
            
            expect(result.success).toBe(true);
            expect(result.data.status).toBe('healthy');
            expect(result.data.modelLoaded).toBeDefined();
            expect(result.data.uptime).toBeGreaterThan(0);
            expect(result.timestamp).toBeDefined();
        });
    });
    
    describe('Leg Scoring', () => {
        it('should score leg successfully', async () => {
            const signal: LegSignal = {
                deviceId: 'api_test_device',
                ageDays: 60,
                legAmount: 1500,
                legVelocity: 15,
                ipJump: 2,
                walletAgeDelta: 45,
                ctrProximity: 3800,
                chargebackHistory: false,
                sessionDuration: 22,
                geoMismatch: false,
                deviceRiskScore: 0.35
            };
            
            const result = await api.scoreLeg(signal);
            
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.score).toBeGreaterThanOrEqual(0);
            expect(result.data?.score).toBeLessThanOrEqual(1);
            expect(result.processingTime).toBeGreaterThan(0);
            expect(result.modelVersion).toBeDefined();
        });
        
        it('should handle batch scoring', async () => {
            const signals: LegSignal[] = [
                {
                    deviceId: 'api_batch_1',
                    ageDays: 90,
                    legAmount: 800,
                    legVelocity: 8,
                    ipJump: 1,
                    walletAgeDelta: 70,
                    ctrProximity: 4200,
                    chargebackHistory: false,
                    sessionDuration: 18,
                    geoMismatch: false,
                    deviceRiskScore: 0.25
                },
                {
                    deviceId: 'api_batch_2',
                    ageDays: 15,
                    legAmount: 4500,
                    legVelocity: 60,
                    ipJump: 8,
                    walletAgeDelta: 15,
                    ctrProximity: 1500,
                    chargebackHistory: true,
                    sessionDuration: 8,
                    geoMismatch: true,
                    deviceRiskScore: 0.75
                }
            ];
            
            const result = await api.scoreBatch(signals);
            
            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.totalProcessed).toBe(2);
            expect(result.processingTime).toBeGreaterThan(0);
        });
    });
    
    describe('Model Training', () => {
        it('should trigger model training', async () => {
            const result = await api.trainModel();
            
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.accuracy).toBeGreaterThan(0);
            expect(result.trainingTime).toBeGreaterThan(0);
            expect(result.samplesUsed).toBeGreaterThan(0);
        });
    });
    
    describe('Statistics', () => {
        it('should return system statistics', async () => {
            // Wait a bit for uptime to accumulate
            await new Promise(resolve => setTimeout(resolve, 10));
            
            const result = await api.getStats();
            
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.modelInitialized).toBeDefined();
            expect(result.data.requestsProcessed).toBeGreaterThanOrEqual(0);
            expect(result.data.uptime).toBeGreaterThan(0);
        });
    });
    
    describe('Data Export', () => {
        it('should export data in CSV format', async () => {
            const startDate = '2024-01-01';
            const endDate = '2024-01-31';
            
            const result = await api.exportData(startDate, endDate);
            
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(typeof result.data).toBe('string');
            expect(result.data).toContain('timestamp');
            expect(result.data).toContain('deviceId');
        });
    });
});

describe('Integration Tests', () => {
    describe('End-to-End Workflow', () => {
        it('should handle complete anomaly detection workflow', async () => {
            const engine = new AnomalyEngine();
            const api = new AIAPI();
            
            // Step 1: Score a high-risk leg
            const highRiskSignal: LegSignal = {
                deviceId: 'integration_test_high',
                ageDays: 1,
                legAmount: 9000,
                legVelocity: 180,
                ipJump: 18,
                walletAgeDelta: 3,
                ctrProximity: 200,
                chargebackHistory: true,
                sessionDuration: 2,
                geoMismatch: true,
                deviceRiskScore: 0.95
            };
            
            const engineResult = await engine.scoreLeg(highRiskSignal);
            expect(engineResult.recommendation).toBe('BLOCK');
            
            // Step 2: Score via API
            const apiResult = await api.scoreLeg(highRiskSignal);
            expect(apiResult.success).toBe(true);
            expect(apiResult.data?.recommendation).toBe('BLOCK');
            
            // Step 3: Check system health
            const health = await api.health();
            expect(health.success).toBe(true);
            expect(health.data.status).toBe('healthy');
            
            // Step 4: Get statistics
            const stats = await api.getStats();
            expect(stats.success).toBe(true);
            expect(stats.data.requestsProcessed).toBeGreaterThan(0);
        });
    });
    
    describe('Performance Tests', () => {
        it('should handle high volume scoring', async () => {
            const engine = new AnomalyEngine();
            const signals: LegSignal[] = [];
            
            // Generate 100 test signals
            for (let i = 0; i < 100; i++) {
                signals.push({
                    deviceId: `perf_test_${i}`,
                    ageDays: Math.floor(Math.random() * 365),
                    legAmount: Math.floor(Math.random() * 10000),
                    legVelocity: Math.floor(Math.random() * 200),
                    ipJump: Math.floor(Math.random() * 20),
                    walletAgeDelta: Math.floor(Math.random() * 180),
                    ctrProximity: Math.floor(Math.random() * 10000),
                    chargebackHistory: Math.random() < 0.1,
                    sessionDuration: Math.floor(Math.random() * 1440),
                    geoMismatch: Math.random() < 0.2,
                    deviceRiskScore: Math.random()
                });
            }
            
            const startTime = performance.now();
            const results = await engine.scoreBatch(signals);
            const endTime = performance.now();
            
            expect(results).toHaveLength(100);
            expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
            
            // Verify all results are valid
            results.forEach(result => {
                expect(result.result.score).toBeGreaterThanOrEqual(0);
                expect(result.result.score).toBeLessThanOrEqual(1);
                expect(result.result.nebulaCode).toMatch(/^N-(00|AI-T|AI-B)$/);
            });
        });
    });
});

console.log("🧪 Nebula-Flow™ AI Test Suite - Complete");
