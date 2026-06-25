/**
 * Collections Controller Tests
 * Domain-Driven Design Implementation
 */

import { describe, test, expect } from 'bun:test';
import {
  CollectionsController,
  CollectionsService,
  PaymentRequest,
} from '../collections.controller';
import { PaymentStatus } from '../entities/payment';

describe('Collections Controller', () => {
  test('creates controller instance', () => {
    const controller = new CollectionsController();
    expect(controller).toBeDefined();
  });

  test('processes valid payment successfully', async () => {
    const controller = new CollectionsController();
    const request: PaymentRequest = {
      id: 'payment_123',
      playerId: 'player_456',
      amount: 100, // Small amount, won't trigger manual review
      currency: 'USD',
      paymentMethod: 'card:visa',
    };

    // Mock random to return low risk score (< 50, so won't trigger manual review)
    const originalRandom = Math.random;
    Math.random = () => 0.2; // Risk score around 20

    try {
      const result = await controller.processPayment(request);

      expect(result).toBeDefined();
      expect(result.paymentId).toBe('payment_123');
      expect(result.playerId).toBe('player_456');
      expect(result.amount).toBe(100);
      expect(result.status).toBe(PaymentStatus.COMPLETED);
      expect(result.processedAt).toBeInstanceOf(Date);
    } finally {
      Math.random = originalRandom;
    }
  });

  test('rejects high risk payment', async () => {
    const controller = new CollectionsController();
    const request: PaymentRequest = {
      id: 'high_risk_payment',
      playerId: 'player_789',
      amount: 100,
      currency: 'USD',
      paymentMethod: 'card:visa',
    };

    // Mock the random risk score to be high
    const originalRandom = Math.random;
    Math.random = () => 0.9; // This will generate risk score > 75

    try {
      await expect(controller.processPayment(request)).rejects.toThrow(
        'High risk payment requires manual review'
      );
    } finally {
      Math.random = originalRandom;
    }
  });

  test('rejects large payment requiring manual review', async () => {
    const controller = new CollectionsController();
    const request: PaymentRequest = {
      id: 'large_payment',
      playerId: 'player_999',
      amount: 15000, // Large amount > 10000 threshold
      currency: 'USD',
      paymentMethod: 'card:visa',
    };

    // Mock random to return low risk score (so only the amount triggers manual review)
    const originalRandom = Math.random;
    Math.random = () => 0.2; // Risk score around 20

    try {
      await expect(controller.processPayment(request)).rejects.toThrow(
        'Payment requires manual review'
      );
    } finally {
      Math.random = originalRandom;
    }
  });

  test('calculates revenue for financial reporting', async () => {
    const controller = new CollectionsController();
    const start = new Date('2024-01-01');
    const end = new Date('2024-01-31');

    const result = await controller.calculateRevenue({ start, end });

    expect(result).toBeDefined();
    expect(result.totalCollections).toBe(0); // Placeholder implementation
    expect(result.successfulCollections).toBe(0);
    expect(result.totalAmount).toBe(0);
  });
});

describe('Collections Service', () => {
  test('creates service instance', () => {
    const service = new CollectionsService();
    expect(service).toBeDefined();
  });

  test('service delegates to controller', async () => {
    const service = new CollectionsService();
    const request: PaymentRequest = {
      id: 'service_test_payment',
      playerId: 'player_test',
      amount: 50, // Small amount
      currency: 'USD',
      paymentMethod: 'crypto:btc',
    };

    // Mock random to return low risk score
    const originalRandom = Math.random;
    Math.random = () => 0.1; // Risk score around 10

    try {
      const result = await service.processPayment(request);

      expect(result).toBeDefined();
      expect(result.paymentId).toBe('service_test_payment');
      expect(result.status).toBe(PaymentStatus.COMPLETED);
    } finally {
      Math.random = originalRandom;
    }
  });

  test('service provides revenue calculation for financial reporting', async () => {
    const service = new CollectionsService();
    const start = new Date('2024-01-01');
    const end = new Date('2024-01-31');

    const result = await service.calculateRevenue({ start, end });

    expect(result).toBeDefined();
    expect(typeof result.totalCollections).toBe('number');
    expect(typeof result.totalAmount).toBe('number');
  });
});
