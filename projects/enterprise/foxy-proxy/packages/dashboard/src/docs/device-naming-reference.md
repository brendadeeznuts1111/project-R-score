# Device Naming and Requirements Reference

## 📋 Device Configuration Table

| Template                 | Default Phone     | Default IP/Proxy       | SMS 2FA Required | Password Manager 2FA | Bind Status | DuoPlus Phone Naming   | IPFoxy Proxy Naming    |
| ------------------------ | ----------------- | ---------------------- | ---------------- | -------------------- | ----------- | ---------------------- | ---------------------- |
| **GAMING_MOBILE**        | +1-555-0123 (555) | US-California-LA       | ✅ Required      | ✅ Optional          | 🟢 Bound    | `gaming-phone-{id}`    | `gaming-proxy-{ip}`    |
| **SOCIAL_MEDIA_MANAGER** | +1-555-0134 (555) | US-California-LA       | ✅ Required      | ✅ Required          | 🟢 Bound    | `social-phone-{id}`    | `social-proxy-{ip}`    |
| **DROPSHIPPING_PRO**     | +1-555-0156 (555) | US-Delaware-Wilmington | ✅ Required      | ✅ Required          | 🟢 Bound    | `ecommerce-phone-{id}` | `ecommerce-proxy-{ip}` |
| **ACCOUNT_CREATION_PRO** | +1-555-0178 (555) | US-Texas-Dallas        | ✅ Required      | ✅ Required          | 🟢 Bound    | `account-phone-{id}`   | `account-proxy-{ip}`   |
| **SCRAPING_STEALTH**     | +1-555-0190 (555) | Germany-Frankfurt      | ❌ Not Required  | ❌ Not Required      | 🔴 Unbound  | `scraping-phone-{id}`  | `scraping-proxy-{ip}`  |
| **DEVELOPMENT_CLOUD**    | +1-555-0145 (555) | US-Oregon-Portland     | ❌ Not Required  | ✅ Optional          | 🔴 Unbound  | `dev-phone-{id}`       | `dev-proxy-{ip}`       |
| **STREAMING_GLOBAL**     | +1-555-0167 (555) | US-NewYork-NYC         | ❌ Not Required  | ❌ Not Required      | 🔴 Unbound  | `streaming-phone-{id}` | `streaming-proxy-{ip}` |

## 🔐 Authentication Requirements

### SMS 2FA Requirements

- **Required For**: Gaming, Social Media, E-commerce templates
- **Optional For**: Development template
- **Not Required**: Scraping, Streaming templates
- **Implementation**: Phone number must be verified and capable of receiving SMS

### Password Manager 2FA Requirements

- **Required For**: Social Media, E-commerce templates
- **Optional For**: Gaming, Development templates
- **Not Required**: Scraping, Streaming templates
- **Implementation**: Must support TOTP/OTP codes from password managers

## 🔗 Binding Configuration

### Bound Status (🟢)

- Phone and proxy are permanently linked
- Configuration persists across reboots
- Optimized for consistent identity

### Unbound Status (🔴)

- Phone and proxy operate independently
- Flexible configuration changes
- Better for rotating/scaling operations

## 📱 DuoPlus API Phone Naming Convention

### Standard Format

```typescript
`{template}-phone-{uuid}`;
```

### Examples

- `gaming-phone-d0efde27-6bc8-4f5c-bfee-b0bb732bfc36`
- `social-phone-a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- `dev-phone-12345678-9abc-def0-1234-56789abcdef0`

### API Response Structure

```json
{
  "id": "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36",
  "name": "gaming-phone-d0efde27-6bc8-4f5c-bfee-b0bb732bfc36",
  "phoneNumber": "+1-555-0123",
  "areaCode": "555",
  "status": "online",
  "location": {
    "country": "United States",
    "region": "California",
    "city": "Los Angeles"
  }
}
```

## 🌐 IPFoxy Proxy Naming Convention

### Standard Format

```typescript
`{template}-proxy-{ip_address}`;
```

### Examples

- `gaming-proxy-192.168.1.100`
- `social-proxy-10.0.0.50`
- `dev-proxy-172.16.0.25`

### API Response Structure

```json
{
  "id": "proxy-us-1",
  "name": "gaming-proxy-192.168.1.100",
  "ip": "192.168.1.100",
  "port": 8080,
  "protocol": "SOCKS5",
  "location": {
    "country": "United States",
    "region": "California",
    "city": "Los Angeles"
  }
}
```

## 🎯 Template-Specific Configurations

### Gaming Templates

```typescript
// Phone Configuration
{
  phoneNumber: "+1-555-0123",
  areaCode: "555",
  smsEnabled: true,
  protocol: "SOCKS5",
  bindStatus: "bound"
}

