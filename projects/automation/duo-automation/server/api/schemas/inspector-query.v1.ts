// [DUOPLUS][API][SCHEMA][FEAT][META:{openapi:3.0}] [BUN:6.1-NATIVE]

export const InspectorQuerySchema = {
  endpoint: "POST /api/inspector/query",
  description: "Perform real URL inspection and compliance scan",
  request: {
    body: {
      url: "string (required, format: uri)",
      options: {
        complianceRules: "string[] (optional: ['pci', 'gdpr', 'aml'])",
        redact: "boolean (default: true)",
        timeout: "number (default: 5000ms)"
      }
    },
    headers: {
      "X-DuoPLUS-API-Key": "string (required)",
      "X-Request-ID": "string (optional, for tracing)"
    }
  },
  response: {
    200: {
      url: "string",
      status: "number",
      compliance: {
        pci: {
          passed: "boolean",
          violations: "string[]",
          redactedData: "string[]"
        },
        gdpr: "..."
      },
      timing: {
        dns: "number",
        connect: "number",
        tls: "number",
        response: "number",
        redaction: "number"
      },
      tagsApplied: "string[]"
    },
    400: { error: "Invalid URL format" },
    403: { error: "API key invalid" },
    500: { error: "Inspection failed" }
  }
} as const;

// Tag this API contract
// [DUO][API][INSPECTOR][SCHEMA][FEAT][META:{pci:true,gdpr:true}] [CRITICAL] [InspectorQuerySchema][#REF:API-SCHEMA-003][BUN:6.1-NATIVE]
