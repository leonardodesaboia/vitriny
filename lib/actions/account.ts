"use server";

import crypto from "node:crypto";
import { PreApproval } from "mercadopago";

import { signOut } from "@/auth";
import { requireAuth } from "@/lib/actions/auth-guard";
import {
  acquireSubscriptionLock,
  isSubscriptionLockActive,
  releaseSubscriptionLock
} from "@/lib/mp-subscription-lock";
import { getMercadoPago } from "@/lib/mercadopago";
import { prisma } from "@/lib/prisma";
import { deleteFromStorage } from "@/lib/storage";
import type { ActionResult } from "@/types";

const SUBSCRIPTION_IN_PROGRESS_ERROR =
  "Uma operação de assinatura está em andamento. Tente novamente em instantes.";

function hashEmail(email: string) {
  return crypto
    .createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");
}

// Liberar a trava nunca pode mascarar o erro que abortou a exclusão: se falhar,
// a própria trava expira sozinha em 2 minutos (TTL).
async function releaseLockQuietly(profileId: string) {
  try {
    await releaseSubscriptionLock(profileId);
  } catch (error) {
    console.error("Falha ao liberar trava de assinatura na exclusão de conta.", {
      profileId,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
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

  // A exclusão SEGURA a trava enquanto cancela, fechando a corrida nos dois
  // sentidos: (1) assinar-então-excluir — se `createMpCardSubscription` já está
  // com a trava, a exclusão aborta em vez de cancelar algo que ainda está
  // nascendo; (2) excluir-então-assinar — enquanto a exclusão segura a trava,
  // nenhuma preapproval nova pode ser criada e escapar do cancelamento abaixo
  // (o snapshot lido acima jamais a veria). Perfil inexistente não tem
  // assinatura a proteger.
  if (profile) {
    // Checagem barata no snapshot já carregado, antes de tentar escrever.
    if (isSubscriptionLockActive(profile.mpSubscriptionLockedAt)) {
      return { error: SUBSCRIPTION_IN_PROGRESS_ERROR };
    }
    const locked = await acquireSubscriptionLock(profile.id);
    if (!locked) {
      return { error: SUBSCRIPTION_IN_PROGRESS_ERROR };
    }
  }

  // Cobrança em primeiro lugar: se o cancelamento falhar, a exclusão aborta —
  // uma conta "excluída" não pode continuar sendo cobrada.
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
      await releaseLockQuietly(profile.id);
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
