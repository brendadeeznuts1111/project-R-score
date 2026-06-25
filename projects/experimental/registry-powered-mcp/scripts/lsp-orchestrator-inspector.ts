import { LSPOrchestrator } from '/Users/nolarose/registry/registry-local/services/lsp-orchestrator';

const orchestrator = new LSPOrchestrator();
console.info('Port:', orchestrator.port);
console.info('Max Sessions:', orchestrator.maxSessions);
console.info('Session Timeout:', orchestrator.sessionTimeout);
console.info('Enable Metrics:', orchestrator.enableMetrics);
console.info('Active Sessions Count:', orchestrator.activeSessionsCount);
