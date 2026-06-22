import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value));

export const providerProfileSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, "Informe o nome do negócio.")
    .max(120, "Use no máximo 120 caracteres."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Use pelo menos 3 caracteres.")
    .max(60, "Use no máximo 60 caracteres.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use apenas letras minúsculas, números e hífens."
    ),
  description: optionalText.pipe(
    z.string().max(600, "Use no máximo 600 caracteres.").nullable()
  ),
  phone: optionalText.pipe(
    z.string().max(30, "Use no máximo 30 caracteres.").nullable()
  ),
  email: optionalText.pipe(
    z
      .string()
      .email("Informe um e-mail válido.")
      .max(120, "Use no máximo 120 caracteres.")
      .nullable()
  ),
  city: optionalText.pipe(
    z.string().max(80, "Use no máximo 80 caracteres.").nullable()
  ),
  state: optionalText.pipe(
    z.string().max(80, "Use no máximo 80 caracteres.").nullable()
  ),
  isPublished: z.boolean()
});

export type ProviderProfileInput = z.infer<typeof providerProfileSchema>;
