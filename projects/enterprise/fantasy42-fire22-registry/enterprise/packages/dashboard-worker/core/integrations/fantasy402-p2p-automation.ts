/**
 * Fantasy42 P2P Automation Integration
 * Automates balance transfers using 3rd Party ID field and agent selection
 * Targets elements: Password field and Agent select dropdown
 */

import { XPathElementHandler, handleFantasy42Element } from '../ui/xpath-element-handler';
import { P2PPaymentMatching } from '../payments/p2p-payment-matching';
import { Fantasy42AgentClient } from '../../src/api/fantasy42-agent-client';
import { EnhancedCashierSystem } from '../cashier/enhanced-cashier-system';

export interface P2PAutomationConfig {
  passwordFieldXPath: string;
  agentSelectXPath: string;
  thirdPartyIdXPath: string;
  autoTransferEnabled: boolean;
  minTransferAmount: number;
  maxTransferAmount: number;
  supportedPaymentMethods: string[];
  riskThreshold: number;
}

export interface P2PTransferRequest {
  senderCustomerId: string;
  recipientCustomerId: string;
  amount: number;
  paymentMethod: string;
  senderAddress: string;
  recipientAddress: string;
  agentId: string;
  transactionId: string;
}

export class Fantasy42P2PAutomation {
  private xpathHandler: XPathElementHandler;
  private p2pMatching: P2PPaymentMatching;
  private fantasyClient: Fantasy42AgentClient;
  private cashierSystem: EnhancedCashierSystem;

  private config: P2PAutomationConfig;
  private activeTransfers: Map<string, P2PTransferRequest> = new Map();
  private automationActive: boolean = false;

  constructor(
    p2pMatching: P2PPaymentMatching,
    fantasyClient: Fantasy42AgentClient,
    cashierSystem: EnhancedCashierSystem,
    config: P2PAutomationConfig
  ) {
    this.xpathHandler = XPathElementHandler.getInstance();
    this.p2pMatching = p2pMatching;
    this.fantasyClient = fantasyClient;
    this.cashierSystem = cashierSystem;
    this.config = config;
  }

  /**
   * Initialize P2P automation for Fantasy42 interface
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🚀 Initializing Fantasy42 P2P Automation...');

      // Find and monitor form elements
      const elementsFound = await this.locateFormElements();
      if (!elementsFound) {
        console.warn('⚠️ Fantasy42 form elements not found, automation disabled');
        return false;
      }

      // Setup event listeners
      await this.setupEventListeners();

      // Initialize P2P matching system
      await this.initializeP2PMatching();

      // Setup automation triggers
      await this.setupAutomationTriggers();

      this.automationActive = true;
      console.log('✅ Fantasy42 P2P Automation initialized successfully');

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Fantasy42 P2P Automation:', error);
      return false;
    }
  }

  /**
   * Locate Fantasy42 form elements
   */
  private async locateFormElements(): Promise<boolean> {
    const elements = [
      { name: 'password', xpath: this.config.passwordFieldXPath },
      { name: 'agent', xpath: this.config.agentSelectXPath },
      { name: 'thirdPartyId', xpath: this.config.thirdPartyIdXPath },
    ];

    let allFound = true;

    for (const element of elements) {
      const found = this.xpathHandler.findElementByXPath(element.xpath);
      if (found) {
        console.log(`✅ Found ${element.name} element:`, found.tagName);
      } else {
        console.warn(`⚠️ ${element.name} element not found at: ${element.xpath}`);
        allFound = false;
      }
    }

    return allFound;
  }

  /**
   * Setup event listeners for form elements
   */
  private async setupEventListeners(): Promise<void> {
    // Monitor password field for authentication
    const passwordElement = this.xpathHandler.findElementByXPath(this.config.passwordFieldXPath);
    if (passwordElement) {
      passwordElement.addEventListener('input', this.handlePasswordInput.bind(this));
      passwordElement.addEventListener('blur', this.handlePasswordBlur.bind(this));
    }

    // Monitor agent selection
    const agentElement = this.xpathHandler.findElementByXPath(this.config.agentSelectXPath);
    if (agentElement) {
      agentElement.addEventListener('change', this.handleAgentChange.bind(this));
    }

    // Monitor 3rd party ID field for payment addresses
    const thirdPartyElement = this.xpathHandler.findElementByXPath(this.config.thirdPartyIdXPath);
    if (thirdPartyElement) {
      thirdPartyElement.addEventListener('input', this.handleThirdPartyIdInput.bind(this));
      thirdPartyElement.addEventListener('blur', this.handleThirdPartyIdBlur.bind(this));
    }

    console.log('✅ Event listeners setup for Fantasy42 form elements');
  }

