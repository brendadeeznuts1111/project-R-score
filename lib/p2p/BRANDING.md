# Branding System for P2P Proxy

## 📍 Where Branding is Configured

Branding is stored in **two places**:

1. **Business Continuity System** (Redis) - Per-business branding
2. **Environment Variables** - Fallback/default branding

## 🎨 Branding Configuration

### Full Branding Object

```typescript
{
  logoUrl?: string;           // URL to logo image (e.g., "https://example.com/logo.png")
  logoText?: string;          // Text to display if no logo (defaults to first letter)
  primaryColor: string;       // Primary brand color (hex, e.g., "#FF6B35")
  secondaryColor?: string;     // Secondary color
  accentColor?: string;        // Accent color
  backgroundColor?: string;     // Background color/gradient (e.g., "linear-gradient(...)")
  fontFamily?: string;         // Custom font family
  faviconUrl?: string;         // Favicon URL
  theme?: 'light' | 'dark' | 'auto';
}
```

## 🔧 How to Set Branding

### Option 1: Via Business Registration API

```bash
curl -X POST http://localhost:3002/admin/business \
  -H "Authorization: Bearer admin-secret-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Golden Scissors Barbershop",
    "alias": "GoldenScissors",
    "startDate": "2024-01-01T00:00:00Z",
    "paymentHandles": {
      "cashapp": "$GoldenScissors",
      "venmo": "@GoldenScissors",
      "paypal": "paypal.me/GoldenScissors"
    },
    "contact": "contact@goldenscissors.com",
    "location": "123 Main St",
    "branding": {
      "logoUrl": "https://example.com/logo.png",
      "logoText": "GS",
      "primaryColor": "#FF6B35",
      "secondaryColor": "#FF8C5A",
      "accentColor": "#FFB380",
      "backgroundColor": "linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)",
      "fontFamily": "'Inter', sans-serif",
      "faviconUrl": "https://example.com/favicon.ico",
      "theme": "light"
    }
  }'
```

### Option 2: Via Environment Variables (Fallback)

```bash
# .env file
PROXY_BRAND_NAME=HaircutPro
PROXY_CASHTAG=$HaircutPro
PROXY_VENMO=@HaircutPro
PROXY_PAYPAL=paypal.me/HaircutPro
PROXY_COLOR=#FF6B35
```

## 📍 Branding Locations in Code

### 1. Business Continuity System
**File**: `lib/p2p/business-continuity.ts`

- `BusinessIdentity` interface includes `branding?: BrandingConfig`
- Stored in Redis under `business:{businessId}` with key `branding`
- Retrieved via `getCurrentPaymentHandles()` method

### 2. Proxy Server
**File**: `server/p2p-proxy-server-with-continuity.ts`

- `BusinessAwareProxy.getBrandConfig()` - Retrieves branding for an alias
- `generatePaymentPage()` - Uses branding in HTML template
- Falls back to environment variables if business not found

### 3. Payment Page Template
**File**: `server/p2p-proxy-server-with-continuity.ts` (lines ~292-450)

Branding is applied to:
- Logo (image or text)
- Primary color (buttons, accents)
- Background gradient
- Font family
- Favicon

## 🎯 Usage Examples

### Payment Page with Branding

```bash
# Uses branding from business alias
http://localhost:3002/pay?alias=GoldenScissors&amount=25

# Falls back to env vars if alias not found
http://localhost:3002/pay?amount=25
```

### Update Branding for Existing Business

```typescript
// Via API - update the business record
// The branding field will be updated in Redis
```

## 🖼️ Logo Options

1. **Image Logo**: Set `logoUrl` to image URL
   ```json
   {
     "logoUrl": "https://cdn.example.com/logo.png"
   }
   ```

2. **Text Logo**: Set `logoText` (defaults to first letter of brand name)
   ```json
   {
     "logoText": "GS"
   }
   ```

3. **No Logo**: Omit both, uses first letter of brand name

## 🎨 Color System

### Primary Color
- Used for: Logo background, amount display, buttons, hover states
- Required: Yes
- Example: `"#FF6B35"`

### Secondary Color
- Used for: Alternative accents
- Required: No
- Example: `"#FF8C5A"`

### Background Color
- Used for: Page background
- Required: No
- Default: `"linear-gradient(135deg, #667eea 0%, #764ba2 100%)"`
- Can be: Solid color or CSS gradient

## 📝 Example: Complete Branding Setup

```json
{
  "name": "My Awesome Business",
  "alias": "AwesomeBiz",
  "startDate": "2024-01-01T00:00:00Z",
  "paymentHandles": {
    "cashapp": "$AwesomeBiz",
    "venmo": "@AwesomeBiz",
    "paypal": "paypal.me/AwesomeBiz"
  },
  "contact": "hello@awesomebiz.com",
  "location": "456 Business St",
  "branding": {
    "logoUrl": "https://awesomebiz.com/assets/logo.png",
    "logoText": "AB",
    "primaryColor": "#4A90E2",
    "secondaryColor": "#7BB3F0",
    "accentColor": "#A8D5FF",
    "backgroundColor": "linear-gradient(135deg, #4A90E2 0%, #7BB3F0 100%)",
    "fontFamily": "'Poppins', -apple-system, sans-serif",
    "faviconUrl": "https://awesomebiz.com/favicon.ico",
    "theme": "light"
  }
}
```

## 🔍 Where Branding is Applied

1. **Payment Page** (`/pay`)
   - Logo display
   - Color scheme
   - Typography
   - Background

2. **Business Continuity**
   - Migrated businesses retain branding
   - Forwarding preserves brand identity

3. **Admin Dashboard**
   - Business listings show branding info

## 🚀 Quick Start

1. **Register business with branding**:
   ```bash
   bun run test:continuity
   ```

2. **View branded payment page**:
   ```
   http://localhost:3002/pay?alias=YourBusinessAlias&amount=25
   ```

3. **Check branding in Redis**:
   ```bash
   redis-cli
   > HGET business:{businessId} branding
   ```

## 📚 Related Files

- `lib/p2p/business-continuity.ts` - Branding storage & retrieval
- `server/p2p-proxy-server-with-continuity.ts` - Branding application
- `lib/p2p/README.md` - General business continuity docs
