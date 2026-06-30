import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value));

const moneyValue = z
  .string()
  .trim()
  .transform((value) =>
    value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value
  )
  .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/, "Informe um valor valido."));

export const proposalTemplateItemSchema = z.object({
  description: z
    .string()
    .trim()
    .min(2, "Informe a descricao do item.")
    .max(200, "Use no maximo 200 caracteres."),
  quantity: z.coerce
    .number()
    .int("Informe uma quantidade inteira.")
    .min(1, "A quantidade minima e 1.")
    .max(999, "A quantidade maxima e 999."),
  unitPrice: moneyValue
});

export const proposalTemplateSchema = z.object({
  templateId: z.string().cuid().optional(),
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do modelo.")
    .max(120, "Use no maximo 120 caracteres."),
  title: z
    .string()
    .trim()
    .min(2, "Informe o titulo da proposta.")
    .max(120, "Use no maximo 120 caracteres."),
  description: optionalText.pipe(
    z.string().max(1000, "Use no maximo 1000 caracteres.").nullable()
  ),
  items: z.array(proposalTemplateItemSchema).min(1, "Inclua pelo menos um item.")
});

export type ProposalTemplateInput = z.infer<typeof proposalTemplateSchema>;
