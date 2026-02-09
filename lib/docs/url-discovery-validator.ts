// lib/docs/url-discovery-validator.ts — Compatibility shim
import { runURLDiscoveryValidator } from '../../packages/docs-tools/src/url-discovery-validator';

if (import.meta.path !== Bun.main) {
  process.exit(0);
}

runURLDiscoveryValidator().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

