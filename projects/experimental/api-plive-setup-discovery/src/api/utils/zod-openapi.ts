// src/api/utils/zod-openapi.ts - Zod to OpenAPI schema converter
// Converts z.object({...}) definitions to OpenAPI components.schemas

export function parseZodToOpenAPI(zodSchemaString: string): any {
  // Clean up the schema string
  const cleanSchema = zodSchemaString.trim();

  // Basic Zod field parsers
  const fieldParsers = {
    'z.string()': { type: 'string' },
    'z.number()': { type: 'number' },
    'z.boolean()': { type: 'boolean' },
    'z.date()': { type: 'string', format: 'date-time' },
    'z.array(': { type: 'array', items: { type: 'string' } },
    'z.optional(': (field: string) => ({ ...parseField(field.replace(/\.optional\(\)/, '')), required: false }),
    'z.nullable(': (field: string) => ({ ...parseField(field), nullable: true })
  };

  function parseField(fieldDef: string): any {
    fieldDef = fieldDef.trim();

    // Handle optional fields
    if (fieldDef.endsWith('.optional()')) {
      return { ...parseField(fieldDef.replace('.optional()', '')), required: false };
    }

    // Handle nullable fields
    if (fieldDef.endsWith('.nullable()')) {
      return { ...parseField(fieldDef.replace('.nullable()', '')), nullable: true };
    }

    // Handle arrays
    if (fieldDef.includes('z.array(')) {
      const arrayMatch = fieldDef.match(/z\.array\((.+)\)/);
      if (arrayMatch) {
        const itemType = arrayMatch[1].trim().replace(/\)$/, '');
        return {
          type: 'array',
          items: parseField(itemType)
        };
      }
    }

    // Handle enums
    if (fieldDef.includes('.enum([')) {
      const enumMatch = fieldDef.match(/\.enum\[([^\]]+)\]/);
      if (enumMatch) {
        const enumValues = enumMatch[1].split(',').map(v => v.trim().replace(/['"]/g, ''));
        return {
          type: 'string',
          enum: enumValues
        };
      }
    }

    // Handle string with patterns/constraints
    if (fieldDef.includes('z.string()')) {
      let schema: any = { type: 'string' };

      if (fieldDef.includes('.length(')) {
        const lengthMatch = fieldDef.match(/\.length\((\d+)\)/);
        if (lengthMatch) {
          schema.minLength = schema.maxLength = parseInt(lengthMatch[1]);
        }
      }

      if (fieldDef.includes('.min(')) {
        const minMatch = fieldDef.match(/\.min\((\d+)\)/);
        if (minMatch) {
          schema.minLength = parseInt(minMatch[1]);
        }
      }

      if (fieldDef.includes('.max(')) {
        const maxMatch = fieldDef.match(/\.max\((\d+)\)/);
        if (maxMatch) {
          schema.maxLength = parseInt(maxMatch[1]);
        }
      }

      if (fieldDef.includes('.email()')) {
        schema.format = 'email';
      }

      if (fieldDef.includes('.url()')) {
        schema.format = 'uri';
      }

      if (fieldDef.includes('.uuid()')) {
        schema.format = 'uuid';
      }

      return schema;
    }

    // Handle numbers with constraints
    if (fieldDef.includes('z.number()')) {
      let schema: any = { type: 'number' };

      if (fieldDef.includes('.int()')) {
        schema.type = 'integer';
      }

      if (fieldDef.includes('.positive()')) {
        schema.minimum = 0;
        schema.exclusiveMinimum = true;
      }

      if (fieldDef.includes('.min(')) {
        const minMatch = fieldDef.match(/\.min\((\d+)\)/);
        if (minMatch) {
          schema.minimum = parseInt(minMatch[1]);
        }
      }

      if (fieldDef.includes('.max(')) {
        const maxMatch = fieldDef.match(/\.max\((\d+)\)/);
        if (maxMatch) {
          schema.maximum = parseInt(maxMatch[1]);
        }
      }

      return schema;
    }

    // Default to string for unknown types
    return { type: 'string' };
  }

  // Parse the schema fields
  const properties: Record<string, any> = {};
  const required: string[] = [];

  // Split by commas, but be careful with nested objects
  const fields = cleanSchema.split(',').map(f => f.trim());

  for (const field of fields) {
    const [fieldName, ...fieldDefParts] = field.split(':');
    if (!fieldName || !fieldDefParts.length) continue;

    const cleanFieldName = fieldName.trim().replace(/['"]/g, '');
    const fieldDef = fieldDefParts.join(':').trim();

    properties[cleanFieldName] = parseField(fieldDef);

    // Check if field is required (not optional)
    if (!fieldDef.includes('.optional()')) {
      required.push(cleanFieldName);
    }
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 && { required })
  };
}

// Helper to extract schema names from Zod exports
export function extractZodSchemasFromCode(code: string): Record<string, any> {
  const schemas: Record<string, any> = {};

  // Match export const SchemaName = z.object({...})
  const schemaMatches = code.match(/export\s+const\s+(\w+)\s*=\s*z\.object\({([^}]+)}\)/gs) || [];

  for (const match of schemaMatches) {
    const nameMatch = match.match(/export\s+const\s+(\w+)\s*=/);
    const schemaMatch = match.match(/z\.object\({([^}]+)}\)/);

    if (nameMatch && schemaMatch) {
      const schemaName = nameMatch[1];
      const schemaDef = schemaMatch[1];
      schemas[schemaName] = parseZodToOpenAPI(schemaDef);
    }
  }

  return schemas;
}
