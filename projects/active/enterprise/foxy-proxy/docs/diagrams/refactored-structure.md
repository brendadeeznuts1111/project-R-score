# Refactored Code Structure - ASCII Diagram

## 📁 Proposed Refactored Structure

```text
foxy-proxy/
├── 📄 package.json                 # Monorepo root config
├── 📄 bun.lock                     # Dependency lock file
├── 📄 tsconfig.json                # TypeScript config
├── 📁 packages/
│   └── 📁 dashboard/               # Main React app
│       ├── 📄 package.json         # App dependencies
│       ├── 📄 vite.config.ts       # Build config
│       ├── 📄 vitest.config.ts     # Test config
│       └── 📁 src/
│           ├── 📄 App.tsx          # Root component
│           ├── 📄 main.tsx         # Entry point
│           ├── 📄 index.css        # Global styles
│           ├── 📁 features/        # 🆕 Feature-based organization
│           │   ├── 📁 auth/        # Authentication feature
│           │   │   ├── 📄 components/
│           │   │   ├── 📄 hooks/
│           │   │   ├── 📄 services/
│           │   │   └── 📄 index.ts
│           │   ├── 📁 proxies/     # 🆕 Proxy management feature
│           │   │   ├── 📄 components/
│           │   │   │   ├── 📄 ProxyCard.tsx
│           │   │   │   ├── 📄 ProxyList.tsx
│           │   │   │   └── 📄 ProxyForm.tsx
│           │   │   ├── 📄 hooks/
│           │   │   │   ├── 📄 useProxies.ts
│           │   │   │   └── 📄 useProxyStats.ts
│           │   │   ├── 📄 services/
│           │   │   │   ├── 📄 ipfoxyApi.ts
│           │   │   │   └── 📄 proxyService.ts
│           │   │   ├── 📄 types/
│           │   │   └── 📄 index.ts
│           │   ├── 📁 phones/      # 🆕 Phone management feature
│           │   │   ├── 📄 components/
│           │   │   │   ├── 📄 PhoneCard.tsx
│           │   │   │   ├── 📄 PhoneList.tsx
│           │   │   │   └── 📄 PhoneControl.tsx
│           │   │   ├── 📄 hooks/
│           │   │   │   ├── 📄 usePhones.ts
│           │   │   │   └── 📄 usePhoneActions.ts
│           │   │   ├── 📄 services/
│           │   │   │   ├── 📄 duoplusApi.ts
│           │   │   │   └── 📄 phoneService.ts
│           │   │   ├── 📄 types/
│           │   │   └── 📄 index.ts
│           │   ├── 📁 profiles/    # 🆕 Unified profiles feature
│           │   │   ├── 📄 components/
│           │   │   │   ├── 📄 ProfileCard.tsx
│           │   │   │   ├── 📄 ProfileList.tsx
│           │   │   │   └── 📄 ProfileForm.tsx
│           │   │   ├── 📄 hooks/
│           │   │   │   ├── 📄 useProfiles.ts
│           │   │   │   └── 📄 useProfileTemplates.ts
│           │   │   ├── 📄 services/
│           │   │   │   ├── 📄 profileManager.ts
│           │   │   │   └── 📄 templateService.ts
│           │   │   ├── 📄 types/
│           │   │   └── 📄 index.ts
│           │   ├── 📁 analytics/   # 🆕 Analytics feature
│           │   │   ├── 📄 components/
│           │   │   │   ├── 📄 Dashboard.tsx
│           │   │   │   ├── 📄 Charts.tsx
│           │   │   │   └── 📄 Metrics.tsx
│           │   │   ├── 📄 hooks/
│           │   │   │   ├── 📄 useAnalytics.ts
│           │   │   │   └── 📄 useMetrics.ts
│           │   │   ├── 📄 services/
│           │   │   │   └── 📄 analyticsService.ts
│           │   │   └── 📄 index.ts
│           │   ├── 📁 storage/     # 🆕 File storage feature
│           │   │   ├── 📄 components/
│           │   │   │   ├── 📄 FileUpload.tsx
│           │   │   │   └── 📄 FileList.tsx
│           │   │   ├── 📄 hooks/
│           │   │   │   └── 📄 useFileUpload.ts
│           │   │   ├── 📄 services/
│           │   │   │   ├── 📄 r2Service.ts
│           │   │   │   ├── 📄 awsStorage.ts
│           │   │   │   └── 📄 bunStorage.ts
│           │   │   └── 📄 index.ts
│           │   └── 📁 settings/    # 🆕 Settings feature
│           │       ├── 📄 components/
│           │       ├── 📄 hooks/
│           │       ├── 📄 services/
│           │       └── 📄 index.ts
│           ├── 📁 shared/          # 🆕 Shared utilities
│           │   ├── 📁 components/   # 🆕 Reusable UI components
│           │   │   ├── 📄 Button.tsx
│           │   │   ├── 📄 Card.tsx
│           │   │   ├── 📄 Modal.tsx
│           │   │   ├── 📄 Table.tsx
│           │   │   ├── 📄 Form.tsx
│           │   │   ├── 📄 Layout.tsx
│           │   │   └── 📄 index.ts
│           │   ├── 📁 hooks/       # 🆕 Shared hooks
│           │   │   ├── 📄 useApi.ts
│           │   │   ├── 📄 useLocalStorage.ts
│           │   │   ├── 📄 useDebounce.ts
│           │   │   └── 📄 index.ts
│           │   ├── 📁 services/    # 🆕 Core services
│           │   │   ├── 📄 httpClient.ts
│           │   │   ├── 📄 storageService.ts
│           │   │   ├── 📄 errorService.ts
│           │   │   └── 📄 index.ts
│           │   ├── 📁 utils/        # 🆕 Pure utilities
│           │   │   ├── 📄 formatters.ts
│           │   │   ├── 📄 validators.ts
│           │   │   ├── 📄 constants.ts
│           │   │   └── 📄 index.ts
│           │   ├── 📁 types/        # 🆕 Shared types
│           │   │   ├── 📄 common.ts
│           │   │   ├── 📄 api.ts
│           │   │   └── 📄 index.ts
│           │   └── 📄 index.ts
│           ├── 📁 pages/           # 🔄 Simplified pages
│           │   ├── 📄 OverviewPage.tsx      # 🔄 Route + compose
│           │   ├── 📄 ProxiesPage.tsx       # 🔄 Route + compose
│           │   ├── 📄 PhonesPage.tsx        # 🔄 Route + compose
│           │   ├── 📄 ProfilesPage.tsx      # 🔄 Route + compose
│           │   ├── 📄 AnalyticsPage.tsx     # 🔄 Route + compose
│           │   ├── 📄 SettingsPage.tsx      # 🔄 Route + compose
│           │   └── 📄 index.ts
│           └── 📁 test/            # 🔄 Test structure
│               ├── 📄 setup.ts
│               ├── 📁 __mocks__/
│               └── 📁 features/      # 🆕 Feature-based tests
│                   ├── 📁 proxies/
│                   ├── 📁 phones/
│                   └── 📁 profiles/
├── 📁 scripts/                    # Build/setup scripts
├── 📁 examples/                   # Usage examples
└── 📁 docs/                       # 🆕 Documentation
    ├── 📁 diagrams/
    └── 📁 api/
```

