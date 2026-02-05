/**
 * Risk Mitigator Test Suite
 * 
 * Tests risk mitigation thresholds
 */

import { test, expect } from "bun:test";
import { RiskMitigator } from "../src/risk-mitigator";

test('risk level - deploy threshold', () => {
	const mitigator = new RiskMitigator();

	const level = mitigator.getRiskLevel(0.95);
	expect(level.level).toBe('DEPLOY');
	expect(level.action).toBe('Deploy immediately');
});

test('risk level - paper trade threshold', () => {
	const mitigator = new RiskMitigator();

	const level = mitigator.getRiskLevel(0.85);
	expect(level.level).toBe('PAPER_TRADE');
	expect(level.action).toBe('Paper trade 100 plays');
});

test('risk level - monitor threshold', () => {
	const mitigator = new RiskMitigator();

	const level = mitigator.getRiskLevel(0.75);
	expect(level.level).toBe('MONITOR');
	expect(level.action).toBe('Monitor only');
});

test('risk level - discard threshold', () => {
	const mitigator = new RiskMitigator();

	const level = mitigator.getRiskLevel(0.65);
	expect(level.level).toBe('DISCARD');
	expect(level.action).toBe('Discard');
});

test('is safe to deploy', () => {
	const mitigator = new RiskMitigator();

	expect(mitigator.isSafeToDeploy(0.95)).toBe(true);
	expect(mitigator.isSafeToDeploy(0.85)).toBe(false);
	expect(mitigator.isSafeToDeploy(0.70)).toBe(false);
});

test('validate pattern', () => {
	const mitigator = new RiskMitigator();

	expect(mitigator.validatePattern(0.85, 0.80)).toBe(true);
	expect(mitigator.validatePattern(0.75, 0.80)).toBe(false);
	expect(mitigator.validatePattern(0.85, 0.70)).toBe(false);
});



