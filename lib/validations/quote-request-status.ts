import { z } from "zod";

export const quoteRequestStatusSchema = z.enum(["NEW", "REVIEWING", "CLOSED"]);

export type QuoteRequestStatusInput = z.infer<typeof quoteRequestStatusSchema>;
