/**
 * Enhanced P2P Telegram Bot with Payment Validation
 * Includes customer history checking and payment method validation
 */

import { P2PPaymentMatching, P2PPaymentRequest, P2PMatch } from '../payments/p2p-payment-matching';
import {
  CustomerPaymentValidation,
  PaymentValidationResult,
} from '../payments/customer-payment-validation';
import {
  CustomerDatabaseManagement,
  CustomerProfile,
} from '../customers/customer-database-management';

export interface EnhancedTelegramSession extends TelegramSession {
  paymentValidation?: PaymentValidationResult;
  customerProfile?: CustomerProfile;
  paymentHistory?: any;
  riskAssessments: string[];
  validationWarnings: string[];
}

export class EnhancedP2PTelegramBot extends P2PTelegramBot {
  private paymentValidation: CustomerPaymentValidation;
  private customerManager: CustomerDatabaseManagement;

  constructor(
    p2pMatching: P2PPaymentMatching,
    paymentValidation: CustomerPaymentValidation,
    customerManager: CustomerDatabaseManagement,
    botToken: string,
    webhookUrl: string
  ) {
    super(p2pMatching, botToken, webhookUrl);
    this.paymentValidation = paymentValidation;
    this.customerManager = customerManager;
  }

  /**
   * Enhanced message handling with validation
   */
  async handleMessage(message: TelegramMessage): Promise<string> {
    const user = await this.getOrCreateUser(message.userId, message.chatId);
    const session = this.getOrCreateEnhancedSession(message.userId, message.chatId);

    // Update user activity
    user.lastActiveAt = new Date().toISOString();

    // Load customer profile if available
    if (user.customerId) {
      session.customerProfile = this.customerManager.getCustomerProfile(user.customerId);
    }

    // Handle commands
    if (message.isCommand) {
      return await this.handleEnhancedCommand(message, user, session);
    }

    // Handle conversational input based on current step
    return await this.handleEnhancedConversationalInput(message, user, session);
  }

  /**
   * Enhanced command handling
   */
  private async handleEnhancedCommand(
    message: TelegramMessage,
    user: TelegramUser,
    session: EnhancedTelegramSession
  ): Promise<string> {
    const command = message.command!.toLowerCase();

    switch (command) {
      case '/start':
        return this.handleEnhancedStartCommand(user, session);

      case '/deposit':
        return this.handleEnhancedDepositCommand(user, session);

      case '/withdraw':
        return this.handleEnhancedWithdrawCommand(user, session);

      case '/history':
        return this.handlePaymentHistoryCommand(user, session);

      case '/validate':
        return this.handlePaymentValidationCommand(user, session);

      default:
        return super.handleCommand(message, user, session as any);
    }
  }

  /**
   * Handle enhanced start command with customer recognition
   */
  private handleEnhancedStartCommand(user: TelegramUser, session: EnhancedTelegramSession): string {
    let response = `🤖 **Enhanced P2P Payment Bot**\n\n`;

    if (!user.customerId) {
      response += `To get started, you need to link your account. Please provide your customer ID or contact support.\n\n`;
    } else {
      const customer = session.customerProfile;
      if (customer) {
        response += `Welcome back, **${customer.personalInfo.firstName} ${customer.personalInfo.lastName}**! 👋\n\n`;
        response += `📊 **Account Status:** ${customer.accountInfo.accountStatus}\n`;
        response += `⭐ **VIP Tier:** ${customer.rankingProfile.vipTier}\n`;
        response += `💰 **Account Balance:** $${customer.financialProfile.currentBalance.toFixed(2)}\n`;
        response += `🎯 **Trust Score:** ${customer.rankingProfile.overallScore}/100\n\n`;

        // Show customer's payment method history
        const paymentStats = this.paymentValidation.getPaymentMethodStats(user.customerId);
        if (Object.keys(paymentStats).length > 0) {
          response += `💳 **Your Payment Methods:**\n`;
          Object.entries(paymentStats).forEach(([method, stats]) => {
            const successRate = Math.round(stats.successRate * 100);
            response += `• ${method.toUpperCase()}: ${stats.totalTransactions} transactions, ${successRate}% success\n`;
          });
          response += `\n`;
        }
      }
    }

    response += `**Enhanced Commands:**\n`;
    response += `/deposit - Start a deposit request with validation\n`;
    response += `/withdraw - Start a withdrawal request with validation\n`;
    response += `/history - View your payment method history\n`;
    response += `/validate - Validate a payment method\n`;
    response += `/status - Check your requests\n`;
    response += `/matches - View your matches\n`;
    response += `/help - Show all commands\n\n`;

    response += `💡 **Pro Tip:** I now validate your payment methods against your 3-year history for maximum security!`;

    return response;
  }

