import type { ProviderProfile } from "@prisma/client";

import type { ProviderProfileFormValues } from "@/lib/actions/provider-profile";
import { Field } from "@/components/ui/Field";
import {
  inputClass,
  SectionHeader,
} from "@/components/provider-profile/profile-form-ui";

type PixSectionProps = {
  values: ProviderProfileFormValues | undefined;
  profile: ProviderProfile | null;
};

export function PixSection({ values, profile }: PixSectionProps) {
  return (
    <div className="grid gap-5">
      <SectionHeader
        label="Dados Pix para recebimento de entrada"
        description="Preenchendo aqui, o cliente verá as instruções de pagamento ao aprovar uma proposta com entrada configurado."
        divider={false}
      />

      <div className="grid gap-5 rounded-xl border border-paper-soft bg-paper p-5 sm:grid-cols-2">
        <Field label="Chave Pix" htmlFor="pixKey">
          <input
            className={inputClass}
            defaultValue={values?.pixKey ?? profile?.pixKey ?? ""}
            id="pixKey"
            maxLength={140}
            name="pixKey"
            placeholder="CPF, e-mail, telefone ou chave aleatória"
            type="text"
          />
        </Field>

        <Field label="Tipo da chave" htmlFor="pixKeyType">
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
        </Field>

        <Field label="Nome do titular" htmlFor="pixHolderName">
          <input
            className={inputClass}
            defaultValue={values?.pixHolderName ?? profile?.pixHolderName ?? ""}
            id="pixHolderName"
            maxLength={120}
            name="pixHolderName"
            placeholder="Nome como aparece na conta Pix"
            type="text"
          />
        </Field>

        <Field label="Cidade do Pix" htmlFor="pixCity">
          <input
            className={inputClass}
            defaultValue={values?.pixCity ?? profile?.pixCity ?? ""}
            id="pixCity"
            maxLength={80}
            name="pixCity"
            placeholder="Ex: São Paulo"
            type="text"
          />
        </Field>

        <p className="text-xs text-ink-muted sm:col-span-2">
          A cidade do Pix é usada para gerar o Pix copia e cola e o QR Code.
        </p>
      </div>
    </div>
  );
}
