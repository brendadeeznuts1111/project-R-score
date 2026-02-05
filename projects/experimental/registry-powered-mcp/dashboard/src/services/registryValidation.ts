
import { z } from 'zod';

/**
 * v1.3.6 Hardened Package Schema
 * Implements strict type inference and security source pinning
 */
export const RegistryPackageSchema = z.object({
  package: z.string()
    .min(1)
    .max(214)
    .regex(/^[a-z0-9-]+(?:@[a-z0-9.-]+)?$/, "Invalid package format"),
  version: z.string()
    .regex(/^(?:\d+\.\d+\.\d+|latest|\d+\.\d+)$/, "SemVer required"),
  dependencies: z.record(
    z.string(),
    z.string().regex(/^(?:\d+\.\d+\.\d+|\d+\.\d+|latest)$/)
  ).optional(),
  trustedSources: z.array(
    z.enum(["npm:", "github:", "git:", "link:"])
  ).min(1),
  signature: z.string().optional(), // In production, this is required
  types: z.object({
    compatibility: z.object({
      node: z.enum(["18", "24", "25"])
    })
  }).optional()
});

export type RegistryPackage = z.infer<typeof RegistryPackageSchema>;

export const validatePackage = (data: any) => {
  try {
    RegistryPackageSchema.parse(data);
    return { success: true, errors: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Use .issues instead of .errors for ZodError
      return { success: false, errors: error.issues };
    }
    return { success: false, errors: [{ message: "Unknown validation error" }] };
  }
};