// Bun-native: use fetch() instead of axios

import type { ProxyRegion, ProxyInfo, AccountInfo, OrderInfo } from "../types/proxy";

import { API_CONFIG, API_ENDPOINTS } from "./constants/api";
import { APIError, ErrorFactory } from "./errors";

const API_BASE_URL = API_CONFIG.BASE_URL;

interface APIResponse<T> {
  code: number;
  msg: string;
  data: T;
}

class IPFoxyAPI {
  private apiToken: string;
  private apiId: string;

  constructor(apiToken: string, apiId: string) {
    this.apiToken = apiToken;
    this.apiId = apiId;
  }

  private async makeRequest<T>(
    method: string,
    endpoint: string,
    data?: Record<string, unknown>,
    params?: Record<string, unknown>
  ): Promise<T> {
    try {
      // Build URL with query params
      const url = new URL(`${API_BASE_URL}${endpoint}`);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) url.searchParams.set(key, String(value));
        });
      }

      // Setup timeout with AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

      const response = await fetch(url.toString(), {
        method,
        headers: {
          "api-token": this.apiToken,
          "api-id": this.apiId,
          "Content-Type": "application/json"
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new APIError(`HTTP ${response.status}: ${response.statusText}`, response.status.toString());
      }

      const result: APIResponse<T> = await response.json();

      if (result.code !== 0) {
        throw new APIError(
          result.msg || "API request failed",
          result.code.toString()
        );
      }

      return result.data;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new APIError('Request timeout', 'TIMEOUT');
      }
      if (error instanceof APIError) {
        throw error;
      }
      throw ErrorFactory.fromError(error);
    }
  }

  async getRegions(): Promise<ProxyRegion[]> {
    return this.makeRequest("GET", API_ENDPOINTS.REGIONS);
  }

  async getProxyList(): Promise<ProxyInfo[]> {
    return this.makeRequest("GET", API_ENDPOINTS.PROXY_LIST);
  }

  async getAccountInfo(): Promise<AccountInfo> {
    return this.makeRequest("GET", API_ENDPOINTS.ACCOUNT_INFO);
  }

  async getOrderInfo(orderId: string): Promise<OrderInfo> {
    return this.makeRequest("GET", API_ENDPOINTS.ORDER_INFO, undefined, { order_id: orderId });
  }

  async getOrderPrice(
    regionId: string,
    days: number,
    quantity = 1,
    orderType = "NEW"
  ): Promise<{ price: string; order_type: string }> {
    return this.makeRequest("GET", API_ENDPOINTS.ORDER_PRICE, undefined, {
      region_id: regionId,
      days,
      quantity,
      order_type: orderType
    });
  }

  async purchaseProxy(regionId: string, days: number, quantity = 1): Promise<{ order_id: string }> {
    return this.makeRequest("POST", API_ENDPOINTS.PROXY_BUY, {
      region_id: regionId,
      days,
      quantity
    });
  }

  async renewProxy(proxyId: string, days: number): Promise<{ order_id: string }> {
    return this.makeRequest("POST", API_ENDPOINTS.PROXY_RENEW, {
      proxy_id: proxyId,
      days
    });
  }
}

export default IPFoxyAPI;
