# IPFoxy Proxy Configuration Integration

## Overview

This document describes the comprehensive IPFoxy proxy configuration integration for the Foxy Proxy application, based on the official DuoPlus documentation. The implementation provides complete IPFoxy proxy management with seamless DuoPlus cloud phone integration.

## 📚 Documentation Analysis

### **Source Documentation**

Based on the official DuoPlus documentation at `https://help.duoplus.net/docs/IPFoxy-Proxy-Configuration`, this implementation covers:

#### **1. IPFoxy Proxy Types**

- **Static IPv4/IPv6**: Data center proxies (Zone A/B suppliers)
- **Static ISP Residential**: Exclusive ISP residential IPs
- **Dynamic Residential**: Real user IPs with automatic rotation
- **Protocol Support**: SOCKS5 and HTTP (DuoPlus requires SOCKS5)

#### **2. Configuration Process**

1. **IPFoxy Account Registration**: Register at ipfoxy.com
2. **Proxy Purchase**: Select type, region, quantity, duration
3. **DuoPlus Cloud Mobile Setup**: Create cloud phone device
4. **Proxy Configuration**: Configure SOCKS5 proxy for cloud phone

#### **3. Integration Requirements**

- **SOCKS5 Protocol**: Required for DuoPlus cloud phones
- **150+ Countries**: Global proxy support
- **Auto-Recognition**: Proxy configuration with automatic detection

## 🚀 Implementation Features

### **Core IPFoxy Manager**

#### **Account Management**

```typescript
const manager = new IPFoxyManager(apiKey);

// Get account information
const account = await manager.getAccountInfo();
// Returns: balance, activeProxies, totalProxies, etc.

// List all proxies
const proxies = await manager.listProxies();
// Returns: Array of IPFoxyProxyConfig objects
```

#### **Proxy Purchase**

```typescript
// Purchase static proxy
const staticProxies = await manager.purchaseStaticProxy({
  type: "static_ipv4",
  country: "US",
  region: "California",
  quantity: 5,
  duration: 30
});

// Purchase dynamic proxy
const dynamicProxies = await manager.purchaseDynamicProxy({
  country: "US",
  state: "California",
  city: "Los Angeles",
  rotationCycle: 30,
  quantity: 3,
  duration: 30
});
```

#### **Proxy Validation**

```typescript
// Validate single proxy
const result = await manager.validateProxy(proxy);
// Returns: { valid, responseTime, ip, country, error }

// Batch validate proxies
const results = await manager.validateProxies(proxies);
// Returns: Array of validation results
```

#### **DuoPlus Integration**

```typescript
// Configure proxy for DuoPlus cloud phone
await manager.configureForDuoPlus(proxy, phoneId);

// Generate proxy configuration strings
const curlConfig = manager.generateProxyString(proxy, "curl");
const pythonConfig = manager.generateProxyString(proxy, "python");
const jsConfig = manager.generateProxyString(proxy, "javascript");
```

### **React Component Interface**

#### **IPFoxyConfigPanel Component**

```typescript
import { IPFoxyConfigPanel } from '@/components';

<IPFoxyConfigPanel
  duoPlusPhoneId="phone-123"
  onProxyConfigured={(proxy) => console.log('Configured:', proxy)}
/>
```

**Features:**

- **Account Overview**: Balance, proxy count, status
- **Purchase Interface**: Buy static/dynamic proxies
- **Configuration Panel**: Select and configure proxies for DuoPlus
- **Validation Tools**: Test proxy connectivity and performance
- **Multi-tab Interface**: Organized workflow for different tasks

## 📊 API Reference

### **IPFoxyManager Class**

#### Constructor

```typescript
const manager = new IPFoxyManager(apiKey: string);
```

#### Core Methods

##### Account Management

```typescript
// Get account information
async getAccountInfo(): Promise<IPFoxyAccount>

// List all proxies
async listProxies(): Promise<IPFoxyProxyConfig[]>

// Get specific proxy details
async getProxy(proxyId: string): Promise<IPFoxyProxyConfig>
```

