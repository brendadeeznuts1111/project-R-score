/**
 * Settle Bet Use Case
 * Domain-Driven Design Implementation
 *
 * Application layer use case for settling bets
 */

import { BettingService, SettleBetRequest } from '../../domains/betting/services/BettingService';
import { BetOutcome } from '../../domains/betting/entities/Bet';

export interface SettleBetCommand {
  betId: string;
  outcome: 'WON' | 'LOST';
  marketResult: string;
}

export interface SettleBetResult {
  betId: string;
  customerId: string;
  stake: number;
  potentialWin: number;
  outcome: BetOutcome;
  actualWin: number;
  netResult: number;
  marketResult: string;
  settledAt: Date;
  status: string;
}

export class SettleBetUseCase {
  constructor(private bettingService: BettingService) {}

  async execute(command: SettleBetCommand): Promise<SettleBetResult> {
    // Validate command
    this.validateCommand(command);

    // Map string outcome to enum
    const outcome = command.outcome === 'WON' ? BetOutcome.WON : BetOutcome.LOST;

    // Create request for domain service
    const request: SettleBetRequest = {
      betId: command.betId,
      outcome,
      marketResult: command.marketResult,
    };

    // Execute domain logic
    const bet = await this.bettingService.settleBet(request);

    // Return application result
    return {
      betId: bet.getId(),
      customerId: bet.getCustomerId(),
      stake: bet.getStake(),
      potentialWin: bet.getPotentialWin(),
      outcome: bet.getOutcome()!,
      actualWin: bet.getActualWin()!,
      netResult: bet.getNetResult(),
      marketResult: bet.getMarketResult()!,
      settledAt: bet.getSettledAt()!,
      status: bet.getStatus(),
    };
  }

  private validateCommand(command: SettleBetCommand): void {
    if (!command.betId || command.betId.trim().length === 0) {
      throw new Error('Bet ID is required');
    }

    if (!command.outcome || !['WON', 'LOST'].includes(command.outcome)) {
      throw new Error('Outcome must be either WON or LOST');
    }

    if (!command.marketResult || command.marketResult.trim().length === 0) {
      throw new Error('Market result is required');
    }

    // Business rules
    if (command.marketResult.length > 200) {
      throw new Error('Market result description is too long');
    }
  }
}
