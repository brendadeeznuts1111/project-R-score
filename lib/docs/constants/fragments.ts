#!/usr/bin/env bun

/**
 * 🔗 Enhanced URL Fragments with GitHub Integration
 * 
 * Comprehensive fragment patterns for deep linking, GitHub URLs,
 * and text fragment support (Scroll to Text Fragment).
 */

export const ENTERPRISE_URL_FRAGMENTS = {
  // Navigation and view fragments
  NAVIGATION: {
    OVERVIEW: 'overview' as const,
    EXAMPLES: 'examples' as const,
    API: 'api' as const,
    CONFIGURATION: 'configuration' as const,
    TROUBLESHOOTING: 'troubleshooting' as const,
    FAQ: 'faq' as const
  },
  
  // Interactive fragments
  INTERACTIVE: {
    PLAYGROUND: 'playground' as const,
    DEMO: 'demo' as const,
    TUTORIAL: 'tutorial' as const,
    WORKSHOP: 'workshop' as const
  },
  
  // GitHub-specific fragments
  GITHUB: {
    TREE: 'tree' as const,
    BLOB: 'blob' as const,
    COMMIT: 'commit' as const,
    ISSUE: 'issue' as const,
    PULL: 'pull' as const,
    BRANCH: 'branch' as const,
    TAG: 'tag' as const,
    RELEASE: 'release' as const
  },
  
  // TypeScript and package fragments
  TYPESCRIPT: {
    INTERFACE: 'interface' as const,
    TYPE: 'type' as const,
    NAMESPACE: 'namespace' as const,
    ENUM: 'enum' as const,
    FUNCTION: 'function' as const,
    CLASS: 'class' as const
  },
  
  // Typed array and binary data fragments
  TYPED_ARRAY: {
    OVERVIEW: 'typedarray' as const,
    METHODS: 'methods' as const,
    CONVERSION: 'conversion' as const,
    PERFORMANCE: 'performance' as const,
    EXAMPLES: 'examples' as const,
    BUFFER: 'buffer' as const,
    DATA_VIEW: 'dataview' as const,
    SHARED_ARRAY_BUFFER: 'sharedarraybuffer' as const
  },
  
  // Networking fragments
  NETWORKING: {
    FETCH: 'fetch' as const,
    WEBSOCKET: 'websocket' as const,
    HTTP: 'http' as const,
    TCP: 'tcp' as const,
    UNIX_SOCKETS: 'unix-sockets' as const,
    TLS: 'tls' as const,
    PROXY: 'proxy' as const,
    DNS: 'dns' as const
  },
  
  // Text fragments (for bun.com/reference)
  TEXT_FRAGMENTS: {
    NODE_ZLIB: 'node:zlib' as const,
    BUN_API_REFERENCE: 'Bun API Reference' as const,
    TYPED_ARRAY_METHODS: 'TypedArray methods' as const,
    FETCH_TIMEOUT: 'fetch timeout' as const,
    WEBSOCKET_EXAMPLE: 'WebSocket example' as const
  },
  
  // State management fragments
  STATE: {
    THEME: 'theme' as const,
    LANGUAGE: 'language' as const,
    VERSION: 'version' as const,
    PLATFORM: 'platform' as const,
    EXPERIMENTAL: 'experimental' as const
  },
  
  // Performance and debugging fragments
  PERFORMANCE: {
    BENCHMARK: 'benchmark' as const,
    PROFILING: 'profiling' as const,
    OPTIMIZATION: 'optimization' as const,
    MEMORY: 'memory' as const,
    CPU: 'cpu' as const
  }
} as const;

