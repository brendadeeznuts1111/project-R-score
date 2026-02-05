# Dev HQ JSON Schemas

This directory contains JSON Schema definitions for validating configuration and manifest files used throughout the Dev HQ platform. Schemas ensure data integrity and prevent configuration errors.

## 📋 Overview

JSON Schemas provide structural validation and type checking for JSON configuration files, ensuring data integrity and preventing configuration errors. The schemas follow the [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12/schema) specification.

## Available Schemas

### `meta.schema.json`

**Purpose**: Validates the `meta.json` manifest file that describes the entire Dev HQ system configuration.

**Schema Version**: JSON Schema Draft 2020-12

**Usage**: Referenced in `meta.json` via the `$schema` property:
```json
{
  "$schema": "./schemas/meta.schema.json",
  ...
}
```

**Validates**:
- System metadata (version, manifest version, checksum)
- System information (name, type, architecture, platforms)
- Build configuration (runtime, build configurations, entry points)
- Feature flags (categories, flags, configurations)
- Dashboard configuration (views, components)
- Logging systems and events
- Monitoring (health checks, metrics, alerts)
- External integrations
- Scaling profiles and limits
- Operational procedures (maintenance, backup, disaster recovery)
- Security configuration (authentication, encryption, compliance)
- API endpoints and rate limiting
- CLI commands and options
- Documentation references

**Key Sections**:
- `meta` - Manifest metadata and versioning
- `system` - Core system information
- `build` - Build system and runtime configuration
- `featureFlags` - Feature flag definitions and categories
- `dashboard` - Dashboard views and components
- `logging` - Logging system configurations
- `monitoring` - Health checks, metrics, and alerts
- `integrations` - External service integrations
- `scaling` - Auto-scaling configuration
- `operations` - Operational procedures
- `security` - Security and compliance settings
- `api` - API endpoint definitions
- `cli` - CLI command definitions
- `documentation` - Documentation references

## Validation

### Using the Schema

The schema is automatically validated when:
- `meta.json` is generated via `scripts/generate-meta.ts`
- JSON editors with schema support (VS Code, etc.) validate on save

### Manual Validation

You can validate a JSON file against the schema using tools like:

**ajv-cli**:
```bash
npm install -g ajv-cli
ajv validate -s schemas/meta.schema.json -d meta.json
```

**Node.js with ajv**:
```javascript
import Ajv from 'ajv';
import schema from './meta.schema.json';
import meta from '../meta.json';

const ajv = new Ajv();
const validate = ajv.compile(schema);
const valid = validate(meta);

if (!valid) {
  console.error(validate.errors);
}
```

## Schema Structure

The schema follows JSON Schema Draft 2020-12 specification and includes:
- Type definitions for all properties
- Required field validation
- Pattern matching for strings (regex)
- Enum constraints for allowed values
- Format validation (email, date-time, etc.)
- Minimum/maximum constraints for numbers
- Array item validation
- Nested object validation

## Adding New Schemas

When adding new schema files:

1. **Naming Convention**: Use descriptive names ending in `.schema.json`
   - Example: `config.schema.json`, `api-request.schema.json`

2. **Schema Metadata**: Include:
   ```json
   {
     "$schema": "https://json-schema.org/draft/2020-12/schema",
     "$id": "./schemas/your-schema.schema.json",
     "title": "Your Schema Title",
     "description": "Description of what this schema validates"
   }
   ```

3. **Documentation**: Update this README with:
   - Purpose of the schema
   - What it validates
   - Usage examples
   - Validation instructions

4. **References**: Update any code that generates or validates JSON to reference the new schema

## Related Files

- `meta.json` - The manifest file validated by `meta.schema.json`
- `scripts/generate-meta.ts` - Script that generates `meta.json` and references the schema

## Schema Maintenance

When updating schemas:

1. **Versioning**: Consider incrementing a schema version if making breaking changes
2. **Backward Compatibility**: Try to maintain backward compatibility when possible
3. **Documentation**: Update descriptions and examples
4. **Testing**: Validate existing JSON files still pass after schema changes
5. **Migration**: Provide migration paths for breaking changes

## Resources

- [JSON Schema Specification](https://json-schema.org/)
- [JSON Schema Validator (ajv)](https://ajv.js.org/)
- [Understanding JSON Schema](https://json-schema.org/understanding-json-schema/)

