# 🔥 Fire22 Customer Configuration Integration Guide

## 🎯 **System Overview**

Your dashboard worker now has a complete, enterprise-grade **Customer
Configuration Management System** that complements the existing agent
configuration system with:

- ✅ **Customer Permissions**: Granular permission management per customer
- ✅ **Betting Limits**: Comprehensive betting limit configuration
- ✅ **VIP Status Management**: Multi-tier VIP system with benefits
- ✅ **Risk Profile Control**: Risk-based betting restrictions
- ✅ **Account Settings**: Customer-specific account preferences
- ✅ **Real-time Updates**: Live configuration changes
- ✅ **Dashboard Integration**: Complete customer management UI

## 🚀 **New Customer Configuration API Endpoints**

### **1. Customer Configuration Management**

```bash
# Get customer configuration
GET /api/customer-config?customerId=CUST001

# Create/Update customer configuration
POST /api/customer-config
Body: {
  "customer_id": "CUST001",
  "agent_id": "BLAKEPPH",
  "permissions": { /* permissions object */ },
  "betting_limits": { /* limits object */ },
  "account_settings": { /* settings object */ },
  "vip_status": { /* vip object */ },
  "risk_profile": { /* risk object */ },
  "created_by": "admin"
}

# List customer configurations
GET /api/customer-config/list?agentId=BLAKEPPH&status=active

# Update customer configuration
PUT /api/customer-config/update
Body: {
  "customer_id": "CUST001",
  "updates": { /* partial updates */ },
  "updated_by": "admin"
}
```

## 📊 **Customer Configuration Schema**

### **Core Customer Configuration**

```typescript
interface CustomerConfig {
  customer_id: string; // Unique customer identifier
  agent_id: string; // Associated agent ID
  permissions: CustomerPermissions;
  betting_limits: BettingLimits;
  account_settings: AccountSettings;
  vip_status: VIPStatus;
  risk_profile: RiskProfile;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  status: 'active' | 'suspended' | 'pending' | 'blocked';
  notes?: string;
}
```

### **Customer Permissions**

```typescript
interface CustomerPermissions {
  can_place_bets: boolean; // Can place new wagers
  can_modify_info: boolean; // Can modify account information
  can_withdraw: boolean; // Can withdraw funds
  can_deposit: boolean; // Can deposit funds
  can_view_history: boolean; // Can view betting history
  can_use_telegram: boolean; // Can use Telegram bot
  can_use_mobile: boolean; // Can access mobile interface
  can_use_desktop: boolean; // Can access desktop interface
}
```

### **Betting Limits**

```typescript
interface BettingLimits {
  max_single_bet: number; // Maximum single wager amount
  max_daily_bet: number; // Maximum daily betting total
  max_weekly_bet: number; // Maximum weekly betting total
  max_monthly_bet: number; // Maximum monthly betting total
  min_bet: number; // Minimum wager amount
}
```

### **Account Settings**

```typescript
interface AccountSettings {
  auto_logout_minutes: number; // Auto-logout timeout
  session_timeout_hours: number; // Session expiration
  require_2fa: boolean; // Two-factor authentication required
  allow_remember_me: boolean; // Remember login option
  notification_preferences: {
    email: boolean; // Email notifications
    sms: boolean; // SMS notifications
    telegram: boolean; // Telegram notifications
    push: boolean; // Push notifications
  };
}
```

### **VIP Status System**

```typescript
interface VIPStatus {
  level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  benefits: string[]; // VIP benefits list
  special_rates: number; // Special commission rates
  priority_support: boolean; // Priority customer support
}
```

### **Risk Profile**

```typescript
interface RiskProfile {
  risk_level: 'low' | 'medium' | 'high' | 'extreme';
  max_exposure: number; // Maximum exposure limit
  daily_loss_limit: number; // Daily loss limit
  weekly_loss_limit: number; // Weekly loss limit
  monthly_loss_limit: number; // Monthly loss limit
}
```

