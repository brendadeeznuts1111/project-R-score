import { describe, expect, it, mock, spyOn, beforeEach } from 'bun:test';
import { BunRegistryAuthBridge } from '../../utils/registry-auth-bridge';
import { ScopedSecretsManager } from '../../utils/scoped-secrets-manager';

describe('BunRegistryAuthBridge', () => {
  let secretsManagerMock: any;

  beforeEach(() => {
    // Reset env vars
    delete process.env.BUN_AUTH_TOKEN;
    
    // Mock ScopedSecretsManager.getSecret
    secretsManagerMock = {
      getSecret: mock(async (name: string) => {
        if (name === 'R2_ACCESS_KEY_ID') return 'test-id';
        if (name === 'R2_SECRET_ACCESS_KEY') return 'test-secret';
        return null;
      })
    };

    // Spy on ScopedSecretsManager.forInternalService to return our mock
    spyOn(ScopedSecretsManager, 'forInternalService').mockReturnValue(secretsManagerMock as any);
  });

  it('should successfully bridge authentication', async () => {
    const result = await BunRegistryAuthBridge.configureAuth();
    
    expect(result.success).toBe(true);
    expect(process.env.BUN_AUTH_TOKEN).toBeDefined();
    expect(process.env.BUN_AUTH_TOKEN).toContain('Basic ');
    
    // Verify it used the correct service name
    expect(ScopedSecretsManager.forInternalService).toHaveBeenCalledWith('windsurf-r2-packages');
  });

  it('should fail if credentials are missing', async () => {
    // Override mock for this test
    secretsManagerMock.getSecret = mock(async () => null);
    
    const result = await BunRegistryAuthBridge.configureAuth();
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('Missing R2 credentials');
    expect(process.env.BUN_AUTH_TOKEN).toBeUndefined();
  });
});