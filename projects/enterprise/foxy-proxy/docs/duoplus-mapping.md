# DuoPlus Pre-Configuration Mapping Documentation

## Overview

The Foxy Proxy application now includes comprehensive DuoPlus pre-configuration mapping that integrates seamlessly with the enhanced template system. This allows users to leverage DuoPlus's device templates, fingerprint profiles, and phone provisioning capabilities while maintaining the unified management interface.

## 🎯 Key Features

### **DuoPlus Device Templates**

- **Gaming Optimized v2** (`duoplus-gaming-v2`): High-performance mobile gaming with GPU acceleration
- **Social Media Professional** (`duoplus-social-pro`): Stable fingerprint for long-term social media use
- **Mass Account Creation** (`duoplus-mass-create`): Optimized for bulk account creation with aggressive randomization

### **Fingerprint Profiles**

- **High Trust** (`high_trust`): 5-10% field randomization for banking and payment platforms
- **Balanced** (`balanced`): 30-40% field randomization for general social media use
- **Aggressive** (`aggressive`): 70-80% field randomization for mass account creation

### **Platform-Specific Configurations**

Pre-configured mappings for major platforms:

- **PayPal**: High trust fingerprint with long-term phone verification
- **Facebook**: Balanced fingerprint with sticky proxy rotation
- **Twitter**: Aggressive fingerprint with rotating proxies
- **Gaming**: Balanced fingerprint with datacenter proxies
- **Amazon**: High trust fingerprint for e-commerce operations

## 🏗️ Architecture

### **Type System**

```typescript
// Core DuoPlus configuration types
interface DuoPlusDeviceTemplate {
  templateId: string;
  name: string;
  description: string;
  features: {
    gpuAcceleration: boolean;
    resolution: string;
    performanceProfile: "high" | "balanced" | "minimal";
    fingerprintProfile: "high_trust" | "balanced" | "aggressive";
  };
  supportedApps: string[];
  useCases: string[];
}

interface DuoPlusPhoneConfig {
  purchasePhone: boolean;
  phoneCountry: string;
  phoneType: "long_term" | "short_term" | "disposable";
  autoVerify: boolean;
  smsInterception: boolean;
  webhookEnabled: boolean;
}

interface DuoPlusProxyConfig {
  type: "socks5" | "http" | "https";
  host: string;
  port: number;
  username: string;
  password: string;
  rotation: "static" | "rotating" | "sticky";
  authentication: "auto" | "manual";
}
```

### **Enhanced Profile Integration**

The enhanced template system now includes DuoPlus configuration:

```typescript
interface EnhancedUnifiedProfile {
  // ... existing properties

  // DuoPlus Integration
  duoPlusConfig?: {
    templateId: string;
    fingerprintProfile: "high_trust" | "balanced" | "aggressive";
    phoneConfig: DuoPlusPhoneConfig;
    proxyConfig: DuoPlusProxyConfig;
    deviceCreationRequest?: DuoPlusDeviceCreationRequest;
    deviceCreationResponse?: DuoPlusDeviceCreationResponse;
    batchConfig?: DuoPlusBatchCreationRequest;
  };
}
```

## 📋 Usage Examples

### **1. Creating a PayPal-Optimized Profile**

```typescript
import { EnhancedUnifiedProfileManager } from "./utils/enhanced/unified-manager";

const profileManager = new EnhancedUnifiedProfileManager();

const paypalProfile = profileManager.createProfileFromTemplate({
  templateName: "SOCIAL_MEDIA_MANAGER",
  proxyId: "proxy-us-residential-1",
  phoneId: "phone-us-1",
  customName: "PayPal Business Account",

  // DuoPlus Configuration
  duoPlusPlatform: "PAYPAL",
  duoPlusTemplate: "duoplus-social-pro",
  duoPlusFingerprintProfile: "high_trust",
  duoPlusPhoneType: "long_term",
  duoPlusAutoVerify: true,

  // Email Configuration
  emailProvider: "gmail",
  emailAddress: "business@company.com",
  emailPassword: "securePassword123"
});
```

### **2. Bulk Twitter Account Creation**

