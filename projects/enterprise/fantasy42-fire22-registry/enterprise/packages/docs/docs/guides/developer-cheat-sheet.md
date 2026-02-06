# 🚀 Developer Cheat Sheet - Fire22 Codebase

## 🧭 **WHERE TO PUT WHAT** - Quick Reference Guide

This guide solves the "where do I put this?" problem for new developers. Use
this as your go-to reference for finding the right location for any development
task.

---

## 🎯 **COMMON DEVELOPMENT TASKS**

### **👥 Customer Management**

| Task                   | Location                          | Files to Modify               |
| ---------------------- | --------------------------------- | ----------------------------- |
| Add customer field     | `src/components/customer/core/`   | `customer-interface-types.ts` |
| Customer search logic  | `src/components/customer/search/` | `customer-search.ts`          |
| Customer forms         | `src/components/customer/forms/`  | `customer-forms.ts`           |
| Customer API endpoints | `src/api/controllers/`            | Domain-specific controller    |
| Customer language keys | `src/i18n/`                       | `fire22-language-keys.json`   |

### **💰 Financial Operations**

| Task                    | Location                     | Files to Modify            |
| ----------------------- | ---------------------------- | -------------------------- |
| Balance validation      | `src/finance/validation/`    | `balance-validator.ts`     |
| Transaction logging     | `src/finance/audit/`         | `balance-audit-trail.ts`   |
| Payment processing      | `src/finance/`               | Domain-specific module     |
| Financial reports       | `src/api/controllers/`       | `settlement-controller.ts` |
| Commission calculations | `src/hierarchy/commissions/` | `commission-manager.ts`    |

### **⚽ Sports & Betting**

| Task                 | Location               | Files to Modify            |
| -------------------- | ---------------------- | -------------------------- |
| Event management     | `src/sports/events/`   | `event-management.ts`      |
| Odds calculation     | `src/sports/betting/`  | `odds-management.ts`       |
| Bet processing       | `src/sports/betting/`  | `bet-processing.ts`        |
| Risk assessment      | `src/sports/risk/`     | `risk-assessment.ts`       |
| Sports API endpoints | `src/api/controllers/` | `settlement-controller.ts` |

### **🤖 Telegram Integration**

| Task                  | Location                 | Files to Modify                           |
| --------------------- | ------------------------ | ----------------------------------------- |
| New bot command       | `src/telegram/commands/` | `user-commands.ts` or `wager-commands.ts` |
| Command language keys | `src/telegram/`          | `telegram-constants.ts`                   |
| Notification system   | `src/telegram/`          | `multilingual-telegram-bot.ts`            |
| Bot configuration     | `src/config/`            | `telegram-integration-config.ts`          |
| Bot testing           | `src/telegram/`          | Domain-specific test files                |

---

## 📂 **DIRECTORY STRUCTURE MAP**

```text
src/
├── api/
│   └── controllers/           # 🎮 API endpoints by domain
│       ├── settlement/        # Settlement operations
│       ├── adjustment/        # Account adjustments
│       ├── balance/          # Balance management
│       └── index.ts          # Controller exports
├── components/
│   └── customer/             # 👥 Customer management
│       ├── core/             # Core types & logic
│       ├── search/           # Search functionality
│       └── forms/            # Form handling
├── finance/                  # 💰 Financial operations
│   ├── core/                 # Shared types
│   ├── validation/           # Balance validation
│   ├── audit/                # Transaction logging
│   └── notifications/        # Alert system
├── hierarchy/                # 👑 Agent management
│   ├── agents/               # Agent profiles
│   ├── commissions/          # Commission calculations
│   ├── permissions/          # Access control
│   └── core/                 # Shared types
├── sports/                   # ⚽ Sports & betting
│   ├── events/               # Event management
│   ├── betting/              # Bet processing
│   └── risk/                 # Risk assessment
├── telegram/                 # 🤖 Bot integration
│   ├── core/                 # Bot core logic
│   ├── commands/             # Bot commands
│   └── multilingual-telegram-bot.ts
├── device/                   # 📱 Device intelligence
│   ├── detection/            # Device fingerprinting
│   ├── tracking/             # API call tracking
│   └── security/             # Security monitoring
├── i18n/                     # 🌐 Internationalization
│   ├── fire22-language-keys.json
│   └── fire22-language-codes.json
└── core/
    └── types/                # 🔧 Shared type definitions
        ├── shared/           # Common types
        ├── finance/          # Finance types
        ├── hierarchy/        # Hierarchy types
        ├── sports/           # Sports types
        ├── device/           # Device types
        └── controllers/      # Controller types
```

---

## 🔧 **HOW TO ADD NEW FEATURES**

### **Step 1: Identify the Domain**

```text
Customer Feature → src/components/customer/
Financial Logic → src/finance/
Sports Feature → src/sports/
Telegram Command → src/telegram/
Agent Management → src/hierarchy/
```

### **Step 2: Follow the Pattern**

```typescript
// 1. Add types to appropriate module
// Location: src/[domain]/core/types.ts or core/types/[domain]/

export interface NewFeatureType {
  id: string;
  name: string;
  // ... properties
}

// 2. Implement functionality
// Location: src/[domain]/[submodule]/

export class NewFeatureManager {
  async processNewFeature(data: NewFeatureType) {
    // Implementation
  }
}

// 3. Add API endpoint (if needed)
// Location: src/api/controllers/[domain]-controller.ts

export async function handleNewFeature(request: ControllerRequest) {
  // API logic
}

// 4. Add language keys
// Location: src/i18n/fire22-language-keys.json

{
  "L-NEW_FEATURE": "New Feature Name"
}
```

### **Step 3: Update Exports**

```typescript
// Add to appropriate index.ts files
export * from './new-feature-manager';
export { handleNewFeature } from './api-endpoint';
```

