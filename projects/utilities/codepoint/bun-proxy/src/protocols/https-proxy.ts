// @bun/proxy/protocols/https-proxy.ts - HTTPS proxy implementation
import { HTTPProxy } from './http-proxy.js';
import type { HTTPProxyConfiguration } from './index.js';

export class HTTPSProxy extends HTTPProxy {
  constructor(configuration: HTTPProxyConfiguration) {
    super(configuration);
  }
}
