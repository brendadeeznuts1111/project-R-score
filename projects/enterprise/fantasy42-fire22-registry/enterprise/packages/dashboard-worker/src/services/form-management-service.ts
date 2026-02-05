/**
 * Fire22 Form Management Service
 * Comprehensive form handling with Select2, date pickers, validation, and data management
 */

import { EventEmitter } from 'events';

export interface FormField {
  id: string;
  type:
    | 'select'
    | 'multiselect'
    | 'datetime'
    | 'date'
    | 'time'
    | 'daterange'
    | 'text'
    | 'number'
    | 'email';
  label: string;
  required?: boolean;
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    custom?: (value: any) => boolean;
  };
  options?: SelectOption[];
  placeholder?: string;
  defaultValue?: any;
  dependencies?: string[]; // Field IDs that this field depends on
  conditionalLogic?: {
    dependsOn: string;
    condition: (value: any) => boolean;
    action: 'show' | 'hide' | 'enable' | 'disable';
  };
}

export interface SelectOption {
  id: string | number;
  text: string;
  icon?: string;
  data?: any;
  disabled?: boolean;
  children?: SelectOption[];
}

export interface FormConfig {
  id: string;
  title: string;
  fields: FormField[];
  layout?: 'horizontal' | 'vertical' | 'grid';
  submitButton?: {
    text: string;
    class?: string;
    action?: string;
  };
  cancelButton?: {
    text: string;
    class?: string;
    action?: string;
  };
  validationMode?: 'onChange' | 'onSubmit' | 'onBlur';
  dataSource?: {
    url: string;
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
    transform?: (data: any) => any;
  };
}

