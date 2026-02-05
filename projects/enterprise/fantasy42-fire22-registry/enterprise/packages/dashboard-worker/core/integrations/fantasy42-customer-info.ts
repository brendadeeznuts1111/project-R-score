/**
 * Fantasy42 Customer Information Integration
 * Monitors and manages customer profile data from Fantasy42 interface
 * Targets customer info fields: City, State, Email, Phone, Alt Phone, Telegram alerts, 3rd Party ID
 */

import { XPathElementHandler, handleFantasy42Element } from '../ui/xpath-element-handler';
import { Fantasy42AgentClient } from '../../src/api/fantasy42-agent-client';
import { CustomerDatabaseManagement } from '../customers/customer-database-management';
import { Fantasy42P2PAutomation } from './fantasy42-p2p-automation';

export interface CustomerInfoConfig {
  cityFieldXPath: string;
  stateFieldXPath: string;
  emailFieldXPath: string;
  phoneFieldXPath: string;
  altPhoneFieldXPath: string;
  telegramAlertXPath: string;
  thirdPartyIdXPath: string;
  autoValidate: boolean;
  autoSave: boolean;
  realTimeSync: boolean;
  validationRules: {
    emailRequired: boolean;
    phoneRequired: boolean;
    stateRequired: boolean;
    thirdPartyValidation: boolean;
  };
}

export interface CustomerProfile {
  customerId: string;
  city: string;
  state: string;
  email: string;
  phone: string;
  altPhone: string;
  telegramAlerts: boolean;
  thirdPartyId: string;
  lastUpdated: string;
  validationStatus: {
    email: boolean;
    phone: boolean;
    state: boolean;
    thirdParty: boolean;
  };
}

export class Fantasy42CustomerInfo {
  private xpathHandler: XPathElementHandler;
  private fantasyClient: Fantasy42AgentClient;
  private customerDB: CustomerDatabaseManagement;
  private p2pAutomation: Fantasy42P2PAutomation;

  private config: CustomerInfoConfig;
  private currentCustomer: CustomerProfile | null = null;
  private fieldWatchers: Map<string, MutationObserver> = new Map();
  private isInitialized: boolean = false;

  constructor(
    fantasyClient: Fantasy42AgentClient,
    customerDB: CustomerDatabaseManagement,
    p2pAutomation: Fantasy42P2PAutomation,
    config: CustomerInfoConfig
  ) {
    this.xpathHandler = XPathElementHandler.getInstance();
    this.fantasyClient = fantasyClient;
    this.customerDB = customerDB;
    this.p2pAutomation = p2pAutomation;
    this.config = config;
  }

  /**
   * Initialize customer information integration
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('👤 Initializing Fantasy42 Customer Information Integration...');

      // Locate all customer info fields
      const fieldsLocated = await this.locateCustomerFields();
      if (!fieldsLocated) {
        console.warn('⚠️ Some customer info fields not found');
        return false;
      }

      // Setup field watchers for real-time updates
      if (this.config.realTimeSync) {
        await this.setupFieldWatchers();
      }

      // Setup event listeners
      await this.setupFieldListeners();

      // Initialize validation system
      if (this.config.autoValidate) {
        await this.initializeValidation();
      }

      // Setup auto-save if enabled
      if (this.config.autoSave) {
        await this.setupAutoSave();
      }

      // Load initial customer data if available
      await this.loadInitialCustomerData();

      this.isInitialized = true;
      console.log('✅ Fantasy42 Customer Information Integration initialized');

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize customer info integration:', error);
      return false;
    }
  }

  /**
   * Locate all customer information fields
   */
  private async locateCustomerFields(): Promise<boolean> {
    const fields = [
      { name: 'city', xpath: this.config.cityFieldXPath },
      { name: 'state', xpath: this.config.stateFieldXPath },
      { name: 'email', xpath: this.config.emailFieldXPath },
      { name: 'phone', xpath: this.config.phoneFieldXPath },
      { name: 'altPhone', xpath: this.config.altPhoneFieldXPath },
      { name: 'telegramAlert', xpath: this.config.telegramAlertXPath },
      { name: 'thirdPartyId', xpath: this.config.thirdPartyIdXPath },
    ];

    let allFound = true;

    for (const field of fields) {
      const element = this.xpathHandler.findElementByXPath(field.xpath);
      if (element) {
        console.log(`✅ Found ${field.name} field:`, element.tagName);
      } else {
        console.warn(`⚠️ ${field.name} field not found at: ${field.xpath}`);
        allFound = false;
      }
    }

    return allFound;
  }