// Proxy Configuration
{
  name: "gaming-proxy-192.168.1.100",
  protocol: "SOCKS5",
  dns: ["1.1.1.1", "8.8.8.8"],
  bindStatus: "bound"
}
```

### Social Media Templates

```typescript
// Phone Configuration
{
  phoneNumber: "+1-555-0134",
  areaCode: "555",
  smsEnabled: true,
  twoFactorAuth: true,
  passwordManagerSupport: true,
  bindStatus: "bound"
}

// Proxy Configuration
{
  name: "social-proxy-10.0.0.50",
  protocol: "HTTPS",
  whitelist: ["facebook.com", "instagram.com"],
  bindStatus: "bound"
}
```

### Development Templates

```typescript
// Phone Configuration
{
  phoneNumber: "+1-555-0145",
  areaCode: "555",
  smsEnabled: false,
  protocol: "SOCKS5",
  bindStatus: "unbound"
}

// Proxy Configuration
{
  name: "dev-proxy-172.16.0.25",
  protocol: "SOCKS5",
  whitelist: ["github.com", "gitlab.com"],
  bindStatus: "unbound"
}
```

## 🔄 Integration Mapping

### Unified Profile Creation

```typescript
const unifiedProfile = {
  id: "profile-gaming-001",
  name: "US East Gaming Profile",

  // DuoPlus Phone
  phone: {
    id: "d0efde27-6bc8-4f5c-bfee-b0bb732bfc36",
    name: "gaming-phone-d0efde27-6bc8-4f5c-bfee-b0bb732bfc36",
    phoneNumber: "+1-555-0123",
    areaCode: "555",
    bindStatus: "bound"
  },

  // IPFoxy Proxy
  proxy: {
    id: "proxy-us-1",
    name: "gaming-proxy-192.168.1.100",
    ip: "192.168.1.100",
    protocol: "SOCKS5",
    bindStatus: "bound"
  },

  // Template Configuration
  template: "GAMING_MOBILE",
  requirements: {
    sms2fa: true,
    passwordManager2fa: false,
    bound: true
  }
};
```

## 📊 Quick Reference Matrix

| Feature              | Gaming | Social | E-commerce | Scraping | Development | Streaming |
| -------------------- | ------ | ------ | ---------- | -------- | ----------- | --------- |
| **SMS 2FA**          | ✅     | ✅     | ✅         | ❌       | ❌          | ❌        |
| **Password Manager** | 💡     | ✅     | ✅         | ❌       | 💡          | ❌        |
| **Bound**            | ✅     | ✅     | ✅         | ❌       | ❌          | ❌        |
| **SOCKS5**           | ✅     | ❌     | ❌         | ❌       | ✅          | ❌        |
| **HTTPS**            | ❌     | ✅     | ✅         | ✅       | ❌          | ✅        |

**Legend:**

- ✅ = Required/Enabled
- ❌ = Not Required/Disabled
- 💡 = Optional

## 🛠️ Implementation Notes

### API Integration

- **DuoPlus**: Uses UUID-based phone identification
- **IPFoxy**: Uses IP-based proxy identification
- **Unified**: Combines both naming conventions for clear mapping

### Security Considerations

- Phone numbers are masked in logs
- IP addresses are encrypted in storage
- Bind status affects security model

### Performance Optimization

- Bound configurations have lower latency
- Unbound configurations offer more flexibility
- Protocol selection impacts speed vs security

This reference table provides a comprehensive overview of device naming conventions, authentication requirements, and binding configurations for all enhanced templates in the Foxy Proxy system.
