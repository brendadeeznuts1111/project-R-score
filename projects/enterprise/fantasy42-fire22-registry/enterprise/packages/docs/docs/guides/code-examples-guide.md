# 💻 Code Examples Guide - Fire22 Development Patterns

## 🎯 **PRACTICAL CODE EXAMPLES**

This guide shows you **exactly how** to implement common development tasks
following the established patterns in the Fire22 codebase. Copy, modify, and use
these examples as templates for your development work.

---

## 👥 **CUSTOMER MANAGEMENT EXAMPLES**

### **Adding a New Customer Field**

```typescript
// 1. Add to customer types (src/components/customer/core/customer-interface-types.ts)
export interface CustomerProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  // NEW FIELD: Add your new field here
  vipStatus?: 'bronze' | 'silver' | 'gold' | 'platinum';
  preferredLanguage?: string;
  marketingOptIn?: boolean;
  // ... existing fields
}

// 2. Update the customer forms (src/components/customer/forms/customer-forms.ts)
export class CustomerForms {
  generateCustomerForm(customer?: Partial<CustomerProfile>): string {
    return `
      <form id="customer-form">
        <div class="form-group">
          <label for="firstName">First Name</label>
          <input type="text" id="firstName" value="${customer?.firstName || ''}" required>
        </div>
        <!-- EXISTING FIELDS -->

        <!-- NEW FIELD: VIP Status -->
        <div class="form-group">
          <label for="vipStatus">VIP Status</label>
          <select id="vipStatus">
            <option value="">Select Status</option>
            <option value="bronze" ${customer?.vipStatus === 'bronze' ? 'selected' : ''}>Bronze</option>
            <option value="silver" ${customer?.vipStatus === 'silver' ? 'selected' : ''}>Silver</option>
            <option value="gold" ${customer?.vipStatus === 'gold' ? 'selected' : ''}>Gold</option>
            <option value="platinum" ${customer?.vipStatus === 'platinum' ? 'selected' : ''}>Platinum</option>
          </select>
        </div>

        <!-- NEW FIELD: Preferred Language -->
        <div class="form-group">
          <label for="preferredLanguage">Preferred Language</label>
          <select id="preferredLanguage">
            <option value="en" ${customer?.preferredLanguage === 'en' ? 'selected' : ''}>English</option>
            <option value="es" ${customer?.preferredLanguage === 'es' ? 'selected' : ''}>Español</option>
            <option value="pt" ${customer?.preferredLanguage === 'pt' ? 'selected' : ''}>Português</option>
            <option value="fr" ${customer?.preferredLanguage === 'fr' ? 'selected' : ''}>Français</option>
          </select>
        </div>
      </form>
    `;
  }

  async submitCustomerForm(formData: FormData): Promise<CustomerProfile> {
    // Validate new fields
    const vipStatus = formData.get('vipStatus') as string;
    const preferredLanguage = formData.get('preferredLanguage') as string;

    if (
      vipStatus &&
      !['bronze', 'silver', 'gold', 'platinum'].includes(vipStatus)
    ) {
      throw new ValidationError('Invalid VIP status');
    }

    if (
      preferredLanguage &&
      !['en', 'es', 'pt', 'fr'].includes(preferredLanguage)
    ) {
      throw new ValidationError('Invalid language preference');
    }

    // Create customer object with new fields
    const customer: CustomerProfile = {
      id: generateId(),
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      // NEW FIELDS
      vipStatus: vipStatus as any,
      preferredLanguage: preferredLanguage as any,
      marketingOptIn: formData.get('marketingOptIn') === 'true',
      // ... other fields
    };

    return customer;
  }
}
```

### **Adding Customer Search Functionality**