  /**
   * Setup field watchers for real-time synchronization
   */
  private async setupFieldWatchers(): Promise<void> {
    const fieldConfigs = [
      { name: 'city', xpath: this.config.cityFieldXPath, type: 'input' },
      { name: 'state', xpath: this.config.stateFieldXPath, type: 'select' },
      { name: 'email', xpath: this.config.emailFieldXPath, type: 'input' },
      { name: 'phone', xpath: this.config.phoneFieldXPath, type: 'input' },
      { name: 'altPhone', xpath: this.config.altPhoneFieldXPath, type: 'input' },
      { name: 'thirdPartyId', xpath: this.config.thirdPartyIdXPath, type: 'input' },
    ];

    for (const config of fieldConfigs) {
      const element = this.xpathHandler.findElementByXPath(config.xpath);
      if (element) {
        this.setupFieldWatcher(config.name, element, config.type);
      }
    }

    console.log('✅ Field watchers setup for real-time sync');
  }

  /**
   * Setup individual field watcher
   */
  private setupFieldWatcher(fieldName: string, element: Element, type: string): void {
    const observer = new MutationObserver(async mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
          await this.handleFieldChange(fieldName, element, type);
        }
      }
    });

    // Also watch for input events
    element.addEventListener('input', () => {
      this.handleFieldChange(fieldName, element, type);
    });

    if (type === 'select') {
      element.addEventListener('change', () => {
        this.handleFieldChange(fieldName, element, type);
      });
    }

    observer.observe(element, {
      attributes: true,
      attributeFilter: ['value'],
    });

    this.fieldWatchers.set(fieldName, observer);
  }

  /**
   * Handle field value changes
   */
  private async handleFieldChange(
    fieldName: string,
    element: Element,
    type: string
  ): Promise<void> {
    let value: any = '';

    if (type === 'input' && element instanceof HTMLInputElement) {
      value = element.value;
    } else if (type === 'select' && element instanceof HTMLSelectElement) {
      value = element.value;
    }

    console.log(`📝 ${fieldName} changed:`, value);

    // Update current customer profile
    if (this.currentCustomer) {
      (this.currentCustomer as any)[fieldName] = value;
      this.currentCustomer.lastUpdated = new Date().toISOString();

      // Validate field if auto-validation is enabled
      if (this.config.autoValidate) {
        const validation = await this.validateField(fieldName, value);
        this.updateFieldValidationStatus(fieldName, validation);
      }

      // Auto-save if enabled
      if (this.config.autoSave) {
        await this.scheduleAutoSave();
      }

      // Trigger P2P automation updates if relevant
      if (fieldName === 'thirdPartyId' && this.p2pAutomation) {
        await this.updateP2PAutomation(value);
      }
    }
  }

  /**
   * Setup field event listeners
   */
  private async setupFieldListeners(): Promise<void> {
    // City field validation and suggestions
    const cityElement = this.xpathHandler.findElementByXPath(this.config.cityFieldXPath);
    if (cityElement) {
      cityElement.addEventListener('blur', () => this.validateCityField());
      cityElement.addEventListener('input', () => this.handleCitySuggestions());
    }

    // State field validation
    const stateElement = this.xpathHandler.findElementByXPath(this.config.stateFieldXPath);
    if (stateElement) {
      stateElement.addEventListener('change', () => this.validateStateField());
    }

    // Email field validation
    const emailElement = this.xpathHandler.findElementByXPath(this.config.emailFieldXPath);
    if (emailElement) {
      emailElement.addEventListener('blur', () => this.validateEmailField());
      emailElement.addEventListener('input', () => this.handleEmailValidation());
    }

    // Phone field validation and formatting
    const phoneElement = this.xpathHandler.findElementByXPath(this.config.phoneFieldXPath);
    if (phoneElement) {
      phoneElement.addEventListener('input', e => this.formatPhoneNumber(e));
      phoneElement.addEventListener('blur', () => this.validatePhoneField());
    }

    // Alt phone field
    const altPhoneElement = this.xpathHandler.findElementByXPath(this.config.altPhoneFieldXPath);
    if (altPhoneElement) {
      altPhoneElement.addEventListener('input', e => this.formatPhoneNumber(e));
      altPhoneElement.addEventListener('blur', () => this.validateAltPhoneField());
    }

    // Telegram alert toggle
    const telegramElement = this.xpathHandler.findElementByXPath(this.config.telegramAlertXPath);
    if (telegramElement) {
      telegramElement.addEventListener('change', e => this.handleTelegramToggle(e));
    }

    // 3rd party ID field
    const thirdPartyElement = this.xpathHandler.findElementByXPath(this.config.thirdPartyIdXPath);
    if (thirdPartyElement) {
      thirdPartyElement.addEventListener('input', () => this.handleThirdPartyIdInput());
      thirdPartyElement.addEventListener('blur', () => this.validateThirdPartyId());
    }

    console.log('✅ Field event listeners setup');
  }

  /**
   * Initialize validation system
   */
  private async initializeValidation(): Promise<void> {
    // Setup real-time validation for all fields
    console.log('✅ Validation system initialized');
  }

  /**
   * Setup auto-save functionality
   */
  private async setupAutoSave(): Promise<void> {
    // Setup auto-save timer
    console.log('✅ Auto-save system initialized');
  }

  /**
   * Load initial customer data
   */
  private async loadInitialCustomerData(): Promise<void> {
    try {
      // Get current customer ID from context
      const customerId = await this.getCurrentCustomerId();

      if (customerId) {
        console.log(`👤 Loading customer data for: ${customerId}`);

        // Load customer profile from database
        const customerData = await this.customerDB.getCustomerById(customerId);

        if (customerData) {
          this.currentCustomer = {
            customerId,
            city: customerData.city || '',
            state: customerData.state || '',
            email: customerData.email || '',
            phone: customerData.phone || '',
            altPhone: customerData.altPhone || '',
            telegramAlerts: customerData.telegramAlerts || false,
            thirdPartyId: customerData.thirdPartyId || '',
            lastUpdated: customerData.lastUpdated || new Date().toISOString(),
            validationStatus: {
              email: true,
              phone: true,
              state: true,
              thirdParty: true,
            },
          };

          // Populate form fields
          await this.populateFormFields(this.currentCustomer);

          console.log('✅ Customer data loaded and form populated');
        } else {
          console.log('ℹ️ No existing customer data found');
        }
      }
    } catch (error) {
      console.error('❌ Failed to load customer data:', error);
    }
  }

  /**
   * Populate form fields with customer data
   */
  private async populateFormFields(customer: CustomerProfile): Promise<void> {
    // City field
    await handleFantasy42Element('write', customer.city);

    // State field
    const stateElement = this.xpathHandler.findElementByXPath(this.config.stateFieldXPath);
    if (stateElement instanceof HTMLSelectElement) {
      stateElement.value = customer.state;
    }

    // Email field
    await this.xpathHandler.handleXPathElement({
      xpath: this.config.emailFieldXPath,
      action: 'write',
      data: customer.email,
    });

    // Phone field
    await this.xpathHandler.handleXPathElement({
      xpath: this.config.phoneFieldXPath,
      action: 'write',
      data: customer.phone,
    });

    // Alt phone field
    await this.xpathHandler.handleXPathElement({
      xpath: this.config.altPhoneFieldXPath,
      action: 'write',
      data: customer.altPhone,
    });

    // Telegram alert toggle
    const telegramElement = this.xpathHandler.findElementByXPath(this.config.telegramAlertXPath);
    if (telegramElement instanceof HTMLInputElement) {
      telegramElement.checked = customer.telegramAlerts;
    }

    // 3rd party ID field
    await this.xpathHandler.handleXPathElement({
      xpath: this.config.thirdPartyIdXPath,
      action: 'write',
      data: customer.thirdPartyId,
    });

    console.log('✅ Form fields populated with customer data');
  }

  /**
   * Validate individual field
   */
  private async validateField(fieldName: string, value: string): Promise<boolean> {
    switch (fieldName) {
      case 'email':
        return this.validateEmail(value);
      case 'phone':
      case 'altPhone':
        return this.validatePhone(value);
      case 'state':
        return this.validateState(value);
      case 'thirdPartyId':
        return await this.validateThirdPartyIdValue(value);
      default:
        return true;
    }
  }

  /**
   * Validate email address
   */
  private validateEmail(email: string): boolean {
    if (!this.config.validationRules.emailRequired && !email) {
      return true;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number
   */
  private validatePhone(phone: string): boolean {
    if (!this.config.validationRules.phoneRequired && !phone) {
      return true;
    }

    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 10;
  }

  /**
   * Validate state selection
   */
  private validateState(state: string): boolean {
    if (!this.config.validationRules.stateRequired && !state) {
      return true;
    }

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

    return validStates.includes(state);
  }

  /**
   * Validate 3rd party ID value
   */
  private async validateThirdPartyIdValue(thirdPartyId: string): Promise<boolean> {
    if (!this.config.validationRules.thirdPartyValidation && !thirdPartyId) {
      return true;
    }

    // Check if it's a valid payment address format
    if (thirdPartyId.includes('@')) {
      // Email format
      return this.validateEmail(thirdPartyId);
    } else if (thirdPartyId.startsWith('+')) {
      // Phone format
      return this.validatePhone(thirdPartyId);
    } else if (thirdPartyId.startsWith('$') || thirdPartyId.startsWith('@')) {
      // Payment app format (Venmo, CashApp)
      return thirdPartyId.length >= 3;
    } else {
      // General address format
      return thirdPartyId.length >= 5;
    }
  }

  /**
   * Update field validation status
   */
  private updateFieldValidationStatus(fieldName: string, isValid: boolean): void {
    if (!this.currentCustomer) return;

    this.currentCustomer.validationStatus[
      fieldName as keyof typeof this.currentCustomer.validationStatus
    ] = isValid;

    // Update UI feedback
    const fieldElement = this.getFieldElement(fieldName);
    if (fieldElement) {
      fieldElement.classList.remove('is-valid', 'is-invalid');
      fieldElement.classList.add(isValid ? 'is-valid' : 'is-invalid');
    }
  }

  /**
   * Get field element by name
   */
  private getFieldElement(fieldName: string): Element | null {
    const xpathMap: Record<string, string> = {
      city: this.config.cityFieldXPath,
      state: this.config.stateFieldXPath,
      email: this.config.emailFieldXPath,
      phone: this.config.phoneFieldXPath,
      altPhone: this.config.altPhoneFieldXPath,
      telegramAlert: this.config.telegramAlertXPath,
      thirdPartyId: this.config.thirdPartyIdXPath,
    };

    return this.xpathHandler.findElementByXPath(xpathMap[fieldName]);
  }

  /**
   * Schedule auto-save
   */
  private async scheduleAutoSave(): Promise<void> {
    // Clear existing timer
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    // Schedule new auto-save
    this.autoSaveTimer = setTimeout(async () => {
      await this.performAutoSave();
    }, 2000); // 2 second delay
  }

  private autoSaveTimer: NodeJS.Timeout | null = null;

  /**
   * Perform auto-save
   */
  private async performAutoSave(): Promise<void> {
    if (!this.currentCustomer) return;

    try {
      console.log('💾 Auto-saving customer data...');

      // Validate all fields before saving
      const validationResults = await this.validateAllFields();
      const allValid = Object.values(validationResults).every(valid => valid);

      if (allValid) {
        // Save to database
        await this.customerDB.updateCustomer(this.currentCustomer.customerId, this.currentCustomer);

        // Update Fantasy42 backend
        await this.fantasyClient.updateCustomerInfo(this.currentCustomer);

        console.log('✅ Customer data auto-saved');
      } else {
        console.warn('⚠️ Auto-save skipped due to validation errors');
      }
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    }
  }

  /**
   * Validate all fields
   */
  private async validateAllFields(): Promise<Record<string, boolean>> {
    if (!this.currentCustomer) return {};

    const results: Record<string, boolean> = {};

    results.email = this.validateEmail(this.currentCustomer.email);
    results.phone = this.validatePhone(this.currentCustomer.phone);
    results.state = this.validateState(this.currentCustomer.state);
    results.thirdParty = await this.validateThirdPartyIdValue(this.currentCustomer.thirdPartyId);

    return results;
  }

  /**
   * Update P2P automation with new data
   */
  private async updateP2PAutomation(thirdPartyId: string): Promise<void> {
    if (this.p2pAutomation && thirdPartyId) {
      // Store the payment address for P2P matching
      await this.p2pAutomation.storePaymentAddress(thirdPartyId);

      // Check for immediate matches
      const matches = await this.p2pAutomation.findImmediateMatches(thirdPartyId);
      if (matches.length > 0) {
        console.log(`🎯 Found ${matches.length} P2P matches for ${thirdPartyId}`);
      }
    }
  }

  // Field-specific validation and formatting methods
  private async validateCityField(): Promise<void> {
    const cityElement = this.xpathHandler.findElementByXPath(this.config.cityFieldXPath);
    if (cityElement instanceof HTMLInputElement) {
      const city = cityElement.value;
      const isValid = city.length >= 2; // Basic validation
      this.updateFieldValidationStatus('city', isValid);
    }
  }

  private async validateStateField(): Promise<void> {
    const stateElement = this.xpathHandler.findElementByXPath(this.config.stateFieldXPath);
    if (stateElement instanceof HTMLSelectElement) {
      const state = stateElement.value;
      const isValid = this.validateState(state);
      this.updateFieldValidationStatus('state', isValid);
    }
  }

  private async validateEmailField(): Promise<void> {
    const emailElement = this.xpathHandler.findElementByXPath(this.config.emailFieldXPath);
    if (emailElement instanceof HTMLInputElement) {
      const email = emailElement.value;
      const isValid = this.validateEmail(email);
      this.updateFieldValidationStatus('email', isValid);
    }
  }

  private async validatePhoneField(): Promise<void> {
    const phoneElement = this.xpathHandler.findElementByXPath(this.config.phoneFieldXPath);
    if (phoneElement instanceof HTMLInputElement) {
      const phone = phoneElement.value;
      const isValid = this.validatePhone(phone);
      this.updateFieldValidationStatus('phone', isValid);
    }
  }

  private async validateAltPhoneField(): Promise<void> {
    const altPhoneElement = this.xpathHandler.findElementByXPath(this.config.altPhoneFieldXPath);
    if (altPhoneElement instanceof HTMLInputElement) {
      const altPhone = altPhoneElement.value;
      const isValid = !altPhone || this.validatePhone(altPhone); // Optional field
      this.updateFieldValidationStatus('altPhone', isValid);
    }
  }

  private async validateThirdPartyId(): Promise<void> {
    const thirdPartyElement = this.xpathHandler.findElementByXPath(this.config.thirdPartyIdXPath);
    if (thirdPartyElement instanceof HTMLInputElement) {
      const thirdPartyId = thirdPartyElement.value;
      const isValid = await this.validateThirdPartyIdValue(thirdPartyId);
      this.updateFieldValidationStatus('thirdPartyId', isValid);
    }
  }

  private handleCitySuggestions(): void {
    // Could implement city autocomplete suggestions
    console.log('🏙️ City suggestions could be implemented here');
  }

  private handleEmailValidation(): void {
    // Real-time email validation feedback
    const emailElement = this.xpathHandler.findElementByXPath(this.config.emailFieldXPath);
    if (emailElement instanceof HTMLInputElement) {
      const email = emailElement.value;
      const isValid = email === '' || this.validateEmail(email);
      emailElement.classList.toggle('is-valid', isValid && email !== '');
      emailElement.classList.toggle('is-invalid', !isValid && email !== '');
    }
  }

  private formatPhoneNumber(event: Event): void {
    const target = event.target as HTMLInputElement;
    let value = target.value.replace(/\D/g, '');

    if (value.length >= 10) {
      value = value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    } else if (value.length >= 6) {
      value = value.replace(/(\d{3})(\d{3})/, '($1) $2-');
    } else if (value.length >= 3) {
      value = value.replace(/(\d{3})/, '($1) ');
    }

    target.value = value;
  }

  private async handleTelegramToggle(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const enabled = target.checked;

    console.log(`🚨 Telegram alerts ${enabled ? 'enabled' : 'disabled'}`);

    if (this.currentCustomer) {
      this.currentCustomer.telegramAlerts = enabled;

      // Update Fantasy42 backend
      await this.fantasyClient.updateCustomerTelegramSetting(
        this.currentCustomer.customerId,
        enabled
      );
    }
  }

  private handleThirdPartyIdInput(): void {
    // Could provide real-time validation feedback
    console.log('🔗 3rd party ID input detected');
  }

  /**
   * Get current customer ID from context
   */
  private async getCurrentCustomerId(): Promise<string | null> {
    // Try to get from various sources
    const urlParams = new URLSearchParams(window.location.search);
    const customerId =
      urlParams.get('customerId') || urlParams.get('playerId') || urlParams.get('id');

    if (customerId) return customerId;

    // Try to get from form data or context
    const customerIdField = document.querySelector(
      'input[data-field="customerId"], input[name="customerId"]'
    ) as HTMLInputElement;
    if (customerIdField && customerIdField.value) {
      return customerIdField.value;
    }

    return null;
  }

  /**
   * Get current customer profile
   */
  getCurrentCustomer(): CustomerProfile | null {
    return this.currentCustomer;
  }

  /**
   * Update customer profile
   */
  async updateCustomerProfile(updates: Partial<CustomerProfile>): Promise<void> {
    if (!this.currentCustomer) return;

    // Update profile
    Object.assign(this.currentCustomer, updates);
    this.currentCustomer.lastUpdated = new Date().toISOString();

    // Update form fields
    await this.populateFormFields(this.currentCustomer);

    // Save to database
    await this.performAutoSave();
  }

  /**
   * Get customer validation status
   */
  getValidationStatus(): Record<string, boolean> {
    return this.currentCustomer?.validationStatus || {};
  }

  /**
   * Check if all required fields are valid
   */
  isValid(): boolean {
    if (!this.currentCustomer) return false;

    const status = this.currentCustomer.validationStatus;
    return status.email && status.phone && status.state && status.thirdParty;
  }

  /**
   * Export customer data
   */
  exportCustomerData(): CustomerProfile | null {
    return this.currentCustomer;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Disconnect field watchers
    this.fieldWatchers.forEach((observer, fieldName) => {
      observer.disconnect();
      console.log(`Observer disconnected for: ${fieldName}`);
    });
    this.fieldWatchers.clear();

    // Clear auto-save timer
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    console.log('🧹 Fantasy42 Customer Info Integration cleaned up');
  }
}

// Convenience functions
export const createFantasy42CustomerInfo = (
  fantasyClient: Fantasy42AgentClient,
  customerDB: CustomerDatabaseManagement,
  p2pAutomation: Fantasy42P2PAutomation,
  config: CustomerInfoConfig
): Fantasy42CustomerInfo => {
  return new Fantasy42CustomerInfo(fantasyClient, customerDB, p2pAutomation, config);
};

export const initializeFantasy42CustomerInfo = async (
  fantasyClient: Fantasy42AgentClient,
  customerDB: CustomerDatabaseManagement,
  p2pAutomation: Fantasy42P2PAutomation,
  config: CustomerInfoConfig
): Promise<boolean> => {
  const customerInfo = new Fantasy42CustomerInfo(fantasyClient, customerDB, p2pAutomation, config);
  return await customerInfo.initialize();
};

// Export types
export type { CustomerInfoConfig, CustomerProfile };