export interface FormData {
  [key: string]: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export class FormManagementService extends EventEmitter {
  private static instance: FormManagementService;
  private forms: Map<string, FormConfig> = new Map();
  private formData: Map<string, FormData> = new Map();
  private initializedComponents: Set<string> = new Set();
  private isInitialized = false;

  constructor() {
    super();
  }

  public static getInstance(): FormManagementService {
    if (!FormManagementService.instance) {
      FormManagementService.instance = new FormManagementService();
    }
    return FormManagementService.instance;
  }

  /**
   * Initialize the form management service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Load required libraries
    await this.loadLibraries();

    // Setup global event listeners
    this.setupGlobalListeners();

    // Initialize common form configurations
    this.initializeDefaultForms();

    this.isInitialized = true;
  }

  /**
   * Load required form libraries
   */
  private async loadLibraries(): Promise<void> {
    const libraries = [
      'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datetimepicker/4.17.47/js/bootstrap-datetimepicker.min.js',
      'https://cdn.jsdelivr.net/npm/daterangepicker@3.1.0/daterangepicker.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/pickadate.js/3.5.6/compressed/picker.js',
      'https://cdnjs.cloudflare.com/ajax/libs/pickadate.js/3.5.6/compressed/picker.date.js',
      'https://cdnjs.cloudflare.com/ajax/libs/pickadate.js/3.5.6/compressed/picker.time.js',
    ];

    for (const lib of libraries) {
      await this.loadScript(lib);
    }
  }

  /**
   * Load script dynamically
   */
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Setup global event listeners
   */
  private setupGlobalListeners(): void {
    // Listen for form submissions
    document.addEventListener('submit', event => {
      const form = event.target as HTMLFormElement;
      if (form.hasAttribute('data-fire22-form')) {
        event.preventDefault();
        this.handleFormSubmit(form);
      }
    });

    // Listen for form field changes
    document.addEventListener('change', event => {
      const target = event.target as HTMLElement;
      if (target.hasAttribute('data-fire22-field')) {
        this.handleFieldChange(target);
      }
    });
  }

  /**
   * Initialize default form configurations
   */
  private initializeDefaultForms(): void {
    // Agent Management Form
    this.registerForm({
      id: 'agent-management',
      title: 'Agent Management',
      fields: [
        {
          id: 'agent-name',
          type: 'text',
          label: 'Agent Name',
          required: true,
          validation: {
            minLength: 2,
            maxLength: 50,
          },
        },
        {
          id: 'agent-type',
          type: 'select',
          label: 'Agent Type',
          required: true,
          options: [
            { id: 'master', text: 'Master Agent' },
            { id: 'agent', text: 'Agent' },
            { id: 'sub-agent', text: 'Sub-Agent' },
          ],
        },
        {
          id: 'location',
          type: 'select',
          label: 'Location',
          required: true,
          options: [
            { id: 'miami', text: 'Miami' },
            { id: 'broward', text: 'Fort Lauderdale' },
            { id: 'dade', text: 'Miami-Dade' },
          ],
        },
        {
          id: 'commission-rate',
          type: 'number',
          label: 'Commission Rate (%)',
          validation: {
            min: 0,
            max: 100,
          },
        },
        {
          id: 'start-date',
          type: 'date',
          label: 'Start Date',
          required: true,
        },
      ],
      submitButton: {
        text: 'Save Agent',
        class: 'btn btn-primary',
      },
    });

    // Transaction Filter Form
    this.registerForm({
      id: 'transaction-filter',
      title: 'Transaction Filters',
      layout: 'horizontal',
      fields: [
        {
          id: 'date-range',
          type: 'daterange',
          label: 'Date Range',
          placeholder: 'Select date range',
        },
        {
          id: 'agent-filter',
          type: 'multiselect',
          label: 'Agents',
          options: [
            { id: 'palma', text: 'PALMA' },
            { id: 'broward', text: 'BROWARD' },
            { id: 'dade', text: 'DADE' },
          ],
        },
        {
          id: 'bet-types',
          type: 'multiselect',
          label: 'Bet Types',
          options: [
            { id: 'DT', text: 'Daily Tickets (DT)' },
            { id: 'Internet', text: 'Internet Bets' },
            { id: 'Live', text: 'Live Betting' },
            { id: 'PropB', text: 'Proposition Bets' },
            { id: 'Phone', text: 'Phone Bets' },
          ],
        },
        {
          id: 'amount-range',
          type: 'text',
          label: 'Amount Range',
          placeholder: 'Min - Max',
        },
      ],
      submitButton: {
        text: 'Apply Filters',
        class: 'btn btn-primary',
      },
      cancelButton: {
        text: 'Reset',
        class: 'btn btn-secondary',
      },
    });
  }

  /**
   * Register a new form configuration
   */
  registerForm(config: FormConfig): void {
    this.forms.set(config.id, config);
    this.emit('form-registered', config);
  }

  /**
   * Create and render a form
   */
  async createForm(formId: string, container: HTMLElement): Promise<void> {
    const config = this.forms.get(formId);
    if (!config) {
      throw new Error(`Form not found: ${formId}`);
    }

    // Create form HTML
    const formHtml = this.generateFormHtml(config);
    container.innerHTML = formHtml;

    // Initialize form components
    await this.initializeFormComponents(config);

    // Setup form data
    this.formData.set(formId, {});

    this.emit('form-created', { formId, config });
  }

  /**
   * Generate HTML for a form
   */
  private generateFormHtml(config: FormConfig): string {
    const layoutClass = config.layout === 'horizontal' ? 'form-horizontal' : 'form-vertical';

    let html = `
      <form id="form-${config.id}" class="fire22-form ${layoutClass}" data-fire22-form="${config.id}">
        <div class="form-header">
          <h3>${config.title}</h3>
        </div>
        <div class="form-body">
    `;

    // Generate fields
    for (const field of config.fields) {
      html += this.generateFieldHtml(field);
    }

    // Generate buttons
    html += `
        </div>
        <div class="form-footer">
    `;

    if (config.cancelButton) {
      html += `
          <button type="button" class="${config.cancelButton.class || 'btn btn-secondary'}"
                  onclick="${config.cancelButton.action || "resetForm('" + config.id + "')"}">
            ${config.cancelButton.text}
          </button>
      `;
    }

    if (config.submitButton) {
      html += `
          <button type="submit" class="${config.submitButton.class || 'btn btn-primary'}">
            ${config.submitButton.text}
          </button>
      `;
    }

    html += `
        </div>
      </form>
    `;

    return html;
  }

  /**
   * Generate HTML for a form field
   */
  private generateFieldHtml(field: FormField): string {
    const requiredClass = field.required ? 'required' : '';
    const fieldId = `field-${field.id}`;

    let html = `
      <div class="form-group ${requiredClass}" data-field="${field.id}">
        <label for="${fieldId}" class="form-label">
          ${field.label}
          ${field.required ? '<span class="required-indicator">*</span>' : ''}
        </label>
    `;

    switch (field.type) {
      case 'select':
        html += this.generateSelectField(field, fieldId);
        break;
      case 'multiselect':
        html += this.generateMultiSelectField(field, fieldId);
        break;
      case 'datetime':
        html += this.generateDateTimeField(field, fieldId);
        break;
      case 'date':
        html += this.generateDateField(field, fieldId);
        break;
      case 'time':
        html += this.generateTimeField(field, fieldId);
        break;
      case 'daterange':
        html += this.generateDateRangeField(field, fieldId);
        break;
      case 'text':
      case 'number':
      case 'email':
        html += this.generateInputField(field, fieldId);
        break;
    }

    html += `
        <div class="field-error" id="error-${fieldId}"></div>
      </div>
    `;

    return html;
  }

  /**
   * Generate select field HTML
   */
  private generateSelectField(field: FormField, fieldId: string): string {
    let options = '<option value="">Select an option</option>';
    if (field.options) {
      options += field.options
        .map(opt => `<option value="${opt.id}">${opt.text}</option>`)
        .join('');
    }

    return `
      <select id="${fieldId}" class="form-control select2" data-fire22-field="${field.id}"
              ${field.placeholder ? `data-placeholder="${field.placeholder}"` : ''}>
        ${options}
      </select>
    `;
  }

  /**
   * Generate multi-select field HTML
   */
  private generateMultiSelectField(field: FormField, fieldId: string): string {
    let options = '';
    if (field.options) {
      options += field.options
        .map(opt => `<option value="${opt.id}">${opt.text}</option>`)
        .join('');
    }

    return `
      <select id="${fieldId}" class="form-control select2" multiple data-fire22-field="${field.id}"
              ${field.placeholder ? `data-placeholder="${field.placeholder}"` : ''}>
        ${options}
      </select>
    `;
  }

  /**
   * Generate date/time field HTML
   */
  private generateDateTimeField(field: FormField, fieldId: string): string {
    return `
      <div class="input-group date" id="datetimepicker-${fieldId}">
        <input type="text" id="${fieldId}" class="form-control" data-fire22-field="${field.id}"
               ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}>
        <span class="input-group-addon">
          <i class="fas fa-calendar"></i>
        </span>
      </div>
    `;
  }

  /**
   * Generate date field HTML
   */
  private generateDateField(field: FormField, fieldId: string): string {
    return `
      <input type="text" id="${fieldId}" class="form-control pickadate" data-fire22-field="${field.id}"
             ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}>
    `;
  }

  /**
   * Generate time field HTML
   */
  private generateTimeField(field: FormField, fieldId: string): string {
    return `
      <input type="text" id="${fieldId}" class="form-control pickatime" data-fire22-field="${field.id}"
             ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}>
    `;
  }

  /**
   * Generate date range field HTML
   */
  private generateDateRangeField(field: FormField, fieldId: string): string {
    return `
      <input type="text" id="${fieldId}" class="form-control daterange" data-fire22-field="${field.id}"
             ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}>
    `;
  }

  /**
   * Generate input field HTML
   */
  private generateInputField(field: FormField, fieldId: string): string {
    return `
      <input type="${field.type}" id="${fieldId}" class="form-control" data-fire22-field="${field.id}"
             ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}>
    `;
  }

  /**
   * Initialize form components
   */
  private async initializeFormComponents(config: FormConfig): Promise<void> {
    // Wait for DOM to be ready
    await new Promise(resolve => setTimeout(resolve, 100));

    // Initialize Select2 components
    this.initializeSelect2Components(config);

    // Initialize date/time pickers
    this.initializeDateTimePickers(config);

    // Setup conditional logic
    this.setupConditionalLogic(config);
  }

  /**
   * Initialize Select2 components
   */
  private initializeSelect2Components(config: FormConfig): void {
    if (typeof $ === 'undefined' || !$.fn.select2) {
      console.warn('Select2 not available, skipping initialization');
      return;
    }

    // Basic Select2 select
    $('.select2').select2();

    // Placeholder selects
    $('.select2-placeholder').select2({
      placeholder: 'Select an option',
      allowClear: true,
    });

    // Multi-select with placeholder
    $('.select2-placeholder-multiple').select2({
      placeholder: 'Select options',
    });

    // Hide search box
    $('.hide-search').select2({
      minimumResultsForSearch: Infinity,
    });

    // Icon formatting
    $('.select2-icons').select2({
      minimumResultsForSearch: Infinity,
      templateResult: this.iconFormat.bind(this),
      templateSelection: this.iconFormat.bind(this),
    });

    // Data array selects
    config.fields.forEach(field => {
      const element = document.getElementById(`field-${field.id}`);
      if (element && field.options) {
        // Load options if not already loaded
        const selectElement = element as HTMLSelectElement;
        if (selectElement.options.length <= 1) {
          // Only placeholder option
          field.options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = String(option.id);
            optionElement.textContent = option.text;
            selectElement.appendChild(optionElement);
          });
        }
      }
    });
  }

  /**
   * Initialize date/time pickers
   */
  private initializeDateTimePickers(config: FormConfig): void {
    // Bootstrap DateTimePicker
    config.fields.forEach(field => {
      if (field.type === 'datetime') {
        const element = document.getElementById(`datetimepicker-field-${field.id}`);
        if (element && typeof $ !== 'undefined' && $.fn.datetimepicker) {
          $(element).datetimepicker();
        }
      }
    });

    // Pick-a-Date
    config.fields.forEach(field => {
      if (field.type === 'date') {
        const element = document.getElementById(`field-${field.id}`);
        if (element && typeof $ !== 'undefined' && $.fn.pickadate) {
          $(element).pickadate();
        }
      }
    });

    // Pick-a-Time
    config.fields.forEach(field => {
      if (field.type === 'time') {
        const element = document.getElementById(`field-${field.id}`);
        if (element && typeof $ !== 'undefined' && $.fn.pickatime) {
          $(element).pickatime();
        }
      }
    });

    // Date Range Picker
    config.fields.forEach(field => {
      if (field.type === 'daterange') {
        const element = document.getElementById(`field-${field.id}`);
        if (element && typeof $ !== 'undefined' && $.fn.daterangepicker) {
          $(element).daterangepicker({
            autoApply: true,
            locale: {
              format: 'MM/DD/YYYY',
            },
          });
        }
      }
    });
  }

  /**
   * Setup conditional logic
   */
  private setupConditionalLogic(config: FormConfig): void {
    config.fields.forEach(field => {
      if (field.conditionalLogic) {
        const dependsOnElement = document.getElementById(
          `field-${field.conditionalLogic.dependsOn}`
        );
        const targetElement = document.getElementById(`field-${field.id}`);

        if (dependsOnElement && targetElement) {
          const parent = targetElement.closest('.form-group') as HTMLElement;

          dependsOnElement.addEventListener('change', () => {
            const value = this.getFieldValue(dependsOnElement);
            const shouldShow = field.conditionalLogic!.condition(value);

            switch (field.conditionalLogic!.action) {
              case 'show':
                parent.style.display = shouldShow ? 'block' : 'none';
                break;
              case 'hide':
                parent.style.display = shouldShow ? 'none' : 'block';
                break;
              case 'enable':
                (targetElement as HTMLInputElement).disabled = !shouldShow;
                break;
              case 'disable':
                (targetElement as HTMLInputElement).disabled = shouldShow;
                break;
            }
          });
        }
      }
    });
  }

  /**
   * Icon format function for Select2
   */
  private iconFormat(icon: any): string {
    if (!icon.id) {
      return icon.text;
    }

    const originalOption = icon.element;
    const iconClass = $(originalOption).data('icon') || 'fas fa-circle';

    return `<i class="${iconClass}"></i> ${icon.text}`;
  }

  /**
   * Handle form submission
   */
  private async handleFormSubmit(form: HTMLFormElement): Promise<void> {
    const formId = form.getAttribute('data-fire22-form');
    if (!formId) return;

    const config = this.forms.get(formId);
    if (!config) return;

    // Collect form data
    const formData = this.collectFormData(config);

    // Validate form
    const validation = this.validateForm(config, formData);

    if (!validation.isValid) {
      this.displayValidationErrors(config, validation.errors);
      this.emit('form-validation-failed', { formId, errors: validation.errors });
      return;
    }

    // Clear previous errors
    this.clearValidationErrors(config);

    // Submit form
    try {
      this.emit('form-submit-start', { formId, data: formData });

      let result;
      if (config.dataSource) {
        result = await this.submitToDataSource(config.dataSource, formData);
      } else {
        // Handle form submission locally
        result = await this.handleLocalSubmission(formId, formData);
      }

      this.emit('form-submit-success', { formId, data: formData, result });
    } catch (error) {
      console.error(`❌ Form submission failed: ${formId}`, error);
      this.emit('form-submit-error', { formId, error });
    }
  }

  /**
   * Handle field changes
   */
  private handleFieldChange(element: HTMLElement): void {
    const fieldId = element.getAttribute('data-fire22-field');
    const formId = element.closest('form')?.getAttribute('data-fire22-form');

    if (!fieldId || !formId) return;

    const config = this.forms.get(formId);
    if (!config) return;

    const field = config.fields.find(f => f.id === fieldId);
    if (!field) return;

    // Update form data
    const value = this.getFieldValue(element);
    const formData = this.formData.get(formId) || {};
    formData[fieldId] = value;
    this.formData.set(formId, formData);

    // Real-time validation if enabled
    if (config.validationMode === 'onChange') {
      const validation = this.validateField(field, value);
      if (!validation.isValid) {
        this.displayFieldError(field, validation.errors[0]);
      } else {
        this.clearFieldError(field);
      }
    }

    this.emit('field-changed', { formId, fieldId, value });
  }

  /**
   * Collect form data
   */
  private collectFormData(config: FormConfig): FormData {
    const formData: FormData = {};

    config.fields.forEach(field => {
      const element = document.getElementById(`field-${field.id}`);
      if (element) {
        formData[field.id] = this.getFieldValue(element);
      }
    });

    return formData;
  }

  /**
   * Get field value
   */
  private getFieldValue(element: HTMLElement): any {
    const input = element as HTMLInputElement;

    if (element.tagName === 'SELECT') {
      const select = element as HTMLSelectElement;
      if (select.multiple) {
        return Array.from(select.selectedOptions).map(opt => opt.value);
      }
      return select.value;
    }

    return input.value;
  }

  /**
   * Validate form
   */
  private validateForm(config: FormConfig, data: FormData): ValidationResult {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    config.fields.forEach(field => {
      const fieldValidation = this.validateField(field, data[field.id]);
      if (!fieldValidation.isValid) {
        errors[field.id] = Object.values(fieldValidation.errors)[0];
      }
      if (fieldValidation.warnings) {
        Object.assign(warnings, fieldValidation.warnings);
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate individual field
   */
  private validateField(field: FormField, value: any): ValidationResult {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    // Required validation
    if (
      field.required &&
      (value === '' ||
        value === null ||
        value === undefined ||
        (Array.isArray(value) && value.length === 0))
    ) {
      errors[field.id] = `${field.label} is required`;
      return { isValid: false, errors, warnings };
    }

    // Skip further validation if field is empty and not required
    if (!field.required && (value === '' || value === null || value === undefined)) {
      return { isValid: true, errors, warnings };
    }

    // Type-specific validation
    if (field.validation) {
      const validation = field.validation;

      // Pattern validation
      if (validation.pattern && !validation.pattern.test(String(value))) {
        errors[field.id] = `${field.label} format is invalid`;
      }

      // Length validation
      if (validation.minLength && String(value).length < validation.minLength) {
        errors[field.id] = `${field.label} must be at least ${validation.minLength} characters`;
      }

      if (validation.maxLength && String(value).length > validation.maxLength) {
        errors[field.id] = `${field.label} must be no more than ${validation.maxLength} characters`;
      }

      // Number validation
      if (field.type === 'number' && typeof value === 'string') {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          errors[field.id] = `${field.label} must be a valid number`;
        } else {
          if (validation.min !== undefined && numValue < validation.min) {
            errors[field.id] = `${field.label} must be at least ${validation.min}`;
          }
          if (validation.max !== undefined && numValue > validation.max) {
            errors[field.id] = `${field.label} must be no more than ${validation.max}`;
          }
        }
      }

      // Custom validation
      if (validation.custom && !validation.custom(value)) {
        errors[field.id] = `${field.label} is invalid`;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Display validation errors
   */
  private displayValidationErrors(config: FormConfig, errors: Record<string, string>): void {
    Object.entries(errors).forEach(([fieldId, error]) => {
      const field = config.fields.find(f => f.id === fieldId);
      if (field) {
        this.displayFieldError(field, error);
      }
    });
  }

  /**
   * Display field error
   */
  private displayFieldError(field: FormField, error: string): void {
    const errorElement = document.getElementById(`error-field-${field.id}`);
    if (errorElement) {
      errorElement.textContent = error;
      errorElement.style.display = 'block';
    }

    // Add error class to field
    const fieldElement = document.getElementById(`field-${field.id}`);
    if (fieldElement) {
      fieldElement.classList.add('error');
    }
  }

  /**
   * Clear validation errors
   */
  private clearValidationErrors(config: FormConfig): void {
    config.fields.forEach(field => {
      this.clearFieldError(field);
    });
  }

  /**
   * Clear field error
   */
  private clearFieldError(field: FormField): void {
    const errorElement = document.getElementById(`error-field-${field.id}`);
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.style.display = 'none';
    }

    // Remove error class from field
    const fieldElement = document.getElementById(`field-${field.id}`);
    if (fieldElement) {
      fieldElement.classList.remove('error');
    }
  }

  /**
   * Submit to data source
   */
  private async submitToDataSource(
    dataSource: FormConfig['dataSource'],
    data: FormData
  ): Promise<any> {
    if (!dataSource) throw new Error('No data source configured');

    const response = await fetch(dataSource.url, {
      method: dataSource.method,
      headers: {
        'Content-Type': 'application/json',
        ...dataSource.headers,
      },
      body: dataSource.method === 'POST' ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    // Transform data if needed
    if (dataSource.transform) {
      return dataSource.transform(result);
    }

    return result;
  }

  /**
   * Handle local form submission
   */
  private async handleLocalSubmission(formId: string, data: FormData): Promise<any> {
    // Handle different form types
    switch (formId) {
      case 'agent-management':
        return await this.handleAgentManagementSubmission(data);
      case 'transaction-filter':
        return await this.handleTransactionFilterSubmission(data);
      default:
        return { success: true, data };
    }
  }

  /**
   * Handle agent management form submission
   */
  private async handleAgentManagementSubmission(data: FormData): Promise<any> {
    // Simulate API call

    // Here you would typically make an API call to save the agent
    // For demo purposes, we'll just return success
    return {
      success: true,
      agentId: data['agent-name']?.toLowerCase().replace(/\s+/g, '-') || 'new-agent',
      message: 'Agent saved successfully',
    };
  }

  /**
   * Handle transaction filter form submission
   */
  private async handleTransactionFilterSubmission(data: FormData): Promise<any> {
    // Here you would typically apply filters to a transaction list
    // For demo purposes, we'll just return success
    return {
      success: true,
      filters: data,
      message: 'Filters applied successfully',
    };
  }

  /**
   * Get form data
   */
  getFormData(formId: string): FormData | undefined {
    return this.formData.get(formId);
  }

  /**
   * Set form data
   */
  setFormData(formId: string, data: FormData): void {
    this.formData.set(formId, data);
  }

  /**
   * Reset form
   */
  resetForm(formId: string): void {
    const config = this.forms.get(formId);
    if (!config) return;

    // Reset form data
    this.formData.set(formId, {});

    // Reset form fields
    config.fields.forEach(field => {
      const element = document.getElementById(`field-${field.id}`) as HTMLInputElement;
      if (element) {
        if (element.tagName === 'SELECT') {
          const select = element as HTMLSelectElement;
          if (select.multiple) {
            Array.from(select.options).forEach(opt => (opt.selected = false));
          } else {
            select.value = '';
          }
        } else {
          element.value = '';
        }
      }
    });

    // Clear errors
    this.clearValidationErrors(config);

    this.emit('form-reset', { formId });
  }

  /**
   * Export form configuration
   */
  exportFormConfig(formId: string): FormConfig | undefined {
    return this.forms.get(formId);
  }

  /**
   * Import form configuration
   */
  importFormConfig(config: FormConfig): void {
    this.registerForm(config);
  }

  /**
   * Get all registered forms
   */
  getRegisteredForms(): string[] {
    return Array.from(this.forms.keys());
  }

  /**
   * Remove form
   */
  removeForm(formId: string): void {
    this.forms.delete(formId);
    this.formData.delete(formId);
    this.emit('form-removed', { formId });
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.forms.clear();
    this.formData.clear();
    this.initializedComponents.clear();
    this.removeAllListeners();
  }
}

// Global functions for easy access
export async function initializeFormManagement(): Promise<FormManagementService> {
  const service = FormManagementService.getInstance();
  await service.initialize();
  return service;
}

export async function createForm(formId: string, container: HTMLElement): Promise<void> {
  const service = FormManagementService.getInstance();
  await service.createForm(formId, container);
}

export function resetForm(formId: string): void {
  const service = FormManagementService.getInstance();
  service.resetForm(formId);
}

export { FormManagementService };