---

## 🎯 **QUICK TASK REFERENCE**

### **"I need to add..."**

| What to Add         | Where to Go                     | Example                              |
| ------------------- | ------------------------------- | ------------------------------------ |
| Customer field      | `src/components/customer/core/` | Add to `customer-interface-types.ts` |
| API endpoint        | `src/api/controllers/`          | Add to domain-specific controller    |
| Language text       | `src/i18n/`                     | Add L-XXXX key to language files     |
| Telegram command    | `src/telegram/commands/`        | Add to appropriate command file      |
| Balance logic       | `src/finance/validation/`       | Modify `balance-validator.ts`        |
| Agent permission    | `src/hierarchy/permissions/`    | Update permission logic              |
| Sports event        | `src/sports/events/`            | Modify `event-management.ts`         |
| Device tracking     | `src/device/tracking/`          | Add to tracking module               |
| Report generation   | `src/api/controllers/`          | Add to settlement controller         |
| Notification system | `src/finance/notifications/`    | Modify `balance-notifications.ts`    |

### **"I need to modify..."**

| What to Modify        | Where to Look                     | Files                          |
| --------------------- | --------------------------------- | ------------------------------ |
| Balance calculations  | `src/finance/validation/`         | `balance-validator.ts`         |
| Transaction logging   | `src/finance/audit/`              | `balance-audit-trail.ts`       |
| Customer search       | `src/components/customer/search/` | `customer-search.ts`           |
| Agent hierarchy       | `src/hierarchy/agents/`           | `agent-profile-manager.ts`     |
| Sports odds           | `src/sports/betting/`             | `odds-management.ts`           |
| Telegram responses    | `src/telegram/`                   | `multilingual-telegram-bot.ts` |
| Language translations | `src/i18n/`                       | Language JSON files            |
| API responses         | `src/api/controllers/`            | Domain controllers             |
| Error handling        | `core/types/shared/`              | `validation.ts`                |
| Type definitions      | `core/types/`                     | Domain-specific types          |

---

## 🚨 **IMPORTANT PATTERNS TO FOLLOW**

### **1. Type Safety First**

```typescript
// ✅ DO: Define types before implementation
export interface NewFeature {
  id: string;
  name: string;
  // ... properties
}

// ❌ DON'T: Skip type definitions
export class NewFeature {
  constructor(
    public id: string,
    public name: string
  ) {}
}
```

### **2. Domain Separation**

```typescript
// ✅ DO: Keep domains separate
// src/finance/validation/balance-validator.ts
export class BalanceValidator {
  /* finance logic */
}

// ❌ DON'T: Mix domains
// src/utils/mixed-logic.ts
export class MixedLogic {
  /* finance + customer + sports */
}
```

### **3. Language Key Convention**

```json
// ✅ DO: Follow L-XXXX pattern
{
  "L-CUSTOMER_SEARCH": "Customer Search",
  "L-BALANCE_UPDATE": "Balance Updated"
}

// ❌ DON'T: Use inconsistent keys
{
  "customerSearch": "Customer Search",
  "BALANCE_UPDATE": "Balance Updated"
}
```

### **4. Error Handling**

```typescript
// ✅ DO: Use proper error types
try {
  // operation
} catch (error) {
  throw new ValidationError('Invalid data', error);
}

// ❌ DON'T: Generic errors
throw new Error('Something went wrong');
```

---

## 🎯 **DAILY DEVELOPMENT WORKFLOW**

### **Morning: Plan Your Day**

1. Check `REFACTORING_STATUS_REPORT.md` for architecture overview
2. Review `language-telegram-integration-map.html` for i18n reference
3. Use this cheat sheet to identify target locations

### **Development: Implement Features**

1. **Navigate**: Use directory structure above to find right location
2. **Types First**: Define interfaces in appropriate type files
3. **Implement**: Follow existing patterns in the module
4. **Test**: Validate functionality works correctly
5. **Language**: Add L-XXXX keys for any user-facing text

### **Integration: Connect Components**

1. **API**: Add endpoints to appropriate controllers
2. **UI**: Connect to existing components or create new ones
3. **Telegram**: Add bot commands if needed
4. **Testing**: Ensure all integrations work together

### **Evening: Documentation & Review**

1. Update any modified documentation
2. Review code follows established patterns
3. Test multilingual support if applicable
4. Prepare for next day's work

---

## 📞 **WHEN YOU NEED HELP**

### **Quick References:**

- **Architecture Overview**: `REFACTORING_STATUS_REPORT.md`
- **Language Integration**: `language-telegram-integration-map.html`
- **Navigation Guide**: `navigational-developer-guide.html`
- **This Cheat Sheet**: `developer-cheat-sheet.md`

### **Finding Specific Functionality:**

1. **Search by feature**: Use `grep -r "featureName" src/`
2. **Find by domain**: Check domain-specific directories
3. **Language keys**: Search `grep "L-" src/i18n/`
4. **API endpoints**: Check `src/api/controllers/`

### **Common Questions:**

- **"Where do I put X?"** → Check the task matrix above
- **"How does Y work?"** → Look at existing implementations
- **"What's the pattern for Z?"** → Examine similar functionality
- **"Do I need language keys?"** → Yes, if user-facing text

---

## 🎉 **SUCCESS METRICS**

By using this guide, you should be able to:

✅ **Navigate the codebase** without extensive hand-holding ✅ **Find the right
location** for any development task ✅ **Follow established patterns** for
consistent code ✅ **Add features efficiently** without architectural confusion
✅ **Contribute effectively** from day one

**This guide transforms the codebase from a navigation challenge into a
developer-friendly environment!** 🚀

---

_Last Updated: December 2024_ _Version: 1.0_ _Target: New Developer Onboarding_
