/**
 * Fire22 Customer Information Service
 * Advanced customer profile management with real-time sync, validation, and integration
 */

import { EventEmitter } from 'events';
import { FormManagementService } from './form-management-service';
import { CashierService } from './cashier-service';

export interface CustomerProfile {
  id: string;
  customerId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    altPhone?: string;
    dateOfBirth?: string;
    ssn?: string; // Encrypted
  };
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  preferences: {
    language: string;
    timezone: string;
    currency: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
      telegram: boolean;
    };
    marketing: {
      email: boolean;
      sms: boolean;
      phone: boolean;
    };
  };
  financial: {
    creditLimit: number;
    currentBalance: number;
    availableCredit: number;
    riskScore: number;
    paymentMethods: PaymentMethod[];
    transactionHistory: TransactionSummary[];
  };
  gaming: {
    accountStatus: 'active' | 'suspended' | 'closed' | 'pending';
    registrationDate: string;
    lastLogin: string;
    totalBets: number;
    totalWins: number;
    totalLosses: number;
    favoriteSports: string[];
    riskProfile: 'low' | 'medium' | 'high';
  };
  verification: {
    emailVerified: boolean;
    phoneVerified: boolean;
    addressVerified: boolean;
    identityVerified: boolean;
    documents: VerificationDocument[];
  };
  thirdParty: {
    telegramId?: string;
    paymentAddresses: ThirdPartyPayment[];
    externalIds: ExternalId[];
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
    version: number;
    tags: string[];
    notes: string;
  };
}

export interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'debit_card' | 'bank_account' | 'crypto' | 'paypal' | 'venmo' | 'cashapp';
  name: string;
  details: Record<string, any>; // Encrypted sensitive data
  isDefault: boolean;
  isVerified: boolean;
  expiryDate?: string;
  lastUsed?: string;
}

export interface TransactionSummary {
  date: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'fee';
  amount: number;
  balance: number;
  description: string;
}

export interface VerificationDocument {
  id: string;
  type: 'id' | 'license' | 'passport' | 'utility_bill' | 'bank_statement';
  status: 'pending' | 'approved' | 'rejected';
  url: string;
  uploadedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
}

export interface ThirdPartyPayment {
  platform: 'venmo' | 'cashapp' | 'paypal' | 'zelle' | 'crypto';
  address: string;
  isVerified: boolean;
  lastVerified?: string;
}

export interface ExternalId {
  system: string;
  id: string;
  verified: boolean;
  lastSync?: string;
}

export interface CustomerSearchFilters {
  name?: string;
  email?: string;
  phone?: string;
  customerId?: string;
  status?: string;
  state?: string;
  city?: string;
  registrationDateFrom?: string;
  registrationDateTo?: string;
  lastLoginFrom?: string;
  lastLoginTo?: string;
  balanceMin?: number;
  balanceMax?: number;
  riskScoreMin?: number;
  riskScoreMax?: number;
}

export interface CustomerUpdateRequest {
  customerId: string;
  updates: Partial<CustomerProfile>;
  updatedBy: string;
  reason?: string;
  requiresApproval?: boolean;
}

export interface ValidationRule {
  required?: boolean;
  pattern?: RegExp;
  maxLength?: number;
  minLength?: number;
  custom?: (value: string, context?: any) => Promise<boolean> | boolean;
  encrypt?: boolean;
}

export interface CustomerValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
  score: number; // Validation confidence score
}

export class CustomerInformationService extends EventEmitter {
  private static instance: CustomerInformationService;
  private customers: Map<string, CustomerProfile> = new Map();
  private formService: FormManagementService;
  private cashierService: CashierService;
  private validationRules: Map<string, ValidationRule> = new Map();
  private searchIndex: Map<string, Set<string>> = new Map(); // For fast searching
  private syncQueue: CustomerUpdateRequest[] = [];
  private isInitialized = false;

  constructor() {
    super();
    this.formService = FormManagementService.getInstance();
    this.cashierService = CashierService.getInstance();
    this.initializeValidationRules();
    this.setupEventListeners();
  }

  public static getInstance(): CustomerInformationService {
    if (!CustomerInformationService.instance) {
      CustomerInformationService.instance = new CustomerInformationService();
    }
    return CustomerInformationService.instance;
  }

