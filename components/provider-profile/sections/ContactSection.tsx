import type { ProviderProfile } from "@prisma/client";

import type { ProviderProfileFormValues } from "@/lib/actions/provider-profile";
import { Field } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import {
  inputClass,
  SectionHeader,
} from "@/components/provider-profile/profile-form-ui";

type ContactSectionProps = {
  values: ProviderProfileFormValues | undefined;
  profile: ProviderProfile | null;
  userEmail?: string | null;
};

export function ContactSection({
  values,
  profile,
  userEmail,
}: ContactSectionProps) {
  return (
    <div className="grid gap-5">
      <SectionHeader
        label="Contato e localização"
        description="Exibidos na sua vitrine pública para os clientes entrarem em contato."
        divider={false}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Telefone" htmlFor="phone" optional>
          <PhoneInput
            className={inputClass}
            defaultValue={values?.phone ?? profile?.phone ?? ""}
            id="phone"
            name="phone"
          />
        </Field>

        <Field label="E-mail de contato" htmlFor="email" optional>
          <input
            className={inputClass}
            defaultValue={values?.email ?? profile?.email ?? userEmail ?? ""}
            id="email"
            maxLength={120}
            name="email"
            placeholder="contato@seunegocio.com"
            type="email"
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Cidade" htmlFor="city" optional>
          <input
            className={inputClass}
            defaultValue={values?.city ?? profile?.city ?? ""}
            id="city"
            maxLength={80}
            name="city"
            placeholder="São Paulo"
            type="text"
          />
        </Field>

        <Field label="Estado" htmlFor="state" optional>
          <input
            className={inputClass}
            defaultValue={values?.state ?? profile?.state ?? ""}
            id="state"
            maxLength={80}
            name="state"
            placeholder="SP"
            type="text"
          />
        </Field>
      </div>

      <Field label="Endereço" htmlFor="address" optional>
        <input
          className={inputClass}
          defaultValue={values?.address ?? profile?.address ?? ""}
          id="address"
          maxLength={160}
          name="address"
          placeholder="Rua, número e bairro — vira link para o Google Maps"
          type="text"
        />
      </Field>
    </div>
  );
}
