# Wire Mode Architecture

## Overview
Wire mode provides a JSON-RPC 2.0 protocol interface for the TOML CLI tool, enabling programmatic access via stdin/stdout. This architecture document outlines the design and implementation approach.

## Architecture Layers

### 1. Protocol Layer (Core)
**Location:** `src/wire/protocol/`

The protocol layer implements JSON-RPC 2.0 specification compliance:

- **jsonrpc-parser.ts**: Message parsing and validation
  - Parses JSON-RPC requests from stdin
  - Validates message structure per JSON-RPC 2.0 spec
  - Handles batch requests and notifications
  - Returns structured parse results with error handling

- **jsonrpc-generator.ts**: Response and notification generation
  - Creates JSON-RPC response objects
  - Generates error responses per spec
  - Handles notification responses (no id)
  - Manages batch response correlation

- **error-codes.ts**: JSON-RPC error code definitions
  - Standard JSON-RPC 2.0 error codes (-32700 to -32603)
  - Server-specific error codes (-32000 to -32099)
  - Application-specific error codes for TOML operations

- **validator.ts**: Request/response validation logic
  - Validates request structure and required fields
  - Parameter validation for different method types
  - Response format validation
  - Batch request validation

### 2. Transport Layer
**Location:** `src/wire/transport/`

- **stdio-transport.ts**: Stdin/stdout communication handler
  - Reads line-delimited JSON messages from stdin
  - Writes JSON-RPC responses to stdout
  - Handles message framing and delimiting
  - Manages transport-level errors

### 3. Service Bridge Layer
**Location:** `src/wire/bridge/`

- **service-bridge.ts**: Maps JSON-RPC methods to internal services
  - Registry of available methods
  - Method routing and dispatch
  - Parameter transformation
  - Error handling and conversion

- **method-registry.ts**: Available method definitions
  - TOML operations (load, save, validate)
  - Configuration management
  - Query operations
  - Utility methods

### 4. Main Entry Point
**Location:** `src/wire/`

- **wire-main.ts**: Wire mode entry point
  - CLI flag handling (--wire)
  - Transport initialization
  - Protocol handler setup
  - Error handling and cleanup

## JSON-RPC 2.0 Implementation

### Request Format
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "config.load",
  "params": ["path/to/config.toml"]
}
```

### Response Format
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { "config": "data" }
}
```

### Error Format
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32601,
    "message": "Method not found",
    "data": "config.unknown_method"
  }
}
```

### Notification Format (no response)
```json
{
  "jsonrpc": "2.0",
  "method": "log.info",
  "params": ["Processing complete"]
}
```

### Batch Request Format
```json
[
  {"jsonrpc": "2.0", "id": 1, "method": "config.load", "params": ["config1.toml"]},
  {"jsonrpc": "2.0", "id": 2, "method": "config.validate", "params": ["config2.toml"]}
]
```

## Error Handling

### Standard JSON-RPC Errors
- **-32700 Parse Error**: Invalid JSON received
- **-32600 Invalid Request**: JSON is valid but not a valid Request object
- **-32601 Method Not Found**: Method doesn't exist
- **-32602 Invalid Params**: Invalid method parameters
- **-32603 Internal Error**: Internal JSON-RPC error

### Server-Specific Errors
- **-32000 Server Error**: Generic server error
- **-32001 Config Not Found**: Configuration file not found
- **-32002 Invalid Config**: Invalid configuration format
- **-32003 Validation Failed**: Configuration validation failed
- **-32004 Operation Failed**: Operation execution failed

## Available Methods

### Configuration Management
- `config.load` - Load configuration from file
- `config.save` - Save configuration to file
- `config.validate` - Validate configuration
- `config.get` - Get configuration value
- `config.set` - Set configuration value

### TOML Operations
- `toml.parse` - Parse TOML string
- `toml.stringify` - Convert object to TOML
- `toml.validate` - Validate TOML syntax

### Query Operations
- `query.scope` - Query scoping matrix
- `query.config` - Query configuration
- `query.validate` - Query validation rules

### Utility Methods
- `system.info` - Get system information
- `system.ping` - Ping/pong test
- `system.version` - Get version information

## Implementation Patterns

### Type Safety
- All protocol messages use strict TypeScript interfaces
- Explicit return types for all functions
- Comprehensive error type definitions
- Request/response correlation tracking

### Error Handling
- Structured error responses per JSON-RPC spec
- Error code categorization and documentation
- Error data inclusion for debugging
- Graceful degradation for invalid messages

### Performance
- Efficient JSON parsing using Bun's native JSON
- Minimal memory allocation for message processing
- Batch processing optimization
- Connection pooling for transport layer

### Testing
- Unit tests for protocol parsing
- Integration tests for end-to-end flows
- Error scenario coverage
- Performance benchmarks

## Security Considerations

- Input validation at protocol layer
- Method access control
- Parameter sanitization
- Error information disclosure control
- Resource usage limits (batch size, request timeout)

## Usage Example

```bash
# Start wire mode
toml-cli --wire

# Send JSON-RPC request
echo '{"jsonrpc":"2.0","id":1,"method":"config.load","params":["config.toml"]}' | toml-cli --wire

# Batch requests
echo '[{"jsonrpc":"2.0","id":1,"method":"config.load","params":["config1.toml"]},{"jsonrpc":"2.0","id":2,"method":"config.validate","params":["config2.toml"]}]' | toml-cli --wire
```

## Future Enhancements

- WebSocket transport support
- Authentication and authorization
- Rate limiting
- Request/response compression
- Streaming responses for large operations