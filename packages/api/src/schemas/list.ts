import { z } from "zod";

// ─── list.create ─────────────────────────────────────────────
export const listCreateResponseSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  maxCards: z.number().nullable().optional(),
});

// ─── list.update / list.reorder ──────────────────────────────
export const listUpdateResponseSchema = z.object({
  publicId: z.string(),
  name: z.string(),
  maxCards: z.number().nullable().optional(),
});
