/**
 * Place Bet Use Case
 * Domain-Driven Design Implementation
 *
 * Application layer use case for placing bets
 */

import { BettingService, PlaceBetRequest } from '../../domains/betting/services/BettingService';
import { OddsValue } from '../../domains/betting/value-objects/OddsValue';

export interface PlaceBetCommand {
  customerId: string;
  stake: number;
  oddsPrice: number;
  selection: string;
  marketId: string;
}

export interface PlaceBetResult {
  betId: string;
  customerId: string;
  stake: number;
  potentialWin: number;
  odds: {
    price: number;
    selection: string;
    marketId: string;
    fractionalOdds: string;
    americanOdds: string;
    impliedProbability: number;
  };
  placedAt: Date;
  status: string;
}

export class PlaceBetUseCase {
  constructor(private bettingService: BettingService) {}

  async execute(command: PlaceBetCommand): Promise<PlaceBetResult> {
    // Validate command
    this.validateCommand(command);

    // Create odds value object
    const odds = OddsValue.create(command.oddsPrice, command.selection, command.marketId);

    // Create request for domain service
    const request: PlaceBetRequest = {
      customerId: command.customerId,
      stake: command.stake,
      odds,
    };

    // Execute domain logic
    const bet = await this.bettingService.placeBet(request);

    // Return application result
    return {
      betId: bet.getId(),
      customerId: bet.getCustomerId(),
      stake: bet.getStake(),
      potentialWin: bet.getPotentialWin(),
      odds: {
        price: odds.getPrice(),
        selection: odds.getSelection(),
        marketId: odds.getMarketId(),
        fractionalOdds: odds.getFractionalOdds(),
        americanOdds: odds.getAmericanOdds(),
        impliedProbability: odds.getImpliedProbability(),
      },
      placedAt: bet.getPlacedAt(),
      status: bet.getStatus(),
    };
  }

  private validateCommand(command: PlaceBetCommand): void {
    if (!command.customerId || command.customerId.trim().length === 0) {
      throw new Error('Customer ID is required');
    }

    if (!command.stake || command.stake <= 0) {
      throw new Error('Stake must be greater than 0');
    }

    if (!command.oddsPrice || command.oddsPrice <= 1) {
      throw new Error('Odds price must be greater than 1');
    }

    if (!command.selection || command.selection.trim().length === 0) {
      throw new Error('Selection is required');
    }

    if (!command.marketId || command.marketId.trim().length === 0) {
      throw new Error('Market ID is required');
    }

    // Business rules
    if (command.stake > 10000) {
      throw new Error('Maximum stake is $10,000');
    }

    if (command.oddsPrice > 100) {
      throw new Error('Maximum odds are 100.0');
    }
  }
}
