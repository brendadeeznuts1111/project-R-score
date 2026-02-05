/**
 * 👥 Fire22 Dashboard - Customer Service
 * Business logic for customer management operations
 */

import { databaseService } from '../database/connection';
import type {
  Customer,
  CustomerAdminRequest,
  CustomerAdminResponse,
  CreateCustomerRequest,
  CreateCustomerResponse,
  CustomerSummary,
} from '../../types';
import CONSTANTS from '../../config/constants.js';

export class CustomerService {
  private static instance: CustomerService;

  private constructor() {}

  public static getInstance(): CustomerService {
    if (!CustomerService.instance) {
      CustomerService.instance = new CustomerService();
    }
    return CustomerService.instance;
  }

  /**
   * Get customer admin data for an agent
   */
  public async getCustomerAdmin(request: CustomerAdminRequest): Promise<CustomerAdminResponse> {
    try {
      const { agentID, includeBalances = true, includeStats = true, filters } = request;

      // Build base query
      let query = `
        SELECT 
          c.customer_id as CustomerID,
          '${agentID}' as AgentID,
          c.first_name as FirstName,
          c.last_name as LastName,
          c.username as Login,
          'Y' as Active,
          '${agentID}' as AgentLogin,
          NULL as AgentType,
          NULL as ParentAgent,
          '${agentID}' as MasterAgent,
          c.created_at as LastVerDateTime,
          '' as PlayerNotes
      `;

      if (includeBalances) {
        query += `,
          COALESCE(t.total_deposits, 0) as SportsBalance,
          0 as CasinoBalance,
          COALESCE(t.total_deposits, 0) as TotalBalance
        `;
      } else {
        query += `,
          0 as SportsBalance,
          0 as CasinoBalance,
          0 as TotalBalance
        `;
      }

      query += `
        FROM customers c
      `;

      if (includeBalances) {
        query += `
          LEFT JOIN (
            SELECT 
              customer_id,
              SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_deposits
            FROM transactions
            GROUP BY customer_id
          ) t ON c.customer_id = t.customer_id
        `;
      }

      // Add filters
      const conditions: string[] = [];
      const params: any[] = [];

      if (filters?.status) {
        conditions.push('c.status = ?');
        params.push(filters.status);
      }

      if (filters?.dateFrom) {
        conditions.push('c.created_at >= ?');
        params.push(filters.dateFrom);
      }

      if (filters?.dateTo) {
        conditions.push('c.created_at <= ?');
        params.push(filters.dateTo);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` ORDER BY c.customer_id`;

      const customers = await databaseService.executeQuery<CustomerSummary>(query, params);

      // Calculate summary statistics
      const totalCustomers = customers.length;
      const totalBalance = customers.reduce(
        (sum, customer) => sum + (customer.TotalBalance || 0),
        0
      );
      const activeCustomers = customers.filter(c => c.Active === 'Y').length;
      const inactiveCustomers = totalCustomers - activeCustomers;

      return {
        customers,
        totalCustomers,
        totalBalance,
        activeCustomers,
        inactiveCustomers,
      };
    } catch (error) {
      console.error('Customer admin service error:', error);
      throw new Error(`Failed to get customer admin data: ${error}`);
    }
  }

  /**
   * Create a new customer
   */
  public async createCustomer(request: CreateCustomerRequest): Promise<CreateCustomerResponse> {
    try {
      const {
        customerID,
        username,
        firstName,
        lastName,
        email,
        phone,
        agentID,
        initialBalance = 0,
        notes,
      } = request;

      // Validate customer doesn't exist
      const existingCustomer = await databaseService.executeQuerySingle<{ customer_id: string }>(
        'SELECT customer_id FROM customers WHERE customer_id = ?',
        [customerID]
      );

      if (existingCustomer) {
        throw new Error(`Customer ID ${customerID} already exists`);
      }

      // Validate username doesn't exist
      if (username) {
        const existingUsername = await databaseService.executeQuerySingle<{ username: string }>(
          'SELECT username FROM customers WHERE username = ?',
          [username]
        );

        if (existingUsername) {
          throw new Error(`Username ${username} already exists`);
        }
      }

      // Create customer in transaction
      const statements = [
        {
          sql: `
            INSERT INTO customers (customer_id, username, first_name, last_name, login)
            VALUES (?, ?, ?, ?, ?)
          `,
          params: [customerID, username, firstName, lastName, customerID],
        },
      ];

      // Add initial deposit if specified
      if (initialBalance > 0) {
        statements.push({
          sql: `
            INSERT INTO transactions (customer_id, amount, tran_type, short_desc, agent_id, entered_by)
            VALUES (?, ?, 'deposit', 'Initial deposit', ?, 'SYSTEM')
          `,
          params: [customerID, initialBalance, agentID],
        });
      }

      await databaseService.executeTransaction(statements);

      return {
        customerID,
        message: 'Customer created successfully',
        balance: initialBalance,
      };
    } catch (error) {
      console.error('Create customer service error:', error);
      throw new Error(`Failed to create customer: ${error}`);
    }
  }

  /**
   * Get customer by ID
   */
  public async getCustomerById(customerID: string): Promise<Customer | null> {
    try {
      const customer = await databaseService.executeQuerySingle<Customer>(
        'SELECT * FROM customers WHERE customer_id = ?',
        [customerID]
      );

      return customer;
    } catch (error) {
      console.error('Get customer by ID error:', error);
      throw new Error(`Failed to get customer: ${error}`);
    }
  }

  /**
   * Update customer information
   */
  public async updateCustomer(customerID: string, updates: Partial<Customer>): Promise<boolean> {
    try {
      const allowedFields = [
        'username',
        'first_name',
        'last_name',
        'email',
        'phone',
        'status',
        'notes',
      ];
      const updateFields: string[] = [];
      const params: any[] = [];

      // Build dynamic update query
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updateFields.push(`${key} = ?`);
          params.push(value);
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      params.push(customerID);

      const result = await databaseService.executeUpdate(
        `UPDATE customers SET ${updateFields.join(', ')} WHERE customer_id = ?`,
        params
      );

      return result.changes > 0;
    } catch (error) {
      console.error('Update customer error:', error);
      throw new Error(`Failed to update customer: ${error}`);
    }
  }

  /**
   * Get customer balance
   */
  public async getCustomerBalance(customerID: string): Promise<{
    totalBalance: number;
    deposits: number;
    withdrawals: number;
    wagers: number;
    wins: number;
  }> {
    try {
      const balanceData = await databaseService.executeQuerySingle<{
        total_deposits: number;
        total_withdrawals: number;
        total_wagers: number;
        total_wins: number;
      }>(
        `
        SELECT 
          COALESCE(SUM(CASE WHEN tran_type = 'deposit' THEN amount ELSE 0 END), 0) as total_deposits,
          COALESCE(SUM(CASE WHEN tran_type = 'withdrawal' THEN amount ELSE 0 END), 0) as total_withdrawals,
          COALESCE(SUM(CASE WHEN tran_type = 'wager' THEN ABS(amount) ELSE 0 END), 0) as total_wagers,
          COALESCE(SUM(CASE WHEN tran_type = 'win' THEN amount ELSE 0 END), 0) as total_wins
        FROM transactions 
        WHERE customer_id = ?
        `,
        [customerID]
      );

      if (!balanceData) {
        return {
          totalBalance: 0,
          deposits: 0,
          withdrawals: 0,
          wagers: 0,
          wins: 0,
        };
      }

      const deposits = balanceData.total_deposits || 0;
      const withdrawals = balanceData.total_withdrawals || 0;
      const wagers = balanceData.total_wagers || 0;
      const wins = balanceData.total_wins || 0;
      const totalBalance = deposits - withdrawals - wagers + wins;

      return {
        totalBalance,
        deposits,
        withdrawals,
        wagers,
        wins,
      };
    } catch (error) {
      console.error('Get customer balance error:', error);
      throw new Error(`Failed to get customer balance: ${error}`);
    }
  }

  /**
   * Search customers
   */
  public async searchCustomers(searchTerm: string, limit: number = 50): Promise<CustomerSummary[]> {
    try {
      const customers = await databaseService.executeQuery<CustomerSummary>(
        `
        SELECT 
          customer_id as CustomerID,
          first_name as FirstName,
          last_name as LastName,
          username as Login,
          'Y' as Active,
          created_at as LastVerDateTime
        FROM customers 
        WHERE 
          customer_id LIKE ? OR
          username LIKE ? OR
          first_name LIKE ? OR
          last_name LIKE ?
        ORDER BY customer_id
        LIMIT ?
        `,
        [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, limit]
      );

      return customers;
    } catch (error) {
      console.error('Search customers error:', error);
      throw new Error(`Failed to search customers: ${error}`);
    }
  }

  /**
   * Get customer hierarchy for an agent
   */
  public async getCustomerHierarchy(agentID: string): Promise<{
    agentID: string;
    customers: CustomerSummary[];
    totalCustomers: number;
  }> {
    try {
      const customers = await databaseService.executeQuery<CustomerSummary>(
        `
        SELECT 
          customer_id as CustomerID,
          first_name as FirstName,
          last_name as LastName,
          username as Login,
          'Y' as Active,
          created_at as LastVerDateTime
        FROM customers 
        ORDER BY customer_id
        `
      );

      return {
        agentID,
        customers,
        totalCustomers: customers.length,
      };
    } catch (error) {
      console.error('Get customer hierarchy error:', error);
      throw new Error(`Failed to get customer hierarchy: ${error}`);
    }
  }

  /**
   * Import multiple customers
   */
  public async importCustomers(customers: CreateCustomerRequest[]): Promise<{
    successful: number;
    failed: number;
    errors: string[];
  }> {
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const customerData of customers) {
      try {
        await this.createCustomer(customerData);
        successful++;
      } catch (error) {
        failed++;
        errors.push(`${customerData.customerID}: ${error}`);
      }
    }

    return {
      successful,
      failed,
      errors,
    };
  }
}

// Export singleton instance
export const customerService = CustomerService.getInstance();
export default customerService;
