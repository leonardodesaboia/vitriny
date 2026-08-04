"use server";

import crypto from "node:crypto";
import { PreApproval } from "mercadopago";

import { signOut } from "@/auth";
import { requireAuth } from "@/lib/actions/auth-guard";
import { isSubscriptionLockActive } from "@/lib/mp-subscription-lock";
import { getMercadoPago } from "@/lib/mercadopago";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { deleteFromStorage } from "@/lib/storage";
import type { ActionResult } from "@/types";

function hashEmail(email: string) {
  return crypto
    .createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");
}

// Soft delete: anonimiza a conta e bloqueia o acesso, mas preserva pedidos,
// propostas e itens (inativos) para a futura tela administrativa. O e-mail e
// o slug viram tombstones, liberando ambos para novos cadastros.
export async function deleteAccount(): Promise<ActionResult> {
  const userId = await requireAuth();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      deletedAt: true,
      providerProfile: {
        select: {
          id: true,
          slug: true,
          stripeSubscriptionId: true,
          mpPreapprovalId: true,
          mpSubscriptionLockedAt: true,
          services: {
            select: { id: true, imageStorageKey: true }
          }
        }
      }
    }
  });

  if (!user || user.deletedAt) {
    return { error: "Conta não encontrada." };
  }

  const profile = user.providerProfile;

  if (profile && isSubscriptionLockActive(profile.mpSubscriptionLockedAt)) {
    return { error: "Uma operação de assinatura está em andamento. Tente novamente em instantes." };
  }

  // Cobrança em primeiro lugar: se o cancelamento falhar, a exclusão aborta —
  // uma conta "excluída" não pode continuar sendo cobrada.
  if (profile?.stripeSubscriptionId) {
    try {
      await stripe.subscriptions.cancel(profile.stripeSubscriptionId);
    } catch (error) {
      console.error("Falha ao cancelar assinatura na exclusão de conta.", {
        error,
        userId: user.id
      });
      return {
        error:
          "Não foi possível cancelar sua assinatura. Tente novamente ou cancele em Assinatura antes de excluir a conta."
      };
    }
  }

  if (profile?.mpPreapprovalId) {
    try {
      const preApproval = new PreApproval(getMercadoPago());
      const cancelled = await preApproval.update({
        id: profile.mpPreapprovalId,
        body: { status: "cancelled" }
      });
      if (cancelled.status !== "cancelled") {
        throw new Error(`Status inesperado ao cancelar assinatura MP: ${cancelled.status}`);
      }
    } catch (error) {
      console.error("Falha ao cancelar assinatura MP na exclusão de conta.", {
        userId: user.id,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : "Erro desconhecido"
      });
      return {
        error:
          "Não foi possível cancelar sua assinatura. Tente novamente ou cancele em Assinatura antes de excluir a conta."
      };
    }
  }

  const imageKeys =
    profile?.services.flatMap((service) =>
      service.imageStorageKey ? [service.imageStorageKey] : []
    ) ?? [];

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        name: "Conta excluída",
        email: `excluida-${user.id}@conta-excluida.local`,
        emailVerified: null,
        image: null,
        password: null,
        deletedAt: new Date(),
        deletedEmailHash: user.email ? hashEmail(user.email) : null
      }
    });

    await tx.account.deleteMany({ where: { userId: user.id } });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await tx.emailVerificationToken.deleteMany({ where: { userId: user.id } });

    if (profile) {
      await tx.providerProfile.update({
        where: { id: profile.id },
        data: {
          isPublished: false,
          slug: `excluida-${profile.id}`,
          phone: null,
          email: null,
          pixKey: null,
          pixKeyType: null,
          pixHolderName: null,
          pixCity: null
        }
      });

      await tx.service.updateMany({
        where: { providerId: profile.id },
        data: {
          isActive: false,
          imageUrl: null,
          imageStorageKey: null
        }
      });
    }
  });

  // Depois do banco: falha no storage não pode desfazer a exclusão.
  for (const key of imageKeys) {
    try {
      await deleteFromStorage(key);
    } catch (error) {
      console.error("Falha ao remover imagem na exclusão de conta.", {
        error,
        key
      });
    }
  }

  await signOut({ redirectTo: "/" });
  return undefined;
}
