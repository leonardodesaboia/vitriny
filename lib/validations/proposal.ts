import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value));

const moneyValue = z
  .string()
  .trim()
  .transform((value) => value.replace(",", "."))
  .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/, "Informe um valor válido."));

export const proposalItemSchema = z.object({
  description: z
    .string()
    .trim()
    .min(2, "Informe a descrição do item.")
    .max(200, "Use no máximo 200 caracteres."),
  quantity: z.coerce
    .number()
    .int("Informe uma quantidade inteira.")
    .min(1, "A quantidade mínima é 1.")
    .max(999, "A quantidade máxima é 999."),
  unitPrice: moneyValue
});

export const proposalSchema = z.object({
  requestId: z.string().cuid(),
  title: z
    .string()
    .trim()
    .min(2, "Informe o título da proposta.")
    .max(120, "Use no máximo 120 caracteres."),
  description: optionalText.pipe(
    z.string().max(1000, "Use no máximo 1000 caracteres.").nullable()
  ),
  validUntil: optionalText.pipe(z.string().date().nullable()),
  items: z.array(proposalItemSchema).min(1, "Inclua pelo menos um item.")
});

export type ProposalInput = z.infer<typeof proposalSchema>;