// GitHub-specific URL patterns
export const GITHUB_URL_PATTERNS = {
  // Pattern: /:owner/:repo/tree/:commit/:path
  TREE_VIEW: /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)(?:\/(.*))?$/,
  
  // Pattern: /:owner/:repo/blob/:commit/:path
  BLOB_VIEW: /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)(?:\/(.*))?$/,
  
  // Pattern: /:owner/:repo/commit/:hash
  COMMIT_VIEW: /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/commit\/([^/]+)$/,
  
  // Pattern: /:owner/:repo/issues/:number
  ISSUE_VIEW: /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)$/,
  
  // Pattern: /:owner/:repo/pull/:number
  PULL_REQUEST_VIEW: /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)$/,
  
  // Pattern: /:owner/:repo/releases/tag/:tag
  RELEASE_TAG_VIEW: /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/releases\/tag\/([^/]+)$/,
  
  // Pattern: /:owner/:repo/discussions/:number
  DISCUSSION_VIEW: /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/discussions\/(\d+)$/,
  
  // Pattern: /:owner/:repo/actions/runs/:id
  ACTIONS_RUN_VIEW: /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/actions\/runs\/(\d+)$/
} as const;

// Text fragment patterns (Scroll to Text Fragment specification)
export const TEXT_FRAGMENT_SPEC = {
  // Basic pattern: #:~:text=textStart
  BASIC: '#:~:text=',
  
  // With prefix: #:~:text=prefix-,textStart
  WITH_PREFIX: '#:~:text=prefix-,textStart',
  
  // With suffix: #:~:text=textStart,-suffix
  WITH_SUFFIX: '#:~:text=textStart,-suffix',
  
  // Full pattern: #:~:text=prefix-,textStart,textEnd,-suffix
  FULL: '#:~:text=prefix-,textStart,textEnd,-suffix',
  
  // Encoding helpers
  encode: (text: string) => encodeURIComponent(text),
  decode: (encoded: string) => decodeURIComponent(encoded),
  
  // Build text fragment
  build: (options: {
    textStart: string;
    prefix?: string;
    textEnd?: string;
    suffix?: string;
  }) => {
    let fragment = '#:~:text=';
    
    if (options.prefix) {
      fragment += `${encodeURIComponent(options.prefix)}-`;
    }
    
    fragment += encodeURIComponent(options.textStart);
    
    if (options.textEnd) {
      fragment += `,${encodeURIComponent(options.textEnd)}`;
    }
    
    if (options.suffix) {
      fragment += `,-${encodeURIComponent(options.suffix)}`;
    }
    
    return fragment;
  }
} as const;

// Fragment validation patterns
export const FRAGMENT_VALIDATION = {
  // Valid fragment parameter names
  VALID_NAMES: [
    'view', 'example', 'theme', 'language', 'version', 'platform',
    'interactive', 'runnable', 'editable', 'highlight', 'line',
    'search', 'filter', 'sort', 'category', 'section',
    'tab', 'panel', 'modal', 'dialog', 'overlay',
    'debug', 'verbose', 'trace', 'profile', 'benchmark'
  ] as const,
  
  // Valid fragment values
  VALID_VALUES: {
    boolean: ['true', 'false', '1', '0'],
    theme: ['light', 'dark', 'auto', 'system'],
    language: ['typescript', 'javascript', 'bash', 'json', 'markdown'],
    platform: ['windows', 'macos', 'linux', 'docker', 'ci-cd'],
    view: ['overview', 'examples', 'api', 'configuration', 'troubleshooting']
  } as const,
  
  // Validate fragment parameter
  isValidParam: (name: string, value: string) => {
    if (!FRAGMENT_VALIDATION.VALID_NAMES.includes(name as any)) {
      return false;
    }
    
    // Check if value is in valid values for known parameters
    const validValues = FRAGMENT_VALIDATION.VALID_VALUES[name as keyof typeof FRAGMENT_VALIDATION.VALID_VALUES];
    if (validValues && !validValues.includes(value as any)) {
      return false;
    }
    
    return true;
  }
} as const;

