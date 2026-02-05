/**
 * Fire22 Customer Information Interface Component
 * Advanced customer profile management with search, forms, and real-time updates
 */

import { EventEmitter } from 'events';
import {
  CustomerInformationService,
  CustomerProfile,
  CustomerSearchFilters,
} from '../services/customer-information-service';
import { FormManagementService } from '../services/form-management-service';
import { CashierService } from '../services/cashier-service';

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
}

export class CustomerInformationInterface extends EventEmitter {
  private container: HTMLElement;
  private options: CustomerInterfaceOptions;
  private customerService: CustomerInformationService;
  private formService: FormManagementService;
  private cashierService: CashierService;
  private currentView: 'dashboard' | 'list' | 'search' | 'create' | 'edit' | 'profile' =
    'dashboard';
  private selectedCustomer: CustomerProfile | null = null;
  private searchResults: CustomerProfile[] = [];
  private isInitialized = false;

  constructor(options: CustomerInterfaceOptions) {
    super();
    this.container = options.container;
    this.options = {
      enableSearch: true,
      enableCreate: true,
      enableEdit: true,
      enableDelete: false, // Disabled by default for safety
      enableExport: true,
      enableRealTimeUpdates: true,
      maxSearchResults: 100,
      defaultView: 'list',
      ...options,
    };

    this.customerService = CustomerInformationService.getInstance();
    this.formService = FormManagementService.getInstance();
    this.cashierService = CashierService.getInstance();
  }

  /**
   * Initialize the customer interface
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Initialize dependencies
    await this.customerService.initialize();

    // Setup event listeners
    this.setupEventListeners();

    // Initialize forms
    await this.initializeForms();

    // Render initial interface
    this.render();

    // Setup real-time updates
    if (this.options.enableRealTimeUpdates) {
      this.setupRealTimeUpdates();
    }

    this.isInitialized = true;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for customer service events
    this.customerService.on('customer-created', customer => {
      this.onCustomerCreated(customer);
    });

    this.customerService.on('customer-updated', customer => {
      this.onCustomerUpdated(customer);
    });

    this.customerService.on('customer-updated-realtime', customer => {
      this.onCustomerUpdatedRealtime(customer);
    });

    // Listen for DOM events
    this.container.addEventListener('click', event => {
      const target = event.target as HTMLElement;
      const action =
        target.getAttribute('data-action') ||
        target.closest('[data-action]')?.getAttribute('data-action');

      if (action) {
        this.handleAction(action, target, event);
      }
    });

    // Listen for form submissions
    this.container.addEventListener('submit', event => {
      const form = event.target as HTMLFormElement;
      if (form.hasAttribute('data-customer-form')) {
        event.preventDefault();
        this.handleFormSubmit(form);
      }
    });

    // Listen for search input
    this.container.addEventListener('input', event => {
      const target = event.target as HTMLInputElement;
      if (target.hasAttribute('data-search-input')) {
        this.handleSearchInput(target.value);
      }
    });
  }

  /**
   * Initialize forms
   */
  private async initializeForms(): Promise<void> {
    // Register customer profile form
    this.formService.registerForm({
      id: 'customer-profile',
      title: 'Customer Profile',
      fields: [
        {
          id: 'customerId',
          type: 'text',
          label: 'Customer ID',
          required: false,
          placeholder: 'Auto-generated',
        },
        {
          id: 'firstName',
          type: 'text',
          label: 'First Name',
          required: true,
          validation: { minLength: 2, maxLength: 50 },
        },
        {
          id: 'lastName',
          type: 'text',
          label: 'Last Name',
          required: true,
          validation: { minLength: 2, maxLength: 50 },
        },
        {
          id: 'email',
          type: 'email',
          label: 'Email Address',
          required: true,
          validation: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        },
        {
          id: 'phone',
          type: 'text',
          label: 'Phone Number',
          required: true,
          validation: {
            pattern: /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
          },
        },
        {
          id: 'altPhone',
          type: 'text',
          label: 'Alternate Phone',
          required: false,
        },
        {
          id: 'dateOfBirth',
          type: 'date',
          label: 'Date of Birth',
          required: false,
        },
        {
          id: 'street',
          type: 'text',
          label: 'Street Address',
          required: true,
          validation: { minLength: 5 },
        },
        {
          id: 'city',
          type: 'text',
          label: 'City',
          required: true,
          validation: { minLength: 2 },
        },
        {
          id: 'state',
          type: 'select',
          label: 'State',
          required: true,
          options: [
            { id: 'AL', text: 'Alabama' },
            { id: 'AK', text: 'Alaska' },
            { id: 'AZ', text: 'Arizona' },
            { id: 'AR', text: 'Arkansas' },
            { id: 'CA', text: 'California' },
            { id: 'CO', text: 'Colorado' },
            { id: 'CT', text: 'Connecticut' },
            { id: 'DE', text: 'Delaware' },
            { id: 'DC', text: 'District of Columbia' },
            { id: 'FL', text: 'Florida' },
            { id: 'GA', text: 'Georgia' },
            { id: 'HI', text: 'Hawaii' },
            { id: 'ID', text: 'Idaho' },
            { id: 'IL', text: 'Illinois' },
            { id: 'IN', text: 'Indiana' },
            { id: 'IA', text: 'Iowa' },
            { id: 'KS', text: 'Kansas' },
            { id: 'KY', text: 'Kentucky' },
            { id: 'LA', text: 'Louisiana' },
            { id: 'ME', text: 'Maine' },
            { id: 'MD', text: 'Maryland' },
            { id: 'MA', text: 'Massachusetts' },
            { id: 'MI', text: 'Michigan' },
            { id: 'MN', text: 'Minnesota' },
            { id: 'MS', text: 'Mississippi' },
            { id: 'MO', text: 'Missouri' },
            { id: 'MT', text: 'Montana' },
            { id: 'NE', text: 'Nebraska' },
            { id: 'NV', text: 'Nevada' },
            { id: 'NH', text: 'New Hampshire' },
            { id: 'NJ', text: 'New Jersey' },
            { id: 'NM', text: 'New Mexico' },
            { id: 'NY', text: 'New York' },
            { id: 'NC', text: 'North Carolina' },
            { id: 'ND', text: 'North Dakota' },
            { id: 'OH', text: 'Ohio' },
            { id: 'OK', text: 'Oklahoma' },
            { id: 'OR', text: 'Oregon' },
            { id: 'PA', text: 'Pennsylvania' },
            { id: 'RI', text: 'Rhode Island' },
            { id: 'SC', text: 'South Carolina' },
            { id: 'SD', text: 'South Dakota' },
            { id: 'TN', text: 'Tennessee' },
            { id: 'TX', text: 'Texas' },
            { id: 'UT', text: 'Utah' },
            { id: 'VT', text: 'Vermont' },
            { id: 'VA', text: 'Virginia' },
            { id: 'WA', text: 'Washington' },
            { id: 'WV', text: 'West Virginia' },
            { id: 'WI', text: 'Wisconsin' },
            { id: 'WY', text: 'Wyoming' },
          ],
        },
        {
          id: 'zipCode',
          type: 'text',
          label: 'ZIP Code',
          required: true,
          validation: { pattern: /^\d{5}(-\d{4})?$/ },
        },
        {
          id: 'country',
          type: 'select',
          label: 'Country',
          required: true,
          options: [
            { id: 'US', text: 'United States' },
            { id: 'CA', text: 'Canada' },
            { id: 'MX', text: 'Mexico' },
          ],
          defaultValue: 'US',
        },
      ],
      submitButton: { text: 'Save Customer', class: 'btn btn-primary' },
      cancelButton: { text: 'Cancel', class: 'btn btn-secondary' },
    });
  }

