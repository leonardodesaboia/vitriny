"use client";

import { useActionState } from "react";
import type { ProviderProfile } from "@prisma/client";

import { saveProviderProfile } from "@/lib/actions/provider-profile";
import { PhoneInput } from "@/components/ui/PhoneInput";
import type { ActionResult } from "@/types";

type ProfileFormProps = {
  profile: ProviderProfile | null;
  userEmail?: string | null;
};

export function ProfileForm({ profile, userEmail }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    saveProviderProfile,
    undefined
  );

  return (
    <form action={formAction} className="mt-8 grid gap-5">
      {state?.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-ink" htmlFor="businessName">
          Nome do negócio
        </label>
        <input
          className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
          defaultValue={profile?.businessName ?? ""}
          id="businessName"
          name="businessName"
          required
          type="text"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-ink" htmlFor="slug">
          Slug público
        </label>
        <input
          className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm lowercase outline-none focus:border-leaf"
          defaultValue={profile?.slug ?? ""}
          id="slug"
          name="slug"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          required
          type="text"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold text-ink" htmlFor="description">
          Descrição
        </label>
        <textarea
          className="min-h-32 rounded-md border border-stone-300 bg-white px-3 py-3 text-sm outline-none focus:border-leaf"
          defaultValue={profile?.description ?? ""}
          id="description"
          name="description"
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-ink" htmlFor="phone">
            Telefone
          </label>
          <PhoneInput
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
            defaultValue={profile?.phone ?? ""}
            id="phone"
            name="phone"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-semibold text-ink" htmlFor="email">
            E-mail de contato
          </label>
          <input
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
            defaultValue={profile?.email ?? userEmail ?? ""}
            id="email"
            name="email"
            type="email"
          />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-ink" htmlFor="city">
            Cidade
          </label>
          <input
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
            defaultValue={profile?.city ?? ""}
            id="city"
            name="city"
            type="text"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-semibold text-ink" htmlFor="state">
            Estado
          </label>
          <input
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
            defaultValue={profile?.state ?? ""}
            id="state"
            name="state"
            type="text"
          />
        </div>
      </div>

      <label className="flex items-center gap-3 text-sm font-semibold text-ink">
        <input
          className="h-4 w-4 accent-leaf"
          defaultChecked={profile?.isPublished ?? false}
          name="isPublished"
          type="checkbox"
        />
        Publicar perfil quando a página pública estiver disponível
      </label>

      <div className="rounded-xl border border-paper-soft bg-paper p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
          Dados Pix para recebimento de sinal
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          Preenchendo aqui, o cliente verá as instruções de pagamento ao aprovar uma proposta com sinal.
        </p>

        <div className="mt-4 grid gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-ink" htmlFor="pixKey">
                Chave Pix
              </label>
              <input
                className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
                defaultValue={profile?.pixKey ?? ""}
                id="pixKey"
                name="pixKey"
                placeholder="CPF, e-mail, telefone ou chave aleatória"
                type="text"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-semibold text-ink" htmlFor="pixKeyType">
                Tipo da chave
              </label>
              <select
                className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
                defaultValue={profile?.pixKeyType ?? ""}
                id="pixKeyType"
                name="pixKeyType"
              >
                <option value="">Selecione</option>
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
                <option value="E-mail">E-mail</option>
                <option value="Telefone">Telefone</option>
                <option value="Chave aleatória">Chave aleatória</option>
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-semibold text-ink" htmlFor="pixHolderName">
              Nome do titular
            </label>
            <input
              className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-leaf"
              defaultValue={profile?.pixHolderName ?? ""}
              id="pixHolderName"
              name="pixHolderName"
              placeholder="Nome como aparece na conta Pix"
              type="text"
            />
          </div>
        </div>
      </div>

      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-leaf px-5 text-sm font-semibold text-white transition hover:bg-[#1d6443] disabled:opacity-50 md:w-fit"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Salvando..." : "Salvar perfil"}
      </button>
    </form>
  );
}
