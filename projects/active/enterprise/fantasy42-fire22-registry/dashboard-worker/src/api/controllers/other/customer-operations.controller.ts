/**
 * Customer Operations Controller
 * Handles customer-related operations and data management
 */

import type { ValidatedRequest } from '../../middleware/validate.middleware';
import { CustomerService } from '../../../services/customer-information-service';

const customerService = new CustomerService();

/**
 * Get customer profile information
 */
export async function getCustomerProfile(request: ValidatedRequest): Promise<Response> {
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

    const profile = await customerService.getCustomerProfile(customerId);

    return new Response(
      JSON.stringify({
        success: true,
        data: profile,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error getting customer profile:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to get customer profile',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Update customer information
 */
export async function updateCustomer(request: ValidatedRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { customerId, updates } = body;

    if (!customerId || !updates) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Customer ID and updates are required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await customerService.updateCustomer(customerId, updates);

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
    console.error('Error updating customer:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to update customer',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Get customer activity history
 */
export async function getCustomerActivity(request: ValidatedRequest): Promise<Response> {
  try {
    const url = new URL(request.url);
    const customerId = url.searchParams.get('customerId');
    const limit = parseInt(url.searchParams.get('limit') || '50');

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

    const activity = await customerService.getCustomerActivity(customerId, limit);

    return new Response(
      JSON.stringify({
        success: true,
        data: activity,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error getting customer activity:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to get customer activity',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Get customer preferences
 */
export async function getCustomerPreferences(request: ValidatedRequest): Promise<Response> {
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

    const preferences = await customerService.getCustomerPreferences(customerId);

    return new Response(
      JSON.stringify({
        success: true,
        data: preferences,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error getting customer preferences:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to get customer preferences',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Update customer preferences
 */
export async function updateCustomerPreferences(request: ValidatedRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { customerId, preferences } = body;

    if (!customerId || !preferences) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Customer ID and preferences are required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await customerService.updateCustomerPreferences(customerId, preferences);

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
    console.error('Error updating customer preferences:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to update customer preferences',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
