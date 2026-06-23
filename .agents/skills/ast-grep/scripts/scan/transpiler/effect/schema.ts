import { Schema } from "effect";

export const CloseLoopStepIdSchema = Schema.Literal(
  "seed",
  "ground-truth",
  "bench-snapshot",
  "baseline-diff",
  "baseline-write",
);

export const CloseLoopStepSchema = Schema.Struct({
  id: CloseLoopStepIdSchema,
  ok: Schema.Boolean,
  elapsedMs: Schema.Number,
  detail: Schema.optional(Schema.String),
});

export const CloseLoopSummarySchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  tool: Schema.Literal("skill-loop-close-loop"),
  domain: Schema.String,
  scanPath: Schema.optional(Schema.String),
  steps: Schema.Array(CloseLoopStepSchema),
  ok: Schema.Boolean,
  rating: Schema.optional(Schema.Number),
  grade: Schema.optional(Schema.String),
  loopBaselinePath: Schema.optional(Schema.String),
});

export type CloseLoopSummaryEncoded = Schema.Schema.Type<typeof CloseLoopSummarySchema>;

export function decodeCloseLoopSummary(
  input: unknown,
): Schema.Schema.Type<typeof CloseLoopSummarySchema> {
  return Schema.decodeUnknownSync(CloseLoopSummarySchema)(input);
}