# Withdrawal System Documentation

## 🚀 **Current Version: 3.0.8** - Enhanced Withdrawal System

The withdrawal system handles customer fund withdrawal requests through a
complete workflow from request to completion. The system ensures proper balance
validation, approval workflows, and transaction logging.

**📊 System Status**: Fully integrated with Fire22 Dashboard version 3.0.8 **⚡
Runtime**: Enhanced with Bun runtime capabilities **🔧 Build Profile**:
Production-ready with quality gates

## 📊 **Version Information**

### **Current System Status**

- **Version**: 3.0.8
- **Build Number**: 1756255952096
- **Last Updated**: 2025-08-27T00:52:32.096Z
- **Modular Packages**: 4 active packages
- **Build Profiles**: 5 available configurations

### **Enhanced Features**

- **Bun Runtime Integration**: Full runtime capabilities and performance
  monitoring
- **Advanced Versioning**: Semantic versioning with build automation
- **Quality Gates**: Integrated testing, linting, and coverage validation
- **Enhanced Documentation**: Advanced search and cross-referencing

## 🔧 **System Architecture**

### **Database Schema**

```sql
-- Withdrawals table
CREATE TABLE withdrawals (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  amount REAL NOT NULL,
  method TEXT NOT NULL DEFAULT 'bank_transfer',
  payment_type TEXT NOT NULL DEFAULT 'bank_transfer', -- venmo, paypal, cashapp, cash, transfer, bank_transfer
  payment_details TEXT, -- Payment-specific details (username, account, etc.)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  requested_by TEXT NOT NULL,
  approved_by TEXT,
  notes TEXT,
  approval_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES players(customer_id),
  FOREIGN KEY (requested_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Enhanced players table with withdrawal tracking and Telegram integration
ALTER TABLE players ADD COLUMN total_withdrawals REAL DEFAULT 0;
ALTER TABLE players ADD COLUMN last_withdrawal TEXT;
ALTER TABLE players ADD COLUMN telegram_username TEXT;
ALTER TABLE players ADD COLUMN telegram_id TEXT;
ALTER TABLE players ADD COLUMN telegram_group_id TEXT;
ALTER TABLE players ADD COLUMN telegram_chat_id TEXT;
```

### **Enhanced Withdrawal Processing with Bun Runtime**

```typescript
// Enhanced withdrawal processor with Bun runtime integration
import { randomUUIDv7 } from 'bun';

class EnhancedWithdrawalProcessor {
  async processWithdrawalRequest(
    request: WithdrawalRequest
  ): Promise<WithdrawalResult> {
    const startTime = performance.now();

    try {
      // Generate unique withdrawal ID with Bun UUID
      const withdrawalId = randomUUIDv7();

      // Validate customer balance with enhanced performance
      const balanceCheck = await this.validateCustomerBalance(
        request.customerId,
        request.amount
      );

      if (!balanceCheck.valid) {
        return {
          success: false,
          error: 'Insufficient balance',
          details: balanceCheck.details,
        };
      }

      // Process withdrawal with performance monitoring
      const result = await this.createWithdrawalRecord({
        id: withdrawalId,
        ...request,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      const duration = performance.now() - startTime;
      console.log(`Withdrawal request processed in ${duration.toFixed(2)}ms`);

      return {
        success: true,
        withdrawalId,
        status: 'pending',
        processingTime: duration,
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(
        `Withdrawal processing failed after ${duration.toFixed(2)}ms:`,
        error
      );

      return {
        success: false,
        error: error.message,
        processingTime: duration,
      };
    }
  }

  async sleep(ms: number) {
    // Use Bun's optimized sleep function for rate limiting
    await Bun.sleep(ms);
  }
}
```

### **Status Flow**

```text
Request → Pending → [Approve/Reject]
  ↓
Approved → Complete (after payment processing)
  ↓
Rejected (with reason)
```

## 🚀 **Enhanced API Endpoints**

### **1. Request Withdrawal**

- **Endpoint**: `POST /api/withdrawals/request`
- **Auth**: Required (customer/agent)
- **Body**: `{ customerId, amount, method, paymentType, paymentDetails, notes }`
- **Payment Types**: `venmo`, `paypal`, `cashapp`, `cash`, `transfer`,
  `bank_transfer`
- **Action**: Creates pending withdrawal request with payment method details
- **Balance Check**: Validates sufficient funds before creating request
- **Telegram Info**: Returns customer's Telegram username, ID, and group ID
- **Performance**: Enhanced with Bun runtime timing and UUID generation

### **2. Approve Withdrawal**