```typescript
// 3. Add to customer search (src/components/customer/search/customer-search.ts)
export class CustomerSearch {
  private searchIndex: Map<string, CustomerProfile> = new Map();

  async searchCustomers(
    query: string,
    filters?: {
      vipStatus?: string;
      preferredLanguage?: string;
      hasMarketingOptIn?: boolean;
    }
  ): Promise<CustomerProfile[]> {
    let results = Array.from(this.searchIndex.values());

    // Text search
    if (query) {
      const lowercaseQuery = query.toLowerCase();
      results = results.filter(
        customer =>
          customer.firstName?.toLowerCase().includes(lowercaseQuery) ||
          customer.lastName?.toLowerCase().includes(lowercaseQuery) ||
          customer.email?.toLowerCase().includes(lowercaseQuery)
      );
    }

    // NEW FILTERS: VIP Status
    if (filters?.vipStatus) {
      results = results.filter(
        customer => customer.vipStatus === filters.vipStatus
      );
    }

    // NEW FILTERS: Preferred Language
    if (filters?.preferredLanguage) {
      results = results.filter(
        customer => customer.preferredLanguage === filters.preferredLanguage
      );
    }

    // NEW FILTERS: Marketing Opt-in
    if (filters?.hasMarketingOptIn !== undefined) {
      results = results.filter(
        customer => customer.marketingOptIn === filters.hasMarketingOptIn
      );
    }

    return results.slice(0, 50); // Limit results
  }

  // Generate search UI with new filters
  generateSearchForm(): string {
    return `
      <div class="customer-search">
        <input type="text" id="search-query" placeholder="Search customers...">

        <!-- NEW FILTERS -->
        <select id="vip-filter">
          <option value="">All VIP Status</option>
          <option value="bronze">Bronze</option>
          <option value="silver">Silver</option>
          <option value="gold">Gold</option>
          <option value="platinum">Platinum</option>
        </select>

        <select id="language-filter">
          <option value="">All Languages</option>
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="pt">Portuguese</option>
          <option value="fr">French</option>
        </select>

        <label>
          <input type="checkbox" id="marketing-filter"> Marketing Opt-in Only
        </label>

        <button onclick="performSearch()">Search</button>
      </div>
    `;
  }
}
```

---

## 💰 **FINANCIAL OPERATIONS EXAMPLES**

### **Adding a New Balance Validation Rule**

```typescript
// src/finance/validation/balance-validator.ts
export class BalanceValidator {
  // Add new validation rule
  async validateVIPStatus(
    customerId: string,
    balance: number
  ): Promise<{
    isValid: boolean;
    message?: string;
  }> {
    // Get customer VIP status (would come from customer service)
    const customer = await this.getCustomerVIPStatus(customerId);

    if (!customer?.vipStatus) {
      return { isValid: true }; // No special validation for non-VIP
    }

    // VIP-specific balance rules
    const minBalance = this.getMinBalanceForVIP(customer.vipStatus);
    const maxBalance = this.getMaxBalanceForVIP(customer.vipStatus);

    if (balance < minBalance) {
      return {
        isValid: false,
        message: `VIP ${customer.vipStatus} accounts require minimum balance of $${minBalance}`,
      };
    }

    if (balance > maxBalance) {
      return {
        isValid: false,
        message: `VIP ${customer.vipStatus} accounts have maximum balance limit of $${maxBalance}`,
      };
    }

    return { isValid: true };
  }

  private getMinBalanceForVIP(vipStatus: string): number {
    const minBalances = {
      bronze: 100,
      silver: 500,
      gold: 1000,
      platinum: 5000,
    };
    return minBalances[vipStatus as keyof typeof minBalances] || 0;
  }

  private getMaxBalanceForVIP(vipStatus: string): number {
    const maxBalances = {
      bronze: 10000,
      silver: 50000,
      gold: 100000,
      platinum: 500000,
    };
    return maxBalances[vipStatus as keyof typeof maxBalances] || 1000000;
  }
}
```

### **Adding Transaction Audit Logging**

```typescript
// src/finance/audit/balance-audit-trail.ts
export class BalanceAuditTrail {
  // Add VIP status tracking to audit log
  async recordVIPTransaction(
    customerId: string,
    agentId: string,
    vipStatus: string,
    amount: number,
    reason: string
  ): Promise<BalanceChangeEvent> {
    const event = await this.recordBalanceChange(
      customerId,
      agentId,
      'adjustment',
      0, // previous balance (would be fetched)
      amount,
      reason,
      'system'
    );

    // Add VIP-specific metadata
    event.metadata = {
      ...event.metadata,
      vipStatus,
      vipBonus: this.calculateVIPBonus(vipStatus, amount),
      vipMultiplier: this.getVIPMultiplier(vipStatus),
    };

    return event;
  }

  private calculateVIPBonus(vipStatus: string, amount: number): number {
    const bonusRates = {
      bronze: 0.01, // 1% bonus
      silver: 0.025, // 2.5% bonus
      gold: 0.05, // 5% bonus
      platinum: 0.1, // 10% bonus
    };

    const rate = bonusRates[vipStatus as keyof typeof bonusRates] || 0;
    return amount * rate;
  }

  private getVIPMultiplier(vipStatus: string): number {
    const multipliers = {
      bronze: 1.0,
      silver: 1.1,
      gold: 1.25,
      platinum: 1.5,
    };

    return multipliers[vipStatus as keyof typeof multipliers] || 1.0;
  }
}
```

