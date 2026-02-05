/**
 * 🏠 Venmo Family Account System for FactoryWager
 * Complete family account management with QR code payments
 */

import { serve } from 'bun';

/**
 * 👨‍👩‍👧‍👦 Family Account Interface
 */
export interface FamilyAccount {
  familyId: string;
  parentId: string;
  parentEmail: string;
  businessProfileId: string;
  children: FamilyMember[];
  sharedWalletId: string;
  settings: FamilySettings;
  createdAt: string;
  updatedAt: string;
}

/**
 * 👤 Family Member Interface
 */
export interface FamilyMember {
  memberId: string;
  email: string;
  name: string;
  role: 'parent' | 'child';
  permissions: MemberPermissions;
  spendingLimit?: number;
  venmoUserId?: string;
  status: 'active' | 'pending' | 'suspended';
  joinedAt: string;
}

/**
 * 🔐 Member Permissions
 */
export interface MemberPermissions {
  canSendPayments: boolean;
  canReceivePayments: boolean;
  canRequestAllowance: boolean;
  requiresApproval: boolean;
  maxTransactionAmount: number;
  dailySpendingLimit: number;
}

/**
 * ⚙️ Family Settings
 */
export interface FamilySettings {
  allowUnlimitedChildPayments: boolean;
  requireParentApproval: boolean;
  approvalThreshold: number;
  notificationSettings: {
    paymentSent: boolean;
    paymentReceived: boolean;
    allowanceRequested: boolean;
    lowBalance: boolean;
  };
  autoAllowance: {
    enabled: boolean;
    amount: number;
    frequency: 'weekly' | 'monthly';
    nextAllowanceDate: string;
  };
}

/**
 * 💳 Transaction Interface
 */
export interface VenmoTransaction {
  transactionId: string;
  familyId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  currency: string;
  note: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  type: 'payment' | 'request' | 'allowance' | 'split';
  venmoTransactionId?: string;
  qrCodeData?: string;
  requiresApproval: boolean;
  approvedBy?: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * 📱 QR Code Payment Data
 */
export interface QRPaymentData {
  familyId: string;
  amount: number;
  recipient: string;
  description?: string;
  expiresAt: string;
  generatedBy: string;
}

/**
 * 🏠 Family Account Manager Class
 */
export class VenmoFamilyAccountSystem {
  private families: Map<string, FamilyAccount> = new Map();
  private transactions: Map<string, VenmoTransaction> = new Map();
  private qrCodes: Map<string, QRPaymentData> = new Map();
  private venmoBusinessToken: string;

  constructor(venmoBusinessToken: string) {
    this.venmoBusinessToken = venmoBusinessToken;
  }

  /**
   * 🏠 Create Family Account
   */
  async createFamilyAccount(
    parentEmail: string,
    parentName: string,
    children: { email: string; name: string }[],
    settings?: Partial<FamilySettings>
  ): Promise<FamilyAccount> {
    const familyId = `family-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    try {
      // 1. Create Venmo Business Profile
      const businessProfile = await this.createVenmoBusinessProfile(parentEmail, parentName);
      
      // 2. Create shared wallet
      const sharedWallet = await this.createSharedWallet(businessProfile.id);
      
      // 3. Create parent member
      const parentMember: FamilyMember = {
        memberId: `member-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        email: parentEmail,
        name: parentName,
        role: 'parent',
        permissions: {
          canSendPayments: true,
          canReceivePayments: true,
          canRequestAllowance: false,
          requiresApproval: false,
          maxTransactionAmount: Number.MAX_SAFE_INTEGER,
          dailySpendingLimit: Number.MAX_SAFE_INTEGER
        },
        status: 'active',
        joinedAt: new Date().toISOString()
      };
      
