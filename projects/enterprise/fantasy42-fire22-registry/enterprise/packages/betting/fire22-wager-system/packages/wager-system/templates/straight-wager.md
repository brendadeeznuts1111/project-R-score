# Straight Wager Template

A simple, single-selection wager template for basic betting scenarios.

## 📋 **Template Information**

- **Name**: Straight Wager
- **Category**: Basic
- **Risk Level**: Low
- **Complexity**: Simple
- **Validation Level**: Standard

## 🎯 **Description**

The straight wager template is designed for single-selection bets with minimal
complexity. It's perfect for beginners and provides a solid foundation for more
complex wager types.

## 🚀 **Usage**

### **Basic Usage**

```typescript
import { straightWagerTemplate } from './templates/straight-wager';

// Use the template
const wagerRequest = {
  ...straightWagerTemplate,
  customerId: 'CUST001',
  agentId: 'AGENT001',
  eventId: 'EVENT001',
  selectionId: 'SEL001',
  amountWagered: 100,
};
```

### **With Customization**

```typescript
const customWager = {
  ...straightWagerTemplate,
  // Override specific fields
  amountWagered: 250,
  customerNotes: 'Lakers game - confident pick',
  customFields: {
    bonusMultiplier: 1.1,
    specialOdds: true,
  },
};
```

## 📊 **Template Structure**

```typescript
export const straightWagerTemplate = {
  // Basic identification
  betType: 'straight',
  templateName: 'straight-wager',
  templateVersion: '1.0.0',

  // Default values
  defaults: {
    validationLevel: 'standard',
    approvalRequired: false,
    riskAssessment: 'low',
    commissionRate: 0.05,
    maxExposure: 1000,
  },

  // Required fields
  required: [
    'customerId',
    'agentId',
    'eventId',
    'selectionId',
    'amountWagered',
  ],

  // Validation rules
  validation: {
    minAmount: 1,
    maxAmount: 10000,
    maxRisk: 1000,
    maxExposure: 1000,
    allowedBetTypes: ['straight'],
    allowedSelectionCount: 1,
  },

  // Risk assessment
  riskAssessment: {
    baseRiskScore: 10,
    maxRiskScore: 50,
    riskFactors: ['amount', 'customer', 'selection'],
    riskMultipliers: {
      highAmount: 1.5,
      newCustomer: 1.2,
      liveEvent: 1.3,
    },
  },

  // Commission structure
  commission: {
    baseRate: 0.05,
    volumeBonus: 0.01,
    performanceBonus: 0.01,
    riskAdjustment: 0.0,
  },

  // Custom fields
  customFields: {
    bonusMultiplier: 1.0,
    specialOdds: false,
    promotionalOffer: false,
    loyaltyBonus: false,
  },
};
```

## 🔧 **Field Descriptions**

### **Required Fields**

- `customerId`: Unique identifier for the customer placing the wager
- `agentId`: Unique identifier for the agent processing the wager
- `eventId`: Unique identifier for the sporting event
- `selectionId`: Unique identifier for the specific selection/bet
- `amountWagered`: Amount of money being wagered

### **Optional Fields**

- `customerNotes`: Customer's notes or comments about the wager
- `agentNotes`: Agent's internal notes about the wager
- `customFields`: Additional custom fields for special features
- `promotionalCode`: Promotional code for bonuses or discounts

### **System Fields**

- `wagerNumber`: Automatically generated unique wager number
- `createdAt`: Timestamp when the wager was created
- `status`: Current status of the wager
- `riskScore`: Calculated risk score (0-100)

## 📈 **Risk Assessment**

### **Risk Factors**

1. **Amount Risk**: Based on wager amount relative to customer limits
2. **Customer Risk**: Based on customer history and behavior
3. **Selection Risk**: Based on selection type and odds
4. **Event Risk**: Based on event type and timing

### **Risk Calculation**

```typescript
const riskScore = calculateRiskScore({
  amountRisk: getAmountRisk(amountWagered, customerLimits),
  customerRisk: getCustomerRisk(customerId),
  selectionRisk: getSelectionRisk(selectionId),
  eventRisk: getEventRisk(eventId),
});
```

