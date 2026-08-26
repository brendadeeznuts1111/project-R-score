export interface RegistryConfig {
  url: string;
  token?: string;
  scopes: string[];
  security: {
    scanning: boolean;
    audit: boolean;
    strict: boolean;
  };
}