  /**
   * Handle enhanced deposit command with validation
   */
  private async handleEnhancedDepositCommand(
    user: TelegramUser,
    session: EnhancedTelegramSession
  ): string {
    if (!user.customerId) {
      return 'You need to link your account first. Please provide your customer ID.';
    }

    if (!user.isVerified) {
      return 'Your account needs to be verified before you can make deposits.';
    }

    // Clear any previous validation data
    session.paymentValidation = undefined;
    session.riskAssessments = [];
    session.validationWarnings = [];

    session.currentStep = 'awaiting_deposit_amount';
    session.pendingRequest = {
      customerId: user.customerId,
      type: 'deposit',
    };

    let response = `💰 **Enhanced Deposit Request**\n\n`;
    response += `I have your 3-year payment history and will validate all transactions for security.\n\n`;
    response += `**How much would you like to deposit?**\n`;
    response += `(e.g., 100, 250, 500, 595)\n\n`;

    // Show recent deposit history if available
    const paymentStats = this.paymentValidation.getPaymentMethodStats(user.customerId);
    const recentDeposits = this.getRecentDeposits(user.customerId);

    if (recentDeposits.length > 0) {
      response += `📈 **Your Recent Deposits:**\n`;
      recentDeposits.slice(0, 3).forEach(deposit => {
        response += `• $${deposit.amount} via ${deposit.paymentMethod} (${this.formatTimeAgo(deposit.createdAt)})\n`;
      });
      response += `\n`;
    }

    response += `*Type /cancel to cancel this request.*`;

    return response;
  }

  /**
   * Handle enhanced withdrawal command
   */
  private async handleEnhancedWithdrawCommand(
    user: TelegramUser,
    session: EnhancedTelegramSession
  ): string {
    if (!user.customerId) {
      return 'You need to link your account first. Please provide your customer ID.';
    }

    if (!user.isVerified) {
      return 'Your account needs to be verified before you can make withdrawals.';
    }

    session.currentStep = 'awaiting_withdrawal_amount';
    session.pendingRequest = {
      customerId: user.customerId,
      type: 'withdrawal',
    };

    return `💸 **Enhanced Withdrawal Request**

I have your 3-year payment history and will validate all transactions for security.

**How much would you like to withdraw?**
(e.g., 100, 250, 500)

*Available amounts will be matched with current deposit requests.*
*Type /cancel to cancel this request.*`;
  }

  /**
   * Handle payment history command
   */
  private handlePaymentHistoryCommand(
    user: TelegramUser,
    session: EnhancedTelegramSession
  ): string {
    if (!user.customerId) {
      return 'You need to link your account first.';
    }

    const paymentStats = this.paymentValidation.getPaymentMethodStats(user.customerId);

    if (Object.keys(paymentStats).length === 0) {
      return 'No payment method history found. Start with /deposit or /withdraw to build your history!';
    }

    let response = `📊 **Your Payment Method History**\n\n`;

    Object.entries(paymentStats).forEach(([method, stats]) => {
      const successRate = Math.round(stats.successRate * 100);
      const avgAmount = stats.averageAmount.toFixed(2);
      const issueCount = stats.issues.length;

      response += `💳 **${method.toUpperCase()}**\n`;
      response += `• Transactions: ${stats.totalTransactions}\n`;
      response += `• Total Volume: $${stats.totalVolume.toFixed(2)}\n`;
      response += `• Success Rate: ${successRate}%\n`;
      response += `• Average Amount: $${avgAmount}\n`;
      response += `• First Used: ${this.formatTimeAgo(stats.firstUsed)}\n`;
      response += `• Last Used: ${this.formatTimeAgo(stats.lastUsed)}\n`;

      if (stats.verifiedAccounts.length > 0) {
        response += `• Verified Accounts: ${stats.verifiedAccounts.length}\n`;
      }

      if (issueCount > 0) {
        response += `• Issues: ${issueCount} (review recommended)\n`;
      }

      response += `\n`;
    });

    response += `💡 **Pro Tip:** I use this history to validate your future transactions and detect any unusual activity!`;

    return response;
  }

