declare interface EnvInterface { [key: string]: string | undefined; }

declare namespace Bun {
  interface SecretsOptions {
    service: string;
    name: string;
  }

  interface SecretsSetOptions extends SecretsOptions {
    value: string;
  }

  interface Secrets {
    get: {
      (options: SecretsOptions): Promise<string | null>;
      (service: string, name: string): Promise<string | null>;
    };
    set: {
      (options: SecretsOptions, value: string): Promise<void>;
      (options: SecretsSetOptions): Promise<void>;
      (service: string, name: string, value: string): Promise<void>;
    };
    delete: {
      (options: SecretsOptions): Promise<boolean>;
      (service: string, name: string): Promise<boolean>;
    };
  }

  const secrets: Secrets;
  const env: EnvInterface;
  const argv: string[];
  function sleep(ms: number): Promise<void>;
}
