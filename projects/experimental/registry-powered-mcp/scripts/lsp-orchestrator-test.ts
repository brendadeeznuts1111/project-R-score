import { LSPTestHarness } from '/Users/nolarose/registry/registry-local/tests/harness';

const orchestrator = LSPTestHarness.createTestOrchestrator();
console.info('Type:', typeof orchestrator);
console.info('Keys:', Object.keys(orchestrator));
console.info('Has port getter:', 'port' in orchestrator);
console.info('Port value:', orchestrator.port);
console.info('Direct access to config:', (orchestrator as any).config);
