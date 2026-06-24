import { z } from "zod";

import { formatPhoneBR, isValidPhoneBR } from "@/lib/utils/phone";

const optionalText = z
  .preprocess((value) => (value == null ? "" : value), z.string())
  .transform((value) => value.trim())
  .transform((value) => (value === "" ? null : value));

const optionalPhone = optionalText.pipe(
  z
    .string()
    .max(30, "Use no máximo 30 caracteres.")
    .nullable()
    .refine(isValidPhoneBR, "Informe um telefone válido com DDD.")
    .transform((value) => (value ? formatPhoneBR(value) : null))
);

export const quoteRequestSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, "Informe seu nome.")
    .max(120, "Use no máximo 120 caracteres."),
  customerEmail: optionalText.pipe(
    z
      .string()
      .email("Informe um e-mail válido.")
      .max(120, "Use no máximo 120 caracteres.")
      .nullable()
  ),
  customerPhone: optionalPhone,
  serviceId: optionalText.pipe(z.string().cuid().nullable()),
  description: z
    .string()
    .trim()
    .min(10, "Descreva o que você precisa com pelo menos 10 caracteres.")
    .max(1200, "Use no máximo 1200 caracteres.")
});

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;
