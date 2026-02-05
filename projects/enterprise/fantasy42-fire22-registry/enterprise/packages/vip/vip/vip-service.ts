/**
 * VIP Management Service - Domain-Driven Design Example
 * Demonstrates error handling, logging, and testing patterns
 */

import {
  DomainError,
  ValidationError,
  EntityNotFoundError,
  BusinessRuleViolationError,
  ErrorBoundary,
  DomainErrorFactory,
} from '../core/errors/domain-errors';

import { DomainLogger, LoggerFactory, LogCategory } from '../core/logging/domain-logger';

// Domain Entities
export interface VipClient {
  id: string;
  userId: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  commission: number;
  managerId: string;
  status: 'active' | 'suspended' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface CommissionCalculation {
  baseAmount: number;
  commissionRate: number;
  totalCommission: number;
  effectiveRate: number;
}

// Domain Service - Business Logic
export class VipService {
  private readonly logger = LoggerFactory.create('vip');
  private readonly errorFactory = new DomainErrorFactory('vip');

  // Repository interface (would be injected in real implementation)
  private repository: VipRepository;

  constructor(repository: VipRepository) {
    this.repository = repository;
  }

  /**
   * Create a new VIP client with validation
   */
  async createVipClient(
    clientData: Omit<VipClient, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<VipClient> {
    return await ErrorBoundary.execute(
      async () => {
        await this.logger.business('Creating new VIP client', {
          operation: 'createVipClient',
          userId: clientData.userId,
          tier: clientData.tier,
        });

        // Validate business rules
        await this.validateVipClientCreation(clientData);

        // Create entity
        const client: VipClient = {
          ...clientData,
          id: this.generateVipId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Persist
        const savedClient = await this.repository.save(client);

        await this.logger.business('VIP client created successfully', {
          operation: 'createVipClient',
          entity: 'VipClient',
          entityId: savedClient.id,
          userId: clientData.userId,
        });

        // Publish domain event (would trigger notifications, etc.)
        await this.publishEvent('vip.client.created', {
          clientId: savedClient.id,
          userId: savedClient.userId,
          tier: savedClient.tier,
        });

        return savedClient;
      },
      {
        domain: 'vip',
        operation: 'createVipClient',
        userId: clientData.userId,
      }
    );
  }

  /**
   * Calculate commission for a VIP client
   */
  async calculateCommission(clientId: string, betAmount: number): Promise<CommissionCalculation> {
    return await this.logger.withTiming(
      async () => {
        return await ErrorBoundary.execute(
          async () => {
            await this.logger.business('Calculating VIP commission', {
              operation: 'calculateCommission',
              entity: 'VipClient',
              entityId: clientId,
              betAmount,
            });

            // Find VIP client
            const client = await this.repository.findById(clientId);
            if (!client) {
              throw this.errorFactory.entityNotFound('VipClient', clientId);
            }

            if (client.status !== 'active') {
              throw this.errorFactory.businessRuleViolation(
                `Cannot calculate commission for inactive VIP client`,
                'active_client_required'
              );
            }

            // Apply tier-based commission rules
            const calculation = this.applyCommissionRules(client, betAmount);

            await this.logger.business(
              'Commission calculated',
              {
                operation: 'calculateCommission',
                entity: 'VipClient',
                entityId: clientId,
              },
              {
                baseAmount: calculation.baseAmount,
                commissionRate: calculation.commissionRate,
                totalCommission: calculation.totalCommission,
              }
            );

            return calculation;
          },
          {
            domain: 'vip',
            operation: 'calculateCommission',
            entityId: clientId,
          }
        );
      },
      'calculateCommission',
      {
        domain: 'vip',
        operation: 'calculateCommission',
        entityId: clientId,
      }
    );
  }

  /**
   * Update VIP client tier with validation
   */
  async updateVipTier(
    clientId: string,
    newTier: VipClient['tier'],
    updatedBy: string
  ): Promise<VipClient> {
    return await ErrorBoundary.execute(
      async () => {
        await this.logger.business('Updating VIP client tier', {
          operation: 'updateVipTier',
          entity: 'VipClient',
          entityId: clientId,
          newTier,
          userId: updatedBy,
        });

        const client = await this.repository.findById(clientId);
        if (!client) {
          throw this.errorFactory.entityNotFound('VipClient', clientId);
        }

        // Validate tier transition rules
        await this.validateTierTransition(client.tier, newTier);

        // Update client
        const updatedClient: VipClient = {
          ...client,
          tier: newTier,
          updatedAt: new Date(),
        };

        const savedClient = await this.repository.save(updatedClient);

        await this.logger.audit('VIP client tier updated', {
          operation: 'updateVipTier',
          entity: 'VipClient',
          entityId: clientId,
          userId: updatedBy,
          metadata: {
            oldTier: client.tier,
            newTier: newTier,
          },
        });

        // Publish tier change event
        await this.publishEvent('vip.client.tier.updated', {
          clientId: savedClient.id,
          oldTier: client.tier,
          newTier: savedClient.tier,
          updatedBy,
        });

        return savedClient;
      },
      {
        domain: 'vip',
        operation: 'updateVipTier',
        entityId: clientId,
        userId: updatedBy,
      }
    );
  }

  // Private helper methods

  private async validateVipClientCreation(
    clientData: Omit<VipClient, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    // Check if user already has a VIP client
    const existingClient = await this.repository.findByUserId(clientData.userId);
    if (existingClient) {
      throw this.errorFactory.businessRuleViolation(
        'User already has a VIP client account',
        'unique_user_constraint'
      );
    }

    // Validate commission rate based on tier
    const validCommissionRates = {
      bronze: 0.01,
      silver: 0.02,
      gold: 0.03,
      platinum: 0.05,
    };

    const expectedRate = validCommissionRates[clientData.tier];
    if (clientData.commission !== expectedRate) {
      throw this.errorFactory.validationError(
        `Invalid commission rate for ${clientData.tier} tier. Expected: ${expectedRate}, got: ${clientData.commission}`,
        'commission',
        clientData.commission
      );
    }

    await this.logger.business('VIP client creation validation passed', {
      operation: 'validateVipClientCreation',
      userId: clientData.userId,
      tier: clientData.tier,
    });
  }

  private async validateTierTransition(
    currentTier: VipClient['tier'],
    newTier: VipClient['tier']
  ): Promise<void> {
    const tierHierarchy = ['bronze', 'silver', 'gold', 'platinum'];
    const currentIndex = tierHierarchy.indexOf(currentTier);
    const newIndex = tierHierarchy.indexOf(newTier);

    if (currentIndex === -1 || newIndex === -1) {
      throw this.errorFactory.validationError(
        `Invalid tier transition: ${currentTier} → ${newTier}`,
        'tier',
        newTier
      );
    }

    // Only allow upgrades, not downgrades
    if (newIndex < currentIndex) {
      throw this.errorFactory.businessRuleViolation(
        'VIP tier downgrades are not allowed',
        'no_downgrades_allowed'
      );
    }

    await this.logger.business('Tier transition validation passed', {
      operation: 'validateTierTransition',
      metadata: { currentTier, newTier },
    });
  }

  private applyCommissionRules(client: VipClient, betAmount: number): CommissionCalculation {
    // Apply tier-specific rules
    let effectiveRate = client.commission;
    let multiplier = 1.0;

    // Platinum clients get bonus multiplier
    if (client.tier === 'platinum') {
      multiplier = 1.1;
      effectiveRate = client.commission * multiplier;
    }

    // Gold clients get bonus on large bets
    if (client.tier === 'gold' && betAmount >= 1000) {
      multiplier = 1.05;
      effectiveRate = client.commission * multiplier;
    }

    const totalCommission = betAmount * effectiveRate;

    return {
      baseAmount: betAmount,
      commissionRate: client.commission,
      totalCommission,
      effectiveRate,
    };
  }

  private generateVipId(): string {
    return `vip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async publishEvent(eventType: string, payload: any): Promise<void> {
    // In a real implementation, this would use an event bus
    await this.logger.business(`Event published: ${eventType}`, {
      operation: 'publishEvent',
      metadata: { eventType, payload },
    });
  }
}

// Repository Interface (for dependency injection)
export interface VipRepository {
  save(client: VipClient): Promise<VipClient>;
  findById(id: string): Promise<VipClient | null>;
  findByUserId(userId: string): Promise<VipClient | null>;
  findAll(): Promise<VipClient[]>;
  delete(id: string): Promise<boolean>;
}

// Factory for creating VIP services
export class VipServiceFactory {
  static create(repository: VipRepository): VipService {
    return new VipService(repository);
  }
}
