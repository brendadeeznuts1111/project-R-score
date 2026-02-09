# Business Registry Dashboard

A beautiful card-based visual registry of all businesses in the P2P Proxy system.

## 🚀 Quick Start

```bash
# Start the registry server
bun run start:business-registry

# Or directly
bun run dashboard/business-registry.ts
```

Then visit: `localhost:3004/registry`

## 📊 Features

- **Card-based Layout**: Each business displayed as a beautiful card
- **Search & Filter**: Search by name/alias, filter by status
- **Real-time Stats**: Total businesses, active/inactive counts
- **Branding Display**: Shows business logos, colors, and branding
- **Quick Actions**: Test payment links and view stats
- **Auto-refresh**: Updates every 30 seconds

## 🎨 Card Information

Each card displays:
- Business name and alias
- Status (Active/Inactive)
- Location
- Contact information
- Start date (and end date if inactive)
- Migration info (if migrated)
- Payment handles (CashApp, Venmo, PayPal)
- Branding (logo, colors)

## 🔗 Endpoints

### Web Interface
- `GET /` or `GET /registry` - Main registry dashboard

### API
- `GET /api/businesses` - JSON list of all businesses

## 📝 Example: Seed Test Data

```bash
# Register example businesses
./examples/seed-example-businesses.sh

# Then view the registry
open 'http://localhost:3004/registry'
```

## 🎯 Use Cases

1. **Business Discovery**: Browse all registered businesses
2. **Testing**: Quick access to test payment pages
3. **Monitoring**: See active/inactive status at a glance
4. **Branding Review**: Visual preview of business branding
5. **Migration Tracking**: See which businesses have migrated

## 🔧 Configuration

Set in environment variables:
- `REGISTRY_PORT` - Port for registry server (default: 3004)
- `REDIS_URL` - Redis connection URL
- `PROXY_URL` - Base URL for payment links (default: `http://localhost:3002`)

## 📱 Responsive Design

The registry is fully responsive:
- Desktop: Multi-column grid
- Tablet: 2-column grid
- Mobile: Single column

## 🔄 Auto-refresh

The registry automatically refreshes every 30 seconds to show:
- New businesses
- Status changes
- Updated branding

## 🎨 Customization

The registry uses CSS variables for easy theming. Each card's color is set from the business's `primaryColor` branding setting.
