import { test, expect } from 'bun:test';
import { secrets } from 'bun';
import { SecretsLoader } from '../../src/config/secrets-loader';

test('load secrets from empty keychain', async () => {
  const result = await SecretsLoader.loadAPISecrets();
  expect(result).toEqual({}); // Graceful empty state
});

test('delete non-existent secret returns false', async () => {
  const deleted = await secrets.delete({ 
    service: "nexus", 
    name: "non.existent" 
  });
  expect(deleted).toBe(false);
});

test('secret rotation workflow', async () => {
  const service = "test-service";
  const name = "test.key";
  const oldValue = "old-secret-12345";
  
  // Bun 1.3.4 API: set({ service, name, value }) - single object with value property
  await secrets.set({ service, name, value: oldValue });
  const retrieved = await secrets.get({ service, name });
  expect(retrieved).toBe(oldValue);
  
  // Rotate
  const newValue = "new-secret-67890";
  await secrets.set({ service, name, value: newValue });
  const rotated = await secrets.get({ service, name });
  expect(rotated).toBe(newValue);
  
  // Cleanup
  await secrets.delete({ service, name });
});