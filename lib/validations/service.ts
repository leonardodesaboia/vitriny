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

export const serviceSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe o nome do serviço.")
      .max(120, "Use no máximo 120 caracteres."),
    description: optionalText.pipe(
      z.string().max(600, "Use no máximo 600 caracteres.").nullable()
    ),
    pricingType: z.enum(["FIXED", "CUSTOM"]),
    fixedServiceCheckoutMode: z
      .enum(["REQUEST_ONLY", "REQUIRE_PIX_PAYMENT"])
      .default("REQUEST_ONLY"),
    basePrice: optionalPrice,
    isActive: z.boolean(),
    requiresSchedulingDetails: z.boolean().default(false)
  })
  .superRefine((data, ctx) => {
    const price = data.basePrice ? parseFloat(data.basePrice) : 0;
    if (data.pricingType === "FIXED" && (!data.basePrice || price <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe o preço para serviço com preço fixo.",
        path: ["basePrice"]
      });
    }
  });

export type ServiceInput = z.infer<typeof serviceSchema>;
