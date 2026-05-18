/**
 * Shared Customer Types
 * Consolidated customer-related interfaces used across the application
 */

/**
 * Standard customer profile interface
 */
export interface CustomerProfile {
  id: string;
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  address?: CustomerAddress;
  preferences: CustomerPreferences;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

/**
 * Customer address interface
 */
export interface CustomerAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

/**
 * Customer preferences interface
 */
export interface CustomerPreferences {
  language: string;
  timezone: string;
  currency: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  marketing: boolean;
  theme: 'light' | 'dark' | 'auto';
}

/**
 * Customer status enumeration
 */
export type CustomerStatus = 'active' | 'inactive' | 'suspended' | 'pending' | 'blocked';

/**
 * Customer activity interface
 */
export interface CustomerActivity {
  id: string;
  customerId: string;
  type: CustomerActivityType;
  description: string;
  metadata: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Customer activity type enumeration
 */
export type CustomerActivityType =
  | 'login'
  | 'logout'
  | 'profile_update'
  | 'password_change'
  | 'payment'
  | 'wager'
  | 'deposit'
  | 'withdrawal'
  | 'transfer'
  | 'support_ticket'
  | 'account_verification';

/**
 * Customer search criteria interface
 */
export interface CustomerSearchCriteria {
  query?: string;
  status?: CustomerStatus[];
  dateRange?: {
    from: string;
    to: string;
  };
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'email' | 'createdAt' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Customer search result interface
 */
export interface CustomerSearchResult {
  customers: CustomerProfile[];
  totalCount: number;
  hasMore: boolean;
  searchCriteria: CustomerSearchCriteria;
}
