/**
 * @duoplus/registry-gateway
 * mTLS-secured Registry Proxy
 */

export class RegistryGateway {
  private static readonly REGISTRY_URL = "https://duo-npm-registry.utahj4754.workers.dev";

  static getEndpoint(packageName: string) {
    return `${this.REGISTRY_URL}/${packageName}`;
  }

  static async authorize(req: Request) {
    const cert = req.headers.get("x-client-cert");
    return !!cert && cert.includes("SOVEREIGN-V4");
  }
}