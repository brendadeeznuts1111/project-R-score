/**
 * ✅ Fire22 Dashboard - Customer Validation
 * Input validation for customer-related requests
 */

import CONSTANTS from '../../config/constants.js';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate customer creation request
 */
export function validateCreateCustomerRequest(data: any): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!data.customerID) {
    errors.push('Customer ID is required');
  } else if (typeof data.customerID !== 'string') {
    errors.push('Customer ID must be a string');
  } else if (data.customerID.length < CONSTANTS.VALIDATION.CUSTOMER_ID.MIN_LENGTH) {
    errors.push(
      `Customer ID must be at least ${CONSTANTS.VALIDATION.CUSTOMER_ID.MIN_LENGTH} characters`
    );
  } else if (data.customerID.length > CONSTANTS.VALIDATION.CUSTOMER_ID.MAX_LENGTH) {
    errors.push(
      `Customer ID must be no more than ${CONSTANTS.VALIDATION.CUSTOMER_ID.MAX_LENGTH} characters`
    );
  } else if (!CONSTANTS.VALIDATION.CUSTOMER_ID.PATTERN.test(data.customerID)) {
    errors.push('Customer ID must contain only uppercase letters and numbers');
  }

  if (!data.username) {
    errors.push('Username is required');
  } else if (typeof data.username !== 'string') {
    errors.push('Username must be a string');
  } else if (data.username.length < 3) {
    errors.push('Username must be at least 3 characters');
  } else if (data.username.length > 50) {
    errors.push('Username must be no more than 50 characters');
  }

  if (!data.firstName) {
    errors.push('First name is required');
  } else if (typeof data.firstName !== 'string') {
    errors.push('First name must be a string');
  } else if (data.firstName.length < 1) {
    errors.push('First name cannot be empty');
  } else if (data.firstName.length > 100) {
    errors.push('First name must be no more than 100 characters');
  }

  if (!data.lastName) {
    errors.push('Last name is required');
  } else if (typeof data.lastName !== 'string') {
    errors.push('Last name must be a string');
  } else if (data.lastName.length < 1) {
    errors.push('Last name cannot be empty');
  } else if (data.lastName.length > 100) {
    errors.push('Last name must be no more than 100 characters');
  }

  // Optional fields validation
  if (data.email && typeof data.email === 'string') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push('Email must be a valid email address');
    }
  }

  if (data.phone && typeof data.phone === 'string') {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(data.phone)) {
      errors.push('Phone must be a valid phone number');
    }
  }

  if (data.agentID && typeof data.agentID !== 'string') {
    errors.push('Agent ID must be a string');
  }

  if (data.initialBalance !== undefined) {
    if (typeof data.initialBalance !== 'number') {
      errors.push('Initial balance must be a number');
    } else if (data.initialBalance < 0) {
      errors.push('Initial balance cannot be negative');
    } else if (data.initialBalance > 1000000) {
      errors.push('Initial balance cannot exceed $1,000,000');
    }
  }

  if (data.notes && typeof data.notes !== 'string') {
    errors.push('Notes must be a string');
  } else if (data.notes && data.notes.length > 1000) {
    errors.push('Notes must be no more than 1000 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate customer admin request
 */
export function validateCustomerAdminRequest(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data.agentID) {
    errors.push('Agent ID is required');
  } else if (typeof data.agentID !== 'string') {
    errors.push('Agent ID must be a string');
  }

  if (data.includeBalances !== undefined && typeof data.includeBalances !== 'boolean') {
    errors.push('includeBalances must be a boolean');
  }

  if (data.includeStats !== undefined && typeof data.includeStats !== 'boolean') {
    errors.push('includeStats must be a boolean');
  }

  if (data.filters) {
    if (typeof data.filters !== 'object') {
      errors.push('Filters must be an object');
    } else {
      if (data.filters.status && typeof data.filters.status !== 'string') {
        errors.push('Filter status must be a string');
      }

      if (data.filters.dateFrom && typeof data.filters.dateFrom !== 'string') {
        errors.push('Filter dateFrom must be a string');
      } else if (data.filters.dateFrom && !isValidDate(data.filters.dateFrom)) {
        errors.push('Filter dateFrom must be a valid date');
      }

      if (data.filters.dateTo && typeof data.filters.dateTo !== 'string') {
        errors.push('Filter dateTo must be a string');
      } else if (data.filters.dateTo && !isValidDate(data.filters.dateTo)) {
        errors.push('Filter dateTo must be a valid date');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate deposit request
 */
export function validateDepositRequest(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data.customerID) {
    errors.push('Customer ID is required');
  } else if (typeof data.customerID !== 'string') {
    errors.push('Customer ID must be a string');
  }

  if (!data.amount) {
    errors.push('Amount is required');
  } else if (typeof data.amount !== 'number') {
    errors.push('Amount must be a number');
  } else if (data.amount < CONSTANTS.VALIDATION.AMOUNT.MIN) {
    errors.push(`Amount must be at least $${CONSTANTS.VALIDATION.AMOUNT.MIN}`);
  } else if (data.amount > CONSTANTS.VALIDATION.AMOUNT.MAX) {
    errors.push(`Amount cannot exceed $${CONSTANTS.VALIDATION.AMOUNT.MAX}`);
  }

  if (data.method && typeof data.method !== 'string') {
    errors.push('Method must be a string');
  } else if (data.method) {
    const validMethods = ['cash', 'check', 'wire', 'card', 'crypto'];
    if (!validMethods.includes(data.method)) {
      errors.push(`Method must be one of: ${validMethods.join(', ')}`);
    }
  }

  if (data.notes && typeof data.notes !== 'string') {
    errors.push('Notes must be a string');
  } else if (data.notes && data.notes.length > 500) {
    errors.push('Notes must be no more than 500 characters');
  }

  if (data.reference && typeof data.reference !== 'string') {
    errors.push('Reference must be a string');
  } else if (data.reference && data.reference.length > 100) {
    errors.push('Reference must be no more than 100 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate agent performance request
 */
export function validateAgentPerformanceRequest(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data.agentID) {
    errors.push('Agent ID is required');
  } else if (typeof data.agentID !== 'string') {
    errors.push('Agent ID must be a string');
  }

  if (data.date && typeof data.date !== 'string') {
    errors.push('Date must be a string');
  } else if (data.date && !isValidDate(data.date)) {
    errors.push('Date must be a valid date');
  }

  if (data.period && typeof data.period !== 'string') {
    errors.push('Period must be a string');
  } else if (data.period) {
    const validPeriods = ['day', 'week', 'month', 'year'];
    if (!validPeriods.includes(data.period)) {
      errors.push(`Period must be one of: ${validPeriods.join(', ')}`);
    }
  }

  if (data.includeSubAgents !== undefined && typeof data.includeSubAgents !== 'boolean') {
    errors.push('includeSubAgents must be a boolean');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate live wagers request
 */
export function validateLiveWagersRequest(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data.agentID) {
    errors.push('Agent ID is required');
  } else if (typeof data.agentID !== 'string') {
    errors.push('Agent ID must be a string');
  }

  if (data.sport && typeof data.sport !== 'string') {
    errors.push('Sport must be a string');
  }

  if (data.status && typeof data.status !== 'string') {
    errors.push('Status must be a string');
  }

  if (data.dateFrom && typeof data.dateFrom !== 'string') {
    errors.push('dateFrom must be a string');
  } else if (data.dateFrom && !isValidDate(data.dateFrom)) {
    errors.push('dateFrom must be a valid date');
  }

  if (data.dateTo && typeof data.dateTo !== 'string') {
    errors.push('dateTo must be a string');
  } else if (data.dateTo && !isValidDate(data.dateTo)) {
    errors.push('dateTo must be a valid date');
  }

  if (data.limit !== undefined) {
    if (typeof data.limit !== 'number') {
      errors.push('Limit must be a number');
    } else if (data.limit < 1) {
      errors.push('Limit must be at least 1');
    } else if (data.limit > 1000) {
      errors.push('Limit cannot exceed 1000');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Helper function to validate date strings
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Main validation function that routes to specific validators
 */
export function validateRequest(data: any, requestType: string): ValidationResult {
  switch (requestType) {
    case 'createCustomer':
      return validateCreateCustomerRequest(data);
    case 'customerAdmin':
      return validateCustomerAdminRequest(data);
    case 'deposit':
      return validateDepositRequest(data);
    case 'agentPerformance':
      return validateAgentPerformanceRequest(data);
    case 'liveWagers':
      return validateLiveWagersRequest(data);
    default:
      return {
        isValid: false,
        errors: [`Unknown request type: ${requestType}`],
      };
  }
}

export default {
  validateRequest,
  validateCreateCustomerRequest,
  validateCustomerAdminRequest,
  validateDepositRequest,
  validateAgentPerformanceRequest,
  validateLiveWagersRequest,
};
