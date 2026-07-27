import type { ProviderProfile } from "@prisma/client";

import type { ProviderProfileFormValues } from "@/lib/actions/provider-profile";
import { CharCountTextarea } from "@/components/ui/CharCountTextarea";
import { Field } from "@/components/ui/Field";
import {
  inputClass,
  SectionHeader,
} from "@/components/provider-profile/profile-form-ui";

type IdentitySectionProps = {
  values: ProviderProfileFormValues | undefined;
  profile: ProviderProfile | null;
  slug: string;
  onSlugChange: (value: string) => void;
};

export function IdentitySection({
  values,
  profile,
  slug,
  onSlugChange,
}: IdentitySectionProps) {
  return (
    <div className="grid gap-5">
      <SectionHeader
        label="Identidade do negócio"
        description="Como seu negócio aparece para os clientes."
        divider={false}
      />

      <Field label="Nome do negócio" htmlFor="businessName" required>
        <input
          className={inputClass}
          defaultValue={values?.businessName ?? profile?.businessName ?? ""}
          id="businessName"
          maxLength={120}
          name="businessName"
          placeholder="Ex: Studio da Ana, Pinturas Silva"
          required
          type="text"
        />
      </Field>

      <Field
        label="Link da vitrine"
        htmlFor="slug"
        required
        hint={
          <>
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
            {profile?.slug && slug !== profile.slug ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                <span className="font-semibold">Atenção:</span> ao mudar o
                endereço, todos os links já compartilhados — vitrine, pedidos e
                pagamentos Pix pendentes — deixarão de funcionar. Clientes com o
                link antigo verão uma página não encontrada.
              </p>
            ) : null}
          </>
        }
      >
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-ink-muted">
            /u/
          </span>
          <input
            className="min-h-11 w-full rounded-lg border border-paper-soft bg-white pl-8 pr-3 text-sm text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
            defaultValue={values?.slug ?? profile?.slug ?? ""}
            id="slug"
            maxLength={60}
            name="slug"
            onChange={(e) => onSlugChange(e.target.value.toLowerCase())}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder="meu-negocio"
            required
            type="text"
          />
        </div>
      </Field>

      <Field label="Descrição" htmlFor="description" optional>
        <CharCountTextarea
          className="min-h-28 w-full rounded-lg border border-paper-soft bg-white px-3 py-3 text-sm text-ink outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20"
          defaultValue={values?.description ?? profile?.description ?? ""}
          id="description"
          maxLength={600}
          name="description"
          placeholder="Conte um pouco sobre o seu negócio, especialidades e diferenciais…"
        />
      </Field>
    </div>
  );
}
