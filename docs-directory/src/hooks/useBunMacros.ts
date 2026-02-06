import React, { useState, useEffect } from 'react';

interface MacroDefinition {
  name: string;
  code: string;
  description: string;
  parameters: string[];
  output: string;
  timestamp: Date;
}

interface MacroResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

export function useBunMacros() {
  const [macros, setMacros] = useState<MacroDefinition[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionHistory, setExecutionHistory] = useState<MacroResult[]>([]);

  useEffect(() => {
    // Load predefined macros
    const predefinedMacros: MacroDefinition[] = [
      {
        name: 'generate-component',
        code: `
          export function generateComponent(name: string) {
            return \`import React from 'react';
            
            export default function \${name}() {
              return (
                <div className="\${name.toLowerCase()}">
                  <h1>\${name} Component</h1>
                </div>
              );
            }\`;
          }
        `,
        description: 'Generate a React component boilerplate',
        parameters: ['name'],
        output: '',
        timestamp: new Date()
      },
      {
        name: 'create-api-route',
        code: `
          export function createAPIRoute(path: string, method: string) {
            return \`
            export async function \${method.toLowerCase()}(request: Request) {
              const data = await request.json();
              
              // Handle \${method} request for \${path}
              return Response.json({ 
                success: true, 
                message: "\${method} \${path} handled",
                data 
              });
            }\`;
          }
        `,
        description: 'Create an API route handler',
        parameters: ['path', 'method'],
        output: '',
        timestamp: new Date()
      },
      {
        name: 'generate-types',
        code: `
          export function generateTypes(interfaceName: string, properties: string[]) {
            const props = properties.map(prop => \`  \${prop}: string;\`).join('\\n');
            return \`
            export interface \${interfaceName} {
            \${props}
            }\`;
          }
        `,
        description: 'Generate TypeScript interface',
        parameters: ['interfaceName', 'properties'],
        output: '',
        timestamp: new Date()
      }
    ];

    setMacros(predefinedMacros);
  }, []);

  const executeMacro = async (macro: MacroDefinition, args: Record<string, string>): Promise<MacroResult> => {
    setIsExecuting(true);
    const startTime = performance.now();

    try {
      // Simulate Bun's macro execution
      // In real Bun: Bun.macro(macro.code)
      
      // Create a mock function from the macro code
      const mockFunction = new Function('args', `
        ${macro.code}
        
        // Execute the main function with provided arguments
        const mainFunction = Object.keys({${macro.code.split('function ')[1]?.split('(')[0] || 'generate'}})[0];
        if (typeof this[mainFunction] === 'function') {
          return this[mainFunction](...Object.values(args));
        }
        return 'Macro executed successfully';
      `);

      const output = mockFunction(args);
      const executionTime = performance.now() - startTime;

      const result: MacroResult = {
        success: true,
        output: typeof output === 'string' ? output : JSON.stringify(output),
        executionTime
      };

      setExecutionHistory(prev => [result, ...prev.slice(0, 9)]);
      
      // Update macro with latest output
      setMacros(prev => 
        prev.map(m => 
          m.name === macro.name 
            ? { ...m, output: result.output, timestamp: new Date() }
            : m
        )
      );

      return result;
    } catch (error) {
      const result: MacroResult = {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Macro execution failed',
        executionTime: performance.now() - startTime
      };

      setExecutionHistory(prev => [result, ...prev.slice(0, 9)]);
      return result;
    } finally {
      setIsExecuting(false);
    }
  };

  const createMacro = (name: string, code: string, description: string, parameters: string[]) => {
    const newMacro: MacroDefinition = {
      name,
      code,
      description,
      parameters,
      output: '',
      timestamp: new Date()
    };

    setMacros(prev => [...prev, newMacro]);
  };

  const deleteMacro = (name: string) => {
    setMacros(prev => prev.filter(m => m.name !== name));
  };

  const updateMacro = (name: string, updates: Partial<MacroDefinition>) => {
    setMacros(prev => 
      prev.map(m => 
        m.name === name 
          ? { ...m, ...updates, timestamp: new Date() }
          : m
      )
    );
  };

  const validateMacro = (code: string): { valid: boolean; error?: string } => {
    try {
      // Basic syntax validation
      new Function(code);
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Invalid syntax' 
      };
    }
  };

  const formatCode = (code: string): string => {
    // Simple code formatting
    return code
      .replace(/\s+/g, ' ')
      .replace(/;\s*}/g, ';\n}')
      .replace(/{\s*/g, ' {\n  ')
      .replace(/;\s*/g, ';\n  ');
  };

  return {
    macros,
    isExecuting,
    executionHistory,
    executeMacro,
    createMacro,
    deleteMacro,
    updateMacro,
    validateMacro,
    formatCode
  };
}
