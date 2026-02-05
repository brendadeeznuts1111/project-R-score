/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */
/**
 * 📚 Documentation Module - Main Exports
 * 
 * Central exports for all documentation-related functionality
 * including URL builders, validators, and constants.
 */

// Export constants
export * from './constants/cli';
export * from './constants/utils';

// Export core documentation functionality
export { CoreDocumentationValidator } from '../core-documentation';
export { EnhancedDocumentationURLValidator } from '../core-validation';
export { EnterpriseDocumentationURLBuilder } from '../core-types';

// Export URL builders (if they exist)
try {
  const urlBuilderModule = await import('./builders/url-builder');
  if (urlBuilderModule.EnhancedEnterpriseDocumentationURLBuilder) {
    export const { EnhancedEnterpriseDocumentationURLBuilder } = urlBuilderModule;
  }
} catch (e) {
  // Module doesn't exist, skip export
}

// Export validators (if they exist)
try {
  const validatorModule = await import('./builders/validator');
  if (validatorModule.EnhancedDocumentationURLValidator) {
    export const { EnhancedDocumentationURLValidator } = validatorModule;
  }
} catch (e) {
  // Module doesn't exist, skip export
}

// Create a simple URL builder for basic functionality
export class SimpleDocumentationURLBuilder {
  private static readonly BASE_URL = 'https://bun.sh';
  
  /**
   * Build CLI documentation URL
   */
  static buildCLIDocumentationURL(command: string, fragment?: string): string {
    const url = new URL(`/docs/cli/${command}`, this.BASE_URL);
    if (fragment) {
      url.hash = fragment;
    }
    return url.toString();
  }
  
  /**
   * Build Utils documentation URL
   */
  static buildUtilsDocumentationURL(utility?: string): string {
    const url = new URL('/docs/api/utils', this.BASE_URL);
    if (utility) {
      url.hash = utility;
    }
    return url.toString();
  }
  
  /**
   * Build GitHub URL
   */
  static buildGitHubURL(path: string, commitHash?: string): string {
    const baseUrl = 'https://github.com/oven-sh/bun';
    const url = new URL(path, baseUrl);
    if (commitHash) {
      url.searchParams.set('ref', commitHash);
    }
    return url.toString();
  }
}

// Create a simple validator for basic functionality
export class SimpleDocumentationValidator {
  /**
   * Validate CLI command
   */
  static validateCLICommand(command: string): {
    isValid: boolean;
    command?: string;
    errors?: string[];
  } {
    if (!command.startsWith('bun')) {
      return {
        isValid: false,
        errors: ['Command must start with "bun"']
      };
    }
    
    const parts = command.split(' ');
    const subcommand = parts[1];
    const validCommands = ['run', 'test', 'build', 'install', 'add', 'remove', 'x', 'create', 'upgrade'];
    
    if (!validCommands.includes(subcommand)) {
      return {
        isValid: false,
        command: subcommand,
        errors: [`Unknown subcommand: ${subcommand}`]
      };
    }
    
    return {
      isValid: true,
      command: subcommand
    };
  }
  
  /**
   * Validate documentation URL
   */
  static validateDocumentationURL(url: string): {
    isValid: boolean;
    provider?: string;
    type?: string;
  } {
    try {
      const parsed = new URL(url);
      
      if (parsed.hostname === 'bun.sh') {
        return {
          isValid: true,
          provider: 'bun_official',
          type: parsed.pathname.includes('/cli') ? 'cli' : 'utils'
        };
      }
      
      if (parsed.hostname === 'github.com' && parsed.pathname.includes('/oven-sh/bun')) {
        return {
          isValid: true,
          provider: 'github',
          type: 'source'
        };
      }
      
      return {
        isValid: false
      };
    } catch {
      return {
        isValid: false
      };
    }
  }
}

