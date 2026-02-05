# Enhanced Template System Documentation

## 🎯 Overview

The Enhanced Template System combines **IPFoxy proxy capabilities** with **DuoPlus cloud phone features** to create powerful, pre-configured profiles for specific use cases. Each template is optimized for particular scenarios like gaming, social media management, e-commerce, web scraping, development, and streaming.

## 🏗️ Architecture

### Core Components

1. **Enhanced Templates** - Pre-configured profiles with optimal settings
2. **Cloud Phone Integration** - SMS verification, call forwarding, voicemail
3. **Email Account Management** - Gmail, Outlook, Yahoo integration
4. **Social Media Support** - Multi-platform account management
5. **E-commerce Features** - Business accounts, payment processing
6. **Performance Optimization** - DNS, protocols, whitelists/blacklists

### Template Categories

| Category            | Templates | Use Case                               | Key Features                          |
| ------------------- | --------- | -------------------------------------- | ------------------------------------- |
| 🎮 **Gaming**       | 1         | Mobile gaming with phone verification  | Low latency, SMS verification         |
| 📱 **Social Media** | 1         | Multi-platform social media management | Phone verified, email integration     |
| 🛒 **E-commerce**   | 2         | Online stores and business operations  | Payment processing, business email    |
| 🕷️ **Scraping**     | 1         | Web scraping and automation            | Stealth mode, rotating proxies        |
| 💻 **Development**  | 1         | Cloud development and API access       | Secure connections, development tools |
| 📺 **Streaming**    | 1         | Global streaming content access        | Geo-unblocking, HD streaming          |

## 🚀 Quick Start

### 1. Basic Profile Creation

```typescript
import {
  enhancedProfileManager,
  createQuickGamingProfile,
  createQuickSocialMediaProfile
} from "../utils/enhanced";

// Create a gaming profile
const gamingProfile = createQuickGamingProfile(
  "proxy-us-1", // IPFoxy proxy ID
  "phone-us-1", // DuoPlus phone ID
  "+1-555-0123" // Phone number (optional)
);

// Create a social media profile
const socialProfile = createQuickSocialMediaProfile(
  "proxy-us-2",
  "phone-us-2",
  "manager@business.com", // Email address
  "securepassword123", // Email password
  "facebook" // Social platform
);
```

### 2. Advanced Configuration

```typescript
import { enhancedProfileManager } from "../utils/enhanced";

// Create profile with custom settings
const customProfile = enhancedProfileManager.createProfileFromTemplate({
  templateName: "DROPSHIPPING_PRO",
  proxyId: "proxy-us-3",
  phoneId: "phone-us-3",
  customName: "My Dropshipping Store",

  // Email configuration
  emailAddress: "store@business.com",
  emailPassword: "emailpass123",
  emailProvider: "gmail",

  // E-commerce configuration
  ecommercePlatform: "shopify",
  businessEmail: "store@business.com",

  // Custom network settings
  customDns: ["1.1.1.1", "8.8.4.4"],
  customWhitelist: ["shopify.com", "payment.com"]
});
```

### 3. Link Real Data

```typescript
// Link actual proxy data
enhancedProfileManager.linkProxyToProfile(profile.id, {
  id: "proxy-us-1",
  ip: "192.168.1.100",
  port: 8080,
  username: "proxy_user",
  password: "proxy_pass",
  country: "United States"
});

// Link actual phone data
enhancedProfileManager.linkPhoneToProfile(profile.id, {
  id: "phone-us-1",
  name: "US Phone 1",
  region: "Virginia",
  status: "online"
});
```

## 📋 Template Details

### 🎮 GAMING_MOBILE

**Purpose**: Mobile gaming with phone verification and low latency

**Features**:

- ✅ Cloudflare + Google DNS for optimal gaming
- ✅ Phone SMS verification for game accounts
- ✅ Low latency configuration
- ✅ Gaming platform whitelists (PUBG, Fortnite, COD, etc.)
- ✅ Social media blacklists to reduce distractions

**Configuration**:

```typescript
{
  protocol: 'HTTPS',
  dns: ['1.1.1.1', '8.8.8.8'],
  whitelist: ['pubgmobile.com', 'fortnite.com', 'callofduty.com'],
  blacklist: ['facebook.com', 'instagram.com', 'twitter.com'],
  cloudPhone: {
    smsEnabled: true,
    dataPlan: 'unlimited',
    location: 'United States, Virginia'
  }
}
```

