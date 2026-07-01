"use client";

import { useActionState, useState } from "react";
import type { BusinessType, ProviderProfile } from "@prisma/client";

import {
  saveProviderProfile,
  type ProviderProfileFormState,
} from "@/lib/actions/provider-profile";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { THEME_PRESET_OPTIONS } from "@/lib/theme-presets";

type ProfileFormProps = {
  profile: ProviderProfile | null;
  userEmail?: string | null;
};

const inputClass =
  "min-h-11 w-full rounded-lg border border-paper-soft bg-white px-3 text-sm text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20";

const labelClass = "text-sm font-semibold text-ink";

function SectionHeader({
  label,
  description,
}: {
  label: string;
  description?: string;
}) {
  return (
    <div className="border-t border-paper-soft pt-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-leaf">
        {label}
      </p>
      {description ? (
        <p className="mt-1 text-xs leading-5 text-ink-muted">{description}</p>
      ) : null}
    </div>
  );
}

const BUSINESS_TYPE_OPTIONS: {
  value: BusinessType;
  label: string;
  description: string;
}[] = [
  {
    value: "PRODUCTS",
    label: "Produtos",
    description:
      "Para lojas, encomendas, kits, doces, roupas, artesanato e itens físicos ou digitais.",
  },
  {
    value: "SERVICES",
    label: "Serviços",
    description:
      "Para atendimentos, consultorias, eventos, beleza, manutenção e trabalhos personalizados.",
  },
  {
    value: "BOTH",
    label: "Produtos e serviços",
    description: "Para negócios que vendem os dois tipos de item.",
  },
];

