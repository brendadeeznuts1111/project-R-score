import { describe, it, expect } from 'bun:test';
import {
  Payment,
  Money,
  Currency,
  PaymentMethod,
  PaymentStatus,
  PaymentRequest,
} from '../entities/payment';

describe('Payment Entity', () => {
  it('creates payment with valid data', () => {
    const request: PaymentRequest = {
      id: 'payment-123',
      playerId: 'player-456',
      amount: 100.5,
      currency: 'USD',
      paymentMethod: 'card:visa',
      metadata: { source: 'web' },
    };

    const payment = Payment.create(request);

    expect(payment.getPlayerId()).toBe(request.playerId);
    expect(payment.getAmount().getAmount()).toBe(request.amount);
    expect(payment.getAmount().getCurrency()).toBe(request.currency);
    expect(payment.getCurrency().getCode()).toBe(request.currency);
    expect(payment.getPaymentMethod().toString()).toBe(request.paymentMethod);
    expect(payment.getStatus()).toBe(PaymentStatus.PENDING);
    expect(payment.getRiskScore()).toBe(0);
  });

  it('marks payment as processing', () => {
    const request: PaymentRequest = {
      id: 'payment-123',
      playerId: 'player-456',
      amount: 50.0,
      currency: 'USD',
      paymentMethod: 'card:mastercard',
    };

    const payment = Payment.create(request);
    payment.markAsProcessing();

    expect(payment.getStatus()).toBe(PaymentStatus.PROCESSING);
  });

  it('marks payment as completed', () => {
    const request: PaymentRequest = {
      id: 'payment-123',
      playerId: 'player-456',
      amount: 25.0,
      currency: 'EUR',
      paymentMethod: 'bank:sepa',
    };

    const payment = Payment.create(request);
    payment.markAsProcessing();
    payment.markAsCompleted();

    expect(payment.getStatus()).toBe(PaymentStatus.COMPLETED);
  });

  it('marks payment as failed with reason', () => {
    const request: PaymentRequest = {
      id: 'payment-123',
      playerId: 'player-456',
      amount: 75.0,
      currency: 'GBP',
      paymentMethod: 'crypto:btc',
    };

    const payment = Payment.create(request);
    const failureReason = 'Insufficient funds';
    payment.markAsFailed(failureReason);

    expect(payment.getStatus()).toBe(PaymentStatus.FAILED);
    expect(payment.getMetadata().failureReason).toBe(failureReason);
  });

  it('updates risk score', () => {
    const request: PaymentRequest = {
      id: 'payment-123',
      playerId: 'player-456',
      amount: 200.0,
      currency: 'USD',
      paymentMethod: 'card:amex',
    };

    const payment = Payment.create(request);
    payment.updateRiskScore(85);

    expect(payment.getRiskScore()).toBe(85);
  });

  it('validates risk score range', () => {
    const request: PaymentRequest = {
      id: 'payment-123',
      playerId: 'player-456',
      amount: 50.0,
      currency: 'USD',
      paymentMethod: 'card:visa',
    };

    const payment = Payment.create(request);

    expect(() => payment.updateRiskScore(-1)).toThrow();
    expect(() => payment.updateRiskScore(101)).toThrow();
  });

  it('determines high risk payments', () => {
    const request: PaymentRequest = {
      id: 'payment-123',
      playerId: 'player-456',
      amount: 100.0,
      currency: 'USD',
      paymentMethod: 'crypto:eth',
    };

    const payment = Payment.create(request);
    payment.updateRiskScore(80); // High risk

    expect(payment.isHighRisk()).toBe(true);
    expect(payment.canBeProcessed()).toBe(false);
  });

  it('determines if payment requires manual review', () => {
    const highAmountRequest: PaymentRequest = {
      id: 'payment-123',
      playerId: 'player-456',
      amount: 15000.0, // High amount
      currency: 'USD',
      paymentMethod: 'card:visa',
    };

    const highRiskRequest: PaymentRequest = {
      id: 'payment-456',
      playerId: 'player-456',
      amount: 100.0,
      currency: 'USD',
      paymentMethod: 'crypto:btc',
    };

    const highAmountPayment = Payment.create(highAmountRequest);
    const highRiskPayment = Payment.create(highRiskRequest);
    highRiskPayment.updateRiskScore(60); // Medium-high risk

    expect(highAmountPayment.requiresManualReview()).toBe(true);
    expect(highRiskPayment.requiresManualReview()).toBe(true);
  });
});