---

## 🤖 **TELEGRAM INTEGRATION EXAMPLES**

### **Adding a New Telegram Command**

```typescript
// src/telegram/commands/user-commands.ts
export class UserCommands {
  // Add new VIP status command
  async handleVIPStatus(
    message: any,
    telegramUser: TelegramUser
  ): Promise<void> {
    try {
      // Get user's VIP status from customer database
      const vipStatus = await this.getUserVIPStatus(telegramUser.id);

      if (!vipStatus) {
        await this.sendMessage(
          telegramUser.id,
          this.t('L-VIP_NOT_FOUND', 'en') // "VIP status not found"
        );
        return;
      }

      // Get VIP benefits in user's language
      const benefits = this.getVIPBenefits(vipStatus);
      const language = telegramUser.language_code || 'en';

      const messageText = this.t('L-VIP_STATUS_INFO', language, {
        status: vipStatus,
        benefits: benefits.join(', '),
      });

      // Send VIP status with inline keyboard
      await this.sendVIPStatusMessage(
        telegramUser.id,
        messageText,
        vipStatus,
        language
      );
    } catch (error) {
      console.error('VIP status command error:', error);
      await this.sendMessage(
        telegramUser.id,
        this.t('L-ERROR_OCCURRED', telegramUser.language_code || 'en')
      );
    }
  }

  private async getUserVIPStatus(
    telegramUserId: number
  ): Promise<string | null> {
    // Link Telegram user to customer account
    const customer =
      await this.customerService.findByTelegramId(telegramUserId);
    return customer?.vipStatus || null;
  }

  private getVIPBenefits(vipStatus: string): string[] {
    const benefitsMap = {
      bronze: ['Priority Support', 'Monthly Bonus'],
      silver: ['Priority Support', 'Monthly Bonus', 'Faster Withdrawals'],
      gold: [
        'Priority Support',
        'Monthly Bonus',
        'Faster Withdrawals',
        'Exclusive Events',
      ],
      platinum: [
        'Priority Support',
        'Monthly Bonus',
        'Faster Withdrawals',
        'Exclusive Events',
        'Personal Manager',
      ],
    };

    return benefitsMap[vipStatus as keyof typeof benefitsMap] || [];
  }

  private async sendVIPStatusMessage(
    chatId: number,
    text: string,
    vipStatus: string,
    language: string
  ): Promise<void> {
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: this.t('L-UPGRADE_VIP', language),
            callback_data: `upgrade_vip_${vipStatus}`,
          },
        ],
        [
          {
            text: this.t('L-VIP_BENEFITS', language),
            callback_data: 'show_vip_benefits',
          },
          {
            text: this.t('L-CONTACT_SUPPORT', language),
            callback_data: 'contact_support',
          },
        ],
      ],
    };

    await this.telegramAPI.sendMessage(chatId, text, {
      reply_markup: keyboard,
    });
  }
}
```

### **Adding Telegram Language Selection**

