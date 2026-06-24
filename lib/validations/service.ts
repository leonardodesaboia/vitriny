import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value));

const optionalPrice = z
  .string()
  .trim()
  .transform((value) => {
    if (!value) return null;
    return value.includes(",")
      ? value.replace(/\./g, "").replace(",", ".")
      : value;
  })
  .pipe(
    z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Informe um valor válido.")
      .nullable()
  );

export const serviceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do serviço.")
    .max(120, "Use no máximo 120 caracteres."),
  description: optionalText.pipe(
    z.string().max(600, "Use no máximo 600 caracteres.").nullable()
  ),
  basePrice: optionalPrice,
  isActive: z.boolean()
});

export type ServiceInput = z.infer<typeof serviceSchema>;