  /**
   * Initialize the customer information service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Initialize dependencies
    await this.formService.initialize();
    await this.cashierService.initialize();

    // Load existing customer data
    await this.loadCustomerData();

    // Setup real-time synchronization
    this.setupRealTimeSync();

    // Initialize search index
    this.buildSearchIndex();

    // Setup automated tasks
    this.setupAutomatedTasks();

    this.isInitialized = true;
  }

  /**
   * Initialize validation rules
   */
  private initializeValidationRules(): void {
    this.validationRules.set('email', {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      maxLength: 254,
      custom: async (value: string) => await this.validateEmailUniqueness(value),
    });

    this.validationRules.set('phone', {
      required: true,
      pattern: /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
      custom: async (value: string) => await this.validatePhoneFormat(value),
    });

    this.validationRules.set('ssn', {
      required: false,
      pattern: /^\d{3}-?\d{2}-?\d{4}$/,
      encrypt: true,
    });

    this.validationRules.set('zipCode', {
      required: true,
      pattern: /^\d{5}(-\d{4})?$/,
      custom: async (value: string, customer: CustomerProfile) =>
        await this.validateZipCode(value, customer.address.state),
    });

    this.validationRules.set('dateOfBirth', {
      required: false,
      custom: (value: string) => this.validateAge(value),
    });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for form service events
    this.formService.on('form-submit-success', data => {
      this.handleFormSubmission(data);
    });

    // Listen for cashier service events
    this.cashierService.on('transaction-created', transaction => {
      this.handleTransactionCreated(transaction);
    });

    // Listen for real-time updates
    this.on('customer-updated', customer => {
      this.updateSearchIndex(customer);
    });
  }

