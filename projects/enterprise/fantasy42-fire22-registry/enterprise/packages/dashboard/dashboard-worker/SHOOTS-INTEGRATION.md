# SHOOTS Agent Integration - Drop-in Endpoints

Your `index-real-data.ts` now includes **4 drop-in endpoints** that expose the
exact SHOOTS agent data in Fire22 format. These endpoints are ready to use
immediately and match the JSON structure your dashboard expects.

## 🎯 New SHOOTS Agent Endpoints

### **1. Agent List (Fire22 Format)**

```bash
GET /api/manager/getAgents
```

**Response:**

```json
{
  "GENERAL": [
    {
      "AgentID": "SHOOTS",
      "SeqNumber": 5387,
      "Level": 6,
      "AgentType": "A",
      "Login": "SHOOTS",
      "HeadCountRateM": 0,
      "CrashRate": 0,
      ...
    }
  ]
}
```

### **2. SHOOTS Customers (with Balances & Settlement)**

```bash
GET /api/manager/getCustomersByAgent?agentID=SHOOTS
```

**Response:**

```json
[
  {
    "id": "BB2209",
    "username": "BB2209",
    "full_name": "j Tran",
    "balance": 0.76,
    "settlement_figure": 10000,
    "last_ticket": "2025-05-25T21:27:26.783Z",
    "created_at": "2025-02-26T..."
  },
  ...
]
```

### **3. SHOOTS KPI (Live Totals)**

```bash
GET /api/manager/getAgentKPI?agentID=SHOOTS
```

**Response:**

```json
{
  "total_settlement": 30200,
  "total_customers": 10,
  "active_customers": 3,
  "high_credit_customers": 3,
  "total_balance": -2544.62,
  "negative_balance_customers": 2,
  "recent_activity_customers": 4
}
```

### **4. SHOOTS Wagers (with Settlement Amounts)**

```bash
GET /api/manager/getWagersByAgent?agentID=SHOOTS&limit=10
```

**Response:**

```json
[
  {
    "id": 1001,
    "customer_id": "BB2322",
    "wager_number": 1001,
    "amount_wagered": 250.00,
    "settlement_figure": 0,
    "description": "Houston Texans -3.5",
    "status": "pending",
    "created_at": "2025-08-25T18:14:13.500Z",
    "username": "BB2322"
  },
  ...
]
```

## 🚀 Enhanced Dashboard Controls

Your dashboard now includes **4 new SHOOTS-specific buttons**:

- **🎯 Test SHOOTS Agent** - Tests all 4 endpoints and shows summary
- **👥 SHOOTS Customers** - Loads and displays SHOOTS customers
- **📊 SHOOTS KPI** - Shows SHOOTS agent performance metrics
- **🎲 SHOOTS Wagers** - Displays recent SHOOTS wagers

## 📊 Real SHOOTS Agent Data

Based on your actual Fire22 data, the SHOOTS agent manages:

### **Customer Profiles:**

- **High Credit ($10,000)**: j Tran, Santi, Lee Jones
- **Low Credit ($200)**: Taj
- **No Credit ($0)**: Chicago, ever, TJJ, Treetop, Nick Waters, Roberty Gypsy

### **Risk Analysis:**

- **Negative Balances**: Chicago (-$1,449.51), Roberty Gypsy (-$1,097.20)
- **Active Players**: Recent activity from Lee Jones, Roberty Gypsy
- **Dormant Accounts**: Santi (no LastTicket), several inactive since 2024

### **Settlement Tiers:**

- **Total Settlement**: $30,200 across 10 customers
- **High Credit**: 3 customers with $10,000+ limits
- **Risk Exposure**: 2 customers with negative balances

## 🔧 Setup Instructions

### **1. Run Database Schema (if not done)**

```bash
psql -d your_database -f fire22-enhanced-schema.sql
```

### **2. Load Sample SHOOTS Data**

```bash
psql -d your_database -f shoots-sample-data.sql
```

### **3. Deploy Enhanced Worker**