  /**
   * Handle payment validation command
   */
  private handlePaymentValidationCommand(
    user: TelegramUser,
    session: EnhancedTelegramSession
  ): string {
    if (!user.customerId) {
      return 'You need to link your account first.';
    }

    session.currentStep = 'awaiting_payment_details';

    return `🔍 **Payment Method Validation**

Enter the payment method and username you want to validate:

**Format:** [method] [username]
**Examples:**
• venmo @johnsmith
• cashapp $johnsmith
• paypal john@email.com
• zelle john@email.com

I will check this against your 3-year payment history and provide a validation score.

*Type /cancel to cancel.*`;
  }

  /**
   * Enhanced deposit method input with validation
   */
  private async handleDepositMethodInput(
    message: TelegramMessage,
    user: TelegramUser,
    session: EnhancedTelegramSession
  ): Promise<string> {
    const methodMap: Record<string, P2PPaymentRequest['paymentMethod']> = {
      venmo: 'venmo',
      'cash app': 'cashapp',
      paypal: 'paypal',
      zelle: 'zelle',
    };

    const inputMethod = message.text.toLowerCase().trim();
    const paymentMethod = methodMap[inputMethod];

    if (!paymentMethod) {
      return `❌ **Invalid Payment Method**

Please choose from:
• Venmo
• Cash App
• PayPal
• Zelle

Reply with the method name.

*Type /cancel to cancel this request.*`;
    }

    session.pendingRequest!.paymentMethod = paymentMethod;

    // Validate payment method against customer history
    const amount = session.pendingRequest!.amount!;
    const validation = await this.validatePaymentMethod(
      user.customerId!,
      paymentMethod,
      '',
      amount
    );

    session.paymentValidation = validation;

    let response = `💰 **Deposit Method: ${paymentMethod.toUpperCase()}**\n\n`;

    // Show validation results
    response += this.formatValidationResults(validation);

    if (
      !validation.isValid ||
      validation.riskLevel === 'high' ||
      validation.riskLevel === 'critical'
    ) {
      response += `\n⚠️ **Action Required:**\n`;
      validation.recommendations.forEach(rec => {
        response += `• ${rec}\n`;
      });

      if (validation.requiresApproval) {
        response += `\n❌ **Approval Required:** This transaction requires manual approval due to risk factors.\n`;
        response += `Please contact support or try a different payment method.\n`;
        return response;
      }
    }

    response += `\n**Please provide your ${paymentMethod} username:**\n`;

    if (validation.checks.historyCheck.hasHistory) {
      // Suggest known usernames
      const paymentStats = this.paymentValidation.getPaymentMethodStats(user.customerId!);
      const methodStats = paymentStats[paymentMethod];

      if (methodStats?.verifiedAccounts.length > 0) {
        response += `\n**Your verified ${paymentMethod} accounts:**\n`;
        methodStats.verifiedAccounts.forEach((account, index) => {
          response += `${index + 1}. ${account.username} (verified ${this.formatTimeAgo(account.verifiedAt)})\n`;
        });
        response += `\n`;
      }
    }

    response += `**Example:** ${this.getPaymentDetailsExample(paymentMethod)}\n\n`;
    response += `*Type /cancel to cancel this request.*`;

    return response;
  }

