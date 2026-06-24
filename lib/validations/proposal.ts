import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value));

function normalizeMoney(v: string) {
  return v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v;
}

const moneyValue = z
  .string()
  .trim()
  .transform(normalizeMoney)
  .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/, "Informe um valor válido."));

const requiredMoney = moneyValue.pipe(
  z.string().refine((v) => parseFloat(v) > 0, "O valor deve ser maior que zero.")
);

const optionalMoney = optionalText.pipe(
  z.union([
    z.null(),
    z
      .string()
      .transform(normalizeMoney)
      .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/, "Informe um valor válido."))
  ])
);

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

const baseFields = {
  requestId: z.string().cuid(),
  title: optionalText.pipe(z.string().max(120, "Use no máximo 120 caracteres.").nullable()),
  description: optionalText.pipe(
    z.string().max(1000, "Use no máximo 1000 caracteres.").nullable()
  ),
  validUntil: optionalText.pipe(z.string().date().nullable()),
  depositAmount: optionalMoney
};

export const proposalSchema = z.discriminatedUnion("pricingMode", [
  z.object({
    ...baseFields,
    pricingMode: z.literal("SIMPLE"),
    totalAmount: requiredMoney
  }),
  z.object({
    ...baseFields,
    pricingMode: z.literal("ITEMIZED"),
    items: z
      .array(proposalItemSchema)
      .min(1, "Adicione pelo menos um item com valor.")
  })
]);

export type ProposalInput = z.infer<typeof proposalSchema>;
