const config = {
  // Entry points
  entrypoints: [
    './bot-controller.ts',
    './bot-monitor.ts'
  ],
  
  // Output directory
  outdir: './dist',
  
  // Target environment
  target: 'bun',
  
  // Source maps
  sourcemap: 'external',
  
  // Minification (only in production)
  minify: process.env.NODE_ENV === 'production',
  
  // CSS Configuration (from SERO)
  css: {
    modules: {
      pattern: '*.module.css',
      generateScopedName: '[name]__[local]__[hash:base64:5]'
    },
    minify: process.env.NODE_ENV === 'production',
    features: {
      nesting: true,
      colors: { 
        opacity: true, 
        displayP3: true 
      },
      logical: { 
        dir: 'ltr' 
      }
    },
    targets: {
      browsers: '> 0.5%, last 2 versions, not dead'
    }
  },
  
  // LSP Server Configuration
  lsp: {
    enabled: true,
    port: 50045,
    workspace: './poly-kalshi-arb',
    
    // Enhanced features
    features: {
      diagnostics: true,
      completion: true,
      hover: true,
      definition: true,
      references: true,
      formatting: true,
      rename: true,
      codeActions: true,
      inlayHints: true,
      semanticTokens: true,
      signatureHelp: true,
      documentHighlight: true,
      documentSymbol: true,
      workspaceSymbol: true,
      foldingRange: true,
      selectionRange: true,
      callHierarchy: true,
      typeHierarchy: true,
      implementation: true,
      typeDefinition: true,
      colorProvider: true
    },
    
    // Performance settings
    performance: {
      maxConcurrentRequests: 10,
      requestTimeout: 30000,
      cacheSize: 1000,
      gcInterval: 60000
    },
    
    // Security settings
    security: {
      allowedHosts: ['localhost', '127.0.0.1'],
      enableCORS: true,
      rateLimit: { 
        windowMs: 60000, 
        max: 100 
      }
    }
  },
  
  // External dependencies
  external: [
    'node:*',
    'bun:*'
  ],
  
  // Define plugin
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
  },
  
  // Loader configuration
  loader: {
    '.ts': 'tsx',
    '.tsx': 'tsx',
    '.js': 'jsx',
    '.jsx': 'jsx',
    '.css': 'css',
    '.json': 'json',
    '.toml': 'toml'
  },
  
  // Plugins (future extensions)
  plugins: [],
  
  // Root path
  root: '.',
  
  // Public directory for assets
  publicDir: './public',
  
  // Environment variables (inline for build-time)
  env: 'inline'
};

export default config;
