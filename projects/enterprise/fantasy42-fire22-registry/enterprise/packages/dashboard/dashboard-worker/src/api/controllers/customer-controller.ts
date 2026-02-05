/**
 * 🎮 Fire22 Dashboard - Customer Controller
 * HTTP request handlers for customer-related endpoints
 */

import type { Request, Response } from 'express';
import { customerService } from '../../services/customer/customer-service';
import type { ApiResponse, CustomerAdminRequest, CreateCustomerRequest } from '../../types';
import { validateApiKey, validateAgentId } from '../middleware/auth';
import { validateRequest } from '../validators/customer-validator';

export class CustomerController {
  /**
   * GET /api/manager/getCustomerAdmin
   * Get customer list for agent management
   */
  public static async getCustomerAdmin(req: Request, res: Response): Promise<void> {
    try {
      // Validate API key
      const apiKeyValid = validateApiKey(req);
      if (!apiKeyValid) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or missing API key',
        } as ApiResponse);
        return;
      }

      // Extract and validate request data
      const requestData: CustomerAdminRequest = {
        agentID: req.body.agentID || 'BLAKEPPH',
        includeBalances: req.body.includeBalances !== false,
        includeStats: req.body.includeStats !== false,
        filters: req.body.filters,
      };

      // Validate agent ID
      if (!validateAgentId(requestData.agentID)) {
        res.status(400).json({
          success: false,
          error: 'Invalid agent ID',
          message: 'Agent ID is required and must be valid',
        } as ApiResponse);
        return;
      }

      // Get customer data from service
      const customerData = await customerService.getCustomerAdmin(requestData);

      res.json({
        success: true,
        data: customerData,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      console.error('Customer admin controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      } as ApiResponse);
    }
  }

  /**
   * POST /api/admin/create-customer
   * Create a new customer
   */
  public static async createCustomer(req: Request, res: Response): Promise<void> {
    try {
      // Validate API key
      const apiKeyValid = validateApiKey(req);
      if (!apiKeyValid) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or missing API key',
        } as ApiResponse);
        return;
      }

      // Validate request data
      const validationResult = validateRequest(req.body, 'createCustomer');
      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: validationResult.errors.join(', '),
        } as ApiResponse);
        return;
      }

      const requestData: CreateCustomerRequest = req.body;

      // Create customer via service
      const result = await customerService.createCustomer(requestData);

      res.status(201).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      console.error('Create customer controller error:', error);

      // Handle specific business logic errors
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: 'Conflict',
          message: error.message,
        } as ApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      } as ApiResponse);
    }
  }

  /**
   * GET /api/customer/getHierarchy
   * Get customer hierarchy for an agent
   */
  public static async getCustomerHierarchy(req: Request, res: Response): Promise<void> {
    try {
      // Validate API key
      const apiKeyValid = validateApiKey(req);
      if (!apiKeyValid) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or missing API key',
        } as ApiResponse);
        return;
      }

      const agentID = req.body.agentID || req.query.agentID || 'BLAKEPPH';

      // Validate agent ID
      if (!validateAgentId(agentID as string)) {
        res.status(400).json({
          success: false,
          error: 'Invalid agent ID',
          message: 'Agent ID is required and must be valid',
        } as ApiResponse);
        return;
      }

      // Get hierarchy data from service
      const hierarchyData = await customerService.getCustomerHierarchy(agentID as string);

      res.json({
        success: true,
        data: hierarchyData,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      console.error('Customer hierarchy controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      } as ApiResponse);
    }
  }

  /**
   * POST /api/admin/import-customers
   * Import multiple customers
   */
  public static async importCustomers(req: Request, res: Response): Promise<void> {
    try {
      // Validate API key
      const apiKeyValid = validateApiKey(req);
      if (!apiKeyValid) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or missing API key',
        } as ApiResponse);
        return;
      }

      const { customers } = req.body;

      if (!Array.isArray(customers) || customers.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'Customers array is required and must not be empty',
        } as ApiResponse);
        return;
      }

      // Validate each customer
      for (let i = 0; i < customers.length; i++) {
        const validationResult = validateRequest(customers[i], 'createCustomer');
        if (!validationResult.isValid) {
          res.status(400).json({
            success: false,
            error: 'Validation failed',
            message: `Customer ${i + 1}: ${validationResult.errors.join(', ')}`,
          } as ApiResponse);
          return;
        }
      }

      // Import customers via service
      const result = await customerService.importCustomers(customers);

      const statusCode = result.failed > 0 ? 207 : 200; // 207 Multi-Status if some failed

      res.status(statusCode).json({
        success: result.failed === 0,
        data: result,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      console.error('Import customers controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      } as ApiResponse);
    }
  }

  /**
   * GET /api/customer/:customerID
   * Get customer by ID
   */
  public static async getCustomerById(req: Request, res: Response): Promise<void> {
    try {
      // Validate API key
      const apiKeyValid = validateApiKey(req);
      if (!apiKeyValid) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or missing API key',
        } as ApiResponse);
        return;
      }

      const { customerID } = req.params;

      if (!customerID) {
        res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'Customer ID is required',
        } as ApiResponse);
        return;
      }

      // Get customer from service
      const customer = await customerService.getCustomerById(customerID);

      if (!customer) {
        res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Customer not found',
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: customer,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      console.error('Get customer by ID controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      } as ApiResponse);
    }
  }

  /**
   * GET /api/customer/:customerID/balance
   * Get customer balance
   */
  public static async getCustomerBalance(req: Request, res: Response): Promise<void> {
    try {
      // Validate API key
      const apiKeyValid = validateApiKey(req);
      if (!apiKeyValid) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or missing API key',
        } as ApiResponse);
        return;
      }

      const { customerID } = req.params;

      if (!customerID) {
        res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'Customer ID is required',
        } as ApiResponse);
        return;
      }

      // Get balance from service
      const balance = await customerService.getCustomerBalance(customerID);

      res.json({
        success: true,
        data: balance,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    } catch (error) {
      console.error('Get customer balance controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      } as ApiResponse);
    }
  }
}

export default CustomerController;