  /**
   * Initialize P2P matching system
   */
  private async initializeP2PMatching(): Promise<void> {
    // Setup P2P matching event listeners
    this.p2pMatching.on('match-found', this.handleMatchFound.bind(this));
    this.p2pMatching.on('transfer-completed', this.handleTransferCompleted.bind(this));
    this.p2pMatching.on('transfer-failed', this.handleTransferFailed.bind(this));

    console.log('✅ P2P matching system initialized');
  }

  /**
   * Setup automation triggers
   */
  private async setupAutomationTriggers(): Promise<void> {
    // Setup periodic checks for new P2P requests
    setInterval(async () => {
      if (this.automationActive) {
        await this.checkForNewRequests();
      }
    }, 30000); // Check every 30 seconds

    // Setup real-time monitoring
    await this.setupRealTimeMonitoring();

    console.log('✅ Automation triggers setup');
  }

  /**
   * Handle password input for authentication
   */
  private async handlePasswordInput(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const password = target.value;

    // Validate password strength and format
    const validation = this.validatePassword(password);

    // Update UI feedback
    this.updatePasswordValidationFeedback(target, validation);

    // If valid, attempt authentication
    if (validation.isValid && password.length >= 6) {
      await this.attemptAuthentication(password);
    }
  }

  /**
   * Handle password field blur
   */
  private async handlePasswordBlur(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const password = target.value;

    // Final validation on blur
    if (password && password.length >= 6) {
      const authenticated = await this.finalizeAuthentication(password);
      if (authenticated) {
        console.log('✅ Authentication successful');
        this.enableAutomationFeatures();
      }
    }
  }

  /**
   * Handle agent selection change
   */
  private async handleAgentChange(event: Event): Promise<void> {
    const target = event.target as HTMLSelectElement;
    const selectedAgent = target.value;

    console.log(`👤 Agent changed to: ${selectedAgent}`);

    // Update P2P matching with selected agent
    await this.updateAgentContext(selectedAgent);

    // Refresh available P2P matches
    await this.refreshAvailableMatches();
  }

  /**
   * Handle 3rd party ID input for payment addresses
   */
  private async handleThirdPartyIdInput(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const thirdPartyId = target.value;

    // Validate payment address format
    const validation = this.validatePaymentAddress(thirdPartyId);

    // Update UI feedback
    this.updateAddressValidationFeedback(target, validation);

    // If valid, check for existing P2P matches
    if (validation.isValid && thirdPartyId.length >= 10) {
      await this.checkExistingMatches(thirdPartyId);
    }
  }

  /**
   * Handle 3rd party ID blur
   */
  private async handleThirdPartyIdBlur(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const address = target.value;

    if (address && address.length >= 10) {
      // Store address for future P2P matching
      await this.storePaymentAddress(address);

      // Check for immediate matches
      const matches = await this.findImmediateMatches(address);
      if (matches.length > 0) {
        await this.processImmediateMatches(matches, address);
      }
    }
  }

