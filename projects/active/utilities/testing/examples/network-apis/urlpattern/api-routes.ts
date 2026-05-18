/**
 * @difficulty advanced
 * @tags urlpattern, api, rest
 * @emoji 🔄
 */

// API route pattern with multiple parameters
const apiPattern = new URLPattern({
  hostname: "api.example.com",
  pathname: "/v1/:resource/:id?"
});

const matches = [
  apiPattern.exec("https://api.example.com/v1/users"),
  apiPattern.exec("https://api.example.com/v1/users/123")
];

console.info("API routes:", matches);