##### Purchase Operations

```typescript
// Purchase static proxy
async purchaseStaticProxy(config: {
  type: 'static_ipv4' | 'static_ipv6' | 'static_isp';
  country: string;
  region?: string;
  supplier?: string;
  quantity: number;
  duration: number;
}): Promise<IPFoxyProxyConfig[]>

// Purchase dynamic proxy
async purchaseDynamicProxy(config: {
  country: string;
  state?: string;
  city?: string;
  route?: string;
  rotationCycle: number;
  quantity: number;
  duration: number;
}): Promise<IPFoxyProxyConfig[]>
```

##### Validation and Testing

```typescript
// Validate proxy connectivity
async validateProxy(proxy: IPFoxyProxyConfig): Promise<ProxyValidationResult>

// Batch validate multiple proxies
async validateProxies(proxies: IPFoxyProxyConfig[]): Promise<ProxyValidationResult[]>
```

##### Configuration

```typescript
// Configure proxy for DuoPlus
async configureForDuoPlus(proxy: IPFoxyProxyConfig, phoneId: string): Promise<void>

// Generate configuration strings
generateProxyString(proxy: IPFoxyProxyConfig, format: 'curl' | 'python' | 'javascript' | 'url'): string
```

##### Utilities

```typescript
// Get available locations
async getAvailableLocations(): Promise<{ countries: Array<{ code: string; name: string }> }>

// Get pricing information
async getPricing(type: string): Promise<{ plans: Array<{ name: string; price: number }> }>

// Get recommended proxy type for use case
getRecommendedProxyType(useCase: string): { type: string; reason: string }
```

### **Type Definitions**

#### IPFoxyProxyConfig

```typescript
interface IPFoxyProxyConfig {
  id: string;
  type: "static_ipv4" | "static_ipv6" | "static_isp" | "dynamic_residential";
  protocol: "socks5" | "http";
  host: string;
  port: number;
  username: string;
  password: string;
  country: string;
  region?: string;
  supplier?: string;
  status: "active" | "inactive" | "expired" | "error";
  createdAt: string;
  expiresAt?: string;
}
```

#### IPFoxyAccount

```typescript
interface IPFoxyAccount {
  apiKey: string;
  email: string;
  balance: number;
  currency: string;
  activeProxies: number;
  totalProxies: number;
}
```

#### ProxyValidationResult

```typescript
interface ProxyValidationResult {
  valid: boolean;
  responseTime?: number;
  ip?: string;
  country?: string;
  error?: string;
}
```

## 🎯 Usage Examples

### **Basic Setup**

```typescript
import { ipfoxyManager } from "@/utils/ipfoxy";

// Get account overview
const account = await ipfoxyManager.getAccountInfo();
console.log(`Balance: $${account.balance}`);
console.log(`Active proxies: ${account.activeProxies}`);

// List available proxies
const proxies = await ipfoxyManager.listProxies();
console.log(`Found ${proxies.length} proxies`);
```

### **Purchase and Configure**

```typescript
// Purchase static IPv4 proxy for social media
const socialProxies = await ipfoxyManager.purchaseStaticProxy({
  type: "static_isp",
  country: "US",
  quantity: 3,
  duration: 90
});

// Configure first proxy for DuoPlus phone
const proxy = socialProxies[0];
await ipfoxyManager.configureForDuoPlus(proxy, "duoplus-phone-123");
```

### **Proxy Validation**

```typescript
// Validate proxy before use
const validation = await ipfoxyManager.validateProxy(proxy);
if (validation.valid) {
  console.log(`Proxy working! Response time: ${validation.responseTime}ms`);
  console.log(`IP: ${validation.ip} (${validation.country})`);
} else {
  console.error(`Proxy failed: ${validation.error}`);
}
```

### **Batch Operations**

