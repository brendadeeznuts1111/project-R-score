// Isolated worker code for agent execution
declare var self: Worker;

self.addEventListener('message', (e) => {
  const { type, data } = e.data;
  
  switch(type) {
    case 'config':
      // Handle configuration if needed
      break;
    case 'execute':
      try {
        // Define internal isolation layers
        const executeInSandbox = (code: string) => {
          // Shadow sensitive globals with null
          const shadowedGlobals = [
            'process', 'global', 'globalThis', 'Worker', 'fetch', 
            'XMLHttpRequest', 'performance', 'console'
          ];
          
          const sandboxFn = new Function(
            ...shadowedGlobals,
            `"use strict"; return (${code})`
          );
          
          return sandboxFn(...shadowedGlobals.map(() => null));
        };

        const result = executeInSandbox(data.code);
        self.postMessage({ type: 'result', data: result });
      } catch (error: any) {
        self.postMessage({ type: 'error', data: error.message });
      }
      break;
  }
});