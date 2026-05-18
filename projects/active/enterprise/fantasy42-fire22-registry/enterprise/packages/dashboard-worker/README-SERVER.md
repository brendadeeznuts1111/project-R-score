# Fire22 Dashboard Server

Enhanced Express.js server with PostgreSQL support and Fire22 API compatibility.

## 🚀 Features

### ✅ **Fire22 API Compatibility**

- **Real Fire22 Endpoints**: Matches actual Fire22 API structure
- **Authentication**: Bearer token support
- **Data Format**: Exact Fire22 response format
- **Agent Hierarchy**: Multi-level agent management

### ✅ **Database Support**

- **PostgreSQL**: Production-ready database
- **Fire22 Schema**: Matches real Fire22 data structure
- **Fallback Mode**: Simulated data when DB unavailable
- **Auto-Detection**: Automatically detects Fire22 schema

### ✅ **API Endpoints**

#### **Manager APIs**

- `POST /api/manager/getLiveWagers` - Get pending wagers
- `POST /api/manager/getCustomerAdmin` - Customer management
- `POST /api/manager/getAgentPerformance` - Agent statistics
- `POST /api/manager/getWeeklyFigureByAgent` - Weekly reports

#### **Customer APIs**

- `POST /api/customer/getHeriarchy` - Agent hierarchy

#### **Admin APIs**

- `POST /api/admin/import-customers` - Bulk customer import
- `GET /health` - System health check
- `GET /dashboard` - Dashboard interface

## 🛠 Setup

### **1. Install Dependencies**

```bash
npm install
```

### **2. Environment Setup**

Create `.env` file:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/fire22_dashboard
NODE_ENV=development
PORT=3000
```

### **3. Database Setup**

```bash
# Setup Fire22 schema and sample data
npm run setup-db

# Or manually with PostgreSQL
createdb fire22_dashboard
npm run setup-db
```

### **4. Start Server**

```bash
# Development mode with auto-reload
npm run dev-server

# Production mode
npm start

# With real database
npm run dev-real
```

## 📊 Usage

### **Test API Endpoints**

```bash
# Test live wagers
curl -X POST http://localhost:3000/api/manager/getLiveWagers \
  -H "Content-Type: application/json" \
  -d '{"agentID": "BLAKEPPH"}'

# Test customer admin
curl -X POST http://localhost:3000/api/manager/getCustomerAdmin \
  -H "Content-Type: application/json" \
  -d '{"agentID": "VALL"}'

# Health check
curl http://localhost:3000/health
```

### **Import Fire22 Data**

```bash
curl -X POST http://localhost:3000/api/admin/import-customers \
  -H "Content-Type: application/json" \
  -d '{
    "customers": [
      {
        "customer_id": "BBS120",
        "name": "Test Customer",
        "balance": 1000,
        "agent_id": "VALL"
      }
    ]
  }'
```

## 🔧 Configuration

### **Database Modes**

1. **PostgreSQL Mode**: Full Fire22 schema with real data
2. **Simulated Mode**: Mock data when database unavailable
3. **Hybrid Mode**: Falls back gracefully

### **Fire22 Schema Detection**

Server automatically detects Fire22 tables:

- `players` - Customer data
- `wagers` - Betting data
- `agents` - Agent hierarchy

### **API Response Format**

Matches Fire22 exactly:

```json
{
  "success": true,
  "data": {
    "wagers": [...],
    "totalWagers": 10,
    "totalVolume": 5750,
    "totalRisk": 15151
  }
}
```

## 🎯 Integration

### **With Cloudflare Workers**

This server complements the Cloudflare Worker:

- **Worker**: Production edge deployment
- **Server**: Local development and testing
- **Shared**: Same API format and data structure

### **With Fire22 System**

- **API Compatible**: Drop-in replacement for Fire22 APIs
- **Data Format**: Exact match with Fire22 responses
- **Authentication**: Bearer token support
- **Hierarchy**: Multi-level agent structure

## 📈 Monitoring

### **Health Check**

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "status": "ok",
  "database": "connected",
  "fire22Schema": "detected",
  "tables": "real",
  "timestamp": "2025-08-26T10:30:00.000Z"
}
```

### **Logs**

Server provides detailed logging:

- 🚀 Startup information
- 💾 Database connection status
- 🔥 Fire22 schema detection
- 📊 API endpoint availability

## 🔒 Security

### **Production Considerations**

- Enable SSL for database connections
- Use environment variables for secrets
- Implement proper JWT validation
- Add rate limiting
- Enable CORS properly

### **Development**

- Basic authentication validation
- CORS enabled for localhost
- Detailed error messages
- Auto-reload with nodemon

## 🚨 Troubleshooting

### **Database Issues**

```bash
# Check connection
npm run setup-db

# Reset database
dropdb fire22_dashboard
createdb fire22_dashboard
npm run setup-db
```

### **API Issues**

```bash
# Test server health
curl http://localhost:3000/health

# Check logs
npm run dev-server
```

### **Fire22 Schema**

If Fire22 schema not detected:

1. Check table names match exactly
2. Verify database connection
3. Run setup script again

## 📝 Development

### **Adding New Endpoints**

1. Add route in `server.js`
2. Follow Fire22 API format
3. Support both PostgreSQL and simulated modes
4. Add proper error handling

### **Database Changes**

1. Update `scripts/setup-database.js`
2. Add migration scripts
3. Test with both modes
4. Update documentation

This enhanced server provides a robust foundation for Fire22 dashboard
development with full PostgreSQL support and Fire22 API compatibility!