// Fragment building utilities
export const FRAGMENT_BUILDERS = {
  // Build navigation fragment
  navigation: (view: string, options?: Record<string, string>) => ({
    view,
    ...options
  }),
  
  // Build interactive fragment
  interactive: (runnable: boolean = true, options?: Record<string, string>) => ({
    interactive: 'true',
    runnable: runnable ? 'true' : 'false',
    ...options
  }),
  
  // Build example fragment
  example: (exampleName: string, options?: Record<string, string>) => ({
    example: exampleName,
    highlight: 'true',
    ...options
  }),
  
  // Build theme fragment
  theme: (theme: 'light' | 'dark' | 'auto', options?: Record<string, string>) => ({
    theme,
    ...options
  }),
  
  // Build search fragment
  search: (query: string, options?: Record<string, string>) => ({
    search: query,
    type: 'documentation-search',
    ...options
  }),
  
  // Build GitHub-specific fragment
  github: (type: string, options?: Record<string, string>) => ({
    github: 'true',
    type,
    ...options
  })
} as const;

// Fragment parsing utilities
export const FRAGMENT_PARSERS = {
  // Parse standard fragment parameters
  parseStandard: (fragment: string) => {
    const params: Record<string, string> = {};
    
    if (fragment.startsWith('#')) {
      fragment = fragment.slice(1);
    }
    
    const pairs = fragment.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    }
    
    return params;
  },
  
  // Parse text fragment
  parseTextFragment: (fragment: string) => {
    const textMatch = fragment.match(/#:~:text=([^&]+)/);
    if (!textMatch) {
      return null;
    }
    
    const rawText = textMatch[1];
    const decodedText = decodeURIComponent(rawText);
    
    // Parse components: [prefix-,]textStart[,textEnd][,-suffix]
    const components: any = {};
    const parts = decodedText.split(',');
    
    if (parts[0].endsWith('-')) {
      components.prefix = parts[0].slice(0, -1);
      components.textStart = parts[1] || '';
    } else {
      components.textStart = parts[0];
    }
    
    if (parts.length > 1 && parts[parts.length - 1].startsWith('-')) {
      components.suffix = parts[parts.length - 1].slice(1);
      if (parts.length > 2) {
        components.textEnd = parts[parts.length - 2];
      }
    } else if (parts.length > 1) {
      components.textEnd = parts[parts.length - 1];
    }
    
    return {
      raw: rawText,
      decoded: decodedText,
      components
    };
  },
  
  // Parse mixed fragment (standard + text)
  parseMixed: (fragment: string) => {
    const result: {
      standard: Record<string, string>;
      textFragment: ReturnType<typeof FRAGMENT_PARSERS.parseTextFragment>;
    } = {
      standard: {},
      textFragment: null
    };
    
    // Separate text fragment from standard parameters
    const textFragmentMatch = fragment.match(/(#:~:text=[^&]+)/);
    if (textFragmentMatch) {
      result.textFragment = FRAGMENT_PARSERS.parseTextFragment(textFragmentMatch[1]);
      fragment = fragment.replace(textFragmentMatch[1], '').replace(/^#&?|&$/, '');
    }
    
    // Parse remaining standard parameters
    if (fragment && fragment !== '#') {
      result.standard = FRAGMENT_PARSERS.parseStandard(fragment);
    }
    
    return result;
  }
} as const;

// Text fragment patterns (Scroll to Text Fragment specification)
export const TEXT_FRAGMENT_PATTERNS = {
  // Common patterns for bun.com/reference
  NODE_ZLIB: 'node:zlib' as const,
  BUN_API_REFERENCE: 'Bun API Reference' as const,
  TYPED_ARRAY_METHODS: 'TypedArray methods' as const,
  FETCH_TIMEOUT: 'fetch timeout' as const,
  WEBSOCKET_EXAMPLE: 'WebSocket example' as const,

  // Encoding helper
  encode: (text: string) => encodeURIComponent(text),
  decode: (encoded: string) => decodeURIComponent(encoded)
} as const;