      // 4. Create child members
      const childMembers: FamilyMember[] = [];
      for (const child of children) {
        const childMember: FamilyMember = {
          memberId: `member-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          email: child.email,
          name: child.name,
          role: 'child',
          permissions: {
            canSendPayments: true,
            canReceivePayments: true,
            canRequestAllowance: true,
            requiresApproval: true,
            maxTransactionAmount: 50,
            dailySpendingLimit: 25
          },
          spendingLimit: 50,
          status: 'pending', // Requires parent approval
          joinedAt: new Date().toISOString()
        };
        childMembers.push(childMember);
      }
      
      // 5. Create family account
      const familyAccount: FamilyAccount = {
        familyId,
        parentId: parentMember.memberId,
        parentEmail,
        businessProfileId: businessProfile.id,
        children: [parentMember, ...childMembers],
        sharedWalletId: sharedWallet.id,
        settings: {
          allowUnlimitedChildPayments: false,
          requireParentApproval: true,
          approvalThreshold: 25,
          notificationSettings: {
            paymentSent: true,
            paymentReceived: true,
            allowanceRequested: true,
            lowBalance: true
          },
          autoAllowance: {
            enabled: false,
            amount: 0,
            frequency: 'weekly',
            nextAllowanceDate: ''
          },
          ...settings
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      this.families.set(familyId, familyAccount);
      
      console.log(`✅ Created family account: ${familyId} for ${parentEmail}`);
      console.log(`📱 Added ${children.length} child members`);
      
      return familyAccount;
      
    } catch (error) {
      console.error('❌ Failed to create family account:', error);
      throw new Error(`Family account creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 🏢 Create Venmo Business Profile
   */
  private async createVenmoBusinessProfile(email: string, name: string): Promise<{ id: string; status: string }> {
    // In production, this would call Venmo's Business API
    // For development, we simulate the response
    
    console.log(`🏢 Creating Venmo Business Profile for ${email}`);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const businessProfile = {
      id: `business-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      status: 'active'
    };
    
    console.log(`✅ Business profile created: ${businessProfile.id}`);
    
    return businessProfile;
  }

  /**
   * 💰 Create Shared Wallet
   */
  private async createSharedWallet(businessProfileId: string): Promise<{ id: string; balance: number }> {
    console.log(`💰 Creating shared wallet for business profile: ${businessProfileId}`);
    
    // Simulate wallet creation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const wallet = {
      id: `wallet-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      balance: 0
    };
    
    console.log(`✅ Shared wallet created: ${wallet.id}`);
    
    return wallet;
  }

  /**
   * 📱 Generate QR Code for Payment
   */
  async generatePaymentQRCode(
    familyId: string,
    amount: number,
    recipient: string,
    description?: string,
    expiresInMinutes: number = 30
  ): Promise<{ qrCodeData: string; qrCodeSvg: string; expiresAt: string }> {
    const family = this.families.get(familyId);
    if (!family) {
      throw new Error('Family not found');
    }

    // Validate recipient is family member
    const recipientMember = family.children.find(m => m.email === recipient || m.memberId === recipient);
    if (!recipientMember) {
      throw new Error('Recipient not found in family');
    }

    // Generate QR code data
    const qrData = `factory-wager://pay/${familyId}/${amount}/${recipient}${description ? `/${encodeURIComponent(description)}` : ''}`;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
    
    // Store QR code data
    const qrPaymentData: QRPaymentData = {
      familyId,
      amount,
      recipient,
      description,
      expiresAt,
      generatedBy: family.parentId
    };
    
    this.qrCodes.set(qrData, qrPaymentData);
    
    // Generate QR code SVG (simplified - in production use proper QR library)
    const qrSvg = this.generateQRCodeSVG(qrData);
    
    console.log(`📱 Generated QR code for $${amount} to ${recipient}`);
    
    return {
      qrCodeData: qrData,
      qrCodeSvg: qrSvg,
      amount,
      recipient,
      expiresAt
    };
  }

  /**
   * 📱 Generate QR Code SVG (simplified)
   */
  private generateQRCodeSVG(data: string): string {
    // In production, use a proper QR code library like 'qrcode'
    // This is a simplified placeholder
    const size = 200;
    const moduleId = 8;
    
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" fill="white"/>
        <rect x="40" y="40" width="${size-80}" height="${size-80}" fill="black"/>
        <rect x="60" y="60" width="${size-120}" height="${size-120}" fill="white"/>
        <rect x="80" y="80" width="${size-160}" height="${size-160}" fill="black"/>
        <text x="${size/2}" y="${size/2}" text-anchor="middle" fill="white" font-size="12" font-family="monospace">
          ${data.substring(0, 20)}...
        </text>
      </svg>
    `;
  }

  /**
   * 💳 Process QR Payment
   */
  async processQRPayment(
    qrData: string,
    senderEmail: string,
    senderName: string
  ): Promise<VenmoTransaction> {
    // Parse QR data
    const match = qrData.match(/^factory-wager:\/\/pay\/([^\/]+)\/([^\/]+)\/([^\/]+)(?:\/(.+))?$/);
    if (!match) {
      throw new Error('Invalid QR code format');
    }

    const [, familyId, amountStr, recipient, description] = match;
    const amount = parseFloat(amountStr);

    if (!familyId || !amount || !recipient) {
      throw new Error('Missing required payment information');
    }

    // Validate QR code hasn't expired
    const qrPaymentData = this.qrCodes.get(qrData);
    if (!qrPaymentData) {
      throw new Error('QR code not found or expired');
    }

    if (new Date() > new Date(qrPaymentData.expiresAt)) {
      this.qrCodes.delete(qrData);
      throw new Error('QR code has expired');
    }

    // Get family account
    const family = this.families.get(familyId);
    if (!family) {
      throw new Error('Family not found');
    }

    // Find recipient
    const recipientMember = family.children.find(m => m.email === recipient || m.memberId === recipient);
    if (!recipientMember) {
      throw new Error('Recipient not found in family');
    }

    // Create transaction
    const transaction: VenmoTransaction = {
      transactionId: `txn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      familyId,
      fromMemberId: senderEmail, // In production, this would be a proper member ID
      toMemberId: recipientMember.memberId,
      amount,
      currency: 'USD',
      note: description || `QR payment to ${recipientMember.name}`,
      status: 'pending',
      type: 'payment',
      qrCodeData: qrData,
      requiresApproval: family.settings.requireParentApproval && amount > family.settings.approvalThreshold,
      createdAt: new Date().toISOString()
    };

    // Store transaction
    this.transactions.set(transaction.transactionId, transaction);

    // Process payment via Venmo (in production)
    try {
      const venmoResult = await this.processVenmoPayment(transaction);
      transaction.venmoTransactionId = venmoResult.id;
      transaction.status = 'completed';
      transaction.completedAt = new Date().toISOString();
      
      console.log(`✅ Payment processed: $${amount} to ${recipientMember.name}`);
      
    } catch (error) {
      transaction.status = 'failed';
      console.error(`❌ Payment failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Update transaction
    this.transactions.set(transaction.transactionId, transaction);

    // Clean up QR code
    this.qrCodes.delete(qrData);

    return transaction;
  }

  /**
   * 💳 Process Venmo Payment (simulated)
   */
  private async processVenmoPayment(transaction: VenmoTransaction): Promise<{ id: string; status: string }> {
    console.log(`💳 Processing Venmo payment: $${transaction.amount}`);
    
    // Simulate Venmo API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate success
    const result = {
      id: `venmo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      status: 'completed'
    };
    
    console.log(`✅ Venmo payment completed: ${result.id}`);
    
    return result;
  }

  /**
   * 💰 Send Payment
   */
  async sendPayment(
    familyId: string,
    fromMemberId: string,
    toMemberId: string,
    amount: number,
    note?: string
  ): Promise<VenmoTransaction> {
    const family = this.families.get(familyId);
    if (!family) {
      throw new Error('Family not found');
    }

    const fromMember = family.children.find(m => m.memberId === fromMemberId);
    const toMember = family.children.find(m => m.memberId === toMemberId);

    if (!fromMember || !toMember) {
      throw new Error('Member not found');
    }

    // Check permissions
    if (!fromMember.permissions.canSendPayments) {
      throw new Error('Member does not have permission to send payments');
    }

    if (amount > fromMember.permissions.maxTransactionAmount) {
      throw new Error('Amount exceeds maximum transaction limit');
    }

    // Check if approval is required
    const requiresApproval = fromMember.permissions.requiresApproval && amount > family.settings.approvalThreshold;

    const transaction: VenmoTransaction = {
      transactionId: `txn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      familyId,
      fromMemberId,
      toMemberId,
      amount,
      currency: 'USD',
      note: note || `Payment to ${toMember.name}`,
      status: requiresApproval ? 'pending' : 'completed',
      type: 'payment',
      requiresApproval,
      createdAt: new Date().toISOString()
    };

    this.transactions.set(transaction.transactionId, transaction);

    if (!requiresApproval) {
      // Process immediately
      try {
        const venmoResult = await this.processVenmoPayment(transaction);
        transaction.venmoTransactionId = venmoResult.id;
        transaction.status = 'completed';
        transaction.completedAt = new Date().toISOString();
      } catch (error) {
        transaction.status = 'failed';
      }
      this.transactions.set(transaction.transactionId, transaction);
    }

    console.log(`💰 Payment ${transaction.status}: $${amount} from ${fromMember.name} to ${toMember.name}`);

    return transaction;
  }

  /**
   * 🔄 Create Split Payment
   */
  async createSplitPayment(
    familyId: string,
    totalAmount: number,
    participantIds: string[],
    description: string,
    initiatedBy: string
  ): Promise<{ splitPayment: VenmoTransaction; individualPayments: VenmoTransaction[] }> {
    const family = this.families.get(familyId);
    if (!family) {
      throw new Error('Family not found');
    }

    const splitAmount = totalAmount / participantIds.length;
    const individualPayments: VenmoTransaction[] = [];

    // Create individual payment transactions
    for (const participantId of participantIds) {
      const payment = await this.sendPayment(
        familyId,
        participantId,
        family.sharedWalletId,
        splitAmount,
        `Split: ${description}`
      );
      individualPayments.push(payment);
    }

    // Create master split transaction
    const splitTransaction: VenmoTransaction = {
      transactionId: `split-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      familyId,
      fromMemberId: initiatedBy,
      toMemberId: family.sharedWalletId,
      amount: totalAmount,
      currency: 'USD',
      note: `Split payment: ${description}`,
      status: 'completed',
      type: 'split',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };

    this.transactions.set(splitTransaction.transactionId, splitTransaction);

    console.log(`🔄 Split payment created: $${totalAmount} among ${participantIds.length} participants`);

    return {
      splitPayment: splitTransaction,
      individualPayments
    };
  }

  /**
   📊 Get Family Transactions
   */
  async getFamilyTransactions(familyId: string): Promise<VenmoTransaction[]> {
    const family = this.families.get(familyId);
    if (!family) {
      throw new Error('Family not found');
    }

    const transactions = Array.from(this.transactions.values())
      .filter(tx => tx.familyId === familyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return transactions;
  }

  /**
   * 👤 Get Family Members
   */
  async getFamilyMembers(familyId: string): Promise<FamilyMember[]> {
    const family = this.families.get(familyId);
    if (!family) {
      throw new Error('Family not found');
    }

    return family.children;
  }

  /**
   * ✅ Approve Transaction
   */
  async approveTransaction(transactionId: string, approvedBy: string): Promise<VenmoTransaction> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'pending') {
      throw new Error('Transaction is not pending approval');
    }

    if (!transaction.requiresApproval) {
      throw new Error('Transaction does not require approval');
    }

    // Process the payment
    try {
      const venmoResult = await this.processVenmoPayment(transaction);
      transaction.venmoTransactionId = venmoResult.id;
      transaction.status = 'completed';
      transaction.completedAt = new Date().toISOString();
      transaction.approvedBy = approvedBy;
    } catch (error) {
      transaction.status = 'failed';
      throw error;
    }

    this.transactions.set(transactionId, transaction);

    console.log(`✅ Transaction approved: ${transactionId} by ${approvedBy}`);

    return transaction;
  }

  /**
   * 📊 Get Family Account
   */
  async getFamilyAccount(familyId: string): Promise<FamilyAccount> {
    const family = this.families.get(familyId);
    if (!family) {
      throw new Error('Family not found');
    }

    return family;
  }

  /**
   * 📈 Get System Statistics
   */
  getSystemStats(): {
    totalFamilies: number;
    totalMembers: number;
    totalTransactions: number;
    activeQRcodes: number;
  } {
    const totalFamilies = this.families.size;
    const totalMembers = Array.from(this.families.values()).reduce((sum, family) => sum + family.children.length, 0);
    const totalTransactions = this.transactions.size;
    const activeQRcodes = this.qrCodes.size;

    return {
      totalFamilies,
      totalMembers,
      totalTransactions,
      activeQRcodes
    };
  }
}

/**
 * 🚀 Create Venmo Family Account System
 */
export function createVenmoFamilyAccountSystem(venmoBusinessToken: string): VenmoFamilyAccountSystem {
  return new VenmoFamilyAccountSystem(venmoBusinessToken);
}

export default VenmoFamilyAccountSystem;
