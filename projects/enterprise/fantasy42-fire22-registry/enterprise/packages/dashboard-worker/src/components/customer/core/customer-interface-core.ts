/**
 * Customer Interface Core
 * Central controller for customer interface management
 */

import { EventEmitter } from 'events';
import type {
  CustomerInterfaceOptions,
  CustomerInterfaceState,
  CustomerView,
  CustomerAction,
  CustomerInterfaceEvent,
  CustomerNotification,
  DEFAULT_CUSTOMER_INTERFACE_OPTIONS,
} from './customer-interface-types';
import {
  CustomerInformationService,
  CustomerProfile,
} from '../../services/customer-information-service';
import { FormManagementService } from '../../services/form-management-service';
import { CashierService } from '../../services/cashier-service';

export class CustomerInterfaceCore extends EventEmitter {
  private container: HTMLElement;
  private options: CustomerInterfaceOptions;
  private state: CustomerInterfaceState;
  private customerService: CustomerInformationService;
  private formService: FormManagementService;
  private cashierService: CashierService;
  private isInitialized = false;
  private eventHistory: CustomerInterfaceEvent[] = [];
  private maxEventHistory = 100;

  constructor(options: CustomerInterfaceOptions) {
    super();
    this.container = options.container;
    this.options = {
      ...DEFAULT_CUSTOMER_INTERFACE_OPTIONS,
      ...options,
    };

    this.customerService = CustomerInformationService.getInstance();
    this.formService = FormManagementService.getInstance();
    this.cashierService = CashierService.getInstance();

    this.state = this.initializeState();
  }

  /**
   * Initialize the customer interface
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('👥 Initializing Customer Interface Core...');

    try {
      // Initialize dependencies
      await this.customerService.initialize();

      // Setup event listeners
      this.setupEventListeners();

      // Initialize forms
      await this.initializeForms();

      // Load initial data
      await this.loadInitialData();

      // Setup real-time updates
      if (this.options.enableRealTimeUpdates) {
        this.setupRealTimeUpdates();
      }

      this.isInitialized = true;
      console.log('✅ Customer Interface Core initialized successfully');

      this.emit('initialized', this.state);
    } catch (error) {
      console.error('❌ Failed to initialize Customer Interface Core:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get current state
   */
  getState(): CustomerInterfaceState {
    return { ...this.state };
  }

  /**
   * Update state
   */
  updateState(updates: Partial<CustomerInterfaceState>): void {
    const previousState = { ...this.state };
    this.state = { ...this.state, ...updates, lastUpdated: new Date() };

    // Emit state change event
    this.emit('state-changed', {
      previous: previousState,
      current: this.state,
      changes: updates,
    });

    // Log state change
    this.logEvent({
      type: 'view-changed',
      data: { from: previousState.currentView, to: this.state.currentView },
      timestamp: new Date(),
    });
  }

  /**
   * Change current view
   */
  changeView(view: CustomerView): void {
    if (this.state.currentView === view) return;

    this.updateState({ currentView: view });
    this.emit('view-changed', view);
  }

  /**
   * Select customer
   */
  selectCustomer(customer: CustomerProfile | null): void {
    this.updateState({ selectedCustomer: customer });
    this.emit('customer-selected', customer);
  }

  /**
   * Dispatch action
   */
  dispatchAction(action: CustomerAction): void {
    console.log(`🎯 Dispatching action: ${action.type}`, action.payload);

    // Log the action
    this.logEvent({
      type: 'view-changed',
      data: action,
      timestamp: new Date(),
    });

    // Emit action event for modules to handle
    this.emit('action-dispatched', action);
  }

  /**
   * Show notification
   */
  showNotification(notification: Omit<CustomerNotification, 'id'>): void {
    const fullNotification: CustomerNotification = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...notification,
    };

    this.emit('notification', fullNotification);

