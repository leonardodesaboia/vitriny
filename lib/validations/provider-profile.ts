import { z } from "zod";

import { TIME_REGEX } from "@/lib/business-hours";
import { normalizeSocialUrl, type SocialNetwork } from "@/lib/social-links";
import { formatPhoneBR, isValidPhoneBR } from "@/lib/utils/phone";
import {
  isValidPixKey,
  normalizePixKey,
  pixKeyErrorMessage
} from "@/lib/utils/pix-key";

const businessTypeSchema = z.enum(["PRODUCTS", "SERVICES", "BOTH"]);

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

const dayHoursSchema = z
  .object({
    open: z.string().regex(TIME_REGEX, "Horário inválido."),
    close: z.string().regex(TIME_REGEX, "Horário inválido.")
  })
  .nullable()
  .refine(
    (day) => day === null || day.open !== day.close,
    "Horários de abertura e fechamento não podem ser iguais."
  );

const businessHoursSchema = z
  .preprocess(
    (value) => {
      if (value == null || value === "") return null;
      if (typeof value !== "string") return value;
      try {
        return JSON.parse(value);
      } catch {
        // Valor não-JSON cai na união e falha com mensagem de horários inválidos.
        return value;
      }
    },
    z.union(
      [z.array(dayHoursSchema).length(7, "Horários incompletos."), z.null()],
      { error: "Horários inválidos." }
    )
  )
  .transform((days) => (days?.some((day) => day !== null) ? days : null));

const optionalSocial = (network: SocialNetwork) =>
  optionalText.pipe(
    z
      .string()
      .max(120, "Use no máximo 120 caracteres.")
      .nullable()
      .refine(
        (value) => value === null || normalizeSocialUrl(network, value) !== null,
        "Informe um @usuario ou link válido."
      )
  );

export const providerProfileSchema = z
  .object({
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
    phone: optionalPhone,
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
    isPublished: z.boolean(),
    pixKey: optionalText.pipe(
      z.string().max(140, "Use no máximo 140 caracteres.").nullable()
    ),
    pixKeyType: optionalText.pipe(z.string().max(30).nullable()),
    pixHolderName: optionalText.pipe(
      z.string().max(120, "Use no máximo 120 caracteres.").nullable()
    ),
    pixCity: optionalText.pipe(
      z.string().max(80, "Use no máximo 80 caracteres.").nullable()
    ),
    businessType: businessTypeSchema.default("SERVICES"),
    address: optionalText.pipe(
      z.string().max(160, "Use no máximo 160 caracteres.").nullable()
    ),
    instagram: optionalSocial("instagram"),
    facebook: optionalSocial("facebook"),
    tiktok: optionalSocial("tiktok"),
    businessHours: businessHoursSchema
  })
  .superRefine((data, ctx) => {
    const hasPixKey = Boolean(data.pixKey);
    const hasPixDetails = Boolean(data.pixHolderName || data.pixCity);

    if (hasPixKey && !data.pixHolderName) {
      ctx.addIssue({
        code: "custom",
        message: "Informe o nome do titular para usar Pix nas propostas.",
        path: ["pixHolderName"]
      });
    }

    if (hasPixKey && !data.pixCity) {
      ctx.addIssue({
        code: "custom",
        message: "Informe a cidade do Pix para usar Pix nas propostas.",
        path: ["pixCity"]
      });
    }

    if (!hasPixKey && hasPixDetails) {
      ctx.addIssue({
        code: "custom",
        message: "Informe a chave Pix ou deixe todos os dados Pix em branco.",
        path: ["pixKey"]
      });
    }

    if (data.pixKey && !isValidPixKey(data.pixKey, data.pixKeyType)) {
      ctx.addIssue({
        code: "custom",
        message: pixKeyErrorMessage(data.pixKeyType),
        path: ["pixKey"]
      });
    }
  })
  .transform((data) => ({
    ...data,
    // A chave vai crua para o payload do QR Code; precisa estar no formato
    // registrado no DICT (documentos sem pontuação, telefone como +55...).
    pixKey: data.pixKey ? normalizePixKey(data.pixKey, data.pixKeyType) : data.pixKey
  }));

export type ProviderProfileInput = z.infer<typeof providerProfileSchema>;