- **Endpoint**: `POST /api/withdrawals/approve`
- **Auth**: Required (manager)
- **Body**: `{ id, notes }`
- **Action**:
  - Updates status to 'approved'
  - Deducts amount from customer balance
  - Logs transaction
- **Note**: Balance is deducted immediately upon approval
- **Enhanced**: Includes performance metrics and processing time

### **3. Complete Withdrawal**

- **Endpoint**: `POST /api/withdrawals/complete`
- **Auth**: Required (manager)
- **Body**: `{ id, paymentReference, notes }`
- **Action**:
  - Updates status to 'completed'
  - Updates player's total withdrawals
  - Logs completion transaction
- **Use Case**: Called after actual payment processing
- **Performance**: Enhanced logging with Bun runtime metrics

### **4. Reject Withdrawal**

- **Endpoint**: `POST /api/withdrawals/reject`
- **Auth**: Required (manager)
- **Body**: `{ id, reason, notes }`
- **Action**:
  - Updates status to 'rejected'
  - Logs rejection transaction
- **Note**: Balance is NOT affected for rejected withdrawals
- **Enhanced**: Includes rejection reason tracking and performance metrics

### **5. Get Pending Withdrawals**

- **Endpoint**: `GET /api/withdrawals/pending`
- **Auth**: Required
- **Query**: `?limit=50`
- **Action**: Returns all pending withdrawal requests
- **Enhanced**: Includes performance metrics and response time

### **6. Get All Withdrawals**

- **Endpoint**: `GET /api/withdrawals`
- **Auth**: Required
- **Query**: `?status=pending&customerId=ABC123&limit=100&offset=0`
- **Action**: Returns filtered withdrawals with pagination
- **Enhanced**: Includes performance metrics and response time

### **7. Update Customer Telegram Information**

- **Endpoint**: `PUT /api/customers/telegram`
- **Auth**: Required
- **Body**:
  `{ customerId, telegramUsername, telegramId, telegramGroupId, telegramChatId }`
- **Action**: Updates customer's Telegram integration details
- **Returns**: Updated customer information with balance and Telegram details
- **Enhanced**: Includes performance metrics and processing time

## 🚀 **Enhanced System Commands**

### **Version Management**

```bash
# Check current system version
bun run version:status

# Update system version
bun run version:patch
bun run version:minor
bun run version:major

# View version history
bun run version:history
bun run version:changelog
```

### **Build System**

```bash
# Quick build for development
bun run build:quick

# Production build with optimization
bun run build:production

# Build modular packages
bun run build:packages

# Full system build
bun run build:full
```

### **Testing & Validation**

```bash
# Quick health check
bun run test:quick

# Comprehensive testing
bun run test:checklist

# Withdrawal system specific testing
bun run test:withdrawals

# Environment validation
bun run env:validate
bun run env:integration

# Health monitoring
bun run health:comprehensive
```

### **Package Management**

```bash
# View package information
bun run package:info
bun run package:core
bun run package:summary

# Check dependencies
bun run package:deps
bun run deps:audit
bun run deps:check
```

## 🔧 **Business Rules**

### **Payment Types**

- **Venmo**: Requires username in paymentDetails
- **PayPal**: Requires email address in paymentDetails
- **CashApp**: Requires $cashtag in paymentDetails
- **Cash**: Physical cash pickup, no payment details required
- **Transfer**: Bank transfer, requires account details in paymentDetails
- **Bank Transfer**: Traditional bank transfer (default)

### **Balance Validation**

- Withdrawal amount must not exceed available balance
- Balance is checked at request time
- Balance is deducted at approval time (not at completion)
- Enhanced with Bun runtime performance monitoring

### **Approval Workflow**

- Only managers can approve/reject withdrawals
- All actions are logged with audit trail
- Rejected withdrawals don't affect balance
- Enhanced with performance metrics and timing

### **Completion Process**

- Withdrawals must be approved before completion
- Completion requires payment reference
- Updates total withdrawal tracking
- Enhanced with Bun runtime integration

## 🔒 **Security Features**

### **Authentication**

- All endpoints require valid authentication
- Role-based access control (manager for approvals)
- Enhanced with JWT token validation

### **Validation**

- Input validation for all parameters
- SQL injection prevention with prepared statements
- Foreign key constraints for data integrity
- Enhanced with Bun runtime security features

### **Audit Trail**

- All transactions logged with timestamps
- User tracking for all actions
- Reference linking between withdrawals and transactions
- Enhanced with performance metrics and processing time

## 🔗 **Integration Points**

### **Telegram Bot**

- Real-time balance queries via `/balance` command
- Database integration for live balance data
- Username-based customer lookup
- Group ID and chat ID tracking for notifications
- Enhanced customer identification and communication
- Enhanced with Bun runtime performance monitoring