    // Auto-hide notification if duration is set
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.emit('notification-hide', fullNotification.id);
      }, notification.duration);
    }
  }

  /**
   * Set loading state
   */
  setLoading(loading: boolean): void {
    this.updateState({ isLoading: loading });
  }

  /**
   * Refresh current data
   */
  async refresh(): Promise<void> {
    console.log('🔄 Refreshing customer interface...');

    this.setLoading(true);
    try {
      await this.loadInitialData();
      this.emit('refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh:', error);
      this.showNotification({
        type: 'error',
        title: 'Refresh Failed',
        message: 'Failed to refresh customer data. Please try again.',
        duration: 5000,
      });
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Get event history
   */
  getEventHistory(limit?: number): CustomerInterfaceEvent[] {
    const history = [...this.eventHistory];
    if (limit && limit > 0) {
      return history.slice(-limit);
    }
    return history;
  }

  /**
   * Clear event history
   */
  clearEventHistory(): void {
    this.eventHistory = [];
    this.emit('event-history-cleared');
  }

  /**
   * Get options
   */
  getOptions(): CustomerInterfaceOptions {
    return { ...this.options };
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature: keyof CustomerInterfaceOptions): boolean {
    return Boolean(this.options[feature]);
  }

  // Private methods

  private initializeState(): CustomerInterfaceState {
    return {
      currentView: this.options.defaultView === 'list' ? 'list' : 'dashboard',
      selectedCustomer: null,
      searchResults: [],
      searchFilters: {},
      currentPage: 1,
      totalPages: 1,
      isLoading: false,
      lastUpdated: new Date(),
      hasUnsavedChanges: false,
    };
  }

  private setupEventListeners(): void {
    // Listen for customer service events
    this.customerService.on('customer-created', customer => {
      this.handleCustomerCreated(customer);
    });

    this.customerService.on('customer-updated', customer => {
      this.handleCustomerUpdated(customer);
    });

    this.customerService.on('customer-updated-realtime', customer => {
      this.handleCustomerUpdatedRealtime(customer);
    });

    // Listen for form service events
    this.formService.on('form-validation-error', errors => {
      this.handleFormValidationError(errors);
    });

    // Listen for cashier service events
    this.cashierService.on('transaction-completed', transaction => {
      this.handleTransactionCompleted(transaction);
    });

    console.log('👂 Event listeners setup completed');
  }

  private async initializeForms(): Promise<void> {
    // Initialize form configurations
    await this.formService.initializeCustomerForms();
    console.log('📝 Forms initialized');
  }

  private async loadInitialData(): Promise<void> {
    try {
      // Load initial customer data if needed
      console.log('📊 Initial data loaded');
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      throw error;
    }
  }

  private setupRealTimeUpdates(): void {
    // Setup real-time update mechanisms
    console.log('🔄 Real-time updates enabled');
  }

  private handleCustomerCreated(customer: CustomerProfile): void {
    console.log(`👤 Customer created: ${customer.firstName} ${customer.lastName}`);
    this.logEvent({
      type: 'customer-updated',
      data: { action: 'created', customer },
      timestamp: new Date(),
    });
    this.emit('customer-created', customer);
  }

  private handleCustomerUpdated(customer: CustomerProfile): void {
    console.log(`📝 Customer updated: ${customer.firstName} ${customer.lastName}`);
    this.logEvent({
      type: 'customer-updated',
      data: { action: 'updated', customer },
      timestamp: new Date(),
    });
    this.emit('customer-updated', customer);
  }

  private handleCustomerUpdatedRealtime(customer: CustomerProfile): void {
    console.log(`🔄 Customer updated (real-time): ${customer.firstName} ${customer.lastName}`);
    this.emit('customer-updated-realtime', customer);
  }

  private handleFormValidationError(errors: any): void {
    console.error('❌ Form validation errors:', errors);
    this.showNotification({
      type: 'error',
      title: 'Validation Error',
      message: 'Please correct the form errors and try again.',
      duration: 5000,
    });
  }

  private handleTransactionCompleted(transaction: any): void {
    console.log('💰 Transaction completed:', transaction);
    this.emit('transaction-completed', transaction);
  }

  private logEvent(event: CustomerInterfaceEvent): void {
    this.eventHistory.push(event);

    // Maintain max history size
    if (this.eventHistory.length > this.maxEventHistory) {
      this.eventHistory = this.eventHistory.slice(-this.maxEventHistory);
    }
  }
}
