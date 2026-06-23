import { z } from "zod";

export const quoteRequestNoteSchema = z.object({
  requestId: z.string().cuid(),
  content: z
    .string()
    .trim()
    .min(2, "Informe a observacao.")
    .max(1000, "Use no maximo 1000 caracteres.")
});

export type QuoteRequestNoteInput = z.infer<typeof quoteRequestNoteSchema>;
