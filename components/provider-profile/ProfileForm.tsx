"use client";

import { useActionState, useState } from "react";
import type { ProviderProfile } from "@prisma/client";

import { saveProviderProfile } from "@/lib/actions/provider-profile";
import { PhoneInput } from "@/components/ui/PhoneInput";
import type { ActionResult } from "@/types";

type ProfileFormProps = {
  profile: ProviderProfile | null;
  userEmail?: string | null;
};

const inputClass =
  "min-h-11 w-full rounded-lg border border-paper-soft bg-white px-3 text-sm text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20";

const labelClass = "text-sm font-semibold text-ink";

function SectionHeader({ label, description }: { label: string; description?: string }) {
  return (
    <div className="border-t border-paper-soft pt-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-leaf">{label}</p>
      {description ? (
        <p className="mt-1 text-xs leading-5 text-ink-muted">{description}</p>
      ) : null}
    </div>
  );
}

export function ProfileForm({ profile, userEmail }: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    saveProviderProfile,
    undefined
  );

  const [slug, setSlug] = useState(profile?.slug ?? "");
  const [isPublished, setIsPublished] = useState(profile?.isPublished ?? false);

  return (
    <form action={formAction} className="mt-6 grid gap-6">
      {state && "error" in state ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-700">{state.error}</p>
        </div>
      ) : null}

      {/* ── Identidade ─────────────────────────────── */}
      <SectionHeader
        label="Identidade do negócio"
        description="Como seu negócio aparece para os clientes."
      />

      <div className="grid gap-5">
        <div className="grid gap-2">
          <label className={labelClass} htmlFor="businessName">
            Nome do negócio <span className="text-red-500">*</span>
          </label>
          <input
            className={inputClass}
            defaultValue={profile?.businessName ?? ""}
            id="businessName"
            name="businessName"
            placeholder="Ex: Studio da Ana, Pinturas Silva"
            required
            type="text"
          />
        </div>

        <div className="grid gap-2">
          <label className={labelClass} htmlFor="slug">
            Endereço do perfil <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-ink-muted">
              /u/
            </span>
            <input
              className="min-h-11 w-full rounded-lg border border-paper-soft bg-white pl-8 pr-3 text-sm text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
              defaultValue={profile?.slug ?? ""}
              id="slug"
              name="slug"
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              placeholder="meu-negocio"
              required
              type="text"
            />
          </div>
          {slug ? (
            <p className="flex items-center gap-1.5 text-xs text-ink-muted">
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-mint text-leaf">
                ↗
              </span>
              Seu link público:{" "}
              <span className="font-semibold text-ink">orçafacil/u/{slug}</span>
            </p>
          ) : (
            <p className="text-xs text-ink-muted">
              Apenas letras minúsculas, números e hífens. Ex:{" "}
              <span className="font-semibold">meu-negocio</span>
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <label className={labelClass} htmlFor="description">
            Descrição{" "}
            <span className="font-normal text-ink-muted">(opcional)</span>
          </label>
          <textarea
            className="min-h-28 w-full rounded-lg border border-paper-soft bg-white px-3 py-3 text-sm text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
            defaultValue={profile?.description ?? ""}
            id="description"
            name="description"
            placeholder="Conte um pouco sobre o seu negócio, especialidades e diferenciais…"
          />
        </div>
      </div>

      {/* ── Contato e localização ──────────────────── */}
      <SectionHeader
        label="Contato e localização"
        description="Exibidos no seu perfil público para os clientes entrarem em contato."
      />

      <div className="grid gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className={labelClass} htmlFor="phone">
              Telefone{" "}
              <span className="font-normal text-ink-muted">(opcional)</span>
            </label>
            <PhoneInput
              className={inputClass}
              defaultValue={profile?.phone ?? ""}
              id="phone"
              name="phone"
            />
          </div>

          <div className="grid gap-2">
            <label className={labelClass} htmlFor="email">
              E-mail de contato{" "}
              <span className="font-normal text-ink-muted">(opcional)</span>
            </label>
            <input
              className={inputClass}
              defaultValue={profile?.email ?? userEmail ?? ""}
              id="email"
              name="email"
              placeholder="contato@seunegocio.com"
              type="email"
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className={labelClass} htmlFor="city">
              Cidade{" "}
              <span className="font-normal text-ink-muted">(opcional)</span>
            </label>
            <input
              className={inputClass}
              defaultValue={profile?.city ?? ""}
              id="city"
              name="city"
              placeholder="São Paulo"
              type="text"
            />
          </div>

          <div className="grid gap-2">
            <label className={labelClass} htmlFor="state">
              Estado{" "}
              <span className="font-normal text-ink-muted">(opcional)</span>
            </label>
            <input
              className={inputClass}
              defaultValue={profile?.state ?? ""}
              id="state"
              name="state"
              placeholder="SP"
              type="text"
            />
          </div>
        </div>
      </div>

      {/* ── Visibilidade ───────────────────────────── */}
      <SectionHeader
        label="Visibilidade"
        description="Controla se clientes conseguem acessar seu perfil público e enviar pedidos."
      />

      <label
        className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition ${
          isPublished
            ? "border-leaf/40 bg-mint/30"
            : "border-paper-soft bg-paper"
        }`}
      >
        {/* Hidden real checkbox */}
        <input
          checked={isPublished}
          className="sr-only"
          name="isPublished"
          onChange={(e) => setIsPublished(e.target.checked)}
          type="checkbox"
        />

        {/* Visual toggle */}
        <div className="relative mt-0.5 h-6 w-11 shrink-0">
          <div
            className={`h-6 w-11 rounded-full transition-colors duration-200 ${
              isPublished ? "bg-leaf" : "bg-stone-300"
            }`}
          />
          <div
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              isPublished ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </div>

        <div className="grid gap-0.5">
          <span className="text-sm font-semibold text-ink">
            {isPublished ? "Perfil publicado" : "Perfil oculto"}
          </span>
          <span className="text-xs leading-5 text-ink-muted">
            {isPublished
              ? "Clientes conseguem acessar seu perfil e enviar pedidos de orçamento."
              : "Seu perfil está oculto. Ative para receber pedidos pelo link público."}
          </span>
          {slug && isPublished ? (
            <span className="mt-1 text-xs font-semibold text-leaf">/u/{slug}</span>
          ) : null}
        </div>
      </label>

      {/* ── Dados Pix ──────────────────────────────── */}
      <SectionHeader
        label="Dados Pix para recebimento de entrada"
        description="Preenchendo aqui, o cliente verá as instruções de pagamento ao aprovar uma proposta com entrada configurado."
      />

      <div className="grid gap-5 rounded-xl border border-paper-soft bg-paper p-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className={labelClass} htmlFor="pixKey">
              Chave Pix
            </label>
            <input
              className={inputClass}
              defaultValue={profile?.pixKey ?? ""}
              id="pixKey"
              name="pixKey"
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              type="text"
            />
          </div>

          <div className="grid gap-2">
            <label className={labelClass} htmlFor="pixKeyType">
              Tipo da chave
            </label>
            <select
              className={inputClass}
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

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className={labelClass} htmlFor="pixHolderName">
              Nome do titular
            </label>
            <input
              className={inputClass}
              defaultValue={profile?.pixHolderName ?? ""}
              id="pixHolderName"
              name="pixHolderName"
              placeholder="Nome como aparece na conta Pix"
              type="text"
            />
          </div>

          <div className="grid gap-2">
            <label className={labelClass} htmlFor="pixCity">
              Cidade do Pix
            </label>
            <input
              className={inputClass}
              defaultValue={profile?.pixCity ?? ""}
              id="pixCity"
              name="pixCity"
              placeholder="Ex: São Paulo"
              type="text"
            />
            <p className="text-xs text-ink-muted">
              Usada para gerar o Pix copia e cola e o QR Code.
            </p>
          </div>
        </div>
      </div>

      {/* ── Ação ───────────────────────────────────── */}
      <div className="border-t border-paper-soft pt-4">
        <button
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-leaf px-6 text-sm font-semibold text-white transition hover:bg-leaf-hover disabled:opacity-50 sm:w-fit"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Salvando..." : "Salvar perfil"}
        </button>
      </div>
    </form>
  );
}
