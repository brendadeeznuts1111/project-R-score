import { LSPTestHarness } from '/Users/nolarose/registry/registry-local/tests/harness';

const orchestrator = LSPTestHarness.createTestOrchestrator();
console.log('Type:', typeof orchestrator);
console.log('Keys:', Object.keys(orchestrator));
console.log('Has port getter:', 'port' in orchestrator);
console.log('Port value:', orchestrator.port);
console.log('Direct access to config:', (orchestrator as any).config);
