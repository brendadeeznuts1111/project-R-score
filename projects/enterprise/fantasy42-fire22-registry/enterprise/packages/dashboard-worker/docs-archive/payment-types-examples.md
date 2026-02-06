# Payment Types & Telegram Integration Examples

## 🚀 **Payment Reference System Overview**

The Fire22 Dashboard includes a comprehensive payment reference management
system that integrates seamlessly with Telegram bot functionality for real-time
notifications and user management.

**📊 Current System Version: 3.0.8** - Enhanced with Bun runtime integration and
advanced versioning

## 💰 **Payment Reference Structure**

### **Reference Format**

```text
PAY-{timestamp}-{random}
Example: PAY-20241219-001-A1B2C3
```

### **Components**

- **PAY**: Fixed prefix for payment references
- **{timestamp}**: Date in YYYYMMDD format
- **{random}**: 6-character alphanumeric random string

## 🔧 **System Configuration**

### **Environment Variables**

```bash
# Payment System Configuration
PAYMENT_SYSTEM_ENABLED=true
PAYMENT_REFERENCE_PREFIX=PAY
PAYMENT_MAX_AMOUNT=100000.00
PAYMENT_MIN_AMOUNT=1.00
PAYMENT_AUTO_APPROVAL_LIMIT=1000.00
PAYMENT_TELEGRAM_NOTIFICATIONS=true

# Supported Currencies
PAYMENT_CURRENCIES=USD,EUR,GBP,JPY

# Payment Statuses
PAYMENT_STATUSES=pending,processing,completed,failed,cancelled
```

### **Package.json Configuration**

```json
{
  "features": {
    "paymentSystem": {
      "enabled": true,
      "referenceFormat": "PAY-{timestamp}-{random}",
      "autoGeneration": true,
      "validation": {
        "minAmount": 1.0,
        "maxAmount": 100000.0,
        "requiredFields": ["amount", "notes", "userId"]
      },
      "telegram": {
        "notifications": true,
        "commands": [
          "/payment",
          "/payment-status",
          "/create-payment",
          "/payment-history"
        ]
      },
      "currencies": ["USD", "EUR", "GBP", "JPY"],
      "statuses": ["pending", "processing", "completed", "failed", "cancelled"]
    }
  }
}
```

## 🆕 **Enhanced Versioning System Integration**

### **Current Version Status**

- **Version**: 3.0.8
- **Build Number**: 1756255952096
- **Last Updated**: 2025-08-27T00:52:32.096Z
- **Modular Packages**: 4 active packages
- **Build Profiles**: 5 available configurations

### **Bun Runtime Integration**

The payment system now leverages Bun runtime capabilities for enhanced
performance:

````typescript
// Enhanced payment processing with Bun runtime
```javascript
import { randomUUIDv7 } from "bun";
````text

class EnhancedPaymentProcessor { async createPayment(amount: number, notes:
string, userId: string) { const startTime = performance.now();

    // Generate unique payment reference with Bun UUID
    const paymentId = randomUUIDv7();
    const reference = `PAY-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${paymentId.slice(0, 6)}`;

    // Process payment with performance monitoring
    const payment = await this.processPayment({
      reference,
      amount,
      notes,
      userId,
      timestamp: new Date().toISOString()
    });

    const duration = performance.now() - startTime;
    console.log(`Payment processed in ${duration.toFixed(2)}ms`);

    return payment;

}

async sleep(ms: number) { // Use Bun's optimized sleep function await
Bun.sleep(ms); } }

````

### **Version Management Commands**
```bash
# Check current system version
bun run version:status

# Update payment system version
bun run version:patch

# View payment system configuration
bun pm pkg get config.features.paymentSystem

# Test payment system integration
bun run payment:test
````

## 📱 **Telegram Bot Integration**

### **Available Commands**

- `/payment` - Show payment management menu
- `/payment-status [reference]` - Check specific payment status
- `/create-payment [amount] [notes]` - Create new payment
- `/payment-history` - View user's payment history

### **Example Usage**