// Main URL builder instance
export const docsURLBuilder = {
  buildURL: (provider: string, type: string, category: string, fragment?: string, options?: any) => {
    const baseUrl = provider === 'bun_official' ? 'https://bun.sh' : 'https://github.com/oven-sh/bun';
    
    if (category === 'CLI') {
      return SimpleDocumentationURLBuilder.buildCLIDocumentationURL(type.toLowerCase(), fragment);
    }
    
    if (category === 'UTILS') {
      return SimpleDocumentationURLBuilder.buildUtilsDocumentationURL(fragment);
    }
    
    return `${baseUrl}/${type.toLowerCase()}/${category.toLowerCase()}`;
  },
  
  buildCLIDocumentationURL: SimpleDocumentationURLBuilder.buildCLIDocumentationURL,
  buildUtilsDocumentationURL: SimpleDocumentationURLBuilder.buildUtilsDocumentationURL,
  buildGitHubURL: SimpleDocumentationURLBuilder.buildGitHubURL,
  
  // Additional methods for compatibility
  getCLIFragmentURLs: () => ({
    run: 'https://bun.sh/docs/cli/run#examples',
    test: 'https://bun.sh/docs/cli/test#configuration',
    build: 'https://bun.sh/docs/cli/build#options',
    install: 'https://bun.sh/docs/cli/install-command#dependencies',
    add: 'https://bun.sh/docs/cli/add#packages'
  }),
  
  buildCLICommandExample: (command: string, options: Record<string, any> = {}) => {
    let cmd = `bun ${command}`;
    
    Object.entries(options).forEach(([key, value]) => {
      if (typeof value === 'boolean' && value) {
        cmd += ` --${key}`;
      } else if (typeof value !== 'boolean') {
        cmd += ` --${key}=${value}`;
      }
    });
    
    return cmd;
  },
  
  getCheatsheetURLs: () => ({
    cli: {
      main: 'https://bun.sh/docs/cli',
      commands: [
        { name: 'run', example: 'bun run dev', docs: 'https://bun.sh/docs/cli/run' },
        { name: 'test', example: 'bun test --watch', docs: 'https://bun.sh/docs/cli/test' },
        { name: 'build', example: 'bun build ./src/index.ts', docs: 'https://bun.sh/docs/cli/build' }
      ]
    },
    utils: {
      main: 'https://bun.sh/docs/api/utils',
      functions: [
        { name: 'readFile', example: "await readFile('file.txt', 'utf-8')", docs: 'https://bun.sh/docs/api/utils#readFile' },
        { name: 'isTypedArray', example: 'isTypedArray(new Uint8Array())', docs: 'https://bun.sh/docs/api/utils#isTypedArray' },
        { name: 'toBuffer', example: 'toBuffer("Hello")', docs: 'https://bun.sh/docs/api/utils#toBuffer' }
      ],
      validation: [
        { name: 'isTypedArray', test: 'new Uint8Array([1, 2, 3])', result: 'true' },
        { name: 'isString', test: '"Hello"', result: 'true' },
        { name: 'isArray', test: '[1, 2, 3]', result: 'true' }
      ]
    },
    api: {
      main: 'https://bun.sh/docs/api',
      typedArray: 'https://bun.sh/docs/runtime/binary-data#typedarray',
      fetch: 'https://bun.sh/docs/runtime/networking/fetch'
    }
  }),
  
  buildGitHubRawURL: (commit: string, path: string) => {
    return `https://raw.githubusercontent.com/oven-sh/bun/${commit}/${path}`;
  },
  
  getExampleCommitURL: () => {
    return 'https://github.com/oven-sh/bun/tree/af76296637931381e9509c204c5f1af9cc174534/packages/bun-types';
  }
};

// Main validator instance
export const EnhancedDocumentationURLValidator = {
  validateBunDocumentationURL: SimpleDocumentationValidator.validateDocumentationURL,
  validateCLICommand: SimpleDocumentationValidator.validateCLICommand,
  
  // Additional methods for compatibility
  parseGitHubURL: (url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname === 'github.com' && parsed.pathname.includes('/oven-sh/bun')) {
        const parts = parsed.pathname.split('/');
        return {
          isValid: true,
          type: parts.includes('/tree/') ? 'tree' : 'blob',
          commitHash: parts.includes('/tree/') ? parts[parts.indexOf('/tree/') + 1] : undefined,
          path: parts.slice(4).join('/')
        };
      }
      return { isValid: false };
    } catch {
      return { isValid: false };
    }
  },
  
  extractTextFragment: (url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.hash && parsed.hash.includes('~:text=')) {
        const textFragment = parsed.hash.split('~:text=')[1];
        return {
          hasTextFragment: true,
          decodedText: decodeURIComponent(textFragment)
        };
      }
      return { hasTextFragment: false };
    } catch {
      return { hasTextFragment: false };
    }
  },
  
  isValidCLICommand: (command: string) => {
    return SimpleDocumentationValidator.validateCLICommand(command).isValid;
  },
  
  isBunUtilsURL: (url: string) => {
    const validation = SimpleDocumentationValidator.validateDocumentationURL(url);
    return validation.isValid && validation.type === 'utils';
  },
  
  isCLIDocumentationURL: (url: string) => {
    const validation = SimpleDocumentationValidator.validateDocumentationURL(url);
    return validation.isValid && validation.type === 'cli';
  },
  
  extractUtilityFunction: (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.hash.slice(1) || null;
    } catch {
      return null;
    }
  }
};

// Utility functions
export const getBunReferenceURL = (path: string) => {
  return `https://bun.sh${path}`;
};

export const getBunReferenceWithTextFragment = (path: string, text: string) => {
  return `https://bun.sh${path}#:~:text=${encodeURIComponent(text)}`;
};

export const getGitHubBunTypesCommitURL = (commitHash: string) => {
  return `https://github.com/oven-sh/bun/tree/${commitHash}/packages/bun-types`;
};

export const exampleCommit = {
  hash: 'af76296637931381e9509c204c5f1af9cc174534',
  url: 'https://github.com/oven-sh/bun/tree/af76296637931381e9509c204c5f1af9cc174534/packages/bun-types',
  message: 'Update bun types for latest API changes'
};

export const getAllCriticalURLs = () => {
  return [
    'https://bun.sh/docs/cli',
    'https://bun.sh/docs/api/utils',
    'https://github.com/oven-sh/bun/tree/main/packages/bun-types',
    'https://bun.sh/docs/runtime/binary-data#typedarray',
    'https://bun.sh/docs/runtime/networking/fetch'
  ];
};

// Export everything for compatibility
export {
  SimpleDocumentationURLBuilder as DocumentationURLBuilder,
  SimpleDocumentationValidator as DocumentationValidator
};
