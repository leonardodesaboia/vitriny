"use server";

import { z } from "zod";

import { requireAuth } from "@/lib/actions/auth-guard";
import {
  isBrandColorAvailable,
  isBrandFontAvailable,
} from "@/lib/brand-appearance";
import { prisma } from "@/lib/prisma";

type BrandAppearanceActionResult =
  | { success: true }
  | { error: string };

const brandColorSchema = z.enum([
  "FOREST",
  "OCEAN",
  "ROSE",
  "GOLD",
  "SLATE",
  "LAVENDER",
  "TERRACOTTA",
  "TEAL",
]);

const brandFontSchema = z.enum([
  "CLASSIC",
  "MODERN",
  "ELEGANT",
  "GEOMETRIC",
  "FRIENDLY",
  "EDITORIAL",
]);

const brandAppearanceSchema = z.object({
  brandColor: brandColorSchema,
  brandFont: brandFontSchema,
});

async function getAuthorizedProfile(userId: string) {
  return prisma.providerProfile.findUnique({
    where: { userId },
    select: {
      plan: true,
      brandColor: true,
      brandFont: true,
    },
  });
}

export async function saveBrandAppearance(
  input: z.input<typeof brandAppearanceSchema>,
): Promise<BrandAppearanceActionResult> {
  const parsed = brandAppearanceSchema.safeParse(input);
  if (!parsed.success) return { error: "Aparência inválida." };

  const userId = await requireAuth();
  const profile = await getAuthorizedProfile(userId);

  if (!profile) return { error: "Dados do negócio não encontrados." };

  // Gate por atributo: FREE só grava as opções do kit inicial; PRO libera tudo.
  // Espelha isBrand*Available usado na UI e no layout público.
  if (
    !isBrandColorAvailable(profile.plan, parsed.data.brandColor) ||
    !isBrandFontAvailable(profile.plan, parsed.data.brandFont)
  ) {
    return { error: "Essa opção está disponível no plano PRO." };
  }

  if (
    profile.brandColor === parsed.data.brandColor &&
    profile.brandFont === parsed.data.brandFont
  ) {
    return { success: true };
  }

  try {
    await prisma.providerProfile.update({
      where: { userId },
      data: parsed.data,
    });
    // Sem revalidatePath: todas as páginas que leem a aparência são
    // force-dynamic (dashboard layout, /u/[slug], orçamento, proposta), então
    // sempre renderizam fresco do banco. Chamar revalidatePath aqui forçaria um
    // refresh da rota atual a cada clique, e o React reaplicaria
    // data-brand-color/font do servidor por cima da aplicação otimista do
    // cliente — revertendo/piscando o tema durante trocas rápidas.
    return { success: true };
  } catch (error) {
    console.error("brand appearance update failed", { userId, error });
    return {
      error: "Não foi possível salvar a aparência. Tente novamente.",
    };
  }
}
