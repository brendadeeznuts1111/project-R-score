/**
 * MTLSRegistryHandshake (Ticket 18.1.1.1.1)
 * Upgraded Registry security using Mutual TLS
 */

import { serve } from "bun";

export class MTLSRegistryHandshake {
  static async startSovereignGateway() {
    console.log("🔐 Starting Sovereign mTLS Registry Gateway...");

    serve({
      port: 3004,
      fetch(req) {
        // Validation handled by Bun native TLS
        return new Response("🏰 Sovereign Registry Access Granted");
      },
      tls: {
        // Cloudflare-Origin-CA certificates - using workspace-relative path
        cert: Bun.file(".certs/sov-registry.crt"),
        key: Bun.file(".certs/sov-registry.key"),
        ca: Bun.file(".certs/cloudflare-ca.crt"),
        requestCert: true,
        rejectUnauthorized: true, // Enforce Client Certs
      },
    });

    console.log("💎 mTLS Handshake Kernel ACTIVE. Only provisioned devices may connect.");
  }
}

if (import.meta.main) {
  MTLSRegistryHandshake.startSovereignGateway().catch(e => {
    console.error("❌ Failed to bind mTLS Gateway (Requires Certs):", e.message);
  });
}