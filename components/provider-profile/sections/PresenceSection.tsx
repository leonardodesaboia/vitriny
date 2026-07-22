import type { ProviderProfile } from "@prisma/client";

import type { ProviderProfileFormValues } from "@/lib/actions/provider-profile";
import { BusinessHoursEditor } from "@/components/provider-profile/BusinessHoursEditor";
import { Field, labelClass } from "@/components/ui/Field";
import {
  inputClass,
  SectionHeader,
} from "@/components/provider-profile/profile-form-ui";

type PresenceSectionProps = {
  values: ProviderProfileFormValues | undefined;
  profile: ProviderProfile | null;
};

export function PresenceSection({ values, profile }: PresenceSectionProps) {
  return (
    <div className="grid gap-5">
      <SectionHeader
        label="Presença e horários"
        description="Redes sociais e horário de funcionamento exibidos na sua vitrine. Todos opcionais."
      />

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Instagram" htmlFor="instagram">
          <input
            className={inputClass}
            defaultValue={values?.instagram ?? profile?.instagram ?? ""}
            id="instagram"
            maxLength={120}
            name="instagram"
            placeholder="@seunegocio"
            type="text"
          />
        </Field>

        <Field label="Facebook" htmlFor="facebook">
          <input
            className={inputClass}
            defaultValue={values?.facebook ?? profile?.facebook ?? ""}
            id="facebook"
            maxLength={120}
            name="facebook"
            placeholder="@seunegocio"
            type="text"
          />
        </Field>

        <Field label="TikTok" htmlFor="tiktok">
          <input
            className={inputClass}
            defaultValue={values?.tiktok ?? profile?.tiktok ?? ""}
            id="tiktok"
            maxLength={120}
            name="tiktok"
            placeholder="@seunegocio"
            type="text"
          />
        </Field>
      </div>

      <fieldset className="grid gap-2">
        <legend className={`${labelClass} mb-2`}>
          Horário de funcionamento
        </legend>
        <BusinessHoursEditor
          defaultValue={values?.businessHours ?? profile?.businessHours ?? null}
        />
      </fieldset>
    </div>
  );
}
