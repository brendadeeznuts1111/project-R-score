# Project Structure

## 📁 Root Directory Organization

```
b-react-hmr-refresh/
├── 📄 Configuration
│   ├── package.json          # Dependencies & npm scripts
│   ├── bun.config.ts         # Bun build configuration
│   ├── tsconfig.json         # TypeScript compiler options
│   ├── .npmrc                # NPM registry configuration
│   └── bun.lock              # Dependency lock file
│
├── 📚 Documentation
│   ├── README.md             # Project overview & quick start
│   ├── PROJECT_STRUCTURE.md  # This file - detailed structure
│   └── docs/                 # In-depth documentation
│       ├── build-files-option.md     # Virtual files guide
│       └── react-fast-refresh.md      # HMR documentation
│
├── 🔧 Development Tools
│   ├── scripts/              # Automation scripts
│   │   ├── setup.sh          # Environment setup
│   │   └── clean.sh          # Build cleanup
│   ├── tools/                # Development utilities
│   │   ├── serve.ts          # Static file server
│   │   └── cli/              # Command-line tools
│   │       └── analyze.ts    # File analysis CLI
│   └── examples/             # Build demonstrations
│       ├── build-examples.ts # React Fast Refresh examples
│       └── build-files-demo.ts # Virtual files examples
│
├── 🌐 API Layer
│   └── api/
│       ├── index.ts          # Main Hono API server
│       ├── server-simplified.ts # URLPattern routing demo
│       └── server.ts         # Additional server configuration
│
├── ⚛️ Frontend Application
│   └── src/
│       ├── index.tsx         # React application entry point
│       ├── components/       # Reusable UI components
│       │   ├── FileAnalyzer.tsx      # File upload & analysis
│       │   ├── FileAnalyzerWithAuth.tsx # Authenticated version
│       │   └── DOMAnalyzer.tsx       # DOM manipulation demo
│       ├── api/             # API integration layer
│       │   ├── cookie-manager.ts     # Cookie management
│       │   ├── auth-cookie-handler.ts # Authentication
│       │   ├── authenticated-client.ts # HTTP client
│       │   └── routes.ts             # URLPattern routing
│       ├── stores/          # State management
│       │   └── fileStore.ts  # Zustand file store
│       ├── utils/           # Utility functions
│       │   ├── colors.ts     # Color system
│       │   ├── dom-helpers.ts # DOM manipulation
│       │   ├── cookie-debug.ts # Cookie debugging
│       │   ├── generate-diagram.ts # Diagram generation
│       │   └── validate-colors.ts # Color validation
│       ├── types/           # TypeScript definitions
│       │   └── global.d.ts   # Global type declarations
│       ├── config/          # Configuration files
│       │   └── features.ts   # Feature flags
│       ├── workers/         # Web workers
│       │   └── analyzer.ts   # File analysis worker
│       ├── dev/             # Development tools
│       │   └── dashboard.tsx # Development dashboard
│       └── __tests__/       # Component tests
│           └── hmr.test.tsx  # HMR functionality tests
│
├── 🧪 Test Suite
│   └── test/
│       ├── cookiemap.test.ts        # CookieMap API tests
│       ├── cookie-manager.test.ts   # Cookie manager tests
│       ├── cookies.test.ts          # Cookie handling tests
│       ├── dom-helpers.test.ts      # DOM helper tests
│       ├── performance.test.ts      # Performance benchmarks
│       └── fixtures/               # Test data
│           └── 10mb.bin           # Large file test data
│
├── 📦 Build Output
│   ├── public/              # Development builds
│   │   ├── index.js         # Main application bundle
│   │   ├── index.html       # HTML entry point
│   │   ├── virtual-app/     # Pure virtual build demo
│   │   ├── development/     # Development environment build
│   │   ├── staging/         # Staging environment build
│   │   ├── production/      # Production optimized build
│   │   ├── generated-build/ # Code generation demo
│   │   ├── test-build/      # Testing build with mocks
│   │   ├── content-types/   # Different content types demo
│   │   ├── with-refresh/    # React Fast Refresh enabled
│   │   └── without-refresh/ # React Fast Refresh disabled
│   └── dist/                # Distribution builds
│       └── api/             # API server builds
│           └── index.js     # Minified API server
│
├── 🎯 Learning Materials
│   └── 01-session/          # Bun fundamentals tutorial
│       ├── README.md        # Session overview
│       ├── guide.md         # Comprehensive implementation guide
│       ├── CLAUDE.md        # AI assistant configuration
│       ├── index.ts         # Simple example
│       ├── package.json     # Session dependencies
│       └── tsconfig.json    # Session TypeScript config
│
└── 📄 Additional Files
    ├── index.html           # HTML template
    └── .gitignore          # Git ignore patterns
```

## 🚀 Key Architecture Patterns

### 1. **Separation of Concerns**
- **API Layer**: `/api/` - Backend services
- **Frontend**: `/src/` - React application
- **Tools**: `/tools/` - Development utilities
- **Examples**: `/examples/` - Demonstrations

### 2. **Build Strategy**
- **Development**: HMR enabled with source maps
- **Production**: Minified, optimized bundles
- **Multi-Environment**: Separate builds per environment
- **Virtual Files**: In-memory code generation

### 3. **Testing Architecture**
- **Unit Tests**: Individual function testing
- **Integration Tests**: Component interaction testing
- **Performance Tests**: Benchmarking and optimization
- **Fixtures**: Reusable test data

### 4. **Documentation Structure**
- **Quick Start**: `README.md`
- **Detailed Guides**: `/docs/` directory
- **Code Examples**: `/examples/` directory
- **API Reference**: Inline documentation

## 🛠 Available Scripts

```bash
# Development
bun run dev          # Start development server with HMR
bun run start        # Start production server
bun run setup        # Initialize development environment
bun run clean        # Clean build artifacts

# Building
bun run build        # Production build
bun run build:dev    # Development build
bun run build:prod   # Production optimized build

# Examples & Demos
bun run build:files  # All virtual files examples
bun run build:virtual # Pure virtual application
bun run build:overrides # File override examples
bun run build:generated # Code generation examples

# Utilities
bun run analyze      # File analysis CLI
bun run generate:diagram # Architecture diagrams
bun run validate:colors # Color contrast validation
```

## 🎯 Design Principles

1. **Zero Dependencies**: Use Bun's native APIs when possible
2. **Type Safety**: Full TypeScript coverage
3. **Performance**: Optimized builds and minimal overhead
4. **Developer Experience**: HMR, hot reload, and comprehensive tooling
5. **Documentation**: Complete guides and examples
6. **Testing**: Comprehensive test coverage
7. **Modularity**: Clear separation of concerns

## 📊 Project Metrics

- **Total Files**: 68+ files
- **Directories**: 36+ directories
- **Documentation**: 4 comprehensive guides
- **Examples**: 6 build demonstrations
- **Tests**: 5 test suites
- **Build Variants**: 10+ different build configurations

This structure demonstrates enterprise-grade organization while maintaining simplicity and developer productivity.
