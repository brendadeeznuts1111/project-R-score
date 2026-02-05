# 🍎 Personal Domain Apple ID Creator - Demographic Matching System

A comprehensive system for creating Apple IDs using your personal domain with demographic matching based on IP location.

## ✨ Key Features

### 🌐 Personal Domain Integration

- Uses **your own domain** (e.g., `@yourdomain.com`)
- Multiple email formats: `first.last@domain`, `first_last@domain`, etc.
- Automatic DNS verification and email account creation
- Support for Cloudflare, cPanel, Google Workspace, Microsoft 365

### 🎯 Demographic Matching

- **IP-based location detection** with multiple geolocation services
- Country-specific name databases (US, UK, CA, AU, DE)
- Age distribution matching based on real demographic data
- Culturally appropriate security questions
- Realistic phone number generation by country

### 🌍 Live IP/Proxy Management

- Multiple proxy sources: public, VPN, residential
- Location-based proxy selection
- Automatic proxy testing and caching
- Country/city targeting capabilities

### 📱 Device Automation

- Android device integration via ADB
- OCR-based element detection
- Human-like interaction patterns
- Multi-device support

### 📊 Analytics Dashboard

- Real-time statistics
- Geographic distribution tracking
- Success rate monitoring
- Web-based control panel

## 🚀 Quick Start

### 1. Prerequisites

```bash
# Install Bun (recommended)
curl -fsSL https://bun.sh/install | bash

# Or use Node.js 18+
npm install -g npm@latest
```

### 2. Install Dependencies

```bash
# Clone or download the project
cd windsurf-project

# Install dependencies
bun install
# or
npm install
```

### 3. Configure Your Domain

Edit `config.json` with your domain settings:

```json
{
  "domain": {
    "name": "yourdomain.com",
    "subdomain": "apple",
    "emailFormat": "first.last",
    "dnsProvider": "cloudflare",
    "dnsApiKey": "your-cloudflare-api-key",
    "smtp": {
      "host": "smtp.privateemail.com",
      "auth": {
        "user": "admin@yourdomain.com",
        "pass": "your-email-password"
      }
    }
  }
}
```

### 4. DNS Configuration

Add these DNS records to your domain:

```text
# A Record
@        A        1.2.3.4      # Your server IP

# MX Records (for email)
@        MX       10   mx1.privateemail.com
@        MX       20   mx2.privateemail.com

# SPF Record
@        TXT      "v=spf1 include:spf.protection.outlook.com -all"

# DKIM Record (optional)
default._domainkey  TXT  "v=DKIM1; k=rsa; p=..."
```

### 5. Email Server Setup

Choose one of the following:

#### Option A: Private Email (Namecheap)

1. Sign up for Private Email hosting
2. Add your domain in the control panel
3. Configure SMTP/IMAP settings in config

#### Option B: Google Workspace

1. Set up Google Workspace for your domain
2. Enable API access
3. Configure service account credentials

#### Option C: Microsoft 365

1. Set up Microsoft 365 for your domain
2. Configure Graph API access
3. Add application permissions

### 6. Run the System

```bash
# Interactive mode
bun run integrated-appleid-system.js

# Or with specific options
bun run integrated-appleid-system.js --country=US --city="New York"

# Start web dashboard
bun run dashboard.js
```

## 📖 Usage Examples

### Single Account Creation

```javascript
import { IntegratedAppleIDOrchestrator } from './integrated-appleid-system.js';

const orchestrator = new IntegratedAppleIDOrchestrator();
await orchestrator.initialize();

// Create account with auto-matched demographics
const result = await orchestrator.createAppleIDWithDemographics('device_001');

// Create account for specific location
const result = await orchestrator.createAppleIDWithDemographics('device_001', {
  targetLocation: { country: 'US', city: 'New York' }
});
```

### Batch Creation

```javascript
// Create 50 accounts across different countries
const report = await orchestrator.batchCreate(
  ['device_001', 'device_002'], 
  50, 
  { 
    delayBetween: 5000,
    targetLocation: { country: 'US' }
  }
);
```

### Web Dashboard

Access the dashboard at `http://localhost:3000` after starting:

```bash
bun run dashboard.js
```

## 🌍 Demographic Examples

### US User Profile

```json
{
  "firstName": "James",
  "lastName": "Smith",
  "age": 32,
  "location": {
    "country": "United States",
    "city": "Chicago",
    "zip": "60601",
    "timezone": "America/Chicago"
  },
  "email": "james.smith@yourdomain.com",
  "phone": "+1 (312) 555-0198"
}
```

### UK User Profile

```json
{
  "firstName": "Thomas",
  "lastName": "Jones",
  "age": 28,
  "location": {
    "country": "United Kingdom",
    "city": "Manchester",
    "zip": "M1 1AB",
    "timezone": "Europe/London"
  },
  "email": "thomas.jones@yourdomain.com",
  "phone": "+44 7123 456789"
}
```

## 🔧 Configuration Options

### Domain Settings

- `name`: Your domain name
- `subdomain`: Optional subdomain (e.g., `apple.yourdomain.com`)
- `emailFormat`: Email address format
- `dnsProvider`: Your DNS provider
- `mxRecords`: Mail server records

### Demographic Settings

- `nameDatabases`: Country-specific name lists
- `ageDistribution`: Demographic age data
- `sources`: IP geolocation services

### Proxy Settings

- `sources`: Proxy provider configurations
- `testing`: Proxy testing parameters
- `rotation`: Proxy rotation strategy

### Automation Settings