  /**
   * Load customer data from storage
   */
  private async loadCustomerData(): Promise<void> {
    try {
      // Load from API/storage
      const response = await fetch('/api/customers');
      if (response.ok) {
        const data = await response.json();

        data.customers.forEach((customer: CustomerProfile) => {
          this.customers.set(customer.id, customer);
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to load customer data:', error);
    }
  }

  /**
   * Setup real-time synchronization
   */
  private setupRealTimeSync(): void {
    // WebSocket connection for real-time updates
    this.setupWebSocketConnection();

    // Periodic sync with backend
    setInterval(() => {
      this.syncWithBackend();
    }, 30000); // 30 seconds
  }

  /**
   * Setup WebSocket connection
   */
  private setupWebSocketConnection(): void {
    try {
      const ws = new WebSocket('ws://localhost:8080/customers');

      ws.onopen = () => {};

      ws.onmessage = event => {
        const data = JSON.parse(event.data);
        this.handleRealTimeUpdate(data);
      };

      ws.onclose = () => {
        // Reconnect after delay
        setTimeout(() => this.setupWebSocketConnection(), 5000);
      };

      ws.onerror = error => {
        console.error('🔌 Customer WebSocket error:', error);
      };
    } catch (error) {
      console.warn('⚠️ WebSocket not available, falling back to polling');
    }
  }

  /**
   * Build search index for fast queries
   */
  private buildSearchIndex(): void {
    this.customers.forEach(customer => {
      this.updateSearchIndex(customer);
    });
  }

  /**
   * Update search index for a customer
   */
  private updateSearchIndex(customer: CustomerProfile): void {
    // Clear existing entries
    this.searchIndex.forEach(index => {
      index.delete(customer.id);
    });

    // Add to search index
    const searchableFields = [
      customer.customerId.toLowerCase(),
      customer.personalInfo.firstName.toLowerCase(),
      customer.personalInfo.lastName.toLowerCase(),
      customer.personalInfo.email.toLowerCase(),
      customer.personalInfo.phone,
      customer.address.city.toLowerCase(),
      customer.address.state.toLowerCase(),
      customer.address.zipCode,
      customer.gaming.accountStatus,
    ];

    searchableFields.forEach(field => {
      if (!this.searchIndex.has(field)) {
        this.searchIndex.set(field, new Set());
      }
      this.searchIndex.get(field)!.add(customer.id);
    });
  }

  /**
   * Setup automated tasks
   */
  private setupAutomatedTasks(): void {
    // Daily cleanup task
    setInterval(
      () => {
        this.performDailyCleanup();
      },
      24 * 60 * 60 * 1000
    ); // 24 hours

    // Risk assessment update
    setInterval(
      () => {
        this.updateRiskAssessments();
      },
      60 * 60 * 1000
    ); // 1 hour
  }

  /**
   * Create new customer profile
   */
  async createCustomer(
    customerData: Omit<CustomerProfile, 'id' | 'metadata'>
  ): Promise<CustomerProfile> {
    // Validate customer data
    const validation = await this.validateCustomer(customerData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${Object.values(validation.errors).flat().join(', ')}`);
    }

    // Create customer profile
    const customer: CustomerProfile = {
      ...customerData,
      id: this.generateCustomerId(),
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        updatedBy: 'system',
        version: 1,
        tags: [],
        notes: '',
      },
    };

    // Save to storage
    this.customers.set(customer.id, customer);
    this.updateSearchIndex(customer);

    // Sync with backend
    await this.syncCustomerToBackend(customer);

    this.emit('customer-created', customer);

    return customer;
  }

  /**
   * Update customer profile
   */
  async updateCustomer(updateRequest: CustomerUpdateRequest): Promise<CustomerProfile> {
    const customer = this.customers.get(updateRequest.customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Create audit trail
    const auditEntry = {
      timestamp: new Date().toISOString(),
      updatedBy: updateRequest.updatedBy,
      changes: this.calculateChanges(customer, updateRequest.updates),
      reason: updateRequest.reason,
    };

    // Update customer
    Object.assign(customer, updateRequest.updates);
    customer.metadata.updatedAt = new Date().toISOString();
    customer.metadata.updatedBy = updateRequest.updatedBy;
    customer.metadata.version++;

    // Add to audit trail (implement audit system)
    // await this.addAuditEntry(customer.id, auditEntry);

    // Validate updated customer
    const validation = await this.validateCustomer(customer);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${Object.values(validation.errors).flat().join(', ')}`);
    }

    // Save changes
    this.customers.set(customer.id, customer);
    this.updateSearchIndex(customer);

    // Sync with backend
    await this.syncCustomerToBackend(customer);

    this.emit('customer-updated', customer);

    return customer;
  }

  /**
   * Search customers
   */
  async searchCustomers(
    filters: CustomerSearchFilters,
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{ customers: CustomerProfile[]; total: number; hasMore: boolean }> {
    let customerIds = new Set<string>();

    // Apply filters
    if (filters.name) {
      const nameMatches = this.searchInIndex(filters.name.toLowerCase());
      customerIds = nameMatches.size > 0 ? nameMatches : customerIds;
    }

    if (filters.email) {
      const emailMatches = this.searchInIndex(filters.email.toLowerCase());
      if (customerIds.size > 0) {
        customerIds = new Set([...customerIds].filter(id => emailMatches.has(id)));
      } else {
        customerIds = emailMatches;
      }
    }

    if (filters.phone) {
      const phoneMatches = this.searchInIndex(filters.phone);
      if (customerIds.size > 0) {
        customerIds = new Set([...customerIds].filter(id => phoneMatches.has(id)));
      } else {
        customerIds = phoneMatches;
      }
    }

    // Apply additional filters
    let customers = Array.from(customerIds)
      .map(id => this.customers.get(id)!)
      .filter(Boolean);

    // Apply other filters
    if (filters.customerId) {
      customers = customers.filter(c => c.customerId === filters.customerId);
    }

    if (filters.status) {
      customers = customers.filter(c => c.gaming.accountStatus === filters.status);
    }

    if (filters.state) {
      customers = customers.filter(c => c.address.state === filters.state);
    }

    if (filters.city) {
      customers = customers.filter(
        c => c.address.city.toLowerCase() === filters.city!.toLowerCase()
      );
    }

    if (filters.registrationDateFrom) {
      customers = customers.filter(c => c.gaming.registrationDate >= filters.registrationDateFrom!);
    }

    if (filters.registrationDateTo) {
      customers = customers.filter(c => c.gaming.registrationDate <= filters.registrationDateTo!);
    }

    if (filters.balanceMin !== undefined) {
      customers = customers.filter(c => c.financial.currentBalance >= filters.balanceMin!);
    }

    if (filters.balanceMax !== undefined) {
      customers = customers.filter(c => c.financial.currentBalance <= filters.balanceMax!);
    }

    // Sort results
    if (options?.sortBy) {
      customers.sort((a, b) => {
        const aValue = this.getNestedValue(a, options.sortBy!);
        const bValue = this.getNestedValue(b, options.sortBy!);

        if (aValue < bValue) return options.sortOrder === 'desc' ? 1 : -1;
        if (aValue > bValue) return options.sortOrder === 'desc' ? -1 : 1;
        return 0;
      });
    }

    // Apply pagination
    const total = customers.length;
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const paginatedCustomers = customers.slice(offset, offset + limit);

    return {
      customers: paginatedCustomers,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get customer by ID
   */
  getCustomer(customerId: string): CustomerProfile | null {
    return this.customers.get(customerId) || null;
  }

  /**
   * Get customer by customer ID
   */
  getCustomerByCustomerId(customerId: string): CustomerProfile | null {
    for (const customer of this.customers.values()) {
      if (customer.customerId === customerId) {
        return customer;
      }
    }
    return null;
  }

  /**
   * Validate customer data
   */
  async validateCustomer(customer: Partial<CustomerProfile>): Promise<CustomerValidationResult> {
    const errors: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};
    let score = 100;

    // Validate personal info
    if (customer.personalInfo) {
      const personalErrors = await this.validatePersonalInfo(customer.personalInfo);
      if (personalErrors.length > 0) {
        errors.personalInfo = personalErrors;
        score -= 20;
      }
    }

    // Validate address
    if (customer.address) {
      const addressErrors = await this.validateAddress(customer.address);
      if (addressErrors.length > 0) {
        errors.address = addressErrors;
        score -= 15;
      }
    }

    // Validate financial info
    if (customer.financial) {
      const financialErrors = this.validateFinancialInfo(customer.financial);
      if (financialErrors.length > 0) {
        errors.financial = financialErrors;
        score -= 10;
      }
    }

    // Check for duplicates
    if (customer.personalInfo?.email) {
      const duplicateCheck = await this.checkForDuplicates(customer);
      if (duplicateCheck.hasDuplicates) {
        warnings.duplicates = [
          `Potential duplicate: ${duplicateCheck.similarCustomers.join(', ')}`,
        ];
        score -= 5;
      }
    }

    // Risk assessment
    if (customer.financial?.currentBalance !== undefined) {
      const riskAssessment = this.assessRisk(customer);
      if (riskAssessment.riskLevel === 'high') {
        warnings.risk = ['High risk profile detected'];
        score -= 10;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
    };
  }

  /**
   * Validate personal information
   */
  private async validatePersonalInfo(
    personalInfo: CustomerProfile['personalInfo']
  ): Promise<string[]> {
    const errors: string[] = [];

    // Email validation
    if (!personalInfo.email) {
      errors.push('Email is required');
    } else {
      const emailRule = this.validationRules.get('email')!;
      if (!emailRule.pattern.test(personalInfo.email)) {
        errors.push('Invalid email format');
      }
    }

    // Phone validation
    if (!personalInfo.phone) {
      errors.push('Phone is required');
    } else {
      const phoneRule = this.validationRules.get('phone')!;
      if (!phoneRule.pattern.test(personalInfo.phone)) {
        errors.push('Invalid phone format');
      }
    }

    // Name validation
    if (!personalInfo.firstName || personalInfo.firstName.length < 2) {
      errors.push('First name is required and must be at least 2 characters');
    }

    if (!personalInfo.lastName || personalInfo.lastName.length < 2) {
      errors.push('Last name is required and must be at least 2 characters');
    }

    // Age validation
    if (personalInfo.dateOfBirth) {
      if (!this.validateAge(personalInfo.dateOfBirth)) {
        errors.push('Customer must be at least 18 years old');
      }
    }

    return errors;
  }

  /**
   * Validate address information
   */
  private async validateAddress(address: CustomerProfile['address']): Promise<string[]> {
    const errors: string[] = [];

    if (!address.street || address.street.length < 5) {
      errors.push('Street address is required and must be at least 5 characters');
    }

    if (!address.city || address.city.length < 2) {
      errors.push('City is required and must be at least 2 characters');
    }

    if (!address.state || !this.isValidState(address.state)) {
      errors.push('Valid state is required');
    }

    if (!address.zipCode) {
      errors.push('ZIP code is required');
    } else {
      const zipRule = this.validationRules.get('zipCode')!;
      if (!zipRule.pattern.test(address.zipCode)) {
        errors.push('Invalid ZIP code format');
      }
    }

    if (!address.country) {
      errors.push('Country is required');
    }

    return errors;
  }

  /**
   * Validate financial information
   */
  private validateFinancialInfo(financial: CustomerProfile['financial']): string[] {
    const errors: string[] = [];

    if (financial.currentBalance < 0) {
      errors.push('Current balance cannot be negative');
    }

    if (financial.creditLimit < 0) {
      errors.push('Credit limit cannot be negative');
    }

    if (financial.availableCredit < 0) {
      errors.push('Available credit cannot be negative');
    }

    if (financial.riskScore < 0 || financial.riskScore > 100) {
      errors.push('Risk score must be between 0 and 100');
    }

    return errors;
  }

  /**
   * Check for duplicate customers
   */
  private async checkForDuplicates(
    customer: Partial<CustomerProfile>
  ): Promise<{ hasDuplicates: boolean; similarCustomers: string[] }> {
    const similarCustomers: string[] = [];

    if (customer.personalInfo?.email) {
      const existingWithEmail = Array.from(this.customers.values()).filter(
        c => c.personalInfo.email === customer.personalInfo!.email && c.id !== customer.id
      );

      similarCustomers.push(...existingWithEmail.map(c => c.customerId));
    }

    if (customer.personalInfo?.phone) {
      const existingWithPhone = Array.from(this.customers.values()).filter(
        c => c.personalInfo.phone === customer.personalInfo!.phone && c.id !== customer.id
      );

      similarCustomers.push(...existingWithPhone.map(c => c.customerId));
    }

    return {
      hasDuplicates: similarCustomers.length > 0,
      similarCustomers: [...new Set(similarCustomers)],
    };
  }

  /**
   * Assess customer risk
   */
  private assessRisk(customer: Partial<CustomerProfile>): {
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
  } {
    const factors: string[] = [];
    let riskScore = 0;

    // Financial risk factors
    if (customer.financial) {
      const balance = customer.financial.currentBalance || 0;
      const creditLimit = customer.financial.creditLimit || 0;

      if (balance < 0) {
        factors.push('Negative balance');
        riskScore += 30;
      }

      if (balance > creditLimit * 0.8) {
        factors.push('High balance relative to credit limit');
        riskScore += 20;
      }
    }

    // Gaming risk factors
    if (customer.gaming) {
      if (customer.gaming.totalLosses > customer.gaming.totalWins * 2) {
        factors.push('High loss ratio');
        riskScore += 25;
      }

      if (customer.gaming.riskProfile === 'high') {
        factors.push('High gaming risk profile');
        riskScore += 20;
      }
    }

    // Verification risk factors
    if (customer.verification) {
      if (!customer.verification.emailVerified) {
        factors.push('Email not verified');
        riskScore += 10;
      }

      if (!customer.verification.identityVerified) {
        factors.push('Identity not verified');
        riskScore += 15;
      }
    }

    let riskLevel: 'low' | 'medium' | 'high';
    if (riskScore >= 50) {
      riskLevel = 'high';
    } else if (riskScore >= 25) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    return { riskLevel, factors };
  }

  /**
   * Validate email uniqueness
   */
  private async validateEmailUniqueness(
    email: string,
    excludeCustomerId?: string
  ): Promise<boolean> {
    const existing = Array.from(this.customers.values()).find(
      c => c.personalInfo.email === email && c.id !== excludeCustomerId
    );

    return !existing;
  }

  /**
   * Validate phone format
   */
  private async validatePhoneFormat(phone: string): Promise<boolean> {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 10 && digitsOnly.length <= 11;
  }

  /**
   * Validate ZIP code
   */
  private async validateZipCode(zipCode: string, state: string): Promise<boolean> {
    // Basic validation - could be enhanced with actual ZIP code database
    return /^\d{5}(-\d{4})?$/.test(zipCode);
  }

  /**
   * Validate age (must be 18+)
   */
  private validateAge(dateOfBirth: string): boolean {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 18;
    }

    return age >= 18;
  }

  /**
   * Check if state is valid
   */
  private isValidState(state: string): boolean {
    const validStates = [
      'AL',
      'AK',
      'AZ',
      'AR',
      'CA',
      'CO',
      'CT',
      'DE',
      'DC',
      'FL',
      'GA',
      'HI',
      'ID',
      'IL',
      'IN',
      'IA',
      'KS',
      'KY',
      'LA',
      'ME',
      'MD',
      'MA',
      'MI',
      'MN',
      'MS',
      'MO',
      'MT',
      'NE',
      'NV',
      'NH',
      'NJ',
      'NM',
      'NY',
      'NC',
      'ND',
      'OH',
      'OK',
      'OR',
      'PA',
      'RI',
      'SC',
      'SD',
      'TN',
      'TX',
      'UT',
      'VT',
      'VA',
      'WA',
      'WV',
      'WI',
      'WY',
    ];

    return validStates.includes(state.toUpperCase());
  }

  /**
   * Search in index
   */
  private searchInIndex(query: string): Set<string> {
    const results = new Set<string>();

    // Exact match
    if (this.searchIndex.has(query)) {
      this.searchIndex.get(query)!.forEach(id => results.add(id));
    }

    // Partial match
    this.searchIndex.forEach((customerIds, field) => {
      if (field.includes(query)) {
        customerIds.forEach(id => results.add(id));
      }
    });

    return results;
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Calculate changes between customer versions
   */
  private calculateChanges(
    oldCustomer: CustomerProfile,
    updates: Partial<CustomerProfile>
  ): Record<string, any> {
    const changes: Record<string, any> = {};

    const compareObjects = (oldObj: any, newObj: any, path: string = '') => {
      for (const key in newObj) {
        const fullPath = path ? `${path}.${key}` : key;

        if (
          typeof newObj[key] === 'object' &&
          newObj[key] !== null &&
          !Array.isArray(newObj[key])
        ) {
          compareObjects(oldObj[key], newObj[key], fullPath);
        } else if (oldObj[key] !== newObj[key]) {
          changes[fullPath] = {
            from: oldObj[key],
            to: newObj[key],
          };
        }
      }
    };

    compareObjects(oldCustomer, updates);
    return changes;
  }

  /**
   * Generate unique customer ID
   */
  private generateCustomerId(): string {
    return `CUST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sync customer to backend
   */
  private async syncCustomerToBackend(customer: CustomerProfile): Promise<void> {
    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customer),
      });

      if (!response.ok) {
        console.warn(`⚠️ Failed to sync customer ${customer.id} to backend`);
      }
    } catch (error) {
      console.warn(`⚠️ Error syncing customer ${customer.id}:`, error);
    }
  }

  /**
   * Sync with backend
   */
  private async syncWithBackend(): Promise<void> {
    if (this.syncQueue.length === 0) return;

    const updates = [...this.syncQueue];
    this.syncQueue = [];

    try {
      await fetch('/api/customers/batch-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });
    } catch (error) {
      console.warn('⚠️ Failed to sync customer updates:', error);
      // Re-queue failed updates
      this.syncQueue.unshift(...updates);
    }
  }

  /**
   * Handle real-time update
   */
  private handleRealTimeUpdate(data: any): void {
    if (data.type === 'customer-update') {
      const customer = this.customers.get(data.customerId);
      if (customer) {
        Object.assign(customer, data.updates);
        customer.metadata.updatedAt = new Date().toISOString();
        this.updateSearchIndex(customer);
        this.emit('customer-updated-realtime', customer);
      }
    }
  }

  /**
   * Handle form submission
   */
  private async handleFormSubmission(data: any): Promise<void> {
    if (data.formId === 'customer-profile') {
      try {
        const customerId = data.data.customerId;
        const customer = this.getCustomerByCustomerId(customerId);

        if (customer) {
          await this.updateCustomer({
            customerId: customer.id,
            updates: data.data,
            updatedBy: 'form-submission',
          });
        } else {
          await this.createCustomer(data.data);
        }
      } catch (error) {
        console.error('❌ Failed to process customer form:', error);
      }
    }
  }

  /**
   * Handle transaction created
   */
  private handleTransactionCreated(transaction: any): void {
    // Update customer's financial information
    const customer = this.getCustomerByCustomerId(transaction.customerId);
    if (customer) {
      // Update balance based on transaction type
      if (transaction.type === 'deposit') {
        customer.financial.currentBalance += transaction.netAmount || transaction.amount;
      } else if (transaction.type === 'withdrawal') {
        customer.financial.currentBalance -= transaction.amount;
      }

      customer.financial.availableCredit =
        customer.financial.creditLimit - customer.financial.currentBalance;

      // Add transaction to summary
      customer.financial.transactionHistory.unshift({
        date: transaction.processedAt,
        type: transaction.type,
        amount: transaction.amount,
        balance: customer.financial.currentBalance,
        description: transaction.description,
      });

      // Keep only last 50 transactions
      if (customer.financial.transactionHistory.length > 50) {
        customer.financial.transactionHistory = customer.financial.transactionHistory.slice(0, 50);
      }

      // Update customer
      this.updateCustomer({
        customerId: customer.id,
        updates: { financial: customer.financial },
        updatedBy: 'transaction-system',
      });
    }
  }

  /**
   * Perform daily cleanup
   */
  private async performDailyCleanup(): Promise<void> {
    // Remove old search index entries
    // Clean up temporary data
    // Archive old transaction history
    // Update customer risk scores
  }

  /**
   * Update risk assessments
   */
  private async updateRiskAssessments(): Promise<void> {
    for (const customer of this.customers.values()) {
      const riskAssessment = this.assessRisk(customer);
      customer.financial.riskScore = Math.round(
        (riskAssessment.riskLevel === 'high'
          ? 80
          : riskAssessment.riskLevel === 'medium'
            ? 50
            : 20) +
          (Math.random() * 20 - 10) // Add some variability
      );

      customer.financial.riskScore = Math.max(0, Math.min(100, customer.financial.riskScore));
    }
  }

  /**
   * Get customer statistics
   */
  getStatistics(): {
    totalCustomers: number;
    activeCustomers: number;
    suspendedCustomers: number;
    totalBalance: number;
    averageBalance: number;
    highRiskCustomers: number;
    verifiedCustomers: number;
  } {
    const customers = Array.from(this.customers.values());

    const stats = {
      totalCustomers: customers.length,
      activeCustomers: customers.filter(c => c.gaming.accountStatus === 'active').length,
      suspendedCustomers: customers.filter(c => c.gaming.accountStatus === 'suspended').length,
      totalBalance: customers.reduce((sum, c) => sum + c.financial.currentBalance, 0),
      averageBalance: 0,
      highRiskCustomers: customers.filter(c => c.financial.riskScore >= 70).length,
      verifiedCustomers: customers.filter(
        c =>
          c.verification.emailVerified &&
          c.verification.phoneVerified &&
          c.verification.identityVerified
      ).length,
    };

    stats.averageBalance = stats.totalCustomers > 0 ? stats.totalBalance / stats.totalCustomers : 0;

    return stats;
  }

  /**
   * Export customer data
   */
  async exportCustomers(
    filters?: CustomerSearchFilters,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const { customers } = await this.searchCustomers(filters || {});

    if (format === 'csv') {
      return this.convertToCSV(customers);
    }

    return JSON.stringify(customers, null, 2);
  }

  /**
   * Convert customers to CSV
   */
  private convertToCSV(customers: CustomerProfile[]): string {
    const headers = [
      'Customer ID',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'City',
      'State',
      'Status',
      'Balance',
      'Risk Score',
      'Registration Date',
    ];

    const rows = customers.map(customer => [
      customer.customerId,
      customer.personalInfo.firstName,
      customer.personalInfo.lastName,
      customer.personalInfo.email,
      customer.personalInfo.phone,
      customer.address.city,
      customer.address.state,
      customer.gaming.accountStatus,
      customer.financial.currentBalance.toFixed(2),
      customer.financial.riskScore,
      customer.gaming.registrationDate,
    ]);

    return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Disconnect WebSocket
    // Clear timers
    // Save pending changes
    this.removeAllListeners();
  }
}

// Global functions for easy access
export async function initializeCustomerInformationService(): Promise<CustomerInformationService> {
  const service = CustomerInformationService.getInstance();
  await service.initialize();
  return service;
}

export function getCustomerInformationService(): CustomerInformationService {
  return CustomerInformationService.getInstance();
}

export { CustomerInformationService };
