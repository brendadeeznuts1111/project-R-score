interface EnvInterface { [key: string]: string | undefined; }

namespace Bun {
  interface SecretsOptions {
    service: string;
    name: string;
  }

  interface Secrets {
    get(options: SecretsOptions): Promise<string | null>;
    set(options: SecretsOptions, value: string): Promise<void>;
    delete(options: SecretsOptions): Promise<boolean>;
  }

  const secrets: Secrets;
  const env: EnvInterface;
  const argv: string[];
  function sleep(ms: number): Promise<void>;
}