## ⚙️ **Setup Instructions**

### **1. Database Schema**

The customer configuration system requires a `customer_configs` table:

```sql
CREATE TABLE customer_configs (
  customer_id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  permissions TEXT NOT NULL,           -- JSON string
  betting_limits TEXT NOT NULL,        -- JSON string
  account_settings TEXT NOT NULL,      -- JSON string
  vip_status TEXT NOT NULL,            -- JSON string
  risk_profile TEXT NOT NULL,          -- JSON string
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,

  FOREIGN KEY (agent_id) REFERENCES agent_configs(agent_id)
);

CREATE INDEX idx_customer_configs_agent_id ON customer_configs(agent_id);
CREATE INDEX idx_customer_configs_status ON customer_configs(status);
CREATE INDEX idx_customer_configs_vip_level ON customer_configs(vip_status);
```

### **2. Environment Variables**

No additional environment variables are required for the customer configuration
system.

### **3. CLI Commands**

Use these commands to manage customer configurations:

```bash
# Run complete customer configuration demo
bun run customer:config

# Create new customer configuration
bun run customer:config:create

# List all customer configurations
bun run customer:config:list

# Update existing customer configuration
bun run customer:config:update

# Test all customer configuration endpoints
bun run customer:config:test
```

## 📋 **Usage Examples**

### **Creating a New Customer Configuration**

```bash
curl -X POST "https://your-worker.workers.dev/api/customer-config" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "CUST001",
    "agent_id": "BLAKEPPH",
    "permissions": {
      "can_place_bets": true,
      "can_modify_info": true,
      "can_withdraw": true,
      "can_deposit": true,
      "can_view_history": true,
      "can_use_telegram": true,
      "can_use_mobile": true,
      "can_use_desktop": true
    },
    "betting_limits": {
      "max_single_bet": 10000,
      "max_daily_bet": 50000,
      "max_weekly_bet": 200000,
      "max_monthly_bet": 500000,
      "min_bet": 10
    },
    "account_settings": {
      "auto_logout_minutes": 30,
      "session_timeout_hours": 24,
      "require_2fa": true,
      "allow_remember_me": true,
      "notification_preferences": {
        "email": true,
        "sms": true,
        "telegram": true,
        "push": false
      }
    },
    "vip_status": {
      "level": "gold",
      "benefits": ["Priority Support", "Special Rates", "Exclusive Events"],
      "special_rates": 0.95,
      "priority_support": true
    },
    "risk_profile": {
      "risk_level": "medium",
      "max_exposure": 100000,
      "daily_loss_limit": 5000,
      "weekly_loss_limit": 15000,
      "monthly_loss_limit": 50000
    },
    "created_by": "admin"
  }'
```

### **Updating Customer Configuration**

```bash
curl -X PUT "https://your-worker.workers.dev/api/customer-config/update" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "CUST001",
    "updates": {
      "vip_status": {
        "level": "platinum",
        "benefits": ["Priority Support", "Special Rates", "Exclusive Events", "VIP Lounge Access"],
        "special_rates": 0.90,
        "priority_support": true
      },
      "betting_limits": {
        "max_single_bet": 15000,
        "max_daily_bet": 75000,
        "max_weekly_bet": 300000,
        "max_monthly_bet": 750000,
        "min_bet": 15
      }
    },
    "updated_by": "admin"
  }'
```

### **Listing Customer Configurations**

```bash
# List all active customers
curl "https://your-worker.workers.dev/api/customer-config/list?status=active"

# List customers for specific agent
curl "https://your-worker.workers.dev/api/customer-config/list?agentId=BLAKEPPH&status=active"
```

### **Getting Customer Configuration**

```bash
curl "https://your-worker.workers.dev/api/customer-config?customerId=CUST001"
```

## 🎯 **VIP Status Management**

### **VIP Levels and Benefits**

