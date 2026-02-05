/**
 * P2P Telegram Bot Integration
 * Handles deposit and withdrawal requests via Telegram with P2P matching
 */

import { P2PPaymentMatching, P2PPaymentRequest, P2PMatch } from '../payments/p2p-payment-matching';

export interface TelegramUser {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  customerId?: string; // Linked customer ID
  isVerified: boolean;
  createdAt: string;
  lastActiveAt: string;
}

export interface TelegramMessage {
  messageId: number;
  chatId: number;
  userId: number;
  text: string;
  timestamp: string;
  isCommand: boolean;
  command?: string;
  parameters?: string[];
}

export interface TelegramSession {
  userId: number;
  chatId: number;
  currentStep:
    | 'idle'
    | 'awaiting_deposit_amount'
    | 'awaiting_deposit_method'
    | 'awaiting_withdrawal_amount'
    | 'awaiting_withdrawal_method'
    | 'awaiting_payment_details'
    | 'awaiting_verification';
  pendingRequest?: Partial<P2PPaymentRequest>;
  lastActivity: string;
  context: Record<string, any>;
}

export class P2PTelegramBot {
  private p2pMatching: P2PPaymentMatching;
  private users: Map<number, TelegramUser> = new Map();
  private sessions: Map<number, TelegramSession> = new Map();
  private botToken: string;
  private webhookUrl: string;

  constructor(p2pMatching: P2PPaymentMatching, botToken: string, webhookUrl: string) {
    this.p2pMatching = p2pMatching;
    this.botToken = botToken;
    this.webhookUrl = webhookUrl;
  }

  /**
   * Handle incoming Telegram message
   */
  async handleMessage(message: TelegramMessage): Promise<string> {
    const user = await this.getOrCreateUser(message.userId, message.chatId);
    const session = this.getOrCreateSession(message.userId, message.chatId);

    // Update user activity
    user.lastActiveAt = new Date().toISOString();

    // Handle commands
    if (message.isCommand) {
      return await this.handleCommand(message, user, session);
    }

    // Handle conversational input based on current step
    return await this.handleConversationalInput(message, user, session);
  }

  /**
   * Handle Telegram commands
   */
  private async handleCommand(
    message: TelegramMessage,
    user: TelegramUser,
    session: TelegramSession
  ): Promise<string> {
    const command = message.command!.toLowerCase();

    switch (command) {
      case '/start':
        return this.handleStartCommand(user);

      case '/deposit':
        return this.handleDepositCommand(user, session);

      case '/withdraw':
        return this.handleWithdrawCommand(user, session);

      case '/status':
        return this.handleStatusCommand(user);

      case '/matches':
        return this.handleMatchesCommand(user);

      case '/help':
        return this.handleHelpCommand();

      case '/cancel':
        return this.handleCancelCommand(session);

      default:
        return 'Unknown command. Use /help to see available commands.';
    }
  }

  /**
   * Handle conversational input based on session step
   */
  private async handleConversationalInput(
    message: TelegramMessage,
    user: TelegramUser,
    session: TelegramSession
  ): Promise<string> {
    switch (session.currentStep) {
      case 'awaiting_deposit_amount':
        return await this.handleDepositAmountInput(message, user, session);

      case 'awaiting_deposit_method':
        return await this.handleDepositMethodInput(message, user, session);

      case 'awaiting_withdrawal_amount':
        return await this.handleWithdrawalAmountInput(message, user, session);

      case 'awaiting_withdrawal_method':
        return await this.handleWithdrawalMethodInput(message, user, session);

      case 'awaiting_payment_details':
        return await this.handlePaymentDetailsInput(message, user, session);

      case 'awaiting_verification':
        return await this.handleVerificationInput(message, user, session);

      default:
        return "I'm not sure what you mean. Use /help to see available commands or start with /deposit or /withdraw.";
    }
  }

