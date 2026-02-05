# Complete Business Registration Examples

## Required Fields

All business registrations require:
- `name` - Full business name
- `alias` - Short handle/identifier (used in URLs)
- `startDate` - ISO 8601 date string
- `paymentHandles` - Object with `cashapp`, `venmo`, `paypal`
- `contact` - Contact email/phone

## Example 1: Full Branding

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
    "location": "123 Main St, Downtown",
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

## Example 2: Minimal Branding

```bash
curl -X POST http://localhost:3002/admin/business \
  -H "Authorization: Bearer admin-secret-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Business",
    "alias": "MyBusiness",
    "startDate": "2024-01-01T00:00:00Z",
    "paymentHandles": {
      "cashapp": "$MyBusiness",
      "venmo": "@MyBusiness",
      "paypal": "paypal.me/MyBusiness"
    },
    "contact": "hello@mybusiness.com",
    "branding": {
      "primaryColor": "#4A90E2",
      "backgroundColor": "linear-gradient(135deg, #4A90E2 0%, #7BB3F0 100%)"
    }
  }'
```

## Example 3: No Branding (Uses Defaults)

```bash
curl -X POST http://localhost:3002/admin/business \
  -H "Authorization: Bearer admin-secret-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Simple Business",
    "alias": "SimpleBiz",
    "startDate": "2024-01-01T00:00:00Z",
    "paymentHandles": {
      "cashapp": "$SimpleBiz",
      "venmo": "@SimpleBiz",
      "paypal": "paypal.me/SimpleBiz"
    },
    "contact": "info@simplebiz.com"
  }'
```

## Using the Scripts

```bash
# Full branding example
./examples/register-business-with-branding.sh

# Minimal branding example
./examples/register-business-minimal.sh
```

## Response

Success response:
```json
{
  "success": true,
  "businessId": "a1b2c3d4e5f6"
}
```

Error response:
```json
{
  "error": "Error message here"
}
```

## Testing

After registration, test the payment page:

```bash
# View payment page
open http://localhost:3002/pay?alias=GoldenScissors&amount=25

# Or with curl
curl http://localhost:3002/pay?alias=GoldenScissors&amount=25
```

## Branding Field Reference

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `logoUrl` | string | No | - | URL to logo image |
| `logoText` | string | No | First letter of name | Text to show if no logo |
| `primaryColor` | string | Yes* | `#FF6B35` | Primary brand color (hex) |
| `secondaryColor` | string | No | - | Secondary color |
| `accentColor` | string | No | - | Accent color |
| `backgroundColor` | string | No | Gradient | Background color/gradient |
| `fontFamily` | string | No | System fonts | Custom font family |
| `faviconUrl` | string | No | - | Favicon URL |
| `theme` | string | No | `light` | `light`, `dark`, or `auto` |

*Required if `branding` object is provided
