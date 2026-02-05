/**
 * API configuration constants
 */
export const API_CONFIG = {
  BASE_URL: "https://apis.ipfoxy.com",
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3
} as const;

/**
 * API endpoint paths
 */
export const API_ENDPOINTS = {
  REGIONS: "/ip/open-api/area-list",
  PROXY_LIST: "/ip/open-api/proxy-list",
  ACCOUNT_INFO: "/ip/open-api/account-info",
  ORDER_INFO: "/ip/open-api/order-info",
  ORDER_PRICE: "/ip/open-api/order-price",
  PROXY_BUY: "/ip/open-api/proxy-buy",
  PROXY_RENEW: "/ip/open-api/proxy-renew"
} as const;

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

/**
 * API response codes
 */
export const API_CODES = {
  SUCCESS: 0,
  INVALID_PARAMS: 1001,
  UNAUTHORIZED: 1002,
  INSUFFICIENT_BALANCE: 1003,
  PROXY_NOT_FOUND: 1004,
  ORDER_FAILED: 1005
} as const;