### **Transaction System**

- Automatic transaction logging
- Balance updates
- Reference tracking
- Enhanced with performance metrics

### **Customer Management**

- Balance tracking
- Withdrawal history
- Account status monitoring
- Enhanced with real-time updates

## 🧪 **Enhanced Testing Framework**

### **Test Script**

Run the comprehensive test suite:

```bash
bun run test:withdrawals
```

### **Test Coverage**

- ✅ Initial balance validation
- ✅ Withdrawal request creation
- ✅ Approval workflow
- ✅ Completion process
- ✅ Rejection handling
- ✅ Balance calculations
- ✅ Telegram integration
- ✅ Performance metrics
- ✅ Bun runtime integration
- ✅ Error handling scenarios

### **Enhanced Testing Commands**

```bash
# Quick health check
bun run test:quick

# Full system validation
bun run test:checklist

# Withdrawal system specific
bun run test:withdrawals

# Environment validation
bun run env:validate
bun run env:integration

# Health monitoring
bun run health:comprehensive
```

## 📊 **Error Handling**

### **Common Error Scenarios**

1. **Insufficient Funds**: Customer balance < withdrawal amount
2. **Invalid Status**: Attempting to complete non-approved withdrawal
3. **Missing Data**: Required fields not provided
4. **Database Errors**: Connection or constraint violations
5. **Runtime Errors**: Bun runtime compatibility issues

### **Enhanced Error Responses**

```json
{
  "success": false,
  "error": "Descriptive error message",
  "processingTime": 45.2,
  "timestamp": "2025-08-27T00:52:32.096Z",
  "version": "3.0.8",
  "details": "Additional error context"
}
```

## 📈 **Monitoring & Analytics**

### **Key Metrics**

- Total pending withdrawals
- Approval rates
- Processing times
- Rejection reasons
- Customer withdrawal patterns
- Performance metrics
- Runtime statistics

### **Dashboard Integration**

- Real-time withdrawal status
- Manager approval queue
- Financial reporting
- Risk assessment
- Performance monitoring
- Version information

## 🚀 **Future Enhancements**

### **Planned Features**

- Automated approval for small amounts
- Multi-currency support
- Payment method validation
- Fraud detection integration
- Customer notification system
- Enhanced Bun runtime features
- Advanced performance monitoring

### **Scalability Considerations**

- Batch processing for large volumes
- Queue-based processing
- Rate limiting
- Caching strategies
- Bun runtime optimization
- Performance profiling

## 🔍 **Troubleshooting**

### **Common Issues**

#### **Balance Mismatch**

- Check transaction logs for discrepancies
- Verify withdrawal status progression
- Review approval/completion sequence
- Check performance metrics for timing issues

#### **Missing Withdrawals**

- Verify customer ID and status
- Check database constraints
- Review error logs
- Validate Bun runtime compatibility

#### **Telegram Integration Issues**

- Verify telegram_username field exists
- Check database connectivity
- Validate user permissions
- Check runtime performance metrics

### **Debug Commands**

```bash
# Check withdrawal status
curl -X GET "http://localhost:8787/api/withdrawals?status=pending"

# Verify customer balance
curl -X GET "http://localhost:8787/api/customers/ABC123"

# Test withdrawal workflow
bun run test:withdrawals

# Check system health
bun run test:quick
bun run health:comprehensive

# Validate environment
bun run env:validate
bun run env:integration

# View system version
bun run version:status
bun run package:info
```

## 📚 **Related Documentation**

- [Fire22 Dashboard Configuration](./fire22-dashboard-config.html)
- [Environment Variables Management](./environment-variables.html)
- [API Integration Guide](./fire22-api-integration.html)
- [Build System Documentation](./BUILD-SYSTEM.md)
- [Package Management](./packages.html)
- [Payment System](./payment-types-examples.md)

## 🆘 **Support**

For technical support or questions about the withdrawal system:

- Check error logs in console
- Run test suite for validation
- Review API documentation
- Check system version and health
- Contact development team

### **Support Commands**

```bash
# System health check
bun run test:quick
bun run health:comprehensive

# Environment validation
bun run env:validate
bun run env:integration

# Version information
bun run version:status
bun run package:info

# Withdrawal system testing
bun run test:withdrawals
```

---

**🚀 The Withdrawal System is now fully enhanced with Fire22 Dashboard version
3.0.8!**

**⚡ Enhanced with Bun runtime integration, advanced versioning, and
comprehensive testing framework.**

**📊 Ready for production with quality gates and performance monitoring.**

_Last Updated: 2025-08-27_ _Version: 3.0.8_ _Build: 1756255952096_