```typescript
// src/telegram/commands/user-commands.ts
export class UserCommands {
  async handleLanguageSelection(
    message: any,
    telegramUser: TelegramUser
  ): Promise<void> {
    const languages = [
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'es', name: 'Español', flag: '🇪🇸' },
      { code: 'pt', name: 'Português', flag: '🇵🇹' },
      { code: 'fr', name: 'Français', flag: '🇫🇷' },
    ];

    const keyboard = {
      inline_keyboard: languages.map(lang => [
        {
          text: `${lang.flag} ${lang.name}`,
          callback_data: `set_language_${lang.code}`,
        },
      ]),
    };

    await this.telegramAPI.sendMessage(
      telegramUser.id,
      '🌐 Choose your preferred language / Elige tu idioma preferido / Escolha seu idioma preferido / Choisissez votre langue préférée:',
      { reply_markup: keyboard }
    );
  }

  async handleLanguageChange(
    callbackQuery: any,
    telegramUser: TelegramUser
  ): Promise<void> {
    const languageCode = callbackQuery.data.replace('set_language_', '');

    // Update user's language preference
    await this.userService.updateLanguage(telegramUser.id, languageCode);

    // Send confirmation in new language
    const confirmationText = this.t('L-LANGUAGE_CHANGED', languageCode);

    await this.telegramAPI.answerCallbackQuery(callbackQuery.id);
    await this.telegramAPI.sendMessage(telegramUser.id, confirmationText);
  }
}
```

---

## ⚽ **SPORTS & BETTING EXAMPLES**

### **Adding a New Sports Event Type**

```typescript
// src/sports/events/event-management.ts
export class EventManagement {
  // Add new event type for e-sports
  async createESportsEvent(
    eventData: Omit<SportsEventCreate, 'sport'> & {
      game: 'league_of_legends' | 'dota2' | 'csgo' | 'valorant';
      tournament: string;
      matchFormat: string;
    }
  ): Promise<SportsEvent> {
    // Validate e-sports specific data
    this.validateESportsData(eventData);

    const event = await this.createEvent({
      ...eventData,
      sport: 'esports',
      league: `${eventData.game}_${eventData.tournament}`,
      metadata: {
        game: eventData.game,
        tournament: eventData.tournament,
        matchFormat: eventData.matchFormat,
        streamingPlatforms: eventData.streamingPlatforms || [],
      },
    });

    // Create e-sports specific odds
    await this.createESportsOdds(event.id, eventData);

    return event;
  }

  private validateESportsData(eventData: any): void {
    const validGames = ['league_of_legends', 'dota2', 'csgo', 'valorant'];
    if (!validGames.includes(eventData.game)) {
      throw new ValidationError(`Invalid game: ${eventData.game}`);
    }

    if (!eventData.tournament) {
      throw new ValidationError(
        'Tournament name is required for e-sports events'
      );
    }
  }

  private async createESportsOdds(
    eventId: string,
    eventData: any
  ): Promise<void> {
    // E-sports specific odds creation
    const oddsManager = new OddsManagement();

    // Create match winner odds
    await oddsManager.createOdds({
      eventId,
      type: 'match_winner',
      homeWin: 1.85, // Favorite
      awayWin: 2.1, // Underdog
      drawWin: null, // No draws in e-sports
    });

    // Create map-specific odds for CSGO
    if (eventData.game === 'csgo') {
      await oddsManager.createOdds({
        eventId,
        type: 'map_score',
        specialBets: [
          {
            id: 'map1_winner',
            name: 'Map 1 Winner',
            category: 'match_details',
            odds: 1.9,
            riskLevel: 'medium',
          },
        ],
      });
    }
  }
}
```

### **Adding Risk Assessment for New Bet Types**

