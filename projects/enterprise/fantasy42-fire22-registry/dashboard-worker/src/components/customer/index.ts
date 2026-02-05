/**
 * Customer Information Interface
 * Consolidated modular customer interface system
 */

import { EventEmitter } from 'events';
import { CustomerInterfaceCore } from './core/customer-interface-core';
import { CustomerSearch } from './search/customer-search';
import { CustomerForms } from './forms/customer-forms';
import type {
  CustomerInterfaceOptions,
  CustomerView,
  CustomerProfile,
  CustomerAction,
} from './core/customer-interface-types';

export * from './core/customer-interface-types';

export class CustomerInformationInterface extends EventEmitter {
  private core: CustomerInterfaceCore;
  private search: CustomerSearch;
  private forms: CustomerForms;
  private container: HTMLElement;
  private options: CustomerInterfaceOptions;

  constructor(options: CustomerInterfaceOptions) {
    super();

    this.container = options.container;
    this.options = options;

    // Initialize modules
    this.core = new CustomerInterfaceCore(options);
    this.search = new CustomerSearch();
    this.forms = new CustomerForms();

    // Setup event forwarding
    this.setupEventForwarding();
  }

  /**
   * Initialize the customer interface
   */
  async initialize(): Promise<void> {
    console.log('👥 Initializing Customer Information Interface...');

    await this.core.initialize();

    // Render initial interface
    this.render();

    console.log('✅ Customer Information Interface initialized');
  }

  /**
   * Render the interface
   */
  private render(): void {
    const html = this.generateInterfaceHtml();
    this.container.innerHTML = html;

    // Initialize components
    this.initializeComponents();
  }

  /**
   * Generate interface HTML
   */
  private generateInterfaceHtml(): string {
    return `
      <div class="customer-interface" id="customer-interface">
        <!-- Header -->
        <div class="interface-header">
          <div class="header-title">
            <h2>Customer Management</h2>
            <div class="header-actions">
              ${this.options.enableCreate ? '<button class="btn btn-primary" data-action="create-customer">Create Customer</button>' : ''}
              ${this.options.enableExport ? '<button class="btn btn-secondary" data-action="export-customers">Export</button>' : ''}
            </div>
          </div>

          <!-- Search Bar -->
          ${
            this.options.enableSearch
              ? `
            <div class="search-bar">
              <div class="search-input-group">
                <input type="text" id="customer-search" placeholder="Search customers..." class="search-input">
                <button class="btn btn-search" data-action="search">
                  <i class="icon-search"></i> Search
                </button>
              </div>
              <div class="search-filters">
                <button class="btn btn-link" data-action="advanced-search">Advanced Search</button>
                <button class="btn btn-link" data-action="clear-search">Clear</button>
              </div>
            </div>
          `
              : ''
          }
        </div>

        <!-- Main Content Area -->
        <div class="interface-content" id="interface-content">
          <div class="loading-spinner" id="loading-spinner" style="display: none;">
            <div class="spinner"></div>
            <p>Loading...</p>
          </div>

          <!-- Dashboard View -->
          <div class="view-container" id="dashboard-view" style="display: none;">
            ${this.generateDashboardView()}
          </div>

          <!-- List View -->
          <div class="view-container" id="list-view" style="display: none;">
            ${this.generateListView()}
          </div>

          <!-- Search Results View -->
          <div class="view-container" id="search-view" style="display: none;">
            <div class="search-results" id="search-results"></div>
          </div>

          <!-- Create/Edit Form View -->
          <div class="view-container" id="form-view" style="display: none;">
            <div class="form-container" id="form-container"></div>
          </div>

          <!-- Profile View -->
          <div class="view-container" id="profile-view" style="display: none;">
            <div class="profile-container" id="profile-container"></div>
          </div>
        </div>

        <!-- Notifications -->
        <div class="notifications-container" id="notifications"></div>
      </div>
    `;
  }