**Use Cases**:

- Mobile game account creation
- In-game purchases with phone verification
- Multi-account gaming
- Regional game access

### 📱 SOCIAL_MEDIA_MANAGER

**Purpose**: Complete social media management across multiple platforms

**Features**:

- ✅ Multi-platform support (Facebook, Instagram, Twitter, LinkedIn, TikTok)
- ✅ Phone verification for all platforms
- ✅ Email account integration
- ✅ Call forwarding and voicemail
- ✅ Multiple email aliases

**Configuration**:

```typescript
{
  cloudPhone: {
    smsEnabled: true,
    callForwarding: true,
    voicemail: true,
    dataPlan: 'premium'
  },
  emailAccount: {
    provider: 'gmail',
    twoFactorEnabled: true,
    aliases: ['social@business.com', 'marketing@business.com']
  },
  socialMedia: {
    platform: 'facebook',
    phoneVerification: true,
    twoFactorAuth: true,
    backupCodes: true
  }
}
```

**Use Cases**:

- Social media management agencies
- Influencer account management
- Brand social media presence
- Multi-platform marketing

### 🛒 DROPSHIPPING_PRO

**Purpose**: Professional e-commerce and dropshipping operations

**Features**:

- ✅ Multiple e-commerce platform support
- ✅ Payment processing integration
- ✅ Business email setup
- ✅ Tax and shipping configuration
- ✅ Phone verification for business accounts

**Configuration**:

```typescript
{
  whitelist: ['amazon.com', 'ebay.com', 'shopify.com', 'paypal.com'],
  cloudPhone: {
    smsEnabled: true,
    callForwarding: true,
    location: 'United States, Delaware' // Business-friendly
  },
  emailAccount: {
    provider: 'outlook',
    twoFactorEnabled: true,
    recoveryEmail: 'backup@business.com'
  },
  ecommerce: {
    platform: 'shopify',
    paymentMethods: ['paypal', 'stripe'],
    taxInfo: true,
    returnPolicy: true
  }
}
```

**Use Cases**:

- Dropshipping stores
- E-commerce agencies
- Online retail businesses
- Multi-platform selling

### 🕷️ SCRAPING_STEALTH

**Purpose**: Advanced web scraping with anti-detection measures

**Features**:

- ✅ Stealth mode configuration
- ✅ Rotating proxy support
- ✅ Anti-detection measures
- ✅ CAPTCHA avoidance
- ✅ European location for privacy

**Configuration**:

```typescript
{
  autoRotate: true,
  blacklist: ['cloudflare.com', 'google.com', 'facebook.com'],
  cloudPhone: {
    location: 'Germany, Frankfurt', // Privacy-friendly
    dataPlan: 'basic'
  }
}
```

**Use Cases**:

- Price monitoring
- Market research
- Data aggregation
- Competitor analysis

### 💻 DEVELOPMENT_CLOUD

**Purpose**: Secure cloud development environment

**Features**:

- ✅ SOCKS5 protocol for secure connections
- ✅ Development tool whitelists
- ✅ API access optimization
- ✅ Cloud service integration
- ✅ Secure email for development

**Configuration**:

```typescript
{
  protocol: 'SOCKS5',
  whitelist: ['github.com', 'gitlab.com', 'npmjs.com', 'docker.com'],
  emailAccount: {
    provider: 'gmail',
    aliases: ['dev@company.com', 'ci@company.com']
  }
}
```

**Use Cases**:

- Remote development
- CI/CD pipelines
- API testing
- Cloud deployment

### 📺 STREAMING_GLOBAL

**Purpose**: Access geo-restricted streaming content globally

**Features**:

- ✅ Global streaming platform access
- ✅ HD streaming optimization
- ✅ Geo-unblocking capabilities
- ✅ Multiple service support
- ✅ Premium data plan

**Configuration**:

```typescript
{
  whitelist: ['netflix.com', 'youtube.com', 'hulu.com', 'disney.com'],
  autoRotate: true,
  cloudPhone: {
    location: 'United States, New York',
    dataPlan: 'premium'
  }
}
```

**Use Cases**:

- International content access
- Streaming service testing
- Content moderation
- Regional market research

### 🏢 ACCOUNT_CREATION_PRO

**Purpose**: Professional account creation service

**Features**:

