/**
 * Customer Forms Module
 * Handles customer form operations, validation, and submission
 */

import type {
  CustomerFormData,
  CustomerFormMode,
  CustomerValidationResult,
  CustomerValidationError,
  CustomerValidationWarning,
} from '../core/customer-interface-types';
import {
  CustomerInformationService,
  CustomerProfile,
} from '../../../services/customer-information-service';
import { FormManagementService } from '../../../services/form-management-service';

export class CustomerForms {
  private customerService: CustomerInformationService;
  private formService: FormManagementService;
  private activeForms: Map<string, HTMLFormElement> = new Map();
  private formData: Map<string, CustomerFormData> = new Map();

  constructor() {
    this.customerService = CustomerInformationService.getInstance();
    this.formService = FormManagementService.getInstance();
  }

  /**
   * Create customer form
   */
  createForm(
    mode: CustomerFormMode,
    customerId?: string
  ): {
    form: HTMLFormElement;
    formId: string;
  } {
    const formId = `customer-form-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const form = document.createElement('form');
    form.id = formId;
    form.className = 'customer-form';
    form.setAttribute('data-mode', mode);
    if (customerId) {
      form.setAttribute('data-customer-id', customerId);
    }

    // Generate form HTML
    form.innerHTML = this.generateFormHTML(mode, customerId);

    // Setup form event listeners
    this.setupFormEventListeners(form, formId);

    // Store form reference
    this.activeForms.set(formId, form);

    console.log(`📝 Created customer form: ${formId} (${mode})`);
    return { form, formId };
  }

  /**
   * Populate form with customer data
   */
  populateForm(formId: string, customer: CustomerProfile): void {
    const form = this.activeForms.get(formId);
    if (!form) {
      console.warn(`⚠️ Form not found: ${formId}`);
      return;
    }

    // Convert customer to form data
    const formData: CustomerFormData = {
      customerId: customer.id,
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      email: customer.email || '',
      phone: customer.phone || '',
      dateOfBirth: customer.dateOfBirth?.toISOString().split('T')[0],
      address: {
        street: customer.address?.street || '',
        city: customer.address?.city || '',
        state: customer.address?.state || '',
        zipCode: customer.address?.zipCode || '',
        country: customer.address?.country || '',
      },
      preferences: {
        language: customer.preferences?.language || 'en',
        currency: customer.preferences?.currency || 'USD',
        notifications: customer.preferences?.notifications ?? true,
        marketingEmails: customer.preferences?.marketingEmails ?? false,
      },
      status: customer.status || 'active',
      vipTier: customer.vipTier || 'bronze',
      riskLevel: customer.riskLevel || 'low',
      notes: customer.notes || '',
    };

    // Store form data
    this.formData.set(formId, formData);

    // Populate form fields
    this.populateFormFields(form, formData);

    console.log(`📝 Populated form ${formId} with customer data`);
  }

  /**
   * Validate form data
   */
  async validateForm(formId: string): Promise<CustomerValidationResult> {
    const form = this.activeForms.get(formId);
    if (!form) {
      return {
        isValid: false,
        errors: [{ field: 'form', code: 'FORM_NOT_FOUND', message: 'Form not found' }],
        warnings: [],
      };
    }

    // Collect form data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;

    // Convert to CustomerFormData structure
    const customerData: CustomerFormData = {
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      email: data.email || '',
      phone: data.phone || '',
      dateOfBirth: data.dateOfBirth || undefined,
      address: {
        street: data['address.street'] || '',
        city: data['address.city'] || '',
        state: data['address.state'] || '',
        zipCode: data['address.zipCode'] || '',
        country: data['address.country'] || '',
      },
      preferences: {
        language: data['preferences.language'] || 'en',
        currency: data['preferences.currency'] || 'USD',
        notifications: data['preferences.notifications'] === 'on',
        marketingEmails: data['preferences.marketingEmails'] === 'on',
      },
      status: (data.status as any) || 'active',
      vipTier: (data.vipTier as any) || 'bronze',
      riskLevel: (data.riskLevel as any) || 'low',
      notes: data.notes || '',
    };

    // Perform validation
    const validation = await this.validateCustomerData(customerData);

    // Store validation result
    form.setAttribute('data-validation-status', validation.isValid ? 'valid' : 'invalid');

    return validation;
  }

  /**
   * Submit form
   */
  async submitForm(formId: string): Promise<{
    success: boolean;
    customer?: CustomerProfile;
    error?: string;
  }> {
    const form = this.activeForms.get(formId);
    if (!form) {
      return { success: false, error: 'Form not found' };
    }

    const mode = form.getAttribute('data-mode') as CustomerFormMode;
    const customerId = form.getAttribute('data-customer-id');

    try {
      // Validate form first
      const validation = await this.validateForm(formId);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
        };
      }

      // Get form data
      const formData = this.formData.get(formId);
      if (!formData) {
        return { success: false, error: 'Form data not found' };
      }

      let customer: CustomerProfile;

      if (mode === 'create') {
        // Create new customer
        customer = await this.customerService.createCustomer({
          ...formData,
          id: '', // Will be generated
          createdAt: new Date(),
          updatedAt: new Date(),
        } as CustomerProfile);
      } else if (mode === 'edit' && customerId) {
        // Update existing customer
        customer = await this.customerService.updateCustomer(customerId, {
          ...formData,
          updatedAt: new Date(),
        } as Partial<CustomerProfile>);
      } else {
        return { success: false, error: 'Invalid form mode or missing customer ID' };
      }

      // Clean up form
      this.cleanupForm(formId);

      console.log(`✅ Form submitted successfully: ${formId}`);
      return { success: true, customer };
    } catch (error) {
      console.error(`❌ Form submission failed: ${formId}`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Reset form
   */
  resetForm(formId: string): void {
    const form = this.activeForms.get(formId);
    if (!form) return;

    form.reset();
    this.formData.delete(formId);
    form.removeAttribute('data-validation-status');

    console.log(`🔄 Form reset: ${formId}`);
  }

  /**
   * Remove form
   */
  removeForm(formId: string): void {
    const form = this.activeForms.get(formId);
    if (form) {
      form.remove();
    }

    this.activeForms.delete(formId);
    this.formData.delete(formId);

    console.log(`🗑️ Form removed: ${formId}`);
  }

  /**
   * Get form data
   */
  getFormData(formId: string): CustomerFormData | null {
    return this.formData.get(formId) || null;
  }

  /**
   * Get all active forms
   */
  getActiveForms(): string[] {
    return Array.from(this.activeForms.keys());
  }

  // Private methods

  private generateFormHTML(mode: CustomerFormMode, customerId?: string): string {
    const isEdit = mode === 'edit';
    const isView = mode === 'view';

    return `
      <div class="customer-form-header">
        <h3>${isEdit ? 'Edit Customer' : isView ? 'View Customer' : 'Create New Customer'}</h3>
      </div>

      <div class="customer-form-body">
        <!-- Personal Information -->
        <div class="form-section">
          <h4>Personal Information</h4>
          <div class="form-row">
            <div class="form-group">
              <label for="firstName">First Name *</label>
              <input type="text" id="firstName" name="firstName" required ${isView ? 'readonly' : ''}>
            </div>
            <div class="form-group">
              <label for="lastName">Last Name *</label>
              <input type="text" id="lastName" name="lastName" required ${isView ? 'readonly' : ''}>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="email">Email Address *</label>
              <input type="email" id="email" name="email" required ${isView ? 'readonly' : ''}>
            </div>
            <div class="form-group">
              <label for="phone">Phone Number</label>
              <input type="tel" id="phone" name="phone" ${isView ? 'readonly' : ''}>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="dateOfBirth">Date of Birth</label>
              <input type="date" id="dateOfBirth" name="dateOfBirth" ${isView ? 'readonly' : ''}>
            </div>
          </div>
        </div>

        <!-- Address Information -->
        <div class="form-section">
          <h4>Address Information</h4>
          <div class="form-group">
            <label for="address.street">Street Address</label>
            <input type="text" id="address.street" name="address.street" ${isView ? 'readonly' : ''}>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="address.city">City</label>
              <input type="text" id="address.city" name="address.city" ${isView ? 'readonly' : ''}>
            </div>
            <div class="form-group">
              <label for="address.state">State/Province</label>
              <input type="text" id="address.state" name="address.state" ${isView ? 'readonly' : ''}>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="address.zipCode">ZIP/Postal Code</label>
              <input type="text" id="address.zipCode" name="address.zipCode" ${isView ? 'readonly' : ''}>
            </div>
            <div class="form-group">
              <label for="address.country">Country</label>
              <input type="text" id="address.country" name="address.country" ${isView ? 'readonly' : ''}>
            </div>
          </div>
        </div>

        <!-- Preferences -->
        <div class="form-section">
          <h4>Preferences</h4>
          <div class="form-row">
            <div class="form-group">
              <label for="preferences.language">Language</label>
              <select id="preferences.language" name="preferences.language" ${isView ? 'disabled' : ''}>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
              </select>
            </div>
            <div class="form-group">
              <label for="preferences.currency">Currency</label>
              <select id="preferences.currency" name="preferences.currency" ${isView ? 'disabled' : ''}>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group checkbox">
              <label class="checkbox-label">
                <input type="checkbox" id="preferences.notifications" name="preferences.notifications" ${isView ? 'disabled' : ''}>
                <span class="checkmark"></span>
                Receive notifications
              </label>
            </div>
            <div class="form-group checkbox">
              <label class="checkbox-label">
                <input type="checkbox" id="preferences.marketingEmails" name="preferences.marketingEmails" ${isView ? 'disabled' : ''}>
                <label for="preferences.marketingEmails">Receive marketing emails</label>
              </label>
            </div>
          </div>
        </div>

        <!-- Account Settings -->
        <div class="form-section">
          <h4>Account Settings</h4>
          <div class="form-row">
            <div class="form-group">
              <label for="status">Status</label>
              <select id="status" name="status" ${isView ? 'disabled' : ''}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div class="form-group">
              <label for="vipTier">VIP Tier</label>
              <select id="vipTier" name="vipTier" ${isView ? 'disabled' : ''}>
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
                <option value="diamond">Diamond</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="riskLevel">Risk Level</label>
              <select id="riskLevel" name="riskLevel" ${isView ? 'disabled' : ''}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="extreme">Extreme</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label for="notes">Notes</label>
            <textarea id="notes" name="notes" rows="3" ${isView ? 'readonly' : ''}></textarea>
          </div>
        </div>
      </div>

      ${
        !isView
          ? `
        <div class="customer-form-footer">
          <button type="button" class="btn btn-secondary" data-action="reset">Reset</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update Customer' : 'Create Customer'}</button>
        </div>
      `
          : ''
      }
    `;
  }

  private setupFormEventListeners(form: HTMLFormElement, formId: string): void {
    // Handle form submission
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const event = new CustomEvent('form-submit', {
        detail: { formId, form },
      });
      form.dispatchEvent(event);
    });

    // Handle input validation
    form.addEventListener('input', e => {
      const target = e.target as HTMLInputElement;
      this.validateField(target);
    });

    // Handle reset button
    const resetBtn = form.querySelector('[data-action="reset"]');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetForm(formId);
      });
    }
  }

  private populateFormFields(form: HTMLFormElement, data: CustomerFormData): void {
    // Populate basic fields
    this.setFieldValue(form, 'firstName', data.firstName);
    this.setFieldValue(form, 'lastName', data.lastName);
    this.setFieldValue(form, 'email', data.email);
    this.setFieldValue(form, 'phone', data.phone);
    this.setFieldValue(form, 'dateOfBirth', data.dateOfBirth);
    this.setFieldValue(form, 'notes', data.notes);

    // Populate address fields
    this.setFieldValue(form, 'address.street', data.address.street);
    this.setFieldValue(form, 'address.city', data.address.city);
    this.setFieldValue(form, 'address.state', data.address.state);
    this.setFieldValue(form, 'address.zipCode', data.address.zipCode);
    this.setFieldValue(form, 'address.country', data.address.country);

    // Populate preferences
    this.setFieldValue(form, 'preferences.language', data.preferences.language);
    this.setFieldValue(form, 'preferences.currency', data.preferences.currency);
    this.setFieldValue(form, 'preferences.notifications', data.preferences.notifications);
    this.setFieldValue(form, 'preferences.marketingEmails', data.preferences.marketingEmails);

    // Populate account settings
    this.setFieldValue(form, 'status', data.status);
    this.setFieldValue(form, 'vipTier', data.vipTier);
    this.setFieldValue(form, 'riskLevel', data.riskLevel);
  }

  private setFieldValue(form: HTMLFormElement, fieldName: string, value: any): void {
    const field = form.querySelector(`[name="${fieldName}"]`) as HTMLInputElement;
    if (!field) return;

    if (field.type === 'checkbox') {
      field.checked = Boolean(value);
    } else {
      field.value = value || '';
    }
  }

  private async validateCustomerData(data: CustomerFormData): Promise<CustomerValidationResult> {
    const errors: CustomerValidationError[] = [];
    const warnings: CustomerValidationWarning[] = [];

    // Required field validation
    if (!data.firstName.trim()) {
      errors.push({
        field: 'firstName',
        code: 'REQUIRED',
        message: 'First name is required',
      });
    }

    if (!data.lastName.trim()) {
      errors.push({
        field: 'lastName',
        code: 'REQUIRED',
        message: 'Last name is required',
      });
    }

    if (!data.email.trim()) {
      errors.push({
        field: 'email',
        code: 'REQUIRED',
        message: 'Email is required',
      });
    } else if (!this.isValidEmail(data.email)) {
      errors.push({
        field: 'email',
        code: 'INVALID_FORMAT',
        message: 'Invalid email format',
      });
    }

    // Phone validation
    if (data.phone && !this.isValidPhone(data.phone)) {
      warnings.push({
        field: 'phone',
        code: 'INVALID_FORMAT',
        message: 'Phone number format may be invalid',
      });
    }

    // Age validation
    if (data.dateOfBirth) {
      const age = this.calculateAge(data.dateOfBirth);
      if (age < 18) {
        errors.push({
          field: 'dateOfBirth',
          code: 'AGE_RESTRICTION',
          message: 'Customer must be at least 18 years old',
        });
      } else if (age < 21) {
        warnings.push({
          field: 'dateOfBirth',
          code: 'AGE_WARNING',
          message: 'Customer is under 21 - additional verification may be required',
        });
      }
    }

    // Duplicate email check
    if (data.email && !data.customerId) {
      const existingCustomer = await this.customerService.getCustomerByEmail(data.email);
      if (existingCustomer) {
        errors.push({
          field: 'email',
          code: 'DUPLICATE',
          message: 'Email address already exists',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateField(field: HTMLInputElement): void {
    const errorClass = 'field-error';
    const existingError = field.parentElement?.querySelector('.field-error-message');

    // Remove existing error
    if (existingError) {
      existingError.remove();
    }
    field.classList.remove(errorClass);

    let errorMessage = '';

    // Basic validation
    if (field.hasAttribute('required') && !field.value.trim()) {
      errorMessage = 'This field is required';
    } else if (field.type === 'email' && field.value && !this.isValidEmail(field.value)) {
      errorMessage = 'Invalid email format';
    }

    // Show error if any
    if (errorMessage) {
      field.classList.add(errorClass);

      const errorElement = document.createElement('div');
      errorElement.className = 'field-error-message';
      errorElement.textContent = errorMessage;

      field.parentElement?.appendChild(errorElement);
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  private calculateAge(dateOfBirth: string): number {
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }

  private cleanupForm(formId: string): void {
    this.activeForms.delete(formId);
    this.formData.delete(formId);
  }
}