```typescript
// src/sports/risk/risk-assessment.ts
export class RiskAssessment {
  // Add e-sports specific risk assessment
  async assessESportsBet(
    customerId: string,
    eventId: string,
    betType: string,
    stake: number,
    odds: number
  ): Promise<RiskAssessment> {
    const baseAssessment = await this.performBaseAssessment(customerId, stake);

    // E-sports specific risk factors
    const esportsRisk = await this.calculateESportsRisk(
      eventId,
      betType,
      stake,
      odds
    );

    return {
      ...baseAssessment,
      riskLevel: this.combineRiskLevels(
        baseAssessment.riskLevel,
        esportsRisk.level
      ),
      factors: [...baseAssessment.factors, ...esportsRisk.factors],
      recommendations: [
        ...baseAssessment.recommendations,
        ...esportsRisk.recommendations,
      ],
      metadata: {
        ...baseAssessment.metadata,
        esportsFactors: esportsRisk.factors,
        gameSpecificRisk: esportsRisk.gameRisk,
      },
    };
  }

  private async calculateESportsRisk(
    eventId: string,
    betType: string,
    stake: number,
    odds: number
  ): Promise<{
    level: 'low' | 'medium' | 'high' | 'extreme';
    factors: string[];
    recommendations: string[];
    gameRisk: any;
  }> {
    const factors: string[] = [];
    const recommendations: string[] = [];

    // Tournament stage risk
    const event = await this.eventManager.getEvent(eventId);
    if (event?.metadata?.tournament === 'world_championship') {
      factors.push('High-stakes tournament');
      recommendations.push('Consider reducing stake for championship matches');
    }

    // Game-specific risk
    const gameRisk = this.assessGameSpecificRisk(
      event?.metadata?.game,
      betType,
      stake
    );

    // Live betting risk (higher for e-sports)
    if (betType.includes('live')) {
      factors.push('Live e-sports betting higher volatility');
      recommendations.push('Monitor game state closely');
    }

    // Calculate overall level
    const level = this.determineESportsRiskLevel(factors.length, stake, odds);

    return {
      level,
      factors,
      recommendations,
      gameRisk,
    };
  }

  private assessGameSpecificRisk(
    game: string,
    betType: string,
    stake: number
  ): any {
    const gameRisks = {
      league_of_legends: {
        highRiskBets: ['first_blood', 'first_turret'],
        volatility: 'high',
      },
      dota2: {
        highRiskBets: ['first_blood', 'roshan'],
        volatility: 'high',
      },
      csgo: {
        highRiskBets: ['first_kill', 'bomb_plant'],
        volatility: 'medium',
      },
    };

    return (
      gameRisks[game as keyof typeof gameRisks] || { volatility: 'medium' }
    );
  }
}
```

---

## 🎯 **LANGUAGE INTEGRATION EXAMPLES**

### **Adding Language Keys for New Features**

```json
// src/i18n/fire22-language-keys.json
{
  "languages": {
    "en": {
      "_section_customer_enhancement": "Customer Enhancement Features",
      "L-VIP_STATUS": "VIP Status",
      "L-VIP_BRONZE": "Bronze VIP",
      "L-VIP_SILVER": "Silver VIP",
      "L-VIP_GOLD": "Gold VIP",
      "L-VIP_PLATINUM": "Platinum VIP",
      "L-PREFERRED_LANGUAGE": "Preferred Language",
      "L-MARKETING_OPT_IN": "Marketing Communications",
      "L-VIP_BENEFITS": "VIP Benefits",
      "L-UPGRADE_VIP": "Upgrade VIP Status",
      "L-VIP_NOT_FOUND": "VIP status not found for this account"
    },
    "es": {
      "L-VIP_STATUS": "Estado VIP",
      "L-VIP_BRONZE": "VIP Bronce",
      "L-VIP_SILVER": "VIP Plata",
      "L-VIP_GOLD": "VIP Oro",
      "L-VIP_PLATINUM": "VIP Platino",
      "L-PREFERRED_LANGUAGE": "Idioma Preferido",
      "L-MARKETING_OPT_IN": "Comunicaciones de Marketing",
      "L-VIP_BENEFITS": "Beneficios VIP",
      "L-UPGRADE_VIP": "Actualizar Estado VIP",
      "L-VIP_NOT_FOUND": "Estado VIP no encontrado para esta cuenta"
    }
  },
  "templates": {
    "L-VIP_WELCOME": "Welcome {name}! Your {status} VIP status is active.",
    "L-VIP_BONUS": "VIP {status} bonus: {amount} {currency}",
    "L-VIP_LIMIT": "Your {status} VIP daily limit: {limit} {currency}"
  }
}
```

### **Using Language Keys in Components**