  /**
   * Handle /start command
   */
  private handleStartCommand(user: TelegramUser): string {
    if (!user.customerId) {
      return `👋 Welcome to P2P Payment Bot!

To get started, you need to link your account. Please provide your customer ID or contact support.

Available commands:
/help - Show all commands
/deposit - Start a deposit request
/withdraw - Start a withdrawal request
/status - Check your requests
/matches - View your matches`;
    }

    return `👋 Welcome back!

You're linked to customer: ${user.customerId}

Available commands:
/deposit - Start a deposit request
/withdraw - Start a withdrawal request
/status - Check your requests
/matches - View your matches
/help - Show all commands`;
  }

  /**
   * Handle /deposit command
   */
  private handleDepositCommand(user: TelegramUser, session: TelegramSession): string {
    if (!user.customerId) {
      return 'You need to link your account first. Please provide your customer ID.';
    }

    if (!user.isVerified) {
      return 'Your account needs to be verified before you can make deposits.';
    }

    session.currentStep = 'awaiting_deposit_amount';
    session.pendingRequest = {
      customerId: user.customerId,
      type: 'deposit',
    };

    return `💰 **Deposit Request**

How much would you like to deposit? (e.g., 100, 250, 500)

*Available amounts are matched with current withdrawal requests.*
*Type /cancel to cancel this request.*`;
  }

  /**
   * Handle /withdraw command
   */
  private handleWithdrawCommand(user: TelegramUser, session: TelegramSession): string {
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

    return `💸 **Withdrawal Request**

How much would you like to withdraw? (e.g., 100, 250, 500)

*Available amounts are matched with current deposit requests.*
*Type /cancel to cancel this request.*`;
  }

  /**
   * Handle deposit amount input
   */
  private async handleDepositAmountInput(
    message: TelegramMessage,
    user: TelegramUser,
    session: TelegramSession
  ): Promise<string> {
    const amount = parseFloat(message.text);

    if (isNaN(amount) || amount <= 0) {
      return 'Please enter a valid amount greater than 0 (e.g., 100, 250.50, 500).';
    }

    session.pendingRequest!.amount = amount;
    session.currentStep = 'awaiting_deposit_method';

    return `💰 **Deposit Amount: $${amount.toFixed(2)}**

Which payment method would you like to use?

Available options:
• **Venmo** - Send via Venmo app
• **Cash App** - Send via Cash App
• **PayPal** - Send via PayPal
• **Zelle** - Send via Zelle

Reply with the method name (e.g., "Venmo", "Cash App", "PayPal", "Zelle")

*Type /cancel to cancel this request.*`;
  }

  /**
   * Handle deposit method input
   */
  private async handleDepositMethodInput(
    message: TelegramMessage,
    user: TelegramUser,
    session: TelegramSession
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
      return `Invalid payment method. Please choose from:
• Venmo
• Cash App
• PayPal
• Zelle

Reply with the method name.`;
    }

    session.pendingRequest!.paymentMethod = paymentMethod;
    session.currentStep = 'awaiting_payment_details';

    // Check for available withdrawal requests
    const availableWithdrawals = this.p2pMatching.getAvailableWithdrawalRequests(
      paymentMethod,
      session.pendingRequest!.amount!,
      5
    );

    if (availableWithdrawals.length === 0) {
      return `💰 **No Immediate Matches**

No withdrawal requests are currently available for $${session.pendingRequest!.amount} via ${paymentMethod}.

Your request has been queued and you'll be notified when a match is found.

You can:
• Wait for a match (usually within minutes)
• Try a different amount
• Choose a different payment method

Type /status to check your request status.
Type /cancel to cancel this request.`;
    }

    // Show available matches
    let response = `💰 **Available Withdrawal Recipients**

Found ${availableWithdrawals.length} people who want to withdraw $${session.pendingRequest!.amount} via ${paymentMethod}:

`;

    availableWithdrawals.forEach((withdrawal, index) => {
      const details = withdrawal.paymentDetails;
      const username = details.username || details.email || details.phoneNumber || 'Not provided';
      response += `${index + 1}. **${details.fullName || 'Customer'}**
   ${paymentMethod.toUpperCase()}: ${username}
   Requested: ${this.formatTimeAgo(withdrawal.createdAt)}
   Priority: ${withdrawal.priority}

`;
    });

