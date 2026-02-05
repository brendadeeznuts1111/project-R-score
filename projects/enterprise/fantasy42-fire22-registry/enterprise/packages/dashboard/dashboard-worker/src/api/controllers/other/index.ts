/**
 * Other Operations Controllers
 * Consolidated exports for all other controller operations
 */

// Customer Operations
export {
  getCustomerProfile,
  updateCustomer,
  getCustomerActivity,
  getCustomerPreferences,
  updateCustomerPreferences,
} from './customer-operations.controller';

// Financial Operations
export {
  processPayment,
  processTransfer,
  getTransactionHistory,
  getPaymentMethods,
  updatePaymentMethod,
} from './financial-operations.controller';

// Re-export from original file (temporarily during migration)
export {
  settlementHistory,
  customerSearch,
  systemStatus,
  telegramOperations,
  validationEndpoint,
  utilityFunctions,
  maintenanceOperations,
} from '../other.controller';

// Future modules to be created:
// export * from './reporting.controller';
// export * from './system-operations.controller';
// export * from './telegram-operations.controller';
// export * from './validation.controller';
