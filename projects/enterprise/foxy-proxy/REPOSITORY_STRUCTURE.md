# Repository Organization Structure

## Overview

This document outlines the organized structure of the Foxy Proxy repository with unified proxy and DuoPlus management.

## Root Structure

```
foxy-proxy/
├── README.md                    # Main project documentation
├── package.json                 # Root package configuration
├── bun.lock                     # Lock file for dependencies
├── bunfig.toml                  # Bun configuration
├── tsconfig.json                # Root TypeScript configuration
├── .env.example                 # Environment variables template
├── docs/                        # Documentation directory
│   ├── api/                     # API documentation
│   ├── guides/                  # User guides
│   └── development/             # Development docs
├── examples/                    # Usage examples
│   ├── basic-proxy/             # Basic proxy setup
│   ├── duoplus-integration/     # DuoPlus integration examples
│   └── unified-profiles/        # Unified profile examples
├── packages/                    # Monorepo packages
│   ├── dashboard/               # React dashboard application
│   ├── core/                    # Core proxy functionality
│   ├── duoplus/                 # DuoPlus integration
│   └── types/                   # Shared TypeScript types
├── scripts/                     # Build and utility scripts
│   ├── build.sh                 # Build script
│   ├── deploy.sh                # Deployment script
│   └── setup.sh                 # Setup script
└── tools/                       # Development tools
    ├── lint-staged.config.js    # Lint staging config
    └── prettier.config.js       # Prettier config
```

## Dashboard Package Structure