| VIP Level    | Benefits                                          | Special Rates | Priority Support |
| ------------ | ------------------------------------------------- | ------------- | ---------------- |
| **Bronze**   | Basic Support                                     | 1.0x          | ❌               |
| **Silver**   | Standard Support                                  | 1.0x          | ❌               |
| **Gold**     | Priority Support, Special Rates, Exclusive Events | 0.95x         | ✅               |
| **Platinum** | Gold + VIP Lounge Access                          | 0.90x         | ✅               |
| **Diamond**  | Platinum + Personal Manager                       | 0.85x         | ✅               |

### **VIP Benefits Examples**

```typescript
const vipBenefits = {
  bronze: ['Basic Support'],
  silver: ['Standard Support', 'Regular Rates'],
  gold: ['Priority Support', 'Special Rates', 'Exclusive Events'],
  platinum: [
    'Priority Support',
    'Special Rates',
    'Exclusive Events',
    'VIP Lounge Access',
  ],
  diamond: [
    'Priority Support',
    'Special Rates',
    'Exclusive Events',
    'VIP Lounge Access',
    'Personal Manager',
  ],
};
```

## 🛡️ **Risk Management**

### **Risk Levels and Limits**

| Risk Level  | Max Exposure | Daily Loss Limit | Weekly Loss Limit | Monthly Loss Limit |
| ----------- | ------------ | ---------------- | ----------------- | ------------------ |
| **Low**     | $10,000      | $500             | $1,500            | $5,000             |
| **Medium**  | $100,000     | $5,000           | $15,000           | $50,000            |
| **High**    | $500,000     | $25,000          | $75,000           | $250,000           |
| **Extreme** | $1,000,000   | $50,000          | $150,000          | $500,000           |

### **Risk Profile Configuration**

```typescript
const riskProfiles = {
  low: {
    max_exposure: 10000,
    daily_loss_limit: 500,
    weekly_loss_limit: 1500,
    monthly_loss_limit: 5000,
  },
  medium: {
    max_exposure: 100000,
    daily_loss_limit: 5000,
    weekly_loss_limit: 15000,
    monthly_loss_limit: 50000,
  },
  high: {
    max_exposure: 500000,
    daily_loss_limit: 25000,
    weekly_loss_limit: 75000,
    monthly_loss_limit: 250000,
  },
  extreme: {
    max_exposure: 1000000,
    daily_loss_limit: 50000,
    weekly_loss_limit: 150000,
    monthly_loss_limit: 500000,
  },
};
```

## 🔄 **Integration with Agent Configuration**

### **Customer-Agent Relationship**

- Each customer is associated with exactly one agent
- Customer permissions inherit from agent permissions
- Customer betting limits can be more restrictive than agent limits
- VIP status is customer-specific and independent of agent status

### **Permission Inheritance**

```typescript
// Customer permissions are validated against agent permissions
function validateCustomerPermissions(
  customerPerms: CustomerPermissions,
  agentPerms: AgentPermissions
): boolean {
  return (
    (!customerPerms.can_place_bets || agentPerms.can_place_bets) &&
    (!customerPerms.can_withdraw || agentPerms.can_withdraw) &&
    (!customerPerms.can_deposit || agentPerms.can_deposit)
    // ... other validations
  );
}
```

## 📱 **Dashboard Integration**

### **Customer Configuration Dashboard**

The customer configuration system integrates with your existing dashboard:

- **Customer Overview**: List all customers with their configurations
- **Permission Management**: Visual permission editor
- **Betting Limits**: Limit configuration interface
- **VIP Management**: VIP level and benefit management
- **Risk Profiles**: Risk level configuration
- **Account Settings**: Customer preference management

### **Real-time Updates**

- Configuration changes are reflected immediately
- Dashboard updates in real-time
- Permission changes take effect instantly
- Betting limit updates apply to new wagers

## 🧪 **Testing and Validation**

### **Automated Testing**

```bash
# Run comprehensive customer configuration tests
bun run customer:config:test

# Test specific functionality
bun run customer:config:create  # Test creation
bun run customer:config:list    # Test listing
bun run customer:config:update  # Test updates
```