## 🏗️ Refactored Architecture Flow

```text
┌─────────────────────────────────────────────────────────────┐
│                    APP LAYER                                │
├─────────────────────────────────────────────────────────────┤
│  App.tsx                                                   │
│  └─┐                                                       │
│    │                                                       │
│    ▼                                                       │
│  Layout.tsx (shared)                                       │
│  ├─ Header.tsx (shared)                                   │
│  ├─ Sidebar.tsx (shared)                                  │
│  └─┐                                                       │
│    │                                                       │
│    ▼                                                       │
│  React Router Routes → Pages                              │
│  ├─ OverviewPage.tsx      (compose features)              │
│  ├─ ProxiesPage.tsx       (compose features)              │
│  ├─ PhonesPage.tsx        (compose features)              │
│  ├─ ProfilesPage.tsx      (compose features)              │
│  ├─ AnalyticsPage.tsx     (compose features)              │
│  └─ SettingsPage.tsx      (compose features)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                FEATURE LAYER 🆕                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Proxies    │  │   Phones    │  │     Profiles        │ │
│  │   Feature    │  │   Feature   │  │     Feature         │ │
│  ├─ Components │  ├─ Components │  ├─ Components         │ │
│  ├─ Hooks      │  ├─ Hooks      │  ├─ Hooks              │ │
│  ├─ Services   │  ├─ Services   │  ├─ Services           │ │
│  └─ Types      │  └─ Types      │  └─ Types              │ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 SHARED LAYER 🆕                              │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Components  │  │   Services  │  │      Utils           │ │
│  │ (Reusable)  │  │  (Core)     │  │   (Pure)            │ │
│  ├─ Button     │  ├─ HTTP       │  ├─ Formatters         │ │
│  ├─ Card       │  ├─ Storage    │  ├─ Validators         │ │
│  ├─ Modal      │  ├─ Error      │  ├─ Constants          │ │
│  └─ Table      │  └─ Base       │  └─ Helpers            │ │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Refactored Data Flow

```text
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Pages         │    │   Features      │    │  Shared Layer   │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ OverviewPage    │───▶│ Proxies Feature │───▶│ Shared Services │
│ ProxiesPage     │    │                 │    │ HTTP Client     │
│ PhonesPage      │    │ Phones Feature  │    │ Storage Service │
│ ProfilesPage    │    │                 │    │ Error Service   │
│ AnalyticsPage   │    │ Profiles Feature│    │                 │
│ SettingsPage    │    │                 │    │ Shared Utils    │
└─────────────────┘    └─────────────────┘    │ Formatters      │
                              │                │ Validators      │
                              ▼                │ Constants       │
                    ┌─────────────────┐    └─────────────────┘
                    │  External APIs  │
                    ├─────────────────┤
                    │ IPFoxy API      │
                    │ DuoPlus API     │
                    │ Cloudflare R2   │
                    └─────────────────┘
