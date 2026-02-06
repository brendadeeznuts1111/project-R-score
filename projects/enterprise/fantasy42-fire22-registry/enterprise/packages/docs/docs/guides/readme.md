# 🚀 **Crystal Clear Architecture** - Enterprise-Grade Domain-Driven Dashboard System

<div align="center">

![Crystal Clear Architecture](https://img.shields.io/badge/Architecture-Domain--Driven-blue?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=for-the-badge)
![Bun](https://img.shields.io/badge/Bun-1.0+-yellow?style=for-the-badge)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange?style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Production--Ready-success?style=for-the-badge)

**Enterprise-grade domain-driven architecture reference implementation for
modern dashboard systems**

[📖 Documentation](https://brendadeeznuts1111.github.io/crystal-clear-architecture/)
•
[🚀 Live Dashboard](https://dashboard-worker.brendawill2233.workers.dev/dashboard)
•
[📊 Health Checks](https://dashboard-worker.brendawill2233.workers.dev/api/health)
• [🔍 API Docs](./docs/HEALTH-CHECK-API.md)

</div>

---

## 📋 **Table of Contents**

- [🎯 Overview](#-overview)
- [🏗️ Architecture](#️-architecture)
- [✨ Key Features](#-key-features)
- [🩺 Health Check API](#-health-check-api)
- [📊 Analytics System](#-analytics-system)
- [🎮 Fire22 Manager Dashboard](#-fire22-manager-dashboard)
- [🚀 Quick Start](#-quick-start)
- [📚 Documentation](#-documentation)
- [🛠️ Development](#️-development)
- [🏭 Production Deployment](#-production-deployment)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 🎯 **Overview**

**Crystal Clear Architecture** is a comprehensive, enterprise-grade
domain-driven architecture implementation that serves as the foundation for
modern dashboard systems. Built with TypeScript, Bun runtime, and Cloudflare
Workers, this project demonstrates best practices for scalable, maintainable,
and production-ready applications.

### **🎪 What Makes This Special**

- **🏗️ Domain-Driven Design (DDD)**: Clean separation of business domains with
  isolated concerns
- **⚡ High Performance**: Built on Bun runtime for lightning-fast execution
- **🔍 Comprehensive Monitoring**: 25+ health check endpoints for full system
  observability
- **📊 Real-time Analytics**: Live KPI streaming with Server-Sent Events
- **☁️ Cloud-Native**: Deployed on Cloudflare Workers for global scalability
- **🛡️ Enterprise Security**: Built-in authentication, SSL, and compliance
  features

---

## 🏗️ **Architecture**

```text
┌─────────────────────────────────────────────────────────────┐
│                    Crystal Clear Architecture               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Analytics     │  │  Health Check   │  │ Fire22      │ │
│  │   Dashboard     │  │   API System    │  │ Dashboard   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  Domain Layer   │  │ Service Layer   │  │ API Layer   │ │
│  │                 │  │                 │  │             │ │
│  │ • Finance       │  │ • Health        │  │ • REST      │ │
│  │ • Collections   │  │ • Analytics     │  │ • GraphQL   │ │
│  │ • Distributions │  │ • Performance   │  │ • WebSocket │ │
│  │ • Settlements   │  │ • Security      │  │             │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Cloudflare      │  │   PostgreSQL    │  │   Redis     │ │
│  │   Workers       │  │   Database      │  │   Cache     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### **🏛️ Architectural Principles**

- **Domain Isolation**: Each business domain operates independently
- **Clean Architecture**: Clear separation between layers and concerns
- **Event-Driven**: Asynchronous communication between components
- **Microservices-Ready**: Modular design supports horizontal scaling
- **API-First**: RESTful APIs with comprehensive documentation

---

## ✨ **Key Features**

### **🎯 Core Capabilities**

- ✅ **Real-time KPI Streaming** via Server-Sent Events
- ✅ **PostgreSQL Integration** with Drizzle ORM
- ✅ **25+ Health Check Endpoints** for comprehensive monitoring
- ✅ **Advanced Analytics Dashboard** with interactive visualizations
- ✅ **Domain-Driven Architecture** with 17+ business domains
- ✅ **Enterprise Security** with JWT, SSL, and compliance
- ✅ **Performance Monitoring** with automated metrics collection
- ✅ **Cloudflare Workers** deployment for global scalability

### **🔧 Technical Features**

- ✅ **TypeScript 5.0+** for type safety and developer experience
- ✅ **Bun Runtime** for high-performance JavaScript execution
- ✅ **Drizzle ORM** for type-safe database operations
- ✅ **Express.js Integration** for robust API development
- ✅ **Tailwind CSS** for responsive, modern UI components
- ✅ **Server-Sent Events** for real-time data streaming
- ✅ **Comprehensive Error Handling** with structured logging

---

## 🩺 **Health Check API**

### **📊 System Monitoring**

The Crystal Clear Architecture includes a comprehensive health check system with
**25+ endpoints** covering:

#### **System Resources**

- **CPU Usage & Load**: Real-time CPU monitoring with load averages
- **Memory Management**: Heap usage, garbage collection, memory pressure
- **Disk Space**: Filesystem monitoring with usage alerts
- **Network Interfaces**: Connectivity and bandwidth monitoring

#### **Database Health**

- **Connection Pool**: Active/idle connections, pool utilization
- **Query Performance**: Slow query detection, execution metrics
- **Migration Status**: Schema migrations and pending changes
- **Storage Metrics**: Database size, table counts, index health

#### **Application Monitoring**

- **Domain Health**: 17 business domains with individual status
- **Task Processing**: Background jobs, queue depth, failure rates
- **API Endpoints**: Endpoint availability, response times
- **Performance Metrics**: Throughput, error rates, latency tracking

#### **Security & Compliance**

- **Authentication**: Active sessions, failed attempts monitoring
- **SSL/TLS**: Certificate validity, expiration tracking
- **Firewall**: Blocked attempts, security rule monitoring
- **Compliance**: GDPR, SOC2 compliance status

### **🚀 Quick Health Check**

```bash
# Basic health check
curl https://dashboard-worker.brendawill2233.workers.dev/api/health

# Comprehensive system report
curl https://dashboard-worker.brendawill2233.workers.dev/api/health/comprehensive

# Prometheus metrics
curl https://dashboard-worker.brendawill2233.workers.dev/api/health/metrics
```

[📖 Complete Health Check API Documentation](./docs/HEALTH-CHECK-API.md)

---

## 📊 **Analytics System**

### **🎨 Interactive Dashboard**

The analytics system provides comprehensive data visualization and reporting
capabilities:

#### **Key Features**

- **Real-time Data Visualization** with interactive charts and graphs
- **Customizable Dashboards** with drag-and-drop interface
- **Performance Metrics** tracking across all system components
- **Historical Data Analysis** with trend identification
- **Export Capabilities** for reports and data analysis
- **Mobile-Responsive Design** optimized for all devices

#### **Analytics Capabilities**

- **KPI Monitoring**: Key performance indicators with alerts
- **Trend Analysis**: Historical data patterns and forecasting
- **Comparative Analysis**: Side-by-side metric comparisons
- **Custom Reports**: User-defined reporting and scheduling
- **Data Export**: Multiple formats (CSV, JSON, PDF)

### **📈 Analytics Dashboard**

Access the live analytics dashboard at:
**https://dashboard-worker.brendawill2233.workers.dev/analytics**

---

## 🎮 **Fire22 Manager Dashboard**

### **🏆 Production-Ready Dashboard**

The Fire22 Manager Dashboard is a fully-featured, production-ready management
interface deployed on Cloudflare Workers.

#### **Live Dashboard**

🌐 **https://dashboard-worker.brendawill2233.workers.dev/dashboard**

### **🎯 Dashboard Features**

#### **Real-time Monitoring**

- **Live KPI Streaming** via Server-Sent Events
- **Real-time Updates** without page refresh
- **Performance Metrics** with automatic refresh
- **System Health** indicators and alerts

#### **Management Capabilities**

- **Customer Management**: Complete customer lifecycle management
- **Transaction Processing**: Real-time transaction monitoring
- **Betting Operations**: Comprehensive betting system management
- **Financial Reporting**: Revenue, profit, and performance analytics

#### **Agent Management**

- **Agent Performance**: Weekly figures and KPIs by agent
- **Commission Tracking**: Real-time commission calculations
- **Agent Analytics**: Performance metrics and trends
- **Agent Communication**: Integrated messaging and notifications

### **📊 Database Integration**

#### **PostgreSQL Schema**

```sql
-- Core tables for Fire22 operations
customers      -- Customer information and profiles
bets          -- Betting records and transactions
transactions  -- Financial transaction history
balances      -- Customer account balances
freeplay      -- Freeplay balance management
pending_wagers -- Pending wager processing
```

#### **API Endpoints**

| Endpoint                              | Method | Description              |
| ------------------------------------- | ------ | ------------------------ |
| `/dashboard`                          | GET    | Main dashboard interface |
| `/api/live`                           | GET    | Real-time KPI streaming  |
| `/api/manager/getWeeklyFigureByAgent` | POST   | Agent performance data   |
| `/api/manager/getPending`             | POST   | Pending transactions     |
| `/api/manager/getCustomerDetails`     | GET    | Customer information     |
| `/api/manager/getTransactionHistory`  | POST   | Transaction history      |
| `/api/manager/getCustomerSummary`     | GET    | Customer summary         |
| `/api/manager/getTransactions`        | GET    | Customer transactions    |
| `/api/manager/getBets`                | GET    | Customer betting history |

---

## 🚀 **Quick Start**

### **1. Clone the Repository**

```bash
git clone https://github.com/brendadeeznuts1111/crystal-clear-architecture.git
cd crystal-clear-architecture
```

### **2. Install Dependencies**

```bash
# Install Bun runtime (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install project dependencies
bun install
```

### **3. Set Up Database**

```bash
# Set your PostgreSQL connection
export DATABASE_URL="postgresql://username:password@host:port/database_name"

# Run database schema
psql $DATABASE_URL -f schema.sql
```

### **4. Configure Environment**

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### **5. Run Health Check System**

```bash
# Start the health check API
node health-example.js

# Access health endpoints
curl http://localhost:3000/api/health
```

### **6. Deploy to Production**

```bash
# Deploy dashboard worker
cd dashboard-worker
wrangler deploy
```

---

## 📚 **Documentation**

### **📖 Complete Documentation**

- **[🏥 Health Check API](./docs/HEALTH-CHECK-API.md)** - Complete API reference
  for health monitoring
- **[📊 Analytics Guide](./analytics/README.md)** - Analytics system
  documentation
- **[🎮 Dashboard Manual](./dashboard-worker/README.md)** - Dashboard usage
  guide
- **[🏗️ Architecture Guide](./docs/ARCHITECTURE.md)** - System architecture
  documentation
- **[🚀 Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment
  instructions

### **🔗 Quick Links**

- **📊
  [Live Analytics](https://dashboard-worker.brendawill2233.workers.dev/analytics)**
- **🎮
  [Live Dashboard](https://dashboard-worker.brendawill2233.workers.dev/dashboard)**
- **🩺
  [Health Checks](https://dashboard-worker.brendawill2233.workers.dev/api/health)**
- **📋 [API Documentation](./docs/HEALTH-CHECK-API.md)**

---

## 🛠️ **Development**

### **🏃 Local Development**

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Run health check system
node health-example.js

# Build for production
bun run build
```

### **🧪 Testing**

```bash
# Run unit tests
bun test

# Run integration tests
bun run test:integration

# Run health check tests
bun run test:health
```

### **📦 Build Process**

```bash
# Build all components
bun run build:all

# Build dashboard worker
cd dashboard-worker && bun run build

# Build analytics system
cd analytics && bun run build
```

### **🔧 Development Tools**

- **TypeScript 5.0+** for type safety
- **Bun Runtime** for fast execution
- **Drizzle ORM** for database operations
- **Tailwind CSS** for styling
- **ESLint** for code quality
- **Prettier** for code formatting

---

## 🏭 **Production Deployment**

### **☁️ Cloudflare Workers Deployment**

```bash
# Navigate to dashboard worker
cd dashboard-worker

# Configure secrets
wrangler secret put DATABASE_URL
wrangler secret put BOT_TOKEN
wrangler secret put CASHIER_BOT_TOKEN

# Deploy to production
wrangler deploy
```

### **🐳 Docker Deployment**

```bash
# Build Docker image
docker build -t crystal-clear-architecture .

# Run with environment variables
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e BOT_TOKEN="..." \
  crystal-clear-architecture
```

### **🛡️ Environment Configuration**

```bash
# Required environment variables
DATABASE_URL=postgresql://username:password@host:port/database
BOT_TOKEN=telegram_bot_token
CASHIER_BOT_TOKEN=telegram_cashier_token
NODE_ENV=production
PORT=3000
```

### **📊 Monitoring Setup**

```bash
# Health check endpoints
curl https://your-domain.com/api/health
curl https://your-domain.com/api/health/comprehensive

# Prometheus metrics
curl https://your-domain.com/api/health/metrics
```

---

## 🤝 **Contributing**

### **🚀 How to Contribute**

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and ensure tests pass
4. **Commit your changes**: `git commit -m 'Add amazing feature'`
5. **Push to the branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### **📝 Contribution Guidelines**

- Follow the existing code style and architecture patterns
- Add tests for new features and bug fixes
- Update documentation for API changes
- Ensure all health checks pass before submitting
- Use conventional commit messages

### **🧪 Testing Requirements**

- Unit tests for all new functions
- Integration tests for API endpoints
- Health check validation
- Performance benchmark tests
- Security vulnerability scanning

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

### **🙏 Acknowledgments**

- **Crystal Clear Architecture Team** for the domain-driven design
  implementation
- **Bun Team** for the high-performance JavaScript runtime
- **Cloudflare Workers** for the serverless deployment platform
- **PostgreSQL Community** for the robust database system
- **Open Source Community** for the amazing tools and libraries

---

<div align="center">

**🚀 Built with ❤️ using Domain-Driven Design, TypeScript, and Bun Runtime**

---

**[⭐ Star this repository](https://github.com/brendadeeznuts1111/crystal-clear-architecture)**
if you find it useful!

**[🐛 Report Issues](https://github.com/brendadeeznuts1111/crystal-clear-architecture/issues)**
for bugs or feature requests

**[💬 Start Discussions](https://github.com/brendadeeznuts1111/crystal-clear-architecture/discussions)**
for questions and ideas

</div>
