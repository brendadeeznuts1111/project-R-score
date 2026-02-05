/**
 * Betting Domain Tests
 * Domain-Driven Design Implementation
 *
 * Comprehensive tests for the betting domain
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { Bet, BetStatus, BetOutcome } from '../src/domains/betting/entities/Bet';
import { OddsValue } from '../src/domains/betting/value-objects/OddsValue';
import { BettingService } from '../src/domains/betting/services/BettingService';
import { PlaceBetUseCase } from '../src/application/use-cases/PlaceBetUseCase';
import { InsufficientFundsError } from '../src/domains/betting/entities/Bet';

// Mock repositories
const mockBetRepository = {
  save: mock(),
  findById: mock(),
  findByCustomerId: mock(),
  findByQuery: mock(),
  findOpenBets: mock(),
  findOpenBetsByMarket: mock(),
  findBetsNeedingSettlement: mock(),
  getSummary: mock(),
  getCustomerStats: mock(),
  exists: mock(),
  delete: mock(),
};

const mockLedgerRepository = {
  save: mock(),
  findById: mock(),
  findByQuery: mock(),
  findByAccountId: mock(),
  findByCustomerId: mock(),
  findByBetId: mock(),
  getCustomerBalance: mock(),
  getCustomerBalanceDetails: mock(),
  getAccountBalance: mock(),
  getSummary: mock(),
  exists: mock(),
  getCustomerTransactionHistory: mock(),
  getDailyTotals: mock(),
  getMonthlySummary: mock(),
};

const mockEventBus = {
  publish: mock(),
};

describe('Bet Entity', () => {
  test('should create a bet successfully', () => {
    const customerId = 'customer-123';
    const stake = 100;
    const odds = OddsValue.create(2.5, 'Home Win', 'market-456');

    const bet = Bet.create(customerId, stake, odds);

    expect(bet.getId()).toBeDefined();
    expect(bet.getCustomerId()).toBe(customerId);
    expect(bet.getStake()).toBe(stake);
    expect(bet.getPotentialWin()).toBe(250); // 100 * 2.5
    expect(bet.getStatus()).toBe(BetStatus.OPEN);
    expect(bet.getPlacedAt()).toBeInstanceOf(Date);
  });

  test('should settle bet as won', () => {
    const odds = OddsValue.create(2.0, 'Draw', 'market-789');
    const bet = Bet.create('customer-456', 50, odds);

    bet.settleAsWon('Draw result');

    expect(bet.getStatus()).toBe(BetStatus.WON);
    expect(bet.getOutcome()).toBe(BetOutcome.WON);
    expect(bet.getActualWin()).toBe(100); // 50 * 2.0
    expect(bet.getMarketResult()).toBe('Draw result');
    expect(bet.isSettled()).toBe(true);
  });

  test('should settle bet as lost', () => {
    const odds = OddsValue.create(3.0, 'Away Win', 'market-101');
    const bet = Bet.create('customer-789', 25, odds);

    bet.settleAsLost('Home win result');

    expect(bet.getStatus()).toBe(BetStatus.LOST);
    expect(bet.getOutcome()).toBe(BetOutcome.LOST);
    expect(bet.getActualWin()).toBe(0);
    expect(bet.isSettled()).toBe(true);
  });

  test('should calculate net result correctly', () => {
    const odds = OddsValue.create(2.0, 'Home Win', 'market-202');
    const bet = Bet.create('customer-999', 100, odds);

    // Before settlement
    expect(bet.getNetResult()).toBe(0);

    // After winning
    bet.settleAsWon('Home win');
    expect(bet.getNetResult()).toBe(100); // 200 - 100 = 100 profit

    // After losing
    const losingBet = Bet.create('customer-888', 50, odds);
    losingBet.settleAsLost('Away win');
    expect(losingBet.getNetResult()).toBe(-50); // -50 loss
  });
});

describe('OddsValue Value Object', () => {
  test('should create odds successfully', () => {
    const odds = OddsValue.create(2.5, 'Home Win', 'market-123');

    expect(odds.getPrice()).toBe(2.5);
    expect(odds.getSelection()).toBe('Home Win');
    expect(odds.getMarketId()).toBe('market-123');
  });

  test('should calculate potential win correctly', () => {
    const odds = OddsValue.create(3.0, 'Away Win', 'market-456');

    expect(odds.calculatePotentialWin(100)).toBe(300);
    expect(odds.calculatePotentialWin(50)).toBe(150);
  });

  test('should generate correct fractional odds', () => {
    expect(OddsValue.create(2.0, 'Draw', 'market-1').getFractionalOdds()).toBe('1/1');
    expect(OddsValue.create(1.5, 'Home', 'market-2').getFractionalOdds()).toBe('1/2');
    expect(OddsValue.create(4.0, 'Away', 'market-3').getFractionalOdds()).toBe('3/1');
  });

  test('should generate correct American odds', () => {
    expect(OddsValue.create(2.0, 'Draw', 'market-1').getAmericanOdds()).toBe('+100');
    expect(OddsValue.create(1.5, 'Home', 'market-2').getAmericanOdds()).toBe('-200');
    expect(OddsValue.create(4.0, 'Away', 'market-3').getAmericanOdds()).toBe('+300');
  });

  test('should identify long shot and favorite odds', () => {
    const favorite = OddsValue.create(1.3, 'Favorite', 'market-1');
    const normal = OddsValue.create(2.5, 'Normal', 'market-2');
    const longShot = OddsValue.create(6.0, 'Long Shot', 'market-3');

    expect(favorite.isFavorite()).toBe(true);
    expect(favorite.isLongShot()).toBe(false);

    expect(normal.isFavorite()).toBe(false);
    expect(normal.isLongShot()).toBe(false);

    expect(longShot.isFavorite()).toBe(false);
    expect(longShot.isLongShot()).toBe(true);
  });

  test('should be equal when properties match', () => {
    const odds1 = OddsValue.create(2.5, 'Home Win', 'market-123');
    const odds2 = OddsValue.create(2.5, 'Home Win', 'market-123');
    const odds3 = OddsValue.create(3.0, 'Away Win', 'market-456');

    expect(odds1.equals(odds2)).toBe(true);
    expect(odds1.equals(odds3)).toBe(false);
  });
});

describe('BettingService', () => {
  let bettingService: BettingService;

  beforeEach(() => {
    // Reset mocks
    Object.values(mockBetRepository).forEach(mockFn => mockFn.mockClear());
    Object.values(mockLedgerRepository).forEach(mockFn => mockFn.mockClear());
    mockEventBus.publish.mockClear();

    bettingService = new BettingService(
      mockBetRepository as any,
      mockLedgerRepository as any,
      mockEventBus as any
    );
  });

  test('should place bet successfully', async () => {
    const customerId = 'customer-123';
    const stake = 100;
    const odds = OddsValue.create(2.0, 'Home Win', 'market-456');

    // Mock customer balance
    mockLedgerRepository.getCustomerBalance.mockResolvedValue(500);
    mockBetRepository.save.mockImplementation(bet => Promise.resolve(bet));
    mockLedgerRepository.save.mockResolvedValue(undefined);

    const result = await bettingService.placeBet({ customerId, stake, odds });

    expect(result.getCustomerId()).toBe(customerId);
    expect(result.getStake()).toBe(stake);
    expect(result.getPotentialWin()).toBe(200); // 100 * 2.0
    expect(mockBetRepository.save).toHaveBeenCalled();
    expect(mockLedgerRepository.save).toHaveBeenCalled(); // Ledger entries created
  });

  test('should throw error for insufficient funds', async () => {
    const customerId = 'customer-123';
    const stake = 200;
    const odds = OddsValue.create(2.0, 'Home Win', 'market-456');

    // Mock insufficient balance
    mockLedgerRepository.getCustomerBalance.mockResolvedValue(100);

    await expect(bettingService.placeBet({ customerId, stake, odds })).rejects.toThrow(
      InsufficientFundsError
    );
  });

  test('should settle bet as won', async () => {
    const betId = 'bet-123';
    const marketResult = 'Home team won 2-1';

    const mockBet = {
      getId: () => betId,
      getCustomerId: () => 'customer-123',
      getStake: () => 100,
      getPotentialWin: () => 250,
      isSettled: () => false,
      settleAsWon: mock(),
      settleAsLost: mock(),
      getStatus: () => BetStatus.WON,
      getOutcome: () => BetOutcome.WON,
      getActualWin: () => 250,
    };

    mockBetRepository.findById.mockResolvedValue(mockBet as any);
    mockLedgerRepository.getCustomerBalance.mockResolvedValue(400);
    mockBetRepository.save.mockResolvedValue(mockBet as any);
    mockLedgerRepository.save.mockResolvedValue(undefined);

    const result = await bettingService.settleBet({ betId, outcome: BetOutcome.WON, marketResult });

    expect(mockBet.settleAsWon).toHaveBeenCalled();
    expect(mockBetRepository.save).toHaveBeenCalled();
    expect(result.getStatus()).toBe(BetStatus.WON);
  });
});

describe('PlaceBetUseCase', () => {
  let placeBetUseCase: PlaceBetUseCase;
  let mockBettingService: any;

  beforeEach(() => {
    mockBettingService = {
      placeBet: mock(),
    };

    placeBetUseCase = new PlaceBetUseCase(mockBettingService);
  });

  test('should execute place bet successfully', async () => {
    const command = {
      customerId: 'customer-123',
      stake: 100,
      oddsPrice: 2.5,
      selection: 'Home Win',
      marketId: 'market-456',
    };

    const mockBet = {
      getId: () => 'bet-123',
      getCustomerId: () => 'customer-123',
      getStake: () => 100,
      getPotentialWin: () => 250,
      getPlacedAt: () => new Date(),
      getStatus: () => BetStatus.OPEN,
      getOdds: () => ({
        getPrice: () => 2.5,
        getSelection: () => 'Home Win',
        getMarketId: () => 'market-456',
        getFractionalOdds: () => '3/2',
        getAmericanOdds: () => '+150',
        getImpliedProbability: () => 40,
      }),
    };

    mockBettingService.placeBet.mockResolvedValue(mockBet);

    const result = await placeBetUseCase.execute(command);

    expect(result.betId).toBe('bet-123');
    expect(result.stake).toBe(100);
    expect(result.potentialWin).toBe(250);
    expect(result.odds.price).toBe(2.5);
  });

  test('should validate command parameters', async () => {
    // Test missing customer ID
    await expect(
      placeBetUseCase.execute({
        customerId: '',
        stake: 100,
        oddsPrice: 2.0,
        selection: 'Home Win',
        marketId: 'market-123',
      })
    ).rejects.toThrow('Customer ID is required');

    // Test invalid stake
    await expect(
      placeBetUseCase.execute({
        customerId: 'customer-123',
        stake: -50,
        oddsPrice: 2.0,
        selection: 'Home Win',
        marketId: 'market-123',
      })
    ).rejects.toThrow('Stake must be greater than 0');

    // Test invalid odds
    await expect(
      placeBetUseCase.execute({
        customerId: 'customer-123',
        stake: 100,
        oddsPrice: 0.5,
        selection: 'Home Win',
        marketId: 'market-123',
      })
    ).rejects.toThrow('Odds price must be greater than 1');
  });
});