```

## 📊 Refactored Component Dependencies

```text
Pages (Compose Features)
├─┐
  │
  ▼
Features (Self-contained)
├─ Proxies Feature
│  ├─ Components (ProxyCard, ProxyList)
│  ├─ Hooks (useProxies, useProxyStats)
│  ├─ Services (proxyService)
│  └─ Types (ProxyTypes)
├─ Phones Feature
│  ├─ Components (PhoneCard, PhoneControl)
│  ├─ Hooks (usePhones, usePhoneActions)
│  ├─ Services (phoneService)
│  └─ Types (PhoneTypes)
└─ Profiles Feature
   ├─ Components (ProfileCard, ProfileForm)
   ├─ Hooks (useProfiles, useTemplates)
   ├─ Services (profileManager)
   └─ Types (ProfileTypes)
   │
   ▼
Shared Layer (Reusable)
├─ Components (Button, Card, Modal)
├─ Hooks (useApi, useLocalStorage)
├─ Services (httpClient, storageService)
├─ Utils (formatters, validators)
└─ Types (common, api)
```

## 🎯 Refactored Benefits

✅ **Feature-Based** - All related code grouped together  
✅ **Co-location** - Components, hooks, services together  
✅ **Reusability** - Shared components and utilities  
✅ **Maintainability** - Easy to find and modify features  
✅ **Testability** - Feature-based test organization  
✅ **Scalability** - Easy to add new features  
✅ **Imports** - Cleaner, shallower import paths

## 🔄 Migration Strategy

1. **Phase 1**: Create shared layer
   - Extract common components
   - Create shared hooks
   - Set up core services

2. **Phase 2**: Migrate one feature
   - Start with proxies feature
   - Move components, hooks, services
   - Update imports

3. **Phase 3**: Migrate remaining features
   - Phones feature
   - Profiles feature
   - Analytics feature

4. **Phase 4**: Clean up
   - Remove old structure
   - Update documentation
   - Optimize imports

## 📏 Refactoring Principles

- **Single Responsibility** - Each feature has one purpose
- **Don't Repeat Yourself** - Shared code in shared layer
- **Co-location** - Related code lives together
- **Dependency Direction** - Pages → Features → Shared
- **Testability** - Each feature testable in isolation