```typescript
// Validate all proxies
const allProxies = await ipfoxyManager.listProxies();
const results = await ipfoxyManager.validateProxies(allProxies);

const validProxies = results.filter((r) => r.valid);
const invalidProxies = results.filter((r) => !r.valid);

console.log(`${validProxies.length} valid, ${invalidProxies.length} invalid`);
```

### **Configuration Generation**

```typescript
// Generate configuration for different tools
const proxy = proxies[0];

// cURL command
const curlCommand = ipfoxyManager.generateProxyString(proxy, "curl");
console.log(curlCommand);
// Output: curl --socks5 proxy.example.com:1080 -U "user:pass" https://example.com

// Python requests
const pythonCode = ipfoxyManager.generateProxyString(proxy, "python");
console.log(pythonCode);
// Output: import requests\n\nproxies = {\n    'http': 'socks5://user:pass@proxy.example.com:1080',\n    'https': 'socks5://user:pass@proxy.example.com:1080'\n}

// JavaScript fetch
const jsCode = ipfoxyManager.generateProxyString(proxy, "javascript");
console.log(jsCode);
// Output: const HttpsProxyAgent = require('https-proxy-agent');\nconst agent = new HttpsProxyAgent('socks5://user:pass@proxy.example.com:1080');
```

## 🎨 React Component Usage

### **Integration in Pages**

```typescript
import { IPFoxyConfigPanel } from '@/components';

function ProxyConfigurationPage() {
  const [selectedPhone, setSelectedPhone] = useState('');

  return (
    <div>
      <h1>Proxy Configuration</h1>
      <IPFoxyConfigPanel
        duoPlusPhoneId={selectedPhone}
        onProxyConfigured={(proxy) => {
          console.log('Proxy configured for phone:', selectedPhone);
          // Handle successful configuration
        }}
      />
    </div>
  );
}
```

### **Component Features**

- **Account Overview**: Real-time balance and proxy count
- **Purchase Interface**: Step-by-step proxy purchase workflow
- **Configuration Panel**: Visual proxy selection and DuoPlus setup
- **Validation Tools**: Built-in connectivity testing
- **Multi-tab Interface**: Organized workflow (Overview, Purchase, Configure, Validate)

## 🔧 Configuration

### **Environment Variables**

```bash
# Required for IPFoxy API authentication
IPFOXY_API_KEY=your_ipfoxy_api_key_here

# Optional: Custom API base URL
IPFOXY_API_BASE_URL=https://api.ipfoxy.com/v1
```

### **API Key Setup**