```text
/payment-status PAY-20241219-001-A1B2C3
/create-payment 50.00 "Premium subscription"
/payment-history
```

### **Notification System**

- **Payment Creation**: Instant notification when payment is created
- **Status Updates**: Real-time updates when payment status changes
- **User Linking**: Automatic linking via Telegram username

## 🗄️ **Database Schema**

### **Payments Table**

```sql
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_reference TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  telegram_username TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  status TEXT DEFAULT 'pending',
  payment_type TEXT DEFAULT 'manual',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_payments_reference ON payments(payment_reference);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
```

### **User Schema Integration**

```sql
-- Users table with Telegram integration
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  telegram_id INTEGER UNIQUE,
  telegram_username TEXT,
  fire22_account_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 **CLI Commands**

### **Payment Management**

```bash
# Complete demo
bun run payment:demo

# Specific functionality
bun run payment:create
bun run payment:status
bun run payment:history
bun run payment:telegram
bun run payment:test
```

### **Configuration Management**

```bash
# Check payment system status
bun pm pkg get config.features.paymentSystem.enabled

# Update payment limits
bun pm pkg set config.features.paymentSystem.validation.maxAmount=50000.00

# View Telegram commands
bun pm pkg get config.features.paymentSystem.telegram.commands
```

### **Enhanced System Commands**

```bash
# Version management
bun run version:status
bun run version:patch
bun run version:minor
bun run version:major

# Build system
bun run build:quick
bun run build:production
bun run build:packages

# Package management
bun run package:info
bun run package:core
bun run package:summary

# Testing and validation
bun run test:quick
bun run test:checklist
bun run env:validate
bun run env:integration
```

## 📊 **API Endpoints**

### **Payment Management**

```typescript
// Create new payment
POST /api/payments/create
{
  "userId": "user123",
  "telegramUsername": "john_doe",
  "amount": 99.99,
  "currency": "USD",
  "notes": "Premium subscription"
}

// Get payment by reference
GET /api/payments/:reference
Response: {
  "reference": "PAY-20241219-001-A1B2C3",
  "userId": "user123",
  "amount": 99.99,
  "currency": "USD",
  "status": "pending",
  "createdAt": "2024-12-19T10:00:00Z"
}

// Update payment status
PUT /api/payments/:reference/status
{
  "status": "completed"
}

// Get user payment history
GET /api/payments/user/:userId
Response: [
  {
    "reference": "PAY-20241219-001-A1B2C3",
    "amount": 99.99,
    "status": "completed",
    "createdAt": "2024-12-19T10:00:00Z"
  }
]
```

## 🔒 **Security Features**

### **Validation Rules**

- **Amount Limits**: Configurable min/max amounts
- **Required Fields**: Enforced validation for all payments
- **Currency Support**: Limited to supported currencies
- **Reference Uniqueness**: Guaranteed unique payment references

### **Access Control**

- **User Authentication**: Required for all payment operations
- **Telegram Verification**: Username linking for notifications
- **Audit Trail**: Complete payment history tracking
- **Status Management**: Controlled status transitions

## 📈 **Business Benefits**

### **Automation**

- **Auto-generated References**: No manual reference creation
- **Instant Notifications**: Real-time status updates
- **User Self-Service**: Direct payment management via Telegram
- **Audit Compliance**: Complete payment trail

### **Integration**

- **Fire22 Dashboard**: Seamless payment tracking
- **Telegram Bot**: Real-time user communication
- **Database**: Unified payment management
- **API**: RESTful payment operations
- **Bun Runtime**: Enhanced performance and capabilities

## 🧪 **Testing & Validation**

### **Demo Scripts**

```bash
# Run complete payment system demo
bun run payment:demo

# Test specific functionality
bun run payment:create    # Test payment creation
bun run payment:status    # Test status checking
bun run payment:history   # Test history retrieval
bun run payment:telegram  # Test Telegram integration
```

### **Validation Commands**

```bash
# Environment validation
bun run env:validate

# Payment system test
bun run payment:test

# Integration testing
bun run test:integration

