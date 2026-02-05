// API client configuration
const API_URL = "https://api.example.com";

fetch(API_URL, {
  proxy: {
    url: "http://proxy.com:8080",
    headers: {
      "Proxy-Authorization": "Bearer tok",
      "X-Custom-Proxy-Header": "value"
    }
  }
});
