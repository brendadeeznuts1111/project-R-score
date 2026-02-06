# 📊 Duo Automation Dashboard System

A comprehensive, modern dashboard system for managing and monitoring various aspects of the Duo Automation platform. Built with cutting-edge web technologies and featuring real-time analytics, interactive charts, and a beautiful glass-morphism design.

## 📋 Table of Contents

- [Features](#-features)
- [Dashboard Components](#-dashboard-components)
- [Installation & Setup](#-installation--setup)
- [Usage](#-usage)
- [Configuration](#-configuration)
- [API Integration](#-api-integration)
- [Development](#-development)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)

## ✨ Features

### 🎨 **Modern UI/UX Design**
- **Glass Morphism Effects** - Beautiful backdrop blur with transparency
- **Dark Theme** - Easy on the eyes with proper contrast ratios
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **Smooth Animations** - Micro-interactions and transitions throughout
- **Professional Icons** - Powered by Lucide icon library

### 📊 **Real-Time Analytics**
- **Live Data Updates** - Real-time metrics and performance monitoring
- **Interactive Charts** - Powered by Chart.js with customizable visualizations
- **Performance Metrics** - CPU, memory, storage, and network monitoring
- **Historical Data** - Track trends and analyze patterns over time

### 🔧 **Advanced Functionality**
- **Search & Filtering** - Find exactly what you need quickly
- **Export Capabilities** - Download reports and data in various formats
- **Keyboard Shortcuts** - Power user features for efficiency
- **Error Handling** - Comprehensive error states and user feedback
- **Progressive Enhancement** - Works with or without enhanced backend

## 🎛️ Dashboard Components

### 1. **Main Control Center** (`index.html`)
The central hub that ties everything together:
- System overview with key metrics
- Quick access to all dashboard modules
- Real-time system activity monitoring
- Quick action buttons for common tasks

### 2. **CashApp Integration Dashboard** (`cashapp-dashboard-live.html`)
Advanced CashApp monitoring and analysis:
- Real-time transaction monitoring
- Risk assessment and fraud detection
- User analytics and behavior tracking
- Integration with CashApp resolver services

### 3. **Phone Intelligence System** (`phone-info-template.html`)
Comprehensive phone number analysis:
- Phone validation and lookup
- Carrier information display
- Geographic location data
- Risk assessment with visual indicators
- Connection and activity tracking

### 4. **Carrier Networks Dashboard** (`carriers-info.html`)
Mobile carrier monitoring and analytics:
- Comprehensive carrier database
- Network type filtering (5G, 4G LTE, 3G)
- Market share analytics
- Coverage maps by region
- Performance metrics tracking

### 5. **System Utilities Dashboard** (`utilities-dashboard.html`)
System monitoring and maintenance:
- Real-time performance metrics
- Service health tracking
- Resource usage visualization
- System logs with filtering
- Quick maintenance actions

### 6. **Database Management System** (`database-management.html`)
Multi-database administration:
- Support for PostgreSQL, Redis, MongoDB
- Interactive SQL query editor
- Real-time performance monitoring
- Connection pool management
- Backup and restore operations

### 7. **Bucket Management System** (`bucket-management.html`)
Cloudflare R2 storage management:
- File browser with upload/download
- Storage analytics and reporting
- Drag-and-drop file upload
- Bucket creation and configuration
- Access control and encryption settings

## 🛠️ Installation & Setup

### Prerequisites
- **Node.js** or **Bun** (recommended)
- Modern web browser with JavaScript enabled
- Git for version control

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/brendadeeznuts1111/duo-automation.git
cd duo-automation
```

2. **Install dependencies**
```bash
bun install
# or
npm install
```

3. **Start the dashboard server**
```bash
# Simple backend with mock data
bun run dashboard:live

# Enhanced backend with real integration
bun run dashboard:enhanced-live
```

4. **Open your browser**
Navigate to `http://localhost:3001` to access the main dashboard.

## 🎯 Usage

### Available Scripts

- **Progress Bars**: Visual risk score indicators
- **Status Indicators**: Color-coded verification and enforcement statuses
- **Timeline Views**: Chronological enforcement and alert history

## 📋 Dashboard Components

### **Header Controls**
- **🔍 Analyze Phone**: Open modal to analyze specific phone numbers
- **▶️ Simulate Traffic**: Generate test data for dashboard visualization
- **🔄 Refresh**: Manually refresh dashboard data
- **🟢 Connection Status**: Real-time WebSocket connection indicator

### **Key Metrics Cards**
| Metric | Description | Source |
|--------|-------------|--------|
| **Total Processed** | Number of phones analyzed | Identity Resolver |
| **Synthetic Identities** | High-risk synthetic accounts detected | Risk Analysis |
| **CashApp Verified** | Legitimate verified CashApp accounts | CashApp API |
| **Enforcement Actions** | Automated actions triggered | Mitigation Engine |

### **Risk Analysis Panel**
- **Risk Score Distribution**: Visual breakdown of risk levels
- **Live Alert Feed**: Real-time fraud alerts with severity indicators
- **Phone Intelligence**: IPQS fraud score, carrier type, location data
- **CashApp Profile**: Verification status, transaction volume, fraud flags

### **Enforcement History Table**
| Column | Description |
|--------|-------------|
| **Timestamp** | When the action was triggered |
| **Phone** | Phone number that triggered the action |
| **Risk Score** | Calculated synthetic identity risk score |
| **Trigger** | What caused the enforcement action |
| **Action** | Enforcement action taken |
| **Status** | Current status of the enforcement |

## 🔧 API Endpoints

### **Dashboard Endpoints**
```text
GET  /api/dashboard/metrics           # Current dashboard metrics
GET  /api/dashboard/alerts            # Recent alerts
GET  /api/dashboard/enforcement-history # Enforcement actions
GET  /api/dashboard/risk-distribution # Risk score distribution
```

### **Analysis Endpoints**
```text
POST /api/analyze/phone               # Analyze a phone number
GET  /api/cashapp/profile/:phone      # Get CashApp profile
POST /api/simulate/traffic            # Generate test traffic
GET  /api/health                      # Health check
```

### **WebSocket**
```text
ws://localhost:3002                    # Real-time updates
```

## 🎨 UI Components

### **Risk Score Colors**
- 🟢 **Low Risk** (0-0.2): `#10b981` (Green)
- 🟡 **Medium Risk** (0.2-0.4): `#f59e0b` (Yellow)
- 🟠 **High Risk** (0.4-0.6): `#ef4444` (Orange)
- 🔴 **Critical** (0.6-1.0): `#991b1b` (Dark Red)

### **Verification Status Colors**
- 🟢 **Verified**: `bg-green-600`
- 🟡 **Unverified**: `bg-yellow-600`
- 🔴 **Suspended**: `bg-red-600`
- 🟠 **Pending**: `bg-orange-600`
- ⚪ **Unknown**: `bg-gray-600`

### **Enforcement Action Colors**
- 🔴 **BLOCK_TRANSACTION**: `bg-red-600`
- 🟠 **IDENTITY_VERIFICATION**: `bg-orange-600`
- 🟡 **REQUIRE_MFA**: `bg-yellow-600`
- 🔵 **ENHANCED_MONITORING**: `bg-blue-600`

## ⚡ Real-Time Features

### **WebSocket Integration**
The dashboard uses WebSockets for real-time updates:
- **Live Metrics**: Automatic metric updates
- **Instant Alerts**: New fraud alerts appear immediately
- **Enforcement Actions**: Real-time enforcement tracking
- **Connection Status**: Visual indicator of connection health

### **Auto-Refresh**
- **30-second intervals**: Automatic data refresh
- **Manual refresh**: Instant refresh button
- **Smart caching**: Efficient data loading

## 🎮 Interactive Features

### **Keyboard Shortcuts**
- `Ctrl + K`: Open phone analysis modal
- `Ctrl + R`: Refresh dashboard
- `Escape`: Close modal dialogs
- `Enter`: Submit phone analysis

### **Phone Analysis Modal**
1. Click "Analyze Phone" or press `Ctrl+K`
2. Enter phone number in E.164 format (e.g., +14155551234)
3. Click "Analyze" or press `Enter`
4. View detailed results in the Analysis Results panel

### **Traffic Simulation**
1. Click "Simulate Traffic" button
2. System generates 10 test phone analyses
3. Dashboard updates with realistic test data
4. Perfect for testing and demonstrations

## 📊 Data Flow

```text
Phone Input → Identity Resolver → CashApp Resolver → Risk Analysis → Enforcement Engine → Dashboard
```

### **Analysis Pipeline**
1. **Phone Validation**: Sanitize and validate phone number
2. **CashApp Lookup**: Fetch CashApp profile data
3. **Risk Assessment**: Calculate synthetic identity score
4. **Rule Evaluation**: Check against fraud detection rules
5. **Enforcement**: Trigger appropriate enforcement action
6. **Alerting**: Generate real-time alerts
7. **Visualization**: Update dashboard with results

## 🛠️ Technical Stack

### **Frontend**
- **HTML5**: Modern semantic markup
- **Tailwind CSS**: Utility-first styling
- **Chart.js**: Data visualization
- **Lucide Icons**: Modern icon library
- **Vanilla JavaScript**: No framework dependencies

### **Backend**
- **Express.js**: Web server framework
- **WebSocket**: Real-time communication
- **CashApp Resolver**: CashApp API integration
- **Identity Resolver**: Synthetic identity detection
- **Mitigation Engine**: Enforcement actions

### **Data Sources**
- **CashApp API**: Real payment platform data
- **IPQS**: Phone intelligence and fraud scoring
- **Internal Risk Engine**: Custom fraud detection algorithms
- **Cache Layers**: Redis, R2, Memory caching

## 🔧 Configuration

### **Environment Variables**
```bash
# CashApp API
CASHAPP_API_KEY=your_api_key_here

# Dashboard Server
DASHBOARD_PORT=3001

# Redis Cache
REDIS_URL=redis://localhost:6379

# R2 Storage
R2_BUCKET=empire-pro-cashapp
R2_ACCESS_KEY=your_access_key
R2_SECRET_KEY=your_secret_key
```

### **Dashboard Customization**
Edit `src/dashboard/cashapp-dashboard-live.html` to customize:
- **Colors**: Modify Tailwind color classes
- **Layout**: Adjust grid layouts and component placement
- **Branding**: Update logos and text content
- **Features**: Add/remove dashboard components

## 🚨 Troubleshooting

### **Common Issues**

**Dashboard not loading**
```bash
# Check if server is running
curl http://localhost:3001/api/health

# Restart server
bun run dashboard
```

**WebSocket connection issues**
- Check port 3002 availability
- Verify firewall settings
- Refresh browser page

**Missing data**
- Verify API keys are set
- Check CashApp API connectivity
- Review server logs for errors

**Performance issues**
- Clear browser cache
- Check network latency
- Monitor server resources

### **Debug Mode**
Enable debug logging:
```bash
DEBUG=* bun run dashboard
```

## 📈 Monitoring

### **Health Check**
```bash
curl http://localhost:3001/api/health
```

### **Metrics Endpoint**
```bash
curl http://localhost:3001/api/dashboard/metrics
```

### **Performance Monitoring**
- **Response Time**: <100ms for API calls
- **WebSocket Latency**: <50ms for real-time updates
- **Memory Usage**: Monitor server memory consumption
- **Cache Hit Rate**: Target >80% cache efficiency

## 🎯 Use Cases

### **Fraud Team**
- **Real-time monitoring** of fraudulent activity
- **Alert investigation** with detailed context
- **Enforcement tracking** and audit trails
- **Performance metrics** and KPI tracking

### **Engineering Team**
- **System health** monitoring
- **API performance** tracking
- **Integration testing** with simulation tools
- **Debugging** and troubleshooting

### **Management**
- **Business metrics** and dashboards
- **Risk assessment** overviews
- **Compliance reporting** data
- **ROI analysis** of fraud prevention

## 🚀 Future Enhancements

### **Planned Features**
- [ ] **Multi-tenant support** for different teams
- [ ] **Advanced filtering** and search capabilities
- [ ] **Export functionality** for reports and data
- [ ] **Mobile responsive** design improvements
- [ ] **Advanced analytics** and trend analysis
- [ ] **Integration** with external monitoring tools

### **API Enhancements**
- [ ] **GraphQL** support for complex queries
- [ ] **Rate limiting** and API key management
- [ ] **Advanced pagination** for large datasets
- [ ] **Bulk operations** for phone analysis

---

## 📞 Support

For questions or issues:
1. Check the troubleshooting section above
2. Review server logs for error details
3. Verify environment configuration
4. Test with the simulation features

**Dashboard Version**: 1.0.0  
**Last Updated**: January 13, 2026  
**Compatibility**: Bun 1.3.6+, Node.js 18+

---

*Built with ❤️ for real-time fraud detection and identity resolution*