# Comprehensive testing
bun run test:checklist
```

### **Enhanced Testing Framework**

The payment system now includes comprehensive testing with the enhanced testing
framework:

```bash
# Quick health check
bun run test:quick

# Full system validation
bun run test:checklist

# Health monitoring
bun run health:comprehensive

# Environment integration
bun run env:integration
```

## 🔄 **Workflow Examples**

### **Payment Creation Flow**

1. User sends `/create-payment 50.00 "Test payment"` via Telegram
2. System validates amount and creates payment
3. Auto-generates reference: `PAY-20241219-004-I9J0K1`
4. Sends confirmation notification to user
5. Updates database with payment record

### **Status Update Flow**

1. Admin updates payment status to "completed"
2. System processes status change
3. Sends notification to user via Telegram
4. Updates payment record with timestamp
5. Triggers any post-completion actions

### **User History Flow**

1. User requests `/payment-history` via Telegram
2. System retrieves user's payment history
3. Formats response with payment details
4. Sends formatted history to user
5. Includes status and amount information

## 📱 **Telegram Bot Response Examples**

### **Payment Creation Response**

```text
✅ Payment Created Successfully!

📋 Reference: PAY-20241219-004-I9J0K1
💰 Amount: USD 50.00
📝 Notes: Test payment
📅 Created: 2024-12-19 15:30:00
📊 Status: pending

You will receive updates when the status changes.
```

### **Payment Status Response**

```text
🔍 Payment Status: PAY-20241219-001-A1B2C3

💰 Amount: USD 150.00
📝 Notes: Monthly subscription payment
📊 Status: completed
📅 Created: 2024-12-19 10:00:00
✅ Processed: 2024-12-19 10:05:00
```

### **Payment History Response**

```text
📚 Your Payment History (3 payments)

1. PAY-20241219-001-A1B2C3
   💰 USD 150.00 | ✅ completed
   📅 2024-12-19

2. PAY-20241219-004-I9J0K1
   💰 USD 50.00 | ⏳ pending
   📅 2024-12-19

3. PAY-20241218-002-X7Y8Z9
   💰 USD 75.50 | ✅ completed
   📅 2024-12-18
```

## 🚀 **Quick Start Guide**

### **1. Enable Payment System**

```bash
bun pm pkg set config.features.paymentSystem.enabled=true
```

### **2. Configure Payment Limits**

```bash
bun pm pkg set config.features.paymentSystem.validation.maxAmount=100000.00
bun pm pkg set config.features.paymentSystem.validation.minAmount=1.00
```

### **3. Test Payment System**

```bash
bun run payment:demo
```

### **4. Validate Integration**

```bash
bun run payment:test
bun run test:integration
```

### **5. Check System Version**

```bash
bun run version:status
bun run package:info
```

## 🔗 **Related Documentation**

- [Fire22 Dashboard Configuration](./fire22-dashboard-config.html)
- [Environment Variables Management](./environment-variables.html)
- [Telegram Integration Guide](./TELEGRAM-INTEGRATION-ENHANCEMENT.md)
- [API Integration Guide](./fire22-api-integration.html)
- [Build System Documentation](./BUILD-SYSTEM.md)
- [Package Management](./packages.html)

## 📞 **Support & Troubleshooting**

### **Common Issues**

- **Payment Creation Fails**: Check amount validation limits
- **Telegram Notifications**: Verify bot token and username linking
- **Reference Generation**: Ensure system is enabled in configuration
- **Database Errors**: Check schema and connection
- **Version Conflicts**: Verify system version compatibility

### **Debug Commands**

```bash
# Check payment system status
bun pm pkg get config.features.paymentSystem

# Test Telegram integration
bun run payment:telegram

# Validate environment
bun run env:validate

# Check system health
bun run test:quick
bun run health:comprehensive

# View system version
bun run version:status
bun run package:info
```

---

**🎯 The Payment Reference System is now fully integrated with your Fire22
Dashboard version 3.0.8!**

**🚀 Enhanced with Bun runtime integration, advanced versioning, and
comprehensive testing framework.**

**Ready to test? Run: `bun run payment:demo`** 🚀