```bash
wrangler deploy
```

### **4. Test SHOOTS Integration**

```bash
# Test all endpoints
curl https://your-worker.workers.dev/api/manager/getAgents
curl https://your-worker.workers.dev/api/manager/getCustomersByAgent?agentID=SHOOTS
curl https://your-worker.workers.dev/api/manager/getAgentKPI?agentID=SHOOTS
curl https://your-worker.workers.dev/api/manager/getWagersByAgent?agentID=SHOOTS
```

## 📱 Dashboard Usage

### **Access Enhanced Dashboard:**

```
https://your-worker.workers.dev/dashboard
```

### **Test SHOOTS Integration:**

1. Click **"🎯 Test SHOOTS Agent"** - Tests all 4 endpoints
2. Click **"👥 SHOOTS Customers"** - View customer list with balances
3. Click **"📊 SHOOTS KPI"** - See agent performance metrics
4. Click **"🎲 SHOOTS Wagers"** - Browse recent betting activity

## 🎯 Key Features

### **Fire22 Format Compatibility**

- Exact JSON structure matching Fire22 API responses
- Field mapping preserves original Fire22 field names
- Compatible with existing Fire22 dashboard integrations

### **Real-time Data**

- Live customer balances and settlement figures
- Recent wager activity and status
- Agent performance KPIs
- Risk management metrics

### **Performance Optimized**

- Direct PostgreSQL queries for speed
- Efficient indexing on agent_id fields
- Pagination support for large datasets
- CORS headers for cross-origin requests

### **Error Handling**

- Comprehensive error responses
- Parameter validation
- Graceful fallbacks
- Detailed logging

## 📈 SHOOTS Agent Analytics

The endpoints provide rich analytics for the SHOOTS agent:

### **Customer Segmentation:**

- **VIP Customers**: High settlement figures ($10,000)
- **Standard Customers**: Medium settlement ($200)
- **Risk Customers**: Zero settlement, negative balances

### **Activity Monitoring:**

- **Recent Activity**: Last 30 days betting activity
- **Dormant Accounts**: Customers with no recent activity
- **High-Risk**: Negative balance monitoring

### **Financial Metrics:**

- **Total Exposure**: Sum of all settlement figures
- **Current Liability**: Sum of negative balances
- **Active Capital**: Positive balance customers
- **Credit Utilization**: Settlement vs. actual balance ratios

## 🔐 Security & Validation

### **Parameter Validation:**

- Required `agentID` parameter validation
- SQL injection prevention with parameterized queries
- Input sanitization and trimming

### **Access Control:**

- CORS headers configured for cross-origin access
- Error messages don't expose sensitive data
- Database connection pooling for security

## 🚨 Troubleshooting

### **Common Issues:**

1. **No SHOOTS customers found**

   - Run `shoots-sample-data.sql` to populate test data
   - Verify SHOOTS agent exists in agents table

2. **Database connection errors**

   - Check `DATABASE_URL` environment variable
   - Ensure PostgreSQL is running and accessible

3. **Empty KPI responses**
   - Verify customers table has `agent_id = 'SHOOTS'`
   - Check that settle_figure and actual_balance columns exist

### **Verification Queries:**

```sql
-- Check SHOOTS agent exists
SELECT * FROM agents WHERE agent_id = 'SHOOTS';

-- Check SHOOTS customers
SELECT COUNT(*) FROM customers WHERE agent_id = 'SHOOTS';

-- Check SHOOTS wagers
SELECT COUNT(*) FROM wagers w
JOIN customers c ON w.customer_id = c.customer_id
WHERE c.agent_id = 'SHOOTS';
```

---

## 🎉 Ready to Use!

Your SHOOTS agent integration is complete! The 4 drop-in endpoints provide
comprehensive access to SHOOTS agent data in Fire22 format, with real-time KPIs,
customer management, and wager tracking.

Visit `/dashboard` and click the SHOOTS buttons to see your agent data in
action! 🎯
