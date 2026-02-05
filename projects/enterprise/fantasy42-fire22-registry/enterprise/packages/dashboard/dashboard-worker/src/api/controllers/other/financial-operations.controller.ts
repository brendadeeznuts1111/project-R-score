/**
 * Financial Operations Controller
 * Handles payment processing, transfers, and financial transactions
 */

import type { ValidatedRequest } from '../../middleware/validate.middleware';
import { CashierService } from '../../../services/cashier-service';

const cashierService = new CashierService();

/**
 * Process payment
 */
export async function processPayment(request: ValidatedRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { customerId, amount, paymentMethod, description } = body;

    if (!customerId || !amount || !paymentMethod) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Customer ID, amount, and payment method are required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await cashierService.processPayment({
      customerId,
      amount: parseFloat(amount),
      paymentMethod,
      description: description || 'Payment processing',
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing payment:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to process payment',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Process transfer between customers
 */
export async function processTransfer(request: ValidatedRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { fromCustomerId, toCustomerId, amount, description } = body;

    if (!fromCustomerId || !toCustomerId || !amount) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'From customer ID, to customer ID, and amount are required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await cashierService.processTransfer({
      fromCustomerId,
      toCustomerId,
      amount: parseFloat(amount),
      description: description || 'Customer transfer',
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing transfer:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to process transfer',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Get transaction history
 */
export async function getTransactionHistory(request: ValidatedRequest): Promise<Response> {
  try {
    const url = new URL(request.url);
    const customerId = url.searchParams.get('customerId');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!customerId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Customer ID is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const transactions = await cashierService.getTransactionHistory(customerId, limit, offset);

    return new Response(
      JSON.stringify({
        success: true,
        data: transactions,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error getting transaction history:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to get transaction history',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Get payment methods for customer
 */
export async function getPaymentMethods(request: ValidatedRequest): Promise<Response> {
  try {
    const url = new URL(request.url);
    const customerId = url.searchParams.get('customerId');

    if (!customerId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Customer ID is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const methods = await cashierService.getPaymentMethods(customerId);

    return new Response(
      JSON.stringify({
        success: true,
        data: methods,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error getting payment methods:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to get payment methods',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Update payment method
 */
export async function updatePaymentMethod(request: ValidatedRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { customerId, paymentMethodId, updates } = body;

    if (!customerId || !paymentMethodId || !updates) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Customer ID, payment method ID, and updates are required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await cashierService.updatePaymentMethod(customerId, paymentMethodId, updates);

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error updating payment method:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to update payment method',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