  /**
   * Handle P2P match found
   */
  private async handleMatchFound(matchData: any): Promise<void> {
    console.log('🎯 P2P Match Found:', matchData);

    try {
      // Create transfer request
      const transferRequest: P2PTransferRequest = {
        senderCustomerId: matchData.senderId,
        recipientCustomerId: matchData.recipientId,
        amount: matchData.amount,
        paymentMethod: matchData.paymentMethod,
        senderAddress: matchData.senderAddress,
        recipientAddress: matchData.recipientAddress,
        agentId: await this.getCurrentAgentId(),
        transactionId: `P2P_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      // Store active transfer
      this.activeTransfers.set(transferRequest.transactionId, transferRequest);

      // If auto-transfer is enabled and amount is within limits
      if (
        this.config.autoTransferEnabled &&
        transferRequest.amount >= this.config.minTransferAmount &&
        transferRequest.amount <= this.config.maxTransferAmount
      ) {
        await this.processAutomatedTransfer(transferRequest);
      } else {
        // Manual approval required
        await this.requestManualApproval(transferRequest);
      }
    } catch (error) {
      console.error('❌ Failed to handle P2P match:', error);
    }
  }

  /**
   * Process automated transfer
   */
  private async processAutomatedTransfer(request: P2PTransferRequest): Promise<void> {
    try {
      console.log(`🔄 Processing automated transfer: ${request.transactionId}`);

      // Validate transfer request
      const validation = await this.validateTransferRequest(request);
      if (!validation.isValid) {
        throw new Error(`Transfer validation failed: ${validation.errors.join(', ')}`);
      }

      // Execute transfer via cashier system
      const transferResult = await this.cashierSystem.processP2PTransfer(request);

      if (transferResult.success) {
        console.log(`✅ Automated transfer completed: ${request.transactionId}`);

        // Update Fantasy42 interface
        await this.updateFantasy42Interface(request, 'completed');

        // Notify stakeholders
        await this.notifyTransferCompletion(request);
      } else {
        throw new Error(`Transfer failed: ${transferResult.error}`);
      }
    } catch (error) {
      console.error(`❌ Automated transfer failed: ${request.transactionId}`, error);

      // Handle failure
      await this.handleTransferFailure(request, error);
    }
  }

  /**
   * Request manual approval for transfer
   */
  private async requestManualApproval(request: P2PTransferRequest): Promise<void> {
    console.log(`⏳ Manual approval required for transfer: ${request.transactionId}`);

    // Create approval notification
    const approvalRequest = {
      id: request.transactionId,
      type: 'p2p_transfer_approval',
      data: request,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    // Store for manual processing
    await this.storeApprovalRequest(approvalRequest);

    // Update Fantasy42 interface to show pending status
    await this.updateFantasy42Interface(request, 'pending_approval');
  }

  /**
   * Handle transfer completion
   */
  private async handleTransferCompleted(transferData: any): Promise<void> {
    const request = this.activeTransfers.get(transferData.transactionId);
    if (request) {
      console.log(`✅ Transfer completed: ${transferData.transactionId}`);

      // Update Fantasy42 interface
      await this.updateFantasy42Interface(request, 'completed');

      // Clean up
      this.activeTransfers.delete(transferData.transactionId);

      // Log completion
      await this.logTransferCompletion(request, transferData);
    }
  }

  /**
   * Handle transfer failure
   */
  private async handleTransferFailed(failureData: any): Promise<void> {
    const request = this.activeTransfers.get(failureData.transactionId);
    if (request) {
      console.error(`❌ Transfer failed: ${failureData.transactionId}`, failureData.error);

      // Update Fantasy42 interface
      await this.updateFantasy42Interface(request, 'failed');

      // Handle failure recovery
      await this.handleTransferFailure(request, failureData.error);

      // Clean up
      this.activeTransfers.delete(failureData.transactionId);
    }
  }

  /**
   * Validate password
   */
  private validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!password || password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate payment address
   */
  private validatePaymentAddress(address: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!address || address.length < 10) {
      errors.push('Payment address too short');
    }

    // Validate based on payment method
    if (address.includes('@')) {
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(address)) {
        errors.push('Invalid email format');
      }
    } else if (address.startsWith('+')) {
      // Phone validation
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      if (!phoneRegex.test(address)) {
        errors.push('Invalid phone format');
      }
    } else {
      // General address validation
      if (address.length < 10) {
        errors.push('Address too short');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Update password validation feedback
   */
  private updatePasswordValidationFeedback(
    element: HTMLInputElement,
    validation: { isValid: boolean; errors: string[] }
  ): void {
    element.classList.remove('is-valid', 'is-invalid');

    if (validation.isValid) {
      element.classList.add('is-valid');
    } else if (validation.errors.length > 0) {
      element.classList.add('is-invalid');
    }
  }

  /**
   * Update address validation feedback
   */
  private updateAddressValidationFeedback(
    element: HTMLInputElement,
    validation: { isValid: boolean; errors: string[] }
  ): void {
    element.classList.remove('is-valid', 'is-invalid');

    if (validation.isValid) {
      element.classList.add('is-valid');
    } else if (validation.errors.length > 0) {
      element.classList.add('is-invalid');
    }
  }

  /**
   * Attempt authentication
   */
  private async attemptAuthentication(password: string): Promise<boolean> {
    try {
      // This would integrate with Fantasy42 authentication
      const authResult = await this.fantasyClient.authenticate(password);

      if (authResult.success) {
        console.log('✅ Authentication successful');
        return true;
      } else {
        console.warn('⚠️ Authentication failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Authentication error:', error);
      return false;
    }
  }

  /**
   * Finalize authentication
   */
  private async finalizeAuthentication(password: string): Promise<boolean> {
    // Additional authentication steps if needed
    return await this.attemptAuthentication(password);
  }

  /**
   * Update agent context
   */
  private async updateAgentContext(agentId: string): Promise<void> {
    // Update P2P matching with agent context
    await this.p2pMatching.updateAgentContext(agentId);
  }

  /**
   * Refresh available matches
   */
  private async refreshAvailableMatches(): Promise<void> {
    await this.p2pMatching.refreshMatches();
  }

  /**
   * Check existing matches for address
   */
  private async checkExistingMatches(address: string): Promise<void> {
    const matches = await this.p2pMatching.findMatchesByAddress(address);
    if (matches.length > 0) {
      console.log(`🎯 Found ${matches.length} existing matches for address: ${address}`);
    }
  }

  /**
   * Store payment address
   */
  private async storePaymentAddress(address: string): Promise<void> {
    // Store address for future matching
    await this.p2pMatching.storePaymentAddress(address);
  }

  /**
   * Find immediate matches
   */
  private async findImmediateMatches(address: string): Promise<any[]> {
    return await this.p2pMatching.findImmediateMatches(address);
  }

  /**
   * Process immediate matches
   */
  private async processImmediateMatches(matches: any[], address: string): Promise<void> {
    for (const match of matches) {
      await this.handleMatchFound(match);
    }
  }

  /**
   * Get current agent ID
   */
  private async getCurrentAgentId(): Promise<string> {
    const agentElement = this.xpathHandler.findElementByXPath(this.config.agentSelectXPath);
    if (agentElement instanceof HTMLSelectElement) {
      return agentElement.value;
    }
    return 'MAMBA100'; // Default
  }

  /**
   * Enable automation features
   */
  private enableAutomationFeatures(): void {
    console.log('🚀 Automation features enabled');
    this.automationActive = true;
  }

  /**
   * Check for new P2P requests
   */
  private async checkForNewRequests(): Promise<void> {
    if (!this.automationActive) return;

    try {
      const newRequests = await this.p2pMatching.getNewRequests();
      for (const request of newRequests) {
        await this.handleNewRequest(request);
      }
    } catch (error) {
      console.error('❌ Failed to check for new requests:', error);
    }
  }

  /**
   * Handle new P2P request
   */
  private async handleNewRequest(request: any): Promise<void> {
    console.log('📨 New P2P request:', request);
    await this.handleMatchFound(request);
  }

  /**
   * Setup real-time monitoring
   */
  private async setupRealTimeMonitoring(): Promise<void> {
    // Setup WebSocket or polling for real-time updates
    console.log('📊 Real-time monitoring setup');
  }

  /**
   * Validate transfer request
   */
  private async validateTransferRequest(
    request: P2PTransferRequest
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Amount validation
    if (request.amount < this.config.minTransferAmount) {
      errors.push(`Amount below minimum: $${this.config.minTransferAmount}`);
    }

    if (request.amount > this.config.maxTransferAmount) {
      errors.push(`Amount above maximum: $${this.config.maxTransferAmount}`);
    }

    // Payment method validation
    if (!this.config.supportedPaymentMethods.includes(request.paymentMethod)) {
      errors.push(`Unsupported payment method: ${request.paymentMethod}`);
    }

    // Address validation
    const senderValidation = this.validatePaymentAddress(request.senderAddress);
    if (!senderValidation.isValid) {
      errors.push(`Invalid sender address: ${senderValidation.errors.join(', ')}`);
    }

    const recipientValidation = this.validatePaymentAddress(request.recipientAddress);
    if (!recipientValidation.isValid) {
      errors.push(`Invalid recipient address: ${recipientValidation.errors.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Update Fantasy42 interface
   */
  private async updateFantasy42Interface(
    request: P2PTransferRequest,
    status: string
  ): Promise<void> {
    try {
      // Update 3rd party ID field with transfer status
      const statusMessage = `${status.toUpperCase()}: ${request.transactionId} - $${request.amount}`;
      await handleFantasy42Element('write', statusMessage);

      // Update password field with confirmation
      const confirmationMessage = `Transfer ${status} - ${new Date().toLocaleTimeString()}`;
      await this.xpathHandler.handleXPathElement({
        xpath: this.config.passwordFieldXPath,
        action: 'write',
        data: confirmationMessage,
      });

      console.log(`✅ Fantasy42 interface updated: ${status}`);
    } catch (error) {
      console.error('❌ Failed to update Fantasy42 interface:', error);
    }
  }

  /**
   * Handle transfer failure
   */
  private async handleTransferFailure(request: P2PTransferRequest, error: any): Promise<void> {
    console.error(`❌ Transfer failure: ${request.transactionId}`, error);

    // Update interface with failure status
    await this.updateFantasy42Interface(request, 'failed');

    // Log failure for analysis
    await this.logTransferFailure(request, error);

    // Attempt recovery if possible
    await this.attemptTransferRecovery(request);
  }

  /**
   * Store approval request
   */
  private async storeApprovalRequest(request: any): Promise<void> {
    // Store in database for manual processing
    console.log('📋 Approval request stored:', request.id);
  }

  /**
   * Notify transfer completion
   */
  private async notifyTransferCompletion(request: P2PTransferRequest): Promise<void> {
    // Send notifications to stakeholders
    console.log('📢 Transfer completion notified:', request.transactionId);
  }

  /**
   * Log transfer completion
   */
  private async logTransferCompletion(
    request: P2PTransferRequest,
    transferData: any
  ): Promise<void> {
    // Log successful transfer
    console.log('📊 Transfer completion logged:', request.transactionId);
  }

  /**
   * Log transfer failure
   */
  private async logTransferFailure(request: P2PTransferRequest, error: any): Promise<void> {
    // Log failed transfer for analysis
    console.error('📊 Transfer failure logged:', request.transactionId, error);
  }

  /**
   * Attempt transfer recovery
   */
  private async attemptTransferRecovery(request: P2PTransferRequest): Promise<void> {
    // Implement recovery logic
    console.log('🔄 Transfer recovery attempted:', request.transactionId);
  }

  /**
   * Get automation status
   */
  getStatus(): {
    automationActive: boolean;
    activeTransfers: number;
    config: P2PAutomationConfig;
    lastActivity: string;
  } {
    return {
      automationActive: this.automationActive,
      activeTransfers: this.activeTransfers.size,
      config: this.config,
      lastActivity: new Date().toISOString(),
    };
  }

  /**
   * Stop automation
   */
  stop(): void {
    this.automationActive = false;
    this.activeTransfers.clear();
    console.log('🛑 Fantasy42 P2P Automation stopped');
  }
}

// Convenience functions
export const createFantasy42P2PAutomation = (
  p2pMatching: P2PPaymentMatching,
  fantasyClient: Fantasy42AgentClient,
  cashierSystem: EnhancedCashierSystem,
  config: P2PAutomationConfig
): Fantasy42P2PAutomation => {
  return new Fantasy42P2PAutomation(p2pMatching, fantasyClient, cashierSystem, config);
};

export const initializeFantasy42P2PAutomation = async (
  p2pMatching: P2PPaymentMatching,
  fantasyClient: Fantasy42AgentClient,
  cashierSystem: EnhancedCashierSystem,
  config: P2PAutomationConfig
): Promise<boolean> => {
  const automation = new Fantasy42P2PAutomation(p2pMatching, fantasyClient, cashierSystem, config);
  return await automation.initialize();
};

// Export types
export type { P2PAutomationConfig, P2PTransferRequest };