```
packages/dashboard/
├── README.md                    # Dashboard-specific documentation
├── package.json                 # Dashboard dependencies
├── vite.config.ts               # Vite configuration
├── vitest.config.ts             # Vitest testing config
├── tsconfig.app.json            # App TypeScript config
├── tsconfig.node.json           # Node TypeScript config
├── eslint.config.js             # ESLint configuration
├── tailwind.config.js           # Tailwind CSS config
├── postcss.config.js            # PostCSS configuration
├── index.html                   # HTML entry point
├── public/                      # Static assets
│   ├── favicon.ico              # Favicon
│   └── manifest.json            # PWA manifest
└── src/                         # Source code
    ├── main.tsx                 # Application entry point
    ├── App.tsx                  # Root component
    ├── index.css                # Global styles
    ├── assets/                  # Static assets
    │   ├── images/              # Images
    │   ├── icons/               # Icons
    │   └── fonts/               # Fonts
    ├── components/              # Reusable components
    │   ├── common/              # Common UI components
    │   │   ├── Button/          # Button component
    │   │   ├── Input/           # Input component
    │   │   ├── Modal/           # Modal component
    │   │   └── index.ts         # Component exports
    │   ├── layout/              # Layout components
    │   │   ├── Header/          # Header component
    │   │   ├── Sidebar/         # Sidebar component
    │   │   ├── Footer/          # Footer component
    │   │   └── index.ts         # Layout exports
    │   ├── charts/              # Chart components
    │   │   ├── LineChart/       # Line chart
    │   │   ├── BarChart/        # Bar chart
    │   │   ├── PieChart/        # Pie chart
    │   │   └── index.ts         # Chart exports
    │   └── index.ts             # Component barrel export
    ├── pages/                   # Page components
    │   ├── OverviewPage/        # Dashboard overview
    │   │   ├── index.tsx        # Page component
    │   │   ├── components/      # Page-specific components
    │   │   └── types.ts         # Page-specific types
    │   ├── ProxiesPage/         # Proxy management
    │   │   ├── index.tsx
    │   │   ├── components/
    │   │   └── types.ts
    │   ├── AnalyticsPage/       # Analytics dashboard
    │   │   ├── index.tsx
    │   │   ├── components/
    │   │   └── types.ts
    │   ├── DuoPlusPage/         # DuoPlus management
    │   │   ├── index.tsx
    │   │   ├── components/
    │   │   └── types.ts
    │   ├── UnifiedManagementPage/ # Unified management
    │   │   ├── index.tsx
    │   │   ├── components/
    │   │   └── types.ts
    │   ├── SettingsPage/        # Settings
    │   │   ├── index.tsx
    │   │   ├── components/
    │   │   └── types.ts
    │   └── index.ts             # Page barrel export
    ├── hooks/                   # Custom React hooks
    │   ├── useProxyData/        # Proxy data hook
    │   │   ├── index.ts         # Hook implementation
    │   │   └── types.ts         # Hook types
    │   ├── useUnifiedProfiles/  # Unified profiles hook
    │   │   ├── index.ts
    │   │   └── types.ts
    │   ├── useLocalStorage/     # Local storage hook
    │   │   ├── index.ts
    │   │   └── types.ts
    │   └── index.ts             # Hook barrel export
    ├── services/                # API and data services
    │   ├── api/                 # API clients
    │   │   ├── proxy/           # Proxy API
    │   │   │   ├── client.ts    # API client
    │   │   │   ├── types.ts     # API types
    │   │   │   └── index.ts     # API exports
    │   │   ├── duoplus/         # DuoPlus API
    │   │   │   ├── client.ts    # API client
    │   │   │   ├── types.ts     # API types
    │   │   │   └── index.ts     # API exports
    │   │   └── analytics/       # Analytics API
    │   │       ├── client.ts    # API client
    │   │       ├── types.ts     # API types
    │   │       └── index.ts     # API exports
    │   ├── storage/             # Storage services
    │   │   ├── localStorage.ts  # Local storage
    │   │   ├── sessionStorage.ts # Session storage
    │   │   └── index.ts         # Storage exports
    │   └── index.ts             # Service barrel export
    ├── stores/                  # State management
    │   ├── proxyStore/          # Proxy state
    │   │   ├── index.ts         # Store implementation
    │   │   ├── types.ts         # Store types
    │   │   └── hooks.ts         # Store hooks
    │   ├── duoplusStore/        # DuoPlus state
    │   │   ├── index.ts
    │   │   ├── types.ts
    │   │   └── hooks.ts
    │   ├── unifiedStore/        # Unified profile state
    │   │   ├── index.ts
    │   │   ├── types.ts
    │   │   └── hooks.ts
    │   └── index.ts             # Store barrel export
    ├── utils/                   # Utility functions
    │   ├── proxy/               # Proxy utilities
    │   │   ├── helpers.ts       # Helper functions
    │   │   ├── validators.ts    # Validation utilities
    │   │   └── index.ts         # Proxy utils export
    │   ├── duoplus/             # DuoPlus utilities
    │   │   ├── client.ts        # API client
    │   │   ├── helpers.ts       # Helper functions
    │   │   ├── types.ts         # Type definitions
    │   │   └── index.ts         # DuoPlus utils export
    │   ├── unified/             # Unified profile utilities
    │   │   ├── manager.ts       # Profile manager
    │   │   ├── templates.ts     # Profile templates
    │   │   ├── validators.ts    # Validation utilities
    │   │   └── index.ts         # Unified utils export
    │   ├── common/              # Common utilities
    │   │   ├── format.ts        # Formatting utilities
    │   │   ├── validation.ts    # Common validation
    │   │   ├── constants.ts     # Common constants
    │   │   └── index.ts         # Common utils export
    │   └── index.ts             # Utils barrel export
    ├── types/                   # Type definitions
    │   ├── api/                 # API types
    │   │   ├── proxy.ts         # Proxy API types
    │   │   ├── duoplus.ts       # DuoPlus API types
    │   │   ├── analytics.ts     # Analytics API types
    │   │   └── index.ts         # API types export
    │   ├── components/          # Component types
    │   │   ├── common.ts        # Common component types
    │   │   ├── charts.ts        # Chart component types
    │   │   └── index.ts         # Component types export
    │   ├── store/               # Store types
    │   │   ├── proxy.ts         # Proxy store types
    │   │   ├── duoplus.ts       # DuoPlus store types
    │   │   ├── unified.ts       # Unified store types
    │   │   └── index.ts         # Store types export
    │   ├── unified.ts           # Unified profile types
    │   └── index.ts             # Types barrel export
    ├── test/                    # Test files
    │   ├── __mocks__/           # Mock files
    │   │   ├── api.ts           # API mocks
    │   │   ├── storage.ts       # Storage mocks
    │   │   └── index.ts         # Mock exports
    │   ├── setup.ts             # Test setup
    │   ├── utils/               # Test utilities
    │   │   ├── testUtils.ts     # Test helper functions
    │   │   ├── mocks.ts         # Mock factories
    │   │   └── index.ts         # Test utils export
    │   ├── integration/         # Integration tests
    │   │   ├── api.test.ts      # API integration tests
    │   │   ├── duoplus.test.ts  # DuoPlus integration tests
    │   │   └── unified.test.ts  # Unified integration tests
    │   ├── unit/                # Unit tests
    │   │   ├── components/      # Component tests
    │   │   ├── hooks/           # Hook tests
    │   │   ├── utils/           # Utility tests
    │   │   └── services/        # Service tests
    │   └── e2e/                 # End-to-end tests
    │       ├── auth.test.ts     # Authentication tests
    │       ├── proxy.test.ts    # Proxy management tests
    │       └── unified.test.ts  # Unified management tests
    └── styles/                  # Style files
        ├── globals.css          # Global styles
        ├── components.css       # Component styles
        ├── variables.css        # CSS variables
        └── themes/              # Theme files
            ├── light.css        # Light theme
            └── dark.css         # Dark theme
```

## Organization Principles

### 1. **Feature-Based Structure**

- Each feature has its own directory with components, types, and tests
- Clear separation of concerns
- Easy to locate and maintain related files

### 2. **Barrel Exports**

- Each directory has an `index.ts` file for clean imports
- Improves developer experience with cleaner import statements
- Enables tree-shaking for better bundle optimization

### 3. **Type Safety**

- All types are co-located with their implementation
- Shared types are in dedicated directories
- Full TypeScript coverage

### 4. **Test Organization**

- Tests are organized by type (unit, integration, e2e)
- Test files mirror the source structure
- Comprehensive test coverage

### 5. **Scalability**

- Modular structure supports easy feature addition
- Clear boundaries between different concerns
- Supports team collaboration

## Migration Benefits

1. **Improved Developer Experience**
   - Easier file navigation
   - Cleaner import statements
   - Better IDE support

2. **Better Maintainability**
   - Clear separation of concerns
   - Consistent naming conventions
   - Modular architecture

3. **Enhanced Scalability**
   - Easy to add new features
   - Supports team collaboration
   - Better code organization

4. **Improved Performance**
   - Better tree-shaking
   - Optimized bundle sizes
   - Faster build times

5. **Better Testing**
   - Organized test structure
   - Easier to locate and run tests
   - Better test coverage

This structure provides a solid foundation for a scalable, maintainable proxy management application.