```typescript
import { createDuoPlusBatchRequest } from "./types/enhanced-templates";

const batchRequest = createDuoPlusBatchRequest(
  "ACCOUNT_CREATION_PRO",
  10, // Create 10 devices
  {
    templateName: "ACCOUNT_CREATION_PRO",
    duoPlusPlatform: "TWITTER",
    duoPlusFingerprintProfile: "aggressive",
    duoPlusPhoneType: "short_term"
  },
  ["proxy-1", "proxy-2", "proxy-3"], // Proxy pool
  ["US", "UK", "CA"] // Phone countries
);

// Send to DuoPlus API
// POST /api/devices/batch
// Body: batchRequest
```

### **3. Gaming Profile Setup**

```typescript
const gamingProfile = profileManager.createProfileFromTemplate({
  templateName: "GAMING_MOBILE",
  proxyId: "proxy-datacenter-gaming-1",
  phoneId: "phone-gaming-1",

  duoPlusPlatform: "GAMING",
  duoPlusTemplate: "duoplus-gaming-v2",
  duoPlusFingerprintProfile: "balanced",
  duoPlusPhoneType: "disposable",

  // Gaming-optimized DNS
  customDns: ["1.1.1.1", "8.8.8.8"],
  customWhitelist: ["pubgmobile.com", "fortnite.com", "callofduty.com"]
});
```

## 🔧 Configuration Mapping

### **Template to DuoPlus Mapping**

| Enhanced Template      | DuoPlus Template      | Use Case                            |
| ---------------------- | --------------------- | ----------------------------------- |
| `GAMING_MOBILE`        | `duoplus-gaming-v2`   | Mobile gaming with GPU acceleration |
| `SOCIAL_MEDIA_MANAGER` | `duoplus-social-pro`  | Social media management             |
| `ACCOUNT_CREATION_PRO` | `duoplus-mass-create` | Bulk account creation               |
| `DROPSHIPPING_PRO`     | `duoplus-social-pro`  | E-commerce operations               |
| `SCRAPING_STEALTH`     | `duoplus-mass-create` | Web scraping                        |
| `DEVELOPMENT_CLOUD`    | `duoplus-social-pro`  | Development environment             |
| `STREAMING_GLOBAL`     | `duoplus-social-pro`  | Content streaming                   |

### **Platform-Specific Configurations**

#### PayPal Configuration

```typescript
{
  template: 'duoplus-social-pro',
  fingerprintProfile: 'high_trust',
  phoneConfig: {
    purchasePhone: true,
    phoneCountry: 'US',
    phoneType: 'long_term',
    autoVerify: true,
    smsInterception: true,
    webhookEnabled: true,
  },
  proxy: {
    type: 'residential',
    rotation: 'static',
    authentication: 'auto',
  },
}
```

#### Twitter Configuration

```typescript
{
  template: 'duoplus-mass-create',
  fingerprintProfile: 'aggressive',
  phoneConfig: {
    purchasePhone: true,
    phoneCountry: 'US',
    phoneType: 'short_term',
    autoVerify: true,
    smsInterception: true,
    webhookEnabled: true,
  },
  proxy: {
    type: 'residential',
    rotation: 'rotating',
    authentication: 'auto',
  },
}
```

## 🚀 API Integration

### **Device Creation Request**

```typescript
const deviceRequest: DuoPlusDeviceCreationRequest = {
  template_id: "duoplus-social-pro",
  fingerprint_profile: "high_trust",
  phone: {
    country: "US",
    type: "long_term",
    auto_verify: true
  },
  proxy: {
    type: "residential",
    rotation: "static",
    authentication: "auto"
  },
  custom_settings: {
    dns: ["1.1.1.1", "8.8.8.8"],
    whitelist: ["paypal.com", "ebay.com"]
  }
};

// Send to DuoPlus API
// POST /api/devices
// Body: deviceRequest
```

### **Device Creation Response**

```typescript
const deviceResponse: DuoPlusDeviceCreationResponse = {
  device_id: "device-12345",
  phone_number: "+1-555-0123",
  proxy_config: {
    type: "socks5",
    host: "192.168.1.100",
    port: 8080,
    username: "user",
    password: "pass",
    rotation: "static",
    authentication: "auto"
  },
  fingerprint: {
    profile: "high_trust",
    randomization_applied: ["user_agent", "screen_resolution", "timezone"],
    trust_score: "high"
  },
  status: "ready",
  estimated_ready_time: "2024-01-01T12:00:00Z"
};
```

## 📊 Management Functions

### **Profile Management**

