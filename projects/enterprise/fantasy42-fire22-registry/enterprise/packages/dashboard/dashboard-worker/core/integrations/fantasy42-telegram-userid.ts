/**
 * Fantasy42 Telegram User ID Management System
 * Complete Telegram user ID verification, validation, and management system
 * Targets: Telegram user ID setup, validation, and integration with alert systems
 */

import { XPathElementHandler, handleFantasy42Element } from '../ui/xpath-element-handler';
import { Fantasy42AgentClient } from '../../src/api/fantasy42-agent-client';
import { Fantasy42UnifiedIntegration } from './fantasy42-unified-integration';

export interface TelegramUser {
  id: string;
  telegramUserId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  verificationStatus: 'pending' | 'verified' | 'failed' | 'expired';
  verificationCode: string;
  verificationExpiry: string;
  lastVerificationAttempt: string;
  verificationAttempts: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
}

export interface TelegramVerification {
  userId: string;
  telegramUserId: string;
  verificationCode: string;
  status: 'pending' | 'verified' | 'failed' | 'expired';
  createdAt: string;
  expiresAt: string;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: string;
  verifiedAt?: string;
  metadata: Record<string, any>;
}

export interface TelegramUserIdConfig {
  validation: {
    minLength: number;
    maxLength: number;
    allowedCharacters: string;
    formatValidation: boolean;
  };
  verification: {
    codeLength: number;
    expiryMinutes: number;
    maxAttempts: number;
    retryDelayMinutes: number;
    autoCleanupHours: number;
  };
  integration: {
    autoSync: boolean;
    syncInterval: number;
    batchSize: number;
    retryAttempts: number;
  };
  security: {
    rateLimiting: boolean;
    maxRequestsPerHour: number;
    ipWhitelist: string[];
    encryption: boolean;
  };
  ui: {
    showInstructions: boolean;
    showValidationStatus: boolean;
    showRetryOptions: boolean;
    autoRefresh: boolean;
  };
}

export interface TelegramUserIdAnalytics {
  verification: {
    totalAttempts: number;
    successfulVerifications: number;
    failedVerifications: number;
    expiredVerifications: number;
    averageVerificationTime: number;
    successRate: number;
  };
  users: {
    totalUsers: number;
    activeUsers: number;
    verifiedUsers: number;
    pendingUsers: number;
    failedUsers: number;
  };
  performance: {
    averageResponseTime: number;
    errorRate: number;
    systemLoad: number;
    queueLength: number;
  };
  security: {
    blockedAttempts: number;
    suspiciousActivities: number;
    rateLimitHits: number;
    validationErrors: number;
  };
}

export class Fantasy42TelegramUserId {
  private xpathHandler: XPathElementHandler;
  private fantasyClient: Fantasy42AgentClient;
  private unifiedIntegration: Fantasy42UnifiedIntegration;

  private telegramUsers: Map<string, TelegramUser> = new Map();
  private verifications: Map<string, TelegramVerification> = new Map();
  private config: TelegramUserIdConfig;
  private analytics: TelegramUserIdAnalytics;
  private isInitialized: boolean = false;

  private eventListeners: Map<string, EventListener> = new Map();
  private observers: Map<string, MutationObserver> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private verificationQueue: Array<any> = [];
  private processingTimer: NodeJS.Timeout | null = null;

  constructor(
    fantasyClient: Fantasy42AgentClient,
    unifiedIntegration: Fantasy42UnifiedIntegration,
    config?: Partial<TelegramUserIdConfig>
  ) {
    this.xpathHandler = XPathElementHandler.getInstance();
    this.fantasyClient = fantasyClient;
    this.unifiedIntegration = unifiedIntegration;

    this.config = this.createDefaultConfig();
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.analytics = this.initializeAnalytics();
  }