- ✅ Complete account creation workflow
- ✅ Phone verification for all platforms
- ✅ Email management system
- ✅ Social media and e-commerce setup
- ✅ Business account configuration

**Configuration**:

```typescript
{
  cloudPhone: {
    smsEnabled: true,
    callForwarding: true,
    voicemail: true,
    dataPlan: 'unlimited'
  },
  emailAccount: {
    aliases: ['accounts@business.com', 'verification@business.com'],
    twoFactorEnabled: true
  },
  socialMedia: { platform: 'facebook', phoneVerification: true },
  ecommerce: { platform: 'amazon', paymentMethods: ['credit-card'] }
}
```

**Use Cases**:

- Account creation services
- Business setup automation
- Multi-platform account management
- Professional service providers

## 🔧 Advanced Usage

### Custom Template Creation

```typescript
import { enhancedProfileManager } from "../utils/enhanced";

// Create a custom template
const customProfile = enhancedProfileManager.createProfileFromTemplate({
  templateName: "SOCIAL_MEDIA_MANAGER", // Base template
  proxyId: "proxy-custom-1",
  phoneId: "phone-custom-1",
  customName: "Custom Marketing Profile",

  // Override DNS settings
  customDns: ["9.9.9.9", "1.1.1.1"], // Quad9 + Cloudflare

  // Custom whitelist
  customWhitelist: [
    "facebook.com",
    "instagram.com",
    "twitter.com",
    "linkedin.com",
    "pinterest.com",
    "reddit.com"
  ],

  // Custom blacklist
  customBlacklist: ["competitor1.com", "competitor2.com"],

  // Email configuration
  emailAddress: "marketing@mycompany.com",
  emailPassword: "secureemailpass",
  emailProvider: "outlook",

  // Social media configuration
  socialPlatform: "instagram",
  socialUsername: "mybrand"
});
```

### Profile Management

```typescript
// Get all profiles
const allProfiles = enhancedProfileManager.getAllProfiles();

// Get profiles by category
const gamingProfiles = enhancedProfileManager.getProfilesByCategory("gaming");
const socialProfiles = enhancedProfileManager.getSocialMediaProfiles();
const ecommerceProfiles = enhancedProfileManager.getEcommerceProfiles();

// Get profiles requiring phone verification
const phoneRequiredProfiles = enhancedProfileManager.getProfilesNeedingPhoneVerification();

// Get profile statistics
const stats = enhancedProfileManager.getProfileStatistics();
console.log(stats);
// {
//   total: 5,
//   active: 3,
//   byCategory: { gaming: 1, social: 2, ecommerce: 2 },
//   withPhones: 5,
//   withEmails: 4,
//   withSocialMedia: 3,
//   withEcommerce: 2
// }
```

### Performance Monitoring

```typescript
// Update performance metrics
enhancedProfileManager.updatePerformanceMetrics("profile-id", {
  responseTime: 45,
  uptime: 99.9,
  bandwidth: { upload: 100, download: 150 },
  requests: { total: 1000, successful: 995, failed: 5 }
});

// Get performance data
const profile = enhancedProfileManager.getProfileById("profile-id");
console.log(profile.performance);
```

### Import/Export

```typescript
// Export profiles (with sensitive data masked)
const exportData = enhancedProfileManager.exportProfiles(true);

// Import profiles
const importResult = enhancedProfileManager.importProfiles(jsonData);
console.log(`Imported: ${importResult.imported}, Errors: ${importResult.errors.length}`);
```

## 🎨 UI Integration

### React Component Usage

```tsx
import { EnhancedTemplateSelection } from "../components/enhanced/TemplateSelection";

function ProfileCreationPage() {
  const handleProfileCreated = (profile) => {
    console.log("New profile created:", profile);
    // Navigate to profile management or activate profile
  };

  return (
    <EnhancedTemplateSelection
      onProfileCreated={handleProfileCreated}
      availableProxies={proxies}
      availablePhones={phones}
    />
  );
}
```

### Custom UI Components

```tsx
// Template category selector
function TemplateCategorySelector({ selectedCategory, onCategoryChange }) {
  const categories = [
    { id: "all", name: "All Templates", icon: "📋" },
    { id: "GAMING", name: "Gaming", icon: "🎮" },
    { id: "SOCIAL_MEDIA", name: "Social Media", icon: "📱" }
    // ... other categories
  ];

  return (
    <div className="flex gap-2">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={`px-4 py-2 rounded-full ${
            selectedCategory === category.id ? "bg-blue-600 text-white" : "bg-gray-100"
          }`}
        >
          <span className="mr-2">{category.icon}</span>
          {category.name}
        </button>
      ))}
    </div>
  );
}
```