export function ProfileForm({ profile, userEmail }: ProfileFormProps) {
  const [slug, setSlug] = useState(profile?.slug ?? "");
  const [isPublished, setIsPublished] = useState(profile?.isPublished ?? false);
  const [businessType, setBusinessType] = useState<BusinessType>(
    profile?.businessType ?? "SERVICES"
  );
  const [state, formAction, isPending] = useActionState<
    ProviderProfileFormState,
    FormData
  >(async (previousState, formData) => {
    const result = await saveProviderProfile(previousState, formData);
    if (result?.values) {
      setSlug(result.values.slug);
      setIsPublished(result.values.isPublished);
      setBusinessType(result.values.businessType);
    }
    return result;
  }, undefined);

  const values = state?.values;
  const formKey = values ? `profile-error-${state.submittedAt}` : "profile";
  const currentThemePreset =
    values?.themePreset ?? profile?.themePreset ?? "DEFAULT";
  const isPro = profile?.plan === "PRO";

  return (
    <form action={formAction} className="mt-6 grid gap-6" key={formKey}>
      {state && "error" in state ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-700">{state.error}</p>
        </div>
      ) : null}

      {/* ── Status da vitrine ──────────────────────── */}
      <label
        className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition sm:p-5 ${
          isPublished
            ? "border-leaf/30 bg-mint/20"
            : "border-paper-soft bg-paper"
        }`}
      >
        <input
          checked={isPublished}
          className="sr-only"
          name="isPublished"
          onChange={(e) => setIsPublished(e.target.checked)}
          type="checkbox"
        />

        {/* Pulsing status dot */}
        <div className="relative flex h-3 w-3 shrink-0 items-center justify-center">
          {isPublished ? (
            <>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf opacity-50" />
              <span className="relative block h-3 w-3 rounded-full bg-leaf" />
            </>
          ) : (
            <span className="block h-3 w-3 rounded-full bg-stone-300" />
          )}
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            {isPublished ? "Vitrine ativa" : "Vitrine oculta"}
          </p>
          {isPublished && slug ? (
            <p className="mt-0.5 truncate text-xs font-medium text-leaf">
              /u/{slug}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-ink-muted">
              Ative para receber pedidos pelo link público.
            </p>
          )}
        </div>

        {/* Toggle */}
        <div className="relative h-6 w-11 shrink-0">
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
      </label>

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
            defaultValue={values?.businessName ?? profile?.businessName ?? ""}
            id="businessName"
            name="businessName"
            placeholder="Ex: Studio da Ana, Pinturas Silva"
            required
            type="text"
          />
        </div>

        <div className="grid gap-2">
          <label className={labelClass} htmlFor="slug">
            Link da vitrine <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-ink-muted">
              /u/
            </span>
            <input
              className="min-h-11 w-full rounded-lg border border-paper-soft bg-white pl-8 pr-3 text-sm text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
              defaultValue={values?.slug ?? profile?.slug ?? ""}
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
              <span className="font-semibold text-ink">vitriny/u/{slug}</span>
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
            defaultValue={values?.description ?? profile?.description ?? ""}
            id="description"
            name="description"
            placeholder="Conte um pouco sobre o seu negócio, especialidades e diferenciais…"
          />
        </div>
      </div>

      {/* ── Tipo da vitrine ───────────────────────── */}
      <SectionHeader
        label="Tipo da vitrine"
        description="Usamos essa informação para personalizar sua experiência ao cadastrar itens."
      />

      <input name="businessType" type="hidden" value={businessType} />
      <div className="grid gap-2">
        {BUSINESS_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={businessType === opt.value}
            onClick={() => setBusinessType(opt.value)}
            className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition sm:gap-4 sm:p-4 ${
              businessType === opt.value
                ? "border-leaf/40 bg-mint/30"
                : "border-paper-soft bg-paper hover:border-stone-300"
            }`}
          >
            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-current">
              {businessType === opt.value ? (
                <div className="h-2 w-2 rounded-full bg-leaf" />
              ) : null}
            </div>
            <div className="grid gap-0.5">
              <span className="text-sm font-semibold text-ink">{opt.label}</span>
              <span className="text-xs leading-5 text-ink-muted">{opt.description}</span>
            </div>
          </button>
        ))}
      </div>

      {/* ── Contato e localização ──────────────────── */}
      <SectionHeader
        label="Contato e localização"
        description="Exibidos na sua vitrine pública para os clientes entrarem em contato."
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
              defaultValue={values?.phone ?? profile?.phone ?? ""}
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
              defaultValue={values?.email ?? profile?.email ?? userEmail ?? ""}
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
              defaultValue={values?.city ?? profile?.city ?? ""}
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
              defaultValue={values?.state ?? profile?.state ?? ""}
              id="state"
              name="state"
              placeholder="SP"
              type="text"
            />
          </div>
        </div>
      </div>

      {/* ── Aparência ─────────────────────────────── */}
      <SectionHeader
        label="Aparência da página"
        description="Escolha um preset visual simples para sua página pública."
      />

      <div className="grid gap-4 rounded-xl border border-paper-soft bg-paper p-5">
        {!isPro ? (
          <>
            <input
              name="themePreset"
              type="hidden"
              value={currentThemePreset}
            />
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-semibold text-amber-800">
                Personalização visual está disponível no plano PRO.
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-800/80">
                O tema padrão está ativo na página pública enquanto seu plano
                for FREE.
              </p>
            </div>
            <div className="rounded-xl border border-paper-soft bg-white p-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-16 overflow-hidden rounded-lg border border-paper-soft"
                  data-brand-theme="DEFAULT"
                >
                  <span className="flex-1 bg-paper" />
                  <span className="flex-1 bg-leaf" />
                  <span className="flex-1 bg-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">Padrão</p>
                  <p className="text-xs text-ink-muted">
                    Neutro e universal, combina com qualquer negócio.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {THEME_PRESET_OPTIONS.map((preset) => (
              <label
                className="cursor-pointer rounded-xl border border-paper-soft bg-white p-4 transition has-[:checked]:border-leaf has-[:checked]:ring-2 has-[:checked]:ring-leaf/20"
                key={preset.id}
              >
                <input
                  className="sr-only"
                  defaultChecked={currentThemePreset === preset.id}
                  name="themePreset"
                  type="radio"
                  value={preset.id}
                />
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-16 shrink-0 overflow-hidden rounded-lg border border-paper-soft"
                    data-brand-theme={preset.id}
                  >
                    <span className={`flex-1 ${preset.preview.background}`} />
                    <span className={`flex-1 ${preset.preview.accent}`} />
                    <span className={`flex-1 ${preset.preview.surface}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {preset.name}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-ink-muted">
                      {preset.description}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-ink-muted/80">
                      {preset.fontLabel}
                    </p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* ── Dados Pix ──────────────────────────────── */}
      <SectionHeader
        label="Dados Pix para recebimento de entrada"
        description="Preenchendo aqui, o cliente verá as instruções de pagamento ao aprovar uma proposta com entrada configurado."
      />

      <div className="grid gap-5 rounded-xl border border-paper-soft bg-paper p-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className={labelClass} htmlFor="pixKey">
            Chave Pix
          </label>
          <input
            className={inputClass}
            defaultValue={values?.pixKey ?? profile?.pixKey ?? ""}
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
            defaultValue={values?.pixKeyType ?? profile?.pixKeyType ?? ""}
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

        <div className="grid gap-2">
          <label className={labelClass} htmlFor="pixHolderName">
            Nome do titular
          </label>
          <input
            className={inputClass}
            defaultValue={values?.pixHolderName ?? profile?.pixHolderName ?? ""}
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
            defaultValue={values?.pixCity ?? profile?.pixCity ?? ""}
            id="pixCity"
            name="pixCity"
            placeholder="Ex: São Paulo"
            type="text"
          />
        </div>

        <p className="text-xs text-ink-muted sm:col-span-2">
          A cidade do Pix é usada para gerar o Pix copia e cola e o QR Code.
        </p>
      </div>

      {/* ── Ação ───────────────────────────────────── */}
      <div className="border-t border-paper-soft pt-4">
        <button
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-leaf px-6 text-sm font-semibold text-white transition hover:bg-leaf-hover disabled:opacity-50 sm:w-fit"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Salvando..." : "Salvar dados"}
        </button>
      </div>
    </form>
  );
}