    response += `
**To proceed:**
1. Choose a recipient by replying with their number (1, 2, 3, etc.)
2. Send the payment via ${paymentMethod} to their account
3. Reply with the verification code you'll receive

*Type /cancel to cancel this request.*`;

    return response;
  }

  /**
   * Handle withdrawal amount input
   */
  private async handleWithdrawalAmountInput(
    message: TelegramMessage,
    user: TelegramUser,
    session: TelegramSession
  ): Promise<string> {
    const amount = parseFloat(message.text);

    if (isNaN(amount) || amount <= 0) {
      return 'Please enter a valid amount greater than 0 (e.g., 100, 250.50, 500).';
    }

    session.pendingRequest!.amount = amount;
    session.currentStep = 'awaiting_withdrawal_method';

    return `💸 **Withdrawal Amount: $${amount.toFixed(2)}**

Which payment method would you like to receive the funds?

Available options:
• **Venmo** - Receive via Venmo app
• **Cash App** - Receive via Cash App
• **PayPal** - Receive via PayPal
• **Zelle** - Receive via Zelle

Reply with the method name (e.g., "Venmo", "Cash App", "PayPal", "Zelle")

*Type /cancel to cancel this request.*`;
  }

  /**
   * Handle withdrawal method input
   */
  private async handleWithdrawalMethodInput(
    message: TelegramMessage,
    user: TelegramUser,
    session: TelegramSession
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
      return `Invalid payment method. Please choose from:
• Venmo
• Cash App
• PayPal
• Zelle

Reply with the method name.`;
    }

    session.pendingRequest!.paymentMethod = paymentMethod;
    session.currentStep = 'awaiting_payment_details';

    return `💸 **Withdrawal Method: ${paymentMethod.toUpperCase()}**

Please provide your ${paymentMethod} details for receiving the payment:

${this.getPaymentDetailsPrompt(paymentMethod)}

*Example: ${this.getPaymentDetailsExample(paymentMethod)}*

*Type /cancel to cancel this request.*`;
  }

  /**
   * Handle payment details input
   */
  private async handlePaymentDetailsInput(
    message: TelegramMessage,
    user: TelegramUser,
    session: TelegramSession
  ): Promise<string> {
    const paymentMethod = session.pendingRequest!.paymentMethod!;
    const details = this.parsePaymentDetails(message.text, paymentMethod);

    if (!details) {
      return `Invalid format. Please provide your details in the correct format:

${this.getPaymentDetailsPrompt(paymentMethod)}

Example: ${this.getPaymentDetailsExample(paymentMethod)}`;
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
        return await this.handleImmediateMatch(request, message.chatId);
      }

      return `✅ **Request Created Successfully**

Your ${request.type} request for $${request.amount} via ${request.paymentMethod} has been created.

**Request ID:** ${request.id}
**Verification Code:** ${request.verificationCode}

${
  request.type === 'deposit'
    ? 'You will be notified when someone wants to send you this amount.'
    : 'You will be notified when someone wants to deposit this amount to send to you.'
}

Use /status to check your request status.
Use /matches to see if you have any matches.`;
    } catch (error) {
      return `❌ **Error Creating Request**

${error instanceof Error ? error.message : 'Unknown error occurred'}

Please try again or contact support.`;
    }
  }

  /**
   * Handle immediate match
   */
  private async handleImmediateMatch(request: P2PPaymentRequest, chatId: number): Promise<string> {
    if (!request.matchedWith) return 'Match information not available.';

    const match = Array.from(this.p2pMatching['matches'].values()).find(
      m => m.depositRequestId === request.id || m.withdrawalRequestId === request.id
    );

    if (!match) return 'Match details not found.';

    const counterpartyRequest = this.p2pMatching['requests'].get(request.matchedWith.requestId);
    if (!counterpartyRequest) return 'Counterparty details not found.';

    const details = counterpartyRequest.paymentDetails;

    return `🎉 **IMMEDIATE MATCH FOUND!**

${request.type === 'deposit' ? '💰 **Deposit Request Matched**' : '💸 **Withdrawal Request Matched**'}

**Amount:** $${request.amount}
**Method:** ${request.paymentMethod.toUpperCase()}
**Verification Code:** ${match.verificationCode}

**Send payment to:**
**Name:** ${details.fullName || 'Customer'}
**${request.paymentMethod.toUpperCase()}:** ${details.username || details.email || details.phoneNumber}

**Instructions:**
1. Send $${request.amount} via ${request.paymentMethod} to the recipient above
2. Reply with "SENT" once you've sent the payment
3. Wait for confirmation from the recipient
4. Reply with the verification code: **${match.verificationCode}**

*This match expires in 30 minutes. Type /status for updates.*`;
  }

  /**
   * Handle /status command
   */
  private handleStatusCommand(user: TelegramUser): string {
    if (!user.customerId) {
      return 'You need to link your account first.';
    }

    const requests = this.p2pMatching.getCustomerRequests(user.customerId);

    if (requests.length === 0) {
      return 'You have no active requests.';
    }

    let response = '📋 **Your Active Requests**\n\n';

    requests.forEach((request, index) => {
      const statusEmoji =
        {
          pending: '⏳',
          matched: '🎯',
          in_progress: '🔄',
          completed: '✅',
          cancelled: '❌',
          expired: '⏰',
        }[request.status] || '❓';

      response += `${index + 1}. ${statusEmoji} **${request.type.toUpperCase()}** - $${request.amount} via ${request.paymentMethod}
   Status: ${request.status}
   Created: ${this.formatTimeAgo(request.createdAt)}\n\n`;
    });

    return response;
  }

  /**
   * Handle /matches command
   */
  private handleMatchesCommand(user: TelegramUser): string {
    if (!user.customerId) {
      return 'You need to link your account first.';
    }

    const matches = this.p2pMatching.getCustomerMatches(user.customerId);

    if (matches.length === 0) {
      return 'You have no active matches.';
    }

    let response = '🎯 **Your Matches**\n\n';

    matches.forEach((match, index) => {
      const statusEmoji =
        {
          pending: '⏳',
          payment_sent: '📤',
          payment_received: '📥',
          verified: '🔒',
          completed: '✅',
          disputed: '⚠️',
          cancelled: '❌',
        }[match.status] || '❓';

      const isDeposit = match.depositCustomerId === user.customerId;

      response += `${index + 1}. ${statusEmoji} **${isDeposit ? 'DEPOSIT' : 'WITHDRAWAL'}** - $${match.amount} via ${match.paymentMethod}
   Status: ${match.status}
   Created: ${this.formatTimeAgo(match.createdAt)}
   Code: ${match.verificationCode}\n\n`;
    });

    return response;
  }

  /**
   * Handle /help command
   */
  private handleHelpCommand(): string {
    return `🤖 **P2P Payment Bot Help**

**Getting Started:**
1. Link your account with your customer ID
2. Get verified to start using the service

**Available Commands:**
/start - Start the bot and see welcome message
/deposit - Create a deposit request
/withdraw - Create a withdrawal request
/status - Check your active requests
/matches - View your current matches
/help - Show this help message
/cancel - Cancel current operation

**How It Works:**
1. **Deposit**: Tell the bot how much you want to deposit and via which app
2. **Match**: Bot finds someone who wants to withdraw that exact amount via the same app
3. **Pay**: You send the money directly via the app to the matched person
4. **Verify**: Use the verification code to complete the transaction
5. **Credit**: Your account gets credited instantly

**Supported Apps:**
• Venmo ($1 - $5,000)
• Cash App ($1 - $10,000)
• PayPal ($1 - $10,000)
• Zelle ($1 - $2,500)

**Safety Features:**
• All transactions are verified with codes
• 24/7 monitoring for suspicious activity
• Instant dispute resolution
• Secure escrow system

Need help? Contact support!`;
  }

  /**
   * Handle /cancel command
   */
  private handleCancelCommand(session: TelegramSession): string {
    session.currentStep = 'idle';
    session.pendingRequest = undefined;
    session.context = {};

    return `✅ **Request Cancelled**

Your current operation has been cancelled. You can start a new request with /deposit or /withdraw.`;
  }

  // Helper methods
  private async getOrCreateUser(userId: number, chatId: number): Promise<TelegramUser> {
    if (!this.users.has(userId)) {
      const user: TelegramUser = {
        id: userId,
        isVerified: false,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      };
      this.users.set(userId, user);
    }
    return this.users.get(userId)!;
  }

  private getOrCreateSession(userId: number, chatId: number): TelegramSession {
    if (!this.sessions.has(userId)) {
      const session: TelegramSession = {
        userId,
        chatId,
        currentStep: 'idle',
        lastActivity: new Date().toISOString(),
        context: {},
      };
      this.sessions.set(userId, session);
    }
    return this.sessions.get(userId)!;
  }

  private getPaymentDetailsPrompt(method: P2PPaymentRequest['paymentMethod']): string {
    switch (method) {
      case 'venmo':
        return 'Please provide your Venmo username (e.g., @johnsmith or johnsmith)';
      case 'cashapp':
        return 'Please provide your Cash App username (e.g., $johnsmith or johnsmith)';
      case 'paypal':
        return 'Please provide your PayPal email address (e.g., john@example.com)';
      case 'zelle':
        return 'Please provide your Zelle registered email or phone (e.g., john@example.com or +1234567890)';
      default:
        return 'Please provide your payment details';
    }
  }

  private getPaymentDetailsExample(method: P2PPaymentRequest['paymentMethod']): string {
    switch (method) {
      case 'venmo':
        return '@johnsmith';
      case 'cashapp':
        return '$johnsmith';
      case 'paypal':
        return 'john@example.com';
      case 'zelle':
        return 'john@example.com';
      default:
        return 'your-details-here';
    }
  }

  private parsePaymentDetails(
    text: string,
    method: P2PPaymentRequest['paymentMethod']
  ): P2PPaymentRequest['paymentDetails'] | null {
    const trimmed = text.trim();

    switch (method) {
      case 'venmo':
        if (trimmed.startsWith('@') || /^[a-zA-Z0-9_]+$/.test(trimmed)) {
          return { username: trimmed };
        }
        break;
      case 'cashapp':
        if (trimmed.startsWith('$') || /^[a-zA-Z0-9_]+$/.test(trimmed)) {
          return { username: trimmed };
        }
        break;
      case 'paypal':
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
          return { email: trimmed };
        }
        break;
      case 'zelle':
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
          return { email: trimmed };
        }
        if (/^\+?[1-9]\d{1,14}$/.test(trimmed)) {
          return { phoneNumber: trimmed };
        }
        break;
    }

    return null;
  }

  private formatTimeAgo(timestamp: string): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  /**
   * Link customer to Telegram user
   */
  linkCustomer(userId: number, customerId: string): boolean {
    const user = this.users.get(userId);
    if (user) {
      user.customerId = customerId;
      user.isVerified = true; // Assume verified if manually linked
      return true;
    }
    return false;
  }

  /**
   * Get bot statistics
   */
  getStats(): {
    totalUsers: number;
    activeUsers: number;
    totalRequests: number;
    activeSessions: number;
  } {
    const totalUsers = this.users.size;
    const activeUsers = Array.from(this.users.values()).filter(user => {
      const lastActive = new Date(user.lastActiveAt);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return lastActive > oneHourAgo;
    }).length;

    const totalRequests = Array.from(this.sessions.values()).filter(
      session => session.pendingRequest
    ).length;

    const activeSessions = Array.from(this.sessions.values()).filter(
      session => session.currentStep !== 'idle'
    ).length;

    return {
      totalUsers,
      activeUsers,
      totalRequests,
      activeSessions,
    };
  }
}