describe('Money Value Object', () => {
  it('creates money with valid amount', () => {
    const money = Money.create(100.5, 'USD');

    expect(money.getAmount()).toBe(100.5);
    expect(money.getCurrency()).toBe('USD');
  });

  it('rejects negative amounts', () => {
    expect(() => Money.create(-50, 'USD')).toThrow();
  });

  it('compares amounts correctly', () => {
    const money1 = Money.create(100, 'USD');
    const money2 = Money.create(200, 'USD');
    const money3 = Money.create(100, 'EUR');

    expect(money1.greaterThan(money2)).toBe(false);
    expect(money2.greaterThan(money1)).toBe(true);
  });

  it('adds amounts correctly', () => {
    const money1 = Money.create(100, 'USD');
    const money2 = Money.create(50, 'USD');
    const result = money1.add(money2);

    expect(result.getAmount()).toBe(150);
    expect(result.getCurrency()).toBe('USD');
  });

  it('rejects operations with different currencies', () => {
    const usdMoney = Money.create(100, 'USD');
    const eurMoney = Money.create(100, 'EUR');

    expect(() => usdMoney.greaterThan(eurMoney)).toThrow();
    expect(() => usdMoney.add(eurMoney)).toThrow();
  });

  it('implements equals correctly', () => {
    const money1 = Money.create(100, 'USD');
    const money2 = Money.create(100, 'USD');
    const money3 = Money.create(200, 'USD');
    const money4 = Money.create(100, 'EUR');

    expect(money1.equals(money2)).toBe(true);
    expect(money1.equals(money3)).toBe(false);
    expect(money1.equals(money4)).toBe(false);
  });
});

describe('Currency Value Object', () => {
  it('creates currency from valid code', () => {
    const currency = Currency.fromCode('USD');

    expect(currency.getCode()).toBe('USD');
    expect(currency.getSymbol()).toBe('$');
    expect(currency.getDecimalPlaces()).toBe(2);
  });

  it('rejects invalid currency codes', () => {
    expect(() => Currency.fromCode('INVALID')).toThrow();
  });

  it('implements equals correctly', () => {
    const usd1 = Currency.fromCode('USD');
    const usd2 = Currency.fromCode('USD');
    const eur = Currency.fromCode('EUR');

    expect(usd1.equals(usd2)).toBe(true);
    expect(usd1.equals(eur)).toBe(false);
  });
});

describe('PaymentMethod Value Object', () => {
  it('creates payment method from string', () => {
    const method = PaymentMethod.fromString('card:visa');

    expect(method.getType()).toBe('card');
    expect(method.getProvider()).toBe('visa');
    expect(method.isCard()).toBe(true);
    expect(method.isCrypto()).toBe(false);
  });

  it('identifies crypto payment methods', () => {
    const cryptoMethod = PaymentMethod.fromString('crypto:btc');

    expect(cryptoMethod.isCrypto()).toBe(true);
    expect(cryptoMethod.isCard()).toBe(false);
  });

  it('rejects invalid payment method format', () => {
    expect(() => PaymentMethod.fromString('invalid')).toThrow();
    expect(() => PaymentMethod.fromString('card')).toThrow();
  });

  it('implements equals correctly', () => {
    const method1 = PaymentMethod.fromString('card:visa');
    const method2 = PaymentMethod.fromString('card:visa');
    const method3 = PaymentMethod.fromString('card:mastercard');

    expect(method1.equals(method2)).toBe(true);
    expect(method1.equals(method3)).toBe(false);
  });
});