```typescript
// src/components/customer/forms/customer-forms.ts
export class CustomerForms {
  private languageManager: Fire22LanguageManager;

  constructor() {
    this.languageManager = new Fire22LanguageManager();
  }

  generateVIPSection(
    customer?: Partial<CustomerProfile>,
    language: string = 'en'
  ): string {
    const t = (key: string, vars?: any) =>
      this.languageManager.translate(key, language, vars);

    return `
      <div class="vip-section">
        <h3>${t('L-VIP_STATUS')}</h3>

        <div class="form-group">
          <label for="vipStatus">${t('L-VIP_STATUS')}</label>
          <select id="vipStatus" name="vipStatus">
            <option value="">${t('L-SELECT_OPTION', { option: t('L-VIP_STATUS') })}</option>
            <option value="bronze" ${customer?.vipStatus === 'bronze' ? 'selected' : ''}>
              ${t('L-VIP_BRONZE')}
            </option>
            <option value="silver" ${customer?.vipStatus === 'silver' ? 'selected' : ''}>
              ${t('L-VIP_SILVER')}
            </option>
            <option value="gold" ${customer?.vipStatus === 'gold' ? 'selected' : ''}>
              ${t('L-VIP_GOLD')}
            </option>
            <option value="platinum" ${customer?.vipStatus === 'platinum' ? 'selected' : ''}>
              ${t('L-VIP_PLATINUM')}
            </option>
          </select>
        </div>

        <div class="vip-benefits">
          <button onclick="showVIPBenefits()" class="btn-secondary">
            ${t('L-VIP_BENEFITS')}
          </button>
          <button onclick="upgradeVIP()" class="btn-primary">
            ${t('L-UPGRADE_VIP')}
          </button>
        </div>
      </div>
    `;
  }

  validateVIPData(
    formData: FormData,
    language: string = 'en'
  ): ValidationResult {
    const t = (key: string) => this.languageManager.translate(key, language);

    const vipStatus = formData.get('vipStatus') as string;
    const errors: string[] = [];

    if (
      vipStatus &&
      !['bronze', 'silver', 'gold', 'platinum'].includes(vipStatus)
    ) {
      errors.push(t('L-INVALID_VIP_STATUS'));
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
```

---

## 🏗️ **API CONTROLLER EXAMPLES**

### **Adding a New API Endpoint**

