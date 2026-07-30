import { z } from "zod";

import { formatPhoneBR, isValidPhoneBR } from "@/lib/utils/phone";
import { isISODateBeforeToday, isValidISODate } from "@/lib/utils/date";

const optionalText = z
  .preprocess((value) => (value == null ? "" : value), z.string())
  .transform((value) => value.trim())
  .transform((value) => (value === "" ? null : value));

const requiredPhone = z
  .preprocess((value) => (value == null ? "" : String(value)), z.string())
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .min(1, "Informe seu telefone.")
      .max(30, "Use no máximo 30 caracteres.")
      .refine(isValidPhoneBR, "Informe um telefone válido com DDD.")
      .transform((value) => formatPhoneBR(value))
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
  customerPhone: requiredPhone,
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
});

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;

type QuoteRequestServiceRules = {
  pricingType: "FIXED" | "CUSTOM";
  requiresSchedulingDetails: boolean;
  requiresLocation: boolean;
} | null;

export function validateQuoteRequestForService(
  input: QuoteRequestInput,
  service: QuoteRequestServiceRules,
  referenceDate = new Date()
) {
  // Pedido genérico (sem item) não é permitido: toda solicitação parte de
  // um item cadastrado na vitrine.
  if (!service) {
    return "Selecione um item da vitrine para enviar a solicitação.";
  }

  if (
    input.desiredDate &&
    isISODateBeforeToday(input.desiredDate, referenceDate)
  ) {
    return "Escolha uma data de atendimento que não esteja no passado.";
  }

  // Data/horário e local são exigências independentes: um produto pode
  // pedir só o endereço de entrega, um serviço pode pedir só o agendamento.
  if (service.requiresSchedulingDetails) {
    if (!input.desiredDate || !input.desiredTime) {
      return "Informe data e horário para este item.";
    }
  }

  if (service.requiresLocation && !input.location) {
    return "Informe o local para este item.";
  }

  return null;
}
