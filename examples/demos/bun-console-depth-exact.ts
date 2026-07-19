#!/usr/bin/env bun

/**
 * 🎯 Exact Bun --console-depth Documentation Demo
 *
 * Mirrors the official Bun documentation example with wiki template data.
 * Docs: https://bun.com/docs/runtime/console
 */

import { MCPWikiGenerator } from '../../lib/mcp/wiki-generator-mcp.ts';

// Create nested wiki template data exactly like the Bun docs example
const nestedWikiTemplate = {
  template: {
    metadata: {
      name: "Confluence Integration",
      config: {
        baseUrl: "https://yourcompany.atlassian.net/wiki",
        workspace: {
          engineering: {
            bun: {
              utilities: {
                features: {
                  security: {
                    authentication: {
                      oauth2: {
                        type: "Bearer",
                        tokens: ["read", "write", "admin"],
                        scopes: {
                          wiki: ["read", "write"],
                          api: ["access"],
                          admin: ["manage"]
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

console.info('🎯 Exact Bun --console-depth Demo');
console.info('==============================');
console.info('');
console.info('📋 Nested Wiki Template Structure:');
console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.info(nestedWikiTemplate);
console.info('');

// Show the exact example from Bun docs with wiki data
const nested = { 
  a: { 
    b: { 
      c: { 
        d: "deep wiki data" 
      } 
    } 
  } 
};

console.info('📖 Original Bun Docs Example (with wiki data):');
console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.info(nested);
console.info('');

// Create a more complex nested structure
const complexNested = {
  wikiSystem: {
    templates: [
      {
        name: "Confluence Integration",
        features: {
          security: {
            encryption: {
              algorithm: "AES-256",
              keys: {
                primary: "key1",
                backup: "key2"
              }
            }
          }
        }
      }
    ],
    configuration: {
      database: {
        connection: {
          host: "localhost",
          port: 5432,
          credentials: {
            username: "wiki_user",
            password: "secret",
            ssl: {
              enabled: true,
              certificate: {
                path: "/path/to/cert",
                issuer: "CA"
              }
            }
          }
        }
      }
    }
  }
};

console.info('🔧 Complex Wiki System Configuration:');
console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.info(complexNested);
console.info('');

console.info('💡 Console Depth Comparison:');
console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.info('Default (depth 2): Shows basic structure');
console.info('Depth 3: Reveals intermediate nested objects');
console.info('Depth 5: Shows deep configuration details');
console.info('Depth 10: Complete visibility of all nested properties');
console.info('');

console.info('🚀 Try these commands:');
console.info('   bun --console-depth 1 examples/bun-console-depth-exact.ts');
console.info('   bun --console-depth 2 examples/bun-console-depth-exact.ts  # (default)');
console.info('   bun --console-depth 3 examples/bun-console-depth-exact.ts');
console.info('   bun --console-depth 5 examples/bun-console-depth-exact.ts');
console.info('   bun --console-depth 10 examples/bun-console-depth-exact.ts');