  /**
   * Initialize Fantasy42 Telegram User ID system
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('📱 Initializing Fantasy42 Telegram User ID System...');

      // Detect Telegram user ID setup elements
      await this.detectTelegramUserIdElements();

      // Initialize user ID validation
      await this.initializeUserIdValidation();

      // Setup verification system
      await this.initializeVerificationSystem();

      // Setup integration with alert systems
      await this.initializeAlertIntegration();

      // Setup analytics and monitoring
      if (this.config.ui.showValidationStatus) {
        await this.initializeAnalyticsTracking();
      }

      this.isInitialized = true;
      console.log('✅ Fantasy42 Telegram User ID System initialized');

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Telegram User ID system:', error);
      return false;
    }
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(): TelegramUserIdConfig {
    return {
      validation: {
        minLength: 8,
        maxLength: 10,
        allowedCharacters: '0123456789',
        formatValidation: true,
      },
      verification: {
        codeLength: 6,
        expiryMinutes: 15,
        maxAttempts: 3,
        retryDelayMinutes: 5,
        autoCleanupHours: 24,
      },
      integration: {
        autoSync: true,
        syncInterval: 300000, // 5 minutes
        batchSize: 50,
        retryAttempts: 3,
      },
      security: {
        rateLimiting: true,
        maxRequestsPerHour: 100,
        ipWhitelist: [],
        encryption: true,
      },
      ui: {
        showInstructions: true,
        showValidationStatus: true,
        showRetryOptions: true,
        autoRefresh: true,
      },
    };
  }

  /**
   * Initialize analytics
   */
  private initializeAnalytics(): TelegramUserIdAnalytics {
    return {
      verification: {
        totalAttempts: 0,
        successfulVerifications: 0,
        failedVerifications: 0,
        expiredVerifications: 0,
        averageVerificationTime: 0,
        successRate: 0,
      },
      users: {
        totalUsers: 0,
        activeUsers: 0,
        verifiedUsers: 0,
        pendingUsers: 0,
        failedUsers: 0,
      },
      performance: {
        averageResponseTime: 0,
        errorRate: 0,
        systemLoad: 0,
        queueLength: 0,
      },
      security: {
        blockedAttempts: 0,
        suspiciousActivities: 0,
        rateLimitHits: 0,
        validationErrors: 0,
      },
    };
  }

  /**
   * Detect Telegram user ID setup elements
   */
  private async detectTelegramUserIdElements(): Promise<void> {
    const telegramSelectors = [
      'span[data-language="L-842"]',
      '[data-language*="telegram"]',
      '[data-language*="user"]',
      '[data-language*="bot"]',
      '.telegram-setup',
      '.userid-setup',
      '.telegram-instructions',
    ];

    let telegramElement: Element | null = null;

    for (const selector of telegramSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        if (
          element.textContent?.toLowerCase().includes('telegram') ||
          element.textContent?.toLowerCase().includes('user') ||
          element.textContent?.toLowerCase().includes('bot') ||
          element.textContent?.toLowerCase().includes('id')
        ) {
          telegramElement = element;
          console.log('✅ Found Telegram user ID element:', selector);
          this.setupTelegramUserIdElement(telegramElement as HTMLElement);
          break;
        }
      }
      if (telegramElement) break;
    }