  /**
   * Setup real-time updates
   */
  private setupRealTimeUpdates(): void {
    // Refresh data every 30 seconds
    setInterval(() => {
      this.refreshCurrentView();
    }, 30000);
  }

  /**
   * Render the customer interface
   */
  private render(): void {
    const html = this.generateInterfaceHtml();
    this.container.innerHTML = html;

    // Initialize components after rendering
    this.initializeComponents();

    // Load initial data
    this.loadInitialData();
  }

  /**
   * Generate interface HTML
   */
  private generateInterfaceHtml(): string {
    return `
      <div class="customer-interface">
        <!-- Header -->
        <div class="customer-header">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <h2 class="mb-0">👤 Customer Management</h2>
              <small class="text-muted">Comprehensive customer profile management system</small>
            </div>
            <div class="customer-actions">
              ${
                this.options.enableCreate
                  ? `<button class="btn btn-primary" data-action="create-customer">
                <i class="fas fa-plus"></i> New Customer
              </button>`
                  : ''
              }
              ${
                this.options.enableExport
                  ? `<button class="btn btn-secondary" data-action="export-customers">
                <i class="fas fa-download"></i> Export
              </button>`
                  : ''
              }
            </div>
          </div>
        </div>

        <!-- Navigation -->
        <div class="customer-nav">
          <div class="nav nav-tabs" role="tablist">
            <button class="nav-link active" data-action="show-dashboard">
              <i class="fas fa-tachometer-alt"></i> Dashboard
            </button>
            <button class="nav-link" data-action="show-list">
              <i class="fas fa-list"></i> Customer List
            </button>
            <button class="nav-link" data-action="show-search">
              <i class="fas fa-search"></i> Search
            </button>
          </div>
        </div>

        <!-- Search Bar (when enabled) -->
        ${
          this.options.enableSearch
            ? `
          <div class="customer-search">
            <div class="input-group">
              <input type="text" class="form-control" data-search-input
                     placeholder="Search customers by name, email, phone, or ID...">
              <div class="input-group-append">
                <button class="btn btn-outline-secondary" type="button" data-action="clear-search">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        `
            : ''
        }

        <!-- Content Area -->
        <div class="customer-content">
          <div id="dashboard-view" class="content-view active">
            ${this.generateDashboardView()}
          </div>
          <div id="list-view" class="content-view">
            ${this.generateListView()}
          </div>
          <div id="search-view" class="content-view">
            ${this.generateSearchView()}
          </div>
          <div id="create-view" class="content-view">
            ${this.generateCreateForm()}
          </div>
          <div id="edit-view" class="content-view">
            ${this.generateEditForm()}
          </div>
          <div id="profile-view" class="content-view">
            ${this.generateProfileView()}
          </div>
        </div>

        <!-- Loading Indicator -->
        <div id="loading-indicator" class="loading-overlay" style="display: none;">
          <div class="spinner-border text-primary" role="status">
            <span class="sr-only">Loading...</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate dashboard view
   */
  private generateDashboardView(): string {
    const stats = this.customerService.getStatistics();

    return `
      <div class="dashboard-overview">
        <!-- Statistics Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-users text-primary"></i>
            </div>
            <div class="stat-content">
              <h4>${stats.totalCustomers}</h4>
              <p>Total Customers</p>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-user-check text-success"></i>
            </div>
            <div class="stat-content">
              <h4>${stats.activeCustomers}</h4>
              <p>Active Customers</p>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-user-times text-warning"></i>
            </div>
            <div class="stat-content">
              <h4>${stats.suspendedCustomers}</h4>
              <p>Suspended</p>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-dollar-sign text-info"></i>
            </div>
            <div class="stat-content">
              <h4>$${stats.totalBalance.toFixed(2)}</h4>
              <p>Total Balance</p>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-chart-line text-secondary"></i>
            </div>
            <div class="stat-content">
              <h4>$${stats.averageBalance.toFixed(2)}</h4>
              <p>Average Balance</p>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-shield-alt text-danger"></i>
            </div>
            <div class="stat-content">
              <h4>${stats.highRiskCustomers}</h4>
              <p>High Risk</p>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <i class="fas fa-check-circle text-success"></i>
            </div>
            <div class="stat-content">
              <h4>${stats.verifiedCustomers}</h4>
              <p>Verified</p>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="dashboard-actions">
          <h5>Quick Actions</h5>
          <div class="action-buttons">
            <button class="btn btn-primary" data-action="show-search">
              <i class="fas fa-search"></i> Search Customers
            </button>
            ${
              this.options.enableCreate
                ? `
              <button class="btn btn-success" data-action="create-customer">
                <i class="fas fa-plus"></i> New Customer
              </button>
            `
                : ''
            }
            <button class="btn btn-info" data-action="show-list">
              <i class="fas fa-list"></i> View All
            </button>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="recent-activity">
          <h5>Recent Activity</h5>
          <div class="activity-list">
            <p class="text-muted">Recent customer activities will appear here...</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate list view
   */
  private generateListView(): string {
    return `
      <div class="customer-list">
        <div class="list-controls">
          <div class="row">
            <div class="col-md-4">
              <select class="form-control" id="list-status-filter">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div class="col-md-4">
              <select class="form-control" id="list-state-filter">
                <option value="">All States</option>
                <option value="FL">Florida</option>
                <option value="CA">California</option>
                <option value="NY">New York</option>
                <option value="TX">Texas</option>
              </select>
            </div>
            <div class="col-md-4">
              <input type="number" class="form-control" id="list-balance-min"
                     placeholder="Min Balance" min="0" step="0.01">
            </div>
          </div>
        </div>
        <div class="customer-table-container">
          <table class="table table-striped customer-table">
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Balance</th>
                <th>Risk Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="customer-table-body">
              <tr>
                <td colspan="8" class="text-center">
                  <div class="spinner-border" role="status">
                    <span class="sr-only">Loading...</span>
                  </div>
                  Loading customers...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pagination-container">
          <nav aria-label="Customer pagination">
            <ul class="pagination" id="customer-pagination">
              <!-- Pagination will be populated here -->
            </ul>
          </nav>
        </div>
      </div>
    `;
  }

  /**
   * Generate search view
   */
  private generateSearchView(): string {
    return `
      <div class="customer-search-view">
        <div class="search-filters">
          <h5>Advanced Search</h5>
          <div class="row">
            <div class="col-md-4">
              <div class="form-group">
                <label>Name</label>
                <input type="text" class="form-control" id="search-name" placeholder="First or last name">
              </div>
            </div>
            <div class="col-md-4">
              <div class="form-group">
                <label>Email</label>
                <input type="email" class="form-control" id="search-email" placeholder="Email address">
              </div>
            </div>
            <div class="col-md-4">
              <div class="form-group">
                <label>Phone</label>
                <input type="text" class="form-control" id="search-phone" placeholder="Phone number">
              </div>
            </div>
          </div>
          <div class="row">
            <div class="col-md-3">
              <div class="form-group">
                <label>Customer ID</label>
                <input type="text" class="form-control" id="search-customer-id" placeholder="Customer ID">
              </div>
            </div>
            <div class="col-md-3">
              <div class="form-group">
                <label>Status</label>
                <select class="form-control" id="search-status">
                  <option value="">Any Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="pending">Pending</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
            <div class="col-md-3">
              <div class="form-group">
                <label>State</label>
                <input type="text" class="form-control" id="search-state" placeholder="State (e.g., FL)">
              </div>
            </div>
            <div class="col-md-3">
              <div class="form-group">
                <label>City</label>
                <input type="text" class="form-control" id="search-city" placeholder="City">
              </div>
            </div>
          </div>
          <div class="search-actions">
            <button class="btn btn-primary" data-action="perform-search">
              <i class="fas fa-search"></i> Search
            </button>
            <button class="btn btn-secondary" data-action="clear-search-filters">
              <i class="fas fa-eraser"></i> Clear
            </button>
          </div>
        </div>

        <div class="search-results">
          <h5>Search Results</h5>
          <div id="search-results-container">
            <p class="text-muted">Enter search criteria and click Search to find customers...</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate create form
   */
  private generateCreateForm(): string {
    return `
      <div class="customer-form-container">
        <h4>Create New Customer</h4>
        <div id="create-form-container">
          <!-- Form will be loaded here -->
        </div>
      </div>
    `;
  }

  /**
   * Generate edit form
   */
  private generateEditForm(): string {
    return `
      <div class="customer-form-container">
        <h4>Edit Customer</h4>
        <div id="edit-form-container">
          <!-- Form will be loaded here -->
        </div>
      </div>
    `;
  }

  /**
   * Generate profile view
   */
  private generateProfileView(): string {
    if (!this.selectedCustomer) {
      return '<div class="text-center py-5"><p class="text-muted">No customer selected</p></div>';
    }

    const customer = this.selectedCustomer;

    return `
      <div class="customer-profile">
        <div class="profile-header">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h4>${customer.personalInfo.firstName} ${customer.personalInfo.lastName}</h4>
              <p class="text-muted mb-0">Customer ID: ${customer.customerId}</p>
              <span class="badge badge-${this.getStatusBadgeClass(customer.gaming.accountStatus)}">
                ${customer.gaming.accountStatus}
              </span>
            </div>
            <div class="profile-actions">
              ${
                this.options.enableEdit
                  ? `
                <button class="btn btn-primary btn-sm" data-action="edit-customer">
                  <i class="fas fa-edit"></i> Edit
                </button>
              `
                  : ''
              }
              <button class="btn btn-info btn-sm" data-action="view-transactions">
                <i class="fas fa-receipt"></i> Transactions
              </button>
            </div>
          </div>
        </div>

        <div class="profile-content">
          <div class="row">
            <!-- Personal Information -->
            <div class="col-md-6">
              <div class="profile-section">
                <h6>Personal Information</h6>
                <table class="table table-sm">
                  <tr><td><strong>Name:</strong></td><td>${customer.personalInfo.firstName} ${customer.personalInfo.lastName}</td></tr>
                  <tr><td><strong>Email:</strong></td><td>${customer.personalInfo.email}</td></tr>
                  <tr><td><strong>Phone:</strong></td><td>${customer.personalInfo.phone}</td></tr>
                  ${customer.personalInfo.altPhone ? `<tr><td><strong>Alt Phone:</strong></td><td>${customer.personalInfo.altPhone}</td></tr>` : ''}
                  ${customer.personalInfo.dateOfBirth ? `<tr><td><strong>DOB:</strong></td><td>${new Date(customer.personalInfo.dateOfBirth).toLocaleDateString()}</td></tr>` : ''}
                </table>
              </div>
            </div>

            <!-- Address -->
            <div class="col-md-6">
              <div class="profile-section">
                <h6>Address</h6>
                <table class="table table-sm">
                  <tr><td><strong>Street:</strong></td><td>${customer.address.street}</td></tr>
                  <tr><td><strong>City:</strong></td><td>${customer.address.city}</td></tr>
                  <tr><td><strong>State:</strong></td><td>${customer.address.state}</td></tr>
                  <tr><td><strong>ZIP:</strong></td><td>${customer.address.zipCode}</td></tr>
                  <tr><td><strong>Country:</strong></td><td>${customer.address.country}</td></tr>
                </table>
              </div>
            </div>
          </div>

          <div class="row">
            <!-- Financial Information -->
            <div class="col-md-6">
              <div class="profile-section">
                <h6>Financial Information</h6>
                <table class="table table-sm">
                  <tr><td><strong>Current Balance:</strong></td><td>$${customer.financial.currentBalance.toFixed(2)}</td></tr>
                  <tr><td><strong>Credit Limit:</strong></td><td>$${customer.financial.creditLimit.toFixed(2)}</td></tr>
                  <tr><td><strong>Available Credit:</strong></td><td>$${customer.financial.availableCredit.toFixed(2)}</td></tr>
                  <tr><td><strong>Risk Score:</strong></td><td>${customer.financial.riskScore}/100</td></tr>
                </table>
              </div>
            </div>

            <!-- Gaming Information -->
            <div class="col-md-6">
              <div class="profile-section">
                <h6>Gaming Information</h6>
                <table class="table table-sm">
                  <tr><td><strong>Status:</strong></td><td>${customer.gaming.accountStatus}</td></tr>
                  <tr><td><strong>Registration:</strong></td><td>${new Date(customer.gaming.registrationDate).toLocaleDateString()}</td></tr>
                  <tr><td><strong>Last Login:</strong></td><td>${new Date(customer.gaming.lastLogin).toLocaleDateString()}</td></tr>
                  <tr><td><strong>Total Bets:</strong></td><td>${customer.gaming.totalBets}</td></tr>
                  <tr><td><strong>Total Wins:</strong></td><td>${customer.gaming.totalWins}</td></tr>
                  <tr><td><strong>Total Losses:</strong></td><td>${customer.gaming.totalLosses}</td></tr>
                </table>
              </div>
            </div>
          </div>

          <!-- Preferences -->
          <div class="profile-section">
            <h6>Preferences & Notifications</h6>
            <div class="row">
              <div class="col-md-6">
                <h7>Language & Timezone</h7>
                <p class="mb-1">Language: ${customer.preferences.language}</p>
                <p class="mb-0">Timezone: ${customer.preferences.timezone}</p>
              </div>
              <div class="col-md-6">
                <h7>Notifications</h7>
                <div class="notification-status">
                  <span class="badge badge-${customer.preferences.notifications.email ? 'success' : 'secondary'}">
                    Email ${customer.preferences.notifications.email ? 'Enabled' : 'Disabled'}
                  </span>
                  <span class="badge badge-${customer.preferences.notifications.sms ? 'success' : 'secondary'}">
                    SMS ${customer.preferences.notifications.sms ? 'Enabled' : 'Disabled'}
                  </span>
                  <span class="badge badge-${customer.preferences.notifications.push ? 'success' : 'secondary'}">
                    Push ${customer.preferences.notifications.push ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Initialize components after rendering
   */
  private initializeComponents(): void {
    // Initialize any additional components if needed
  }

  /**
   * Load initial data
   */
  private async loadInitialData(): Promise<void> {
    // Load initial customer list or dashboard data
    if (this.currentView === 'list') {
      await this.loadCustomerList();
    }
  }

  /**
   * Handle navigation actions
   */
  private handleAction(action: string, target: HTMLElement, event?: Event): void {
    switch (action) {
      case 'show-dashboard':
        this.showView('dashboard');
        break;
      case 'show-list':
        this.showView('list');
        this.loadCustomerList();
        break;
      case 'show-search':
        this.showView('search');
        break;
      case 'create-customer':
        this.showCreateCustomer();
        break;
      case 'edit-customer':
        this.showEditCustomer();
        break;
      case 'view-customer':
        const customerId = target.getAttribute('data-customer-id');
        if (customerId) {
          this.viewCustomer(customerId);
        }
        break;
      case 'perform-search':
        this.performAdvancedSearch();
        break;
      case 'clear-search-filters':
        this.clearSearchFilters();
        break;
      case 'clear-search':
        this.clearSearch();
        break;
      case 'export-customers':
        this.exportCustomers();
        break;
      case 'view-transactions':
        this.viewCustomerTransactions();
        break;
    }
  }

  /**
   * Handle form submissions
   */
  private async handleFormSubmit(form: HTMLFormElement): Promise<void> {
    const formType = form.getAttribute('data-customer-form');

    try {
      if (formType === 'create') {
        await this.createCustomer(form);
      } else if (formType === 'edit') {
        await this.updateCustomer(form);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      this.showError(error.message);
    }
  }

  /**
   * Handle search input
   */
  private async handleSearchInput(query: string): Promise<void> {
    if (query.length < 2) {
      this.searchResults = [];
      this.updateSearchResults();
      return;
    }

    try {
      const filters: CustomerSearchFilters = {
        name: query,
        email: query,
        phone: query,
        customerId: query,
      };

      const { customers } = await this.customerService.searchCustomers(filters, {
        limit: this.options.maxSearchResults,
      });

      this.searchResults = customers;
      this.updateSearchResults();
    } catch (error) {
      console.error('Search error:', error);
    }
  }

  /**
   * Show specific view
   */
  private showView(view: typeof this.currentView): void {
    // Update navigation
    const navLinks = this.container.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));

    const activeLink = this.container.querySelector(`[data-action="show-${view}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }

    // Update content views
    const views = this.container.querySelectorAll('.content-view');
    views.forEach(viewEl => viewEl.classList.remove('active'));

    const targetView = this.container.querySelector(`#${view}-view`);
    if (targetView) {
      targetView.classList.add('active');
    }

    this.currentView = view;
  }

  /**
   * Load customer list
   */
  private async loadCustomerList(page: number = 1): Promise<void> {
    try {
      this.showLoading();

      const { customers, total, hasMore } = await this.customerService.searchCustomers(
        {},
        {
          limit: 50,
          offset: (page - 1) * 50,
        }
      );

      this.updateCustomerTable(customers);
      this.updatePagination(page, Math.ceil(total / 50), hasMore);
    } catch (error) {
      console.error('Error loading customer list:', error);
      this.showError('Failed to load customer list');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Update customer table
   */
  private updateCustomerTable(customers: CustomerProfile[]): void {
    const tbody = this.container.querySelector('#customer-table-body');
    if (!tbody) return;

    if (customers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center">No customers found</td></tr>';
      return;
    }

    const rows = customers
      .map(
        customer => `
      <tr>
        <td>${customer.customerId}</td>
        <td>${customer.personalInfo.firstName} ${customer.personalInfo.lastName}</td>
        <td>${customer.personalInfo.email}</td>
        <td>${customer.personalInfo.phone}</td>
        <td><span class="badge badge-${this.getStatusBadgeClass(customer.gaming.accountStatus)}">${customer.gaming.accountStatus}</span></td>
        <td>$${customer.financial.currentBalance.toFixed(2)}</td>
        <td>
          <span class="badge badge-${customer.financial.riskScore >= 70 ? 'danger' : customer.financial.riskScore >= 40 ? 'warning' : 'success'}">
            ${customer.financial.riskScore}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-primary" data-action="view-customer" data-customer-id="${customer.id}">
            <i class="fas fa-eye"></i>
          </button>
          ${
            this.options.enableEdit
              ? `
            <button class="btn btn-sm btn-outline-secondary" data-action="edit-customer" data-customer-id="${customer.id}">
              <i class="fas fa-edit"></i>
            </button>
          `
              : ''
          }
        </td>
      </tr>
    `
      )
      .join('');

    tbody.innerHTML = rows;
  }

  /**
   * Update pagination
   */
  private updatePagination(currentPage: number, totalPages: number, hasMore: boolean): void {
    const pagination = this.container.querySelector('#customer-pagination');
    if (!pagination) return;

    let html = '';

    if (currentPage > 1) {
      html += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a></li>`;
    }

    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
      html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${i}">${i}</a>
      </li>`;
    }

    if (hasMore) {
      html += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage + 1}">Next</a></li>`;
    }

    pagination.innerHTML = html;

    // Add pagination event listeners
    pagination.querySelectorAll('.page-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const page = parseInt(link.getAttribute('data-page') || '1');
        this.loadCustomerList(page);
      });
    });
  }

  /**
   * Update search results
   */
  private updateSearchResults(): void {
    const container = this.container.querySelector('#search-results-container');
    if (!container) return;

    if (this.searchResults.length === 0) {
      container.innerHTML = '<p class="text-muted">No customers found matching your search.</p>';
      return;
    }

    const results = this.searchResults
      .map(
        customer => `
      <div class="search-result-item" data-customer-id="${customer.id}">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h6 class="mb-1">${customer.personalInfo.firstName} ${customer.personalInfo.lastName}</h6>
            <p class="mb-1 text-muted">${customer.personalInfo.email}</p>
            <small class="text-muted">${customer.customerId} • ${customer.address.city}, ${customer.address.state}</small>
          </div>
          <div>
            <span class="badge badge-${this.getStatusBadgeClass(customer.gaming.accountStatus)}">${customer.gaming.accountStatus}</span>
            <button class="btn btn-sm btn-outline-primary ml-2" data-action="view-customer" data-customer-id="${customer.id}">
              <i class="fas fa-eye"></i> View
            </button>
          </div>
        </div>
      </div>
    `
      )
      .join('');

    container.innerHTML = `<div class="search-results-list">${results}</div>`;
  }

  /**
   * Show create customer form
   */
  private async showCreateCustomer(): Promise<void> {
    this.showView('create');

    const container = this.container.querySelector('#create-form-container');
    if (container) {
      await this.formService.createForm('customer-profile', container);
    }
  }

  /**
   * Show edit customer form
   */
  private async showEditCustomer(): Promise<void> {
    if (!this.selectedCustomer) return;

    this.showView('edit');

    const container = this.container.querySelector('#edit-form-container');
    if (container) {
      await this.formService.createForm('customer-profile', container);

      // Populate form with customer data
      setTimeout(() => {
        this.populateFormWithCustomerData(this.selectedCustomer!);
      }, 100);
    }
  }

  /**
   * View customer profile
   */
  private async viewCustomer(customerId: string): Promise<void> {
    const customer = this.customerService.getCustomer(customerId);
    if (!customer) {
      this.showError('Customer not found');
      return;
    }

    this.selectedCustomer = customer;
    this.showView('profile');

    // Refresh profile view
    const profileView = this.container.querySelector('#profile-view');
    if (profileView) {
      profileView.innerHTML = this.generateProfileView();
    }
  }

  /**
   * Perform advanced search
   */
  private async performAdvancedSearch(): Promise<void> {
    const filters: CustomerSearchFilters = {
      name: (this.container.querySelector('#search-name') as HTMLInputElement)?.value,
      email: (this.container.querySelector('#search-email') as HTMLInputElement)?.value,
      phone: (this.container.querySelector('#search-phone') as HTMLInputElement)?.value,
      customerId: (this.container.querySelector('#search-customer-id') as HTMLInputElement)?.value,
      status: (this.container.querySelector('#search-status') as HTMLSelectElement)?.value,
      state: (this.container.querySelector('#search-state') as HTMLInputElement)?.value,
      city: (this.container.querySelector('#search-city') as HTMLInputElement)?.value,
    };

    try {
      const { customers } = await this.customerService.searchCustomers(filters, {
        limit: this.options.maxSearchResults,
      });

      this.searchResults = customers;
      this.updateSearchResults();
    } catch (error) {
      console.error('Advanced search error:', error);
      this.showError('Search failed');
    }
  }

  /**
   * Clear search filters
   */
  private clearSearchFilters(): void {
    const filters = this.container.querySelectorAll(
      '#search-name, #search-email, #search-phone, #search-customer-id, #search-state, #search-city'
    );
    filters.forEach(filter => {
      (filter as HTMLInputElement).value = '';
    });

    (this.container.querySelector('#search-status') as HTMLSelectElement).value = '';

    this.searchResults = [];
    this.updateSearchResults();
  }

  /**
   * Clear search
   */
  private clearSearch(): void {
    const searchInput = this.container.querySelector('[data-search-input]') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = '';
      this.handleSearchInput('');
    }
  }

