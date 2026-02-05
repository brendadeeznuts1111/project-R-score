/**
 * Customer Interface Core Types
 * Shared types and interfaces for customer interface modules
 */

import type {
  CustomerProfile,
  CustomerSearchFilters,
} from '../../services/customer-information-service';

export interface CustomerInterfaceOptions {
  container: HTMLElement;
  enableSearch?: boolean;
  enableCreate?: boolean;
  enableEdit?: boolean;
  enableDelete?: boolean;
  enableExport?: boolean;
  enableRealTimeUpdates?: boolean;
  maxSearchResults?: number;
  defaultView?: 'list' | 'grid' | 'table';
  itemsPerPage?: number;
  enableBulkOperations?: boolean;
  enableAdvancedFilters?: boolean;
  enableQuickActions?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
}

export interface CustomerInterfaceState {
  currentView: CustomerView;
  selectedCustomer: CustomerProfile | null;
  searchResults: CustomerProfile[];
  searchFilters: CustomerSearchFilters;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  lastUpdated: Date;
  hasUnsavedChanges: boolean;
}

export type CustomerView =
  | 'dashboard'
  | 'list'
  | 'search'
  | 'create'
  | 'edit'
  | 'profile'
  | 'export';

export interface CustomerAction {
  type: string;
  payload?: any;
  target?: HTMLElement;
  event?: Event;
}

export interface CustomerInterfaceEvent {
  type:
    | 'view-changed'
    | 'customer-selected'
    | 'customer-updated'
    | 'search-performed'
    | 'form-submitted'
    | 'error-occurred';
  data?: any;
  timestamp: Date;
}

export interface CustomerFormData {
  customerId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  preferences: {
    language: string;
    currency: string;
    notifications: boolean;
    marketingEmails: boolean;
  };
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  vipTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  notes?: string;
}

export interface CustomerValidationResult {
  isValid: boolean;
  errors: CustomerValidationError[];
  warnings: CustomerValidationWarning[];
}

export interface CustomerValidationError {
  field: string;
  code: string;
  message: string;
}

export interface CustomerValidationWarning {
  field: string;
  code: string;
  message: string;
}

export interface CustomerSearchOptions {
  query: string;
  filters: CustomerSearchFilters;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface CustomerExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  fields: string[];
  includeRelatedData: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: CustomerSearchFilters;
}

export interface CustomerPaginationOptions {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CustomerQuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  requiresSelection: boolean;
  requiresConfirmation: boolean;
  permission?: string;
}

export interface CustomerBulkOperation {
  id: string;
  label: string;
  description: string;
  action: string;
  requiresConfirmation: boolean;
  maxItems?: number;
  supportedViews: CustomerView[];
}

export interface CustomerNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    callback: () => void;
  };
}

// Utility types for internal use
export type CustomerFormMode = 'create' | 'edit' | 'view';
export type CustomerDisplayMode = 'list' | 'grid' | 'table';
export type CustomerSortField =
  | 'name'
  | 'email'
  | 'createdAt'
  | 'lastLogin'
  | 'balance'
  | 'vipTier';
export type CustomerFilterType = 'text' | 'select' | 'date' | 'number' | 'boolean';

// Export default configuration
export const DEFAULT_CUSTOMER_INTERFACE_OPTIONS: Partial<CustomerInterfaceOptions> = {
  enableSearch: true,
  enableCreate: true,
  enableEdit: true,
  enableDelete: false,
  enableExport: true,
  enableRealTimeUpdates: true,
  maxSearchResults: 100,
  defaultView: 'list',
  itemsPerPage: 25,
  enableBulkOperations: true,
  enableAdvancedFilters: true,
  enableQuickActions: true,
  theme: 'auto',
  language: 'en',
};

export const DEFAULT_CUSTOMER_QUICK_ACTIONS: CustomerQuickAction[] = [
  {
    id: 'view-profile',
    label: 'View Profile',
    icon: 'user',
    action: 'view-customer',
    requiresSelection: true,
    requiresConfirmation: false,
  },
  {
    id: 'edit-customer',
    label: 'Edit Customer',
    icon: 'edit',
    action: 'edit-customer',
    requiresSelection: true,
    requiresConfirmation: false,
  },
  {
    id: 'view-transactions',
    label: 'View Transactions',
    icon: 'credit-card',
    action: 'view-transactions',
    requiresSelection: true,
    requiresConfirmation: false,
  },
  {
    id: 'send-message',
    label: 'Send Message',
    icon: 'message',
    action: 'send-message',
    requiresSelection: true,
    requiresConfirmation: false,
  },
];

export const DEFAULT_CUSTOMER_BULK_OPERATIONS: CustomerBulkOperation[] = [
  {
    id: 'bulk-export',
    label: 'Export Selected',
    description: 'Export selected customers to file',
    action: 'bulk-export',
    requiresConfirmation: false,
    maxItems: 1000,
    supportedViews: ['list', 'search'],
  },
  {
    id: 'bulk-status-update',
    label: 'Update Status',
    description: 'Change status for selected customers',
    action: 'bulk-status-update',
    requiresConfirmation: true,
    maxItems: 100,
    supportedViews: ['list', 'search'],
  },
  {
    id: 'bulk-delete',
    label: 'Delete Customers',
    description: 'Permanently delete selected customers',
    action: 'bulk-delete',
    requiresConfirmation: true,
    maxItems: 50,
    supportedViews: ['list', 'search'],
  },
];
