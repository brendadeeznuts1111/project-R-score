#!/usr/bin/env bun

/**
 * 🎯 Exact Bun --console-depth Documentation Demo
 * 
 * Mirrors the official Bun documentation example with wiki template data
 */

import { MCPWikiGenerator } from '../lib/mcp/wiki-generator-mcp.ts';

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

console.log('🎯 Exact Bun --console-depth Demo');
console.log('==============================');
console.log('');
console.log('📋 Nested Wiki Template Structure:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(nestedWikiTemplate);
console.log('');

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

console.log('📖 Original Bun Docs Example (with wiki data):');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(nested);
console.log('');

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

console.log('🔧 Complex Wiki System Configuration:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(complexNested);
console.log('');

console.log('💡 Console Depth Comparison:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Default (depth 2): Shows basic structure');
console.log('Depth 3: Reveals intermediate nested objects');
console.log('Depth 5: Shows deep configuration details');
console.log('Depth 10: Complete visibility of all nested properties');
console.log('');

console.log('🚀 Try these commands:');
console.log('   bun --console-depth 1 examples/bun-console-depth-exact.ts');
console.log('   bun --console-depth 2 examples/bun-console-depth-exact.ts  # (default)');
console.log('   bun --console-depth 3 examples/bun-console-depth-exact.ts');
console.log('   bun --console-depth 5 examples/bun-console-depth-exact.ts');
console.log('   bun --console-depth 10 examples/bun-console-depth-exact.ts');