  /**
   * Enhanced payment details input with validation
   */
  private async handlePaymentDetailsInput(
    message: TelegramMessage,
    user: TelegramUser,
    session: EnhancedTelegramSession
  ): Promise<string> {
    const paymentMethod = session.pendingRequest!.paymentMethod!;
    const details = this.parsePaymentDetails(message.text, paymentMethod);

    if (!details) {
      return `❌ **Invalid Format**

Please provide your details in the correct format:

${this.getPaymentDetailsPrompt(paymentMethod)}

Example: ${this.getPaymentDetailsExample(paymentMethod)}

*Type /cancel to cancel this request.*`;
    }

    // Perform full validation with username
    const validation = await this.validatePaymentMethod(
      user.customerId!,
      paymentMethod,
      details.username || details.email || details.phoneNumber || '',
      session.pendingRequest!.amount!
    );

    session.paymentValidation = validation;

    let response = `🔍 **Payment Validation Complete**\n\n`;

    // Show detailed validation results
    response += this.formatDetailedValidationResults(validation);

    if (!validation.isValid) {
      response += `\n❌ **Validation Failed**\n`;
      validation.warnings.forEach(warning => {
        response += `• ${warning}\n`;
      });
      response += `\n**Recommendations:**\n`;
      validation.recommendations.forEach(rec => {
        response += `• ${rec}\n`;
      });
      return response;
    }

    if (validation.riskLevel === 'high' || validation.riskLevel === 'critical') {
      response += `\n⚠️ **High Risk Detected**\n`;
      validation.recommendations.forEach(rec => {
        response += `• ${rec}\n`;
      });

      if (validation.requiresApproval) {
        response += `\n❌ **Manual Approval Required**\n`;
        response += `Please contact support for approval or try a different payment method.\n`;
        return response;
      }
    }

    session.pendingRequest!.paymentDetails = details;

    try {
      // Create the P2P request
      const request = await this.p2pMatching.createPaymentRequest(
        user.customerId!,
        session.pendingRequest!.type!,
        paymentMethod,
        session.pendingRequest!.amount!,
        details,
        message.chatId.toString()
      );

      session.pendingRequest = undefined;
      session.currentStep = 'idle';

      if (request.status === 'matched') {
        return await this.handleImmediateMatchWithValidation(request, message.chatId, validation);
      }

      response += `\n✅ **Request Created Successfully**\n\n`;
      response += `**Request ID:** ${request.id}\n`;
      response += `**Verification Code:** ${request.verificationCode}\n\n`;

      if (request.type === 'deposit') {
        response += `You will be notified when someone wants to send you this amount.\n`;
      } else {
        response += `You will be notified when someone wants to deposit this amount to send to you.\n`;
      }

      response += `\nUse /status to check your request status.\n`;
      response += `Use /matches to see if you have any matches.`;

      return response;
    } catch (error) {
      return `❌ **Error Creating Request**

${error instanceof Error ? error.message : 'Unknown error occurred'}

Please try again or contact support.`;
    }
  }

  /**
   * Validate payment method with customer history
   */
  private async validatePaymentMethod(
    customerId: string,
    paymentMethod: string,
    username: string,
    amount: number
  ): Promise<PaymentValidationResult> {
    return await this.paymentValidation.validatePaymentMethod(
      customerId,
      paymentMethod,
      username,
      amount,
      'p2p'
    );
  }

  /**
   * Format validation results for display
   */
  private formatValidationResults(validation: PaymentValidationResult): string {
    let response = `**Validation Score: ${validation.validationScore}/100**\n`;
    response += `**Risk Level: ${validation.riskLevel.toUpperCase()}**\n\n`;

    // History check
    const historyCheck = validation.checks.historyCheck;
    response += `📊 **Payment History:**\n`;
    if (historyCheck.hasHistory) {
      response += `• ✅ Used ${historyCheck.totalTransactions} times before\n`;
      response += `• First used: ${this.formatTimeAgo(historyCheck.firstUsed!)}\n`;
      if (historyCheck.issues > 0) {
        response += `• ⚠️ ${historyCheck.issues} issues found\n`;
      }
    } else {
      response += `• 🆕 **NEW PAYMENT METHOD DETECTED**\n`;
      response += `• This is the first time you're using ${validation.paymentMethod}\n`;
    }

    // Consistency check
    const consistencyCheck = validation.checks.consistencyCheck;
    if (consistencyCheck.usualAmount) {
      const deviationPercent = Math.round(consistencyCheck.amountDeviation * 100);
      response += `\n💰 **Amount Analysis:**\n`;
      response += `• Average amount: $${consistencyCheck.usualAmount.toFixed(2)}\n`;
      if (consistencyCheck.isConsistent) {
        response += `• ✅ Amount is within normal range\n`;
      } else {
        response += `• ⚠️ Amount is ${deviationPercent}% different from usual\n`;
      }
    }

    return response;
  }

  /**
   * Format detailed validation results
   */
  private formatDetailedValidationResults(validation: PaymentValidationResult): string {
    let response = this.formatValidationResults(validation);

    if (validation.warnings.length > 0) {
      response += `\n⚠️ **Warnings:**\n`;
      validation.warnings.forEach(warning => {
        response += `• ${warning}\n`;
      });
    }

    if (validation.recommendations.length > 0) {
      response += `\n💡 **Recommendations:**\n`;
      validation.recommendations.forEach(rec => {
        response += `• ${rec}\n`;
      });
    }

    if (validation.suggestedLimits) {
      response += `\n📏 **Suggested Limits:**\n`;
      response += `• Max per transaction: $${validation.suggestedLimits.maxAmount}\n`;
      response += `• Max per day: $${validation.suggestedLimits.maxDaily}\n`;
      response += `• Max per month: $${validation.suggestedLimits.maxMonthly}\n`;
    }

    return response;
  }

