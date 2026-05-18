/**
 * 🔥 Fire22 Dynamic Configuration API Controller
 * RESTful API to manage all configurable settings
 */

import { Request, Response } from 'express';
import {
  DynamicConfigManager,
  ConfigurableFeeService,
  DynamicFeeConfig,
} from '../../config/dynamic-config';

export class ConfigController {
  private configManager = DynamicConfigManager.getInstance();
  private feeService = new ConfigurableFeeService();

  /**
   * GET /api/config/fees
   * Get all fee configurations
   */
  public getFeeConfigurations = async (req: Request, res: Response) => {
    try {
      const fees = Array.from((this.configManager as any).feeConfigs.values());

      res.json({
        success: true,
        data: fees,
        count: fees.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve fee configurations',
        details: error.message,
      });
    }
  };

  /**
   * POST /api/config/fees
   * Create new fee configuration
   */
  public createFeeConfiguration = async (req: Request, res: Response) => {
    try {
      const {
        name,
        description,
        basePercentage,
        fixedFeePerUnit,
        unitSize = 1000,
        minAmount,
        maxAmount,
        customerTypes,
        paymentMethods,
        transactionTypes,
        volumeTiers,
        enabled = true,
      } = req.body;

      // Validation
      if (!name || !description) {
        return res.status(400).json({
          success: false,
          error: 'Name and description are required',
        });
      }

      if (basePercentage < 0 || basePercentage > 1) {
        return res.status(400).json({
          success: false,
          error: 'Base percentage must be between 0 and 1 (0% to 100%)',
        });
      }

      const feeConfig = this.feeService.createFeeConfiguration(
        name,
        description,
        basePercentage,
        fixedFeePerUnit,
        unitSize,
        {
          minAmount,
          maxAmount,
          customerTypes,
          paymentMethods,
          transactionTypes,
          volumeTiers,
          enabled,
        }
      );

      res.status(201).json({
        success: true,
        data: feeConfig,
        message: 'Fee configuration created successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create fee configuration',
        details: error.message,
      });
    }
  };

  /**
   * PUT /api/config/fees/:id
   * Update existing fee configuration
   */
  public updateFeeConfiguration = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedBy = req.body.updatedBy || 'api';

      const updatedConfig = this.feeService.updateFeeConfiguration(id, updates, updatedBy);

