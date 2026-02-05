#!/usr/bin/env bun
//! Config-aware proxy server with 13-byte header support

import { createProxyServer } from "./src/proxy/http-connect.js";

const server = Bun.serve(createProxyServer(8081));

console.log(`🚀 Config-aware proxy server running on port 8081`);
console.log(`📊 Proxy status: http://localhost:8081/proxy-status`);
console.log(`🌐 Proxy endpoint: http://localhost:8081/proxy`);
console.log(`🔗 CONNECT tunnel: CONNECT registry.mycompany.com:443 HTTP/1.1`);

// Keep alive
setInterval(() => {}, 1000);