  /**
   * Generate dashboard view
   */
  private generateDashboardView(): string {
    return `
      <div class="dashboard">
        <div class="dashboard-header">
          <h3>Customer Dashboard</h3>
          <div class="dashboard-actions">
            <button class="btn btn-link" data-action="refresh">Refresh</button>
          </div>
        </div>

        <div class="dashboard-stats">
          <div class="stat-card">
            <div class="stat-icon">👥</div>
            <div class="stat-info">
              <div class="stat-value" id="total-customers">0</div>
              <div class="stat-label">Total Customers</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">✅</div>
            <div class="stat-info">
              <div class="stat-value" id="active-customers">0</div>
              <div class="stat-label">Active Customers</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">👑</div>
            <div class="stat-info">
              <div class="stat-value" id="vip-customers">0</div>
              <div class="stat-label">VIP Customers</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">📈</div>
            <div class="stat-info">
              <div class="stat-value" id="new-customers">0</div>
              <div class="stat-label">New This Month</div>
            </div>
          </div>
        </div>

        <div class="dashboard-content">
          <div class="recent-customers">
            <h4>Recent Customers</h4>
            <div class="customers-list" id="recent-customers"></div>
          </div>

          <div class="quick-actions">
            <h4>Quick Actions</h4>
            <div class="action-buttons">
              <button class="btn btn-primary" data-action="create-customer">
                <i class="icon-plus"></i> Create Customer
              </button>
              <button class="btn btn-secondary" data-action="bulk-import">
                <i class="icon-upload"></i> Bulk Import
              </button>
              <button class="btn btn-secondary" data-action="export-customers">
                <i class="icon-download"></i> Export Data
              </button>
            </div>
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
      <div class="list-view">
        <div class="list-header">
          <div class="list-title">
            <h3>Customer List</h3>
            <span class="list-count" id="list-count">0 customers</span>
          </div>

          <div class="list-controls">
            <div class="view-toggle">
              <button class="btn btn-sm" data-view="list" title="List View">
                <i class="icon-list"></i>
              </button>
              <button class="btn btn-sm" data-view="grid" title="Grid View">
                <i class="icon-grid"></i>
              </button>
              <button class="btn btn-sm" data-view="table" title="Table View">
                <i class="icon-table"></i>
              </button>
            </div>

            <div class="sort-controls">
              <select id="sort-field" class="form-control">
                <option value="name">Name</option>
                <option value="email">Email</option>
                <option value="createdAt">Created Date</option>
                <option value="lastLogin">Last Login</option>
                <option value="balance">Balance</option>
                <option value="vipTier">VIP Tier</option>
              </select>

              <select id="sort-order" class="form-control">
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
        </div>

        <div class="list-content">
          <div class="customers-table-container">
            <table class="customers-table" id="customers-table">
              <thead>
                <tr>
                  <th><input type="checkbox" id="select-all"></th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>VIP Tier</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="customers-tbody">
                <!-- Customer rows will be populated here -->
              </tbody>
            </table>
          </div>

          <div class="pagination-container" id="pagination-container">
            <!-- Pagination will be populated here -->
          </div>
        </div>

        <!-- Bulk Actions Bar -->
        <div class="bulk-actions" id="bulk-actions" style="display: none;">
          <div class="bulk-selection-info">
            <span id="selected-count">0</span> customers selected
          </div>

          <div class="bulk-action-buttons">
            <button class="btn btn-secondary" data-action="bulk-export">
              <i class="icon-download"></i> Export
            </button>
            <button class="btn btn-warning" data-action="bulk-status-update">
              <i class="icon-edit"></i> Update Status
            </button>
            ${
              this.options.enableDelete
                ? `
              <button class="btn btn-danger" data-action="bulk-delete">
                <i class="icon-trash"></i> Delete
              </button>
            `
                : ''
            }
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Initialize components
   */
  private initializeComponents(): void {
    // Setup event listeners for the interface
    this.setupInterfaceEventListeners();

    // Show initial view
    this.showView(this.options.defaultView === 'list' ? 'list' : 'dashboard');

    console.log('🔧 Customer interface components initialized');
  }

  /**
   * Setup interface event listeners
   */
  private setupInterfaceEventListeners(): void {
    const interfaceElement = this.container.querySelector('#customer-interface');

    if (interfaceElement) {
      interfaceElement.addEventListener('click', event => {
        const target = event.target as HTMLElement;
        const action =
          target.getAttribute('data-action') ||
          target.closest('[data-action]')?.getAttribute('data-action');

        if (action) {
          this.handleAction(action, target, event);
        }
      });

      // Search input handling
      const searchInput = interfaceElement.querySelector('#customer-search') as HTMLInputElement;
      if (searchInput) {
        searchInput.addEventListener('input', e => {
          this.handleSearchInput((e.target as HTMLInputElement).value);
        });
      }
    }
  }

  /**
   * Setup event forwarding from modules
   */
  private setupEventForwarding(): void {
    // Forward core events
    this.core.on('state-changed', data => this.emit('state-changed', data));
    this.core.on('customer-selected', customer => this.emit('customer-selected', customer));
    this.core.on('view-changed', view => this.emit('view-changed', view));
    this.core.on('notification', notification => this.showNotification(notification));

    // Forward search events
    // (Search module would emit events here)

    // Forward form events
    // (Forms module would emit events here)
  }

  /**
   * Handle interface actions
   */
  private handleAction(action: string, target: HTMLElement, event?: Event): void {
    switch (action) {
      case 'create-customer':
        this.showCreateCustomer();
        break;

      case 'edit-customer':
        const customerId = target.getAttribute('data-customer-id');
        if (customerId) {
          this.showEditCustomer(customerId);
        }
        break;

      case 'view-customer':
        const viewCustomerId = target.getAttribute('data-customer-id');
        if (viewCustomerId) {
          this.viewCustomer(viewCustomerId);
        }
        break;

      case 'search':
        this.performSearch();
        break;

      case 'advanced-search':
        this.showAdvancedSearch();
        break;

      case 'clear-search':
        this.clearSearch();
        break;

      case 'export-customers':
        this.exportCustomers();
        break;

      case 'refresh':
        this.refresh();
        break;

      default:
        console.log(`Unhandled action: ${action}`);
    }
  }

  /**
   * Handle search input
   */
  private async handleSearchInput(query: string): Promise<void> {
    if (query.length < 2) {
      this.clearSearch();
      return;
    }

    // Debounced search
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(async () => {
      await this.performSearch(query);
    }, 300);
  }

  /**
   * Show view
   */
  private showView(view: CustomerView): void {
    const viewContainers = this.container.querySelectorAll('.view-container');

    viewContainers.forEach(container => {
      container.setAttribute('style', 'display: none;');
    });

    const targetView = this.container.querySelector(`#${view}-view`);
    if (targetView) {
      targetView.setAttribute('style', 'display: block;');
    }

    this.core.changeView(view);
  }