### **Risk Levels**

- **Low (0-25)**: Standard validation, no approval required
- **Medium (26-50)**: Enhanced validation, agent approval required
- **High (51-75)**: Comprehensive validation, supervisor approval required
- **Extreme (76-100)**: Special validation, manager approval required

## 💰 **Commission Calculation**

### **Base Commission**

```typescript
const baseCommission = amountWagered * commission.baseRate;
```

### **Volume Bonus**

```typescript
const volumeBonus = amountWagered * commission.volumeBonus * volumeMultiplier;
```

### **Performance Bonus**

```typescript
const performanceBonus =
  amountWagered * commission.performanceBonus * performanceMultiplier;
```

### **Total Commission**

```typescript
const totalCommission = baseCommission + volumeBonus + performanceBonus;
```

## ✅ **Validation Rules**

### **Amount Validation**

- Minimum wager: $1
- Maximum wager: $10,000
- Must be within customer limits
- Must be within agent limits

### **Selection Validation**

- Must be a single selection
- Selection must be valid and active
- Odds must be current and valid
- Event must be open for betting

### **Customer Validation**

- Customer must be verified and active
- Customer must have sufficient balance
- Customer must not be restricted
- Customer must meet age requirements

### **Agent Validation**

- Agent must be authorized and active
- Agent must have sufficient limits
- Agent must be in good standing
- Agent must have proper permissions

## 🧪 **Testing Examples**

### **Valid Wager**

```typescript
const validWager = {
  ...straightWagerTemplate,
  customerId: 'CUST001',
  agentId: 'AGENT001',
  eventId: 'EVENT001',
  selectionId: 'SEL001',
  amountWagered: 100,
};

const validation = await wagerSystem.validateWager(validWager);
console.log('Valid:', validation.isValid);
console.log('Risk Score:', validation.riskScore);
```

### **Invalid Wager (Amount Too High)**

```typescript
const invalidWager = {
  ...straightWagerTemplate,
  customerId: 'CUST001',
  agentId: 'AGENT001',
  eventId: 'EVENT001',
  selectionId: 'SEL001',
  amountWagered: 15000, // Exceeds max amount
};

const validation = await wagerSystem.validateWager(invalidWager);
console.log('Valid:', validation.isValid);
console.log('Errors:', validation.errors);
```

## 🔄 **Settlement Examples**

### **Win Settlement**

```typescript
const settlement = await wagerSystem.settleWager({
  wagerNumber: wager.wagerNumber,
  settlementType: 'win',
  settledBy: 'AGENT001',
  settlementNotes: 'Selection won as expected',
});
```

### **Loss Settlement**

```typescript
const settlement = await wagerSystem.settleWager({
  wagerNumber: wager.wagerNumber,
  settlementType: 'loss',
  settledBy: 'AGENT001',
  settlementNotes: 'Selection lost',
});
```

### **Void Settlement**

```typescript
const settlement = await wagerSystem.settleWager({
  wagerNumber: wager.wagerNumber,
  settlementType: 'void',
  settledBy: 'AGENT001',
  settlementNotes: 'Event cancelled, wager voided',
});
```

## 📊 **Performance Metrics**

### **Expected Performance**

- **Validation Time**: < 1ms
- **Risk Calculation**: < 2ms
- **Commission Calculation**: < 1ms
- **Total Processing**: < 5ms

### **Memory Usage**

- **Base Memory**: < 1MB
- **Per Wager**: < 0.1MB
- **Template Cache**: < 0.5MB

## 🔍 **Troubleshooting**

### **Common Issues**

1. **Missing Required Fields**: Ensure all required fields are provided
2. **Invalid Amount**: Check amount is within valid range
3. **Customer Not Found**: Verify customer ID exists and is active
4. **Event Closed**: Ensure event is still open for betting

### **Debug Commands**

```bash
# Validate template structure
bun run test:wager:template --template=straight-wager

# Test validation rules
bun run test:wager:validation --template=straight-wager

# Performance benchmark
bun run benchmark:template --template=straight-wager
```

---

**🎯 Ready to use this template? Copy the structure and customize it for your
specific needs!**
