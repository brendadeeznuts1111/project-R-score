# Wager Templates

This directory contains reusable templates for different types of wagers and
betting scenarios.

## 📋 **Available Templates**

### **🎯 Basic Wager Templates**

- **[straight-wager.md](./straight-wager.md)** - Simple straight bet template
- **[parlay-wager.md](./parlay-wager.md)** - Multiple selection parlay template
- **[teaser-wager.md](./teaser-wager.md)** - Teaser bet with adjusted lines
- **[if-bet.md](./if-bet.md)** - Conditional if-bet template
- **[reverse-bet.md](./reverse-bet.md)** - Reverse bet combinations

### **🏈 Sports-Specific Templates**

- **[football-wager.md](./sports/football-wager.md)** - Football betting
  templates
- **[basketball-wager.md](./sports/basketball-wager.md)** - Basketball betting
  templates
- **[baseball-wager.md](./sports/baseball-wager.md)** - Baseball betting
  templates
- **[soccer-wager.md](./sports/soccer-wager.md)** - Soccer betting templates

### **💰 Financial Templates**

- **[commission-calculator.md](./financial/commission-calculator.md)** -
  Commission calculation examples
- **[payout-calculator.md](./financial/payout-calculator.md)** - Payout
  calculation examples
- **[risk-assessment.md](./financial/risk-assessment.md)** - Risk scoring
  examples

## 🚀 **How to Use Templates**

### **1. Copy Template Structure**

```typescript
// Import the template
import { straightWagerTemplate } from './templates/straight-wager';

// Use the template
const wagerRequest = {
  ...straightWagerTemplate,
  customerId: 'CUST001',
  eventId: 'EVENT001',
  amountWagered: 100,
};
```

### **2. Customize for Your Needs**

```typescript
// Customize the template
const customWager = {
  ...straightWagerTemplate,
  // Override specific fields
  betType: 'custom',
  customFields: {
    specialOdds: true,
    bonusMultiplier: 1.5,
  },
};
```

### **3. Validate with Template Rules**

```typescript
// Validate against template rules
const validation = await wagerSystem.validateTemplate(
  customWager,
  'straight-wager'
);
if (validation.isValid) {
  const wager = await wagerSystem.createWager(customWager);
}
```

## 📊 **Template Categories**

### **By Complexity**

- **Simple**: Single selection, basic validation
- **Standard**: Multiple selections, standard risk assessment
- **Advanced**: Complex combinations, advanced risk management
- **Expert**: Custom rules, specialized validation

### **By Risk Level**

- **Low Risk**: Standard bets, minimal validation
- **Medium Risk**: Multiple selections, standard risk assessment
- **High Risk**: Complex bets, enhanced validation
- **Extreme Risk**: Special approval required

### **By Bet Type**

- **Moneyline**: Win/loss bets
- **Spread**: Point spread bets
- **Totals**: Over/under bets
- **Props**: Proposition bets
- **Futures**: Long-term outcome bets

## 🔧 **Template Customization**

### **Field Overrides**

```typescript
interface TemplateOverride {
  field: string;
  value: any;
  validation?: ValidationRule;
  required?: boolean;
}
```

### **Validation Rules**

```typescript
interface TemplateValidation {
  minAmount?: number;
  maxAmount?: number;
  maxRisk?: number;
  requiredFields?: string[];
  forbiddenFields?: string[];
}
```

### **Custom Logic**

```typescript
interface TemplateLogic {
  preValidation?: (data: any) => Promise<any>;
  postValidation?: (data: any) => Promise<any>;
  customCalculation?: (data: any) => Promise<any>;
}
```

## 📝 **Creating New Templates**

### **Template Structure**

```typescript
export const newWagerTemplate = {
  // Basic information
  name: 'New Wager Type',
  description: 'Description of this wager type',
  category: 'custom',
  riskLevel: 'medium',

  // Default values
  defaults: {
    betType: 'custom',
    validationLevel: 'standard',
    approvalRequired: false,
  },

  // Required fields
  required: ['customerId', 'eventId', 'amountWagered'],

  // Validation rules
  validation: {
    minAmount: 1,
    maxAmount: 10000,
    maxRisk: 5000,
  },

  // Custom fields
  customFields: {
    specialFeature: true,
    bonusMultiplier: 1.0,
  },
};
```

### **Template Documentation**

```markdown
# Template Name

## Description

Brief description of what this template does.

## Usage

How to use this template.

## Fields

- `field1`: Description of field1
- `field2`: Description of field2

## Examples

Code examples showing usage.

## Validation Rules

Specific validation rules for this template.

## Risk Assessment

How risk is calculated for this template.
```

## 🔍 **Template Search**

### **Search by Category**

```bash
# Find all football templates
find templates/ -name "*football*"

# Find all low-risk templates
find templates/ -name "*low-risk*"

# Find all commission templates
find templates/ -name "*commission*"
```

### **Search by Content**

```bash
# Search for templates with specific features
grep -r "bonusMultiplier" templates/

# Search for templates with specific validation
grep -r "maxRisk.*5000" templates/

# Search for templates with custom fields
grep -r "customFields" templates/
```

---

**📚 Ready to use these templates? Check out the individual template files for
detailed examples and usage patterns!**
