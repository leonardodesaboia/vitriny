import { z } from "zod";

import { formatPhoneBR, isValidPhoneBR } from "@/lib/utils/phone";
import { isISODateBeforeToday, isValidISODate } from "@/lib/utils/date";

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
  description: optionalText.pipe(
    z.string().max(1200, "Use no máximo 1200 caracteres.").nullable()
  ),
  desiredDate: optionalText.pipe(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida no formato AAAA-MM-DD.")
      .nullable()
      .refine(
        (value) => value === null || isValidISODate(value),
        "Informe uma data válida."
      )
  ),
  desiredTime: optionalText.pipe(
    z.string().max(100, "Use no máximo 100 caracteres.").nullable()
  ),
  location: optionalText.pipe(
    z.string().max(200, "Use no máximo 200 caracteres.").nullable()
  )
}).superRefine((data, ctx) => {
  if (!data.customerEmail && !data.customerPhone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Informe pelo menos um meio de contato: e-mail ou telefone.",
      path: ["customerEmail"]
    });
  }
});

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;

type QuoteRequestServiceRules = {
  pricingType: "FIXED" | "CUSTOM";
  requiresSchedulingDetails: boolean;
} | null;

export function validateQuoteRequestForService(
  input: QuoteRequestInput,
  service: QuoteRequestServiceRules,
  referenceDate = new Date()
) {
  if (service?.pricingType !== "FIXED" && !input.description) {
    return "Descreva o que você precisa para solicitar um orçamento.";
  }

  if (
    input.desiredDate &&
    isISODateBeforeToday(input.desiredDate, referenceDate)
  ) {
    return "Escolha uma data de atendimento que não esteja no passado.";
  }

  if (service?.requiresSchedulingDetails) {
    if (!input.desiredDate || !input.desiredTime || !input.location) {
      return "Informe data, horário e local para este serviço.";
    }
  }

  return null;
}
