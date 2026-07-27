"use client";

import { useActionState, useRef, useState } from "react";
import type { BusinessType, ProviderProfile } from "@prisma/client";

import {
  saveProviderProfile,
  type ProviderProfileFormState,
} from "@/lib/actions/provider-profile";
import { canUseThemePresets } from "@/lib/plan-limits";
import { AppearanceSection } from "@/components/provider-profile/sections/AppearanceSection";
import { BusinessTypeSection } from "@/components/provider-profile/sections/BusinessTypeSection";
import { ContactSection } from "@/components/provider-profile/sections/ContactSection";
import { IdentitySection } from "@/components/provider-profile/sections/IdentitySection";
import { PixSection } from "@/components/provider-profile/sections/PixSection";
import { PresenceSection } from "@/components/provider-profile/sections/PresenceSection";
import { StatusSection } from "@/components/provider-profile/sections/StatusSection";

type ProfileFormProps = {
  profile: ProviderProfile | null;
  userEmail?: string | null;
};

const TABS = [
  { id: "negocio", label: "Negócio" },
  { id: "contato", label: "Contato" },
  { id: "aparencia", label: "Aparência" },
  { id: "pagamento", label: "Pagamento" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ProfileForm({ profile, userEmail }: ProfileFormProps) {
  const [activeTab, setActiveTab] = useState<TabId>("negocio");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
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
  const isPro = profile ? canUseThemePresets(profile.plan) : false;

  // Alterna a exibição via classe do Tailwind (`hidden`), não pelo atributo
  // HTML `hidden`: uma classe de display de autor (`grid`) venceria a regra
  // `[hidden]{display:none}` do navegador e o painel continuaria visível.
  const panelClass = (id: TabId) =>
    activeTab === id ? "grid gap-6" : "hidden";

  function focusTab(index: number) {
    const next = (index + TABS.length) % TABS.length;
    setActiveTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  function handleTabKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusTab(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusTab(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTab(TABS.length - 1);
    }
  }

  return (
    <form action={formAction} className="grid gap-6" key={formKey}>
      {state && "error" in state ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-700">{state.error}</p>
        </div>
      ) : null}

      {/* Status da vitrine — sempre visível, controle global */}
      <StatusSection
        isPublished={isPublished}
        onPublishedChange={setIsPublished}
        slug={slug}
      />

      {/* Navegação por seções */}
      <div
        role="tablist"
        aria-label="Seções do perfil"
        className="flex justify-between border-b border-paper-soft"
      >
        {TABS.map((tab, index) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              id={`profile-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`profile-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              className={`inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-1 text-xs font-semibold transition sm:text-sm ${
                selected
                  ? "border-leaf text-leaf"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/*
        Todos os painéis ficam montados (apenas ocultos com a classe `hidden`)
        para que o submit único continue enviando todos os campos, mesmo os de
        abas que o usuário não abriu.
      */}
      <div
        role="tabpanel"
        id="profile-panel-negocio"
        aria-labelledby="profile-tab-negocio"
        className={panelClass("negocio")}
      >
        <IdentitySection
          values={values}
          profile={profile}
          slug={slug}
          onSlugChange={setSlug}
        />
        <BusinessTypeSection
          businessType={businessType}
          onBusinessTypeChange={setBusinessType}
        />
      </div>

      <div
        role="tabpanel"
        id="profile-panel-contato"
        aria-labelledby="profile-tab-contato"
        className={panelClass("contato")}
      >
        <ContactSection
          values={values}
          profile={profile}
          userEmail={userEmail}
        />
        <PresenceSection values={values} profile={profile} />
      </div>

      <div
        role="tabpanel"
        id="profile-panel-aparencia"
        aria-labelledby="profile-tab-aparencia"
        className={panelClass("aparencia")}
      >
        <AppearanceSection
          isPro={isPro}
          currentThemePreset={currentThemePreset}
        />
      </div>

      <div
        role="tabpanel"
        id="profile-panel-pagamento"
        aria-labelledby="profile-tab-pagamento"
        className={panelClass("pagamento")}
      >
        <PixSection values={values} profile={profile} />
      </div>

      {/* Ação — salva todas as seções de uma vez */}
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