1. Register at [IPFoxy Website](https://www.ipfoxy.com/?r=lk_duoplus)
2. Navigate to API section in dashboard
3. Generate API key
4. Add to environment variables

## 🔒 Security Considerations

### **API Key Management**

- Store API keys securely in environment variables
- Never expose API keys in client-side code
- Use HTTPS for all API communications
- Implement rate limiting for API calls

### **Proxy Security**

- Validate proxy credentials before use
- Use SOCKS5 protocol for DuoPlus integration
- Monitor proxy performance and usage
- Rotate proxies regularly for security

### **Data Protection**

- Encrypt sensitive proxy credentials
- Mask passwords in UI displays
- Implement proper access controls
- Log proxy usage for audit purposes

## 📈 Performance Optimization

### **Caching Strategies**

```typescript
// Cache proxy list to reduce API calls
const cachedProxies = await ipfoxyManager.listProxies();
// Store in localStorage or state management

// Cache validation results
const validationCache = new Map();
if (validationCache.has(proxy.id)) {
  return validationCache.get(proxy.id);
}
```

### **Batch Operations**

```typescript
// Batch validate for efficiency
const results = await Promise.allSettled(
  proxies.map((proxy) => ipfoxyManager.validateProxy(proxy))
);
```

### **Connection Pooling**

```typescript
// Reuse connections for multiple requests
const manager = new IPFoxyManager(apiKey);
// Manager maintains connection pool internally
```

## 🛠️ Troubleshooting

### **Common Issues**

#### API Authentication Errors

```typescript
// Check API key validity
try {
  await ipfoxyManager.getAccountInfo();
} catch (error) {
  if (error.message.includes("401")) {
    console.error("Invalid API key");
  }
}
```

#### Proxy Connection Failures

```typescript
// Validate proxy configuration
const validation = await ipfoxyManager.validateProxy(proxy);
if (!validation.valid) {
  console.error("Proxy validation failed:", validation.error);

  // Common solutions:
  // 1. Check proxy credentials
  // 2. Verify SOCKS5 protocol support
  // 3. Test different proxy location
}
```

#### DuoPlus Configuration Issues

```typescript
// Ensure SOCKS5 protocol
if (proxy.protocol !== "socks5") {
  throw new Error("DuoPlus requires SOCKS5 protocol");
}

// Validate before configuration
const validation = await ipfoxyManager.validateProxy(proxy);
if (!validation.valid) {
  throw new Error(`Proxy not ready: ${validation.error}`);
}
```

### **Debug Mode**

```typescript
// Enable debug logging
const manager = new IPFoxyManager(apiKey);
manager.setDebugMode(true);
```

## 📊 Best Practices

### **Proxy Selection**

```typescript
// Use recommended proxy types for specific use cases
const recommendation = ipfoxyManager.getRecommendedProxyType("social_media");
console.log(`Recommended: ${recommendation.type}`);
console.log(`Reason: ${recommendation.reason}`);
```

### **Cost Optimization**

```typescript
// Monitor usage and optimize costs
const account = await ipfoxyManager.getAccountInfo();
if (account.balance < 50) {
  console.warn("Low balance - consider renewing proxies");
}
```

### **Performance Monitoring**

```typescript
// Regular validation and monitoring
setInterval(async () => {
  const proxies = await ipfoxyManager.listProxies();
  const results = await ipfoxyManager.validateProxies(proxies);

  const invalidCount = results.filter((r) => !r.valid).length;
  if (invalidCount > 0) {
    console.warn(`${invalidCount} proxies need attention`);
  }
}, 3600000); // Check every hour
```

## 🚀 Advanced Features

### **Custom Proxy Types**

```typescript
// Extend for custom proxy types
interface CustomProxyConfig extends IPFoxyProxyConfig {
  customField: string;
  specialFeature: boolean;
}
```

### **Integration with Unified Profiles**

```typescript
// Combine with existing unified profile system
import { unifiedProfileManager } from "@/utils/unified";

const profile = unifiedProfileManager.createProfile({
  name: "Social Media Profile",
  proxyId: ipfoxyProxy.id,
  phoneId: duoplusPhone.id,
  template: "SOCIAL_MEDIA_MANAGER"
});
```

### **Automation Workflows**

```typescript
// Automated proxy rotation
async function rotateProxies(phoneId: string) {
  const proxies = await ipfoxyManager.listProxies();
  const validProxies = proxies.filter((p) => p.status === "active");

  for (const proxy of validProxies) {
    try {
      await ipfoxyManager.configureForDuoPlus(proxy, phoneId);
      console.log(`Configured proxy: ${proxy.id}`);
      break; // Stop after first successful configuration
    } catch (error) {
      console.warn(`Failed to configure ${proxy.id}:`, error);
    }
  }
}
```

## 📈 Future Enhancements

### **Planned Features**

- Real-time proxy monitoring dashboard
- Automated proxy rotation algorithms
- Advanced analytics and reporting
- Custom proxy type support
- Integration with more proxy providers

### **API Extensions**

- WebSocket support for real-time updates
- Batch operation endpoints
- Advanced filtering and search
- Performance metrics API

## 📞 Support

For issues and questions:

1. Check the [IPFoxy Documentation](https://help.duoplus.net/docs/IPFoxy-Proxy-Configuration)
2. Review the API reference above
3. Check error logs for detailed information
4. Contact IPFoxy support for account issues
5. Contact DuoPlus support for cloud phone issues

## License

This integration follows the same license as the main Foxy Proxy project.
