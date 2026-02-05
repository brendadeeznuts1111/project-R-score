/**
 * VIP Controller
 * Domain-Driven Design Implementation
 *
 * API endpoints for VIP customer management
 */

import { VipService } from './services/vip-service';
import { VipCustomerRepository } from './repositories/vip-customer-repository';
import { VipTier, VipTierLevel } from './value-objects/vip-tier';
import { VipCustomer, VipStatus } from './entities/vip-customer';
import { DomainEvents } from '../shared/events/domain-events';
import { DomainError } from '../shared/domain-entity';

export class VipController {
  constructor(
    private vipService: VipService,
    private repository: VipCustomerRepository
  ) {}

  /**
   * Onboard a new VIP customer
   */
  async onboardVipCustomer(request: OnboardVipRequest): Promise<VipResponse<VipCustomerData>> {
    try {
      // Validate request
      if (!request.customerId || !request.initialTier) {
        throw new DomainError('Customer ID and initial tier are required', 'INVALID_REQUEST');
      }

      // Validate tier exists
      const initialTier = this.getTierByLevel(request.initialTier);
      if (!initialTier.getIsActive()) {
        throw new DomainError('Selected tier is not available', 'INVALID_TIER');
      }

      const vipCustomer = await this.vipService.onboardVipCustomer({
        customerId: request.customerId,
        initialTier: request.initialTier,
        stats: request.stats,
        accountManagerId: request.accountManagerId,
        communicationPreferences: request.communicationPreferences,
      });

      return {
        success: true,
        data: this.mapCustomerToData(vipCustomer),
        message: `VIP customer onboarded successfully with ${request.initialTier} tier`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof DomainError ? error.message : 'Internal server error',
        code: error instanceof DomainError ? error.code : 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Evaluate VIP qualification
   */
  async evaluateVipQualification(
    request: EvaluateVipRequest
  ): Promise<VipResponse<VipQualificationResult>> {
    try {
      if (!request.customerId) {
        throw new DomainError('Customer ID is required', 'INVALID_REQUEST');
      }

      const result = await this.vipService.evaluateVipQualification({
        customerId: request.customerId,
        stats: request.stats,
        requestedTier: request.requestedTier,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof DomainError ? error.message : 'Internal server error',
        code: error instanceof DomainError ? error.code : 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Upgrade VIP tier
   */
  async upgradeVipTier(request: UpgradeVipRequest): Promise<VipResponse<VipCustomerData>> {
    try {
      if (!request.customerId || !request.targetTier || !request.approvedBy) {
        throw new DomainError(
          'Customer ID, target tier, and approver are required',
          'INVALID_REQUEST'
        );
      }

      const vipCustomer = await this.vipService.processVipUpgrade({
        customerId: request.customerId,
        targetTier: request.targetTier,
        reason: request.reason || 'Tier upgrade request',
        approvedBy: request.approvedBy,
      });

      return {
        success: true,
        data: this.mapCustomerToData(vipCustomer),
        message: `VIP tier upgraded to ${request.targetTier}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof DomainError ? error.message : 'Internal server error',
        code: error instanceof DomainError ? error.code : 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Get VIP customer details
   */
  async getVipCustomer(customerId: string): Promise<VipResponse<VipCustomerData>> {
    try {
      const vipCustomer = await this.repository.findByCustomerId(customerId);
      if (!vipCustomer) {
        throw new DomainError('VIP customer not found', 'VIP_CUSTOMER_NOT_FOUND');
      }

      return {
        success: true,
        data: this.mapCustomerToData(vipCustomer),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof DomainError ? error.message : 'Internal server error',
        code: error instanceof DomainError ? error.code : 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Calculate VIP benefits
   */
  async calculateVipBenefits(
    request: CalculateBenefitsRequest
  ): Promise<VipResponse<VipBenefitsData>> {
    try {
      if (!request.customerId) {
        throw new DomainError('Customer ID is required', 'INVALID_REQUEST');
      }

      const benefits = await this.vipService.calculateVipBenefits(
        request.customerId,
        request.baseBalanceLimit || 10000
      );

      return {
        success: true,
        data: benefits,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof DomainError ? error.message : 'Internal server error',
        code: error instanceof DomainError ? error.code : 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Get VIP analytics
   */
  async getVipAnalytics(): Promise<VipResponse<VipAnalyticsData>> {
    try {
      const analytics = await this.repository.getAnalytics();

      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof DomainError ? error.message : 'Internal server error',
        code: error instanceof DomainError ? error.code : 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * List VIP customers with filtering
   */
  async listVipCustomers(
    request: ListVipCustomersRequest = {}
  ): Promise<VipResponse<VipCustomerListData>> {
    try {
      const customers = await this.repository.findByQuery({
        tier: request.tier,
        status: request.status,
        accountManagerId: request.accountManagerId,
        needsReview: request.needsReview,
        createdAfter: request.createdAfter,
        createdBefore: request.createdBefore,
      });

      const customerData = customers.map(customer => this.mapCustomerToData(customer));

      return {
        success: true,
        data: {
          customers: customerData,
          total: customerData.length,
          filters: request,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof DomainError ? error.message : 'Internal server error',
        code: error instanceof DomainError ? error.code : 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Update VIP customer communication preferences
   */
  async updateCommunicationPreferences(
    request: UpdateCommunicationRequest
  ): Promise<VipResponse<VipCustomerData>> {
    try {
      if (!request.customerId || !request.preferences) {
        throw new DomainError('Customer ID and preferences are required', 'INVALID_REQUEST');
      }

      const vipCustomer = await this.repository.findByCustomerId(request.customerId);
      if (!vipCustomer) {
        throw new DomainError('VIP customer not found', 'VIP_CUSTOMER_NOT_FOUND');
      }

      vipCustomer.updateCommunicationPreferences(request.preferences);
      await this.repository.save(vipCustomer);

      return {
        success: true,
        data: this.mapCustomerToData(vipCustomer),
        message: 'Communication preferences updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof DomainError ? error.message : 'Internal server error',
        code: error instanceof DomainError ? error.code : 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Assign account manager to VIP customer
   */
  async assignAccountManager(request: AssignManagerRequest): Promise<VipResponse<VipCustomerData>> {
    try {
      if (!request.customerId || !request.managerId || !request.assignedBy) {
        throw new DomainError(
          'Customer ID, manager ID, and assigner are required',
          'INVALID_REQUEST'
        );
      }

      const vipCustomer = await this.repository.findByCustomerId(request.customerId);
      if (!vipCustomer) {
        throw new DomainError('VIP customer not found', 'VIP_CUSTOMER_NOT_FOUND');
      }

      vipCustomer.assignAccountManager(request.managerId, request.assignedBy);
      await this.repository.save(vipCustomer);

      return {
        success: true,
        data: this.mapCustomerToData(vipCustomer),
        message: `Account manager assigned successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof DomainError ? error.message : 'Internal server error',
        code: error instanceof DomainError ? error.code : 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Process monthly VIP maintenance
   */
  async processMonthlyMaintenance(): Promise<VipResponse<MonthlyMaintenanceResult>> {
    try {
      const result = await this.vipService.processMonthlyVipMaintenance();

      return {
        success: true,
        data: result,
        message: 'Monthly VIP maintenance completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof DomainError ? error.message : 'Internal server error',
        code: error instanceof DomainError ? error.code : 'INTERNAL_ERROR',
      };
    }
  }

  // Helper methods
  private getTierByLevel(level: VipTierLevel): VipTier {
    const tierMap = {
      bronze: VipTier.bronze(),
      silver: VipTier.silver(),
      gold: VipTier.gold(),
      platinum: VipTier.platinum(),
      diamond: VipTier.diamond(),
    };
    return tierMap[level];
  }

  private mapCustomerToData(customer: VipCustomer): VipCustomerData {
    return {
      id: customer.getId(),
      customerId: customer.getCustomerId(),
      currentTier: {
        level: customer.getCurrentTier().getLevel(),
        name: customer.getCurrentTier().getName(),
        benefits: customer.getCurrentTier().getBenefits(),
      },
      status: customer.getStatus(),
      qualificationStatus: customer.getQualificationStatus(),
      stats: customer.getStats(),
      benefitsTracking: customer.getBenefitsTracking(),
      accountManagerId: customer.getAccountManagerId(),
      communicationPreferences: customer.getCommunicationPreferences(),
      upgradeHistory: customer.getUpgradeHistory(),
      reviewHistory: customer.getReviewHistory(),
      nextReviewDate: customer.getNextReviewDate(),
      createdAt: customer.getCreatedAt(),
      updatedAt: customer.getUpdatedAt(),
    };
  }
}

// Request/Response Types
export interface OnboardVipRequest {
  customerId: string;
  initialTier: VipTierLevel;
  stats: any; // Would use VipCustomerStats interface
  accountManagerId?: string;
  communicationPreferences?: any;
}

export interface EvaluateVipRequest {
  customerId: string;
  stats: any;
  requestedTier?: VipTierLevel;
}

export interface UpgradeVipRequest {
  customerId: string;
  targetTier: VipTierLevel;
  reason?: string;
  approvedBy: string;
}

export interface CalculateBenefitsRequest {
  customerId: string;
  baseBalanceLimit?: number;
}

export interface ListVipCustomersRequest {
  tier?: VipTierLevel;
  status?: VipStatus;
  accountManagerId?: string;
  needsReview?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface UpdateCommunicationRequest {
  customerId: string;
  preferences: any; // Would use VipCommunicationPreferences interface
}

export interface AssignManagerRequest {
  customerId: string;
  managerId: string;
  assignedBy: string;
}

export interface VipResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

export interface VipCustomerData {
  id: string;
  customerId: string;
  currentTier: {
    level: VipTierLevel;
    name: string;
    benefits: any;
  };
  status: VipStatus;
  qualificationStatus: string;
  stats: any;
  benefitsTracking: any;
  accountManagerId?: string;
  communicationPreferences: any;
  upgradeHistory: any[];
  reviewHistory: any[];
  nextReviewDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface VipQualificationResult {
  isEligible: boolean;
  recommendedTier: VipTierLevel;
  qualificationDetails: any;
  nextSteps: string[];
}

export interface VipBenefitsData {
  monthlyCashback: number;
  depositBonus: number;
  effectiveBalanceLimit: number;
  availableBenefits: string[];
}

export interface VipAnalyticsData {
  totalCustomers: number;
  activeCustomers: number;
  tierDistribution: Record<VipTierLevel, number>;
  averageStats: any;
  churnRate: number;
  upgradeRate: number;
}

export interface VipCustomerListData {
  customers: VipCustomerData[];
  total: number;
  filters: ListVipCustomersRequest;
}

export interface MonthlyMaintenanceResult {
  reviewsCompleted: number;
  upgradesProcessed: number;
  downgradesProcessed: number;
  suspensionsProcessed: number;
}