## 🔒 Security Considerations

### Data Protection

```typescript
// Sensitive data is automatically masked in exports
const safeExport = enhancedProfileManager.exportProfiles(true);
// Passwords become '***MASKED***'

// Store sensitive data securely
const secureStorage = {
  proxyPasswords: new Map(), // Store separately
  emailPasswords: new Map(), // Store separately
  phoneNumbers: new Map() // Store separately
};
```

### Best Practices

1. **Use unique passwords** for each account
2. **Enable two-factor authentication** where possible
3. **Regularly rotate** proxy credentials
4. **Monitor performance** and usage metrics
5. **Export with masking** for sharing configurations
6. **Use custom DNS** for additional privacy

## 🚀 Deployment

### Environment Configuration

```typescript
// config/enhanced-templates.ts
export const TEMPLATE_CONFIG = {
  defaultDns: ["1.1.1.1", "8.8.8.8"],
  defaultProtocol: "HTTPS",
  autoRotateInterval: 300000, // 5 minutes
  performanceThresholds: {
    responseTime: 200, // ms
    uptime: 99.0, // %
    bandwidth: 50 // Mbps
  }
};
```

### Production Setup

```typescript
// Initialize with production settings
const manager = new EnhancedUnifiedProfileManager();

// Load existing profiles
const savedProfiles = localStorage.getItem("enhanced-profiles");
if (savedProfiles) {
  manager.importProfiles(savedProfiles);
}

// Set up performance monitoring
setInterval(() => {
  // Update metrics for active profiles
}, 60000); // Every minute
```

## 📊 Monitoring & Analytics

### Performance Tracking

```typescript
// Track profile performance over time
const performanceHistory = new Map<string, PerformanceMetrics[]>();

function trackPerformance(profileId: string, metrics: PerformanceMetrics) {
  if (!performanceHistory.has(profileId)) {
    performanceHistory.set(profileId, []);
  }

  const history = performanceHistory.get(profileId)!;
  history.push({
    ...metrics,
    timestamp: new Date().toISOString()
  });

  // Keep only last 100 entries
  if (history.length > 100) {
    history.shift();
  }
}
```

### Usage Analytics

```typescript
// Analyze template usage
const templateUsage = {
  GAMING_MOBILE: 0,
  SOCIAL_MEDIA_MANAGER: 0,
  DROPSHIPPING_PRO: 0
  // ... other templates
};

function trackTemplateUsage(templateName: string) {
  templateUsage[templateName]++;
}
```

## 🎯 Best Practices

### Profile Organization

1. **Use descriptive names** for easy identification
2. **Tag profiles** with relevant keywords
3. **Group by category** for better organization
4. **Regular cleanup** of unused profiles
5. **Export backups** for disaster recovery

### Performance Optimization

1. **Choose appropriate protocols** (HTTP for speed, SOCKS5 for security)
2. **Optimize DNS settings** for your use case
3. **Use whitelists** to reduce unnecessary traffic
4. **Monitor bandwidth** usage
5. **Enable auto-rotation** for scraping tasks

### Security Measures

1. **Mask sensitive data** in exports
2. **Use strong passwords** for all accounts
3. **Enable 2FA** where supported
4. **Regular credential rotation**
5. **Monitor for suspicious activity**

## 🔮 Future Enhancements

### Planned Features

1. **AI-powered optimization** - Automatic template tuning
2. **Advanced analytics** - Usage patterns and recommendations
3. **Template marketplace** - Community-contributed templates
4. **Mobile app** - On-the-go profile management
5. **API integration** - Third-party tool connections

### Extension Points

```typescript
// Custom template plugins
interface TemplatePlugin {
  name: string;
  version: string;
  configure: (options: any) => EnhancedUnifiedProfile;
  validate: (profile: EnhancedUnifiedProfile) => boolean;
}

// Custom performance monitors
interface PerformanceMonitor {
  track: (profileId: string, metrics: PerformanceMetrics) => void;
  analyze: (profileId: string) => PerformanceAnalysis;
}
```

This enhanced template system provides a comprehensive solution for combining IPFoxy proxy capabilities with DuoPlus cloud phone features, offering powerful, pre-configured profiles for virtually any use case.
