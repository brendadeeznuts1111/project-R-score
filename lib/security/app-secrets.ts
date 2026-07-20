// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
/**
 * App secrets — Bun.secrets facade (replaces legacy tier1380 secret manager).
 */
import { deleteSecret, getSecret, setSecret } from './bun-secrets-adapter';

const DEFAULT_SERVICE = Bun.env.FW_SECRETS_SERVICE || 'com.factorywager.infra';

export type AppSecretSetOptions = {
  persistEnterprise?: boolean;
  delete?: boolean;
};

export class AppSecretManager {
  private static instance: AppSecretManager;

  static getInstance(): AppSecretManager {
    if (!this.instance) this.instance = new AppSecretManager();
    return this.instance;
  }

  private service(): string {
    return Bun.env.FW_SECRETS_SERVICE || DEFAULT_SERVICE;
  }

  async setSecret(key: string, value: string, options: AppSecretSetOptions = {}): Promise<void> {
    if (options.delete) {
      await deleteSecret({ service: this.service(), name: key });
      return;
    }
    await setSecret({ service: this.service(), name: key, value });
  }

  async getSecret(key: string): Promise<string | null> {
    return getSecret({
      service: this.service(),
      name: key,
      envKeys: [key],
    });
  }

  async deleteSecret(key: string): Promise<boolean> {
    return deleteSecret({ service: this.service(), name: key });
  }
}

export const appSecretManager = AppSecretManager.getInstance();
export default appSecretManager;