```typescript
// Get all DuoPlus-enabled profiles
const duoplusProfiles = profileManager.getDuoPlusProfiles();

// Get profiles by template
const socialProfiles = profileManager.getProfilesByDuoPlusTemplate("duoplus-social-pro");

// Get profiles by fingerprint profile
const highTrustProfiles = profileManager.getProfilesByFingerprintProfile("high_trust");

// Get profiles pending device creation
const pendingProfiles = profileManager.getProfilesPendingDeviceCreation();

// Get profiles with completed devices
const completedProfiles = profileManager.getProfilesWithCompletedDevices();
```

### **Statistics and Analytics**

```typescript
const stats = profileManager.getProfileStatistics();

console.log(`
Total Profiles: ${stats.total}
DuoPlus Enabled: ${stats.withDuoPlus}
By Template:
  duoplus-social-pro: ${stats.byDuoPlusTemplate["duoplus-social-pro"]}
  duoplus-gaming-v2: ${stats.byDuoPlusTemplate["duoplus-gaming-v2"]}
  duoplus-mass-create: ${stats.byDuoPlusTemplate["duoplus-mass-create"]}
By Fingerprint:
  high_trust: ${stats.byFingerprintProfile["high_trust"]}
  balanced: ${stats.byFingerprintProfile["balanced"]}
  aggressive: ${stats.byFingerprintProfile["aggressive"]}
`);
```

## 🔍 Validation and Error Handling

### **Configuration Validation**

```typescript
import { validateDuoPlusConfig } from "./types/enhanced-templates";

const validation = validateDuoPlusConfig("SOCIAL_MEDIA_MANAGER", deviceRequest);

if (!validation.isValid) {
  console.error("Configuration errors:", validation.errors);
  // Handle errors
}
```

### **Template Validation**

```typescript
import { getDuoPlusTemplate, getDuoPlusFingerprintProfile } from "./types/enhanced-templates";

const template = getDuoPlusTemplate("duoplus-social-pro");
if (!template) {
  console.error("Template not found");
}

const fingerprintProfile = getDuoPlusFingerprintProfile("high_trust");
if (!fingerprintProfile) {
  console.error("Fingerprint profile not found");
}
```

## ⏱️ Time Estimation

### **Device Creation Time Estimation**

```typescript
import { estimateDeviceCreationTime } from "./types/enhanced-templates";

const estimatedMinutes = estimateDeviceCreationTime("duoplus-social-pro", { type: "long_term" });

console.log(`Estimated creation time: ${estimatedMinutes} minutes`);
```

**Factors affecting creation time:**

- **Template complexity**: Gaming templates take longer than basic templates
- **Phone provisioning**: Long-term phones take longer than disposable phones
- **Fingerprint randomization**: Higher randomization requires more processing

## 🎨 UI Integration

### **Template Selection Component**

The enhanced template selection UI now includes DuoPlus configuration options:

- **Platform selection dropdown** (PayPal, Facebook, Twitter, Gaming, etc.)
- **Template preview cards** showing DuoPlus features
- **Fingerprint profile selector** with trust level indicators
- **Phone configuration options** (type, country, verification)
- **Proxy settings** (type, rotation, authentication)

### **Profile Management Interface**

- **DuoPlus status indicators** showing device creation progress
- **Batch creation interface** for scaling operations
- **Device response handling** with formatted status display
- **Performance metrics** for DuoPlus-enabled profiles

## 🔒 Security Considerations

### **Data Protection**

- **Sensitive data masking** in exports (passwords, API keys)
- **Secure API communication** with DuoPlus endpoints
- **Local storage encryption** for device credentials

### **Fingerprint Randomization**

- **Controlled randomization levels** to avoid detection
- **Platform-specific optimization** for maximum success rates
- **Trust score monitoring** to maintain account health

## 📈 Performance Optimization

### **Batch Operations**

- **Parallel device creation** for scaling operations
- **Proxy pool management** to distribute load
- **Phone country optimization** for regional targeting

### **Resource Management**

- **Efficient profile storage** with Map-based data structures
- **Lazy loading** for device creation responses
- **Memory optimization** for large profile collections

## 🛠️ Advanced Usage

### **Custom Template Creation**

