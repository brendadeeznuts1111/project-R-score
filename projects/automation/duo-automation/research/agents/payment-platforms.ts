// agents/payment-platforms.ts
export interface AgentPaymentProfile {
  venmo?: {
    username: string;
    handle: string;
    phoneNumber: string;
    balance: number;
    qrCodeUrl: string;
    verified: boolean;
    lastFour: string;
    limit: number;
  };
  
  cashapp?: {
    cashtag: string;
    phoneNumber: string;
    email: string;
    balance: number;
    bitcoinEnabled: boolean;
    bitcoinAddress?: string;
    directDepositEnabled: boolean;
    cardLastFour?: string;
  };
  
  paypal?: {
    email: string;
    phoneNumber: string;
    balance: number;
    business: boolean;
    verified: boolean;
    currency: string;
    apiCredentials?: {
      clientId: string;
      secret: string;
    };
  };
  
  zelle?: {
    enrolledEmail: string;
    enrolledPhone: string;
    bankName: string;
    dailyLimit: number;
  };
  
  wise?: {
    email: string;
    balance: number;
    currencies: string[];
    accountNumber?: string;
    routingNumber?: string;
  };
}

export class PaymentPlatformManager {
  private static domains = {
    venmo: '@duoplus.android',
    cashapp: 'duoplus.android',
    paypal: '@duoplus.android'
  };
  
  // Generate comprehensive payment profiles for agents
  static generateCompletePaymentProfile(agentEmail: string, agentPhone: string, agentId: string): AgentPaymentProfile {
    const profile: AgentPaymentProfile = {};
    
    // Venmo (80% of agents get it)
    if (Math.random() > 0.2) {
      profile.venmo = {
        username: this.generateVenmoUsername(agentId),
        handle: `@${this.generateVenmoUsername(agentId).toLowerCase()}`,
        phoneNumber: agentPhone,
        balance: Math.floor(Math.random() * 5000) + 100,
        qrCodeUrl: `https://venmo.com/qr/${this.generateVenmoUsername(agentId)}`,
        verified: Math.random() > 0.4,
        lastFour: String(Math.floor(1000 + Math.random() * 9000)),
        limit: 5000
      };
    }
    
    // CashApp (70% of agents get it)
    if (Math.random() > 0.3) {
      const cashtag = this.generateCashtag(agentId);
      profile.cashapp = {
        cashtag: `$${cashtag}`,
        phoneNumber: agentPhone,
        email: agentEmail,
        balance: Math.floor(Math.random() * 3000) + 50,
        bitcoinEnabled: Math.random() > 0.5,
        bitcoinAddress: Math.random() > 0.5 ? this.generateBitcoinAddress() : undefined,
        directDepositEnabled: Math.random() > 0.7,
        cardLastFour: String(Math.floor(1000 + Math.random() * 9000))
      };
    }
    
    // PayPal (90% of agents get it - essential)
    profile.paypal = {
      email: agentEmail,
      phoneNumber: agentPhone,
      balance: Math.floor(Math.random() * 10000) + 500,
      business: Math.random() > 0.3,
      verified: Math.random() > 0.2,
      currency: 'USD',
      apiCredentials: Math.random() > 0.5 ? {
        clientId: `CLIENT_${Math.random().toString(36).substring(2, 15)}`,
        secret: `SECRET_${Math.random().toString(36).substring(2, 25)}` 
      } : undefined
    };
    
    // Zelle (50% of agents get it - requires US bank)
    if (Math.random() > 0.5) {
      profile.zelle = {
        enrolledEmail: agentEmail,
        enrolledPhone: agentPhone,
        bankName: ['Chase', 'Bank of America', 'Wells Fargo', 'Capital One'][Math.floor(Math.random() * 4)],
        dailyLimit: 2500
      };
    }
    
    // Wise (40% of agents get it - international)
    if (Math.random() > 0.6) {
      profile.wise = {
        email: agentEmail,
        balance: Math.floor(Math.random() * 2000) + 100,
        currencies: ['USD', 'EUR', 'GBP', 'CAD'],
        accountNumber: String(Math.floor(1000000000 + Math.random() * 9000000000)),
        routingNumber: String(Math.floor(100000000 + Math.random() * 900000000))
      };
    }
    
    return profile;
  }
  
  private static generateVenmoUsername(agentId: string): string {
    const prefixes = ['agent', 'ops', 'secure', 'mobile', 'vm'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const numbers = agentId.substring(agentId.length - 4);
    return `${prefix}-${numbers}`;
  }
  
  private static generateCashtag(agentId: string): string {
    const adjectives = ['quick', 'smart', 'fast', 'safe', 'easy'];
    const nouns = ['agent', 'ops', 'pay', 'funds', 'secure'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 99) + 1;
    return `${adj}${noun}${num}`.toLowerCase();
  }
  
  private static generateBitcoinAddress(): string {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let address = '1';
    for (let i = 0; i < 33; i++) {
      address += chars[Math.floor(Math.random() * chars.length)];
    }
    return address;
  }
  
  // Simulate transactions to build history
  static generateTransactionHistory(profile: AgentPaymentProfile, days: number = 90): Array<{
    platform: string;
    date: string;
    amount: number;
    type: 'send' | 'receive' | 'transfer';
    counterparty: string;
    note: string;
  }> {
    const transactions = [];
    const platforms = Object.keys(profile).filter(p => profile[p as keyof AgentPaymentProfile] !== undefined);
    
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      
      // Generate 0-3 transactions per day
      const dailyCount = Math.floor(Math.random() * 3);
      
      for (let j = 0; j < dailyCount; j++) {
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const amount = Math.floor(Math.random() * 500) + 1;
        const type: 'send' | 'receive' | 'transfer' = Math.random() > 0.6 ? 'send' : Math.random() > 0.3 ? 'receive' : 'transfer';
        
        transactions.push({
          platform,
          date: date.toISOString(),
          amount,
          type,
          counterparty: this.generateCounterparty(),
          note: this.generatePaymentNote(type)
        });
      }
    }
    
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  private static generateCounterparty(): string {
    const names = ['Alex Smith', 'Jordan Lee', 'Taylor Wilson', 'Casey Brown', 'Morgan Davis'];
    const businesses = ['Coffee Shop', 'Grocery Store', 'Online Service', 'Utility Bill', 'Restaurant'];
    
    if (Math.random() > 0.5) {
      return names[Math.floor(Math.random() * names.length)];
    } else {
      return businesses[Math.floor(Math.random() * businesses.length)];
    }
  }
  
  private static generatePaymentNote(type: string): string {
    const sendNotes = ['Lunch', 'Dinner', 'Concert tickets', 'Rent split', 'Groceries', 'Gas', 'Utilities'];
    const receiveNotes = ['Reimbursement', 'Payment for services', 'Gift', 'Refund', 'Freelance work'];
    
    if (type === 'send') {
      return sendNotes[Math.floor(Math.random() * sendNotes.length)];
    } else {
      return receiveNotes[Math.floor(Math.random() * receiveNotes.length)];
    }
  }
}