  /**
   * Handle immediate match with validation context
   */
  private async handleImmediateMatchWithValidation(
    request: P2PPaymentRequest,
    chatId: number,
    validation: PaymentValidationResult
  ): Promise<string> {
    if (!request.matchedWith) return 'Match information not available.';

    const match = Array.from(this.p2pMatching['matches'].values()).find(
      m => m.depositRequestId === request.id || m.withdrawalRequestId === request.id
    );

    if (!match) return 'Match details not found.';

    const counterpartyRequest = this.p2pMatching['requests'].get(request.matchedWith.requestId);
    if (!counterpartyRequest) return 'Counterparty details not found.';

    const details = counterpartyRequest.paymentDetails;

    let response = `🎉 **IMMEDIATE MATCH FOUND!**\n\n`;

    if (validation.riskLevel === 'low') {
      response += `✅ **Validation Passed** - Your payment method is well-established!\n\n`;
    } else if (validation.riskLevel === 'medium') {
      response += `⚠️ **Medium Risk** - Proceed with caution.\n\n`;
    } else {
      response += `⚠️ **High Risk** - Additional verification recommended.\n\n`;
    }

    response += `💰 **${request.type.toUpperCase()} Matched**\n\n`;
    response += `**Amount:** $${request.amount}\n`;
    response += `**Method:** ${request.paymentMethod.toUpperCase()}\n`;
    response += `**Verification Code:** ${match.verificationCode}\n\n`;
    response += `**Send payment to:**\n`;
    response += `**Name:** ${details.fullName || 'Customer'}\n`;
    response += `**${request.paymentMethod.toUpperCase()}:** ${details.username || details.email || details.phoneNumber}\n\n`;
    response += `**Instructions:**\n`;
    response += `1. Send $${request.amount} via ${request.paymentMethod} to the recipient above\n`;
    response += `2. Reply with "SENT" once you've sent the payment\n`;
    response += `3. Wait for confirmation from the recipient\n`;
    response += `4. Reply with the verification code: **${match.verificationCode}**\n\n`;

    if (validation.warnings.length > 0) {
      response += `⚠️ **Security Notes:**\n`;
      validation.warnings.forEach(warning => {
        response += `• ${warning}\n`;
      });
      response += `\n`;
    }

    response += `*This match expires in 30 minutes. Type /status for updates.*`;

    return response;
  }

  /**
   * Get recent deposits for customer
   */
  private getRecentDeposits(customerId: string): any[] {
    // This would query the financial system for recent deposits
    // For now, return mock data
    return [
      {
        amount: 250,
        paymentMethod: 'venmo',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        amount: 500,
        paymentMethod: 'paypal',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
      },
    ];
  }

  /**
   * Get or create enhanced session
   */
  private getOrCreateEnhancedSession(userId: number, chatId: number): EnhancedTelegramSession {
    const baseSession = this.getOrCreateSession(userId, chatId);

    if (!(baseSession as EnhancedTelegramSession).riskAssessments) {
      (baseSession as EnhancedTelegramSession).riskAssessments = [];
      (baseSession as EnhancedTelegramSession).validationWarnings = [];
    }

    return baseSession as EnhancedTelegramSession;
  }

  /**
   * Enhanced conversational input handling
   */
  private async handleEnhancedConversationalInput(
    message: TelegramMessage,
    user: TelegramUser,
    session: EnhancedTelegramSession
  ): Promise<string> {
    // Handle deposit method input
    if (session.currentStep === 'awaiting_deposit_method') {
      return await this.handleDepositMethodInput(message, user, session);
    }

    // Handle payment details input
    if (session.currentStep === 'awaiting_payment_details') {
      return await this.handlePaymentDetailsInput(message, user, session);
    }

    // Fall back to base implementation for other steps
    return await super.handleConversationalInput(message, user, session as any);
  }

  /**
   * Get enhanced bot statistics
   */
  getEnhancedStats(): {
    totalUsers: number;
    verifiedUsers: number;
    activeSessions: number;
    totalValidations: number;
    alertsCreated: number;
    highRiskValidations: number;
  } {
    const baseStats = super.getStats();
    const validationStats = this.paymentValidation.getStats();

    return {
      ...baseStats,
      totalValidations: validationStats.totalValidations,
      alertsCreated: validationStats.alertsCreated,
      highRiskValidations: validationStats.highRiskValidations,
    };
  }
}
