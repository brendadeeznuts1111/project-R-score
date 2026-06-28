import { z } from "zod";

export const REF_ID_PATTERN =
  /^(B0[1-8]|E0[1-5]|T0[1-5]|S0[1-5]|SPEC-0[1-9]|DOC-0[1-4])$/;

export const RefIdSchema = z.string().regex(REF_ID_PATTERN, "Invalid Ref ID");

export const UrlClassificationSchema = z.enum([
  "ok",
  "redirect",
  "not_found",
  "client_error",
  "server_error",
  "timeout",
  "dns",
  "network",
  "redirect_loop",
  "method_not_allowed",
  "blocked",
  "internal",
  "unknown",
  "skipped",
]);

export type UrlClassification = z.infer<typeof UrlClassificationSchema>;

const RefEntrySchema = z
  .object({
    id: RefIdSchema,
    prefix: z.string().min(1),
    topic: z.string().min(1),
    url: z.string().min(1),
    urlLabel: z.string().optional(),
    anchor: z.string().min(1),
    group: z.string().min(1),
    projectUse: z.string().min(1),
    kind: z.enum(["external", "internal"]),
    sidebarLabel: z.string().optional(),
    tags: z.array(z.string()).min(1),
    deprecated: z.boolean(),
    replacedBy: RefIdSchema.nullable(),
    lastChecked: z.string().nullable(),
    status: z.string(),
  })
  .superRefine((ref, ctx) => {
    if (ref.deprecated && !ref.replacedBy) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${ref.id}: deprecated refs must set replacedBy`,
        path: ["replacedBy"],
      });
    }
    if (!ref.deprecated && ref.replacedBy !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${ref.id}: replacedBy must be null when not deprecated`,
        path: ["replacedBy"],
      });
    }
  });

const GroupSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  prefix: z.string().min(1),
});

const PairingSchema = z.object({
  id: z.string().min(1),
  useCase: z.string().min(1),
  description: z.string().min(1),
  refs: z.array(RefIdSchema).min(1),
});

const CrossRefEntrySchema = z.object({
  spec: RefIdSchema.refine((id) => id.startsWith("SPEC-"), {
    message: "crossRefMatrix spec must be a SPEC-XX id",
  }),
  externalRefs: z.array(RefIdSchema).min(1),
  outlinePhase: z.string().min(1),
});

const MetaSchema = z.object({
  version: z.number().int().positive(),
  lastAudit: z.string().nullable(),
  generatedBy: z.string().min(1),
  totalRefs: z.number().int().nonnegative(),
});

export const RefsJsonSchema = z
  .object({
    meta: MetaSchema,
    groups: z.array(GroupSchema),
    refs: z.array(RefEntrySchema).min(1),
    pairings: z.array(PairingSchema),
    crossRefMatrix: z.array(CrossRefEntrySchema),
  })
  .superRefine((data, ctx) => {
    if (data.meta.totalRefs !== data.refs.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `meta.totalRefs (${data.meta.totalRefs}) !== refs.length (${data.refs.length})`,
        path: ["meta", "totalRefs"],
      });
    }

    const ids = new Set<string>();
    for (const ref of data.refs) {
      if (ids.has(ref.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate ref id: ${ref.id}`,
          path: ["refs"],
        });
      }
      ids.add(ref.id);
    }

    const pairingIds = new Set<string>();
    for (const pairing of data.pairings) {
      if (pairingIds.has(pairing.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate pairing id: ${pairing.id}`,
          path: ["pairings"],
        });
      }
      pairingIds.add(pairing.id);
      for (const refId of pairing.refs) {
        if (!ids.has(refId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Pairing ${pairing.id} references unknown ref ${refId}`,
            path: ["pairings"],
          });
        }
      }
    }

    for (const ref of data.refs) {
      if (ref.deprecated && ref.replacedBy && !ids.has(ref.replacedBy)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${ref.id} replacedBy ${ref.replacedBy} not in registry`,
          path: ["refs"],
        });
      }
    }

    const crossRefSpecs = new Set<string>();
    for (const entry of data.crossRefMatrix) {
      if (crossRefSpecs.has(entry.spec)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate crossRefMatrix spec: ${entry.spec}`,
          path: ["crossRefMatrix"],
        });
      }
      crossRefSpecs.add(entry.spec);
      if (!ids.has(entry.spec)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `crossRefMatrix spec ${entry.spec} not in registry`,
          path: ["crossRefMatrix"],
        });
      }
      for (const refId of entry.externalRefs) {
        if (!ids.has(refId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `crossRefMatrix ${entry.spec} references unknown ref ${refId}`,
            path: ["crossRefMatrix"],
          });
        }
      }
    }
  });

export type RefEntry = z.infer<typeof RefEntrySchema>;
export type RefsJson = z.infer<typeof RefsJsonSchema>;
export type RefId = z.infer<typeof RefIdSchema>;

export function parseRefsJson(data: unknown): RefsJson {
  return RefsJsonSchema.parse(data);
}

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}