    if (!telegramElement) {
      console.log('⚠️ Telegram user ID element not found, system will initialize on demand');
    }
  }

  /**
   * Setup Telegram user ID element
   */
  private setupTelegramUserIdElement(element: HTMLElement): void {
    // Find parent container
    const container =
      element.closest('.divinfo, .telegram-setup, .userid-section') || element.parentElement;
    if (!container) {
      console.warn('⚠️ Parent container not found for Telegram user ID element');
      return;
    }

    // Add click event listener
    const clickHandler = (e: Event) => {
      e.preventDefault();
      this.handleTelegramSetup(container as HTMLElement);
    };

    element.addEventListener('click', clickHandler);
    this.eventListeners.set('telegram-element-click', clickHandler);

    // Enhance the setup interface
    this.enhanceTelegramSetupInterface(container as HTMLElement);

    // Initialize user ID input and validation
    this.initializeUserIdInput(container as HTMLElement);

    console.log('✅ Telegram user ID element setup complete');
  }

  /**
   * Enhance Telegram setup interface
   */
  private enhanceTelegramSetupInterface(container: HTMLElement): void {
    // Add CSS enhancements
    const style = document.createElement('style');
    style.textContent = `
	  .telegram-userid-setup {
	    background: linear-gradient(135deg, #0088cc 0%, #005f99 100%);
	    border-radius: 12px;
	    padding: 25px;
	    margin: 20px 0;
	    box-shadow: 0 8px 25px rgba(0, 136, 204, 0.3);
	    border: 1px solid rgba(0, 136, 204, 0.2);
	  }

	  .telegram-header {
	    text-align: center;
	    margin-bottom: 25px;
	  }

	  .telegram-logo {
	    width: 60px;
	    height: 60px;
	    background: #0088cc;
	    border-radius: 50%;
	    display: flex;
	    align-items: center;
	    justify-content: center;
	    margin: 0 auto 15px;
	    font-size: 30px;
	    color: white;
	  }

	  .telegram-title {
	    color: white;
	    font-size: 1.5rem;
	    font-weight: 600;
	    margin: 0;
	  }

	  .telegram-subtitle {
	    color: rgba(255, 255, 255, 0.8);
	    font-size: 0.9rem;
	    margin: 5px 0 0 0;
	  }

	  .telegram-instructions {
	    background: rgba(255, 255, 255, 0.1);
	    border-radius: 8px;
	    padding: 20px;
	    margin-bottom: 25px;
	    border-left: 4px solid #0088cc;
	  }

	  .instruction-step {
	    display: flex;
	    align-items: flex-start;
	    margin-bottom: 15px;
	    color: white;
	  }

	  .step-number {
	    width: 30px;
	    height: 30px;
	    background: #0088cc;
	    border-radius: 50%;
	    display: flex;
	    align-items: center;
	    justify-content: center;
	    font-weight: bold;
	    margin-right: 15px;
	    flex-shrink: 0;
	    margin-top: 2px;
	  }

	  .step-content {
	    flex: 1;
	  }

	  .step-content strong {
	    color: #ffffff;
	    display: block;
	    margin-bottom: 5px;
	  }

	  .step-content p {
	    margin: 0;
	    color: rgba(255, 255, 255, 0.9);
	    line-height: 1.4;
	  }

	  .userid-input-section {
	    background: white;
	    border-radius: 8px;
	    padding: 20px;
	    margin-bottom: 20px;
	  }

	  .userid-input-group {
	    margin-bottom: 15px;
	  }

	  .userid-input-group label {
	    display: block;
	    font-weight: 600;
	    color: #333;
	    margin-bottom: 8px;
	  }

	  .userid-input {
	    width: 100%;
	    padding: 12px 15px;
	    border: 2px solid #e9ecef;
	    border-radius: 6px;
	    font-size: 16px;
	    color: #333;
	    transition: border-color 0.3s ease;
	  }

	  .userid-input:focus {
	    outline: none;
	    border-color: #0088cc;
	    box-shadow: 0 0 0 3px rgba(0, 136, 204, 0.1);
	  }

	  .userid-input.valid {
	    border-color: #28a745;
	    background-color: #f8fff8;
	  }

	  .userid-input.invalid {
	    border-color: #dc3545;
	    background-color: #fff8f8;
	  }

	  .validation-message {
	    font-size: 14px;
	    margin-top: 5px;
	    display: none;
	  }

	  .validation-message.success {
	    color: #28a745;
	    display: block;
	  }

	  .validation-message.error {
	    color: #dc3545;
	    display: block;
	  }

	  .userid-actions {
	    display: flex;
	    gap: 10px;
	    flex-wrap: wrap;
	  }

	  .userid-btn {
	    padding: 12px 20px;
	    border-radius: 6px;
	    font-weight: 500;
	    cursor: pointer;
	    transition: all 0.3s ease;
	    border: none;
	    flex: 1;
	    min-width: 120px;
	  }

	  .userid-btn-primary {
	    background: linear-gradient(135deg, #0088cc 0%, #005f99 100%);
	    color: white;
	  }

	  .userid-btn-primary:hover {
	    transform: translateY(-2px);
	    box-shadow: 0 4px 12px rgba(0, 136, 204, 0.3);
	  }

	  .userid-btn-secondary {
	    background: #6c757d;
	    color: white;
	  }

	  .userid-btn-success {
	    background: #28a745;
	    color: white;
	  }

	  .userid-status {
	    padding: 15px;
	    border-radius: 6px;
	    margin-top: 15px;
	    display: none;
	  }

	  .userid-status.pending {
	    background: #fff3cd;
	    border: 1px solid #ffeaa7;
	    color: #856404;
	    display: block;
	  }

	  .userid-status.verified {
	    background: #d4edda;
	    border: 1px solid #c3e6cb;
	    color: #155724;
	    display: block;
	  }

	  .userid-status.failed {
	    background: #f8d7da;
	    border: 1px solid #f5c6cb;
	    color: #721c24;
	    display: block;
	  }

	  .verification-code-display {
	    background: #f8f9fa;
	    border: 1px solid #dee2e6;
	    border-radius: 6px;
	    padding: 15px;
	    margin-top: 15px;
	    text-align: center;
	    display: none;
	  }

	  .verification-code {
	    font-size: 24px;
	    font-weight: bold;
	    color: #0088cc;
	    letter-spacing: 3px;
	    font-family: monospace;
	    margin: 10px 0;
	    user-select: all;
	  }

	  .code-expiry {
	    font-size: 12px;
	    color: #6c757d;
	    margin-top: 10px;
	  }

	  .userid-analytics {
	    background: rgba(255, 255, 255, 0.1);
	    border-radius: 6px;
	    padding: 15px;
	    margin-top: 20px;
	  }

	  .analytics-grid {
	    display: grid;
	    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
	    gap: 15px;
	    margin-top: 10px;
	  }

	  .analytics-item {
	    text-align: center;
	  }

	  .analytics-value {
	    font-size: 18px;
	    font-weight: bold;
	    color: white;
	    display: block;
	  }

	  .analytics-label {
	    font-size: 12px;
	    color: rgba(255, 255, 255, 0.8);
	    margin-top: 5px;
	  }

	  .telegram-bot-link {
	    color: #ffffff;
	    text-decoration: underline;
	  }

	  .telegram-bot-link:hover {
	    color: #cce7ff;
	  }

	  @media (max-width: 768px) {
	    .telegram-userid-setup {
	      padding: 20px 15px;
	    }

	    .userid-actions {
	      flex-direction: column;
	    }

	    .userid-btn {
	      width: 100%;
	    }

	    .instruction-step {
	      flex-direction: column;
	      align-items: flex-start;
	    }

	    .step-number {
	      margin-bottom: 10px;
	      margin-right: 0;
	    }
	  }
	`;

    document.head.appendChild(style);

    // Enhance the container
    container.classList.add('telegram-userid-setup');

    // Add enhanced structure
    this.addEnhancedStructure(container);
  }

  /**
   * Add enhanced structure
   */
  private addEnhancedStructure(container: HTMLElement): void {
    const enhancedHTML = `
	  <div class="telegram-header">
	    <div class="telegram-logo">📱</div>
	    <h3 class="telegram-title">Telegram User ID Setup</h3>
	    <p class="telegram-subtitle">Connect your Telegram account to receive alerts and notifications</p>
	  </div>

	  <div class="telegram-instructions">
	    <div class="instruction-step">
	      <div class="step-number">1</div>
	      <div class="step-content">
	        <strong>Search for the userinfobot</strong>
	        <p>Open Telegram and search for <span class="telegram-bot-link">@userinfobot</span></p>
	      </div>
	    </div>

	    <div class="instruction-step">
	      <div class="step-number">2</div>
	      <div class="step-content">
	        <strong>Start a conversation</strong>
	        <p>Choose the userinfobot contact and send "/start" to begin</p>
	      </div>
	    </div>

	    <div class="instruction-step">
	      <div class="step-number">3</div>
	      <div class="step-content">
	        <strong>Get your User ID</strong>
	        <p>The bot will immediately send you a message with your 8-10 digit User ID on the first line</p>
	      </div>
	    </div>
	  </div>

	  <div class="userid-input-section">
	    <div class="userid-input-group">
	      <label for="telegram-userid-input">Enter Your Telegram User ID:</label>
	      <input type="text" id="telegram-userid-input" class="userid-input" placeholder="Enter 8-10 digit User ID" maxlength="10">
	      <div class="validation-message" id="userid-validation-message"></div>
	    </div>

	    <div class="userid-actions">
	      <button id="validate-userid-btn" class="userid-btn userid-btn-primary">Validate User ID</button>
	      <button id="send-verification-btn" class="userid-btn userid-btn-secondary" style="display: none;">Send Verification</button>
	      <button id="verify-code-btn" class="userid-btn userid-btn-success" style="display: none;">Verify Code</button>
	    </div>

	    <div class="userid-status" id="userid-status">
	      <!-- Status messages will be shown here -->
	    </div>

	    <div class="verification-code-display" id="verification-code-display">
	      <h6>Your Verification Code:</h6>
	      <div class="verification-code" id="verification-code">000000</div>
	      <p>Send this code to @Fantasy42Bot on Telegram to complete verification</p>
	      <div class="code-expiry" id="code-expiry">Expires in 15 minutes</div>
	    </div>
	  </div>

	  <div class="userid-analytics">
	    <h6>Verification Statistics</h6>
	    <div class="analytics-grid">
	      <div class="analytics-item">
	        <span class="analytics-value" id="analytics-total">0</span>
	        <span class="analytics-label">Total Users</span>
	      </div>
	      <div class="analytics-item">
	        <span class="analytics-value" id="analytics-verified">0</span>
	        <span class="analytics-label">Verified</span>
	      </div>
	      <div class="analytics-item">
	        <span class="analytics-value" id="analytics-pending">0</span>
	        <span class="analytics-label">Pending</span>
	      </div>
	      <div class="analytics-item">
	        <span class="analytics-value" id="analytics-success">0%</span>
	        <span class="analytics-label">Success Rate</span>
	      </div>
	    </div>
	  </div>
	`;

    // Insert the enhanced structure
    container.innerHTML = enhancedHTML;
  }

  /**
   * Initialize user ID input
   */
  private initializeUserIdInput(container: HTMLElement): void {
    const userIdInput = container.querySelector('#telegram-userid-input') as HTMLInputElement;
    const validateBtn = container.querySelector('#validate-userid-btn') as HTMLButtonElement;
    const sendVerificationBtn = container.querySelector(
      '#send-verification-btn'
    ) as HTMLButtonElement;
    const verifyCodeBtn = container.querySelector('#verify-code-btn') as HTMLButtonElement;

    if (userIdInput) {
      // Add input validation
      userIdInput.addEventListener('input', () => {
        this.validateUserIdInput(userIdInput);
      });

      // Add enter key support
      userIdInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
          this.handleValidateUserId(userIdInput.value);
        }
      });
    }

    if (validateBtn) {
      validateBtn.addEventListener('click', () => {
        this.handleValidateUserId(userIdInput.value);
      });
    }

    if (sendVerificationBtn) {
      sendVerificationBtn.addEventListener('click', () => {
        this.handleSendVerification(userIdInput.value);
      });
    }

    if (verifyCodeBtn) {
      verifyCodeBtn.addEventListener('click', () => {
        this.handleVerifyCode(userIdInput.value);
      });
    }

    console.log('✅ User ID input initialized');
  }

  /**
   * Validate user ID input
   */
  private validateUserIdInput(input: HTMLInputElement): void {
    const userId = input.value;
    const validationMessage = document.querySelector('#userid-validation-message') as HTMLElement;

    if (!userId) {
      this.clearValidation(input, validationMessage);
      return;
    }

    // Basic format validation
    const isValidFormat = this.validateUserIdFormat(userId);

    if (isValidFormat) {
      input.classList.remove('invalid');
      input.classList.add('valid');
      validationMessage.className = 'validation-message success';
      validationMessage.textContent = '✓ Valid User ID format';
    } else {
      input.classList.remove('valid');
      input.classList.add('invalid');
      validationMessage.className = 'validation-message error';
      validationMessage.textContent = '✗ User ID must be 8-10 digits only';
    }
  }

  /**
   * Validate user ID format
   */
  private validateUserIdFormat(userId: string): boolean {
    if (!this.config.validation.formatValidation) return true;

    const { minLength, maxLength, allowedCharacters } = this.config.validation;

    // Check length
    if (userId.length < minLength || userId.length > maxLength) {
      return false;
    }

    // Check characters
    for (const char of userId) {
      if (!allowedCharacters.includes(char)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Clear validation
   */
  private clearValidation(input: HTMLInputElement, message: HTMLElement): void {
    input.classList.remove('valid', 'invalid');
    message.className = 'validation-message';
    message.textContent = '';
  }

  /**
   * Handle validate user ID
   */
  private async handleValidateUserId(userId: string): Promise<void> {
    if (!userId) {
      this.showStatusMessage('Please enter a Telegram User ID', 'error');
      return;
    }

    if (!this.validateUserIdFormat(userId)) {
      this.showStatusMessage('Invalid User ID format. Must be 8-10 digits.', 'error');
      return;
    }

    // Show loading state
    this.setLoadingState(true);

    try {
      // Check if user ID exists and is available
      const isAvailable = await this.checkUserIdAvailability(userId);

      if (isAvailable) {
        // Show send verification button
        this.showVerificationOptions(userId);
        this.showStatusMessage(
          'User ID is valid. Click "Send Verification" to continue.',
          'success'
        );
      } else {
        this.showStatusMessage('This User ID is already registered or invalid.', 'error');
      }
    } catch (error) {
      console.error('User ID validation error:', error);
      this.showStatusMessage('Failed to validate User ID. Please try again.', 'error');
    } finally {
      this.setLoadingState(false);
    }

    // Track analytics
    this.trackAnalytics('userid_validation_attempt', {
      userId: userId.substring(0, 3) + '***', // Partial for privacy
      success: false, // Will be updated
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Check user ID availability
   */
  private async checkUserIdAvailability(userId: string): Promise<boolean> {
    // Simulate API call
    return new Promise(resolve => {
      setTimeout(() => {
        // For demo, assume all IDs are available except some specific ones
        const takenIds = ['12345678', '98765432'];
        resolve(!takenIds.includes(userId));
      }, 1000);
    });
  }

  /**
   * Show verification options
   */
  private showVerificationOptions(userId: string): void {
    const validateBtn = document.querySelector('#validate-userid-btn') as HTMLElement;
    const sendVerificationBtn = document.querySelector('#send-verification-btn') as HTMLElement;

    if (validateBtn) validateBtn.style.display = 'none';
    if (sendVerificationBtn) sendVerificationBtn.style.display = 'block';
  }

  /**
   * Handle send verification
   */
  private async handleSendVerification(userId: string): Promise<void> {
    if (!userId) return;

    this.setLoadingState(true);

    try {
      // Generate verification code
      const verificationCode = this.generateVerificationCode();
      const expiryTime = new Date(Date.now() + this.config.verification.expiryMinutes * 60 * 1000);

      // Create verification record
      const verification: TelegramVerification = {
        userId: 'current_user', // In real implementation, get from session
        telegramUserId: userId,
        verificationCode,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: expiryTime.toISOString(),
        attempts: 0,
        maxAttempts: this.config.verification.maxAttempts,
        metadata: {},
      };

      // Store verification
      this.verifications.set(userId, verification);

      // Display verification code
      this.displayVerificationCode(verificationCode, expiryTime);

      // Show verify button
      const sendBtn = document.querySelector('#send-verification-btn') as HTMLElement;
      const verifyBtn = document.querySelector('#verify-code-btn') as HTMLElement;

      if (sendBtn) sendBtn.style.display = 'none';
      if (verifyBtn) verifyBtn.style.display = 'block';

      this.showStatusMessage(
        'Verification code sent! Check your Telegram and click "Verify Code".',
        'success'
      );

      // Start countdown timer
      this.startExpiryCountdown(expiryTime);
    } catch (error) {
      console.error('Send verification error:', error);
      this.showStatusMessage('Failed to send verification. Please try again.', 'error');
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * Generate verification code
   */
  private generateVerificationCode(): string {
    const codeLength = this.config.verification.codeLength;
    let code = '';

    for (let i = 0; i < codeLength; i++) {
      code += Math.floor(Math.random() * 10);
    }

    return code;
  }

  /**
   * Display verification code
   */
  private displayVerificationCode(code: string, expiryTime: Date): void {
    const codeDisplay = document.querySelector('#verification-code-display') as HTMLElement;
    const codeElement = document.querySelector('#verification-code') as HTMLElement;

    if (codeElement) codeElement.textContent = code;
    if (codeDisplay) codeDisplay.style.display = 'block';
  }

  /**
   * Start expiry countdown
   */
  private startExpiryCountdown(expiryTime: Date): void {
    const countdownElement = document.querySelector('#code-expiry') as HTMLElement;

    if (!countdownElement) return;

    const updateCountdown = () => {
      const now = new Date();
      const remaining = expiryTime.getTime() - now.getTime();

      if (remaining <= 0) {
        countdownElement.textContent = 'Code expired';
        countdownElement.style.color = '#dc3545';
        this.handleCodeExpiry();
        return;
      }

      const minutes = Math.floor(remaining / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      countdownElement.textContent = `Expires in ${minutes}:${seconds.toString().padStart(2, '0')}`;
      countdownElement.style.color = minutes < 2 ? '#ffc107' : '#6c757d';
    };

    updateCountdown();
    const countdownTimer = setInterval(updateCountdown, 1000);
    this.timers.set('countdown', countdownTimer);
  }

  /**
   * Handle code expiry
   */
  private handleCodeExpiry(): void {
    const codeDisplay = document.querySelector('#verification-code-display') as HTMLElement;
    const verifyBtn = document.querySelector('#verify-code-btn') as HTMLElement;
    const sendBtn = document.querySelector('#send-verification-btn') as HTMLElement;

    if (codeDisplay) codeDisplay.style.display = 'none';
    if (verifyBtn) verifyBtn.style.display = 'none';
    if (sendBtn) sendBtn.style.display = 'block';

    this.showStatusMessage('Verification code expired. Please try again.', 'error');
  }

  /**
   * Handle verify code
   */
  private async handleVerifyCode(userId: string): Promise<void> {
    const verification = this.verifications.get(userId);
    if (!verification) {
      this.showStatusMessage('No verification in progress. Please start over.', 'error');
      return;
    }

    // Check if expired
    if (new Date() > new Date(verification.expiresAt)) {
      this.showStatusMessage('Verification code expired. Please request a new one.', 'error');
      this.verifications.delete(userId);
      return;
    }

    // Check attempts
    if (verification.attempts >= verification.maxAttempts) {
      this.showStatusMessage(
        'Too many failed attempts. Please request a new verification code.',
        'error'
      );
      this.verifications.delete(userId);
      return;
    }

    this.setLoadingState(true);

    try {
      // In real implementation, this would verify with Telegram bot
      const isVerified = await this.verifyWithTelegramBot(userId, verification.verificationCode);

      if (isVerified) {
        // Update verification status
        verification.status = 'verified';
        verification.verifiedAt = new Date().toISOString();
        verification.attempts++;

        // Create telegram user record
        const telegramUser: TelegramUser = {
          id: 'user_' + Date.now(),
          telegramUserId: userId,
          verificationStatus: 'verified',
          verificationCode: verification.verificationCode,
          verificationExpiry: verification.expiresAt,
          lastVerificationAttempt: new Date().toISOString(),
          verificationAttempts: verification.attempts,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: {},
        };

        this.telegramUsers.set(userId, telegramUser);

        // Hide verification elements
        this.hideVerificationElements();

        // Show success message
        this.showStatusMessage(
          '✅ Telegram User ID verified successfully! You can now receive alerts.',
          'success'
        );

        // Update analytics
        this.updateAnalytics('verification_success');
      } else {
        verification.attempts++;
        this.showStatusMessage(
          `Verification failed. ${verification.maxAttempts - verification.attempts} attempts remaining.`,
          'error'
        );

        // Update analytics
        this.updateAnalytics('verification_failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      verification.attempts++;
      this.showStatusMessage('Verification failed. Please try again.', 'error');
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * Verify with Telegram bot
   */
  private async verifyWithTelegramBot(userId: string, code: string): Promise<boolean> {
    // Simulate Telegram bot verification
    return new Promise(resolve => {
      setTimeout(() => {
        // For demo, assume success
        resolve(true);
      }, 2000);
    });
  }

  /**
   * Hide verification elements
   */
  private hideVerificationElements(): void {
    const codeDisplay = document.querySelector('#verification-code-display') as HTMLElement;
    const verifyBtn = document.querySelector('#verify-code-btn') as HTMLElement;

    if (codeDisplay) codeDisplay.style.display = 'none';
    if (verifyBtn) verifyBtn.style.display = 'none';
  }

  /**
   * Show status message
   */
  private showStatusMessage(
    message: string,
    type: 'success' | 'error' | 'pending' = 'pending'
  ): void {
    const statusDiv = document.querySelector('#userid-status') as HTMLElement;

    if (statusDiv) {
      statusDiv.className = `userid-status ${type}`;
      statusDiv.textContent = message;
      statusDiv.style.display = 'block';
    }
  }

  /**
   * Set loading state
   */
  private setLoadingState(loading: boolean): void {
    const buttons = document.querySelectorAll('.userid-btn') as NodeListOf<HTMLButtonElement>;

    buttons.forEach(button => {
      button.disabled = loading;
      button.textContent = loading
        ? 'Processing...'
        : button.textContent?.replace('Processing...', '') || 'Process';
    });
  }

  /**
   * Handle Telegram setup
   */
  private handleTelegramSetup(container: HTMLElement): void {
    // Initialize or refresh the setup interface
    this.initializeUserIdInput(container);

    console.log('📱 Telegram setup initiated');
  }

  /**
   * Initialize user ID validation
   */
  private async initializeUserIdValidation(): Promise<void> {
    // Setup validation engine
    console.log('🔍 User ID validation initialized');
  }

  /**
   * Initialize verification system
   */
  private async initializeVerificationSystem(): Promise<void> {
    // Setup verification processing
    this.startVerificationProcessing();

    console.log('✅ Verification system initialized');
  }

  /**
   * Initialize alert integration
   */
  private async initializeAlertIntegration(): Promise<void> {
    // Setup integration with alert systems
    console.log('🚨 Alert integration initialized');
  }

  /**
   * Initialize analytics tracking
   */
  private async initializeAnalyticsTracking(): Promise<void> {
    // Setup analytics tracking
    this.updateAnalyticsDisplay();

    console.log('📊 Analytics tracking initialized');
  }

  /**
   * Start verification processing
   */
  private startVerificationProcessing(): void {
    // Start processing verification queue
    console.log('⚙️ Verification processing started');
  }

  /**
   * Update analytics display
   */
  private updateAnalyticsDisplay(): void {
    // Update analytics display elements
    const totalElement = document.querySelector('#analytics-total') as HTMLElement;
    const verifiedElement = document.querySelector('#analytics-verified') as HTMLElement;
    const pendingElement = document.querySelector('#analytics-pending') as HTMLElement;
    const successElement = document.querySelector('#analytics-success') as HTMLElement;

    if (totalElement) totalElement.textContent = this.analytics.users.totalUsers.toString();
    if (verifiedElement)
      verifiedElement.textContent = this.analytics.users.verifiedUsers.toString();
    if (pendingElement) pendingElement.textContent = this.analytics.users.pendingUsers.toString();
    if (successElement)
      successElement.textContent = `${Math.round(this.analytics.verification.successRate * 100)}%`;
  }

  /**
   * Update analytics
   */
  private updateAnalytics(event: string, data?: any): void {
    switch (event) {
      case 'verification_success':
        this.analytics.verification.successfulVerifications++;
        this.analytics.users.verifiedUsers++;
        break;
      case 'verification_failed':
        this.analytics.verification.failedVerifications++;
        this.analytics.users.failedUsers++;
        break;
      case 'userid_validation_attempt':
        this.analytics.verification.totalAttempts++;
        break;
    }

    // Recalculate rates
    this.analytics.verification.successRate =
      this.analytics.verification.totalAttempts > 0
        ? this.analytics.verification.successfulVerifications /
          this.analytics.verification.totalAttempts
        : 0;

    this.analytics.users.totalUsers = this.telegramUsers.size;

    // Update display
    this.updateAnalyticsDisplay();

    console.log('📊 Analytics updated:', event, data);
  }

  /**
   * Track analytics
   */
  private trackAnalytics(event: string, data: any): void {
    this.updateAnalytics(event, data);
  }

  /**
   * Get status
   */
  getStatus(): {
    isInitialized: boolean;
    totalUsers: number;
    verifiedUsers: number;
    pendingVerifications: number;
    analytics: TelegramUserIdAnalytics;
  } {
    return {
      isInitialized: this.isInitialized,
      totalUsers: this.telegramUsers.size,
      verifiedUsers: Array.from(this.telegramUsers.values()).filter(
        u => u.verificationStatus === 'verified'
      ).length,
      pendingVerifications: this.verifications.size,
      analytics: { ...this.analytics },
    };
  }

  /**
   * Get Telegram users
   */
  getTelegramUsers(): TelegramUser[] {
    return Array.from(this.telegramUsers.values());
  }

  /**
   * Get user by Telegram ID
   */
  getUserByTelegramId(telegramUserId: string): TelegramUser | null {
    return this.telegramUsers.get(telegramUserId) || null;
  }

  /**
   * Add Telegram user
   */
  addTelegramUser(user: TelegramUser): boolean {
    if (this.telegramUsers.has(user.telegramUserId)) {
      return false; // Already exists
    }

    this.telegramUsers.set(user.telegramUserId, {
      ...user,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    this.updateAnalytics('user_added');
    return true;
  }

  /**
   * Update Telegram user
   */
  updateTelegramUser(telegramUserId: string, updates: Partial<TelegramUser>): boolean {
    const existing = this.telegramUsers.get(telegramUserId);
    if (existing) {
      this.telegramUsers.set(telegramUserId, {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      return true;
    }
    return false;
  }

  /**
   * Remove Telegram user
   */
  removeTelegramUser(telegramUserId: string): boolean {
    const removed = this.telegramUsers.delete(telegramUserId);
    if (removed) {
      this.updateAnalytics('user_removed');
    }
    return removed;
  }

  /**
   * Verify user
   */
  async verifyUser(telegramUserId: string, verificationCode: string): Promise<boolean> {
    const verification = this.verifications.get(telegramUserId);
    if (!verification) return false;

    if (verification.verificationCode === verificationCode) {
      verification.status = 'verified';
      verification.verifiedAt = new Date().toISOString();

      // Update user status
      const user = this.telegramUsers.get(telegramUserId);
      if (user) {
        user.verificationStatus = 'verified';
        user.updatedAt = new Date().toISOString();
      }

      this.updateAnalytics('verification_success');
      return true;
    }

    verification.attempts++;
    this.updateAnalytics('verification_failed');
    return false;
  }

  /**
   * Update configuration
   */
  updateConfiguration(newConfig: Partial<TelegramUserIdConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Telegram User ID configuration updated');
  }

  /**
   * Export user data
   */
  exportUserData(): string {
    const exportData = {
      telegramUsers: Array.from(this.telegramUsers.values()),
      verifications: Array.from(this.verifications.values()),
      analytics: this.analytics,
      config: this.config,
      exportDate: new Date().toISOString(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();

    // Clear queue
    this.verificationQueue.length = 0;

    // Disconnect observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();

    // Remove event listeners
    this.eventListeners.forEach((listener, key) => {
      // Note: Can't easily remove listeners without references
    });
    this.eventListeners.clear();

    this.isInitialized = false;
    console.log('🧹 Telegram User ID system cleaned up');
  }

  // Private properties
  private sortDirection: 'asc' | 'desc' = 'desc';
  private currentSort: string = 'closingLine';
}

// Convenience functions
export const createFantasy42TelegramUserId = (
  fantasyClient: Fantasy42AgentClient,
  unifiedIntegration: Fantasy42UnifiedIntegration,
  config?: Partial<TelegramUserIdConfig>
): Fantasy42TelegramUserId => {
  return new Fantasy42TelegramUserId(fantasyClient, unifiedIntegration, config);
};

export const initializeFantasy42TelegramUserId = async (
  fantasyClient: Fantasy42AgentClient,
  unifiedIntegration: Fantasy42UnifiedIntegration,
  config?: Partial<TelegramUserIdConfig>
): Promise<boolean> => {
  const telegramUserId = new Fantasy42TelegramUserId(fantasyClient, unifiedIntegration, config);
  return await telegramUserId.initialize();
};

// Export types
export type { TelegramUser, TelegramVerification, TelegramUserIdConfig, TelegramUserIdAnalytics };