  // Action handlers

  private async showCreateCustomer(): Promise<void> {
    this.showView('create');
    // Implementation would create and show form
    console.log('📝 Showing create customer form');
  }

  private async showEditCustomer(customerId: string): Promise<void> {
    this.showView('edit');
    // Implementation would load customer and show edit form
    console.log(`📝 Showing edit form for customer: ${customerId}`);
  }

  private async viewCustomer(customerId: string): Promise<void> {
    this.showView('profile');
    // Implementation would load and display customer profile
    console.log(`👤 Viewing customer profile: ${customerId}`);
  }

  private async performSearch(query?: string): Promise<void> {
    this.showView('search');
    // Implementation would perform search and display results
    console.log(`🔍 Performing search: ${query || 'current query'}`);
  }

  private showAdvancedSearch(): void {
    // Implementation would show advanced search modal/form
    console.log('🔬 Showing advanced search');
  }

  private clearSearch(): void {
    // Implementation would clear search and return to default view
    console.log('🧹 Clearing search');
  }

  private async exportCustomers(): Promise<void> {
    // Implementation would export customer data
    console.log('📊 Exporting customers');
  }

  private async refresh(): Promise<void> {
    await this.core.refresh();
    console.log('🔄 Refreshing interface');
  }

  private showNotification(notification: any): void {
    // Implementation would show notification to user
    console.log('🔔 Showing notification:', notification);
  }

  // Utility methods

  getState() {
    return this.core.getState();
  }

  getOptions() {
    return this.core.getOptions();
  }

  isFeatureEnabled(feature: string) {
    return this.core.isFeatureEnabled(feature);
  }

  // Private properties
  private searchTimeout: NodeJS.Timeout | null = null;
}

// Export factory function
export function createCustomerInformationInterface(
  options: CustomerInterfaceOptions
): CustomerInformationInterface {
  return new CustomerInformationInterface(options);
}
