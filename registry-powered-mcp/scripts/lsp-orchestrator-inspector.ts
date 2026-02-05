import { LSPOrchestrator } from '/Users/nolarose/registry/registry-local/services/lsp-orchestrator';

const orchestrator = new LSPOrchestrator();
console.log('Port:', orchestrator.port);
console.log('Max Sessions:', orchestrator.maxSessions);
console.log('Session Timeout:', orchestrator.sessionTimeout);
console.log('Enable Metrics:', orchestrator.enableMetrics);
console.log('Active Sessions Count:', orchestrator.activeSessionsCount);