```typescript
// Create custom DuoPlus configuration
const customConfig: DuoPlusDeviceCreationRequest = {
  template_id: "duoplus-social-pro",
  fingerprint_profile: "balanced",
  phone: {
    country: "UK",
    type: "long_term",
    auto_verify: true
  },
  proxy: {
    type: "residential",
    rotation: "sticky",
    authentication: "auto"
  },
  custom_settings: {
    custom_user_agent: "Mozilla/5.0 (Custom UA)",
    custom_timezone: "Europe/London",
    custom_language: "en-GB"
  }
};
```

### **Integration with External Systems**

```typescript
// Export DuoPlus configuration for external API
const exportConfig = {
  devices: profiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    duoplus_config: profile.duoPlusConfig?.deviceCreationRequest,
    status: profile.duoPlusConfig?.deviceCreationResponse?.status
  })),
  metadata: {
    total_devices: profiles.length,
    ready_devices: profileManager.getProfilesWithCompletedDevices().length,
    pending_devices: profileManager.getProfilesPendingDeviceCreation().length
  }
};
```

## 📚 Best Practices

### **1. Template Selection**

- Use **high_trust** for banking and payment platforms
- Use **balanced** for general social media use
- Use **aggressive** for mass account creation only

### **2. Phone Configuration**

- **Long-term** phones for permanent accounts
- **Short-term** phones for temporary campaigns
- **Disposable** phones for testing and gaming

### **3. Proxy Management**

- **Residential proxies** for social media and e-commerce
- **Datacenter proxies** for gaming and development
- **Static rotation** for account stability
- **Rotating proxies** for scraping and mass operations

### **4. Scaling Operations**

- Use **batch creation** for large-scale deployments
- Implement **proxy pools** to distribute load
- Monitor **device creation times** for optimization
- Track **success rates** by platform and configuration

## 🚀 Getting Started

### **1. Basic Setup**

```typescript
import { EnhancedUnifiedProfileManager } from "./utils/enhanced/unified-manager";

const manager = new EnhancedUnifiedProfileManager();

// Create a simple profile
const profile = manager.createProfileFromTemplate({
  templateName: "SOCIAL_MEDIA_MANAGER",
  proxyId: "your-proxy-id",
  phoneId: "your-phone-id",
  duoPlusPlatform: "FACEBOOK"
});
```

### **2. Advanced Configuration**

```typescript
// Create a custom configuration
const customProfile = manager.createProfileFromTemplate({
  templateName: "ACCOUNT_CREATION_PRO",
  proxyId: "proxy-pool-1",
  phoneId: "phone-bulk-1",
  duoPlusPlatform: "TWITTER",
  duoPlusFingerprintProfile: "aggressive",
  duoPlusPhoneType: "short_term",
  customDns: ["1.1.1.1", "8.8.4.4"],
  customWhitelist: ["twitter.com", "x.com"]
});
```

### **3. Batch Operations**

```typescript
// Create batch request
const batchRequest = createDuoPlusBatchRequest(
  "ACCOUNT_CREATION_PRO",
  50,
  {
    duoPlusPlatform: "TWITTER",
    duoPlusFingerprintProfile: "aggressive"
  },
  proxyPool,
  phoneCountries
);

// Send to DuoPlus API
const response = await fetch("/api/devices/batch", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(batchRequest)
});
```

## 📞 Support and Troubleshooting

### **Common Issues**

1. **Template Not Found**: Verify template ID matches DuoPlus API
2. **Phone Configuration Error**: Check phone type and country availability
3. **Proxy Authentication Failed**: Validate proxy credentials and format
4. **Device Creation Timeout**: Monitor estimated creation times

### **Debug Information**

```typescript
// Enable debug logging
const debugInfo = {
  profile: profile.id,
  duoplusConfig: profile.duoPlusConfig,
  validationResult: validateDuoPlusConfig(template, request),
  estimatedTime: estimateDeviceCreationTime(templateId, phoneConfig)
};
```

### **Performance Monitoring**

```typescript
// Track device creation performance
const metrics = {
  totalDevices: stats.total,
  successRate: (stats.active / stats.total) * 100,
  averageCreationTime: profiles.reduce(
    (sum, p) => sum + (p.duoPlusConfig?.deviceCreationResponse?.estimated_ready_time ? 1 : 0),
    0
  )
};
```

---

This comprehensive DuoPlus pre-configuration mapping system provides seamless integration between the enhanced template system and DuoPlus's device management capabilities, enabling users to create sophisticated proxy-phone combinations for any use case.