- `commandTimeout`: ADB command timeout
- `delays`: Human-like timing delays
- `ocrEnabled`: OCR for element detection
- `humanBehavior`: Human simulation settings

## 📊 API Endpoints

### System Statistics

```http
GET /api/stats
```

### Create Single Account

```http
POST /api/create
Content-Type: application/json

{
  "deviceId": "device_001",
  "targetCountry": "US",
  "targetCity": "New York",
  "options": {
    "skipVerification": false
  }
}
```

### API Batch Creation

```http
POST /api/batch-create
Content-Type: application/json

{
  "count": 10,
  "devices": ["device_001", "device_002"],
  "options": {
    "delayBetween": 5000
  }
}
```

### System Information

```http
GET /api/config
GET /api/devices
GET /api/proxies
```

## 🛡️ Security & Compliance

### Rate Limiting

- Configurable request limits per minute/hour/day
- Automatic throttling to prevent detection
- Proxy rotation for IP diversity

### Detection Avoidance

- Random user agents and headers
- Human-like timing patterns
- Mouse movement simulation
- Variable typing speeds

### Data Privacy

- Secure credential storage
- Encrypted communications
- GDPR compliance options
- Data retention policies

## 🔍 Troubleshooting

### Common Issues

#### DNS Configuration

```bash
# Check MX records
dig MX yourdomain.com

# Check SPF record
dig TXT yourdomain.com

# Verify email routing
swaks --to test@yourdomain.com --from admin@yourdomain.com
```

#### Device Connection

```bash
# Check ADB devices
adb devices

# Test device connection
adb -s device_id shell echo "test"

# Check device status
adb -s device_id shell getprop ro.product.model
```

#### Email Issues

```bash
# Test SMTP connection
telnet smtp.privateemail.com 465

# Test IMAP connection
telnet imap.privateemail.com 993

# Check email logs
tail -f /var/log/mail.log
```

### Debug Mode

Enable debug logging:

```javascript
const orchestrator = new IntegratedAppleIDOrchestrator();
orchestrator.config.debug = true;
```

### Logs Location

- System logs: `./logs/`
- Screenshots: `./screenshots/`
- Reports: `./reports/`

## 📈 Performance Optimization

### Parallel Processing

```javascript
// Configure parallel device processing
orchestrator.config.parallelDevices = 3;
orchestrator.config.maxConcurrentAccounts = 10;
```

### Proxy Optimization

```javascript
// Use residential proxies for better success rates
orchestrator.config.proxyPreference = 'residential';
orchestrator.config.proxyRotation = 'fastest';
```

### Caching

```javascript
// Enable location and demographic caching
orchestrator.config.caching.enabled = true;
orchestrator.config.caching.ttl = 3600000; // 1 hour
```

## 🚀 Advanced Features

### Custom Name Databases

```javascript
// Add custom country data
orchestrator.demographicEngine.nameDatabases.FR = {
  maleFirstNames: ['Pierre', 'Jean', 'Michel'],
  femaleFirstNames: ['Marie', 'Sophie', 'Camille'],
  lastNames: ['Martin', 'Bernard', 'Dubois'],
  commonCities: ['Paris', 'Marseille', 'Lyon']
};
```

### Custom Security Questions

```javascript
// Add country-specific questions
orchestrator.demographicEngine.questionTemplates.FR = [
  "Dans quelle ville êtes-vous né ?",
  "Quel était le nom de votre premier animal ?",
  "Quelle était la marque de votre première voiture ?"
];
```

### Webhook Integration

```javascript
// Configure webhook notifications
orchestrator.config.webhookUrl = 'https://your-webhook-url.com';
orchestrator.config.webhookEvents = ['account_created', 'batchcompleted', 'error'];
```

## 📚 API Reference

### Classes

#### IntegratedAppleIDOrchestrator

Main orchestrator class for the entire system.

**Methods:**

- `initialize()` - Initialize the system
- `createAppleIDWithDemographics(deviceId, options)` - Create single account
- `batchCreate(devices, count, options)` - Create multiple accounts
- `getStatistics()` - Get system statistics

#### PersonalDomainEmailManager

Handles email creation and verification.

**Methods:**

- `generateEmailAddress(userData)` - Generate email address
- `createEmailAccount(email, password)` - Create email account
- `sendVerificationEmail(email, code)` - Send verification email
- `checkForVerificationCode(email, password)` - Check for verification code

#### DemographicMatchingEngine

Generates demographic-appropriate user data.

**Methods:**

- `getIPLocation(ip)` - Get IP geolocation
- `generateUserData(ipLocation)` - Generate user data
- `generateSecurityQuestions(userData)` - Generate security questions
- `generatePassword(userData)` - Generate password

#### LiveIPProxyManager

Manages proxy sources and rotation.

**Methods:**

- `loadProxies()` - Load proxies from sources
- `testProxy(proxy)` - Test individual proxy
- `getProxyByLocation(country, city)` - Get proxy for location

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is for educational purposes only. Please ensure compliance with:

- Apple's Terms of Service
- Email service provider policies
- Local laws and regulations
- Data protection regulations

## ⚠️ Disclaimer

This software is provided for educational and research purposes only. Users are responsible for ensuring compliance with all applicable laws, terms of service, and regulations. The authors are not responsible for any misuse of this software.

## 🆘 Support

For issues and questions:

1. Check the troubleshooting section
2. Review the logs in `./logs/`
3. Create an issue with detailed information
4. Include configuration files (remove sensitive data)

---

## Made with ❤️ for automation enthusiasts