      res.json({
        success: true,
        data: updatedConfig,
        message: 'Fee configuration updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update fee configuration',
        details: error.message,
      });
    }
  };

  /**
   * POST /api/config/fees/calculate
   * Calculate fees for a given transaction
   */
  public calculateTransactionFee = async (req: Request, res: Response) => {
    try {
      const {
        amount,
        customerType = 'standard',
        paymentMethod = 'bank_transfer',
        transactionType = 'p2p_transfer',
        customerVolume,
      } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid amount is required',
        });
      }

      const feeCalculation = this.configManager.calculateTransactionFee({
        amount,
        customerType,
        paymentMethod,
        transactionType,
        customerVolume,
      });

      res.json({
        success: true,
        data: {
          originalAmount: amount,
          totalFee: feeCalculation.totalFee,
          netAmount: feeCalculation.netAmount,
          feePercentage: ((feeCalculation.totalFee / amount) * 100).toFixed(2),
          breakdown: feeCalculation.breakdown,
          appliedConfigs: feeCalculation.appliedConfigs,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to calculate transaction fee',
        details: error.message,
      });
    }
  };

  /**
   * GET /api/config/system
   * Get system configuration values
   */
  public getSystemConfigs = async (req: Request, res: Response) => {
    try {
      const { category, publicOnly } = req.query;

      const configs = Array.from((this.configManager as any).systemConfigs.values()).filter(
        config => {
          if (category && config.category !== category) return false;
          if (publicOnly === 'true' && !config.isPublic) return false;
          return true;
        }
      );

      res.json({
        success: true,
        data: configs,
        count: configs.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system configurations',
        details: error.message,
      });
    }
  };

  /**
   * PUT /api/config/system/:key
   * Update system configuration value
   */
  public updateSystemConfig = async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const { value, updatedBy = 'api' } = req.body;

      this.configManager.setSystemConfig(key, value, updatedBy);

      res.json({
        success: true,
        message: `System configuration '${key}' updated successfully`,
        data: {
          key,
          value,
          updatedBy,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update system configuration',
        details: error.message,
      });
    }
  };

  /**
   * POST /api/config/fees/bulk-calculate
   * Calculate fees for multiple scenarios at once
   */
  public bulkCalculateTransactionFees = async (req: Request, res: Response) => {
    try {
      const { scenarios } = req.body;

      if (!Array.isArray(scenarios)) {
        return res.status(400).json({
          success: false,
          error: 'Scenarios must be an array',
        });
      }

      const results = scenarios.map((scenario, index) => {
        try {
          const calculation = this.configManager.calculateTransactionFee(scenario);
          return {
            scenario: index + 1,
            input: scenario,
            result: calculation,
            success: true,
          };
        } catch (error) {
          return {
            scenario: index + 1,
            input: scenario,
            error: error.message,
            success: false,
          };
        }
      });

      res.json({
        success: true,
        data: results,
        summary: {
          total: scenarios.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to calculate bulk transaction fees',
        details: error.message,
      });
    }
  };

  /**
   * GET /api/config/fees/preview/:amount
   * Preview fees for different customer types and payment methods
   */
  public previewFeesForAmount = async (req: Request, res: Response) => {
    try {
      const amount = parseFloat(req.params.amount);

      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid amount is required',
        });
      }

      const customerTypes = ['new', 'postup', 'credit', 'vip', 'risky'];
      const paymentMethods = ['bank_transfer', 'paypal', 'cashapp', 'crypto_btc'];
      const transactionTypes = ['deposit', 'withdrawal', 'p2p_transfer'];

      const preview = {};

      for (const transactionType of transactionTypes) {
        preview[transactionType] = {};

        for (const customerType of customerTypes) {
          preview[transactionType][customerType] = {};

          for (const paymentMethod of paymentMethods) {
            try {
              const calculation = this.configManager.calculateTransactionFee({
                amount,
                customerType,
                paymentMethod,
                transactionType: transactionType as any,
              });

              preview[transactionType][customerType][paymentMethod] = {
                totalFee: calculation.totalFee,
                netAmount: calculation.netAmount,
                feePercentage: ((calculation.totalFee / amount) * 100).toFixed(2),
                appliedConfigCount: calculation.appliedConfigs.length,
              };
            } catch (error) {
              preview[transactionType][customerType][paymentMethod] = {
                error: error.message,
              };
            }
          }
        }
      }

      res.json({
        success: true,
        data: {
          amount,
          preview,
          generatedAt: new Date(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to generate fee preview',
        details: error.message,
      });
    }
  };

  /**
   * POST /api/config/fees/test-scenario
   * Test a specific fee scenario with detailed breakdown
   */
  public testFeeScenario = async (req: Request, res: Response) => {
    try {
      const scenario = req.body;

      // Example scenarios for testing
      const testScenarios = [
        {
          name: 'Your Example: $3000 P2P Transfer',
          params: {
            amount: 3000,
            customerType: 'standard',
            paymentMethod: 'bank_transfer',
            transactionType: 'p2p_transfer',
          },
        },
        {
          name: 'VIP Customer $5000 Deposit',
          params: {
            amount: 5000,
            customerType: 'vip',
            paymentMethod: 'wire_transfer',
            transactionType: 'deposit',
          },
        },
        {
          name: 'Risky Customer $500 Withdrawal',
          params: {
            amount: 500,
            customerType: 'risky',
            paymentMethod: 'paypal',
            transactionType: 'withdrawal',
          },
        },
      ];

      if (scenario.amount) {
        // Test custom scenario
        const result = this.configManager.calculateTransactionFee(scenario);

        return res.json({
          success: true,
          data: {
            scenario: 'Custom Scenario',
            input: scenario,
            result,
            details: {
              originalAmount: scenario.amount,
              totalFee: result.totalFee,
              netAmount: result.netAmount,
              effectiveFeeRate: `${((result.totalFee / scenario.amount) * 100).toFixed(2)}%`,
              breakdown: result.breakdown,
            },
          },
        });
      }

      // Test all predefined scenarios
      const results = testScenarios.map(test => {
        const result = this.configManager.calculateTransactionFee(test.params);

        return {
          name: test.name,
          input: test.params,
          result: {
            totalFee: result.totalFee,
            netAmount: result.netAmount,
            feePercentage: ((result.totalFee / test.params.amount) * 100).toFixed(2),
            breakdown: result.breakdown,
          },
        };
      });

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to test fee scenario',
        details: error.message,
      });
    }
  };
}

export default new ConfigController();