### **Test Scenarios**

1. **Permission Testing**: Verify permission restrictions work correctly
2. **Limit Validation**: Test betting limit enforcement
3. **VIP Benefits**: Verify VIP status benefits
4. **Risk Management**: Test risk profile restrictions
5. **Error Handling**: Test invalid input handling
6. **Integration**: Test with agent configuration system

## 🔒 **Security Features**

### **Permission Validation**

- All customer actions are validated against permissions
- Betting limits are enforced at the API level
- Risk profiles prevent excessive exposure
- Session timeouts are enforced

### **Audit Trail**

- All configuration changes are logged
- Change history is maintained
- User actions are tracked
- Configuration versions are preserved

## 📊 **Monitoring and Analytics**

### **Customer Metrics**

- **Active Customers**: Count of active customer configurations
- **VIP Distribution**: Breakdown by VIP level
- **Risk Distribution**: Breakdown by risk level
- **Permission Usage**: Most/least used permissions
- **Limit Utilization**: Betting limit usage patterns

### **Performance Metrics**

- **Configuration Load Time**: Time to load customer configs
- **Update Response Time**: Time to process configuration updates
- **Permission Check Time**: Time to validate permissions
- **Error Rates**: Configuration error frequency

## 🚀 **Next Steps**

### **Immediate Actions**

1. **Set Up Database**: Create the customer_configs table
2. **Test Endpoints**: Run the customer configuration demo
3. **Configure Customers**: Set up initial customer configurations
4. **Integrate Dashboard**: Add customer management to your UI

### **Advanced Features**

1. **Bulk Operations**: Import/export customer configurations
2. **Template System**: Predefined configuration templates
3. **Automated Rules**: Rule-based configuration updates
4. **Advanced Analytics**: Customer behavior analysis
5. **Integration APIs**: Connect with external systems

## 🔧 **Troubleshooting**

### **Common Issues**

#### **Customer Configuration Not Found**

- Verify customer ID exists
- Check database table structure
- Verify agent ID relationship

#### **Permission Validation Failed**

- Check agent permissions
- Verify permission inheritance
- Review permission configuration

#### **Betting Limits Not Applied**

- Verify limit configuration
- Check limit validation logic
- Review limit enforcement

#### **VIP Status Not Updating**

- Verify VIP level format
- Check benefit configuration
- Review status update logic

### **Debug Commands**

```bash
# Check customer configuration status
bun run customer:config:list

# Test specific customer
bun run customer:config:test

# Verify database connectivity
bun run test:quick
```

## 📞 **Support**

For issues or questions:

1. **Check Logs**: Review console and database logs
2. **Run Tests**: Use the testing commands to verify functionality
3. **Verify Configuration**: Check database schema and data
4. **Review Permissions**: Ensure proper permission setup

---

## 🎉 **Summary**

Your Fire22 Dashboard now includes a **comprehensive customer configuration
management system** that provides:

- **🔐 Granular Permissions**: 8 different permission types per customer
- **💰 Betting Limits**: 5 different limit categories with real-time enforcement
- **👑 VIP Management**: 5-tier VIP system with customizable benefits
- **⚠️ Risk Control**: 4 risk levels with comprehensive exposure management
- **⚙️ Account Settings**: Customer-specific preferences and timeouts
- **📱 Multi-Platform**: Support for web, mobile, and Telegram access
- **🔄 Real-time Updates**: Instant configuration changes
- **📊 Dashboard Integration**: Complete management interface

**🚀 Your customer configuration system is now enterprise-ready and fully
integrated with your existing agent configuration infrastructure!**

---

**Related Documentation:**

- [Fire22 Agent Configuration Guide](./FIRE22-INTEGRATION-GUIDE.md)
- [Environment Variables Management](./docs/environment-variables.html)
- [API Packages Documentation](./docs/api-packages.html)