```typescript
// src/api/controllers/customer-enhancement-controller.ts
import type {
  ControllerRequest,
  ApiResponse,
} from '../../core/types/controllers';

/**
 * Get customer VIP status and benefits
 */
export async function getCustomerVIPStatus(
  request: ControllerRequest
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const customerId = url.searchParams.get('customerId');

    if (!customerId) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Customer ID is required',
          errors: ['Missing customerId parameter'],
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get customer data (would come from customer service)
    const customer = await getCustomerById(customerId);

    if (!customer) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Customer not found',
          errors: ['Invalid customer ID'],
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get VIP benefits based on status
    const vipBenefits = getVIPBenefits(customer.vipStatus);

    const response: ApiResponse = {
      status: 'success',
      message: 'Customer VIP status retrieved successfully',
      data: {
        customerId,
        vipStatus: customer.vipStatus,
        benefits: vipBenefits,
        nextUpgrade: getNextVIPLevel(customer.vipStatus),
        currentBalance: customer.currentBalance,
        monthlyBonus: calculateMonthlyBonus(customer.vipStatus),
      },
      metadata: {
        timestamp: new Date(),
        requestId: `vip_status_${Date.now()}`,
        processingTime: 0,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorResponse: ApiResponse = {
      status: 'error',
      message: 'Failed to retrieve VIP status',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      metadata: {
        timestamp: new Date(),
        requestId: `vip_status_error_${Date.now()}`,
        processingTime: 0,
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Update customer VIP status
 */
export async function updateCustomerVIPStatus(
  request: ControllerRequest
): Promise<Response> {
  try {
    const body = await request.json();
    const { customerId, newVIPStatus, reason } = body;

    // Validate request
    if (!customerId || !newVIPStatus) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Customer ID and new VIP status are required',
          errors: ['Missing required fields'],
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate VIP status
    const validStatuses = ['bronze', 'silver', 'gold', 'platinum'];
    if (!validStatuses.includes(newVIPStatus)) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Invalid VIP status',
          errors: [`VIP status must be one of: ${validStatuses.join(', ')}`],
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update customer VIP status (would call customer service)
    const updatedCustomer = await updateCustomerVIP(
      customerId,
      newVIPStatus,
      reason
    );

    // Log the change
    await logVIPStatusChange(
      customerId,
      newVIPStatus,
      reason,
      request.user?.id
    );

    const response: ApiResponse = {
      status: 'success',
      message: 'Customer VIP status updated successfully',
      data: {
        customerId,
        oldVIPStatus: updatedCustomer.oldStatus,
        newVIPStatus: updatedCustomer.vipStatus,
        effectiveDate: new Date(),
        bonuses: calculateVIPBonuses(newVIPStatus),
      },
      metadata: {
        timestamp: new Date(),
        requestId: `update_vip_${Date.now()}`,
        processingTime: 0,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorResponse: ApiResponse = {
      status: 'error',
      message: 'Failed to update VIP status',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      metadata: {
        timestamp: new Date(),
        requestId: `update_vip_error_${Date.now()}`,
        processingTime: 0,
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Helper functions (would be in separate service files)
async function getCustomerById(customerId: string) {
  // Implementation would query customer database
  return {
    id: customerId,
    vipStatus: 'gold',
    currentBalance: 50000,
  };
}

function getVIPBenefits(vipStatus: string) {
  const benefits = {
    bronze: ['Priority Support', 'Monthly Bonus'],
    silver: ['Priority Support', 'Monthly Bonus', 'Faster Withdrawals'],
    gold: [
      'Priority Support',
      'Monthly Bonus',
      'Faster Withdrawals',
      'Exclusive Events',
    ],
    platinum: [
      'Priority Support',
      'Monthly Bonus',
      'Faster Withdrawals',
      'Exclusive Events',
      'Personal Manager',
    ],
  };
  return benefits[vipStatus as keyof typeof benefits] || [];
}

function getNextVIPLevel(currentStatus: string) {
  const levels = ['bronze', 'silver', 'gold', 'platinum'];
  const currentIndex = levels.indexOf(currentStatus);
  return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null;
}

function calculateMonthlyBonus(vipStatus: string) {
  const bonuses = {
    bronze: 50,
    silver: 150,
    gold: 300,
    platinum: 750,
  };
  return bonuses[vipStatus as keyof typeof bonuses] || 0;
}

async function updateCustomerVIP(
  customerId: string,
  newStatus: string,
  reason: string
) {
  // Implementation would update customer database
  return {
    customerId,
    oldStatus: 'silver',
    vipStatus: newStatus,
    updatedAt: new Date(),
  };
}

async function logVIPStatusChange(
  customerId: string,
  newStatus: string,
  reason: string,
  userId?: string
) {
  // Implementation would log to audit trail
  console.log(`VIP status change: ${customerId} → ${newStatus} (${reason})`);
}

function calculateVIPBonuses(vipStatus: string) {
  // Implementation would calculate welcome bonuses
  return {
    welcomeBonus: 100,
    monthlyBonus: calculateMonthlyBonus(vipStatus),
  };
}
```

---

## 🎯 **PATTERNS SUMMARY**

### **1. Always Define Types First**

```typescript
// ✅ DO THIS FIRST
export interface NewFeature {
  id: string;
  name: string;
  // ... properties
}

// Then implement functionality
```

### **2. Follow Domain Separation**

```typescript
// ✅ Keep domains separate
src/
├── finance/     # 💰 Financial logic only
├── customer/    # 👥 Customer logic only
├── sports/      # ⚽ Sports logic only
└── telegram/    # 🤖 Bot logic only
```

### **3. Use Language Keys for User-Facing Text**

```typescript
// ✅ Use L-XXXX keys
const message = t('L-CUSTOMER_UPDATED', language, { name: customerName });

// ❌ Don't hardcode text
const message = 'Customer updated successfully';
```

### **4. Implement Comprehensive Error Handling**

```typescript
// ✅ Handle all error cases
try {
  // operation
  return { success: true, data };
} catch (error) {
  return {
    success: false,
    error: error.message,
    code: 'OPERATION_FAILED',
  };
}
```

### **5. Add Comprehensive Logging**

```typescript
// ✅ Log important operations
console.log(`Customer ${customerId} VIP status updated to ${newStatus}`);

// ✅ Include context in logs
logger.info('VIP status change', {
  customerId,
  oldStatus,
  newStatus,
  reason,
  userId,
});
```

**These examples show you exactly how to implement new features following the
established patterns. Copy, modify, and use them as templates for your
development work!** 🚀

---

_Examples Version: 1.0_ _Last Updated: December 2024_ _Target: Practical
Implementation Guide_
