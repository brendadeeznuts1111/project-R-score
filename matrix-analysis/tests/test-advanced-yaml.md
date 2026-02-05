---
title: "Advanced YAML Features Test"
description: "Testing Bun.YAML.parse with advanced features"
date: 2026-02-01
author: "FactoryWager Team"

# YAML Anchors and Aliases
default_config: &default
  timeout: 5000
  retries: 3
  cache_enabled: true

production:
  <<: *default
  host: prod.example.com
  port: 443

development:
  <<: *default
  host: localhost
  port: 3000

# Multi-line strings
description_literal: |
  This is a literal block scalar
  that preserves all whitespace
  and line breaks exactly as written.

description_folded: >
  This is a folded block scalar
  that joins lines together with spaces
  making it easier to read long text
  in YAML files.

# Explicit type tags
explicit_string: !!str "12345"
explicit_int: !!int "42"
explicit_float: !!float "3.14159"
explicit_bool: !!bool "true"
explicit_null: !!null "null"

# Complex nested structure
features:
  authentication:
    enabled: true
    providers:
      - name: github
        client_id: ${GITHUB_CLIENT_ID}
        client_secret: ${GITHUB_CLIENT_SECRET}
      - name: google
        client_id: ${GOOGLE_CLIENT_ID}
        client_secret: ${GOOGLE_CLIENT_SECRET}

  rate_limiting:
    enabled: true
    requests_per_minute: 60
    burst_size: 10

  caching:
    strategy: "redis"
    ttl: 3600
    max_size: 1000

# Array of mixed types
mixed_array:
  - "string item"
  - 42
  - true
  - null
  - nested:
      key: "value"
      array: [1, 2, 3]

tags: ["yaml", "advanced", "bun", "anchors", "aliases"]
categories: ["documentation", "testing"]
draft: false
featured: true
---

## Advanced YAML Features Demonstration

This document tests advanced YAML parsing capabilities with Bun's native parser.

### Features Tested

#### Anchors and Aliases

- `&default` anchor for shared configuration
- `<<: *default` merge key for inheritance
- Production and development configs extending defaults

#### Multi-line Strings

- Literal block scalar (`|`) preserving whitespace
- Folded block scalar (`>`) joining lines with spaces

#### Explicit Type Tags

- `!!str`, `!!int`, `!!float`, `!!bool`, `!!null`
- Type coercion validation

#### Complex Structures

- Nested objects and arrays
- Environment variable placeholders
- Mixed-type arrays

### Performance

This should parse extremely fast with Bun's Zig-based YAML parser.

---

*Advanced YAML test for FactoryWager Frontmatter Engine v1.0*
