import { describe, expect, it } from "vitest";

import { providerProfileSchema } from "@/lib/validations/provider-profile";

// Espelha o shape produzido por readProviderProfileFormValues na action.
const baseInput = {
  businessName: "Estúdio Aurora",
  slug: "estudio-aurora",
  description: "",
  phone: "",
  email: "",
  city: "Fortaleza",
  state: "CE",
  isPublished: false,
  pixKey: "",
  pixKeyType: "",
  pixHolderName: "",
  pixCity: "",
  businessType: "SERVICES",
  address: "",
  instagram: "",
  facebook: "",
  tiktok: "",
  businessHours: "",
};

const validWeek = JSON.stringify([
  null,
  { open: "08:00", close: "18:00" },
  { open: "08:00", close: "18:00" },
  { open: "08:00", close: "18:00" },
  { open: "08:00", close: "18:00" },
  { open: "08:00", close: "18:00" },
  null,
]);

describe("providerProfileSchema — identidade", () => {
  it("campos vazios viram null", () => {
    const parsed = providerProfileSchema.safeParse(baseInput);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.address).toBeNull();
    expect(parsed.data.instagram).toBeNull();
    expect(parsed.data.businessHours).toBeNull();
  });

  it("aceita endereço e redes válidas", () => {
    const parsed = providerProfileSchema.safeParse({
      ...baseInput,
      address: "Rua das Flores, 123 — Centro",
      instagram: "@estudio.aurora",
      facebook: "https://facebook.com/estudioaurora",
      tiktok: "estudioaurora",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.address).toBe("Rua das Flores, 123 — Centro");
    expect(parsed.data.instagram).toBe("@estudio.aurora");
  });

  it("rejeita rede social não normalizável", () => {
    const parsed = providerProfileSchema.safeParse({
      ...baseInput,
      instagram: "meu negocio inválido",
    });
    expect(parsed.success).toBe(false);
  });

  it("aceita businessHours como JSON válido de 7 dias", () => {
    const parsed = providerProfileSchema.safeParse({
      ...baseInput,
      businessHours: validWeek,
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.businessHours).toHaveLength(7);
    expect(parsed.data.businessHours?.[1]).toEqual({
      open: "08:00",
      close: "18:00",
    });
  });

  it("rejeita JSON inválido", () => {
    const parsed = providerProfileSchema.safeParse({
      ...baseInput,
      businessHours: "{oops",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejeita semana com menos de 7 posições", () => {
    const parsed = providerProfileSchema.safeParse({
      ...baseInput,
      businessHours: JSON.stringify([null, null, null]),
    });
    expect(parsed.success).toBe(false);
  });

  it("rejeita horário fora do formato HH:MM", () => {
    const parsed = providerProfileSchema.safeParse({
      ...baseInput,
      businessHours: JSON.stringify([
        { open: "25:00", close: "18:00" },
        null,
        null,
        null,
        null,
        null,
        null,
      ]),
    });
    expect(parsed.success).toBe(false);
  });

  it("rejeita dia com open igual a close", () => {
    const parsed = providerProfileSchema.safeParse({
      ...baseInput,
      businessHours: JSON.stringify([
        { open: "08:00", close: "08:00" },
        null,
        null,
        null,
        null,
        null,
        null,
      ]),
    });
    expect(parsed.success).toBe(false);
  });

  it("aceita janela noturna (close < open, fecha após a meia-noite)", () => {
    const parsed = providerProfileSchema.safeParse({
      ...baseInput,
      businessHours: JSON.stringify([
        null,
        null,
        null,
        null,
        null,
        null,
        { open: "18:00", close: "02:00" },
      ]),
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.businessHours?.[6]).toEqual({
      open: "18:00",
      close: "02:00",
    });
  });

  it("semana toda fechada vira null (mesma semântica de parseBusinessHours)", () => {
    const parsed = providerProfileSchema.safeParse({
      ...baseInput,
      businessHours: JSON.stringify([null, null, null, null, null, null, null]),
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.businessHours).toBeNull();
  });
});