  /**
   * Export customers
   */
  private async exportCustomers(): Promise<void> {
    try {
      const data = await this.customerService.exportCustomers();
      const blob = new Blob([data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `customers_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      this.showError('Export failed');
    }
  }

  /**
   * View customer transactions
   */
  private viewCustomerTransactions(): void {
    // This would integrate with the cashier service to show customer transactions
    // Implementation would open transaction history for the selected customer
  }

  /**
   * Create customer from form
   */
  private async createCustomer(form: HTMLFormElement): Promise<void> {
    const formData = new FormData(form);

    const customerData = {
      customerId: (formData.get('customerId') as string) || this.generateCustomerId(),
      personalInfo: {
        firstName: formData.get('firstName') as string,
        lastName: formData.get('lastName') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        altPhone: formData.get('altPhone') as string,
        dateOfBirth: formData.get('dateOfBirth') as string,
      },
      address: {
        street: formData.get('street') as string,
        city: formData.get('city') as string,
        state: formData.get('state') as string,
        zipCode: formData.get('zipCode') as string,
        country: (formData.get('country') as string) || 'US',
      },
      preferences: {
        language: 'en',
        timezone: 'America/New_York',
        currency: 'USD',
        notifications: {
          email: true,
          sms: true,
          push: false,
          telegram: false,
        },
        marketing: {
          email: false,
          sms: false,
          phone: false,
        },
      },
      financial: {
        creditLimit: 1000,
        currentBalance: 0,
        availableCredit: 1000,
        riskScore: 20,
        paymentMethods: [],
        transactionHistory: [],
      },
      gaming: {
        accountStatus: 'active',
        registrationDate: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        totalBets: 0,
        totalWins: 0,
        totalLosses: 0,
        favoriteSports: [],
        riskProfile: 'low',
      },
      verification: {
        emailVerified: false,
        phoneVerified: false,
        addressVerified: false,
        identityVerified: false,
        documents: [],
      },
      thirdParty: {
        paymentAddresses: [],
      },
    };

    const customer = await this.customerService.createCustomer(customerData);

    this.showSuccess(`Customer ${customer.customerId} created successfully`);
    this.showView('dashboard');
  }

  /**
   * Update customer from form
   */
  private async updateCustomer(form: HTMLFormElement): Promise<void> {
    if (!this.selectedCustomer) return;

    const formData = new FormData(form);

    const updates = {
      personalInfo: {
        firstName: formData.get('firstName') as string,
        lastName: formData.get('lastName') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        altPhone: formData.get('altPhone') as string,
        dateOfBirth: formData.get('dateOfBirth') as string,
      },
      address: {
        street: formData.get('street') as string,
        city: formData.get('city') as string,
        state: formData.get('state') as string,
        zipCode: formData.get('zipCode') as string,
        country: (formData.get('country') as string) || 'US',
      },
    };

    await this.customerService.updateCustomer({
      customerId: this.selectedCustomer.id,
      updates,
      updatedBy: 'customer-interface',
    });

    this.showSuccess('Customer updated successfully');
    this.viewCustomer(this.selectedCustomer.id);
  }

  /**
   * Populate form with customer data
   */
  private populateFormWithCustomerData(customer: CustomerProfile): void {
    // This would populate the form fields with customer data
    // Implementation depends on the form management service integration
  }

  /**
   * Show loading indicator
   */
  private showLoading(): void {
    const indicator = this.container.querySelector('#loading-indicator') as HTMLElement;
    if (indicator) {
      indicator.style.display = 'flex';
    }
  }

  /**
   * Hide loading indicator
   */
  private hideLoading(): void {
    const indicator = this.container.querySelector('#loading-indicator') as HTMLElement;
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  /**
   * Show success message
   */
  private showSuccess(message: string): void {
    this.showMessage(message, 'success');
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    this.showMessage(message, 'error');
  }

  /**
   * Show message
   */
  private showMessage(message: string, type: 'success' | 'error'): void {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    const alertHtml = `
      <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="close" data-dismiss="alert">
          <span>&times;</span>
        </button>
      </div>
    `;

    const container = this.container.querySelector('.customer-content');
    if (container) {
      container.insertAdjacentHTML('afterbegin', alertHtml);
      setTimeout(() => {
        const alert = container.querySelector('.alert');
        if (alert) {
          alert.remove();
        }
      }, 5000);
    }
  }

  /**
   * Refresh current view
   */
  private refreshCurrentView(): void {
    switch (this.currentView) {
      case 'dashboard':
        this.refreshDashboardView();
        break;
      case 'list':
        this.loadCustomerList();
        break;
      case 'search':
        this.updateSearchResults();
        break;
    }
  }

  /**
   * Refresh dashboard view
   */
  private refreshDashboardView(): void {
    const dashboardView = this.container.querySelector('#dashboard-view');
    if (dashboardView) {
      dashboardView.innerHTML = this.generateDashboardView();
    }
  }

  /**
   * Generate customer ID
   */
  private generateCustomerId(): string {
    return `CUST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get status badge class
   */
  private getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
        return 'success';
      case 'suspended':
        return 'warning';
      case 'pending':
        return 'info';
      case 'closed':
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  // Event handlers

  private onCustomerCreated(customer: CustomerProfile): void {
    this.refreshCurrentView();
  }

  private onCustomerUpdated(customer: CustomerProfile): void {
    this.refreshCurrentView();

    // Update selected customer if it's the current one
    if (this.selectedCustomer && this.selectedCustomer.id === customer.id) {
      this.selectedCustomer = customer;
      if (this.currentView === 'profile') {
        const profileView = this.container.querySelector('#profile-view');
        if (profileView) {
          profileView.innerHTML = this.generateProfileView();
        }
      }
    }
  }

  private onCustomerUpdatedRealtime(customer: CustomerProfile): void {
    this.onCustomerUpdated(customer);
  }
}

// Global functions for easy access
export async function createCustomerInformationInterface(
  container: HTMLElement,
  options?: Partial<CustomerInterfaceOptions>
): Promise<CustomerInformationInterface> {
  const defaultOptions: CustomerInterfaceOptions = {
    container,
    enableSearch: true,
    enableCreate: true,
    enableEdit: true,
    enableDelete: false,
    enableExport: true,
    enableRealTimeUpdates: true,
    maxSearchResults: 100,
    defaultView: 'dashboard',
    ...options,
  };

  const interface_ = new CustomerInformationInterface(defaultOptions);
  await interface_.initialize();

  return interface_;
}

export { CustomerInformationInterface };
