// API client configuration
import {
  createFullStackBunOutboundAuthority,
  fetchFullStackBunOutbound,
} from './security/outbound';

const API_URL = "https://api.example.com";
const EXAMPLE_API_AUTHORITY = createFullStackBunOutboundAuthority({
  kind: 'example-api',
  name: 'example-api-via-proxy',
  baseUrl: API_URL,
  exact: true,
  proxy: 'https://proxy.com:8080',
});

fetchFullStackBunOutbound(EXAMPLE_API_AUTHORITY, API_URL);
